# LARC Component Header Template

Use this standard header format for all component files. The documentation generator will extract this metadata to create rich, categorized documentation.

## Standard Header Format

```javascript
/**
 * @component pan-example
 * @category Data & State
 * @status stable
 * @since 1.0.0
 * 
 * @description
 * Brief one-line description of what this component does
 * 
 * Longer description with details about the component's purpose,
 * behavior, and key features. Explain when to use this component
 * and what problems it solves.
 * 
 * @attr {string} resource - Resource name for PAN topic prefix (default: 'example')
 * @attr {string} data - JSON string for initial data
 * @attr {string} url - URL to fetch data from
 * @attr {boolean} auto-load - Automatically load data on connect
 * @attr {number} refresh-interval - Auto-refresh interval in milliseconds
 * 
 * @subscribes {resource}.data.set { data } - Set component data
 * @subscribes {resource}.data.refresh - Trigger data refresh
 * @subscribes {resource}.reset - Reset to initial state
 * 
 * @publishes {resource}.data.loaded { data, timestamp } - Data loaded successfully
 * @publishes {resource}.data.error { error, message } - Error loading data
 * @publishes {resource}.state.changed { oldState, newState } - State changed
 * 
 * @slot default - Main content slot
 * @slot header - Optional header content
 * @slot footer - Optional footer content
 * 
 * @related pan-store, pan-data-provider, pan-query
 * 
 * @example
 * ```html
 * <!-- Basic usage -->
 * <pan-example resource="users" auto-load>
 *   <span slot="header">User List</span>
 *   <div id="content"></div>
 * </pan-example>
 * ```
 * 
 * @example
 * ```html
 * <!-- With URL data source -->
 * <pan-example 
 *   resource="products"
 *   url="/api/products"
 *   refresh-interval="30000">
 * </pan-example>
 * ```
 * 
 * @example
 * ```javascript
 * // Programmatic usage with PAN
 * import { PanClient } from '@larcjs/core';
 * 
 * const pc = new PanClient();
 * 
 * // Set data
 * pc.publish({
 *   topic: 'users.data.set',
 *   data: { users: [...] }
 * });
 * 
 * // Listen for changes
 * pc.subscribe('users.state.changed', (msg) => {
 *   console.log('State changed:', msg.data);
 * });
 * ```
 */

import { PanClient } from '../../../core/src/components/pan-client.mjs';

export class PanExample extends HTMLElement {
  static get observedAttributes() {
    return ['resource', 'data', 'url', 'auto-load', 'refresh-interval'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.pc = new PanClient(this);
    // ... component implementation
  }

  // ... rest of implementation
}

customElements.define('pan-example', PanExample);
```

## Available Categories

Choose the most appropriate category for your component:

- **Data & State** - State management, data providers, stores, databases
- **Forms & Input** - Form controls, inputs, validation
- **Data Display** - Tables, charts, lists, pagination, cards
- **Navigation** - Routers, links, tabs, menus
- **Dialogs & Overlays** - Modals, popups, tooltips
- **Layout & UI** - Themes, layouts, containers
- **API & Connectivity** - HTTP, WebSocket, SSE, GraphQL clients
- **Auth & Security** - Authentication, authorization, validation
- **Content** - Markdown, rich text, media players
- **Dev Tools** - Debugging, inspection, development utilities
- **Utilities** - Helper components, workers, schemas
- **Specialized** - Domain-specific components

## Status Values

- **stable** - Production ready, fully tested (default)
- **beta** - Feature complete, testing in progress
- **experimental** - Early stage, API may change
- **deprecated** - Being phased out, use alternative

## Metadata Tags Reference

### Required
- `@component` - Component tag name (e.g., pan-example)
- `@description` - Component purpose and usage

### Optional but Recommended
- `@category` - Component category (see list above)
- `@status` - Development status (stable, beta, experimental, deprecated)
- `@since` - Version when component was introduced
- `@attr` - Attribute with `{type} name - description` format
- `@subscribes` - PAN topics this component listens to
- `@publishes` - PAN topics this component publishes
- `@slot` - Named slots available in the component
- `@related` - Comma-separated list of related components
- `@example` - Usage examples with code blocks

## Attribute Type Hints

Common types to use in `@attr` declarations:
- `string` - Text values
- `boolean` - True/false flags (presence = true)
- `number` - Numeric values
- `array` - JSON array
- `object` - JSON object
- `enum` - Limited set of values (specify options)

## PAN Topic Format

Document topics with:
- Full topic pattern including `{resource}` placeholder
- Payload structure in curly braces
- Clear description of when/why it fires

Example:
```javascript
@subscribes {resource}.data.set { data: any[] } - Sets the component's data array
@publishes {resource}.loaded { count: number, timestamp: number } - Fires after data loads
```

## Tips

1. **Be Specific**: Describe exact behavior, not just what attributes do
2. **Show Examples**: Include both HTML and JS usage patterns
3. **Document Edge Cases**: Note special behaviors, limitations, warnings
4. **Link Related**: Help users discover complementary components
5. **Keep Updated**: Update header when adding features or changing API

## Example: Well-Documented Component

See `pan-tree.mjs` for a good example of a well-documented component with:
- Clear description of purpose
- Complete attribute list with types
- All PAN topics documented
- Multiple usage examples
- Related components listed
