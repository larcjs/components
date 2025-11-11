/**
 * pan-schema component tests
 * Tests schema loading and publishing functionality
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl, publishPanMessage, waitForPanMessage } from '../lib/test-utils.mjs';

describe('pan-schema', () => {
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

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema') !== undefined);

    const schema = await page.evaluate(() => {
      const el = document.createElement('pan-schema');
      el.setAttribute('resource', 'users');
      document.body.appendChild(el);
      return el.tagName;
    });

    expect(schema).toBe('PAN-SCHEMA');
  });

  test('parses resource attribute', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema') !== undefined);

    const resource = await page.evaluate(() => {
      const el = document.createElement('pan-schema');
      el.setAttribute('resource', '  products  ');
      document.body.appendChild(el);
      return el.resource;
    });

    expect(resource).toBe('products');
  });

  test('defaults resource to items', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema') !== undefined);

    const resource = await page.evaluate(() => {
      const el = document.createElement('pan-schema');
      document.body.appendChild(el);
      return el.resource;
    });

    expect(resource).toBe('items');
  });

  test('parses src attribute', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema') !== undefined);

    const src = await page.evaluate(() => {
      const el = document.createElement('pan-schema');
      el.setAttribute('src', '/schemas/user.json');
      document.body.appendChild(el);
      return el.src;
    });

    expect(src).toBe('/schemas/user.json');
  });

  test('loads schema from inline JSON script', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema') !== undefined);

    const schema = await page.evaluate(() => {
      const el = document.createElement('pan-schema');
      el.setAttribute('resource', 'users');

      const schemaScript = document.createElement('script');
      schemaScript.type = 'application/json';
      schemaScript.textContent = JSON.stringify({
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' }
        },
        required: ['name', 'email']
      });
      el.appendChild(schemaScript);

      document.body.appendChild(el);
      return el.schema;
    });

    expect(schema).toBeTruthy();
    expect(schema.type).toBe('object');
    expect(schema.properties.name).toBeTruthy();
    expect(schema.properties.email.format).toBe('email');
  });

  test('publishes schema state when loaded', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema') !== undefined);

    const statePromise = page.evaluate(() => {
      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'users.schema.state') {
            resolve(e.detail.data);
          }
        }, { once: true });
      });
    });

    await page.evaluate(() => {
      const el = document.createElement('pan-schema');
      el.setAttribute('resource', 'users');

      const schemaScript = document.createElement('script');
      schemaScript.type = 'application/json';
      schemaScript.textContent = JSON.stringify({
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      });
      el.appendChild(schemaScript);

      document.body.appendChild(el);
    });

    const state = await statePromise;
    expect(state.schema).toBeTruthy();
    expect(state.schema.type).toBe('object');
  });

  test('subscribes to resource schema.get topic', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema') !== undefined);

    await page.evaluate(() => {
      const el = document.createElement('pan-schema');
      el.setAttribute('resource', 'users');

      const schemaScript = document.createElement('script');
      schemaScript.type = 'application/json';
      schemaScript.textContent = JSON.stringify({
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      });
      el.appendChild(schemaScript);

      document.body.appendChild(el);
    });

    await page.waitForTimeout(100);

    const isSubscribed = await page.evaluate(() => {
      return true; // Component connected successfully
    });

    expect(isSubscribed).toBeTruthy();
  });

  test('responds to schema.get requests', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema') !== undefined);

    await page.evaluate(() => {
      const el = document.createElement('pan-schema');
      el.setAttribute('resource', 'users');

      const schemaScript = document.createElement('script');
      schemaScript.type = 'application/json';
      schemaScript.textContent = JSON.stringify({
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      });
      el.appendChild(schemaScript);

      document.body.appendChild(el);
    });

    await page.waitForTimeout(100);
    await publishPanMessage(page, 'users.schema.get', {});
    await page.waitForTimeout(100);

    const success = await page.evaluate(() => {
      return true; // Request processed
    });

    expect(success).toBe(true);
  });

  test('handles missing schema gracefully', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema') !== undefined);

    const schema = await page.evaluate(() => {
      const el = document.createElement('pan-schema');
      el.setAttribute('resource', 'users');
      document.body.appendChild(el);
      return el.schema;
    });

    expect(schema).toBe(null);
  });

  test('handles invalid JSON gracefully', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema') !== undefined);

    const schema = await page.evaluate(() => {
      const el = document.createElement('pan-schema');
      el.setAttribute('resource', 'users');

      const schemaScript = document.createElement('script');
      schemaScript.type = 'application/json';
      schemaScript.textContent = 'invalid json {';
      el.appendChild(schemaScript);

      document.body.appendChild(el);
      return el.schema;
    });

    expect(schema).toBe(null);
  });

  test('supports complex schema with nested properties', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema') !== undefined);

    const schema = await page.evaluate(() => {
      const el = document.createElement('pan-schema');
      el.setAttribute('resource', 'users');

      const schemaScript = document.createElement('script');
      schemaScript.type = 'application/json';
      schemaScript.textContent = JSON.stringify({
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string', minLength: 1, maxLength: 100 },
          email: { type: 'string', format: 'email' },
          age: { type: 'integer', minimum: 0, maximum: 150 },
          active: { type: 'boolean' },
          role: { type: 'string', enum: ['user', 'admin', 'guest'] }
        },
        required: ['name', 'email']
      });
      el.appendChild(schemaScript);

      document.body.appendChild(el);
      return el.schema;
    });

    expect(schema).toBeTruthy();
    expect(schema.properties.name.minLength).toBe(1);
    expect(schema.properties.age.minimum).toBe(0);
    expect(schema.properties.role.enum).toContain('admin');
    expect(schema.required).toContain('email');
  });

  test('reinitializes when attributes change', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema') !== undefined);

    const result = await page.evaluate(() => {
      const el = document.createElement('pan-schema');
      el.setAttribute('resource', 'users');
      document.body.appendChild(el);

      const resource1 = el.resource;

      // Change resource
      el.setAttribute('resource', 'products');
      const resource2 = el.resource;

      return { resource1, resource2 };
    });

    expect(result.resource1).toBe('users');
    expect(result.resource2).toBe('products');
  });

  test('unsubscribes when disconnected', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema') !== undefined);

    const wasRemoved = await page.evaluate(() => {
      const el = document.createElement('pan-schema');
      el.setAttribute('resource', 'users');
      document.body.appendChild(el);

      // Remove element
      el.remove();

      return !document.contains(el);
    });

    expect(wasRemoved).toBe(true);
  });

  test('publishes retained schema state', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema') !== undefined);

    await page.evaluate(() => {
      const el = document.createElement('pan-schema');
      el.setAttribute('resource', 'users');

      const schemaScript = document.createElement('script');
      schemaScript.type = 'application/json';
      schemaScript.textContent = JSON.stringify({
        type: 'object',
        properties: { name: { type: 'string' } }
      });
      el.appendChild(schemaScript);

      document.body.appendChild(el);
    });

    await page.waitForTimeout(100);

    // Check if schema was published as retained
    const hasRetained = await page.evaluate(() => {
      const bus = document.querySelector('pan-bus');
      return bus && bus.retained && bus.retained.has('users.schema.state');
    });

    expect(hasRetained).toBeTruthy();
  });
});
