/*
 * Builds the /about photograph gallery.
 *
 * `gallery/` holds the club's full-resolution source photography. It sits outside
 * `public/`, so Next.js never serves it and the originals cost nothing at
 * runtime. This script reads the curated plate list from `src/data/gallery.json`,
 * crops each source to the aspect ratio the layout uses, and writes WebP into
 * `public/gallery/`.
 *
 *   node scripts/build-gallery.mjs
 *
 * The plate list is the only thing to edit when adding, replacing, resizing or
 * re-ordering a photo. Captions and alt text go in `src/app/i18n.ts` under
 * `gallery.items`, keyed by the same id.
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { checkGalleryCopy } from "./gallery-copy.mjs";

const SOURCE_DIR = "gallery";
const OUTPUT_DIR = "public/gallery";
const spec = await checkGalleryCopy();

await rm(OUTPUT_DIR, { recursive: true, force: true });
await mkdir(OUTPUT_DIR, { recursive: true });

let total = 0;
let totalSource = 0;
const entries = [];

for (const plate of spec.plates) {
  const source = path.join(SOURCE_DIR, plate.source);
  const output = `${plate.id}.webp`;
  const destination = path.join(OUTPUT_DIR, output);
  const input = await readFile(source);

  const meta = await sharp(input).metadata();
  // Never upscale: a plate wider than its source is a typo, and stretching a
  // 864px original to 1400px would just make it blurrier and heavier.
  const targetWidth = Math.min(plate.width, meta.width ?? plate.width);
  const targetHeight = Math.round(targetWidth / plate.ratio);
  if (targetWidth < plate.width) {
    console.warn(
      `  note: ${plate.source} is only ${meta.width}px wide, capped to ${targetWidth}px`,
    );
  }

  await sharp(input)
    .rotate() // honours EXIF orientation before anything else reads pixels
    .resize({
      width: targetWidth,
      height: targetHeight,
      fit: "cover",
      // `attention` keeps the busiest region, which for a group photo is the
      // people rather than the ceiling or the floor. A plate can override it:
      // the club's designed posters carry their own border bands, and attention
      // slicing one in half looks like a broken crop.
      position: plate.position ?? "attention",
    })
    .webp({ quality: 78, effort: 6 })
    .toFile(destination);

  const bytes = (await readFile(destination)).length;
  const sourceBytes = input.length;
  total += bytes;
  totalSource += sourceBytes;

  entries.push({
    id: plate.id,
    src: `/gallery/${output}`,
    width: targetWidth,
    height: targetHeight,
    ...(plate.lead ? { lead: true } : {}),
  });

  console.log(
    `${output.padEnd(32)} ${String(targetWidth).padStart(4)}x${String(targetHeight).padEnd(4)}  ` +
      `${(bytes / 1024).toFixed(0).padStart(5)} KB` +
      `   (was ${(sourceBytes / 1024 / 1024).toFixed(2)} MB)`,
  );
}

await writeFile(
  path.join(OUTPUT_DIR, "manifest.json"),
  `${JSON.stringify(entries, null, 2)}\n`,
);

console.log(
  `\n${entries.length} photographs, ${(total / 1024).toFixed(0)} KB shipped, ` +
    `down from ${(totalSource / 1024 / 1024).toFixed(1)} MB of source.`,
);

for (const skip of spec.omitted ?? []) {
  console.log(`omitted ${skip.source}: ${skip.reason}`);
}
