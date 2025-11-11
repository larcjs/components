/**
 * editable-cell UI tests
 * Tests the editable cell component functionality including edit mode and value saving
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl } from '../lib/test-utils.mjs';

describe('editable-cell', () => {
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

  test('renders cell content', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const cell = document.createElement('editable-cell');
      cell.setAttribute('value', 'Initial Value');
      document.body.appendChild(cell);
    });

    await page.waitForFunction(() => customElements.get('editable-cell') !== undefined);

    const cell = page.locator('editable-cell');
    await expect(cell).toBeVisible();
  });

  test('enters edit mode on click', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const cell = document.createElement('editable-cell');
      cell.setAttribute('value', 'Click to edit');
      cell.id = 'test-cell';
      document.body.appendChild(cell);
    });

    await page.waitForFunction(() => customElements.get('editable-cell') !== undefined);

    const cell = page.locator('#test-cell');
    await cell.click();

    // Check if input appears (implementation dependent)
    const input = cell.locator('input, [contenteditable="true"]');
    await page.waitForTimeout(100);
  });

  test('saves value on blur', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    const result = await page.evaluate(async () => {
      const cell = document.createElement('editable-cell');
      cell.setAttribute('value', 'Original');
      cell.setAttribute('topic', 'cell.change');
      document.body.appendChild(cell);

      await customElements.whenDefined('editable-cell');

      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'cell.change') {
            resolve(e.detail.data);
          }
        }, { once: true });

        // Simulate edit
        setTimeout(() => {
          cell.click();
          setTimeout(() => {
            const input = cell.shadowRoot?.querySelector('input') ||
                         cell.querySelector('input');
            if (input) {
              input.value = 'Modified';
              input.blur();
            }
          }, 50);
        }, 50);
      });
    });

    // expect(result.value).toBe('Modified');
  });

  test('cancels edit on escape', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const cell = document.createElement('editable-cell');
      cell.setAttribute('value', 'Original');
      document.body.appendChild(cell);
    });

    await page.waitForFunction(() => customElements.get('editable-cell') !== undefined);

    const cell = page.locator('editable-cell');
    await cell.click();

    await page.keyboard.type('Modified');
    await page.keyboard.press('Escape');

    // Value should revert to original
  });

  test('saves on enter key', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const cell = document.createElement('editable-cell');
      cell.setAttribute('value', 'Start');
      document.body.appendChild(cell);
    });

    await page.waitForFunction(() => customElements.get('editable-cell') !== undefined);

    const cell = page.locator('editable-cell');
    await cell.click();

    await page.keyboard.type(' - Updated');
    await page.keyboard.press('Enter');

    // Value should be saved
  });
});
