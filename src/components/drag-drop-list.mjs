// <drag-drop-list> — Draggable list with reordering and PAN integration
// Attributes:
//   - topic: Topic prefix for events
//   - items: JSON array of items with { id, content } structure
//   - disabled: Disable drag functionality
//   - handle: CSS selector for drag handle (default: entire item)
//
// Topics:
//   - Publishes: {topic}.reorder { items, from, to }
//   - Publishes: {topic}.drop { item, index }
//   - Subscribes: {topic}.setItems { items }
//   - Subscribes: {topic}.addItem { item, index? }
//   - Subscribes: {topic}.removeItem { id }
//
// Slots:
//   - item-{id}: Custom content for specific item
//   - default: Used as template for items

import { PanClient } from './pan-client.mjs';

export class DragDropList extends HTMLElement {
  static get observedAttributes() {
    return ['topic', 'items', 'disabled', 'handle'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.pc = new PanClient(this);
    this.items = [];
    this.draggedElement = null;
    this.draggedIndex = null;
  }

  connectedCallback() {
    if (this.getAttribute('items')) {
      try {
        this.items = JSON.parse(this.getAttribute('items'));
      } catch (e) {
        console.error('Invalid items JSON:', e);
      }
    }
    this.render();
    this.setupTopics();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'items' && newVal) {
      try {
        this.items = JSON.parse(newVal);
        if (this.isConnected) this.render();
      } catch (e) {
        console.error('Invalid items JSON:', e);
      }
    } else if (this.isConnected) {
      this.render();
    }
  }

  get topic() { return this.getAttribute('topic') || 'list'; }
  get disabled() { return this.hasAttribute('disabled'); }
  get handle() { return this.getAttribute('handle') || null; }

  setupTopics() {
    this.pc.subscribe(`${this.topic}.setItems`, (msg) => {
      if (msg.data.items) {
        this.items = msg.data.items;
        this.render();
      }
    });

    this.pc.subscribe(`${this.topic}.addItem`, (msg) => {
      if (msg.data.item) {
        const index = msg.data.index ?? this.items.length;
        this.items.splice(index, 0, msg.data.item);
        this.render();
      }
    });

    this.pc.subscribe(`${this.topic}.removeItem`, (msg) => {
      if (msg.data.id) {
        this.items = this.items.filter(item => item.id !== msg.data.id);
        this.render();
      }
    });
  }

  setupDragEvents() {
    const listItems = this.shadowRoot.querySelectorAll('.list-item');

    listItems.forEach((item, index) => {
      const handle = this.handle ? item.querySelector(this.handle) : item;

      if (handle) {
        handle.style.cursor = 'grab';
        item.setAttribute('draggable', 'true');

        item.addEventListener('dragstart', (e) => {
          if (this.disabled) return;

          this.draggedElement = item;
          this.draggedIndex = index;
          item.classList.add('dragging');
          handle.style.cursor = 'grabbing';

          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/html', item.innerHTML);
        });

        item.addEventListener('dragend', (e) => {
          item.classList.remove('dragging');
          handle.style.cursor = 'grab';
          this.draggedElement = null;
          this.draggedIndex = null;

          // Remove all drag-over classes
          listItems.forEach(li => li.classList.remove('drag-over'));
        });

        item.addEventListener('dragover', (e) => {
          if (this.disabled || !this.draggedElement) return;
          e.preventDefault();

          const afterElement = this.getDragAfterElement(e.clientY);
          if (afterElement == null) {
            item.parentElement.appendChild(this.draggedElement);
          } else {
            item.parentElement.insertBefore(this.draggedElement, afterElement);
          }
        });

        item.addEventListener('dragenter', (e) => {
          if (this.disabled || !this.draggedElement) return;
          if (item !== this.draggedElement) {
            item.classList.add('drag-over');
          }
        });

        item.addEventListener('dragleave', (e) => {
          item.classList.remove('drag-over');
        });

        item.addEventListener('drop', (e) => {
          if (this.disabled) return;
          e.preventDefault();

          item.classList.remove('drag-over');

          const newIndex = Array.from(listItems).indexOf(item);
          const oldIndex = this.draggedIndex;

          if (oldIndex !== newIndex && oldIndex !== null) {
            // Update items array
            const movedItem = this.items[oldIndex];
            this.items.splice(oldIndex, 1);
            this.items.splice(newIndex, 0, movedItem);

            this.pc.publish({
              topic: `${this.topic}.reorder`,
              data: {
                items: this.items,
                from: oldIndex,
                to: newIndex
              }
            });

            this.render();
          }
        });
      }
    });
  }

  getDragAfterElement(y) {
    const draggableElements = [...this.shadowRoot.querySelectorAll('.list-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .list-container {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .list-item {
          background: var(--list-item-bg, #ffffff);
          border: 1px solid var(--list-item-border, #e2e8f0);
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
          transition: all 0.2s;
          user-select: none;
        }

        .list-item:not([draggable]) {
          cursor: default;
        }

        .list-item.dragging {
          opacity: 0.5;
          transform: scale(0.95);
        }

        .list-item.drag-over {
          border-color: var(--list-drag-border, #6366f1);
          background: var(--list-drag-bg, #eef2ff);
          transform: translateY(-2px);
        }

        .list-item:not(.dragging):hover {
          border-color: var(--list-hover-border, #cbd5e1);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .item-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .drag-handle {
          color: var(--list-handle-color, #94a3b8);
          font-size: 1.25rem;
          line-height: 1;
        }

        :host([disabled]) .list-item {
          cursor: default !important;
          opacity: 0.6;
        }

        .empty-state {
          padding: 2rem;
          text-align: center;
          color: var(--list-empty-color, #94a3b8);
          font-style: italic;
        }
      </style>

      <div class="list-container">
        ${this.items.length === 0 ? `
          <div class="empty-state">
            <slot name="empty">No items to display</slot>
          </div>
        ` : this.items.map((item, index) => `
          <div class="list-item" data-id="${item.id}" data-index="${index}">
            <div class="item-content">
              ${!this.disabled && !this.handle ? '<span class="drag-handle">⋮⋮</span>' : ''}
              <div class="item-body">
                <slot name="item-${item.id}">
                  ${item.content || item.label || item.title || JSON.stringify(item)}
                </slot>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Setup drag events after render
    if (!this.disabled) {
      setTimeout(() => this.setupDragEvents(), 0);
    }
  }
}

customElements.define('drag-drop-list', DragDropList);
export default DragDropList;
