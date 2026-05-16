const express = require("express");
const prisma = require("../lib/prisma");

const router = express.Router();

// Public list for dropdowns (no auth)
// Supports: q, activeOnly=true
router.get("/", async (req, res) => {
  try {
    const { q, activeOnly } = req.query;

    const where = {
      ...(activeOnly === "true" ? { isActive: true } : {}),
      ...(q
        ? {
            OR: [
              { make: { contains: q, mode: "insensitive" } },
              { model: { contains: q, mode: "insensitive" } },
              { connectorType: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const items = await prisma.vehicleCatalog.findMany({
      where,
      orderBy: [{ make: "asc" }, { model: "asc" }, { year: "desc" }],
      take: 500,
    });

    return res.json(items);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
