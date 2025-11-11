/**
 * pan-store component tests
 * Tests reactive store functionality and state management
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl } from '../lib/test-utils.mjs';

describe('pan-store', () => {
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

  test('creates a reactive store and publishes changes', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    const result = await page.evaluate(async () => {
      // Create a store element
      const store = document.createElement('pan-store');
      store.setAttribute('topic', 'app.state');
      store.setAttribute('initial', JSON.stringify({ count: 0, name: 'test' }));
      document.body.appendChild(store);

      // Wait for it to be defined
      await customElements.whenDefined('pan-store');

      // Listen for state changes
      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'app.state.change') {
            resolve(e.detail.data);
          }
        }, { once: true });

        // Trigger a change
        setTimeout(() => {
          document.dispatchEvent(new CustomEvent('pan:publish', {
            detail: {
              topic: 'app.state.set',
              data: { count: 5 }
            },
            bubbles: true,
            composed: true
          }));
        }, 100);
      });
    });

    expect(result.count).toBe(5);
  });

  test('handles nested property updates', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    const result = await page.evaluate(async () => {
      const store = document.createElement('pan-store');
      store.setAttribute('topic', 'user.data');
      store.setAttribute('initial', JSON.stringify({
        profile: { name: 'John', age: 30 },
        settings: { theme: 'light' }
      }));
      document.body.appendChild(store);

      await customElements.whenDefined('pan-store');

      return new Promise((resolve) => {
        let changeCount = 0;
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'user.data.change') {
            changeCount++;
            if (changeCount === 1) {
              // Update nested property
              document.dispatchEvent(new CustomEvent('pan:publish', {
                detail: {
                  topic: 'user.data.set',
                  data: { profile: { name: 'Jane', age: 30 } }
                },
                bubbles: true,
                composed: true
              }));
            } else if (changeCount === 2) {
              resolve(e.detail.data);
            }
          }
        });

        // Initial update
        document.dispatchEvent(new CustomEvent('pan:publish', {
          detail: {
            topic: 'user.data.set',
            data: { settings: { theme: 'dark' } }
          },
          bubbles: true,
          composed: true
        }));
      });
    });

    expect(result.profile.name).toBe('Jane');
    expect(result.profile.age).toBe(30);
  });

  test('persists to localStorage when configured', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(async () => {
      const store = document.createElement('pan-store');
      store.setAttribute('topic', 'persist.test');
      store.setAttribute('persist', 'localStorage');
      store.setAttribute('initial', JSON.stringify({ saved: true }));
      document.body.appendChild(store);

      await customElements.whenDefined('pan-store');

      // Trigger a change
      document.dispatchEvent(new CustomEvent('pan:publish', {
        detail: {
          topic: 'persist.test.set',
          data: { saved: true, value: 42 }
        },
        bubbles: true,
        composed: true
      }));

      await new Promise(resolve => setTimeout(resolve, 200));
    });

    // Check if data was persisted to localStorage
    const persisted = await page.evaluate(() => {
      return localStorage.getItem('persist.test');
    });

    expect(persisted).toBeTruthy();
    if (persisted) {
      const data = JSON.parse(persisted);
      expect(data.saved).toBe(true);
      expect(data.value).toBe(42);
    }
  });

  test('supports reset operation', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    const result = await page.evaluate(async () => {
      const store = document.createElement('pan-store');
      store.setAttribute('topic', 'counter.state');
      store.setAttribute('initial', JSON.stringify({ count: 0 }));
      document.body.appendChild(store);

      await customElements.whenDefined('pan-store');

      // Set to new value
      document.dispatchEvent(new CustomEvent('pan:publish', {
        detail: {
          topic: 'counter.state.set',
          data: { count: 10 }
        },
        bubbles: true,
        composed: true
      }));

      await new Promise(resolve => setTimeout(resolve, 50));

      // Reset to initial
      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'counter.state.change' && e.detail.data.count === 0) {
            resolve(e.detail.data);
          }
        });

        document.dispatchEvent(new CustomEvent('pan:publish', {
          detail: { topic: 'counter.state.reset' },
          bubbles: true,
          composed: true
        }));
      });
    });

    expect(result.count).toBe(0);
  });
});
