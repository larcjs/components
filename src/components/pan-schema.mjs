// <pan-schema> — Publishes JSON Schema for a resource on the PAN bus
//
// Attributes:
// - resource: logical resource name (e.g., "users")
// - src: optional URL to fetch JSON Schema from
//
// Behavior:
// - On connect, loads schema from `src` or from a child <script type="application/json">.
// - Publishes retained `${resource}.schema.state` with `{ schema }`.
// - Replies to `${resource}.schema.get` with `{ ok, schema }`.

import { PanClient } from '../../../core/src/components/pan-client.mjs';

export class PanSchema extends HTMLElement {
  static get observedAttributes(){ return ['resource','src']; }
  constructor(){ super(); this.pc = new PanClient(this); this.schema = null; this._offs = []; }

  connectedCallback(){ this.#init(); }
  disconnectedCallback(){ this._offs.forEach(f=>f&&f()); this._offs=[]; }
  attributeChangedCallback(){ this.#init(); }

  get resource(){ return (this.getAttribute('resource')||'items').trim(); }
  get src(){ return (this.getAttribute('src')||'').trim(); }

  async #init(){
    this._offs.forEach(f=>f&&f()); this._offs=[];
    // Serve schema get
    this._offs.push(this.pc.subscribe(`${this.resource}.schema.get`, (m)=>{
      this.#ensure().then(()=>{
        const ok = !!this.schema;
        if (m?.replyTo) this.pc.publish({ topic: m.replyTo, correlationId: m.correlationId, data: { ok, schema: this.schema } });
        if (ok) this.#publish();
      });
    }));
    await this.#ensure();
    this.#publish();
  }

  async #ensure(){
    if (this.schema) return;
    if (this.src) {
      try {
        const res = await fetch(this.src, { credentials: 'same-origin' });
        const json = await res.json();
        this.schema = json || null;
      } catch {}
    }
    if (!this.schema) {
      const script = this.querySelector('script[type="application/json"]');
      if (script && script.textContent?.trim()) {
        try { this.schema = JSON.parse(script.textContent.trim()); } catch {}
      }
    }
  }

  #publish(){
    if (!this.schema) return;
    this.pc.publish({ topic: `${this.resource}.schema.state`, data: { schema: this.schema }, retain: true });
  }
}

customElements.define('pan-schema', PanSchema);
export default PanSchema;

