// <pan-search-bar> — Search input with filters and PAN topic integration
// Attributes:
//   - placeholder: Input placeholder text
//   - topic: Topic prefix for events
//   - debounce: Debounce delay in ms (default: 300)
//   - filters: JSON array of filter options [{label, value, icon?}]
//   - show-filters: Show filter dropdown (default: true if filters provided)
//
// Topics:
//   - Publishes: {topic}.search { query, filter }
//   - Publishes: {topic}.clear
//   - Subscribes: {topic}.set { query?, filter? }

import { PanClient } from '../../../core/src/components/pan-client.mjs';

export class PanSearchBar extends HTMLElement {
  static get observedAttributes() {
    return ['placeholder', 'topic', 'debounce', 'filters', 'show-filters'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.pc = new PanClient(this);
    this.debounceTimer = null;
    this.currentQuery = '';
    this.currentFilter = null;
  }

  connectedCallback() {
    this.render();
    this.setupTopics();
    this.setupEvents();
  }

  disconnectedCallback() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  get placeholder() { return this.getAttribute('placeholder') || 'Search...'; }
  get topic() { return this.getAttribute('topic') || 'search'; }
  get debounce() { return parseInt(this.getAttribute('debounce')) || 300; }
  get filters() {
    const attr = this.getAttribute('filters');
    if (!attr) return [];
    try {
      return JSON.parse(attr);
    } catch {
      return [];
    }
  }
  get showFilters() {
    const attr = this.getAttribute('show-filters');
    if (attr === 'false') return false;
    return this.filters.length > 0;
  }

  setupTopics() {
    this.pc.subscribe(`${this.topic}.set`, (msg) => {
      const { query, filter } = msg.data;
      const input = this.shadowRoot.querySelector('.search-input');

      if (typeof query === 'string') {
        this.currentQuery = query;
        if (input) input.value = query;
      }

      if (filter !== undefined) {
        this.currentFilter = filter;
        this.updateFilterButton();
      }
    });
  }

  setupEvents() {
    const input = this.shadowRoot.querySelector('.search-input');
    const clearBtn = this.shadowRoot.querySelector('.clear-btn');
    const filterBtn = this.shadowRoot.querySelector('.filter-btn');
    const filterDropdown = this.shadowRoot.querySelector('.filter-dropdown');

    if (input) {
      input.addEventListener('input', (e) => {
        this.currentQuery = e.target.value;
        this.debouncedSearch();

        // Show/hide clear button
        if (clearBtn) {
          clearBtn.style.display = this.currentQuery ? 'flex' : 'none';
        }
      });

      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.search();
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clear();
      });
    }

    if (filterBtn && filterDropdown) {
      filterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        filterDropdown.classList.toggle('active');
      });

      // Close dropdown on outside click
      document.addEventListener('click', () => {
        filterDropdown.classList.remove('active');
      });

      filterDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = e.target.closest('[data-value]');
        if (item) {
          this.currentFilter = item.dataset.value;
          this.updateFilterButton();
          filterDropdown.classList.remove('active');
          this.search();
        }
      });
    }
  }

  debouncedSearch() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.search(), this.debounce);
  }

  search() {
    this.pc.publish({
      topic: `${this.topic}.search`,
      data: {
        query: this.currentQuery,
        filter: this.currentFilter
      }
    });
  }

  clear() {
    const input = this.shadowRoot.querySelector('.search-input');
    if (input) input.value = '';
    this.currentQuery = '';
    this.currentFilter = null;

    this.pc.publish({
      topic: `${this.topic}.clear`,
      data: {}
    });

    this.search();
  }

  updateFilterButton() {
    const filterBtn = this.shadowRoot.querySelector('.filter-btn');
    if (!filterBtn) return;

    const selectedFilter = this.filters.find(f => f.value === this.currentFilter);
    if (selectedFilter) {
      filterBtn.textContent = `${selectedFilter.icon || '🔽'} ${selectedFilter.label}`;
      filterBtn.classList.add('active');
    } else {
      filterBtn.textContent = '🔽 Filter';
      filterBtn.classList.remove('active');
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .search-bar {
          display: flex;
          gap: 0.5rem;
          align-items: stretch;
        }

        .search-input-wrapper {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          color: var(--search-icon-color, #94a3b8);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem 3rem 0.75rem 2.75rem;
          border: 1px solid var(--search-border, #e2e8f0);
          border-radius: 0.5rem;
          font-family: inherit;
          font-size: 0.95rem;
          background: var(--search-bg, #ffffff);
          color: var(--search-color, #1e293b);
          transition: all 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--search-focus-border, #6366f1);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .clear-btn {
          position: absolute;
          right: 0.75rem;
          display: none;
          align-items: center;
          justify-content: center;
          width: 1.5rem;
          height: 1.5rem;
          border: none;
          background: var(--search-clear-bg, #e2e8f0);
          color: var(--search-clear-color, #64748b);
          border-radius: 50%;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .clear-btn:hover {
          background: var(--search-clear-hover-bg, #cbd5e1);
        }

        .filter-container {
          position: relative;
        }

        .filter-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border: 1px solid var(--search-border, #e2e8f0);
          border-radius: 0.5rem;
          background: var(--search-bg, #ffffff);
          color: var(--search-color, #64748b);
          cursor: pointer;
          font-family: inherit;
          font-size: 0.95rem;
          white-space: nowrap;
          transition: all 0.2s;
        }

        .filter-btn:hover {
          background: var(--search-hover-bg, #f8fafc);
        }

        .filter-btn.active {
          border-color: var(--search-active-border, #6366f1);
          color: var(--search-active-color, #6366f1);
        }

        .filter-dropdown {
          position: absolute;
          top: calc(100% + 0.5rem);
          right: 0;
          min-width: 200px;
          background: var(--search-dropdown-bg, #ffffff);
          border: 1px solid var(--search-dropdown-border, #e2e8f0);
          border-radius: 0.5rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          z-index: 100;
          opacity: 0;
          visibility: hidden;
          transform: translateY(-10px);
          transition: all 0.2s;
          padding: 0.5rem 0;
        }

        .filter-dropdown.active {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }

        .filter-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.625rem 1rem;
          cursor: pointer;
          color: var(--search-dropdown-color, #334155);
          font-size: 0.95rem;
          transition: all 0.15s;
        }

        .filter-item:hover {
          background: var(--search-dropdown-hover-bg, #f1f5f9);
        }
      </style>

      <div class="search-bar">
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            class="search-input"
            placeholder="${this.placeholder}"
            value="${this.currentQuery}"
          >
          <button class="clear-btn" title="Clear">×</button>
        </div>

        ${this.showFilters ? `
          <div class="filter-container">
            <button class="filter-btn">🔽 Filter</button>
            <div class="filter-dropdown">
              <div class="filter-item" data-value="">All</div>
              ${this.filters.map(filter => `
                <div class="filter-item" data-value="${filter.value}">
                  ${filter.icon || ''} ${filter.label}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    // Re-setup events after render
    if (this.isConnected) {
      setTimeout(() => this.setupEvents(), 0);
    }
  }
}

customElements.define('pan-search-bar', PanSearchBar);
export default PanSearchBar;
