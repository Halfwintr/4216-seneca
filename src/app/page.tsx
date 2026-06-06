import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative min-h-screen flex flex-col">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% 20%, #1C1208 0%, #0D0B09 55%, #080705 100%)",
        }}
      />

      {/* Top bar */}
      <header className="px-6 md:px-12 py-6 flex items-center justify-between">
        <span className="font-serif font-light italic text-stone-100 text-lg">
          Love That For You
        </span>
        <nav className="flex items-center gap-5">
          <Link
            href="/login"
            className="font-sans font-light text-xs tracking-[0.14em] uppercase text-stone-400 hover:text-stone-100 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-full border border-amber-warm/50 px-5 py-2 font-sans font-light text-xs tracking-[0.12em] text-stone-100 transition-all duration-300 hover:bg-amber-warm/10 hover:border-amber-warm/80"
          >
            Get started
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-8 py-24">
        <p className="text-[10px] tracking-[0.3em] uppercase font-sans font-light text-stone-300/60">
          Property Story Engine
        </p>
        <h1
          className="font-serif font-light italic text-stone-50 leading-[1.05] max-w-4xl"
          style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}
        >
          Transform ordinary listing photos into immersive cinematic property
          stories.
        </h1>
        <p className="font-sans font-light text-stone-300/75 leading-relaxed max-w-xl text-base md:text-lg">
          High-end property marketing from assets agents already have. Upload
          photos and details — get a narrative-driven landing page, ready to
          share.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
          <Link
            href="/signup"
            className="rounded-full border border-amber-warm/60 px-8 py-3 font-sans font-light text-sm tracking-[0.12em] text-stone-100 transition-all duration-300 hover:bg-amber-warm/10 hover:border-amber-warm"
          >
            Create your first listing
          </Link>
          <Link
            href="/l/4216-seneca"
            className="inline-flex items-center gap-2 font-sans font-light text-xs tracking-[0.14em] uppercase text-stone-400 hover:text-stone-200 transition-colors"
          >
            <span>See an example</span>
            <span className="text-amber-warm/70">→</span>
          </Link>
        </div>
      </section>

      <footer className="px-6 md:px-12 py-6 border-t border-stone-800/50 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="font-serif font-light italic text-stone-500 text-sm">
          lovethatforyou.app
        </p>
        <p className="text-[9px] tracking-[0.2em] uppercase font-sans text-stone-600">
          © {new Date().getFullYear()} · Love That For You
        </p>
      </footer>
    </main>
  );
}
