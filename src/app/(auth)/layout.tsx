import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen flex items-center justify-center px-6 py-16">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, #1C1208 0%, #0D0B09 55%, #080705 100%)",
        }}
      />
      <div className="w-full max-w-sm flex flex-col gap-10">
        <Link href="/" className="flex flex-col gap-1 items-center text-center">
          <span className="font-serif font-light italic text-stone-100 text-2xl">
            Love That For You
          </span>
          <span className="text-[9px] tracking-[0.3em] uppercase font-sans text-stone-500">
            Property Story Engine
          </span>
        </Link>
        {children}
      </div>
    </main>
  );
}
