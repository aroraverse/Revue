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
 * Math.random so each call (and each "Regenerate") yields a new variation.
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

function chance(rng: () => number, p: number): boolean {
  return rng() < p;
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
 * Openers keyed by star bucket. 4-5 = positive, 1-3 = honest/mixed.
 * {name} is replaced with the business name. Written casually, as a real
 * person would start a quick review. No em dashes anywhere.
 */
const OPENERS: Record<"high" | "low", string[]> = {
  high: [
    "Had a great time at {name}.",
    "Really enjoyed my visit to {name}.",
    "{name} did not disappoint.",
    "So glad I stopped by {name}.",
    "A solid experience at {name}.",
    "Really happy with {name}.",
    "Can't fault {name} honestly.",
    "{name} was great.",
    "Lovely visit to {name}.",
    "Will be recommending {name} to friends.",
    "First time at {name} and I'll be back.",
    "{name} nailed it.",
  ],
  low: [
    "My visit to {name} was okay.",
    "Mixed experience at {name}.",
    "A few things could be better at {name}.",
    "My time at {name} was alright.",
    "{name} was just okay for me.",
    "Wanted to like {name} more than I did.",
    "{name} has potential but needs work.",
    "Not quite what I hoped for at {name}.",
  ],
};

const CLOSERS: Record<"high" | "low", string[]> = {
  high: [
    "Would happily come back.",
    "Highly recommend it.",
    "Will definitely return.",
    "Worth a visit.",
    "Looking forward to my next time.",
    "Can't wait to go back.",
    "Easy five stars from me.",
    "Do yourself a favor and check it out.",
    "Already planning my next visit.",
    "Would send anyone here.",
  ],
  low: [
    "Hope it keeps improving.",
    "Might give it another try.",
    "Room to grow, but promising.",
    "Would consider returning.",
    "Maybe it was just an off day.",
    "Hoping it's better next time.",
    "Not sure I'd rush back.",
  ],
};

/**
 * Connectors used to stitch tag phrases. Deliberately plain and human.
 * NO em dashes. `capNext` says whether the following fragment should be
 * capitalized: true after a bare period, false when the connector itself
 * already opens the sentence ("Also,", "Plus,") or continues it (", ").
 */
const CONNECTORS: { text: string; capNext: boolean }[] = [
  { text: ". ", capNext: true },
  { text: ". ", capNext: true },
  { text: ", ", capNext: false },
  { text: ", and ", capNext: false },
  { text: ". Also, ", capNext: false },
  { text: ". Plus, ", capNext: false },
];

/**
 * Phrasings per tag. Expanded to ~8-10 each so combinations rarely repeat.
 * Lowercase sentence fragments; the assembler capitalizes where needed.
 * Keys must match the tag strings in lib/tags.ts.
 */
const TAG_PHRASES: Record<string, string[]> = {
  // shared / restaurant / cafe
  "Friendly staff": [
    "the staff were friendly",
    "the team was welcoming",
    "everyone was really kind",
    "the people were warm and helpful",
    "staff greeted me with a smile",
    "the staff couldn't have been nicer",
    "friendly faces all around",
    "the team made me feel welcome",
    "lovely, down-to-earth staff",
    "the service came with a genuine smile",
  ],
  "Tasty food": [
    "the food was delicious",
    "every dish was tasty",
    "the flavors were spot on",
    "the meal was really good",
    "the food hit the spot",
    "everything we ordered was great",
    "proper tasty food",
    "the kitchen clearly knows what it's doing",
    "food came out fresh and full of flavor",
    "honestly some of the best I've had locally",
  ],
  "Clean space": [
    "the place was spotless",
    "everything was clean and tidy",
    "the space was well kept",
    "it was clean throughout",
    "spotless from front to back",
    "you could tell they care about cleanliness",
    "really well-maintained inside",
    "clean tables and floors, no complaints",
  ],
  "Quick service": [
    "the service was quick",
    "we were served fast",
    "there was barely any wait",
    "service was prompt",
    "we didn't wait long at all",
    "in and out without a fuss",
    "food arrived faster than expected",
    "no hanging around waiting",
  ],
  "Good value": [
    "it was great value",
    "the prices felt fair",
    "good value for money",
    "well worth the price",
    "you get a lot for what you pay",
    "reasonable prices for the quality",
    "didn't feel overpriced at all",
    "great bang for your buck",
  ],
  "Great ambience": [
    "the ambience was lovely",
    "the atmosphere was great",
    "it had a nice vibe",
    "the setting was relaxing",
    "really pleasant atmosphere",
    "the whole place had a nice feel to it",
    "comfortable and inviting inside",
    "a really chill spot to sit",
  ],
  "Great coffee": [
    "the coffee was excellent",
    "the coffee was spot on",
    "best coffee I've had in a while",
    "the brew was great",
    "proper good coffee",
    "my flat white was perfect",
    "they clearly take their coffee seriously",
    "smooth, well-made coffee",
  ],
  "Cozy spot": [
    "it's a cozy spot",
    "the place felt warm and inviting",
    "such a comfortable setting",
    "a snug little place",
    "really homely feel to it",
    "a comfy place to settle in for a while",
    "cosy without being cramped",
  ],
  "Fast service": [
    "service was fast",
    "we were looked after quickly",
    "no waiting around",
    "quick and efficient service",
    "sorted us out in no time",
    "speedy service without feeling rushed",
  ],
  "Nice music": [
    "the music set a nice mood",
    "loved the background music",
    "the playlist was on point",
    "great music throughout",
    "the tunes were a nice touch",
    "good music at just the right volume",
  ],
  // salon
  "Skilled stylist": [
    "the stylist was clearly skilled",
    "great work from the stylist",
    "the stylist knew exactly what to do",
    "really talented stylist",
    "my stylist listened and delivered",
    "clearly knew their craft",
    "best cut I've had in ages",
  ],
  "On-time service": [
    "they ran right on time",
    "no waiting past my appointment",
    "punctual from start to finish",
    "my appointment started on time",
    "seen bang on schedule",
    "no delays at all",
  ],
  "Great result": [
    "I loved the result",
    "the result turned out great",
    "exactly the look I wanted",
    "thrilled with how it came out",
    "couldn't be happier with it",
    "walked out feeling fantastic",
    "got loads of compliments after",
  ],
  "Relaxing vibe": [
    "the vibe was relaxing",
    "a calm and soothing space",
    "it felt relaxing throughout",
    "a peaceful atmosphere",
    "left feeling totally unwound",
    "such a calm, easy atmosphere",
  ],
  // clinic
  "Caring staff": [
    "the staff were caring",
    "the team was attentive and kind",
    "I felt genuinely looked after",
    "compassionate staff",
    "they really put me at ease",
    "kind and patient throughout",
    "you can tell they actually care",
  ],
  "Short wait": [
    "the wait was short",
    "I was seen quickly",
    "hardly any waiting",
    "minimal wait time",
    "barely sat down before being seen",
    "no long wait in the waiting room",
  ],
  "Clean facility": [
    "the facility was spotless",
    "everything was clean and hygienic",
    "a very clean environment",
    "the clinic was immaculate",
    "spotlessly clean and well kept",
    "hygiene was clearly a priority",
  ],
  "Clear explanation": [
    "everything was explained clearly",
    "they took time to explain things",
    "clear answers to my questions",
    "I understood every step",
    "nothing felt rushed or confusing",
    "they walked me through it all patiently",
  ],
  "Easy booking": [
    "booking was easy",
    "the appointment was simple to set up",
    "scheduling was hassle-free",
    "quick and easy to book",
    "booking online took two minutes",
    "getting an appointment was painless",
  ],
  "Felt comfortable": [
    "I felt comfortable throughout",
    "they put me at ease",
    "a reassuring experience",
    "I felt at ease the whole time",
    "nerves gone within minutes",
    "a calm and reassuring visit",
  ],
  // retail
  "Helpful staff": [
    "the staff were helpful",
    "the team pointed me in the right direction",
    "great help from the staff",
    "staff went out of their way to help",
    "someone helped me find exactly what I needed",
    "genuinely helpful without being pushy",
  ],
  "Great selection": [
    "the selection was great",
    "loads of choice",
    "a well-stocked range",
    "plenty of good options",
    "spoilt for choice honestly",
    "a really good range to pick from",
  ],
  "Fair prices": [
    "the prices were fair",
    "reasonable prices",
    "good prices across the board",
    "fairly priced",
    "prices were better than I expected",
    "nothing felt marked up",
  ],
  "Clean store": [
    "the store was clean and tidy",
    "a well-organized shop",
    "everything was neatly laid out",
    "the store was spotless",
    "easy to find things, well organized",
    "tidy and easy to browse",
  ],
  "Quick checkout": [
    "checkout was quick",
    "no queue at the till",
    "fast and easy checkout",
    "paid and out in no time",
    "zero wait at the till",
    "checkout was a breeze",
  ],
  "Found what I needed": [
    "I found exactly what I needed",
    "got everything on my list",
    "found just what I was after",
    "picked up what I came for",
    "they had exactly what I wanted in stock",
    "left with everything I needed",
  ],
  // generic (other)
  "Great service": [
    "the service was great",
    "excellent service",
    "they looked after me well",
    "top-notch service",
    "service was first class",
    "really well looked after",
  ],
  "Quick and easy": [
    "the whole thing was quick and easy",
    "a smooth, easy experience",
    "simple and painless",
    "fast and straightforward",
    "no hassle from start to finish",
    "easy from start to end",
  ],
  "Would return": [
    "I'd come back again",
    "definitely returning",
    "I'll be back",
    "happy to return",
    "already planning a return trip",
    "they've got a repeat customer in me",
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

/** Strip any em/en dashes that may sneak in from a note, to keep it human. */
function deDash(s: string): string {
  return s.replace(/\s*[—–]\s*/g, ", ");
}

/**
 * Pure draft generator. Reflects ONLY the customer's selections and note.
 * Returns a natural 2-3 sentence comment, written to read like a real person.
 * Business name/type are context only. Contains no em dashes.
 */
export function compose(input: ComposeInput): string {
  const rng = makeRng(input.seed);
  const bucket: "high" | "low" = input.stars >= 4 ? "high" : "low";
  const name = (input.businessName || "this place").trim();

  // Opener
  const opener = pick(rng, OPENERS[bucket]).replace("{name}", name);

  // Build the middle from selected tags (shuffled, phrased).
  const phrases = shuffle(rng, input.tags)
    .map((tag) => TAG_PHRASES[tag])
    .filter(Boolean)
    .map((variants) => pick(rng, variants as string[]));

  let middle = "";
  if (phrases.length) {
    // Keep it to 1-3 points so it stays short and believable.
    const take = Math.min(phrases.length, chance(rng, 0.5) ? 2 : 3);
    const chosen = phrases.slice(0, take);
    middle = chosen.reduce((acc, phrase, i) => {
      if (i === 0) return cap(phrase);
      const connector = pick(rng, CONNECTORS);
      return acc + connector.text + (connector.capNext ? cap(phrase) : phrase);
    }, "");
    if (!/[.!?]$/.test(middle)) middle += ".";
  }

  // Customer's own words, verbatim (dashes normalized so the whole thing reads
  // consistently human).
  const note = deDash(cleanNote(input.note));
  const noteSentence = note ? (/[.!?]$/.test(note) ? note : note + ".") : "";

  // Closer (sometimes dropped on high ratings for a more natural, shorter feel)
  const dropCloser = bucket === "high" && phrases.length >= 2 && chance(rng, 0.25);
  const closer = dropCloser ? "" : pick(rng, CLOSERS[bucket]);

  const parts = [opener, middle, cap(noteSentence), closer].filter(Boolean);

  return deDash(parts.join(" ")).replace(/\s+/g, " ").trim();
}
