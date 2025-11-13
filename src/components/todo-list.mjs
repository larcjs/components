// Todo list component - subscribes to todo state and publishes user actions
import { PanClient } from '../../../core/src/components/pan-client.mjs';

// Helper: UUID fallback
const uid = () => (globalThis.crypto && typeof crypto.randomUUID === 'function')
  ? crypto.randomUUID()
  : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

class TodoList extends HTMLElement {
  pc = new PanClient(this);
  items = [];

  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.#render();
    this.pc.subscribe('todos.state', (m) => {
      this.items = m.data.items;
      this.#render();
    }, { retained: true });
  }

  #render() {
    const h = String.raw;
    this.shadowRoot.innerHTML = h`
      <style>
        :host{display:block;font:15px/1.5 var(--font, "Lexend", sans-serif);}
        form{display:flex;gap:0.65rem;margin-bottom:0.9rem;}
        input{flex:1;padding:0.65rem 0.75rem;border-radius:0.8rem;border:1px solid rgba(15,23,42,0.12);}
        button{padding:0.65rem 1rem;border-radius:0.8rem;border:none;background:var(--color-accent,#2563eb);color:white;font-weight:600;cursor:pointer;}
        button:hover{background:#1d4ed8;}
        ul{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:0.4rem;}
        li{display:flex;align-items:center;gap:0.75rem;padding:0.55rem 0.75rem;border:1px solid rgba(15,23,42,0.1);border-radius:0.9rem;background:rgba(255,255,255,0.9);}
        li.done .t{text-decoration:line-through;color:var(--color-muted,#5f6b84);}
        .muted{color:var(--color-muted,#5f6b84);}
        .spacer{flex:1;}
        .del{border:none;background:transparent;color:#ef4444;font-size:1.1rem;cursor:pointer;}
      </style>
      <form id="f">
        <input id="title" placeholder="Add a task…" />
        <button type="submit">Add</button>
      </form>
      ${this.items.length ? '' : '<div class="muted">No tasks yet.</div>'}
      <ul>
        ${this.items.map((t) => `
          <li class="${t.done ? 'done' : ''}" data-id="${t.id}">
            <input type="checkbox" ${t.done ? 'checked' : ''} aria-label="toggle" />
            <span class="t">${this.#escape(t.title)}</span>
            <span class="spacer"></span>
            <button class="del" title="Remove">✕</button>
          </li>
        `).join('')}
      </ul>
    `;

    const form = this.shadowRoot.querySelector('#f');
    const title = this.shadowRoot.querySelector('#title');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = title.value.trim();
      if (!value) return;
      title.value = '';
      this.pc.publish({
        topic: 'todos.change',
        data: { item: { id: uid(), title: value, done: false } },
        retain: true
      });
    });

    this.shadowRoot.querySelectorAll('li input[type=checkbox]').forEach((cb) => {
      cb.addEventListener('change', (e) => {
        const li = e.target.closest('li');
        const id = li?.dataset.id;
        this.pc.publish({
          topic: 'todos.toggle',
          data: { id, done: e.target.checked },
          retain: true
        });
      });
    });

    this.shadowRoot.querySelectorAll('li .del').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        const id = li?.dataset.id;
        this.pc.publish({
          topic: 'todos.remove',
          data: { id },
          retain: true
        });
      });
    });
  }

  #escape(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  }
}

customElements.define('todo-list', TodoList);
export default TodoList;
