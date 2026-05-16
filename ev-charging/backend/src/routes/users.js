const express = require("express");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const prisma = require("../lib/prisma");

const router = express.Router();

// Get all users (ADMIN ONLY)
router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID (ADMIN ONLY)
router.get("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        wallet: true,
        vehicles: true,
        transactions: true,
      },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user (ADMIN ONLY)
router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { name, phone },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deactivate user (ADMIN ONLY - soft delete via flag, store in separate table or use isActive)
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    // For now, we'll just mark as deleted by updating email with prefix.
    // (Build plan suggests `isActive`; we can migrate to that later without breaking IDs.)
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { email: `deleted_${Date.now()}_${req.params.id}` },
    });
    res.json({ message: "User deactivated", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
