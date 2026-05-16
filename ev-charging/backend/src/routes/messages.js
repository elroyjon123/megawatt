const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const prisma = require("../lib/prisma");

const router = express.Router();

// Get user's messages (inbox)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark message as read
router.put("/:id/read", authenticateToken, async (req, res) => {
  try {
    const message = await prisma.message.findUnique({
      where: { id: req.params.id },
    });
    if (!message) return res.status(404).json({ error: "Message not found" });
    if (message.userId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const updated = await prisma.message.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete message
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const message = await prisma.message.findUnique({
      where: { id: req.params.id },
    });
    if (!message) return res.status(404).json({ error: "Message not found" });
    if (message.userId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await prisma.message.delete({
      where: { id: req.params.id },
    });
    res.json({ message: "Message deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
