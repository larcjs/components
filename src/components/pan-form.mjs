// <pan-form> — Basic CRUD form for a named resource.
// Listens for `${resource}.item.select`, requests `${resource}.item.get`,
// and submits via `${resource}.item.save` / deletes via `${resource}.item.delete`.

import { PanClient } from '../../../core/src/components/pan-client.mjs';

export class PanForm extends HTMLElement {
  static get observedAttributes(){ return ['resource','fields','key','live']; }
  constructor(){ super(); this.attachShadow({mode:'open'}); this.pc = new PanClient(this); this.value = {}; this._offSel=null; this._offLive=null; this._selectedId=null; this._liveTopic=null; }
  connectedCallback(){ this.render(); this.#wire(); }
  disconnectedCallback(){ this._unsubAll(); }
  attributeChangedCallback(){ this.render(); this.#wire(); }

  get resource(){ return (this.getAttribute('resource')||'items').trim(); }
  get fields(){ const f=(this.getAttribute('fields')||'').trim(); return f? f.split(/\s*,\s*/): []; }
  get key(){ return (this.getAttribute('key')||'id').trim(); }
  get live(){ const v=(this.getAttribute('live')||'true').toLowerCase(); return v!== 'false' && v!== '0'; }

  #wire(){
    this._unsubAll();
    // Listen for selection events
    this._offSel = this.pc.subscribe(`${this.resource}.item.select`, async (m)=>{
      const id = m?.data?.id; if (!id) return;
      this._selectedId = id;
      this.#subscribeLive();
      try { const { data } = await this.pc.request(`${this.resource}.item.get`, { id }); this.#setValue(data?.item || {}); }
      catch { /* ignore */ }
    });
    this.#attachHandlers();
  }

  #attachHandlers(){
    const form = this.shadowRoot.getElementById('f');
    if (form) form.onsubmit = (e)=>{ e.preventDefault(); this.#save(); };
    const del = this.shadowRoot.getElementById('del');
    if (del) del.onclick = (e)=>{ e.preventDefault(); this.#delete(); };
  }

  _unsubAll(){ try { this._offSel && this._offSel(); } catch {} this._offSel=null; try { this._offLive && this._offLive(); } catch {} this._offLive=null; this._liveTopic=null; }

  #subscribeLive(){
    if (!this.live) return;
    const id = this._selectedId || this.value?.[this.key] || this.value?.id; if (!id) return;
    const topic = `${this.resource}.item.state.${id}`;
    if (this._liveTopic === topic && this._offLive) return; // already subscribed for this id
    try { this._offLive && this._offLive(); } catch {} this._offLive = null; this._liveTopic = topic;
    this._offLive = this.pc.subscribe(topic, (m)=>{
      const d = m?.data || {};
      if (d.deleted) {
        // If this item was deleted elsewhere, clear the form
        const cur = this.value?.[this.key] || this.value?.id; if (String(cur) === String(id)) this.#setValue({});
        return;
      }
      if (d.item && typeof d.item === 'object') { this.#setValue(d.item); return; }
      if (d.patch && typeof d.patch === 'object') { this.#setValue(Object.assign({}, this.value||{}, d.patch)); return; }
      // Fallback: accept top-level fields as patch
      if (d && typeof d === 'object') { this.#setValue(Object.assign({}, this.value||{}, d)); }
    }, { retained:true });
  }

  async #save(){
    const item = this.#collect();
    try {
      const { data } = await this.pc.request(`${this.resource}.item.save`, { item });
      const saved = data?.item || item; this.#setValue(saved);
      this._selectedId = saved?.[this.key] || saved?.id || this._selectedId; this.#subscribeLive();
    } catch {}
  }

  async #delete(){
    const id = this.value?.id || this.value?.[this.key];
    if (!id) return;
    try {
      await this.pc.request(`${this.resource}.item.delete`, { id });
      this.#setValue({});
    } catch {}
  }

  #collect(){
    const out = Object.assign({}, this.value);
    for (const name of this.fields){
      const input = this.shadowRoot.querySelector(`[name="${name}"]`);
      if (!input) continue;
      const v = input.value;
      out[name] = v;
    }
    return out;
  }

  #setValue(v){ this.value = v || {}; this.render(); this.#attachHandlers(); }

  render(){
    const h = String.raw; const v = this.value || {};
    this.shadowRoot.innerHTML = h`
      <style>
        :host{display:block; border:1px solid #ddd; border-radius:8px; padding:12px; font:13px/1.4 system-ui, sans-serif}
        form{ display:grid; gap:8px }
        label{ display:grid; gap:4px }
        input,button{ padding:8px 10px }
        .row{ display:flex; gap:8px; align-items:center }
        .spacer{ flex:1 }
      </style>
      <form id="f">
        ${this.fields.map(name=>`
          <label>
            <span>${name}</span>
            <input name="${name}" value="${this.#escape(v[name] ?? '')}" />
          </label>`).join('')}
        <div class="row">
          <button id="save" type="submit">Save</button>
          <span class="spacer"></span>
          <button id="del" type="button">Delete</button>
        </div>
      </form>
    `;
  }

  #escape(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }
}

customElements.define('pan-form', PanForm);
export default PanForm;
