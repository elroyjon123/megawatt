const express = require("express");
const { authenticateToken, requireAdmin } = require("../../middleware/auth");
const prisma = require("../../lib/prisma");

const router = express.Router();

const ALLOWED_CONNECTORS = ["CCS", "CHAdeMO", "TYPE2", "GB/T", "NACS"];

// List vehicles by userId
router.get("/user/:userId", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { userId: req.params.userId },
      orderBy: { make: "asc" },
    });
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Global list (admin): query by q / userId with paging
router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { q, userId, page, pageSize } = req.query;

    const where = {
      ...(userId ? { userId } : {}),
      ...(q
        ? {
            OR: [
              { make: { contains: q, mode: "insensitive" } },
              { model: { contains: q, mode: "insensitive" } },
              { plateNumber: { contains: q, mode: "insensitive" } },
              { connectorType: { contains: q, mode: "insensitive" } },
              {
                user: {
                  OR: [
                    { email: { contains: q, mode: "insensitive" } },
                    { name: { contains: q, mode: "insensitive" } },
                  ],
                },
              },
            ],
          }
        : {}),
    };

    const pageNum = Math.max(parseInt(page || "1", 10), 1);
    const size = Math.min(Math.max(parseInt(pageSize || "25", 10), 1), 100);
    const skip = (pageNum - 1) * size;

    const [total, items] = await Promise.all([
      prisma.vehicle.count({ where }),
      prisma.vehicle.findMany({
        where,
        include: { user: { select: { id: true, email: true, name: true } } },
        orderBy: { id: "desc" },
        skip,
        take: size,
      }),
    ]);

    return res.json({ items, page: pageNum, pageSize: size, total });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Create vehicle for userId
router.post("/user/:userId", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { make, model, year, plateNumber, connectorType } = req.body || {};
    if (!make || !model || !year || !connectorType) {
      return res.status(400).json({ error: "make, model, year, connectorType are required" });
    }

    const y = parseInt(year, 10);
    if (!Number.isInteger(y) || y < 1980 || y > 2100) {
      return res.status(400).json({ error: "year must be a valid year" });
    }

    if (connectorType && !ALLOWED_CONNECTORS.includes(connectorType)) {
      return res
        .status(400)
        .json({ error: `connectorType must be one of: ${ALLOWED_CONNECTORS.join(", ")}` });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        userId: req.params.userId,
        make,
        model,
        year: y,
        plateNumber: plateNumber || null,
        connectorType,
      },
    });
    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update vehicle (admin)
router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { make, model, year, plateNumber, connectorType } = req.body || {};

    if (year != null) {
      const y = parseInt(year, 10);
      if (!Number.isInteger(y) || y < 1980 || y > 2100) {
        return res.status(400).json({ error: "year must be a valid year" });
      }
    }

    if (connectorType != null && connectorType !== "" && !ALLOWED_CONNECTORS.includes(connectorType)) {
      return res
        .status(400)
        .json({ error: `connectorType must be one of: ${ALLOWED_CONNECTORS.join(", ")}` });
    }

    const updated = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: {
        ...(make != null ? { make } : {}),
        ...(model != null ? { model } : {}),
        ...(year != null ? { year: parseInt(year, 10) } : {}),
        ...(plateNumber != null ? { plateNumber } : {}),
        ...(connectorType != null ? { connectorType } : {}),
      },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete vehicle (admin)
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    await prisma.vehicle.delete({ where: { id: req.params.id } });
    res.json({ message: "Vehicle deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
