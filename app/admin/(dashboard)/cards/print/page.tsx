import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Card } from "@/lib/types";
import { baseUrl, linksFor } from "@/lib/qr";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

type Filter = "all" | "unassigned" | "assigned";

export default async function PrintCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/admin");

  const { filter: rawFilter } = await searchParams;
  const filter: Filter =
    rawFilter === "unassigned" || rawFilter === "assigned"
      ? rawFilter
      : "all";

  const supabase = await createClient();
  const [{ data: cardData }, base] = await Promise.all([
    supabase
      .from("cards")
      .select("*")
      .order("public_token", { ascending: true }),
    baseUrl(),
  ]);

  let cards = (cardData ?? []) as Card[];
  if (filter === "unassigned") cards = cards.filter((c) => !c.business_id);
  if (filter === "assigned") cards = cards.filter((c) => c.business_id);

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar — hidden when printing */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Print QR sheet</h1>
          <p className="text-sm text-slate-500">
            {cards.length} code{cards.length === 1 ? "" : "s"} ·{" "}
            <span className="capitalize">{filter}</span>. Use your browser&apos;s
            print dialog and &quot;Save as PDF&quot; to send to a vendor.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <a
            href="/admin/cards/print?filter=all"
            className={`rounded-md border px-3 py-1.5 font-medium ${
              filter === "all"
                ? "border-brand bg-brand text-white"
                : "border-slate-300"
            }`}
          >
            All
          </a>
          <a
            href="/admin/cards/print?filter=unassigned"
            className={`rounded-md border px-3 py-1.5 font-medium ${
              filter === "unassigned"
                ? "border-brand bg-brand text-white"
                : "border-slate-300"
            }`}
          >
            Unassigned
          </a>
          <a
            href="/admin/cards/print?filter=assigned"
            className={`rounded-md border px-3 py-1.5 font-medium ${
              filter === "assigned"
                ? "border-brand bg-brand text-white"
                : "border-slate-300"
            }`}
          >
            Assigned
          </a>
          <PrintButton />
        </div>
      </div>

      {cards.length === 0 ? (
        <p className="no-print text-slate-500">
          No cards to print for this filter.
        </p>
      ) : (
        <div className="qr-grid">
          {cards.map((c) => {
            const l = linksFor(base, c.public_token);
            return (
              <div key={c.id} className="qr-tile">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/admin/qr/${c.public_token}`}
                  alt={`QR for ${c.public_token}`}
                  className="qr-img"
                />
                <div className="qr-token">{c.public_token}</div>
                <div className="qr-url">{l.qr}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Print layout + screen styles for the grid/tiles. */}
      <style>{`
        .qr-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }
        @media (min-width: 640px) {
          .qr-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        .qr-tile {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px;
          background: #fff;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .qr-img { width: 100%; height: auto; max-width: 180px; }
        .qr-token { font-family: ui-monospace, monospace; font-weight: 700; font-size: 14px; }
        .qr-url { font-size: 9px; color: #64748b; word-break: break-all; text-align: center; }

        @media print {
          /* Hide app chrome + toolbar so only the sheet prints. */
          header, nav, .no-print { display: none !important; }
          body { background: #fff !important; }
          .qr-grid { grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .qr-tile { border: 1px solid #cbd5e1; }
          @page { margin: 12mm; }
        }
      `}</style>
    </div>
  );
}
