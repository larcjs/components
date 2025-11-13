// <editable-cell> — In-place editable cell with PAN integration
// Attributes:
//   - value: Current cell value
//   - type: text, number, email, url, tel, date (default: text)
//   - placeholder: Placeholder text
//   - topic: Topic prefix for events
//   - cell-id: Identifier for this cell
//   - editable: Enable editing (default: true)
//   - multiline: Use textarea for editing
//
// Topics:
//   - Publishes: {topic}.change { cellId, value, oldValue }
//   - Publishes: {topic}.focus { cellId }
//   - Publishes: {topic}.blur { cellId }
//   - Subscribes: {topic}.setValue { cellId, value }

import { PanClient } from '../../../core/src/components/pan-client.mjs';

export class EditableCell extends HTMLElement {
  static get observedAttributes() {
    return ['value', 'type', 'placeholder', 'topic', 'cell-id', 'editable', 'multiline'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.pc = new PanClient(this);
    this.isEditing = false;
    this.oldValue = '';
  }

  connectedCallback() {
    this.render();
    this.setupTopics();
    this.setupEvents();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'value' && oldVal !== newVal && !this.isEditing) {
      if (this.isConnected) this.render();
    } else if (this.isConnected) {
      this.render();
    }
  }

  get value() { return this.getAttribute('value') || ''; }
  set value(val) { this.setAttribute('value', val); }
  get type() { return this.getAttribute('type') || 'text'; }
  get placeholder() { return this.getAttribute('placeholder') || 'Click to edit'; }
  get topic() { return this.getAttribute('topic') || 'cell'; }
  get cellId() { return this.getAttribute('cell-id') || crypto.randomUUID(); }
  get editable() { return this.getAttribute('editable') !== 'false'; }
  get multiline() { return this.hasAttribute('multiline'); }

  setupTopics() {
    this.pc.subscribe(`${this.topic}.setValue`, (msg) => {
      if (msg.data.cellId === this.cellId) {
        this.value = msg.data.value;
      }
    });
  }

  setupEvents() {
    const display = this.shadowRoot.querySelector('.cell-display');
    const input = this.shadowRoot.querySelector('.cell-input');

    if (display && this.editable) {
      display.addEventListener('click', () => this.startEdit());
      display.addEventListener('dblclick', () => this.startEdit());
    }

    if (input) {
      input.addEventListener('blur', () => this.finishEdit());
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !this.multiline) {
          e.preventDefault();
          this.finishEdit();
        } else if (e.key === 'Escape') {
          this.cancelEdit();
        } else if (e.key === 'Enter' && e.ctrlKey && this.multiline) {
          this.finishEdit();
        }
      });

      input.addEventListener('focus', () => {
        this.pc.publish({
          topic: `${this.topic}.focus`,
          data: { cellId: this.cellId }
        });
      });
    }
  }

  startEdit() {
    if (!this.editable || this.isEditing) return;

    this.isEditing = true;
    this.oldValue = this.value;

    const display = this.shadowRoot.querySelector('.cell-display');
    const input = this.shadowRoot.querySelector('.cell-input');

    if (display) display.style.display = 'none';
    if (input) {
      input.style.display = 'block';
      input.value = this.value;
      input.focus();
      if (input.select) input.select();
    }
  }

  finishEdit() {
    if (!this.isEditing) return;

    const input = this.shadowRoot.querySelector('.cell-input');
    const newValue = input ? input.value : this.value;

    this.isEditing = false;

    if (newValue !== this.oldValue) {
      this.value = newValue;

      this.pc.publish({
        topic: `${this.topic}.change`,
        data: {
          cellId: this.cellId,
          value: newValue,
          oldValue: this.oldValue
        }
      });
    }

    this.updateDisplay();

    this.pc.publish({
      topic: `${this.topic}.blur`,
      data: { cellId: this.cellId }
    });
  }

  cancelEdit() {
    if (!this.isEditing) return;

    this.isEditing = false;
    this.updateDisplay();
  }

  updateDisplay() {
    const display = this.shadowRoot.querySelector('.cell-display');
    const input = this.shadowRoot.querySelector('.cell-input');

    if (display) {
      display.style.display = 'flex';
      display.textContent = this.value || this.placeholder;
      display.classList.toggle('empty', !this.value);
    }

    if (input) {
      input.style.display = 'none';
    }
  }

  render() {
    const hasValue = !!this.value;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .cell-container {
          position: relative;
          min-height: 32px;
        }

        .cell-display {
          display: flex;
          align-items: center;
          padding: 0.5rem 0.75rem;
          min-height: 32px;
          cursor: ${this.editable ? 'text' : 'default'};
          border-radius: 0.375rem;
          transition: all 0.2s;
          color: var(--cell-color, #1e293b);
          background: var(--cell-bg, transparent);
          border: 1px solid transparent;
        }

        .cell-display:hover {
          background: var(--cell-hover-bg, #f8fafc);
          border-color: var(--cell-hover-border, #e2e8f0);
        }

        .cell-display.empty {
          color: var(--cell-placeholder-color, #94a3b8);
          font-style: italic;
        }

        .cell-input {
          display: none;
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 2px solid var(--cell-focus-border, #6366f1);
          border-radius: 0.375rem;
          font-family: inherit;
          font-size: inherit;
          background: var(--cell-input-bg, #ffffff);
          color: var(--cell-color, #1e293b);
          outline: none;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        textarea.cell-input {
          min-height: 80px;
          resize: vertical;
        }

        .cell-input:focus {
          border-color: var(--cell-focus-border, #6366f1);
        }

        :host([editable="false"]) .cell-display {
          cursor: default;
        }

        :host([editable="false"]) .cell-display:hover {
          background: transparent;
          border-color: transparent;
        }
      </style>

      <div class="cell-container">
        <div class="cell-display ${!hasValue ? 'empty' : ''}">
          ${this.value || this.placeholder}
        </div>
        ${this.multiline ? `
          <textarea class="cell-input" placeholder="${this.placeholder}"></textarea>
        ` : `
          <input
            type="${this.type}"
            class="cell-input"
            placeholder="${this.placeholder}"
          >
        `}
      </div>
    `;

    // Re-setup events after render
    if (this.isConnected) {
      setTimeout(() => this.setupEvents(), 0);
    }
  }
}

customElements.define('editable-cell', EditableCell);
export default EditableCell;
