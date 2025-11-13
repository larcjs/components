// <pan-graphql-connector> — GraphQL bridge for PAN CRUD topics
//
// Attributes:
// - endpoint: GraphQL HTTP endpoint URL (required)
// - resource: logical resource name (e.g., "users")
// - key: identifier field (default: "id")
//
// Child scripts:
// - <script type="application/graphql" data-op="list">…</script>
// - <script type="application/graphql" data-op="item">…</script>
// - <script type="application/graphql" data-op="save">…</script>
// - <script type="application/graphql" data-op="delete">…</script>
// - <script type="application/json" data-paths>{"list":"data.users","item":"data.user","save":"data.saveUser","delete":"data.deleteUser"}</script>
//
// Topics:
// - `${resource}.list.get`   -> executes list query with `variables = m.data`
// - `${resource}.item.get`   -> executes item query with `{ id }`
// - `${resource}.item.save`  -> executes save mutation with `{ item }`
// - `${resource}.item.delete`-> executes delete mutation with `{ id }`
//
// Publishes retained `${resource}.list.state` and per-item `${resource}.item.state.<id>` on successful operations.

import { PanClient } from '../../../core/src/components/pan-client.mjs';

export class PanGraphQLConnector extends HTMLElement {
  constructor(){
    super();
    this.pc = new PanClient(this);
    this._offs=[];
    this.paths={};
    this.ops={};
    this.authState = null; // Will hold auth token for auto-injection
  }
  static get observedAttributes(){ return ['resource','endpoint','key']; }
  connectedCallback(){ this.#init(); }
  disconnectedCallback(){
    this._offs.forEach(f=>f&&f());
    this._offs=[];
    this._authOff?.();
  }
  attributeChangedCallback(){ this.#init(); }

  get resource(){ return (this.getAttribute('resource')||'items').trim(); }
  get endpoint(){ return (this.getAttribute('endpoint')||'').trim(); }
  get key(){ return (this.getAttribute('key')||'id').trim(); }

  #init(){
    this._offs.forEach(f=>f&&f()); this._offs=[]; this.#loadScripts();

    // Subscribe to auth state for auto-header injection
    this._authOff = this.pc.subscribe('auth.internal.state', (m) => {
      this.authState = m.data;
    }, { retained: true });

    const r = this.resource;
    this._offs.push(this.pc.subscribe(`${r}.list.get`, (m)=> this.#onListGet(m)));
    this._offs.push(this.pc.subscribe(`${r}.item.get`, (m)=> this.#onItemGet(m)));
    this._offs.push(this.pc.subscribe(`${r}.item.save`, (m)=> this.#onItemSave(m)));
    this._offs.push(this.pc.subscribe(`${r}.item.delete`, (m)=> this.#onItemDelete(m)));
  }

  #loadScripts(){
    this.ops = {};
    this.paths = {};
    this.querySelectorAll('script[type="application/graphql"]').forEach(s=>{
      const op = (s.getAttribute('data-op')||'').trim(); if (!op) return;
      this.ops[op] = s.textContent || '';
    });
    const pathsNode = this.querySelector('script[type="application/json"][data-paths]');
    if (pathsNode && pathsNode.textContent?.trim()) { try { this.paths = JSON.parse(pathsNode.textContent.trim()); } catch {} }
  }

  async #fetchGQL(query, variables){
    if (!this.endpoint) throw new Error('Missing endpoint');
    const headers = { 'Content-Type':'application/json' };

    // Auto-inject Authorization header if auth token is available
    if (this.authState?.authenticated && this.authState?.token) {
      headers['Authorization'] = `Bearer ${this.authState.token}`;
    }

    const res = await fetch(this.endpoint, { method:'POST', headers, body: JSON.stringify({ query, variables }) });
    const json = await res.json();
    if (json.errors && json.errors.length) throw new Error(json.errors.map(e=>e.message).join('; '));
    return json;
  }

  #path(obj, path){ if (!path) return obj; const parts = String(path).split('.'); let cur = obj; for (const p of parts){ if (cur==null) return undefined; cur = cur[p]; } return cur; }

  #pubList(items){ this.pc.publish({ topic: `${this.resource}.list.state`, data: { items: Array.isArray(items)? items: [] }, retain: true }); }
  #pubItem(item, opts={}){
    try{
      const id = (item && typeof item==='object') ? (item[this.key] ?? item.id) : item;
      if (id==null) return;
      if (opts.deleted) this.pc.publish({ topic: `${this.resource}.item.state.${id}`, data:{ id, deleted:true } });
      else this.pc.publish({ topic: `${this.resource}.item.state.${id}`, data:{ item }, retain:true });
    } catch{}
  }

  async #onListGet(m){
    try{
      const q = this.ops.list; if (!q) throw new Error('Missing list GraphQL');
      const json = await this.#fetchGQL(q, m?.data||{});
      const items = this.#path(json, this.paths.list) || [];
      this.#pubList(items);
      if (m?.replyTo) this.pc.publish({ topic: m.replyTo, correlationId: m.correlationId, data: { ok:true, items } });
    } catch (err){
      if (m?.replyTo) this.pc.publish({ topic: m.replyTo, correlationId: m.correlationId, data: { ok:false, error:String(err&&err.message||err) } });
      this.#pubList([]);
    }
  }

  async #onItemGet(m){
    try{
      const q = this.ops.item; if (!q) throw new Error('Missing item GraphQL');
      const vars = { id: m?.data?.[this.key] ?? m?.data?.id ?? m?.data };
      const json = await this.#fetchGQL(q, vars);
      const item = this.#path(json, this.paths.item) || null;
      if (item) this.#pubItem(item);
      if (m?.replyTo) this.pc.publish({ topic: m.replyTo, correlationId: m.correlationId, data: { ok: !!item, item } });
    } catch (err){ if (m?.replyTo) this.pc.publish({ topic: m.replyTo, correlationId: m.correlationId, data: { ok:false, error:String(err&&err.message||err) } }); }
  }

  async #onItemSave(m){
    try{
      const q = this.ops.save; if (!q) throw new Error('Missing save GraphQL');
      const item = m?.data?.item ?? m?.data ?? {};
      const id = item?.[this.key] ?? item?.id;
      const vars = Object.assign({ item }, (id!=null ? { id } : {}));
      const json = await this.#fetchGQL(q, vars);
      const saved = this.#path(json, this.paths.save) || item;
      this.#pubItem(saved);
      if (m?.replyTo) this.pc.publish({ topic: m.replyTo, correlationId: m.correlationId, data: { ok:true, item: saved } });
      // refresh list
      this.pc.publish({ topic: `${this.resource}.list.get`, data: {} });
    } catch (err){ if (m?.replyTo) this.pc.publish({ topic: m.replyTo, correlationId: m.correlationId, data: { ok:false, error:String(err&&err.message||err) } }); }
  }

  async #onItemDelete(m){
    try{
      const q = this.ops.delete; if (!q) throw new Error('Missing delete GraphQL');
      const id = m?.data?.[this.key] ?? m?.data?.id ?? m?.data;
      const json = await this.#fetchGQL(q, { id });
      const ok = !!this.#path(json, this.paths.delete);
      if (ok) this.#pubItem(id, { deleted:true });
      if (m?.replyTo) this.pc.publish({ topic: m.replyTo, correlationId: m.correlationId, data: { ok, id } });
      this.pc.publish({ topic: `${this.resource}.list.get`, data: {} });
    } catch (err){ if (m?.replyTo) this.pc.publish({ topic: m.replyTo, correlationId: m.correlationId, data: { ok:false, error:String(err&&err.message||err) } }); }
  }
}

customElements.define('pan-graphql-connector', PanGraphQLConnector);
export default PanGraphQLConnector;
