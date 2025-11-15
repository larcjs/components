/**
 * pan-markdown-editor
 *
 * Markdown editor with formatting toolbar and live preview.
 * Features auto-save, syntax shortcuts, and full keyboard support.
 *
 * Features:
 * - Rich formatting toolbar
 * - Keyboard shortcuts (Ctrl+B, Ctrl+I, etc.)
 * - Auto-indent for lists
 * - Tab support in editor
 * - Live preview toggle
 * - Word/character count
 * - Auto-save support
 *
 * Attributes:
 * - value: Initial markdown content
 * - placeholder: Placeholder text
 * - preview: Show preview panel (default: false)
 * - autosave: Enable auto-save (default: false)
 *
 * PAN Events:
 * - markdown.changed: { content, wordCount, charCount }
 * - markdown.saved: { content }
 *
 * Usage:
 *   <pan-markdown-editor value="# Hello" preview="true"></pan-markdown-editor>
 */

import './pan-markdown-renderer.mjs';

export class PanMarkdownEditor extends HTMLElement {
  static observedAttributes = ['value', 'placeholder', 'preview', 'autosave'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._value = '';
    this._placeholder = 'Start writing...';
    this._showPreview = false;
    this._autosave = false;
    this._saveTimer = null;
  }

  connectedCallback() {
    this.render();
    this._setupEventListeners();
    this._setupPanListeners();
  }

  disconnectedCallback() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'value':
        this._value = newValue || '';
        this._updateTextarea();
        break;
      case 'placeholder':
        this._placeholder = newValue || 'Start writing...';
        this._updateTextarea();
        break;
      case 'preview':
        this._showPreview = newValue === 'true';
        this.render();
        this._setupEventListeners();
        break;
      case 'autosave':
        this._autosave = newValue === 'true';
        break;
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .editor-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #e2e8f0);
          border-radius: 0.5rem;
          overflow: hidden;
        }

        /* Toolbar */
        .toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
          padding: 0.5rem;
          border-bottom: 1px solid var(--color-border, #e2e8f0);
          background: var(--color-bg-alt, #f8fafc);
        }

        .toolbar-group {
          display: flex;
          gap: 0.25rem;
          padding-right: 0.5rem;
          border-right: 1px solid var(--color-border, #e2e8f0);
        }

        .toolbar-group:last-child {
          border-right: none;
        }

        .toolbar-btn {
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #e2e8f0);
          color: var(--color-text, #1e293b);
          padding: 0.375rem 0.5rem;
          border-radius: 0.25rem;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.15s ease;
          font-family: var(--font-sans, system-ui);
        }

        .toolbar-btn:hover {
          background: var(--color-primary-soft, #e0f2fe);
          border-color: var(--color-primary, #006699);
        }

        .toolbar-btn:active {
          transform: scale(0.95);
        }

        .toolbar-btn.active {
          background: var(--color-primary, #006699);
          color: white;
          border-color: var(--color-primary, #006699);
        }

        /* Editor/Preview Layout */
        .content-area {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .editor-pane,
        .preview-pane {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .editor-pane {
          border-right: ${this._showPreview ? '1px solid var(--color-border, #e2e8f0)' : 'none'};
        }

        .pane-title {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted, #64748b);
          padding: 0.5rem 0.75rem;
          background: var(--color-bg-alt, #f8fafc);
          border-bottom: 1px solid var(--color-border, #e2e8f0);
        }

        .editor-textarea {
          flex: 1;
          width: 100%;
          padding: 1rem;
          border: none;
          outline: none;
          resize: none;
          font-family: var(--font-mono, 'Courier New', monospace);
          font-size: 0.95rem;
          line-height: 1.6;
          background: var(--color-surface, #ffffff);
          color: var(--color-text, #1e293b);
          tab-size: 2;
        }

        .editor-textarea::placeholder {
          color: var(--color-text-subtle, #94a3b8);
        }

        .preview-content {
          flex: 1;
          padding: 1rem;
          overflow-y: auto;
        }

        /* Footer */
        .editor-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0.75rem;
          border-top: 1px solid var(--color-border, #e2e8f0);
          background: var(--color-bg-alt, #f8fafc);
          font-size: 0.75rem;
          color: var(--color-text-muted, #64748b);
        }

        .stats {
          display: flex;
          gap: 1rem;
        }

        .save-indicator {
          color: var(--color-success, #10b981);
        }

        @media (max-width: 768px) {
          .content-area {
            flex-direction: column;
          }

          .editor-pane {
            border-right: none;
            border-bottom: ${this._showPreview ? '1px solid var(--color-border, #e2e8f0)' : 'none'};
          }
        }
      </style>

      <div class="editor-container">
        <div class="toolbar">
          <div class="toolbar-group">
            <button class="toolbar-btn" data-action="bold" title="Bold (Ctrl+B)"><strong>B</strong></button>
            <button class="toolbar-btn" data-action="italic" title="Italic (Ctrl+I)"><em>I</em></button>
            <button class="toolbar-btn" data-action="strikethrough" title="Strikethrough"><del>S</del></button>
          </div>

          <div class="toolbar-group">
            <button class="toolbar-btn" data-action="h1" title="Heading 1">H1</button>
            <button class="toolbar-btn" data-action="h2" title="Heading 2">H2</button>
            <button class="toolbar-btn" data-action="h3" title="Heading 3">H3</button>
          </div>

          <div class="toolbar-group">
            <button class="toolbar-btn" data-action="ul" title="Bullet List">• List</button>
            <button class="toolbar-btn" data-action="ol" title="Numbered List">1. List</button>
            <button class="toolbar-btn" data-action="task" title="Task List">☑ Task</button>
          </div>

          <div class="toolbar-group">
            <button class="toolbar-btn" data-action="link" title="Link (Ctrl+K)">🔗 Link</button>
            <button class="toolbar-btn" data-action="image" title="Image">🖼️ Image</button>
            <button class="toolbar-btn" data-action="code" title="Code">{ }</button>
            <button class="toolbar-btn" data-action="codeblock" title="Code Block">&lt;/&gt;</button>
          </div>

          <div class="toolbar-group">
            <button class="toolbar-btn" data-action="quote" title="Blockquote">❝ Quote</button>
            <button class="toolbar-btn" data-action="hr" title="Horizontal Rule">─</button>
            <button class="toolbar-btn" data-action="table" title="Table">⊞ Table</button>
          </div>

          <div class="toolbar-group">
            <button class="toolbar-btn ${this._showPreview ? 'active' : ''}" data-action="preview" title="Toggle Preview">👁️ Preview</button>
          </div>
        </div>

        <div class="content-area">
          <div class="editor-pane">
            <div class="pane-title">Markdown</div>
            <textarea class="editor-textarea" placeholder="${this._placeholder}">${this._value}</textarea>
          </div>

          ${this._showPreview ? `
            <div class="preview-pane">
              <div class="pane-title">Preview</div>
              <div class="preview-content">
                <pan-markdown-renderer></pan-markdown-renderer>
              </div>
            </div>
          ` : ''}
        </div>

        <div class="editor-footer">
          <div class="stats">
            <span class="word-count">0 words</span>
            <span class="char-count">0 characters</span>
          </div>
          <div class="save-indicator"></div>
        </div>
      </div>
    `;
  }

  _setupEventListeners() {
    const textarea = this.shadowRoot.querySelector('.editor-textarea');
    const toolbar = this.shadowRoot.querySelector('.toolbar');

    // Textarea events
    textarea?.addEventListener('input', () => {
      this._handleInput();
    });

    textarea?.addEventListener('keydown', (e) => {
      this._handleKeydown(e);
    });

    // Toolbar events
    toolbar?.addEventListener('click', (e) => {
      const btn = e.target.closest('.toolbar-btn');
      if (btn) {
        const action = btn.dataset.action;
        if (action) {
          this._handleToolbarAction(action);
        }
      }
    });

    // Update initial stats
    this._updateStats();
    this._updatePreview();
  }

  _setupPanListeners() {
    const bus = document.querySelector('pan-bus');
    if (bus) {
      bus.subscribe('markdown.set-content', (data) => {
        if (data.content !== undefined) {
          this.setValue(data.content);
        }
      });

      bus.subscribe('markdown.get-content', () => {
        bus.publish('markdown.content-response', {
          content: this._value
        });
      });
    }
  }

  _handleInput() {
    const textarea = this.shadowRoot.querySelector('.editor-textarea');
    this._value = textarea.value;

    this._updateStats();
    this._updatePreview();
    this._broadcastChange();

    if (this._autosave) {
      this._debounceSave();
    }
  }

  _handleKeydown(e) {
    // Tab support
    if (e.key === 'Tab') {
      e.preventDefault();
      this._insertText('  ');
      return;
    }

    // Keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          this._handleToolbarAction('bold');
          break;
        case 'i':
          e.preventDefault();
          this._handleToolbarAction('italic');
          break;
        case 'k':
          e.preventDefault();
          this._handleToolbarAction('link');
          break;
        case 's':
          e.preventDefault();
          this._save();
          break;
      }
    }

    // Auto-continue lists
    if (e.key === 'Enter') {
      this._handleEnter(e);
    }
  }

  _handleEnter(e) {
    const textarea = this.shadowRoot.querySelector('.editor-textarea');
    const pos = textarea.selectionStart;
    const text = textarea.value;

    // Get current line
    const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
    const lineEnd = text.indexOf('\n', pos);
    const line = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd);

    // Check for list patterns
    const ulMatch = line.match(/^(\s*)[*+-]\s/);
    const olMatch = line.match(/^(\s*)(\d+)\.\s/);
    const taskMatch = line.match(/^(\s*)- \[([ x])\]\s/);

    if (ulMatch) {
      e.preventDefault();
      this._insertText(`\n${ulMatch[1]}* `);
    } else if (olMatch) {
      e.preventDefault();
      const nextNum = parseInt(olMatch[2]) + 1;
      this._insertText(`\n${olMatch[1]}${nextNum}. `);
    } else if (taskMatch) {
      e.preventDefault();
      this._insertText(`\n${taskMatch[1]}- [ ] `);
    }
  }

  _handleToolbarAction(action) {
    const actions = {
      bold: () => this._wrapSelection('**', '**'),
      italic: () => this._wrapSelection('*', '*'),
      strikethrough: () => this._wrapSelection('~~', '~~'),
      h1: () => this._prefixLine('# '),
      h2: () => this._prefixLine('## '),
      h3: () => this._prefixLine('### '),
      ul: () => this._prefixLine('* '),
      ol: () => this._prefixLine('1. '),
      task: () => this._prefixLine('- [ ] '),
      link: () => this._insertLink(),
      image: () => this._insertImage(),
      code: () => this._wrapSelection('`', '`'),
      codeblock: () => this._insertCodeBlock(),
      quote: () => this._prefixLine('> '),
      hr: () => this._insertText('\n---\n'),
      table: () => this._insertTable(),
      preview: () => this._togglePreview()
    };

    const action_fn = actions[action];
    if (action_fn) action_fn();
  }

  _wrapSelection(before, after) {
    const textarea = this.shadowRoot.querySelector('.editor-textarea');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    const newText = text.substring(0, start) + before + selected + after + text.substring(end);
    textarea.value = newText;
    textarea.setSelectionRange(start + before.length, end + before.length);
    textarea.focus();

    this._handleInput();
  }

  _prefixLine(prefix) {
    const textarea = this.shadowRoot.querySelector('.editor-textarea');
    const pos = textarea.selectionStart;
    const text = textarea.value;

    const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
    const newText = text.substring(0, lineStart) + prefix + text.substring(lineStart);

    textarea.value = newText;
    textarea.setSelectionRange(pos + prefix.length, pos + prefix.length);
    textarea.focus();

    this._handleInput();
  }

  _insertText(text) {
    const textarea = this.shadowRoot.querySelector('.editor-textarea');
    const pos = textarea.selectionStart;
    const value = textarea.value;

    textarea.value = value.substring(0, pos) + text + value.substring(pos);
    textarea.setSelectionRange(pos + text.length, pos + text.length);
    textarea.focus();

    this._handleInput();
  }

  _insertLink() {
    const url = prompt('Enter URL:');
    if (url) {
      const text = prompt('Enter link text:') || url;
      this._insertText(`[${text}](${url})`);
    }
  }

  _insertImage() {
    const url = prompt('Enter image URL:');
    if (url) {
      const alt = prompt('Enter alt text:') || 'image';
      this._insertText(`![${alt}](${url})`);
    }
  }

  _insertCodeBlock() {
    const lang = prompt('Enter language (optional):') || '';
    this._insertText(`\`\`\`${lang}\n\n\`\`\``);
  }

  _insertTable() {
    const table = `
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
`;
    this._insertText(table.trim());
  }

  _togglePreview() {
    this._showPreview = !this._showPreview;
    this.setAttribute('preview', this._showPreview.toString());
  }

  _updateStats() {
    const wordCount = this._value.trim().split(/\s+/).filter(w => w.length > 0).length;
    const charCount = this._value.length;

    const wordEl = this.shadowRoot.querySelector('.word-count');
    const charEl = this.shadowRoot.querySelector('.char-count');

    if (wordEl) wordEl.textContent = `${wordCount} words`;
    if (charEl) charEl.textContent = `${charCount} characters`;
  }

  _updatePreview() {
    if (!this._showPreview) return;

    const renderer = this.shadowRoot.querySelector('pan-markdown-renderer');
    if (renderer) {
      renderer.setContent(this._value);
    }
  }

  _updateTextarea() {
    const textarea = this.shadowRoot.querySelector('.editor-textarea');
    if (textarea && textarea.value !== this._value) {
      textarea.value = this._value;
      this._updateStats();
      this._updatePreview();
    }
  }

  _broadcastChange() {
    const bus = document.querySelector('pan-bus');
    if (bus) {
      const wordCount = this._value.trim().split(/\s+/).filter(w => w.length > 0).length;
      const charCount = this._value.length;

      bus.publish('markdown.changed', {
        content: this._value,
        wordCount,
        charCount
      });
    }
  }

  _debounceSave() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      this._save();
    }, 1000);
  }

  _save() {
    const bus = document.querySelector('pan-bus');
    if (bus) {
      bus.publish('markdown.saved', {
        content: this._value
      });
    }

    const indicator = this.shadowRoot.querySelector('.save-indicator');
    if (indicator) {
      indicator.textContent = 'Saved ✓';
      setTimeout(() => {
        indicator.textContent = '';
      }, 2000);
    }
  }

  // Public API
  setValue(value) {
    this._value = value || '';
    this._updateTextarea();
  }

  getValue() {
    return this._value;
  }

  insertText(text) {
    this._insertText(text);
  }

  focus() {
    const textarea = this.shadowRoot.querySelector('.editor-textarea');
    textarea?.focus();
  }
}

customElements.define('pan-markdown-editor', PanMarkdownEditor);
export default PanMarkdownEditor;
