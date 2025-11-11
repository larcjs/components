/**
 * pan-theme-toggle
 *
 * A theme toggle button component that communicates with pan-theme-provider via PAN.
 * Displays current theme and allows switching between light, dark, and auto modes.
 *
 * Usage:
 *   <pan-theme-toggle></pan-theme-toggle>
 *
 * Attributes:
 *   - label: Optional label text (default: none, just icons)
 *   - variant: 'button' | 'icon' | 'dropdown' (default: 'icon')
 *
 * Listens to PAN topics:
 *   - theme.changed: Updates UI to reflect current theme
 *   - theme.system-changed: Updates auto mode indicator
 */
export class PanThemeToggle extends HTMLElement {
  static observedAttributes = ['label', 'variant'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._currentTheme = 'auto';
    this._effectiveTheme = 'light';
  }

  connectedCallback() {
    this.render();
    this._setupPanListeners();
    this._requestCurrentTheme();
  }

  disconnectedCallback() {
    this._teardownPanListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  render() {
    const variant = this.getAttribute('variant') || 'icon';
    const label = this.getAttribute('label') || '';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
        }

        .toggle-container {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        button {
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #e2e8f0);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--color-text, #1e293b);
          font-family: var(--font-sans, system-ui);
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }

        button:hover {
          background: var(--color-bg-alt, #f8fafc);
          border-color: var(--color-border-strong, #cbd5e1);
        }

        button:active {
          transform: scale(0.98);
        }

        .icon {
          width: 1.25rem;
          height: 1.25rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .label {
          font-weight: 500;
        }

        /* Icon-only variant */
        .icon-only {
          padding: 0.5rem;
        }

        /* Dropdown variant */
        .dropdown {
          position: relative;
        }

        .dropdown-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 0.5rem;
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #e2e8f0);
          border-radius: 0.5rem;
          box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
          padding: 0.5rem;
          min-width: 150px;
          z-index: 1000;
          display: none;
        }

        .dropdown-menu.open {
          display: block;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: background 0.15s ease;
          color: var(--color-text, #1e293b);
        }

        .dropdown-item:hover {
          background: var(--color-bg-alt, #f8fafc);
        }

        .dropdown-item.active {
          background: var(--color-primary-soft, #cce6f5);
          color: var(--color-primary, #006699);
          font-weight: 500;
        }

        /* Theme icons */
        .theme-icon {
          width: 1rem;
          height: 1rem;
        }
      </style>
      <div class="toggle-container">
        ${variant === 'dropdown' ? this._renderDropdown() : this._renderButton(label, variant)}
      </div>
    `;

    this._attachEventListeners();
  }

  _renderButton(label, variant) {
    const iconClass = variant === 'icon' ? 'icon-only' : '';
    const icon = this._getThemeIcon(this._effectiveTheme);

    return `
      <button class="toggle-btn ${iconClass}" aria-label="Toggle theme">
        <span class="icon">${icon}</span>
        ${label ? `<span class="label">${label}</span>` : ''}
      </button>
    `;
  }

  _renderDropdown() {
    const icon = this._getThemeIcon(this._effectiveTheme);

    return `
      <div class="dropdown">
        <button class="toggle-btn dropdown-trigger" aria-label="Toggle theme">
          <span class="icon">${icon}</span>
        </button>
        <div class="dropdown-menu">
          <div class="dropdown-item" data-theme="light">
            <span class="theme-icon">${this._getThemeIcon('light')}</span>
            <span>Light</span>
          </div>
          <div class="dropdown-item" data-theme="dark">
            <span class="theme-icon">${this._getThemeIcon('dark')}</span>
            <span>Dark</span>
          </div>
          <div class="dropdown-item" data-theme="auto">
            <span class="theme-icon">${this._getThemeIcon('auto')}</span>
            <span>Auto</span>
          </div>
        </div>
      </div>
    `;
  }

  _getThemeIcon(theme) {
    const icons = {
      light: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>`,
      dark: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
      </svg>`,
      auto: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
      </svg>`
    };
    return icons[theme] || icons.auto;
  }

  _attachEventListeners() {
    const variant = this.getAttribute('variant') || 'icon';

    if (variant === 'dropdown') {
      const trigger = this.shadowRoot.querySelector('.dropdown-trigger');
      const menu = this.shadowRoot.querySelector('.dropdown-menu');
      const items = this.shadowRoot.querySelectorAll('.dropdown-item');

      trigger?.addEventListener('click', (e) => {
        e.stopPropagation();
        menu?.classList.toggle('open');
      });

      items.forEach(item => {
        item.addEventListener('click', (e) => {
          const theme = item.dataset.theme;
          if (theme) {
            this._setTheme(theme);
            menu?.classList.remove('open');
          }
        });
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', () => {
        menu?.classList.remove('open');
      });

      // Update active state
      this._updateDropdownActiveState();
    } else {
      const btn = this.shadowRoot.querySelector('.toggle-btn');
      btn?.addEventListener('click', () => this._cycleTheme());
    }
  }

  _cycleTheme() {
    const cycle = { auto: 'light', light: 'dark', dark: 'auto' };
    const nextTheme = cycle[this._currentTheme] || 'auto';
    this._setTheme(nextTheme);
  }

  _setTheme(theme) {
    const provider = this._getThemeProvider();
    if (provider) {
      provider.setTheme(theme);
    } else {
      // Fallback: set directly on document
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  _requestCurrentTheme() {
    const provider = this._getThemeProvider();
    if (provider) {
      this._currentTheme = provider.getTheme();
      this._effectiveTheme = provider.getEffectiveTheme();
      this.render();
    }
  }

  _getThemeProvider() {
    return document.querySelector('pan-theme-provider');
  }

  _setupPanListeners() {
    const bus = document.querySelector('pan-bus');
    if (bus) {
      this._themeChangedHandler = (data) => {
        this._currentTheme = data.theme;
        this._effectiveTheme = data.effective;
        this.render();
      };

      bus.subscribe('theme.changed', this._themeChangedHandler);
    }
  }

  _teardownPanListeners() {
    const bus = document.querySelector('pan-bus');
    if (bus && this._themeChangedHandler) {
      bus.unsubscribe('theme.changed', this._themeChangedHandler);
    }
  }

  _updateDropdownActiveState() {
    const items = this.shadowRoot.querySelectorAll('.dropdown-item');
    items.forEach(item => {
      if (item.dataset.theme === this._currentTheme) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }
}

customElements.define('pan-theme-toggle', PanThemeToggle);
