import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createBusiness } from "../../business-actions";

export const dynamic = "force-dynamic";

const TYPES = ["restaurant", "cafe", "salon", "clinic", "retail", "other"];

export default async function NewBusinessPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/admin");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin" className="text-sm text-slate-500">
          ← Back
        </Link>
        <h1 className="mt-2 text-xl font-bold">New business</h1>
      </div>

      <form
        action={createBusiness}
        className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4"
      >
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Name</span>
          <input
            name="name"
            required
            placeholder="Business name"
            className="rounded-lg border border-slate-300 p-2.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Type</span>
          <select
            name="type"
            className="rounded-lg border border-slate-300 p-2.5"
            defaultValue="restaurant"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Short summary (optional)</span>
          <input
            name="summary"
            placeholder="Family-run Italian kitchen"
            className="rounded-lg border border-slate-300 p-2.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Logo URL (optional)</span>
          <input
            name="logo_url"
            type="url"
            placeholder="https://…"
            className="rounded-lg border border-slate-300 p-2.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Google review URL</span>
          <input
            name="google_review_url"
            type="url"
            required
            placeholder="https://search.google.com/local/writereview?placeid=…"
            className="rounded-lg border border-slate-300 p-2.5"
          />
        </label>
        <button className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white">
          Create business
        </button>
      </form>
    </div>
  );
}
