const express = require("express");
const prisma = require("../lib/prisma");

const router = express.Router();

// Get stations with filters (public)
router.get("/", async (req, res) => {
  try {
    // TODO (Phase 2): add geo filtering with latitude/longitude/radius
    const stations = await prisma.station.findMany({
      where: { isActive: true },
      include: {
        chargers: {
          where: {
            NOT: { status: "OFFLINE" },
          },
        },
      },
    });
    res.json(stations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get station detail
router.get("/:id", async (req, res) => {
  try {
    const station = await prisma.station.findUnique({
      where: { id: req.params.id },
      include: {
        chargers: {
          where: {
            NOT: { status: "OFFLINE" },
          },
        },
      },
    });
    if (!station) return res.status(404).json({ error: "Station not found" });
    if (!station.isActive) return res.status(404).json({ error: "Station not found" });
    res.json(station);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
