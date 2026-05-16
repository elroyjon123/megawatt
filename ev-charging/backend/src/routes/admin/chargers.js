const express = require("express");
const { authenticateToken, requireRole } = require("../../middleware/auth");
const prisma = require("../../lib/prisma");

const router = express.Router();

// Create charger (ADMIN)
router.post("/", authenticateToken, requireRole(["ADMIN", "OPERATOR"]), async (req, res) => {
  try {
    const { stationId, ocppId, name, connectorType, powerOutputKw, pricePerKwh } = req.body;

    if (!stationId || !ocppId || !name || !connectorType || powerOutputKw == null || pricePerKwh == null) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const charger = await prisma.charger.create({
      data: {
        stationId,
        ocppId,
        name,
        connectorType,
        powerOutputKw: parseFloat(powerOutputKw),
        pricePerKwh: parseFloat(pricePerKwh),
      },
    });
    res.json(charger);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all chargers (ADMIN)
router.get("/", authenticateToken, requireRole(["ADMIN", "OPERATOR"]), async (req, res) => {
  try {
    const { q, stationId, status, includeOffline, page, pageSize } = req.query;

    const where = {
      ...(stationId ? { stationId } : {}),
      ...(status ? { status } : {}),
      ...(includeOffline === "true" ? {} : { NOT: { status: "OFFLINE" } }),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { ocppId: { contains: q, mode: "insensitive" } },
              { station: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    // Backward compatible: return array when no paging is specified
    if (!page && !pageSize) {
      const chargers = await prisma.charger.findMany({
        where,
        include: { station: true, sessions: true },
        orderBy: { name: "asc" },
      });
      return res.json(chargers);
    }

    const pageNum = Math.max(parseInt(page || "1", 10), 1);
    const size = Math.min(Math.max(parseInt(pageSize || "20", 10), 1), 100);
    const skip = (pageNum - 1) * size;

    const [total, items] = await Promise.all([
      prisma.charger.count({ where }),
      prisma.charger.findMany({
        where,
        include: { station: true, sessions: true },
        orderBy: { name: "asc" },
        skip,
        take: size,
      }),
    ]);

    return res.json({ items, page: pageNum, pageSize: size, total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get charger by ID (ADMIN)
router.get("/:id", authenticateToken, requireRole(["ADMIN", "OPERATOR"]), async (req, res) => {
  try {
    const id = req.params.id;

    const charger = await prisma.charger.findFirst({
      where: {
        OR: [{ id }, { ocppId: id }],
      },
      include: { station: true, sessions: true },
    });

    if (!charger) return res.status(404).json({ error: "Charger not found" });

    res.json(charger);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update charger (ADMIN)
router.put("/:id", authenticateToken, requireRole(["ADMIN", "OPERATOR"]), async (req, res) => {
  try {
    const { name, connectorType, powerOutputKw, pricePerKwh } = req.body;
    const charger = await prisma.charger.update({
      where: { id: req.params.id },
      data: {
        name,
        connectorType,
        powerOutputKw: powerOutputKw ? parseFloat(powerOutputKw) : undefined,
        pricePerKwh: pricePerKwh ? parseFloat(pricePerKwh) : undefined,
      },
    });
    res.json(charger);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deactivate charger (ADMIN) — soft delete
router.delete("/:id", authenticateToken, requireRole(["ADMIN", "OPERATOR"]), async (req, res) => {
  try {
    const charger = await prisma.charger.update({
      where: { id: req.params.id },
      data: { status: "OFFLINE" },
    });
    res.json({ message: "Charger deactivated", charger });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// OCPP Control: Remote Start Transaction
router.post("/:id/start", async (req, res) => {
  try {
    const param = req.params.id;

    const charger = await prisma.charger.findFirst({
      where: {
        OR: [{ id: param }, { ocppId: param }],
      },
    });

    if (!charger) return res.status(404).json({ error: "Charger not found" });

    const ocppBridge = req.app.get("ocpp");

    // ✅ FALLBACK: allow start even if charger is offline (demo mode)
    if (!ocppBridge?.connected) {
      const user = await prisma.user.findFirst();

      const session = await prisma.chargingSession.create({
        data: {
          userId: user?.id,
          startTime: new Date(),
          status: "ACTIVE",
          energyKwh: 0,
          costPeso: 0,
          charger: {
            connect: charger.id
              ? { id: charger.id }
              : { ocppId: charger.ocppId },
          },
        },
      });

      await prisma.charger.update({
        where: { id: charger.id },
        data: { status: "OCCUPIED" },
      });

      return res.json({ message: "Demo session started", sessionId: session.id });
    }

    const result = await ocppBridge.commands.remoteStartTransaction({
      chargePointId: charger.ocppId,
      idTag: req.body?.idTag || "ADMIN",
      connectorId: req.body?.connectorId,
    });

    return res.json({ message: "RemoteStartTransaction sent", result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// OCPP Control: Remote Stop Transaction
router.post("/:id/stop", async (req, res) => {
  try {
    const param = req.params.id;

    const charger = await prisma.charger.findFirst({
      where: {
        OR: [{ id: param }, { ocppId: param }],
      },
    });

    if (!charger) return res.status(404).json({ error: "Charger not found" });

    const { transactionId } = req.body || {};
    if (!transactionId) return res.status(400).json({ error: "transactionId is required" });

    const ocppBridge = req.app.get("ocpp");
    if (!ocppBridge?.connected) return res.status(503).json({ error: "OCPP bridge not connected" });

    const result = await ocppBridge.commands.remoteStopTransaction({
      chargePointId: charger.ocppId,
      transactionId,
    });
    return res.json({ message: "RemoteStopTransaction sent", result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// OCPP Control: Reset
router.post("/:id/reset", authenticateToken, requireRole(["ADMIN", "OPERATOR"]), async (req, res) => {
  try {
    const charger = await prisma.charger.findUnique({ where: { id: req.params.id } });
    if (!charger) return res.status(404).json({ error: "Charger not found" });

    const ocppBridge = req.app.get("ocpp");
    if (!ocppBridge?.connected) return res.status(503).json({ error: "OCPP bridge not connected" });

    const result = await ocppBridge.commands.reset({
      chargePointId: charger.ocppId,
      type: req.body?.type || "Soft",
    });
    return res.json({ message: "Reset sent", result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get OCPP Status
router.get("/:id/status", authenticateToken, requireRole(["ADMIN", "OPERATOR"]), async (req, res) => {
  try {
    const charger = await prisma.charger.findUnique({
      where: { id: req.params.id },
    });
    if (!charger) return res.status(404).json({ error: "Charger not found" });
    res.json({ status: charger.status, lastHeartbeat: charger.lastHeartbeat });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
