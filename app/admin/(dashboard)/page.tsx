import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { Business } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  const isAdmin = user.role === "admin";

  const supabase = await createClient();
  // RLS returns only businesses the user may see (own, or all for admin).
  const { data } = await supabase
    .from("businesses")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  const businesses = (data ?? []) as Business[];

  // Owners don't manage a list — send them straight into their business.
  if (!isAdmin && businesses.length === 1) {
    redirect(`/admin/business/${businesses[0].id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">
          {isAdmin ? "Businesses" : "Your business"}
        </h1>
        {isAdmin && (
          <Link
            href="/admin/business/new"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            + New business
          </Link>
        )}
      </div>

      {businesses.length === 0 ? (
        <p className="text-slate-500">
          {isAdmin
            ? "No businesses yet. Create your first one."
            : "No business is assigned to your account yet. Please contact your administrator."}
        </p>
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
    </div>
  );
}
