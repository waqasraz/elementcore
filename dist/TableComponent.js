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