import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[390px] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="text-5xl">⭐</div>
      <h1 className="text-2xl font-bold">ReviewTap</h1>
      <p className="text-slate-600">
        Scan a card or tap a tag to share your experience in seconds.
      </p>
      <Link
        href="/admin"
        className="rounded-lg bg-brand px-5 py-3 font-semibold text-white"
      >
        Admin dashboard
      </Link>
    </main>
  );
}
