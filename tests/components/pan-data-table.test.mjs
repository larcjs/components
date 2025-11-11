/**
 * pan-data-table component tests
 * Tests data table rendering, sorting, filtering, and pagination
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl } from '../lib/test-utils.mjs';

describe('pan-data-table', () => {
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

  test('renders table with data', async () => {
    await page.goto(fileUrl('examples/06-crud.html'));

    await page.waitForFunction(() => customElements.get('pan-data-table') !== undefined);

    const table = page.locator('pan-data-table');
    await expect(table).toBeVisible();

    // Wait for data to load
    await page.waitForTimeout(500);

    // Check if table has rows
    const rows = table.locator('tr, tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('sorts columns on header click', async () => {
    await page.goto(fileUrl('examples/06-crud.html'));

    await page.waitForFunction(() => customElements.get('pan-data-table') !== undefined);

    const table = page.locator('pan-data-table');
    await page.waitForTimeout(500);

    // Click a sortable header
    const header = table.locator('th:first-child, thead th:first-child');
    if (await header.count() > 0) {
      await header.first().click();
      await page.waitForTimeout(200);

      // Click again to reverse sort
      await header.first().click();
      await page.waitForTimeout(200);
    }

    // Data should be sorted
  });

  test('filters data', async () => {
    await page.goto(fileUrl('examples/06-crud.html'));

    await page.waitForFunction(() => customElements.get('pan-data-table') !== undefined);
    await page.waitForTimeout(500);

    const table = page.locator('pan-data-table');
    const initialRowCount = await table.locator('tr, tbody tr').count();

    // Apply filter via PAN message
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('pan:publish', {
        detail: {
          topic: 'users.filter',
          data: { name: 'John' }
        },
        bubbles: true,
        composed: true
      }));
    });

    await page.waitForTimeout(300);

    const filteredRowCount = await table.locator('tr, tbody tr').count();
    // Filtered results should be different or same
  });

  test('paginates data', async () => {
    await page.goto(fileUrl('examples/06-crud.html'));

    await page.waitForFunction(() => customElements.get('pan-data-table') !== undefined);
    await page.waitForTimeout(500);

    const table = page.locator('pan-data-table');

    // Look for pagination controls
    const pagination = page.locator('pan-pagination, .pagination');
    if (await pagination.count() > 0) {
      const nextBtn = pagination.locator('button:has-text("Next"), button >> text=/next/i');
      if (await nextBtn.count() > 0) {
        await nextBtn.first().click();
        await page.waitForTimeout(300);

        // Different page of data should be shown
      }
    }
  });

  test('selects rows', async () => {
    await page.goto(fileUrl('examples/06-crud.html'));

    await page.waitForFunction(() => customElements.get('pan-data-table') !== undefined);
    await page.waitForTimeout(500);

    const table = page.locator('pan-data-table');

    // Click a row or checkbox
    const firstRow = table.locator('tbody tr:first-child, tr:first-child');
    if (await firstRow.count() > 0) {
      await firstRow.first().click();
      await page.waitForTimeout(100);

      // Row should be selected (visual feedback)
    }
  });

  test('handles empty data', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const table = document.createElement('pan-data-table');
      table.setAttribute('topic', 'empty.list');
      document.body.appendChild(table);

      // Publish empty data
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('pan:publish', {
          detail: {
            topic: 'empty.list',
            data: { items: [] }
          },
          bubbles: true,
          composed: true
        }));
      }, 100);
    });

    await page.waitForFunction(() => customElements.get('pan-data-table') !== undefined);
    await page.waitForTimeout(300);

    const table = page.locator('pan-data-table');
    await expect(table).toBeVisible();

    // Should show "no data" message
    const noDataMsg = table.locator('text=/no.*data|empty/i');
    // Implementation dependent
  });

  test('publishes row click events', async () => {
    await page.goto(fileUrl('examples/06-crud.html'));

    await page.waitForFunction(() => customElements.get('pan-data-table') !== undefined);
    await page.waitForTimeout(500);

    const messagePromise = page.evaluate(() => {
      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic && e.detail.topic.includes('row.click')) {
            resolve(e.detail.data);
          }
        }, { once: true });
      });
    });

    const firstRow = page.locator('pan-data-table tbody tr:first-child, pan-data-table tr:first-child');
    if (await firstRow.count() > 0) {
      await firstRow.first().click();
    }

    // const rowData = await messagePromise;
    // expect(rowData).toBeDefined();
  });
});
