# ElementCore Framework - AI/LLM Development Guide

## Overview
ElementCore is a lightweight (~8KB minified), zero-dependency JavaScript component framework designed for direct DOM manipulation without virtual DOM overhead.

## Core Philosophy
- **Render Once**: Components render once, then use direct DOM manipulation
- **No Virtual DOM**: Direct DOM operations for maximum performance  
- **Manual State Management**: Explicit state changes with manual DOM updates
- **Pure JavaScript**: Full JavaScript object syntax, no JSON limitations

## Basic Usage

### Creating an App
```javascript
const app = ElementCore.create(document.getElementById('app'));
```

### Component Configuration
```javascript
const config = {
    tag: 'div',                    // HTML tag or component name
    id: 'unique-id',              // Optional ID
    class: 'css-class',           // CSS classes
    style: { color: 'blue' },     // Inline styles object
    children: [                   // Child elements array
        'Text content',
        { tag: 'span', children: ['Nested'] }
    ],
    onClick: handleClick,         // Event handlers (camelCase)
    const: 'elementRef'          // Creates direct DOM reference
};
```

## Component Development

### BaseComponent Class
```javascript
class MyComponent extends ElementCore.BaseComponent {
    constructor(id, props, manager) {
        super(id, props, manager);
        this.state = { count: 0 };
    }

    render() {
        return {
            tag: 'div',
            children: [
                {
                    tag: 'span',
                    const: 'display',
                    children: [`Count: ${this.state.count}`]
                },
                {
                    tag: 'button',
                    children: ['Increment'],
                    onClick: () => this.increment()
                }
            ]
        };
    }

    increment() {
        this.setState({ count: this.state.count + 1 });
    }

    onStateChange(newState) {
        // Manual DOM update - no automatic re-rendering
        this.display.textContent = `Count: ${this.state.count}`;
    }
}
```

## Key Concepts

### Direct DOM References
Use `const` property to get direct DOM element references:
```javascript
{
    tag: 'input',
    const: 'nameInput',    // Creates this.nameInput reference
    placeholder: 'Name'
}
```

### State Management
```javascript
// Set state (triggers onStateChange)
this.setState({ key: value });

// Manual DOM updates in onStateChange
onStateChange(newState) {
    this.display.textContent = this.state.value;
}
```

### Event Handling
```javascript
{
    tag: 'button',
    onClick: (event) => this.handleClick(event),
    onInput: (e) => this.handleInput(e.target.value)
}
```

## Component Registration
```javascript
ElementCore.register('MyComponent', MyComponent);

// Use by tag name
{ tag: 'MyComponent', props: { value: 10 } }
```

## Advanced Components

### ListComponent
```javascript
{
    tag: 'ListComponent',
    data: arrayData,
    keyProperty: 'id',
    itemComponent: ItemComponent,
    onItemClick: (item, key) => {}
}
```

### TableComponent  
```javascript
{
    tag: 'TableComponent',
    data: tableData,
    columns: [
        { key: 'name', title: 'Name', sortable: true },
        { key: 'email', title: 'Email' }
    ],
    pagination: { pageSize: 10 }
}
```

## Common Patterns

### Form Component
```javascript
class FormComponent extends ElementCore.BaseComponent {
    constructor(id, props, manager) {
        super(id, props, manager);
        this.state = { formData: {} };
    }

    render() {
        return {
            tag: 'form',
            onSubmit: (e) => this.handleSubmit(e),
            children: [
                {
                    tag: 'input',
                    const: 'nameInput',
                    onInput: (e) => this.updateField('name', e.target.value)
                }
            ]
        };
    }

    updateField(field, value) {
        this.setState({
            formData: { ...this.state.formData, [field]: value }
        });
    }
}
```

### Conditional Rendering
```javascript
{
    if: () => this.state.loading,
    then: { tag: 'div', children: ['Loading...'] },
    else: { tag: 'div', children: ['Content'] }
}
```

## Performance Tips
1. Use direct DOM manipulation via `const` references
2. Minimize state changes
3. Clean up in `onDestroy()` method
4. Use component lifecycle methods effectively

## Installation
```bash
npm install elementcore
```

```html
<script src="https://unpkg.com/elementcore/dist/elementcore.min.js"></script>
``` 