"use client";

import { useMemo, useState } from "react";
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

  const isHigh = stars >= 4;

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

  // Copy draft, log GOOGLE_CLICK, open Google review page.
  async function copyAndOpenGoogle(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Clipboard may be blocked; still proceed to Google.
    }
    void logEvent({ cardId, businessId, type: "GOOGLE_CLICK" });
    window.open(googleReviewUrl, "_blank", "noopener,noreferrer");
  }

  async function submitPrivate() {
    await persistFeedback(null);
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
            className="rounded-lg bg-brand px-5 py-3 font-semibold text-white"
          >
            Copy &amp; open Google
          </button>
          <p className="text-center text-sm text-slate-500">
            {copied ? "Copied! " : ""}Tap your stars on Google, paste, and post.
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
        <section className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="text-5xl" aria-hidden>
            🙏
          </div>
          <h2 className="text-xl font-bold">Thank you!</h2>
          <p className="text-slate-600">
            Your feedback has been sent to the owner. We appreciate you taking
            the time.
          </p>
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
