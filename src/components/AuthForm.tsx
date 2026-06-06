"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, signUp, type AuthState } from "@/app/actions/auth";

const initialState: AuthState = {};

const inputClass =
  "w-full bg-transparent border-b border-stone-700/50 pb-2 font-sans font-light text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-warm/60 transition-colors duration-300";

const labelClass =
  "text-[9px] tracking-[0.22em] uppercase font-sans text-stone-500";

interface AuthFormProps {
  mode: "signin" | "signup";
  redirectTo?: string;
  notice?: string;
}

export function AuthForm({ mode, redirectTo, notice }: AuthFormProps) {
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {notice && (
        <p className="font-sans font-light text-xs text-amber-warm/90 leading-relaxed">
          {notice}
        </p>
      )}

      {mode === "signup" && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fullName" className={labelClass}>
            Name
          </label>
          <input id="fullName" name="fullName" type="text" placeholder="Your name" className={inputClass} />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input id="email" name="email" type="email" required placeholder="you@example.com" className={inputClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={labelClass}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
          className={inputClass}
        />
      </div>

      {redirectTo && <input type="hidden" name="redirect" value={redirectTo} />}

      {state.error && (
        <p className="font-sans font-light text-xs text-red-400/80">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 inline-flex items-center justify-center rounded-full border border-amber-warm/50 px-8 py-3 font-sans font-light text-sm tracking-[0.12em] text-stone-100 transition-all duration-300 hover:bg-amber-warm/10 hover:border-amber-warm/80 disabled:opacity-50"
      >
        {pending
          ? mode === "signin"
            ? "Signing in…"
            : "Creating account…"
          : mode === "signin"
            ? "Sign in"
            : "Create account"}
      </button>

      <p className="font-sans font-light text-xs text-stone-500">
        {mode === "signin" ? (
          <>
            New here?{" "}
            <Link href="/signup" className="text-amber-warm/90 hover:text-amber-warm">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-amber-warm/90 hover:text-amber-warm">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
