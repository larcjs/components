// <pan-data-provider> — Mock data provider for PAN CRUD demos
// Handles generic topics for a named resource: `${resource}.list.get`, `${resource}.item.get`,
// `${resource}.item.save`, `${resource}.item.delete`. Maintains `${resource}.list.state` (retain).

import { PanClient } from '../../../core/src/components/pan-client.mjs';

const uuid = () => (globalThis.crypto && typeof crypto.randomUUID === 'function')
  ? crypto.randomUUID()
  : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export class PanDataProvider extends HTMLElement {
  constructor(){
    super();
    this.pc = new PanClient(this);
    this.items = [];
  }

  connectedCallback(){
    this.resource = (this.getAttribute('resource') || 'items').trim();
    this.key = (this.getAttribute('key') || 'id').trim();
    this.persist = (this.getAttribute('persist') || '').toLowerCase() === 'localstorage';
    this.storageKey = `pan:mock:${this.resource}`;
    this.#load();
    const listGet = `${this.resource}.list.get`;
    const itemGet = `${this.resource}.item.get`;
    const itemSave = `${this.resource}.item.save`;
    const itemDelete = `${this.resource}.item.delete`;
    this.off = [
      this.pc.subscribe(listGet, (m)=> this.#onListGet(m)),
      this.pc.subscribe(itemGet, (m)=> this.#onItemGet(m)),
      this.pc.subscribe(itemSave, (m)=> this.#onItemSave(m)),
      this.pc.subscribe(itemDelete, (m)=> this.#onItemDelete(m)),
    ];
    // Publish initial state
    this.#publishListState();
  }

  disconnectedCallback(){ this.off?.forEach(f=>f&&f()); }

  #load(){
    // Seed from <script type="application/json"> if present; else from localStorage; else []
    const script = this.querySelector('script[type="application/json"]');
    if (script && script.textContent?.trim()) {
      try { this.items = JSON.parse(script.textContent.trim()); this.#savePersist(); return; } catch {}
    }
    if (this.persist) {
      try {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) { this.items = JSON.parse(raw); return; }
      } catch {}
    }
    this.items = [];
  }

  #savePersist(){
    if (!this.persist) return;
    try { localStorage.setItem(this.storageKey, JSON.stringify(this.items)); } catch {}
  }

  #publishListState(){
    this.pc.publish({ topic: `${this.resource}.list.state`, data: { items: this.items }, retain: true });
  }

  #publishItemState(item, opts={}){
    try {
      const id = (item && typeof item==='object') ? (item[this.key] ?? item.id) : item;
      if (id==null) return;
      if (opts && opts.deleted) {
        this.pc.publish({ topic: `${this.resource}.item.state.${id}`, data: { id, deleted: true } });
      } else {
        this.pc.publish({ topic: `${this.resource}.item.state.${id}`, data: { item }, retain: true });
      }
    } catch {}
  }

  #onListGet(m){
    const { replyTo } = m;
    if (replyTo) this.pc.publish({ topic: replyTo, correlationId: m.correlationId, data: { items: this.items } });
    this.#publishListState();
  }

  #onItemGet(m){
    const id = m?.data?.[this.key] ?? m?.data?.id ?? m?.data;
    const item = this.items.find(x => String(x[this.key]) === String(id));
    const res = item ? { ok: true, item } : { ok: false, error: 'NOT_FOUND', id };
    if (item) this.#publishItemState(item);
    if (m.replyTo) this.pc.publish({ topic: m.replyTo, correlationId: m.correlationId, data: res });
  }

  #onItemSave(m){
    let item = m?.data?.item ?? m?.data;
    if (!item || typeof item !== 'object') { item = {}; }
    if (!item[this.key]) item[this.key] = uuid();
    const id = item[this.key];
    const idx = this.items.findIndex(x => String(x[this.key]) === String(id));
    if (idx >= 0) this.items[idx] = Object.assign({}, this.items[idx], item);
    else this.items.push(item);
    this.#savePersist();
    this.#publishListState();
    this.#publishItemState(item);
    if (m.replyTo) this.pc.publish({ topic: m.replyTo, correlationId: m.correlationId, data: { ok: true, item } });
  }

  #onItemDelete(m){
    const id = m?.data?.[this.key] ?? m?.data?.id ?? m?.data;
    const before = this.items.length;
    this.items = this.items.filter(x => String(x[this.key]) !== String(id));
    const ok = this.items.length !== before;
    this.#savePersist();
    this.#publishListState();
    this.#publishItemState(id, { deleted:true });
    if (m.replyTo) this.pc.publish({ topic: m.replyTo, correlationId: m.correlationId, data: { ok, id } });
  }
}

customElements.define('pan-data-provider', PanDataProvider);
export default PanDataProvider;
