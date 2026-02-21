// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("../app/generated/prisma/client");
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Admin user
  const passwordHash = await bcrypt.hash("admin123", 12);
  const admin = await prisma.adminUser.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { email: "admin@example.com", passwordHash },
  });
  console.log("Admin user:", admin.email);

  // Demo restaurant
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "demo-cafe" },
    update: {},
    create: {
      name: "Demo Café",
      slug: "demo-cafe",
      googleUrl: "https://maps.google.com/?cid=1234567890",
      timezone: "Europe/Zurich",
      dailyWinCap: 50,
    },
  });
  console.log("Restaurant:", restaurant.name, "→ /r/" + restaurant.slug);

  // Prizes
  const prizes = [
    { label: "Free Coffee", emoji: "☕", weight: 5, dailyCap: 10 },
    { label: "10% Off", emoji: "🏷️", weight: 10, dailyCap: 20 },
    { label: "Free Dessert", emoji: "🍰", weight: 3, dailyCap: 5 },
    { label: "Free Upgrade", emoji: "⬆️", weight: 8, dailyCap: 15 },
    { label: "Free Drink", emoji: "🥤", weight: 6, dailyCap: 12 },
    // Fallback for when caps are reached
    {
      label: "5% Off Your Next Visit",
      emoji: "🎁",
      weight: 1,
      dailyCap: null,
      isFallback: true,
    },
  ];

  for (const prize of prizes) {
    await prisma.prize.upsert({
      where: {
        // No unique constraint on label, so just create; in real use seed is idempotent via upsert on a stable field
        // For seed simplicity, delete existing prizes and recreate
        id: (
          await prisma.prize.findFirst({
            where: { restaurantId: restaurant.id, label: prize.label },
          })
        )?.id ?? "nonexistent",
      },
      update: {},
      create: {
        restaurantId: restaurant.id,
        ...prize,
        isFallback: "isFallback" in prize ? prize.isFallback : false,
      },
    });
  }
  console.log("Prizes seeded:", prizes.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
