// <pan-idb> — IndexedDB bridge to PAN topics
// Attributes:
//   - database: database name (required)
//   - version: database version (default: 1)
//   - store: object store name (required)
//   - key-path: key path for objects (default: "id")
//   - auto-increment: use auto-incrementing keys (default: false)
//   - indexes: JSON array of index configs: [{name, keyPath, unique?, multiEntry?}]
//
// Topics (where resource = store name):
//   - Subscribes: ${resource}.idb.get { key }
//   - Subscribes: ${resource}.idb.put { item }
//   - Subscribes: ${resource}.idb.add { item }
//   - Subscribes: ${resource}.idb.delete { key }
//   - Subscribes: ${resource}.idb.clear {}
//   - Subscribes: ${resource}.idb.list { index?, range?, direction?, limit? }
//   - Subscribes: ${resource}.idb.query { index, value }
//   - Publishes: ${resource}.idb.result { success, data?, error? }
//   - Publishes: ${resource}.idb.ready {}

import { PanClient } from '../../../core/src/components/pan-client.mjs';

export class PanIDB extends HTMLElement {
  static get observedAttributes() {
    return ['database', 'version', 'store', 'key-path', 'auto-increment', 'indexes'];
  }

  constructor() {
    super();
    this.pc = new PanClient(this);
    this.db = null;
    this.initPromise = null;
  }

  connectedCallback() {
    this.#init();
    this.#subscribe();
  }

  disconnectedCallback() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  attributeChangedCallback(name) {
    if (['database', 'version', 'store'].includes(name) && this.isConnected) {
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      this.#init();
    }
  }

  get database() { return this.getAttribute('database') || ''; }
  get version() { return Number(this.getAttribute('version')) || 1; }
  get store() { return this.getAttribute('store') || ''; }
  get keyPath() { return this.getAttribute('key-path') || 'id'; }
  get autoIncrement() { return this.hasAttribute('auto-increment'); }
  get indexes() {
    const attr = this.getAttribute('indexes');
    if (!attr) return [];
    try {
      return JSON.parse(attr);
    } catch {
      return [];
    }
  }

  // Public API
  async get(key) {
    await this.initPromise;
    return this.#transaction('readonly', (store) => store.get(key));
  }

  async put(item) {
    await this.initPromise;
    return this.#transaction('readwrite', (store) => store.put(item));
  }

  async add(item) {
    await this.initPromise;
    return this.#transaction('readwrite', (store) => store.add(item));
  }

  async delete(key) {
    await this.initPromise;
    return this.#transaction('readwrite', (store) => store.delete(key));
  }

  async clear() {
    await this.initPromise;
    return this.#transaction('readwrite', (store) => store.clear());
  }

  async list(options = {}) {
    await this.initPromise;
    const { index, range, direction = 'next', limit } = options;

    return this.#transaction('readonly', (store) => {
      const source = index ? store.index(index) : store;
      const request = range
        ? source.openCursor(range, direction)
        : source.openCursor(null, direction);

      return new Promise((resolve, reject) => {
        const results = [];
        request.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor && (!limit || results.length < limit)) {
            results.push(cursor.value);
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  async query(index, value) {
    await this.initPromise;
    return this.#transaction('readonly', (store) => {
      return store.index(index).getAll(value);
    });
  }

  async count(index) {
    await this.initPromise;
    return this.#transaction('readonly', (store) => {
      const source = index ? store.index(index) : store;
      return source.count();
    });
  }

  #init() {
    if (!this.database || !this.store) return;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.database, this.version);

      request.onerror = () => {
        const error = request.error?.message || 'Failed to open database';
        this.#publishError('init', error);
        reject(new Error(error));
      };

      request.onsuccess = () => {
        this.db = request.result;

        this.db.onerror = (e) => {
          this.#publishError('db', e.target.error?.message || 'Database error');
        };

        this.pc.publish({
          topic: `${this.store}.idb.ready`,
          data: { database: this.database, store: this.store }
        });

        resolve();
      };

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.store)) {
          const store = db.createObjectStore(this.store, {
            keyPath: this.keyPath,
            autoIncrement: this.autoIncrement
          });

          // Create indexes
          for (const idx of this.indexes) {
            if (idx.name && idx.keyPath) {
              store.createIndex(idx.name, idx.keyPath, {
                unique: idx.unique || false,
                multiEntry: idx.multiEntry || false
              });
            }
          }
        }
      };
    });
  }

  #subscribe() {
    const resource = this.store;
    if (!resource) return;

    // Subscribe to CRUD operations
    this.pc.subscribe(`${resource}.idb.get`, async (msg) => {
      try {
        const data = await this.get(msg.data.key);
        this.#publishResult('get', { item: data }, msg.id);
      } catch (error) {
        this.#publishError('get', error.message, msg.id);
      }
    });

    this.pc.subscribe(`${resource}.idb.put`, async (msg) => {
      try {
        const key = await this.put(msg.data.item);
        this.#publishResult('put', { key }, msg.id);
      } catch (error) {
        this.#publishError('put', error.message, msg.id);
      }
    });

    this.pc.subscribe(`${resource}.idb.add`, async (msg) => {
      try {
        const key = await this.add(msg.data.item);
        this.#publishResult('add', { key }, msg.id);
      } catch (error) {
        this.#publishError('add', error.message, msg.id);
      }
    });

    this.pc.subscribe(`${resource}.idb.delete`, async (msg) => {
      try {
        await this.delete(msg.data.key);
        this.#publishResult('delete', { key: msg.data.key }, msg.id);
      } catch (error) {
        this.#publishError('delete', error.message, msg.id);
      }
    });

    this.pc.subscribe(`${resource}.idb.clear`, async (msg) => {
      try {
        await this.clear();
        this.#publishResult('clear', {}, msg.id);
      } catch (error) {
        this.#publishError('clear', error.message, msg.id);
      }
    });

    this.pc.subscribe(`${resource}.idb.list`, async (msg) => {
      try {
        const items = await this.list(msg.data);
        this.#publishResult('list', { items }, msg.id);
      } catch (error) {
        this.#publishError('list', error.message, msg.id);
      }
    });

    this.pc.subscribe(`${resource}.idb.query`, async (msg) => {
      try {
        const items = await this.query(msg.data.index, msg.data.value);
        this.#publishResult('query', { items }, msg.id);
      } catch (error) {
        this.#publishError('query', error.message, msg.id);
      }
    });

    this.pc.subscribe(`${resource}.idb.count`, async (msg) => {
      try {
        const count = await this.count(msg.data.index);
        this.#publishResult('count', { count }, msg.id);
      } catch (error) {
        this.#publishError('count', error.message, msg.id);
      }
    });
  }

  #transaction(mode, callback) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      try {
        const tx = this.db.transaction(this.store, mode);
        const store = tx.objectStore(this.store);
        const request = callback(store);

        if (request && request.onsuccess !== undefined) {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        } else if (request instanceof Promise) {
          request.then(resolve).catch(reject);
        } else {
          // If callback returns a value directly (like for cursors)
          resolve(request);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  #publishResult(operation, data, requestId) {
    this.pc.publish({
      topic: `${this.store}.idb.result`,
      data: {
        operation,
        success: true,
        ...data,
        requestId
      }
    });
  }

  #publishError(operation, error, requestId) {
    this.pc.publish({
      topic: `${this.store}.idb.error`,
      data: {
        operation,
        success: false,
        error,
        requestId
      }
    });
  }
}

customElements.define('pan-idb', PanIDB);
export default PanIDB;
