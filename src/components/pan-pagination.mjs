// <pan-pagination> — Pagination control with PAN topic integration
// Attributes:
//   - current-page: Current page number (1-based, default: 1)
//   - total-pages: Total number of pages
//   - total-items: Total number of items
//   - page-size: Items per page
//   - topic: Topic prefix for events
//   - show-info: Show "Page X of Y" text (default: true)
//   - show-jump: Show page jump input (default: false)
//
// Topics:
//   - Subscribes: {topic}.goto { page }
//   - Publishes: {topic}.changed { page, pageSize }

import { PanClient } from '../../../core/src/components/pan-client.mjs';

export class PanPagination extends HTMLElement {
  static get observedAttributes() {
    return ['current-page', 'total-pages', 'total-items', 'page-size', 'topic', 'show-info', 'show-jump'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.pc = new PanClient(this);
  }

  connectedCallback() {
    this.render();
    this.setupTopics();
    this.setupEvents();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  get currentPage() { return parseInt(this.getAttribute('current-page')) || 1; }
  set currentPage(val) { this.setAttribute('current-page', val); }
  get totalPages() {
    const attr = parseInt(this.getAttribute('total-pages'));
    if (attr) return attr;
    const totalItems = this.totalItems;
    const pageSize = this.pageSize;
    if (totalItems && pageSize) {
      return Math.ceil(totalItems / pageSize);
    }
    return 1;
  }
  get totalItems() { return parseInt(this.getAttribute('total-items')) || 0; }
  get pageSize() { return parseInt(this.getAttribute('page-size')) || 10; }
  get topic() { return this.getAttribute('topic') || 'pagination'; }
  get showInfo() { return this.getAttribute('show-info') !== 'false'; }
  get showJump() { return this.hasAttribute('show-jump'); }

  setupTopics() {
    this.pc.subscribe(`${this.topic}.goto`, (msg) => {
      if (typeof msg.data.page === 'number') {
        this.goToPage(msg.data.page);
      }
    });
  }

  setupEvents() {
    const prevBtn = this.shadowRoot.querySelector('.prev-btn');
    const nextBtn = this.shadowRoot.querySelector('.next-btn');
    const firstBtn = this.shadowRoot.querySelector('.first-btn');
    const lastBtn = this.shadowRoot.querySelector('.last-btn');
    const pageButtons = this.shadowRoot.querySelectorAll('.page-btn');
    const jumpInput = this.shadowRoot.querySelector('.jump-input');

    if (prevBtn) prevBtn.addEventListener('click', () => this.goToPage(this.currentPage - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => this.goToPage(this.currentPage + 1));
    if (firstBtn) firstBtn.addEventListener('click', () => this.goToPage(1));
    if (lastBtn) lastBtn.addEventListener('click', () => this.goToPage(this.totalPages));

    pageButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page);
        this.goToPage(page);
      });
    });

    if (jumpInput) {
      jumpInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const page = parseInt(jumpInput.value);
          if (page >= 1 && page <= this.totalPages) {
            this.goToPage(page);
          }
        }
      });
    }
  }

  goToPage(page) {
    if (page < 1 || page > this.totalPages) return;
    if (page === this.currentPage) return;

    this.currentPage = page;

    this.pc.publish({
      topic: `${this.topic}.changed`,
      data: { page, pageSize: this.pageSize }
    });
  }

  getPageNumbers() {
    const current = this.currentPage;
    const total = this.totalPages;
    const pages = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (current > 3) {
        pages.push('...');
      }

      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < total - 2) {
        pages.push('...');
      }

      pages.push(total);
    }

    return pages;
  }

  render() {
    const pages = this.getPageNumbers();
    const startItem = (this.currentPage - 1) * this.pageSize + 1;
    const endItem = Math.min(this.currentPage * this.pageSize, this.totalItems);

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .pagination {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .pagination-info {
          color: var(--pagination-info-color, #64748b);
          font-size: 0.875rem;
        }

        .pagination-buttons {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .pagination-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 2.5rem;
          height: 2.5rem;
          padding: 0 0.75rem;
          border: 1px solid var(--pagination-border, #e2e8f0);
          background: var(--pagination-bg, #ffffff);
          color: var(--pagination-color, #334155);
          border-radius: 0.5rem;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.95rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .pagination-btn:hover:not(:disabled) {
          background: var(--pagination-hover-bg, #f8fafc);
          border-color: var(--pagination-hover-border, #cbd5e1);
        }

        .pagination-btn.active {
          background: var(--pagination-active-bg, #6366f1);
          color: var(--pagination-active-color, #ffffff);
          border-color: var(--pagination-active-border, #6366f1);
        }

        .pagination-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .pagination-btn.ellipsis {
          border: none;
          background: transparent;
          cursor: default;
        }

        .pagination-btn.ellipsis:hover {
          background: transparent;
        }

        .jump-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .jump-input {
          width: 4rem;
          padding: 0.5rem;
          border: 1px solid var(--pagination-border, #e2e8f0);
          border-radius: 0.375rem;
          font-family: inherit;
          text-align: center;
        }
      </style>

      <div class="pagination">
        ${this.showInfo && this.totalItems > 0 ? `
          <div class="pagination-info">
            Showing ${startItem}-${endItem} of ${this.totalItems}
          </div>
        ` : ''}

        <div class="pagination-buttons">
          <button
            class="pagination-btn first-btn"
            ${this.currentPage === 1 ? 'disabled' : ''}
            title="First page"
          >
            ⟨⟨
          </button>

          <button
            class="pagination-btn prev-btn"
            ${this.currentPage === 1 ? 'disabled' : ''}
            title="Previous page"
          >
            ⟨
          </button>

          ${pages.map(page => {
            if (page === '...') {
              return '<button class="pagination-btn ellipsis" disabled>...</button>';
            }
            return `
              <button
                class="pagination-btn page-btn ${page === this.currentPage ? 'active' : ''}"
                data-page="${page}"
              >
                ${page}
              </button>
            `;
          }).join('')}

          <button
            class="pagination-btn next-btn"
            ${this.currentPage === this.totalPages ? 'disabled' : ''}
            title="Next page"
          >
            ⟩
          </button>

          <button
            class="pagination-btn last-btn"
            ${this.currentPage === this.totalPages ? 'disabled' : ''}
            title="Last page"
          >
            ⟩⟩
          </button>
        </div>

        ${this.showJump ? `
          <div class="jump-container">
            <span>Go to:</span>
            <input
              type="number"
              class="jump-input"
              min="1"
              max="${this.totalPages}"
              placeholder="${this.currentPage}"
            >
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

customElements.define('pan-pagination', PanPagination);
export default PanPagination;
