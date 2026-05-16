require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIO = require("socket.io");

const prisma = require("./src/lib/prisma");
const { initOcppBridge } = require("./src/ocpp");
const { startSimulator } = require("./src/demo/sessionSimulator");
const app = express();
const server = http.createServer(app);

function parseOrigins(v) {
  if (!v) return [];
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const allowedOrigins = [
  ...parseOrigins(process.env.ADMIN_URL),
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  // Admin alt port (we sometimes run Vite on 5175)
  "http://localhost:5175",
  "http://127.0.0.1:5175",
  // User app (Vite)
  ...parseOrigins(process.env.USER_APP_URL),
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:5176",
  "http://127.0.0.1:5176",
].filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    // allow non-browser clients (curl, server-to-server)
    if (!origin) return cb(null, true);

    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Internal-Token",
    "X-Admin-Maintenance-Token",
    "X-Devtools-Token",
  ],
};
const io = socketIO(server, {
  cors: {
    origin: allowedOrigins,
    methods: corsOptions.methods,
  },
});

// OCPP Bridge (legacy client). Under Option A this should be disabled.
// Keep it behind a flag so we can migrate safely.
const ocppBridgeEnabled = String(process.env.OCPP_BRIDGE_ENABLED || "false").toLowerCase() === "true";
const ocppBridge = ocppBridgeEnabled
  ? initOcppBridge({
      url: process.env.OCPP_SERVER_URL,
      prisma,
      io,
    })
  : {
      client: null,
      commands: {
        remoteStartTransaction: async () => {
          throw new Error("OCPP bridge disabled");
        },
        remoteStopTransaction: async () => {
          throw new Error("OCPP bridge disabled");
        },
        reset: async () => {
          throw new Error("OCPP bridge disabled");
        },
        getStatus: async () => {
          throw new Error("OCPP bridge disabled");
        },
      },
      disconnect: () => {},
      get connected() {
        return false;
      },
    };

 // Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Standard response helpers
app.use((req, res, next) => {
  res.success = (data = null, message = "OK") => {
    return res.json({ success: true, message, data });
  };
  res.error = (message = "Error", status = 400, details = null) => {
    return res.status(status).json({ success: false, message, details });
  };
  next();
});

// Admin auth guard (applies to all /api/admin routes)
const {
  authenticateToken,
  requireRole,
} = require("./src/middleware/auth");
app.use("/api/admin", authenticateToken, requireRole(["ADMIN"]));

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/auth", require("./src/routes/auth.js"));
app.use("/api/users", require("./src/routes/users.js"));
app.use("/api/admin/users", require("./src/routes/admin/users.js"));
app.use("/api/stations", require("./src/routes/stations.js"));
app.use("/api/admin/stations", require("./src/routes/admin/stations.js"));
app.use("/api/chargers", require("./src/routes/chargers.js"));
app.use("/api/admin/chargers", require("./src/routes/admin/chargers.js"));
app.use("/api/wallet", require("./src/routes/wallet.js"));
app.use("/api/admin/wallets", require("./src/routes/admin/wallets.js"));
app.use("/api/admin/vehicles", require("./src/routes/admin/vehicles.js"));
app.use("/api/admin/vehicle-catalog", require("./src/routes/admin/vehicleCatalog.js"));
app.use("/api/transactions", require("./src/routes/transactions.js"));
app.use("/api/admin/transactions", require("./src/routes/admin/transactions.js"));
app.use("/api/sessions", require("./src/routes/sessions.js"));
app.use("/api/admin/sessions", require("./src/routes/admin/sessions.js"));
app.use("/api/vouchers", require("./src/routes/vouchers.js"));
app.use("/api/admin/vouchers", require("./src/routes/admin/vouchers.js"));
app.use("/api/messages", require("./src/routes/messages.js"));
app.use("/api/admin/messages", require("./src/routes/admin/messages.js"));
app.use("/api/admin/dashboard", require("./src/routes/admin/dashboard.js"));
app.use("/api/vehicles", require("./src/routes/vehicles.js"));
app.use("/api/vehicle-catalog", require("./src/routes/vehicleCatalog.js"));

// Internal hooks (called by external OCPP server)
app.use("/api/internal", require("./src/routes/internal.js"));

// External OCPP server admin proxy
app.use("/api/admin/ocpp-server", require("./src/routes/admin/ocppServerProxy.js"));
app.use("/api/admin/ocpp-logs", require("./src/routes/admin/ocppLogs.js"));

// Uploads (admin)
app.use("/api/admin/uploads", require("./src/routes/admin/uploads.js"));

// Socket.IO setup
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Operator portal / admin realtime channel (used for alerts + session progress)
  socket.on("cpo:subscribe", () => {
    socket.join("cpo");
  });

  socket.on("cpo:unsubscribe", () => {
    socket.leave("cpo");
  });

  // Session-specific channel
  socket.on("session:subscribe", (sessionId) => {
    if (!sessionId) return;
    socket.join(`session:${sessionId}`);
  });

  socket.on("session:unsubscribe", (sessionId) => {
    if (!sessionId) return;
    socket.leave(`session:${sessionId}`);
  });

  socket.on("charger:subscribe", (chargerId) => {
    if (!chargerId) return;
    socket.join(`charger:${chargerId}`);
  });

  socket.on("charger:unsubscribe", (chargerId) => {
    if (!chargerId) return;
    socket.leave(`charger:${chargerId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Export io for use in routes
app.set("io", io);
app.set("ocpp", ocppBridge);

// ✅ start demo simulator (only if enabled)
if (String(process.env.DEMO_SIMULATOR || "true").toLowerCase() === "true") {
  startSimulator(io);
}

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

// OCPP bridge status (Phase 1B)
app.get("/api/admin/ocpp/status", (req, res) => {
  const ocpp = req.app.get("ocpp");
  res.json({ connected: !!ocpp?.connected, urlConfigured: !!process.env.OCPP_SERVER_URL });
});

// Error handling middleware (standardized)
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (String(err.message || "").startsWith("CORS blocked origin:")) {
    return res.error(err.message, 403);
  }

  return res.error(err.message || "Internal Server Error", 500);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

// Devtools: emit socket events without needing the OCPP server.
// Enabled only when DEVTOOLS_TOKEN is set.
app.post("/api/admin/devtools/emit-alert", (req, res) => {
  try {
    const expected = process.env.DEVTOOLS_TOKEN;
    if (!expected) return res.status(404).json({ error: "Devtools disabled" });
    const actual = req.headers["x-devtools-token"];
    if (!actual || String(actual) !== String(expected)) return res.status(401).json({ error: "Invalid devtools token" });

    const io = req.app.get("io");
    const payload = {
      title: req.body?.title || "Test alert",
      description: req.body?.description || "This is a devtools test alert.",
      severity: req.body?.severity || "info",
      ocppId: req.body?.ocppId,
      ts: new Date().toISOString(),
    };
    io.to("cpo").emit("cpo_alert", payload);
    return res.json({ ok: true, emitted: payload });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/devtools/emit-session-progress", (req, res) => {
  try {
    const expected = process.env.DEVTOOLS_TOKEN;
    if (!expected) return res.status(404).json({ error: "Devtools disabled" });
    const actual = req.headers["x-devtools-token"];
    if (!actual || String(actual) !== String(expected)) return res.status(401).json({ error: "Invalid devtools token" });

    const sessionId = req.body?.sessionId;
    if (!sessionId) return res.status(400).json({ error: "sessionId is required" });

    const io = req.app.get("io");
    const payload = {
      sessionId,
      energyDelivered: req.body?.energyDelivered != null ? Number(req.body.energyDelivered) : 1.23,
      totalCost: req.body?.totalCost != null ? Number(req.body.totalCost) : 12.34,
      powerKw: req.body?.powerKw != null ? Number(req.body.powerKw) : 7.2,
      ocppId: req.body?.ocppId,
      ocppTransactionId: req.body?.ocppTransactionId != null ? Number(req.body.ocppTransactionId) : undefined,
      ts: new Date().toISOString(),
    };
    io.to(`session:${sessionId}`).emit("session_progress", payload);
    io.to("cpo").emit("session_progress", payload);
    return res.json({ ok: true, emitted: payload });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
