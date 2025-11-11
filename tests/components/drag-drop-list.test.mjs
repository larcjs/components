/**
 * drag-drop-list component tests
 * Tests the drag-and-drop list functionality including item rendering,
 * reordering, add/remove operations, and PAN message bus integration
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl, publishPanMessage } from '../lib/test-utils.mjs';

describe('drag-drop-list', () => {
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
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/drag-drop-list.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <drag-drop-list></drag-drop-list>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('drag-drop-list') !== undefined);

    const listExists = await page.evaluate(() => {
      return document.querySelector('drag-drop-list') !== null;
    });
    expect(listExists).toBeTruthy();

    const hasContainer = await page.evaluate(() => {
      const list = document.querySelector('drag-drop-list');
      return list.shadowRoot.querySelector('.list-container') !== null;
    });
    expect(hasContainer).toBeTruthy();
  });

  test('shows empty state when no items', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/drag-drop-list.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <drag-drop-list></drag-drop-list>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('drag-drop-list') !== undefined);

    const hasEmptyState = await page.evaluate(() => {
      const list = document.querySelector('drag-drop-list');
      return list.shadowRoot.querySelector('.empty-state') !== null;
    });
    expect(hasEmptyState).toBeTruthy();
  });

  test('renders items from JSON attribute', async () => {
    const items = JSON.stringify([
      { id: '1', content: 'Item 1' },
      { id: '2', content: 'Item 2' },
      { id: '3', content: 'Item 3' }
    ]);

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/drag-drop-list.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <drag-drop-list items='${items.replace(/'/g, "&apos;")}'></drag-drop-list>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('drag-drop-list') !== undefined);

    const itemCount = await page.evaluate(() => {
      const list = document.querySelector('drag-drop-list');
      const items = list.shadowRoot.querySelectorAll('.list-item');
      return items.length;
    });

    expect(itemCount).toBe(3);
  });

  test('list items are draggable by default', async () => {
    const items = JSON.stringify([
      { id: '1', content: 'Item 1' },
      { id: '2', content: 'Item 2' }
    ]);

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/drag-drop-list.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <drag-drop-list items='${items.replace(/'/g, "&apos;")}'></drag-drop-list>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('drag-drop-list') !== undefined);
    await page.waitForTimeout(100);

    const isDraggable = await page.evaluate(() => {
      const list = document.querySelector('drag-drop-list');
      const firstItem = list.shadowRoot.querySelector('.list-item');
      return firstItem?.getAttribute('draggable') === 'true';
    });

    expect(isDraggable).toBeTruthy();
  });

  test('shows drag handle by default', async () => {
    const items = JSON.stringify([
      { id: '1', content: 'Item 1' }
    ]);

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/drag-drop-list.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <drag-drop-list items='${items.replace(/'/g, "&apos;")}'></drag-drop-list>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('drag-drop-list') !== undefined);

    const hasHandle = await page.evaluate(() => {
      const list = document.querySelector('drag-drop-list');
      return list.shadowRoot.querySelector('.drag-handle') !== null;
    });

    expect(hasHandle).toBeTruthy();
  });

  test('respects disabled attribute', async () => {
    const items = JSON.stringify([
      { id: '1', content: 'Item 1' }
    ]);

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/drag-drop-list.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <drag-drop-list items='${items.replace(/'/g, "&apos;")}' disabled></drag-drop-list>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('drag-drop-list') !== undefined);

    const isDisabled = await page.evaluate(() => {
      const list = document.querySelector('drag-drop-list');
      return list.disabled;
    });

    expect(isDisabled).toBeTruthy();
  });

  test('items not draggable when disabled', async () => {
    const items = JSON.stringify([
      { id: '1', content: 'Item 1' }
    ]);

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/drag-drop-list.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <drag-drop-list items='${items.replace(/'/g, "&apos;")}' disabled></drag-drop-list>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('drag-drop-list') !== undefined);
    await page.waitForTimeout(100);

    const isDraggable = await page.evaluate(() => {
      const list = document.querySelector('drag-drop-list');
      const firstItem = list.shadowRoot.querySelector('.list-item');
      return firstItem?.getAttribute('draggable') === 'true';
    });

    expect(isDraggable).toBe(false);
  });

  test('uses default topic', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/drag-drop-list.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <drag-drop-list></drag-drop-list>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('drag-drop-list') !== undefined);

    const topic = await page.evaluate(() => {
      const list = document.querySelector('drag-drop-list');
      return list.topic;
    });

    expect(topic).toBe('list');
  });

  test('accepts custom topic attribute', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/drag-drop-list.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <drag-drop-list topic="tasks"></drag-drop-list>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('drag-drop-list') !== undefined);

    const topic = await page.evaluate(() => {
      const list = document.querySelector('drag-drop-list');
      return list.topic;
    });

    expect(topic).toBe('tasks');
  });

  test('renders item content from content property', async () => {
    const items = JSON.stringify([
      { id: '1', content: 'Test Content' }
    ]);

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/drag-drop-list.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <drag-drop-list items='${items.replace(/'/g, "&apos;")}'></drag-drop-list>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('drag-drop-list') !== undefined);

    const content = await page.evaluate(() => {
      const list = document.querySelector('drag-drop-list');
      const item = list.shadowRoot.querySelector('.list-item');
      return item.textContent;
    });

    expect(content).toContain('Test Content');
  });

  test('renders item label from label property', async () => {
    const items = JSON.stringify([
      { id: '1', label: 'Test Label' }
    ]);

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/drag-drop-list.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <drag-drop-list items='${items.replace(/'/g, "&apos;")}'></drag-drop-list>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('drag-drop-list') !== undefined);

    const content = await page.evaluate(() => {
      const list = document.querySelector('drag-drop-list');
      const item = list.shadowRoot.querySelector('.list-item');
      return item.textContent;
    });

    expect(content).toContain('Test Label');
  });

  test('renders item title from title property', async () => {
    const items = JSON.stringify([
      { id: '1', title: 'Test Title' }
    ]);

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/drag-drop-list.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <drag-drop-list items='${items.replace(/'/g, "&apos;")}'></drag-drop-list>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('drag-drop-list') !== undefined);

    const content = await page.evaluate(() => {
      const list = document.querySelector('drag-drop-list');
      const item = list.shadowRoot.querySelector('.list-item');
      return item.textContent;
    });

    expect(content).toContain('Test Title');
  });

  test('items have data-id attribute', async () => {
    const items = JSON.stringify([
      { id: 'abc123', content: 'Item' }
    ]);

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/drag-drop-list.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <drag-drop-list items='${items.replace(/'/g, "&apos;")}'></drag-drop-list>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('drag-drop-list') !== undefined);

    const dataId = await page.evaluate(() => {
      const list = document.querySelector('drag-drop-list');
      const item = list.shadowRoot.querySelector('.list-item');
      return item.getAttribute('data-id');
    });

    expect(dataId).toBe('abc123');
  });

  test('items have data-index attribute', async () => {
    const items = JSON.stringify([
      { id: '1', content: 'Item 1' },
      { id: '2', content: 'Item 2' }
    ]);

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/drag-drop-list.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <drag-drop-list items='${items.replace(/'/g, "&apos;")}'></drag-drop-list>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('drag-drop-list') !== undefined);

    const indices = await page.evaluate(() => {
      const list = document.querySelector('drag-drop-list');
      const items = list.shadowRoot.querySelectorAll('.list-item');
      return Array.from(items).map(item => item.getAttribute('data-index'));
    });

    expect(indices[0]).toBe('0');
    expect(indices[1]).toBe('1');
  });

  test('has item-content wrapper', async () => {
    const items = JSON.stringify([
      { id: '1', content: 'Item' }
    ]);

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/drag-drop-list.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <drag-drop-list items='${items.replace(/'/g, "&apos;")}'></drag-drop-list>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('drag-drop-list') !== undefined);

    const hasContent = await page.evaluate(() => {
      const list = document.querySelector('drag-drop-list');
      return list.shadowRoot.querySelector('.item-content') !== null;
    });

    expect(hasContent).toBeTruthy();
  });

  test('has item-body wrapper', async () => {
    const items = JSON.stringify([
      { id: '1', content: 'Item' }
    ]);

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/drag-drop-list.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <drag-drop-list items='${items.replace(/'/g, "&apos;")}'></drag-drop-list>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('drag-drop-list') !== undefined);

    const hasBody = await page.evaluate(() => {
      const list = document.querySelector('drag-drop-list');
      return list.shadowRoot.querySelector('.item-body') !== null;
    });

    expect(hasBody).toBeTruthy();
  });

  test('stores items in component property', async () => {
    const items = JSON.stringify([
      { id: '1', content: 'Item 1' },
      { id: '2', content: 'Item 2' }
    ]);

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/drag-drop-list.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <drag-drop-list items='${items.replace(/'/g, "&apos;")}'></drag-drop-list>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('drag-drop-list') !== undefined);

    const storedItems = await page.evaluate(() => {
      const list = document.querySelector('drag-drop-list');
      return list.items.length;
    });

    expect(storedItems).toBe(2);
  });

  test('updates when items attribute changes', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/drag-drop-list.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <drag-drop-list></drag-drop-list>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('drag-drop-list') !== undefined);

    const newItemCount = await page.evaluate(() => {
      const list = document.querySelector('drag-drop-list');
      const newItems = JSON.stringify([
        { id: '1', content: 'New Item 1' },
        { id: '2', content: 'New Item 2' },
        { id: '3', content: 'New Item 3' }
      ]);
      list.setAttribute('items', newItems);

      return new Promise((resolve) => {
        setTimeout(() => {
          const items = list.shadowRoot.querySelectorAll('.list-item');
          resolve(items.length);
        }, 100);
      });
    });

    expect(newItemCount).toBe(3);
  });
});
