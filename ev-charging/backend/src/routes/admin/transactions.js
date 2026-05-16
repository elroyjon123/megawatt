const express = require("express");
const { authenticateToken, requireAdmin } = require("../../middleware/auth");
const prisma = require("../../lib/prisma");

const router = express.Router();

// Get all transactions (ADMIN)
router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, type, from, to, q, page, pageSize } = req.query;

    const createdAt =
      from || to
        ? {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          }
        : undefined;

    const where = {
      ...(userId ? { userId } : {}),
      ...(type ? { type } : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(q
        ? {
            OR: [
              { description: { contains: q, mode: "insensitive" } },
              { referenceId: { contains: q, mode: "insensitive" } },
              { user: { email: { contains: q, mode: "insensitive" } } },
              { user: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    // Backward compatible: return array when no paging is specified
    if (!page && !pageSize) {
      const transactions = await prisma.transaction.findMany({
        where,
        include: { user: true },
        orderBy: { createdAt: "desc" },
      });
      return res.json(transactions);
    }

    const pageNum = Math.max(parseInt(page || "1", 10), 1);
    const size = Math.min(Math.max(parseInt(pageSize || "50", 10), 1), 200);
    const skip = (pageNum - 1) * size;

    const [total, items] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        include: { user: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: size,
      }),
    ]);

    return res.json({ items, page: pageNum, pageSize: size, total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
