"use client";

import { useState } from "react";
import { DownloadIcon } from "@/components/ui/DownloadIcon";

interface Props {
  url: string;
  filename: string;
}

export default function DownloadButton({ url, filename }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="text-brand-muted/60 transition-colors duration-200 hover:text-brand-accent disabled:opacity-40"
      aria-label="download image"
    >
      <DownloadIcon size={18} />
    </button>
  );
}
