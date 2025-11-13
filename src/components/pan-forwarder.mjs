// <pan-forwarder> — Mirror PAN topics to an HTTP endpoint (e.g., SSE hub POST)
// Attributes:
//   - dest: URL to POST to (required)
//   - topics: space-separated patterns (default "*")
//   - headers: JSON encoded headers, or semicolon-separated "Key: Value; Key2: Value2"
//   - method: HTTP method (default POST)
//   - with-credentials: include credentials (default true)
//   - enabled: "true" to enable (default true)
// Notes:
//   - Body shape: { topic, data, retain?, id?, ts? }
//   - Beware of loops if you also bridge the same server with <pan-sse>; prefer forwarding write intents only

import { PanClient } from '../../../core/src/components/pan-client.mjs';

export class PanForwarder extends HTMLElement {
  static get observedAttributes(){ return ['dest','topics','headers','method','with-credentials','enabled']; }
  constructor(){ super(); this.pc = new PanClient(this); this._off=null; this._enabled=true; this._recent=new Set(); this._gcTimer=null; }
  connectedCallback(){ this.#start(); }
  disconnectedCallback(){ this.#stop(); }
  attributeChangedCallback(){ this.#restart(); }

  get dest(){ return (this.getAttribute('dest')||'').trim(); }
  get topics(){ const t=(this.getAttribute('topics')||'*').trim(); return t? t.split(/\s+/) : ['*']; }
  get method(){ return (this.getAttribute('method')||'POST').toUpperCase(); }
  get withCredentials(){ return (this.getAttribute('with-credentials')||'').toLowerCase() !== 'false'; }
  get enabled(){ const v=(this.getAttribute('enabled')||'true').toLowerCase(); return v!== 'false' && v!== '0'; }
  get headers(){
    const raw = this.getAttribute('headers')||''; if (!raw) return {};
    try { const j = JSON.parse(raw); if (j && typeof j==='object') return j; } catch {}
    const out={}; raw.split(';').forEach(kv=>{ const m=kv.split(':'); if(m.length>=2){ const k=m.shift().trim(); const v=m.join(':').trim(); if(k) out[k]=v; }});
    return out;
  }

  #restart(){ this.#stop(); this.#start(); }
  #stop(){ try{ this._off && this._off(); }catch{} this._off=null; if (this._gcTimer) { clearInterval(this._gcTimer); this._gcTimer=null; } }

  #start(){ if (!this.dest || !this.enabled) return; this._off = this.pc.subscribe(this.topics, (m)=> this.#send(m)); this._gcTimer=setInterval(()=>this.#gc(), 30000); }

  async #send(m){
    // Best-effort dedupe: skip if seen id recently
    if (m?.id && this._recent.has(m.id)) return;
    const body = { topic:m.topic, data:m.data, retain: !!m.retain, id:m.id, ts:m.ts };
    const headers = Object.assign({ 'Content-Type':'application/json' }, this.headers);
    try{
      const res = await fetch(this.dest, { method:this.method, credentials: this.withCredentials? 'include':'omit', headers, body: JSON.stringify(body) });
      if (!res.ok) { /* swallow */ }
      if (m?.id) this._recent.add(m.id);
    }catch{/* ignore network errors */}
  }

  #gc(){
    // Cheap set reset periodically to avoid growth; ids are per page session anyway
    this._recent = new Set();
  }
}

customElements.define('pan-forwarder', PanForwarder);
export default PanForwarder;

