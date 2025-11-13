// <pan-php-connector> — Bridge PAN list topics to a PHP endpoint shaped like api.php
//
// Listens for `${resource}.list.get`, `${resource}.list.more`, and `${resource}.list.reset`.
// Proxies to `api-url` with query params: x=get, rsc, start, page_size, fields, filters, id.
// Publishes aggregated `${resource}.list.state` (retain) and `${resource}.list.meta` (non-retained).
//
// Attributes:
// - resource: table/resource name (e.g., "Business")
// - api-url: endpoint URL (default: "api.php")
// - fields: CSV list of columns to select (optional; default: all/"*")
// - page-size: page size to request (api.php caps to 20)
// - start-param: name of the paging param (default: "start")
//
// Notes:
// - This connector accumulates pages locally and republishes the full aggregated list on `${resource}.list.state`.
// - `filters` may be provided in requests as a JSON string or an array of { key, value }.

import { PanClient } from '../../../core/src/components/pan-client.mjs';

export class PanPhpConnector extends HTMLElement {
  static get observedAttributes(){ return ['resource','api-url','fields','page-size','start-param']; }
  constructor(){
    super();
    this.pc = new PanClient(this);
    this.items = [];
    this.meta = { total: null, start: 0, count: 0, page: null };
    this._offs = [];
    this._busy = false;
  }

  connectedCallback(){ this.#rewire(); }
  disconnectedCallback(){ this.#unsubAll(); }
  attributeChangedCallback(){ this.#rewire(); }

  get resource(){ return (this.getAttribute('resource') || 'items').trim(); }
  get apiUrl(){ return (this.getAttribute('api-url') || 'api.php').trim(); }
  get fields(){ return (this.getAttribute('fields') || '').trim(); }
  get pageSize(){ const n = Number(this.getAttribute('page-size')); return Number.isFinite(n) && n > 0 ? n : 20; }
  get startParam(){ return (this.getAttribute('start-param') || 'start').trim(); }

  #rewire(){
    this.#unsubAll();
    const r = this.resource;
    this._offs.push(this.pc.subscribe(`${r}.list.get`, (m)=> this.#onListGet(m)));
    this._offs.push(this.pc.subscribe(`${r}.list.more`, (m)=> this.#onListMore(m)));
    this._offs.push(this.pc.subscribe(`${r}.list.reset`, ()=> this.#resetAndFetch()));
  }

  #unsubAll(){ try { this._offs.forEach(f=>f&&f()); } catch {} this._offs = []; }

  async #onListGet(m){
    // New request; if no explicit start passed, reset before fetching
    const data = (m && m.data) || {};
    const hasStart = Object.prototype.hasOwnProperty.call(data, this.startParam);
    if (!hasStart || (Number(data[this.startParam])||0) === 0 || data.reset) this.#reset();
    await this.#fetchPage(data);
    if (m && m.replyTo) this.pc.publish({ topic: m.replyTo, correlationId: m.correlationId, data: { ok: true, items: this.items, meta: this.meta } });
  }

  async #onListMore(m){
    const data = (m && m.data) || {};
    data[this.startParam] = this.meta.start || 0; // continue from current start
    await this.#fetchPage(data);
    if (m && m.replyTo) this.pc.publish({ topic: m.replyTo, correlationId: m.correlationId, data: { ok: true, items: this.items, meta: this.meta } });
  }

  #reset(){ this.items = []; this.meta = { total: null, start: 0, count: 0, page: null }; this.#publishState(); }
  async #resetAndFetch(){ this.#reset(); await this.#fetchPage({}); }

  #publishState(){
    // Aggregated list snapshot
    this.pc.publish({ topic: `${this.resource}.list.state`, data: { items: this.items.slice() }, retain: true });
    // Latest meta info
    this.pc.publish({ topic: `${this.resource}.list.meta`, data: Object.assign({}, this.meta) });
  }

  #buildUrl(params){
    const qp = new URLSearchParams();
    qp.set('x', 'get');
    qp.set('rsc', this.resource);
    // page size is capped by the PHP
    qp.set('page_size', String(this.pageSize));
    const fields = (params && params.fields) ? String(params.fields).trim() : this.fields;
    if (fields) qp.set('fields', fields);
    // paging
    const startVal = Number(params && Object.prototype.hasOwnProperty.call(params, this.startParam) ? params[this.startParam] : this.meta.start || 0) || 0;
    qp.set(this.startParam, String(startVal));
    // filters: accept array or JSON string
    if (params && params.filters != null) {
      try {
        const f = Array.isArray(params.filters) ? params.filters : JSON.parse(String(params.filters));
        qp.set('filters', JSON.stringify(f));
      } catch { qp.set('filters', String(params.filters)); }
    }
    // optional id fetch
    if (params && params.id != null) qp.set('id', String(params.id));
    return `${this.apiUrl}?${qp.toString()}`;
  }

  async #fetchPage(params){
    if (this._busy) return; this._busy = true;
    try {
      const url = this.#buildUrl(params || {});
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      let rows = [];
      if (Array.isArray(body)) rows = body;
      else if (body && Array.isArray(body.results)) rows = body.results;
      // Append and advance
      const before = this.items.length;
      if (rows && rows.length) {
        this.items.push(...rows);
        this.meta.start = (this.meta.start || 0) + rows.length;
        this.meta.count = rows.length;
      } else {
        this.meta.count = 0;
      }
      // Total / page when provided
      if (body && typeof body.total !== 'undefined') {
        const total = (typeof body.total === 'number') ? body.total : Number(body.total);
        if (Number.isFinite(total)) this.meta.total = total;
      }
      if (body && typeof body.page !== 'undefined') {
        const page = (typeof body.page === 'number') ? body.page : Number(body.page);
        if (Number.isFinite(page)) this.meta.page = page;
      }
      // Publish state if anything changed
      if (this.items.length !== before || this.meta.count === 0) this.#publishState();
    } catch (e) {
      // On error, still publish current state and meta with error info
      this.pc.publish({ topic: `${this.resource}.list.meta`, data: Object.assign({}, this.meta, { error: String(e && e.message || e) }) });
    } finally { this._busy = false; }
  }
}

customElements.define('pan-php-connector', PanPhpConnector);
export default PanPhpConnector;

