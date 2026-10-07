"use client";

import { useState } from "react";
import { compose } from "@/lib/compose";
import type { BusinessType } from "@/lib/types";
import { logEvent, saveFeedback } from "./actions";

interface Props {
  cardId: string;
  businessId: string;
  businessName: string;
  businessType: BusinessType;
  logoUrl: string | null;
  googleReviewUrl: string;
  tags: string[];
}

type Step = "stars" | "details" | "high" | "low" | "thanks";

export default function ReviewFlow({
  cardId,
  businessId,
  businessName,
  businessType,
  logoUrl,
  googleReviewUrl,
  tags,
}: Props) {
  const [step, setStep] = useState<Step>("stars");
  const [stars, setStars] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const [thanksKind, setThanksKind] = useState<"google" | "private">("google");

  const isHigh = stars >= 4;

  // Where "Contact us" on the thank-you screen points. Set
  // NEXT_PUBLIC_CONTACT_URL (an email like "mailto:you@brand.com" or a page).
  // Resolve the "Contact us" target from NEXT_PUBLIC_CONTACT_URL.
  // Accepts: a full URL (https://…, wa.me/…), a mailto:, or a bare email.
  // A bare email is turned into a Gmail compose link so it opens in the
  // browser (mailto: often does nothing on laptops without a mail app).
  const rawContact = process.env.NEXT_PUBLIC_CONTACT_URL || "sarthak7591@gmail.com";
  const contactUrl = (() => {
    const v = rawContact.trim();
    if (/^https?:\/\//i.test(v) || v.startsWith("mailto:")) return v;
    // bare email -> Gmail web compose
    const subject = encodeURIComponent("ReviewTap for my business");
    const body = encodeURIComponent(
      "Hi, I scanned a ReviewTap card and I'd love this for my business. Please share details."
    );
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      v
    )}&su=${subject}&body=${body}`;
  })();

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function regenerate() {
    setDraft(
      compose({
        businessName,
        type: businessType,
        stars,
        tags: selectedTags,
        note: note.trim() || null,
      })
    );
  }

  // Persist a feedback row for every completed submission (both branches).
  async function persistFeedback(draftComment: string | null) {
    if (saved) return;
    await saveFeedback({
      cardId,
      businessId,
      stars,
      tags: selectedTags,
      note: note.trim() || null,
      draftComment,
    });
    setSaved(true);
  }

  function goToBranch() {
    if (isHigh) {
      const first = compose({
        businessName,
        type: businessType,
        stars,
        tags: selectedTags,
        note: note.trim() || null,
      });
      setDraft(first);
      // Save feedback immediately so owners see every submission.
      void persistFeedback(first);
      setStep("high");
    } else {
      setStep("low");
    }
  }

  // Robust copy that works on mobile and non-HTTPS (LAN testing) contexts.
  // Tries the async Clipboard API, then falls back to a hidden textarea +
  // execCommand. Returns whether the copy succeeded.
  function copyText(text: string): boolean {
    // Legacy fallback first works in the most contexts within a user gesture.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) return true;
    } catch {
      // fall through to async API
    }
    // Async Clipboard API (fire-and-forget; may resolve after we navigate).
    try {
      if (navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }

  // Copy draft, show an animated "Copied!" state for ~1.5s so the user sees
  // it worked, then open Google (new tab) and show the branded thank-you.
  function copyAndOpenGoogle(text: string) {
    if (copying) return;
    const ok = copyText(text);
    setCopied(ok);
    setCopying(true);
    void logEvent({ cardId, businessId, type: "GOOGLE_CLICK" });

    window.setTimeout(() => {
      // Open Google in a new tab; our tab shows the thank-you + upsell.
      window.open(googleReviewUrl, "_blank", "noopener,noreferrer");
      setThanksKind("google");
      setStep("thanks");
      setCopying(false);
    }, 1500);
  }

  async function submitPrivate() {
    await persistFeedback(null);
    setThanksKind("private");
    setStep("thanks");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-[390px] flex-col gap-6 px-5 py-8">
      <header className="flex flex-col items-center gap-3 text-center">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={businessName}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-2xl font-bold text-white">
            {businessName.charAt(0).toUpperCase()}
          </div>
        )}
        <h1 className="text-lg font-bold">{businessName}</h1>
      </header>

      {step === "stars" && (
        <section className="flex flex-col items-center gap-5">
          <p className="text-center text-slate-700">How was your experience?</p>
          <StarRow
            value={stars}
            onChange={(v) => {
              setStars(v);
              setStep("details");
            }}
          />
        </section>
      )}

      {step === "details" && (
        <section className="flex flex-col gap-5">
          <div className="flex flex-col items-center gap-3">
            <StarRow value={stars} onChange={setStars} />
          </div>
          <div>
            <p className="mb-2 font-medium">What stood out?</p>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full border px-3 py-2 text-sm ${
                      active
                        ? "border-brand bg-brand text-white"
                        : "border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label htmlFor="note" className="mb-2 block font-medium">
              Anything to add? (optional)
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="One line about your visit…"
              className="w-full rounded-lg border border-slate-300 p-3"
            />
          </div>
          <button
            onClick={goToBranch}
            className="rounded-lg bg-brand px-5 py-3 font-semibold text-white"
          >
            Continue
          </button>
        </section>
      )}

      {step === "high" && (
        <section className="flex flex-col gap-4">
          <p className="font-medium">Here&apos;s a draft you can use:</p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-slate-300 p-3"
          />
          <button
            onClick={regenerate}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium"
          >
            🔄 Regenerate
          </button>
          <button
            onClick={() => copyAndOpenGoogle(draft)}
            disabled={copying}
            className={`flex items-center justify-center gap-2 rounded-lg px-5 py-3 font-semibold text-white transition-all duration-300 ${
              copying ? "scale-[1.02] bg-green-600" : "bg-brand"
            }`}
          >
            {copying ? (
              <>
                <span className="animate-[pop_300ms_ease-out] text-lg">✓</span>
                Copied! Opening Google…
              </>
            ) : (
              <>Copy &amp; open Google</>
            )}
          </button>
          <p className="text-center text-sm text-slate-500">
            {copying
              ? "Your review is copied. Opening Google in a moment…"
              : "Tap your stars on Google, then paste and post."}
          </p>
        </section>
      )}

      {step === "low" && (
        <section className="flex flex-col gap-4">
          <p className="text-slate-700">
            Thanks for your honesty. You can tell the owner privately, or post
            on Google if you prefer.
          </p>
          <button
            onClick={submitPrivate}
            className="rounded-lg bg-brand px-5 py-3 font-semibold text-white"
          >
            Tell the owner privately
          </button>
          <button
            onClick={() => {
              const text = compose({
                businessName,
                type: businessType,
                stars,
                tags: selectedTags,
                note: note.trim() || null,
              });
              // Ensure this submission is also saved before leaving.
              void persistFeedback(text);
              void copyAndOpenGoogle(text);
            }}
            className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700"
          >
            Post on Google instead
          </button>
        </section>
      )}

      {step === "thanks" && (
        <section className="flex flex-col items-center gap-5 py-8 text-center">
          {/* ReviewTap brand mark */}
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-indigo-400 text-xl font-black text-white shadow-md">
            R
          </span>

          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold">Thanks for the review!</h2>
            <p className="text-slate-600">
              {thanksKind === "google"
                ? "Google opened in a new tab with your draft copied. Just paste and post. If it didn't open, use the button below."
                : "Your feedback has been sent to the owner. We really appreciate you taking the time."}
            </p>
          </div>

          {thanksKind === "google" && (
            <a
              href={googleReviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-brand px-5 py-3 font-semibold text-white"
            >
              Continue to Google
            </a>
          )}

          {/* Upsell / contact */}
          <div className="mt-4 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-indigo-500 p-[1px] shadow-lg">
            <div className="rounded-2xl bg-white/95 p-5 text-left">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚀</span>
                <p className="text-base font-extrabold tracking-tight">
                  Want more 5-star reviews?
                </p>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Get your own tap-to-review cards like this one. Turn happy
                customers into glowing Google reviews, automatically.
              </p>
              <ul className="mt-3 flex flex-col gap-1.5 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> QR + NFC review cards
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> Auto-drafted comments
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> Private feedback for low ratings
                </li>
              </ul>
              <a
                href={contactUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-dark active:scale-[0.98]"
              >
                Get this for my business →
              </a>
            </div>
          </div>

          <p className="mt-2 text-xs text-slate-400">Powered by ReviewTap</p>
        </section>
      )}
    </main>
  );
}

function StarRow({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onClick={() => onChange(n)}
          className="text-4xl leading-none"
        >
          <span className={n <= value ? "text-yellow-400" : "text-slate-300"}>
            ★
          </span>
        </button>
      ))}
    </div>
  );
}
