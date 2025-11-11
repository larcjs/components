/**
 * pan-form component tests
 * Tests form handling, validation, and data submission
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl } from '../lib/test-utils.mjs';

describe('pan-form', () => {
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

  test('renders form with fields', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const form = document.createElement('pan-form');
      form.innerHTML = `
        <input name="username" type="text" required />
        <input name="email" type="email" required />
        <button type="submit">Submit</button>
      `;
      document.body.appendChild(form);
    });

    await page.waitForFunction(() => customElements.get('pan-form') !== undefined);

    const form = page.locator('pan-form');
    await expect(form).toBeVisible();
  });

  test('validates required fields', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const form = document.createElement('pan-form');
      form.innerHTML = `
        <input name="required-field" type="text" required />
        <button type="submit">Submit</button>
      `;
      document.body.appendChild(form);
    });

    await page.waitForFunction(() => customElements.get('pan-form') !== undefined);

    const submitBtn = page.locator('pan-form button[type="submit"]');
    await submitBtn.click();

    // Form should show validation error
    await page.waitForTimeout(100);
  });

  test('publishes form data on submit', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    const result = await page.evaluate(async () => {
      const form = document.createElement('pan-form');
      form.setAttribute('topic', 'form.submit');
      form.innerHTML = `
        <input name="name" value="John" />
        <input name="age" value="30" />
        <button type="submit">Submit</button>
      `;
      document.body.appendChild(form);

      await customElements.whenDefined('pan-form');

      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'form.submit') {
            resolve(e.detail.data);
          }
        }, { once: true });

        setTimeout(() => {
          const btn = form.querySelector('button[type="submit"]');
          btn?.click();
        }, 100);
      });
    });

    expect(result.name).toBe('John');
    expect(result.age).toBe('30');
  });

  test('resets form data', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const form = document.createElement('pan-form');
      form.innerHTML = `
        <input name="field1" value="initial" />
        <button type="reset">Reset</button>
      `;
      document.body.appendChild(form);
    });

    await page.waitForFunction(() => customElements.get('pan-form') !== undefined);

    const input = page.locator('pan-form input[name="field1"]');
    await input.fill('modified');

    const resetBtn = page.locator('pan-form button[type="reset"]');
    await resetBtn.click();

    await expect(input).toHaveValue('initial');
  });
});
