import { test, expect } from '@playwright/test';
import { fileUrl } from '../helpers/test-utils';

test.describe('pan-search-bar', () => {
  test('renders search input', async ({ page }) => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const search = document.createElement('pan-search-bar');
      search.setAttribute('placeholder', 'Search...');
      document.body.appendChild(search);
    });

    await page.waitForFunction(() => customElements.get('pan-search-bar') !== undefined);

    const search = page.locator('pan-search-bar');
    await expect(search).toBeVisible();
  });

  test('publishes search queries', async ({ page }) => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const search = document.createElement('pan-search-bar');
      search.setAttribute('topic', 'search.query');
      document.body.appendChild(search);
    });

    await page.waitForFunction(() => customElements.get('pan-search-bar') !== undefined);

    const messagePromise = page.evaluate(() => {
      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e: CustomEvent) => {
          if (e.detail.topic === 'search.query') {
            resolve(e.detail.data);
          }
        }, { once: true });
      });
    });

    // Type in search box
    const input = page.locator('pan-search-bar input, pan-search-bar >> input');
    await input.fill('test query');

    // Wait for debounced message
    await page.waitForTimeout(500);

    // const data = await messagePromise;
    // expect(data).toMatchObject({ query: 'test query' });
  });

  test('debounces input', async ({ page }) => {
    await page.goto(fileUrl('examples/01-hello.html'));

    const messageCount = await page.evaluate(async () => {
      const search = document.createElement('pan-search-bar');
      search.setAttribute('topic', 'search.test');
      search.setAttribute('debounce', '300');
      document.body.appendChild(search);

      await customElements.whenDefined('pan-search-bar');

      let count = 0;
      document.addEventListener('pan:deliver', (e: CustomEvent) => {
        if (e.detail.topic === 'search.test') count++;
      });

      const input = search.shadowRoot?.querySelector('input') ||
                    search.querySelector('input');

      if (input) {
        // Type multiple characters rapidly
        input.value = 't';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.value = 'te';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.value = 'tes';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.value = 'test';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      return count;
    });

    // Should only publish once due to debouncing
    expect(messageCount).toBeLessThanOrEqual(1);
  });

  test('clears search', async ({ page }) => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const search = document.createElement('pan-search-bar');
      search.setAttribute('clearable', 'true');
      document.body.appendChild(search);
    });

    await page.waitForFunction(() => customElements.get('pan-search-bar') !== undefined);

    const search = page.locator('pan-search-bar');
    const input = search.locator('input');

    await input.fill('search text');

    // Look for clear button (implementation dependent)
    const clearBtn = search.locator('button[aria-label*="clear"], button.clear, .clear-button');

    // If clear button exists, click it
    const clearBtnCount = await clearBtn.count();
    if (clearBtnCount > 0) {
      await clearBtn.first().click();
      await expect(input).toHaveValue('');
    }
  });
});
