const express = require("express");
const { authenticateToken, requireRole } = require("../../middleware/auth");

const router = express.Router();

// ✅ Fully WebSocket-based OCPP status (no HTTP dependency)

// GET /api/admin/ocpp-server/connected
router.get("/connected", authenticateToken, requireRole(["ADMIN", "OPERATOR"]), (req, res) => {
  const ocppBridge = req.app.get("ocpp");
  return res.json({ connected: !!ocppBridge?.connected });
});

// GET /api/admin/ocpp-server/connected/:chargePointId
router.get("/connected/:chargePointId", authenticateToken, requireRole(["ADMIN", "OPERATOR"]), (req, res) => {
  const ocppBridge = req.app.get("ocpp");

  if (!ocppBridge?.connected) {
    return res.json({ connected: false });
  }

  // ✅ simple assumption: if bridge connected, charger may be reachable
  // (can be improved later with per-charger tracking)
  return res.json({
    connected: true,
    chargePointId: req.params.chargePointId,
  });
});

// NOTE:
// All HTTP proxy endpoints removed.
// OCPP control is now handled via WebSocket bridge in /admin/chargers routes.

module.exports = router;