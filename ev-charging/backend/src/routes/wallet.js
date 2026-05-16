const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const prisma = require("../lib/prisma");

const router = express.Router();

// Get user's wallet balance
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.id },
    });
    if (!wallet) return res.status(404).json({ error: "Wallet not found" });
    res.json(wallet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * ✅ Get wallet balance
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    let wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.id },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId: req.user.id, balance: 0 },
      });
    }

    res.json(wallet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * ✅ Top-up wallet (demo)
 */
router.post("/topup", authenticateToken, async (req, res) => {
  try {
    const amount = parseFloat(req.body.amount || 0);

    if (amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const wallet = await prisma.wallet.upsert({
      where: { userId: req.user.id },
      update: {
        balance: { increment: amount },
      },
      create: {
        userId: req.user.id,
        balance: amount,
      },
    });

    res.json({ message: "Top-up successful", wallet });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
