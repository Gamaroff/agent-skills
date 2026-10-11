// ---------------------------------------------------------------------------
// pipeline-answers-generic.test.mjs — task.201 AC10: no consumer-specific names.
// ---------------------------------------------------------------------------
// task.201 was designed from one consumer's measurements, so its names are the
// ones most likely to leak into what it ships. This scans what task.201 wrote —
// its engines whole, and its sections of the shared documents and skills — for
// that consumer's identifiers. The other half of AC10, "all limits from
// skills-config.yaml", is held by pipeline-answers-docs.test.mjs 4a/4g.
//
// The documents it touched carry older consumer examples (a RAPP key in §0a's
// lookup, for one), which are not task.201's to remove; so a document is scanned
// by its task.201 section, found by heading, and every section must be found and
// non-empty — a renamed heading turns this red rather than scanning nothing.
//
//   1. The scanner flags each consumer identifier (non-vacuity).
//   2. task.201's engines carry none.
//   3. task.201's document sections carry none.
//
// Run: node --test shared/resources/tests/pipeline-answers-generic.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..", "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

// The consumer task.201 was measured in: its repository name and its Jira key.
const CONSUMER_NAMES = [/rebirth/i, /\bRAPP\b/, /\bRAPP-\d+/];

function consumerHits(text) {
  return text
    .split("\n")
    .map((line, i) => ({ line: i + 1, text: line }))
    .filter((l) => CONSUMER_NAMES.some((re) => re.test(l.text)));
}

/** The section under the first heading matching `heading`, to the next heading at its level or above. */
function section(text, heading) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => /^#{1,6} /.test(l) && heading.test(l));
  if (start < 0) return null;
  const level = lines[start].match(/^#+/)[0].length;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(#+) /);
    if (m && m[1].length <= level) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

const ENGINES = [
  "shared/resources/pipeline-answers.js",
  "shared/resources/record-reviewed-blob.js",
];

const SECTIONS = [
  [
    "shared/resources/develop-pipeline-step-0-resolve-and-prepare.md",
    /Answer resolution — ask only what nothing answers/,
  ],
  [
    "shared/resources/develop-pipeline-lite-mode.md",
    /^## Speed Modes and Skips/,
  ],
  [
    "shared/resources/develop-pipeline-step-2-review.md",
    /When `--skip review` Is in Force/,
  ],
  [
    "shared/resources/develop-pipeline-step-5-6-qa-loop.md",
    /Recording a waived step/,
  ],
  [
    "shared/resources/develop-pipeline-resume-contract.md",
    /Persisted up-front answers/,
  ],
  ["skills/develop-task/SKILL.md", /^## Invocation Flags/],
  ["skills/develop-story/SKILL.md", /^## Invocation Flags/],
  ["skills/develop-bug/SKILL.md", /^## Invocation Flags/],
];

test("1: the scanner flags each consumer identifier", () => {
  for (const sample of [
    "see rebirth-wallet",
    "Rebirth",
    "RAPP-702",
    "the RAPP board",
  ]) {
    assert.equal(consumerHits(`ok\n${sample}\nok`).length, 1, sample);
  }
  assert.equal(consumerHits("rapport, TRAPPED, develop, main").length, 0);
});

test("2: task.201's engines name no consumer", () => {
  for (const rel of ENGINES) {
    const text = read(rel);
    assert.ok(text.length > 1000, `${rel} read as near-empty`);
    assert.deepEqual(consumerHits(text), [], rel);
  }
});

test("3: task.201's document sections name no consumer", () => {
  for (const [rel, heading] of SECTIONS) {
    const body = section(read(rel), heading);
    assert.ok(body, `${rel}: no heading matching ${heading} — update SECTIONS`);
    assert.ok(
      body.split("\n").length > 5,
      `${rel}: section ${heading} is near-empty`,
    );
    assert.deepEqual(consumerHits(body), [], `${rel} ${heading}`);
  }
});
