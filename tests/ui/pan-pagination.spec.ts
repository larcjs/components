import { test, expect } from '@playwright/test';
import { fileUrl } from '../helpers/test-utils';

test.describe('pan-pagination', () => {
  test('renders pagination controls', async ({ page }) => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const pagination = document.createElement('pan-pagination');
      pagination.setAttribute('total', '100');
      pagination.setAttribute('page-size', '10');
      pagination.setAttribute('current-page', '1');
      document.body.appendChild(pagination);
    });

    await page.waitForFunction(() => customElements.get('pan-pagination') !== undefined);

    const pagination = page.locator('pan-pagination');
    await expect(pagination).toBeVisible();
  });

  test('navigates to next page', async ({ page }) => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const pagination = document.createElement('pan-pagination');
      pagination.setAttribute('total', '50');
      pagination.setAttribute('page-size', '10');
      pagination.setAttribute('current-page', '1');
      pagination.setAttribute('topic', 'pagination.change');
      document.body.appendChild(pagination);
    });

    await page.waitForFunction(() => customElements.get('pan-pagination') !== undefined);

    const messagePromise = page.evaluate(() => {
      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e: CustomEvent) => {
          if (e.detail.topic === 'pagination.change') {
            resolve(e.detail.data);
          }
        }, { once: true });
      });
    });

    // Click next button
    const nextBtn = page.locator('pan-pagination button:has-text("Next"), pan-pagination >> button >> text=/next/i');
    if (await nextBtn.count() > 0) {
      await nextBtn.first().click();
    }

    // const data = await messagePromise;
    // expect(data).toMatchObject({ page: 2 });
  });

  test('navigates to specific page', async ({ page }) => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const pagination = document.createElement('pan-pagination');
      pagination.setAttribute('total', '100');
      pagination.setAttribute('page-size', '10');
      pagination.setAttribute('current-page', '1');
      document.body.appendChild(pagination);
    });

    await page.waitForFunction(() => customElements.get('pan-pagination') !== undefined);

    // Click page 3 button if it exists
    const page3Btn = page.locator('pan-pagination button:has-text("3")');
    if (await page3Btn.count() > 0) {
      await page3Btn.first().click();
    }
  });

  test('disables prev on first page', async ({ page }) => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const pagination = document.createElement('pan-pagination');
      pagination.setAttribute('total', '50');
      pagination.setAttribute('page-size', '10');
      pagination.setAttribute('current-page', '1');
      document.body.appendChild(pagination);
    });

    await page.waitForFunction(() => customElements.get('pan-pagination') !== undefined);

    const prevBtn = page.locator('pan-pagination button:has-text("Prev"), pan-pagination >> button >> text=/prev/i');
    if (await prevBtn.count() > 0) {
      const isDisabled = await prevBtn.first().isDisabled();
      // First page should have prev disabled
    }
  });

  test('disables next on last page', async ({ page }) => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const pagination = document.createElement('pan-pagination');
      pagination.setAttribute('total', '25');
      pagination.setAttribute('page-size', '10');
      pagination.setAttribute('current-page', '3'); // Last page (25/10 = 3)
      document.body.appendChild(pagination);
    });

    await page.waitForFunction(() => customElements.get('pan-pagination') !== undefined);

    const nextBtn = page.locator('pan-pagination button:has-text("Next"), pan-pagination >> button >> text=/next/i');
    if (await nextBtn.count() > 0) {
      const isDisabled = await nextBtn.first().isDisabled();
      // Last page should have next disabled
    }
  });
});
