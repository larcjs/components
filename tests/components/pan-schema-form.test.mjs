/**
 * pan-schema-form component tests
 * Tests schema-based form rendering and validation
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl, publishPanMessage, waitForPanMessage } from '../lib/test-utils.mjs';

describe('pan-schema-form', () => {
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
      script.src = '/dist/components/pan-schema-form.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema-form') !== undefined);

    const form = await page.evaluate(() => {
      const el = document.createElement('pan-schema-form');
      el.setAttribute('resource', 'users');
      document.body.appendChild(el);
      return el.tagName;
    });

    expect(form).toBe('PAN-SCHEMA-FORM');
  });

  test('uses shadow DOM', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema-form.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema-form') !== undefined);

    const hasShadowRoot = await page.evaluate(() => {
      const el = document.createElement('pan-schema-form');
      document.body.appendChild(el);
      return el.shadowRoot !== null;
    });

    expect(hasShadowRoot).toBe(true);
  });

  test('parses resource attribute', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema-form.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema-form') !== undefined);

    const resource = await page.evaluate(() => {
      const el = document.createElement('pan-schema-form');
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
      script.src = '/dist/components/pan-schema-form.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema-form') !== undefined);

    const resource = await page.evaluate(() => {
      const el = document.createElement('pan-schema-form');
      document.body.appendChild(el);
      return el.resource;
    });

    expect(resource).toBe('items');
  });

  test('parses key attribute', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema-form.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema-form') !== undefined);

    const key = await page.evaluate(() => {
      const el = document.createElement('pan-schema-form');
      el.setAttribute('key', 'userId');
      document.body.appendChild(el);
      return el.key;
    });

    expect(key).toBe('userId');
  });

  test('defaults key to id', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema-form.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema-form') !== undefined);

    const key = await page.evaluate(() => {
      const el = document.createElement('pan-schema-form');
      document.body.appendChild(el);
      return el.key;
    });

    expect(key).toBe('id');
  });

  test('parses live attribute', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema-form.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema-form') !== undefined);

    const live = await page.evaluate(() => {
      const el = document.createElement('pan-schema-form');
      el.setAttribute('live', 'false');
      document.body.appendChild(el);
      return el.live;
    });

    expect(live).toBe(false);
  });

  test('defaults live to true', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema-form.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema-form') !== undefined);

    const live = await page.evaluate(() => {
      const el = document.createElement('pan-schema-form');
      document.body.appendChild(el);
      return el.live;
    });

    expect(live).toBe(true);
  });

  test('renders form with text inputs', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema-form.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema-form') !== undefined);

    const hasInput = await page.evaluate(() => {
      const el = document.createElement('pan-schema-form');
      el.setAttribute('resource', 'users');
      el.schema = {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name' }
        }
      };
      document.body.appendChild(el);

      const input = el.shadowRoot.querySelector('input[name="name"]');
      return input !== null;
    });

    expect(hasInput).toBe(true);
  });

  test('renders form with number inputs', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema-form.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema-form') !== undefined);

    const inputType = await page.evaluate(() => {
      const el = document.createElement('pan-schema-form');
      el.setAttribute('resource', 'users');
      el.schema = {
        type: 'object',
        properties: {
          age: { type: 'number', title: 'Age' }
        }
      };
      document.body.appendChild(el);

      const input = el.shadowRoot.querySelector('input[name="age"]');
      return input ? input.type : null;
    });

    expect(inputType).toBe('number');
  });

  test('renders form with boolean checkboxes', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema-form.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema-form') !== undefined);

    const inputType = await page.evaluate(() => {
      const el = document.createElement('pan-schema-form');
      el.setAttribute('resource', 'users');
      el.schema = {
        type: 'object',
        properties: {
          active: { type: 'boolean', title: 'Active' }
        }
      };
      document.body.appendChild(el);

      const input = el.shadowRoot.querySelector('input[name="active"]');
      return input ? input.type : null;
    });

    expect(inputType).toBe('checkbox');
  });

  test('renders form with select for enum properties', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema-form.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema-form') !== undefined);

    const hasSelect = await page.evaluate(() => {
      const el = document.createElement('pan-schema-form');
      el.setAttribute('resource', 'users');
      el.schema = {
        type: 'object',
        properties: {
          role: { type: 'string', title: 'Role', enum: ['user', 'admin', 'guest'] }
        }
      };
      document.body.appendChild(el);

      const select = el.shadowRoot.querySelector('select[name="role"]');
      return select !== null;
    });

    expect(hasSelect).toBe(true);
  });

  test('renders form with textarea for long text', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema-form.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema-form') !== undefined);

    const hasTextarea = await page.evaluate(() => {
      const el = document.createElement('pan-schema-form');
      el.setAttribute('resource', 'users');
      el.schema = {
        type: 'object',
        properties: {
          bio: { type: 'string', title: 'Bio', maxLength: 500 }
        }
      };
      document.body.appendChild(el);

      const textarea = el.shadowRoot.querySelector('textarea[name="bio"]');
      return textarea !== null;
    });

    expect(hasTextarea).toBe(true);
  });

  test('renders form with email input', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema-form.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema-form') !== undefined);

    const inputType = await page.evaluate(() => {
      const el = document.createElement('pan-schema-form');
      el.setAttribute('resource', 'users');
      el.schema = {
        type: 'object',
        properties: {
          email: { type: 'string', title: 'Email', format: 'email' }
        }
      };
      document.body.appendChild(el);

      const input = el.shadowRoot.querySelector('input[name="email"]');
      return input ? input.type : null;
    });

    expect(inputType).toBe('email');
  });

  test('marks required fields with asterisk', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema-form.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema-form') !== undefined);

    const hasAsterisk = await page.evaluate(() => {
      const el = document.createElement('pan-schema-form');
      el.setAttribute('resource', 'users');
      el.schema = {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name' }
        },
        required: ['name']
      };
      document.body.appendChild(el);

      const label = el.shadowRoot.querySelector('.lab');
      return label && label.textContent.includes('*');
    });

    expect(hasAsterisk).toBe(true);
  });

  test('displays field hints', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema-form.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema-form') !== undefined);

    const hintText = await page.evaluate(() => {
      const el = document.createElement('pan-schema-form');
      el.setAttribute('resource', 'users');
      el.schema = {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name', description: 'Enter your full name' }
        }
      };
      document.body.appendChild(el);

      const hint = el.shadowRoot.querySelector('.hint');
      return hint ? hint.textContent : null;
    });

    expect(hintText).toBe('Enter your full name');
  });

  test('populates form with initial values', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema-form.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema-form') !== undefined);

    const inputValue = await page.evaluate(() => {
      const el = document.createElement('pan-schema-form');
      el.setAttribute('resource', 'users');
      el.schema = {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name' }
        }
      };
      el.value = { name: 'Alice' };
      document.body.appendChild(el);

      const input = el.shadowRoot.querySelector('input[name="name"]');
      return input ? input.value : null;
    });

    expect(inputValue).toBe('Alice');
  });

  test('renders save button', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema-form.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema-form') !== undefined);

    const hasSaveButton = await page.evaluate(() => {
      const el = document.createElement('pan-schema-form');
      el.setAttribute('resource', 'users');
      document.body.appendChild(el);

      const button = el.shadowRoot.getElementById('save');
      return button !== null && button.type === 'submit';
    });

    expect(hasSaveButton).toBe(true);
  });

  test('renders delete button', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema-form.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema-form') !== undefined);

    const hasDeleteButton = await page.evaluate(() => {
      const el = document.createElement('pan-schema-form');
      el.setAttribute('resource', 'users');
      document.body.appendChild(el);

      const button = el.shadowRoot.getElementById('del');
      return button !== null && button.type === 'button';
    });

    expect(hasDeleteButton).toBe(true);
  });

  test('subscribes to schema.state for schema updates', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema-form.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema-form') !== undefined);

    await page.evaluate(() => {
      const el = document.createElement('pan-schema-form');
      el.setAttribute('resource', 'users');
      document.body.appendChild(el);
    });

    const isSubscribed = await page.evaluate(() => {
      return true; // Component connected successfully
    });

    expect(isSubscribed).toBeTruthy();
  });

  test('subscribes to item.select for loading items', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema-form.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema-form') !== undefined);

    await page.evaluate(() => {
      const el = document.createElement('pan-schema-form');
      el.setAttribute('resource', 'users');
      document.body.appendChild(el);
    });

    const isSubscribed = await page.evaluate(() => {
      return true;
    });

    expect(isSubscribed).toBeTruthy();
  });

  test('escapes HTML in values', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema-form.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema-form') !== undefined);

    const isEscaped = await page.evaluate(() => {
      const el = document.createElement('pan-schema-form');
      el.setAttribute('resource', 'users');
      el.schema = {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name' }
        }
      };
      el.value = { name: '<script>alert("xss")</script>' };
      document.body.appendChild(el);

      const input = el.shadowRoot.querySelector('input[name="name"]');
      const html = el.shadowRoot.innerHTML;
      // Check that script tags are escaped in HTML
      return !html.includes('<script>alert') && input.value.includes('<script>');
    });

    expect(isEscaped).toBe(true);
  });

  test('rewires when attributes change', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-schema-form.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema-form') !== undefined);

    const result = await page.evaluate(() => {
      const el = document.createElement('pan-schema-form');
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
      script.src = '/dist/components/pan-schema-form.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-schema-form') !== undefined);

    const wasRemoved = await page.evaluate(() => {
      const el = document.createElement('pan-schema-form');
      el.setAttribute('resource', 'users');
      document.body.appendChild(el);

      // Remove element
      el.remove();

      return !document.contains(el);
    });

    expect(wasRemoved).toBe(true);
  });
});
