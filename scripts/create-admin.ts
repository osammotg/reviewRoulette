/**
 * Usage: npm run admin:create
 * Creates or updates an admin user with the given email and password.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("../app/generated/prisma/client");
import bcrypt from "bcryptjs";
import * as readline from "readline";

const prisma = new PrismaClient();

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const email = (await ask("Admin email: ")).trim();
  const password = (await ask("Admin password: ")).trim();

  if (!email || !password) {
    console.error("Email and password are required.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });

  console.log(`Admin user ready: ${admin.email}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
