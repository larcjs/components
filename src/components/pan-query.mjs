// <pan-query> — Query orchestrator for PAN resources.
// Maintains retained `${resource}.query.state` and triggers `${resource}.list.get`
// when query params change. Accepts defaults via attribute or child JSON.
// Optional URL sync (search or hash) for q/sort/page/size.

import { PanClient } from '../../../core/src/components/pan-client.mjs';

export class PanQuery extends HTMLElement {
  static get observedAttributes(){ return ['resource','defaults','sync-url','debounce-ms','auto-request']; }
  constructor(){ super(); this.pc = new PanClient(this); this.state = {}; this.defaults = {}; this._timer = null; }

  connectedCallback(){ this.#init(); }
  disconnectedCallback(){ this.off?.forEach(f=>f&&f()); this.off = null; if (this._timer) { clearTimeout(this._timer); this._timer = null; } }
  attributeChangedCallback(){ this.#init(); }

  get resource(){ return (this.getAttribute('resource')||'items').trim(); }
  get debounceMs(){ const n = Number(this.getAttribute('debounce-ms')); return Number.isFinite(n) && n>=0 ? n : 150; }
  get autoRequest(){ const v=(this.getAttribute('auto-request')||'true').toLowerCase(); return v!== 'false' && v!== '0'; }
  get syncUrl(){ const v=(this.getAttribute('sync-url')||'').toLowerCase(); return v==='search' || v==='hash' ? v : ''; }

  #init(){
    // Parse defaults
    this.defaults = this.#readDefaults();
    // Build initial state from defaults + URL
    const urlParams = this.#readUrl();
    this.state = Object.assign({}, this.defaults, urlParams);
    // Publish retained state and (optionally) request list
    this.#publishState();
    if (this.autoRequest) this.#requestList();
    // Rewire subscriptions
    this.off?.forEach(f=>f&&f());
    this.off = [
      this.pc.subscribe(`${this.resource}.query.set`, (m)=> this.#merge(m?.data||{})),
      this.pc.subscribe(`${this.resource}.query.reset`, ()=> this.#reset()),
    ];
  }

  #readDefaults(){
    // From attribute JSON or child <script type="application/json">
    let d = {};
    const attr = this.getAttribute('defaults');
    if (attr) { try { d = JSON.parse(attr); } catch {} }
    const script = this.querySelector('script[type="application/json"]');
    if (script && script.textContent?.trim()) { try { d = Object.assign({}, d, JSON.parse(script.textContent.trim())); } catch {} }
    return d;
  }

  #readUrl(){
    if (!this.syncUrl) return {};
    try {
      const src = this.syncUrl === 'search' ? (new URL(location.href)).searchParams : new URLSearchParams((location.hash||'').replace(/^#\??/,''));
      const pick = (k)=> src.has(k) ? src.get(k) : undefined;
      const out = {};
      const q = pick('q'); if (q!=null) out.q = q;
      const sort = pick('sort'); if (sort!=null) out.sort = sort;
      const page = pick('page'); if (page!=null) out.page = Number(page)||1;
      const size = pick('size'); if (size!=null) out.size = Number(size)||50;
      return out;
    } catch { return {}; }
  }

  #writeUrl(){
    if (!this.syncUrl) return;
    try {
      const params = new URLSearchParams();
      const { q, sort, page, size } = this.state;
      if (q) params.set('q', String(q));
      if (sort) params.set('sort', String(sort));
      if (page!=null) params.set('page', String(page));
      if (size!=null) params.set('size', String(size));
      if (this.syncUrl === 'search') {
        const url = new URL(location.href); url.search = params.toString(); history.replaceState(null, '', url.toString());
      } else {
        const s = params.toString(); location.hash = s ? ('#'+s) : '';
      }
    } catch {}
  }

  #publishState(){
    this.pc.publish({ topic: `${this.resource}.query.state`, data: Object.assign({}, this.state), retain: true });
  }

  #requestList(){
    const data = Object.assign({}, this.state);
    this.pc.publish({ topic: `${this.resource}.list.get`, data });
  }

  #merge(patch){
    this.state = Object.assign({}, this.state, patch||{});
    this.#publishState();
    this.#writeUrl();
    if (this.autoRequest) this.#debounced();
  }

  #reset(){ this.state = Object.assign({}, this.defaults); this.#publishState(); this.#writeUrl(); if (this.autoRequest) this.#debounced(); }

  #debounced(){
    if (!this.debounceMs) return this.#requestList();
    clearTimeout(this._timer); this._timer = setTimeout(()=> this.#requestList(), this.debounceMs);
  }
}

customElements.define('pan-query', PanQuery);
export default PanQuery;

