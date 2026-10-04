import { test } from "node:test";
import assert from "node:assert/strict";
import { compose } from "../lib/compose.ts";

test("empty tags still produces a natural non-empty comment", () => {
  const out = compose({
    businessName: "Bella Pasta",
    type: "restaurant",
    stars: 5,
    tags: [],
    note: null,
    seed: 1,
  });
  assert.ok(out.length > 0, "comment should not be empty");
  assert.ok(out.includes("Bella Pasta"), "should mention the business name");
  // No tags selected -> should not invent any tag phrasing, just opener+closer.
  assert.ok(/[.!?]$/.test(out), "should end with punctuation");
});

test("different seeds produce different variations", () => {
  const base = {
    businessName: "Bella Pasta",
    type: "restaurant" as const,
    stars: 5,
    tags: ["Friendly staff", "Tasty food", "Clean space"],
    note: null,
  };
  const a = compose({ ...base, seed: 1 });
  const b = compose({ ...base, seed: 2 });
  const c = compose({ ...base, seed: 3 });
  // At least one of the pairs should differ -> variation works.
  assert.ok(a !== b || b !== c || a !== c, "variations should differ across seeds");
});

test("same seed is deterministic", () => {
  const input = {
    businessName: "Bella Pasta",
    type: "restaurant" as const,
    stars: 4,
    tags: ["Tasty food", "Good value"],
    note: "Loved the tiramisu",
    seed: 42,
  };
  assert.equal(compose(input), compose(input));
});

test("customer note is included verbatim", () => {
  const note = "The window seat had a lovely view";
  const out = compose({
    businessName: "Cafe Luna",
    type: "cafe",
    stars: 5,
    tags: ["Great coffee"],
    note,
    seed: 7,
  });
  assert.ok(out.includes(note), "note text must appear verbatim");
});

test("low stars use honest openers, not glowing ones", () => {
  const out = compose({
    businessName: "QuickCuts",
    type: "salon",
    stars: 2,
    tags: ["Clean space"],
    note: null,
    seed: 5,
  });
  assert.ok(out.length > 0);
  // Should not claim "highly recommend" style closers reserved for high bucket.
  assert.ok(!/highly recommend/i.test(out), "low rating should not strongly recommend");
});

test("only selected tags are reflected (no invented content)", () => {
  const out = compose({
    businessName: "Shop Co",
    type: "retail",
    stars: 5,
    tags: ["Fair prices"],
    note: null,
    seed: 9,
  });
  // Should not mention unrelated tag concepts like coffee or stylist.
  assert.ok(!/coffee|stylist|clinic/i.test(out));
});
