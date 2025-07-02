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