
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.50.1' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.50.1 */

    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let header;
    	let h1;
    	let t1;
    	let p0;
    	let t3;
    	let div30;
    	let div1;
    	let img;
    	let img_src_value;
    	let t4;
    	let div0;
    	let p1;
    	let t6;
    	let ul;
    	let li0;
    	let t8;
    	let li1;
    	let t10;
    	let div29;
    	let div28;
    	let p2;
    	let t12;
    	let div14;
    	let div4;
    	let div2;
    	let p3;
    	let t14;
    	let div3;
    	let p4;
    	let t16;
    	let input0;
    	let t17;
    	let div7;
    	let div5;
    	let p5;
    	let t19;
    	let div6;
    	let p6;
    	let t21;
    	let input1;
    	let t22;
    	let p7;
    	let t23_value = (/*depositPercent*/ ctx[8] || "") + "";
    	let t23;
    	let t24;
    	let span0;
    	let t26;
    	let div10;
    	let div8;
    	let p8;
    	let t28;
    	let div9;
    	let p9;
    	let t30;
    	let input2;
    	let t31;
    	let div13;
    	let div11;
    	let p10;
    	let t33;
    	let div12;
    	let p11;
    	let t35;
    	let input3;
    	let t36;
    	let div27;
    	let div17;
    	let div15;
    	let t38;
    	let div16;
    	let span1;
    	let t39_value = (/*yieldCalc*/ ctx[6] || "") + "";
    	let t39;
    	let t40;
    	let t41;
    	let div20;
    	let div18;
    	let t43;
    	let div19;
    	let span2;
    	let t44;
    	let t45_value = (/*requiredMortgage*/ ctx[3] || "") + "";
    	let t45;
    	let t46;
    	let div23;
    	let div21;
    	let t48;
    	let div22;
    	let span3;
    	let t49_value = (/*ltv*/ ctx[5] || "") + "";
    	let t49;
    	let t50;
    	let t51;
    	let div26;
    	let div24;
    	let t53;
    	let div25;
    	let span4;
    	let t54;
    	let t55_value = (/*annualRentalIncome*/ ctx[4] || "") + "";
    	let t55;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			header = element("header");
    			h1 = element("h1");
    			h1.textContent = "Property Investment Calculator";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Buy to Let • UK";
    			t3 = space();
    			div30 = element("div");
    			div1 = element("div");
    			img = element("img");
    			t4 = space();
    			div0 = element("div");
    			p1 = element("p");
    			p1.textContent = "Notes:";
    			t6 = space();
    			ul = element("ul");
    			li0 = element("li");
    			li0.textContent = "If taking out mortgage, generally, deposit should be at\n\t\t\t\t\t\tleast 25% of property price, loan-to-value should be 75%\n\t\t\t\t\t\t(subject to individual lender's requirements).";
    			t8 = space();
    			li1 = element("li");
    			li1.textContent = "Upon sale, the investment property could incur a capital\n\t\t\t\t\t\tgains tax.";
    			t10 = space();
    			div29 = element("div");
    			div28 = element("div");
    			p2 = element("p");
    			p2.textContent = `${/*message*/ ctx[9]}`;
    			t12 = space();
    			div14 = element("div");
    			div4 = element("div");
    			div2 = element("div");
    			p3 = element("p");
    			p3.textContent = "House Price";
    			t14 = space();
    			div3 = element("div");
    			p4 = element("p");
    			p4.textContent = "£";
    			t16 = space();
    			input0 = element("input");
    			t17 = space();
    			div7 = element("div");
    			div5 = element("div");
    			p5 = element("p");
    			p5.textContent = "Deposit";
    			t19 = space();
    			div6 = element("div");
    			p6 = element("p");
    			p6.textContent = "£";
    			t21 = space();
    			input1 = element("input");
    			t22 = space();
    			p7 = element("p");
    			t23 = text(t23_value);
    			t24 = space();
    			span0 = element("span");
    			span0.textContent = "%";
    			t26 = space();
    			div10 = element("div");
    			div8 = element("div");
    			p8 = element("p");
    			p8.textContent = "Stamp Duty";
    			t28 = space();
    			div9 = element("div");
    			p9 = element("p");
    			p9.textContent = "£";
    			t30 = space();
    			input2 = element("input");
    			t31 = space();
    			div13 = element("div");
    			div11 = element("div");
    			p10 = element("p");
    			p10.textContent = "Estimated Monthly Rental Income";
    			t33 = space();
    			div12 = element("div");
    			p11 = element("p");
    			p11.textContent = "£";
    			t35 = space();
    			input3 = element("input");
    			t36 = space();
    			div27 = element("div");
    			div17 = element("div");
    			div15 = element("div");
    			div15.textContent = "Yield:";
    			t38 = space();
    			div16 = element("div");
    			span1 = element("span");
    			t39 = text(t39_value);
    			t40 = text("%");
    			t41 = space();
    			div20 = element("div");
    			div18 = element("div");
    			div18.textContent = "Mortgage Required:";
    			t43 = space();
    			div19 = element("div");
    			span2 = element("span");
    			t44 = text("£");
    			t45 = text(t45_value);
    			t46 = space();
    			div23 = element("div");
    			div21 = element("div");
    			div21.textContent = "Loan-to-Value:";
    			t48 = space();
    			div22 = element("div");
    			span3 = element("span");
    			t49 = text(t49_value);
    			t50 = text("%");
    			t51 = space();
    			div26 = element("div");
    			div24 = element("div");
    			div24.textContent = "Annual Rental Income:";
    			t53 = space();
    			div25 = element("div");
    			span4 = element("span");
    			t54 = text("£");
    			t55 = text(t55_value);
    			attr_dev(h1, "class", "svelte-1bhnu1u");
    			add_location(h1, file, 17, 2, 468);
    			attr_dev(p0, "class", "description svelte-1bhnu1u");
    			add_location(p0, file, 18, 2, 510);
    			add_location(header, file, 16, 1, 457);
    			if (!src_url_equal(img.src, img_src_value = "house.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "buy-to-let property investment calculator");
    			attr_dev(img, "class", "svelte-1bhnu1u");
    			add_location(img, file, 22, 3, 623);
    			attr_dev(p1, "class", "svelte-1bhnu1u");
    			add_location(p1, file, 27, 4, 733);
    			attr_dev(li0, "class", "svelte-1bhnu1u");
    			add_location(li0, file, 29, 5, 761);
    			attr_dev(li1, "class", "svelte-1bhnu1u");
    			add_location(li1, file, 34, 5, 960);
    			attr_dev(ul, "class", "svelte-1bhnu1u");
    			add_location(ul, file, 28, 4, 751);
    			attr_dev(div0, "class", "notes svelte-1bhnu1u");
    			add_location(div0, file, 26, 3, 709);
    			attr_dev(div1, "class", "framework-left svelte-1bhnu1u");
    			add_location(div1, file, 21, 2, 591);
    			attr_dev(p2, "class", "message svelte-1bhnu1u");
    			add_location(p2, file, 44, 4, 1157);
    			attr_dev(p3, "class", "name svelte-1bhnu1u");
    			add_location(p3, file, 48, 7, 1290);
    			attr_dev(div2, "class", "section-top");
    			add_location(div2, file, 47, 6, 1257);
    			attr_dev(p4, "class", "svelte-1bhnu1u");
    			add_location(p4, file, 51, 7, 1377);
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "id", "house-price");
    			attr_dev(input0, "placeholder", "100,000");
    			attr_dev(input0, "class", "svelte-1bhnu1u");
    			add_location(input0, file, 52, 7, 1393);
    			attr_dev(div3, "class", "section-bottom svelte-1bhnu1u");
    			add_location(div3, file, 50, 6, 1341);
    			attr_dev(div4, "class", "section svelte-1bhnu1u");
    			add_location(div4, file, 46, 5, 1229);
    			attr_dev(p5, "class", "name svelte-1bhnu1u");
    			add_location(p5, file, 62, 7, 1610);
    			attr_dev(div5, "class", "section-top");
    			add_location(div5, file, 61, 6, 1577);
    			attr_dev(p6, "class", "svelte-1bhnu1u");
    			add_location(p6, file, 65, 7, 1693);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "id", "deposit");
    			attr_dev(input1, "placeholder", "20,000");
    			attr_dev(input1, "class", "svelte-1bhnu1u");
    			add_location(input1, file, 66, 7, 1709);
    			attr_dev(div6, "class", "section-bottom svelte-1bhnu1u");
    			add_location(div6, file, 64, 6, 1657);
    			add_location(span0, file, 74, 30, 1893);
    			attr_dev(p7, "class", "note svelte-1bhnu1u");
    			add_location(p7, file, 73, 6, 1846);
    			attr_dev(div7, "class", "section svelte-1bhnu1u");
    			add_location(div7, file, 60, 5, 1549);
    			attr_dev(p8, "class", "name svelte-1bhnu1u");
    			add_location(p8, file, 79, 7, 1997);
    			attr_dev(div8, "class", "section-top");
    			add_location(div8, file, 78, 6, 1964);
    			attr_dev(p9, "class", "svelte-1bhnu1u");
    			add_location(p9, file, 82, 7, 2083);
    			attr_dev(input2, "type", "number");
    			attr_dev(input2, "id", "stamp-duty");
    			attr_dev(input2, "placeholder", "We will calculate this");
    			input2.readOnly = true;
    			attr_dev(input2, "class", "svelte-1bhnu1u");
    			add_location(input2, file, 83, 7, 2099);
    			attr_dev(div9, "class", "section-bottom svelte-1bhnu1u");
    			add_location(div9, file, 81, 6, 2047);
    			attr_dev(div10, "class", "section svelte-1bhnu1u");
    			add_location(div10, file, 77, 5, 1936);
    			attr_dev(p10, "class", "name svelte-1bhnu1u");
    			add_location(p10, file, 94, 7, 2346);
    			attr_dev(div11, "class", "section-top");
    			add_location(div11, file, 93, 6, 2313);
    			attr_dev(p11, "class", "svelte-1bhnu1u");
    			add_location(p11, file, 97, 7, 2453);
    			attr_dev(input3, "type", "number");
    			attr_dev(input3, "id", "monthly-rental-income");
    			attr_dev(input3, "placeholder", "800");
    			attr_dev(input3, "class", "svelte-1bhnu1u");
    			add_location(input3, file, 98, 7, 2469);
    			attr_dev(div12, "class", "section-bottom svelte-1bhnu1u");
    			add_location(div12, file, 96, 6, 2417);
    			attr_dev(div13, "class", "section svelte-1bhnu1u");
    			add_location(div13, file, 92, 5, 2285);
    			attr_dev(div14, "class", "calc calc-input svelte-1bhnu1u");
    			add_location(div14, file, 45, 4, 1194);
    			attr_dev(div15, "class", "col left svelte-1bhnu1u");
    			add_location(div15, file, 109, 6, 2710);
    			attr_dev(span1, "id", "yield");
    			add_location(span1, file, 111, 7, 2782);
    			attr_dev(div16, "class", "col right svelte-1bhnu1u");
    			add_location(div16, file, 110, 6, 2751);
    			attr_dev(div17, "class", "row svelte-1bhnu1u");
    			add_location(div17, file, 108, 5, 2686);
    			attr_dev(div18, "class", "col left svelte-1bhnu1u");
    			add_location(div18, file, 115, 6, 2879);
    			attr_dev(span2, "id", "mortgage");
    			add_location(span2, file, 117, 7, 2963);
    			attr_dev(div19, "class", "col right svelte-1bhnu1u");
    			add_location(div19, file, 116, 6, 2932);
    			attr_dev(div20, "class", "row svelte-1bhnu1u");
    			add_location(div20, file, 114, 5, 2855);
    			attr_dev(div21, "class", "col left svelte-1bhnu1u");
    			add_location(div21, file, 121, 6, 3070);
    			attr_dev(span3, "id", "ltv");
    			add_location(span3, file, 123, 7, 3150);
    			attr_dev(div22, "class", "col right svelte-1bhnu1u");
    			add_location(div22, file, 122, 6, 3119);
    			attr_dev(div23, "class", "row svelte-1bhnu1u");
    			add_location(div23, file, 120, 5, 3046);
    			attr_dev(div24, "class", "col left svelte-1bhnu1u");
    			add_location(div24, file, 127, 6, 3239);
    			attr_dev(span4, "id", "annual-rental-income");
    			add_location(span4, file, 129, 7, 3326);
    			attr_dev(div25, "class", "col right svelte-1bhnu1u");
    			add_location(div25, file, 128, 6, 3295);
    			attr_dev(div26, "class", "row svelte-1bhnu1u");
    			add_location(div26, file, 126, 5, 3215);
    			attr_dev(div27, "class", "calc calc-output svelte-1bhnu1u");
    			add_location(div27, file, 107, 4, 2650);
    			attr_dev(div28, "class", "container general svelte-1bhnu1u");
    			add_location(div28, file, 43, 3, 1121);
    			attr_dev(div29, "class", "framework-right svelte-1bhnu1u");
    			add_location(div29, file, 42, 2, 1088);
    			attr_dev(div30, "class", "framework svelte-1bhnu1u");
    			add_location(div30, file, 20, 1, 565);
    			attr_dev(main, "class", "svelte-1bhnu1u");
    			add_location(main, file, 15, 0, 449);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, header);
    			append_dev(header, h1);
    			append_dev(header, t1);
    			append_dev(header, p0);
    			append_dev(main, t3);
    			append_dev(main, div30);
    			append_dev(div30, div1);
    			append_dev(div1, img);
    			append_dev(div1, t4);
    			append_dev(div1, div0);
    			append_dev(div0, p1);
    			append_dev(div0, t6);
    			append_dev(div0, ul);
    			append_dev(ul, li0);
    			append_dev(ul, t8);
    			append_dev(ul, li1);
    			append_dev(div30, t10);
    			append_dev(div30, div29);
    			append_dev(div29, div28);
    			append_dev(div28, p2);
    			append_dev(div28, t12);
    			append_dev(div28, div14);
    			append_dev(div14, div4);
    			append_dev(div4, div2);
    			append_dev(div2, p3);
    			append_dev(div4, t14);
    			append_dev(div4, div3);
    			append_dev(div3, p4);
    			append_dev(div3, t16);
    			append_dev(div3, input0);
    			set_input_value(input0, /*housePrice*/ ctx[0]);
    			append_dev(div14, t17);
    			append_dev(div14, div7);
    			append_dev(div7, div5);
    			append_dev(div5, p5);
    			append_dev(div7, t19);
    			append_dev(div7, div6);
    			append_dev(div6, p6);
    			append_dev(div6, t21);
    			append_dev(div6, input1);
    			set_input_value(input1, /*deposit*/ ctx[1]);
    			append_dev(div7, t22);
    			append_dev(div7, p7);
    			append_dev(p7, t23);
    			append_dev(p7, t24);
    			append_dev(p7, span0);
    			append_dev(div14, t26);
    			append_dev(div14, div10);
    			append_dev(div10, div8);
    			append_dev(div8, p8);
    			append_dev(div10, t28);
    			append_dev(div10, div9);
    			append_dev(div9, p9);
    			append_dev(div9, t30);
    			append_dev(div9, input2);
    			set_input_value(input2, /*stampDuty*/ ctx[7]);
    			append_dev(div14, t31);
    			append_dev(div14, div13);
    			append_dev(div13, div11);
    			append_dev(div11, p10);
    			append_dev(div13, t33);
    			append_dev(div13, div12);
    			append_dev(div12, p11);
    			append_dev(div12, t35);
    			append_dev(div12, input3);
    			set_input_value(input3, /*monthlyRentalIncome*/ ctx[2]);
    			append_dev(div28, t36);
    			append_dev(div28, div27);
    			append_dev(div27, div17);
    			append_dev(div17, div15);
    			append_dev(div17, t38);
    			append_dev(div17, div16);
    			append_dev(div16, span1);
    			append_dev(span1, t39);
    			append_dev(div16, t40);
    			append_dev(div27, t41);
    			append_dev(div27, div20);
    			append_dev(div20, div18);
    			append_dev(div20, t43);
    			append_dev(div20, div19);
    			append_dev(div19, span2);
    			append_dev(span2, t44);
    			append_dev(span2, t45);
    			append_dev(div27, t46);
    			append_dev(div27, div23);
    			append_dev(div23, div21);
    			append_dev(div23, t48);
    			append_dev(div23, div22);
    			append_dev(div22, span3);
    			append_dev(span3, t49);
    			append_dev(div22, t50);
    			append_dev(div27, t51);
    			append_dev(div27, div26);
    			append_dev(div26, div24);
    			append_dev(div26, t53);
    			append_dev(div26, div25);
    			append_dev(div25, span4);
    			append_dev(span4, t54);
    			append_dev(span4, t55);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[10]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[11]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[12]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[13])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*housePrice*/ 1 && to_number(input0.value) !== /*housePrice*/ ctx[0]) {
    				set_input_value(input0, /*housePrice*/ ctx[0]);
    			}

    			if (dirty & /*deposit*/ 2 && to_number(input1.value) !== /*deposit*/ ctx[1]) {
    				set_input_value(input1, /*deposit*/ ctx[1]);
    			}

    			if (dirty & /*depositPercent*/ 256 && t23_value !== (t23_value = (/*depositPercent*/ ctx[8] || "") + "")) set_data_dev(t23, t23_value);

    			if (dirty & /*stampDuty*/ 128 && to_number(input2.value) !== /*stampDuty*/ ctx[7]) {
    				set_input_value(input2, /*stampDuty*/ ctx[7]);
    			}

    			if (dirty & /*monthlyRentalIncome*/ 4 && to_number(input3.value) !== /*monthlyRentalIncome*/ ctx[2]) {
    				set_input_value(input3, /*monthlyRentalIncome*/ ctx[2]);
    			}

    			if (dirty & /*yieldCalc*/ 64 && t39_value !== (t39_value = (/*yieldCalc*/ ctx[6] || "") + "")) set_data_dev(t39, t39_value);
    			if (dirty & /*requiredMortgage*/ 8 && t45_value !== (t45_value = (/*requiredMortgage*/ ctx[3] || "") + "")) set_data_dev(t45, t45_value);
    			if (dirty & /*ltv*/ 32 && t49_value !== (t49_value = (/*ltv*/ ctx[5] || "") + "")) set_data_dev(t49, t49_value);
    			if (dirty & /*annualRentalIncome*/ 16 && t55_value !== (t55_value = (/*annualRentalIncome*/ ctx[4] || "") + "")) set_data_dev(t55, t55_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let depositPercent;
    	let stampDuty;
    	let yieldCalc;
    	let requiredMortgage;
    	let annualRentalIncome;
    	let ltv;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let housePrice;
    	let deposit;
    	let monthlyRentalIncome;
    	let message = "Enter required fields below to start";
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		housePrice = to_number(this.value);
    		$$invalidate(0, housePrice);
    	}

    	function input1_input_handler() {
    		deposit = to_number(this.value);
    		$$invalidate(1, deposit);
    	}

    	function input2_input_handler() {
    		stampDuty = to_number(this.value);
    		($$invalidate(7, stampDuty), $$invalidate(0, housePrice));
    	}

    	function input3_input_handler() {
    		monthlyRentalIncome = to_number(this.value);
    		$$invalidate(2, monthlyRentalIncome);
    	}

    	$$self.$capture_state = () => ({
    		housePrice,
    		deposit,
    		monthlyRentalIncome,
    		message,
    		requiredMortgage,
    		ltv,
    		annualRentalIncome,
    		yieldCalc,
    		stampDuty,
    		depositPercent
    	});

    	$$self.$inject_state = $$props => {
    		if ('housePrice' in $$props) $$invalidate(0, housePrice = $$props.housePrice);
    		if ('deposit' in $$props) $$invalidate(1, deposit = $$props.deposit);
    		if ('monthlyRentalIncome' in $$props) $$invalidate(2, monthlyRentalIncome = $$props.monthlyRentalIncome);
    		if ('message' in $$props) $$invalidate(9, message = $$props.message);
    		if ('requiredMortgage' in $$props) $$invalidate(3, requiredMortgage = $$props.requiredMortgage);
    		if ('ltv' in $$props) $$invalidate(5, ltv = $$props.ltv);
    		if ('annualRentalIncome' in $$props) $$invalidate(4, annualRentalIncome = $$props.annualRentalIncome);
    		if ('yieldCalc' in $$props) $$invalidate(6, yieldCalc = $$props.yieldCalc);
    		if ('stampDuty' in $$props) $$invalidate(7, stampDuty = $$props.stampDuty);
    		if ('depositPercent' in $$props) $$invalidate(8, depositPercent = $$props.depositPercent);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*deposit, housePrice*/ 3) {
    			$$invalidate(8, depositPercent = deposit / housePrice * 100);
    		}

    		if ($$self.$$.dirty & /*housePrice*/ 1) {
    			$$invalidate(7, stampDuty = housePrice * 0.03);
    		}

    		if ($$self.$$.dirty & /*monthlyRentalIncome*/ 4) {
    			$$invalidate(4, annualRentalIncome = monthlyRentalIncome * 12);
    		}

    		if ($$self.$$.dirty & /*annualRentalIncome, housePrice*/ 17) {
    			$$invalidate(6, yieldCalc = annualRentalIncome / housePrice * 100);
    		}

    		if ($$self.$$.dirty & /*housePrice, deposit*/ 3) {
    			$$invalidate(3, requiredMortgage = housePrice - deposit);
    		}

    		if ($$self.$$.dirty & /*requiredMortgage, housePrice*/ 9) {
    			$$invalidate(5, ltv = requiredMortgage / housePrice * 100);
    		}
    	};

    	return [
    		housePrice,
    		deposit,
    		monthlyRentalIncome,
    		requiredMortgage,
    		annualRentalIncome,
    		ltv,
    		yieldCalc,
    		stampDuty,
    		depositPercent,
    		message,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
