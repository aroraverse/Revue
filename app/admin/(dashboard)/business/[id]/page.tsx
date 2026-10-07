import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { Business, Card, Feedback } from "@/lib/types";
import { baseUrl, linksFor } from "@/lib/qr";
import { getBusinessAnalytics, type Counts } from "@/lib/analytics";
import { updateBusiness, setCardStatus } from "../../business-actions";
import CardTools from "./CardTools";
import DeleteBusinessButton from "./DeleteBusinessButton";

export const dynamic = "force-dynamic";

const TYPES = ["restaurant", "cafe", "salon", "clinic", "retail", "other"];

/** A single analytics metric shown as a big, friendly stat card. */
function StatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number;
  accent: string;
  icon: string;
}) {
  return (
    <div className="surface flex flex-col gap-1 p-4">
      <span className="text-base">{icon}</span>
      <span className={`text-2xl font-extrabold tabular-nums ${accent}`}>
        {value}
      </span>
      <span className="text-xs font-medium text-slate-500">{label}</span>
    </div>
  );
}

/** A window (7d/30d/all) rendered as a row of stat cards. */
function StatWindow({ title, c }: { title: string; c: Counts }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h3>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatCard label="QR scans" value={c.QR} accent="text-brand" icon="📷" />
        <StatCard label="NFC taps" value={c.NFC} accent="text-brand" icon="📲" />
        <StatCard
          label="Google clicks"
          value={c.GOOGLE_CLICK}
          accent="text-green-600"
          icon="⭐"
        />
      </div>
    </div>
  );
}

export default async function BusinessDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const supabase = await createClient();

  const [{ data: business }, { data: cardData }, { data: lowFb }, analytics, base] =
    await Promise.all([
      supabase.from("businesses").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("cards")
        .select("*")
        .eq("business_id", id)
        .order("public_token", { ascending: true }),
      supabase.from("feedback").select("id").eq("business_id", id).lte("stars", 3),
      getBusinessAnalytics(id),
      baseUrl(),
    ]);

  if (!business) notFound();
  const b = business as Business;
  const cards = (cardData ?? []) as Card[];
  const lowCount = (lowFb as Feedback[] | null)?.length ?? 0;
  const isAdmin = user?.role === "admin";

  // ---- Shared header + analytics + feedback (both roles see these) ----------
  const header = (
    <div className="flex flex-col gap-1">
      {isAdmin && (
        <Link href="/admin" className="text-sm text-slate-500">
          ← All businesses
        </Link>
      )}
      <div className="flex items-center gap-3">
        {b.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={b.logo_url}
            alt={b.name}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-xl font-bold text-white">
            {b.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold">{b.name}</h1>
          <p className="text-sm capitalize text-slate-500">{b.type}</p>
        </div>
      </div>
    </div>
  );

  const analyticsSection = (
    <section className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold">Analytics</h2>
      <StatWindow title="Last 7 days" c={analytics.last7} />
      <StatWindow title="Last 30 days" c={analytics.last30} />
      <StatWindow title="All time" c={analytics.total} />
    </section>
  );

  const feedbackSection = (
    <section>
      <Link
        href={`/admin/business/${id}/feedback`}
        className="surface flex items-center justify-between gap-2 px-4 py-4 font-medium transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
      >
        <span className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-lg">
            📥
          </span>
          Feedback inbox
        </span>
        {lowCount > 0 ? (
          <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
            {lowCount} needs attention
          </span>
        ) : (
          <span className="text-sm text-slate-400">View all →</span>
        )}
      </Link>
    </section>
  );

  // ---- Owner view: clean, read-only analytics + feedback only --------------
  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        {analyticsSection}
        {feedbackSection}
      </div>
    );
  }

  // ---- Admin view: full management ----------------------------------------
  return (
    <div className="flex flex-col gap-8">
      {header}
      {analyticsSection}
      {feedbackSection}

      {/* Edit business (admin only) */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Edit business</h2>
        <form
          action={updateBusiness}
          className="surface flex flex-col gap-3 p-4"
        >
          <input type="hidden" name="id" value={b.id} />
          <input
            name="name"
            required
            defaultValue={b.name}
            placeholder="Business name"
            className="field"
          />
          <select name="type" defaultValue={b.type} className="field">
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            name="summary"
            defaultValue={b.summary ?? ""}
            placeholder="Short summary (optional)"
            className="field"
          />
          <input
            name="logo_url"
            type="url"
            defaultValue={b.logo_url ?? ""}
            placeholder="Logo URL (optional)"
            className="field"
          />
          <input
            name="google_review_url"
            type="url"
            required
            defaultValue={b.google_review_url}
            placeholder="Google review URL"
            className="field"
          />
          <div className="flex flex-wrap gap-3">
            <button className="btn-primary">Save changes</button>
          </div>
        </form>
        <div className="mt-3">
          <DeleteBusinessButton
            businessId={b.id}
            businessName={b.name}
            cardCount={cards.length}
          />
        </div>
      </section>

      {/* Assigned cards (admin only) */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Assigned cards</h2>
          <Link href="/admin/cards" className="btn-primary px-4 py-2 text-sm">
            Assign from pool
          </Link>
        </div>

        {cards.length === 0 ? (
          <p className="text-slate-500">
            No cards assigned yet. Go to the card pool to assign one.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {cards.map((c) => {
              const l = linksFor(base, c.public_token);
              const cardCounts = analytics.perCard[c.id];
              return (
                <li key={c.id} className="surface flex flex-col gap-3 p-4">
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
                    <form action={setCardStatus}>
                      <input type="hidden" name="card_id" value={c.id} />
                      <input type="hidden" name="business_id" value={b.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={c.status === "active" ? "disabled" : "active"}
                      />
                      <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium">
                        {c.status === "active" ? "Disable" : "Enable"}
                      </button>
                    </form>
                  </div>

                  <div className="text-xs text-slate-500 break-all">
                    <a
                      href={l.pub}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      {l.pub}
                    </a>
                  </div>

                  {cardCounts && (
                    <div className="text-xs text-slate-500">
                      QR {cardCounts.QR} · NFC {cardCounts.NFC} · Google{" "}
                      {cardCounts.GOOGLE_CLICK}
                    </div>
                  )}

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
