
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

    // (49:2) {:else}
    function create_else_block_5(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Enter required fields below to continue";
    			attr_dev(p, "class", "message svelte-12mxchm");
    			add_location(p, file, 49, 3, 1307);
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
    		source: "(49:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (45:2) {#if depositPercent < 25}
    function create_if_block_17(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Generally, deposit should be at least 25% of property price";
    			attr_dev(p, "class", "warning svelte-12mxchm");
    			add_location(p, file, 45, 3, 1202);
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
    		source: "(45:2) {#if depositPercent < 25}",
    		ctx
    	});

    	return block;
    }

    // (129:36) 
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
    			attr_dev(input, "class", "svelte-12mxchm");
    			add_location(input, file, 129, 6, 3198);
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
    		source: "(129:36) ",
    		ctx
    	});

    	return block;
    }

    // (120:60) 
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
    			attr_dev(input, "class", "svelte-12mxchm");
    			add_location(input, file, 120, 6, 2976);
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
    		source: "(120:60) ",
    		ctx
    	});

    	return block;
    }

    // (113:59) 
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
    			attr_dev(input, "class", "svelte-12mxchm");
    			add_location(input, file, 113, 6, 2773);
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
    		source: "(113:59) ",
    		ctx
    	});

    	return block;
    }

    // (106:58) 
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
    			attr_dev(input, "class", "svelte-12mxchm");
    			add_location(input, file, 106, 6, 2598);
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
    		source: "(106:58) ",
    		ctx
    	});

    	return block;
    }

    // (99:35) 
    function create_if_block_12(ctx) {
    	let input;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "number");
    			attr_dev(input, "id", "stamp-duty");
    			input.value = "0";
    			input.readOnly = true;
    			attr_dev(input, "class", "svelte-12mxchm");
    			add_location(input, file, 99, 6, 2440);
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
    		source: "(99:35) ",
    		ctx
    	});

    	return block;
    }

    // (91:5) {#if !housePrice}
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
    			attr_dev(input, "class", "svelte-12mxchm");
    			add_location(input, file, 91, 6, 2262);
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
    		source: "(91:5) {#if !housePrice}",
    		ctx
    	});

    	return block;
    }

    // (183:36) 
    function create_if_block_10(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "For properties above £1.5m, 15% tiered";
    			add_location(p, file, 183, 6, 4645);
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
    		source: "(183:36) ",
    		ctx
    	});

    	return block;
    }

    // (178:60) 
    function create_if_block_9(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "For properties between £925,001 and £1.5m, 13%\n\t\t\t\t\t\t\ttiered";
    			add_location(p, file, 178, 6, 4519);
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
    		source: "(178:60) ",
    		ctx
    	});

    	return block;
    }

    // (173:59) 
    function create_if_block_8(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "For properties between £250,001 and £925,000, 8%\n\t\t\t\t\t\t\ttiered";
    			add_location(p, file, 173, 6, 4367);
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
    		source: "(173:59) ",
    		ctx
    	});

    	return block;
    }

    // (168:58) 
    function create_if_block_7(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "For properties between £40,001 and £250,000, 3% on\n\t\t\t\t\t\t\tfull property price";
    			add_location(p, file, 168, 6, 4201);
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
    		source: "(168:58) ",
    		ctx
    	});

    	return block;
    }

    // (164:35) 
    function create_if_block_6(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "No stamp duty required for properties below £40,000";
    			add_location(p, file, 164, 6, 4062);
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
    		source: "(164:35) ",
    		ctx
    	});

    	return block;
    }

    // (162:5) {#if !housePrice}
    function create_if_block_5(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Remember, stamp duty is tiered";
    			add_location(p, file, 162, 6, 3982);
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
    		source: "(162:5) {#if !housePrice}",
    		ctx
    	});

    	return block;
    }

    // (199:5) {:else}
    function create_else_block_4(ctx) {
    	let p;
    	let t_value = /*requiredMortgage*/ ctx[9].toLocaleString("en") + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			add_location(p, file, 199, 6, 5043);
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
    		source: "(199:5) {:else}",
    		ctx
    	});

    	return block;
    }

    // (197:5) {#if !requiredMortgage}
    function create_if_block_4(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "£";
    			add_location(p, file, 197, 6, 5015);
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
    		source: "(197:5) {#if !requiredMortgage}",
    		ctx
    	});

    	return block;
    }

    // (215:5) {:else}
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
    			add_location(p, file, 215, 6, 5449);
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
    		source: "(215:5) {:else}",
    		ctx
    	});

    	return block;
    }

    // (213:5) {#if !annualRentalIncome}
    function create_if_block_3(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "£";
    			add_location(p, file, 213, 6, 5421);
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
    		source: "(213:5) {#if !annualRentalIncome}",
    		ctx
    	});

    	return block;
    }

    // (311:5) {:else}
    function create_else_block_2(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Enter monthly rental income, monthly mortgage and\n\t\t\t\t\t\t\tmonthly costs to continue";
    			attr_dev(p, "class", "output-warning svelte-12mxchm");
    			add_location(p, file, 311, 6, 7868);
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
    		source: "(311:5) {:else}",
    		ctx
    	});

    	return block;
    }

    // (309:5) {#if monthlyRentalIncome && monthlyMortgage && monthlyCosts}
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
    			add_location(p, file, 309, 6, 7804);
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
    		source: "(309:5) {#if monthlyRentalIncome && monthlyMortgage && monthlyCosts}",
    		ctx
    	});

    	return block;
    }

    // (324:5) {:else}
    function create_else_block_1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Enter monthly rental income, monthly mortgage and\n\t\t\t\t\t\t\tmonthly costs to continue";
    			attr_dev(p, "class", "output-warning svelte-12mxchm");
    			add_location(p, file, 324, 6, 8269);
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
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(324:5) {:else}",
    		ctx
    	});

    	return block;
    }

    // (322:5) {#if monthlyRentalIncome && monthlyMortgage && monthlyCosts}
    function create_if_block_1(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*annualProfit*/ ctx[7].toLocaleString("en") + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("£");
    			t1 = text(t1_value);
    			add_location(p, file, 322, 6, 8206);
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
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(322:5) {#if monthlyRentalIncome && monthlyMortgage && monthlyCosts}",
    		ctx
    	});

    	return block;
    }

    // (339:5) {:else}
    function create_else_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Enter monthly rental income and all additional\n\t\t\t\t\t\t\tcalculation fields to continue";
    			attr_dev(p, "class", "output-warning svelte-12mxchm");
    			add_location(p, file, 339, 6, 8659);
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
    		source: "(339:5) {:else}",
    		ctx
    	});

    	return block;
    }

    // (335:5) {#if annualProfit && fees && oneOffCost}
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
    			add_location(p, file, 335, 6, 8574);
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
    		source: "(335:5) {#if annualProfit && fees && oneOffCost}",
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
    	let div0;
    	let p1;
    	let t5;
    	let p2;
    	let t6;
    	let a;
    	let t8;
    	let h30;
    	let t10;
    	let div30;
    	let t11;
    	let div13;
    	let div3;
    	let div1;
    	let p3;
    	let t13;
    	let div2;
    	let p4;
    	let t15;
    	let input0;
    	let t16;
    	let div6;
    	let div4;
    	let p5;
    	let t18;
    	let div5;
    	let p6;
    	let t20;
    	let input1;
    	let t21;
    	let p7;
    	let t22_value = (/*depositPercent*/ ctx[14] || "") + "";
    	let t22;
    	let t23;
    	let span0;
    	let t25;
    	let div9;
    	let div7;
    	let p8;
    	let t27;
    	let div8;
    	let p9;
    	let t29;
    	let t30;
    	let div12;
    	let div10;
    	let p10;
    	let t32;
    	let div11;
    	let p11;
    	let t34;
    	let input2;
    	let t35;
    	let div29;
    	let div16;
    	let div14;
    	let t37;
    	let div15;
    	let t38;
    	let div19;
    	let div17;
    	let t40;
    	let div18;
    	let span1;
    	let t41_value = (/*yieldCalc*/ ctx[13] || "") + "";
    	let t41;
    	let t42;
    	let t43;
    	let div22;
    	let div20;
    	let t45;
    	let div21;
    	let t46;
    	let div25;
    	let div23;
    	let t48;
    	let div24;
    	let span2;
    	let t49_value = (/*ltv*/ ctx[12] || "") + "";
    	let t49;
    	let t50;
    	let t51;
    	let div28;
    	let div26;
    	let t53;
    	let div27;
    	let t54;
    	let div54;
    	let h31;
    	let t56;
    	let p12;
    	let t58;
    	let div43;
    	let div33;
    	let div31;
    	let p13;
    	let t60;
    	let p14;
    	let t62;
    	let div32;
    	let p15;
    	let t64;
    	let input3;
    	let t65;
    	let div36;
    	let div34;
    	let p16;
    	let t67;
    	let p17;
    	let t69;
    	let div35;
    	let p18;
    	let t71;
    	let input4;
    	let t72;
    	let div39;
    	let div37;
    	let p19;
    	let t74;
    	let div38;
    	let p20;
    	let t76;
    	let input5;
    	let t77;
    	let div42;
    	let div40;
    	let p21;
    	let t79;
    	let p22;
    	let t81;
    	let div41;
    	let p23;
    	let t83;
    	let input6;
    	let t84;
    	let div53;
    	let div46;
    	let div44;
    	let t86;
    	let div45;
    	let t87;
    	let div49;
    	let div47;
    	let t89;
    	let div48;
    	let t90;
    	let div52;
    	let div50;
    	let t92;
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
    		if (/*monthlyRentalIncome*/ ctx[2] && /*monthlyMortgage*/ ctx[5] && /*monthlyCosts*/ ctx[6]) return create_if_block_1;
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
    			div0 = element("div");
    			p1 = element("p");
    			p1.textContent = "Use this calculator to quickly see what the buy-to-let investment\n\t\t\topportunity will look like.";
    			t5 = space();
    			p2 = element("p");
    			t6 = text("More helpful information are available on the UK government's\n\t\t\twebsite: ");
    			a = element("a");
    			a.textContent = "Money Helper.";
    			t8 = space();
    			h30 = element("h3");
    			h30.textContent = "General Calculations";
    			t10 = space();
    			div30 = element("div");
    			if_block0.c();
    			t11 = space();
    			div13 = element("div");
    			div3 = element("div");
    			div1 = element("div");
    			p3 = element("p");
    			p3.textContent = "House Price";
    			t13 = space();
    			div2 = element("div");
    			p4 = element("p");
    			p4.textContent = "£";
    			t15 = space();
    			input0 = element("input");
    			t16 = space();
    			div6 = element("div");
    			div4 = element("div");
    			p5 = element("p");
    			p5.textContent = "Deposit";
    			t18 = space();
    			div5 = element("div");
    			p6 = element("p");
    			p6.textContent = "£";
    			t20 = space();
    			input1 = element("input");
    			t21 = space();
    			p7 = element("p");
    			t22 = text(t22_value);
    			t23 = space();
    			span0 = element("span");
    			span0.textContent = "%";
    			t25 = space();
    			div9 = element("div");
    			div7 = element("div");
    			p8 = element("p");
    			p8.textContent = "Stamp Duty";
    			t27 = space();
    			div8 = element("div");
    			p9 = element("p");
    			p9.textContent = "£";
    			t29 = space();
    			if (if_block1) if_block1.c();
    			t30 = space();
    			div12 = element("div");
    			div10 = element("div");
    			p10 = element("p");
    			p10.textContent = "Estimated Monthly Rental Income";
    			t32 = space();
    			div11 = element("div");
    			p11 = element("p");
    			p11.textContent = "£";
    			t34 = space();
    			input2 = element("input");
    			t35 = space();
    			div29 = element("div");
    			div16 = element("div");
    			div14 = element("div");
    			div14.textContent = "Stamp Duty Notes:";
    			t37 = space();
    			div15 = element("div");
    			if (if_block2) if_block2.c();
    			t38 = space();
    			div19 = element("div");
    			div17 = element("div");
    			div17.textContent = "Yield:";
    			t40 = space();
    			div18 = element("div");
    			span1 = element("span");
    			t41 = text(t41_value);
    			t42 = text("%");
    			t43 = space();
    			div22 = element("div");
    			div20 = element("div");
    			div20.textContent = "Mortgage Required:";
    			t45 = space();
    			div21 = element("div");
    			if_block3.c();
    			t46 = space();
    			div25 = element("div");
    			div23 = element("div");
    			div23.textContent = "Loan-to-Value:";
    			t48 = space();
    			div24 = element("div");
    			span2 = element("span");
    			t49 = text(t49_value);
    			t50 = text("%");
    			t51 = space();
    			div28 = element("div");
    			div26 = element("div");
    			div26.textContent = "Annual Rental Income:";
    			t53 = space();
    			div27 = element("div");
    			if_block4.c();
    			t54 = space();
    			div54 = element("div");
    			h31 = element("h3");
    			h31.textContent = "Additional Calculations*";
    			t56 = space();
    			p12 = element("p");
    			p12.textContent = "*Calculations exclude house price, deposit and stamp duty on the\n\t\t\tassumption that these will be covered in the sale revenue at the end\n\t\t\tof the investment period.";
    			t58 = space();
    			div43 = element("div");
    			div33 = element("div");
    			div31 = element("div");
    			p13 = element("p");
    			p13.textContent = "Estimated Fees";
    			t60 = space();
    			p14 = element("p");
    			p14.textContent = "(e.g. legal fees, bank fees, surveyor's fees, etc.)";
    			t62 = space();
    			div32 = element("div");
    			p15 = element("p");
    			p15.textContent = "£";
    			t64 = space();
    			input3 = element("input");
    			t65 = space();
    			div36 = element("div");
    			div34 = element("div");
    			p16 = element("p");
    			p16.textContent = "Estimated One-Off Costs";
    			t67 = space();
    			p17 = element("p");
    			p17.textContent = "(e.g. refurbishment budget, letting fee, etc.)";
    			t69 = space();
    			div35 = element("div");
    			p18 = element("p");
    			p18.textContent = "£";
    			t71 = space();
    			input4 = element("input");
    			t72 = space();
    			div39 = element("div");
    			div37 = element("div");
    			p19 = element("p");
    			p19.textContent = "Estimated Monthly Mortgage Payment";
    			t74 = space();
    			div38 = element("div");
    			p20 = element("p");
    			p20.textContent = "£";
    			t76 = space();
    			input5 = element("input");
    			t77 = space();
    			div42 = element("div");
    			div40 = element("div");
    			p21 = element("p");
    			p21.textContent = "Estimated Monthly Costs";
    			t79 = space();
    			p22 = element("p");
    			p22.textContent = "(e.g. landlord insurance, service charge (if any), etc.)";
    			t81 = space();
    			div41 = element("div");
    			p23 = element("p");
    			p23.textContent = "£";
    			t83 = space();
    			input6 = element("input");
    			t84 = space();
    			div53 = element("div");
    			div46 = element("div");
    			div44 = element("div");
    			div44.textContent = "Estimated Monthly Profit:";
    			t86 = space();
    			div45 = element("div");
    			if_block5.c();
    			t87 = space();
    			div49 = element("div");
    			div47 = element("div");
    			div47.textContent = "Estimated Annual Profit:";
    			t89 = space();
    			div48 = element("div");
    			if_block6.c();
    			t90 = space();
    			div52 = element("div");
    			div50 = element("div");
    			div50.textContent = "Break-Even:";
    			t92 = space();
    			div51 = element("div");
    			if_block7.c();
    			attr_dev(h1, "class", "svelte-12mxchm");
    			add_location(h1, file, 22, 2, 597);
    			attr_dev(p0, "class", "svelte-12mxchm");
    			add_location(p0, file, 23, 2, 639);
    			attr_dev(header, "class", "svelte-12mxchm");
    			add_location(header, file, 21, 1, 586);
    			attr_dev(p1, "class", "svelte-12mxchm");
    			add_location(p1, file, 27, 2, 697);
    			attr_dev(a, "href", "https://www.moneyhelper.org.uk/en/homes/buying-a-home/buy-to-let-mortgages-explained");
    			add_location(a, file, 33, 12, 891);
    			attr_dev(p2, "class", "svelte-12mxchm");
    			add_location(p2, file, 31, 2, 810);
    			attr_dev(div0, "class", "notes svelte-12mxchm");
    			add_location(div0, file, 26, 1, 675);
    			attr_dev(h30, "class", "svelte-12mxchm");
    			add_location(h30, file, 42, 1, 1116);
    			attr_dev(p3, "class", "name svelte-12mxchm");
    			add_location(p3, file, 55, 5, 1499);
    			attr_dev(div1, "class", "section-top svelte-12mxchm");
    			add_location(div1, file, 54, 4, 1468);
    			attr_dev(p4, "class", "svelte-12mxchm");
    			add_location(p4, file, 58, 5, 1580);
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "id", "house-price");
    			attr_dev(input0, "placeholder", "100,000");
    			attr_dev(input0, "class", "svelte-12mxchm");
    			add_location(input0, file, 59, 5, 1594);
    			attr_dev(div2, "class", "section-bottom svelte-12mxchm");
    			add_location(div2, file, 57, 4, 1546);
    			attr_dev(div3, "class", "section svelte-12mxchm");
    			add_location(div3, file, 53, 3, 1442);
    			attr_dev(p5, "class", "name svelte-12mxchm");
    			add_location(p5, file, 69, 5, 1791);
    			attr_dev(div4, "class", "section-top svelte-12mxchm");
    			add_location(div4, file, 68, 4, 1760);
    			attr_dev(p6, "class", "svelte-12mxchm");
    			add_location(p6, file, 72, 5, 1868);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "id", "deposit");
    			attr_dev(input1, "placeholder", "20,000");
    			attr_dev(input1, "class", "svelte-12mxchm");
    			add_location(input1, file, 73, 5, 1882);
    			attr_dev(div5, "class", "section-bottom svelte-12mxchm");
    			add_location(div5, file, 71, 4, 1834);
    			add_location(span0, file, 81, 28, 2050);
    			attr_dev(p7, "class", "note svelte-12mxchm");
    			add_location(p7, file, 80, 4, 2005);
    			attr_dev(div6, "class", "section svelte-12mxchm");
    			add_location(div6, file, 67, 3, 1734);
    			attr_dev(p8, "class", "name svelte-12mxchm");
    			add_location(p8, file, 86, 5, 2144);
    			attr_dev(div7, "class", "section-top svelte-12mxchm");
    			add_location(div7, file, 85, 4, 2113);
    			attr_dev(p9, "class", "svelte-12mxchm");
    			add_location(p9, file, 89, 5, 2224);
    			attr_dev(div8, "class", "section-bottom svelte-12mxchm");
    			add_location(div8, file, 88, 4, 2190);
    			attr_dev(div9, "class", "section svelte-12mxchm");
    			add_location(div9, file, 84, 3, 2087);
    			attr_dev(p10, "class", "name svelte-12mxchm");
    			add_location(p10, file, 143, 5, 3506);
    			attr_dev(div10, "class", "section-top svelte-12mxchm");
    			add_location(div10, file, 142, 4, 3475);
    			attr_dev(p11, "class", "svelte-12mxchm");
    			add_location(p11, file, 146, 5, 3607);
    			attr_dev(input2, "type", "number");
    			attr_dev(input2, "id", "monthly-rental-income");
    			attr_dev(input2, "placeholder", "800");
    			attr_dev(input2, "class", "svelte-12mxchm");
    			add_location(input2, file, 147, 5, 3621);
    			attr_dev(div11, "class", "section-bottom svelte-12mxchm");
    			add_location(div11, file, 145, 4, 3573);
    			attr_dev(div12, "class", "section svelte-12mxchm");
    			add_location(div12, file, 141, 3, 3449);
    			attr_dev(div13, "class", "calc-input svelte-12mxchm");
    			add_location(div13, file, 52, 2, 1414);
    			attr_dev(div14, "class", "col left note svelte-12mxchm");
    			add_location(div14, file, 159, 4, 3869);
    			attr_dev(div15, "class", "col right note svelte-12mxchm");
    			add_location(div15, file, 160, 4, 3924);
    			attr_dev(div16, "class", "row svelte-12mxchm");
    			add_location(div16, file, 158, 3, 3847);
    			attr_dev(div17, "class", "col left svelte-12mxchm");
    			add_location(div17, file, 188, 4, 4748);
    			attr_dev(span1, "id", "yield");
    			add_location(span1, file, 190, 5, 4816);
    			attr_dev(div18, "class", "col right svelte-12mxchm");
    			add_location(div18, file, 189, 4, 4787);
    			attr_dev(div19, "class", "row svelte-12mxchm");
    			add_location(div19, file, 187, 3, 4726);
    			attr_dev(div20, "class", "col left svelte-12mxchm");
    			add_location(div20, file, 194, 4, 4905);
    			attr_dev(div21, "class", "col right svelte-12mxchm");
    			add_location(div21, file, 195, 4, 4956);
    			attr_dev(div22, "class", "row svelte-12mxchm");
    			add_location(div22, file, 193, 3, 4883);
    			attr_dev(div23, "class", "col left svelte-12mxchm");
    			add_location(div23, file, 204, 4, 5147);
    			attr_dev(span2, "id", "yield");
    			add_location(span2, file, 206, 5, 5223);
    			attr_dev(div24, "class", "col right svelte-12mxchm");
    			add_location(div24, file, 205, 4, 5194);
    			attr_dev(div25, "class", "row svelte-12mxchm");
    			add_location(div25, file, 203, 3, 5125);
    			attr_dev(div26, "class", "col left svelte-12mxchm");
    			add_location(div26, file, 210, 4, 5306);
    			attr_dev(div27, "class", "col right svelte-12mxchm");
    			add_location(div27, file, 211, 4, 5360);
    			attr_dev(div28, "class", "row svelte-12mxchm");
    			add_location(div28, file, 209, 3, 5284);
    			attr_dev(div29, "class", "calc-output");
    			add_location(div29, file, 157, 2, 3818);
    			attr_dev(div30, "class", "container svelte-12mxchm");
    			add_location(div30, file, 43, 1, 1147);
    			attr_dev(h31, "class", "svelte-12mxchm");
    			add_location(h31, file, 229, 2, 5775);
    			attr_dev(p12, "id", "additional-fyi");
    			attr_dev(p12, "class", "svelte-12mxchm");
    			add_location(p12, file, 230, 2, 5811);
    			attr_dev(p13, "class", "name svelte-12mxchm");
    			add_location(p13, file, 239, 5, 6136);
    			attr_dev(p14, "class", "note svelte-12mxchm");
    			add_location(p14, file, 240, 5, 6176);
    			attr_dev(div31, "class", "section-top svelte-12mxchm");
    			add_location(div31, file, 238, 4, 6105);
    			attr_dev(p15, "class", "svelte-12mxchm");
    			add_location(p15, file, 245, 5, 6310);
    			attr_dev(input3, "type", "number");
    			attr_dev(input3, "id", "fees");
    			attr_dev(input3, "placeholder", "10,000");
    			attr_dev(input3, "class", "svelte-12mxchm");
    			add_location(input3, file, 246, 5, 6324);
    			attr_dev(div32, "class", "section-bottom svelte-12mxchm");
    			add_location(div32, file, 244, 4, 6276);
    			attr_dev(div33, "class", "section svelte-12mxchm");
    			add_location(div33, file, 237, 3, 6079);
    			attr_dev(p16, "class", "name svelte-12mxchm");
    			add_location(p16, file, 256, 5, 6507);
    			attr_dev(p17, "class", "note svelte-12mxchm");
    			add_location(p17, file, 257, 5, 6556);
    			attr_dev(div34, "class", "section-top svelte-12mxchm");
    			add_location(div34, file, 255, 4, 6476);
    			attr_dev(p18, "class", "svelte-12mxchm");
    			add_location(p18, file, 262, 5, 6685);
    			attr_dev(input4, "type", "number");
    			attr_dev(input4, "id", "oneOffCost");
    			attr_dev(input4, "placeholder", "1,000");
    			attr_dev(input4, "class", "svelte-12mxchm");
    			add_location(input4, file, 263, 5, 6699);
    			attr_dev(div35, "class", "section-bottom svelte-12mxchm");
    			add_location(div35, file, 261, 4, 6651);
    			attr_dev(div36, "class", "section svelte-12mxchm");
    			add_location(div36, file, 254, 3, 6450);
    			attr_dev(p19, "class", "name svelte-12mxchm");
    			add_location(p19, file, 273, 5, 6893);
    			attr_dev(div37, "class", "section-top svelte-12mxchm");
    			add_location(div37, file, 272, 4, 6862);
    			attr_dev(p20, "class", "svelte-12mxchm");
    			add_location(p20, file, 276, 5, 6997);
    			attr_dev(input5, "type", "number");
    			attr_dev(input5, "id", "monthlyMortgage");
    			attr_dev(input5, "placeholder", "200");
    			attr_dev(input5, "class", "svelte-12mxchm");
    			add_location(input5, file, 277, 5, 7011);
    			attr_dev(div38, "class", "section-bottom svelte-12mxchm");
    			add_location(div38, file, 275, 4, 6963);
    			attr_dev(div39, "class", "section svelte-12mxchm");
    			add_location(div39, file, 271, 3, 6836);
    			attr_dev(p21, "class", "name svelte-12mxchm");
    			add_location(p21, file, 287, 5, 7213);
    			attr_dev(p22, "class", "note svelte-12mxchm");
    			add_location(p22, file, 288, 5, 7262);
    			attr_dev(div40, "class", "section-top svelte-12mxchm");
    			add_location(div40, file, 286, 4, 7182);
    			attr_dev(p23, "class", "svelte-12mxchm");
    			add_location(p23, file, 293, 5, 7401);
    			attr_dev(input6, "type", "number");
    			attr_dev(input6, "id", "monthlyCosts");
    			attr_dev(input6, "placeholder", "50");
    			attr_dev(input6, "class", "svelte-12mxchm");
    			add_location(input6, file, 294, 5, 7415);
    			attr_dev(div41, "class", "section-bottom svelte-12mxchm");
    			add_location(div41, file, 292, 4, 7367);
    			attr_dev(div42, "class", "section svelte-12mxchm");
    			add_location(div42, file, 285, 3, 7156);
    			attr_dev(div43, "class", "calc-input svelte-12mxchm");
    			add_location(div43, file, 236, 2, 6051);
    			attr_dev(div44, "class", "col left svelte-12mxchm");
    			add_location(div44, file, 306, 4, 7650);
    			attr_dev(div45, "class", "col right svelte-12mxchm");
    			add_location(div45, file, 307, 4, 7708);
    			attr_dev(div46, "class", "row svelte-12mxchm");
    			add_location(div46, file, 305, 3, 7628);
    			attr_dev(div47, "class", "col left svelte-12mxchm");
    			add_location(div47, file, 319, 4, 8053);
    			attr_dev(div48, "class", "col right svelte-12mxchm");
    			add_location(div48, file, 320, 4, 8110);
    			attr_dev(div49, "class", "row svelte-12mxchm");
    			add_location(div49, file, 318, 3, 8031);
    			attr_dev(div50, "class", "col left svelte-12mxchm");
    			add_location(div50, file, 332, 4, 8454);
    			attr_dev(div51, "class", "col right svelte-12mxchm");
    			add_location(div51, file, 333, 4, 8498);
    			attr_dev(div52, "class", "row svelte-12mxchm");
    			add_location(div52, file, 331, 3, 8432);
    			attr_dev(div53, "class", "calc-output");
    			add_location(div53, file, 304, 2, 7599);
    			attr_dev(div54, "class", "container svelte-12mxchm");
    			add_location(div54, file, 227, 1, 5700);
    			attr_dev(main, "class", "svelte-12mxchm");
    			add_location(main, file, 20, 0, 578);
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
    			append_dev(main, div0);
    			append_dev(div0, p1);
    			append_dev(div0, t5);
    			append_dev(div0, p2);
    			append_dev(p2, t6);
    			append_dev(p2, a);
    			append_dev(main, t8);
    			append_dev(main, h30);
    			append_dev(main, t10);
    			append_dev(main, div30);
    			if_block0.m(div30, null);
    			append_dev(div30, t11);
    			append_dev(div30, div13);
    			append_dev(div13, div3);
    			append_dev(div3, div1);
    			append_dev(div1, p3);
    			append_dev(div3, t13);
    			append_dev(div3, div2);
    			append_dev(div2, p4);
    			append_dev(div2, t15);
    			append_dev(div2, input0);
    			set_input_value(input0, /*housePrice*/ ctx[0]);
    			append_dev(div13, t16);
    			append_dev(div13, div6);
    			append_dev(div6, div4);
    			append_dev(div4, p5);
    			append_dev(div6, t18);
    			append_dev(div6, div5);
    			append_dev(div5, p6);
    			append_dev(div5, t20);
    			append_dev(div5, input1);
    			set_input_value(input1, /*deposit*/ ctx[1]);
    			append_dev(div6, t21);
    			append_dev(div6, p7);
    			append_dev(p7, t22);
    			append_dev(p7, t23);
    			append_dev(p7, span0);
    			append_dev(div13, t25);
    			append_dev(div13, div9);
    			append_dev(div9, div7);
    			append_dev(div7, p8);
    			append_dev(div9, t27);
    			append_dev(div9, div8);
    			append_dev(div8, p9);
    			append_dev(div8, t29);
    			if (if_block1) if_block1.m(div8, null);
    			append_dev(div13, t30);
    			append_dev(div13, div12);
    			append_dev(div12, div10);
    			append_dev(div10, p10);
    			append_dev(div12, t32);
    			append_dev(div12, div11);
    			append_dev(div11, p11);
    			append_dev(div11, t34);
    			append_dev(div11, input2);
    			set_input_value(input2, /*monthlyRentalIncome*/ ctx[2]);
    			append_dev(div30, t35);
    			append_dev(div30, div29);
    			append_dev(div29, div16);
    			append_dev(div16, div14);
    			append_dev(div16, t37);
    			append_dev(div16, div15);
    			if (if_block2) if_block2.m(div15, null);
    			append_dev(div29, t38);
    			append_dev(div29, div19);
    			append_dev(div19, div17);
    			append_dev(div19, t40);
    			append_dev(div19, div18);
    			append_dev(div18, span1);
    			append_dev(span1, t41);
    			append_dev(div18, t42);
    			append_dev(div29, t43);
    			append_dev(div29, div22);
    			append_dev(div22, div20);
    			append_dev(div22, t45);
    			append_dev(div22, div21);
    			if_block3.m(div21, null);
    			append_dev(div29, t46);
    			append_dev(div29, div25);
    			append_dev(div25, div23);
    			append_dev(div25, t48);
    			append_dev(div25, div24);
    			append_dev(div24, span2);
    			append_dev(span2, t49);
    			append_dev(div24, t50);
    			append_dev(div29, t51);
    			append_dev(div29, div28);
    			append_dev(div28, div26);
    			append_dev(div28, t53);
    			append_dev(div28, div27);
    			if_block4.m(div27, null);
    			append_dev(main, t54);
    			append_dev(main, div54);
    			append_dev(div54, h31);
    			append_dev(div54, t56);
    			append_dev(div54, p12);
    			append_dev(div54, t58);
    			append_dev(div54, div43);
    			append_dev(div43, div33);
    			append_dev(div33, div31);
    			append_dev(div31, p13);
    			append_dev(div31, t60);
    			append_dev(div31, p14);
    			append_dev(div33, t62);
    			append_dev(div33, div32);
    			append_dev(div32, p15);
    			append_dev(div32, t64);
    			append_dev(div32, input3);
    			set_input_value(input3, /*fees*/ ctx[3]);
    			append_dev(div43, t65);
    			append_dev(div43, div36);
    			append_dev(div36, div34);
    			append_dev(div34, p16);
    			append_dev(div34, t67);
    			append_dev(div34, p17);
    			append_dev(div36, t69);
    			append_dev(div36, div35);
    			append_dev(div35, p18);
    			append_dev(div35, t71);
    			append_dev(div35, input4);
    			set_input_value(input4, /*oneOffCost*/ ctx[4]);
    			append_dev(div43, t72);
    			append_dev(div43, div39);
    			append_dev(div39, div37);
    			append_dev(div37, p19);
    			append_dev(div39, t74);
    			append_dev(div39, div38);
    			append_dev(div38, p20);
    			append_dev(div38, t76);
    			append_dev(div38, input5);
    			set_input_value(input5, /*monthlyMortgage*/ ctx[5]);
    			append_dev(div43, t77);
    			append_dev(div43, div42);
    			append_dev(div42, div40);
    			append_dev(div40, p21);
    			append_dev(div40, t79);
    			append_dev(div40, p22);
    			append_dev(div42, t81);
    			append_dev(div42, div41);
    			append_dev(div41, p23);
    			append_dev(div41, t83);
    			append_dev(div41, input6);
    			set_input_value(input6, /*monthlyCosts*/ ctx[6]);
    			append_dev(div54, t84);
    			append_dev(div54, div53);
    			append_dev(div53, div46);
    			append_dev(div46, div44);
    			append_dev(div46, t86);
    			append_dev(div46, div45);
    			if_block5.m(div45, null);
    			append_dev(div53, t87);
    			append_dev(div53, div49);
    			append_dev(div49, div47);
    			append_dev(div49, t89);
    			append_dev(div49, div48);
    			if_block6.m(div48, null);
    			append_dev(div53, t90);
    			append_dev(div53, div52);
    			append_dev(div52, div50);
    			append_dev(div52, t92);
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
    					if_block0.m(div30, t11);
    				}
    			}

    			if (dirty & /*housePrice*/ 1 && to_number(input0.value) !== /*housePrice*/ ctx[0]) {
    				set_input_value(input0, /*housePrice*/ ctx[0]);
    			}

    			if (dirty & /*deposit*/ 2 && to_number(input1.value) !== /*deposit*/ ctx[1]) {
    				set_input_value(input1, /*deposit*/ ctx[1]);
    			}

    			if (dirty & /*depositPercent*/ 16384 && t22_value !== (t22_value = (/*depositPercent*/ ctx[14] || "") + "")) set_data_dev(t22, t22_value);

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_1(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if (if_block1) if_block1.d(1);
    				if_block1 = current_block_type_1 && current_block_type_1(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div8, null);
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
    					if_block2.m(div15, null);
    				}
    			}

    			if (dirty & /*yieldCalc*/ 8192 && t41_value !== (t41_value = (/*yieldCalc*/ ctx[13] || "") + "")) set_data_dev(t41, t41_value);

    			if (current_block_type_3 === (current_block_type_3 = select_block_type_3(ctx)) && if_block3) {
    				if_block3.p(ctx, dirty);
    			} else {
    				if_block3.d(1);
    				if_block3 = current_block_type_3(ctx);

    				if (if_block3) {
    					if_block3.c();
    					if_block3.m(div21, null);
    				}
    			}

    			if (dirty & /*ltv*/ 4096 && t49_value !== (t49_value = (/*ltv*/ ctx[12] || "") + "")) set_data_dev(t49, t49_value);

    			if (current_block_type_4 === (current_block_type_4 = select_block_type_4(ctx)) && if_block4) {
    				if_block4.p(ctx, dirty);
    			} else {
    				if_block4.d(1);
    				if_block4 = current_block_type_4(ctx);

    				if (if_block4) {
    					if_block4.c();
    					if_block4.m(div27, null);
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
