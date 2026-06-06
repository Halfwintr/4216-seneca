"use client";

import { useActionState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { submitInquiry, type InquiryState } from "@/app/actions/inquiry";

const labelClass =
  "text-[13px] uppercase font-sans font-normal text-white/60 leading-tight";
const fieldClass =
  "w-full rounded bg-[#333] px-3 py-2.5 font-sans text-base text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-highlight/60";

interface InquiryFormProps {
  listingId: string;
}

const initialState: InquiryState = { ok: false };

export function InquiryForm({ listingId }: InquiryFormProps) {
  const [state, action, pending] = useActionState(submitInquiry, initialState);

  if (state.ok) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-2 py-6"
      >
        <h3 className="font-sans text-2xl font-medium uppercase text-white">
          Thank you.
        </h3>
        <p className="font-sans text-base text-white/70">
          Your message is on its way. We&rsquo;ll be in touch shortly.
        </p>
      </motion.div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="listingId" value={listingId} />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className={labelClass}>Name</label>
          <input id="name" name="name" type="text" placeholder="First, Last" className={fieldClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact" className={labelClass}>Phone or Email</label>
          <input id="contact" name="contact" type="text" required placeholder="(000) 000-0000" className={fieldClass} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className={labelClass}>Message</label>
        <textarea
          id="message"
          name="message"
          rows={3}
          placeholder="I want to see this property!"
          className={`${fieldClass} resize-none`}
        />
      </div>

      {state.error && (
        <p className="font-sans text-xs text-red-400/80">{state.error}</p>
      )}

      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <p className="flex-1 font-sans text-xs leading-snug text-white/55">
          By submitting, you agree that Love That For You may share your inquiry
          with the property owner or listing representative.{" "}
          <span className="text-highlight">View Privacy Policy.</span>
        </p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md bg-highlight px-5 py-2.5 font-sans text-sm font-medium uppercase tracking-wide text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send"}
          <ArrowRight size={18} strokeWidth={2} />
        </button>
      </div>
    </form>
  );
}
