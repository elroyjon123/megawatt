const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const prisma = require("../lib/prisma");

const router = express.Router();

// Get user's vehicles
router.get("/", authenticateToken, async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { userId: req.user.id },
    });
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add vehicle
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { make, model, year, plateNumber, connectorType } = req.body;
    const vehicle = await prisma.vehicle.create({
      data: {
        userId: req.user.id,
        make,
        model,
        year: parseInt(year),
        plateNumber,
        connectorType,
      },
    });
    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update vehicle
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
    });
    if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
    if (vehicle.userId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { make, model, year, plateNumber, connectorType } = req.body;
    const updated = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: {
        make,
        model,
        year: year ? parseInt(year) : undefined,
        plateNumber,
        connectorType,
      },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete vehicle
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
    });
    if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
    if (vehicle.userId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await prisma.vehicle.delete({
      where: { id: req.params.id },
    });
    res.json({ message: "Vehicle deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
