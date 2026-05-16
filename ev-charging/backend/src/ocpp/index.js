const { OcppClient } = require("./ocppClient");
const commands = require("./commands");
const { syncChargerStatus, syncHeartbeat } = require("./statusSync");
const {
  extractMeterWh,
  handleStartTransaction,
  handleMeterValues,
  handleStopTransaction,
} = require("./sessionSync");

/**
 * Initializes the OCPP bridge client and wires incoming events to DB + Socket.IO.
 *
 * @param {{ url: string, prisma: import('@prisma/client').PrismaClient, io: import('socket.io').Server, logger?: Console }} deps
 */
function initOcppBridge({ url, prisma, io, logger = console }) {
  if (!url) {
    logger.warn("[OCPP] OCPP_SERVER_URL not set. OCPP bridge disabled.");
    return {
      client: null,
      commands: {
        remoteStartTransaction: async () => {
          throw new Error("OCPP bridge not connected");
        },
        remoteStopTransaction: async () => {
          throw new Error("OCPP bridge not connected");
        },
        reset: async () => {
          throw new Error("OCPP bridge not connected");
        },
        getStatus: async () => {
          throw new Error("OCPP bridge not connected");
        },
      },
      disconnect: () => {},
      get connected() {
        return false;
      },
    };
  }

  // Ensure we connect to base OCPP endpoint (not charger-specific path)
  const normalizedUrl = url.replace(/\/ocpp\/[^/]+$/, "/ocpp");
  logger.log("[OCPP] Connecting to:", normalizedUrl);

  const ocpp = new OcppClient({ url: normalizedUrl, logger });

  // OCPP CALLs coming from charger -> CSMS via existing server/bridge
  ocpp.on("StatusNotification", async ({ uniqueId, payload }) => {
    const ocppId = payload.chargePointId || payload.ocppId;
    await syncChargerStatus({ prisma, io }, { ocppId, status: payload.status, timestamp: payload.timestamp });

    // Acknowledge (empty payload is acceptable for many actions in skeleton mode)
    if (ocpp.connected) {
      ocpp.ws.send(JSON.stringify([3, uniqueId, {}]));
    }
  });

  ocpp.on("Heartbeat", async ({ uniqueId, payload }) => {
    const ocppId = payload.chargePointId || payload.ocppId;
    await syncHeartbeat({ prisma, io }, { ocppId, timestamp: payload.timestamp });
    if (ocpp.connected) {
      ocpp.ws.send(JSON.stringify([3, uniqueId, { currentTime: new Date().toISOString() }]));
    }
  });

  // OCPP 1.6 session lifecycle events
  ocpp.on("StartTransaction", async ({ uniqueId, payload }) => {
    try {
      const ocppId = payload.chargePointId || payload.chargePointId || payload.chargePoint || payload.ocppId;
      const userId = payload.userId; // NOTE: bridge-specific; prefer mapping from idTag later.
      const meterStartWh = extractMeterWh(payload) ?? (payload.meterStart != null ? Number(payload.meterStart) : null);
      const ocppTransactionId = payload.transactionId != null ? Number(payload.transactionId) : null;

      await handleStartTransaction({ prisma, io, logger }, { ocppId, userId, ocppTransactionId, meterStartWh });
      if (ocpp.connected) ocpp.ws.send(JSON.stringify([3, uniqueId, { idTagInfo: { status: "Accepted" } }]));
    } catch (err) {
      logger.error("[OCPP] StartTransaction handler error", err);
      if (ocpp.connected) ocpp.ws.send(JSON.stringify([3, uniqueId, { idTagInfo: { status: "Rejected" } }]));
    }
  });

  ocpp.on("MeterValues", async ({ uniqueId, payload }) => {
    try {
      const ocppId = payload.chargePointId || payload.ocppId;
      const ocppTransactionId = payload.transactionId != null ? Number(payload.transactionId) : null;
      const meterWh = extractMeterWh(payload);
      await handleMeterValues({ prisma, io, logger }, { ocppId, ocppTransactionId, meterWh, timestamp: payload.timestamp });
      if (ocpp.connected) ocpp.ws.send(JSON.stringify([3, uniqueId, {}]));
    } catch (err) {
      logger.error("[OCPP] MeterValues handler error", err);
      if (ocpp.connected) ocpp.ws.send(JSON.stringify([3, uniqueId, {}]));
    }
  });

  ocpp.on("StopTransaction", async ({ uniqueId, payload }) => {
    try {
      const ocppId = payload.chargePointId || payload.ocppId;
      const ocppTransactionId = payload.transactionId != null ? Number(payload.transactionId) : null;
      const meterStopWh = extractMeterWh(payload) ?? (payload.meterStop != null ? Number(payload.meterStop) : null);
      await handleStopTransaction({ prisma, io, logger }, { ocppId, ocppTransactionId, meterStopWh, stoppedAt: payload.timestamp });
      if (ocpp.connected) ocpp.ws.send(JSON.stringify([3, uniqueId, { idTagInfo: { status: "Accepted" } }]));
    } catch (err) {
      logger.error("[OCPP] StopTransaction handler error", err);
      if (ocpp.connected) ocpp.ws.send(JSON.stringify([3, uniqueId, { idTagInfo: { status: "Rejected" } }]));
    }
  });

  // Generic fallback for calls we don't handle yet
  ocpp.on("call", ({ uniqueId }) => {
    if (ocpp.connected) {
      // respond OK to avoid blocking charger flows during Phase 1B skeleton
      try {
        ocpp.ws.send(JSON.stringify([3, uniqueId, {}]));
      } catch (_) {
        // ignore
      }
    }
  });

  ocpp.connect();

  return {
    client: ocpp,
    commands: {
      remoteStartTransaction: (args) => commands.remoteStartTransaction(ocpp, args),
      remoteStopTransaction: (args) => commands.remoteStopTransaction(ocpp, args),
      reset: (args) => commands.reset(ocpp, args),
      getStatus: (args) => commands.getStatus(ocpp, args),
    },
    disconnect: () => ocpp.disconnect(),
    get connected() {
      return ocpp.connected;
    },
  };
}

module.exports = { initOcppBridge };
