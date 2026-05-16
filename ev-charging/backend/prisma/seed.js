const bcrypt = require("bcrypt");
const crypto = require("crypto");

require("dotenv").config();

const prisma = require("../src/lib/prisma");

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 30);
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

async function ensureWallet(userId, balancePeso) {
  const existing = await prisma.wallet.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.wallet.create({ data: { userId, balancePeso } });
}

async function ensureUser({ email, name, phone, role, passwordHash, balancePeso = 0 }) {
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name,
      phone,
      passwordHash,
      role,
    },
  });

  await ensureWallet(user.id, balancePeso);
  return user;
}

async function ensureStation({ name, address, city, latitude, longitude, openHours, isActive = true }) {
  const station = await prisma.station.findFirst({
    where: {
      name,
      city,
    },
  });
  if (station) return station;
  return prisma.station.create({
    data: {
      name,
      address,
      city,
      latitude,
      longitude,
      openHours,
      isActive,
      photos: [],
    },
  });
}

async function ensureCharger({ stationId, ocppId, name, connectorType, powerOutputKw, pricePerKwh, status }) {
  const existing = await prisma.charger.findUnique({ where: { ocppId } });
  if (existing) return existing;
  return prisma.charger.create({
    data: {
      stationId,
      ocppId,
      name,
      connectorType,
      powerOutputKw,
      pricePerKwh,
      status,
      lastHeartbeat: new Date(Date.now() - randInt(10, 300) * 1000),
    },
  });
}

async function ensureVoucher({ code, discountPeso, discountPercent, maxUses, expiresAt, isActive = true }) {
  const existing = await prisma.voucher.findUnique({ where: { code } });
  if (existing) return existing;
  return prisma.voucher.create({
    data: {
      code,
      discountPeso,
      discountPercent,
      maxUses,
      expiresAt,
      isActive,
    },
  });
}

async function ensureSeedBatch({ batchId }) {
  const existing = await prisma.message.findFirst({ where: { batchId } });
  return { exists: Boolean(existing) };
}

function parseSeedOptions(argv) {
  const opts = {
    wipe: false,
    scale: process.env.SEED_SCALE || "medium",
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--wipe") opts.wipe = true;
    else if (a === "--scale") {
      opts.scale = String(argv[i + 1] || "");
      i++;
    } else if (a === "--help" || a === "-h") {
      opts.help = true;
    }
  }

  const allowed = new Set(["small", "medium", "large"]);
  if (!allowed.has(opts.scale)) {
    throw new Error(`Invalid --scale '${opts.scale}'. Use one of: small|medium|large`);
  }
  return opts;
}

function scaleConfig(scale) {
  switch (scale) {
    case "small":
      return {
        targetUsers: 10,
        targetStations: 3,
        chargersPerStation: 2,
        bgcChargers: 2,
        vehiclesPerUserMax: 1,
        sessionsPerCharger: 5,
        voucherRedemptionsPerVoucher: 5,
        messageBatchRecipients: 10,
        messageBatches: 1,
      };
    case "large":
      return {
        targetUsers: 200,
        targetStations: 10,
        chargersPerStation: 5,
        bgcChargers: 6,
        vehiclesPerUserMax: 2,
        sessionsPerCharger: 50,
        voucherRedemptionsPerVoucher: 50,
        messageBatchRecipients: 80,
        messageBatches: 4,
      };
    case "medium":
    default:
      return {
        targetUsers: 40,
        targetStations: 5,
        chargersPerStation: 3,
        bgcChargers: 4,
        vehiclesPerUserMax: 1,
        sessionsPerCharger: 12,
        voucherRedemptionsPerVoucher: 15,
        messageBatchRecipients: 25,
        messageBatches: 2,
      };
  }
}

async function wipeDatabase() {
  // Order matters because of FK constraints.
  console.log("\n⚠️  WIPING DATABASE (dev only) …");

  await prisma.message.deleteMany();
  await prisma.voucherRedemption.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.chargingSession.deleteMany();
  await prisma.topUp.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.charger.deleteMany();
  await prisma.station.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.voucher.deleteMany();
  await prisma.user.deleteMany();

  console.log("✓ Database wiped\n");
}

async function main() {
  const startedAt = Date.now();

  const opts = parseSeedOptions(process.argv);
  if (opts.help) {
    console.log("Megawatt seed script");
    console.log("\nUsage:");
    console.log("  node prisma/seed.js [--scale small|medium|large] [--wipe]");
    console.log("\nEnvironment:");
    console.log("  SEED_SCALE=small|medium|large (default: medium)");
    return;
  }

  const cfg = scaleConfig(opts.scale);
  console.log(`\nSeed options: scale=${opts.scale}, wipe=${opts.wipe ? "yes" : "no"}`);

  if (opts.wipe) {
    await wipeDatabase();
  }

  // Passwords (dev only)
  const adminHash = await bcrypt.hash("admin123", 10);
  const operatorHash = await bcrypt.hash("operator123", 10);
  const userHash = await bcrypt.hash("user123", 10);

  // Core users (idempotent by email)
  const admin = await ensureUser({
    email: "admin@megawatt.com",
    name: "Admin User",
    phone: "+63-900-000-0000",
    role: "ADMIN",
    passwordHash: adminHash,
    balancePeso: 10000,
  });
  const operator = await ensureUser({
    email: "operator@megawatt.com",
    name: "Operator User",
    phone: "+63-900-111-1111",
    role: "OPERATOR",
    passwordHash: operatorHash,
    balancePeso: 0,
  });

  console.log("✓ Core users ensured:");
  console.log(`  Admin: ${admin.email} / admin123`);
  console.log(`  Operator: ${operator.email} / operator123`);

  // Stations
  const stationsToEnsure = [
    {
      name: "Megawatt BGC Hub",
      address: "BGC, Taguig City",
      city: "Taguig",
      latitude: 14.5635,
      longitude: 121.0338,
      openHours: "24/7",
    },
    {
      name: "Megawatt Makati Central",
      address: "Ayala Ave, Makati City",
      city: "Makati",
      latitude: 14.5547,
      longitude: 121.0244,
      openHours: "6AM - 11PM",
    },
    {
      name: "Megawatt Ortigas Center",
      address: "ADB Ave, Pasig City",
      city: "Pasig",
      latitude: 14.5869,
      longitude: 121.0634,
      openHours: "24/7",
    },
    {
      name: "Megawatt QC Tech Park",
      address: "Commonwealth Ave, Quezon City",
      city: "Quezon City",
      latitude: 14.6760,
      longitude: 121.0437,
      openHours: "7AM - 10PM",
    },
    {
      name: "Megawatt Cebu IT Park",
      address: "Cebu IT Park, Cebu City",
      city: "Cebu City",
      latitude: 10.3289,
      longitude: 123.9070,
      openHours: "24/7",
    },
    {
      name: "Megawatt Davao Downtown",
      address: "J.P. Laurel Ave, Davao City",
      city: "Davao City",
      latitude: 7.0731,
      longitude: 125.6128,
      openHours: "24/7",
    },
    {
      name: "Megawatt Iloilo City Center",
      address: "Megaworld Blvd, Iloilo City",
      city: "Iloilo City",
      latitude: 10.7202,
      longitude: 122.5621,
      openHours: "7AM - 11PM",
    },
    {
      name: "Megawatt Baguio Session Road",
      address: "Session Rd, Baguio City",
      city: "Baguio City",
      latitude: 16.4123,
      longitude: 120.5960,
      openHours: "8AM - 10PM",
    },
    {
      name: "Megawatt Clark Freeport",
      address: "Clark Freeport Zone, Pampanga",
      city: "Pampanga",
      latitude: 15.1823,
      longitude: 120.5430,
      openHours: "24/7",
    },
    {
      name: "Megawatt Bohol Tagbilaran",
      address: "Tagbilaran City, Bohol",
      city: "Bohol",
      latitude: 9.6472,
      longitude: 123.8557,
      openHours: "7AM - 10PM",
    },
  ];

  const stations = [];
  for (const s of stationsToEnsure.slice(0, cfg.targetStations)) {
    const st = await ensureStation(s);
    stations.push(st);
  }
  console.log(`✓ Stations ensured (${stations.length})`);

  // Chargers (idempotent by ocppId)
  const connectorTypes = ["Type 2", "CCS", "CHAdeMO"];
  const powerOptionsKw = [7.4, 11, 22, 50, 60, 120];

  const chargers = [];
  for (const st of stations) {
    const slug = slugify(st.name);
    const perStation = st.name === "Megawatt BGC Hub" ? cfg.bgcChargers : cfg.chargersPerStation;

    for (let i = 1; i <= perStation; i++) {
      // Keep existing ocppIds for the initial BGC chargers.
      const ocppId =
        st.name === "Megawatt BGC Hub" && i <= 2
          ? `charger-00${i}`
          : `charger-${slug}-${String(i).padStart(2, "0")}`;

      const charger = await ensureCharger({
        stationId: st.id,
        ocppId,
        name: `Charger ${st.city.split(" ")[0]}-${i}`,
        connectorType: pick(connectorTypes),
        powerOutputKw: pick(powerOptionsKw),
        pricePerKwh: randInt(11, 18) + 0.5,
        status: pick(["AVAILABLE", "AVAILABLE", "OCCUPIED", "OFFLINE", "FAULTED"]),
      });
      chargers.push(charger);
    }
  }
  console.log(`✓ Chargers ensured (${chargers.length})`);

  // Mock end-users
  const targetUsers = cfg.targetUsers;
  const existingUserCount = await prisma.user.count({ where: { role: "USER" } });
  const usersToCreate = Math.max(0, targetUsers - existingUserCount);

  const firstNames = ["Alex", "Jamie", "Taylor", "Jordan", "Casey", "Avery", "Sam", "Morgan", "Riley", "Kai"];
  const lastNames = ["Santos", "Reyes", "Cruz", "Garcia", "Dela Cruz", "Bautista", "Flores", "Mendoza", "Aquino", "Navarro"];

  const users = [];
  for (let i = 1; i <= usersToCreate; i++) {
    const idx = String(i).padStart(2, "0");
    const name = `${pick(firstNames)} ${pick(lastNames)}`;
    const email = `user${idx}@megawatt.com`;
    const phone = `+63-9${randInt(10, 99)}-${randInt(100, 999)}-${randInt(1000, 9999)}`;
    const u = await ensureUser({
      email,
      name,
      phone,
      role: "USER",
      passwordHash: userHash,
      balancePeso: randInt(0, 8000),
    });
    users.push(u);
  }

  // Load all users for relations (including already-existing)
  const allUsers = await prisma.user.findMany({ where: { role: "USER" }, include: { wallet: true } });
  console.log(`✓ Users ensured (added ${usersToCreate}, total USER=${allUsers.length})`);

  // Vehicles (idempotent-ish): ensure up to cfg.vehiclesPerUserMax per user.
  const makes = ["Tesla", "Nissan", "Hyundai", "Kia", "BYD", "MG", "BMW", "Mercedes"];
  const models = ["Model 3", "Model Y", "Leaf", "Ioniq 5", "EV6", "Atto 3", "ZS EV", "iX1"];
  const connectorMap = {
    Tesla: "Type 2",
    Nissan: "CHAdeMO",
    Hyundai: "CCS",
    Kia: "CCS",
    BYD: "Type 2",
    MG: "Type 2",
    BMW: "CCS",
    Mercedes: "CCS",
  };

  let createdVehicles = 0;
  for (const u of allUsers) {
    const count = await prisma.vehicle.count({ where: { userId: u.id } });
    const target = Math.min(cfg.vehiclesPerUserMax, Math.max(1, count));
    const toAdd = Math.max(0, target - count);

    for (let i = 0; i < toAdd; i++) {
      const make = pick(makes);
      const model = pick(models);
      await prisma.vehicle.create({
        data: {
          userId: u.id,
          make,
          model,
          year: randInt(2019, 2026),
          plateNumber: `EV-${randInt(1000, 9999)}`,
          connectorType: connectorMap[make] || pick(connectorTypes),
        },
      });
      createdVehicles++;
    }
  }
  console.log(`✓ Vehicles ensured (created ${createdVehicles})`);

  // Vouchers (idempotent by code)
  const vouchersToEnsure = [
    {
      code: "WELCOME100",
      discountPeso: 100,
      maxUses: 100,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    {
      code: "MEGA50",
      discountPeso: 50,
      maxUses: 500,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
    {
      code: "OFFPEAK10",
      discountPercent: 10,
      maxUses: 1000,
      expiresAt: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
    },
  ];

  const vouchers = [];
  for (const v of vouchersToEnsure) {
    const voucher = await ensureVoucher(v);
    vouchers.push(voucher);
  }
  console.log(`✓ Vouchers ensured (${vouchers.length})`);

  // Sessions (append-ish: ensure at least N sessions per charger)
  const targetSessionsPerCharger = cfg.sessionsPerCharger;
  let createdSessions = 0;
  let createdTransactions = 0;
  let createdTopUps = 0;

  // Simple OCPP txn counter
  const existingMaxOcpp = await prisma.chargingSession.aggregate({
    _max: { ocppTransactionId: true },
  });
  let ocppCounter = Number(existingMaxOcpp?._max?.ocppTransactionId || 1000);

  for (const charger of chargers) {
    const sessionCount = await prisma.chargingSession.count({ where: { chargerId: charger.id } });
    const toCreate = Math.max(0, targetSessionsPerCharger - sessionCount);
    for (let i = 0; i < toCreate; i++) {
      const user = pick(allUsers);
      const start = new Date(Date.now() - randInt(1, 30) * 24 * 60 * 60 * 1000 - randInt(0, 6) * 60 * 60 * 1000);
      const durationMin = randInt(10, 120);
      const end = new Date(start.getTime() + durationMin * 60 * 1000);
      const energy = Number((randInt(5, 60) + Math.random()).toFixed(2));
      const cost = Number((energy * Number(charger.pricePerKwh)).toFixed(2));

      ocppCounter++;
      const status = pick(["COMPLETED", "COMPLETED", "COMPLETED", "CANCELLED"]);
      const finalEnd = status === "COMPLETED" ? end : null;

      const session = await prisma.chargingSession.create({
        data: {
          chargerId: charger.id,
          userId: user.id,
          startTime: start,
          endTime: finalEnd,
          energyKwh: status === "COMPLETED" ? energy : 0,
          costPeso: status === "COMPLETED" ? cost : 0,
          status,
          ocppTransactionId: ocppCounter,
          meterStartWh: randInt(10_000, 100_000),
          meterStopWh: randInt(100_001, 300_000),
        },
      });
      createdSessions++;

      // Transactions: charge for completed session
      if (status === "COMPLETED") {
        const ref = `seed-charge-${session.id}`;
        const existingChargeTxn = await prisma.transaction.findFirst({ where: { referenceId: ref } });
        if (!existingChargeTxn) {
          await prisma.transaction.create({
            data: {
              userId: user.id,
              type: "CHARGE",
              amountPeso: cost,
              description: `Charging session at ${charger.name} (${energy} kWh)` ,
              referenceId: ref,
              createdAt: finalEnd || new Date(),
            },
          });
          createdTransactions++;
        }
      }
    }
  }

  // Top-ups + TOP_UP transactions for users with low wallet balances
  const lowBalanceUsers = await prisma.user.findMany({
    where: { role: "USER" },
    include: { wallet: true },
  });

  for (const u of lowBalanceUsers) {
    const wallet = u.wallet;
    if (!wallet) continue;

    // create at most 1 topup per seed run per user if balance is low
    if (Number(wallet.balancePeso) < 200) {
      const ref = `seed-topup-${u.email}`;
      const existingTopupTxn = await prisma.transaction.findFirst({ where: { referenceId: ref } });
      if (!existingTopupTxn) {
        const amt = randInt(300, 2000);
        await prisma.topUp.create({
          data: {
            walletId: wallet.id,
            amountPeso: amt,
            note: "Seed top-up",
            createdBy: admin.id,
          },
        });
        createdTopUps++;
        await prisma.transaction.create({
          data: {
            userId: u.id,
            type: "TOP_UP",
            amountPeso: amt,
            description: "Wallet top-up (seed)",
            referenceId: ref,
          },
        });
        createdTransactions++;

        // update wallet balance
        await prisma.wallet.update({
          where: { id: wallet.id },
          data: { balancePeso: { increment: amt } },
        });
      }
    }
  }

  // Voucher redemptions (append-ish but try to avoid duplicate user-voucher pairs)
  let createdRedemptions = 0;
  for (const v of vouchers) {
    // only do a few redemptions per voucher
    const existingRedemptions = await prisma.voucherRedemption.findMany({
      where: { voucherId: v.id },
      select: { userId: true },
    });
    const redeemedUserIds = new Set(existingRedemptions.map((r) => r.userId));
    const redemptionCount = redeemedUserIds.size;
    const target = Math.min(v.maxUses, cfg.voucherRedemptionsPerVoucher);
    const toCreate = Math.max(0, target - redemptionCount);
    for (let i = 0; i < toCreate; i++) {
      const candidateUsers = allUsers.filter((u) => !redeemedUserIds.has(u.id));
      if (candidateUsers.length === 0) break;
      const u = pick(candidateUsers);
      await prisma.voucherRedemption.create({
        data: { voucherId: v.id, userId: u.id },
      });
      redeemedUserIds.add(u.id);
      createdRedemptions++;
    }

    // sync usedCount to actual redemption count (safe)
    const newCount = await prisma.voucherRedemption.count({ where: { voucherId: v.id } });
    await prisma.voucher.update({ where: { id: v.id }, data: { usedCount: newCount } });
  }

  // Messages: create a couple of admin-sent batches (skip if batchId already exists)
  const dateTag = new Date().toISOString().slice(0, 10);
  const seedBatchIds = Array.from({ length: cfg.messageBatches }).map(
    (_v, idx) => `seed-batch-${dateTag}-${String(idx + 1).padStart(2, "0")}`
  );

  let createdMessages = 0;
  for (const batchId of seedBatchIds) {
    const { exists } = await ensureSeedBatch({ batchId });
    if (exists) continue;

    const type = pick(["NOTIFICATION", "VOUCHER", "SUPPORT", "TRANSACTION"]);
    const title =
      type === "VOUCHER"
        ? "New voucher available"
        : type === "SUPPORT"
          ? "Service update"
          : type === "TRANSACTION"
            ? "Charging receipt"
            : "Welcome to Megawatt";

    const body =
      type === "VOUCHER"
        ? "Use MEGA50 or OFFPEAK10 on your next session."
        : type === "SUPPORT"
          ? "We’re doing minor maintenance tonight 1AM–2AM. Some chargers may be offline."
          : type === "TRANSACTION"
            ? "Your latest charging session receipt is available in Transactions."
            : "Thanks for using Megawatt. Find nearby stations and start charging anytime.";

    const recipients = allUsers.slice(0, Math.min(allUsers.length, cfg.messageBatchRecipients));

    await prisma.$transaction(
      recipients.map((u) =>
        prisma.message.create({
          data: {
            userId: u.id,
            createdBy: admin.id,
            batchId,
            title,
            body,
            type,
            isRead: Math.random() < 0.3,
            referenceId: crypto.randomUUID(),
          },
        })
      )
    );
    createdMessages += recipients.length;
  }

  console.log(`✓ Sessions ensured (created ${createdSessions})`);
  console.log(`✓ Transactions ensured (created ${createdTransactions})`);
  console.log(`✓ TopUps ensured (created ${createdTopUps})`);
  console.log(`✓ Voucher redemptions ensured (created ${createdRedemptions})`);
  console.log(`✓ Messages ensured (created ${createdMessages})`);

  console.log(`\nSeed completed in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
