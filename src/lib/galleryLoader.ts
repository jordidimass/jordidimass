import type { ImageLoaderProps } from "next/image";

const WORKER_URL = process.env.NEXT_PUBLIC_GALLERY_WORKER_URL ?? "";

export const GALLERY_WIDTHS = [640, 828, 1280, 1920, 2560, 3200] as const;

export function snapWidth(requested: number): number {
  for (const width of GALLERY_WIDTHS) {
    if (width >= requested) return width;
  }
  return GALLERY_WIDTHS[GALLERY_WIDTHS.length - 1];
}

function buildDerivedUrl(key: string, width: number, version?: string): string {
  const suffix = version ? `?v=${version}` : "";
  return `${WORKER_URL}/v/${snapWidth(width)}/${encodeURIComponent(key)}${suffix}`;
}

/**
 * Resolves an R2 key to a derived-variant URL on the gallery worker.
 *
 * Returning a URL from a custom loader makes Next build the srcset itself and
 * skip /_next/image entirely — so the browser picks by viewport and DPR, and
 * no Vercel optimizer quota is consumed.
 */
export function galleryLoader({ src, width }: ImageLoaderProps): string {
  if (!WORKER_URL) return src;
  const [key, version] = src.split("\u0000");
  return buildDerivedUrl(key, width, version);
}

const preloadedVariants = new Set<string>();

/**
 * Warms the browser's HTTP cache for the derived-variant URL a larger view
 * (lightbox/detail page) is about to request, so opening it is a cache hit
 * instead of a fresh multi-MB fetch. The width math mirrors `galleryLoader`
 * exactly (same `snapWidth`), which is safe because `next.config.mjs`'s
 * `deviceSizes` is kept in lockstep with `GALLERY_WIDTHS`.
 */
export function preloadDerivedVariant(
  img: { key: string; version?: string; widths?: number[] },
  targetCssWidth: number
): void {
  if (!WORKER_URL || typeof window === "undefined") return;
  if (!img.widths || img.widths.length === 0) return; // unoptimized fallback -- no /v/ variants exist

  const width = Math.round(targetCssWidth * Math.min(window.devicePixelRatio || 1, 3));
  const snapped = snapWidth(width);
  const dedupeKey = `${img.key}:${snapped}`;
  if (preloadedVariants.has(dedupeKey)) return;
  preloadedVariants.add(dedupeKey);

  new window.Image().src = buildDerivedUrl(img.key, snapped, img.version);
}

export function originalUrl(key: string): string {
  if (!WORKER_URL) return key;
  return `${WORKER_URL}/image/${encodeURIComponent(key)}`;
}

/**
 * Picks the source strategy from what the worker actually advertises, so the
 * rollout is safe in any order: before the worker exposes /v/ and derive.mjs
 * has published a manifest, `widths` is absent and we serve the original the
 * old way rather than requesting variants that would 404.
 */
export function imageSource(img: {
  key: string;
  url: string;
  widths?: number[];
  version?: string;
}) {
  if ((img.widths?.length ?? 0) === 0) {
    return { src: img.url, unoptimized: true } as const;
  }
  // The version rides along in `src` (Next only passes src/width/quality to a
  // loader) and is split back out there.
  return {
    loader: galleryLoader,
    src: img.version ? `${img.key}\u0000${img.version}` : img.key,
  } as const;
}

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

export function ogCardUrl(img: { key: string; og?: boolean; version?: string }): string | null {
  if (!WORKER_URL || !img.og) return null;
  const v = img.version ? `?v=${img.version}` : "";
  return `${WORKER_URL}/v/og/${encodeURIComponent(img.key)}${v}`;
}
