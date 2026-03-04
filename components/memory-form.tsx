"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MemorySummary } from "@/lib/types";

const categoryOptions = [
  "Grandma and her GrandKids",
  "Shushu and her Kids",
  "Family Gatherings",
  "Church Moments",
  "Special Days",
  "Other"
] as const;

type SaveState = "idle" | "saving" | "error";
type FormMode = "new" | "append";

type EditablePhoto = {
  id: string;
  name: string;
  imageData: string;
  zoom: number;
  rotation: number;
};

type MemoryFormProps = {
  canPostInitial: boolean;
  existingMemories: MemorySummary[];
};

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

export function MemoryForm({ canPostInitial, existingMemories }: MemoryFormProps) {
  const router = useRouter();
  const [canPost, setCanPost] = useState(canPostInitial);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginStatus, setLoginStatus] = useState<"idle" | "loading" | "error">("idle");
  const [loginMessage, setLoginMessage] = useState("");

  const [formMode, setFormMode] = useState<FormMode>("new");
  const [selectedMemoryId, setSelectedMemoryId] = useState(existingMemories[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<(typeof categoryOptions)[number]>(categoryOptions[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [story, setStory] = useState("");
  const [photos, setPhotos] = useState<EditablePhoto[]>([]);
  const [activePhotoId, setActivePhotoId] = useState("");
  const [status, setStatus] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");

  const finalCategory = useMemo(() => {
    if (category === "Other") {
      return customCategory.trim();
    }
    return category;
  }, [category, customCategory]);

  const selectedMemory = useMemo(
    () => existingMemories.find((memory) => memory.id === selectedMemoryId) ?? null,
    [existingMemories, selectedMemoryId]
  );

  useEffect(() => {
    if (selectedMemoryId && existingMemories.some((memory) => memory.id === selectedMemoryId)) {
      return;
    }

    setSelectedMemoryId(existingMemories[0]?.id ?? "");
  }, [existingMemories, selectedMemoryId]);

  const activePhoto = useMemo(() => {
    if (photos.length === 0) {
      return null;
    }

    return photos.find((photo) => photo.id === activePhotoId) ?? photos[0];
  }, [activePhotoId, photos]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginStatus("loading");
    setLoginMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password: loginPassword })
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "Login failed.");
      }

      setCanPost(true);
      setLoginPassword("");
      setLoginStatus("idle");
      setLoginMessage("");
      router.refresh();
    } catch (error) {
      setLoginStatus("error");
      setLoginMessage(error instanceof Error ? error.message : "Login failed.");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setCanPost(false);
    setLoginStatus("idle");
    setLoginMessage("Logged out. Login again to post photos.");
  }

  async function handleImageSelect(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      return;
    }

    try {
      setStatus("idle");
      setMessage("");

      const selectedFiles = Array.from(fileList).slice(0, 24);
      const generatedPhotos: EditablePhoto[] = [];

      for (const file of selectedFiles) {
        if (!file.type.startsWith("image/")) {
          throw new Error("Only image files are allowed.");
        }

        const optimized = await optimizeImage(file);
        generatedPhotos.push({
          id: crypto.randomUUID(),
          name: file.name,
          imageData: optimized,
          zoom: 1.1,
          rotation: 0
        });
      }

      setPhotos((previous) => {
        const merged = [...previous, ...generatedPhotos].slice(0, 24);
        if (!activePhotoId && merged[0]) {
          setActivePhotoId(merged[0].id);
        }
        return merged;
      });
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not process selected photos.");
    }
  }

  function patchActivePhoto(patch: Partial<EditablePhoto>) {
    if (!activePhoto) {
      return;
    }

    setPhotos((previous) =>
      previous.map((photo) => {
        if (photo.id !== activePhoto.id) {
          return photo;
        }
        return {
          ...photo,
          ...patch
        };
      })
    );
  }

  function removePhoto(photoId: string) {
    setPhotos((previous) => {
      const next = previous.filter((photo) => photo.id !== photoId);
      if (next.length === 0) {
        setActivePhotoId("");
      } else if (activePhotoId === photoId) {
        setActivePhotoId(next[0].id);
      }
      return next;
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (photos.length === 0) {
      setStatus("error");
      setMessage("Please choose at least one memory photo.");
      return;
    }

    if (formMode === "new" && !finalCategory) {
      setStatus("error");
      setMessage("Please provide a category.");
      return;
    }

    if (formMode === "append" && !selectedMemoryId) {
      setStatus("error");
      setMessage("Please choose a saved category.");
      return;
    }

    setStatus("saving");
    setMessage("");

    try {
      const photosPayload = photos.map((photo) => ({
        imageData: photo.imageData,
        zoom: photo.zoom,
        rotation: photo.rotation
      }));

      const requestBody =
        formMode === "append"
          ? {
              appendToMemoryId: selectedMemoryId,
              photos: photosPayload
            }
          : {
              title,
              category: finalCategory,
              story,
              photos: photosPayload
            };

      const response = await fetch("/api/memories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      const responseBody = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(responseBody.message ?? "Could not save memory.");
      }

      setTitle("");
      setCategory(categoryOptions[0]);
      setCustomCategory("");
      setStory("");
      setPhotos([]);
      setActivePhotoId("");
      setStatus("idle");
      setMessage(
        formMode === "append"
          ? "Photos added to the selected saved category."
          : "Memory posted with all selected photos."
      );
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not save memory.");
    }
  }

  if (!canPost) {
    return (
      <section className="animate-rise rounded-3xl border border-amber-100 bg-white/85 p-6 shadow-halo backdrop-blur">
        <h2 className="text-2xl font-semibold text-ink">Contributor login</h2>
        <p className="mt-1 text-sm text-amber-900/80">
          Family can view memories. Enter the posting password to add photos.
        </p>

        <form className="mt-4 space-y-3" onSubmit={handleLogin}>
          <label className="flex flex-col gap-2 text-sm font-medium text-ink">
            Posting password
            <input
              type="password"
              required
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/20"
              placeholder="Enter family password"
            />
          </label>
          <button
            type="submit"
            disabled={loginStatus === "loading"}
            className="inline-flex items-center rounded-xl bg-ember px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c94d43] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loginStatus === "loading" ? "Checking..." : "Login to post"}
          </button>
        </form>

        {loginMessage ? (
          <p className={`mt-3 text-sm ${loginStatus === "error" ? "text-red-600" : "text-emerald-700"}`}>
            {loginMessage}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="animate-rise rounded-3xl border border-amber-100 bg-white/80 p-6 shadow-halo backdrop-blur"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Add a magical memory</h2>
          <p className="mt-1 text-sm text-amber-900/80">
            Create a new memory or add more photos to an existing saved category.
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-amber-900 transition hover:bg-amber-50"
        >
          Logout
        </button>
      </div>

      {existingMemories.length > 0 ? (
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setFormMode("new")}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              formMode === "new"
                ? "border-ember bg-ember/10 text-ember"
                : "border-amber-200 bg-white text-amber-900 hover:bg-amber-50"
            }`}
          >
            Create new memory
          </button>
          <button
            type="button"
            onClick={() => setFormMode("append")}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              formMode === "append"
                ? "border-ember bg-ember/10 text-ember"
                : "border-amber-200 bg-white text-amber-900 hover:bg-amber-50"
            }`}
          >
            Add photos to saved category
          </button>
        </div>
      ) : null}

      {formMode === "append" ? (
        <div className="mt-5 space-y-3">
          <label className="flex flex-col gap-2 text-sm font-medium text-ink">
            Saved category
            <select
              value={selectedMemoryId}
              onChange={(event) => setSelectedMemoryId(event.target.value)}
              className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/20"
            >
              {existingMemories.map((memory) => (
                <option key={memory.id} value={memory.id}>
                  {memory.category} - {memory.title}
                </option>
              ))}
            </select>
          </label>

          {selectedMemory ? (
            <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900/85">
              Adding to <span className="font-semibold">{selectedMemory.category}</span> ({selectedMemory.photoCount}{" "}
              photos already)
            </p>
          ) : null}
        </div>
      ) : (
        <>
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
        </>
      )}

      <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-ink">
        Choose photos (you can pick many)
        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          multiple
          onChange={(event) => handleImageSelect(event.target.files)}
          className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-ember/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ember"
        />
      </label>

      {photos.length > 0 ? (
        <div className="mt-4 grid max-h-44 grid-cols-3 gap-2 overflow-y-auto rounded-xl border border-amber-100 bg-amber-50 p-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative rounded-lg border border-amber-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setActivePhotoId(photo.id)}
                className={`block w-full overflow-hidden rounded-md ${
                  activePhoto?.id === photo.id ? "ring-2 ring-ember" : ""
                }`}
              >
                <img src={photo.imageData} alt={photo.name} className="max-w-full rounded-md" />
              </button>
              <button
                type="button"
                onClick={() => removePhoto(photo.id)}
                className="absolute right-1 top-1 rounded bg-white/90 px-1.5 py-0.5 text-xs font-semibold text-red-700"
              >
                x
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-b from-white to-amber-50 p-4">
        <div className="relative h-72 overflow-hidden rounded-xl border border-dashed border-amber-200 bg-white">
          {activePhoto ? (
            <img
              src={activePhoto.imageData}
              alt="Selected memory"
              className="absolute left-1/2 top-1/2 max-w-full object-cover"
              style={{
                transform: `translate(-50%, -50%) scale(${activePhoto.zoom}) rotate(${activePhoto.rotation}deg)`,
                width: "100%",
                height: "100%"
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-amber-900/70">
              Photo preview appears here.
            </div>
          )}
        </div>

        {activePhoto ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              Zoom: {activePhoto.zoom.toFixed(2)}x
              <input
                type="range"
                min={1}
                max={2.8}
                step={0.01}
                value={activePhoto.zoom}
                onChange={(event) => patchActivePhoto({ zoom: Number(event.target.value) })}
                className="mt-2 w-full accent-ember"
              />
            </label>
            <label className="text-sm font-medium text-ink">
              Rotation: {activePhoto.rotation} deg
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={activePhoto.rotation}
                onChange={(event) => patchActivePhoto({ rotation: Number(event.target.value) })}
                className="mt-2 w-full accent-ember"
              />
            </label>
          </div>
        ) : null}
      </div>

      {message ? (
        <p className={`mt-4 text-sm ${status === "error" ? "text-red-600" : "text-emerald-700"}`}>{message}</p>
      ) : null}

      <button
        type="submit"
        disabled={status === "saving"}
        className="mt-5 inline-flex items-center rounded-xl bg-ember px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c94d43] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "saving"
          ? formMode === "append"
            ? "Adding photos..."
            : "Saving memory..."
          : formMode === "append"
            ? "Add photos"
            : "Post memory"}
      </button>
    </form>
  );
}
