const express = require("express");
const { authenticateToken, requireAdmin } = require("../../middleware/auth");
const prisma = require("../../lib/prisma");

const router = express.Router();

// Get wallet by user ID (ADMIN)
router.get("/:userId", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.params.userId },
      include: { topUps: true },
    });
    if (!wallet) return res.status(404).json({ error: "Wallet not found" });
    res.json(wallet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin top-up wallet
router.post("/:userId/topup", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { amountPeso, note } = req.body;

    const amount = Number(amountPeso);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "amountPeso must be a positive number" });
    }

    const userId = req.params.userId;

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        const err = new Error("Wallet not found");
        err.httpStatus = 404;
        throw err;
      }

      // Create TopUp record
      const topUp = await tx.topUp.create({
        data: {
          walletId: wallet.id,
          amountPeso: amount,
          note,
          createdBy: req.user.id,
        },
      });

      // Update wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balancePeso: {
            increment: amount,
          },
        },
      });

      // Create transaction record
      const txn = await tx.transaction.create({
        data: {
          userId,
          type: "TOP_UP",
          amountPeso: amount,
          description: `Top-up: ${note || ""}`,
          referenceId: topUp.id,
        },
      });

      // Auto-create inbox message for user
      const msg = await tx.message.create({
        data: {
          userId,
          createdBy: req.user.id,
          title: "Wallet top-up",
          body: `Your wallet was topped up by ₱${amount}. ${note ? `Note: ${note}` : ""}`.trim(),
          type: "TRANSACTION",
          referenceId: txn.id,
        },
      });

      return { wallet: updatedWallet, topUp, transaction: txn, message: msg };
    });

    res.json({ message: "Top-up successful", ...result });
  } catch (error) {
    const httpStatus = error.httpStatus;
    if (httpStatus) {
      return res.status(httpStatus).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// Admin refund (non-OCPP)
// Credits user's wallet and creates REFUND transaction + inbox message.
router.post("/:userId/refund", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { amountPeso, note } = req.body;

    const amount = Number(amountPeso);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "amountPeso must be a positive number" });
    }

    const userId = req.params.userId;

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        const err = new Error("Wallet not found");
        err.httpStatus = 404;
        throw err;
      }

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balancePeso: {
            increment: amount,
          },
        },
      });

      const txn = await tx.transaction.create({
        data: {
          userId,
          type: "REFUND",
          amountPeso: amount,
          description: `Refund: ${note || ""}`.trim(),
        },
      });

      const msg = await tx.message.create({
        data: {
          userId,
          createdBy: req.user.id,
          title: "Wallet refund",
          body: `A refund of ₱${amount} was applied to your wallet. ${note ? `Note: ${note}` : ""}`.trim(),
          type: "TRANSACTION",
          referenceId: txn.id,
        },
      });

      return { wallet: updatedWallet, transaction: txn, message: msg };
    });

    res.json({ message: "Refund successful", ...result });
  } catch (error) {
    const httpStatus = error.httpStatus;
    if (httpStatus) {
      return res.status(httpStatus).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
