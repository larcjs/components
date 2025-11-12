/**
 * Test Utilities
 * Helper functions for component testing
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Root directory of the project (3 levels up from tests/lib/)
const projectRoot = resolve(__dirname, '../../../..');

/**
 * Convert a relative file path to a file:// URL for browser testing
 * @param {string} relativePath - Path relative to project root (e.g., 'examples/01-hello.html')
 * @returns {string} File URL
 */
export function fileUrl(relativePath) {
  const absolutePath = resolve(projectRoot, relativePath);
  return `file://${absolutePath}`;
}

/**
 * Wait for a condition to be true
 * @param {Function} condition - Function that returns boolean
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<void>}
 */
export async function waitFor(condition, timeout = 5000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Timeout waiting for condition');
}

/**
 * Create a mock PAN message for testing
 * @param {string} topic - Message topic
 * @param {*} data - Message data
 * @param {Object} options - Additional options
 * @returns {Object} Mock PAN message
 */
export function createMockMessage(topic, data = {}, options = {}) {
  return {
    topic,
    data,
    timestamp: Date.now(),
    id: Math.random().toString(36).substr(2, 9),
    ...options
  };
}

/**
 * Simulate a PAN message dispatch
 * @param {HTMLElement} element - Element to dispatch from
 * @param {string} topic - Message topic
 * @param {*} data - Message data
 */
export function dispatchPanMessage(element, topic, data) {
  const event = new CustomEvent('pan:deliver', {
    detail: createMockMessage(topic, data),
    bubbles: true,
    composed: true
  });
  element.dispatchEvent(event);
}

/**
 * Wait for a custom element to be defined
 * @param {string} tagName - Custom element tag name
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<void>}
 */
export async function waitForCustomElement(tagName, timeout = 5000) {
  if (customElements.get(tagName)) {
    return;
  }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout waiting for custom element: ${tagName}`));
    }, timeout);

    customElements.whenDefined(tagName).then(() => {
      clearTimeout(timeoutId);
      resolve();
    });
  });
}
