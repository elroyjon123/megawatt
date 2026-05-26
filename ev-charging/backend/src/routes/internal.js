const express = require("express");
const prisma = require("../lib/prisma");
const { requireInternalToken } = require("../middleware/auth");
const { syncChargerStatus, syncHeartbeat } = require("../ocpp/statusSync");
const { extractMeterWh, handleStartTransaction, handleMeterValues, handleStopTransaction } = require("../ocpp/sessionSync");

const router = express.Router();

// in-memory last payloads for debugging (dev only).
// NOTE: This resets on server restart.
let lastSessionProgress = null;
let lastCpoAlert = null;
let lastChargerEvent = null;

// Internal endpoints called by the external OCPP server (CSMS).
// Protected by X-Internal-Token.
router.use(requireInternalToken);

// POST /api/internal/session/progress
// Body:
// {
//   sessionId: "<uuid>",
//   energyDelivered: number,
//   totalCost: number,
//   powerKw?: number
// }
router.post("/session/progress", async (req, res) => {
  try {
    const { sessionId, energyDelivered, totalCost, powerKw, ocppId, chargePointId, ocppTransactionId } = req.body || {};

    // MD requires sessionId, but allow fallback mapping so the OCPP server doesn't have to know our UUID.
    // Fallback lookup order:
    // 1) provided sessionId
    // 2) (ocppTransactionId + ocppId/chargePointId) -> find ACTIVE session on that charger with matching ocppTransactionId
    // 3) (ocppId/chargePointId) -> find latest ACTIVE session on that charger
    let resolvedSessionId = sessionId;

    const cpId = ocppId || chargePointId;
    if (!resolvedSessionId) {
      try {
        if (cpId) {
          const charger = await prisma.charger.findUnique({ where: { ocppId: cpId }, select: { id: true } });
          if (charger?.id) {
            if (ocppTransactionId != null) {
              const s = await prisma.chargingSession.findFirst({
                where: {
                  chargerId: charger.id,
                  status: "ACTIVE",
                  ocppTransactionId: Number(ocppTransactionId),
                },
                select: { id: true },
                orderBy: { startTime: "desc" },
              });
              if (s?.id) resolvedSessionId = s.id;
            }

            if (!resolvedSessionId) {
              const s = await prisma.chargingSession.findFirst({
                where: { chargerId: charger.id, status: "ACTIVE" },
                select: { id: true },
                orderBy: { startTime: "desc" },
              });
              if (s?.id) resolvedSessionId = s.id;
            }
          }
        }
      } catch (_) {
        // ignore lookup errors
      }
    }

    if (!resolvedSessionId) {
      // Still emit to cpo room (operator visibility), but can't target a session room without an id.
      // Don't fail webhook to avoid backpressure on the OCPP server.
      const io = req.app.get("io");
      const payload = {
        sessionId: null,
        ocppId: cpId,
        ocppTransactionId: ocppTransactionId != null ? Number(ocppTransactionId) : undefined,
        energyDelivered: energyDelivered != null ? Number(energyDelivered) : undefined,
        totalCost: totalCost != null ? Number(totalCost) : undefined,
        powerKw: powerKw != null ? Number(powerKw) : undefined,
        ts: new Date().toISOString(),
        warning: "Could not resolve backend sessionId",
      };
      lastSessionProgress = payload;
      io.to("cpo").emit("session_progress", payload);
      return res.json({ ok: true, warning: payload.warning });
    }

    // Optional DB update (best-effort). We do NOT fail the webhook if DB write fails.
    // Note: our schema uses energyKwh/costPeso. We accept floats here.
    try {
      const data = {};
      if (energyDelivered != null && Number.isFinite(Number(energyDelivered))) data.energyKwh = Number(energyDelivered);
      if (totalCost != null && Number.isFinite(Number(totalCost))) data.costPeso = Number(totalCost);
      if (Object.keys(data).length) {
        await prisma.chargingSession.update({ where: { id: resolvedSessionId }, data });
      }
    } catch (_) {
      // ignore db errors
    }

    const io = req.app.get("io");
    const payload = {
      sessionId: resolvedSessionId,
      ocppId: cpId,
      ocppTransactionId: ocppTransactionId != null ? Number(ocppTransactionId) : undefined,
      energyDelivered: energyDelivered != null ? Number(energyDelivered) : undefined,
      totalCost: totalCost != null ? Number(totalCost) : undefined,
      powerKw: powerKw != null ? Number(powerKw) : undefined,
      ts: new Date().toISOString(),
    };

    lastSessionProgress = payload;

    io.to(`session:${resolvedSessionId}`).emit("session_progress", payload);
    io.to("cpo").emit("session_progress", payload);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ----
// Option A (OCPP VM) — internal webhooks
// These endpoints are intended to be called by the OCPP VM to forward charger events.
// All are protected by X-Internal-Token.
// ----

// POST /api/internal/charger/boot
// Body: { ocppId|chargePointId, timestamp?, status? }
// We treat boot as a heartbeat + optional status update.
router.post("/charger/boot", async (req, res) => {
  try {
    const ocppId = req.body?.ocppId || req.body?.chargePointId;
    if (!ocppId) return res.status(400).json({ error: "ocppId (or chargePointId) is required" });

    const io = req.app.get("io");
    const timestamp = req.body?.timestamp;
    const status = req.body?.status;
    lastChargerEvent = { type: "boot", ocppId, status, timestamp, ts: new Date().toISOString() };

    // Best-effort DB sync. Do not fail the webhook if DB is unavailable.
    try {
      await syncHeartbeat({ prisma, io }, { ocppId, timestamp });
      if (status) {
        await syncChargerStatus({ prisma, io }, { ocppId, status, timestamp });
      }
    } catch (err) {
      // Emit a minimal event for UI visibility
      io.emit("chargers:status", {
        chargerId: null,
        ocppId,
        status,
        lastHeartbeat: timestamp ? new Date(timestamp) : new Date(),
        warning: "DB unavailable; charger update not persisted",
      });
      return res.json({ ok: true, warning: err.message });
    }

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/internal/charger/heartbeat
// Body: { ocppId|chargePointId, timestamp? }
router.post("/charger/heartbeat", async (req, res) => {
  try {
    const ocppId = req.body?.ocppId || req.body?.chargePointId;
    if (!ocppId) return res.status(400).json({ error: "ocppId (or chargePointId) is required" });
    const io = req.app.get("io");
    const timestamp = req.body?.timestamp;
    lastChargerEvent = { type: "heartbeat", ocppId, timestamp, ts: new Date().toISOString() };

    try {
      await syncHeartbeat({ prisma, io }, { ocppId, timestamp });
      return res.json({ ok: true });
    } catch (err) {
      io.emit("chargers:heartbeat", {
        chargerId: null,
        ocppId,
        lastHeartbeat: timestamp ? new Date(timestamp) : new Date(),
        warning: "DB unavailable; heartbeat not persisted",
      });
      return res.json({ ok: true, warning: err.message });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/internal/charger/status
// Body: { ocppId|chargePointId, status, timestamp? }
router.post("/charger/status", async (req, res) => {
  try {
    const ocppId = req.body?.ocppId || req.body?.chargePointId;
    const status = req.body?.status;
    if (!ocppId) return res.status(400).json({ error: "ocppId (or chargePointId) is required" });
    if (!status) return res.status(400).json({ error: "status is required" });
    const io = req.app.get("io");
    const timestamp = req.body?.timestamp;
    lastChargerEvent = { type: "status", ocppId, status, timestamp, ts: new Date().toISOString() };

    try {
      await syncChargerStatus({ prisma, io }, { ocppId, status, timestamp });
      return res.json({ ok: true });
    } catch (err) {
      io.emit("chargers:status", {
        chargerId: null,
        ocppId,
        status,
        lastHeartbeat: timestamp ? new Date(timestamp) : new Date(),
        warning: "DB unavailable; status not persisted",
      });
      return res.json({ ok: true, warning: err.message });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/internal/session/start
// Body: { ocppId|chargePointId, userId, transactionId, meterStartWh?|meterStart?, timestamp? }
router.post("/session/start", async (req, res) => {
  try {
    const ocppId = req.body?.ocppId || req.body?.chargePointId;
    let userId = req.body?.userId;
    const transactionId = req.body?.transactionId;
    if (!ocppId) return res.status(400).json({ error: "ocppId (or chargePointId) is required" });
    if (transactionId == null) return res.status(400).json({ error: "transactionId is required" });
    
    // If no userId provided (admin-initiated), use admin user
    if (!userId) {
      const adminUser = await prisma.user.findFirst({ 
        where: { role: "ADMIN" },
        orderBy: { createdAt: "asc" }
      });
      if (adminUser) {
        userId = adminUser.id;
        console.log(`[OCPP] No userId provided, using admin user: ${adminUser.email}`);
      } else {
        return res.status(400).json({ error: "userId is required and no admin user found" });
      }
    }

    const io = req.app.get("io");
    const meterStartWh =
      req.body?.meterStartWh != null
        ? Number(req.body.meterStartWh)
        : req.body?.meterStart != null
          ? Number(req.body.meterStart)
          : extractMeterWh(req.body);

    try {
      const session = await handleStartTransaction(
        { prisma, io },
        {
          ocppId,
          userId,
          ocppTransactionId: Number(transactionId),
          meterStartWh: Number.isFinite(meterStartWh) ? meterStartWh : undefined,
          startedAt: req.body?.timestamp,
        }
      );

      // ✅ Set charger status to OCCUPIED when session starts
      if (session) {
        const charger = await prisma.charger.findUnique({ where: { ocppId } });
        if (charger) {
          await prisma.charger.update({
            where: { id: charger.id },
            data: { status: "OCCUPIED" },
          });
          
          // Emit status update
          io.emit("charger:status", {
            chargerId: charger.id,
            ocppId: charger.ocppId,
            status: "OCCUPIED",
          });
        }
      }

      return res.json({ ok: true, sessionId: session?.id || null });
    } catch (err) {
      // Don't fail the webhook if DB is unavailable.
      io.to("cpo").emit("session_progress", {
        sessionId: null,
        ocppId,
        ocppTransactionId: Number(transactionId),
        ts: new Date().toISOString(),
        warning: "DB unavailable; session not created",
      });
      return res.json({ ok: true, warning: err.message, sessionId: null });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/internal/session/meter
// Body: { ocppId|chargePointId, transactionId, meterWh?|meter?, timestamp? }
router.post("/session/meter", async (req, res) => {
  try {
    const ocppId = req.body?.ocppId || req.body?.chargePointId;
    const transactionId = req.body?.transactionId;
    if (!ocppId) return res.status(400).json({ error: "ocppId (or chargePointId) is required" });
    if (transactionId == null) return res.status(400).json({ error: "transactionId is required" });

    const meterWh =
      req.body?.meterWh != null
        ? Number(req.body.meterWh)
        : req.body?.meter != null
          ? Number(req.body.meter)
          : extractMeterWh(req.body);

    try {
      const io = req.app.get("io");
      await handleMeterValues({ prisma, io }, {
        ocppId,
        ocppTransactionId: Number(transactionId),
        meterWh: Number.isFinite(meterWh) ? meterWh : undefined,
        timestamp: req.body?.timestamp,
      });
      return res.json({ ok: true });
    } catch (err) {
      // Still emit to operator room for visibility.
      const io = req.app.get("io");
      io.to("cpo").emit("session_progress", {
        sessionId: null,
        ocppId,
        ocppTransactionId: Number(transactionId),
        energyDelivered: undefined,
        totalCost: undefined,
        ts: new Date().toISOString(),
        warning: "DB unavailable; meter update not persisted",
      });
      return res.json({ ok: true, warning: err.message });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/internal/session/stop
// Body: { ocppId|chargePointId, transactionId, meterStopWh?|meterStop?|meterWh?, timestamp? }
router.post("/session/stop", async (req, res) => {
  try {
    const ocppId = req.body?.ocppId || req.body?.chargePointId;
    const transactionId = req.body?.transactionId;
    if (!ocppId) return res.status(400).json({ error: "ocppId (or chargePointId) is required" });
    if (transactionId == null) return res.status(400).json({ error: "transactionId is required" });

    const meterStopWh =
      req.body?.meterStopWh != null
        ? Number(req.body.meterStopWh)
        : req.body?.meterStop != null
          ? Number(req.body.meterStop)
          : req.body?.meterWh != null
            ? Number(req.body.meterWh)
            : extractMeterWh(req.body);

    try {
      const result = await handleStopTransaction(
        { prisma, io },
        {
          ocppId,
          ocppTransactionId: Number(transactionId),
          meterStopWh: Number.isFinite(meterStopWh) ? meterStopWh : undefined,
          stoppedAt: req.body?.timestamp,
        }
      );

      return res.json({ ok: true, result: result || null });
    } catch (err) {
      return res.json({ ok: true, warning: err.message, result: null });
    }
  } catch (error) {
    const httpStatus = error.httpStatus || 500;
    return res.status(httpStatus).json({ error: error.message });
  }
});

// POST /api/internal/cpo/alert
router.post("/cpo/alert", async (req, res) => {
  try {
    const io = req.app.get("io");
    const payload = {
      ...req.body,
      ts: new Date().toISOString(),
    };

    lastCpoAlert = payload;
    io.to("cpo").emit("cpo_alert", payload);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/internal/_debug/last
// Returns last webhook payloads received (requires internal token).
router.get("/_debug/last", (req, res) => {
  return res.json({ lastSessionProgress, lastCpoAlert, lastChargerEvent });
});

module.exports = router;
