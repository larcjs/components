/**
 * pan-files component tests
 * Tests the file browser functionality including OPFS integration,
 * file operations, search, and PAN message bus integration
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl, publishPanMessage } from '../lib/test-utils.mjs';

describe('pan-files', () => {
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

  test('loads and renders correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-files.js')}"></script>
      </head>
      <body>
        <pan-files></pan-files>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-files') !== undefined);

    const filesExists = await page.evaluate(() => {
      return document.querySelector('pan-files') !== null;
    });
    expect(filesExists).toBeTruthy();

    const hasContainer = await page.evaluate(() => {
      const files = document.querySelector('pan-files');
      return files.shadowRoot.querySelector('.files-container') !== null;
    });
    expect(hasContainer).toBeTruthy();
  });

  test('renders file header', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-files.js')}"></script>
      </head>
      <body>
        <pan-files></pan-files>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-files') !== undefined);

    const hasHeader = await page.evaluate(() => {
      const files = document.querySelector('pan-files');
      return files.shadowRoot.querySelector('.files-header') !== null;
    });
    expect(hasHeader).toBeTruthy();
  });

  test('renders new file button', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-files.js')}"></script>
      </head>
      <body>
        <pan-files></pan-files>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-files') !== undefined);

    const hasNewFileBtn = await page.evaluate(() => {
      const files = document.querySelector('pan-files');
      return files.shadowRoot.querySelector('[data-action="new-file"]') !== null;
    });
    expect(hasNewFileBtn).toBeTruthy();
  });

  test('renders new folder button', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-files.js')}"></script>
      </head>
      <body>
        <pan-files></pan-files>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-files') !== undefined);

    const hasNewFolderBtn = await page.evaluate(() => {
      const files = document.querySelector('pan-files');
      return files.shadowRoot.querySelector('[data-action="new-folder"]') !== null;
    });
    expect(hasNewFolderBtn).toBeTruthy();
  });

  test('renders refresh button', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-files.js')}"></script>
      </head>
      <body>
        <pan-files></pan-files>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-files') !== undefined);

    const hasRefreshBtn = await page.evaluate(() => {
      const files = document.querySelector('pan-files');
      return files.shadowRoot.querySelector('[data-action="refresh"]') !== null;
    });
    expect(hasRefreshBtn).toBeTruthy();
  });

  test('renders path breadcrumb', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-files.js')}"></script>
      </head>
      <body>
        <pan-files></pan-files>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-files') !== undefined);

    const hasBreadcrumb = await page.evaluate(() => {
      const files = document.querySelector('pan-files');
      return files.shadowRoot.querySelector('.path-breadcrumb') !== null;
    });
    expect(hasBreadcrumb).toBeTruthy();
  });

  test('renders search box', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-files.js')}"></script>
      </head>
      <body>
        <pan-files></pan-files>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-files') !== undefined);

    const hasSearchBox = await page.evaluate(() => {
      const files = document.querySelector('pan-files');
      return files.shadowRoot.querySelector('.search-box') !== null;
    });
    expect(hasSearchBox).toBeTruthy();
  });

  test('search input has correct placeholder', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-files.js')}"></script>
      </head>
      <body>
        <pan-files></pan-files>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-files') !== undefined);

    const placeholder = await page.evaluate(() => {
      const files = document.querySelector('pan-files');
      const input = files.shadowRoot.querySelector('.search-input');
      return input.getAttribute('placeholder');
    });

    expect(placeholder).toBe('Search files...');
  });

  test('renders files list area', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-files.js')}"></script>
      </head>
      <body>
        <pan-files></pan-files>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-files') !== undefined);

    const hasFilesList = await page.evaluate(() => {
      const files = document.querySelector('pan-files');
      return files.shadowRoot.querySelector('.files-list') !== null;
    });
    expect(hasFilesList).toBeTruthy();
  });

  test('shows loading state initially', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-files.js')}"></script>
      </head>
      <body>
        <pan-files></pan-files>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-files') !== undefined);

    const showsLoading = await page.evaluate(() => {
      const files = document.querySelector('pan-files');
      const list = files.shadowRoot.querySelector('.files-list');
      return list.textContent.includes('Loading');
    });

    expect(showsLoading).toBeTruthy();
  });

  test('initializes OPFS', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-files.js')}"></script>
      </head>
      <body>
        <pan-files></pan-files>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-files') !== undefined);
    await page.waitForTimeout(500);

    const hasRootHandle = await page.evaluate(() => {
      const files = document.querySelector('pan-files');
      return files._rootHandle !== null;
    });

    expect(hasRootHandle).toBeTruthy();
  });

  test('has default path attribute', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-files.js')}"></script>
      </head>
      <body>
        <pan-files></pan-files>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-files') !== undefined);

    const path = await page.evaluate(() => {
      const files = document.querySelector('pan-files');
      return files._currentPath;
    });

    expect(path).toBe('/');
  });

  test('accepts custom path attribute', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-files.js')}"></script>
      </head>
      <body>
        <pan-files path="/documents"></pan-files>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-files') !== undefined);

    const path = await page.evaluate(() => {
      const files = document.querySelector('pan-files');
      return files._currentPath;
    });

    expect(path).toBe('/documents');
  });

  test('has show-hidden attribute', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-files.js')}"></script>
      </head>
      <body>
        <pan-files></pan-files>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-files') !== undefined);

    const showHidden = await page.evaluate(() => {
      const files = document.querySelector('pan-files');
      return files._showHidden;
    });

    expect(showHidden).toBe(false);
  });

  test('accepts show-hidden attribute', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-files.js')}"></script>
      </head>
      <body>
        <pan-files show-hidden="true"></pan-files>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-files') !== undefined);

    const showHidden = await page.evaluate(() => {
      const files = document.querySelector('pan-files');
      return files._showHidden;
    });

    expect(showHidden).toBe(true);
  });

  test('has filter attribute', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-files.js')}"></script>
      </head>
      <body>
        <pan-files filter=".txt,.md"></pan-files>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-files') !== undefined);

    const filter = await page.evaluate(() => {
      const files = document.querySelector('pan-files');
      return files._filter;
    });

    expect(filter).toBe('.txt,.md');
  });

  test('can create and write a file', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-files.js')}"></script>
      </head>
      <body>
        <pan-files></pan-files>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-files') !== undefined);
    await page.waitForTimeout(500);

    const success = await page.evaluate(async () => {
      const files = document.querySelector('pan-files');
      try {
        await files.writeFile('/test.txt', 'Hello World');
        return true;
      } catch (e) {
        return false;
      }
    });

    expect(success).toBeTruthy();
  });

  test('can read a file after writing', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-files.js')}"></script>
      </head>
      <body>
        <pan-files></pan-files>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-files') !== undefined);
    await page.waitForTimeout(500);

    const content = await page.evaluate(async () => {
      const files = document.querySelector('pan-files');
      try {
        await files.writeFile('/read-test.txt', 'Test Content');
        return await files.readFile('/read-test.txt');
      } catch (e) {
        return null;
      }
    });

    expect(content).toBe('Test Content');
  });

  test('can delete a file', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-files.js')}"></script>
      </head>
      <body>
        <pan-files></pan-files>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-files') !== undefined);
    await page.waitForTimeout(500);

    const deleted = await page.evaluate(async () => {
      const files = document.querySelector('pan-files');
      try {
        await files.writeFile('/delete-test.txt', 'Will be deleted');
        await files.deleteFile('/delete-test.txt');
        return true;
      } catch (e) {
        return false;
      }
    });

    expect(deleted).toBeTruthy();
  });

  test('lists files after creation', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-files.js')}"></script>
      </head>
      <body>
        <pan-files></pan-files>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-files') !== undefined);
    await page.waitForTimeout(500);

    const fileCount = await page.evaluate(async () => {
      const files = document.querySelector('pan-files');
      try {
        await files.writeFile('/list-test-1.txt', 'File 1');
        await files.writeFile('/list-test-2.txt', 'File 2');
        await files.refresh();
        const list = await files.listFiles();
        return list.length;
      } catch (e) {
        return 0;
      }
    });

    expect(fileCount).toBeGreaterThan(0);
  });

  test('has refresh public API', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-files.js')}"></script>
      </head>
      <body>
        <pan-files></pan-files>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-files') !== undefined);

    const hasRefresh = await page.evaluate(() => {
      const files = document.querySelector('pan-files');
      return typeof files.refresh === 'function';
    });

    expect(hasRefresh).toBeTruthy();
  });

  test('has listFiles public API', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-files.js')}"></script>
      </head>
      <body>
        <pan-files></pan-files>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-files') !== undefined);

    const hasListFiles = await page.evaluate(() => {
      const files = document.querySelector('pan-files');
      return typeof files.listFiles === 'function';
    });

    expect(hasListFiles).toBeTruthy();
  });

  test('has writeFile public API', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-files.js')}"></script>
      </head>
      <body>
        <pan-files></pan-files>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-files') !== undefined);

    const hasWriteFile = await page.evaluate(() => {
      const files = document.querySelector('pan-files');
      return typeof files.writeFile === 'function';
    });

    expect(hasWriteFile).toBeTruthy();
  });

  test('has readFile public API', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-files.js')}"></script>
      </head>
      <body>
        <pan-files></pan-files>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-files') !== undefined);

    const hasReadFile = await page.evaluate(() => {
      const files = document.querySelector('pan-files');
      return typeof files.readFile === 'function';
    });

    expect(hasReadFile).toBeTruthy();
  });

  test('has deleteFile public API', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-files.js')}"></script>
      </head>
      <body>
        <pan-files></pan-files>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-files') !== undefined);

    const hasDeleteFile = await page.evaluate(() => {
      const files = document.querySelector('pan-files');
      return typeof files.deleteFile === 'function';
    });

    expect(hasDeleteFile).toBeTruthy();
  });

  test('file items have rename button', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-files.js')}"></script>
      </head>
      <body>
        <pan-files></pan-files>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-files') !== undefined);
    await page.waitForTimeout(1000);

    const hasRenameInTemplate = await page.evaluate(() => {
      const files = document.querySelector('pan-files');
      const list = files.shadowRoot.querySelector('.files-list');
      return list.innerHTML.includes('data-action="rename"');
    });

    expect(hasRenameInTemplate).toBeTruthy();
  });

  test('file items have delete button', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-files.js')}"></script>
      </head>
      <body>
        <pan-files></pan-files>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-files') !== undefined);
    await page.waitForTimeout(1000);

    const hasDeleteInTemplate = await page.evaluate(() => {
      const files = document.querySelector('pan-files');
      const list = files.shadowRoot.querySelector('.files-list');
      return list.innerHTML.includes('data-action="delete"');
    });

    expect(hasDeleteInTemplate).toBeTruthy();
  });
});
