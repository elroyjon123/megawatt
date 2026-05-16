const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

/**
 * Require one of the allowed roles.
 *
 * @param {string[]} roles
 */
const requireRole = (roles = []) => (req, res, next) => {
  const role = req.user?.role;
  if (!role || !roles.includes(role)) {
    return res.status(403).json({ error: "Insufficient role" });
  }
  next();
};

/**
 * Internal service-to-service auth using a static token.
 *
 * Required header:
 * - X-Internal-Token: <INTERNAL_TOKEN>
 */
const requireInternalToken = (req, res, next) => {
  const expected = process.env.INTERNAL_TOKEN;
  const allowList = process.env.INTERNAL_TOKENS;
  if (!expected && !allowList) {
    return res.status(500).json({ error: "INTERNAL_TOKEN is not configured" });
  }

  const actual = req.headers["x-internal-token"];
  const ok = (() => {
    if (!actual) return false;
    if (expected && String(actual) === String(expected)) return true;
    if (allowList) {
      const tokens = String(allowList)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return tokens.includes(String(actual));
    }
    return false;
  })();

  if (!ok) {
    return res.status(401).json({ error: "Invalid internal token" });
  }
  next();
};

/**
 * Maintenance/break-glass admin auth for dev/ops.
 *
 * If header `X-Admin-Maintenance-Token` matches env `ADMIN_MAINTENANCE_TOKEN`,
 * we treat the request as an ADMIN user without needing DB access.
 */
const authenticateTokenOrMaintenance = (req, res, next) => {
  const expected = process.env.ADMIN_MAINTENANCE_TOKEN;
  const actual = req.headers["x-admin-maintenance-token"];
  if (expected && actual && String(actual) === String(expected)) {
    req.user = { id: "maintenance", email: "maintenance@local", role: "ADMIN" };
    return next();
  }
  return authenticateToken(req, res, next);
};

module.exports = {
  authenticateToken,
  authenticateTokenOrMaintenance,
  requireAdmin,
  requireRole,
  requireInternalToken,
};
