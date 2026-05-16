const express = require("express");
const { authenticateToken, requireRole } = require("../../middleware/auth");
const prisma = require("../../lib/prisma");

const router = express.Router();

const ALL_STATUSES = ["AVAILABLE", "OCCUPIED", "FAULTED", "OFFLINE", "RESERVED"];

/**
 * GET /api/admin/dashboard/summary
 * Returns KPI cards + recent sessions for admin dashboard.
 */
router.get("/summary", authenticateToken, requireRole(["ADMIN", "OPERATOR"]), async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const startOf7Days = new Date(now);
    startOf7Days.setDate(startOf7Days.getDate() - 6);
    startOf7Days.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalChargers,
      activeChargers,
      activeSessions,
      statusCounts,
      revenueTodayAgg,
      recentSessions,
    ] = await Promise.all([
      prisma.user.count({
        where: {
          NOT: { email: { startsWith: "deleted_" } },
        },
      }),
      prisma.charger.count(),
      prisma.charger.count({ where: { NOT: { status: "OFFLINE" } } }),
      prisma.chargingSession.count({ where: { status: "ACTIVE" } }),
      prisma.charger.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      prisma.transaction.aggregate({
        _sum: { amountPeso: true },
        where: {
          type: "CHARGE",
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
      }),
      prisma.chargingSession.findMany({
        take: 10,
        orderBy: { startTime: "desc" },
        include: { charger: { include: { station: true } } },
      }),
    ]);

    // Revenue last 7 days (CHARGE transactions) - grouped by date.
    // Prisma groupBy can't date-trunc easily; use raw SQL.
    const revenueRows = await prisma.$queryRaw`
      SELECT DATE("createdAt") as day, COALESCE(SUM("amountPeso"), 0) as revenue
      FROM "Transaction"
      WHERE "type" = 'CHARGE' AND "createdAt" >= ${startOf7Days} AND "createdAt" <= ${endOfDay}
      GROUP BY DATE("createdAt")
      ORDER BY day ASC;
    `;

    const statusOverview = statusCounts.reduce((acc, row) => {
      acc[row.status] = row._count.status;
      return acc;
    }, {});

    // Ensure stable keys for UI and charts.
    for (const s of ALL_STATUSES) {
      if (statusOverview[s] == null) statusOverview[s] = 0;
    }

    // Prisma Decimal may serialize as string; normalize to a number for dashboard display.
    const revenueTodayRaw = revenueTodayAgg?._sum?.amountPeso ?? 0;
    const revenueToday = Number(revenueTodayRaw || 0);

    // Fill missing days so charts don't have gaps.
    const revenueByDay = new Map(
      (revenueRows || []).map((r) => {
        const key = new Date(r.day).toISOString().slice(0, 10);
        return [key, Number(r.revenue || 0)];
      })
    );

    const revenueLast7Days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOf7Days);
      d.setDate(startOf7Days.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      revenueLast7Days.push({ date: key, revenue: revenueByDay.get(key) ?? 0 });
    }

    res.json({
      kpis: {
        totalUsers,
        totalChargers,
        activeChargers,
        activeSessions,
        revenueToday,
      },
      statusOverview,
      revenueLast7Days,
      recentSessions,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
