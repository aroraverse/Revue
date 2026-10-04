"use client";

export default function FriendlyMessage({
  emoji,
  title,
  body,
  showRetry = false,
}: {
  emoji: string;
  title: string;
  body: string;
  showRetry?: boolean;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-[390px] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-5xl" aria-hidden>
        {emoji}
      </div>
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="text-slate-600">{body}</p>
      {showRetry && (
        <button
          onClick={() => window.location.reload()}
          className="mt-2 rounded-lg bg-brand px-5 py-3 font-semibold text-white"
        >
          Try again
        </button>
      )}
    </main>
  );
}
