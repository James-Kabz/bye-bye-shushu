import { MemoryForm } from "@/components/memory-form";
import { listMemories } from "@/lib/memories";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(iso));
}

export default async function HomePage() {
  const memories = await listMemories();

  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-20 pt-12 md:px-8">
      <div className="pointer-events-none absolute -left-20 top-24 h-56 w-56 animate-drift rounded-full bg-haze/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-14 top-40 h-44 w-44 animate-drift rounded-full bg-glow/50 blur-3xl [animation-delay:1.2s]" />

      <div className="mx-auto w-full max-w-6xl">
        <section className="mb-8 rounded-3xl border border-amber-100 bg-white/75 p-7 shadow-halo backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ember">Bye-Bye Shushu</p>
          <h1 className="mt-2 text-4xl text-ink md:text-5xl">A living wall of grandmother&apos;s memories</h1>
          <p className="mt-3 max-w-3xl text-base text-amber-950/85">
            The eulogy cannot hold every photo, but this memorial can. Share moments, add context, and let
            family and friends revisit her story together.
          </p>
        </section>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_1.35fr]">
          <MemoryForm />

          <section className="animate-rise rounded-3xl border border-amber-100 bg-white/80 p-6 shadow-halo backdrop-blur [animation-delay:120ms]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl text-ink">Memory gallery</h2>
              <span className="rounded-full bg-ember/10 px-3 py-1 text-xs font-semibold text-ember">
                {memories.length} shared
              </span>
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
                    <div className="relative h-56 overflow-hidden bg-amber-50">
                      <img
                        src={memory.imageData}
                        alt={memory.title}
                        className="absolute left-1/2 top-1/2 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                        style={{
                          transform: `translate(-50%, -50%) scale(${memory.zoom}) rotate(${memory.rotation}deg)`
                        }}
                      />
                    </div>

                    <div className="space-y-2 p-4">
                      <p className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-950/80">
                        {memory.category}
                      </p>
                      <h3 className="text-xl leading-tight text-ink">{memory.title}</h3>
                      {memory.story ? <p className="text-sm text-amber-950/80">{memory.story}</p> : null}
                      <p className="pt-1 text-xs font-medium uppercase tracking-[0.1em] text-amber-900/55">
                        Shared on {formatDate(memory.createdAt)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
