
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

    // (60:4) {:else}
    function create_else_block_5(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Enter required fields below to continue";
    			attr_dev(p, "class", "message svelte-iwyvcm");
    			add_location(p, file, 60, 5, 1661);
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
    		id: create_else_block_5.name,
    		type: "else",
    		source: "(60:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (55:4) {#if depositPercent < 25}
    function create_if_block_17(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Generally, deposit should be at least 25% of property\n\t\t\t\t\t\tprice";
    			attr_dev(p, "class", "warning svelte-iwyvcm");
    			add_location(p, file, 55, 5, 1542);
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
    		id: create_if_block_17.name,
    		type: "if",
    		source: "(55:4) {#if depositPercent < 25}",
    		ctx
    	});

    	return block;
    }

    // (143:38) 
    function create_if_block_16(ctx) {
    	let input;
    	let input_value_value;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "number");
    			attr_dev(input, "id", "stamp-duty");
    			input.value = input_value_value = 250000 * 0.03 + (925000 - 250000) * 0.08 + (1500000 - 925000) * 0.13 + (/*housePrice*/ ctx[0] - 1500000) * 0.15;
    			input.readOnly = true;
    			attr_dev(input, "class", "svelte-iwyvcm");
    			add_location(input, file, 143, 8, 3740);
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
    		id: create_if_block_16.name,
    		type: "if",
    		source: "(143:38) ",
    		ctx
    	});

    	return block;
    }

    // (134:62) 
    function create_if_block_15(ctx) {
    	let input;
    	let input_value_value;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "number");
    			attr_dev(input, "id", "stamp-duty");
    			input.value = input_value_value = 250000 * 0.03 + (925000 - 250000) * 0.08 + (/*housePrice*/ ctx[0] - 925000) * 0.13;
    			input.readOnly = true;
    			attr_dev(input, "class", "svelte-iwyvcm");
    			add_location(input, file, 134, 8, 3500);
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
    		id: create_if_block_15.name,
    		type: "if",
    		source: "(134:62) ",
    		ctx
    	});

    	return block;
    }

    // (126:61) 
    function create_if_block_14(ctx) {
    	let input;
    	let input_value_value;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "number");
    			attr_dev(input, "id", "stamp-duty");
    			input.value = input_value_value = 250000 * 0.03 + (/*housePrice*/ ctx[0] - 250000) * 0.08;
    			input.readOnly = true;
    			attr_dev(input, "class", "svelte-iwyvcm");
    			add_location(input, file, 126, 8, 3273);
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
    		id: create_if_block_14.name,
    		type: "if",
    		source: "(126:61) ",
    		ctx
    	});

    	return block;
    }

    // (119:60) 
    function create_if_block_13(ctx) {
    	let input;
    	let input_value_value;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "number");
    			attr_dev(input, "id", "stamp-duty");
    			input.value = input_value_value = /*housePrice*/ ctx[0] * 0.03;
    			input.readOnly = true;
    			attr_dev(input, "class", "svelte-iwyvcm");
    			add_location(input, file, 119, 8, 3084);
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
    		id: create_if_block_13.name,
    		type: "if",
    		source: "(119:60) ",
    		ctx
    	});

    	return block;
    }

    // (112:37) 
    function create_if_block_12(ctx) {
    	let input;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "number");
    			attr_dev(input, "id", "stamp-duty");
    			input.value = "0";
    			input.readOnly = true;
    			attr_dev(input, "class", "svelte-iwyvcm");
    			add_location(input, file, 112, 8, 2912);
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
    		id: create_if_block_12.name,
    		type: "if",
    		source: "(112:37) ",
    		ctx
    	});

    	return block;
    }

    // (104:7) {#if !housePrice}
    function create_if_block_11(ctx) {
    	let input;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "number");
    			attr_dev(input, "id", "stamp-duty");
    			input.value = "";
    			attr_dev(input, "placeholder", "We will calculate this");
    			input.readOnly = true;
    			attr_dev(input, "class", "svelte-iwyvcm");
    			add_location(input, file, 104, 8, 2718);
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
    		id: create_if_block_11.name,
    		type: "if",
    		source: "(104:7) {#if !housePrice}",
    		ctx
    	});

    	return block;
    }

    // (198:38) 
    function create_if_block_10(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "For properties above £1.5m, 15% tiered";
    			add_location(p, file, 198, 8, 5309);
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
    		id: create_if_block_10.name,
    		type: "if",
    		source: "(198:38) ",
    		ctx
    	});

    	return block;
    }

    // (193:62) 
    function create_if_block_9(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "For properties between £925,001 and £1.5m,\n\t\t\t\t\t\t\t\t\t13% tiered";
    			add_location(p, file, 193, 8, 5173);
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
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(193:62) ",
    		ctx
    	});

    	return block;
    }

    // (188:61) 
    function create_if_block_8(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "For properties between £250,001 and\n\t\t\t\t\t\t\t\t\t£925,000, 8% tiered";
    			add_location(p, file, 188, 8, 5011);
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
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(188:61) ",
    		ctx
    	});

    	return block;
    }

    // (183:60) 
    function create_if_block_7(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "For properties between £40,001 and £250,000,\n\t\t\t\t\t\t\t\t\t3% on full property price";
    			add_location(p, file, 183, 8, 4835);
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
    		source: "(183:60) ",
    		ctx
    	});

    	return block;
    }

    // (178:37) 
    function create_if_block_6(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "No stamp duty required for properties below\n\t\t\t\t\t\t\t\t\t£40,000";
    			add_location(p, file, 178, 8, 4679);
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
    		source: "(178:37) ",
    		ctx
    	});

    	return block;
    }

    // (176:7) {#if !housePrice}
    function create_if_block_5(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Remember, stamp duty is tiered";
    			add_location(p, file, 176, 8, 4595);
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
    		source: "(176:7) {#if !housePrice}",
    		ctx
    	});

    	return block;
    }

    // (214:7) {:else}
    function create_else_block_4(ctx) {
    	let p;
    	let t_value = /*requiredMortgage*/ ctx[9].toLocaleString("en") + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			add_location(p, file, 214, 8, 5739);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*requiredMortgage*/ 512 && t_value !== (t_value = /*requiredMortgage*/ ctx[9].toLocaleString("en") + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_4.name,
    		type: "else",
    		source: "(214:7) {:else}",
    		ctx
    	});

    	return block;
    }

    // (212:7) {#if !requiredMortgage}
    function create_if_block_4(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "£";
    			add_location(p, file, 212, 8, 5707);
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
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(212:7) {#if !requiredMortgage}",
    		ctx
    	});

    	return block;
    }

    // (230:7) {:else}
    function create_else_block_3(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*annualRentalIncome*/ ctx[10].toLocaleString("en") + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("£");
    			t1 = text(t1_value);
    			add_location(p, file, 230, 8, 6177);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*annualRentalIncome*/ 1024 && t1_value !== (t1_value = /*annualRentalIncome*/ ctx[10].toLocaleString("en") + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_3.name,
    		type: "else",
    		source: "(230:7) {:else}",
    		ctx
    	});

    	return block;
    }

    // (228:7) {#if !annualRentalIncome}
    function create_if_block_3(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "£";
    			add_location(p, file, 228, 8, 6145);
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
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(228:7) {#if !annualRentalIncome}",
    		ctx
    	});

    	return block;
    }

    // (317:7) {:else}
    function create_else_block_2(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Enter monthly rental income, estimated\n\t\t\t\t\t\t\t\t\tmonthly mortgage payment and/or estimated\n\t\t\t\t\t\t\t\t\tmonthly costs to continue";
    			attr_dev(p, "class", "output-warning svelte-iwyvcm");
    			add_location(p, file, 317, 8, 8512);
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
    		id: create_else_block_2.name,
    		type: "else",
    		source: "(317:7) {:else}",
    		ctx
    	});

    	return block;
    }

    // (315:7) {#if monthlyRentalIncome && monthlyMortgage && monthlyCosts}
    function create_if_block_2(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*monthlyProfit*/ ctx[8].toLocaleString("en") + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("£");
    			t1 = text(t1_value);
    			add_location(p, file, 315, 8, 8444);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*monthlyProfit*/ 256 && t1_value !== (t1_value = /*monthlyProfit*/ ctx[8].toLocaleString("en") + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(315:7) {#if monthlyRentalIncome && monthlyMortgage && monthlyCosts}",
    		ctx
    	});

    	return block;
    }

    // (331:7) {:else}
    function create_else_block_1(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*annualProfit*/ ctx[7].toLocaleString("en") + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("£");
    			t1 = text(t1_value);
    			add_location(p, file, 331, 8, 8939);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*annualProfit*/ 128 && t1_value !== (t1_value = /*annualProfit*/ ctx[7].toLocaleString("en") + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(331:7) {:else}",
    		ctx
    	});

    	return block;
    }

    // (329:7) {#if !monthlyProfit}
    function create_if_block_1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Same as above";
    			attr_dev(p, "class", "output-warning svelte-iwyvcm");
    			add_location(p, file, 329, 8, 8872);
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
    		source: "(329:7) {#if !monthlyProfit}",
    		ctx
    	});

    	return block;
    }

    // (343:7) {:else}
    function create_else_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Enter monthly rental income and all\n\t\t\t\t\t\t\t\t\tadditional calculation fields to continue";
    			attr_dev(p, "class", "output-warning svelte-iwyvcm");
    			add_location(p, file, 343, 8, 9269);
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
    		id: create_else_block.name,
    		type: "else",
    		source: "(343:7) {:else}",
    		ctx
    	});

    	return block;
    }

    // (339:7) {#if annualProfit && fees && oneOffCost}
    function create_if_block(ctx) {
    	let p;
    	let t0;
    	let t1_value = (/*breakEven*/ ctx[11] || 1) + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Estimated at least ");
    			t1 = text(t1_value);
    			t2 = text(" year(s)");
    			add_location(p, file, 339, 8, 9176);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*breakEven*/ 2048 && t1_value !== (t1_value = (/*breakEven*/ ctx[11] || 1) + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(339:7) {#if annualProfit && fees && oneOffCost}",
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
    	let div56;
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
    	let t9;
    	let a;
    	let t11;
    	let div55;
    	let h30;
    	let t13;
    	let div54;
    	let t14;
    	let div14;
    	let div4;
    	let div2;
    	let p2;
    	let t16;
    	let div3;
    	let p3;
    	let t18;
    	let input0;
    	let t19;
    	let div7;
    	let div5;
    	let p4;
    	let t21;
    	let div6;
    	let p5;
    	let t23;
    	let input1;
    	let t24;
    	let p6;
    	let t25_value = (/*depositPercent*/ ctx[14] || "") + "";
    	let t25;
    	let t26;
    	let span0;
    	let t28;
    	let div10;
    	let div8;
    	let p7;
    	let t30;
    	let div9;
    	let p8;
    	let t32;
    	let t33;
    	let div13;
    	let div11;
    	let p9;
    	let t35;
    	let div12;
    	let p10;
    	let t37;
    	let input2;
    	let t38;
    	let div30;
    	let div17;
    	let div15;
    	let t40;
    	let div16;
    	let t41;
    	let div20;
    	let div18;
    	let t43;
    	let div19;
    	let span1;
    	let t44_value = (/*yieldCalc*/ ctx[13] || "") + "";
    	let t44;
    	let t45;
    	let t46;
    	let div23;
    	let div21;
    	let t48;
    	let div22;
    	let t49;
    	let div26;
    	let div24;
    	let t51;
    	let div25;
    	let span2;
    	let t52_value = (/*ltv*/ ctx[12] || "") + "";
    	let t52;
    	let t53;
    	let t54;
    	let div29;
    	let div27;
    	let t56;
    	let div28;
    	let t57;
    	let h31;
    	let t59;
    	let p11;
    	let t61;
    	let div43;
    	let div42;
    	let div31;
    	let p12;
    	let t63;
    	let div32;
    	let p13;
    	let t65;
    	let input3;
    	let t66;
    	let div35;
    	let div33;
    	let p14;
    	let t68;
    	let div34;
    	let p15;
    	let t70;
    	let input4;
    	let t71;
    	let div38;
    	let div36;
    	let p16;
    	let t73;
    	let div37;
    	let p17;
    	let t75;
    	let input5;
    	let t76;
    	let div41;
    	let div39;
    	let p18;
    	let t78;
    	let div40;
    	let p19;
    	let t80;
    	let input6;
    	let t81;
    	let div53;
    	let div46;
    	let div44;
    	let t83;
    	let div45;
    	let t84;
    	let div49;
    	let div47;
    	let t86;
    	let div48;
    	let t87;
    	let div52;
    	let div50;
    	let t89;
    	let div51;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*depositPercent*/ ctx[14] < 25) return create_if_block_17;
    		return create_else_block_5;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (!/*housePrice*/ ctx[0]) return create_if_block_11;
    		if (/*housePrice*/ ctx[0] <= 40000) return create_if_block_12;
    		if (/*housePrice*/ ctx[0] > 40000 && /*housePrice*/ ctx[0] <= 250000) return create_if_block_13;
    		if (/*housePrice*/ ctx[0] > 250000 && /*housePrice*/ ctx[0] <= 925000) return create_if_block_14;
    		if (/*housePrice*/ ctx[0] > 925000 && /*housePrice*/ ctx[0] <= 1500000) return create_if_block_15;
    		if (/*housePrice*/ ctx[0] > 1500000) return create_if_block_16;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block1 = current_block_type_1 && current_block_type_1(ctx);

    	function select_block_type_2(ctx, dirty) {
    		if (!/*housePrice*/ ctx[0]) return create_if_block_5;
    		if (/*housePrice*/ ctx[0] <= 40000) return create_if_block_6;
    		if (/*housePrice*/ ctx[0] > 40000 && /*housePrice*/ ctx[0] <= 250000) return create_if_block_7;
    		if (/*housePrice*/ ctx[0] > 250000 && /*housePrice*/ ctx[0] <= 925000) return create_if_block_8;
    		if (/*housePrice*/ ctx[0] > 925000 && /*housePrice*/ ctx[0] <= 1500000) return create_if_block_9;
    		if (/*housePrice*/ ctx[0] > 1500000) return create_if_block_10;
    	}

    	let current_block_type_2 = select_block_type_2(ctx);
    	let if_block2 = current_block_type_2 && current_block_type_2(ctx);

    	function select_block_type_3(ctx, dirty) {
    		if (!/*requiredMortgage*/ ctx[9]) return create_if_block_4;
    		return create_else_block_4;
    	}

    	let current_block_type_3 = select_block_type_3(ctx);
    	let if_block3 = current_block_type_3(ctx);

    	function select_block_type_4(ctx, dirty) {
    		if (!/*annualRentalIncome*/ ctx[10]) return create_if_block_3;
    		return create_else_block_3;
    	}

    	let current_block_type_4 = select_block_type_4(ctx);
    	let if_block4 = current_block_type_4(ctx);

    	function select_block_type_5(ctx, dirty) {
    		if (/*monthlyRentalIncome*/ ctx[2] && /*monthlyMortgage*/ ctx[5] && /*monthlyCosts*/ ctx[6]) return create_if_block_2;
    		return create_else_block_2;
    	}

    	let current_block_type_5 = select_block_type_5(ctx);
    	let if_block5 = current_block_type_5(ctx);

    	function select_block_type_6(ctx, dirty) {
    		if (!/*monthlyProfit*/ ctx[8]) return create_if_block_1;
    		return create_else_block_1;
    	}

    	let current_block_type_6 = select_block_type_6(ctx);
    	let if_block6 = current_block_type_6(ctx);

    	function select_block_type_7(ctx, dirty) {
    		if (/*annualProfit*/ ctx[7] && /*fees*/ ctx[3] && /*oneOffCost*/ ctx[4]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type_7 = select_block_type_7(ctx);
    	let if_block7 = current_block_type_7(ctx);

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
    			div56 = element("div");
    			div1 = element("div");
    			img = element("img");
    			t4 = space();
    			div0 = element("div");
    			p1 = element("p");
    			p1.textContent = "Notes:";
    			t6 = space();
    			ul = element("ul");
    			li0 = element("li");
    			li0.textContent = "Upon sale, the investment property could incur a capital\n\t\t\t\t\t\tgains tax (not included in the calculations below).";
    			t8 = space();
    			li1 = element("li");
    			t9 = text("More helpful information are available on the UK\n\t\t\t\t\t\tgovernment's website: ");
    			a = element("a");
    			a.textContent = "Money Helper";
    			t11 = space();
    			div55 = element("div");
    			h30 = element("h3");
    			h30.textContent = "General Calculations";
    			t13 = space();
    			div54 = element("div");
    			if_block0.c();
    			t14 = space();
    			div14 = element("div");
    			div4 = element("div");
    			div2 = element("div");
    			p2 = element("p");
    			p2.textContent = "House Price";
    			t16 = space();
    			div3 = element("div");
    			p3 = element("p");
    			p3.textContent = "£";
    			t18 = space();
    			input0 = element("input");
    			t19 = space();
    			div7 = element("div");
    			div5 = element("div");
    			p4 = element("p");
    			p4.textContent = "Deposit";
    			t21 = space();
    			div6 = element("div");
    			p5 = element("p");
    			p5.textContent = "£";
    			t23 = space();
    			input1 = element("input");
    			t24 = space();
    			p6 = element("p");
    			t25 = text(t25_value);
    			t26 = space();
    			span0 = element("span");
    			span0.textContent = "%";
    			t28 = space();
    			div10 = element("div");
    			div8 = element("div");
    			p7 = element("p");
    			p7.textContent = "Stamp Duty";
    			t30 = space();
    			div9 = element("div");
    			p8 = element("p");
    			p8.textContent = "£";
    			t32 = space();
    			if (if_block1) if_block1.c();
    			t33 = space();
    			div13 = element("div");
    			div11 = element("div");
    			p9 = element("p");
    			p9.textContent = "Estimated Monthly Rental Income";
    			t35 = space();
    			div12 = element("div");
    			p10 = element("p");
    			p10.textContent = "£";
    			t37 = space();
    			input2 = element("input");
    			t38 = space();
    			div30 = element("div");
    			div17 = element("div");
    			div15 = element("div");
    			div15.textContent = "Stamp Duty Notes:";
    			t40 = space();
    			div16 = element("div");
    			if (if_block2) if_block2.c();
    			t41 = space();
    			div20 = element("div");
    			div18 = element("div");
    			div18.textContent = "Yield:";
    			t43 = space();
    			div19 = element("div");
    			span1 = element("span");
    			t44 = text(t44_value);
    			t45 = text("%");
    			t46 = space();
    			div23 = element("div");
    			div21 = element("div");
    			div21.textContent = "Mortgage Required:";
    			t48 = space();
    			div22 = element("div");
    			if_block3.c();
    			t49 = space();
    			div26 = element("div");
    			div24 = element("div");
    			div24.textContent = "Loan-to-Value:";
    			t51 = space();
    			div25 = element("div");
    			span2 = element("span");
    			t52 = text(t52_value);
    			t53 = text("%");
    			t54 = space();
    			div29 = element("div");
    			div27 = element("div");
    			div27.textContent = "Annual Rental Income:";
    			t56 = space();
    			div28 = element("div");
    			if_block4.c();
    			t57 = space();
    			h31 = element("h3");
    			h31.textContent = "Additional Calculations*";
    			t59 = space();
    			p11 = element("p");
    			p11.textContent = "*Calculations exclude house price, deposit and stamp duty on\n\t\t\t\t\tthe assumption that these will be covered in the re-sale\n\t\t\t\t\trevenue at the end of the investment period.";
    			t61 = space();
    			div43 = element("div");
    			div42 = element("div");
    			div31 = element("div");
    			p12 = element("p");
    			p12.textContent = "Estimated Fees (e.g. legal fees, bank fees,\n\t\t\t\t\t\t\t\tsurveyor's fees, etc.)";
    			t63 = space();
    			div32 = element("div");
    			p13 = element("p");
    			p13.textContent = "£";
    			t65 = space();
    			input3 = element("input");
    			t66 = space();
    			div35 = element("div");
    			div33 = element("div");
    			p14 = element("p");
    			p14.textContent = "Esimated One-Off Costs";
    			t68 = space();
    			div34 = element("div");
    			p15 = element("p");
    			p15.textContent = "£";
    			t70 = space();
    			input4 = element("input");
    			t71 = space();
    			div38 = element("div");
    			div36 = element("div");
    			p16 = element("p");
    			p16.textContent = "Esimated Monthly Mortgage Payment";
    			t73 = space();
    			div37 = element("div");
    			p17 = element("p");
    			p17.textContent = "£";
    			t75 = space();
    			input5 = element("input");
    			t76 = space();
    			div41 = element("div");
    			div39 = element("div");
    			p18 = element("p");
    			p18.textContent = "Esimated Monthly Costs";
    			t78 = space();
    			div40 = element("div");
    			p19 = element("p");
    			p19.textContent = "£";
    			t80 = space();
    			input6 = element("input");
    			t81 = space();
    			div53 = element("div");
    			div46 = element("div");
    			div44 = element("div");
    			div44.textContent = "Estimated Monthly Profit:";
    			t83 = space();
    			div45 = element("div");
    			if_block5.c();
    			t84 = space();
    			div49 = element("div");
    			div47 = element("div");
    			div47.textContent = "Estimated Annual Profit:";
    			t86 = space();
    			div48 = element("div");
    			if_block6.c();
    			t87 = space();
    			div52 = element("div");
    			div50 = element("div");
    			div50.textContent = "Break-Even:";
    			t89 = space();
    			div51 = element("div");
    			if_block7.c();
    			attr_dev(h1, "class", "svelte-iwyvcm");
    			add_location(h1, file, 23, 2, 625);
    			attr_dev(p0, "class", "description svelte-iwyvcm");
    			add_location(p0, file, 24, 2, 667);
    			add_location(header, file, 22, 1, 614);
    			if (!src_url_equal(img.src, img_src_value = "house.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "buy-to-let property investment calculator");
    			attr_dev(img, "class", "svelte-iwyvcm");
    			add_location(img, file, 28, 3, 780);
    			attr_dev(p1, "class", "svelte-iwyvcm");
    			add_location(p1, file, 33, 4, 890);
    			attr_dev(li0, "class", "svelte-iwyvcm");
    			add_location(li0, file, 35, 5, 918);
    			attr_dev(a, "href", "https://www.moneyhelper.org.uk/en/homes/buying-a-home/buy-to-let-mortgages-explained");
    			add_location(a, file, 41, 28, 1148);
    			attr_dev(li1, "class", "svelte-iwyvcm");
    			add_location(li1, file, 39, 5, 1060);
    			attr_dev(ul, "class", "svelte-iwyvcm");
    			add_location(ul, file, 34, 4, 908);
    			attr_dev(div0, "class", "notes svelte-iwyvcm");
    			add_location(div0, file, 32, 3, 866);
    			attr_dev(div1, "class", "framework-left svelte-iwyvcm");
    			add_location(div1, file, 27, 2, 748);
    			attr_dev(h30, "class", "svelte-iwyvcm");
    			add_location(h30, file, 52, 3, 1442);
    			attr_dev(p2, "class", "name svelte-iwyvcm");
    			add_location(p2, file, 68, 7, 1883);
    			attr_dev(div2, "class", "section-top");
    			add_location(div2, file, 67, 6, 1850);
    			attr_dev(p3, "class", "svelte-iwyvcm");
    			add_location(p3, file, 71, 7, 1970);
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "id", "house-price");
    			attr_dev(input0, "placeholder", "100,000");
    			attr_dev(input0, "class", "svelte-iwyvcm");
    			add_location(input0, file, 72, 7, 1986);
    			attr_dev(div3, "class", "section-bottom svelte-iwyvcm");
    			add_location(div3, file, 70, 6, 1934);
    			attr_dev(div4, "class", "section svelte-iwyvcm");
    			add_location(div4, file, 66, 5, 1822);
    			attr_dev(p4, "class", "name svelte-iwyvcm");
    			add_location(p4, file, 82, 7, 2203);
    			attr_dev(div5, "class", "section-top");
    			add_location(div5, file, 81, 6, 2170);
    			attr_dev(p5, "class", "svelte-iwyvcm");
    			add_location(p5, file, 85, 7, 2286);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "id", "deposit");
    			attr_dev(input1, "placeholder", "20,000");
    			attr_dev(input1, "class", "svelte-iwyvcm");
    			add_location(input1, file, 86, 7, 2302);
    			attr_dev(div6, "class", "section-bottom svelte-iwyvcm");
    			add_location(div6, file, 84, 6, 2250);
    			add_location(span0, file, 94, 30, 2486);
    			attr_dev(p6, "class", "note svelte-iwyvcm");
    			add_location(p6, file, 93, 6, 2439);
    			attr_dev(div7, "class", "section svelte-iwyvcm");
    			add_location(div7, file, 80, 5, 2142);
    			attr_dev(p7, "class", "name svelte-iwyvcm");
    			add_location(p7, file, 99, 7, 2590);
    			attr_dev(div8, "class", "section-top");
    			add_location(div8, file, 98, 6, 2557);
    			attr_dev(p8, "class", "svelte-iwyvcm");
    			add_location(p8, file, 102, 7, 2676);
    			attr_dev(div9, "class", "section-bottom svelte-iwyvcm");
    			add_location(div9, file, 101, 6, 2640);
    			attr_dev(div10, "class", "section svelte-iwyvcm");
    			add_location(div10, file, 97, 5, 2529);
    			attr_dev(p9, "class", "name svelte-iwyvcm");
    			add_location(p9, file, 157, 7, 4076);
    			attr_dev(div11, "class", "section-top");
    			add_location(div11, file, 156, 6, 4043);
    			attr_dev(p10, "class", "svelte-iwyvcm");
    			add_location(p10, file, 160, 7, 4183);
    			attr_dev(input2, "type", "number");
    			attr_dev(input2, "id", "monthly-rental-income");
    			attr_dev(input2, "placeholder", "800");
    			attr_dev(input2, "class", "svelte-iwyvcm");
    			add_location(input2, file, 161, 7, 4199);
    			attr_dev(div12, "class", "section-bottom svelte-iwyvcm");
    			add_location(div12, file, 159, 6, 4147);
    			attr_dev(div13, "class", "section svelte-iwyvcm");
    			add_location(div13, file, 155, 5, 4015);
    			attr_dev(div14, "class", "calc calc-input svelte-iwyvcm");
    			add_location(div14, file, 65, 4, 1787);
    			attr_dev(div15, "class", "col left note svelte-iwyvcm");
    			add_location(div15, file, 173, 6, 4476);
    			attr_dev(div16, "class", "col right note svelte-iwyvcm");
    			add_location(div16, file, 174, 6, 4533);
    			attr_dev(div17, "class", "row svelte-iwyvcm");
    			add_location(div17, file, 172, 5, 4452);
    			attr_dev(div18, "class", "col left svelte-iwyvcm");
    			add_location(div18, file, 203, 6, 5422);
    			attr_dev(span1, "id", "yield");
    			add_location(span1, file, 205, 7, 5494);
    			attr_dev(div19, "class", "col right svelte-iwyvcm");
    			add_location(div19, file, 204, 6, 5463);
    			attr_dev(div20, "class", "row svelte-iwyvcm");
    			add_location(div20, file, 202, 5, 5398);
    			attr_dev(div21, "class", "col left svelte-iwyvcm");
    			add_location(div21, file, 209, 6, 5591);
    			attr_dev(div22, "class", "col right svelte-iwyvcm");
    			add_location(div22, file, 210, 6, 5644);
    			attr_dev(div23, "class", "row svelte-iwyvcm");
    			add_location(div23, file, 208, 5, 5567);
    			attr_dev(div24, "class", "col left svelte-iwyvcm");
    			add_location(div24, file, 219, 6, 5853);
    			attr_dev(span2, "id", "yield");
    			add_location(span2, file, 221, 7, 5933);
    			attr_dev(div25, "class", "col right svelte-iwyvcm");
    			add_location(div25, file, 220, 6, 5902);
    			attr_dev(div26, "class", "row svelte-iwyvcm");
    			add_location(div26, file, 218, 5, 5829);
    			attr_dev(div27, "class", "col left svelte-iwyvcm");
    			add_location(div27, file, 225, 6, 6024);
    			attr_dev(div28, "class", "col right svelte-iwyvcm");
    			add_location(div28, file, 226, 6, 6080);
    			attr_dev(div29, "class", "row svelte-iwyvcm");
    			add_location(div29, file, 224, 5, 6000);
    			attr_dev(div30, "class", "calc calc-output svelte-iwyvcm");
    			add_location(div30, file, 171, 4, 4416);
    			attr_dev(h31, "class", "svelte-iwyvcm");
    			add_location(h31, file, 239, 4, 6395);
    			attr_dev(p11, "id", "additional-fyi");
    			attr_dev(p11, "class", "svelte-iwyvcm");
    			add_location(p11, file, 240, 4, 6433);
    			attr_dev(p12, "class", "name svelte-iwyvcm");
    			add_location(p12, file, 249, 7, 6784);
    			attr_dev(div31, "class", "section-top");
    			add_location(div31, file, 248, 6, 6751);
    			attr_dev(p13, "class", "svelte-iwyvcm");
    			add_location(p13, file, 255, 7, 6951);
    			attr_dev(input3, "type", "number");
    			attr_dev(input3, "id", "fees");
    			attr_dev(input3, "placeholder", "10,000");
    			attr_dev(input3, "class", "svelte-iwyvcm");
    			add_location(input3, file, 256, 7, 6967);
    			attr_dev(div32, "class", "section-bottom svelte-iwyvcm");
    			add_location(div32, file, 254, 6, 6915);
    			attr_dev(p14, "class", "name svelte-iwyvcm");
    			add_location(p14, file, 265, 8, 7161);
    			attr_dev(div33, "class", "section-top");
    			add_location(div33, file, 264, 7, 7127);
    			attr_dev(p15, "class", "svelte-iwyvcm");
    			add_location(p15, file, 268, 8, 7262);
    			attr_dev(input4, "type", "number");
    			attr_dev(input4, "id", "oneOffCost");
    			attr_dev(input4, "placeholder", "1,000");
    			attr_dev(input4, "class", "svelte-iwyvcm");
    			add_location(input4, file, 269, 8, 7279);
    			attr_dev(div34, "class", "section-bottom svelte-iwyvcm");
    			add_location(div34, file, 267, 7, 7225);
    			attr_dev(div35, "class", "section svelte-iwyvcm");
    			add_location(div35, file, 263, 6, 7098);
    			attr_dev(p16, "class", "name svelte-iwyvcm");
    			add_location(p16, file, 279, 8, 7503);
    			attr_dev(div36, "class", "section-top");
    			add_location(div36, file, 278, 7, 7469);
    			attr_dev(p17, "class", "svelte-iwyvcm");
    			add_location(p17, file, 284, 8, 7634);
    			attr_dev(input5, "type", "number");
    			attr_dev(input5, "id", "monthlyMortgage");
    			attr_dev(input5, "placeholder", "200");
    			attr_dev(input5, "class", "svelte-iwyvcm");
    			add_location(input5, file, 285, 8, 7651);
    			attr_dev(div37, "class", "section-bottom svelte-iwyvcm");
    			add_location(div37, file, 283, 7, 7597);
    			attr_dev(div38, "class", "section svelte-iwyvcm");
    			add_location(div38, file, 277, 6, 7440);
    			attr_dev(p18, "class", "name svelte-iwyvcm");
    			add_location(p18, file, 295, 8, 7883);
    			attr_dev(div39, "class", "section-top");
    			add_location(div39, file, 294, 7, 7849);
    			attr_dev(p19, "class", "svelte-iwyvcm");
    			add_location(p19, file, 298, 8, 7984);
    			attr_dev(input6, "type", "number");
    			attr_dev(input6, "id", "monthlyCosts");
    			attr_dev(input6, "placeholder", "50");
    			attr_dev(input6, "class", "svelte-iwyvcm");
    			add_location(input6, file, 299, 8, 8001);
    			attr_dev(div40, "class", "section-bottom svelte-iwyvcm");
    			add_location(div40, file, 297, 7, 7947);
    			attr_dev(div41, "class", "section svelte-iwyvcm");
    			add_location(div41, file, 293, 6, 7820);
    			attr_dev(div42, "class", "section svelte-iwyvcm");
    			add_location(div42, file, 247, 5, 6723);
    			attr_dev(div43, "class", "calc calc-input svelte-iwyvcm");
    			add_location(div43, file, 246, 4, 6688);
    			attr_dev(div44, "class", "col left svelte-iwyvcm");
    			add_location(div44, file, 312, 6, 8284);
    			attr_dev(div45, "class", "col right svelte-iwyvcm");
    			add_location(div45, file, 313, 6, 8344);
    			attr_dev(div46, "class", "row svelte-iwyvcm");
    			add_location(div46, file, 311, 5, 8260);
    			attr_dev(div47, "class", "col left svelte-iwyvcm");
    			add_location(div47, file, 326, 6, 8753);
    			attr_dev(div48, "class", "col right svelte-iwyvcm");
    			add_location(div48, file, 327, 6, 8812);
    			attr_dev(div49, "class", "row svelte-iwyvcm");
    			add_location(div49, file, 325, 5, 8729);
    			attr_dev(div50, "class", "col left svelte-iwyvcm");
    			add_location(div50, file, 336, 6, 9050);
    			attr_dev(div51, "class", "col right svelte-iwyvcm");
    			add_location(div51, file, 337, 6, 9096);
    			attr_dev(div52, "class", "row svelte-iwyvcm");
    			add_location(div52, file, 335, 5, 9026);
    			attr_dev(div53, "class", "calc calc-output svelte-iwyvcm");
    			add_location(div53, file, 310, 4, 8224);
    			attr_dev(div54, "class", "container general svelte-iwyvcm");
    			add_location(div54, file, 53, 3, 1475);
    			attr_dev(div55, "class", "framework-right svelte-iwyvcm");
    			add_location(div55, file, 50, 2, 1362);
    			attr_dev(div56, "class", "framework svelte-iwyvcm");
    			add_location(div56, file, 26, 1, 722);
    			attr_dev(main, "class", "svelte-iwyvcm");
    			add_location(main, file, 21, 0, 606);
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
    			append_dev(main, div56);
    			append_dev(div56, div1);
    			append_dev(div1, img);
    			append_dev(div1, t4);
    			append_dev(div1, div0);
    			append_dev(div0, p1);
    			append_dev(div0, t6);
    			append_dev(div0, ul);
    			append_dev(ul, li0);
    			append_dev(ul, t8);
    			append_dev(ul, li1);
    			append_dev(li1, t9);
    			append_dev(li1, a);
    			append_dev(div56, t11);
    			append_dev(div56, div55);
    			append_dev(div55, h30);
    			append_dev(div55, t13);
    			append_dev(div55, div54);
    			if_block0.m(div54, null);
    			append_dev(div54, t14);
    			append_dev(div54, div14);
    			append_dev(div14, div4);
    			append_dev(div4, div2);
    			append_dev(div2, p2);
    			append_dev(div4, t16);
    			append_dev(div4, div3);
    			append_dev(div3, p3);
    			append_dev(div3, t18);
    			append_dev(div3, input0);
    			set_input_value(input0, /*housePrice*/ ctx[0]);
    			append_dev(div14, t19);
    			append_dev(div14, div7);
    			append_dev(div7, div5);
    			append_dev(div5, p4);
    			append_dev(div7, t21);
    			append_dev(div7, div6);
    			append_dev(div6, p5);
    			append_dev(div6, t23);
    			append_dev(div6, input1);
    			set_input_value(input1, /*deposit*/ ctx[1]);
    			append_dev(div7, t24);
    			append_dev(div7, p6);
    			append_dev(p6, t25);
    			append_dev(p6, t26);
    			append_dev(p6, span0);
    			append_dev(div14, t28);
    			append_dev(div14, div10);
    			append_dev(div10, div8);
    			append_dev(div8, p7);
    			append_dev(div10, t30);
    			append_dev(div10, div9);
    			append_dev(div9, p8);
    			append_dev(div9, t32);
    			if (if_block1) if_block1.m(div9, null);
    			append_dev(div14, t33);
    			append_dev(div14, div13);
    			append_dev(div13, div11);
    			append_dev(div11, p9);
    			append_dev(div13, t35);
    			append_dev(div13, div12);
    			append_dev(div12, p10);
    			append_dev(div12, t37);
    			append_dev(div12, input2);
    			set_input_value(input2, /*monthlyRentalIncome*/ ctx[2]);
    			append_dev(div54, t38);
    			append_dev(div54, div30);
    			append_dev(div30, div17);
    			append_dev(div17, div15);
    			append_dev(div17, t40);
    			append_dev(div17, div16);
    			if (if_block2) if_block2.m(div16, null);
    			append_dev(div30, t41);
    			append_dev(div30, div20);
    			append_dev(div20, div18);
    			append_dev(div20, t43);
    			append_dev(div20, div19);
    			append_dev(div19, span1);
    			append_dev(span1, t44);
    			append_dev(div19, t45);
    			append_dev(div30, t46);
    			append_dev(div30, div23);
    			append_dev(div23, div21);
    			append_dev(div23, t48);
    			append_dev(div23, div22);
    			if_block3.m(div22, null);
    			append_dev(div30, t49);
    			append_dev(div30, div26);
    			append_dev(div26, div24);
    			append_dev(div26, t51);
    			append_dev(div26, div25);
    			append_dev(div25, span2);
    			append_dev(span2, t52);
    			append_dev(div25, t53);
    			append_dev(div30, t54);
    			append_dev(div30, div29);
    			append_dev(div29, div27);
    			append_dev(div29, t56);
    			append_dev(div29, div28);
    			if_block4.m(div28, null);
    			append_dev(div54, t57);
    			append_dev(div54, h31);
    			append_dev(div54, t59);
    			append_dev(div54, p11);
    			append_dev(div54, t61);
    			append_dev(div54, div43);
    			append_dev(div43, div42);
    			append_dev(div42, div31);
    			append_dev(div31, p12);
    			append_dev(div42, t63);
    			append_dev(div42, div32);
    			append_dev(div32, p13);
    			append_dev(div32, t65);
    			append_dev(div32, input3);
    			set_input_value(input3, /*fees*/ ctx[3]);
    			append_dev(div42, t66);
    			append_dev(div42, div35);
    			append_dev(div35, div33);
    			append_dev(div33, p14);
    			append_dev(div35, t68);
    			append_dev(div35, div34);
    			append_dev(div34, p15);
    			append_dev(div34, t70);
    			append_dev(div34, input4);
    			set_input_value(input4, /*oneOffCost*/ ctx[4]);
    			append_dev(div42, t71);
    			append_dev(div42, div38);
    			append_dev(div38, div36);
    			append_dev(div36, p16);
    			append_dev(div38, t73);
    			append_dev(div38, div37);
    			append_dev(div37, p17);
    			append_dev(div37, t75);
    			append_dev(div37, input5);
    			set_input_value(input5, /*monthlyMortgage*/ ctx[5]);
    			append_dev(div42, t76);
    			append_dev(div42, div41);
    			append_dev(div41, div39);
    			append_dev(div39, p18);
    			append_dev(div41, t78);
    			append_dev(div41, div40);
    			append_dev(div40, p19);
    			append_dev(div40, t80);
    			append_dev(div40, input6);
    			set_input_value(input6, /*monthlyCosts*/ ctx[6]);
    			append_dev(div54, t81);
    			append_dev(div54, div53);
    			append_dev(div53, div46);
    			append_dev(div46, div44);
    			append_dev(div46, t83);
    			append_dev(div46, div45);
    			if_block5.m(div45, null);
    			append_dev(div53, t84);
    			append_dev(div53, div49);
    			append_dev(div49, div47);
    			append_dev(div49, t86);
    			append_dev(div49, div48);
    			if_block6.m(div48, null);
    			append_dev(div53, t87);
    			append_dev(div53, div52);
    			append_dev(div52, div50);
    			append_dev(div52, t89);
    			append_dev(div52, div51);
    			if_block7.m(div51, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[15]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[16]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[17]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[18]),
    					listen_dev(input4, "input", /*input4_input_handler*/ ctx[19]),
    					listen_dev(input5, "input", /*input5_input_handler*/ ctx[20]),
    					listen_dev(input6, "input", /*input6_input_handler*/ ctx[21])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div54, t14);
    				}
    			}

    			if (dirty & /*housePrice*/ 1 && to_number(input0.value) !== /*housePrice*/ ctx[0]) {
    				set_input_value(input0, /*housePrice*/ ctx[0]);
    			}

    			if (dirty & /*deposit*/ 2 && to_number(input1.value) !== /*deposit*/ ctx[1]) {
    				set_input_value(input1, /*deposit*/ ctx[1]);
    			}

    			if (dirty & /*depositPercent*/ 16384 && t25_value !== (t25_value = (/*depositPercent*/ ctx[14] || "") + "")) set_data_dev(t25, t25_value);

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

    			if (dirty & /*yieldCalc*/ 8192 && t44_value !== (t44_value = (/*yieldCalc*/ ctx[13] || "") + "")) set_data_dev(t44, t44_value);

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

    			if (dirty & /*ltv*/ 4096 && t52_value !== (t52_value = (/*ltv*/ ctx[12] || "") + "")) set_data_dev(t52, t52_value);

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

    			if (dirty & /*fees*/ 8 && to_number(input3.value) !== /*fees*/ ctx[3]) {
    				set_input_value(input3, /*fees*/ ctx[3]);
    			}

    			if (dirty & /*oneOffCost*/ 16 && to_number(input4.value) !== /*oneOffCost*/ ctx[4]) {
    				set_input_value(input4, /*oneOffCost*/ ctx[4]);
    			}

    			if (dirty & /*monthlyMortgage*/ 32 && to_number(input5.value) !== /*monthlyMortgage*/ ctx[5]) {
    				set_input_value(input5, /*monthlyMortgage*/ ctx[5]);
    			}

    			if (dirty & /*monthlyCosts*/ 64 && to_number(input6.value) !== /*monthlyCosts*/ ctx[6]) {
    				set_input_value(input6, /*monthlyCosts*/ ctx[6]);
    			}

    			if (current_block_type_5 === (current_block_type_5 = select_block_type_5(ctx)) && if_block5) {
    				if_block5.p(ctx, dirty);
    			} else {
    				if_block5.d(1);
    				if_block5 = current_block_type_5(ctx);

    				if (if_block5) {
    					if_block5.c();
    					if_block5.m(div45, null);
    				}
    			}

    			if (current_block_type_6 === (current_block_type_6 = select_block_type_6(ctx)) && if_block6) {
    				if_block6.p(ctx, dirty);
    			} else {
    				if_block6.d(1);
    				if_block6 = current_block_type_6(ctx);

    				if (if_block6) {
    					if_block6.c();
    					if_block6.m(div48, null);
    				}
    			}

    			if (current_block_type_7 === (current_block_type_7 = select_block_type_7(ctx)) && if_block7) {
    				if_block7.p(ctx, dirty);
    			} else {
    				if_block7.d(1);
    				if_block7 = current_block_type_7(ctx);

    				if (if_block7) {
    					if_block7.c();
    					if_block7.m(div51, null);
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
    			if_block5.d();
    			if_block6.d();
    			if_block7.d();
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
    	let monthlyProfit;
    	let annualProfit;
    	let breakEven;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let housePrice;
    	let deposit;
    	let monthlyRentalIncome;
    	let fees;
    	let oneOffCost;
    	let monthlyMortgage;
    	let monthlyCosts;
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

    	function input3_input_handler() {
    		fees = to_number(this.value);
    		$$invalidate(3, fees);
    	}

    	function input4_input_handler() {
    		oneOffCost = to_number(this.value);
    		$$invalidate(4, oneOffCost);
    	}

    	function input5_input_handler() {
    		monthlyMortgage = to_number(this.value);
    		$$invalidate(5, monthlyMortgage);
    	}

    	function input6_input_handler() {
    		monthlyCosts = to_number(this.value);
    		$$invalidate(6, monthlyCosts);
    	}

    	$$self.$capture_state = () => ({
    		housePrice,
    		deposit,
    		monthlyRentalIncome,
    		fees,
    		oneOffCost,
    		monthlyMortgage,
    		monthlyCosts,
    		annualProfit,
    		breakEven,
    		monthlyProfit,
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
    		if ('fees' in $$props) $$invalidate(3, fees = $$props.fees);
    		if ('oneOffCost' in $$props) $$invalidate(4, oneOffCost = $$props.oneOffCost);
    		if ('monthlyMortgage' in $$props) $$invalidate(5, monthlyMortgage = $$props.monthlyMortgage);
    		if ('monthlyCosts' in $$props) $$invalidate(6, monthlyCosts = $$props.monthlyCosts);
    		if ('annualProfit' in $$props) $$invalidate(7, annualProfit = $$props.annualProfit);
    		if ('breakEven' in $$props) $$invalidate(11, breakEven = $$props.breakEven);
    		if ('monthlyProfit' in $$props) $$invalidate(8, monthlyProfit = $$props.monthlyProfit);
    		if ('requiredMortgage' in $$props) $$invalidate(9, requiredMortgage = $$props.requiredMortgage);
    		if ('ltv' in $$props) $$invalidate(12, ltv = $$props.ltv);
    		if ('annualRentalIncome' in $$props) $$invalidate(10, annualRentalIncome = $$props.annualRentalIncome);
    		if ('yieldCalc' in $$props) $$invalidate(13, yieldCalc = $$props.yieldCalc);
    		if ('depositPercent' in $$props) $$invalidate(14, depositPercent = $$props.depositPercent);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*deposit, housePrice*/ 3) {
    			$$invalidate(14, depositPercent = deposit / housePrice * 100);
    		}

    		if ($$self.$$.dirty & /*monthlyRentalIncome*/ 4) {
    			$$invalidate(10, annualRentalIncome = monthlyRentalIncome * 12);
    		}

    		if ($$self.$$.dirty & /*annualRentalIncome, housePrice*/ 1025) {
    			$$invalidate(13, yieldCalc = annualRentalIncome / housePrice * 100);
    		}

    		if ($$self.$$.dirty & /*housePrice, deposit*/ 3) {
    			$$invalidate(9, requiredMortgage = housePrice - deposit);
    		}

    		if ($$self.$$.dirty & /*requiredMortgage, housePrice*/ 513) {
    			$$invalidate(12, ltv = requiredMortgage / housePrice * 100);
    		}

    		if ($$self.$$.dirty & /*monthlyRentalIncome, monthlyCosts, monthlyMortgage*/ 100) {
    			$$invalidate(8, monthlyProfit = monthlyRentalIncome - monthlyCosts - monthlyMortgage);
    		}

    		if ($$self.$$.dirty & /*monthlyProfit*/ 256) {
    			$$invalidate(7, annualProfit = monthlyProfit * 12);
    		}

    		if ($$self.$$.dirty & /*fees, oneOffCost, annualProfit*/ 152) {
    			$$invalidate(11, breakEven = Math.round((fees + oneOffCost) / annualProfit));
    		}
    	};

    	return [
    		housePrice,
    		deposit,
    		monthlyRentalIncome,
    		fees,
    		oneOffCost,
    		monthlyMortgage,
    		monthlyCosts,
    		annualProfit,
    		monthlyProfit,
    		requiredMortgage,
    		annualRentalIncome,
    		breakEven,
    		ltv,
    		yieldCalc,
    		depositPercent,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler,
    		input4_input_handler,
    		input5_input_handler,
    		input6_input_handler
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
