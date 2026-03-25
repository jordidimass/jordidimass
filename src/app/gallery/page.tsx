import GalleryClient from "./GalleryClient";

const WORKER_URL = process.env.NEXT_PUBLIC_GALLERY_WORKER_URL ?? "";

interface GalleryImage {
  key: string;
  size: number;
  uploaded: string;
  url: string;
}

export const revalidate = 300;

async function getImages(): Promise<{ images: GalleryImage[]; error: string | null }> {
  if (!WORKER_URL) {
    return { images: [], error: "gallery worker url not configured" };
  }

  try {
    const response = await fetch(WORKER_URL, {
      next: { revalidate: 300 },
    });
    if (!response.ok) {
      return { images: [], error: `failed to load gallery (${response.status})` };
    }
    const data = (await response.json()) as { images?: GalleryImage[] };
    return { images: data.images ?? [], error: null };
  } catch {
    return { images: [], error: "failed to load gallery" };
  }
}

export default async function GalleryPage() {
  const { images, error } = await getImages();

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text pt-24 pb-24 px-8">
      <div className="max-w-6xl mx-auto space-y-16">
        <section className="space-y-4">
          <h1 className="text-4xl font-light tracking-widest font-serif text-brand-accent">
            gallery
          </h1>
        </section>

        {error && (
          <div className="p-4 border border-brand-muted/40 rounded-lg text-brand-muted font-light">
            {error}
          </div>
        )}

        {!error && images.length > 0 && <GalleryClient images={images} />}

        {!error && images.length === 0 && (
          <p className="text-brand-muted font-light tracking-widest">no images yet</p>
        )}
      </div>
    </div>
  );
}
