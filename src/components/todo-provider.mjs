// Todo provider component - manages todo state and broadcasts changes
import { PanClient } from '../../../core/src/components/pan-client.mjs';

class TodoProvider extends HTMLElement {
  pc = new PanClient(this);
  items = [];

  connectedCallback() {
    const boot = () => {
      this.pc.subscribe('todos.change', (m) => {
        this.items.push(m.data.item);
        this.#broadcast();
      });

      this.pc.subscribe('todos.remove', (m) => {
        this.items = this.items.filter((t) => t.id !== m.data.id);
        this.#broadcast();
      });

      this.pc.subscribe('todos.toggle', (m) => {
        const t = this.items.find((x) => x.id === m.data.id);
        if (t) t.done = !!m.data.done;
        this.#broadcast();
      });

      this.#broadcast();
    };

    if (window.__panReady) {
      boot();
    } else {
      document.addEventListener('pan:sys.ready', boot, { once: true });
    }
  }

  #broadcast() {
    this.pc.publish({
      topic: 'todos.state',
      data: { items: this.items },
      retain: true
    });
  }
}

customElements.define('todo-provider', TodoProvider);
export default TodoProvider;
