
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
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
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

    // (75:6) {:else}
    function create_else_block_2(ctx) {
    	let p;
    	let t0_value = (/*depositPercent*/ ctx[7] || "") + "";
    	let t0;
    	let t1;
    	let span;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text(t0_value);
    			t1 = space();
    			span = element("span");
    			span.textContent = "%";
    			add_location(span, file, 76, 31, 1888);
    			attr_dev(p, "class", "note svelte-nsiq2q");
    			add_location(p, file, 75, 7, 1840);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, span);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*depositPercent*/ 128 && t0_value !== (t0_value = (/*depositPercent*/ ctx[7] || "") + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2.name,
    		type: "else",
    		source: "(75:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (68:6) {#if depositPercent < 25}
    function create_if_block_14(ctx) {
    	let p0;
    	let t0_value = (/*depositPercent*/ ctx[7] || "") + "";
    	let t0;
    	let span;
    	let t2;
    	let p1;

    	const block = {
    		c: function create() {
    			p0 = element("p");
    			t0 = text(t0_value);
    			span = element("span");
    			span.textContent = "%,";
    			t2 = space();
    			p1 = element("p");
    			p1.textContent = "Generally, the deposit should be at least 25%";
    			add_location(span, file, 69, 30, 1692);
    			attr_dev(p0, "class", "note svelte-nsiq2q");
    			add_location(p0, file, 68, 7, 1645);
    			attr_dev(p1, "class", "note warning svelte-nsiq2q");
    			add_location(p1, file, 71, 7, 1728);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p0, anchor);
    			append_dev(p0, t0);
    			append_dev(p0, span);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, p1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*depositPercent*/ 128 && t0_value !== (t0_value = (/*depositPercent*/ ctx[7] || "") + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(p1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_14.name,
    		type: "if",
    		source: "(68:6) {#if depositPercent < 25}",
    		ctx
    	});

    	return block;
    }

    // (126:38) 
    function create_if_block_13(ctx) {
    	let input;
    	let input_value_value;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "number");
    			attr_dev(input, "id", "stamp-duty");
    			input.value = input_value_value = 250000 * 0.03 + (925000 - 250000) * 0.08 + (1500000 - 925000) * 0.13 + (/*housePrice*/ ctx[0] - 1500000) * 0.15;
    			input.readOnly = true;
    			attr_dev(input, "class", "svelte-nsiq2q");
    			add_location(input, file, 126, 8, 3155);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*housePrice*/ 1 && input_value_value !== (input_value_value = 250000 * 0.03 + (925000 - 250000) * 0.08 + (1500000 - 925000) * 0.13 + (/*housePrice*/ ctx[0] - 1500000) * 0.15) && input.value !== input_value_value) {
    				prop_dev(input, "value", input_value_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_13.name,
    		type: "if",
    		source: "(126:38) ",
    		ctx
    	});

    	return block;
    }

    // (117:62) 
    function create_if_block_12(ctx) {
    	let input;
    	let input_value_value;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "number");
    			attr_dev(input, "id", "stamp-duty");
    			input.value = input_value_value = 250000 * 0.03 + (925000 - 250000) * 0.08 + (/*housePrice*/ ctx[0] - 925000) * 0.13;
    			input.readOnly = true;
    			attr_dev(input, "class", "svelte-nsiq2q");
    			add_location(input, file, 117, 8, 2915);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*housePrice*/ 1 && input_value_value !== (input_value_value = 250000 * 0.03 + (925000 - 250000) * 0.08 + (/*housePrice*/ ctx[0] - 925000) * 0.13) && input.value !== input_value_value) {
    				prop_dev(input, "value", input_value_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_12.name,
    		type: "if",
    		source: "(117:62) ",
    		ctx
    	});

    	return block;
    }

    // (109:61) 
    function create_if_block_11(ctx) {
    	let input;
    	let input_value_value;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "number");
    			attr_dev(input, "id", "stamp-duty");
    			input.value = input_value_value = 250000 * 0.03 + (/*housePrice*/ ctx[0] - 250000) * 0.08;
    			input.readOnly = true;
    			attr_dev(input, "class", "svelte-nsiq2q");
    			add_location(input, file, 109, 8, 2688);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*housePrice*/ 1 && input_value_value !== (input_value_value = 250000 * 0.03 + (/*housePrice*/ ctx[0] - 250000) * 0.08) && input.value !== input_value_value) {
    				prop_dev(input, "value", input_value_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_11.name,
    		type: "if",
    		source: "(109:61) ",
    		ctx
    	});

    	return block;
    }

    // (102:60) 
    function create_if_block_10(ctx) {
    	let input;
    	let input_value_value;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "number");
    			attr_dev(input, "id", "stamp-duty");
    			input.value = input_value_value = /*housePrice*/ ctx[0] * 0.03;
    			input.readOnly = true;
    			attr_dev(input, "class", "svelte-nsiq2q");
    			add_location(input, file, 102, 8, 2499);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*housePrice*/ 1 && input_value_value !== (input_value_value = /*housePrice*/ ctx[0] * 0.03) && input.value !== input_value_value) {
    				prop_dev(input, "value", input_value_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_10.name,
    		type: "if",
    		source: "(102:60) ",
    		ctx
    	});

    	return block;
    }

    // (95:37) 
    function create_if_block_9(ctx) {
    	let input;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "number");
    			attr_dev(input, "id", "stamp-duty");
    			input.value = "0";
    			input.readOnly = true;
    			attr_dev(input, "class", "svelte-nsiq2q");
    			add_location(input, file, 95, 8, 2327);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(95:37) ",
    		ctx
    	});

    	return block;
    }

    // (87:7) {#if !housePrice}
    function create_if_block_8(ctx) {
    	let input;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "number");
    			attr_dev(input, "id", "stamp-duty");
    			input.value = "";
    			attr_dev(input, "placeholder", "We will calculate this");
    			input.readOnly = true;
    			attr_dev(input, "class", "svelte-nsiq2q");
    			add_location(input, file, 87, 8, 2133);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(87:7) {#if !housePrice}",
    		ctx
    	});

    	return block;
    }

    // (180:38) 
    function create_if_block_7(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "For properties above £1.5m, 15% tiered";
    			add_location(p, file, 180, 8, 4688);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(180:38) ",
    		ctx
    	});

    	return block;
    }

    // (175:62) 
    function create_if_block_6(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "For properties between £925,001 and £1.5m,\n\t\t\t\t\t\t\t\t\t13% tiered";
    			add_location(p, file, 175, 8, 4552);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(175:62) ",
    		ctx
    	});

    	return block;
    }

    // (170:61) 
    function create_if_block_5(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "For properties between £250,001 and\n\t\t\t\t\t\t\t\t\t£925,000, 8% tiered";
    			add_location(p, file, 170, 8, 4390);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(170:61) ",
    		ctx
    	});

    	return block;
    }

    // (165:60) 
    function create_if_block_4(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "For properties between £40,001 and £250,000,\n\t\t\t\t\t\t\t\t\t3% on full property price";
    			add_location(p, file, 165, 8, 4214);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(165:60) ",
    		ctx
    	});

    	return block;
    }

    // (160:37) 
    function create_if_block_3(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "No stamp duty required for properties below\n\t\t\t\t\t\t\t\t\t£40,000";
    			add_location(p, file, 160, 8, 4058);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(160:37) ",
    		ctx
    	});

    	return block;
    }

    // (158:7) {#if !housePrice}
    function create_if_block_2(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Remember, stamp duty is tiered";
    			add_location(p, file, 158, 8, 3974);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(158:7) {#if !housePrice}",
    		ctx
    	});

    	return block;
    }

    // (196:7) {:else}
    function create_else_block_1(ctx) {
    	let p;
    	let t_value = /*requiredMortgage*/ ctx[3].toLocaleString("en") + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			add_location(p, file, 196, 8, 5118);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*requiredMortgage*/ 8 && t_value !== (t_value = /*requiredMortgage*/ ctx[3].toLocaleString("en") + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(196:7) {:else}",
    		ctx
    	});

    	return block;
    }

    // (194:7) {#if !requiredMortgage}
    function create_if_block_1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "£";
    			add_location(p, file, 194, 8, 5086);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(194:7) {#if !requiredMortgage}",
    		ctx
    	});

    	return block;
    }

    // (212:7) {:else}
    function create_else_block(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*annualRentalIncome*/ ctx[4].toLocaleString("en") + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("£");
    			t1 = text(t1_value);
    			add_location(p, file, 212, 8, 5556);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*annualRentalIncome*/ 16 && t1_value !== (t1_value = /*annualRentalIncome*/ ctx[4].toLocaleString("en") + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(212:7) {:else}",
    		ctx
    	});

    	return block;
    }

    // (210:7) {#if !annualRentalIncome}
    function create_if_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "£";
    			add_location(p, file, 210, 8, 5524);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(210:7) {#if !annualRentalIncome}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let header;
    	let h1;
    	let t1;
    	let p0;
    	let t3;
    	let div33;
    	let div1;
    	let img;
    	let img_src_value;
    	let t4;
    	let div0;
    	let p1;
    	let t6;
    	let ul;
    	let li;
    	let t8;
    	let div32;
    	let div31;
    	let p2;
    	let t10;
    	let div14;
    	let div4;
    	let div2;
    	let p3;
    	let t12;
    	let div3;
    	let p4;
    	let t14;
    	let input0;
    	let t15;
    	let div7;
    	let div5;
    	let p5;
    	let t17;
    	let div6;
    	let p6;
    	let t19;
    	let input1;
    	let t20;
    	let t21;
    	let div10;
    	let div8;
    	let p7;
    	let t23;
    	let div9;
    	let p8;
    	let t25;
    	let t26;
    	let div13;
    	let div11;
    	let p9;
    	let t28;
    	let div12;
    	let p10;
    	let t30;
    	let input2;
    	let t31;
    	let div30;
    	let div17;
    	let div15;
    	let t33;
    	let div16;
    	let t34;
    	let div20;
    	let div18;
    	let t36;
    	let div19;
    	let span0;
    	let t37_value = (/*yieldCalc*/ ctx[6] || "") + "";
    	let t37;
    	let t38;
    	let t39;
    	let div23;
    	let div21;
    	let t41;
    	let div22;
    	let t42;
    	let div26;
    	let div24;
    	let t44;
    	let div25;
    	let span1;
    	let t45_value = (/*ltv*/ ctx[5] || "") + "";
    	let t45;
    	let t46;
    	let t47;
    	let div29;
    	let div27;
    	let t49;
    	let div28;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*depositPercent*/ ctx[7] < 25) return create_if_block_14;
    		return create_else_block_2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (!/*housePrice*/ ctx[0]) return create_if_block_8;
    		if (/*housePrice*/ ctx[0] <= 40000) return create_if_block_9;
    		if (/*housePrice*/ ctx[0] > 40000 && /*housePrice*/ ctx[0] <= 250000) return create_if_block_10;
    		if (/*housePrice*/ ctx[0] > 250000 && /*housePrice*/ ctx[0] <= 925000) return create_if_block_11;
    		if (/*housePrice*/ ctx[0] > 925000 && /*housePrice*/ ctx[0] <= 1500000) return create_if_block_12;
    		if (/*housePrice*/ ctx[0] > 1500000) return create_if_block_13;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block1 = current_block_type_1 && current_block_type_1(ctx);

    	function select_block_type_2(ctx, dirty) {
    		if (!/*housePrice*/ ctx[0]) return create_if_block_2;
    		if (/*housePrice*/ ctx[0] <= 40000) return create_if_block_3;
    		if (/*housePrice*/ ctx[0] > 40000 && /*housePrice*/ ctx[0] <= 250000) return create_if_block_4;
    		if (/*housePrice*/ ctx[0] > 250000 && /*housePrice*/ ctx[0] <= 925000) return create_if_block_5;
    		if (/*housePrice*/ ctx[0] > 925000 && /*housePrice*/ ctx[0] <= 1500000) return create_if_block_6;
    		if (/*housePrice*/ ctx[0] > 1500000) return create_if_block_7;
    	}

    	let current_block_type_2 = select_block_type_2(ctx);
    	let if_block2 = current_block_type_2 && current_block_type_2(ctx);

    	function select_block_type_3(ctx, dirty) {
    		if (!/*requiredMortgage*/ ctx[3]) return create_if_block_1;
    		return create_else_block_1;
    	}

    	let current_block_type_3 = select_block_type_3(ctx);
    	let if_block3 = current_block_type_3(ctx);

    	function select_block_type_4(ctx, dirty) {
    		if (!/*annualRentalIncome*/ ctx[4]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type_4 = select_block_type_4(ctx);
    	let if_block4 = current_block_type_4(ctx);

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
    			div33 = element("div");
    			div1 = element("div");
    			img = element("img");
    			t4 = space();
    			div0 = element("div");
    			p1 = element("p");
    			p1.textContent = "Notes:";
    			t6 = space();
    			ul = element("ul");
    			li = element("li");
    			li.textContent = "Upon sale, the investment property could incur a capital\n\t\t\t\t\t\tgains tax.";
    			t8 = space();
    			div32 = element("div");
    			div31 = element("div");
    			p2 = element("p");
    			p2.textContent = `${/*message*/ ctx[8]}`;
    			t10 = space();
    			div14 = element("div");
    			div4 = element("div");
    			div2 = element("div");
    			p3 = element("p");
    			p3.textContent = "House Price";
    			t12 = space();
    			div3 = element("div");
    			p4 = element("p");
    			p4.textContent = "£";
    			t14 = space();
    			input0 = element("input");
    			t15 = space();
    			div7 = element("div");
    			div5 = element("div");
    			p5 = element("p");
    			p5.textContent = "Deposit";
    			t17 = space();
    			div6 = element("div");
    			p6 = element("p");
    			p6.textContent = "£";
    			t19 = space();
    			input1 = element("input");
    			t20 = space();
    			if_block0.c();
    			t21 = space();
    			div10 = element("div");
    			div8 = element("div");
    			p7 = element("p");
    			p7.textContent = "Stamp Duty";
    			t23 = space();
    			div9 = element("div");
    			p8 = element("p");
    			p8.textContent = "£";
    			t25 = space();
    			if (if_block1) if_block1.c();
    			t26 = space();
    			div13 = element("div");
    			div11 = element("div");
    			p9 = element("p");
    			p9.textContent = "Estimated Monthly Rental Income";
    			t28 = space();
    			div12 = element("div");
    			p10 = element("p");
    			p10.textContent = "£";
    			t30 = space();
    			input2 = element("input");
    			t31 = space();
    			div30 = element("div");
    			div17 = element("div");
    			div15 = element("div");
    			div15.textContent = "Stamp Duty Notes:";
    			t33 = space();
    			div16 = element("div");
    			if (if_block2) if_block2.c();
    			t34 = space();
    			div20 = element("div");
    			div18 = element("div");
    			div18.textContent = "Yield:";
    			t36 = space();
    			div19 = element("div");
    			span0 = element("span");
    			t37 = text(t37_value);
    			t38 = text("%");
    			t39 = space();
    			div23 = element("div");
    			div21 = element("div");
    			div21.textContent = "Mortgage Required:";
    			t41 = space();
    			div22 = element("div");
    			if_block3.c();
    			t42 = space();
    			div26 = element("div");
    			div24 = element("div");
    			div24.textContent = "Loan-to-Value:";
    			t44 = space();
    			div25 = element("div");
    			span1 = element("span");
    			t45 = text(t45_value);
    			t46 = text("%");
    			t47 = space();
    			div29 = element("div");
    			div27 = element("div");
    			div27.textContent = "Annual Rental Income:";
    			t49 = space();
    			div28 = element("div");
    			if_block4.c();
    			attr_dev(h1, "class", "svelte-nsiq2q");
    			add_location(h1, file, 16, 2, 433);
    			attr_dev(p0, "class", "description svelte-nsiq2q");
    			add_location(p0, file, 17, 2, 475);
    			add_location(header, file, 15, 1, 422);
    			if (!src_url_equal(img.src, img_src_value = "house.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "buy-to-let property investment calculator");
    			attr_dev(img, "class", "svelte-nsiq2q");
    			add_location(img, file, 21, 3, 588);
    			attr_dev(p1, "class", "svelte-nsiq2q");
    			add_location(p1, file, 26, 4, 698);
    			attr_dev(li, "class", "svelte-nsiq2q");
    			add_location(li, file, 28, 5, 726);
    			attr_dev(ul, "class", "svelte-nsiq2q");
    			add_location(ul, file, 27, 4, 716);
    			attr_dev(div0, "class", "notes svelte-nsiq2q");
    			add_location(div0, file, 25, 3, 674);
    			attr_dev(div1, "class", "framework-left svelte-nsiq2q");
    			add_location(div1, file, 20, 2, 556);
    			attr_dev(p2, "class", "message svelte-nsiq2q");
    			add_location(p2, file, 38, 4, 923);
    			attr_dev(p3, "class", "name svelte-nsiq2q");
    			add_location(p3, file, 42, 7, 1056);
    			attr_dev(div2, "class", "section-top");
    			add_location(div2, file, 41, 6, 1023);
    			attr_dev(p4, "class", "svelte-nsiq2q");
    			add_location(p4, file, 45, 7, 1143);
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "id", "house-price");
    			attr_dev(input0, "placeholder", "100,000");
    			attr_dev(input0, "class", "svelte-nsiq2q");
    			add_location(input0, file, 46, 7, 1159);
    			attr_dev(div3, "class", "section-bottom svelte-nsiq2q");
    			add_location(div3, file, 44, 6, 1107);
    			attr_dev(div4, "class", "section svelte-nsiq2q");
    			add_location(div4, file, 40, 5, 995);
    			attr_dev(p5, "class", "name svelte-nsiq2q");
    			add_location(p5, file, 56, 7, 1376);
    			attr_dev(div5, "class", "section-top");
    			add_location(div5, file, 55, 6, 1343);
    			attr_dev(p6, "class", "svelte-nsiq2q");
    			add_location(p6, file, 59, 7, 1459);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "id", "deposit");
    			attr_dev(input1, "placeholder", "20,000");
    			attr_dev(input1, "class", "svelte-nsiq2q");
    			add_location(input1, file, 60, 7, 1475);
    			attr_dev(div6, "class", "section-bottom svelte-nsiq2q");
    			add_location(div6, file, 58, 6, 1423);
    			attr_dev(div7, "class", "section svelte-nsiq2q");
    			add_location(div7, file, 54, 5, 1315);
    			attr_dev(p7, "class", "name svelte-nsiq2q");
    			add_location(p7, file, 82, 7, 2005);
    			attr_dev(div8, "class", "section-top");
    			add_location(div8, file, 81, 6, 1972);
    			attr_dev(p8, "class", "svelte-nsiq2q");
    			add_location(p8, file, 85, 7, 2091);
    			attr_dev(div9, "class", "section-bottom svelte-nsiq2q");
    			add_location(div9, file, 84, 6, 2055);
    			attr_dev(div10, "class", "section svelte-nsiq2q");
    			add_location(div10, file, 80, 5, 1944);
    			attr_dev(p9, "class", "name svelte-nsiq2q");
    			add_location(p9, file, 140, 7, 3491);
    			attr_dev(div11, "class", "section-top");
    			add_location(div11, file, 139, 6, 3458);
    			attr_dev(p10, "class", "svelte-nsiq2q");
    			add_location(p10, file, 143, 7, 3598);
    			attr_dev(input2, "type", "number");
    			attr_dev(input2, "id", "monthly-rental-income");
    			attr_dev(input2, "placeholder", "800");
    			attr_dev(input2, "class", "svelte-nsiq2q");
    			add_location(input2, file, 144, 7, 3614);
    			attr_dev(div12, "class", "section-bottom svelte-nsiq2q");
    			add_location(div12, file, 142, 6, 3562);
    			attr_dev(div13, "class", "section svelte-nsiq2q");
    			add_location(div13, file, 138, 5, 3430);
    			attr_dev(div14, "class", "calc calc-input svelte-nsiq2q");
    			add_location(div14, file, 39, 4, 960);
    			attr_dev(div15, "class", "col left note svelte-nsiq2q");
    			add_location(div15, file, 155, 6, 3855);
    			attr_dev(div16, "class", "col right note svelte-nsiq2q");
    			add_location(div16, file, 156, 6, 3912);
    			attr_dev(div17, "class", "row svelte-nsiq2q");
    			add_location(div17, file, 154, 5, 3831);
    			attr_dev(div18, "class", "col left svelte-nsiq2q");
    			add_location(div18, file, 185, 6, 4801);
    			attr_dev(span0, "id", "yield");
    			add_location(span0, file, 187, 7, 4873);
    			attr_dev(div19, "class", "col right svelte-nsiq2q");
    			add_location(div19, file, 186, 6, 4842);
    			attr_dev(div20, "class", "row svelte-nsiq2q");
    			add_location(div20, file, 184, 5, 4777);
    			attr_dev(div21, "class", "col left svelte-nsiq2q");
    			add_location(div21, file, 191, 6, 4970);
    			attr_dev(div22, "class", "col right svelte-nsiq2q");
    			add_location(div22, file, 192, 6, 5023);
    			attr_dev(div23, "class", "row svelte-nsiq2q");
    			add_location(div23, file, 190, 5, 4946);
    			attr_dev(div24, "class", "col left svelte-nsiq2q");
    			add_location(div24, file, 201, 6, 5232);
    			attr_dev(span1, "id", "yield");
    			add_location(span1, file, 203, 7, 5312);
    			attr_dev(div25, "class", "col right svelte-nsiq2q");
    			add_location(div25, file, 202, 6, 5281);
    			attr_dev(div26, "class", "row svelte-nsiq2q");
    			add_location(div26, file, 200, 5, 5208);
    			attr_dev(div27, "class", "col left svelte-nsiq2q");
    			add_location(div27, file, 207, 6, 5403);
    			attr_dev(div28, "class", "col right svelte-nsiq2q");
    			add_location(div28, file, 208, 6, 5459);
    			attr_dev(div29, "class", "row svelte-nsiq2q");
    			add_location(div29, file, 206, 5, 5379);
    			attr_dev(div30, "class", "calc calc-output svelte-nsiq2q");
    			add_location(div30, file, 153, 4, 3795);
    			attr_dev(div31, "class", "container general svelte-nsiq2q");
    			add_location(div31, file, 37, 3, 887);
    			attr_dev(div32, "class", "framework-right svelte-nsiq2q");
    			add_location(div32, file, 36, 2, 854);
    			attr_dev(div33, "class", "framework svelte-nsiq2q");
    			add_location(div33, file, 19, 1, 530);
    			attr_dev(main, "class", "svelte-nsiq2q");
    			add_location(main, file, 14, 0, 414);
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
    			append_dev(main, div33);
    			append_dev(div33, div1);
    			append_dev(div1, img);
    			append_dev(div1, t4);
    			append_dev(div1, div0);
    			append_dev(div0, p1);
    			append_dev(div0, t6);
    			append_dev(div0, ul);
    			append_dev(ul, li);
    			append_dev(div33, t8);
    			append_dev(div33, div32);
    			append_dev(div32, div31);
    			append_dev(div31, p2);
    			append_dev(div31, t10);
    			append_dev(div31, div14);
    			append_dev(div14, div4);
    			append_dev(div4, div2);
    			append_dev(div2, p3);
    			append_dev(div4, t12);
    			append_dev(div4, div3);
    			append_dev(div3, p4);
    			append_dev(div3, t14);
    			append_dev(div3, input0);
    			set_input_value(input0, /*housePrice*/ ctx[0]);
    			append_dev(div14, t15);
    			append_dev(div14, div7);
    			append_dev(div7, div5);
    			append_dev(div5, p5);
    			append_dev(div7, t17);
    			append_dev(div7, div6);
    			append_dev(div6, p6);
    			append_dev(div6, t19);
    			append_dev(div6, input1);
    			set_input_value(input1, /*deposit*/ ctx[1]);
    			append_dev(div7, t20);
    			if_block0.m(div7, null);
    			append_dev(div14, t21);
    			append_dev(div14, div10);
    			append_dev(div10, div8);
    			append_dev(div8, p7);
    			append_dev(div10, t23);
    			append_dev(div10, div9);
    			append_dev(div9, p8);
    			append_dev(div9, t25);
    			if (if_block1) if_block1.m(div9, null);
    			append_dev(div14, t26);
    			append_dev(div14, div13);
    			append_dev(div13, div11);
    			append_dev(div11, p9);
    			append_dev(div13, t28);
    			append_dev(div13, div12);
    			append_dev(div12, p10);
    			append_dev(div12, t30);
    			append_dev(div12, input2);
    			set_input_value(input2, /*monthlyRentalIncome*/ ctx[2]);
    			append_dev(div31, t31);
    			append_dev(div31, div30);
    			append_dev(div30, div17);
    			append_dev(div17, div15);
    			append_dev(div17, t33);
    			append_dev(div17, div16);
    			if (if_block2) if_block2.m(div16, null);
    			append_dev(div30, t34);
    			append_dev(div30, div20);
    			append_dev(div20, div18);
    			append_dev(div20, t36);
    			append_dev(div20, div19);
    			append_dev(div19, span0);
    			append_dev(span0, t37);
    			append_dev(div19, t38);
    			append_dev(div30, t39);
    			append_dev(div30, div23);
    			append_dev(div23, div21);
    			append_dev(div23, t41);
    			append_dev(div23, div22);
    			if_block3.m(div22, null);
    			append_dev(div30, t42);
    			append_dev(div30, div26);
    			append_dev(div26, div24);
    			append_dev(div26, t44);
    			append_dev(div26, div25);
    			append_dev(div25, span1);
    			append_dev(span1, t45);
    			append_dev(div25, t46);
    			append_dev(div30, t47);
    			append_dev(div30, div29);
    			append_dev(div29, div27);
    			append_dev(div29, t49);
    			append_dev(div29, div28);
    			if_block4.m(div28, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[9]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[10]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[11])
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

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div7, null);
    				}
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_1(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if (if_block1) if_block1.d(1);
    				if_block1 = current_block_type_1 && current_block_type_1(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div9, null);
    				}
    			}

    			if (dirty & /*monthlyRentalIncome*/ 4 && to_number(input2.value) !== /*monthlyRentalIncome*/ ctx[2]) {
    				set_input_value(input2, /*monthlyRentalIncome*/ ctx[2]);
    			}

    			if (current_block_type_2 !== (current_block_type_2 = select_block_type_2(ctx))) {
    				if (if_block2) if_block2.d(1);
    				if_block2 = current_block_type_2 && current_block_type_2(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(div16, null);
    				}
    			}

    			if (dirty & /*yieldCalc*/ 64 && t37_value !== (t37_value = (/*yieldCalc*/ ctx[6] || "") + "")) set_data_dev(t37, t37_value);

    			if (current_block_type_3 === (current_block_type_3 = select_block_type_3(ctx)) && if_block3) {
    				if_block3.p(ctx, dirty);
    			} else {
    				if_block3.d(1);
    				if_block3 = current_block_type_3(ctx);

    				if (if_block3) {
    					if_block3.c();
    					if_block3.m(div22, null);
    				}
    			}

    			if (dirty & /*ltv*/ 32 && t45_value !== (t45_value = (/*ltv*/ ctx[5] || "") + "")) set_data_dev(t45, t45_value);

    			if (current_block_type_4 === (current_block_type_4 = select_block_type_4(ctx)) && if_block4) {
    				if_block4.p(ctx, dirty);
    			} else {
    				if_block4.d(1);
    				if_block4 = current_block_type_4(ctx);

    				if (if_block4) {
    					if_block4.c();
    					if_block4.m(div28, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if_block0.d();

    			if (if_block1) {
    				if_block1.d();
    			}

    			if (if_block2) {
    				if_block2.d();
    			}

    			if_block3.d();
    			if_block4.d();
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
    		depositPercent
    	});

    	$$self.$inject_state = $$props => {
    		if ('housePrice' in $$props) $$invalidate(0, housePrice = $$props.housePrice);
    		if ('deposit' in $$props) $$invalidate(1, deposit = $$props.deposit);
    		if ('monthlyRentalIncome' in $$props) $$invalidate(2, monthlyRentalIncome = $$props.monthlyRentalIncome);
    		if ('message' in $$props) $$invalidate(8, message = $$props.message);
    		if ('requiredMortgage' in $$props) $$invalidate(3, requiredMortgage = $$props.requiredMortgage);
    		if ('ltv' in $$props) $$invalidate(5, ltv = $$props.ltv);
    		if ('annualRentalIncome' in $$props) $$invalidate(4, annualRentalIncome = $$props.annualRentalIncome);
    		if ('yieldCalc' in $$props) $$invalidate(6, yieldCalc = $$props.yieldCalc);
    		if ('depositPercent' in $$props) $$invalidate(7, depositPercent = $$props.depositPercent);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*deposit, housePrice*/ 3) {
    			$$invalidate(7, depositPercent = deposit / housePrice * 100);
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
    		depositPercent,
    		message,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler
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
