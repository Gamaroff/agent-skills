// finalise-dod-ac-kinds.test.mjs — the AC prompt's test-free criterion kinds (task 166; obs #206,
// obs #204).
//
// finalise's AC traceability agent passes a criterion without a per-PR test only when it is one of
// the kinds § Step 3 of finalise-dod-ac-prompt.md names. obs #204 added the documentation kind with
// no test; obs #206 adds the measured kind. These prompts are executed by an agent, not code, so a
// test can hold their STRUCTURE but not their effect: the stated count equals the bulleted kinds,
// each kind carries its own `test_citation` string, the measured kind's bar names the words it
// depends on, the closing sentence reaches every kind, and the file states the count exactly once
// (the Execution rule used to restate it — review 1). Behaviour evidence is the next real finalise
// run that meets a measured criterion.
//
// The copy check duplicates `npm run bundle:check` on purpose: a local `node --test` run shows the
// drift without the bundler in the loop.

import test from "node:test";
import assert from "node:assert/strict";
import { readDoc } from "./lib/executed-prose.mjs";

const SRC = "shared/resources/finalise-dod-ac-prompt.md";
const COPIES = [
  "skills/finalise/references/finalise-dod-ac-prompt.md",
  "skills/review-task/references/finalise-dod-ac-prompt.md",
];
const WORDS = { two: 2, three: 3, four: 4, five: 5, six: 6 };
const HEAD =
  /\*\*(\w+) kinds of criterion may carry `test_citation: "NOT_APPLICABLE: …"`, and only these (\w+):\*\*/;
const CLOSING = "`test_runs_per_pr` is `null`";
// A count word or digits, then up to three qualifiers ("`NOT_APPLICABLE`", "test-free"), then "kinds".
const COUNT_OF_KINDS =
  /\b(two|three|four|five|six|seven|eight|nine|ten|\d+|both)(?: [\w`-]+){0,3} kinds\b/gi;

function kindsSection(doc) {
  const head = doc.match(HEAD);
  assert.ok(head, `${SRC}: no test-free kinds heading sentence`);
  const end = doc.indexOf(CLOSING, head.index);
  assert.notEqual(
    end,
    -1,
    `${SRC}: no closing "${CLOSING}" sentence after the kinds`,
  );
  return {
    head,
    section: doc.slice(head.index, end),
    closing: doc.slice(end, doc.indexOf("\n", end)),
  };
}

test("the stated count equals the bulleted kinds, and each kind carries its test_citation", () => {
  const { head, section } = kindsSection(readDoc(SRC));
  const n = WORDS[head[1].toLowerCase()];
  assert.ok(
    n >= 3,
    `${SRC}: heading states "${head[1]}" kinds — the floor is three`,
  );
  assert.equal(
    WORDS[head[2].toLowerCase()],
    n,
    `${SRC}: heading says ${head[1]} … only these ${head[2]}`,
  );
  const kinds = [...section.matchAll(/^- \*\*([^*]+)\*\*/gm)].map((m) => m[1]);
  assert.equal(
    kinds.length,
    n,
    `${SRC}: heading says ${n} kinds, ${kinds.length} bulleted: ${kinds}`,
  );
  for (const s of [
    '"NOT_APPLICABLE: documentation criterion"',
    '"NOT_APPLICABLE: measured criterion"',
  ])
    assert.ok(section.includes(s), `${SRC}: kinds section lacks ${s}`);
});

test("the measured kind's PASS needs a stated bound, a committed measurement and its command", () => {
  const { section } = kindsSection(readDoc(SRC));
  const at = section.indexOf("- **A measured criterion.**");
  assert.notEqual(at, -1, `${SRC}: no measured-criterion kind`);
  // Up to the next top-level kind bullet, or the section end: a kind added after this one must not
  // supply the phrases this kind's bar needs (QA cycle 1, CR-5).
  const next = section.indexOf("\n- **", at + 1);
  const measured = section.slice(at, next === -1 ? undefined : next);
  for (const w of [
    "`PASS` when the criterion states a bound",
    "the command is named",
    "**committed** artifact",
    "`FAIL` when the measurement is uncited or uncommitted, or when it misses the bound",
    "states no numeric bound",
    "is not a measured criterion: it takes the behaviour path",
    "if one could, it is a behaviour criterion",
  ])
    assert.ok(
      measured.includes(w),
      `${SRC}: the measured kind's bar lacks "${w}"`,
    );
});

test("the closing sentence reaches every kind and routes a testable bound to the behaviour path", () => {
  const { head, closing } = kindsSection(readDoc(SRC));
  // The heading's own count word, not a literal — a correctly worded added kind must not red this
  // test for the wrong reason (QA cycle 1, CR-4).
  const word = head[1].toLowerCase();
  assert.ok(
    closing.includes(`on all ${word} kinds`),
    `${SRC}: closing sentence does not say "on all ${word} kinds"`,
  );
  assert.match(closing, /never takes any of these paths/);
  assert.match(
    closing,
    /a bound a per-PR test could assert is a behaviour criterion/,
  );
});

test("no sentence restates the count of kinds with a different number", () => {
  const doc = readDoc(SRC);
  const word = kindsSection(doc).head[1].toLowerCase();
  // The heading's own count, and the closing sentence's "all <count> kinds", use the heading's word.
  // Any other count word — "The two `NOT_APPLICABLE` kinds", "both kinds" — is a second definition
  // that has drifted from the first.
  const counts = [...doc.matchAll(COUNT_OF_KINDS)];
  assert.ok(
    counts.length >= 2,
    `${SRC}: expected the heading and closing counts, found ${counts.length}`,
  );
  const drifted = counts
    .map((m) => m[0])
    .filter((c) => !c.toLowerCase().startsWith(`${word} `));
  assert.deepEqual(
    drifted,
    [],
    `${SRC}: a count of the kinds other than "${word}": ${drifted}`,
  );
});

test("every bundled copy matches its source", () => {
  const strip = (s) => s.replace(/^<!-- AUTO-GENERATED[^\n]*\n/m, "");
  for (const copy of COPIES)
    assert.equal(
      strip(readDoc(copy)),
      strip(readDoc(SRC)),
      `${copy} drifted from ${SRC}`,
    );
});
