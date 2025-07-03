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


            // Handle conditional rendering
            if (config.if !== undefined) {
                const condition = typeof config.if === 'function' ? config.if() : config.if;
                return condition ? this.parse(config.then) : this.parse(config.else || null);
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
            this.onStateChange(this.state);
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
        onStateChange({}) //Parameter and handling all up to client code or blindly update everything
        { }

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

        // Version
        version: '1.0.0',

        // Create framework instance
        create: (container) => new ElementCore(container),
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
    }

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);


/**
 * ElementCore List Component
 * Efficient list rendering with differential updates
 */

class ListComponent extends BaseComponent {
    constructor(id, props, manager) {
        super(id, props, manager);

        // Core list properties
        this.data = props.data || [];
        this.itemComponent = props.itemComponent;
        this.keyProperty = props.keyProperty || 'id';
        this.containerTag = props.containerTag || 'div';
        this.itemTag = props.itemTag || 'div';

        // Internal tracking
        this.itemInstances = new Map(); // key -> component instance
        this.itemElements = new Map();  // key -> DOM element
        this.currentKeys = new Set();   // current item keys
        this.currentFilter = null;      // current filter function

        // Callbacks
        this.onItemClick = props.onItemClick;
        this.onItemUpdate = props.onItemUpdate;
        this.onItemAdd = props.onItemAdd;
        this.onItemRemove = props.onItemRemove;

        // Container reference
        this.listContainer = null;
    }

    render() {
        return {
            tag: this.containerTag,
            class: `list-container ${this.props.class || ''}`,
            style: this.props.style || {},
            const: 'listContainer',
            children: []
        };
    }

    onMount() {
        this.renderInitialItems();
    }

    renderInitialItems() {
        if (!this.data || this.data.length === 0) return;

        this.data.forEach(item => {
            this.createItemElement(item);
        });
    }

    createItemElement(itemData) {
        const key = this.getItemKey(itemData);

        // Skip if already exists
        if (this.itemInstances.has(key)) return;

        let itemElement;
        let itemInstance = null;

        if (this.itemComponent) {
            // Custom component rendering
            if (typeof this.itemComponent === 'string' && ComponentRegistry.has(this.itemComponent)) {
                // Registered component
                const ComponentClass = ComponentRegistry.get(this.itemComponent);
                itemInstance = new ComponentClass(
                    `${this.id}_item_${key}`,
                    { data: itemData, key: key, parent: this },
                    this.manager
                );
                itemElement = itemInstance.renderOnce();
            } else if (typeof this.itemComponent === 'function') {
                // Function component
                const config = this.itemComponent(itemData, key, this);
                const tempInstance = this.manager.createComponent(config);
                itemElement = tempInstance.renderOnce();
                itemInstance = tempInstance;
            } else if (typeof this.itemComponent === 'object') {
                // Config object
                const config = {
                    ...this.itemComponent,
                    props: { ...this.itemComponent.props, data: itemData, key: key }
                };
                const tempInstance = this.manager.createComponent(config);
                itemElement = tempInstance.renderOnce();
                itemInstance = tempInstance;
            }
        } else {
            // Default rendering - just display the data
            itemElement = document.createElement(this.itemTag);
            itemElement.textContent = JSON.stringify(itemData);
            itemElement.className = 'list-item';
        }

        if (itemElement) {
            // Set data attributes for tracking
            itemElement.setAttribute('data-key', key);
            itemElement.setAttribute('data-list-item', 'true');

            // Add click handler if provided
            if (this.onItemClick) {
                itemElement.addEventListener('click', (e) => {
                    this.onItemClick(itemData, key, e, this);
                });
            }

            // Store references
            this.itemInstances.set(key, itemInstance);
            this.itemElements.set(key, itemElement);
            this.currentKeys.add(key);

            // Append to container
            this.listContainer.appendChild(itemElement);

            // Trigger callback
            if (this.onItemAdd) {
                this.onItemAdd(itemData, key, itemElement);
            }
        }
    }

    getItemKey(item) {
        if (typeof item === 'object' && item !== null) {
            return item[this.keyProperty] || JSON.stringify(item);
        }
        return String(item);
    }

    // Public API Methods

    /**
     * Update entire list data - performs differential update
     */
    updateData(newData) {
        if (!Array.isArray(newData)) {
            console.warn('ListComponent: updateData expects an array');
            return;
        }

        const newKeys = new Set(newData.map(item => this.getItemKey(item)));
        const currentKeys = new Set(this.currentKeys);

        // Remove items that are no longer in the new data
        for (const key of currentKeys) {
            if (!newKeys.has(key)) {
                this.removeItemByKey(key);
            }
        }

        // Add or update items
        newData.forEach(item => {
            const key = this.getItemKey(item);
            if (currentKeys.has(key)) {
                this.updateItemByKey(key, item);
            } else {
                this.createItemElement(item);
            }
        });

        this.data = newData;
    }

    /**
     * Set new data, old elements will be removed
     */
    setData(newData) {
        this.clear();

        if (Array.isArray(newData)) {
            // Add new items
            newData.forEach(item => {
                this.createItemElement(item);
            });
            this.data = newData;
        } else {
            console.warn('ListComponent: setData expects an array');
            this.data = [];
        }
    }

    /**
     * Add a single item
     */
    addItem(itemData, index = -1) {
        const key = this.getItemKey(itemData);

        if (this.currentKeys.has(key)) {
            console.warn(`ListComponent: Item with key ${key} already exists`);
            return;
        }

        this.createItemElement(itemData);

        // Handle insertion at specific index
        if (index >= 0 && index < this.listContainer.children.length) {
            const itemElement = this.itemElements.get(key);
            const referenceElement = this.listContainer.children[index];
            if (itemElement && referenceElement) {
                this.listContainer.insertBefore(itemElement, referenceElement);
            }
        }

        this.data.push(itemData);
    }

    /**
     * Remove item by key
     */
    removeItemByKey(key) {
        const element = this.itemElements.get(key);
        const instance = this.itemInstances.get(key);

        if (element) {
            // Trigger callback before removal
            if (this.onItemRemove) {
                const itemData = this.data.find(item => this.getItemKey(item) === key);
                this.onItemRemove(itemData, key, element);
            }

            // Remove from DOM
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.itemElements.delete(key);
        }

        if (instance && typeof instance.destroy === 'function') {
            instance.destroy();
        }

        this.itemInstances.delete(key);
        this.currentKeys.delete(key);

        // Update data array
        this.data = this.data.filter(item => this.getItemKey(item) !== key);
    }

    /**
     * Remove item by index
     */
    removeItemByIndex(index) {
        if (index >= 0 && index < this.data.length) {
            const item = this.data[index];
            const key = this.getItemKey(item);
            this.removeItemByKey(key);
        }
    }

    /**
     * Update specific item by key
     */
    updateItemByKey(key, newData) {
        const instance = this.itemInstances.get(key);
        const element = this.itemElements.get(key);

        if (instance && typeof instance.updateData === 'function') {
            // Let the component handle its own update
            instance.updateData(newData);
        } else if (element) {
            // Fallback: recreate the element
            const index = Array.from(this.listContainer.children).indexOf(element);
            this.removeItemByKey(key);
            this.addItem(newData, index);
        }

        // Update data array
        const dataIndex = this.data.findIndex(item => this.getItemKey(item) === key);
        if (dataIndex !== -1) {
            this.data[dataIndex] = newData;
        }

        // Trigger callback
        if (this.onItemUpdate) {
            this.onItemUpdate(newData, key, element);
        }
    }

    /**
     * Get item component by key
     */
    getItemByKey(key) {
        return this.itemInstances.get(key);
    }

    /**
     * Get item element by key
     */
    getItemElementByKey(key) {
        return this.itemElements.get(key);
    }

    /**
     * Clear all items
     */
    clear() {
        // Create a copy of current keys to avoid modification during iteration
        const keysToRemove = Array.from(this.currentKeys);
        keysToRemove.forEach(key => {
            this.removeItemByKey(key);
        });
        this.data = [];
    }

    /**
     * Get current data
     */
    getData() {
        return [...this.data];
    }

    /**
     * Get item count
     */
    getCount() {
        return this.currentKeys.size;
    }

    /**
     * Apply filter without destroying elements (virtual filtering)
     * @param {Function} filterFn - Function that returns true/false for each item
     */
    applyFilter(filterFn) {
        this.currentFilter = filterFn;

        // Apply filter to all existing items
        this.data.forEach(item => {
            const key = this.getItemKey(item);
            const element = this.itemElements.get(key);

            if (element) {
                const shouldShow = filterFn ? filterFn(item, key) : true;
                element.style.display = shouldShow ? '' : 'none';
                element.setAttribute('data-filtered', shouldShow ? 'false' : 'true');
            }
        });
    }

    /**
     * Clear any applied filters (show all items)
     */
    clearFilter() {
        this.currentFilter = null;

        // Show all items
        this.itemElements.forEach(element => {
            element.style.display = '';
            element.setAttribute('data-filtered', 'false');
        });
    }

    /**
     * Get currently visible (filtered) data
     */
    getVisibleData() {
        if (!this.currentFilter) {
            return [...this.data];
        }
        return this.data.filter((item, index) => {
            const key = this.getItemKey(item);
            return this.currentFilter(item, key);
        });
    }

    /**
     * Get count of visible items
     */
    getVisibleCount() {
        if (!this.currentFilter) {
            return this.data.length;
        }
        return this.getVisibleData().length;
    }

    /**
     * Traditional filter (destroys and recreates elements) - use sparingly
     */
    filter(filterFn) {
        console.warn('ListComponent: filter() destroys elements. Consider using applyFilter() instead.');
        const filteredData = this.data.filter(filterFn);
        this.updateData(filteredData);
    }

    /**
     * Efficiently sort items by reordering existing DOM elements
     * @param {Function} compareFn - Compare function for sorting
     */
    sort(compareFn) {
        if (!compareFn || typeof compareFn !== 'function') {
            console.warn('ListComponent: sort() requires a valid compare function');
            return;
        }

        // Sort the data array
        const sortedData = [...this.data].sort(compareFn);
        
        // Create a document fragment to efficiently reorder elements
        const fragment = document.createDocumentFragment();
        
        // Reorder DOM elements based on sorted data without recreating them
        sortedData.forEach(item => {
            const key = this.getItemKey(item);
            const element = this.itemElements.get(key);
            
            if (element) {
                // Move existing element to fragment in correct order
                fragment.appendChild(element);
            }
        });
        
        // Append all reordered elements back to container at once
        this.listContainer.appendChild(fragment);
        
        // Update internal data reference
        this.data = sortedData;
    }

    /**
     * Move an item to a different position
     * @param {*} fromKey - Key of the item to move
     * @param {number} toIndex - Target index position
     */
    moveItem(fromKey, toIndex) {
        const element = this.itemElements.get(fromKey);
        if (!element) {
            console.warn(`ListComponent: Item with key ${fromKey} not found`);
            return;
        }

        // Find the item in data array
        const fromIndex = this.data.findIndex(item => this.getItemKey(item) === fromKey);
        if (fromIndex === -1) return;

        // Clamp toIndex to valid range
        toIndex = Math.max(0, Math.min(toIndex, this.data.length - 1));
        
        if (fromIndex === toIndex) return; // No movement needed

        // Move in data array
        const [itemData] = this.data.splice(fromIndex, 1);
        this.data.splice(toIndex, 0, itemData);

        // Move DOM element
        const referenceElement = this.listContainer.children[toIndex];
        if (referenceElement) {
            this.listContainer.insertBefore(element, referenceElement);
        } else {
            // Insert at end if toIndex is beyond current children
            this.listContainer.appendChild(element);
        }
    }

    /**
     * Swap positions of two items
     * @param {*} keyA - Key of first item
     * @param {*} keyB - Key of second item
     */
    swapItems(keyA, keyB) {
        const elementA = this.itemElements.get(keyA);
        const elementB = this.itemElements.get(keyB);
        
        if (!elementA || !elementB) {
            console.warn('ListComponent: One or both items not found for swapping');
            return;
        }

        // Find indices in data array
        const indexA = this.data.findIndex(item => this.getItemKey(item) === keyA);
        const indexB = this.data.findIndex(item => this.getItemKey(item) === keyB);
        
        if (indexA === -1 || indexB === -1) return;

        // Swap in data array
        [this.data[indexA], this.data[indexB]] = [this.data[indexB], this.data[indexA]];

        // Swap DOM elements
        const nextA = elementA.nextSibling;
        const parentA = elementA.parentNode;
        
        elementB.parentNode.insertBefore(elementA, elementB);
        parentA.insertBefore(elementB, nextA);
    }

    onDestroy() {
        this.clear();
        super.onDestroy(); // Call parent destroy method
    }
}

// Register the List component with ElementCore
ComponentRegistry.register('List', ListComponent);

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ListComponent;
} else if (typeof window !== 'undefined') {
    window.ListComponent = ListComponent;
}

/**
 * ElementCore Table Component v1.0
 * Efficient table rendering with smart updates
 * Compatible with ElementCore v1.0
 * 
 * Usage:
 * <script src="elementcore.js"></script>
 * <script src="TableComponent.js"></script>
 */

class TableComponent extends BaseComponent {
    constructor(id, props, manager) {
        super(id, props, manager);
        
        // Core table properties
        this.data = props.data || [];
        this.headers = props.headers || null; // Array of strings or objects [{i: 0, text: "Name"}]
        this.footer = props.footer || null;
        this.pagination = props.pagination || null; // {rowsPerPage: 10, currentPage: 1}
        
        // Custom components
        this.cellComponent = props.cellComponent || null; // Function or object
        this.headerCellComponent = props.headerCellComponent || null;
        this.footerCellComponent = props.footerCellComponent || null;
        
        // Table structure
        this.tableElement = null;
        this.headerElement = null;
        this.bodyElement = null;
        this.footerElement = null;
        this.paginationElement = null;
        
        // Internal tracking
        this.rowElements = new Map(); // rowIndex -> DOM element
        this.cellElements = new Map(); // "rowIndex,colIndex" -> DOM element
        this.currentFilter = null;
        
        // Pagination state
        this.currentPage = this.pagination ? this.pagination.currentPage || 1 : 1;
        this.rowsPerPage = this.pagination ? this.pagination.rowsPerPage || 10 : null;
        
        // Callbacks
        this.onCellClick = props.onCellClick;
        this.onRowClick = props.onRowClick;
        this.onHeaderClick = props.onHeaderClick;
        this.onPageChange = props.onPageChange;
    }

    render() {
        return {
            tag: 'div',
            class: `table-container ${this.props.class || ''}`,
            style: this.props.style || {},
            children: [
                {
                    tag: 'table',
                    class: 'elementcore-table',
                    const: 'tableElement',
                    children: []
                }
            ]
        };
    }

    onMount() {
        this.buildTable();
    }

    buildTable() {
        // Clear existing content
        this.tableElement.innerHTML = '';
        
        // Build header if provided
        if (this.headers) {
            this.buildHeader();
        }
        
        // Build body
        this.buildBody();
        
        // Build footer if provided
        if (this.footer) {
            this.buildFooter();
        }
        
        // Build pagination if enabled
        if (this.pagination) {
            this.buildPagination();
        }
    }

    buildHeader() {
        this.headerElement = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        const processedHeaders = this.processHeaders();
        const maxColumns = this.getMaxColumns();
        
        for (let colIndex = 0; colIndex < maxColumns; colIndex++) {
            const headerData = processedHeaders[colIndex] || '';
            const th = document.createElement('th');
            
            if (this.headerCellComponent) {
                // Custom header cell component
                const cellContent = this.createCustomHeaderCell(headerData, colIndex);
                if (cellContent) {
                    th.appendChild(cellContent);
                }
            } else {
                // Default header cell
                th.textContent = headerData;
            }
            
            // Add click handler
            if (this.onHeaderClick) {
                th.addEventListener('click', (e) => {
                    this.onHeaderClick(headerData, colIndex, e, this);
                });
            }
            
            headerRow.appendChild(th);
        }
        
        this.headerElement.appendChild(headerRow);
        this.tableElement.appendChild(this.headerElement);
    }

    buildBody() {
        this.bodyElement = document.createElement('tbody');
        this.bodyElement.className = 'table-body';
        
        const displayData = this.getDisplayData();
        
        displayData.forEach((row, rowIndex) => {
            this.createRowElement(row, rowIndex);
        });
        
        this.tableElement.appendChild(this.bodyElement);
    }

    buildFooter() {
        this.footerElement = document.createElement('tfoot');
        const footerRow = document.createElement('tr');
        
        const maxColumns = this.getMaxColumns();
        
        for (let colIndex = 0; colIndex < maxColumns; colIndex++) {
            const footerData = Array.isArray(this.footer) ? this.footer[colIndex] || '' : '';
            const td = document.createElement('td');
            
            if (this.footerCellComponent) {
                // Custom footer cell component
                const cellContent = this.createCustomFooterCell(footerData, colIndex);
                if (cellContent) {
                    td.appendChild(cellContent);
                }
            } else {
                // Default footer cell
                td.textContent = footerData;
            }
            
            footerRow.appendChild(td);
        }
        
        this.footerElement.appendChild(footerRow);
        this.tableElement.appendChild(this.footerElement);
    }

    buildPagination() {
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'table-pagination';
        
        // Use filtered data count for pagination calculation
        const filteredData = this.getFilteredData();
        const totalPages = Math.ceil(filteredData.length / this.rowsPerPage);
        
        // Reset to page 1 if current page is beyond available pages
        if (this.currentPage > totalPages && totalPages > 0) {
            this.currentPage = 1;
        }
        
        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.textContent = 'Previous';
        prevBtn.disabled = this.currentPage <= 1;
        prevBtn.addEventListener('click', () => this.goToPage(this.currentPage - 1));
        
        // Page info
        const pageInfo = document.createElement('span');
        pageInfo.textContent = totalPages > 0 ? `Page ${this.currentPage} of ${totalPages}` : 'No results';
        pageInfo.className = 'page-info';
        
        // Results info
        const resultsInfo = document.createElement('span');
        const startItem = totalPages > 0 ? ((this.currentPage - 1) * this.rowsPerPage) + 1 : 0;
        const endItem = Math.min(this.currentPage * this.rowsPerPage, filteredData.length);
        resultsInfo.textContent = `(${startItem}-${endItem} of ${filteredData.length} items)`;
        resultsInfo.className = 'results-info';
        resultsInfo.style.fontSize = '0.9em';
        resultsInfo.style.color = '#6c757d';
        
        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next';
        nextBtn.disabled = this.currentPage >= totalPages || totalPages === 0;
        nextBtn.addEventListener('click', () => this.goToPage(this.currentPage + 1));
        
        paginationContainer.appendChild(prevBtn);
        paginationContainer.appendChild(pageInfo);
        paginationContainer.appendChild(resultsInfo);
        paginationContainer.appendChild(nextBtn);
        
        // Insert after table
        this.element.appendChild(paginationContainer);
        this.paginationElement = paginationContainer;
    }

    createRowElement(rowData, rowIndex) {
        const tr = document.createElement('tr');
        tr.setAttribute('data-row-index', rowIndex);
        
        const maxColumns = this.getMaxColumns();
        
        for (let colIndex = 0; colIndex < maxColumns; colIndex++) {
            const cellData = this.getCellData(rowData, colIndex);
            const td = this.createCellElement(cellData, rowIndex, colIndex, rowData);
            tr.appendChild(td);
        }
        
        // Add row click handler
        if (this.onRowClick) {
            tr.addEventListener('click', (e) => {
                this.onRowClick(rowData, rowIndex, e, this);
            });
        }
        
        this.rowElements.set(rowIndex, tr);
        this.bodyElement.appendChild(tr);
    }

    createCellElement(cellData, rowIndex, colIndex, rowData) {
        const td = document.createElement('td');
        td.setAttribute('data-cell', `${rowIndex},${colIndex}`);
        
        if (this.cellComponent) {
            // Custom cell component
            const cellContent = this.createCustomCell(cellData, rowIndex, colIndex, rowData);
            if (cellContent) {
                td.appendChild(cellContent);
            }
        } else {
            // Default cell - span element
            const span = document.createElement('span');
            span.textContent = cellData != null ? String(cellData) : '';
            td.appendChild(span);
        }
        
        // Add cell click handler
        if (this.onCellClick) {
            td.addEventListener('click', (e) => {
                const headerText = this.getHeaderText(colIndex);
                this.onCellClick(cellData, rowIndex, colIndex, headerText, rowData, e, this);
            });
        }
        
        this.cellElements.set(`${rowIndex},${colIndex}`, td);
        return td;
    }

    createCustomCell(cellData, rowIndex, colIndex, rowData) {
        const headerText = this.getHeaderText(colIndex);
        
        if (typeof this.cellComponent === 'function') {
            // Function component
            const config = this.cellComponent(cellData, rowIndex, colIndex, headerText, rowData, this.data, this);
            if (config) {
                const instance = this.manager.createComponent(config);
                return instance ? instance.renderOnce() : null;
            }
        } else if (typeof this.cellComponent === 'object') {
            // Config object
            const config = {
                ...this.cellComponent,
                props: {
                    ...this.cellComponent.props,
                    cellData,
                    rowIndex,
                    colIndex,
                    headerText,
                    rowData,
                    allData: this.data,
                    table: this
                }
            };
            const instance = this.manager.createComponent(config);
            return instance ? instance.renderOnce() : null;
        }
        return null;
    }

    createCustomHeaderCell(headerData, colIndex) {
        if (typeof this.headerCellComponent === 'function') {
            const config = this.headerCellComponent(headerData, colIndex, this);
            if (config) {
                const instance = this.manager.createComponent(config);
                return instance ? instance.renderOnce() : null;
            }
        }
        return null;
    }

    createCustomFooterCell(footerData, colIndex) {
        if (typeof this.footerCellComponent === 'function') {
            const config = this.footerCellComponent(footerData, colIndex, this);
            if (config) {
                const instance = this.manager.createComponent(config);
                return instance ? instance.renderOnce() : null;
            }
        }
        return null;
    }

    // Helper methods
    processHeaders() {
        if (!this.headers) return [];
        
        if (Array.isArray(this.headers)) {
            return this.headers.map(header => {
                if (typeof header === 'string') {
                    return header;
                } else if (typeof header === 'object' && header.text) {
                    return header.text;
                }
                return '';
            });
        }
        
        return [];
    }

    getMaxColumns() {
        if (this.headers && Array.isArray(this.headers)) {
            const maxHeaderIndex = Math.max(...this.headers.map((h, i) => {
                return typeof h === 'object' && h.i !== undefined ? h.i : i;
            }));
            return Math.max(maxHeaderIndex + 1, this.getDataMaxColumns());
        }
        return this.getDataMaxColumns();
    }

    getDataMaxColumns() {
        if (this.data.length === 0) return 0;
        
        return Math.max(...this.data.map(row => {
            if (Array.isArray(row)) {
                return row.length;
            } else if (typeof row === 'object' && row !== null) {
                return Object.keys(row).length;
            }
            return 1;
        }));
    }

    getCellData(rowData, colIndex) {
        if (Array.isArray(rowData)) {
            return rowData[colIndex];
        } else if (typeof rowData === 'object' && rowData !== null) {
            const keys = Object.keys(rowData);
            return rowData[keys[colIndex]];
        }
        return colIndex === 0 ? rowData : '';
    }

    getHeaderText(colIndex) {
        const processedHeaders = this.processHeaders();
        return processedHeaders[colIndex] || '';
    }

    getDisplayData() {
        let data = this.data;
        
        // Apply filter if exists
        if (this.currentFilter) {
            data = data.filter(this.currentFilter);
        }
        
        // Apply pagination if enabled
        if (this.pagination && this.rowsPerPage) {
            const startIndex = (this.currentPage - 1) * this.rowsPerPage;
            const endIndex = startIndex + this.rowsPerPage;
            data = data.slice(startIndex, endIndex);
        }
        
        return data;
    }

    /**
     * Get filtered data (before pagination)
     */
    getFilteredData() {
        let data = this.data;
        
        // Apply filter if exists
        if (this.currentFilter) {
            data = data.filter(this.currentFilter);
        }
        
        return data;
    }

    // Public API methods
    updateData(newData) {
        if (!Array.isArray(newData)) {
            console.warn('TableComponent: updateData expects an array');
            return;
        }
        this.data = newData;
        this.refresh();
    }

    setData(newData) {
        if (!Array.isArray(newData)) {
            console.warn('TableComponent: setData expects an array');
            this.data = [];
        } else {
            this.data = newData;
        }
        this.currentPage = 1; // Reset pagination
        this.refresh();
    }

    applyFilter(filterFn) {
        if (typeof filterFn !== 'function') {
            console.warn('TableComponent: applyFilter expects a function');
            return;
        }
        this.currentFilter = filterFn;
        this.currentPage = 1; // Reset to first page when filtering
        this.refresh();
    }

    clearFilter() {
        this.currentFilter = null;
        this.refresh();
    }

    goToPage(pageNumber) {
        if (!this.pagination) return;
        
        // Use filtered data for pagination calculation
        const filteredData = this.getFilteredData();
        const totalPages = Math.ceil(filteredData.length / this.rowsPerPage);
        
        if (pageNumber >= 1 && pageNumber <= totalPages) {
            this.currentPage = pageNumber;
            this.refresh();
            
            if (this.onPageChange) {
                this.onPageChange(pageNumber, totalPages, this);
            }
        }
    }

    refresh() {
        // Clear current body
        if (this.bodyElement) {
            this.bodyElement.innerHTML = '';
        }
        
        // Clear tracking
        this.rowElements.clear();
        this.cellElements.clear();
        
        // Rebuild body
        this.buildBody();
        
        // Update pagination if exists
        if (this.paginationElement) {
            this.paginationElement.remove();
            this.buildPagination();
        }
    }

    /**
     * Sort table data by column
     * @param {number} columnIndex - Index of column to sort by
     * @param {string} direction - 'asc' or 'desc'
     * @param {Function} customCompareFn - Optional custom compare function
     */
    sortByColumn(columnIndex, direction = 'asc', customCompareFn = null) {
        if (!this.data || this.data.length === 0) return;
        
        const sortedData = [...this.data].sort((a, b) => {
            const aValue = this.getCellData(a, columnIndex);
            const bValue = this.getCellData(b, columnIndex);
            
            if (customCompareFn) {
                return customCompareFn(aValue, bValue, direction);
            }
            
            // Default comparison
            let result = 0;
            
            if (aValue == null && bValue == null) result = 0;
            else if (aValue == null) result = -1;
            else if (bValue == null) result = 1;
            else if (typeof aValue === 'number' && typeof bValue === 'number') {
                result = aValue - bValue;
            } else {
                result = String(aValue).localeCompare(String(bValue));
            }
            
            return direction === 'desc' ? -result : result;
        });
        
        this.data = sortedData;
        this.refresh();
    }

    /**
     * Get cell element at specific position
     */
    getCellElement(rowIndex, colIndex) {
        return this.cellElements.get(`${rowIndex},${colIndex}`);
    }

    /**
     * Get row element at specific index
     */
    getRowElement(rowIndex) {
        return this.rowElements.get(rowIndex);
    }

    /**
     * Update specific cell content
     */
    updateCell(rowIndex, colIndex, newValue) {
        // Update data
        const actualRowIndex = this.getActualRowIndex(rowIndex);
        if (actualRowIndex !== -1) {
            if (Array.isArray(this.data[actualRowIndex])) {
                this.data[actualRowIndex][colIndex] = newValue;
            } else if (typeof this.data[actualRowIndex] === 'object') {
                const keys = Object.keys(this.data[actualRowIndex]);
                if (keys[colIndex]) {
                    this.data[actualRowIndex][keys[colIndex]] = newValue;
                }
            }
        }
        
        // Update DOM
        const cellElement = this.getCellElement(rowIndex, colIndex);
        if (cellElement) {
            const span = cellElement.querySelector('span');
            if (span) {
                span.textContent = newValue != null ? String(newValue) : '';
            }
        }
    }

    /**
     * Get actual data index from display row index (accounts for pagination/filtering)
     */
    getActualRowIndex(displayRowIndex) {
        let filteredData = this.data;
        
        if (this.currentFilter) {
            filteredData = this.data.filter(this.currentFilter);
        }
        
        if (this.pagination && this.rowsPerPage) {
            const startIndex = (this.currentPage - 1) * this.rowsPerPage;
            const actualIndex = startIndex + displayRowIndex;
            
            if (this.currentFilter) {
                // Find the actual index in the original data
                let count = 0;
                for (let i = 0; i < this.data.length; i++) {
                    if (this.currentFilter(this.data[i])) {
                        if (count === actualIndex) return i;
                        count++;
                    }
                }
                return -1;
            }
            return actualIndex;
        }
        
        return displayRowIndex;
    }

    getRowCount() {
        return this.data.length;
    }

    getVisibleRowCount() {
        return this.getDisplayData().length;
    }

    getCurrentPage() {
        return this.currentPage;
    }

    getTotalPages() {
        if (!this.pagination) return 1;
        const filteredData = this.getFilteredData();
        return Math.ceil(filteredData.length / this.rowsPerPage);
    }

    /**
     * Get count of filtered data (before pagination)
     */
    getFilteredRowCount() {
        return this.getFilteredData().length;
    }

    /**
     * ElementCore v1.0 requires parameter in onStateChange
     */
    onStateChange(newState) {
        // Handle state changes - update visual representation if needed
        // Since ElementCore renders only once, manual updates are required
        if (this.element && newState) {
            if (newState.containerClass) {
                this.element.className = `table-container ${newState.containerClass}`;
            }
            if (newState.containerStyle) {
                Object.assign(this.element.style, newState.containerStyle);
            }
            if (newState.data && Array.isArray(newState.data)) {
                this.setData(newState.data);
            }
        }
    }

    onDestroy() {
        // Clean up references
        this.rowElements.clear();
        this.cellElements.clear();
        
        // Remove pagination element if exists
        if (this.paginationElement && this.paginationElement.parentNode) {
            this.paginationElement.parentNode.removeChild(this.paginationElement);
        }
        
        super.onDestroy(); // Call parent destroy method
    }
}

// Register the Table component with ElementCore
ComponentRegistry.register('Table', TableComponent);

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TableComponent;
} else if (typeof window !== 'undefined') {
    window.TableComponent = TableComponent;
}