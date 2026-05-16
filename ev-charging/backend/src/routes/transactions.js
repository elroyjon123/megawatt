const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const prisma = require("../lib/prisma");

const router = express.Router();

// Get user's transaction history
router.get("/", authenticateToken, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
