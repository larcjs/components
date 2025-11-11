/**
 * pan-theme-toggle component tests
 * Tests the theme toggle button functionality with different variants
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl } from '../lib/test-utils.mjs';

describe('pan-theme-toggle', () => {
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

  test('loads and initializes correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-theme-toggle></pan-theme-toggle>
        <script type="module" src="${fileUrl('dist/components/pan-theme-toggle.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-theme-toggle') !== undefined);

    const toggleExists = await page.evaluate(() => {
      return document.querySelector('pan-theme-toggle') !== null;
    });
    expect(toggleExists).toBeTruthy();
  });

  test('renders icon variant by default', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-theme-toggle></pan-theme-toggle>
        <script type="module" src="${fileUrl('dist/components/pan-theme-toggle.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-theme-toggle') !== undefined);

    const hasIconButton = await page.evaluate(() => {
      const toggle = document.querySelector('pan-theme-toggle');
      const button = toggle.shadowRoot.querySelector('.toggle-btn.icon-only');
      return button !== null;
    });
    expect(hasIconButton).toBeTruthy();
  });

  test('renders button with label when label attribute is set', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-theme-toggle label="Toggle Theme"></pan-theme-toggle>
        <script type="module" src="${fileUrl('dist/components/pan-theme-toggle.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-theme-toggle') !== undefined);

    const labelText = await page.evaluate(() => {
      const toggle = document.querySelector('pan-theme-toggle');
      const label = toggle.shadowRoot.querySelector('.label');
      return label ? label.textContent : null;
    });
    expect(labelText).toBe('Toggle Theme');
  });

  test('renders dropdown variant correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-theme-toggle variant="dropdown"></pan-theme-toggle>
        <script type="module" src="${fileUrl('dist/components/pan-theme-toggle.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-theme-toggle') !== undefined);

    const hasDropdown = await page.evaluate(() => {
      const toggle = document.querySelector('pan-theme-toggle');
      const dropdown = toggle.shadowRoot.querySelector('.dropdown');
      const menu = toggle.shadowRoot.querySelector('.dropdown-menu');
      const items = toggle.shadowRoot.querySelectorAll('.dropdown-item');
      return {
        hasDropdown: dropdown !== null,
        hasMenu: menu !== null,
        itemCount: items.length
      };
    });

    expect(hasDropdown.hasDropdown).toBeTruthy();
    expect(hasDropdown.hasMenu).toBeTruthy();
    expect(hasDropdown.itemCount).toBe(3); // light, dark, auto
  });

  test('cycles through themes on icon button click', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-theme-provider theme="auto"></pan-theme-provider>
        <pan-theme-toggle></pan-theme-toggle>
        <script type="module" src="${fileUrl('dist/components/pan-theme-provider.js')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-theme-toggle.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => {
      return customElements.get('pan-theme-toggle') !== undefined &&
             customElements.get('pan-theme-provider') !== undefined;
    });
    await page.waitForTimeout(100);

    // Get initial theme
    let theme = await page.evaluate(() => {
      return document.querySelector('pan-theme-provider').getTheme();
    });
    expect(theme).toBe('auto');

    // Click to cycle to light
    await page.evaluate(() => {
      const toggle = document.querySelector('pan-theme-toggle');
      const button = toggle.shadowRoot.querySelector('.toggle-btn');
      button.click();
    });
    await page.waitForTimeout(100);

    theme = await page.evaluate(() => {
      return document.querySelector('pan-theme-provider').getTheme();
    });
    expect(theme).toBe('light');

    // Click to cycle to dark
    await page.evaluate(() => {
      const toggle = document.querySelector('pan-theme-toggle');
      const button = toggle.shadowRoot.querySelector('.toggle-btn');
      button.click();
    });
    await page.waitForTimeout(100);

    theme = await page.evaluate(() => {
      return document.querySelector('pan-theme-provider').getTheme();
    });
    expect(theme).toBe('dark');

    // Click to cycle to auto
    await page.evaluate(() => {
      const toggle = document.querySelector('pan-theme-toggle');
      const button = toggle.shadowRoot.querySelector('.toggle-btn');
      button.click();
    });
    await page.waitForTimeout(100);

    theme = await page.evaluate(() => {
      return document.querySelector('pan-theme-provider').getTheme();
    });
    expect(theme).toBe('auto');
  });

  test('dropdown menu opens and closes on trigger click', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-theme-toggle variant="dropdown"></pan-theme-toggle>
        <script type="module" src="${fileUrl('dist/components/pan-theme-toggle.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-theme-toggle') !== undefined);

    // Check menu is initially closed
    let isOpen = await page.evaluate(() => {
      const toggle = document.querySelector('pan-theme-toggle');
      const menu = toggle.shadowRoot.querySelector('.dropdown-menu');
      return menu.classList.contains('open');
    });
    expect(isOpen).toBeFalsy();

    // Click to open
    await page.evaluate(() => {
      const toggle = document.querySelector('pan-theme-toggle');
      const trigger = toggle.shadowRoot.querySelector('.dropdown-trigger');
      trigger.click();
    });
    await page.waitForTimeout(50);

    isOpen = await page.evaluate(() => {
      const toggle = document.querySelector('pan-theme-toggle');
      const menu = toggle.shadowRoot.querySelector('.dropdown-menu');
      return menu.classList.contains('open');
    });
    expect(isOpen).toBeTruthy();

    // Click to close
    await page.evaluate(() => {
      const toggle = document.querySelector('pan-theme-toggle');
      const trigger = toggle.shadowRoot.querySelector('.dropdown-trigger');
      trigger.click();
    });
    await page.waitForTimeout(50);

    isOpen = await page.evaluate(() => {
      const toggle = document.querySelector('pan-theme-toggle');
      const menu = toggle.shadowRoot.querySelector('.dropdown-menu');
      return menu.classList.contains('open');
    });
    expect(isOpen).toBeFalsy();
  });

  test('dropdown item click sets theme', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-theme-provider theme="light"></pan-theme-provider>
        <pan-theme-toggle variant="dropdown"></pan-theme-toggle>
        <script type="module" src="${fileUrl('dist/components/pan-theme-provider.js')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-theme-toggle.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => {
      return customElements.get('pan-theme-toggle') !== undefined &&
             customElements.get('pan-theme-provider') !== undefined;
    });
    await page.waitForTimeout(100);

    // Open dropdown
    await page.evaluate(() => {
      const toggle = document.querySelector('pan-theme-toggle');
      const trigger = toggle.shadowRoot.querySelector('.dropdown-trigger');
      trigger.click();
    });
    await page.waitForTimeout(50);

    // Click dark theme option
    await page.evaluate(() => {
      const toggle = document.querySelector('pan-theme-toggle');
      const items = toggle.shadowRoot.querySelectorAll('.dropdown-item');
      const darkItem = Array.from(items).find(item => item.dataset.theme === 'dark');
      darkItem.click();
    });
    await page.waitForTimeout(100);

    const theme = await page.evaluate(() => {
      return document.querySelector('pan-theme-provider').getTheme();
    });
    expect(theme).toBe('dark');

    // Menu should be closed after selection
    const isOpen = await page.evaluate(() => {
      const toggle = document.querySelector('pan-theme-toggle');
      const menu = toggle.shadowRoot.querySelector('.dropdown-menu');
      return menu.classList.contains('open');
    });
    expect(isOpen).toBeFalsy();
  });

  test('updates icon when theme changes via pan-bus', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-theme-provider theme="light"></pan-theme-provider>
        <pan-theme-toggle></pan-theme-toggle>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-theme-provider.js')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-theme-toggle.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => {
      return customElements.get('pan-bus') !== undefined &&
             customElements.get('pan-theme-toggle') !== undefined &&
             customElements.get('pan-theme-provider') !== undefined;
    });
    await page.waitForTimeout(100);

    // Change theme via provider
    await page.evaluate(() => {
      document.querySelector('pan-theme-provider').setTheme('dark');
    });
    await page.waitForTimeout(100);

    // Check that toggle displays the correct icon
    const iconContainsDark = await page.evaluate(() => {
      const toggle = document.querySelector('pan-theme-toggle');
      const icon = toggle.shadowRoot.querySelector('.icon');
      return icon.innerHTML.includes('21.752 15.002'); // Part of moon icon path
    });
    expect(iconContainsDark).toBeTruthy();
  });

  test('works without pan-theme-provider', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-theme-toggle></pan-theme-toggle>
        <script type="module" src="${fileUrl('dist/components/pan-theme-toggle.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-theme-toggle') !== undefined);

    // Click button
    await page.evaluate(() => {
      const toggle = document.querySelector('pan-theme-toggle');
      const button = toggle.shadowRoot.querySelector('.toggle-btn');
      button.click();
    });
    await page.waitForTimeout(100);

    // Should set data-theme attribute directly on document element
    const hasThemeAttr = await page.evaluate(() => {
      return document.documentElement.hasAttribute('data-theme');
    });
    expect(hasThemeAttr).toBeTruthy();
  });

  test('dropdown shows active state for current theme', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-theme-provider theme="dark"></pan-theme-provider>
        <pan-theme-toggle variant="dropdown"></pan-theme-toggle>
        <script type="module" src="${fileUrl('dist/components/pan-theme-provider.js')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-theme-toggle.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => {
      return customElements.get('pan-theme-toggle') !== undefined &&
             customElements.get('pan-theme-provider') !== undefined;
    });
    await page.waitForTimeout(100);

    const activeTheme = await page.evaluate(() => {
      const toggle = document.querySelector('pan-theme-toggle');
      const items = toggle.shadowRoot.querySelectorAll('.dropdown-item');
      const activeItem = Array.from(items).find(item => item.classList.contains('active'));
      return activeItem ? activeItem.dataset.theme : null;
    });
    expect(activeTheme).toBe('dark');
  });

  test('renders correct icons for each theme', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-theme-toggle variant="dropdown"></pan-theme-toggle>
        <script type="module" src="${fileUrl('dist/components/pan-theme-toggle.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-theme-toggle') !== undefined);

    const iconsExist = await page.evaluate(() => {
      const toggle = document.querySelector('pan-theme-toggle');
      const items = toggle.shadowRoot.querySelectorAll('.dropdown-item .theme-icon svg');
      return items.length === 3; // light, dark, auto each have an icon
    });
    expect(iconsExist).toBeTruthy();
  });

  test('re-renders when variant attribute changes', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-theme-toggle variant="icon"></pan-theme-toggle>
        <script type="module" src="${fileUrl('dist/components/pan-theme-toggle.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-theme-toggle') !== undefined);

    // Change to dropdown
    await page.evaluate(() => {
      document.querySelector('pan-theme-toggle').setAttribute('variant', 'dropdown');
    });
    await page.waitForTimeout(100);

    const hasDropdown = await page.evaluate(() => {
      const toggle = document.querySelector('pan-theme-toggle');
      return toggle.shadowRoot.querySelector('.dropdown') !== null;
    });
    expect(hasDropdown).toBeTruthy();
  });
});
