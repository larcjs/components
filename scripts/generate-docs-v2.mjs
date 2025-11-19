#!/usr/bin/env node
/**
 * Generate categorized HTML documentation from component files
 * 
 * Features:
 * - Automatic categorization based on component name patterns
 * - Rich metadata extraction
 * - Grouped navigation
 * - Enhanced examples and usage
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMPONENTS_DIR = path.join(__dirname, '../src/components');
const OUTPUT_DIR = path.join(__dirname, '../docs');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'components.html');

/**
 * Component categories based on naming patterns and purpose
 */
const CATEGORIES = {
  'Data & State': ['store', 'data-provider', 'data-connector', 'idb', 'query'],
  'Forms & Input': ['form', 'dropdown', 'date-picker', 'search-bar', 'file-upload', 'editable-cell'],
  'Data Display': ['table', 'chart', 'pagination', 'card', 'tree'],
  'Navigation': ['router', 'link', 'tabs'],
  'Dialogs & Overlays': ['modal'],
  'Layout & UI': ['theme-provider', 'theme-toggle'],
  'API & Connectivity': ['fetch', 'websocket', 'sse', 'graphql-connector', 'php-connector'],
  'Auth & Security': ['auth', 'jwt', 'security', 'validation'],
  'Content': ['markdown-editor', 'markdown-renderer'],
  'Dev Tools': ['inspector', 'forwarder'],
  'Utilities': ['worker', 'files', 'schema', 'schema-form'],
  'Specialized': ['invoice-store', 'todo-list', 'todo-provider', 'user-avatar'],
  'UI Components': ['drag-drop-list', 'x-counter']
};

/**
 * Categorize a component based on its tag name
 */
function categorizeComponent(tag) {
  const baseName = tag.replace('pan-', '');
  
  for (const [category, patterns] of Object.entries(CATEGORIES)) {
    for (const pattern of patterns) {
      if (baseName.includes(pattern) || tag.includes(pattern)) {
        return category;
      }
    }
  }
  
  return 'Other';
}

/**
 * Parse component documentation and metadata
 */
function parseComponent(content, filename) {
  const doc = {
    tag: '',
    category: '',
    description: '',
    status: 'stable',
    since: '',
    attributes: [],
    topics: { subscribes: [], publishes: [] },
    slots: [],
    methods: [],
    events: [],
    examples: [],
    related: [],
    notes: []
  };

  // Extract tag name
  const tagMatch = content.match(/\/\/\s*<([\w-]+)>|@element\s+([\w-]+)|\*\s*@component\s+([\w-]+)/);
  if (tagMatch) {
    doc.tag = tagMatch[1] || tagMatch[2] || tagMatch[3];
  }

  // Fallback: extract from class name
  if (!doc.tag) {
    const classMatch = content.match(/export class (\w+) extends HTMLElement/);
    if (classMatch) {
      doc.tag = classMatch[1].replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }
  }

  // Categorize
  if (doc.tag) {
    doc.category = categorizeComponent(doc.tag);
  }

  // Extract metadata
  const categoryMatch = content.match(/@category\s+(.+)/);
  if (categoryMatch) {
    doc.category = categoryMatch[1].trim();
  }

  const statusMatch = content.match(/@status\s+(stable|beta|experimental|deprecated)/);
  if (statusMatch) {
    doc.status = statusMatch[1];
  }

  const sinceMatch = content.match(/@since\s+([\d.]+)/);
  if (sinceMatch) {
    doc.since = sinceMatch[1];
  }

  // Extract description
  const descMatch = content.match(/\/\/\s*<[\w-]+>\s*[—-]\s*(.+)|@description\s+(.+)|\*\s*(.+?)\s*\n\s*\*\s*\n\s*\*\s*@/);
  if (descMatch) {
    doc.description = (descMatch[1] || descMatch[2] || descMatch[3] || '').trim();
  }

  // Extract attributes
  const attrRegex = /\/\/\s*-\s*(\S+):\s*(.+)|@attr(?:ibute)?\s+(?:\{([^}]+)\}\s+)?(\S+)\s+-?\s*(.+)/g;
  let attrMatch;
  while ((attrMatch = attrRegex.exec(content)) !== null) {
    doc.attributes.push({
      name: attrMatch[1] || attrMatch[4],
      type: attrMatch[3] || 'string',
      description: (attrMatch[2] || attrMatch[5] || '').trim()
    });
  }

  // Extract topics
  const subRegex = /\/\/\s*-\s*Subscribes?:\s*(.+)|@subscribes?\s+(.+)/g;
  let subMatch;
  while ((subMatch = subRegex.exec(content)) !== null) {
    doc.topics.subscribes.push((subMatch[1] || subMatch[2]).trim());
  }

  const pubRegex = /\/\/\s*-\s*Publishes?:\s*(.+)|@publishes?\s+(.+)/g;
  let pubMatch;
  while ((pubMatch = pubRegex.exec(content)) !== null) {
    doc.topics.publishes.push((pubMatch[1] || pubMatch[2]).trim());
  }

  // Extract slots
  const slotSection = content.match(/\/\/\s*Slots?:\s*([\s\S]*?)(?=\/\/\s*(?:Methods?|Topics?|Usage|$)|@)/);
  if (slotSection) {
    const slotLines = slotSection[1].split('\n');
    slotLines.forEach(line => {
      const match = line.match(/\/\/\s*-\s*(\S+):\s*(.+)/);
      if (match) {
        doc.slots.push({
          name: match[1],
          description: match[2].trim()
        });
      }
    });
  }

  // Extract related components
  const relatedMatch = content.match(/@related\s+(.+)/);
  if (relatedMatch) {
    doc.related = relatedMatch[1].split(',').map(s => s.trim());
  }

  // Extract examples
  const exampleRegex = /@example\s*\n\s*\*?\s*```(\w+)?\s*\n([\s\S]*?)```/g;
  let exampleMatch;
  while ((exampleMatch = exampleRegex.exec(content)) !== null) {
    doc.examples.push({
      language: exampleMatch[1] || 'html',
      code: exampleMatch[2].replace(/^\s*\*\s?/gm, '').trim()
    });
  }

  return doc;
}

/**
 * Generate HTML for a single component
 */
function generateComponentHTML(doc) {
  if (!doc.tag) return '';

  const statusBadge = {
    stable: '<span class="badge badge-stable">Stable</span>',
    beta: '<span class="badge badge-beta">Beta</span>',
    experimental: '<span class="badge badge-experimental">Experimental</span>',
    deprecated: '<span class="badge badge-deprecated">Deprecated</span>'
  }[doc.status] || '';

  let html = `
    <div class="component" id="${doc.tag}">
      <div class="component-header">
        <h2><code>&lt;${doc.tag}&gt;</code></h2>
        <div class="badges">
          ${statusBadge}
          ${doc.since ? `<span class="badge badge-info">Since ${doc.since}</span>` : ''}
        </div>
      </div>
      <p class="description">${doc.description || 'No description available'}</p>
  `;

  // Related components
  if (doc.related.length > 0) {
    html += `
      <div class="related">
        <strong>Related:</strong> ${doc.related.map(r => `<a href="#${r}"><code>${r}</code></a>`).join(', ')}
      </div>
    `;
  }

  // Attributes
  if (doc.attributes.length > 0) {
    html += `
      <h3>Attributes</h3>
      <table class="attr-table">
        <thead>
          <tr>
            <th>Attribute</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
    `;
    doc.attributes.forEach(attr => {
      html += `
          <tr>
            <td><code>${attr.name}</code></td>
            <td><code>${attr.type}</code></td>
            <td>${attr.description}</td>
          </tr>
      `;
    });
    html += `
        </tbody>
      </table>
    `;
  }

  // PAN Topics
  if (doc.topics.subscribes.length > 0 || doc.topics.publishes.length > 0) {
    html += `<h3>PAN Topics</h3>`;
    
    if (doc.topics.subscribes.length > 0) {
      html += `
      <h4>📥 Subscribes</h4>
      <ul class="topic-list">
      `;
      doc.topics.subscribes.forEach(topic => {
        html += `<li><code>${topic}</code></li>\n`;
      });
      html += `</ul>\n`;
    }

    if (doc.topics.publishes.length > 0) {
      html += `
      <h4>📤 Publishes</h4>
      <ul class="topic-list">
      `;
      doc.topics.publishes.forEach(topic => {
        html += `<li><code>${topic}</code></li>\n`;
      });
      html += `</ul>\n`;
    }
  }

  // Slots
  if (doc.slots.length > 0) {
    html += `
      <h3>Slots</h3>
      <ul class="slot-list">
    `;
    doc.slots.forEach(slot => {
      html += `<li><code>${slot.name}</code> - ${slot.description}</li>\n`;
    });
    html += `</ul>\n`;
  }

  // Examples
  if (doc.examples.length > 0) {
    html += `<h3>Examples</h3>`;
    doc.examples.forEach((ex, i) => {
      html += `<pre><code class="language-${ex.language}">${escapeHtml(ex.code)}</code></pre>`;
    });
  } else {
    // Default example
    html += `
      <h3>Example</h3>
      <pre><code class="language-html">&lt;${doc.tag}`;
    if (doc.attributes.length > 0) {
      html += `\n  ${doc.attributes[0].name}="value"`;
    }
    html += `&gt;&lt;/${doc.tag}&gt;</code></pre>
    `;
  }

  html += `</div>\n`;
  return html;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate complete HTML documentation
 */
function generateHTML(componentsByCategory) {
  // Generate navigation
  let nav = '';
  for (const [category, components] of Object.entries(componentsByCategory).sort()) {
    if (components.length === 0) continue;
    
    nav += `
      <div class="nav-category">
        <h3>${category}</h3>
        <ul>
    `;
    components.forEach(c => {
      nav += `          <li><a href="#${c.tag}"><code>&lt;${c.tag}&gt;</code></a></li>\n`;
    });
    nav += `        </ul>\n      </div>\n`;
  }

  // Generate content
  let content = '';
  for (const [category, components] of Object.entries(componentsByCategory).sort()) {
    if (components.length === 0) continue;
    
    content += `
    <div class="category-section">
      <h1 class="category-title">${category}</h1>
    `;
    components.forEach(c => {
      content += generateComponentHTML(c);
    });
    content += `</div>\n`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LARC Components Documentation</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
    }

    .container {
      display: grid;
      grid-template-columns: 300px 1fr;
      min-height: 100vh;
    }

    nav {
      background: #2c3e50;
      color: white;
      padding: 20px;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
    }

    nav > h1 {
      font-size: 22px;
      margin-bottom: 20px;
      color: white;
      border-bottom: 2px solid #3498db;
      padding-bottom: 10px;
    }

    .nav-category {
      margin-bottom: 24px;
    }

    .nav-category h3 {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #95a5a6;
      margin-bottom: 8px;
    }

    .nav-category ul {
      list-style: none;
    }

    .nav-category li {
      margin: 4px 0;
    }

    nav a {
      color: #ecf0f1;
      text-decoration: none;
      font-size: 13px;
      display: block;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background 0.2s;
    }

    nav a:hover {
      background: rgba(255,255,255,0.1);
    }

    nav code {
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 12px;
    }

    main {
      padding: 40px;
      max-width: 1200px;
    }

    .category-section {
      margin-bottom: 60px;
    }

    .category-title {
      font-size: 32px;
      color: #2c3e50;
      margin-bottom: 30px;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }

    .component {
      background: white;
      padding: 30px;
      margin-bottom: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .component-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    h2 {
      color: #2c3e50;
      font-size: 28px;
    }

    .badges {
      display: flex;
      gap: 8px;
    }

    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-stable {
      background: #27ae60;
      color: white;
    }

    .badge-beta {
      background: #f39c12;
      color: white;
    }

    .badge-experimental {
      background: #9b59b6;
      color: white;
    }

    .badge-deprecated {
      background: #e74c3c;
      color: white;
    }

    .badge-info {
      background: #3498db;
      color: white;
    }

    h3 {
      color: #34495e;
      margin-top: 24px;
      margin-bottom: 12px;
      font-size: 20px;
      border-bottom: 2px solid #3498db;
      padding-bottom: 4px;
    }

    h4 {
      color: #555;
      margin-top: 16px;
      margin-bottom: 8px;
      font-size: 16px;
    }

    .description {
      color: #666;
      font-size: 16px;
      margin-bottom: 20px;
      line-height: 1.7;
    }

    .related {
      background: #f8f9fa;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 20px;
      font-size: 14px;
    }

    .related a {
      color: #3498db;
      text-decoration: none;
    }

    .related a:hover {
      text-decoration: underline;
    }

    code {
      background: #f8f9fa;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 14px;
      color: #e74c3c;
    }

    pre {
      background: #2c3e50;
      color: #ecf0f1;
      padding: 16px;
      border-radius: 4px;
      overflow-x: auto;
      margin: 12px 0;
    }

    pre code {
      background: none;
      color: #ecf0f1;
      padding: 0;
    }

    .attr-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
    }

    .attr-table th,
    .attr-table td {
      text-align: left;
      padding: 10px;
      border-bottom: 1px solid #ddd;
    }

    .attr-table th {
      background: #f8f9fa;
      font-weight: 600;
      color: #2c3e50;
    }

    .attr-table tr:hover {
      background: #f8f9fa;
    }

    .topic-list,
    .slot-list {
      list-style: none;
      padding-left: 0;
    }

    .topic-list li,
    .slot-list li {
      padding: 6px 0;
      border-bottom: 1px solid #ecf0f1;
    }

    .topic-list li:last-child,
    .slot-list li:last-child {
      border-bottom: none;
    }

    @media (max-width: 768px) {
      .container {
        grid-template-columns: 1fr;
      }

      nav {
        position: relative;
        height: auto;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <nav>
      <h1>LARC Components</h1>
      ${nav}
    </nav>

    <main>
      ${content}
    </main>
  </div>
</body>
</html>
`;
}

/**
 * Main execution
 */
function main() {
  console.log('📚 Generating categorized component documentation...\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Read all component files
  const files = fs.readdirSync(COMPONENTS_DIR)
    .filter(f => f.endsWith('.mjs'))
    .sort();

  const componentsByCategory = {};

  files.forEach(file => {
    const filePath = path.join(COMPONENTS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const doc = parseComponent(content, file);
    
    if (doc.tag) {
      if (!componentsByCategory[doc.category]) {
        componentsByCategory[doc.category] = [];
      }
      componentsByCategory[doc.category].push(doc);
      console.log(`✅ Parsed ${file} -> <${doc.tag}> [${doc.category}]`);
    } else {
      console.log(`⚠️  Skipped ${file} - no tag found`);
    }
  });

  // Sort components within each category
  for (const category of Object.keys(componentsByCategory)) {
    componentsByCategory[category].sort((a, b) => a.tag.localeCompare(b.tag));
  }

  // Generate HTML
  const html = generateHTML(componentsByCategory);
  fs.writeFileSync(OUTPUT_FILE, html, 'utf8');

  const totalComponents = Object.values(componentsByCategory).reduce((sum, arr) => sum + arr.length, 0);
  
  console.log(`\n✨ Documentation generated: ${OUTPUT_FILE}`);
  console.log(`📊 Total components: ${totalComponents}`);
  console.log(`📁 Categories: ${Object.keys(componentsByCategory).length}`);
  console.log('\nComponents by category:');
  Object.entries(componentsByCategory).sort().forEach(([cat, comps]) => {
    console.log(`  ${cat}: ${comps.length}`);
  });
}

main();
