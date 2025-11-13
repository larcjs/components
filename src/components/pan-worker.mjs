// <pan-worker> — Bridge PAN topics to a Web Worker for offloading compute/fetch.
// For each topic pattern in `topics`, forwards PAN deliveries to the worker via postMessage.
// The worker posts back PanMessage-like objects `{ topic, data, retain?, replyTo?, correlationId?, headers? }`,
// which are re-published on the bus via PanClient.
//
// Usage:
// <pan-worker topics="users.query.set users.list.get">
//   <script type="application/worker">
//     // Worker code (runs in worker context)
//     let items = [];
//     function synth(count=10000){
//       const out = new Array(count);
//       for (let i=0;i<count;i++){
//         const id = `u${i+1}`; const name = `User ${String(i+1).padStart(5,'0')}`;
//         out[i] = { id, name, email: `${name.toLowerCase().replace(/\s+/g,'')}@example.com` };
//       }
//       return out;
//     }
//     items = synth(10000);
//     let q = { q:'', sort:'name:asc' };
//     function publish(){
//       const { q:qq, sort } = q; const [key,dir] = (sort||'name:asc').split(':');
//       let view = items;
//       if (qq) { const s=qq.toLowerCase(); view = view.filter(it=> String(it.name).toLowerCase().includes(s) || String(it.email).toLowerCase().includes(s)); }
//       view = view.slice().sort((a,b)=>{ const av=a[key], bv=b[key]; return (av>bv?1:av<bv?-1:0) * (dir==='desc'?-1:1); });
//       postMessage({ topic:'users.list.state', data:{ items:view }, retain:true });
//     }
//     onmessage = (ev)=>{
//       const m = ev.data || {};
//       if (m.topic === 'users.query.set') { q = Object.assign({}, q, m.data||{}); publish(); }
//       if (m.topic === 'users.list.get') { publish(); }
//     };
//   </script>
// </pan-worker>

import { PanClient } from '../../../core/src/components/pan-client.mjs';

export class PanWorker extends HTMLElement {
  static get observedAttributes(){ return ['topics','src','worker-type']; }
  constructor(){ super(); this.pc = new PanClient(this); this._offs = []; this._url = null; }

  connectedCallback(){ this.#start(); }
  disconnectedCallback(){ this.#stop(); }
  attributeChangedCallback(){ this.#restart(); }

  get topics(){ const t=(this.getAttribute('topics')||'').trim(); return t? t.split(/\s+/): []; }
  get workerType(){ return (this.getAttribute('worker-type')||'classic').toLowerCase() === 'module' ? 'module' : 'classic'; }

  async #start(){
    try {
      if (!this.worker) await this.#initWorker();
      this.#subscribe();
    } catch (err) {
      // Surface a bus error for observability
      this.pc.publish({ topic:'pan:sys.error', data:{ code:'PAN_WORKER_INIT', message:String(err&&err.message||err) } });
    }
  }

  #stop(){
    this._offs.forEach(f=>f&&f()); this._offs=[];
    if (this.worker) { this.worker.terminate(); this.worker = null; }
    if (this._url) { try { URL.revokeObjectURL(this._url); } catch {} this._url = null; }
  }

  #restart(){ this.#stop(); this.#start(); }

  async #initWorker(){
    const src = (this.getAttribute('src')||'').trim();
    if (src) {
      this.worker = new Worker(src, { type: this.workerType });
    } else {
      const script = this.querySelector('script[type="application/worker"],script[type="text/worker"],script[type="text/plain"]');
      const code = script?.textContent || '';
      const blob = new Blob([code], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob); this._url = url;
      this.worker = new Worker(url, { type: this.workerType });
    }
    // Messages from worker → publish on PAN
    this.worker.onmessage = (ev)=>{
      const msg = ev.data;
      if (!msg) return;
      // Support either raw PanMessage or { kind:'publish', msg }
      const out = (msg.topic ? msg : msg.msg);
      if (out && out.topic) this.pc.publish(out);
    };
  }

  #subscribe(){
    this._offs.forEach(f=>f&&f()); this._offs=[];
    if (!this.worker) return;
    const forward = (m)=>{ try { this.worker.postMessage({ topic:m.topic, data:m.data, replyTo:m.replyTo, correlationId:m.correlationId, headers:m.headers }); } catch {} };
    for (const pattern of this.topics){ this._offs.push(this.pc.subscribe(pattern, forward, { retained:true })); }
  }
}

customElements.define('pan-worker', PanWorker);
export default PanWorker;

