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

async function downloadImage(url: string, filename: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

export default function GalleryClient({ images }: GalleryClientProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const selectedImage = selected === null ? null : images[selected];
  const selectedPosition = selected === null ? 0 : selected + 1;

  async function handleDownload() {
    if (!selectedImage || downloading) return;
    setDownloading(true);
    try {
      await downloadImage(selectedImage.url, selectedImage.key);
    } finally {
      setDownloading(false);
    }
  }

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
          className="fixed inset-0 z-50 bg-brand-bg/95 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="absolute right-6 top-6 z-10 text-xl text-brand-muted transition-colors duration-200 hover:text-brand-accent"
            aria-label="close"
          >
            ✕
          </button>

          {/* Mobile layout: image fills viewport, nav below */}
          <div className="flex h-full flex-col md:hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-1 items-center justify-center overflow-hidden px-4 pt-14 pb-4">
              <Image
                src={selectedImage.url}
                alt={label(selectedImage.key)}
                width={1920}
                height={1280}
                quality={80}
                sizes="100vw"
                className="max-h-full w-full rounded-[4px] object-contain"
                style={{ maxHeight: "calc(100dvh - 160px)" }}
              />
            </div>
            <div className="flex items-center justify-between px-8 pb-10">
              <button
                type="button"
                onClick={() =>
                  setSelected((current) =>
                    current === null ? null : (current - 1 + images.length) % images.length
                  )
                }
                className="select-none text-3xl text-brand-muted transition-colors duration-200 active:text-brand-accent"
                aria-label="previous"
              >
                ←
              </button>
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-sm font-light tracking-widest text-brand-muted lowercase">
                  {label(selectedImage.key)}
                </p>
                <p className="text-xs text-brand-muted/50">
                  {selectedPosition} / {images.length}
                </p>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="mt-1 select-none text-brand-muted/60 transition-colors duration-200 active:text-brand-accent disabled:opacity-40"
                  aria-label="download"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v13M7 11l5 5 5-5M5 21h14" />
                  </svg>
                </button>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSelected((current) =>
                    current === null ? null : (current + 1) % images.length
                  )
                }
                className="select-none text-3xl text-brand-muted transition-colors duration-200 active:text-brand-accent"
                aria-label="next"
              >
                →
              </button>
            </div>
          </div>

          {/* Desktop layout: centered with side arrows */}
          <div className="hidden h-full items-center justify-center md:flex">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setSelected((current) =>
                  current === null ? null : (current - 1 + images.length) % images.length
                );
              }}
              className="absolute left-8 z-10 select-none text-3xl text-brand-muted transition-colors duration-200 hover:text-brand-accent"
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
                sizes="80vw"
                className="max-w-full rounded-[4px] object-contain"
                style={{ maxHeight: "calc(100vh - 72px)" }}
              />
              <div className="mt-3 flex items-center gap-4">
                <p className="text-center text-sm font-light tracking-widest text-brand-muted lowercase">
                  {label(selectedImage.key)}
                  <span className="ml-4 text-brand-muted/50">
                    {selectedPosition} / {images.length}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="select-none text-brand-muted/60 transition-colors duration-200 hover:text-brand-accent disabled:opacity-40"
                  aria-label="download"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v13M7 11l5 5 5-5M5 21h14" />
                  </svg>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setSelected((current) =>
                  current === null ? null : (current + 1) % images.length
                );
              }}
              className="absolute right-8 z-10 select-none text-3xl text-brand-muted transition-colors duration-200 hover:text-brand-accent"
              aria-label="next"
            >
              →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
