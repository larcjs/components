#!/usr/bin/env node
/**
 * Standardize JSDoc comments in all component files
 * 
 * This script:
 * 1. Scans all component .mjs files
 * 2. Extracts existing documentation
 * 3. Converts to standardized JSDoc format
 * 4. Updates the files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMPONENTS_DIR = path.join(__dirname, '../src/components');

/**
 * Parse existing component documentation
 */
function parseExistingDoc(content) {
  const lines = content.split('\n');
  const doc = {
    tag: '',
    description: '',
    attributes: [],
    topics: { subscribes: [], publishes: [] },
    slots: [],
    methods: [],
    examples: []
  };

  // Extract tag name from first line or class name
  const tagMatch = content.match(/\/\/\s*<([\w-]+)>/);
  if (tagMatch) {
    doc.tag = tagMatch[1];
  } else {
    const classMatch = content.match(/export class (\w+) extends HTMLElement/);
    if (classMatch) {
      doc.tag = classMatch[1].replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }
  }

  // Extract description (first comment block)
  const descMatch = content.match(/\/\/\s*<[\w-]+>\s*[—-]\s*(.+)/);
  if (descMatch) {
    doc.description = descMatch[1].trim();
  }

  // Extract attributes
  const attrSection = content.match(/\/\/\s*Attributes?:\s*([\s\S]*?)(?=\/\/\s*(?:Topics?|Slots?|Usage|$))/);
  if (attrSection) {
    const attrLines = attrSection[1].split('\n');
    attrLines.forEach(line => {
      const match = line.match(/\/\/\s*-\s*(\S+):\s*(.+)/);
      if (match) {
        doc.attributes.push({
          name: match[1],
          description: match[2].trim()
        });
      }
    });
  }

  // Extract topics
  const topicsSection = content.match(/\/\/\s*Topics?:\s*([\s\S]*?)(?=\/\/\s*(?:Slots?|Usage|Data|$))/);
  if (topicsSection) {
    const topicLines = topicsSection[1].split('\n');
    topicLines.forEach(line => {
      const subMatch = line.match(/\/\/\s*-\s*Subscribes?:\s*(.+)/);
      const pubMatch = line.match(/\/\/\s*-\s*Publishes?:\s*(.+)/);
      
      if (subMatch) {
        doc.topics.subscribes.push(subMatch[1].trim());
      } else if (pubMatch) {
        doc.topics.publishes.push(pubMatch[1].trim());
      }
    });
  }

  // Extract slots
  const slotsSection = content.match(/\/\/\s*Slots?:\s*([\s\S]*?)(?=\/\/\s*(?:Methods?|Usage|$))/);
  if (slotsSection) {
    const slotLines = slotsSection[1].split('\n');
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
 * Generate standardized JSDoc comment
 */
function generateJSDoc(doc) {
  let jsdoc = '/**\n';
  jsdoc += ` * ${doc.tag} - ${doc.description}\n`;
  jsdoc += ' * \n';
  jsdoc += ' * @element ' + doc.tag + '\n';
  jsdoc += ' * @extends {HTMLElement}\n';
  jsdoc += ' * \n';

  // Attributes
  if (doc.attributes.length > 0) {
    jsdoc += ' * @attr {string} ' + doc.attributes.map(a => a.name).join(' - ') + '\n';
    doc.attributes.forEach(attr => {
      jsdoc += ` * @attr {string} ${attr.name} - ${attr.description}\n`;
    });
    jsdoc += ' * \n';
  }

  // PAN Topics
  if (doc.topics.subscribes.length > 0 || doc.topics.publishes.length > 0) {
    jsdoc += ' * @pan\n';
    doc.topics.subscribes.forEach(topic => {
      jsdoc += ` * @subscribes ${topic}\n`;
    });
    doc.topics.publishes.forEach(topic => {
      jsdoc += ` * @publishes ${topic}\n`;
    });
    jsdoc += ' * \n';
  }

  // Slots
  if (doc.slots.length > 0) {
    doc.slots.forEach(slot => {
      jsdoc += ` * @slot ${slot.name} - ${slot.description}\n`;
    });
    jsdoc += ' * \n';
  }

  jsdoc += ' * @example\n';
  jsdoc += ' * ```html\n';
  jsdoc += ` * <${doc.tag}`;
  if (doc.attributes.length > 0) {
    jsdoc += `\n *   ${doc.attributes[0].name}="value"`;
  }
  jsdoc += `></${doc.tag}>\n`;
  jsdoc += ' * ```\n';
  jsdoc += ' */\n';

  return jsdoc;
}

/**
 * Update component file with standardized JSDoc
 */
function updateComponentFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const doc = parseExistingDoc(content);
  
  if (!doc.tag) {
    console.log(`⚠️  Skipping ${path.basename(filePath)} - couldn't extract tag name`);
    return false;
  }

  // Remove old comments (everything before first import or export)
  const codeStart = content.search(/^(import|export)/m);
  if (codeStart === -1) {
    console.log(`⚠️  Skipping ${path.basename(filePath)} - no import/export found`);
    return false;
  }

  const code = content.substring(codeStart);
  const newDoc = generateJSDoc(doc);
  const newContent = newDoc + '\n' + code;

  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`✅ Updated ${path.basename(filePath)}`);
  return true;
}

/**
 * Main execution
 */
function main() {
  console.log('🔄 Standardizing JSDoc comments in component files...\n');

  const files = fs.readdirSync(COMPONENTS_DIR)
    .filter(f => f.endsWith('.mjs'))
    .map(f => path.join(COMPONENTS_DIR, f));

  let updated = 0;
  let skipped = 0;

  files.forEach(file => {
    if (updateComponentFile(file)) {
      updated++;
    } else {
      skipped++;
    }
  });

  console.log(`\n✨ Complete! Updated: ${updated}, Skipped: ${skipped}`);
}

main();
