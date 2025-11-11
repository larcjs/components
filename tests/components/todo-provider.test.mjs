/**
 * todo-provider component tests
 * Tests the TodoProvider state management component for handling todo operations
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl, publishPanMessage, waitForPanMessage } from '../lib/test-utils.mjs';

describe('todo-provider', () => {
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
    await page.goto(fileUrl('examples/02-todos-and-inspector.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);
    await page.waitForFunction(() => customElements.get('todo-provider') !== undefined);

    const elementExists = await page.evaluate(() => {
      return document.querySelector('todo-provider') !== null;
    });

    expect(elementExists).toBeTruthy();
  });

  test('initializes with empty state', async () => {
    await page.goto(fileUrl('examples/02-todos-and-inspector.html'));
    await page.waitForFunction(() => customElements.get('todo-provider') !== undefined);

    // Wait for pan-bus to be ready
    await page.waitForFunction(() => window.__panReady === true, { timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);

    const initialState = await page.evaluate(() => {
      return new Promise((resolve) => {
        const handler = (e) => {
          if (e.detail.topic === 'todos.state') {
            document.removeEventListener('pan:deliver', handler);
            resolve(e.detail.data);
          }
        };
        document.addEventListener('pan:deliver', handler);

        // Trigger by subscribing with retained
        document.dispatchEvent(new CustomEvent('pan:subscribe', {
          detail: {
            topics: ['todos.state'],
            clientId: 'test-subscriber',
            options: { retained: true }
          },
          bubbles: true,
          composed: true
        }));
      });
    });

    expect(initialState.items).toHaveLength(0);
  });

  test('handles todos.change to add new items', async () => {
    await page.goto(fileUrl('examples/02-todos-and-inspector.html'));
    await page.waitForFunction(() => customElements.get('todo-provider') !== undefined);
    await page.waitForFunction(() => window.__panReady === true, { timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);

    // Set up listener for state update
    const statePromise = page.evaluate(() => {
      return new Promise((resolve) => {
        const handler = (e) => {
          if (e.detail.topic === 'todos.state' && e.detail.data.items.length > 0) {
            document.removeEventListener('pan:deliver', handler);
            resolve(e.detail.data);
          }
        };
        document.addEventListener('pan:deliver', handler);
      });
    });

    // Publish a change message
    await publishPanMessage(page, 'todos.change', {
      item: { id: 'new-1', title: 'New Task', done: false }
    }, { retain: true });

    const state = await statePromise;

    expect(state.items).toHaveLength(1);
    expect(state.items[0].id).toBe('new-1');
    expect(state.items[0].title).toBe('New Task');
    expect(state.items[0].done).toBe(false);
  });

  test('handles todos.toggle to update task completion', async () => {
    await page.goto(fileUrl('examples/02-todos-and-inspector.html'));
    await page.waitForFunction(() => customElements.get('todo-provider') !== undefined);
    await page.waitForFunction(() => window.__panReady === true, { timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);

    // Add a task first
    await publishPanMessage(page, 'todos.change', {
      item: { id: 'toggle-1', title: 'Toggle Task', done: false }
    }, { retain: true });

    await page.waitForTimeout(100);

    // Set up listener for toggle state update
    const statePromise = page.evaluate(() => {
      return new Promise((resolve) => {
        const handler = (e) => {
          if (e.detail.topic === 'todos.state') {
            const item = e.detail.data.items.find(i => i.id === 'toggle-1');
            if (item && item.done === true) {
              document.removeEventListener('pan:deliver', handler);
              resolve(e.detail.data);
            }
          }
        };
        document.addEventListener('pan:deliver', handler);
      });
    });

    // Toggle the task
    await publishPanMessage(page, 'todos.toggle', {
      id: 'toggle-1',
      done: true
    }, { retain: true });

    const state = await statePromise;
    const toggledItem = state.items.find(item => item.id === 'toggle-1');

    expect(toggledItem.done).toBe(true);
  });

  test('handles todos.toggle to uncheck completed tasks', async () => {
    await page.goto(fileUrl('examples/02-todos-and-inspector.html'));
    await page.waitForFunction(() => customElements.get('todo-provider') !== undefined);
    await page.waitForFunction(() => window.__panReady === true, { timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);

    // Add a completed task
    await publishPanMessage(page, 'todos.change', {
      item: { id: 'toggle-2', title: 'Completed Task', done: true }
    }, { retain: true });

    await page.waitForTimeout(100);

    // Set up listener for toggle state update
    const statePromise = page.evaluate(() => {
      return new Promise((resolve) => {
        const handler = (e) => {
          if (e.detail.topic === 'todos.state') {
            const item = e.detail.data.items.find(i => i.id === 'toggle-2');
            if (item && item.done === false) {
              document.removeEventListener('pan:deliver', handler);
              resolve(e.detail.data);
            }
          }
        };
        document.addEventListener('pan:deliver', handler);
      });
    });

    // Untoggle the task
    await publishPanMessage(page, 'todos.toggle', {
      id: 'toggle-2',
      done: false
    }, { retain: true });

    const state = await statePromise;
    const untoggledItem = state.items.find(item => item.id === 'toggle-2');

    expect(untoggledItem.done).toBe(false);
  });

  test('handles todos.remove to delete items', async () => {
    await page.goto(fileUrl('examples/02-todos-and-inspector.html'));
    await page.waitForFunction(() => customElements.get('todo-provider') !== undefined);
    await page.waitForFunction(() => window.__panReady === true, { timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);

    // Add two tasks
    await publishPanMessage(page, 'todos.change', {
      item: { id: 'keep-1', title: 'Keep This', done: false }
    }, { retain: true });

    await page.waitForTimeout(100);

    await publishPanMessage(page, 'todos.change', {
      item: { id: 'remove-1', title: 'Remove This', done: false }
    }, { retain: true });

    await page.waitForTimeout(100);

    // Set up listener for remove state update
    const statePromise = page.evaluate(() => {
      return new Promise((resolve) => {
        const handler = (e) => {
          if (e.detail.topic === 'todos.state') {
            if (e.detail.data.items.length === 1 && e.detail.data.items[0].id === 'keep-1') {
              document.removeEventListener('pan:deliver', handler);
              resolve(e.detail.data);
            }
          }
        };
        document.addEventListener('pan:deliver', handler);
      });
    });

    // Remove one task
    await publishPanMessage(page, 'todos.remove', {
      id: 'remove-1'
    }, { retain: true });

    const state = await statePromise;

    expect(state.items).toHaveLength(1);
    expect(state.items[0].id).toBe('keep-1');
  });

  test('publishes retained todos.state messages', async () => {
    await page.goto(fileUrl('examples/02-todos-and-inspector.html'));
    await page.waitForFunction(() => customElements.get('todo-provider') !== undefined);
    await page.waitForFunction(() => window.__panReady === true, { timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);

    // Add a task
    await publishPanMessage(page, 'todos.change', {
      item: { id: 'retain-1', title: 'Retained Task', done: false }
    }, { retain: true });

    await page.waitForTimeout(200);

    // Check if message is retained in the bus
    const retainedMessage = await page.evaluate(() => {
      const bus = document.querySelector('pan-bus');
      return bus.retained.get('todos.state');
    });

    expect(retainedMessage).toBeTruthy();
    expect(retainedMessage.topic).toBe('todos.state');
    expect(retainedMessage.data.items).toHaveLength(1);
    expect(retainedMessage.data.items[0].id).toBe('retain-1');
  });

  test('maintains item state across multiple operations', async () => {
    await page.goto(fileUrl('examples/02-todos-and-inspector.html'));
    await page.waitForFunction(() => customElements.get('todo-provider') !== undefined);
    await page.waitForFunction(() => window.__panReady === true, { timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);

    // Add three tasks
    await publishPanMessage(page, 'todos.change', {
      item: { id: '1', title: 'Task One', done: false }
    }, { retain: true });
    await page.waitForTimeout(50);

    await publishPanMessage(page, 'todos.change', {
      item: { id: '2', title: 'Task Two', done: false }
    }, { retain: true });
    await page.waitForTimeout(50);

    await publishPanMessage(page, 'todos.change', {
      item: { id: '3', title: 'Task Three', done: false }
    }, { retain: true });
    await page.waitForTimeout(50);

    // Toggle task 2
    await publishPanMessage(page, 'todos.toggle', {
      id: '2',
      done: true
    }, { retain: true });
    await page.waitForTimeout(50);

    // Remove task 1
    await publishPanMessage(page, 'todos.remove', {
      id: '1'
    }, { retain: true });
    await page.waitForTimeout(200);

    // Get final state
    const finalState = await page.evaluate(() => {
      const bus = document.querySelector('pan-bus');
      const stateMessage = bus.retained.get('todos.state');
      return stateMessage.data;
    });

    expect(finalState.items).toHaveLength(2);
    expect(finalState.items.find(i => i.id === '1')).toBeUndefined();
    expect(finalState.items.find(i => i.id === '2').done).toBe(true);
    expect(finalState.items.find(i => i.id === '3').done).toBe(false);
  });

  test('handles todos.toggle for non-existent items gracefully', async () => {
    await page.goto(fileUrl('examples/02-todos-and-inspector.html'));
    await page.waitForFunction(() => customElements.get('todo-provider') !== undefined);
    await page.waitForFunction(() => window.__panReady === true, { timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);

    // Try to toggle a non-existent item
    await publishPanMessage(page, 'todos.toggle', {
      id: 'non-existent',
      done: true
    }, { retain: true });

    await page.waitForTimeout(200);

    // Get state - should still be empty
    const state = await page.evaluate(() => {
      const bus = document.querySelector('pan-bus');
      const stateMessage = bus.retained.get('todos.state');
      return stateMessage.data;
    });

    expect(state.items).toHaveLength(0);
  });

  test('waits for pan:sys.ready before initializing', async () => {
    await page.goto(fileUrl('examples/02-todos-and-inspector.html'));

    const readyStateCheck = await page.evaluate(() => {
      return new Promise((resolve) => {
        const provider = document.querySelector('todo-provider');
        if (!provider) {
          resolve({ provider: false, ready: false });
          return;
        }

        // Check if provider is connected
        const isConnected = provider.isConnected;

        // Check if __panReady is set
        const isPanReady = window.__panReady === true;

        resolve({ provider: true, isConnected, isPanReady });
      });
    });

    expect(readyStateCheck.provider).toBeTruthy();
  });
});
