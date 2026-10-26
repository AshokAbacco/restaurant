import "dotenv/config";
import app from "./src/index.js";
import prisma from "./prisma/client.js";
import { seedDefaultMenuForAllOutlets } from "./prisma/defaultMenu.seed.js";

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Give every EXISTING user's outlets the default menu, once each.
  // Runs in the background so it never delays startup, and is idempotent:
  // outlets already initialised (Outlet.defaultMenuSeededAt set) are
  // skipped, so after the first boot this is a single query.
  // Set SEED_DEFAULT_MENU_ON_BOOT=false to turn it off and run
  // `npm run seed:menu` manually instead.
  if (process.env.SEED_DEFAULT_MENU_ON_BOOT !== "false") {
    seedDefaultMenuForAllOutlets(prisma)
      .then(({ pending, seeded, failed }) => {
        if (pending) {
          console.log(`🍽️  Default menu: ${seeded} outlet(s) initialised, ${failed} failed.`);
        }
      })
      .catch((err) => console.error("🍽️  Default menu backfill failed:", err.message));
  }
});