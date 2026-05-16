const express = require("express");
const { authenticateToken, requireRole } = require("../../middleware/auth");
const prisma = require("../../lib/prisma");

const router = express.Router();

// Get all sessions (ADMIN)
router.get("/", authenticateToken, requireRole(["ADMIN", "OPERATOR"]), async (req, res) => {
  try {
    const { userId, chargerId, status, from, to, page, pageSize } = req.query;

    const startTime =
      from || to
        ? {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          }
        : undefined;

    const where = {
      ...(userId ? { userId } : {}),
      ...(chargerId ? { chargerId } : {}),
      ...(status ? { status } : {}),
      ...(startTime ? { startTime } : {}),
    };

    // Backward compatible: return array when no paging is specified
    if (!page && !pageSize) {
      const sessions = await prisma.chargingSession.findMany({
        where,
        include: { charger: { include: { station: true } } },
        orderBy: { startTime: "desc" },
      });
      return res.json(sessions);
    }

    const pageNum = Math.max(parseInt(page || "1", 10), 1);
    const size = Math.min(Math.max(parseInt(pageSize || "50", 10), 1), 200);
    const skip = (pageNum - 1) * size;

    const [total, items] = await Promise.all([
      prisma.chargingSession.count({ where }),
      prisma.chargingSession.findMany({
        where,
        include: { charger: { include: { station: true } } },
        orderBy: { startTime: "desc" },
        skip,
        take: size,
      }),
    ]);

    return res.json({ items, page: pageNum, pageSize: size, total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get session by ID (ADMIN/OPERATOR)
router.get("/:id", authenticateToken, requireRole(["ADMIN", "OPERATOR"]), async (req, res) => {
  try {
    const session = await prisma.chargingSession.findUnique({
      where: { id: req.params.id },
      include: {
        charger: { include: { station: true } },
      },
    });
    if (!session) return res.status(404).json({ error: "Session not found" });
    return res.json(session);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
