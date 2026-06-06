import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; registered?: string }>;
}) {
  const { redirect: redirectTo, registered } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex flex-col gap-7">
      <h1 className="font-serif font-light italic text-stone-50 text-3xl text-center">
        Welcome back
      </h1>
      <AuthForm
        mode="signin"
        redirectTo={redirectTo}
        notice={
          registered
            ? "Account created. If email confirmation is enabled, confirm your address, then sign in."
            : undefined
        }
      />
    </div>
  );
}
