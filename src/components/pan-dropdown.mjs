// <pan-dropdown> — Dropdown menu with PAN topic integration
// Attributes:
//   - label: Button label
//   - position: bottom-left, bottom-right, top-left, top-right (default: bottom-left)
//   - topic: Topic prefix for events
//   - items: JSON array of menu items [{label, value, icon?, disabled?}]
//
// Topics:
//   - Publishes: {topic}.select { value, label }
//   - Publishes: {topic}.opened, {topic}.closed
//
// Slots:
//   - trigger: Custom trigger button
//   - default: Custom menu items

import { PanClient } from '../../../core/src/components/pan-client.mjs';

export class PanDropdown extends HTMLElement {
  static get observedAttributes() {
    return ['label', 'position', 'topic', 'items'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.pc = new PanClient(this);
    this.isOpen = false;
  }

  connectedCallback() {
    this.render();
    this.setupEvents();
  }

  disconnectedCallback() {
    document.removeEventListener('click', this.handleOutsideClick);
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  get label() { return this.getAttribute('label') || 'Menu'; }
  get position() { return this.getAttribute('position') || 'bottom-left'; }
  get topic() { return this.getAttribute('topic') || 'dropdown'; }
  get items() {
    const attr = this.getAttribute('items');
    if (!attr) return [];
    try {
      return JSON.parse(attr);
    } catch {
      return [];
    }
  }

  setupEvents() {
    const trigger = this.shadowRoot.querySelector('.dropdown-trigger');
    const menu = this.shadowRoot.querySelector('.dropdown-menu');

    if (trigger) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggle();
      });
    }

    if (menu) {
      menu.addEventListener('click', (e) => {
        const item = e.target.closest('[data-value]');
        if (item && !item.hasAttribute('disabled')) {
          const value = item.dataset.value;
          const label = item.textContent.trim();
          this.selectItem(value, label);
        }
      });
    }

    // Close on outside click
    this.handleOutsideClick = (e) => {
      if (!this.contains(e.target) && this.isOpen) {
        this.close();
      }
    };
    document.addEventListener('click', this.handleOutsideClick);
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    const menu = this.shadowRoot.querySelector('.dropdown-menu');
    if (menu) menu.classList.add('active');

    this.pc.publish({
      topic: `${this.topic}.opened`,
      data: {}
    });
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    const menu = this.shadowRoot.querySelector('.dropdown-menu');
    if (menu) menu.classList.remove('active');

    this.pc.publish({
      topic: `${this.topic}.closed`,
      data: {}
    });
  }

  selectItem(value, label) {
    this.pc.publish({
      topic: `${this.topic}.select`,
      data: { value, label }
    });
    this.close();
  }

  render() {
    const hasTriggerSlot = this.querySelector('[slot="trigger"]');
    const hasDefaultSlot = this.querySelector(':not([slot])');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          position: relative;
        }

        .dropdown-trigger {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: var(--dropdown-trigger-bg, #ffffff);
          border: 1px solid var(--dropdown-trigger-border, #e2e8f0);
          border-radius: 0.5rem;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--dropdown-trigger-color, #1e293b);
          transition: all 0.2s;
        }

        .dropdown-trigger:hover {
          background: var(--dropdown-trigger-hover-bg, #f8fafc);
          border-color: var(--dropdown-trigger-hover-border, #cbd5e1);
        }

        .dropdown-arrow {
          font-size: 0.75rem;
          transition: transform 0.2s;
        }

        .dropdown-trigger.open .dropdown-arrow {
          transform: rotate(180deg);
        }

        .dropdown-menu {
          position: absolute;
          min-width: 200px;
          background: var(--dropdown-menu-bg, #ffffff);
          border: 1px solid var(--dropdown-menu-border, #e2e8f0);
          border-radius: 0.5rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          opacity: 0;
          visibility: hidden;
          transform: translateY(-10px);
          transition: all 0.2s ease;
          padding: 0.5rem 0;
        }

        .dropdown-menu.active {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }

        .dropdown-menu.position-bottom-left {
          top: calc(100% + 0.5rem);
          left: 0;
        }

        .dropdown-menu.position-bottom-right {
          top: calc(100% + 0.5rem);
          right: 0;
        }

        .dropdown-menu.position-top-left {
          bottom: calc(100% + 0.5rem);
          left: 0;
        }

        .dropdown-menu.position-top-right {
          bottom: calc(100% + 0.5rem);
          right: 0;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.625rem 1rem;
          cursor: pointer;
          color: var(--dropdown-item-color, #334155);
          font-size: 0.95rem;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .dropdown-item:hover {
          background: var(--dropdown-item-hover-bg, #f1f5f9);
          color: var(--dropdown-item-hover-color, #1e293b);
        }

        .dropdown-item[disabled] {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .dropdown-item[disabled]:hover {
          background: transparent;
        }

        .dropdown-divider {
          height: 1px;
          background: var(--dropdown-divider-color, #e2e8f0);
          margin: 0.5rem 0;
        }

        .item-icon {
          font-size: 1rem;
        }
      </style>

      <div class="dropdown">
        ${hasTriggerSlot ? `
          <slot name="trigger"></slot>
        ` : `
          <button class="dropdown-trigger ${this.isOpen ? 'open' : ''}">
            ${this.label}
            <span class="dropdown-arrow">▼</span>
          </button>
        `}

        <div class="dropdown-menu position-${this.position}">
          ${hasDefaultSlot ? `
            <slot></slot>
          ` : this.items.map(item => {
            if (item.divider) {
              return '<div class="dropdown-divider"></div>';
            }
            return `
              <div
                class="dropdown-item"
                data-value="${item.value || item.label}"
                ${item.disabled ? 'disabled' : ''}
              >
                ${item.icon ? `<span class="item-icon">${item.icon}</span>` : ''}
                ${item.label}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
}

customElements.define('pan-dropdown', PanDropdown);
export default PanDropdown;
