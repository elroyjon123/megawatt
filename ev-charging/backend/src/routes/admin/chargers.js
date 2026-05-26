const express = require("express");
const axios = require("axios");
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

    // Also fetch recent OCPP logs for this charger
    const ocppLogs = await prisma.ocppLog.findMany({
      where: { ocppId: charger.ocppId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    res.json({ ...charger, ocppLogs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get charger connection status (ADMIN)
// This checks the actual charger heartbeat, not the backend's OCPP bridge
router.get("/:id/connection-status", authenticateToken, requireRole(["ADMIN", "OPERATOR"]), async (req, res) => {
  try {
    const id = req.params.id;

    const charger = await prisma.charger.findFirst({
      where: {
        OR: [{ id }, { ocppId: id }],
      },
      select: { id: true, ocppId: true, lastHeartbeat: true, status: true, name: true },
    });

    if (!charger) {
      return res.status(404).json({ error: "Charger not found" });
    }

    const now = new Date();
    const lastHeartbeat = charger.lastHeartbeat ? new Date(charger.lastHeartbeat) : null;
    const secondsSinceHeartbeat = lastHeartbeat 
      ? Math.floor((now - lastHeartbeat) / 1000)
      : null;

    // Consider connected if heartbeat within last 5 minutes (300 seconds)
    const connected = secondsSinceHeartbeat !== null && secondsSinceHeartbeat < 300;

    // Connection quality based on heartbeat recency
    let quality = 'offline';
    if (connected) {
      if (secondsSinceHeartbeat < 30) quality = 'excellent';
      else if (secondsSinceHeartbeat < 120) quality = 'good';
      else quality = 'poor';
    }

    return res.json({
      connected,
      quality,
      lastHeartbeat: charger.lastHeartbeat,
      secondsSinceHeartbeat,
      status: charger.status,
      ocppId: charger.ocppId,
      name: charger.name,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update charger (ADMIN)
router.put("/:id", authenticateToken, requireRole(["ADMIN", "OPERATOR"]), async (req, res) => {
  try {
    const id = req.params.id;
    const { stationId, name, ocppId, connectorType, powerOutputKw, pricePerKwh } = req.body;
    
    // Find the charger first (supports both database ID and OCPP ID)
    const existingCharger = await prisma.charger.findFirst({
      where: {
        OR: [{ id }, { ocppId: id }],
      },
    });

    if (!existingCharger) {
      return res.status(404).json({ error: "Charger not found" });
    }

    // Update the charger using the database ID
    const charger = await prisma.charger.update({
      where: { id: existingCharger.id },
      data: {
        ...(stationId && { stationId }),
        ...(name && { name }),
        ...(ocppId && { ocppId }),
        ...(connectorType && { connectorType }),
        ...(powerOutputKw && { powerOutputKw: parseFloat(powerOutputKw) }),
        ...(pricePerKwh && { pricePerKwh: parseFloat(pricePerKwh) }),
      },
      include: { station: true },
    });
    
    return res.success(charger, "Charger updated");
  } catch (error) {
    return res.error(error.message, 500);
  }
});

// Deactivate charger (ADMIN) — soft delete
router.delete("/:id", authenticateToken, requireRole(["ADMIN", "OPERATOR"]), async (req, res) => {
  try {
    const id = req.params.id;
    
    // Find the charger first (supports both database ID and OCPP ID)
    const existingCharger = await prisma.charger.findFirst({
      where: {
        OR: [{ id }, { ocppId: id }],
      },
    });

    if (!existingCharger) {
      return res.status(404).json({ error: "Charger not found" });
    }

    // Delete the charger using the database ID
    const charger = await prisma.charger.delete({
      where: { id: existingCharger.id },
    });
    
    return res.success({ charger }, "Charger deleted");
  } catch (error) {
    return res.error(error.message, 500);
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

    const idTag = req.body?.idTag || "ADMIN";
    const connectorId = req.body?.connectorId || 1;

    // ✅ Use OCPP Server HTTP Admin API
    const ocppAdminUrl = process.env.OCPP_ADMIN_HTTP_BASE_URL || "http://104.154.220.209:9000";
    
    try {
      const url = `${ocppAdminUrl}/admin/remote-start`;
      
      const payload = {
        chargePointId: charger.ocppId,
        connectorId,
        idTag,
      };

      console.log(`[OCPP] Sending RemoteStartTransaction to ${url}`, payload);
      
      const response = await axios.post(url, payload, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      // Log the OCPP command
      await prisma.ocppLog.create({
        data: {
          ocppId: charger.ocppId,
          type: "RemoteStartTransaction",
          payload: {
            idTag,
            connectorId,
            response: response.data,
            mode: "real",
          },
        },
      });

      return res.json({
        message: `RemoteStartTransaction sent to ${charger.ocppId}`,
        result: response.data,
        chargerOcppId: charger.ocppId,
        mode: "real",
      });
    } catch (err) {
      console.error("[OCPP] Failed to send command:", err.message);
      
      // Check if charger is connected
      try {
        const checkUrl = `${ocppAdminUrl}/admin/connected/${charger.ocppId}`;
        const checkResponse = await axios.get(checkUrl);
        
        if (!checkResponse.data?.connected) {
          return res.status(503).json({
            error: `Charger ${charger.ocppId} is not connected to the OCPP server.`,
            chargerOcppId: charger.ocppId,
            hint: "Please ensure the physical charger is powered on and connected.",
          });
        }
      } catch (checkErr) {
        // Ignore check error, return original error
      }
      
      return res.status(500).json({
        error: `Failed to send OCPP command: ${err.message}`,
        chargerOcppId: charger.ocppId,
        details: err.response?.data || null,
      });
    }
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

    let { transactionId } = req.body || {};

    // ✅ Use OCPP Server HTTP Admin API
    const ocppAdminUrl = process.env.OCPP_ADMIN_HTTP_BASE_URL || "http://104.154.220.209:9000";
    
    // If no transaction ID provided, try to find the active session
    if (!transactionId) {
      const session = await prisma.chargingSession.findFirst({
        where: { 
          chargerId: charger.id,
          status: "ACTIVE"
        },
        orderBy: { startTime: "desc" }
      });

      if (!session || !session.ocppTransactionId) {
        return res.status(400).json({ 
          error: "No active session with transaction ID found. Please provide transaction ID.",
          chargerOcppId: charger.ocppId
        });
      }

      transactionId = session.ocppTransactionId;
    }

    try {
      const url = `${ocppAdminUrl}/admin/remote-stop`;
      
      const payload = {
        chargePointId: charger.ocppId,
        transactionId: parseInt(transactionId),
      };

      console.log(`[OCPP] Sending RemoteStopTransaction to ${url}`, payload);
      
      const response = await axios.post(url, payload, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      // Log the OCPP command
      await prisma.ocppLog.create({
        data: {
          ocppId: charger.ocppId,
          type: "RemoteStopTransaction",
          payload: {
            transactionId: parseInt(transactionId),
            response: response.data,
            mode: "real",
          },
        },
      });

      return res.json({
        message: `RemoteStopTransaction sent to ${charger.ocppId}`,
        result: response.data,
        transactionId,
        chargerOcppId: charger.ocppId,
        mode: "real",
      });
    } catch (err) {
      console.error("[OCPP] Failed to send command:", err.message);
      
      // Check if charger is connected
      try {
        const checkUrl = `${ocppAdminUrl}/admin/connected/${charger.ocppId}`;
        const checkResponse = await axios.get(checkUrl);
        
        if (!checkResponse.data?.connected) {
          return res.status(503).json({
            error: `Charger ${charger.ocppId} is not connected to the OCPP server.`,
            chargerOcppId: charger.ocppId,
            hint: "Please ensure the physical charger is powered on and connected.",
          });
        }
      } catch (checkErr) {
        // Ignore check error, return original error
      }
      
      return res.status(500).json({
        error: `Failed to send OCPP command: ${err.message}`,
        chargerOcppId: charger.ocppId,
        details: err.response?.data || null,
      });
    }
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

// Force Free - Manually set charger to AVAILABLE (ADMIN)
router.post("/:id/force-free", authenticateToken, requireRole(["ADMIN", "OPERATOR"]), async (req, res) => {
  try {
    const id = req.params.id;

    // Find the charger first (supports both database ID and OCPP ID)
    const existingCharger = await prisma.charger.findFirst({
      where: {
        OR: [{ id }, { ocppId: id }],
      },
    });

    if (!existingCharger) {
      return res.status(404).json({ error: "Charger not found" });
    }

    // Update charger status to AVAILABLE
    const charger = await prisma.charger.update({
      where: { id: existingCharger.id },
      data: {
        status: "AVAILABLE",
      },
    });

    // Cancel any active sessions for this charger
    const activeSessions = await prisma.chargingSession.findMany({
      where: {
        chargerId: existingCharger.id,
        status: "ACTIVE",
      },
    });

    if (activeSessions.length > 0) {
      await prisma.chargingSession.updateMany({
        where: {
          chargerId: existingCharger.id,
          status: "ACTIVE",
        },
        data: {
          status: "CANCELLED",
          endTime: new Date(),
        },
      });
    }

    // Emit Socket.IO event to notify clients
    const io = req.app.get("io");
    if (io) {
      io.to(`charger:${existingCharger.id}`).emit("charger:status", {
        chargerId: existingCharger.id,
        status: "AVAILABLE",
        lastHeartbeat: charger.lastHeartbeat,
      });
    }

    return res.json({
      message: "Charger forced to AVAILABLE status",
      charger,
      cancelledSessions: activeSessions.length,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
