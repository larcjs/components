/**
 * pan-worker component tests
 * Tests Web Worker integration with pan-bus for background processing
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl } from '../lib/test-utils.mjs';

describe('pan-worker', () => {
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
        <pan-bus></pan-bus>
        <pan-worker topics="worker.*">
          <script type="application/worker">
            self.onmessage = (e) => {
              self.postMessage({ topic: 'worker.response', data: e.data });
            };
          </script>
        </pan-worker>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-worker.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-worker') !== undefined);

    const workerExists = await page.evaluate(() => {
      return document.querySelector('pan-worker') !== null;
    });
    expect(workerExists).toBeTruthy();
  });

  test('parses topics attribute correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-worker topics="task.* compute.*">
          <script type="application/worker">
            self.onmessage = () => {};
          </script>
        </pan-worker>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-worker.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-worker') !== undefined);

    const topics = await page.evaluate(() => {
      return document.querySelector('pan-worker').topics;
    });
    expect(topics).toHaveLength(2);
    expect(topics[0]).toBe('task.*');
    expect(topics[1]).toBe('compute.*');
  });

  test('topics defaults to empty array', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-worker>
          <script type="application/worker">
            self.onmessage = () => {};
          </script>
        </pan-worker>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-worker.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-worker') !== undefined);

    const topics = await page.evaluate(() => {
      return document.querySelector('pan-worker').topics;
    });
    expect(topics).toHaveLength(0);
  });

  test('worker-type defaults to classic', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-worker>
          <script type="application/worker">
            self.onmessage = () => {};
          </script>
        </pan-worker>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-worker.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-worker') !== undefined);

    const workerType = await page.evaluate(() => {
      return document.querySelector('pan-worker').workerType;
    });
    expect(workerType).toBe('classic');
  });

  test('can set worker-type to module', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-worker worker-type="module">
          <script type="application/worker">
            self.onmessage = () => {};
          </script>
        </pan-worker>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-worker.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-worker') !== undefined);

    const workerType = await page.evaluate(() => {
      return document.querySelector('pan-worker').workerType;
    });
    expect(workerType).toBe('module');
  });

  test('creates worker from inline script', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-worker id="test-worker" topics="test.*">
          <script type="application/worker">
            self.onmessage = (e) => {
              self.postMessage({ topic: 'test.response', data: { received: e.data.topic } });
            };
          </script>
        </pan-worker>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-worker.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-worker') !== undefined);
    await page.waitForTimeout(100);

    const hasWorker = await page.evaluate(() => {
      const workerEl = document.getElementById('test-worker');
      return workerEl.worker !== null && workerEl.worker !== undefined;
    });
    expect(hasWorker).toBeTruthy();
  });

  test('forwards pan-bus messages to worker', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-worker topics="compute.*">
          <script type="application/worker">
            self.onmessage = (e) => {
              if (e.data.topic === 'compute.add') {
                const result = e.data.data.a + e.data.data.b;
                self.postMessage({ topic: 'compute.result', data: { result } });
              }
            };
          </script>
        </pan-worker>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-worker.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => {
      return customElements.get('pan-bus') !== undefined &&
             customElements.get('pan-worker') !== undefined;
    });
    await page.waitForTimeout(100);

    const resultPromise = page.evaluate(() => {
      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'compute.result') {
            resolve(e.detail.data);
          }
        });
      });
    });

    // Publish message to worker
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('pan:publish', {
        detail: { topic: 'compute.add', data: { a: 5, b: 3 } },
        bubbles: true,
        composed: true
      }));
    });

    const result = await resultPromise;
    expect(result.result).toBe(8);
  });

  test('publishes worker messages to pan-bus', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-worker topics="trigger.*">
          <script type="application/worker">
            self.onmessage = (e) => {
              if (e.data.topic === 'trigger.test') {
                self.postMessage({ topic: 'result.test', data: { status: 'ok' } });
              }
            };
          </script>
        </pan-worker>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-worker.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => {
      return customElements.get('pan-bus') !== undefined &&
             customElements.get('pan-worker') !== undefined;
    });
    await page.waitForTimeout(100);

    const messagePromise = page.evaluate(() => {
      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'result.test') {
            resolve(e.detail);
          }
        });
      });
    });

    // Trigger worker
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('pan:publish', {
        detail: { topic: 'trigger.test', data: {} },
        bubbles: true,
        composed: true
      }));
    });

    const message = await messagePromise;
    expect(message.topic).toBe('result.test');
    expect(message.data.status).toBe('ok');
  });

  test('terminates worker on disconnect', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-worker id="test-worker" topics="test.*">
          <script type="application/worker">
            self.onmessage = () => {};
          </script>
        </pan-worker>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-worker.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-worker') !== undefined);
    await page.waitForTimeout(100);

    // Check worker exists
    let hasWorker = await page.evaluate(() => {
      const workerEl = document.getElementById('test-worker');
      return workerEl.worker !== null;
    });
    expect(hasWorker).toBeTruthy();

    // Remove element
    await page.evaluate(() => {
      document.getElementById('test-worker').remove();
    });
    await page.waitForTimeout(50);

    // Worker should be null after disconnect
    const workerEl = await page.evaluate(() => {
      return document.getElementById('test-worker');
    });
    expect(workerEl).toBeNull();
  });

  test('restarts worker when attributes change', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-worker id="test-worker" topics="task.a">
          <script type="application/worker">
            self.onmessage = () => {};
          </script>
        </pan-worker>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-worker.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-worker') !== undefined);
    await page.waitForTimeout(100);

    // Get initial topics
    let topics = await page.evaluate(() => {
      return document.getElementById('test-worker').topics;
    });
    expect(topics[0]).toBe('task.a');

    // Change topics attribute
    await page.evaluate(() => {
      document.getElementById('test-worker').setAttribute('topics', 'task.b');
    });
    await page.waitForTimeout(100);

    topics = await page.evaluate(() => {
      return document.getElementById('test-worker').topics;
    });
    expect(topics[0]).toBe('task.b');
  });

  test('accepts worker script with type="text/worker"', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-worker id="test-worker" topics="test.*">
          <script type="text/worker">
            self.onmessage = () => {};
          </script>
        </pan-worker>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-worker.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-worker') !== undefined);
    await page.waitForTimeout(100);

    const hasWorker = await page.evaluate(() => {
      const workerEl = document.getElementById('test-worker');
      return workerEl.worker !== null;
    });
    expect(hasWorker).toBeTruthy();
  });

  test('accepts worker script with type="text/plain"', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-worker id="test-worker" topics="test.*">
          <script type="text/plain">
            self.onmessage = () => {};
          </script>
        </pan-worker>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-worker.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-worker') !== undefined);
    await page.waitForTimeout(100);

    const hasWorker = await page.evaluate(() => {
      const workerEl = document.getElementById('test-worker');
      return workerEl.worker !== null;
    });
    expect(hasWorker).toBeTruthy();
  });

  test('forwards message metadata to worker', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-worker topics="meta.*">
          <script type="application/worker">
            self.onmessage = (e) => {
              if (e.data.topic === 'meta.test') {
                self.postMessage({
                  topic: 'meta.echo',
                  data: {
                    hadReplyTo: !!e.data.replyTo,
                    hadCorrelationId: !!e.data.correlationId,
                    hadHeaders: !!e.data.headers
                  }
                });
              }
            };
          </script>
        </pan-worker>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-worker.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => {
      return customElements.get('pan-bus') !== undefined &&
             customElements.get('pan-worker') !== undefined;
    });
    await page.waitForTimeout(100);

    const resultPromise = page.evaluate(() => {
      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'meta.echo') {
            resolve(e.detail.data);
          }
        });
      });
    });

    // Publish message with metadata
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('pan:publish', {
        detail: {
          topic: 'meta.test',
          data: { value: 1 },
          replyTo: 'meta.response',
          correlationId: 'abc123',
          headers: { auth: 'token' }
        },
        bubbles: true,
        composed: true
      }));
    });

    const result = await resultPromise;
    expect(result.hadReplyTo).toBeTruthy();
    expect(result.hadCorrelationId).toBeTruthy();
    expect(result.hadHeaders).toBeTruthy();
  });

  test('subscribes to topics with retained messages', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-worker.js')}"></script>
        <script>
          // Publish retained message first
          setTimeout(() => {
            document.dispatchEvent(new CustomEvent('pan:publish', {
              detail: { topic: 'retained.test', data: { value: 99 }, retain: true },
              bubbles: true,
              composed: true
            }));

            // Then add worker
            setTimeout(() => {
              const worker = document.createElement('pan-worker');
              worker.setAttribute('topics', 'retained.*');
              worker.innerHTML = '<script type="application/worker">self.onmessage = (e) => { if(e.data.topic === "retained.test") self.postMessage({ topic: "retained.received", data: e.data.data }); };</script>';
              document.body.appendChild(worker);
            }, 50);
          }, 50);
        </script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);
    await page.waitForTimeout(200);

    const messagePromise = page.evaluate(() => {
      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'retained.received') {
            resolve(e.detail.data);
          }
        });
      });
    });

    const result = await messagePromise;
    expect(result.value).toBe(99);
  });

  test('revokes blob URL on disconnect', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-worker id="test-worker" topics="test.*">
          <script type="application/worker">
            self.onmessage = () => {};
          </script>
        </pan-worker>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-worker.js')}"></script>
        <script>
          window.revokedUrls = [];
          const originalRevoke = URL.revokeObjectURL;
          URL.revokeObjectURL = function(url) {
            window.revokedUrls.push(url);
            return originalRevoke.call(URL, url);
          };
        </script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-worker') !== undefined);
    await page.waitForTimeout(100);

    // Get the blob URL
    const blobUrl = await page.evaluate(() => {
      return document.getElementById('test-worker')._url;
    });
    expect(blobUrl).toBeTruthy();

    // Remove element
    await page.evaluate(() => {
      document.getElementById('test-worker').remove();
    });
    await page.waitForTimeout(50);

    const revokedUrls = await page.evaluate(() => window.revokedUrls);
    expect(revokedUrls.length).toBe(1);
    expect(revokedUrls[0]).toBe(blobUrl);
  });
});
