import type { ImageLoaderProps } from "next/image";

const WORKER_URL = process.env.NEXT_PUBLIC_GALLERY_WORKER_URL ?? "";

export const GALLERY_WIDTHS = [640, 828, 1280, 1920, 2560, 3200] as const;

function snapWidth(requested: number): number {
  for (const width of GALLERY_WIDTHS) {
    if (width >= requested) return width;
  }
  return GALLERY_WIDTHS[GALLERY_WIDTHS.length - 1];
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
  const suffix = version ? `?v=${version}` : "";
  return `${WORKER_URL}/v/${snapWidth(width)}/${encodeURIComponent(key)}${suffix}`;
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
