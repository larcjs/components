/**
 * @fileoverview PAN Bus - Central message bus for Page Area Network communication
 *
 * The PAN Bus is a custom element that provides publish/subscribe and request/reply
 * messaging via DOM CustomEvents. Messages bubble and are composed, crossing shadow DOM
 * boundaries for true component isolation.
 *
 * @example
 * // Add bus to page
 * <pan-bus></pan-bus>
 *
 * // Or wait for it to be ready
 * document.addEventListener('pan:sys.ready', () => {
 *   console.log('PAN bus is ready');
 * });
 */

/**
 * @typedef {Object} PanMessage
 * @property {string} topic - Topic name (e.g., "users.list.state")
 * @property {*} data - Payload data (any JSON-serializable value)
 * @property {string} [id] - Unique message ID (UUID, auto-generated if not provided)
 * @property {number} [ts] - Timestamp in milliseconds (auto-generated if not provided)
 * @property {boolean} [retain] - If true, message is retained and replayed to new subscribers
 * @property {string} [replyTo] - Topic to send reply to (for request/reply pattern)
 * @property {string} [correlationId] - Correlation ID for request/reply matching
 * @property {Object} [headers] - Optional metadata headers
 */

/**
 * @typedef {Object} Subscription
 * @property {string} pattern - Topic pattern to match (exact or wildcard with *)
 * @property {Element} el - Element that subscribed
 * @property {string} [clientId] - Optional client identifier
 * @property {boolean} [retained] - Whether to receive retained messages
 */

/**
 * PAN Bus - Central message bus for Page Area Network
 *
 * Handles message routing between components using CustomEvents. Supports:
 * - Publish/subscribe pattern
 * - Request/reply pattern
 * - Retained messages (last message per topic)
 * - Topic wildcards (e.g., "users.*")
 * - Shadow DOM traversal
 *
 * @class
 * @extends HTMLElement
 */
class PanBus extends HTMLElement {
  /**
   * Creates a PAN Bus instance
   * Initializes internal subscription list, retained message store, and client registry
   */
  constructor() {
    super();

    /**
     * List of active subscriptions
     * @type {Subscription[]}
     * @private
     */
    this.subs = [];

    /**
     * Retained messages by topic
     * @type {Map<string, PanMessage>}
     * @private
     */
    this.retained = new Map();

    /**
     * Registered clients by ID
     * @type {Map<string, {el: Element, caps: string[]}>}
     * @private
     */
    this.clients = new Map();
  }

  /**
   * Lifecycle: Called when element is added to the DOM
   * Sets up event listeners in capture phase and announces readiness
   * @private
   */
  connectedCallback() {
    // capture listeners so bus observes events early in the capture phase
    document.addEventListener('pan:publish', this.onPublish, true);
    document.addEventListener('pan:request', this.onPublish, true);
    document.addEventListener('pan:reply', this.onReply, true);
    document.addEventListener('pan:subscribe', this.onSubscribe, true);
    document.addEventListener('pan:unsubscribe', this.onUnsubscribe, true);
    document.addEventListener('pan:hello', this.onHello, true);

    // announce readiness
    window.__panReady = true;
    document.dispatchEvent(new CustomEvent('pan:sys.ready', { bubbles: true, composed: true }));
  }

  /**
   * Lifecycle: Called when element is removed from the DOM
   * Cleans up all event listeners
   * @private
   */
  disconnectedCallback() {
    document.removeEventListener('pan:publish', this.onPublish, true);
    document.removeEventListener('pan:request', this.onPublish, true);
    document.removeEventListener('pan:reply', this.onReply, true);
    document.removeEventListener('pan:subscribe', this.onSubscribe, true);
    document.removeEventListener('pan:unsubscribe', this.onUnsubscribe, true);
    document.removeEventListener('pan:hello', this.onHello, true);
  }

  /**
   * Handles client registration (pan:hello events)
   * Clients can announce themselves with capabilities
   *
   * @param {CustomEvent} e - Hello event with {id, caps} in detail
   * @private
   */
  onHello = (e) => {
    const d = e.detail || {};
    if (d.id) this.clients.set(d.id, { el: this._et(e), caps: d.caps || [] });
  };

  /**
   * Handles subscription requests (pan:subscribe events)
   * Adds subscriptions and optionally delivers retained messages
   *
   * @param {CustomEvent} e - Subscribe event with {topics, options, clientId} in detail
   * @param {string[]} e.detail.topics - Array of topic patterns to subscribe to
   * @param {Object} [e.detail.options] - Subscription options
   * @param {boolean} [e.detail.options.retained] - Whether to receive retained messages
   * @param {string} [e.detail.clientId] - Optional client identifier
   * @private
   */
  onSubscribe = (e) => {
    const { topics = [], options = {}, clientId } = e.detail || {};
    const el = this._et(e);

    // Add subscriptions
    for (const pattern of topics) {
      this.subs.push({ pattern, el, clientId, retained: !!options.retained });
    }

    // Deliver retained snapshots if requested
    if (options.retained) {
      for (const [topic, msg] of this.retained) {
        if (topics.some((p) => PanBus.matches(topic, p))) {
          this._deliver(el, msg);
        }
      }
    }
  };

  /**
   * Handles unsubscribe requests (pan:unsubscribe events)
   * Removes matching subscriptions for the client
   *
   * @param {CustomEvent} e - Unsubscribe event with {topics, clientId} in detail
   * @param {string[]} e.detail.topics - Array of topic patterns to unsubscribe from
   * @param {string} [e.detail.clientId] - Optional client identifier
   * @private
   */
  onUnsubscribe = (e) => {
    const { topics = [], clientId } = e.detail || {};
    const el = this._et(e);

    this.subs = this.subs.filter((s) => {
      const sameClient = clientId ? s.clientId === clientId : s.el === el;
      return !(sameClient && topics.includes(s.pattern));
    });
  };

  /**
   * Handles publish and request events (pan:publish, pan:request)
   * Routes message to all matching subscribers and optionally retains it
   *
   * @param {CustomEvent} e - Publish/request event with PanMessage in detail
   * @param {string} e.detail.topic - Topic to publish on
   * @param {*} e.detail.data - Message payload
   * @param {boolean} [e.detail.retain] - Whether to retain this message
   * @private
   */
  onPublish = (e) => {
    const base = e.detail || {};

    // Enhance message with timestamp and ID
    const msg = Object.assign({
      ts: Date.now(),
      id: crypto.randomUUID()
    }, base);

    // Store retained message
    if (msg.retain) {
      this.retained.set(msg.topic, msg);
    }

    // Deliver to matching subscribers
    for (const s of this.subs) {
      if (PanBus.matches(msg.topic, s.pattern)) {
        this._deliver(s.el, msg);
      }
    }
  };

  /**
   * Handles reply events (pan:reply)
   * Routes reply to subscribers waiting on the reply topic
   *
   * @param {CustomEvent} e - Reply event with PanMessage in detail
   * @param {string} e.detail.topic - Reply topic (from replyTo)
   * @param {*} e.detail.data - Reply payload
   * @param {string} [e.detail.correlationId] - Correlation ID matching the request
   * @private
   */
  onReply = (e) => {
    const msg = e.detail || {};

    // Deliver to matching subscribers
    for (const s of this.subs) {
      if (PanBus.matches(msg.topic, s.pattern)) {
        this._deliver(s.el, msg);
      }
    }
  };

  /**
   * Delivers a message to a target element
   * Dispatches a pan:deliver CustomEvent on the target
   *
   * @param {Element} target - Element to deliver message to
   * @param {PanMessage} msg - Message to deliver
   * @private
   */
  _deliver(target, msg) {
    try {
      target.dispatchEvent(new CustomEvent('pan:deliver', { detail: msg }));
    } catch (_) {
      // Ignore delivery errors (element may have been removed)
    }
  }

  /**
   * Gets the event target, traversing composed path if available
   * Handles shadow DOM traversal
   *
   * @param {Event} e - Event to get target from
   * @returns {Element} The actual event target
   * @private
   */
  _et(e) {
    return (typeof e.composedPath === 'function'
      ? e.composedPath()[0]
      : (e.target || document));
  }

  /**
   * Checks if a topic matches a pattern
   * Supports exact match, single wildcard (*), or wildcard in pattern (users.*)
   *
   * @param {string} topic - Topic to test (e.g., "users.list.state")
   * @param {string} pattern - Pattern to match against (e.g., "users.*" or "users.list.state")
   * @returns {boolean} True if topic matches pattern
   * @static
   *
   * @example
   * PanBus.matches('users.list.state', 'users.*')  // true
   * PanBus.matches('users.list.state', 'users.list.state')  // true
   * PanBus.matches('users.list.state', '*')  // true
   * PanBus.matches('users.list.state', 'posts.*')  // false
   */
  static matches(topic, pattern) {
    // Exact match or global wildcard
    if (pattern === '*' || topic === pattern) return true;

    // Pattern contains wildcards - build regex
    if (pattern && pattern.includes('*')) {
      const esc = (s) => s.replace(/[|\\{}()\[\]^$+?.]/g, '\\$&').replace(/\*/g, '[^.]+');
      const rx = new RegExp(`^${esc(pattern)}$`);
      return rx.test(topic);
    }

    return false;
  }
}

customElements.define('pan-bus', PanBus);
export { PanBus };
export default PanBus;
