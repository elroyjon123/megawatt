require("dotenv").config();
const prisma = require("../src/lib/prisma");

async function main() {
  // USERS
  const user = await prisma.user.upsert({
    where: { email: "demo@megawatt.com" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@megawatt.com",
      passwordHash: "hashedpassword123",
      role: "USER",
    },
  });

  // STATIONS
  const stations = [
    {
      name: "BGC High Street",
      address: "Bonifacio Global City, Taguig",
      city: "Taguig",
      latitude: 14.5520,
      longitude: 121.0487,
    },
    {
      name: "Makati Greenbelt",
      address: "Greenbelt, Makati",
      city: "Makati",
      latitude: 14.5534,
      longitude: 121.0235,
    },
    {
      name: "Ortigas Center",
      address: "Ortigas Center, Pasig",
      city: "Pasig",
      latitude: 14.5869,
      longitude: 121.0567,
    },
  ];

  for (const s of stations) {
    const station = await prisma.station.create({
      data: s,
    });

    // CHARGERS
    await prisma.charger.createMany({
      skipDuplicates: true,
      data: [
        {
          name: `${s.name} Charger A`,
          ocppId: `${s.name}-A`,
          status: "AVAILABLE",
          connectorType: "TYPE_2",
          powerOutputKw: 7,
          pricePerKwh: 28.5,
          stationId: station.id,
        },
        {
          name: `${s.name} Charger B`,
          ocppId: `${s.name}-B`,
          status: "OCCUPIED",
          connectorType: "TYPE_2",
          powerOutputKw: 7,
          pricePerKwh: 28.5,
          stationId: station.id,
        },
      ],
    });
  }

  // WALLET
  await prisma.wallet.upsert({
    where: { userId: user.id },
    update: {},
      create: {
        userId: user.id,
        balancePeso: 500,
      },
  });

  console.log("✅ Demo data seeded");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
