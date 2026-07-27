const WORKER_URL = process.env.NEXT_PUBLIC_GALLERY_WORKER_URL ?? "";

export interface GalleryImage {
  key: string;
  size: number;
  uploaded: string;
  url: string;
  // Present once cloudflare/derive.mjs has published manifest.json. Optional so
  // the site still renders against a worker that predates it.
  width?: number;
  height?: number;
  blurDataURL?: string;
  widths?: number[];
  og?: boolean;
  version?: string;
}

// Fallback ratio for images not yet in the manifest.
export const FALLBACK_WIDTH = 1600;
export const FALLBACK_HEIGHT = 1067;

export function slugFromKey(key: string): string {
  return key
    .replace(/\.[^.]+$/, "")      // strip extension
    .toLowerCase()                  // lowercase
    .replace(/[\s_]+/g, "-")       // spaces / underscores → hyphens
    .replace(/[^a-z0-9-]/g, "")   // drop anything else (parens, dots, etc.)
    .replace(/-{2,}/g, "-")        // collapse consecutive hyphens
    .replace(/^-+|-+$/g, "");      // trim leading / trailing hyphens
}

export async function getGalleryImages(): Promise<GalleryImage[]> {
  if (!WORKER_URL) return [];
  try {
    const res = await fetch(WORKER_URL, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { images?: GalleryImage[]; version?: string };
    const images = (data.images ?? []).map((img) => ({ ...img, version: data.version }));
    const seen = new Set<string>();
    return images.filter((img) => {
      if (seen.has(img.key)) return false;
      seen.add(img.key);
      return true;
    });
  } catch {
    return [];
  }
}

/**
 * Splits images into `columns` contiguous runs of roughly equal total height.
 *
 * CSS multi-column balances columns itself, and its choice is not knowable at
 * render time — which meant `priority` could only ever be aimed at column one,
 * leaving the top of every other column to load lazily at Low priority. Forcing
 * the break points with `break-before: column` makes the packing deterministic,
 * so the server knows which images sit at the top of each column.
 *
 * Returns the DOM index that starts each column.
 */
export function columnStarts(images: GalleryImage[], columns: number): number[] {
  if (columns <= 1 || images.length === 0) return [0];

  const ratio = (img: GalleryImage) =>
    img.width && img.height ? img.height / img.width : FALLBACK_HEIGHT / FALLBACK_WIDTH;

  const total = images.reduce((sum, img) => sum + ratio(img), 0);
  const target = total / columns;

  const starts = [0];
  let acc = 0;
  for (let i = 0; i < images.length && starts.length < columns; i++) {
    acc += ratio(images[i]);
    // `acc` resets after each break, so it is compared against a single
    // column's target — scaling the target by the column index instead made
    // every break after the first unreachable, leaving later columns empty.
    const remaining = images.length - (i + 1);
    if (acc >= target && remaining >= columns - starts.length) {
      starts.push(i + 1);
      acc = 0;
    }
  }
  return starts;
}

/** DOM indices that sit within the first `rows` of any column, at any breakpoint. */
export function aboveFoldIndices(images: GalleryImage[], rows = 2): Set<number> {
  const out = new Set<number>();
  for (const columns of [1, 2, 3]) {
    for (const start of columnStarts(images, columns)) {
      for (let r = 0; r < rows; r++) {
        if (start + r < images.length) out.add(start + r);
      }
    }
  }
  return out;
}
