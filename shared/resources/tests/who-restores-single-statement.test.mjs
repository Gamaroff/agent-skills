// who-restores-single-statement.test.mjs — the rule "who restores the lock on a resume, and when"
// is stated ONCE and cited everywhere else (task.130 Phase 4; obs #132).
//
// The defect this closes: task.124 stated the rule at five sites — the resume contract's Phase 0b
// paragraph, step-0 §0b, and the three orchestrators' Step 0-lock paragraphs — and each QA cycle
// fixed it at one site while the others stayed wrong (bugs 9 → 11 → 12 → 13). The rule now lives
// under the contract's "Restore the lock (both resume paths)", marked, and the five sites carry a
// one-sentence citation and no rule text of their own.
//
// The test is keyed on a MARKER, not on the rule's token (`loop-limit|not-converging`), for two
// reasons the review found: the token is shared with the grant-offer rule (contract § Re-entry
// step 3; the SKILL.md Re-entry paragraphs), which legitimately keeps it — a token test is red on
// develop the moment it lands; and develop-bug's restatement carried no token at all ("has **no
// re-entry grant** — … runs on **every** halt snapshot") — a token test is blind to it.
//
// Each block below is the smallest claim whose reverse turns it red:
//   (i)   exactly one marker across shared/resources/**/*.md and skills/develop-*/SKILL.md
//         (remove the marker → red; paste it at a second site → red)
//   (ii)  in each of the five citation sites, no line pairs a restore verb with a discriminator
//         (paste the old Phase 0b sentence back → red on the contract; paste develop-bug's
//         "no re-entry grant" sentence back → red on develop-bug — the token-free case)
//   (iii) each of the five sites carries the citation phrase
//   Sites are located by heading / bold-lead anchor, never by line number; the grant-offer prose
//   is outside every checked site by construction.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const MARKER = /<!-- who-restores: statement -->/g;
const CITATION = /Restore the lock \(both resume paths\)/;
// A line is rule text when a restore verb and a discriminator share it.
const RESTORE_VERB = /\b(restore|restores|restoring|runs the command)\b/i;
const DISCRIMINATOR = /loop-limit\|not-converging|no re-entry grant/;

const CONTRACT = "shared/resources/develop-pipeline-resume-contract.md";
const STEP0 = "shared/resources/develop-pipeline-step-0-resolve-and-prepare.md";
const SKILLS = ["develop-task", "develop-story", "develop-bug"].map(
  (s) => `skills/${s}/SKILL.md`,
);

// ── Site extraction — by anchor, never by line number ─────────────────────────

/** Text from `startRe`'s match up to (not including) `endRe`'s next match. */
function slice(text, startRe, endRe, label) {
  const m = startRe.exec(text);
  assert.ok(m, `${label}: start anchor not found — ${startRe}`);
  const from = m.index;
  const rest = text.slice(from + m[0].length);
  const e = endRe.exec(rest);
  assert.ok(e, `${label}: end anchor not found after start — ${endRe}`);
  return text.slice(from, from + m[0].length + e.index);
}

function sites() {
  const out = {};
  // Contract Phase 0b paragraph: the bold lead up to the fenced `--restore` command.
  out[`${CONTRACT} § Restoring the lock — on either resume path`] = slice(
    read(CONTRACT),
    /\*\*Restoring the lock — on either resume path\.\*\*/,
    /```bash/,
    "contract Phase 0b",
  );
  // step-0 §0b paragraph: the bold lead up to its fence.
  out[`${STEP0} § Restore the lock before anything advances it`] = slice(
    read(STEP0),
    /\*\*Restore the lock before anything advances it/,
    /```bash/,
    "step-0 §0b",
  );
  // Each orchestrator's Step 0-lock: from its heading to the Step 0a heading.
  for (const rel of SKILLS) {
    out[`${rel} § Step 0-lock`] = slice(
      read(rel),
      /\*\*Step 0-lock — Restore the lock if the pause removed it/,
      /\*\*Step 0a — Dispatch stale-context detector/,
      `${rel} Step 0-lock`,
    );
  }
  return out;
}

// ── (i) exactly one marker ────────────────────────────────────────────────────

function* walkMd(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) yield* walkMd(p);
    else if (ent.name.endsWith(".md")) yield p;
  }
}

test("(i) the who-restores marker appears exactly once across shared/resources/**/*.md + skills/develop-*/SKILL.md", () => {
  const files = [
    ...walkMd(path.join(ROOT, "shared", "resources")),
    ...SKILLS.map((rel) => path.join(ROOT, rel)),
  ];
  const carriers = [];
  for (const f of files) {
    const n = (fs.readFileSync(f, "utf8").match(MARKER) || []).length;
    for (let i = 0; i < n; i++) carriers.push(path.relative(ROOT, f));
  }
  assert.deepEqual(
    carriers,
    [CONTRACT],
    `expected the marker once, in the contract; found ${carriers.length}: ${carriers.join(", ")}`,
  );
  // And it marks the right section — the statement lives under this heading, not elsewhere.
  const contract = read(CONTRACT);
  const heading = contract.indexOf("### Restore the lock (both resume paths)");
  const marker = contract.search(MARKER);
  assert.ok(
    heading >= 0 && marker > heading && marker - heading < 200,
    "the marker is not directly under the one-statement heading",
  );
});

// ── (ii) / (iii) the five citation sites ──────────────────────────────────────

test("(ii) no citation site carries a line that pairs a restore verb with a discriminator", () => {
  for (const [label, text] of Object.entries(sites())) {
    const offenders = text
      .split(/\r?\n/)
      .filter((l) => RESTORE_VERB.test(l) && DISCRIMINATOR.test(l));
    assert.equal(
      offenders.length,
      0,
      `${label} restates the who-restores rule:\n  ${offenders.map((l) => l.trim().slice(0, 120)).join("\n  ")}`,
    );
  }
});

test("(iii) every citation site points at the one statement", () => {
  const all = sites();
  assert.equal(Object.keys(all).length, 5, "expected five citation sites");
  for (const [label, text] of Object.entries(all)) {
    assert.match(
      text,
      CITATION,
      `${label} does not cite "Restore the lock (both resume paths)"`,
    );
  }
});

// ── Non-vacuity: the one statement still says what the citations point at ────

test("the one statement carries both discriminators (the rule was moved, not lost)", () => {
  const contract = read(CONTRACT);
  const section = slice(
    contract,
    /### Restore the lock \(both resume paths\)/,
    /\n### /,
    "one statement",
  );
  assert.match(
    section,
    /loop-limit\|not-converging/,
    "the grant arm is gone from the statement",
  );
  assert.match(
    section,
    /develop-bug/,
    "the develop-bug arm is gone from the statement",
  );
  assert.match(
    section,
    /--restore/,
    "the restore command is gone from the statement",
  );
});
