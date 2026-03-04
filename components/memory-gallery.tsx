"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TouchEvent } from "react";
import { useRouter } from "next/navigation";
import type { Memory } from "@/lib/types";

type MemoryGalleryProps = {
  memories: Memory[];
  loadError: string;
  canManage: boolean;
};

type ExpandedPhoto = {
  photoId: string;
  memoryTitle: string;
  category: string;
  createdAt: string;
  imageData: string;
  zoom: number;
  rotation: number;
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(iso));
}

export function MemoryGallery({ memories, loadError, canManage }: MemoryGalleryProps) {
  const router = useRouter();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const [deleteState, setDeleteState] = useState<"idle" | "deleting">("idle");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  const memoryCountText = useMemo(() => `${memories.length} shared`, [memories.length]);
  const expandedPhotos = useMemo<ExpandedPhoto[]>(
    () =>
      memories.flatMap((memory) =>
        memory.photos.map((photo) => ({
          photoId: photo.id,
          memoryTitle: memory.title,
          category: memory.category,
          createdAt: memory.createdAt,
          imageData: photo.imageData,
          zoom: photo.zoom,
          rotation: photo.rotation
        }))
      ),
    [memories]
  );
  const photoIndexById = useMemo(() => {
    const indexes = new Map<string, number>();
    expandedPhotos.forEach((photo, index) => indexes.set(photo.photoId, index));
    return indexes;
  }, [expandedPhotos]);
  const expanded = expandedIndex === null ? null : expandedPhotos[expandedIndex] ?? null;
  const hasMultipleExpandedPhotos = expandedPhotos.length > 1;

  function closeExpanded() {
    setExpandedIndex(null);
    setActionError("");
    setActionMessage("");
  }

  function goToPrevious() {
    setExpandedIndex((current) => {
      if (current === null || expandedPhotos.length === 0) {
        return null;
      }
      return (current - 1 + expandedPhotos.length) % expandedPhotos.length;
    });
  }

  function goToNext() {
    setExpandedIndex((current) => {
      if (current === null || expandedPhotos.length === 0) {
        return null;
      }
      return (current + 1) % expandedPhotos.length;
    });
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 1) {
      swipeStart.current = null;
      return;
    }

    const touch = event.touches[0];
    swipeStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (!hasMultipleExpandedPhotos || !swipeStart.current) {
      swipeStart.current = null;
      return;
    }

    const touch = event.changedTouches[0];
    if (!touch) {
      swipeStart.current = null;
      return;
    }

    const deltaX = touch.clientX - swipeStart.current.x;
    const deltaY = touch.clientY - swipeStart.current.y;
    swipeStart.current = null;

    const minDistance = 50;
    const horizontalDominance = Math.abs(deltaX) >= Math.abs(deltaY) * 1.2;
    if (Math.abs(deltaX) < minDistance || !horizontalDominance) {
      return;
    }

    if (deltaX < 0) {
      goToNext();
    } else {
      goToPrevious();
    }
  }

  async function handleDeleteExpandedPhoto() {
    if (!expanded || deleteState === "deleting") {
      return;
    }

    const shouldDelete = window.confirm("Delete this photo from memory gallery?");
    if (!shouldDelete) {
      return;
    }

    setDeleteState("deleting");
    setActionError("");
    setActionMessage("");

    try {
      const response = await fetch("/api/memories", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ photoId: expanded.photoId })
      });

      const body = (await response.json()) as { message?: string; remainingPhotos?: number };
      if (!response.ok) {
        throw new Error(body.message ?? "Could not delete photo.");
      }

      setDeleteState("idle");
      setActionMessage(
        body.remainingPhotos === 0
          ? "Photo deleted. That memory category has no photos left."
          : "Photo deleted successfully."
      );
      setExpandedIndex(null);
      router.refresh();
    } catch (error) {
      setDeleteState("idle");
      setActionError(error instanceof Error ? error.message : "Could not delete photo.");
    }
  }

  useEffect(() => {
    if (expandedIndex === null) {
      return;
    }

    if (expandedPhotos.length === 0) {
      setExpandedIndex(null);
      return;
    }

    if (expandedIndex > expandedPhotos.length - 1) {
      setExpandedIndex(expandedPhotos.length - 1);
    }
  }, [expandedIndex, expandedPhotos.length]);

  useEffect(() => {
    if (expandedIndex === null) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setExpandedIndex(null);
        return;
      }

      if (!hasMultipleExpandedPhotos) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setExpandedIndex((current) => {
          if (current === null || expandedPhotos.length === 0) {
            return null;
          }
          return (current - 1 + expandedPhotos.length) % expandedPhotos.length;
        });
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setExpandedIndex((current) => {
          if (current === null || expandedPhotos.length === 0) {
            return null;
          }
          return (current + 1) % expandedPhotos.length;
        });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expandedIndex, hasMultipleExpandedPhotos, expandedPhotos.length]);

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
      {actionMessage ? <p className="mt-3 text-sm text-emerald-700">{actionMessage}</p> : null}
      {actionError ? <p className="mt-3 text-sm text-red-600">{actionError}</p> : null}

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
                    onClick={() => {
                      const index = photoIndexById.get(photo.id);
                      setExpandedIndex(index ?? null);
                    }}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={closeExpanded}>
          <div
            className="w-full max-w-5xl rounded-2xl bg-white p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ember">{expanded.category}</p>
                <h3 className="text-xl text-ink">{expanded.memoryTitle}</h3>
                <p className="text-sm text-amber-900/70">
                  {formatDate(expanded.createdAt)} • {expandedIndex !== null ? expandedIndex + 1 : 1} /{" "}
                  {expandedPhotos.length}
                </p>
              </div>
              <button
                type="button"
                onClick={closeExpanded}
                className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-amber-900"
              >
                Close
              </button>
            </div>
            {canManage ? (
              <div className="mb-3">
                <button
                  type="button"
                  onClick={handleDeleteExpandedPhoto}
                  disabled={deleteState === "deleting"}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {deleteState === "deleting" ? "Deleting..." : "Delete Photo"}
                </button>
              </div>
            ) : null}
            <div
              className="relative flex max-h-[80vh] items-center justify-center overflow-auto rounded-xl bg-amber-50 p-3"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={() => {
                swipeStart.current = null;
              }}
            >
              <img
                src={expanded.imageData}
                alt={expanded.memoryTitle}
                className="max-w-full object-contain"
                style={{ transform: `scale(${expanded.zoom}) rotate(${expanded.rotation}deg)` }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
