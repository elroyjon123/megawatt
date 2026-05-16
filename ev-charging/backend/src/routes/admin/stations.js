const express = require("express");
const asyncHandler = require("../../middleware/asyncHandler");
const prisma = require("../../lib/prisma");

const router = express.Router();

// Create station (ADMIN)
router.post("/", asyncHandler(async (req, res) => {
    const { name, address, city, latitude, longitude, openHours, photos } = req.body;
    const station = await prisma.station.create({
      data: {
        name,
        address,
        city,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        openHours,
        photos: photos || [],
      },
    });
    return res.success(station, "Station created");
}));

// Get all stations (ADMIN)
router.get("/", asyncHandler(async (req, res) => {
    const { q, isActive, page, pageSize } = req.query;

    const where = {
      ...(typeof isActive === "string" ? { isActive: isActive === "true" } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { address: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    // Backward compatible: return array when no paging is specified
    if (!page && !pageSize) {
      const stations = await prisma.station.findMany({
        where,
        include: { chargers: true },
        orderBy: { createdAt: "desc" },
      });
      return res.success(stations);
    }

    const pageNum = Math.max(parseInt(page || "1", 10), 1);
    const size = Math.min(Math.max(parseInt(pageSize || "20", 10), 1), 100);
    const skip = (pageNum - 1) * size;

    const [total, items] = await Promise.all([
      prisma.station.count({ where }),
      prisma.station.findMany({
        where,
        include: { chargers: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: size,
      }),
    ]);

    return res.success({ items, page: pageNum, pageSize: size, total });
}));

// Get station by ID (ADMIN)
router.get("/:id", asyncHandler(async (req, res) => {
    const station = await prisma.station.findUnique({
      where: { id: req.params.id },
      include: { chargers: true },
    });
    if (!station) return res.error("Station not found", 404);
    return res.success(station);
}));

// Update station (ADMIN)
router.put("/:id", asyncHandler(async (req, res) => {
    const { name, address, city, latitude, longitude, openHours, photos } = req.body;
    const station = await prisma.station.update({
      where: { id: req.params.id },
      data: {
        name,
        address,
        city,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        openHours,
        photos,
      },
    });
    return res.success(station, "Station updated");
}));

// Deactivate station (ADMIN)
router.delete("/:id", asyncHandler(async (req, res) => {
    const station = await prisma.station.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    return res.success({ station }, "Station deactivated");
}));

module.exports = router;
