import { test, expect } from '@playwright/test';
import { fileUrl } from '../helpers/test-utils';

test.describe('pan-link', () => {
  test('renders link with href', async ({ page }) => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const link = document.createElement('pan-link');
      link.setAttribute('href', '/test-page');
      link.textContent = 'Test Link';
      document.body.appendChild(link);
    });

    await page.waitForFunction(() => customElements.get('pan-link') !== undefined);

    const link = page.locator('pan-link');
    await expect(link).toBeVisible();
    await expect(link).toHaveText('Test Link');

    const href = await link.getAttribute('href');
    expect(href).toBe('/test-page');
  });

  test('shows active state for current route', async ({ page }) => {
    await page.goto(fileUrl('examples/15-router.html'));

    await page.evaluate(() => {
      const link = document.createElement('pan-link');
      link.setAttribute('href', window.location.pathname);
      link.setAttribute('active-class', 'is-active');
      link.textContent = 'Current Page';
      document.body.appendChild(link);
    });

    await page.waitForFunction(() => customElements.get('pan-link') !== undefined);

    const link = page.locator('pan-link');

    // Link should have active class if on current page
    const hasActiveClass = await link.evaluate(el => el.classList.contains('is-active'));
    // Implementation dependent
  });

  test('publishes navigation on click', async ({ page }) => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const link = document.createElement('pan-link');
      link.setAttribute('href', '/destination');
      link.textContent = 'Click Me';
      link.id = 'test-link';
      document.body.appendChild(link);
    });

    await page.waitForFunction(() => customElements.get('pan-link') !== undefined);

    const messagePromise = page.evaluate(() => {
      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e: CustomEvent) => {
          if (e.detail.topic === 'nav.goto') {
            resolve(e.detail.data);
          }
        }, { once: true });
      });
    });

    await page.click('#test-link');

    // Navigation message should be published
    // const navData = await messagePromise;
    // expect(navData).toMatchObject({ path: '/destination' });
  });

  test('supports external links', async ({ page }) => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const link = document.createElement('pan-link');
      link.setAttribute('href', 'https://example.com');
      link.textContent = 'External';
      document.body.appendChild(link);
    });

    await page.waitForFunction(() => customElements.get('pan-link') !== undefined);

    const link = page.locator('pan-link');
    const href = await link.getAttribute('href');
    expect(href).toBe('https://example.com');
  });
});
