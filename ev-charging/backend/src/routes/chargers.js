const express = require("express");
const prisma = require("../lib/prisma");

const router = express.Router();

// Get charger by ID OR OCPP ID
router.get("/:id", async (req, res) => {
  try {
    const param = req.params.id;

    const charger = await prisma.charger.findFirst({
      where: {
        OR: [
          { id: param },
          { ocppId: param }
        ]
      },
      include: { sessions: true },
    });

    if (!charger) {
      return res.status(404).json({ error: "Charger not found" });
    }

    // ✅ allow OFFLINE chargers (for demo / QR access)
    res.json(charger);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
