"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

/**
 * Wraps next/image with a manual blur-up + crossfade.
 *
 * Next's built-in `placeholder="blur"` wraps `blurDataURL` in an SVG with a
 * fixed blur radius sized to the image's full intrinsic width. Since
 * `blurWidth`/`blurHeight` are only populated for statically-imported
 * images (never for the runtime-string `src` this app's custom loader
 * builds), that radius ends up ~0.5% of a multi-thousand-px-wide photo —
 * visually negligible, so the tiny blur source reads as blocky instead of
 * soft. Rendering the blur ourselves as a real, CSS-blurred `<img>` sidesteps
 * that entirely, and gives a natural home for the onLoad crossfade.
 */
export default function GalleryImage({
  blurDataURL,
  onLoad,
  className,
  ...props
}: ImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative overflow-hidden">
      {blurDataURL && (
        <img
          aria-hidden="true"
          alt=""
          data-blur-placeholder=""
          src={blurDataURL}
          className={`absolute inset-0 h-full w-full scale-110 object-cover blur-xl transition-opacity duration-500 ease-out ${
            loaded ? "opacity-0" : "opacity-100"
          }`}
        />
      )}
      <Image
        {...props}
        data-gallery-photo=""
        placeholder="empty"
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        className={`relative transition-[opacity,transform] duration-300 ease-out ${
          loaded ? "opacity-100" : "opacity-0"
        } ${className ?? ""}`}
      />
    </div>
  );
}
