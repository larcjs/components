// <pan-tree> — Collapsible tree component with drag-drop and inline editing
// Attributes:
//   - resource: Resource name for PAN topics (default: 'tree')
//   - data: JSON string for tree data
//   - url: URL to fetch JSON tree data
//   - editable: Enable drag-drop reordering and inline editing
//   - expanded: Start with all nodes expanded
//   - indent: Indentation per level in pixels (default: 20)
//   - icon-open: Icon for open folders (default: ▼)
//   - icon-closed: Icon for closed folders (default: ▶)
//   - icon-leaf: Icon for leaf nodes (default: •)
//
// Data Structure:
//   { id, label, children: [], data: {}, icon: '' }
//
// Topics:
//   - Subscribes: {resource}.data.set { tree }
//   - Subscribes: {resource}.node.expand { id }
//   - Subscribes: {resource}.node.collapse { id }
//   - Subscribes: {resource}.node.toggle { id }
//   - Publishes: {resource}.node.select { id, node, path }
//   - Publishes: {resource}.node.edit { id, oldLabel, newLabel }
//   - Publishes: {resource}.node.move { nodeId, oldParentId, newParentId, oldIndex, newIndex }
//   - Publishes: {resource}.node.expanded { id, node }
//   - Publishes: {resource}.node.collapsed { id, node }

import { PanClient } from '../../../core/src/components/pan-client.mjs';

export class PanTree extends HTMLElement {
  static get observedAttributes() {
    return ['resource', 'data', 'url', 'editable', 'expanded', 'indent', 'icon-open', 'icon-closed', 'icon-leaf'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.pc = new PanClient(this);
    this.tree = [];
    this.expandedNodes = new Set();
    this.draggedNode = null;
    this.draggedPath = null;
    this.dropTarget = null;
    this._offs = [];
  }

  connectedCallback() {
    this.loadData();
    this.render();
    this.setupTopics();
  }

  disconnectedCallback() {
    this._offs.forEach(f => f && f());
    this._offs = [];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this.isConnected) return;

    if (name === 'data' || name === 'url') {
      this.loadData();
    } else {
      this.render();
    }
  }

  get resource() { return this.getAttribute('resource') || 'tree'; }
  get editable() { return this.hasAttribute('editable'); }
  get allExpanded() { return this.hasAttribute('expanded'); }
  get indent() { return parseInt(this.getAttribute('indent') || '20', 10); }
  get iconOpen() { return this.getAttribute('icon-open') || '▼'; }
  get iconClosed() { return this.getAttribute('icon-closed') || '▶'; }
  get iconLeaf() { return this.getAttribute('icon-leaf') || '•'; }

  async loadData() {
    // Priority: data attribute > url > default empty
    const dataAttr = this.getAttribute('data');
    const urlAttr = this.getAttribute('url');

    if (dataAttr) {
      try {
        this.tree = JSON.parse(dataAttr);
        if (this.allExpanded) this.expandAll();
        this.render();
      } catch (e) {
        console.error('Invalid tree data JSON:', e);
      }
    } else if (urlAttr) {
      try {
        const response = await fetch(urlAttr);
        if (response.ok) {
          this.tree = await response.json();
          if (this.allExpanded) this.expandAll();
          this.render();
        }
      } catch (e) {
        console.error('Failed to fetch tree data:', e);
      }
    }
  }

  setupTopics() {
    this._offs.push(
      this.pc.subscribe(`${this.resource}.data.set`, (msg) => {
        if (msg.data.tree) {
          this.tree = msg.data.tree;
          if (this.allExpanded) this.expandAll();
          this.render();
        }
      })
    );

    this._offs.push(
      this.pc.subscribe(`${this.resource}.node.expand`, (msg) => {
        if (msg.data.id) {
          this.expandNode(msg.data.id);
        }
      })
    );

    this._offs.push(
      this.pc.subscribe(`${this.resource}.node.collapse`, (msg) => {
        if (msg.data.id) {
          this.collapseNode(msg.data.id);
        }
      })
    );

    this._offs.push(
      this.pc.subscribe(`${this.resource}.node.toggle`, (msg) => {
        if (msg.data.id) {
          this.toggleNode(msg.data.id);
        }
      })
    );
  }

  expandAll() {
    const addAllIds = (nodes) => {
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          this.expandedNodes.add(node.id);
          addAllIds(node.children);
        }
      });
    };
    addAllIds(this.tree);
  }

  expandNode(id) {
    this.expandedNodes.add(id);
    this.render();
    const node = this.findNodeById(id);
    if (node) {
      this.pc.publish({
        topic: `${this.resource}.node.expanded`,
        data: { id, node }
      });
    }
  }

  collapseNode(id) {
    this.expandedNodes.delete(id);
    this.render();
    const node = this.findNodeById(id);
    if (node) {
      this.pc.publish({
        topic: `${this.resource}.node.collapsed`,
        data: { id, node }
      });
    }
  }

  toggleNode(id) {
    if (this.expandedNodes.has(id)) {
      this.collapseNode(id);
    } else {
      this.expandNode(id);
    }
  }

  findNodeById(id, nodes = this.tree, path = []) {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const currentPath = [...path, i];

      if (node.id === id) {
        return { node, path: currentPath };
      }

      if (node.children && node.children.length > 0) {
        const result = this.findNodeById(id, node.children, currentPath);
        if (result) return result;
      }
    }
    return null;
  }

  getNodeByPath(path, nodes = this.tree) {
    let current = nodes;
    let node = null;

    for (const index of path) {
      node = current[index];
      if (!node) return null;
      current = node.children || [];
    }

    return node;
  }

  moveNode(fromPath, toPath) {
    // Clone tree to avoid mutation issues
    const newTree = JSON.parse(JSON.stringify(this.tree));

    // Get source and destination
    const sourceParentPath = fromPath.slice(0, -1);
    const sourceIndex = fromPath[fromPath.length - 1];
    const destParentPath = toPath.slice(0, -1);
    const destIndex = toPath[toPath.length - 1];

    // Get parent arrays
    let sourceParent = newTree;
    for (const idx of sourceParentPath) {
      sourceParent = sourceParent[idx].children;
    }

    let destParent = newTree;
    for (const idx of destParentPath) {
      destParent = destParent[idx].children;
    }

    // Move the node
    const [movedNode] = sourceParent.splice(sourceIndex, 1);
    destParent.splice(destIndex, 0, movedNode);

    this.tree = newTree;
    this.render();

    // Publish move event
    this.pc.publish({
      topic: `${this.resource}.node.move`,
      data: {
        nodeId: movedNode.id,
        node: movedNode,
        fromPath,
        toPath
      }
    });
  }

  handleNodeClick(id, path) {
    const node = this.getNodeByPath(path);
    if (!node) return;

    // Publish select event
    this.pc.publish({
      topic: `${this.resource}.node.select`,
      data: { id, node, path }
    });
  }

  handleLabelEdit(id, path, newLabel) {
    const node = this.getNodeByPath(path);
    if (!node) return;

    const oldLabel = node.label;
    node.label = newLabel;

    this.render();

    this.pc.publish({
      topic: `${this.resource}.node.edit`,
      data: { id, oldLabel, newLabel, node }
    });
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
          line-height: 1.5;
          user-select: none;
        }

        .tree {
          padding: 8px;
        }

        .tree-node {
          position: relative;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .node-content {
          display: flex;
          align-items: center;
          padding: 4px 8px;
          cursor: pointer;
          border-radius: 4px;
          transition: background-color 0.15s ease;
        }

        .node-content:hover {
          background-color: #f0f0f0;
        }

        .node-content.drag-over {
          background-color: #e3f2fd;
          border: 2px dashed #2196f3;
        }

        .node-content.dragging {
          opacity: 0.5;
          background-color: #f5f5f5;
        }

        .toggle-icon {
          display: inline-block;
          width: 16px;
          text-align: center;
          margin-right: 4px;
          font-size: 10px;
          color: #666;
          cursor: pointer;
          user-select: none;
        }

        .toggle-icon.leaf {
          cursor: default;
        }

        .node-icon {
          margin-right: 6px;
          font-size: 14px;
        }

        .node-label {
          flex: 1;
          padding: 2px 4px;
          border-radius: 2px;
          outline: none;
        }

        .node-label[contenteditable="true"]:focus {
          background-color: white;
          box-shadow: 0 0 0 2px #2196f3;
        }

        .node-children {
          padding-left: ${this.indent}px;
          list-style: none;
          margin: 0;
        }

        .node-children.collapsed {
          display: none;
        }

        .drag-handle {
          margin-right: 6px;
          color: #999;
          cursor: grab;
          font-size: 12px;
        }

        .drag-handle:active {
          cursor: grabbing;
        }

        .empty-tree {
          padding: 20px;
          text-align: center;
          color: #999;
          font-style: italic;
        }
      </style>
      <div class="tree">
        ${this.tree.length === 0
          ? '<div class="empty-tree">No items</div>'
          : this.renderNodes(this.tree)
        }
      </div>
    `;

    this.attachEventListeners();
  }

  renderNodes(nodes, parentPath = []) {
    return `
      <ul class="tree-nodes">
        ${nodes.map((node, index) => {
          const path = [...parentPath, index];
          const pathStr = path.join(',');
          const hasChildren = node.children && node.children.length > 0;
          const isExpanded = this.expandedNodes.has(node.id);
          const icon = hasChildren
            ? (isExpanded ? this.iconOpen : this.iconClosed)
            : this.iconLeaf;

          return `
            <li class="tree-node" data-id="${this.escapeHtml(node.id)}" data-path="${pathStr}">
              <div class="node-content" draggable="${this.editable}">
                ${this.editable ? '<span class="drag-handle">⋮⋮</span>' : ''}
                <span class="toggle-icon ${hasChildren ? '' : 'leaf'}" data-action="toggle">
                  ${icon}
                </span>
                ${node.icon ? `<span class="node-icon">${node.icon}</span>` : ''}
                <span class="node-label"
                      contenteditable="${this.editable}"
                      data-action="label"
                      spellcheck="false">
                  ${this.escapeHtml(node.label)}
                </span>
              </div>
              ${hasChildren ? `
                <ul class="node-children ${isExpanded ? '' : 'collapsed'}">
                  ${this.renderNodes(node.children, path)}
                </ul>
              ` : ''}
            </li>
          `;
        }).join('')}
      </ul>
    `;
  }

  attachEventListeners() {
    const root = this.shadowRoot;

    // Click handlers
    root.addEventListener('click', (e) => {
      const toggle = e.target.closest('[data-action="toggle"]');
      if (toggle) {
        e.stopPropagation(); // Prevent event from bubbling to node-content handler
        const node = e.target.closest('.tree-node');
        if (node) {
          const id = node.dataset.id;
          const path = node.dataset.path.split(',').map(Number);
          const nodeData = this.getNodeByPath(path);
          if (nodeData && nodeData.children && nodeData.children.length > 0) {
            this.toggleNode(id);
          }
        }
        return;
      }

      const content = e.target.closest('.node-content');
      if (content && !e.target.matches('[contenteditable="true"]')) {
        const node = e.target.closest('.tree-node');
        if (node) {
          const id = node.dataset.id;
          const path = node.dataset.path.split(',').map(Number);
          this.handleNodeClick(id, path);
        }
      }
    });

    // Inline editing
    if (this.editable) {
      root.addEventListener('blur', (e) => {
        if (e.target.matches('[data-action="label"]')) {
          const node = e.target.closest('.tree-node');
          if (node) {
            const id = node.dataset.id;
            const path = node.dataset.path.split(',').map(Number);
            const newLabel = e.target.textContent.trim();
            if (newLabel) {
              this.handleLabelEdit(id, path, newLabel);
            } else {
              // Restore original if empty
              const nodeData = this.getNodeByPath(path);
              e.target.textContent = nodeData.label;
            }
          }
        }
      }, true);

      // Prevent newlines in contenteditable
      root.addEventListener('keydown', (e) => {
        if (e.target.matches('[contenteditable="true"]') && e.key === 'Enter') {
          e.preventDefault();
          e.target.blur();
        }
      });

      // Drag and drop
      this.setupDragAndDrop(root);
    }
  }

  setupDragAndDrop(root) {
    root.addEventListener('dragstart', (e) => {
      const nodeEl = e.target.closest('.tree-node');
      if (!nodeEl) return;

      this.draggedNode = nodeEl;
      this.draggedPath = nodeEl.dataset.path.split(',').map(Number);

      e.target.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', nodeEl.dataset.id);
    });

    root.addEventListener('dragend', (e) => {
      e.target.classList.remove('dragging');

      // Clear all drag-over states
      root.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
      });

      this.draggedNode = null;
      this.draggedPath = null;
      this.dropTarget = null;
    });

    root.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      const nodeContent = e.target.closest('.node-content');
      if (!nodeContent || nodeContent.closest('.tree-node') === this.draggedNode) {
        return;
      }

      // Clear previous highlight
      if (this.dropTarget && this.dropTarget !== nodeContent) {
        this.dropTarget.classList.remove('drag-over');
      }

      nodeContent.classList.add('drag-over');
      this.dropTarget = nodeContent;
    });

    root.addEventListener('dragleave', (e) => {
      const nodeContent = e.target.closest('.node-content');
      if (nodeContent) {
        nodeContent.classList.remove('drag-over');
      }
    });

    root.addEventListener('drop', (e) => {
      e.preventDefault();

      const targetNode = e.target.closest('.tree-node');
      if (!targetNode || targetNode === this.draggedNode) {
        return;
      }

      const targetPath = targetNode.dataset.path.split(',').map(Number);

      // Check if trying to drop on own child (invalid)
      const isChildOfDragged = targetPath.length > this.draggedPath.length &&
        targetPath.slice(0, this.draggedPath.length).every((v, i) => v === this.draggedPath[i]);

      if (isChildOfDragged) {
        console.warn('Cannot drop node into its own child');
        return;
      }

      // Move node to be sibling of target (insert after target)
      const targetParentPath = targetPath.slice(0, -1);
      const targetIndex = targetPath[targetPath.length - 1];
      const newPath = [...targetParentPath, targetIndex + 1];

      this.moveNode(this.draggedPath, newPath);
    });
  }

  escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  }
}

customElements.define('pan-tree', PanTree);
export default PanTree;
