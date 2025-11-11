/**
 * pan-card UI tests
 * Tests the card component functionality including slots and styling
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl } from '../lib/test-utils.mjs';

describe('pan-card', () => {
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

  test('renders with header and content', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    // Add pan-card to the page
    await page.evaluate(() => {
      const card = document.createElement('pan-card');
      const header = document.createElement('h2');
      header.slot = 'header';
      header.textContent = 'Card Title';
      card.appendChild(header);

      const content = document.createElement('p');
      content.textContent = 'Card content goes here';
      card.appendChild(content);

      document.body.appendChild(card);
    });

    // Wait for the component to be defined and loaded
    await page.waitForFunction(() => customElements.get('pan-card') !== undefined);

    const card = page.locator('pan-card');
    await expect(card).toBeVisible();

    // Check that header slot content is visible
    const header = card.locator('[slot="header"]');
    await expect(header).toHaveText('Card Title');

    // Check that default slot content is visible
    await expect(card.locator('p')).toHaveText('Card content goes here');
  });

  test('renders with footer slot', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const card = document.createElement('pan-card');

      const footer = document.createElement('div');
      footer.slot = 'footer';
      footer.textContent = 'Card footer';
      card.appendChild(footer);

      document.body.appendChild(card);
    });

    await page.waitForFunction(() => customElements.get('pan-card') !== undefined);

    const card = page.locator('pan-card');
    const footer = card.locator('[slot="footer"]');
    await expect(footer).toHaveText('Card footer');
  });

  test('applies custom styles', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const card = document.createElement('pan-card');
      card.style.border = '2px solid red';
      card.style.padding = '20px';
      document.body.appendChild(card);
    });

    await page.waitForFunction(() => customElements.get('pan-card') !== undefined);

    const card = page.locator('pan-card');
    const border = await card.evaluate(el => getComputedStyle(el).border);
    expect(border).toContain('red');
  });
});
