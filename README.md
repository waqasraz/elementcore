# ElementCore Framework v1.0

A lightweight, pure JavaScript component framework that focuses on simplicity and direct DOM manipulation without the overhead of virtual DOM or complex reactivity systems.
Minified version less than 8KB.

## Features

- **🪶 Lightweight**: Minimal core with no dependencies
- **⚡ Direct DOM Access**: Render once, manipulate directly
- **🎯 Simple State**: Object-based state with manual change handling
- **📦 Component System**: Class-based components with lifecycle methods
- **🔌 Plugin Architecture**: Extensible through plugins
- **📝 Pure JavaScript**: No JSON limitations, full JavaScript object syntax
- **🏗️ Cross-Environment**: Works in browser, Node.js, and AMD environments

## IMPORTANT

- **Render Once**: Components render once, updates via direct DOM manipulation
- **No Virtual DOM**: Direct DOM operations for maximum speed
- **Minimal Overhead**: Small framework footprint (~8KB minified)
- **Efficient Updates**: Manual state management eliminates unnecessary re-renders

## Installation

```html
<script src="elementcore.js"></script>
```

Or using modules:
```javascript
import ElementCore from './elementcore.js';
```

## Quick Start

```javascript
// Create an ElementCore instance
const app = ElementCore.create(document.getElementById('app'));

// Render your UI
app.render({
    tag: 'div',
    style: { padding: '20px' },
    children: [
        { tag: 'h1', children: ['Hello ElementCore!'] },
        { 
            tag: 'button', 
            children: ['Click me!'],
            onClick: () => alert('Button clicked!')
        }
    ]
});
```

## Core Concepts

### 1. Component Configuration

ElementCore uses pure JavaScript objects to define components:

```javascript
const config = {
    tag: 'div',              // HTML tag or component name
    id: 'my-element',        // Optional ID
    class: 'container',      // CSS classes
    style: { color: 'blue' }, // Inline styles
    children: [              // Child elements
        'Text content',
        { tag: 'span', children: ['Nested element'] }
    ],
    onClick: handleClick     // Event handlers (camelCase)
};
```

### 2. Direct DOM Manipulation with `const`

The `const` property allows you to get direct references to DOM elements:

```javascript
class MyComponent extends ElementCore.BaseComponent {
    render() {
        return {
            tag: 'div',
            children: [
                {
                    tag: 'input',
                    const: 'nameInput',  // Creates this.nameInput reference
                    placeholder: 'Enter name'
                },
                {
                    tag: 'button',
                    const: 'submitBtn',  // Creates this.submitBtn reference
                    children: ['Submit'],
                    onClick: () => this.handleSubmit()
                }
            ]
        };
    }

    handleSubmit() {
        // Direct DOM access - no re-rendering needed
        const value = this.nameInput.value;
        this.submitBtn.textContent = 'Processing...';
        this.submitBtn.disabled = true;
    }
}
```

### 3. State Management

State is a simple object. Changes require manual handling via `onStateChange`:

```javascript
class Counter extends ElementCore.BaseComponent {
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

    // ElementCore v1.0 requires parameter in onStateChange
    onStateChange(newState) {
        // Manually update the DOM when state changes
        this.display.textContent = `Count: ${this.state.count}`;
    }
}
```

## BaseComponent Class

All custom components extend `ElementCore.BaseComponent`:

```javascript
class MyComponent extends ElementCore.BaseComponent {
    constructor(id, props, manager) {
        super(id, props, manager);
        this.state = {}; // Initialize state
    }

    render() {
        // Return component configuration
        return {
            tag: 'div',
            children: ['Component content']
        };
    }

    // Lifecycle methods
    onMount() {
        // Called after component is added to DOM
    }

    onStateChange(newState) {
        // Called after setState() - NOTE: parameter required in v1.0
        // Handle DOM updates manually
    }

    onDestroy() {
        // Called before component is removed
        // Cleanup event listeners, timers, etc.
    }
}
```

## Component Lifecycle

1. **Creation**: Component instance created
2. **Render**: `render()` method called to get configuration
3. **DOM Creation**: DOM elements created from configuration
4. **Mount**: `onMount()` called after DOM insertion
5. **State Changes**: `onStateChange(newState)` called after `setState()`
6. **Destruction**: `onDestroy()` called before removal

## Component Registration

Register components to use them by name:

```javascript
// Register a component
ElementCore.ComponentRegistry.register('MyButton', MyButtonComponent);

// Use in configuration
const config = {
    tag: 'MyButton',
    text: 'Click me',
    color: 'primary'
};
```

## Rendering and Composition

### Render Once Philosophy

Components render their DOM structure once. Subsequent updates are done through direct DOM manipulation:

```javascript
class LiveClock extends ElementCore.BaseComponent {
    onMount() {
        // Update time every second via direct DOM manipulation
        this.timer = setInterval(() => {
            this.timeDisplay.textContent = new Date().toLocaleTimeString();
        }, 1000);
    }

    render() {
        return {
            tag: 'div',
            children: [
                {
                    tag: 'span',
                    const: 'timeDisplay',
                    children: [new Date().toLocaleTimeString()]
                }
            ]
        };
    }

    onDestroy() {
        clearInterval(this.timer);
    }
}
```

### Conditional Rendering

Use `if/then/else` for conditional content:

```javascript
const config = {
    if: () => user.isLoggedIn,
    then: {
        tag: 'div',
        children: [`Welcome, ${user.name}!`]
    },
    else: {
        tag: 'button',
        children: ['Login'],
        onClick: showLogin
    }
};
```

## Advanced Features

### Event Handling

Attach event handlers using camelCase naming:

```javascript
const config = {
    tag: 'button',
    onClick: handleClick,
    onMouseEnter: handleHover,
    onKeyDown: handleKeypress
};
```

### Dynamic Children

Add/remove children dynamically:

```javascript
class DynamicList extends ElementCore.BaseComponent {
    addItem(text) {
        const newItem = this.addChild({
            tag: 'li',
            children: [text]
        });
        return newItem;
    }

    removeItem(itemId) {
        this.removeChild(itemId);
    }
}
```

## Plugin System

Extend ElementCore with plugins:

```javascript
const MyPlugin = {
    install(ElementCore) {
        // Add new functionality
        ElementCore.customMethod = function() {
            console.log('Plugin method called');
        };
    }
};

// Register plugin
ElementCore.PluginManager.register('MyPlugin', MyPlugin);
```

## Framework API

### ElementCore Main Object

```javascript
// Create framework instance
const app = ElementCore.create(container);

// Access framework classes
ElementCore.BaseComponent
ElementCore.ComponentRegistry
ElementCore.ComponentManager
ElementCore.ConfigParser
ElementCore.PluginManager

// Version info
console.log(ElementCore.version); // "1.0.0"
```

### Component Registry Methods

```javascript
// Register component
ElementCore.ComponentRegistry.register('ComponentName', ComponentClass);

// Check if component exists
ElementCore.ComponentRegistry.has('ComponentName');

// Get component class
ElementCore.ComponentRegistry.get('ComponentName');

// List all registered components
ElementCore.ComponentRegistry.list();

// Remove component
ElementCore.ComponentRegistry.remove('ComponentName');
```

## Best Practices

1. **Keep Components Small**: Focus on single responsibilities
2. **Use Direct DOM Updates**: Leverage `const` references for efficient updates
3. **Cleanup Resources**: Always cleanup in `onDestroy()`
4. **State Simplicity**: Keep state flat and simple
5. **Manual Updates**: Embrace manual DOM updates for performance
6. **Use Proper Namespacing**: Access framework classes via `ElementCore.*`
7. **Event Handler Naming**: Use camelCase for event handlers (`onClick`, not `onclick`)

## Complete Example

```javascript
class TodoApp extends ElementCore.BaseComponent {
    constructor(id, props, manager) {
        super(id, props, manager);
        this.state = { 
            todos: [],
            newTodo: ''
        };
    }

    render() {
        return {
            tag: 'div',
            class: 'todo-app',
            children: [
                {
                    tag: 'h1',
                    children: ['Todo App']
                },
                {
                    tag: 'input',
                    const: 'input',
                    placeholder: 'Add new todo...',
                    onKeyDown: (e) => e.key === 'Enter' && this.addTodo()
                },
                {
                    tag: 'button',
                    children: ['Add'],
                    onClick: () => this.addTodo()
                },
                {
                    tag: 'ul',
                    const: 'todoList'
                }
            ]
        };
    }

    addTodo() {
        const text = this.input.value.trim();
        if (!text) return;

        const todo = { id: Date.now(), text, done: false };
        this.setState({ todos: [...this.state.todos, todo] });
        this.input.value = '';
    }

    onStateChange(newState) {
        // Re-render todo list
        this.todoList.innerHTML = '';
        this.state.todos.forEach(todo => {
            const li = document.createElement('li');
            li.textContent = todo.text;
            li.style.textDecoration = todo.done ? 'line-through' : 'none';
            li.onclick = () => this.toggleTodo(todo.id);
            this.todoList.appendChild(li);
        });
    }

    toggleTodo(id) {
        const todos = this.state.todos.map(todo =>
            todo.id === id ? { ...todo, done: !todo.done } : todo
        );
        this.setState({ todos });
    }
}

// Register and use
ElementCore.ComponentRegistry.register('TodoApp', TodoApp);

const app = ElementCore.create(document.getElementById('app'));
app.render({ tag: 'TodoApp' });
```

## License

MIT License - Feel free to use in your projects!

## Author

**Mubbasher Mukhtar**
- GitHub: [@mubbasher16](https://github.com/mubbasher16)
- LinkedIn: [Mubbasher-Mukhtar](https://www.linkedin.com/in/mubbasher-mukhtar/)

## Contributing

Contributions are welcome! Please read the contributing guidelines and submit pull requests to the GitHub repository.
