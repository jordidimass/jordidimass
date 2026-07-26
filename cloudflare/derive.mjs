#!/usr/bin/env node
/**
 * Generates the derived webp ladder + manifest for the gallery.
 *
 * Originals in R2 are never touched — they stay the archival copy and the
 * download payload. This writes derived/<width>/<key>.webp plus a manifest.json
 * carrying real dimensions and a blur placeholder for every image.
 *
 * Usage:
 *   node derive.mjs               # pull originals from the worker
 *   node derive.mjs <photos-dir>  # read originals from disk (faster)
 *   node derive.mjs --force       # rebuild variants that already exist
 */

import { execSync } from "child_process";
import { readdirSync, statSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from "fs";
import { join, extname } from "path";
import { tmpdir } from "os";
import sharp from "sharp";

const BUCKET = process.env.GALLERY_BUCKET ?? "jordidimass-gallery";
const WORKER_URL = process.env.GALLERY_WORKER_URL ?? "https://gallery-worker.jordidimass.workers.dev";

const LADDER = [
  { width: 640, quality: 80 },
  { width: 828, quality: 80 },
  { width: 1280, quality: 82 },
  { width: 1920, quality: 86 },
  { width: 2560, quality: 88 },
  { width: 3200, quality: 88 },
];

const BLUR_WIDTH = 16;
const BLUR_QUALITY = 40;

const args = process.argv.slice(2);
const force = args.includes("--force");
const local = args.includes("--local");
const onlyIdx = args.indexOf("--only");
const only = onlyIdx !== -1 ? args[onlyIdx + 1] : null;
const photosDir = args.find((a, i) => !a.startsWith("--") && (onlyIdx === -1 || i !== onlyIdx + 1));

const SUPPORTED = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);

function r2(cmd) {
  return execSync(`wrangler ${cmd}`, { stdio: "pipe" }).toString();
}

function r2Put(key, file, contentType) {
  r2(`r2 object put "${BUCKET}/${key}" --file="${file}" --content-type="${contentType}" ${local ? "--local" : "--remote"}`);
}

// wrangler has no `r2 object list`, so existence is probed through the worker.
// It answers X-JD-Variant: derived only when a real derived object was served,
// and `original` when it fell back — so a fallback never counts as present.
async function variantExists(key, width) {
  try {
    const res = await fetch(`${WORKER_URL}/v/${width}/${encodeURIComponent(key)}`, { method: "HEAD" });
    return res.ok && res.headers.get("x-jd-variant") === "derived";
  } catch {
    return false;
  }
}

async function fetchExistingManifest() {
  try {
    const res = await fetch(`${WORKER_URL}/image/manifest.json`);
    if (!res.ok) return new Map();
    const data = await res.json();
    return new Map((data.images ?? []).map((e) => [e.key, e]));
  } catch {
    return new Map();
  }
}

async function fetchImageList() {
  const res = await fetch(WORKER_URL);
  if (!res.ok) throw new Error(`worker list failed: ${res.status}`);
  const data = await res.json();
  return data.images ?? [];
}

async function loadOriginal(entry) {
  if (photosDir) {
    const local = join(photosDir, entry.key);
    try {
      if (statSync(local).isFile()) return readFileSync(local);
    } catch {
      // fall through to the network
    }
  }
  const res = await fetch(`${WORKER_URL}/image/${encodeURIComponent(entry.key)}`);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  let entries;
  if (photosDir) {
    const files = readdirSync(photosDir).filter((f) => {
      const ext = extname(f).toLowerCase();
      return SUPPORTED.has(ext) && statSync(join(photosDir, f)).isFile();
    });
    entries = files.map((key) => ({ key }));
    console.log(`\nSource: local dir ${photosDir} (${entries.length} files)`);
  } else {
    entries = await fetchImageList();
    console.log(`\nSource: ${WORKER_URL} (${entries.length} images)`);
  }

  if (entries.length === 0) {
    console.error("No images found.");
    process.exit(1);
  }

  // Reusing a prior manifest entry is what keeps a re-run from re-downloading
  // every original just to regenerate a blur that has not changed.
  // Keep the prior manifest even under --force: it is what lets --only rebuild
  // one photo without discarding the other 42 entries.
  const priorManifest = await fetchExistingManifest();
  if (priorManifest.size) console.log(`Reusing ${priorManifest.size} manifest entries where nothing changed.`);

  const scratch = mkdtempSync(join(tmpdir(), "gallery-derive-"));
  const manifest = [];
  let reused = 0;
  let built = 0;
  let skipped = 0;
  let failed = 0;

  try {
    for (const entry of entries) {
      const key = entry.key;

      if (only && !key.toLowerCase().includes(only.toLowerCase())) {
        const kept = priorManifest.get(key);
        if (kept) { manifest.push(kept); reused++; continue; }
      }

      const prior = force ? undefined : priorManifest.get(key);
      if (prior?.widths?.length && prior.blurDataURL && prior.width && prior.height) {
        const complete = (
          await Promise.all(prior.widths.map((w) => variantExists(key, w)))
        ).every(Boolean);
        if (complete) {
          manifest.push(prior);
          skipped += prior.widths.length;
          reused++;
          continue;
        }
      }

      process.stdout.write(`  ${key}\n`);

      let buf;
      try {
        buf = await loadOriginal(entry);
      } catch (err) {
        console.error(`    ✗ ${err.message}`);
        failed++;
        continue;
      }

      const meta = await sharp(buf).metadata();
      // EXIF orientation >= 5 means the stored pixels are rotated a quarter
      // turn from how the photo should display. sharp does not auto-orient, so
      // without this the derived image comes out sideways and the manifest
      // records the wrong aspect ratio.
      const swapped = (meta.orientation ?? 1) >= 5;
      const srcWidth = (swapped ? meta.height : meta.width) ?? 0;
      const srcHeight = (swapped ? meta.width : meta.height) ?? 0;
      if (!srcWidth || !srcHeight) {
        console.error("    ✗ could not read dimensions");
        failed++;
        continue;
      }

      // Never upscale: keep ladder widths below the original, plus the first
      // one at or above it so the largest surface still gets a webp.
      const widths = [];
      for (const step of LADDER) {
        widths.push(step);
        if (step.width >= srcWidth) break;
      }

      const generated = [];
      for (const { width, quality } of widths) {
        const target = Math.min(width, srcWidth);
        const outKey = `derived/${width}/${key}.webp`;

        if (!force && (await variantExists(key, width))) {
          generated.push(width);
          skipped++;
          continue;
        }

        const outFile = join(scratch, `${width}.webp`);
        await sharp(buf).rotate().resize({ width: target, withoutEnlargement: true }).webp({ quality }).toFile(outFile);

        try {
          r2Put(outKey, outFile, "image/webp");
          generated.push(width);
          built++;
          const bytes = statSync(outFile).size;
          process.stdout.write(`    ${width}w → ${(bytes / 1024).toFixed(0)} KB\n`);
        } catch (err) {
          console.error(`    ✗ ${width}w upload: ${err.stderr?.toString().trim() ?? err.message}`);
          failed++;
        }
      }

      const blur = await sharp(buf).rotate().resize({ width: BLUR_WIDTH }).webp({ quality: BLUR_QUALITY }).toBuffer();

      manifest.push({
        key,
        width: srcWidth,
        height: srcHeight,
        blurDataURL: `data:image/webp;base64,${blur.toString("base64")}`,
        widths: generated.sort((a, b) => a - b),
      });
    }

    // The manifest timestamp is the cache-busting token for every derived URL,
    // so it must only move when the derived set actually changed.
    const priorImages = entries.map((e) => priorManifest.get(e.key)).filter(Boolean);
    const unchanged =
      priorImages.length === manifest.length &&
      JSON.stringify(priorImages) === JSON.stringify(manifest);

    if (unchanged) {
      console.log(`\n  manifest.json unchanged — leaving it (and the cache token) alone`);
    } else {
      const manifestFile = join(scratch, "manifest.json");
      writeFileSync(manifestFile, JSON.stringify({ images: manifest, generatedAt: new Date().toISOString() }));
      r2Put("manifest.json", manifestFile, "application/json");
      console.log(`\n  manifest.json → ${manifest.length} images`);
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }

  console.log(`\nDone. ${built} variants built, ${skipped} skipped (${reused} images unchanged), ${failed} failed.\n`);
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
