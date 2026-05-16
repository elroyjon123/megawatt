const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const prisma = require("../lib/prisma");

const router = express.Router();

// Get user's sessions
router.get("/", authenticateToken, async (req, res) => {
  try {
    const sessions = await prisma.chargingSession.findMany({
      where: { userId: req.user.id },
      include: { charger: true },
      orderBy: { startTime: "desc" },
    });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get session detail
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const session = await prisma.chargingSession.findUnique({
      where: { id: req.params.id },
      include: { charger: true },
    });
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * ✅ Start charging session (USER)
 */
router.post("/start", authenticateToken, async (req, res) => {
  try {
    const { chargerId, ocppId } = req.body;

    if (!chargerId && !ocppId) {
      return res.status(400).json({ error: "chargerId or ocppId required" });
    }

    const charger = await prisma.charger.findFirst({
      where: {
        OR: [{ id: chargerId }, { ocppId }],
      },
    });

    if (!charger) {
      return res.status(404).json({ error: "Charger not found" });
    }

    // ✅ check wallet balance before start
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.id },
    });

    if (!wallet || wallet.balance <= 0) {
      return res.status(400).json({ error: "Insufficient balance to start charging" });
    }

    const session = await prisma.chargingSession.create({
      data: {
        userId: req.user.id,
        startTime: new Date(),
        status: "ACTIVE",
        energyKwh: 0,
        costPeso: 0,
        charger: {
          connect: charger.id
            ? { id: charger.id }
            : { ocppId: charger.ocppId },
        },
      },
    });

    await prisma.charger.update({
      where: { id: charger.id },
      data: { status: "OCCUPIED" },
    });

    // ✅ START DEMO SIMULATOR
    const simulator = require("../demo/sessionSimulator");
    const io = req.app.get("io"); // ✅ get socket instance
    simulator.start(session.id, charger.id, charger.ocppId, io);

    return res.json({ message: "Session started", sessionId: session.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * ✅ Stop charging session (USER)
 */
router.post("/:id/stop", authenticateToken, async (req, res) => {
  try {
    const session = await prisma.chargingSession.findUnique({
      where: { id: req.params.id },
      include: { charger: true },
    });

    if (!session) return res.status(404).json({ error: "Session not found" });

    if (session.userId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (session.status !== "ACTIVE") {
      return res.status(400).json({ error: "Session not active" });
    }

    // ✅ calculate final cost
    const finalCost = parseFloat(session.costPeso || 0);

    // ✅ get user wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId: session.userId },
    });

    if (!wallet || wallet.balance < finalCost) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // ✅ deduct balance
    await prisma.wallet.update({
      where: { userId: session.userId },
      data: {
        balance: wallet.balance - finalCost,
      },
    });

    const updated = await prisma.chargingSession.update({
      where: { id: session.id },
      data: {
        status: "COMPLETED",
        endTime: new Date(),
      },
    });

    await prisma.charger.update({
      where: { id: session.chargerId },
      data: { status: "AVAILABLE" },
    });

    const io = req.app.get("io");
    if (io && session.charger?.ocppId) {
      io.emit("charger:status", {
        ocppId: session.charger.ocppId,
        status: "AVAILABLE",
      });
    }

    // ✅ create inbox message (receipt)
    await prisma.message.create({
      data: {
        userId: session.userId,
        title: "Charging Session Receipt",
        body: `Your charging session is complete.\n\nEnergy: ${session.energyKwh} kWh\nCost: ₱${session.costPeso}\n\nThank you for using Megawatt.`,
        type: "TRANSACTION",
      },
    });

    return res.json({ message: "Session stopped", session: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
