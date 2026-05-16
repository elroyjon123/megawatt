const express = require("express");
const asyncHandler = require("../../middleware/asyncHandler");
const prisma = require("../../lib/prisma");

const router = express.Router();

/**
 * GET /api/admin/users
 *
 * Query params (optional):
 * - q: string search (name/email)
 * - role: USER|ADMIN
 * - includeDeactivated: true|false (default false)
 * - page, pageSize: if provided, returns paginated response
 */
router.get("/", asyncHandler(async (req, res) => {
    const { q, role, includeDeactivated, page, pageSize } = req.query;

    const where = {
      ...(role ? { role } : {}),
      ...(includeDeactivated === "true"
        ? {}
        : {
            NOT: {
              email: { startsWith: "deleted_" },
            },
          }),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const select = {
      id: true,
      email: true,
      phone: true,
      name: true,
      role: true,
      createdAt: true,
    };

    // Backward-compatible: if no paging params, return an array (as the admin UI expects today)
    if (!page && !pageSize) {
      const users = await prisma.user.findMany({
        where,
        select,
        orderBy: { createdAt: "desc" },
      });
      return res.success(users);
    }

    const pageNum = Math.max(parseInt(page || "1", 10), 1);
    const size = Math.min(Math.max(parseInt(pageSize || "20", 10), 1), 100);
    const skip = (pageNum - 1) * size;

    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select,
        orderBy: { createdAt: "desc" },
        skip,
        take: size,
      }),
    ]);

    return res.success({ items, page: pageNum, pageSize: size, total });
}));

// GET /api/admin/users/:id - detail
router.get("/:id", asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        wallet: {
          include: {
            topUps: {
              include: {
                createdByUser: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        },
        vehicles: true,
        transactions: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!user) return res.error("User not found", 404);

    // Never return password hashes
    // eslint-disable-next-line no-unused-vars
    const { passwordHash, ...safe } = user;
    return res.success(safe);
}));

// PUT /api/admin/users/:id - update
router.put("/:id", asyncHandler(async (req, res) => {
    const { name, phone, role } = req.body || {};

    if (role && !["USER", "ADMIN"].includes(role)) {
      return res.error("Invalid role", 400);
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(name != null ? { name } : {}),
        ...(phone != null ? { phone } : {}),
        ...(role != null ? { role } : {}),
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return res.success(updated, "User updated");
}));

// DELETE /api/admin/users/:id - deactivate (soft)
router.delete("/:id", asyncHandler(async (req, res) => {
    const id = req.params.id;
    const deactivatedEmail = `deleted_${Date.now()}_${id}@deleted.local`;

    const updated = await prisma.user.update({
      where: { id },
      data: { email: deactivatedEmail },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return res.success({ user: updated }, "User deactivated");
}));

module.exports = router;
