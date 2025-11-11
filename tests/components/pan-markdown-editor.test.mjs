/**
 * pan-markdown-editor component tests
 * Tests the markdown editor functionality including toolbar actions,
 * input handling, preview mode, and PAN message bus integration
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl, publishPanMessage } from '../lib/test-utils.mjs';

describe('pan-markdown-editor', () => {
  let browser, page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  test('loads and renders correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-editor.js')}"></script>
      </head>
      <body>
        <pan-markdown-editor></pan-markdown-editor>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-editor') !== undefined);

    const editorExists = await page.evaluate(() => {
      return document.querySelector('pan-markdown-editor') !== null;
    });
    expect(editorExists).toBeTruthy();

    // Check shadow DOM contains textarea
    const hasTextarea = await page.evaluate(() => {
      const editor = document.querySelector('pan-markdown-editor');
      return editor.shadowRoot.querySelector('.editor-textarea') !== null;
    });
    expect(hasTextarea).toBeTruthy();
  });

  test('accepts and displays initial value attribute', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-editor.js')}"></script>
      </head>
      <body>
        <pan-markdown-editor value="# Hello World"></pan-markdown-editor>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-editor') !== undefined);

    const textareaValue = await page.evaluate(() => {
      const editor = document.querySelector('pan-markdown-editor');
      const textarea = editor.shadowRoot.querySelector('.editor-textarea');
      return textarea.value;
    });

    expect(textareaValue).toBe('# Hello World');
  });

  test('updates value through public API', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-editor.js')}"></script>
      </head>
      <body>
        <pan-markdown-editor></pan-markdown-editor>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-editor') !== undefined);

    const newValue = await page.evaluate(() => {
      const editor = document.querySelector('pan-markdown-editor');
      editor.setValue('## Test Content');
      return editor.getValue();
    });

    expect(newValue).toBe('## Test Content');
  });

  test('bold toolbar action wraps selection', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-editor.js')}"></script>
      </head>
      <body>
        <pan-markdown-editor value="Hello World"></pan-markdown-editor>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-editor') !== undefined);

    const result = await page.evaluate(() => {
      const editor = document.querySelector('pan-markdown-editor');
      const textarea = editor.shadowRoot.querySelector('.editor-textarea');

      // Select "Hello"
      textarea.setSelectionRange(0, 5);

      // Click bold button
      const boldBtn = editor.shadowRoot.querySelector('[data-action="bold"]');
      boldBtn.click();

      return textarea.value;
    });

    expect(result).toBe('**Hello** World');
  });

  test('italic toolbar action wraps selection', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-editor.js')}"></script>
      </head>
      <body>
        <pan-markdown-editor value="Hello World"></pan-markdown-editor>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-editor') !== undefined);

    const result = await page.evaluate(() => {
      const editor = document.querySelector('pan-markdown-editor');
      const textarea = editor.shadowRoot.querySelector('.editor-textarea');

      textarea.setSelectionRange(6, 11);

      const italicBtn = editor.shadowRoot.querySelector('[data-action="italic"]');
      italicBtn.click();

      return textarea.value;
    });

    expect(result).toBe('Hello *World*');
  });

  test('heading toolbar actions prefix line', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-editor.js')}"></script>
      </head>
      <body>
        <pan-markdown-editor value="Title"></pan-markdown-editor>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-editor') !== undefined);

    const result = await page.evaluate(() => {
      const editor = document.querySelector('pan-markdown-editor');
      const h1Btn = editor.shadowRoot.querySelector('[data-action="h1"]');
      h1Btn.click();
      return editor.getValue();
    });

    expect(result).toBe('# Title');
  });

  test('updates word and character count', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-editor.js')}"></script>
      </head>
      <body>
        <pan-markdown-editor></pan-markdown-editor>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-editor') !== undefined);

    const counts = await page.evaluate(() => {
      const editor = document.querySelector('pan-markdown-editor');
      editor.setValue('Hello World Test');

      const wordCount = editor.shadowRoot.querySelector('.word-count').textContent;
      const charCount = editor.shadowRoot.querySelector('.char-count').textContent;

      return { wordCount, charCount };
    });

    expect(counts.wordCount).toBe('3 words');
    expect(counts.charCount).toBe('16 characters');
  });

  test('toggles preview mode', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-editor.js')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-renderer.js')}"></script>
      </head>
      <body>
        <pan-markdown-editor></pan-markdown-editor>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-editor') !== undefined);

    const hasPreview = await page.evaluate(() => {
      const editor = document.querySelector('pan-markdown-editor');

      // Click preview button
      const previewBtn = editor.shadowRoot.querySelector('[data-action="preview"]');
      previewBtn.click();

      // Check for preview pane
      return editor.shadowRoot.querySelector('.preview-pane') !== null;
    });

    expect(hasPreview).toBeTruthy();
  });

  test('handles tab key to insert spaces', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-editor.js')}"></script>
      </head>
      <body>
        <pan-markdown-editor></pan-markdown-editor>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-editor') !== undefined);

    const result = await page.evaluate(() => {
      const editor = document.querySelector('pan-markdown-editor');
      const textarea = editor.shadowRoot.querySelector('.editor-textarea');

      textarea.focus();

      // Simulate Tab key press
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        code: 'Tab',
        bubbles: true,
        cancelable: true
      });
      textarea.dispatchEvent(event);

      return textarea.value;
    });

    expect(result).toBe('  ');
  });

  test('creates unordered list items', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-editor.js')}"></script>
      </head>
      <body>
        <pan-markdown-editor></pan-markdown-editor>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-editor') !== undefined);

    const result = await page.evaluate(() => {
      const editor = document.querySelector('pan-markdown-editor');
      const ulBtn = editor.shadowRoot.querySelector('[data-action="ul"]');
      ulBtn.click();
      return editor.getValue();
    });

    expect(result).toBe('* ');
  });

  test('creates ordered list items', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-editor.js')}"></script>
      </head>
      <body>
        <pan-markdown-editor></pan-markdown-editor>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-editor') !== undefined);

    const result = await page.evaluate(() => {
      const editor = document.querySelector('pan-markdown-editor');
      const olBtn = editor.shadowRoot.querySelector('[data-action="ol"]');
      olBtn.click();
      return editor.getValue();
    });

    expect(result).toBe('1. ');
  });

  test('creates task list items', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-editor.js')}"></script>
      </head>
      <body>
        <pan-markdown-editor></pan-markdown-editor>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-editor') !== undefined);

    const result = await page.evaluate(() => {
      const editor = document.querySelector('pan-markdown-editor');
      const taskBtn = editor.shadowRoot.querySelector('[data-action="task"]');
      taskBtn.click();
      return editor.getValue();
    });

    expect(result).toBe('- [ ] ');
  });

  test('inserts code inline', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-editor.js')}"></script>
      </head>
      <body>
        <pan-markdown-editor value="console.log"></pan-markdown-editor>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-editor') !== undefined);

    const result = await page.evaluate(() => {
      const editor = document.querySelector('pan-markdown-editor');
      const textarea = editor.shadowRoot.querySelector('.editor-textarea');

      textarea.setSelectionRange(0, 11);

      const codeBtn = editor.shadowRoot.querySelector('[data-action="code"]');
      codeBtn.click();

      return textarea.value;
    });

    expect(result).toBe('`console.log`');
  });

  test('inserts horizontal rule', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-editor.js')}"></script>
      </head>
      <body>
        <pan-markdown-editor></pan-markdown-editor>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-editor') !== undefined);

    const result = await page.evaluate(() => {
      const editor = document.querySelector('pan-markdown-editor');
      const hrBtn = editor.shadowRoot.querySelector('[data-action="hr"]');
      hrBtn.click();
      return editor.getValue();
    });

    expect(result).toContain('---');
  });

  test('has custom placeholder', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-editor.js')}"></script>
      </head>
      <body>
        <pan-markdown-editor placeholder="Enter markdown here..."></pan-markdown-editor>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-editor') !== undefined);

    const placeholder = await page.evaluate(() => {
      const editor = document.querySelector('pan-markdown-editor');
      const textarea = editor.shadowRoot.querySelector('.editor-textarea');
      return textarea.getAttribute('placeholder');
    });

    expect(placeholder).toBe('Enter markdown here...');
  });

  test('focuses textarea when focus() is called', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-editor.js')}"></script>
      </head>
      <body>
        <pan-markdown-editor></pan-markdown-editor>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-editor') !== undefined);

    const isFocused = await page.evaluate(() => {
      const editor = document.querySelector('pan-markdown-editor');
      editor.focus();

      const textarea = editor.shadowRoot.querySelector('.editor-textarea');
      return document.activeElement === editor && textarea === editor.shadowRoot.activeElement;
    });

    expect(isFocused).toBeTruthy();
  });

  test('inserts text at cursor position', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-editor.js')}"></script>
      </head>
      <body>
        <pan-markdown-editor value="Hello World"></pan-markdown-editor>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-editor') !== undefined);

    const result = await page.evaluate(() => {
      const editor = document.querySelector('pan-markdown-editor');
      const textarea = editor.shadowRoot.querySelector('.editor-textarea');

      // Position cursor after "Hello"
      textarea.setSelectionRange(5, 5);

      // Insert text
      editor.insertText(' Beautiful');

      return textarea.value;
    });

    expect(result).toBe('Hello Beautiful World');
  });
});
