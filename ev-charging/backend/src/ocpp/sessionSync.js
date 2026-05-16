/**
 * Charging session lifecycle sync helpers.
 *
 * This file implements minimal OCPP 1.6J session handling for:
 * - StartTransaction
 * - MeterValues
 * - StopTransaction
 *
 * Goal: make ChargingSession + wallet/transactions consistent end-to-end.
 */

/**
 * Extract the latest energy meter reading (Wh) from an OCPP MeterValues/StopTransaction payload.
 *
 * Accepts a few variants depending on how your bridge serializes values.
 */
function extractMeterWh(payload) {
  if (!payload) return null;

  // Common bridge variant: payload.meterValue = [{ sampledValue: [{ value, measurand, unit }] }]
  const meterValues = payload.meterValue || payload.meterValues;
  if (Array.isArray(meterValues) && meterValues.length) {
    // look from last to first
    for (let i = meterValues.length - 1; i >= 0; i--) {
      const mv = meterValues[i];
      const sampled = mv?.sampledValue;
      if (!Array.isArray(sampled)) continue;

      for (let j = sampled.length - 1; j >= 0; j--) {
        const sv = sampled[j];
        const meas = sv?.measurand || sv?.measurandType;
        const unit = sv?.unit;
        const value = sv?.value;

        // Prefer energy import register.
        if (meas && meas !== "Energy.Active.Import.Register") continue;

        const num = Number(value);
        if (!Number.isFinite(num)) continue;

        if (!unit || unit === "Wh") return Math.round(num);
        if (unit === "kWh") return Math.round(num * 1000);
      }
    }
  }

  // Some bridges put meterStart/meterStop directly
  if (payload.meterStop != null) {
    const n = Number(payload.meterStop);
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  if (payload.meterStart != null) {
    const n = Number(payload.meterStart);
    return Number.isFinite(n) ? Math.round(n) : null;
  }

  return null;
}

/**
 * @param {{ prisma: import('@prisma/client').PrismaClient, io: import('socket.io').Server, logger?: Console }} deps
 * @param {{ ocppId: string, userId?: string, ocppTransactionId?: number, meterStartWh?: number, startedAt?: string|Date }} evt
 */
async function handleStartTransaction({ prisma, io, logger = console }, evt) {
  const ocppId = evt?.ocppId;
  if (!ocppId) return;
  const charger = await prisma.charger.findUnique({ where: { ocppId } });
  if (!charger) return;

  // NOTE: In a real system, userId is determined from idTag -> user mapping.
  // For now we accept evt.userId, otherwise we attribute to the admin user.
  const userId = evt.userId;
  if (!userId) {
    logger.warn("[OCPP] StartTransaction missing userId; session will not be created");
    return;
  }

  const startTime = evt.startedAt ? new Date(evt.startedAt) : new Date();
  const ocppTransactionId = evt.ocppTransactionId != null ? Number(evt.ocppTransactionId) : null;

  // Create a new ACTIVE session (or return existing if same ocppTransactionId already exists)
  const existing = ocppTransactionId
    ? await prisma.chargingSession.findFirst({
        where: { chargerId: charger.id, ocppTransactionId, status: "ACTIVE" },
      })
    : null;
  if (existing) return existing;

  // ✅ Wallet pre-check (reserve logic)
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    logger.warn("[OCPP] No wallet found, cannot start session");
    return;
  }

  const MIN_RESERVE = 50; // PHP minimum required to start charging
  if (Number(wallet.balancePeso) < MIN_RESERVE) {
    logger.warn(`[OCPP] Insufficient balance to start session user=${userId}`);
    return;
  }

  const session = await prisma.chargingSession.create({
    data: {
      chargerId: charger.id,
      userId,
      startTime,
      status: "ACTIVE",
      ...(ocppTransactionId != null ? { ocppTransactionId } : {}),
      ...(evt.meterStartWh != null ? { meterStartWh: Math.round(Number(evt.meterStartWh)) } : {}),
    },
  });

  // ✅ OCPP LOG (StartTransaction)
  await prisma.ocppLog.create({
    data: {
      ocppId,
      sessionId: session.id,
      type: "StartTransaction",
      payload: evt,
    },
  });

  io.to(`charger:${charger.id}`).emit("session:started", { sessionId: session.id, chargerId: charger.id });
  return session;
}

/**
 * Update energy based on latest meter reading.
 *
 * @param {{ prisma: import('@prisma/client').PrismaClient }} deps
 * @param {{ ocppId: string, ocppTransactionId?: number, meterWh?: number, timestamp?: string|Date }} evt
 */
async function handleMeterValues({ prisma }, evt) {
  const ocppId = evt?.ocppId;
  if (!ocppId) return;
  const charger = await prisma.charger.findUnique({ where: { ocppId } });
  if (!charger) return;

  const ocppTransactionId = evt.ocppTransactionId != null ? Number(evt.ocppTransactionId) : null;
  if (!ocppTransactionId) return;

  const session = await prisma.chargingSession.findFirst({
    where: { chargerId: charger.id, ocppTransactionId, status: "ACTIVE" },
  });
  if (!session) return;

  const meterWh = evt.meterWh != null ? Math.round(Number(evt.meterWh)) : null;
  if (!Number.isFinite(meterWh)) return;

  const meterStartWh = session.meterStartWh;
  const deltaWh = meterStartWh != null ? Math.max(0, meterWh - meterStartWh) : null;
  const energyKwh = deltaWh != null ? deltaWh / 1000 : null;

  await prisma.chargingSession.update({
    where: { id: session.id },
    data: {
      meterStopWh: meterWh,
      ...(energyKwh != null ? { energyKwh } : {}),
    },
  });

  // ✅ OCPP LOG (MeterValues)
  await prisma.ocppLog.create({
    data: {
      ocppId,
      sessionId: session.id,
      type: "MeterValues",
      payload: evt,
    },
  });
}

/**
 * Stop a session and create wallet debit + CHARGE transaction.
 *
 * Idempotent: if a CHARGE transaction already exists for this session, we do not charge again.
 *
 * @param {{ prisma: import('@prisma/client').PrismaClient, logger?: Console }} deps
 * @param {{ ocppId: string, ocppTransactionId?: number, stoppedAt?: string|Date, meterStopWh?: number }} evt
 */
async function handleStopTransaction({ prisma, logger = console }, evt) {
  const ocppId = evt?.ocppId;
  if (!ocppId) return;
  const charger = await prisma.charger.findUnique({ where: { ocppId } });
  if (!charger) return;

  const ocppTransactionId = evt.ocppTransactionId != null ? Number(evt.ocppTransactionId) : null;
  if (!ocppTransactionId) return;

  const session = await prisma.chargingSession.findFirst({
    where: {
      chargerId: charger.id,
      ocppTransactionId,
      status: "ACTIVE",
    },
  });
  if (!session) return;

  const stoppedAt = evt.stoppedAt ? new Date(evt.stoppedAt) : new Date();
  const meterStopWh = evt.meterStopWh != null ? Math.round(Number(evt.meterStopWh)) : null;

  const meterStartWh = session.meterStartWh;
  const effectiveStopWh = Number.isFinite(meterStopWh) ? meterStopWh : session.meterStopWh;
  const deltaWh =
    meterStartWh != null && effectiveStopWh != null ? Math.max(0, effectiveStopWh - meterStartWh) : null;
  const energyKwh = deltaWh != null ? deltaWh / 1000 : Number(session.energyKwh || 0);

  const pricePerKwh = Number(charger.pricePerKwh || 0);
  const costPeso = Number((energyKwh * pricePerKwh).toFixed(2));

  const result = await prisma.$transaction(async (tx) => {
    // Re-check session row inside txn
    const s = await tx.chargingSession.findUnique({ where: { id: session.id } });
    if (!s || s.status !== "ACTIVE") return { skipped: true };

    // Idempotency guard: if already charged, don't do it again.
    const existingCharge = await tx.transaction.findFirst({
      where: { type: "CHARGE", referenceId: s.id },
    });
    if (existingCharge) {
      await tx.chargingSession.update({
        where: { id: s.id },
        data: {
          status: "COMPLETED",
          endTime: stoppedAt,
          ...(effectiveStopWh != null ? { meterStopWh: effectiveStopWh } : {}),
          energyKwh,
          costPeso,
        },
      });
      return { skipped: true, transactionId: existingCharge.id };
    }

    const wallet = await tx.wallet.findUnique({ where: { userId: s.userId } });
    if (!wallet) {
      const err = new Error("Wallet not found for user");
      err.httpStatus = 404;
      throw err;
    }

    // Debit wallet (allow negative for now? We'll block negative by default)
    const current = Number(wallet.balancePeso);
    if (current < costPeso) {
      logger.warn(`[OCPP] insufficient wallet balance for user=${s.userId}. balance=${current} cost=${costPeso}`);
      // Mark completed but do not debit; this is a business rule you might change.
      await tx.chargingSession.update({
        where: { id: s.id },
        data: {
          status: "COMPLETED",
          endTime: stoppedAt,
          ...(effectiveStopWh != null ? { meterStopWh: effectiveStopWh } : {}),
          energyKwh,
          costPeso,
        },
      });
      return { skipped: true, insufficientFunds: true };
    }

    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balancePeso: { decrement: costPeso } },
    });

    const txn = await tx.transaction.create({
      data: {
        userId: s.userId,
        type: "CHARGE",
        amountPeso: costPeso,
        description: `Charge session ${s.id} (${energyKwh.toFixed(2)} kWh @ ₱${pricePerKwh}/kWh)`,
        referenceId: s.id,
      },
    });

    await tx.message.create({
      data: {
        userId: s.userId,
        title: "Charging session completed",
        body: `You were charged ₱${costPeso} for ${energyKwh.toFixed(2)} kWh.`,
        type: "TRANSACTION",
        referenceId: txn.id,
      },
    });

    await tx.chargingSession.update({
      where: { id: s.id },
      data: {
        status: "COMPLETED",
        endTime: stoppedAt,
        ...(effectiveStopWh != null ? { meterStopWh: effectiveStopWh } : {}),
        energyKwh,
        costPeso,
      },
    });

    return { skipped: false, transactionId: txn.id, walletBalance: updatedWallet.balancePeso };
  });

  // ✅ OCPP LOG (StopTransaction)
  await prisma.ocppLog.create({
    data: {
      ocppId,
      sessionId: session.id,
      type: "StopTransaction",
      payload: evt,
    },
  });

  return result;
}

module.exports = {
  extractMeterWh,
  handleStartTransaction,
  handleMeterValues,
  handleStopTransaction,
};
