/**
 * pan-fetch - Authenticated fetch() wrapper
 *
 * Provides a fetch() wrapper that automatically injects Authorization headers
 * based on auth.internal.state from pan-auth
 *
 * @example
 * import { panFetch } from './pan/components/pan-fetch.mjs';
 *
 * // Automatically includes auth header if user is logged in
 * const response = await panFetch('/api/users');
 * const data = await response.json();
 *
 * // You can override headers if needed
 * const response = await panFetch('/api/public', {
 *   headers: { 'X-Custom': 'value' }
 * });
 */

import { PanClient } from '../../../core/src/components/pan-client.mjs';

class PanFetch {
  constructor() {
    this.pc = new PanClient();
    this.authState = null;

    // Subscribe to auth state
    this.pc.subscribe('auth.internal.state', (msg) => {
      this.authState = msg.data;
    }, { retained: true });
  }

  /**
   * Fetch with automatic auth header injection
   * @param {string|Request} input - URL or Request object
   * @param {RequestInit} init - fetch options
   * @returns {Promise<Response>}
   */
  async fetch(input, init = {}) {
    // Clone init to avoid mutation
    const options = { ...init };

    // Merge headers
    options.headers = new Headers(options.headers || {});

    // SECURITY: Use HttpOnly cookies for auth (credentials: 'include')
    // Tokens are sent automatically in cookies, no need to expose in JS
    if (!options.credentials) {
      options.credentials = 'include'; // Send cookies with request
    }

    // Legacy: Manual Authorization header (NOT RECOMMENDED - use HttpOnly cookies)
    if (this.authState?.authenticated && this.authState?.token) {
      // Only add if not already present
      if (!options.headers.has('Authorization')) {
        options.headers.set('Authorization', `Bearer ${this.authState.token}`);
        console.warn('⚠ Using token from localStorage - vulnerable to XSS. Use HttpOnly cookies instead.');
      }
    }

    return fetch(input, options);
  }

  /**
   * Convenience method for JSON requests
   * @param {string} url - URL to fetch
   * @param {RequestInit} init - fetch options
   * @returns {Promise<any>} - Parsed JSON response
   */
  async fetchJson(url, init = {}) {
    const options = { ...init };

    // Ensure Content-Type is set for JSON
    options.headers = new Headers(options.headers || {});
    if (!options.headers.has('Content-Type')) {
      options.headers.set('Content-Type', 'application/json');
    }

    const response = await this.fetch(url, options);

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.status = response.status;
      error.response = response;
      try {
        error.data = await response.json();
      } catch {
        error.data = await response.text();
      }
      throw error;
    }

    return response.json();
  }

  /**
   * GET request with JSON response
   */
  async get(url, init = {}) {
    return this.fetchJson(url, { ...init, method: 'GET' });
  }

  /**
   * POST request with JSON body and response
   */
  async post(url, body, init = {}) {
    return this.fetchJson(url, {
      ...init,
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body)
    });
  }

  /**
   * PUT request with JSON body and response
   */
  async put(url, body, init = {}) {
    return this.fetchJson(url, {
      ...init,
      method: 'PUT',
      body: typeof body === 'string' ? body : JSON.stringify(body)
    });
  }

  /**
   * PATCH request with JSON body and response
   */
  async patch(url, body, init = {}) {
    return this.fetchJson(url, {
      ...init,
      method: 'PATCH',
      body: typeof body === 'string' ? body : JSON.stringify(body)
    });
  }

  /**
   * DELETE request with JSON response
   */
  async delete(url, init = {}) {
    return this.fetchJson(url, { ...init, method: 'DELETE' });
  }

  /**
   * Get current auth state
   */
  getAuthState() {
    return this.authState;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.authState?.authenticated === true;
  }
}

// Export singleton instance
export const panFetch = new PanFetch();

// Also export the class for custom instances
export { PanFetch };

export default panFetch;
