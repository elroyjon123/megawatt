const STATUS_MAP = {
  Available: "AVAILABLE",
  Occupied: "OCCUPIED",
  Faulted: "FAULTED",
  Reserved: "RESERVED",
  Unavailable: "OFFLINE",
  Offline: "OFFLINE",
  // if bridge already sends our enum
  AVAILABLE: "AVAILABLE",
  OCCUPIED: "OCCUPIED",
  FAULTED: "FAULTED",
  OFFLINE: "OFFLINE",
  RESERVED: "RESERVED",
};

function normalizeStatus(status) {
  if (!status) return null;
  return STATUS_MAP[status] || null;
}

/**
 * @param {{ prisma: import('@prisma/client').PrismaClient, io: import('socket.io').Server }} deps
 * @param {{ ocppId: string, status?: string, timestamp?: string|Date }} evt
 */
async function syncChargerStatus({ prisma, io }, { ocppId, status, timestamp, errorCode, info, vendorErrorCode }) {
  if (!ocppId) return;
  const normalized = normalizeStatus(status);

  const charger = await prisma.charger.findUnique({ where: { ocppId } });
  if (!charger) return;

  const update = {};
  if (normalized) update.status = normalized;
  update.lastHeartbeat = timestamp ? new Date(timestamp) : new Date();

  // ✅ store diagnostics
  if (errorCode) update.errorCode = errorCode;
  if (info) update.errorInfo = info;
  if (vendorErrorCode) update.vendorErrorCode = vendorErrorCode;

  const updated = await prisma.charger.update({
    where: { id: charger.id },
    data: update,
  });

  // ✅ OCPP LOG
  await prisma.ocppLog.create({
    data: {
      ocppId,
      type: "StatusNotification",
      payload: {
        status,
        normalized,
        errorCode,
        info,
        vendorErrorCode,
        timestamp,
      },
    },
  });

  const payload = {
    chargerId: updated.id,
    ocppId: updated.ocppId,
    status: updated.status,
    lastHeartbeat: updated.lastHeartbeat,
    errorCode: updated.errorCode,
    errorInfo: updated.errorInfo,
  };

  // ✅ Emit status updates
  io.emit("chargers:status", payload);
  io.to(`charger:${updated.id}`).emit("charger:status", payload);

  // ✅ ALERT SYSTEM (fault / offline)
  if (["FAULTED", "OFFLINE"].includes(updated.status)) {
    const alert = {
      id: `${updated.id}-${Date.now()}`,
      chargerId: updated.id,
      ocppId: updated.ocppId,
      status: updated.status,
      message:
        updated.status === "FAULTED"
          ? `Fault: ${updated.errorCode || "Unknown"}`
          : "Charger went offline",
      details: updated.errorInfo,
      timestamp: new Date(),
    };

    io.emit("alert:new", alert);
  }
}

/**
 * @param {{ prisma: import('@prisma/client').PrismaClient, io: import('socket.io').Server }} deps
 * @param {{ ocppId: string, timestamp?: string|Date }} evt
 */
async function syncHeartbeat({ prisma, io }, { ocppId, timestamp }) {
  if (!ocppId) return;
  const charger = await prisma.charger.findUnique({ where: { ocppId } });
  if (!charger) return;

  const updated = await prisma.charger.update({
    where: { id: charger.id },
    data: { lastHeartbeat: timestamp ? new Date(timestamp) : new Date() },
  });

  // ✅ OCPP LOG
  await prisma.ocppLog.create({
    data: {
      ocppId,
      type: "Heartbeat",
      payload: {
        timestamp,
      },
    },
  });

  const payload = {
    chargerId: updated.id,
    ocppId: updated.ocppId,
    lastHeartbeat: updated.lastHeartbeat,
  };

  io.emit("chargers:heartbeat", payload);
  io.to(`charger:${updated.id}`).emit("charger:heartbeat", payload);

  // ✅ heartbeat timeout alert (optional simple detection)
  const now = Date.now();
  const last = new Date(updated.lastHeartbeat).getTime();

  if (now - last > 5 * 60 * 1000) {
    io.emit("alert:new", {
      id: `${updated.id}-timeout`,
      chargerId: updated.id,
      ocppId: updated.ocppId,
      status: "OFFLINE",
      message: "No heartbeat (possible offline)",
      timestamp: new Date(),
    });
  }
}

module.exports = { syncChargerStatus, syncHeartbeat };
