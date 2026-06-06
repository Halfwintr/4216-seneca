import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { createClient } from "@/lib/supabase/server";

export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex flex-col gap-7">
      <h1 className="font-serif font-light italic text-stone-50 text-3xl text-center">
        Create your account
      </h1>
      <AuthForm mode="signup" />
    </div>
  );
}
