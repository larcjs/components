/**
 * x-counter component tests
 * Tests the XCounter web component for click counting and state synchronization via PAN bus
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl, publishPanMessage, waitForPanMessage } from '../lib/test-utils.mjs';

describe('x-counter', () => {
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

  test('loads and registers custom element', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);
    await page.waitForFunction(() => customElements.get('x-counter') !== undefined);

    const elementExists = await page.evaluate(() => {
      return document.querySelector('x-counter') !== null;
    });

    expect(elementExists).toBeTruthy();
  });

  test('renders with initial state showing "Clicked 0"', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('x-counter') !== undefined);

    const buttonText = await page.evaluate(() => {
      const counter = document.querySelector('x-counter');
      const button = counter.querySelector('button');
      return button ? button.textContent : null;
    });

    expect(buttonText).toBe('Clicked 0');
  });

  test('has a button with correct styling classes', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('x-counter') !== undefined);

    const buttonInfo = await page.evaluate(() => {
      const counter = document.querySelector('x-counter');
      const button = counter.querySelector('button');
      return {
        hasButton: button !== null,
        className: button ? button.className : null,
        hasInlineStyle: button ? button.hasAttribute('style') : false
      };
    });

    expect(buttonInfo.hasButton).toBeTruthy();
    expect(buttonInfo.className).toBe('button-link');
    expect(buttonInfo.hasInlineStyle).toBeTruthy();
  });

  test('publishes demo:click message when button is clicked', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('x-counter') !== undefined);

    // Set up listener for demo:click message
    const messagePromise = page.evaluate(() => {
      return new Promise((resolve) => {
        const handler = (e) => {
          if (e.detail.topic === 'demo:click') {
            document.removeEventListener('pan:deliver', handler);
            resolve(e.detail);
          }
        };
        document.addEventListener('pan:deliver', handler);
      });
    });

    // Click the button
    await page.evaluate(() => {
      const counter = document.querySelector('x-counter');
      const button = counter.querySelector('button');
      button.click();
    });

    const message = await messagePromise;

    expect(message.topic).toBe('demo:click');
    expect(message.data.n).toBe(1);
  });

  test('increments counter on each click', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('x-counter') !== undefined);

    const clickResults = await page.evaluate(async () => {
      const results = [];
      const counter = document.querySelector('x-counter');
      const button = counter.querySelector('button');

      return new Promise((resolve) => {
        let clickCount = 0;
        const handler = (e) => {
          if (e.detail.topic === 'demo:click') {
            results.push(e.detail.data.n);
            clickCount++;
            if (clickCount === 3) {
              document.removeEventListener('pan:deliver', handler);
              resolve(results);
            }
          }
        };

        document.addEventListener('pan:deliver', handler);

        // Click three times
        button.click();
        setTimeout(() => button.click(), 50);
        setTimeout(() => button.click(), 100);
      });
    });

    expect(clickResults).toHaveLength(3);
    expect(clickResults[0]).toBe(1);
    expect(clickResults[1]).toBe(2);
    expect(clickResults[2]).toBe(3);
  });

  test('updates button text when receiving demo:click messages', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('x-counter') !== undefined);

    // Click button to increment
    await page.evaluate(() => {
      const counter = document.querySelector('x-counter');
      const button = counter.querySelector('button');
      button.click();
    });

    // Wait for update
    await page.waitForTimeout(200);

    const buttonText = await page.evaluate(() => {
      const counter = document.querySelector('x-counter');
      const button = counter.querySelector('button');
      return button.textContent;
    });

    expect(buttonText).toBe('Clicked 1');
  });

  test('publishes retained messages', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('x-counter') !== undefined);

    // Click button
    await page.evaluate(() => {
      const counter = document.querySelector('x-counter');
      const button = counter.querySelector('button');
      button.click();
    });

    await page.waitForTimeout(200);

    // Check if message is retained
    const retainedMessage = await page.evaluate(() => {
      const bus = document.querySelector('pan-bus');
      return bus.retained.get('demo:click');
    });

    expect(retainedMessage).toBeTruthy();
    expect(retainedMessage.topic).toBe('demo:click');
    expect(retainedMessage.data.n).toBe(1);
  });

  test('subscribes to retained demo:click messages on connect', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    // Publish a retained message before counter connects
    await publishPanMessage(page, 'demo:click', { n: 42 }, { retain: true });

    await page.waitForTimeout(100);

    // Now load the counter component
    await page.evaluate(() => {
      const counter = document.createElement('x-counter');
      counter.id = 'late-counter';
      document.body.appendChild(counter);
    });

    await page.waitForTimeout(200);

    // Check if it picked up the retained state
    const buttonText = await page.evaluate(() => {
      const counter = document.querySelector('#late-counter');
      const button = counter.querySelector('button');
      return button ? button.textContent : null;
    });

    expect(buttonText).toBe('Clicked 42');
  });

  test('multiple counters sync via shared state', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('x-counter') !== undefined);

    // Add a second counter
    await page.evaluate(() => {
      const counter = document.createElement('x-counter');
      counter.id = 'counter-2';
      document.body.appendChild(counter);
    });

    await page.waitForTimeout(200);

    // Click the first counter
    await page.evaluate(() => {
      const counter = document.querySelector('x-counter');
      const button = counter.querySelector('button');
      button.click();
    });

    await page.waitForTimeout(200);

    // Check both counters are synced
    const counterTexts = await page.evaluate(() => {
      const counter1 = document.querySelector('x-counter');
      const counter2 = document.querySelector('#counter-2');

      return {
        counter1: counter1.querySelector('button').textContent,
        counter2: counter2.querySelector('button').textContent
      };
    });

    expect(counterTexts.counter1).toBe('Clicked 1');
    expect(counterTexts.counter2).toBe('Clicked 1');
  });

  test('counter state persists across multiple interactions', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('x-counter') !== undefined);

    // Click multiple times and verify count increases
    await page.evaluate(() => {
      const counter = document.querySelector('x-counter');
      const button = counter.querySelector('button');
      button.click();
    });
    await page.waitForTimeout(100);

    await page.evaluate(() => {
      const counter = document.querySelector('x-counter');
      const button = counter.querySelector('button');
      button.click();
    });
    await page.waitForTimeout(100);

    await page.evaluate(() => {
      const counter = document.querySelector('x-counter');
      const button = counter.querySelector('button');
      button.click();
    });
    await page.waitForTimeout(100);

    const finalText = await page.evaluate(() => {
      const counter = document.querySelector('x-counter');
      const button = counter.querySelector('button');
      return button.textContent;
    });

    expect(finalText).toBe('Clicked 3');
  });

  test('PanClient is properly initialized with element context', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('x-counter') !== undefined);

    const hasPC = await page.evaluate(() => {
      const counter = document.querySelector('x-counter');
      return counter.pc !== undefined && counter.pc !== null;
    });

    expect(hasPC).toBeTruthy();
  });

  test('internal counter state increments correctly', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('x-counter') !== undefined);

    const counterState = await page.evaluate(async () => {
      const counter = document.querySelector('x-counter');
      const button = counter.querySelector('button');

      const before = counter.n;
      button.click();
      await new Promise(resolve => setTimeout(resolve, 50));
      const after = counter.n;

      return { before, after };
    });

    expect(counterState.before).toBe(0);
    expect(counterState.after).toBe(1);
  });

  test('handles rapid clicking correctly', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('x-counter') !== undefined);

    const finalCount = await page.evaluate(async () => {
      const counter = document.querySelector('x-counter');
      const button = counter.querySelector('button');

      // Rapid clicks
      for (let i = 0; i < 10; i++) {
        button.click();
      }

      // Wait for all messages to process
      await new Promise(resolve => setTimeout(resolve, 300));

      return counter.n;
    });

    expect(finalCount).toBe(10);
  });
});
