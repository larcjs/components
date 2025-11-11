/**
 * pan-store-pan component tests
 * Tests the syncItem and syncList store synchronization utilities
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl, publishPanMessage, waitForPanMessage } from '../lib/test-utils.mjs';

describe('pan-store-pan', () => {
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

  test('syncItem loads module successfully', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    const moduleLoaded = await page.evaluate(async () => {
      try {
        const module = await import('../dist/components/pan-store-pan.js');
        return module.syncItem !== undefined && module.syncList !== undefined;
      } catch (e) {
        return false;
      }
    });

    expect(moduleLoaded).toBeTruthy();
  });

  test('syncItem subscribes to item state updates', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    const result = await page.evaluate(async () => {
      const { syncItem } = await import('../dist/components/pan-store-pan.js');

      // Create a simple store
      const store = {
        data: {},
        _setAll(obj) {
          this.data = { ...obj };
        },
        patch(obj) {
          this.data = { ...this.data, ...obj };
        },
        snapshot() {
          return { ...this.data };
        },
        subscribe(fn) {
          this._onChange = fn;
          return () => { this._onChange = null; };
        }
      };

      // Sync with a specific ID
      const cleanup = syncItem(store, {
        resource: 'test-items',
        id: 'item-1',
        autoSave: false
      });

      // Wait a bit for subscription to be established
      await new Promise(resolve => setTimeout(resolve, 100));

      // Publish an item state update
      document.dispatchEvent(new CustomEvent('pan:publish', {
        detail: {
          topic: 'test-items.item.state.item-1',
          data: { item: { id: 'item-1', title: 'Test Item', count: 5 } },
          retain: true
        },
        bubbles: true,
        composed: true
      }));

      // Wait for the update to be applied
      await new Promise(resolve => setTimeout(resolve, 100));

      const storeData = store.snapshot();
      cleanup();

      return storeData;
    });

    expect(result.id).toBe('item-1');
    expect(result.title).toBe('Test Item');
    expect(result.count).toBe(5);
  });

  test('syncItem applies patch updates', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    const result = await page.evaluate(async () => {
      const { syncItem } = await import('../dist/components/pan-store-pan.js');

      const store = {
        data: { id: 'item-1', title: 'Original', count: 0 },
        _setAll(obj) {
          this.data = { ...obj };
        },
        patch(obj) {
          this.data = { ...this.data, ...obj };
        },
        snapshot() {
          return { ...this.data };
        },
        subscribe(fn) {
          this._onChange = fn;
          return () => { this._onChange = null; };
        }
      };

      const cleanup = syncItem(store, {
        resource: 'test-items',
        id: 'item-1',
        autoSave: false,
        live: true
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Publish a patch update
      document.dispatchEvent(new CustomEvent('pan:publish', {
        detail: {
          topic: 'test-items.item.state.item-1',
          data: { patch: { count: 10, status: 'updated' } }
        },
        bubbles: true,
        composed: true
      }));

      await new Promise(resolve => setTimeout(resolve, 100));

      const storeData = store.snapshot();
      cleanup();

      return storeData;
    });

    expect(result.count).toBe(10);
    expect(result.status).toBe('updated');
  });

  test('syncItem handles deleted items', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    const result = await page.evaluate(async () => {
      const { syncItem } = await import('../dist/components/pan-store-pan.js');

      const store = {
        data: { id: 'item-1', title: 'To Delete', count: 5 },
        _setAll(obj) {
          this.data = { ...obj };
        },
        patch(obj) {
          this.data = { ...this.data, ...obj };
        },
        snapshot() {
          return { ...this.data };
        },
        subscribe(fn) {
          this._onChange = fn;
          return () => { this._onChange = null; };
        }
      };

      const cleanup = syncItem(store, {
        resource: 'test-items',
        id: 'item-1',
        autoSave: false
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Publish deletion
      document.dispatchEvent(new CustomEvent('pan:publish', {
        detail: {
          topic: 'test-items.item.state.item-1',
          data: { deleted: true, id: 'item-1' }
        },
        bubbles: true,
        composed: true
      }));

      await new Promise(resolve => setTimeout(resolve, 100));

      const storeData = store.snapshot();
      cleanup();

      return storeData;
    });

    // After deletion, store should be empty
    expect(Object.keys(result)).toHaveLength(0);
  });

  test('syncList subscribes to list state', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    const result = await page.evaluate(async () => {
      const { syncList } = await import('../dist/components/pan-store-pan.js');

      const store = {
        data: { items: [] },
        _setAll(obj) {
          this.data = { ...obj };
        },
        snapshot() {
          return { ...this.data };
        }
      };

      const cleanup = syncList(store, {
        resource: 'test-items',
        live: false
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Publish list state
      document.dispatchEvent(new CustomEvent('pan:publish', {
        detail: {
          topic: 'test-items.list.state',
          data: {
            items: [
              { id: '1', title: 'Item One' },
              { id: '2', title: 'Item Two' }
            ]
          },
          retain: true
        },
        bubbles: true,
        composed: true
      }));

      await new Promise(resolve => setTimeout(resolve, 150));

      const storeData = store.snapshot();
      cleanup();

      return storeData;
    });

    expect(result.items).toHaveLength(2);
    expect(result.items[0].title).toBe('Item One');
    expect(result.items[1].title).toBe('Item Two');
  });

  test('syncList handles live item updates', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    const result = await page.evaluate(async () => {
      const { syncList } = await import('../dist/components/pan-store-pan.js');

      const store = {
        data: { items: [] },
        _setAll(obj) {
          this.data = { ...obj };
        },
        snapshot() {
          return { ...this.data };
        }
      };

      const cleanup = syncList(store, {
        resource: 'test-items',
        key: 'id',
        live: true
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Publish initial list
      document.dispatchEvent(new CustomEvent('pan:publish', {
        detail: {
          topic: 'test-items.list.state',
          data: { items: [{ id: '1', title: 'Item One', status: 'pending' }] },
          retain: true
        },
        bubbles: true,
        composed: true
      }));

      await new Promise(resolve => setTimeout(resolve, 100));

      // Publish live update for specific item
      document.dispatchEvent(new CustomEvent('pan:publish', {
        detail: {
          topic: 'test-items.item.state.1',
          data: { item: { id: '1', title: 'Item One Updated', status: 'complete' } }
        },
        bubbles: true,
        composed: true
      }));

      await new Promise(resolve => setTimeout(resolve, 100));

      const storeData = store.snapshot();
      cleanup();

      return storeData;
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Item One Updated');
    expect(result.items[0].status).toBe('complete');
  });

  test('syncList adds new items via live updates', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    const result = await page.evaluate(async () => {
      const { syncList } = await import('../dist/components/pan-store-pan.js');

      const store = {
        data: { items: [] },
        _setAll(obj) {
          this.data = { ...obj };
        },
        snapshot() {
          return { ...this.data };
        }
      };

      const cleanup = syncList(store, {
        resource: 'test-items',
        live: true
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Publish initial empty list
      document.dispatchEvent(new CustomEvent('pan:publish', {
        detail: {
          topic: 'test-items.list.state',
          data: { items: [] },
          retain: true
        },
        bubbles: true,
        composed: true
      }));

      await new Promise(resolve => setTimeout(resolve, 100));

      // Add item via live update
      document.dispatchEvent(new CustomEvent('pan:publish', {
        detail: {
          topic: 'test-items.item.state.new-1',
          data: { item: { id: 'new-1', title: 'New Item' } }
        },
        bubbles: true,
        composed: true
      }));

      await new Promise(resolve => setTimeout(resolve, 100));

      const storeData = store.snapshot();
      cleanup();

      return storeData;
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('new-1');
    expect(result.items[0].title).toBe('New Item');
  });

  test('syncList removes deleted items', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    const result = await page.evaluate(async () => {
      const { syncList } = await import('../dist/components/pan-store-pan.js');

      const store = {
        data: { items: [] },
        _setAll(obj) {
          this.data = { ...obj };
        },
        snapshot() {
          return { ...this.data };
        }
      };

      const cleanup = syncList(store, {
        resource: 'test-items',
        live: true
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Publish initial list with two items
      document.dispatchEvent(new CustomEvent('pan:publish', {
        detail: {
          topic: 'test-items.list.state',
          data: {
            items: [
              { id: '1', title: 'Keep' },
              { id: '2', title: 'Delete' }
            ]
          },
          retain: true
        },
        bubbles: true,
        composed: true
      }));

      await new Promise(resolve => setTimeout(resolve, 100));

      // Delete item via live update
      document.dispatchEvent(new CustomEvent('pan:publish', {
        detail: {
          topic: 'test-items.item.state.2',
          data: { deleted: true, id: '2' }
        },
        bubbles: true,
        composed: true
      }));

      await new Promise(resolve => setTimeout(resolve, 100));

      const storeData = store.snapshot();
      cleanup();

      return storeData;
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('1');
    expect(result.items[0].title).toBe('Keep');
  });
});
