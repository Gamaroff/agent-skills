// ---------------------------------------------------------------------------
// pipeline-answers-generic.test.mjs — task.201 AC10: no consumer-specific names.
// ---------------------------------------------------------------------------
// task.201 was designed from one consumer's measurements, so its names are the
// ones most likely to leak into what it ships. This scans every shipped file
// task.201 wrote into — WHOLE, so no fence, comment or heading can end the scan
// early — for that consumer's identifiers. The other half of AC10, "all limits
// from skills-config.yaml", is held by pipeline-answers-docs.test.mjs 4a/4g.
//
// The population is derived, not listed: every shipped document or engine that
// cites `task.201`, plus the files task.201 changed without citing itself
// (ALSO_CHANGED). Older consumer examples in those files (a RAPP key in §0a's
// lookup, for one) are not task.201's to remove; each is exempted by its exact
// line, and an exemption that no longer matches a line is itself a failure, so
// the list cannot outlive what it excuses. (QA cycle 5: a heading-based section
// reader read a fenced `# comment` as a heading and skipped §0d's resolver block.)
//
//   1. The scanner flags each consumer identifier (non-vacuity).
//   2. The population is the files task.201 touched, and is not vacuous.
//   3. No file in it names the consumer outside an exempted line.
//   4. Every exemption still matches exactly one line.
//
// Run: node --test shared/resources/tests/pipeline-answers-generic.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..", "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

// The consumer task.201 was measured in: its repository name and its Jira key.
const CONSUMER_NAMES = [/rebirth/i, /\bRAPP\b/];

function consumerHits(text) {
  return text
    .split("\n")
    .map((line, i) => ({ line: i + 1, text: line.trim() }))
    .filter((l) => CONSUMER_NAMES.some((re) => re.test(l.text)));
}

/** Shipped files: top-level shared resources, each skill's SKILL.md, and the reference/operations docs. */
function shippedFiles() {
  const out = [];
  for (const f of readdirSync(join(ROOT, "shared/resources")))
    if (/\.(md|js)$/.test(f)) out.push(`shared/resources/${f}`);
  for (const d of readdirSync(join(ROOT, "skills")))
    if (existsSync(join(ROOT, "skills", d, "SKILL.md")))
      out.push(`skills/${d}/SKILL.md`);
  for (const dir of ["docs/reference", "docs/operations"])
    for (const f of readdirSync(join(ROOT, dir)))
      if (f.endsWith(".md")) out.push(`${dir}/${f}`);
  return out;
}

// Changed by task.201 without citing it. CHANGELOG.md is not here: release notes
// are history and cite consumer reports by design; nothing executes them.
const ALSO_CHANGED = [
  "shared/resources/develop-pipeline-autonomous-defaults.md",
  "skills/develop-batch/SKILL.md",
];

function population() {
  return [
    ...new Set([
      ...shippedFiles().filter((rel) => read(rel).includes("task.201")),
      ...ALSO_CHANGED,
    ]),
  ].sort();
}

// Pre-task.201 consumer examples, each by its exact trimmed line.
const EXEMPT = [
  [
    "shared/resources/develop-pipeline-step-0-resolve-and-prepare.md",
    "# Anchored at both ends, so RAPP-70 does not match RAPP-702 and issue 5 does not match 55.",
  ],
  [
    "shared/resources/develop-pipeline-step-0-resolve-and-prepare.md",
    `# Quote-tolerant: jira_key is written quoted ('RAPP-702' or "RAPP-702") in most consumer docs.`,
  ],
  [
    "shared/resources/develop-pipeline-step-0-resolve-and-prepare.md",
    "match that resolved `RAPP-70` to `RAPP-702`'s document, matched no quoted key at all, and excluded",
  ],
  [
    "shared/resources/develop-pipeline-step-2-review.md",
    "> Reported by a consumer (`rebirth-wallet` task.113 / RAPP-728) that **predicted** the halt from",
  ],
  [
    "skills/finalise/SKILL.md",
    "> Observed live (rebirth-wallet, stories 3.2 and 3.3, 2026-08-05 and 2026-08-08) — diagnosed",
  ],
  [
    "skills/finalise/SKILL.md",
    ">   it writes **last** and can walk the card straight off the ladder's target. That is the RAPP-715",
  ],
  [
    "skills/finalise/SKILL.md",
    "> consumer this bites. Observed on RAPP-715 (2026-09-05): closed to `Done` + `resolution: Done`,",
  ],
];
const isExempt = (rel, text) =>
  EXEMPT.some(([f, line]) => f === rel && line === text);

test("1: the scanner flags each consumer identifier, and only those", () => {
  for (const sample of [
    "see rebirth-wallet",
    "Rebirth",
    "RAPP-702",
    "the RAPP board",
    "```bash\n# rebirth in a fenced comment\n```",
  ]) {
    assert.equal(consumerHits(`ok\n${sample}\nok`).length, 1, sample);
  }
  assert.equal(consumerHits("rapport, TRAPPED, develop, main").length, 0);
});

test("2: the population is the files task.201 touched, and is not vacuous", () => {
  const pop = population();
  assert.ok(pop.length >= 20, `population read as ${pop.length} files`);
  for (const must of [
    "shared/resources/pipeline-answers.js",
    "shared/resources/record-reviewed-blob.js",
    "shared/resources/develop-pipeline-step-0-resolve-and-prepare.md",
    "skills/develop-task/SKILL.md",
    "skills/develop-story/SKILL.md",
    "skills/develop-bug/SKILL.md",
    ...ALSO_CHANGED,
  ])
    assert.ok(pop.includes(must), `${must} missing from the population`);
});

test("3: no file task.201 touched names the consumer outside an exempted line", () => {
  const found = [];
  for (const rel of population())
    for (const h of consumerHits(read(rel)))
      if (!isExempt(rel, h.text)) found.push(`${rel}:${h.line}: ${h.text}`);
  assert.deepEqual(found, []);
});

test("4: every exemption still matches exactly one line", () => {
  for (const [rel, line] of EXEMPT) {
    const n = read(rel)
      .split("\n")
      .filter((l) => l.trim() === line).length;
    assert.equal(n, 1, `${rel}: exemption matches ${n} lines — ${line}`);
  }
});
