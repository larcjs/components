// <pan-tabs> — Tabbed interface with PAN topic integration
// Attributes:
//   - active: Currently active tab index (default: 0)
//   - topic: Topic prefix for events
//   - tabs: JSON array of tab configs [{label, id, icon?, disabled?}]
//
// Topics:
//   - Subscribes: {topic}.select { index }
//   - Publishes: {topic}.changed { index, id, label }
//
// Usage with slots:
//   <pan-tabs>
//     <div slot="tab-0">First tab content</div>
//     <div slot="tab-1">Second tab content</div>
//   </pan-tabs>

import { PanClient } from '../../../core/src/components/pan-client.mjs';

export class PanTabs extends HTMLElement {
  static get observedAttributes() {
    return ['active', 'topic', 'tabs'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.pc = new PanClient(this);
    this.activeIndex = 0;
  }

  connectedCallback() {
    this.activeIndex = parseInt(this.getAttribute('active')) || 0;
    this.render();
    this.setupTopics();
    this.setupEvents();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'active' && oldVal !== newVal) {
      this.activeIndex = parseInt(newVal) || 0;
    }
    if (this.isConnected) this.render();
  }

  get topic() { return this.getAttribute('topic') || 'tabs'; }
  get tabs() {
    const attr = this.getAttribute('tabs');
    if (!attr) {
      // Auto-discover from slots
      const slots = Array.from(this.querySelectorAll('[slot^="tab-"]'));
      return slots.map((slot, i) => ({
        label: slot.getAttribute('data-label') || `Tab ${i + 1}`,
        id: slot.getAttribute('slot').replace('tab-', '')
      }));
    }
    try {
      return JSON.parse(attr);
    } catch {
      return [];
    }
  }

  setupTopics() {
    this.pc.subscribe(`${this.topic}.select`, (msg) => {
      if (typeof msg.data.index === 'number') {
        this.selectTab(msg.data.index);
      }
    });
  }

  setupEvents() {
    const tabButtons = this.shadowRoot.querySelectorAll('.tab-button');
    tabButtons.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        if (!btn.hasAttribute('disabled')) {
          this.selectTab(index);
        }
      });
    });
  }

  selectTab(index) {
    if (index < 0 || index >= this.tabs.length) return;
    if (this.tabs[index].disabled) return;

    this.activeIndex = index;
    this.setAttribute('active', index);

    // Update UI
    const tabButtons = this.shadowRoot.querySelectorAll('.tab-button');
    const tabPanels = this.shadowRoot.querySelectorAll('.tab-panel');

    tabButtons.forEach((btn, i) => {
      btn.classList.toggle('active', i === index);
      btn.setAttribute('aria-selected', i === index);
    });

    tabPanels.forEach((panel, i) => {
      panel.classList.toggle('active', i === index);
      panel.setAttribute('aria-hidden', i !== index);
    });

    // Publish change
    this.pc.publish({
      topic: `${this.topic}.changed`,
      data: {
        index,
        id: this.tabs[index].id || index,
        label: this.tabs[index].label
      }
    });
  }

  render() {
    const tabs = this.tabs;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .tabs-container {
          display: flex;
          flex-direction: column;
        }

        .tab-list {
          display: flex;
          gap: 0.25rem;
          border-bottom: 2px solid var(--tabs-border, #e2e8f0);
          background: var(--tabs-bg, #f8fafc);
          padding: 0 0.5rem;
        }

        .tab-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.25rem;
          border: none;
          background: transparent;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--tabs-color, #64748b);
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          transition: all 0.2s;
        }

        .tab-button:hover:not([disabled]) {
          color: var(--tabs-hover-color, #1e293b);
          background: var(--tabs-hover-bg, #f1f5f9);
        }

        .tab-button.active {
          color: var(--tabs-active-color, #6366f1);
          border-bottom-color: var(--tabs-active-border, #6366f1);
          background: var(--tabs-active-bg, #ffffff);
        }

        .tab-button[disabled] {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .tab-icon {
          font-size: 1.125rem;
        }

        .tab-panels {
          padding: 1.5rem;
          background: var(--tabs-panel-bg, #ffffff);
        }

        .tab-panel {
          display: none;
        }

        .tab-panel.active {
          display: block;
        }
      </style>

      <div class="tabs-container" role="tablist">
        <div class="tab-list">
          ${tabs.map((tab, i) => `
            <button
              class="tab-button ${i === this.activeIndex ? 'active' : ''}"
              role="tab"
              aria-selected="${i === this.activeIndex}"
              ${tab.disabled ? 'disabled' : ''}
            >
              ${tab.icon ? `<span class="tab-icon">${tab.icon}</span>` : ''}
              ${tab.label}
            </button>
          `).join('')}
        </div>

        <div class="tab-panels">
          ${tabs.map((tab, i) => `
            <div
              class="tab-panel ${i === this.activeIndex ? 'active' : ''}"
              role="tabpanel"
              aria-hidden="${i !== this.activeIndex}"
            >
              <slot name="tab-${tab.id || i}"></slot>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Re-setup events after render
    if (this.isConnected) {
      setTimeout(() => this.setupEvents(), 0);
    }
  }
}

customElements.define('pan-tabs', PanTabs);
export default PanTabs;
