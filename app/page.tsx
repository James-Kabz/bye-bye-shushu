import { MemoryForm } from "@/components/memory-form";
import { MemoryGallery } from "@/components/memory-gallery";
import { isPostAuthenticated } from "@/lib/auth";
import { getErrorMessage } from "@/lib/error-utils";
import { listMemories } from "@/lib/memories";
import type { Memory, MemorySummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let memories: Memory[] = [];
  let loadError = "";

  try {
    memories = await listMemories();
  } catch (error) {
    loadError = getErrorMessage(error);
    console.error("HomePage listMemories failed:", error);
  }

  const canPost = await isPostAuthenticated();
  const existingMemories: MemorySummary[] = memories.map((memory) => ({
    id: memory.id,
    title: memory.title,
    category: memory.category,
    photoCount: memory.photos.length
  }));

  return (
    <main className="max-w-full relative min-h-screen overflow-hidden px-4 pb-20 pt-12 md:px-8">
      <div className="pointer-events-none absolute -left-20 top-24 h-56 w-56 animate-drift rounded-full bg-haze/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-14 top-40 h-44 w-44 animate-drift rounded-full bg-glow/50 blur-3xl [animation-delay:1.2s]" />

      <div className="mx-auto w-full max-w-8xl">
        <section className="mb-8 rounded-3xl border border-amber-100 bg-white/75 p-7 shadow-halo backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ember">Bye-Bye Shushu</p>
          <h1 className="mt-2 text-4xl text-ink md:text-5xl">A living wall of grandmother&apos;s memories</h1>
          <p className="mt-3 max-w-3xl text-base text-amber-950/85">
            The eulogy cannot hold every photo, but this memorial can. Share moments, add context, and let
            family and friends revisit her story together.
          </p>
        </section>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_1.35fr]">
          <MemoryForm canPostInitial={canPost} existingMemories={existingMemories} />
          <MemoryGallery memories={memories} loadError={loadError} canManage={canPost} />
        </div>
      </div>
    </main>
  );
}
