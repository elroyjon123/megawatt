const express = require("express");
const { authenticateToken, requireAdmin } = require("../../middleware/auth");
const prisma = require("../../lib/prisma");

const router = express.Router();

// Send message to user or broadcast (ADMIN)
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { recipientId, recipientType, title, body, type } = req.body;

    if (!title || !body || !type) {
      return res.status(400).json({ error: "title, body, and type are required" });
    }

    const batchId = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    let userIds = [];
    if (recipientType === "specific" && recipientId) {
      userIds = [recipientId];
    } else if (recipientType === "all") {
      const users = await prisma.user.findMany({ select: { id: true } });
      userIds = users.map((u) => u.id);
    } else {
      return res.status(400).json({ error: "Invalid recipientType" });
    }

    // Create messages for all recipients
    const messages = await prisma.$transaction(
      userIds.map((userId) =>
        prisma.message.create({
          data: {
            userId,
            createdBy: req.user.id,
            batchId,
            title,
            body,
            type,
          },
        })
      )
    );

    res.json({ message: "Message(s) sent successfully", count: messages.length, batchId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all messages (ADMIN) - filterable/paginated
router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { onlySent, type, q, page, pageSize } = req.query;

    const where = {
      ...(type ? { type } : {}),
      ...(onlySent === "true" ? { createdBy: { not: null } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { body: { contains: q, mode: "insensitive" } },
              { user: { email: { contains: q, mode: "insensitive" } } },
              { user: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    // Backward compatible
    if (!page && !pageSize) {
      const messages = await prisma.message.findMany({
        where,
        include: { user: true },
        orderBy: { createdAt: "desc" },
      });
      return res.json(messages);
    }

    const pageNum = Math.max(parseInt(page || "1", 10), 1);
    const size = Math.min(Math.max(parseInt(pageSize || "50", 10), 1), 200);
    const skip = (pageNum - 1) * size;

    const [total, items] = await Promise.all([
      prisma.message.count({ where }),
      prisma.message.findMany({
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

// Get sent-message batches (ADMIN) - 1 row per batchId
router.get("/batches", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { type, q, page, pageSize } = req.query;

    // Postgres supports distinct on. Prisma supports it via distinct + orderBy.
    const where = {
      createdBy: { not: null },
      batchId: { not: null },
      ...(type ? { type } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { body: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const pageNum = Math.max(parseInt(page || "1", 10), 1);
    const size = Math.min(Math.max(parseInt(pageSize || "20", 10), 1), 100);
    const skip = (pageNum - 1) * size;

    const batches = await prisma.message.findMany({
      where,
      distinct: ["batchId"],
      orderBy: [{ batchId: "asc" }, { createdAt: "desc" }],
      include: { user: true },
      skip,
      take: size,
    });

    // total batches: approximate via counting distinct in JS for now (simple)
    // For large datasets, we'd add a dedicated SentMessageBatch model.
    const allBatchIds = await prisma.message.findMany({
      where,
      distinct: ["batchId"],
      select: { batchId: true },
    });

    return res.json({
      items: batches.map((m) => ({
        batchId: m.batchId,
        createdAt: m.createdAt,
        createdBy: m.createdBy,
        type: m.type,
        title: m.title,
        body: m.body,
      })),
      page: pageNum,
      pageSize: size,
      total: allBatchIds.length,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
