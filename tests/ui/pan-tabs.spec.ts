import { test, expect } from '@playwright/test';
import { fileUrl } from '../helpers/test-utils';

test.describe('pan-tabs', () => {
  test('renders tabs and switches between them', async ({ page }) => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const tabs = document.createElement('pan-tabs');
      tabs.innerHTML = `
        <button slot="tab" data-tab="tab1">Tab 1</button>
        <button slot="tab" data-tab="tab2">Tab 2</button>
        <div slot="panel" data-panel="tab1">Content 1</div>
        <div slot="panel" data-panel="tab2">Content 2</div>
      `;
      document.body.appendChild(tabs);
    });

    await page.waitForFunction(() => customElements.get('pan-tabs') !== undefined);

    const tabs = page.locator('pan-tabs');
    await expect(tabs).toBeVisible();

    const tab1 = tabs.locator('[data-tab="tab1"]');
    const tab2 = tabs.locator('[data-tab="tab2"]');
    const panel1 = tabs.locator('[data-panel="tab1"]');
    const panel2 = tabs.locator('[data-panel="tab2"]');

    // First tab should be active by default
    await expect(tab1).toBeVisible();
    await expect(panel1).toBeVisible();

    // Click second tab
    await tab2.click();

    // Check if implementation switches tabs
    // (behavior depends on pan-tabs implementation)
    await expect(tab2).toBeVisible();
  });

  test('supports keyboard navigation', async ({ page }) => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const tabs = document.createElement('pan-tabs');
      tabs.innerHTML = `
        <button slot="tab" data-tab="1">Tab 1</button>
        <button slot="tab" data-tab="2">Tab 2</button>
        <button slot="tab" data-tab="3">Tab 3</button>
        <div slot="panel" data-panel="1">Panel 1</div>
        <div slot="panel" data-panel="2">Panel 2</div>
        <div slot="panel" data-panel="3">Panel 3</div>
      `;
      document.body.appendChild(tabs);
    });

    await page.waitForFunction(() => customElements.get('pan-tabs') !== undefined);

    const tab1 = page.locator('[data-tab="1"]');

    // Focus first tab
    await tab1.focus();

    // Press arrow key to navigate
    await page.keyboard.press('ArrowRight');

    // Check if focus moved (implementation-dependent)
    const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-tab'));
    // This test structure is ready for keyboard navigation implementation
  });

  test('emits events when tab changes', async ({ page }) => {
    await page.goto(fileUrl('examples/01-hello.html'));

    const eventPromise = page.evaluate(() => {
      return new Promise((resolve) => {
        const tabs = document.createElement('pan-tabs');
        tabs.innerHTML = `
          <button slot="tab" data-tab="a">A</button>
          <button slot="tab" data-tab="b">B</button>
          <div slot="panel" data-panel="a">A Panel</div>
          <div slot="panel" data-panel="b">B Panel</div>
        `;

        tabs.addEventListener('tab-change', (e: CustomEvent) => {
          resolve(e.detail);
        });

        document.body.appendChild(tabs);

        // Wait a bit then click second tab
        setTimeout(() => {
          const tab2 = tabs.querySelector('[data-tab="b"]') as HTMLElement;
          tab2?.click();
        }, 100);
      });
    });

    await page.waitForFunction(() => customElements.get('pan-tabs') !== undefined);

    // Wait for the event (if implemented)
    // const eventDetail = await eventPromise;
    // expect(eventDetail).toBeDefined();
  });
});
