// Create (or reset) a platform SUPER_ADMIN from the command line.
//   npm run platform:admin -- you@company.com 'StrongPassword1' "Your Name"
import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../prisma/client.js";

const [email, password, ...nameParts] = process.argv.slice(2);
if (!email || !password) {
  console.error("Usage: npm run platform:admin -- <email> <password> [name]");
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 10);
const admin = await prisma.platformAdmin.upsert({
  where: { email: email.toLowerCase() },
  create: { email: email.toLowerCase(), name: nameParts.join(" ") || "Super Admin", passwordHash, role: "SUPER_ADMIN" },
  update: { passwordHash, role: "SUPER_ADMIN", isActive: true, failedLoginAttempts: 0, lockedUntil: null, tokenVersion: { increment: 1 } },
});
console.log(`Platform super admin ready: ${admin.email} — sign in at /platform/login`);
await prisma.$disconnect();
