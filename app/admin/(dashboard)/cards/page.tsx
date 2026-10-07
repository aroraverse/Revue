import { createClient } from "@/lib/supabase/server";
import type { Business, Card } from "@/lib/types";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { baseUrl, linksFor } from "@/lib/qr";
import { mintCards, assignCard, unassignCard } from "../business-actions";
import CardTools from "../business/[id]/CardTools";

export const dynamic = "force-dynamic";

export default async function CardsPoolPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/admin");
  }

  const supabase = await createClient();

  // Fetch cards + businesses in parallel, and resolve the base URL once.
  const [{ data: cardData }, { data: bizData }, base] = await Promise.all([
    supabase.from("cards").select("*").order("public_token", { ascending: true }),
    supabase
      .from("businesses")
      .select("id, name")
      .is("deleted_at", null)
      .order("name"),
    baseUrl(),
  ]);

  const cards = (cardData ?? []) as Card[];
  const businesses = (bizData ?? []) as Pick<Business, "id" | "name">[];
  const bName = new Map(businesses.map((b) => [b.id, b.name]));

  // A card counts as "assigned" only if its business still exists (not deleted).
  // Cards pointing at a deleted/missing business are shown back in the pool so
  // they can be reassigned (handles any left over from before auto-release).
  const isAssigned = (c: Card) => !!c.business_id && bName.has(c.business_id);
  const unassigned = cards.filter((c) => !isAssigned(c));
  const assigned = cards.filter((c) => isAssigned(c));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Card pool</h1>
        <div className="flex flex-wrap gap-2 text-sm">
          <a
            href="/admin/cards/print?filter=unassigned"
            className="rounded-lg border border-slate-300 px-4 py-2 font-semibold"
          >
            Print unassigned QRs
          </a>
          <a
            href="/admin/cards/print?filter=all"
            className="rounded-lg border border-slate-300 px-4 py-2 font-semibold"
          >
            Print all QRs
          </a>
        </div>
      </div>

      {/* Mint new cards */}
      <section className="surface p-4">
        <h2 className="mb-2 font-semibold">Mint new cards</h2>
        <p className="mb-3 text-sm text-slate-500">
          Creates blank, unassigned cards with auto-generated tokens. Print
          their QR codes, then assign each card to a business when ready.
        </p>
        <form action={mintCards} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">How many?</span>
            <input
              name="count"
              type="number"
              min={1}
              max={500}
              defaultValue={10}
              className="w-28 rounded-lg border border-slate-300 p-2.5"
            />
          </label>
          <button className="btn-primary">
            Mint cards
          </button>
        </form>
      </section>

      {/* Unassigned pool */}
      <section>
        <h2 className="mb-3 font-semibold">Unassigned ({unassigned.length})</h2>
        {unassigned.length === 0 ? (
          <p className="text-slate-500">No unassigned cards. Mint some above.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {unassigned.map((c) => {
              const l = linksFor(base, c.public_token);
              return (
                <li
                  key={c.id}
                  className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-lg font-bold">
                      {c.public_token}
                    </span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      unassigned
                    </span>
                  </div>

                  <form
                    action={assignCard}
                    className="flex flex-col gap-2 sm:flex-row sm:items-end"
                  >
                    <input type="hidden" name="card_id" value={c.id} />
                    <select
                      name="business_id"
                      required
                      className="min-w-0 flex-1 rounded-lg border border-slate-300 p-2"
                    >
                      <option value="">Select business…</option>
                      {businesses.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                    <button className="btn-primary px-4 py-2 text-sm">
                      Assign
                    </button>
                  </form>

                  <CardTools
                    token={c.public_token}
                    qrLink={l.qr}
                    nfcLink={l.nfc}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Assigned cards */}
      <section>
        <h2 className="mb-3 font-semibold">Assigned ({assigned.length})</h2>
        {assigned.length === 0 ? (
          <p className="text-slate-500">No cards have been assigned yet.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {assigned.map((c) => {
              const l = linksFor(base, c.public_token);
              return (
                <li
                  key={c.id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">
                        {c.public_token}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          c.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <span className="text-sm text-slate-500">
                      → {bName.get(c.business_id!) ?? "unknown"}
                    </span>
                  </div>

                  <form action={unassignCard}>
                    <input type="hidden" name="card_id" value={c.id} />
                    <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium">
                      Unassign
                    </button>
                  </form>

                  <CardTools
                    token={c.public_token}
                    qrLink={l.qr}
                    nfcLink={l.nfc}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

