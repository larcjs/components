// <pan-data-table> — Simple table that subscribes to `${resource}.list.state`
// and publishes row selection via `${resource}.item.select`.

import { PanClient } from '../../../core/src/components/pan-client.mjs';

export class PanDataTable extends HTMLElement {
  static get observedAttributes(){ return ['resource','columns','key','live']; }
  constructor(){ super(); this.attachShadow({mode:'open'}); this.pc = new PanClient(this); this.items = []; this._offs=[]; }
  connectedCallback(){ this.render(); this.#subscribe(); this.#requestList(); }
  disconnectedCallback(){ this._unsubscribeAll(); }
  attributeChangedCallback(){ this.render(); this.#subscribe(); this.#requestList(); }

  get resource(){ return (this.getAttribute('resource')||'items').trim(); }
  get columns(){ const c=(this.getAttribute('columns')||'').trim(); return c? c.split(/\s*,\s*/): null; }
  get key(){ return (this.getAttribute('key')||'id').trim(); }
  get live(){ const v=(this.getAttribute('live')||'true').toLowerCase(); return v!== 'false' && v!== '0'; }

  #subscribe(){
    this._unsubscribeAll();
    // Primary: listen to list state (retained) for bulk updates
    this._offs.push(this.pc.subscribe(`${this.resource}.list.state`, (m)=>{ this.items = m?.data?.items || []; this.renderBody(); }, { retained:true }));
    // Optional: granular live updates for individual items
    if (this.live) {
      this._offs.push(this.pc.subscribe(`${this.resource}.item.state.*`, (m)=> this.#onItemState(m), { retained:false }));
    }
  }

  #requestList(){ this.pc.publish({ topic:`${this.resource}.list.get`, data:{} }); }

  _unsubscribeAll(){ try { this._offs.forEach(f=>f&&f()); } catch {} this._offs=[]; }

  #onItemState(m){
    const d = m?.data || {}; const items = Array.isArray(this.items) ? this.items.slice() : []; const k = this.key;
    // Derive id from payload or topic suffix
    let id = d?.id ?? d?.item?.[k] ?? d?.item?.id;
    if (id==null && m?.topic) { const parts = String(m.topic).split('.'); id = parts[parts.length-1]; }
    if (id==null) return;
    const idx = items.findIndex(x => String(x?.[k] ?? x?.id) === String(id));
    if (d.deleted) {
      if (idx >= 0) { items.splice(idx, 1); this.items = items; this.renderBody(); }
      return;
    }
    if (d.item && typeof d.item === 'object') {
      if (idx >= 0) items[idx] = d.item; else items.push(d.item);
      this.items = items; this.renderBody(); return;
    }
    if (d.patch && typeof d.patch === 'object') {
      const base = idx >= 0 ? items[idx] : {}; const next = Object.assign({}, base, d.patch);
      if (idx >= 0) items[idx] = next; else items.push(next);
      this.items = items; this.renderBody(); return;
    }
    // Fallback: treat d as patch
    if (d && typeof d === 'object') {
      const base = idx >= 0 ? items[idx] : {}; const next = Object.assign({}, base, d);
      if (idx >= 0) items[idx] = next; else items.push(next);
      this.items = items; this.renderBody();
    }
  }

  render(){
    const h = String.raw; const cols = this.columns || (this.items[0] ? Object.keys(this.items[0]) : []);
    this.shadowRoot.innerHTML = h`
      <style>
        :host{display:block; border:1px solid #ddd; border-radius:8px; overflow:hidden; font:13px/1.4 system-ui, sans-serif}
        table{width:100%; border-collapse:collapse}
        th,td{padding:8px 10px; border-bottom:1px solid #eee; text-align:left}
        tr:hover{ background:#fafafa; cursor:pointer }
        thead th{ background:#f6f6f6; font-weight:600 }
        .empty{ padding:10px; color:#888 }
      </style>
      <table>
        <thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead>
        <tbody></tbody>
      </table>
      <div class="empty" id="empty" hidden>No records.</div>
    `;
    this.renderBody();
  }

  renderBody(){
    const tbody = this.shadowRoot.querySelector('tbody'); if (!tbody) return;
    const cols = this.columns || (this.items[0] ? Object.keys(this.items[0]) : []);
    tbody.innerHTML = this.items.map(it=>`<tr data-id="${it.id ?? it[this.getAttribute('key')||'id']}">`+
      cols.map(c=>`<td>${this.#escape(it[c])}</td>`).join('')+`</tr>`).join('');
    const empty = this.shadowRoot.getElementById('empty');
    if (empty) empty.hidden = this.items.length > 0;
    tbody.querySelectorAll('tr').forEach(tr=>{
      tr.addEventListener('click', ()=>{
        const id = tr.getAttribute('data-id');
        this.pc.publish({ topic:`${this.resource}.item.select`, data:{ id } });
      });
    });
  }

  #escape(v){ if (v==null) return ''; return String(v).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }
}

customElements.define('pan-data-table', PanDataTable);
export default PanDataTable;
