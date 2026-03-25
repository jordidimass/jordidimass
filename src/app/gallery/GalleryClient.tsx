"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface GalleryImage {
  key: string;
  size: number;
  uploaded: string;
  url: string;
}

interface GalleryClientProps {
  images: GalleryImage[];
}

function label(key: string): string {
  return key.replace(/\.[^.]+$/, "");
}

export default function GalleryClient({ images }: GalleryClientProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const selectedImage = selected === null ? null : images[selected];
  const selectedPosition = selected === null ? 0 : selected + 1;

  useEffect(() => {
    if (selected === null) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSelected(null);
      if (event.key === "ArrowLeft") {
        setSelected((current) =>
          current === null ? null : (current - 1 + images.length) % images.length
        );
      }
      if (event.key === "ArrowRight") {
        setSelected((current) => (current === null ? null : (current + 1) % images.length));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, images.length]);

  useEffect(() => {
    if (selected !== null) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
    return undefined;
  }, [selected]);

  return (
    <>
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
        {images.map((img, index) => {
          const globalIndex = index;
          return (
            <button
              key={img.key}
              type="button"
              onClick={() => setSelected(globalIndex)}
              className="group relative block w-full break-inside-avoid cursor-pointer overflow-hidden rounded-sm border border-brand-muted/20 text-left transition-all duration-300 hover:border-brand-muted/60"
            >
              <Image
                src={img.url}
                alt={label(img.key)}
                width={1600}
                height={1067}
                quality={68}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                priority={globalIndex === 0}
                fetchPriority={globalIndex === 0 ? "high" : "auto"}
                className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 flex items-end bg-brand-bg/0 transition-all duration-300 group-hover:bg-brand-bg/40">
                <p className="w-full truncate px-3 py-2 text-xs font-light tracking-widest text-brand-text lowercase opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  {label(img.key)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-bg/95 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setSelected((current) =>
                current === null ? null : (current - 1 + images.length) % images.length
              );
            }}
            className="absolute left-4 z-10 select-none text-3xl text-brand-muted transition-colors duration-200 hover:text-brand-accent md:left-8"
            aria-label="previous"
          >
            ←
          </button>

          <div
            className="flex flex-col items-center"
            style={{ width: "calc(100vw - 120px)", maxHeight: "100vh", padding: "20px 0" }}
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              src={selectedImage.url}
              alt={label(selectedImage.key)}
              width={1920}
              height={1280}
              quality={80}
              sizes="(max-width: 1024px) 92vw, 80vw"
              className="max-w-full rounded-[4px] object-contain"
              style={{ maxHeight: "calc(100vh - 72px)" }}
            />
            <p className="mt-3 text-center text-sm font-light tracking-widest text-brand-muted lowercase">
              {label(selectedImage.key)}
              <span className="ml-4 text-brand-muted/50">
                {selectedPosition} / {images.length}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setSelected((current) => (current === null ? null : (current + 1) % images.length));
            }}
            className="absolute right-4 z-10 select-none text-3xl text-brand-muted transition-colors duration-200 hover:text-brand-accent md:right-8"
            aria-label="next"
          >
            →
          </button>

          <button
            type="button"
            onClick={() => setSelected(null)}
            className="absolute right-6 top-6 text-xl text-brand-muted transition-colors duration-200 hover:text-brand-accent"
            aria-label="close"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
