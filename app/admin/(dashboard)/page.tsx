import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Business } from "@/lib/types";
import { createBusiness } from "./business-actions";

export const dynamic = "force-dynamic";

const TYPES = ["restaurant", "cafe", "salon", "clinic", "retail", "other"];

export default async function AdminHome() {
  const supabase = await createClient();
  // RLS returns only businesses the user may see (own, or all for admin).
  const { data } = await supabase
    .from("businesses")
    .select("*")
    .order("created_at", { ascending: false });
  const businesses = (data ?? []) as Business[];

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-4 text-xl font-bold">Your businesses</h1>
        {businesses.length === 0 ? (
          <p className="text-slate-500">No businesses yet. Create one below.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {businesses.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/admin/business/${b.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 hover:border-brand"
                >
                  <span className="font-medium">{b.name}</span>
                  <span className="text-sm text-slate-500">{b.type}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Add a business</h2>
        <form
          action={createBusiness}
          className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4"
        >
          <input
            name="name"
            required
            placeholder="Business name"
            className="rounded-lg border border-slate-300 p-2.5"
          />
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
          <input
            name="summary"
            placeholder="Short summary (optional)"
            className="rounded-lg border border-slate-300 p-2.5"
          />
          <input
            name="logo_url"
            type="url"
            placeholder="Logo URL (optional)"
            className="rounded-lg border border-slate-300 p-2.5"
          />
          <input
            name="google_review_url"
            type="url"
            required
            placeholder="Google review URL"
            className="rounded-lg border border-slate-300 p-2.5"
          />
          <button className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white">
            Create business
          </button>
        </form>
      </section>
    </div>
  );
}
