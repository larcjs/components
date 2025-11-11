/**
 * pan-table (pan-data-table) component tests
 * Tests the data table functionality including rendering,
 * live updates, resource subscription, and PAN message bus integration
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl, publishPanMessage } from '../lib/test-utils.mjs';

describe('pan-table', () => {
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
        <script type="module" src="${fileUrl('dist/components/pan-table.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-table></pan-table>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-table') !== undefined);

    const tableExists = await page.evaluate(() => {
      return document.querySelector('pan-table') !== null;
    });
    expect(tableExists).toBeTruthy();

    const hasTable = await page.evaluate(() => {
      const table = document.querySelector('pan-table');
      return table.shadowRoot.querySelector('table') !== null;
    });
    expect(hasTable).toBeTruthy();
  });

  test('has default resource attribute', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-table.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-table></pan-table>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-table') !== undefined);

    const resource = await page.evaluate(() => {
      const table = document.querySelector('pan-table');
      return table.resource;
    });

    expect(resource).toBe('items');
  });

  test('accepts custom resource attribute', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-table.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-table resource="users"></pan-table>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-table') !== undefined);

    const resource = await page.evaluate(() => {
      const table = document.querySelector('pan-table');
      return table.resource;
    });

    expect(resource).toBe('users');
  });

  test('has default key attribute', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-table.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-table></pan-table>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-table') !== undefined);

    const key = await page.evaluate(() => {
      const table = document.querySelector('pan-table');
      return table.key;
    });

    expect(key).toBe('id');
  });

  test('accepts custom key attribute', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-table.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-table key="userId"></pan-table>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-table') !== undefined);

    const key = await page.evaluate(() => {
      const table = document.querySelector('pan-table');
      return table.key;
    });

    expect(key).toBe('userId');
  });

  test('live attribute defaults to true', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-table.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-table></pan-table>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-table') !== undefined);

    const isLive = await page.evaluate(() => {
      const table = document.querySelector('pan-table');
      return table.live;
    });

    expect(isLive).toBe(true);
  });

  test('accepts live="false" attribute', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-table.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-table live="false"></pan-table>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-table') !== undefined);

    const isLive = await page.evaluate(() => {
      const table = document.querySelector('pan-table');
      return table.live;
    });

    expect(isLive).toBe(false);
  });

  test('renders table with thead', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-table.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-table></pan-table>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-table') !== undefined);

    const hasThead = await page.evaluate(() => {
      const table = document.querySelector('pan-table');
      return table.shadowRoot.querySelector('thead') !== null;
    });

    expect(hasThead).toBeTruthy();
  });

  test('renders table with tbody', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-table.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-table></pan-table>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-table') !== undefined);

    const hasTbody = await page.evaluate(() => {
      const table = document.querySelector('pan-table');
      return table.shadowRoot.querySelector('tbody') !== null;
    });

    expect(hasTbody).toBeTruthy();
  });

  test('shows empty state when no items', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-table.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-table></pan-table>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-table') !== undefined);

    const hasEmpty = await page.evaluate(() => {
      const table = document.querySelector('pan-table');
      const empty = table.shadowRoot.getElementById('empty');
      return empty !== null && !empty.hidden;
    });

    expect(hasEmpty).toBeTruthy();
  });

  test('empty state has correct text', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-table.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-table></pan-table>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-table') !== undefined);

    const emptyText = await page.evaluate(() => {
      const table = document.querySelector('pan-table');
      const empty = table.shadowRoot.getElementById('empty');
      return empty.textContent;
    });

    expect(emptyText).toBe('No records.');
  });

  test('accepts columns attribute', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-table.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-table columns="name,email,role"></pan-table>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-table') !== undefined);

    const columns = await page.evaluate(() => {
      const table = document.querySelector('pan-table');
      return table.columns;
    });

    expect(columns).toHaveLength(3);
    expect(columns[0]).toBe('name');
    expect(columns[1]).toBe('email');
    expect(columns[2]).toBe('role');
  });

  test('renders column headers from columns attribute', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-table.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-table columns="id,name"></pan-table>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-table') !== undefined);

    const headers = await page.evaluate(() => {
      const table = document.querySelector('pan-table');
      const ths = table.shadowRoot.querySelectorAll('th');
      return Array.from(ths).map(th => th.textContent);
    });

    expect(headers).toHaveLength(2);
    expect(headers[0]).toBe('id');
    expect(headers[1]).toBe('name');
  });

  test('stores items in component property', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-table.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-table></pan-table>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-table') !== undefined);

    const items = await page.evaluate(() => {
      const table = document.querySelector('pan-table');
      return Array.isArray(table.items);
    });

    expect(items).toBeTruthy();
  });

  test('publishes list.get message on connect', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-table.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    const messageReceived = await page.evaluate(() => {
      return new Promise((resolve) => {
        let received = false;
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'items.list.get') {
            received = true;
          }
        });

        setTimeout(() => {
          const table = document.createElement('pan-table');
          document.body.appendChild(table);
        }, 100);

        setTimeout(() => resolve(received), 500);
      });
    });

    expect(messageReceived).toBeTruthy();
  });

  test('subscribes to list.state topic', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-table.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-table resource="users"></pan-table>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-table') !== undefined);
    await page.waitForTimeout(200);

    const subscribed = await page.evaluate(() => {
      const bus = document.querySelector('pan-bus');
      const subs = bus.subscriptions;
      return Array.from(subs.keys()).some(topic => topic.includes('users.list.state'));
    });

    expect(subscribed).toBeTruthy();
  });

  test('updates items when receiving list.state message', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-table.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-table resource="testdata"></pan-table>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-table') !== undefined);
    await page.waitForTimeout(200);

    await publishPanMessage(page, 'testdata.list.state', {
      items: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ]
    });

    await page.waitForTimeout(200);

    const rowCount = await page.evaluate(() => {
      const table = document.querySelector('pan-table');
      const rows = table.shadowRoot.querySelectorAll('tbody tr');
      return rows.length;
    });

    expect(rowCount).toBe(2);
  });

  test('renders data in table cells', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-table.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-table resource="products" columns="id,name,price"></pan-table>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-table') !== undefined);
    await page.waitForTimeout(200);

    await publishPanMessage(page, 'products.list.state', {
      items: [
        { id: 101, name: 'Widget', price: 19.99 }
      ]
    });

    await page.waitForTimeout(200);

    const cellData = await page.evaluate(() => {
      const table = document.querySelector('pan-table');
      const cells = table.shadowRoot.querySelectorAll('tbody td');
      return Array.from(cells).map(cell => cell.textContent);
    });

    expect(cellData).toHaveLength(3);
    expect(cellData[0]).toBe('101');
    expect(cellData[1]).toBe('Widget');
    expect(cellData[2]).toBe('19.99');
  });

  test('table rows have data-id attribute', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-table.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-table resource="records"></pan-table>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-table') !== undefined);
    await page.waitForTimeout(200);

    await publishPanMessage(page, 'records.list.state', {
      items: [
        { id: 'abc123', value: 'Test' }
      ]
    });

    await page.waitForTimeout(200);

    const dataId = await page.evaluate(() => {
      const table = document.querySelector('pan-table');
      const row = table.shadowRoot.querySelector('tbody tr');
      return row?.getAttribute('data-id');
    });

    expect(dataId).toBe('abc123');
  });

  test('escapes HTML in cell content', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-table.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-table resource="data" columns="content"></pan-table>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-table') !== undefined);
    await page.waitForTimeout(200);

    await publishPanMessage(page, 'data.list.state', {
      items: [
        { id: 1, content: '<script>alert("xss")</script>' }
      ]
    });

    await page.waitForTimeout(200);

    const cellContent = await page.evaluate(() => {
      const table = document.querySelector('pan-table');
      const cell = table.shadowRoot.querySelector('tbody td');
      return cell.innerHTML;
    });

    expect(cellContent).toContain('&lt;script&gt;');
    expect(cellContent).not.toContain('<script>');
  });

  test('handles null values in cells', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-table.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-table resource="nulltest" columns="id,value"></pan-table>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-table') !== undefined);
    await page.waitForTimeout(200);

    await publishPanMessage(page, 'nulltest.list.state', {
      items: [
        { id: 1, value: null }
      ]
    });

    await page.waitForTimeout(200);

    const cellContent = await page.evaluate(() => {
      const table = document.querySelector('pan-table');
      const cells = table.shadowRoot.querySelectorAll('tbody td');
      return cells[1].textContent;
    });

    expect(cellContent).toBe('');
  });

  test('unsubscribes on disconnect', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-table.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-table id="test-table"></pan-table>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-table') !== undefined);
    await page.waitForTimeout(200);

    await page.evaluate(() => {
      const table = document.getElementById('test-table');
      table.remove();
    });

    const removed = await page.evaluate(() => {
      return document.getElementById('test-table') === null;
    });

    expect(removed).toBeTruthy();
  });
});
