// <pan-link> — Declarative navigation via PAN topics
// Attributes:
//   - to: target path
//   - replace: use replaceState instead of pushState
//   - active-class: CSS class to add when link matches current route (default: 'active')
//   - exact: require exact match for active state (default: false)
//
// Usage:
//   <pan-link to="/about">About</pan-link>
//   <pan-link to="/user/123" replace>Profile</pan-link>

import { PanClient } from '../../../core/src/components/pan-client.mjs';

export class PanLink extends HTMLElement {
  static get observedAttributes() { return ['to', 'replace', 'active-class', 'exact']; }

  constructor() {
    super();
    this.pc = new PanClient(this);
    this.currentPath = '';
  }

  connectedCallback() {
    this.#render();
    this.#subscribe();

    // Handle clicks
    this.addEventListener('click', this.#handleClick);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.#handleClick);
  }

  attributeChangedCallback() {
    if (this.isConnected) this.#render();
  }

  get to() { return this.getAttribute('to') || ''; }
  get replace() { return this.hasAttribute('replace'); }
  get activeClass() { return this.getAttribute('active-class') || 'active'; }
  get exact() { return this.hasAttribute('exact'); }

  #render() {
    this.style.cursor = 'pointer';
    this.style.textDecoration = this.style.textDecoration || 'none';
    this.setAttribute('role', 'link');
    this.setAttribute('tabindex', '0');

    // Update active state
    this.#updateActiveState();
  }

  #subscribe() {
    // Listen to nav.state changes to update active class
    this.pc.subscribe('nav.state', (msg) => {
      this.currentPath = msg.data?.path || '';
      this.#updateActiveState();
    }, { retained: true });
  }

  #handleClick = (e) => {
    e.preventDefault();

    if (!this.to) return;

    this.pc.publish({
      topic: this.replace ? 'nav.replace' : 'nav.goto',
      data: { path: this.to }
    });
  };

  #updateActiveState() {
    const isActive = this.exact
      ? this.currentPath === this.to
      : this.currentPath.startsWith(this.to);

    if (isActive) {
      this.classList.add(this.activeClass);
    } else {
      this.classList.remove(this.activeClass);
    }
  }
}

customElements.define('pan-link', PanLink);
export default PanLink;
