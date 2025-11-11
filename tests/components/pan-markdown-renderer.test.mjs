/**
 * pan-markdown-renderer component tests
 * Tests the markdown rendering functionality including various markdown
 * syntax elements, sanitization, and PAN message bus integration
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl } from '../lib/test-utils.mjs';

describe('pan-markdown-renderer', () => {
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
        <script type="module" src="${fileUrl('dist/components/pan-markdown-renderer.js')}"></script>
      </head>
      <body>
        <pan-markdown-renderer></pan-markdown-renderer>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-renderer') !== undefined);

    const rendererExists = await page.evaluate(() => {
      return document.querySelector('pan-markdown-renderer') !== null;
    });
    expect(rendererExists).toBeTruthy();

    const hasMarkdownBody = await page.evaluate(() => {
      const renderer = document.querySelector('pan-markdown-renderer');
      return renderer.shadowRoot.querySelector('.markdown-body') !== null;
    });
    expect(hasMarkdownBody).toBeTruthy();
  });

  test('renders heading levels correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-renderer.js')}"></script>
      </head>
      <body>
        <pan-markdown-renderer content="# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6"></pan-markdown-renderer>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-renderer') !== undefined);

    const headings = await page.evaluate(() => {
      const renderer = document.querySelector('pan-markdown-renderer');
      const body = renderer.shadowRoot.querySelector('.markdown-body');
      return {
        h1: body.querySelector('h1')?.textContent,
        h2: body.querySelector('h2')?.textContent,
        h3: body.querySelector('h3')?.textContent,
        h4: body.querySelector('h4')?.textContent,
        h5: body.querySelector('h5')?.textContent,
        h6: body.querySelector('h6')?.textContent
      };
    });

    expect(headings.h1).toBe('H1');
    expect(headings.h2).toBe('H2');
    expect(headings.h3).toBe('H3');
    expect(headings.h4).toBe('H4');
    expect(headings.h5).toBe('H5');
    expect(headings.h6).toBe('H6');
  });

  test('renders bold text correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-renderer.js')}"></script>
      </head>
      <body>
        <pan-markdown-renderer content="**bold text** and __also bold__"></pan-markdown-renderer>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-renderer') !== undefined);

    const hasBold = await page.evaluate(() => {
      const renderer = document.querySelector('pan-markdown-renderer');
      const body = renderer.shadowRoot.querySelector('.markdown-body');
      const strongElements = body.querySelectorAll('strong');
      return strongElements.length === 2 &&
             strongElements[0].textContent === 'bold text' &&
             strongElements[1].textContent === 'also bold';
    });

    expect(hasBold).toBeTruthy();
  });

  test('renders italic text correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-renderer.js')}"></script>
      </head>
      <body>
        <pan-markdown-renderer content="*italic text* and _also italic_"></pan-markdown-renderer>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-renderer') !== undefined);

    const hasItalic = await page.evaluate(() => {
      const renderer = document.querySelector('pan-markdown-renderer');
      const body = renderer.shadowRoot.querySelector('.markdown-body');
      const emElements = body.querySelectorAll('em');
      return emElements.length === 2 &&
             emElements[0].textContent === 'italic text' &&
             emElements[1].textContent === 'also italic';
    });

    expect(hasItalic).toBeTruthy();
  });

  test('renders strikethrough text correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-renderer.js')}"></script>
      </head>
      <body>
        <pan-markdown-renderer content="~~strikethrough text~~"></pan-markdown-renderer>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-renderer') !== undefined);

    const hasStrikethrough = await page.evaluate(() => {
      const renderer = document.querySelector('pan-markdown-renderer');
      const body = renderer.shadowRoot.querySelector('.markdown-body');
      const delElement = body.querySelector('del');
      return delElement && delElement.textContent === 'strikethrough text';
    });

    expect(hasStrikethrough).toBeTruthy();
  });

  test('renders links correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-renderer.js')}"></script>
      </head>
      <body>
        <pan-markdown-renderer content="[Link Text](https://example.com)"></pan-markdown-renderer>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-renderer') !== undefined);

    const linkData = await page.evaluate(() => {
      const renderer = document.querySelector('pan-markdown-renderer');
      const body = renderer.shadowRoot.querySelector('.markdown-body');
      const link = body.querySelector('a');
      return {
        text: link?.textContent,
        href: link?.getAttribute('href')
      };
    });

    expect(linkData.text).toBe('Link Text');
    expect(linkData.href).toBe('https://example.com');
  });

  test('renders images correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-renderer.js')}"></script>
      </head>
      <body>
        <pan-markdown-renderer content="![Alt Text](https://example.com/image.png)"></pan-markdown-renderer>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-renderer') !== undefined);

    const imageData = await page.evaluate(() => {
      const renderer = document.querySelector('pan-markdown-renderer');
      const body = renderer.shadowRoot.querySelector('.markdown-body');
      const img = body.querySelector('img');
      return {
        alt: img?.getAttribute('alt'),
        src: img?.getAttribute('src')
      };
    });

    expect(imageData.alt).toBe('Alt Text');
    expect(imageData.src).toBe('https://example.com/image.png');
  });

  test('renders inline code correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-renderer.js')}"></script>
      </head>
      <body>
        <pan-markdown-renderer content="This is \`inline code\` example"></pan-markdown-renderer>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-renderer') !== undefined);

    const hasCode = await page.evaluate(() => {
      const renderer = document.querySelector('pan-markdown-renderer');
      const body = renderer.shadowRoot.querySelector('.markdown-body');
      const code = body.querySelector('code');
      return code && code.textContent === 'inline code';
    });

    expect(hasCode).toBeTruthy();
  });

  test('renders code blocks correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-renderer.js')}"></script>
      </head>
      <body>
        <pan-markdown-renderer content="\`\`\`javascript\nconst x = 42;\n\`\`\`"></pan-markdown-renderer>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-renderer') !== undefined);

    const codeBlockData = await page.evaluate(() => {
      const renderer = document.querySelector('pan-markdown-renderer');
      const body = renderer.shadowRoot.querySelector('.markdown-body');
      const pre = body.querySelector('pre');
      const code = pre?.querySelector('code');
      return {
        hasPreCode: pre && code,
        content: code?.textContent.trim(),
        lang: code?.className
      };
    });

    expect(codeBlockData.hasPreCode).toBeTruthy();
    expect(codeBlockData.content).toBe('const x = 42;');
    expect(codeBlockData.lang).toBe('language-javascript');
  });

  test('renders unordered lists correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-renderer.js')}"></script>
      </head>
      <body>
        <pan-markdown-renderer content="* Item 1\n* Item 2\n* Item 3"></pan-markdown-renderer>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-renderer') !== undefined);

    const listData = await page.evaluate(() => {
      const renderer = document.querySelector('pan-markdown-renderer');
      const body = renderer.shadowRoot.querySelector('.markdown-body');
      const ul = body.querySelector('ul');
      const items = ul?.querySelectorAll('li');
      return {
        hasUl: !!ul,
        itemCount: items?.length || 0,
        firstItem: items?.[0]?.textContent
      };
    });

    expect(listData.hasUl).toBeTruthy();
    expect(listData.itemCount).toBe(3);
    expect(listData.firstItem).toBe('Item 1');
  });

  test('renders ordered lists correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-renderer.js')}"></script>
      </head>
      <body>
        <pan-markdown-renderer content="1. First\n2. Second\n3. Third"></pan-markdown-renderer>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-renderer') !== undefined);

    const listData = await page.evaluate(() => {
      const renderer = document.querySelector('pan-markdown-renderer');
      const body = renderer.shadowRoot.querySelector('.markdown-body');
      const ol = body.querySelector('ol');
      const items = ol?.querySelectorAll('li');
      return {
        hasOl: !!ol,
        itemCount: items?.length || 0,
        firstItem: items?.[0]?.textContent
      };
    });

    expect(listData.hasOl).toBeTruthy();
    expect(listData.itemCount).toBe(3);
    expect(listData.firstItem).toBe('First');
  });

  test('renders task lists correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-renderer.js')}"></script>
      </head>
      <body>
        <pan-markdown-renderer content="- [ ] Unchecked\n- [x] Checked"></pan-markdown-renderer>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-renderer') !== undefined);

    const taskData = await page.evaluate(() => {
      const renderer = document.querySelector('pan-markdown-renderer');
      const body = renderer.shadowRoot.querySelector('.markdown-body');
      const checkboxes = body.querySelectorAll('input[type="checkbox"]');
      return {
        count: checkboxes.length,
        firstChecked: checkboxes[0]?.checked,
        secondChecked: checkboxes[1]?.checked
      };
    });

    expect(taskData.count).toBe(2);
    expect(taskData.firstChecked).toBe(false);
    expect(taskData.secondChecked).toBe(true);
  });

  test('renders blockquotes correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-renderer.js')}"></script>
      </head>
      <body>
        <pan-markdown-renderer content="> This is a quote"></pan-markdown-renderer>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-renderer') !== undefined);

    const hasQuote = await page.evaluate(() => {
      const renderer = document.querySelector('pan-markdown-renderer');
      const body = renderer.shadowRoot.querySelector('.markdown-body');
      const blockquote = body.querySelector('blockquote');
      return blockquote && blockquote.textContent.includes('This is a quote');
    });

    expect(hasQuote).toBeTruthy();
  });

  test('renders horizontal rules correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-renderer.js')}"></script>
      </head>
      <body>
        <pan-markdown-renderer content="---"></pan-markdown-renderer>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-renderer') !== undefined);

    const hasHr = await page.evaluate(() => {
      const renderer = document.querySelector('pan-markdown-renderer');
      const body = renderer.shadowRoot.querySelector('.markdown-body');
      return body.querySelector('hr') !== null;
    });

    expect(hasHr).toBeTruthy();
  });

  test('renders tables correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-renderer.js')}"></script>
      </head>
      <body>
        <pan-markdown-renderer content="| Col1 | Col2 |\n|------|------|\n| A    | B    |"></pan-markdown-renderer>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-renderer') !== undefined);

    const tableData = await page.evaluate(() => {
      const renderer = document.querySelector('pan-markdown-renderer');
      const body = renderer.shadowRoot.querySelector('.markdown-body');
      const table = body.querySelector('table');
      const thead = table?.querySelector('thead');
      const tbody = table?.querySelector('tbody');
      const headers = thead?.querySelectorAll('th');
      const cells = tbody?.querySelectorAll('td');
      return {
        hasTable: !!table,
        hasHead: !!thead,
        hasBody: !!tbody,
        headerCount: headers?.length || 0,
        cellCount: cells?.length || 0
      };
    });

    expect(tableData.hasTable).toBeTruthy();
    expect(tableData.hasHead).toBeTruthy();
    expect(tableData.hasBody).toBeTruthy();
    expect(tableData.headerCount).toBe(2);
    expect(tableData.cellCount).toBe(2);
  });

  test('updates content via setContent method', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-renderer.js')}"></script>
      </head>
      <body>
        <pan-markdown-renderer></pan-markdown-renderer>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-renderer') !== undefined);

    const content = await page.evaluate(() => {
      const renderer = document.querySelector('pan-markdown-renderer');
      renderer.setContent('# Updated Content');
      return renderer.getContent();
    });

    expect(content).toBe('# Updated Content');
  });

  test('returns rendered HTML via getHtml method', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-renderer.js')}"></script>
      </head>
      <body>
        <pan-markdown-renderer content="**bold**"></pan-markdown-renderer>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-renderer') !== undefined);

    const html = await page.evaluate(() => {
      const renderer = document.querySelector('pan-markdown-renderer');
      return renderer.getHtml();
    });

    expect(html).toContain('<strong>bold</strong>');
  });

  test('sanitizes HTML by default', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-renderer.js')}"></script>
      </head>
      <body>
        <pan-markdown-renderer content="<script>alert('xss')</script>"></pan-markdown-renderer>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-renderer') !== undefined);

    const html = await page.evaluate(() => {
      const renderer = document.querySelector('pan-markdown-renderer');
      return renderer.getHtml();
    });

    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  test('renders paragraphs for plain text', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-renderer.js')}"></script>
      </head>
      <body>
        <pan-markdown-renderer content="This is a paragraph."></pan-markdown-renderer>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-renderer') !== undefined);

    const hasParagraph = await page.evaluate(() => {
      const renderer = document.querySelector('pan-markdown-renderer');
      const body = renderer.shadowRoot.querySelector('.markdown-body');
      const p = body.querySelector('p');
      return p && p.textContent === 'This is a paragraph.';
    });

    expect(hasParagraph).toBeTruthy();
  });

  test('handles empty content', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('dist/components/pan-markdown-renderer.js')}"></script>
      </head>
      <body>
        <pan-markdown-renderer content=""></pan-markdown-renderer>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-markdown-renderer') !== undefined);

    const isEmpty = await page.evaluate(() => {
      const renderer = document.querySelector('pan-markdown-renderer');
      const body = renderer.shadowRoot.querySelector('.markdown-body');
      return body.innerHTML.trim() === '';
    });

    expect(isEmpty).toBeTruthy();
  });
});
