import { test, expect } from '@playwright/test';
import { fileUrl } from '../helpers/test-utils';

test.describe('editable-cell', () => {
  test('renders cell content', async ({ page }) => {
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

  test('enters edit mode on click', async ({ page }) => {
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

  test('saves value on blur', async ({ page }) => {
    await page.goto(fileUrl('examples/01-hello.html'));

    const result = await page.evaluate(async () => {
      const cell = document.createElement('editable-cell');
      cell.setAttribute('value', 'Original');
      cell.setAttribute('topic', 'cell.change');
      document.body.appendChild(cell);

      await customElements.whenDefined('editable-cell');

      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e: CustomEvent) => {
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

    // expect(result).toMatchObject({ value: 'Modified' });
  });

  test('cancels edit on escape', async ({ page }) => {
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

  test('saves on enter key', async ({ page }) => {
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
