const express = require("express");
const prisma = require("../../lib/prisma");

const router = express.Router();

// GET /api/admin/ocpp-logs
router.get("/", async (req, res) => {
  try {
    const { ocppId, sessionId, limit = 50 } = req.query;

    const logs = await prisma.ocppLog.findMany({
      where: {
        ...(ocppId ? { ocppId } : {}),
        ...(sessionId ? { sessionId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: Number(limit),
    });

    res.json(logs);
  } catch (err) {
    console.error("OCPP logs error:", err);
    res.status(500).json({ error: "Failed to fetch OCPP logs" });
  }
});

module.exports = router;