/**
 * pan-auth - JWT Authentication Manager
 *
 * Manages authentication state via PAN message bus
 * - Stores JWT tokens in localStorage/sessionStorage/memory
 * - Publishes retained auth.state for connectors to use
 * - Handles login/logout/refresh flows
 * - Auto-refreshes tokens before expiry
 *
 * @example
 * <pan-auth
 *   storage="localStorage"
 *   token-key="jwt"
 *   refresh-key="refresh_jwt"
 *   auto-refresh="true"
 *   refresh-before="300"
 *   login-endpoint="/api/auth/login"
 *   refresh-endpoint="/api/auth/refresh">
 * </pan-auth>
 */

import { PanClient } from '../../../core/src/components/pan-client.mjs';

class PanAuth extends HTMLElement {
  static get observedAttributes() {
    return ['storage', 'token-key', 'refresh-key', 'auto-refresh', 'refresh-before', 'login-endpoint', 'refresh-endpoint'];
  }

  constructor() {
    super();
    this.pc = new PanClient(this);
    this.authState = {
      authenticated: false,
      token: null, // Token is in HttpOnly cookie, this is just for state tracking
      refreshToken: null, // Refresh token is in HttpOnly cookie
      user: null,
      expiresAt: null
    };
    this.refreshTimer = null;
    this.useHttpOnlyCookies = true; // Use HttpOnly cookies for security
  }

  connectedCallback() {
    // Configuration
    this.config = {
      storage: this.getAttribute('storage') || 'localStorage', // localStorage, sessionStorage, memory
      tokenKey: this.getAttribute('token-key') || 'pan_jwt',
      refreshKey: this.getAttribute('refresh-key') || 'pan_refresh_jwt',
      autoRefresh: this.getAttribute('auto-refresh') !== 'false',
      refreshBefore: parseInt(this.getAttribute('refresh-before') || '300', 10), // seconds before expiry
      loginEndpoint: this.getAttribute('login-endpoint') || '/api/auth/login',
      refreshEndpoint: this.getAttribute('refresh-endpoint') || '/api/auth/refresh',
      logoutEndpoint: this.getAttribute('logout-endpoint') || '/api/auth/logout'
    };

    // Load existing tokens from storage
    this.loadTokens();

    // Set up message handlers
    this.setupHandlers();

    // Publish initial auth state
    this.publishAuthState();

    // Start auto-refresh if enabled and token exists
    if (this.config.autoRefresh && this.authState.authenticated) {
      this.scheduleRefresh();
    }
  }

  disconnectedCallback() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
  }

  setupHandlers() {
    // Handle login requests
    this.pc.subscribe('auth.login', async (msg) => {
      await this.handleLogin(msg);
    });

    // Handle logout requests
    this.pc.subscribe('auth.logout', async (msg) => {
      await this.handleLogout(msg);
    });

    // Handle refresh requests
    this.pc.subscribe('auth.refresh', async (msg) => {
      await this.handleRefresh(msg);
    });

    // Handle token set (external login)
    this.pc.subscribe('auth.setToken', (msg) => {
      this.setToken(msg.data);
    });

    // Handle check auth request
    this.pc.subscribe('auth.check', (msg) => {
      this.publishAuthState();
    });
  }

  async handleLogin(msg) {
    const { email, password, username, credentials, endpoint } = msg.data;
    const loginUrl = endpoint || this.config.loginEndpoint;

    try {
      // Prepare login payload
      const payload = credentials || { email, password, username };

      // Make login request
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.token) {
        // Store tokens and update state
        this.setToken({
          token: data.token,
          refreshToken: data.refreshToken || data.refresh_token,
          user: data.user
        });

        // Reply with success
        if (msg.replyTo) {
          this.pc.publish({
            topic: msg.replyTo,
            data: { ok: true, user: this.authState.user },
            correlationId: msg.correlationId
          });
        }

        // Publish success event
        this.pc.publish({
          topic: 'auth.login.success',
          data: { user: this.authState.user }
        });
      } else {
        // Reply with error
        const error = data.error || data.message || 'Login failed';

        if (msg.replyTo) {
          this.pc.publish({
            topic: msg.replyTo,
            data: { ok: false, error },
            correlationId: msg.correlationId
          });
        }

        // Publish error event
        this.pc.publish({
          topic: 'auth.login.error',
          data: { error }
        });
      }
    } catch (error) {
      // Reply with error
      if (msg.replyTo) {
        this.pc.publish({
          topic: msg.replyTo,
          data: { ok: false, error: error.message },
          correlationId: msg.correlationId
        });
      }

      // Publish error event
      this.pc.publish({
        topic: 'auth.login.error',
        data: { error: error.message }
      });
    }
  }

  async handleLogout(msg) {
    const endpoint = msg.data?.endpoint || this.config.logoutEndpoint;

    try {
      // Optionally call logout endpoint
      if (endpoint && this.authState.token) {
        await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.authState.token}`
          }
        });
      }
    } catch (error) {
      console.warn('Logout endpoint failed:', error);
    }

    // Clear tokens regardless of endpoint result
    this.clearTokens();

    // Reply if needed
    if (msg.replyTo) {
      this.pc.publish({
        topic: msg.replyTo,
        data: { ok: true },
        correlationId: msg.correlationId
      });
    }

    // Publish logout event
    this.pc.publish({
      topic: 'auth.logout.success',
      data: {}
    });
  }

  async handleRefresh(msg) {
    if (!this.authState.refreshToken) {
      // No refresh token available
      if (msg.replyTo) {
        this.pc.publish({
          topic: msg.replyTo,
          data: { ok: false, error: 'No refresh token available' },
          correlationId: msg.correlationId
        });
      }
      return;
    }

    const endpoint = msg.data?.endpoint || this.config.refreshEndpoint;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authState.refreshToken}`
        },
        body: JSON.stringify({
          refreshToken: this.authState.refreshToken
        })
      });

      const data = await response.json();

      if (response.ok && data.token) {
        // Update tokens
        this.setToken({
          token: data.token,
          refreshToken: data.refreshToken || data.refresh_token || this.authState.refreshToken,
          user: data.user || this.authState.user
        });

        // Reply with success
        if (msg.replyTo) {
          this.pc.publish({
            topic: msg.replyTo,
            data: { ok: true },
            correlationId: msg.correlationId
          });
        }

        // Publish refresh success
        this.pc.publish({
          topic: 'auth.refresh.success',
          data: {}
        });
      } else {
        // Refresh failed - clear tokens
        this.clearTokens();

        // Reply with error
        if (msg.replyTo) {
          this.pc.publish({
            topic: msg.replyTo,
            data: { ok: false, error: 'Token refresh failed' },
            correlationId: msg.correlationId
          });
        }

        // Publish refresh error
        this.pc.publish({
          topic: 'auth.refresh.error',
          data: { error: 'Token refresh failed' }
        });
      }
    } catch (error) {
      // Refresh error - clear tokens
      this.clearTokens();

      // Reply with error
      if (msg.replyTo) {
        this.pc.publish({
          topic: msg.replyTo,
          data: { ok: false, error: error.message },
          correlationId: msg.correlationId
        });
      }

      // Publish refresh error
      this.pc.publish({
        topic: 'auth.refresh.error',
        data: { error: error.message }
      });
    }
  }

  setToken({ token, refreshToken, user }) {
    // Decode JWT to get expiration
    const decoded = this.decodeJWT(token);
    const expiresAt = decoded?.exp ? decoded.exp * 1000 : null;

    // Update state
    this.authState = {
      authenticated: true,
      token,
      refreshToken: refreshToken || this.authState.refreshToken,
      user: user || decoded || this.authState.user,
      expiresAt
    };

    // Store tokens
    this.storeTokens();

    // Publish auth state
    this.publishAuthState();

    // Schedule refresh if auto-refresh enabled
    if (this.config.autoRefresh && expiresAt) {
      this.scheduleRefresh();
    }
  }

  clearTokens() {
    // Clear state
    this.authState = {
      authenticated: false,
      token: null,
      refreshToken: null,
      user: null,
      expiresAt: null
    };

    // Remove from storage
    const storage = this.getStorage();
    if (storage) {
      storage.removeItem(this.config.tokenKey);
      storage.removeItem(this.config.refreshKey);
    }

    // Clear refresh timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Publish auth state
    this.publishAuthState();
  }

  loadTokens() {
    // SECURITY: When using HttpOnly cookies, tokens are not accessible from JavaScript
    // Check authentication status via API call instead
    if (this.useHttpOnlyCookies) {
      // Token is in HttpOnly cookie, check auth status via API
      fetch(this.config.loginEndpoint.replace('/login', '/check'), {
        credentials: 'include'
      })
        .then(res => res.json())
        .then(data => {
          if (data.authenticated) {
            this.authState = {
              authenticated: true,
              token: null, // Not accessible from JS (in HttpOnly cookie)
              refreshToken: null, // Not accessible from JS
              user: data.user,
              expiresAt: null // Set by server
            };
            this.publishAuthState();
          }
        })
        .catch(err => {
          console.error('Failed to check auth status:', err);
        });
      return;
    }

    // Legacy: localStorage (NOT RECOMMENDED)
    const storage = this.getStorage();
    if (!storage) return;

    const token = storage.getItem(this.config.tokenKey);
    const refreshToken = storage.getItem(this.config.refreshKey);

    if (token) {
      const decoded = this.decodeJWT(token);
      const expiresAt = decoded?.exp ? decoded.exp * 1000 : null;

      // Check if token is expired
      if (expiresAt && Date.now() > expiresAt) {
        // Token expired - clear it
        this.clearTokens();
        return;
      }

      // Token valid
      this.authState = {
        authenticated: true,
        token,
        refreshToken,
        user: decoded,
        expiresAt
      };
      console.warn('⚠ Loading tokens from localStorage - vulnerable to XSS');
    }
  }

  storeTokens() {
    // SECURITY: When using HttpOnly cookies, tokens are stored server-side in cookies
    // Do NOT store in localStorage as it's vulnerable to XSS
    if (this.useHttpOnlyCookies) {
      console.log('✓ Tokens stored in HttpOnly cookies (server-side)');
      return;
    }

    // Legacy: localStorage storage (NOT RECOMMENDED - vulnerable to XSS)
    const storage = this.getStorage();
    if (!storage) return;

    if (this.authState.token) {
      storage.setItem(this.config.tokenKey, this.authState.token);
      console.warn('⚠ Token stored in localStorage - vulnerable to XSS. Use HttpOnly cookies instead.');
    }

    if (this.authState.refreshToken) {
      storage.setItem(this.config.refreshKey, this.authState.refreshToken);
      console.warn('⚠ Refresh token stored in localStorage - vulnerable to XSS. Use HttpOnly cookies instead.');
    }
  }

  getStorage() {
    switch (this.config.storage) {
      case 'localStorage':
        return typeof window !== 'undefined' ? window.localStorage : null;
      case 'sessionStorage':
        return typeof window !== 'undefined' ? window.sessionStorage : null;
      case 'memory':
        return null; // Memory only - already in this.authState
      default:
        return typeof window !== 'undefined' ? window.localStorage : null;
    }
  }

  publishAuthState() {
    // Publish retained auth state (NEVER include tokens for security)
    this.pc.publish({
      topic: 'auth.state',
      data: {
        authenticated: this.authState.authenticated,
        user: this.authState.user,
        expiresAt: this.authState.expiresAt,
        hasRefreshToken: !!this.authState.refreshToken,
        useHttpOnlyCookies: this.useHttpOnlyCookies
      },
      retain: true
    });

    // SECURITY: Do NOT publish tokens over the bus
    // Tokens are in HttpOnly cookies and sent automatically with fetch()
    // Legacy connectors that need tokens should use fetch with credentials: 'include'
    this.pc.publish({
      topic: 'auth.internal.state',
      data: {
        authenticated: this.authState.authenticated,
        user: this.authState.user,
        expiresAt: this.authState.expiresAt,
        // NEVER include token/refreshToken here - use HttpOnly cookies
        token: null,
        refreshToken: null
      },
      retain: true
    });
  }

  scheduleRefresh() {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.authState.expiresAt) return;

    const now = Date.now();
    const expiresAt = this.authState.expiresAt;
    const refreshAt = expiresAt - (this.config.refreshBefore * 1000);
    const delay = refreshAt - now;

    if (delay > 0) {
      this.refreshTimer = setTimeout(() => {
        this.pc.publish({ topic: 'auth.refresh', data: {} });
      }, delay);
    }
  }

  decodeJWT(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Failed to decode JWT:', error);
      return null;
    }
  }
}

customElements.define('pan-auth', PanAuth);

export default PanAuth;
