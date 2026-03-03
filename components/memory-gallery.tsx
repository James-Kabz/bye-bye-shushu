"use client";

import { useMemo, useState } from "react";
import type { Memory } from "@/lib/types";

type MemoryGalleryProps = {
  memories: Memory[];
  loadError: string;
};

type ExpandedPhoto = {
  memoryTitle: string;
  category: string;
  createdAt: string;
  imageData: string;
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(iso));
}

export function MemoryGallery({ memories, loadError }: MemoryGalleryProps) {
  const [expanded, setExpanded] = useState<ExpandedPhoto | null>(null);

  const memoryCountText = useMemo(() => `${memories.length} shared`, [memories.length]);

  return (
    <section className="animate-rise rounded-3xl border border-amber-100 bg-white/80 p-6 shadow-halo backdrop-blur [animation-delay:120ms]">
      {loadError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Database issue: {loadError}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl text-ink">Memory gallery</h2>
        <span className="rounded-full bg-ember/10 px-3 py-1 text-xs font-semibold text-ember">{memoryCountText}</span>
      </div>

      {memories.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-amber-200 bg-white p-8 text-center text-sm text-amber-900/75">
          No photos yet. Add the first memory of Shushu.
        </div>
      ) : (
        <div className="memory-scroll mt-5 grid max-h-[68vh] gap-4 overflow-y-auto pr-2 md:grid-cols-2">
          {memories.map((memory) => (
            <article
              key={memory.id}
              className="group overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="grid grid-cols-2 gap-1 bg-amber-50 p-1">
                {memory.photos.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() =>
                      setExpanded({
                        memoryTitle: memory.title,
                        category: memory.category,
                        createdAt: memory.createdAt,
                        imageData: photo.imageData
                      })
                    }
                    className="relative overflow-hidden rounded-lg"
                  >
                    <img
                      src={photo.imageData}
                      alt={memory.title}
                      className="max-w-full transition duration-700 group-hover:scale-105"
                      style={{
                        transform: `scale(${photo.zoom}) rotate(${photo.rotation}deg)`,
                        width: "100%",
                        height: "170px",
                        objectFit: "cover"
                      }}
                    />
                  </button>
                ))}
              </div>

              <div className="space-y-2 p-4">
                <p className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-950/80">
                  {memory.category}
                </p>
                <h3 className="text-xl leading-tight text-ink">{memory.title}</h3>
                {memory.story ? <p className="text-sm text-amber-950/80">{memory.story}</p> : null}
                <p className="pt-1 text-xs font-medium uppercase tracking-[0.1em] text-amber-900/55">
                  Shared on {formatDate(memory.createdAt)} • {memory.photos.length} photos
                </p>
              </div>
            </article>
          ))}
        </div>
      )}

      {expanded ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={() => setExpanded(null)}>
          <div
            className="w-full max-w-5xl rounded-2xl bg-white p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ember">{expanded.category}</p>
                <h3 className="text-xl text-ink">{expanded.memoryTitle}</h3>
                <p className="text-sm text-amber-900/70">{formatDate(expanded.createdAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(null)}
                className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-amber-900"
              >
                Close
              </button>
            </div>
            <div className="flex max-h-[80vh] items-center justify-center overflow-auto rounded-xl bg-amber-50 p-3">
              <img src={expanded.imageData} alt={expanded.memoryTitle} className="max-w-full object-contain" />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
