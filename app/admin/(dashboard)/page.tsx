import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { Business } from "@/lib/types";

export const dynamic = "force-dynamic";

const TYPE_EMOJI: Record<string, string> = {
  restaurant: "🍽️",
  cafe: "☕",
  salon: "💈",
  clinic: "🩺",
  retail: "🛍️",
  other: "🏷️",
};

export default async function AdminHome() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  const isAdmin = user.role === "admin";

  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  const businesses = (data ?? []) as Business[];

  if (!isAdmin && businesses.length === 1) {
    redirect(`/admin/business/${businesses[0].id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {isAdmin ? "Businesses" : "Your business"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin
              ? "Manage every business, its cards and feedback."
              : "Your analytics and feedback at a glance."}
          </p>
        </div>
        {isAdmin && (
          <Link href="/admin/business/new" className="btn-primary">
            <span className="text-lg leading-none">+</span> New business
          </Link>
        )}
      </div>

      {businesses.length === 0 ? (
        <div className="surface flex flex-col items-center gap-3 p-10 text-center">
          <div className="text-4xl">🏢</div>
          <p className="font-medium">
            {isAdmin ? "No businesses yet" : "No business assigned yet"}
          </p>
          <p className="max-w-sm text-sm text-slate-500">
            {isAdmin
              ? "Create your first business to start minting review cards."
              : "Please contact your administrator to get set up."}
          </p>
          {isAdmin && (
            <Link href="/admin/business/new" className="btn-primary mt-1">
              Create a business
            </Link>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {businesses.map((b) => (
            <li key={b.id}>
              <Link
                href={`/admin/business/${b.id}`}
                className="surface group flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">
                  {TYPE_EMOJI[b.type] ?? "🏷️"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{b.name}</span>
                  <span className="block text-sm capitalize text-slate-500">
                    {b.type}
                  </span>
                </span>
                <span className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
