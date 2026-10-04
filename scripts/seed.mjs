// Seed one demo business and cards A001-A003.
// Run: npm run seed   (loads .env.local via --env-file)
//
// Uses the service role key to bypass RLS. If a profile already exists,
// the demo business is assigned to the first user so it shows up in their
// admin dashboard; otherwise owner_user_id is left null (assign later).

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function main() {
  // Attach to the first existing user, if any.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id")
    .limit(1);
  const ownerUserId = profiles?.[0]?.user_id ?? null;

  // Avoid duplicating the demo on repeat runs.
  const { data: existing } = await supabase
    .from("businesses")
    .select("id")
    .eq("name", "Bella Pasta (Demo)")
    .maybeSingle();

  let businessId = existing?.id;

  if (!businessId) {
    const { data: biz, error } = await supabase
      .from("businesses")
      .insert({
        name: "Bella Pasta (Demo)",
        type: "restaurant",
        summary: "Family-run Italian kitchen.",
        logo_url: null,
        google_review_url: "https://search.google.com/local/writereview?placeid=DEMO",
        owner_user_id: ownerUserId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create business:", error.message);
      process.exit(1);
    }
    businessId = biz.id;
    console.log("Created demo business:", businessId);
  } else {
    console.log("Demo business already exists:", businessId);
  }

  // Create cards A001-A003 if they don't exist.
  for (const token of ["A001", "A002", "A003"]) {
    const { data: card } = await supabase
      .from("cards")
      .select("id")
      .eq("public_token", token)
      .maybeSingle();

    if (card) {
      console.log(`Card ${token} already exists.`);
      continue;
    }

    const { error } = await supabase.from("cards").insert({
      business_id: businessId,
      public_token: token,
      status: "active",
    });
    if (error) {
      console.error(`Failed to create card ${token}:`, error.message);
    } else {
      console.log(`Created card ${token}.`);
    }
  }

  console.log("\nSeed complete.");
  if (!ownerUserId) {
    console.log(
      "Note: no profile found, so the demo business has no owner yet.\n" +
        "After you sign up in /admin, run this SQL to claim it:\n" +
        "  update public.businesses set owner_user_id = auth.uid()\n" +
        "  where name = 'Bella Pasta (Demo)';"
    );
  }
}

main().then(() => process.exit(0));
