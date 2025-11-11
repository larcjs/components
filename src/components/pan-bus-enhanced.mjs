/**
 * @fileoverview PAN Bus (Enhanced) - Central message bus with memory management and security
 *
 * Enhanced features:
 * - Memory-bounded retained message store with LRU eviction
 * - Automatic cleanup of dead subscriptions
 * - Message validation (size limits, JSON-serializable)
 * - Rate limiting per publisher
 * - Security policies for wildcard subscriptions
 * - Debug mode with comprehensive logging
 *
 * @example
 * // Basic usage (same API as original)
 * <pan-bus></pan-bus>
 *
 * // With configuration
 * <pan-bus
 *   max-retained="1000"
 *   max-message-size="1048576"
 *   debug="true"
 *   allow-global-wildcard="false">
 * </pan-bus>
 */

/**
 * Default configuration values
 */
const DEFAULTS = {
  maxRetained: 1000,           // Maximum retained messages
  maxMessageSize: 1048576,     // 1MB max message size
  maxPayloadSize: 524288,      // 512KB max data payload
  cleanupInterval: 30000,      // 30s cleanup interval
  rateLimit: 1000,             // Max messages per client per second
  rateLimitWindow: 1000,       // Rate limit window (ms)
  allowGlobalWildcard: true,   // Allow '*' subscriptions
  debug: false                 // Debug logging
};

/**
 * Validates if data is JSON-serializable
 */
function isSerializable(data) {
  try {
    JSON.stringify(data);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get approximate size of object in bytes
 */
function estimateSize(obj) {
  try {
    return new Blob([JSON.stringify(obj)]).size;
  } catch (e) {
    return 0;
  }
}

/**
 * Checks if element is still in DOM
 */
function isElementAlive(el) {
  if (!el || !el.isConnected) return false;
  return document.contains(el) || document.body.contains(el);
}

/**
 * PAN Bus (Enhanced) - Memory-safe, secure message bus
 *
 * @class
 * @extends HTMLElement
 */
class PanBusEnhanced extends HTMLElement {
  /**
   * Observed attributes for configuration
   */
  static get observedAttributes() {
    return [
      'max-retained',
      'max-message-size',
      'max-payload-size',
      'cleanup-interval',
      'rate-limit',
      'allow-global-wildcard',
      'debug'
    ];
  }

  constructor() {
    super();

    // Configuration (can be overridden via attributes)
    this.config = { ...DEFAULTS };

    // Core data structures
    this.subs = [];
    this.clients = new Map();

    // Retained messages with LRU tracking
    this.retained = new Map();
    this.retainedAccessOrder = []; // For LRU eviction

    // Rate limiting tracking
    this.publishCounts = new Map(); // clientId -> { count, windowStart }

    // Statistics for monitoring
    this.stats = {
      published: 0,
      delivered: 0,
      dropped: 0,
      retainedEvicted: 0,
      subsCleanedUp: 0,
      errors: 0
    };

    // Cleanup timer
    this.cleanupTimer = null;
  }

  /**
   * Attribute change handler
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'max-retained':
        this.config.maxRetained = parseInt(newValue, 10) || DEFAULTS.maxRetained;
        break;
      case 'max-message-size':
        this.config.maxMessageSize = parseInt(newValue, 10) || DEFAULTS.maxMessageSize;
        break;
      case 'max-payload-size':
        this.config.maxPayloadSize = parseInt(newValue, 10) || DEFAULTS.maxPayloadSize;
        break;
      case 'cleanup-interval':
        this.config.cleanupInterval = parseInt(newValue, 10) || DEFAULTS.cleanupInterval;
        if (this.cleanupTimer) {
          this._setupCleanup();
        }
        break;
      case 'rate-limit':
        this.config.rateLimit = parseInt(newValue, 10) || DEFAULTS.rateLimit;
        break;
      case 'allow-global-wildcard':
        this.config.allowGlobalWildcard = newValue === 'true';
        break;
      case 'debug':
        this.config.debug = newValue === 'true';
        break;
    }
  }

  connectedCallback() {
    // Set up event listeners
    document.addEventListener('pan:publish', this.onPublish, true);
    document.addEventListener('pan:request', this.onPublish, true);
    document.addEventListener('pan:reply', this.onReply, true);
    document.addEventListener('pan:subscribe', this.onSubscribe, true);
    document.addEventListener('pan:unsubscribe', this.onUnsubscribe, true);
    document.addEventListener('pan:hello', this.onHello, true);

    // Control topics
    document.addEventListener('pan:sys.stats', this.onGetStats, true);
    document.addEventListener('pan:sys.clear-retained', this.onClearRetained, true);

    // Set up periodic cleanup
    this._setupCleanup();

    // Announce readiness
    window.__panReady = true;
    this._log('PAN Bus Enhanced ready', this.config);
    document.dispatchEvent(
      new CustomEvent('pan:sys.ready', {
        bubbles: true,
        composed: true,
        detail: { enhanced: true, config: this.config }
      })
    );
  }

  disconnectedCallback() {
    // Clean up listeners
    document.removeEventListener('pan:publish', this.onPublish, true);
    document.removeEventListener('pan:request', this.onPublish, true);
    document.removeEventListener('pan:reply', this.onReply, true);
    document.removeEventListener('pan:subscribe', this.onSubscribe, true);
    document.removeEventListener('pan:unsubscribe', this.onUnsubscribe, true);
    document.removeEventListener('pan:hello', this.onHello, true);
    document.removeEventListener('pan:sys.stats', this.onGetStats, true);
    document.removeEventListener('pan:sys.clear-retained', this.onClearRetained, true);

    // Stop cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Set up periodic cleanup of dead subscriptions
   * @private
   */
  _setupCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this._cleanupDeadSubscriptions();
      this._cleanupRateLimits();
    }, this.config.cleanupInterval);
  }

  /**
   * Remove subscriptions for elements that have been removed from DOM
   * @private
   */
  _cleanupDeadSubscriptions() {
    const before = this.subs.length;
    this.subs = this.subs.filter(s => isElementAlive(s.el));
    const removed = before - this.subs.length;

    if (removed > 0) {
      this.stats.subsCleanedUp += removed;
      this._log(`Cleaned up ${removed} dead subscriptions`);
    }
  }

  /**
   * Clean up old rate limit tracking data
   * @private
   */
  _cleanupRateLimits() {
    const now = Date.now();
    for (const [clientId, data] of this.publishCounts.entries()) {
      if (now - data.windowStart > this.config.rateLimitWindow * 2) {
        this.publishCounts.delete(clientId);
      }
    }
  }

  /**
   * Check rate limit for a client
   * @private
   */
  _checkRateLimit(clientId) {
    const now = Date.now();
    let data = this.publishCounts.get(clientId);

    if (!data || now - data.windowStart > this.config.rateLimitWindow) {
      // New window
      data = { count: 1, windowStart: now };
      this.publishCounts.set(clientId, data);
      return true;
    }

    if (data.count >= this.config.rateLimit) {
      this._error('Rate limit exceeded', { clientId, limit: this.config.rateLimit });
      return false;
    }

    data.count++;
    return true;
  }

  /**
   * Validate message before processing
   * @private
   */
  _validateMessage(msg) {
    // Check topic
    if (!msg.topic || typeof msg.topic !== 'string') {
      return { valid: false, error: 'Invalid topic: must be a non-empty string' };
    }

    // Check data is serializable
    if (msg.data !== undefined && !isSerializable(msg.data)) {
      return { valid: false, error: 'Data must be JSON-serializable (no functions, DOM nodes, circular refs)' };
    }

    // Check message size
    const msgSize = estimateSize(msg);
    if (msgSize > this.config.maxMessageSize) {
      return {
        valid: false,
        error: `Message size (${msgSize} bytes) exceeds limit (${this.config.maxMessageSize} bytes)`
      };
    }

    // Check payload size separately
    const dataSize = estimateSize(msg.data);
    if (dataSize > this.config.maxPayloadSize) {
      return {
        valid: false,
        error: `Payload size (${dataSize} bytes) exceeds limit (${this.config.maxPayloadSize} bytes)`
      };
    }

    return { valid: true };
  }

  /**
   * Store retained message with LRU eviction
   * @private
   */
  _storeRetained(topic, msg) {
    // Remove from access order if already present
    const idx = this.retainedAccessOrder.indexOf(topic);
    if (idx !== -1) {
      this.retainedAccessOrder.splice(idx, 1);
    }

    // Add to end (most recent)
    this.retainedAccessOrder.push(topic);
    this.retained.set(topic, msg);

    // Evict oldest if over limit
    while (this.retained.size > this.config.maxRetained) {
      const oldest = this.retainedAccessOrder.shift();
      if (oldest) {
        this.retained.delete(oldest);
        this.stats.retainedEvicted++;
        this._log(`Evicted retained message for topic: ${oldest}`);
      }
    }
  }

  /**
   * Get retained message and update LRU
   * @private
   */
  _getRetained(topic) {
    const msg = this.retained.get(topic);
    if (msg) {
      // Move to end (most recently accessed)
      const idx = this.retainedAccessOrder.indexOf(topic);
      if (idx !== -1) {
        this.retainedAccessOrder.splice(idx, 1);
        this.retainedAccessOrder.push(topic);
      }
    }
    return msg;
  }

  /**
   * Validate subscription pattern for security
   * @private
   */
  _validateSubscription(pattern) {
    // Check global wildcard
    if (pattern === '*' && !this.config.allowGlobalWildcard) {
      return {
        valid: false,
        error: 'Global wildcard (*) subscriptions are disabled for security'
      };
    }

    // Topic pattern validation
    if (!pattern || typeof pattern !== 'string') {
      return { valid: false, error: 'Pattern must be a non-empty string' };
    }

    // Could add more validation (e.g., max wildcard count, pattern complexity)

    return { valid: true };
  }

  onHello = (e) => {
    const d = e.detail || {};
    if (d.id) {
      this.clients.set(d.id, { el: this._et(e), caps: d.caps || [] });
      this._log('Client registered', { id: d.id, caps: d.caps });
    }
  };

  onSubscribe = (e) => {
    const { topics = [], options = {}, clientId } = e.detail || {};
    const el = this._et(e);

    // Validate each pattern
    for (const pattern of topics) {
      const validation = this._validateSubscription(pattern);
      if (!validation.valid) {
        this._error('Subscription rejected', { pattern, reason: validation.error });
        this._emitError(el, 'SUBSCRIPTION_INVALID', validation.error, { pattern });
        continue;
      }

      this.subs.push({ pattern, el, clientId, retained: !!options.retained });
      this._log('Subscription added', { pattern, clientId });
    }

    // Deliver retained snapshots if requested
    if (options.retained) {
      for (const [topic, msg] of this.retained) {
        if (topics.some((p) => PanBusEnhanced.matches(topic, p))) {
          this._deliver(el, this._getRetained(topic));
        }
      }
    }
  };

  onUnsubscribe = (e) => {
    const { topics = [], clientId } = e.detail || {};
    const el = this._et(e);
    const before = this.subs.length;

    this.subs = this.subs.filter((s) => {
      const sameClient = clientId ? s.clientId === clientId : s.el === el;
      return !(sameClient && topics.includes(s.pattern));
    });

    const removed = before - this.subs.length;
    if (removed > 0) {
      this._log('Unsubscribed', { topics, clientId, count: removed });
    }
  };

  onPublish = (e) => {
    const base = e.detail || {};
    const el = this._et(e);

    // Get client ID (try to extract from element or use a default)
    const clientId = base.clientId ||
                    (el && el.dataset && el.dataset.panClientId) ||
                    'anonymous';

    // Rate limiting
    if (!this._checkRateLimit(clientId)) {
      this.stats.dropped++;
      this._emitError(el, 'RATE_LIMIT_EXCEEDED', 'Too many messages', { clientId });
      return;
    }

    // Enhance message
    const msg = {
      ts: Date.now(),
      id: crypto.randomUUID(),
      ...base
    };

    // Validate message
    const validation = this._validateMessage(msg);
    if (!validation.valid) {
      this.stats.errors++;
      this._error('Message validation failed', { topic: msg.topic, error: validation.error });
      this._emitError(el, 'MESSAGE_INVALID', validation.error, { topic: msg.topic });
      return;
    }

    this.stats.published++;

    // Store retained message with LRU
    if (msg.retain) {
      this._storeRetained(msg.topic, msg);
    }

    // Deliver to matching subscribers
    let delivered = 0;
    for (const s of this.subs) {
      if (PanBusEnhanced.matches(msg.topic, s.pattern)) {
        if (this._deliver(s.el, msg)) {
          delivered++;
        }
      }
    }

    this.stats.delivered += delivered;
    this._log('Published', { topic: msg.topic, retain: msg.retain, delivered });
  };

  onReply = (e) => {
    const msg = e.detail || {};

    // Deliver to matching subscribers
    for (const s of this.subs) {
      if (PanBusEnhanced.matches(msg.topic, s.pattern)) {
        this._deliver(s.el, msg);
      }
    }
  };

  /**
   * Handle stats request
   * @private
   */
  onGetStats = (e) => {
    const el = this._et(e);
    const stats = {
      ...this.stats,
      subscriptions: this.subs.length,
      clients: this.clients.size,
      retained: this.retained.size,
      config: this.config
    };

    // Reply with stats
    el.dispatchEvent(
      new CustomEvent('pan:deliver', {
        detail: {
          topic: 'pan:sys.stats',
          data: stats,
          id: crypto.randomUUID(),
          ts: Date.now()
        }
      })
    );
  };

  /**
   * Handle clear retained messages request
   * @private
   */
  onClearRetained = (e) => {
    const { pattern } = e.detail || {};

    if (pattern) {
      // Clear matching topics
      let cleared = 0;
      for (const topic of this.retained.keys()) {
        if (PanBusEnhanced.matches(topic, pattern)) {
          this.retained.delete(topic);
          const idx = this.retainedAccessOrder.indexOf(topic);
          if (idx !== -1) {
            this.retainedAccessOrder.splice(idx, 1);
          }
          cleared++;
        }
      }
      this._log(`Cleared ${cleared} retained messages matching pattern: ${pattern}`);
    } else {
      // Clear all
      const count = this.retained.size;
      this.retained.clear();
      this.retainedAccessOrder = [];
      this._log(`Cleared all ${count} retained messages`);
    }
  };

  /**
   * Deliver message to target element
   * Returns true if successful, false otherwise
   * @private
   */
  _deliver(target, msg) {
    try {
      if (!isElementAlive(target)) {
        return false;
      }

      target.dispatchEvent(new CustomEvent('pan:deliver', { detail: msg }));
      return true;
    } catch (err) {
      this._error('Delivery failed', { topic: msg.topic, error: err.message });
      return false;
    }
  }

  /**
   * Emit error event
   * @private
   */
  _emitError(target, code, message, details = {}) {
    const errorMsg = {
      topic: 'pan:sys.error',
      data: { code, message, details },
      id: crypto.randomUUID(),
      ts: Date.now()
    };

    try {
      target.dispatchEvent(new CustomEvent('pan:deliver', { detail: errorMsg }));
    } catch (e) {
      // Can't deliver error, log it
      this._error('Cannot deliver error event', { code, message });
    }

    // Also dispatch globally for monitoring
    document.dispatchEvent(
      new CustomEvent('pan:sys.error', {
        bubbles: true,
        composed: true,
        detail: errorMsg.data
      })
    );
  }

  /**
   * Get event target
   * @private
   */
  _et(e) {
    return (typeof e.composedPath === 'function'
      ? e.composedPath()[0]
      : (e.target || document));
  }

  /**
   * Debug logging
   * @private
   */
  _log(...args) {
    if (this.config.debug) {
      console.log('[PAN Bus]', ...args);
    }
  }

  /**
   * Error logging (always enabled)
   * @private
   */
  _error(...args) {
    console.error('[PAN Bus ERROR]', ...args);
    this.stats.errors++;
  }

  /**
   * Topic matching (same as original)
   * @static
   */
  static matches(topic, pattern) {
    if (pattern === '*' || topic === pattern) return true;

    if (pattern && pattern.includes('*')) {
      const esc = (s) => s.replace(/[|\\{}()\[\]^$+?.]/g, '\\$&').replace(/\*/g, '[^.]+');
      const rx = new RegExp(`^${esc(pattern)}$`);
      return rx.test(topic);
    }

    return false;
  }
}

// Export for use
customElements.define('pan-bus-enhanced', PanBusEnhanced);
export { PanBusEnhanced };
export default PanBusEnhanced;
