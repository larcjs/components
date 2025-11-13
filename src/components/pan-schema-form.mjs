// <pan-schema-form> — JSON Schema–driven form for PAN resources
//
// Listens:
// - `${resource}.schema.state` (retained): to render fields
// - `${resource}.item.select`: to load the selected item
// - `${resource}.item.state.*`: live updates for currently loaded item (optional)
//
// Performs request/reply via PanClient:
// - `${resource}.item.get` with `{ id }`
// - `${resource}.item.save` with `{ item }`
// - `${resource}.item.delete` with `{ id }`

import { PanClient } from '../../../core/src/components/pan-client.mjs';

export class PanSchemaForm extends HTMLElement {
  static get observedAttributes(){ return ['resource','key','live']; }
  constructor(){ super(); this.attachShadow({mode:'open'}); this.pc = new PanClient(this); this.schema=null; this.value={}; this._offs=[]; this._offLive=null; this._selectedId=null; }
  connectedCallback(){ this.render(); this.#wire(); }
  disconnectedCallback(){ this.#unsubAll(); }
  attributeChangedCallback(){ this.render(); this.#wire(); }

  get resource(){ return (this.getAttribute('resource')||'items').trim(); }
  get key(){ return (this.getAttribute('key')||'id').trim(); }
  get live(){ const v=(this.getAttribute('live')||'true').toLowerCase(); return v!=='false' && v!=='0'; }

  #wire(){
    this.#unsubAll();
    // Schema retained state
    this._offs.push(this.pc.subscribe(`${this.resource}.schema.state`, (m)=>{ this.schema = m?.data?.schema || null; this.render(); }, { retained:true }));
    // Selection
    this._offs.push(this.pc.subscribe(`${this.resource}.item.select`, async (m)=>{
      const id = m?.data?.id; if (!id) return;
      this._selectedId = id; this.#subscribeLive();
      try { const { data } = await this.pc.request(`${this.resource}.item.get`, { id }); this.#setValue(data?.item || {}); } catch {}
    }));
    // Form actions
    const form = this.shadowRoot.getElementById('f'); if (form) form.onsubmit = (e)=>{ e.preventDefault(); this.#save(); };
    const del = this.shadowRoot.getElementById('del'); if (del) del.onclick = (e)=>{ e.preventDefault(); this.#delete(); };
  }

  #unsubAll(){ try { this._offs.forEach(f=>f&&f()); } catch {} this._offs=[]; try { this._offLive && this._offLive(); } catch {} this._offLive=null; }

  #subscribeLive(){
    try { this._offLive && this._offLive(); } catch {} this._offLive = null; if (!this.live) return;
    const id = this._selectedId || this.value?.[this.key] || this.value?.id; if (!id) return;
    const topic = `${this.resource}.item.state.${id}`;
    this._offLive = this.pc.subscribe(topic, (m)=>{
      const d = m?.data || {};
      if (d.deleted) { const cur = this.value?.[this.key] || this.value?.id; if (String(cur)===String(id)) this.#setValue({}); return; }
      if (d.item && typeof d.item==='object') { this.#setValue(d.item); return; }
      if (d.patch && typeof d.patch==='object') { this.#setValue(Object.assign({}, this.value||{}, d.patch)); return; }
      if (d && typeof d==='object') { this.#setValue(Object.assign({}, this.value||{}, d)); }
    }, { retained:false });
  }

  async #save(){
    const item = this.#collect();
    const errors = this.#validate(item); this.#showErrors(errors);
    if (errors && errors.length) return;
    try { const { data } = await this.pc.request(`${this.resource}.item.save`, { item }); const saved = data?.item || item; this.#setValue(saved); this._selectedId = saved?.[this.key] || saved?.id || this._selectedId; this.#subscribeLive(); } catch {}
  }

  async #delete(){
    const id = this.value?.[this.key] || this.value?.id; if (!id) return;
    try { await this.pc.request(`${this.resource}.item.delete`, { id }); this.#setValue({}); } catch {}
  }

  #collect(){
    const v = Object.assign({}, this.value||{}); const props = this.schema?.properties || {}; const order = this.#fieldOrder();
    for (const name of order){ const input = this.shadowRoot.querySelector(`[name="${name}"]`); if (!input) continue; v[name] = this.#coerce(props[name], input); }
    return v;
  }

  #coerce(prop, input){
    const t = (prop && prop.type) || 'string';
    if (t === 'boolean') return !!input.checked;
    if (t === 'number' || t === 'integer') { const n = Number(input.value); return Number.isFinite(n) ? (t==='integer' ? Math.trunc(n) : n) : undefined; }
    return input.value;
  }

  #validate(v){
    const errors = [];
    const props = this.schema?.properties || {}; const required = Array.isArray(this.schema?.required) ? this.schema.required : [];
    for (const name of required){ const val = v[name]; if (val===undefined || val===null || val==='') errors.push({ name, message:'Required' }); }
    for (const [name, prop] of Object.entries(props)){
      const val = v[name]; if (val==null || val==='') continue;
      const t = prop.type || 'string';
      if (t==='number' || t==='integer') { if (typeof val !== 'number' || !Number.isFinite(val)) errors.push({ name, message:'Must be a number' }); }
      if (t==='boolean') { if (typeof val !== 'boolean') errors.push({ name, message:'Must be true/false' }); }
      if (prop.pattern && typeof val==='string') { try { const rx = new RegExp(prop.pattern); if (!rx.test(val)) errors.push({ name, message:'Invalid format' }); } catch {} }
      if (prop.minLength!=null && typeof val==='string' && val.length < prop.minLength) errors.push({ name, message:`Min length ${prop.minLength}` });
      if (prop.maxLength!=null && typeof val==='string' && val.length > prop.maxLength) errors.push({ name, message:`Max length ${prop.maxLength}` });
      if (prop.minimum!=null && typeof val==='number' && val < prop.minimum) errors.push({ name, message:`>= ${prop.minimum}` });
      if (prop.maximum!=null && typeof val==='number' && val > prop.maximum) errors.push({ name, message:`<= ${prop.maximum}` });
      if (Array.isArray(prop.enum) && !prop.enum.includes(val)) errors.push({ name, message:'Invalid value' });
      if (prop.format === 'email' && typeof val==='string') { const ok = /.+@.+\..+/.test(val); if (!ok) errors.push({ name, message: 'Invalid email' }); }
    }
    return errors;
  }

  #showErrors(errors){
    const map = new Map((errors||[]).map(e=>[e.name,e.message]));
    this.shadowRoot.querySelectorAll('.err').forEach(el=> el.textContent='');
    for (const [name,msg] of map){ const el = this.shadowRoot.querySelector(`.err[data-for="${name}"]`); if (el) el.textContent = msg; }
  }

  #setValue(v){ this.value = v || {}; this.render(); this.#wire(); }

  #fieldOrder(){
    const props = this.schema?.properties || {}; const names = Object.keys(props);
    const ui = this.schema && (this.schema['ui:order'] || this.schema.uiOrder || null);
    if (Array.isArray(ui)) return names.sort((a,b)=> (ui.indexOf(a)===-1?1:ui.indexOf(a)) - (ui.indexOf(b)===-1?1:ui.indexOf(b)));
    return names;
  }

  render(){
    const h = String.raw; const props = this.schema?.properties || {}; const order = this.#fieldOrder(); const v = this.value || {}; const key = this.key;
    const rows = order.map(name=>{
      const prop = props[name] || {}; const type = prop.type || 'string'; const title = prop.title || name;
      const hint = prop.description || '';
      const required = Array.isArray(this.schema?.required) && this.schema.required.includes(name);
      const val = v[name] ?? '';
      if (Array.isArray(prop.enum)) {
        return h`<label class="row"><span class="lab">${title}${required?' *':''}</span>
          <select name="${name}">${prop.enum.map(opt=>`<option value="${String(opt)}" ${String(opt)===String(val)?'selected':''}>${String(opt)}</option>`).join('')}</select>
          <small class="hint">${hint}</small><small class="err" data-for="${name}"></small></label>`;
      }
      if (type==='boolean') {
        return h`<label class="row chk"><input type="checkbox" name="${name}" ${val? 'checked':''}/><span>${title}</span><small class="hint">${hint}</small><small class="err" data-for="${name}"></small></label>`;
      }
      const inputType = type==='number'||type==='integer' ? 'number' : (prop.format==='email' ? 'email' : 'text');
      const isLong = (prop.maxLength && prop.maxLength>180) || (prop.format==='multiline');
      if (isLong) {
        return h`<label class="row"><span class="lab">${title}${required?' *':''}</span>
          <textarea name="${name}" rows="4">${this.#esc(val)}</textarea>
          <small class="hint">${hint}</small><small class="err" data-for="${name}"></small></label>`;
      }
      return h`<label class="row"><span class="lab">${title}${required?' *':''}</span>
        <input type="${inputType}" name="${name}" value="${this.#esc(val)}" />
        <small class="hint">${hint}</small><small class="err" data-for="${name}"></small></label>`;
    }).join('');

    this.shadowRoot.innerHTML = h`
      <style>
        :host{display:block; border:1px solid #ddd; border-radius:8px; padding:12px; font:13px/1.4 system-ui, sans-serif}
        form{ display:grid; gap:10px }
        .row{ display:grid; gap:6px }
        .row.chk{ grid-template-columns: auto 1fr; align-items:center }
        .lab{ font-weight:600 }
        input,select,textarea,button{ padding:8px 10px; font:inherit }
        input,select,textarea{ border:1px solid #e2e2e2; border-radius:8px }
        .actions{ display:flex; gap:8px; align-items:center }
        .hint{ color:#888 }
        .err{ color:#c33 }
      </style>
      <form id="f">
        ${rows}
        <div class="actions">
          <button id="save" type="submit">Save</button>
          <span style="flex:1"></span>
          <button id="del" type="button">Delete</button>
        </div>
      </form>
    `;
    this.#subscribeLive();
  }

  #esc(s){ return String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }
}

customElements.define('pan-schema-form', PanSchemaForm);
export default PanSchemaForm;

