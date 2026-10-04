import type { BusinessType } from "./types";

export interface ComposeInput {
  businessName: string;
  type: BusinessType;
  stars: number;
  tags: string[];
  note?: string | null;
  /** Optional seed for deterministic output (used by tests). */
  seed?: number;
}

/**
 * Small seedable PRNG (mulberry32). When no seed is given we derive one from
 * Math.random so each call — and each "Regenerate" — yields a new variation.
 */
function makeRng(seed?: number): () => number {
  let s = (seed ?? Math.floor(Math.random() * 2 ** 31)) >>> 0;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffle<T>(rng: () => number, arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Openers keyed by star bucket. 4-5 = positive, 1-3 = mixed/honest.
 * {name} is replaced with the business name.
 */
const OPENERS: Record<"high" | "low", string[]> = {
  high: [
    "Had a great time at {name}.",
    "Really enjoyed my visit to {name}.",
    "{name} did not disappoint.",
    "So glad I stopped by {name}.",
    "A solid experience at {name}.",
  ],
  low: [
    "My visit to {name} was okay.",
    "Mixed experience at {name}.",
    "A few things could be better at {name}.",
    "My time at {name} was alright.",
  ],
};

const CLOSERS: Record<"high" | "low", string[]> = {
  high: [
    "Would happily come back.",
    "Highly recommend it.",
    "Will definitely return.",
    "Worth a visit.",
    "Looking forward to my next time.",
  ],
  low: [
    "Hope it keeps improving.",
    "Might give it another try.",
    "Room to grow, but promising.",
    "Would consider returning.",
  ],
};

/** Connectors used to stitch tag phrases into one sentence. */
const CONNECTORS = [" and ", ", ", " — ", ". "];

/**
 * 4-6 alternative phrasings per tag. Keys match the strings in lib/tags.ts.
 * Phrases are lowercase sentence fragments beginning with a verb/subject so
 * they read naturally after an opener.
 */
const TAG_PHRASES: Record<string, string[]> = {
  // shared / restaurant / cafe
  "Friendly staff": [
    "the staff were friendly",
    "the team was welcoming",
    "everyone was really kind",
    "the people were warm and helpful",
    "staff greeted me with a smile",
  ],
  "Tasty food": [
    "the food was delicious",
    "every dish was tasty",
    "the flavors were spot on",
    "the meal was really good",
    "the food hit the spot",
  ],
  "Clean space": [
    "the place was spotless",
    "everything was clean and tidy",
    "the space was well kept",
    "it was clean throughout",
  ],
  "Quick service": [
    "the service was quick",
    "we were served fast",
    "there was barely any wait",
    "service was prompt",
  ],
  "Good value": [
    "it was great value",
    "the prices felt fair",
    "good value for money",
    "well worth the price",
  ],
  "Great ambience": [
    "the ambience was lovely",
    "the atmosphere was great",
    "it had a nice vibe",
    "the setting was relaxing",
  ],
  "Great coffee": [
    "the coffee was excellent",
    "the coffee was spot on",
    "best coffee I've had in a while",
    "the brew was great",
  ],
  "Cozy spot": [
    "it's a cozy spot",
    "the place felt warm and inviting",
    "such a comfortable setting",
    "a snug little place",
  ],
  "Fast service": [
    "service was fast",
    "we were looked after quickly",
    "no waiting around",
    "quick and efficient service",
  ],
  "Nice music": [
    "the music set a nice mood",
    "loved the background music",
    "the playlist was on point",
    "great music throughout",
  ],
  // salon
  "Skilled stylist": [
    "the stylist was clearly skilled",
    "great work from the stylist",
    "the stylist knew exactly what to do",
    "really talented stylist",
  ],
  "On-time service": [
    "they ran right on time",
    "no waiting past my appointment",
    "punctual from start to finish",
    "my appointment started on time",
  ],
  "Great result": [
    "I loved the result",
    "the result turned out great",
    "exactly the look I wanted",
    "thrilled with how it came out",
  ],
  "Relaxing vibe": [
    "the vibe was relaxing",
    "a calm and soothing space",
    "it felt relaxing throughout",
    "a peaceful atmosphere",
  ],
  // clinic
  "Caring staff": [
    "the staff were caring",
    "the team was attentive and kind",
    "I felt genuinely looked after",
    "compassionate staff",
  ],
  "Short wait": [
    "the wait was short",
    "I was seen quickly",
    "hardly any waiting",
    "minimal wait time",
  ],
  "Clean facility": [
    "the facility was spotless",
    "everything was clean and hygienic",
    "a very clean environment",
    "the clinic was immaculate",
  ],
  "Clear explanation": [
    "everything was explained clearly",
    "they took time to explain things",
    "clear answers to my questions",
    "I understood every step",
  ],
  "Easy booking": [
    "booking was easy",
    "the appointment was simple to set up",
    "scheduling was hassle-free",
    "quick and easy to book",
  ],
  "Felt comfortable": [
    "I felt comfortable throughout",
    "they put me at ease",
    "a reassuring experience",
    "I felt at ease the whole time",
  ],
  // retail
  "Helpful staff": [
    "the staff were helpful",
    "the team pointed me in the right direction",
    "great help from the staff",
    "staff went out of their way to help",
  ],
  "Great selection": [
    "the selection was great",
    "loads of choice",
    "a well-stocked range",
    "plenty of good options",
  ],
  "Fair prices": [
    "the prices were fair",
    "reasonable prices",
    "good prices across the board",
    "fairly priced",
  ],
  "Clean store": [
    "the store was clean and tidy",
    "a well-organized shop",
    "everything was neatly laid out",
    "the store was spotless",
  ],
  "Quick checkout": [
    "checkout was quick",
    "no queue at the till",
    "fast and easy checkout",
    "paid and out in no time",
  ],
  "Found what I needed": [
    "I found exactly what I needed",
    "got everything on my list",
    "found just what I was after",
    "picked up what I came for",
  ],
  // generic (other)
  "Great service": [
    "the service was great",
    "excellent service",
    "they looked after me well",
    "top-notch service",
  ],
  "Quick and easy": [
    "the whole thing was quick and easy",
    "a smooth, easy experience",
    "simple and painless",
    "fast and straightforward",
  ],
  "Would return": [
    "I'd come back again",
    "definitely returning",
    "I'll be back",
    "happy to return",
  ],
};

/** Capitalize the first letter of a fragment. */
function cap(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

function cleanNote(note?: string | null): string {
  if (!note) return "";
  return note.trim().replace(/\s+/g, " ");
}

/**
 * Pure draft generator. Reflects ONLY the customer's selections and note.
 * Returns a natural 2-3 sentence comment. Business name/type are context only.
 */
export function compose(input: ComposeInput): string {
  const rng = makeRng(input.seed);
  const bucket: "high" | "low" = input.stars >= 4 ? "high" : "low";
  const name = (input.businessName || "this place").trim();

  // Opener
  const opener = pick(rng, OPENERS[bucket]).replace("{name}", name);

  // Build the middle from selected tags (shuffled, phrased, de-duplicated).
  const phrases = shuffle(rng, input.tags)
    .map((tag) => TAG_PHRASES[tag])
    .filter(Boolean)
    .map((variants) => pick(rng, variants as string[]));

  let middle = "";
  if (phrases.length) {
    // Stitch 1-3 phrases with varied connectors.
    const chosen = phrases.slice(0, 3);
    middle = chosen.reduce((acc, phrase, i) => {
      if (i === 0) return cap(phrase);
      const connector = pick(rng, CONNECTORS);
      // After a sentence break, capitalize the next fragment.
      return connector === ". " ? acc + connector + cap(phrase) : acc + connector + phrase;
    }, "");
    if (!/[.!?]$/.test(middle)) middle += ".";
  }

  // Customer's own words, verbatim.
  const note = cleanNote(input.note);
  const noteSentence = note ? (/[.!?]$/.test(note) ? note : note + ".") : "";

  // Closer
  const closer = pick(rng, CLOSERS[bucket]);

  const parts = [opener, middle, cap(noteSentence), closer].filter(Boolean);

  // Join into prose, keeping it to roughly 2-3 sentences.
  return parts.join(" ").replace(/\s+/g, " ").trim();
}
