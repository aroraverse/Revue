import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Business, Card, Feedback } from "@/lib/types";
import { qrLink, nfcLink, publicLink, qrSvg, qrPngDataUrl } from "@/lib/qr";
import { getBusinessAnalytics, type Counts } from "@/lib/analytics";
import { updateBusiness, setCardStatus } from "../../business-actions";
import CardTools from "./CardTools";

export const dynamic = "force-dynamic";

const TYPES = ["restaurant", "cafe", "salon", "clinic", "retail", "other"];

function CountRow({ label, c }: { label: string; c: Counts }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="flex gap-3">
        <span>QR {c.QR}</span>
        <span>NFC {c.NFC}</span>
        <span>Google {c.GOOGLE_CLICK}</span>
      </span>
    </div>
  );
}

export default async function BusinessDetail({
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

  const { data: cardData } = await supabase
    .from("cards")
    .select("*")
    .eq("business_id", id)
    .order("public_token", { ascending: true });
  const cards = (cardData ?? []) as Card[];

  const analytics = await getBusinessAnalytics(id);

  // Prebuild QR assets for each assigned card (server-side, no external service).
  const qr: Record<string, { svg: string; png: string; qr: string; nfc: string; pub: string }> = {};
  await Promise.all(
    cards.map(async (c) => {
      qr[c.id] = {
        svg: await qrSvg(c.public_token),
        png: await qrPngDataUrl(c.public_token),
        qr: await qrLink(c.public_token),
        nfc: await nfcLink(c.public_token),
        pub: await publicLink(c.public_token),
      };
    })
  );

  // Low-rating feedback count for the inbox link (RLS-scoped).
  const { data: lowFb } = await supabase
    .from("feedback")
    .select("id")
    .eq("business_id", id)
    .lte("stars", 3);
  const lowCount = (lowFb as Feedback[] | null)?.length ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin" className="text-sm text-slate-500">
          ← Back
        </Link>
        <h1 className="mt-2 text-xl font-bold">{b.name}</h1>
      </div>

      {/* Analytics */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 font-semibold">Analytics</h2>
        <CountRow label="Last 7 days" c={analytics.last7} />
        <CountRow label="Last 30 days" c={analytics.last30} />
        <CountRow label="All time" c={analytics.total} />
      </section>

      {/* Feedback inbox link */}
      <section>
        <Link
          href={`/admin/business/${id}/feedback`}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 font-medium hover:border-brand"
        >
          Feedback inbox
          {lowCount > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
              {lowCount} low
            </span>
          )}
        </Link>
      </section>

      {/* Edit business */}
      <section>
        <h2 className="mb-3 font-semibold">Edit business</h2>
        <form
          action={updateBusiness}
          className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4"
        >
          <input type="hidden" name="id" value={b.id} />
          <input
            name="name"
            required
            defaultValue={b.name}
            className="rounded-lg border border-slate-300 p-2.5"
          />
          <select
            name="type"
            defaultValue={b.type}
            className="rounded-lg border border-slate-300 p-2.5"
          >
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
            className="rounded-lg border border-slate-300 p-2.5"
          />
          <input
            name="logo_url"
            type="url"
            defaultValue={b.logo_url ?? ""}
            placeholder="Logo URL (optional)"
            className="rounded-lg border border-slate-300 p-2.5"
          />
          <input
            name="google_review_url"
            type="url"
            required
            defaultValue={b.google_review_url}
            placeholder="Google review URL"
            className="rounded-lg border border-slate-300 p-2.5"
          />
          <button className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white">
            Save changes
          </button>
        </form>
      </section>

      {/* Assigned cards */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Assigned cards</h2>
          <Link
            href="/admin/cards"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
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
              const cardCounts = analytics.perCard[c.id];
              return (
                <li
                  key={c.id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between">
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

                  <div className="text-xs text-slate-500">
                    <a
                      href={qr[c.id].pub}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all underline"
                    >
                      {qr[c.id].pub}
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
                    qrLink={qr[c.id].qr}
                    nfcLink={qr[c.id].nfc}
                    svg={qr[c.id].svg}
                    png={qr[c.id].png}
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
