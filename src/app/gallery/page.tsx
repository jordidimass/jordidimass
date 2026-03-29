import type { Metadata } from "next";
import GalleryClient from "./GalleryClient";
import { getGalleryImages } from "@/lib/gallery";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Gallery",
  description: "A collection of photography and visual work.",
  openGraph: {
    title: "Gallery | Jordi Dimas",
    description: "A collection of photography and visual work.",
    url: "https://jordidimas.com/gallery",
  },
  alternates: { canonical: "https://jordidimas.com/gallery" },
};

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
