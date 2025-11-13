// Simple counter component demonstrating PAN pub/sub pattern
import { PanClient } from '../../../core/src/components/pan-client.mjs';

class XCounter extends HTMLElement {
  pc = new PanClient(this);
  n = 0;

  connectedCallback() {
    this.innerHTML = `<button class="button-link" style="font-size:1.1rem;padding:0.75rem 1.2rem;">Clicked 0</button>`;

    this.querySelector('button')?.addEventListener('click', () => {
      this.pc.publish({
        topic: 'demo:click',
        data: { n: ++this.n },
        retain: true
      });
    });

    this.pc.subscribe('demo:click', (m) => {
      const btn = this.querySelector('button');
      if (btn) btn.textContent = `Clicked ${m.data.n}`;
    }, { retained: true });
  }
}

customElements.define('x-counter', XCounter);
export default XCounter;
