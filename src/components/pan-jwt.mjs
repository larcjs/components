/**
 * @fileoverview PAN JWT Component - JSON Web Token authentication handler
 *
 * Provides JWT token management with:
 * - Secure token storage (localStorage/sessionStorage/memory)
 * - Automatic token refresh
 * - Request header injection
 * - Token validation and expiry checking
 * - Login/logout state management
 * - PAN bus integration for auth events
 *
 * @example
 * <pan-jwt
 *   storage="localStorage"
 *   auto-refresh="true"
 *   refresh-before="300"
 *   token-key="auth_token">
 * </pan-jwt>
 */

import { PanClient } from '../../../core/src/components/pan-client.mjs';

/**
 * PAN JWT Authentication Component
 *
 * Handles JWT token lifecycle and authentication state
 *
 * @class
 * @extends HTMLElement
 *
 * @attr {string} storage - Storage type: "localStorage", "sessionStorage", or "memory" (default: "localStorage")
 * @attr {boolean} auto-refresh - Enable automatic token refresh (default: true)
 * @attr {number} refresh-before - Seconds before expiry to refresh (default: 300)
 * @attr {string} token-key - Storage key for token (default: "jwt_token")
 * @attr {string} refresh-key - Storage key for refresh token (default: "jwt_refresh")
 * @attr {string} api-url - Base API URL for authentication endpoints
 * @attr {string} login-endpoint - Login endpoint path (default: "/auth/login")
 * @attr {string} refresh-endpoint - Refresh endpoint path (default: "/auth/refresh")
 * @attr {string} logout-endpoint - Logout endpoint path (default: "/auth/logout")
 *
 * @fires auth.login.request - When login is requested
 * @fires auth.login.success - When login succeeds
 * @fires auth.login.error - When login fails
 * @fires auth.logout - When logout occurs
 * @fires auth.token.refreshed - When token is refreshed
 * @fires auth.token.expired - When token expires
 * @fires auth.state.changed - When auth state changes
 */
class PanJWT extends HTMLElement {
  constructor() {
    super();
    this.client = new PanClient(this);

    // State
    this.token = null;
    this.refreshToken = null;
    this.tokenData = null;
    this.refreshTimer = null;
    this.memoryStorage = {}; // For memory storage mode
  }

  connectedCallback() {
    // Initialize storage
    this.storageType = this.getAttribute('storage') || 'localStorage';
    this.tokenKey = this.getAttribute('token-key') || 'jwt_token';
    this.refreshKey = this.getAttribute('refresh-key') || 'jwt_refresh';

    // Auto-refresh settings
    this.autoRefresh = this.getAttribute('auto-refresh') !== 'false';
    this.refreshBefore = parseInt(this.getAttribute('refresh-before') || '300');

    // API endpoints
    this.apiUrl = this.getAttribute('api-url') || '';
    this.loginEndpoint = this.getAttribute('login-endpoint') || '/auth/login';
    this.refreshEndpoint = this.getAttribute('refresh-endpoint') || '/auth/refresh';
    this.logoutEndpoint = this.getAttribute('logout-endpoint') || '/auth/logout';

    // Load existing token
    this.loadToken();

    // Subscribe to auth messages
    this.subscribeToMessages();

    // Start refresh timer if we have a valid token
    if (this.token) {
      this.scheduleRefresh();
    }

    // Publish initial state
    this.publishState();
  }

  disconnectedCallback() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
  }

  /**
   * Subscribe to authentication-related PAN messages
   */
  subscribeToMessages() {
    // Login request
    this.client.subscribe('auth.login.request', async (msg) => {
      await this.login(msg.data.credentials);
    });

    // Logout request
    this.client.subscribe('auth.logout.request', async () => {
      await this.logout();
    });

    // Token refresh request
    this.client.subscribe('auth.token.refresh', async () => {
      await this.refresh();
    });

    // Get current state request
    this.client.subscribe('auth.state.get', () => {
      this.publishState();
    });
  }

  /**
   * Login with credentials
   * @param {Object} credentials - Login credentials (username, password, etc.)
   */
  async login(credentials) {
    try {
      const response = await fetch(`${this.apiUrl}${this.loginEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Store tokens
      this.setToken(data.token || data.access_token);

      if (data.refresh_token) {
        this.setRefreshToken(data.refresh_token);
      }

      // Publish success
      this.client.publish({
        topic: 'auth.login.success',
        data: {
          user: data.user,
          tokenData: this.tokenData,
        },
      });

      this.publishState();

      // Schedule refresh
      if (this.autoRefresh) {
        this.scheduleRefresh();
      }

      return { success: true, data };
    } catch (err) {
      this.client.publish({
        topic: 'auth.login.error',
        data: {
          error: err.message,
        },
      });

      return { success: false, error: err.message };
    }
  }

  /**
   * Logout and clear tokens
   */
  async logout() {
    try {
      // Call logout endpoint if available
      if (this.token && this.apiUrl) {
        await fetch(`${this.apiUrl}${this.logoutEndpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
          },
        });
      }
    } catch (err) {
      console.warn('Logout endpoint failed:', err);
    }

    // Clear tokens and timers
    this.clearToken();
    this.clearRefreshToken();

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Publish logout event
    this.client.publish({
      topic: 'auth.logout',
      data: {},
    });

    this.publishState();
  }

  /**
   * Refresh the access token using refresh token
   */
  async refresh() {
    if (!this.refreshToken) {
      console.warn('No refresh token available');
      return { success: false, error: 'No refresh token' };
    }

    try {
      const response = await fetch(`${this.apiUrl}${this.refreshEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.refreshToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Update token
      this.setToken(data.token || data.access_token);

      // Publish refresh event
      this.client.publish({
        topic: 'auth.token.refreshed',
        data: {
          tokenData: this.tokenData,
        },
      });

      this.publishState();

      // Schedule next refresh
      if (this.autoRefresh) {
        this.scheduleRefresh();
      }

      return { success: true, data };
    } catch (err) {
      // Refresh failed - token might be expired
      this.client.publish({
        topic: 'auth.token.expired',
        data: {
          error: err.message,
        },
      });

      // Clear tokens
      await this.logout();

      return { success: false, error: err.message };
    }
  }

  /**
   * Set the access token
   * @param {string} token - JWT token
   */
  setToken(token) {
    this.token = token;
    this.tokenData = this.parseToken(token);
    this.saveToStorage(this.tokenKey, token);
  }

  /**
   * Set the refresh token
   * @param {string} token - Refresh token
   */
  setRefreshToken(token) {
    this.refreshToken = token;
    this.saveToStorage(this.refreshKey, token);
  }

  /**
   * Clear the access token
   */
  clearToken() {
    this.token = null;
    this.tokenData = null;
    this.removeFromStorage(this.tokenKey);
  }

  /**
   * Clear the refresh token
   */
  clearRefreshToken() {
    this.refreshToken = null;
    this.removeFromStorage(this.refreshKey);
  }

  /**
   * Load token from storage
   */
  loadToken() {
    this.token = this.loadFromStorage(this.tokenKey);
    this.refreshToken = this.loadFromStorage(this.refreshKey);

    if (this.token) {
      this.tokenData = this.parseToken(this.token);

      // Check if token is expired
      if (this.isExpired()) {
        console.warn('Stored token is expired');
        this.clearToken();
      }
    }
  }

  /**
   * Parse JWT token
   * @param {string} token - JWT token
   * @returns {Object|null} Parsed token payload
   */
  parseToken(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (err) {
      console.error('Failed to parse token:', err);
      return null;
    }
  }

  /**
   * Check if token is expired
   * @returns {boolean} True if token is expired
   */
  isExpired() {
    if (!this.tokenData || !this.tokenData.exp) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    return this.tokenData.exp < now;
  }

  /**
   * Get seconds until token expiry
   * @returns {number} Seconds until expiry, or 0 if expired
   */
  getTimeToExpiry() {
    if (!this.tokenData || !this.tokenData.exp) {
      return 0;
    }

    const now = Math.floor(Date.now() / 1000);
    const remaining = this.tokenData.exp - now;
    return Math.max(0, remaining);
  }

  /**
   * Schedule automatic token refresh
   */
  scheduleRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const timeToExpiry = this.getTimeToExpiry();
    const refreshTime = Math.max(0, (timeToExpiry - this.refreshBefore) * 1000);

    if (refreshTime > 0 && this.autoRefresh) {
      this.refreshTimer = setTimeout(() => {
        this.refresh();
      }, refreshTime);
    }
  }

  /**
   * Get authorization header value
   * @returns {string|null} Authorization header value
   */
  getAuthHeader() {
    return this.token ? `Bearer ${this.token}` : null;
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} True if authenticated
   */
  isAuthenticated() {
    return this.token !== null && !this.isExpired();
  }

  /**
   * Publish current auth state
   */
  publishState() {
    this.client.publish({
      topic: 'auth.state',
      data: {
        authenticated: this.isAuthenticated(),
        token: this.token,
        tokenData: this.tokenData,
        expiresIn: this.getTimeToExpiry(),
      },
      retain: true,
    });
  }

  /**
   * Save to storage
   */
  saveToStorage(key, value) {
    try {
      if (this.storageType === 'localStorage') {
        localStorage.setItem(key, value);
      } else if (this.storageType === 'sessionStorage') {
        sessionStorage.setItem(key, value);
      } else {
        this.memoryStorage[key] = value;
      }
    } catch (err) {
      console.error('Failed to save to storage:', err);
    }
  }

  /**
   * Load from storage
   */
  loadFromStorage(key) {
    try {
      if (this.storageType === 'localStorage') {
        return localStorage.getItem(key);
      } else if (this.storageType === 'sessionStorage') {
        return sessionStorage.getItem(key);
      } else {
        return this.memoryStorage[key] || null;
      }
    } catch (err) {
      console.error('Failed to load from storage:', err);
      return null;
    }
  }

  /**
   * Remove from storage
   */
  removeFromStorage(key) {
    try {
      if (this.storageType === 'localStorage') {
        localStorage.removeItem(key);
      } else if (this.storageType === 'sessionStorage') {
        sessionStorage.removeItem(key);
      } else {
        delete this.memoryStorage[key];
      }
    } catch (err) {
      console.error('Failed to remove from storage:', err);
    }
  }
}

// Register component
customElements.define('pan-jwt', PanJWT);

export { PanJWT };
export default PanJWT;
