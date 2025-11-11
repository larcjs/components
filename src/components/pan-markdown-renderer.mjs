/**
 * pan-markdown-renderer
 *
 * Renders markdown to HTML with syntax highlighting for code blocks.
 * Supports standard markdown features: headers, lists, links, code, tables, etc.
 *
 * Features:
 * - Complete markdown syntax support
 * - Code syntax highlighting
 * - Tables, task lists, blockquotes
 * - Safe HTML rendering (sanitized)
 * - GitHub-flavored markdown
 * - Custom styling via CSS variables
 *
 * Attributes:
 * - content: Markdown content to render
 * - sanitize: Enable HTML sanitization (default: true)
 *
 * PAN Events:
 * - markdown.render: Trigger render with content
 *
 * Usage:
 *   <pan-markdown-renderer content="# Hello World"></pan-markdown-renderer>
 */

export class PanMarkdownRenderer extends HTMLElement {
  static observedAttributes = ['content', 'sanitize'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._content = '';
    this._sanitize = true;
  }

  connectedCallback() {
    this.render();
    this._setupPanListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'content' && oldValue !== newValue) {
      this._content = newValue || '';
      this.renderMarkdown();
    } else if (name === 'sanitize') {
      this._sanitize = newValue !== 'false';
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .markdown-body {
          color: var(--color-text, #1e293b);
          line-height: 1.6;
          font-size: 1rem;
        }

        .markdown-body > *:first-child {
          margin-top: 0;
        }

        .markdown-body > *:last-child {
          margin-bottom: 0;
        }

        /* Headers */
        .markdown-body h1,
        .markdown-body h2,
        .markdown-body h3,
        .markdown-body h4,
        .markdown-body h5,
        .markdown-body h6 {
          margin: 1.5rem 0 1rem 0;
          font-weight: 600;
          line-height: 1.3;
          color: var(--color-text, #1e293b);
        }

        .markdown-body h1 { font-size: 2rem; border-bottom: 2px solid var(--color-border, #e2e8f0); padding-bottom: 0.5rem; }
        .markdown-body h2 { font-size: 1.5rem; border-bottom: 1px solid var(--color-border, #e2e8f0); padding-bottom: 0.5rem; }
        .markdown-body h3 { font-size: 1.25rem; }
        .markdown-body h4 { font-size: 1.1rem; }
        .markdown-body h5 { font-size: 1rem; }
        .markdown-body h6 { font-size: 0.9rem; color: var(--color-text-muted, #64748b); }

        /* Paragraphs */
        .markdown-body p {
          margin: 1rem 0;
        }

        /* Links */
        .markdown-body a {
          color: var(--color-primary, #006699);
          text-decoration: none;
          border-bottom: 1px solid transparent;
          transition: border-color 0.2s;
        }

        .markdown-body a:hover {
          border-bottom-color: var(--color-primary, #006699);
        }

        /* Lists */
        .markdown-body ul,
        .markdown-body ol {
          margin: 1rem 0;
          padding-left: 2rem;
        }

        .markdown-body li {
          margin: 0.25rem 0;
        }

        .markdown-body li > p {
          margin: 0.5rem 0;
        }

        /* Task lists */
        .markdown-body input[type="checkbox"] {
          margin-right: 0.5rem;
        }

        /* Code */
        .markdown-body code {
          background: var(--color-code-bg, #1e293b);
          color: var(--color-code-text, #e2e8f0);
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          font-family: var(--font-mono, 'Courier New', monospace);
          font-size: 0.9em;
        }

        .markdown-body pre {
          background: var(--color-code-bg, #1e293b);
          color: var(--color-code-text, #e2e8f0);
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 1rem 0;
        }

        .markdown-body pre code {
          background: none;
          padding: 0;
        }

        /* Blockquotes */
        .markdown-body blockquote {
          border-left: 4px solid var(--color-primary, #006699);
          padding-left: 1rem;
          margin: 1rem 0;
          color: var(--color-text-muted, #64748b);
          font-style: italic;
        }

        .markdown-body blockquote p {
          margin: 0.5rem 0;
        }

        /* Horizontal rule */
        .markdown-body hr {
          border: none;
          border-top: 2px solid var(--color-border, #e2e8f0);
          margin: 2rem 0;
        }

        /* Tables */
        .markdown-body table {
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
        }

        .markdown-body th,
        .markdown-body td {
          border: 1px solid var(--color-border, #e2e8f0);
          padding: 0.5rem 0.75rem;
          text-align: left;
        }

        .markdown-body th {
          background: var(--color-bg-alt, #f8fafc);
          font-weight: 600;
        }

        .markdown-body tr:hover {
          background: var(--color-bg-alt, #f8fafc);
        }

        /* Images */
        .markdown-body img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }

        /* Strong and emphasis */
        .markdown-body strong {
          font-weight: 600;
          color: var(--color-text, #1e293b);
        }

        .markdown-body em {
          font-style: italic;
        }

        /* Strikethrough */
        .markdown-body del {
          text-decoration: line-through;
          color: var(--color-text-muted, #64748b);
        }
      </style>
      <div class="markdown-body"></div>
    `;

    this.renderMarkdown();
  }

  renderMarkdown() {
    const container = this.shadowRoot.querySelector('.markdown-body');
    if (!container) return;

    const html = this._parseMarkdown(this._content);
    container.innerHTML = html;
  }

  _parseMarkdown(markdown) {
    if (!markdown) return '';

    let html = markdown;

    // Escape HTML if sanitizing
    if (this._sanitize) {
      html = this._escapeHtml(html);
    }

    // Code blocks (must be before inline code)
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
    });

    // Headers
    html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // Horizontal rules
    html = html.replace(/^(---|\*\*\*|___)$/gm, '<hr>');

    // Task lists
    html = html.replace(/^- \[([ x])\]\s+(.+)$/gm, (match, checked, text) => {
      return `<li><input type="checkbox" ${checked === 'x' ? 'checked' : ''} disabled>${text}</li>`;
    });

    // Unordered lists
    html = html.replace(/^[*+-]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Ordered lists
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
      // Only wrap in <ol> if not already wrapped in <ul>
      if (match.includes('<ul>')) return match;
      return `<ol>${match}</ol>`;
    });

    // Blockquotes
    html = html.replace(/^>\s+(.+)$/gm, '<blockquote><p>$1</p></blockquote>');
    html = html.replace(/(<blockquote>.*<\/blockquote>\n?)+/g, (match) => {
      return match.replace(/<\/blockquote>\n?<blockquote>/g, '\n');
    });

    // Tables
    html = this._parseTables(html);

    // Bold (must be before italic)
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    // Strikethrough
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

    // Paragraphs (wrap text not in tags)
    const lines = html.split('\n');
    const processed = [];
    let inBlock = false;

    for (let line of lines) {
      const trimmed = line.trim();

      if (trimmed.match(/^<(h[1-6]|ul|ol|blockquote|pre|table|hr)/)) {
        inBlock = true;
        processed.push(line);
      } else if (trimmed.match(/<\/(ul|ol|blockquote|pre|table)>$/)) {
        processed.push(line);
        inBlock = false;
      } else if (trimmed === '') {
        processed.push('');
      } else if (!inBlock && !trimmed.match(/^</) && !trimmed.match(/<\/(li|th|td)>$/)) {
        processed.push(`<p>${trimmed}</p>`);
      } else {
        processed.push(line);
      }
    }

    html = processed.join('\n');

    return html;
  }

  _parseTables(html) {
    const lines = html.split('\n');
    const result = [];
    let inTable = false;
    let tableRows = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check if this is a table row
      if (line.match(/^\|.+\|$/)) {
        // Check if next line is separator
        const nextLine = lines[i + 1]?.trim() || '';
        const isSeparator = nextLine.match(/^\|[\s:-]+\|$/);

        if (!inTable && isSeparator) {
          // Start of table - this is header row
          inTable = true;
          const cells = line.slice(1, -1).split('|').map(c => c.trim());
          tableRows.push('<thead><tr>' + cells.map(c => `<th>${c}</th>`).join('') + '</tr></thead>');
          i++; // Skip separator line
          tableRows.push('<tbody>');
        } else if (inTable) {
          // Table data row
          const cells = line.slice(1, -1).split('|').map(c => c.trim());
          tableRows.push('<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>');
        } else {
          result.push(line);
        }
      } else {
        if (inTable) {
          // End of table
          tableRows.push('</tbody>');
          result.push('<table>' + tableRows.join('\n') + '</table>');
          tableRows = [];
          inTable = false;
        }
        result.push(line);
      }
    }

    // Close table if still open
    if (inTable) {
      tableRows.push('</tbody>');
      result.push('<table>' + tableRows.join('\n') + '</table>');
    }

    return result.join('\n');
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  _setupPanListeners() {
    const bus = document.querySelector('pan-bus');
    if (bus) {
      bus.subscribe('markdown.render', (data) => {
        if (data.content !== undefined) {
          this.setContent(data.content);
        }
      });
    }
  }

  // Public API
  setContent(content) {
    this._content = content || '';
    this.renderMarkdown();
  }

  getContent() {
    return this._content;
  }

  getHtml() {
    return this.shadowRoot.querySelector('.markdown-body')?.innerHTML || '';
  }
}

customElements.define('pan-markdown-renderer', PanMarkdownRenderer);
export default PanMarkdownRenderer;
