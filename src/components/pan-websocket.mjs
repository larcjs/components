// <pan-websocket> — Bidirectional WebSocket ↔ PAN bridge
// Attributes:
//   - url: WebSocket server URL
//   - protocols: optional protocol string
//   - outbound-topics: space-sep list of topics to forward to server
//   - inbound-topics: space-sep list of topics to publish from server
//   - auto-reconnect: enable automatic reconnection (default: true)
//   - reconnect-delay: min,max delay in ms (default: "1000,15000")
//   - heartbeat: seconds between ping messages (default: 30)
//   - heartbeat-topic: topic for heartbeat pings (default: "sys.ping")
//
// Topics:
//   - Publishes: ws.connected, ws.disconnected, ws.error
//   - Publishes: ws.message (raw message events)
//   - Subscribes to outbound-topics and forwards to WebSocket
//   - Publishes inbound messages to PAN

import { PanClient } from '../../../core/src/components/pan-client.mjs';

export class PanWebSocket extends HTMLElement {
  static get observedAttributes() {
    return ['url', 'protocols', 'outbound-topics', 'inbound-topics',
            'auto-reconnect', 'reconnect-delay', 'heartbeat', 'heartbeat-topic'];
  }

  constructor() {
    super();
    this.pc = new PanClient(this);
    this.ws = null;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.reconnectAttempts = 0;
    this.stopped = false;
    this.subscriptions = [];
  }

  connectedCallback() {
    this.#connect();
    this.#setupOutboundSubscriptions();
  }

  disconnectedCallback() {
    this.stopped = true;
    this.#disconnect();
    this.#clearSubscriptions();
  }

  attributeChangedCallback(name) {
    if (name === 'url' && this.isConnected) {
      this.#reconnect();
    } else if (name === 'outbound-topics' && this.isConnected) {
      this.#clearSubscriptions();
      this.#setupOutboundSubscriptions();
    }
  }

  get url() { return this.getAttribute('url') || ''; }
  get protocols() { return this.getAttribute('protocols') || ''; }
  get outboundTopics() {
    const t = (this.getAttribute('outbound-topics') || '').trim();
    return t ? t.split(/\s+/) : [];
  }
  get inboundTopics() {
    const t = (this.getAttribute('inbound-topics') || '').trim();
    return t ? t.split(/\s+/) : ['*'];
  }
  get autoReconnect() {
    return this.getAttribute('auto-reconnect') !== 'false';
  }
  get reconnectDelay() {
    const s = (this.getAttribute('reconnect-delay') || '1000,15000').split(',').map(x => Number(x) || 0);
    const [min, max] = [Math.max(100, s[0] || 1000), Math.max(s[1] || s[0] || 15000, s[0] || 1000)];
    return { min, max };
  }
  get heartbeat() {
    return Number(this.getAttribute('heartbeat')) || 30;
  }
  get heartbeatTopic() {
    return this.getAttribute('heartbeat-topic') || 'sys.ping';
  }

  // Public API
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }

  close() {
    this.stopped = true;
    this.#disconnect();
  }

  reconnect() {
    this.#reconnect();
  }

  #connect() {
    if (!this.url || this.stopped) return;

    try {
      const ws = this.protocols
        ? new WebSocket(this.url, this.protocols.split(',').map(p => p.trim()))
        : new WebSocket(this.url);

      this.ws = ws;

      ws.addEventListener('open', () => this.#handleOpen());
      ws.addEventListener('message', (e) => this.#handleMessage(e));
      ws.addEventListener('close', (e) => this.#handleClose(e));
      ws.addEventListener('error', (e) => this.#handleError(e));

    } catch (error) {
      this.#handleError(error);
      this.#scheduleReconnect();
    }
  }

  #disconnect() {
    this.#stopHeartbeat();
    this.#cancelReconnect();

    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        // ignore
      }
      this.ws = null;
    }
  }

  #reconnect() {
    this.#disconnect();
    this.reconnectAttempts = 0;
    this.stopped = false;
    this.#connect();
  }

  #scheduleReconnect() {
    if (!this.autoReconnect || this.stopped) return;

    this.#cancelReconnect();

    const { min, max } = this.reconnectDelay;
    const delay = Math.min(
      max,
      min * Math.pow(1.5, this.reconnectAttempts) + Math.random() * 1000
    );

    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.#connect();
    }, delay);
  }

  #cancelReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  #startHeartbeat() {
    this.#stopHeartbeat();

    if (this.heartbeat <= 0) return;

    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ topic: this.heartbeatTopic, ts: Date.now() });
      }
    }, this.heartbeat * 1000);
  }

  #stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  #handleOpen() {
    this.reconnectAttempts = 0;
    this.#startHeartbeat();

    this.pc.publish({
      topic: 'ws.connected',
      data: { url: this.url, timestamp: Date.now() }
    });
  }

  #handleMessage(event) {
    try {
      const data = JSON.parse(event.data);

      // Publish raw message event
      this.pc.publish({
        topic: 'ws.message',
        data: { message: data, timestamp: Date.now() }
      });

      // If it's a PAN message, publish to the appropriate topic
      if (data.topic) {
        // Check if this topic should be forwarded to PAN
        const shouldPublish = this.inboundTopics.some(pattern =>
          this.#matchTopic(data.topic, pattern)
        );

        if (shouldPublish) {
          const msg = {
            topic: data.topic,
            data: data.data || data.payload || data
          };

          if (typeof data.retain === 'boolean') {
            msg.retain = data.retain;
          }

          this.pc.publish(msg);
        }
      }
    } catch (error) {
      // If not JSON, publish as raw data
      this.pc.publish({
        topic: 'ws.message',
        data: { raw: event.data, timestamp: Date.now() }
      });
    }
  }

  #handleClose(event) {
    this.#stopHeartbeat();

    this.pc.publish({
      topic: 'ws.disconnected',
      data: {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
        timestamp: Date.now()
      }
    });

    if (!this.stopped) {
      this.#scheduleReconnect();
    }
  }

  #handleError(error) {
    this.pc.publish({
      topic: 'ws.error',
      data: {
        error: error.message || 'WebSocket error',
        timestamp: Date.now()
      }
    });
  }

  #setupOutboundSubscriptions() {
    // Subscribe to topics that should be forwarded to WebSocket
    for (const pattern of this.outboundTopics) {
      const unsub = this.pc.subscribe(pattern, (msg) => {
        // Don't forward WebSocket system topics
        if (msg.topic.startsWith('ws.')) return;

        // Forward message to WebSocket server
        this.send({
          topic: msg.topic,
          data: msg.data,
          ts: msg.ts,
          id: msg.id
        });
      });

      this.subscriptions.push(unsub);
    }
  }

  #clearSubscriptions() {
    for (const unsub of this.subscriptions) {
      if (typeof unsub === 'function') unsub();
    }
    this.subscriptions = [];
  }

  #matchTopic(topic, pattern) {
    if (pattern === '*' || topic === pattern) return true;
    if (pattern.includes('*')) {
      const regex = new RegExp(
        '^' + pattern.replace(/\*/g, '[^.]+') + '$'
      );
      return regex.test(topic);
    }
    return false;
  }
}

customElements.define('pan-websocket', PanWebSocket);
export default PanWebSocket;
