#!/usr/bin/env node
/**
 * Generate HTML documentation from JSDoc comments
 * 
 * Reads all component .mjs files and generates a single-page HTML documentation
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
 * Parse JSDoc from component file
 */
function parseJSDoc(content) {
  const doc = {
    tag: '',
    description: '',
    attributes: [],
    topics: { subscribes: [], publishes: [] },
    slots: [],
    examples: []
  };

  // Extract tag name
  const tagMatch = content.match(/\/\/\s*<([\w-]+)>|@element\s+([\w-]+)/);
  if (tagMatch) {
    doc.tag = tagMatch[1] || tagMatch[2];
  }

  // If no tag from comment, extract from class name
  if (!doc.tag) {
    const classMatch = content.match(/export class (\w+) extends HTMLElement/);
    if (classMatch) {
      doc.tag = classMatch[1].replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }
  }

  // Extract description
  const descMatch = content.match(/\/\/\s*<[\w-]+>\s*[—-]\s*(.+)|@element\s+[\w-]+\s*\n\s*\*\s*@extends[^\n]*\n\s*\*\s*\n\s*\*\s*(.+)/);
  if (descMatch) {
    doc.description = (descMatch[1] || descMatch[2] || '').trim();
  }

  // Extract attributes
  const attrRegex = /\/\/\s*-\s*(\S+):\s*(.+)|@attr\s+\{[^}]+\}\s+(\S+)\s+-\s+(.+)/g;
  let attrMatch;
  while ((attrMatch = attrRegex.exec(content)) !== null) {
    doc.attributes.push({
      name: attrMatch[1] || attrMatch[3],
      description: (attrMatch[2] || attrMatch[4] || '').trim()
    });
  }

  // Extract topics
  const subRegex = /\/\/\s*-\s*Subscribes?:\s*(.+)|@subscribes\s+(.+)/g;
  let subMatch;
  while ((subMatch = subRegex.exec(content)) !== null) {
    doc.topics.subscribes.push((subMatch[1] || subMatch[2]).trim());
  }

  const pubRegex = /\/\/\s*-\s*Publishes?:\s*(.+)|@publishes\s+(.+)/g;
  let pubMatch;
  while ((pubMatch = pubRegex.exec(content)) !== null) {
    doc.topics.publishes.push((pubMatch[1] || pubMatch[2]).trim());
  }

  // Extract slots
  const slotRegex = /\/\/\s*-\s*(\w+):\s*(.+)|@slot\s+(\w+)\s+-\s+(.+)/g;
  let slotMatch;
  const slotSection = content.match(/\/\/\s*Slots?:\s*([\s\S]*?)(?=\/\/\s*(?:Methods?|Usage|$)|@)/);
  if (slotSection) {
    const slotContent = slotSection[1];
    const slotLines = slotContent.split('\n');
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

  return doc;
}

/**
 * Generate HTML for a single component
 */
function generateComponentHTML(doc) {
  if (!doc.tag) return '';

  let html = `
    <div class="component" id="${doc.tag}">
      <h2><code>&lt;${doc.tag}&gt;</code></h2>
      <p class="description">${doc.description || 'No description available'}</p>
  `;

  // Attributes
  if (doc.attributes.length > 0) {
    html += `
      <h3>Attributes</h3>
      <table class="attr-table">
        <thead>
          <tr>
            <th>Attribute</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
    `;
    doc.attributes.forEach(attr => {
      html += `
          <tr>
            <td><code>${attr.name}</code></td>
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
      <h4>Subscribes</h4>
      <ul class="topic-list">
      `;
      doc.topics.subscribes.forEach(topic => {
        html += `<li><code>${topic}</code></li>\n`;
      });
      html += `</ul>\n`;
    }

    if (doc.topics.publishes.length > 0) {
      html += `
      <h4>Publishes</h4>
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

  // Example
  html += `
      <h3>Example</h3>
      <pre><code class="language-html">&lt;${doc.tag}`;
  if (doc.attributes.length > 0) {
    html += `\n  ${doc.attributes[0].name}="value"`;
  }
  html += `&gt;&lt;/${doc.tag}&gt;</code></pre>
    </div>
  `;

  return html;
}

/**
 * Generate complete HTML documentation
 */
function generateHTML(components) {
  const nav = components.map(c => 
    `<li><a href="#${c.tag}">&lt;${c.tag}&gt;</a></li>`
  ).join('\n        ');

  const content = components.map(c => generateComponentHTML(c)).join('\n');

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
      grid-template-columns: 280px 1fr;
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

    nav h1 {
      font-size: 20px;
      margin-bottom: 20px;
      color: white;
    }

    nav ul {
      list-style: none;
    }

    nav li {
      margin: 8px 0;
    }

    nav a {
      color: #ecf0f1;
      text-decoration: none;
      font-size: 14px;
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
      font-size: 13px;
    }

    main {
      padding: 40px;
      max-width: 1200px;
    }

    .component {
      background: white;
      padding: 30px;
      margin-bottom: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    h2 {
      color: #2c3e50;
      margin-bottom: 10px;
      font-size: 28px;
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
      <ul>
        ${nav}
      </ul>
    </nav>

    <main>
      <h1 style="margin-bottom: 30px;">Component Documentation</h1>
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
  console.log('📚 Generating component documentation...\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Read all component files
  const files = fs.readdirSync(COMPONENTS_DIR)
    .filter(f => f.endsWith('.mjs'))
    .sort();

  const components = [];

  files.forEach(file => {
    const filePath = path.join(COMPONENTS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const doc = parseJSDoc(content);
    
    if (doc.tag) {
      components.push(doc);
      console.log(`✅ Parsed ${file} -> <${doc.tag}>`);
    } else {
      console.log(`⚠️  Skipped ${file} - no tag found`);
    }
  });

  // Generate HTML
  const html = generateHTML(components);
  fs.writeFileSync(OUTPUT_FILE, html, 'utf8');

  console.log(`\n✨ Documentation generated: ${OUTPUT_FILE}`);
  console.log(`📊 Total components documented: ${components.length}`);
}

main();
