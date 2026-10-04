import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Business, Feedback } from "@/lib/types";

export const dynamic = "force-dynamic";

function Stars({ n }: { n: number }) {
  return (
    <span className="text-yellow-400" aria-label={`${n} stars`}>
      {"★".repeat(n)}
      <span className="text-slate-300">{"★".repeat(5 - n)}</span>
    </span>
  );
}

export default async function FeedbackInbox({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!business) notFound();
  const b = business as Business;

  // RLS ensures only admin or the owner sees this business's feedback.
  const { data } = await supabase
    .from("feedback")
    .select("*")
    .eq("business_id", id)
    .order("created_at", { ascending: false });
  const items = (data ?? []) as Feedback[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/admin/business/${id}`} className="text-sm text-slate-500">
          ← Back
        </Link>
        <h1 className="mt-2 text-xl font-bold">Feedback · {b.name}</h1>
      </div>

      {items.length === 0 ? (
        <p className="text-slate-500">No feedback yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((f) => (
            <li
              key={f.id}
              className={`rounded-lg border bg-white p-4 ${
                f.stars <= 3 ? "border-red-200" : "border-slate-200"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <Stars n={f.stars} />
                <time className="text-xs text-slate-400">
                  {new Date(f.created_at).toLocaleString()}
                </time>
              </div>
              {f.tags.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {f.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {f.note && <p className="text-sm text-slate-700">{f.note}</p>}
              {f.draft_comment && (
                <p className="mt-2 border-t border-slate-100 pt-2 text-xs italic text-slate-500">
                  Draft: {f.draft_comment}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
