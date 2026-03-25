#!/usr/bin/env node
/**
 * Bulk upload script for the gallery photos to Cloudflare R2.
 * Uses wrangler CLI under the hood — no extra deps needed.
 * Skips files already present in the bucket.
 *
 * Usage:
 *   node upload.mjs <photos-dir>
 */

import { execSync } from "child_process";
import { readdirSync, statSync } from "fs";
import { join, extname } from "path";

const BUCKET = "jordidimass-gallery";
const WORKER_URL = "https://gallery-worker.jordidimass.workers.dev";
const PHOTOS_DIR = process.argv[2];

if (!PHOTOS_DIR) {
  console.error("Usage: node upload.mjs <photos-dir>");
  process.exit(1);
}

const SUPPORTED = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);

function mimeType(ext) {
  const map = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".avif": "image/avif",
  };
  return map[ext.toLowerCase()] ?? "application/octet-stream";
}

const files = readdirSync(PHOTOS_DIR).filter((f) => {
  const ext = extname(f).toLowerCase();
  const full = join(PHOTOS_DIR, f);
  return SUPPORTED.has(ext) && statSync(full).isFile();
});

if (files.length === 0) {
  console.error(`No supported images found in ${PHOTOS_DIR}`);
  process.exit(1);
}

console.log(`\nFetching existing keys from R2...`);
let existing = new Set();
try {
  const res = await fetch(WORKER_URL);
  if (res.ok) {
    const data = await res.json();
    existing = new Set((data.images ?? []).map((img) => img.key));
    console.log(`  ${existing.size} files already in bucket\n`);
  } else {
    console.log(`  could not fetch existing keys (${res.status}), will upload all\n`);
  }
} catch {
  console.log(`  could not reach worker, will upload all\n`);
}

console.log(`Found ${files.length} photos in ${PHOTOS_DIR}`);
console.log(`Uploading to R2 bucket: ${BUCKET}\n`);

let uploaded = 0;
let skipped = 0;
let failed = 0;

for (const file of files) {
  if (existing.has(file)) {
    console.log(`  "${file}" → already uploaded`);
    skipped++;
    continue;
  }

  const fullPath = join(PHOTOS_DIR, file);
  const key = file;
  const mime = mimeType(extname(file));

  process.stdout.write(`  uploading "${file}" ... `);

  try {
    execSync(
      `wrangler r2 object put "${BUCKET}/${key}" --file="${fullPath}" --content-type="${mime}" --local=false`,
      { stdio: "pipe" }
    );
    console.log("✓");
    uploaded++;
  } catch (err) {
    console.log("✗ failed");
    console.error(`    ${err.stderr?.toString().trim() ?? err.message}`);
    failed++;
  }
}

console.log(`\nDone. ${uploaded} uploaded, ${skipped} skipped, ${failed} failed.\n`);
