const express = require("express");
const { authenticateToken, requireAdmin } = require("../../middleware/auth");
const prisma = require("../../lib/prisma");

const router = express.Router();

const ALLOWED_CONNECTORS = ["CCS", "CHAdeMO", "TYPE2", "GB/T", "NACS"];

function parseYear(year) {
  const y = parseInt(year, 10);
  if (!Number.isInteger(y) || y < 1980 || y > 2100) {
    const err = new Error("year must be a valid year");
    err.httpStatus = 400;
    throw err;
  }
  return y;
}

// List catalog (admin)
router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { q, isActive, page, pageSize } = req.query;

    const where = {
      ...(isActive === "true" ? { isActive: true } : isActive === "false" ? { isActive: false } : {}),
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

    const pageNum = Math.max(parseInt(page || "1", 10), 1);
    const size = Math.min(Math.max(parseInt(pageSize || "25", 10), 1), 100);
    const skip = (pageNum - 1) * size;

    const [total, items] = await Promise.all([
      prisma.vehicleCatalog.count({ where }),
      prisma.vehicleCatalog.findMany({
        where,
        orderBy: [{ make: "asc" }, { model: "asc" }, { year: "desc" }],
        skip,
        take: size,
      }),
    ]);

    return res.json({ items, page: pageNum, pageSize: size, total });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Create catalog entry (admin)
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { make, model, year, connectorType, isActive } = req.body || {};
    if (!make || !model || !year || !connectorType) {
      return res.status(400).json({ error: "make, model, year, connectorType are required" });
    }
    if (!ALLOWED_CONNECTORS.includes(connectorType)) {
      return res.status(400).json({ error: `connectorType must be one of: ${ALLOWED_CONNECTORS.join(", ")}` });
    }

    const created = await prisma.vehicleCatalog.create({
      data: {
        make,
        model,
        year: parseYear(year),
        connectorType,
        ...(typeof isActive === "boolean" ? { isActive } : {}),
      },
    });

    return res.json(created);
  } catch (error) {
    const status = error.httpStatus || 500;
    return res.status(status).json({ error: error.message });
  }
});

// Update catalog entry (admin)
router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { make, model, year, connectorType, isActive } = req.body || {};
    if (connectorType != null && connectorType !== "" && !ALLOWED_CONNECTORS.includes(connectorType)) {
      return res.status(400).json({ error: `connectorType must be one of: ${ALLOWED_CONNECTORS.join(", ")}` });
    }

    const updated = await prisma.vehicleCatalog.update({
      where: { id: req.params.id },
      data: {
        ...(make != null ? { make } : {}),
        ...(model != null ? { model } : {}),
        ...(year != null ? { year: parseYear(year) } : {}),
        ...(connectorType != null ? { connectorType } : {}),
        ...(typeof isActive === "boolean" ? { isActive } : {}),
      },
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Delete catalog entry (admin) - hard delete
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    await prisma.vehicleCatalog.delete({ where: { id: req.params.id } });
    return res.json({ message: "Vehicle catalog entry deleted" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
