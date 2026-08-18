"use client";

import GalleryImage from "@/components/GalleryImage";
import { imageSource } from "@/lib/galleryLoader";
import { FALLBACK_WIDTH, FALLBACK_HEIGHT, type GalleryImage as GalleryImageData } from "@/lib/gallery";

export default function PhotoView({ image, alt }: { image: GalleryImageData; alt: string }) {
  return (
    <GalleryImage
      {...imageSource(image)}
      alt={alt}
      width={image.width ?? FALLBACK_WIDTH}
      height={image.height ?? FALLBACK_HEIGHT}
      sizes="(max-width: 768px) 100vw, 90vw"
      priority
      blurDataURL={image.blurDataURL}
      className="max-h-[80vh] w-auto max-w-full rounded-[4px] object-contain"
    />
  );
}
