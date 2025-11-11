/**
 * pan-forwarder component tests
 * Tests HTTP message forwarding functionality
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl, publishPanMessage, waitForPanMessage } from '../lib/test-utils.mjs';

describe('pan-forwarder', () => {
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

  test('loads and becomes ready', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    // Add pan-forwarder component
    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-forwarder.js';
      document.head.appendChild(script);
    });

    // Wait for component to be defined
    await page.waitForFunction(() => customElements.get('pan-forwarder') !== undefined);

    const forwarder = await page.evaluate(() => {
      const el = document.createElement('pan-forwarder');
      el.setAttribute('dest', 'https://example.com/api');
      el.setAttribute('topics', 'test.*');
      document.body.appendChild(el);
      return el.tagName;
    });

    expect(forwarder).toBe('PAN-FORWARDER');
  });

  test('parses destination attribute', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-forwarder.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-forwarder') !== undefined);

    const dest = await page.evaluate(() => {
      const el = document.createElement('pan-forwarder');
      el.setAttribute('dest', '  https://example.com/api  ');
      document.body.appendChild(el);
      return el.dest;
    });

    expect(dest).toBe('https://example.com/api');
  });

  test('parses topics attribute with multiple topics', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-forwarder.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-forwarder') !== undefined);

    const topics = await page.evaluate(() => {
      const el = document.createElement('pan-forwarder');
      el.setAttribute('topics', 'user.* admin.* system.*');
      document.body.appendChild(el);
      return el.topics;
    });

    expect(topics).toHaveLength(3);
    expect(topics[0]).toBe('user.*');
    expect(topics[1]).toBe('admin.*');
    expect(topics[2]).toBe('system.*');
  });

  test('defaults to wildcard topic when not specified', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-forwarder.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-forwarder') !== undefined);

    const topics = await page.evaluate(() => {
      const el = document.createElement('pan-forwarder');
      document.body.appendChild(el);
      return el.topics;
    });

    expect(topics).toHaveLength(1);
    expect(topics[0]).toBe('*');
  });

  test('parses method attribute', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-forwarder.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-forwarder') !== undefined);

    const method = await page.evaluate(() => {
      const el = document.createElement('pan-forwarder');
      el.setAttribute('method', 'PUT');
      document.body.appendChild(el);
      return el.method;
    });

    expect(method).toBe('PUT');
  });

  test('defaults to POST method', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-forwarder.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-forwarder') !== undefined);

    const method = await page.evaluate(() => {
      const el = document.createElement('pan-forwarder');
      document.body.appendChild(el);
      return el.method;
    });

    expect(method).toBe('POST');
  });

  test('parses with-credentials attribute', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-forwarder.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-forwarder') !== undefined);

    const withCredentials = await page.evaluate(() => {
      const el = document.createElement('pan-forwarder');
      el.setAttribute('with-credentials', 'false');
      document.body.appendChild(el);
      return el.withCredentials;
    });

    expect(withCredentials).toBe(false);
  });

  test('defaults with-credentials to true', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-forwarder.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-forwarder') !== undefined);

    const withCredentials = await page.evaluate(() => {
      const el = document.createElement('pan-forwarder');
      document.body.appendChild(el);
      return el.withCredentials;
    });

    expect(withCredentials).toBe(true);
  });

  test('parses enabled attribute', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-forwarder.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-forwarder') !== undefined);

    const enabled = await page.evaluate(() => {
      const el = document.createElement('pan-forwarder');
      el.setAttribute('enabled', 'false');
      document.body.appendChild(el);
      return el.enabled;
    });

    expect(enabled).toBe(false);
  });

  test('defaults enabled to true', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-forwarder.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-forwarder') !== undefined);

    const enabled = await page.evaluate(() => {
      const el = document.createElement('pan-forwarder');
      document.body.appendChild(el);
      return el.enabled;
    });

    expect(enabled).toBe(true);
  });

  test('parses headers as JSON', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-forwarder.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-forwarder') !== undefined);

    const headers = await page.evaluate(() => {
      const el = document.createElement('pan-forwarder');
      el.setAttribute('headers', '{"Authorization": "Bearer token123"}');
      document.body.appendChild(el);
      return el.headers;
    });

    expect(headers.Authorization).toBe('Bearer token123');
  });

  test('parses headers as semicolon-separated key-value pairs', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-forwarder.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-forwarder') !== undefined);

    const headers = await page.evaluate(() => {
      const el = document.createElement('pan-forwarder');
      el.setAttribute('headers', 'X-Custom: value1; X-Another: value2');
      document.body.appendChild(el);
      return el.headers;
    });

    expect(headers['X-Custom']).toBe('value1');
    expect(headers['X-Another']).toBe('value2');
  });

  test('restarts when attributes change', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-forwarder.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-forwarder') !== undefined);

    const result = await page.evaluate(() => {
      const el = document.createElement('pan-forwarder');
      el.setAttribute('dest', 'https://example.com/api1');
      document.body.appendChild(el);

      const dest1 = el.dest;

      // Change attribute
      el.setAttribute('dest', 'https://example.com/api2');
      const dest2 = el.dest;

      return { dest1, dest2 };
    });

    expect(result.dest1).toBe('https://example.com/api1');
    expect(result.dest2).toBe('https://example.com/api2');
  });

  test('stops forwarding when disconnected', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-forwarder.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-forwarder') !== undefined);

    const wasRemoved = await page.evaluate(() => {
      const el = document.createElement('pan-forwarder');
      el.setAttribute('dest', 'https://example.com/api');
      document.body.appendChild(el);

      // Remove element
      el.remove();

      return !document.contains(el);
    });

    expect(wasRemoved).toBe(true);
  });
});
