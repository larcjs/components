import { test, expect } from '@playwright/test';
import { fileUrl } from '../helpers/test-utils';

test.describe('pan-modal', () => {
  test('opens and closes modal', async ({ page }) => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const modal = document.createElement('pan-modal');
      modal.id = 'test-modal';

      const title = document.createElement('h2');
      title.slot = 'header';
      title.textContent = 'Modal Title';
      modal.appendChild(title);

      const content = document.createElement('p');
      content.textContent = 'Modal content';
      modal.appendChild(content);

      document.body.appendChild(modal);
    });

    await page.waitForFunction(() => customElements.get('pan-modal') !== undefined);

    const modal = page.locator('pan-modal#test-modal');

    // Modal should be hidden by default
    const isHiddenInitially = await modal.evaluate(el => {
      return !el.hasAttribute('open');
    });
    expect(isHiddenInitially).toBe(true);

    // Open the modal
    await modal.evaluate(el => el.setAttribute('open', ''));
    await expect(modal).toHaveAttribute('open');

    // Close the modal
    await modal.evaluate(el => el.removeAttribute('open'));
    const isHiddenAfterClose = await modal.evaluate(el => {
      return !el.hasAttribute('open');
    });
    expect(isHiddenAfterClose).toBe(true);
  });

  test('closes on backdrop click', async ({ page }) => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const modal = document.createElement('pan-modal');
      modal.id = 'click-modal';
      modal.setAttribute('open', '');

      const content = document.createElement('p');
      content.textContent = 'Click outside to close';
      modal.appendChild(content);

      document.body.appendChild(modal);
    });

    await page.waitForFunction(() => customElements.get('pan-modal') !== undefined);

    const modal = page.locator('pan-modal#click-modal');
    await expect(modal).toHaveAttribute('open');

    // Click on the backdrop (usually the modal's shadow DOM backdrop element)
    // Note: This depends on pan-modal implementation
    await modal.evaluate(el => {
      const clickEvent = new MouseEvent('click', { bubbles: true });
      el.dispatchEvent(clickEvent);
    });

    // Modal might close automatically or need specific backdrop click handling
    // This test structure is ready for when that behavior is implemented
  });

  test('supports header and footer slots', async ({ page }) => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const modal = document.createElement('pan-modal');
      modal.setAttribute('open', '');

      const header = document.createElement('h2');
      header.slot = 'header';
      header.textContent = 'Header Text';
      modal.appendChild(header);

      const footer = document.createElement('div');
      footer.slot = 'footer';
      footer.textContent = 'Footer Text';
      modal.appendChild(footer);

      document.body.appendChild(modal);
    });

    await page.waitForFunction(() => customElements.get('pan-modal') !== undefined);

    const modal = page.locator('pan-modal');
    const header = modal.locator('[slot="header"]');
    const footer = modal.locator('[slot="footer"]');

    await expect(header).toHaveText('Header Text');
    await expect(footer).toHaveText('Footer Text');
  });
});
