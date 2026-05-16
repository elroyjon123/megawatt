const EventEmitter = require("events");
const WebSocket = require("ws");

const DEFAULT_RECONNECT_MS = 2_000;
const MAX_RECONNECT_MS = 30_000;

/**
 * Minimal OCPP 1.6J WebSocket client.
 *
 * Note: In "real" OCPP, the CSMS typically *accepts* inbound charger connections.
 * Your build plan says we connect to an existing OCPP server; this client therefore
 * assumes the remote server supports relaying/multiplexing charger messages.
 */
class OcppClient extends EventEmitter {
  /**
   * @param {{ url: string, logger?: Console }} opts
   */
  constructor({ url, logger = console }) {
    super();
    this.url = url;
    this.logger = logger;

    /** @type {WebSocket | null} */
    this.ws = null;
    this._shouldReconnect = true;
    this._reconnectMs = DEFAULT_RECONNECT_MS;

    /** @type {Map<string, {resolve: Function, reject: Function, timeout: NodeJS.Timeout}>} */
    this._pending = new Map();
  }

  get connected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  connect() {
    if (!this.url) throw new Error("OCPP_SERVER_URL is not set");
    if (this.ws && [WebSocket.OPEN, WebSocket.CONNECTING].includes(this.ws.readyState)) return;

    this.logger.log(`[OCPP] connecting to ${this.url}`);
    try {
      this.ws = new WebSocket(this.url);
    } catch (err) {
      // Invalid URL / constructor errors should not crash the backend.
      this.logger.error("[OCPP] failed to create websocket client", err);
      this.ws = null;
      if (this._shouldReconnect) this._scheduleReconnect();
      return;
    }

    this.ws.on("open", () => {
      this._reconnectMs = DEFAULT_RECONNECT_MS;
      this.logger.log("[OCPP] connected");
      this.emit("connected");
    });

    this.ws.on("message", (data) => {
      try {
        const text = Buffer.isBuffer(data) ? data.toString("utf8") : String(data);
        const msg = JSON.parse(text);
        this._handleIncoming(msg);
      } catch (err) {
        this.logger.error("[OCPP] message parse error", err);
      }
    });

    this.ws.on("close", () => {
      this.logger.warn("[OCPP] disconnected");
      this.emit("disconnected");
      this.ws = null;
      if (this._shouldReconnect) this._scheduleReconnect();
    });

    this.ws.on("error", (err) => {
      // ws will also emit close after error
      this.logger.error("[OCPP] websocket error", err);
    });
  }

  disconnect() {
    this._shouldReconnect = false;
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {
        // ignore
      }
      this.ws = null;
    }

    // fail pending requests
    for (const [id, pending] of this._pending.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("OCPP client disconnected"));
      this._pending.delete(id);
    }
  }

  _scheduleReconnect() {
    const wait = this._reconnectMs;
    this._reconnectMs = Math.min(this._reconnectMs * 2, MAX_RECONNECT_MS);
    this.logger.log(`[OCPP] reconnecting in ${wait}ms...`);
    setTimeout(() => this.connect(), wait);
  }

  /**
   * OCPP CALL: [2, uniqueId, action, payload]
   */
  call(action, payload = {}, { timeoutMs = 10_000 } = {}) {
    if (!this.connected) return Promise.reject(new Error("OCPP client not connected"));

    const uniqueId = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const msg = [2, uniqueId, action, payload];
    this.ws.send(JSON.stringify(msg));

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this._pending.delete(uniqueId);
        reject(new Error(`OCPP timeout waiting for ${action}`));
      }, timeoutMs);
      this._pending.set(uniqueId, { resolve, reject, timeout });
    });
  }

  /**
   * Convenience wrapper for systems that require a chargePointId to be passed.
   */
  callForCharger(chargePointId, action, payload = {}, opts) {
    const merged = payload.chargePointId ? payload : { chargePointId, ...payload };
    return this.call(action, merged, opts);
  }

  _handleIncoming(msg) {
    // OCPP frame
    if (Array.isArray(msg)) {
      const [messageTypeId, uniqueId] = msg;

      if (messageTypeId === 3) {
        // CALLRESULT: [3, uniqueId, payload]
        const payload = msg[2];
        const pending = this._pending.get(uniqueId);
        if (pending) {
          clearTimeout(pending.timeout);
          pending.resolve(payload);
          this._pending.delete(uniqueId);
        }
        this.emit("callResult", { uniqueId, payload });
        return;
      }

      if (messageTypeId === 4) {
        // CALLERROR: [4, uniqueId, errorCode, errorDescription, errorDetails]
        const error = new Error(msg[3] || msg[2] || "OCPP error");
        error.code = msg[2];
        error.details = msg[4];
        const pending = this._pending.get(uniqueId);
        if (pending) {
          clearTimeout(pending.timeout);
          pending.reject(error);
          this._pending.delete(uniqueId);
        }
        this.emit("callError", { uniqueId, error });
        return;
      }

      if (messageTypeId === 2) {
        // CALL: [2, uniqueId, action, payload]
        const action = msg[2];
        const payload = msg[3] ?? {};
        this.emit("call", { uniqueId, action, payload });
        this.emit(action, { uniqueId, payload });
        return;
      }

      this.emit("unknown", msg);
      return;
    }

    // Non-standard envelope (some bridges use objects)
    if (msg && typeof msg === "object") {
      this.emit("event", msg);
    }
  }
}

module.exports = { OcppClient };
