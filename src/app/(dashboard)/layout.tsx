import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="sticky top-0 z-40 border-b border-stone-800/60 bg-stone-950/85 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex flex-col leading-tight">
            <span className="font-serif font-light italic text-stone-100 text-lg">
              Love That For You
            </span>
            <span className="text-[8px] tracking-[0.3em] uppercase font-sans text-stone-500">
              Dashboard
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/new"
              className="rounded-full border border-amber-warm/50 px-5 py-2 font-sans font-light text-xs tracking-[0.12em] text-stone-100 transition-all duration-300 hover:bg-amber-warm/10 hover:border-amber-warm/80"
            >
              New Listing
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="font-sans font-light text-xs tracking-[0.12em] uppercase text-stone-500 hover:text-stone-300 transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
