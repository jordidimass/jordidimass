import type { Metadata } from "next";
import GalleryClient from "./GalleryClient";
import { getGalleryImages } from "@/lib/gallery";
import { ogCardUrl, OG_WIDTH, OG_HEIGHT } from "@/lib/galleryLoader";

export const revalidate = 300;

const SITE_URL = "https://www.jordidimass.com";
const DESCRIPTION = "A collection of photography and visual work.";

export async function generateMetadata(): Promise<Metadata> {
  const images = await getGalleryImages();
  const card = images.length ? ogCardUrl(images[0]) : null;
  return {
    title: "Gallery",
    description: DESCRIPTION,
    alternates: { canonical: `${SITE_URL}/gallery` },
    openGraph: {
      type: "website",
      title: "Gallery | Jordi Dimas",
      description: DESCRIPTION,
      url: `${SITE_URL}/gallery`,
      siteName: "Jordi Dimas",
      images: card
        ? [{ url: card, width: OG_WIDTH, height: OG_HEIGHT, alt: "Gallery", type: "image/jpeg" }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: "Gallery | Jordi Dimas",
      description: DESCRIPTION,
      images: card ? [card] : undefined,
    },
  };
}

export default async function GalleryPage() {
  const images = await getGalleryImages();

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text py-8 px-8">
      <div className="mx-auto max-w-8xl space-y-16">
        {images.length > 0 ? (
          <GalleryClient images={images} />
        ) : (
          <p className="font-light tracking-widest text-brand-muted">no images yet</p>
        )}
      </div>
    </div>
  );
}
