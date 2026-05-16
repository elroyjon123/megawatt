const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const { authenticateToken } = require("../middleware/auth");
const prisma = require("../lib/prisma");

const router = express.Router();

function mustEnv(name) {
  const v = process.env[name];
  if (!v) {
    const err = new Error(`${name} is required for this endpoint`);
    err.statusCode = 500;
    throw err;
  }
  return v;
}

function getOAuthClient() {
  const clientId = mustEnv("GOOGLE_CLIENT_ID");
  const clientSecret = mustEnv("GOOGLE_CLIENT_SECRET");
  const redirectUri = process.env.GOOGLE_REDIRECT_URL || "http://localhost:3001/api/auth/google/callback";
  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

function signTokensForUser(user) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
}

// Register
router.post("/register", async (req, res) => {
  try {
    const { email, name, phone, password } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        phone,
        passwordHash,
        role: "USER",
        wallet: {
          create: { balancePeso: 0 },
        },
      },
    });

    const { accessToken, refreshToken } = signTokensForUser(user);

    res.json({
      message: "User registered successfully",
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const { accessToken, refreshToken } = signTokensForUser(user);

    res.json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Google OAuth start (redirect)
router.get("/google/start", async (req, res) => {
  try {
    const client = getOAuthClient();
    const state = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const url = client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["openid", "email", "profile"],
      state,
    });

    return res.redirect(url);
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ error: error.message });
  }
});

// Google OAuth callback
router.get("/google/callback", async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).json({ error: "Missing code" });

    const client = getOAuthClient();
    const { tokens } = await client.getToken(String(code));
    if (!tokens?.id_token) {
      return res.status(400).json({ error: "Google did not return id_token" });
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: mustEnv("GOOGLE_CLIENT_ID"),
    });
    const payload = ticket.getPayload();
    const email = payload?.email;
    const name = payload?.name || payload?.given_name || "Megawatt User";

    if (!email) return res.status(400).json({ error: "Google account has no email" });

    // If user exists, use it. Otherwise create.
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Random passwordHash because schema requires it. User will login via Google.
      const passwordHash = await bcrypt.hash(crypto.randomUUID(), 10);
      user = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: "USER",
          wallet: { create: { balancePeso: 0 } },
        },
      });
    }

    const { accessToken, refreshToken } = signTokensForUser(user);

    const redirectBase = process.env.USER_APP_AUTH_REDIRECT_URL || "http://localhost:5174/auth/callback";
    const redirectUrl = new URL(redirectBase);
    redirectUrl.searchParams.set("accessToken", accessToken);
    redirectUrl.searchParams.set("refreshToken", refreshToken);
    redirectUrl.searchParams.set("email", user.email);
    redirectUrl.searchParams.set("name", user.name);
    redirectUrl.searchParams.set("role", user.role);

    return res.redirect(redirectUrl.toString());
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Refresh Token
// IMPORTANT: keep this fully async/await (no jwt.verify callback), otherwise DB errors can crash the process.
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token required" });
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (_) {
      return res.status(403).json({ error: "Invalid refresh token" });
    }

    // Important: access tokens must include role/email for admin authorization.
    const dbUser = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!dbUser) return res.status(401).json({ error: "User not found" });

    const accessToken = jwt.sign(
      { id: dbUser.id, email: dbUser.email, role: dbUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({ accessToken });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Logout (client-side; just acknowledge)
router.post("/logout", authenticateToken, (req, res) => {
  res.json({ message: "Logged out successfully" });
});

// Me (profile)
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Update my profile
router.put("/me", authenticateToken, async (req, res) => {
  try {
    const { name, phone } = req.body || {};
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name != null ? { name } : {}),
        ...(phone != null ? { phone } : {}),
      },
      select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Change password
router.put("/password", authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "oldPassword and newPassword are required" });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const ok = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!ok) return res.status(400).json({ error: "Old password is incorrect" });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash },
    });

    return res.json({ message: "Password updated" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
