const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const prisma = require("../lib/prisma");

const router = express.Router();

// Redeem voucher
router.post("/redeem", authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;

    const voucher = await prisma.voucher.findUnique({
      where: { code },
    });

    if (!voucher) return res.status(404).json({ error: "Voucher not found" });
    if (!voucher.isActive) return res.status(400).json({ error: "Voucher is inactive" });
    if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
      return res.status(400).json({ error: "Voucher expired" });
    }
    if (voucher.usedCount >= voucher.maxUses) {
      return res.status(400).json({ error: "Voucher max uses reached" });
    }

    // Create redemption record
    await prisma.voucherRedemption.create({
      data: {
        voucherId: voucher.id,
        userId: req.user.id,
      },
    });

    // Update voucher use count
    const updatedVoucher = await prisma.voucher.update({
      where: { id: voucher.id },
      data: { usedCount: { increment: 1 } },
    });

    // Get user's wallet and apply discount
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.id },
    });

    let discountAmount = 0;
    if (voucher.discountPeso) {
      discountAmount = parseFloat(voucher.discountPeso);
    } else if (voucher.discountPercent) {
      // For percentage discount, we'd need a reference transaction amount
      discountAmount = 0;
    }

    // Add discount to wallet
    if (discountAmount > 0) {
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { balancePeso: { increment: discountAmount } },
      });

      // Create transaction record
      await prisma.transaction.create({
        data: {
          userId: req.user.id,
          type: "VOUCHER_REDEMPTION",
          amountPeso: discountAmount,
          description: `Voucher redeemed: ${code}`,
          referenceId: voucher.id,
        },
      });
    }

    res.json({ message: "Voucher redeemed successfully", discountAmount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
