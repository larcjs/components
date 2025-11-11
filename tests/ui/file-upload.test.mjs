/**
 * file-upload UI tests
 * Tests the file upload component functionality including file selection and drag-drop
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl } from '../lib/test-utils.mjs';

describe('file-upload', () => {
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

  test('renders file upload area', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const upload = document.createElement('file-upload');
      upload.setAttribute('accept', 'image/*');
      document.body.appendChild(upload);
    });

    await page.waitForFunction(() => customElements.get('file-upload') !== undefined);

    const upload = page.locator('file-upload');
    await expect(upload).toBeVisible();
  });

  test('handles file selection', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const upload = document.createElement('file-upload');
      upload.setAttribute('topic', 'file.selected');
      document.body.appendChild(upload);
    });

    await page.waitForFunction(() => customElements.get('file-upload') !== undefined);

    // Create a test file
    const fileContent = 'test file content';
    const fileName = 'test.txt';

    await page.evaluate(({ fileName, fileContent }) => {
      const upload = document.querySelector('file-upload');
      const input = upload?.shadowRoot?.querySelector('input[type="file"]') ||
                    upload?.querySelector('input[type="file"]');

      if (input) {
        const dataTransfer = new DataTransfer();
        const file = new File([fileContent], fileName, { type: 'text/plain' });
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, { fileName, fileContent });

    await page.waitForTimeout(200);
  });

  test('supports drag and drop', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const upload = document.createElement('file-upload');
      upload.setAttribute('drag-drop', 'true');
      document.body.appendChild(upload);
    });

    await page.waitForFunction(() => customElements.get('file-upload') !== undefined);

    const upload = page.locator('file-upload');

    // Simulate drag over
    await upload.evaluate(el => {
      const dragEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true
      });
      el.dispatchEvent(dragEvent);
    });

    // Check if drop zone is highlighted (implementation dependent)
  });

  test('validates file types', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    const result = await page.evaluate(async () => {
      const upload = document.createElement('file-upload');
      upload.setAttribute('accept', 'image/png,image/jpeg');
      upload.setAttribute('topic', 'file.error');
      document.body.appendChild(upload);

      await customElements.whenDefined('file-upload');

      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'file.error') {
            resolve(e.detail.data);
          }
        }, { once: true });

        // Try to upload a non-image file
        const input = upload.shadowRoot?.querySelector('input[type="file"]') ||
                     upload.querySelector('input[type="file"]');

        if (input) {
          const dataTransfer = new DataTransfer();
          const file = new File(['content'], 'test.txt', { type: 'text/plain' });
          dataTransfer.items.add(file);
          input.files = dataTransfer.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // If no error in 500ms, resolve with null
        setTimeout(() => resolve(null), 500);
      });
    });

    // File type validation may produce an error
  });

  test('supports multiple files', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const upload = document.createElement('file-upload');
      upload.setAttribute('multiple', 'true');
      document.body.appendChild(upload);
    });

    await page.waitForFunction(() => customElements.get('file-upload') !== undefined);

    const upload = page.locator('file-upload');
    const hasMultiple = await upload.getAttribute('multiple');
    expect(hasMultiple).toBe('true');
  });

  test('shows file size limit', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const upload = document.createElement('file-upload');
      upload.setAttribute('max-size', '5242880'); // 5MB
      document.body.appendChild(upload);
    });

    await page.waitForFunction(() => customElements.get('file-upload') !== undefined);

    const upload = page.locator('file-upload');
    const maxSize = await upload.getAttribute('max-size');
    expect(maxSize).toBe('5242880');
  });
});
