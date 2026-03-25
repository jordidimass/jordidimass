"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";

const WORKER_URL = process.env.NEXT_PUBLIC_GALLERY_WORKER_URL ?? "";

interface GalleryImage {
  key: string;
  size: number;
  uploaded: string;
  url: string;
}

interface LightboxProps {
  image: GalleryImage;
  total: number;
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

function label(key: string): string {
  return key.replace(/\.[^.]+$/, "");
}

function Lightbox({ image, total, index, onClose, onPrev, onNext }: LightboxProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onPrev, onNext]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-bg/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        className="absolute left-4 md:left-8 text-brand-muted hover:text-brand-accent transition-colors duration-200 text-3xl select-none z-10"
        aria-label="previous"
      >
        ←
      </button>

      <motion.div
        key={image.key}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center"
        style={{ width: "calc(100vw - 120px)", maxHeight: "100vh", padding: "20px 0" }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={image.url}
          alt={label(image.key)}
          style={{
            maxWidth: "100%",
            maxHeight: "calc(100vh - 72px)",
            objectFit: "contain",
            borderRadius: "4px",
          }}
        />
        <p className="mt-3 text-center text-brand-muted font-light tracking-widest text-sm lowercase">
          {label(image.key)}
          <span className="ml-4 text-brand-muted/50">{index + 1} / {total}</span>
        </p>
      </motion.div>

      <button
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        className="absolute right-4 md:right-8 text-brand-muted hover:text-brand-accent transition-colors duration-200 text-3xl select-none z-10"
        aria-label="next"
      >
        →
      </button>

      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-brand-muted hover:text-brand-accent transition-colors duration-200 text-xl"
        aria-label="close"
      >
        ✕
      </button>
    </motion.div>
  );
}

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (!WORKER_URL) {
      setError("gallery worker url not configured");
      setLoading(false);
      return;
    }
    fetch(WORKER_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json() as Promise<{ images: GalleryImage[] }>;
      })
      .then((data) => {
        setImages(data.images);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message ?? "failed to load gallery");
        setLoading(false);
      });
  }, []);

  const openLightbox = useCallback((index: number) => setSelected(index), []);
  const closeLightbox = useCallback(() => setSelected(null), []);
  const prevImage = useCallback(() =>
    setSelected((i) => (i === null ? null : (i - 1 + images.length) % images.length)),
    [images.length]
  );
  const nextImage = useCallback(() =>
    setSelected((i) => (i === null ? null : (i + 1) % images.length)),
    [images.length]
  );

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text pt-24 pb-24 px-8">
      <div className="max-w-6xl mx-auto space-y-16">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-4"
        >
          <h1 className="text-4xl font-light tracking-widest font-serif text-brand-accent">
            gallery
          </h1>
        </motion.section>

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 text-brand-muted font-light tracking-widest"
          >
            <span className="inline-block w-1 h-4 bg-brand-accent animate-pulse" />
            loading
          </motion.div>
        )}

        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 border border-brand-muted/40 rounded-lg text-brand-muted font-light"
          >
            {error}
          </motion.div>
        )}

        {!loading && !error && images.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4"
          >
            {images.map((img, index) => (
              <motion.div
                key={img.key}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.04 }}
                className="group relative break-inside-avoid cursor-pointer overflow-hidden rounded-sm border border-brand-muted/20 hover:border-brand-muted/60 transition-all duration-300"
                onClick={() => openLightbox(index)}
              >
                <img
                  src={img.url}
                  alt={label(img.key)}
                  className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-brand-bg/0 group-hover:bg-brand-bg/40 transition-all duration-300 flex items-end">
                  <p className="w-full px-3 py-2 text-xs font-light tracking-widest text-brand-text lowercase opacity-0 group-hover:opacity-100 transition-opacity duration-300 truncate">
                    {label(img.key)}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {!loading && !error && images.length === 0 && (
          <p className="text-brand-muted font-light tracking-widest">no images yet</p>
        )}
      </div>

      <AnimatePresence>
        {selected !== null && images[selected] && (
          <Lightbox
            image={images[selected]}
            total={images.length}
            index={selected}
            onClose={closeLightbox}
            onPrev={prevImage}
            onNext={nextImage}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
