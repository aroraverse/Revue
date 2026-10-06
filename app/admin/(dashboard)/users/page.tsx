import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Business } from "@/lib/types";
import { createOwnerUser } from "../business-actions";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/admin");

  const supabase = await createClient();
  const admin = createAdminClient();

  // Businesses to pick from (not deleted), and the list of existing users.
  const [{ data: bizData }, usersRes] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, name, owner_user_id")
      .is("deleted_at", null)
      .order("name"),
    admin.auth.admin.listUsers(),
  ]);

  const businesses = (bizData ?? []) as Pick<
    Business,
    "id" | "name" | "owner_user_id"
  >[];
  const users = usersRes.data?.users ?? [];
  const emailById = new Map(users.map((u) => [u.id, u.email]));

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-bold">Users</h1>

      {/* Create owner login */}
      <section className="surface p-4">
        <h2 className="mb-2 font-semibold">Add a business owner</h2>
        <p className="mb-3 text-sm text-slate-500">
          Creates a login for an owner and assigns them a business. They can
          sign in at <span className="font-mono">/admin/login</span> and will
          see only their own business statistics.
        </p>
        <form action={createOwnerUser} className="flex flex-col gap-3">
          <input
            name="email"
            type="email"
            required
            placeholder="owner@example.com"
            className="field"
          />
          <input
            name="password"
            type="text"
            required
            minLength={6}
            placeholder="Temporary password (min 6 chars)"
            className="field"
          />
          <select
            name="business_id"
            className="field"
            defaultValue=""
          >
            <option value="">Assign a business (optional)…</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {b.owner_user_id ? " (already owned)" : ""}
              </option>
            ))}
          </select>
          <button className="btn-primary">
            Create owner login
          </button>
        </form>
      </section>

      {/* Existing businesses + their owners */}
      <section>
        <h2 className="mb-3 font-semibold">Business owners</h2>
        {businesses.length === 0 ? (
          <p className="text-slate-500">No businesses yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {businesses.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-4"
              >
                <span className="font-medium">{b.name}</span>
                <span className="text-sm text-slate-500">
                  {b.owner_user_id
                    ? emailById.get(b.owner_user_id) ?? "assigned"
                    : "no owner yet"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}


