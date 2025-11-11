// Minimal PAN Inspector. Displays recent messages and basic controls.

import { PanClient } from './pan-client.mjs';

class PanInspector extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.pc = new PanClient(this);
    this.events = []; // { ts, topic, msg, size }
    this.paused = false;
    this.filter = '';
  }

  connectedCallback() {
    this.render();
    this.off = this.pc.subscribe('*', (m) => {
      if (this.paused) return;
      const rec = { ts: Date.now(), topic: m.topic, msg: m, size: JSON.stringify(m).length };
      this.events.push(rec); if (this.events.length > 1000) this.events.shift();
      this.renderRows();
    });
    this.shadowRoot.addEventListener('input', (e) => {
      const t = e.target; if (t && t.id === 'filter') { this.filter = t.value; this.renderRows(); }
    });
    this.shadowRoot.addEventListener('click', (e) => {
      const el = e.target;
      if (el && el.id === 'pause') { this.paused = !this.paused; this.renderControls(); }
      if (el && el.id === 'clear') { this.events = []; this.renderRows(); }
      if (el && el.classList && el.classList.contains('replay')) {
        const i = Number(el.getAttribute('data-i')); const rec = this.events[i]; if (rec) this.pc.publish(rec.msg);
      }
    });
  }

  disconnectedCallback() { this.off && this.off(); }

  render() {
    const h = String.raw;
    this.shadowRoot.innerHTML = h`
      <style>
        :host{display:block; font:12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;}
        header{display:flex; gap:8px; align-items:center; margin-bottom:8px}
        input[type=text]{flex:1; padding:4px 6px;}
        button{padding:4px 8px;}
        table{width:100%; border-collapse: collapse;}
        th,td{ padding:4px 6px; border-bottom:1px solid #eee; text-align:left }
        th{ position:sticky; top:0; background:#f8f8f8; }
        .muted{ color:#888 }
      </style>
      <header>
        <input id="filter" type="text" placeholder="Filter by topic…" />
        <button id="pause">${this.paused ? 'Resume' : 'Pause'}</button>
        <button id="clear">Clear</button>
      </header>
      <table>
        <thead><tr><th>time</th><th>topic</th><th>size</th><th></th></tr></thead>
        <tbody id="rows"></tbody>
      </table>
    `;
    this.renderRows();
  }

  renderControls() {
    const btn = this.shadowRoot.getElementById('pause');
    if (btn) btn.textContent = this.paused ? 'Resume' : 'Pause';
  }

  renderRows() {
    const rows = this.shadowRoot.getElementById('rows'); if (!rows) return;
    const f = (this.filter || '').toLowerCase();
    const visible = this.events.filter((r) => !f || r.topic.toLowerCase().includes(f));
    rows.innerHTML = visible.slice(-500).map((r, i) => `
      <tr>
        <td>${new Date(r.ts).toLocaleTimeString()}</td>
        <td>${r.topic}</td>
        <td>${r.size}</td>
        <td><button class="replay" data-i="${i}">Replay</button></td>
      </tr>
    `).join('');
  }
}

customElements.define('pan-inspector', PanInspector);
export { PanInspector };
export default PanInspector;

