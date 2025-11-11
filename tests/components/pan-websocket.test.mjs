/**
 * pan-websocket component tests
 * Tests WebSocket integration with pan-bus for bidirectional messaging
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl } from '../lib/test-utils.mjs';

describe('pan-websocket', () => {
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
        <pan-websocket url="ws://localhost:8080"></pan-websocket>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-websocket.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-websocket') !== undefined);

    const wsExists = await page.evaluate(() => {
      return document.querySelector('pan-websocket') !== null;
    });
    expect(wsExists).toBeTruthy();
  });

  test('parses url attribute correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-websocket url="ws://localhost:8080/chat"></pan-websocket>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-websocket.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-websocket') !== undefined);

    const url = await page.evaluate(() => {
      return document.querySelector('pan-websocket').url;
    });
    expect(url).toBe('ws://localhost:8080/chat');
  });

  test('parses protocols attribute correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-websocket url="ws://localhost:8080" protocols="chat,v1"></pan-websocket>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-websocket.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-websocket') !== undefined);

    const protocols = await page.evaluate(() => {
      return document.querySelector('pan-websocket').protocols;
    });
    expect(protocols).toBe('chat,v1');
  });

  test('parses outbound-topics attribute correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-websocket url="ws://localhost:8080" outbound-topics="user.* chat.*"></pan-websocket>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-websocket.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-websocket') !== undefined);

    const topics = await page.evaluate(() => {
      return document.querySelector('pan-websocket').outboundTopics;
    });
    expect(topics).toHaveLength(2);
    expect(topics[0]).toBe('user.*');
    expect(topics[1]).toBe('chat.*');
  });

  test('parses inbound-topics attribute correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-websocket url="ws://localhost:8080" inbound-topics="message.* status.*"></pan-websocket>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-websocket.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-websocket') !== undefined);

    const topics = await page.evaluate(() => {
      return document.querySelector('pan-websocket').inboundTopics;
    });
    expect(topics).toHaveLength(2);
    expect(topics[0]).toBe('message.*');
    expect(topics[1]).toBe('status.*');
  });

  test('inbound-topics defaults to wildcard', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-websocket url="ws://localhost:8080"></pan-websocket>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-websocket.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-websocket') !== undefined);

    const topics = await page.evaluate(() => {
      return document.querySelector('pan-websocket').inboundTopics;
    });
    expect(topics).toHaveLength(1);
    expect(topics[0]).toBe('*');
  });

  test('auto-reconnect defaults to true', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-websocket url="ws://localhost:8080"></pan-websocket>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-websocket.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-websocket') !== undefined);

    const autoReconnect = await page.evaluate(() => {
      return document.querySelector('pan-websocket').autoReconnect;
    });
    expect(autoReconnect).toBeTruthy();
  });

  test('can disable auto-reconnect', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-websocket url="ws://localhost:8080" auto-reconnect="false"></pan-websocket>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-websocket.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-websocket') !== undefined);

    const autoReconnect = await page.evaluate(() => {
      return document.querySelector('pan-websocket').autoReconnect;
    });
    expect(autoReconnect).toBeFalsy();
  });

  test('parses reconnect-delay attribute correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-websocket url="ws://localhost:8080" reconnect-delay="2000,30000"></pan-websocket>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-websocket.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-websocket') !== undefined);

    const delay = await page.evaluate(() => {
      return document.querySelector('pan-websocket').reconnectDelay;
    });
    expect(delay.min).toBe(2000);
    expect(delay.max).toBe(30000);
  });

  test('reconnect-delay defaults to 1000,15000', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-websocket url="ws://localhost:8080"></pan-websocket>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-websocket.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-websocket') !== undefined);

    const delay = await page.evaluate(() => {
      return document.querySelector('pan-websocket').reconnectDelay;
    });
    expect(delay.min).toBe(1000);
    expect(delay.max).toBe(15000);
  });

  test('parses heartbeat attribute correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-websocket url="ws://localhost:8080" heartbeat="60"></pan-websocket>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-websocket.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-websocket') !== undefined);

    const heartbeat = await page.evaluate(() => {
      return document.querySelector('pan-websocket').heartbeat;
    });
    expect(heartbeat).toBe(60);
  });

  test('heartbeat defaults to 30', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-websocket url="ws://localhost:8080"></pan-websocket>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-websocket.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-websocket') !== undefined);

    const heartbeat = await page.evaluate(() => {
      return document.querySelector('pan-websocket').heartbeat;
    });
    expect(heartbeat).toBe(30);
  });

  test('parses heartbeat-topic attribute correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-websocket url="ws://localhost:8080" heartbeat-topic="heartbeat"></pan-websocket>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-websocket.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-websocket') !== undefined);

    const topic = await page.evaluate(() => {
      return document.querySelector('pan-websocket').heartbeatTopic;
    });
    expect(topic).toBe('heartbeat');
  });

  test('heartbeat-topic defaults to sys.ping', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-websocket url="ws://localhost:8080"></pan-websocket>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-websocket.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-websocket') !== undefined);

    const topic = await page.evaluate(() => {
      return document.querySelector('pan-websocket').heartbeatTopic;
    });
    expect(topic).toBe('sys.ping');
  });

  test('send method works correctly when connected', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-websocket id="test-ws" url="ws://localhost:8080"></pan-websocket>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-websocket.js')}"></script>
        <script>
          window.sentMessages = [];
          window.WebSocket = class MockWebSocket {
            constructor(url, protocols) {
              this.readyState = 1; // OPEN
              setTimeout(() => {
                this.onopen && this.onopen();
              }, 10);
            }
            send(data) {
              window.sentMessages.push(data);
            }
            close() {}
            addEventListener(event, handler) {
              if (event === 'open') this.onopen = handler;
            }
          };
        </script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-websocket') !== undefined);
    await page.waitForTimeout(100);

    await page.evaluate(() => {
      const ws = document.getElementById('test-ws');
      ws.send({ topic: 'test', data: { value: 42 } });
    });
    await page.waitForTimeout(50);

    const messages = await page.evaluate(() => window.sentMessages);
    expect(messages.length).toBe(1);
    const parsed = JSON.parse(messages[0]);
    expect(parsed.topic).toBe('test');
    expect(parsed.data.value).toBe(42);
  });

  test('publishes ws.connected message on connection', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-websocket url="ws://localhost:8080"></pan-websocket>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-websocket.js')}"></script>
        <script>
          window.WebSocket = class MockWebSocket {
            constructor(url, protocols) {
              setTimeout(() => {
                this.onopen && this.onopen();
              }, 10);
            }
            close() {}
            addEventListener(event, handler) {
              if (event === 'open') this.onopen = handler;
              if (event === 'message') this.onmessage = handler;
              if (event === 'close') this.onclose = handler;
              if (event === 'error') this.onerror = handler;
            }
          };
        </script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => {
      return customElements.get('pan-bus') !== undefined &&
             customElements.get('pan-websocket') !== undefined;
    });

    const messagePromise = page.evaluate(() => {
      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'ws.connected') {
            resolve(e.detail);
          }
        });
      });
    });

    const message = await messagePromise;
    expect(message.topic).toBe('ws.connected');
    expect(message.data.url).toBe('ws://localhost:8080');
  });

  test('publishes ws.disconnected message on close', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-websocket url="ws://localhost:8080"></pan-websocket>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-websocket.js')}"></script>
        <script>
          window.mockWs = null;
          window.WebSocket = class MockWebSocket {
            constructor(url, protocols) {
              window.mockWs = this;
              setTimeout(() => this.onopen && this.onopen(), 10);
            }
            close() {
              setTimeout(() => {
                this.onclose && this.onclose({ code: 1000, reason: 'test', wasClean: true });
              }, 10);
            }
            addEventListener(event, handler) {
              if (event === 'open') this.onopen = handler;
              if (event === 'close') this.onclose = handler;
              if (event === 'message') this.onmessage = handler;
              if (event === 'error') this.onerror = handler;
            }
          };
        </script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => {
      return customElements.get('pan-websocket') !== undefined &&
             window.mockWs !== null;
    });

    const messagePromise = page.evaluate(() => {
      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'ws.disconnected') {
            resolve(e.detail);
          }
        });
        setTimeout(() => {
          document.querySelector('pan-websocket').close();
        }, 50);
      });
    });

    const message = await messagePromise;
    expect(message.topic).toBe('ws.disconnected');
    expect(message.data.code).toBe(1000);
    expect(message.data.wasClean).toBeTruthy();
  });

  test('closes WebSocket on disconnect', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-websocket id="test-ws" url="ws://localhost:8080"></pan-websocket>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-websocket.js')}"></script>
        <script>
          window.wsClosed = false;
          window.WebSocket = class MockWebSocket {
            constructor() {
              setTimeout(() => this.onopen && this.onopen(), 10);
            }
            close() {
              window.wsClosed = true;
            }
            addEventListener(event, handler) {
              if (event === 'open') this.onopen = handler;
            }
          };
        </script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-websocket') !== undefined);
    await page.waitForTimeout(100);

    // Remove element
    await page.evaluate(() => {
      document.getElementById('test-ws').remove();
    });
    await page.waitForTimeout(100);

    const closed = await page.evaluate(() => window.wsClosed);
    expect(closed).toBeTruthy();
  });

  test('reconnect method works correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-websocket id="test-ws" url="ws://localhost:8080"></pan-websocket>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-websocket.js')}"></script>
        <script>
          window.connectionCount = 0;
          window.WebSocket = class MockWebSocket {
            constructor() {
              window.connectionCount++;
              setTimeout(() => this.onopen && this.onopen(), 10);
            }
            close() {}
            addEventListener(event, handler) {
              if (event === 'open') this.onopen = handler;
            }
          };
        </script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-websocket') !== undefined);
    await page.waitForTimeout(100);

    // Trigger reconnect
    await page.evaluate(() => {
      document.getElementById('test-ws').reconnect();
    });
    await page.waitForTimeout(100);

    const count = await page.evaluate(() => window.connectionCount);
    expect(count).toBe(2); // Initial connection + reconnect
  });

  test('handles empty url gracefully', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-websocket url=""></pan-websocket>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-websocket.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-websocket') !== undefined);

    const ws = await page.evaluate(() => {
      return document.querySelector('pan-websocket').ws;
    });
    expect(ws).toBeNull();
  });
});
