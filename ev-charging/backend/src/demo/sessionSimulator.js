const prisma = require("../lib/prisma");

/**
 * DEMO SESSION SIMULATOR
 * - creates fake charging sessions
 * - updates energy + cost
 * - emits events via existing socket system
 */

async function startSimulator(io) {
  console.log("⚡ Demo session simulator started");

  setInterval(async () => {
    try {
      // pick random charger
      const chargers = await prisma.charger.findMany();
      if (!chargers.length) return;

      const charger = chargers[Math.floor(Math.random() * chargers.length)];

      // 50% chance start session if idle
      if (charger.status === "AVAILABLE" && Math.random() > 0.5) {
        const session = await prisma.chargingSession.create({
          data: {
            chargerId: charger.id,
            userId: (await prisma.user.findFirst())?.id,
            startTime: new Date(),
            status: "ACTIVE",
            energyKwh: 0,
            costPeso: 0,
          },
        });

        await prisma.charger.update({
          where: { id: charger.id },
          data: { status: "OCCUPIED" },
        });

        io.emit("chargers:status", {
          ocppId: charger.ocppId,
          status: "OCCUPIED",
        });

        console.log("▶️ Started demo session", session.id);
      }

      // update active sessions
      const sessions = await prisma.chargingSession.findMany({
        where: { status: "ACTIVE" },
      });

      for (const s of sessions) {
        const currentEnergy = parseFloat(s.energyKwh || 0);
        const energy = currentEnergy + Math.random() * 0.5;
        const cost = energy * 20;

        await prisma.chargingSession.update({
          where: { id: s.id },
          data: {
            energyKwh: energy,
            costPeso: cost,
          },
        });

        io.emit("session_progress", {
          sessionId: s.id,
          chargerId: s.chargerId,
          energyDelivered: energy,
          powerKw: 7,
          totalCost: cost,
        });

        // randomly stop session
        if (Math.random() > 0.8) {
          await prisma.chargingSession.update({
            where: { id: s.id },
            data: { status: "COMPLETED", endTime: new Date() },
          });

          await prisma.charger.update({
            where: { id: s.chargerId },
            data: { status: "AVAILABLE" },
          });

          // safely resolve ocppId
          let ocppId = null;
          try {
            const ch = await prisma.charger.findUnique({ where: { id: s.chargerId } });
            ocppId = ch?.ocppId;
          } catch {}

          if (ocppId) {
            io.emit("charger:status", {
              ocppId,
              status: "AVAILABLE",
            });
          }

          console.log("⏹️ Stopped demo session", s.id);
        }
      }
    } catch (e) {
      console.error("Simulator error:", e.message);
    }
  }, 3000);
}

/**
 * ✅ Start simulator for a specific session
 */
function start(sessionId, chargerId, ocppId, io) {
  console.log("⚡ Start live simulator for session", sessionId);

  const interval = setInterval(async () => {
    try {
      const s = await prisma.chargingSession.findUnique({ where: { id: sessionId } });
      if (!s || s.status !== "ACTIVE") {
        clearInterval(interval);
        return;
      }

      const currentEnergy = parseFloat(s.energyKwh || 0);
      const energy = currentEnergy + Math.random() * 0.3;
      const cost = energy * 20;

      // ✅ check wallet before continuing
      const wallet = await prisma.wallet.findUnique({
        where: { userId: s.userId },
      });

      if (!wallet || wallet.balance <= cost) {
        // auto stop session
        await prisma.chargingSession.update({
          where: { id: sessionId },
          data: {
            status: "COMPLETED",
            endTime: new Date(),
          },
        });

        await prisma.charger.update({
          where: { id: chargerId },
          data: { status: "AVAILABLE" },
        });

        if (io) {
          io.emit("session_ended", { sessionId });
          io.emit("charger:status", {
            ocppId,
            status: "AVAILABLE",
          });
        }

        clearInterval(interval);
        return;
      }

      await prisma.chargingSession.update({
        where: { id: sessionId },
        data: {
          energyKwh: energy,
          costPeso: cost,
        },
      });

      if (io) {
        io.emit("session_progress", {
          sessionId,
          chargerId,
          ocppId,
          energyDelivered: energy,
          powerKw: 7,
          totalCost: cost,
        });
      }
    } catch (e) {
      console.error("Live simulator error:", e.message);
    }
  }, 2000);
}

module.exports = { startSimulator, start };
