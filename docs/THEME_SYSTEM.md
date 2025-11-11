# PAN Theme System

A comprehensive light/dark mode theme system built with PAN components that automatically respects system preferences.

## Overview

The PAN theme system provides:
- 🎨 **Sky Blue Color Scheme** (#006699) - Clean, professional color palette
- 🌗 **Automatic Light/Dark Mode** - Respects system preferences via `prefers-color-scheme`
- 🔧 **Manual Override** - Users can choose light, dark, or auto mode
- 🚌 **PAN Integration** - Theme changes broadcast via PAN message bus
- 🎯 **Web Components** - Zero-dependency, framework-agnostic
- 📦 **CSS Variables** - Easy customization and theming

## Quick Start

### 1. Include Theme CSS

Add the theme stylesheet to your HTML:

```html
<link rel="stylesheet" href="assets/theme.css">
```

For files in subdirectories, adjust the path:
```html
<link rel="stylesheet" href="../assets/theme.css">
```

### 2. Add Theme Provider

Add the theme provider component before closing `</body>`:

```html
<!-- Theme System -->
<pan-theme-provider theme="auto"></pan-theme-provider>

<script type="module">
  import './components/pan-theme-provider.mjs';
  import './components/pan-theme-toggle.mjs';
</script>
```

### 3. Add Theme Toggle (Optional)

Add a theme toggle button to your navigation:

```html
<pan-theme-toggle variant="icon"></pan-theme-toggle>
```

## Components

### `<pan-theme-provider>`

Manages theme state and broadcasts changes via PAN.

**Attributes:**
- `theme`: `'light'` | `'dark'` | `'auto'` (default: `'auto'`)

**PAN Events:**
- `theme.changed`: Emitted when theme changes
  ```js
  { theme: 'auto', effective: 'dark' }
  ```
- `theme.system-changed`: Emitted when system preference changes
  ```js
  { theme: 'dark' }
  ```

**API:**
```js
const provider = document.querySelector('pan-theme-provider');

// Set theme
provider.setTheme('dark');

// Get current theme setting
provider.getTheme(); // 'auto', 'light', or 'dark'

// Get effective theme (resolves 'auto')
provider.getEffectiveTheme(); // 'light' or 'dark'

// Get system preference
provider.getSystemTheme(); // 'light' or 'dark'
```

### `<pan-theme-toggle>`

Interactive theme switcher button.

**Attributes:**
- `variant`: `'icon'` | `'button'` | `'dropdown'` (default: `'icon'`)
- `label`: Optional label text (only for `button` variant)

**Variants:**

1. **Icon** - Simple icon button that cycles through modes
   ```html
   <pan-theme-toggle variant="icon"></pan-theme-toggle>
   ```

2. **Button** - Icon with label
   ```html
   <pan-theme-toggle variant="button" label="Theme"></pan-theme-toggle>
   ```

3. **Dropdown** - Dropdown menu with all options
   ```html
   <pan-theme-toggle variant="dropdown"></pan-theme-toggle>
   ```

## Color Palette

### Primary Colors

| Variable | Light Mode | Dark Mode |
|----------|------------|-----------|
| `--color-primary` | #006699 | #0099dd |
| `--color-primary-dark` | #004d73 | #0077bb |
| `--color-primary-light` | #0088cc | #33aaee |
| `--color-primary-soft` | #cce6f5 | rgba(0, 153, 221, 0.15) |

### Semantic Colors

| Variable | Purpose |
|----------|---------|
| `--color-success` | Success states, positive actions |
| `--color-warning` | Warnings, caution states |
| `--color-danger` | Errors, destructive actions |
| `--color-info` | Informational messages |

### Surface & Background

| Variable | Usage |
|----------|-------|
| `--color-bg` | Page background |
| `--color-bg-alt` | Alternate background (sections) |
| `--color-surface` | Card/panel backgrounds |
| `--color-surface-alt` | Alternate surface color |

### Text Colors

| Variable | Usage |
|----------|-------|
| `--color-text` | Primary text |
| `--color-text-muted` | Secondary/muted text |
| `--color-text-subtle` | Subtle/placeholder text |

### Borders

| Variable | Usage |
|----------|-------|
| `--color-border` | Default borders |
| `--color-border-strong` | Emphasized borders |

## Usage Examples

### Basic Theme-Aware Component

```css
.my-component {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
}
```

### Primary Action Button

```css
.button-primary {
  background: var(--color-primary);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  transition: background 0.2s ease;
}

.button-primary:hover {
  background: var(--color-primary-dark);
}
```

### Status Badges

```css
.badge-success {
  background: var(--color-success-light);
  color: var(--color-success);
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
}
```

### Shadow DOM Components

For web components with shadow DOM, inherit theme variables:

```js
this.shadowRoot.innerHTML = `
  <style>
    :host {
      display: block;
    }

    .container {
      background: var(--color-surface, #ffffff);
      color: var(--color-text, #1e293b);
      border: 1px solid var(--color-border, #e2e8f0);
    }
  </style>
  <div class="container">
    <slot></slot>
  </div>
`;
```

Note: Always provide fallback colors for shadow DOM components.

## PAN Integration

Listen to theme changes in your components:

```js
const bus = document.querySelector('pan-bus');
if (bus) {
  bus.subscribe('theme.changed', (data) => {
    console.log('Theme changed to:', data.effective);
    // Update component state
  });
}
```

Or use the theme provider directly:

```js
const provider = document.querySelector('pan-theme-provider');
provider.addEventListener('theme-change', (e) => {
  const { theme, effective } = e.detail;
  console.log(`Theme: ${theme}, Effective: ${effective}`);
});
```

## Migration Guide

### Updating Existing Pages

1. **Replace color variable definitions**
   ```diff
   - :root {
   -   --color-primary: #6366f1;
   -   --color-bg: #ffffff;
   -   /* ... */
   - }
   + <link rel="stylesheet" href="assets/theme.css">
   ```

2. **Replace hardcoded colors**
   ```diff
   - background: white;
   + background: var(--color-surface);

   - color: #1e293b;
   + color: var(--color-text);

   - border: 1px solid #e2e8f0;
   + border: 1px solid var(--color-border);
   ```

3. **Add theme components**
   ```html
   <pan-theme-provider theme="auto"></pan-theme-provider>
   <script type="module">
     import './components/pan-theme-provider.mjs';
     import './components/pan-theme-toggle.mjs';
   </script>
   ```

### Automated Migration

Use the provided script to update multiple files:

```bash
node scripts/add-theme-support.mjs
```

This script:
- Adds theme.css link
- Removes old color variable definitions
- Replaces hardcoded colors
- Adds theme provider and toggle

## Customization

### Override Colors

You can override theme colors by defining variables after importing theme.css:

```css
:root {
  --color-primary: #0077cc;
  --color-primary-dark: #005599;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-primary: #00aaff;
  }
}
```

### Component-Specific Themes

```css
.my-card {
  --card-bg: var(--color-surface);
  --card-border: var(--color-border);
  --card-text-color: var(--color-text);
}
```

## Browser Support

- ✅ Chrome 76+
- ✅ Firefox 67+
- ✅ Safari 12.1+
- ✅ Edge 79+

Requires support for:
- CSS Custom Properties
- Web Components (Custom Elements)
- `prefers-color-scheme` media query
- ES6 Modules

## Best Practices

1. **Always use theme variables** instead of hardcoded colors
2. **Provide fallback colors** in shadow DOM components
3. **Test in both modes** - Light and dark mode
4. **Use semantic colors** for consistent meaning
5. **Respect user preferences** - Default to `auto` mode
6. **Consider contrast** - Ensure readable text in both modes
7. **Test transitions** - Ensure smooth theme switching

## Troubleshooting

### Theme not applying

1. Check that theme.css is loaded: `<link rel="stylesheet" href="assets/theme.css">`
2. Verify theme provider is present: `<pan-theme-provider>`
3. Check console for import errors
4. Ensure components are imported: `import './components/pan-theme-provider.mjs'`

### Colors not changing

1. Make sure you're using CSS variables: `var(--color-primary)`
2. Check for hardcoded colors in inline styles
3. For shadow DOM, ensure variables are inherited with fallbacks

### Toggle not working

1. Verify pan-theme-toggle is imported
2. Check that pan-theme-provider is on the page
3. Look for JavaScript errors in console

## Demo

See `theme-demo.html` for a comprehensive demonstration of all theme colors and components.

## Resources

- [CSS Custom Properties (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [prefers-color-scheme (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)
- [Web Components (MDN)](https://developer.mozilla.org/en-US/docs/Web/Web_Components)

## Support

For issues or questions about the theme system, please open an issue on GitHub.
