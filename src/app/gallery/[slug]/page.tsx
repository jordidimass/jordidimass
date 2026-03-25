import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getGalleryImages, slugFromKey } from "@/lib/gallery";
import DownloadButton from "./DownloadButton";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const images = await getGalleryImages();
  return images.map((img) => ({ slug: slugFromKey(img.key) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const images = await getGalleryImages();
  const image = images.find((img) => slugFromKey(img.key) === slug);
  return {
    title: `${slug} — gallery`,
    openGraph: image ? { images: [{ url: image.url }] } : undefined,
  };
}

function label(key: string): string {
  return key.replace(/\.[^.]+$/, "");
}

export default async function ImagePage({ params }: Props) {
  const { slug } = await params;
  const images = await getGalleryImages();
  const index = images.findIndex((img) => slugFromKey(img.key) === slug);

  if (index === -1) notFound();

  const image = images[index];
  const prev = index > 0 ? images[index - 1] : null;
  const next = index < images.length - 1 ? images[index + 1] : null;

  return (
    <div className="flex min-h-screen flex-col bg-brand-bg text-brand-text">
      {/* Top nav */}
      <nav className="flex items-center justify-between px-6 pb-0 pt-6">
        <Link
          href="/gallery"
          className="text-xs tracking-widest text-brand-muted lowercase transition-colors duration-200 hover:text-brand-accent"
        >
          ← gallery
        </Link>
        <span className="text-xs text-brand-muted/50">
          {index + 1} / {images.length}
        </span>
        <div className="flex gap-6">
          {prev ? (
            <Link
              href={`/gallery/${slugFromKey(prev.key)}`}
              className="text-xs tracking-widest text-brand-muted lowercase transition-colors duration-200 hover:text-brand-accent"
            >
              ← prev
            </Link>
          ) : (
            <span className="w-[3.5rem]" />
          )}
          {next ? (
            <Link
              href={`/gallery/${slugFromKey(next.key)}`}
              className="text-xs tracking-widest text-brand-muted lowercase transition-colors duration-200 hover:text-brand-accent"
            >
              next →
            </Link>
          ) : (
            <span className="w-[3rem]" />
          )}
        </div>
      </nav>

      {/* Image — highest quality via Next.js optimization */}
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <Image
          src={image.url}
          alt={label(image.key)}
          width={1920}
          height={1280}
          quality={92}
          sizes="(max-width: 768px) 100vw, 90vw"
          priority
          className="max-h-[80vh] w-auto max-w-full rounded-[4px] object-contain"
        />
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-center gap-3 pb-10">
        <p className="text-sm font-light tracking-widest text-brand-muted lowercase">
          {label(image.key)}
        </p>
        <DownloadButton url={image.url} filename={image.key} />
      </footer>
    </div>
  );
}
