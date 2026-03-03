"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const categoryOptions = [
  "Grandma and her GrandKids",
  "Shushu and her Kids",
  "Family Gatherings",
  "Church Moments",
  "Special Days",
  "Other"
] as const;

type SaveState = "idle" | "saving" | "error";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Unable to read image."));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error("Unable to read image."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image."));
    image.src = src;
  });
}

async function optimizeImage(file: File): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
  const image = await loadImage(dataUrl);
  const maxSide = 1600;
  const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to process image.");
  }

  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.88);
}

export function MemoryForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<(typeof categoryOptions)[number]>(categoryOptions[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [story, setStory] = useState("");
  const [imageData, setImageData] = useState("");
  const [zoom, setZoom] = useState(1.1);
  const [rotation, setRotation] = useState(0);
  const [status, setStatus] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");

  const finalCategory = useMemo(() => {
    if (category === "Other") {
      return customCategory.trim();
    }
    return category;
  }, [category, customCategory]);

  async function handleImageSelect(file: File | null) {
    if (!file) {
      setImageData("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setStatus("error");
      setMessage("Please choose an image file.");
      return;
    }

    try {
      setStatus("idle");
      setMessage("");
      const optimized = await optimizeImage(file);
      setImageData(optimized);
    } catch (error) {
      console.error(error);
      setStatus("error");
      setMessage("Could not process this image. Try a different one.");
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!finalCategory) {
      setStatus("error");
      setMessage("Please provide a category.");
      return;
    }

    if (!imageData) {
      setStatus("error");
      setMessage("Please choose a memory photo first.");
      return;
    }

    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch("/api/memories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title,
          category: finalCategory,
          story,
          imageData,
          zoom,
          rotation
        })
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "Could not save memory.");
      }

      setTitle("");
      setCategory(categoryOptions[0]);
      setCustomCategory("");
      setStory("");
      setImageData("");
      setZoom(1.1);
      setRotation(0);
      setStatus("idle");
      setMessage("Memory posted. Family and friends can now see it.");
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not save memory.");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="animate-rise rounded-3xl border border-amber-100 bg-white/80 p-6 shadow-halo backdrop-blur"
    >
      <h2 className="text-2xl font-semibold text-ink">Add a magical memory</h2>
      <p className="mt-1 text-sm text-amber-900/80">
        Upload a photo, adjust how it fits, and add a title + category everyone can browse.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium text-ink">
          Memory title
          <input
            required
            minLength={2}
            maxLength={120}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Grandma and her GrandKids"
            className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/20"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-ink">
          Category
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as (typeof categoryOptions)[number])}
            className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/20"
          >
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      {category === "Other" ? (
        <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-ink">
          Custom category
          <input
            required
            minLength={2}
            maxLength={80}
            value={customCategory}
            onChange={(event) => setCustomCategory(event.target.value)}
            placeholder="Shushu and her nieces"
            className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/20"
          />
        </label>
      ) : null}

      <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-ink">
        Memory story (optional)
        <textarea
          value={story}
          onChange={(event) => setStory(event.target.value)}
          maxLength={3000}
          rows={4}
          placeholder="Tell everyone what made this day special..."
          className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/20"
        />
      </label>

      <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-ink">
        Choose photo
        <input
          required
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={(event) => handleImageSelect(event.target.files?.[0] ?? null)}
          className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-ember/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ember"
        />
      </label>

      <div className="mt-5 overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-b from-white to-amber-50 p-4">
        <div className="relative h-72 overflow-hidden rounded-xl border border-dashed border-amber-200 bg-white">
          {imageData ? (
            <img
              src={imageData}
              alt="Selected memory"
              className="absolute left-1/2 top-1/2 h-full w-full object-cover"
              style={{
                transform: `translate(-50%, -50%) scale(${zoom}) rotate(${rotation}deg)`
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-amber-900/70">
              Photo preview appears here.
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-ink">
            Zoom: {zoom.toFixed(2)}x
            <input
              type="range"
              min={1}
              max={2.8}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="mt-2 w-full accent-ember"
            />
          </label>
          <label className="text-sm font-medium text-ink">
            Rotation: {rotation} deg
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={rotation}
              onChange={(event) => setRotation(Number(event.target.value))}
              className="mt-2 w-full accent-ember"
            />
          </label>
        </div>
      </div>

      {message ? (
        <p className={`mt-4 text-sm ${status === "error" ? "text-red-600" : "text-emerald-700"}`}>{message}</p>
      ) : null}

      <button
        type="submit"
        disabled={status === "saving"}
        className="mt-5 inline-flex items-center rounded-xl bg-ember px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c94d43] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "saving" ? "Saving memory..." : "Post memory"}
      </button>
    </form>
  );
}
