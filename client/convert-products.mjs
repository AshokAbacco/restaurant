import sharp from "sharp";
import fs from "fs";
import path from "path";

const folder = path.join(process.cwd(), "src/landing/images/products");

// Find all PNG images
const files = fs
  .readdirSync(folder)
  .filter((file) => file.toLowerCase().endsWith(".png"));

sharp.concurrency(4);

let completed = 0;
let skipped = 0;

const start = Date.now();

async function convert(file) {
  const input = path.join(folder, file);

  const output = path.join(folder, file.replace(/\.png$/i, ".webp"));

  // Skip if WebP already exists
  if (fs.existsSync(output)) {
    skipped++;
    console.log(`Skipped: ${file}`);
    return;
  }

  await sharp(input)
    .webp({
      quality: 80,
      effort: 1,
    })
    .toFile(output);

  completed++;

  console.log(`[${completed}/${files.length}] Converted: ${file}`);
}

async function main() {
  const batchSize = 4;

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);

    await Promise.all(batch.map(convert));
  }

  const seconds = ((Date.now() - start) / 1000).toFixed(1);

  console.log("\n========== CONVERSION COMPLETE ==========");
  console.log(`Total PNG files: ${files.length}`);
  console.log(`Converted: ${completed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Time taken: ${seconds} seconds`);
  console.log("Original PNG files are unchanged.");
}

main().catch((error) => {
  console.error("Conversion failed:", error);
  process.exitCode = 1;
});
