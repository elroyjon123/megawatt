const express = require("express");
const { authenticateToken, requireAdmin } = require("../../middleware/auth");
const prisma = require("../../lib/prisma");

const router = express.Router();

// Create voucher (ADMIN)
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { code, discountPeso, discountPercent, maxUses, expiresAt } = req.body;
    const voucher = await prisma.voucher.create({
      data: {
        code,
        discountPeso: discountPeso ? parseFloat(discountPeso) : null,
        discountPercent: discountPercent ? parseFloat(discountPercent) : null,
        maxUses: maxUses || 1,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
    res.json(voucher);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all vouchers (ADMIN)
router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { q, isActive, page, pageSize } = req.query;

    const where = {
      ...(typeof isActive === "string" ? { isActive: isActive === "true" } : {}),
      ...(q
        ? {
            OR: [{ code: { contains: q, mode: "insensitive" } }],
          }
        : {}),
    };

    // Backward compatible
    if (!page && !pageSize) {
      const vouchers = await prisma.voucher.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
      return res.json(vouchers);
    }

    const pageNum = Math.max(parseInt(page || "1", 10), 1);
    const size = Math.min(Math.max(parseInt(pageSize || "20", 10), 1), 100);
    const skip = (pageNum - 1) * size;

    const [total, items] = await Promise.all([
      prisma.voucher.count({ where }),
      prisma.voucher.findMany({
        where,
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

// Update voucher (ADMIN)
router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { discountPeso, discountPercent, maxUses, expiresAt, isActive } = req.body;
    const voucher = await prisma.voucher.update({
      where: { id: req.params.id },
      data: {
        discountPeso: discountPeso ? parseFloat(discountPeso) : undefined,
        discountPercent: discountPercent ? parseFloat(discountPercent) : undefined,
        maxUses,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        isActive,
      },
    });
    res.json(voucher);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deactivate voucher (ADMIN)
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const voucher = await prisma.voucher.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ message: "Voucher deactivated", voucher });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
