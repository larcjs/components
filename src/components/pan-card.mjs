// <pan-card> — Reusable card container component
// Attributes:
//   - header: Card header text
//   - footer: Card footer text
//   - variant: visual style (default, primary, secondary, danger, success)
//   - elevation: shadow depth (0-3)
//   - hoverable: add hover effect
//
// Slots:
//   - default: Main card content
//   - header: Custom header content
//   - footer: Custom footer content
//   - actions: Action buttons area

export class PanCard extends HTMLElement {
  static get observedAttributes() {
    return ['header', 'footer', 'variant', 'elevation', 'hoverable'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  get header() { return this.getAttribute('header') || ''; }
  get footer() { return this.getAttribute('footer') || ''; }
  get variant() { return this.getAttribute('variant') || 'default'; }
  get elevation() { return this.getAttribute('elevation') || '1'; }
  get hoverable() { return this.hasAttribute('hoverable'); }

  render() {
    const hasHeaderSlot = this.querySelector('[slot="header"]');
    const hasFooterSlot = this.querySelector('[slot="footer"]');
    const hasActionsSlot = this.querySelector('[slot="actions"]');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .card {
          background: var(--card-bg, #ffffff);
          border-radius: var(--card-radius, 0.75rem);
          border: 1px solid var(--card-border, #e2e8f0);
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .card.elevation-0 { box-shadow: none; }
        .card.elevation-1 { box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
        .card.elevation-2 { box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .card.elevation-3 { box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1); }

        .card.hoverable:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 20px rgba(0, 0, 0, 0.15);
        }

        .card.variant-primary {
          border-color: var(--color-primary, #6366f1);
          background: var(--color-primary-light, #eef2ff);
        }

        .card.variant-secondary {
          border-color: var(--color-secondary, #64748b);
          background: var(--color-secondary-light, #f8fafc);
        }

        .card.variant-danger {
          border-color: var(--color-danger, #ef4444);
          background: var(--color-danger-light, #fef2f2);
        }

        .card.variant-success {
          border-color: var(--color-success, #10b981);
          background: var(--color-success-light, #f0fdf4);
        }

        .card-header {
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--card-border, #e2e8f0);
          font-weight: 600;
          color: var(--card-header-color, #1e293b);
        }

        .card-body {
          padding: 1.25rem;
          color: var(--card-text-color, #334155);
        }

        .card-footer {
          padding: 1rem 1.25rem;
          border-top: 1px solid var(--card-border, #e2e8f0);
          background: var(--card-footer-bg, #f8fafc);
          color: var(--card-footer-color, #64748b);
          font-size: 0.875rem;
        }

        .card-actions {
          padding: 1rem 1.25rem;
          border-top: 1px solid var(--card-border, #e2e8f0);
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }

        .hidden {
          display: none;
        }
      </style>

      <div class="card elevation-${this.elevation} variant-${this.variant} ${this.hoverable ? 'hoverable' : ''}">
        ${this.header || hasHeaderSlot ? `
          <div class="card-header">
            <slot name="header">${this.header}</slot>
          </div>
        ` : ''}

        <div class="card-body">
          <slot></slot>
        </div>

        ${hasActionsSlot ? `
          <div class="card-actions">
            <slot name="actions"></slot>
          </div>
        ` : ''}

        ${this.footer || hasFooterSlot ? `
          <div class="card-footer">
            <slot name="footer">${this.footer}</slot>
          </div>
        ` : ''}
      </div>
    `;
  }
}

customElements.define('pan-card', PanCard);
export default PanCard;
