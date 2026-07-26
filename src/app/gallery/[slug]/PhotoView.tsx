"use client";

import Image from "next/image";
import { imageSource } from "@/lib/galleryLoader";
import { FALLBACK_WIDTH, FALLBACK_HEIGHT, type GalleryImage } from "@/lib/gallery";

export default function PhotoView({ image, alt }: { image: GalleryImage; alt: string }) {
  return (
    <Image
      {...imageSource(image)}
      alt={alt}
      width={image.width ?? FALLBACK_WIDTH}
      height={image.height ?? FALLBACK_HEIGHT}
      quality={92}
      sizes="(max-width: 768px) 100vw, 90vw"
      priority
      placeholder={image.blurDataURL ? "blur" : "empty"}
      blurDataURL={image.blurDataURL}
      className="max-h-[80vh] w-auto max-w-full rounded-[4px] object-contain"
    />
  );
}
