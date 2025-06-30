/**
 * ElementCore Framework v1.0
 * Lightweight Pure JavaScript Component System
 * 
 * @version 1.0.0
 * @author Mubbasher Mukhtar (https://www.linkedin.com/in/mubbasher-mukhtar/)
 * @license MIT
 */

(function (global) {
    'use strict';

    // HTML Tag Constants for syntactic sugar
    const tags = {
        div: { tag: "div" },
        span: { tag: "span" },
        p: { tag: "p" },
        h1: { tag: "h1" },
        h2: { tag: "h2" },
        h3: { tag: "h3" },
        h4: { tag: "h4" },
        h5: { tag: "h5" },
        h6: { tag: "h6" },
        button: { tag: "button" },
        input: { tag: "input" },
        form: { tag: "form" },
        img: { tag: "img" },
        a: { tag: "a" },
        ul: { tag: "ul" },
        ol: { tag: "ol" },
        li: { tag: "li" },
        table: { tag: "table" },
        thead: { tag: "thead" },
        tbody: { tag: "tbody" },
        tr: { tag: "tr" },
        td: { tag: "td" },
        th: { tag: "th" },
        section: { tag: "section" },
        article: { tag: "article" },
        header: { tag: "header" },
        footer: { tag: "footer" },
        nav: { tag: "nav" },
        main: { tag: "main" },
        aside: { tag: "aside" },
        select: { tag: "select" },
        option: { tag: "option" },
        textarea: { tag: "textarea" },
        label: { tag: "label" },
        fieldset: { tag: "fieldset" },
        legend: { tag: "legend" }
    };

    // Configuration Parser - Handles pure JS objects
    class ConfigParser {
        static parse(config) {
            if (typeof config === 'string') {
                return config; // Text node
            }

            if (Array.isArray(config)) {
                return config.map(item => this.parse(item));
            }

            if (!config || typeof config !== 'object') {
                return config;
            }

            let parsed = { ...config };

            // Handle shorthand syntax
            this.handleShorthandTags(parsed);

            // Handle children shorthand: c -> children
            if (parsed.c !== undefined && parsed.children === undefined) {
                parsed.children = parsed.c;
                delete parsed.c;
            }

            // Handle conditional rendering
            if (config.if !== undefined) {
                const condition = typeof config.if === 'function' ? config.if() : config.if;
                return condition ? this.parse(config.then) : this.parse(config.else || null);
            }

            // Handle switch objects
            if (config.switch !== undefined) {
                const switchValue = typeof config.switch === 'function' ? config.switch() : config.switch;
                const caseValue = config.cases[switchValue];
                return this.parse(caseValue || config.default || null);
            }

            // Convert single child to array
            if (parsed.children !== undefined && !Array.isArray(parsed.children)) {
                parsed.children = [parsed.children];
            }

            // Default to div if no tag specified
            if (!parsed.tag && !parsed.type) {
                parsed.tag = 'div';
            }

            // Normalize tag/type
            if (parsed.type && !parsed.tag) {
                parsed.tag = parsed.type;
                delete parsed.type;
            }

            // Parse children recursively
            if (parsed.children) {
                parsed.children = this.parse(parsed.children);
            }

            return parsed;
        }

        static handleShorthandTags(config) {
            const htmlTags = Object.keys(tags);

            for (const tagName of htmlTags) {
                if (config.hasOwnProperty(tagName) && typeof config[tagName] === 'object') {
                    Object.assign(config, config[tagName]);
                    config.tag = tagName;
                    delete config[tagName];
                    break;
                } else if (config.hasOwnProperty(tagName) && config[tagName] === true) {
                    config.tag = tagName;
                    delete config[tagName];
                    break;
                }
            }
        }
    }

    // Component Registry
    class ComponentRegistry {
        static components = new Map();

        static register(name, componentClass) {
            this.components.set(name, componentClass);
        }

        static get(name) {
            return this.components.get(name);
        }

        static has(name) {
            return this.components.has(name);
        }

        static list() {
            return Array.from(this.components.keys());
        }

        static remove(name) {
            return this.components.delete(name);
        }
    }

    // Component Manager
    class ComponentManager {
        constructor() {
            this.instances = new Map();
            this.parentRefs = new Map();
            this.childRefs = new Map();
            this.nextId = 0;
        }

        generateId() {
            return `comp_${Date.now()}_${++this.nextId}`;
        }

        createComponent(rawConfig, parent = null) {
            // Handle string children directly
            if (typeof rawConfig === 'string') {
                return {
                    id: this.generateId(),
                    element: document.createTextNode(rawConfig),
                    renderOnce: function () { return this.element; },
                    destroy: function () { }
                };
            }

            // Parse the config - now pure JS object
            const config = ConfigParser.parse(rawConfig);
            if (!config) return null;

            const { tag, id, children = [], ...props } = config;
            const componentId = id || this.generateId();

            let instance;
            if (ComponentRegistry.has(tag)) {
                // Custom component
                const ComponentClass = ComponentRegistry.get(tag);
                instance = new ComponentClass(componentId, props, this);
            } else {
                // HTML element
                instance = new HTMLElement(componentId, tag, props, this);
            }

            // Track relationships
            this.instances.set(componentId, instance);
            if (parent) {
                this.parentRefs.set(componentId, parent);
                if (!this.childRefs.has(parent.id)) {
                    this.childRefs.set(parent.id, new Set());
                }
                this.childRefs.get(parent.id).add(componentId);
            }

            // Create the DOM element
            const element = instance.renderOnce();

            // Create and append children
            if (children.length > 0) {
                children.forEach(childConfig => {
                    const childInstance = this.createComponent(childConfig, instance);
                    if (childInstance) {
                        const childElement = childInstance.element || childInstance.renderOnce();
                        if (childElement && element) {
                            element.appendChild(childElement);
                        }
                    }
                });
            }

            return instance;
        }

        removeComponent(id) {
            const instance = this.instances.get(id);
            if (!instance) return;

            // Remove all children first
            const children = this.childRefs.get(id) || new Set();
            children.forEach(childId => this.removeComponent(childId));

            // Remove from DOM
            instance.destroy();

            // Clean up references
            this.instances.delete(id);
            this.parentRefs.delete(id);
            this.childRefs.delete(id);
        }

        getComponent(id) {
            return this.instances.get(id);
        }

        getParent(id) {
            const parentId = this.parentRefs.get(id);
            return parentId ? this.instances.get(parentId) : null;
        }

        getChildren(id) {
            const childIds = this.childRefs.get(id) || new Set();
            return Array.from(childIds).map(childId => this.instances.get(childId));
        }

        getAllComponents() {
            return Array.from(this.instances.values());
        }
    }

    // Base Component Class
    class BaseComponent {
        constructor(id, props, manager) {
            this.id = id;
            this.props = props || {};
            this.manager = manager;
            this.element = null;
            this.rendered = false;
            this.state = {};
        }

        render() {
            return {
                tag: "div",
                children: ["Base Component"]
            };
        }

        renderOnce() {
            if (this.rendered) return this.element;

            const config = ConfigParser.parse(this.render());
            this.element = this.createDOMElement(config);
            this.rendered = true;
            this.onMount();
            return this.element;
        }

        createDOMElement(config) {
            if (typeof config === 'string') {
                return document.createTextNode(config);
            }

            if (!config || !config.tag) {
                console.error('Invalid config:', config);
                return document.createTextNode('Invalid element');
            }

            const element = document.createElement(config.tag);
            if (this.id) {
                element.id = this.id;
            }

            // Apply attributes
            Object.entries(config).forEach(([key, value]) => {
                if (key === 'tag' || key === 'children') return;

                if (key === 'const') {
                    // Store element reference with the specified name
                    this[value] = element;
                } else if (key === 'style' && typeof value === 'object') {
                    Object.assign(element.style, value);
                } else if (key === 'style' && typeof value === 'string') {
                    element.style.cssText = value;
                } else if (key.startsWith('on') && typeof value === 'function') {
                    element.addEventListener(key.slice(2).toLowerCase(), value);
                } else if (key === 'class') {
                    element.className = value;
                } else if (typeof value !== 'function' && typeof value !== 'object') {
                    element.setAttribute(key, value);
                }
            });

            // Add children
            if (config.children && Array.isArray(config.children)) {
                config.children.forEach(child => {
                    if (typeof child === 'string') {
                        element.appendChild(document.createTextNode(child));
                    } else if (child && typeof child === 'object') {
                        const childElement = this.createDOMElement(child);
                        if (childElement) {
                            element.appendChild(childElement);
                        }
                    }
                });
            }

            return element;
        }

        setState(newState) {
            this.state = { ...this.state, ...newState };
            this.onStateChange();
        }

        update(property, value) {
            if (!this.element) return;

            if (property === 'style' && typeof value === 'object') {
                Object.assign(this.element.style, value);
            } else if (property === 'textContent') {
                this.element.textContent = value;
            } else {
                this.element.setAttribute(property, value);
            }
        }

        addChild(childConfig) {
            const child = this.manager.createComponent(childConfig, this);
            if (child) {
                const childElement = child.renderOnce();
                this.element.appendChild(childElement);
                return child;
            }
        }

        removeChild(childId) {
            this.manager.removeComponent(childId);
        }

        destroy() {
            this.onDestroy();
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
        }

        // Lifecycle methods
        onMount() { }
        onDestroy() { }
        onStateChange() { }

        // Event helpers
        emit(eventName, data) {
            const event = new CustomEvent(eventName, { detail: data });
            this.element.dispatchEvent(event);
        }

        listen(eventName, handler) {
            this.element.addEventListener(eventName, handler);
        }
    }

    // HTML Element wrapper
    class HTMLElement extends BaseComponent {
        constructor(id, tagName, props, manager) {
            super(id, props, manager);
            this.tagName = tagName;
        }

        render() {
            return {
                tag: this.tagName,
                ...this.props
            };
        }
    }

    // Main Framework class
    class ElementCore {
        constructor(container) {
            this.container = container;
            this.manager = new ComponentManager();
            this.rootComponent = null;
            this.version = '1.0.0';
        }

        render(config) {
            this.rootComponent = this.manager.createComponent(config);
            if (this.rootComponent) {
                const element = this.rootComponent.renderOnce();
                this.container.appendChild(element);
            }
            return this.rootComponent;
        }

        clear() {
            this.container.innerHTML = '';
            this.manager = new ComponentManager();
            this.rootComponent = null;
        }

        getComponent(id) {
            return this.manager.getComponent(id);
        }

        removeComponent(id) {
            this.manager.removeComponent(id);
        }

        addComponent(parentId, config) {
            const parent = this.manager.getComponent(parentId);
            if (parent) {
                return parent.addChild(config);
            }
        }

        getAllComponents() {
            return this.manager.getAllComponents();
        }
    }

    // Plugin system
    class PluginManager {
        static plugins = new Map();

        static register(name, plugin) {
            this.plugins.set(name, plugin);
            if (typeof plugin.install === 'function') {
                plugin.install(ElementCore);
            }
        }

        static get(name) {
            return this.plugins.get(name);
        }

        static list() {
            return Array.from(this.plugins.keys());
        }
    }

    // Main ElementCore object
    const ElementCoreFramework = {
        // Core classes
        Framework: ElementCore,
        BaseComponent: BaseComponent,
        ComponentRegistry: ComponentRegistry,
        ComponentManager: ComponentManager,
        ConfigParser: ConfigParser,
        PluginManager: PluginManager,

        // Tags reference
        tags: tags,

        // Version
        version: '1.0.0',

        // Create framework instance
        create: (container) => new ElementCore(container),

        // Extend tags
        extendTags: (newTags) => Object.assign(tags, newTags)
    };

    // Export for different environments
    if (typeof module !== 'undefined' && module.exports) {
        // Node.js/CommonJS
        module.exports = ElementCoreFramework;
    } else if (typeof define === 'function' && define.amd) {
        // AMD
        define([], function () { return ElementCoreFramework; });
    } else {
        // Browser globals
        global.ElementCore = ElementCoreFramework;
        global.ElementCoreFramework = ElementCore;
        global.BaseComponent = BaseComponent;
        global.ComponentRegistry = ComponentRegistry;
        
        // Also expose tags globally for convenience
        global.tags = tags;
    }

    // Auto-initialize if container with data-elementcore attribute exists
    if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', () => {
            const containers = document.querySelectorAll('[data-elementcore]');
            containers.forEach(container => {
                const configScript = container.getAttribute('data-elementcore');
                if (configScript) {
                    try {
                        // Use Function constructor for safe evaluation
                        const configFactory = new Function('return (' + configScript + ')');
                        const config = configFactory();
                        const app = new ElementCore(container);
                        app.render(config);
                    } catch (error) {
                        console.error('Auto-initialization failed:', error);
                        container.innerHTML = '<div style="color: red; padding: 10px;">Configuration Error: ' + error.message + '</div>';
                    }
                }
            });
        });
    }

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
