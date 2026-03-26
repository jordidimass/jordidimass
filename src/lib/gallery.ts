const WORKER_URL = process.env.NEXT_PUBLIC_GALLERY_WORKER_URL ?? "";

export interface GalleryImage {
  key: string;
  size: number;
  uploaded: string;
  url: string;
}

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
    const data = (await res.json()) as { images?: GalleryImage[] };
    const images = data.images ?? [];
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
