/**
 * Population check — every shipped-prose site where an agent-reported probe
 * count gates a verdict must read that count from an engine-written artefact,
 * or be allowlisted with a reason (task.118, obs #10).
 *
 * WHY A POPULATION CHECK AND NOT THE THREE EDITS. `docs/reference/anti-patterns.md`
 * §"Never fix N call sites without a population check": task.118 was filed
 * naming two sites (review-security, finalise's DoD prompt) and the walk below
 * found a third (qa-story / qa-task Step 3b) the moment it ran. Site four will
 * be written by someone who has never read this file. This is what finds it.
 *
 * WHAT "READS THE ARTEFACT" MEANS. Within ±WINDOW lines of the site, the prose
 * names the run record or the engine flags that produce and consume it
 * (`--record`, `--emit-block`, `totals.executed`, `*.run.json`). A site that
 * says "record the total in probes_executed" with none of those nearby is an
 * agent typing a number — exactly the shape this test is named for, and the
 * negative control at the bottom proves the matcher can see it.
 *
 * THE ALLOWLIST IS FOR CONSUMERS AND DEFINITIONS, NOT PRODUCERS. The gate-side
 * schema (`qa-gate-security-evidence.md`), the render template in
 * `finalise/SKILL.md`, and the YAML rules that VALIDATE a count all mention the
 * field without producing it. Each entry carries a reason and must still match
 * at least one site, so an entry cannot outlive the line it excuses.
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);

const SITE_RE = /probes_executed|evidence:\s*measured\b/;
const WINDOW = 5;
/** Independent of SITE_RE on purpose — a matcher that shares its pattern with the site finder passes every site by construction. */
const READS_ARTEFACT_RE =
  /--record\b|--emit-block\b|run record|totals\.executed|\.run\.json|from the record/;

/**
 * Consumer / definition sites. `match` is applied to the SITE LINE, not the
 * window, so an entry excuses exactly the sentence it names.
 */
const ALLOWLIST = [
  {
    file: "shared/resources/qa-gate-security-evidence.md",
    match: /./,
    reason:
      "gate-side schema — defines the field a producer fills and states the rule; produces no count",
  },
  {
    file: "shared/resources/probe-boundary-rule.md",
    match: /self-reported/,
    reason: "names the defect (a self-reported zero) as the thing to avoid",
  },
  {
    file: "shared/resources/security-input-corpus.md",
    match: /exists to catch/,
    reason: "incidental mention of what the count is for",
  },
  {
    file: "skills/finalise/SKILL.md",
    match: /./,
    reason:
      "consumes SECURITY_RESULT from finalise-dod-security-prompt.md, which reads the record; renders and validates, never counts",
  },
  {
    file: /^skills\/qa-(story|task)\/SKILL\.md$/,
    match:
      /evidence: measured\|reasoned\|unverified|REQUIRED when evidence: measured|must be > 0|probes_executed rule:/,
    reason:
      "gate YAML template and NFR evaluation criteria — the count enters via Step 3b, which reads the record",
  },
  {
    file: "shared/resources/security-review-prompt.md",
    match: /lifted verbatim|same names and the same meanings/,
    reason:
      "the QA gate lifts the engine-emitted block verbatim; the lift is a copy, not a count",
  },
  {
    file: "shared/resources/finalise-dod-security-prompt.md",
    match:
      /is required|counts as \*\*zero\*\*|not by itself a failure|must carry the|emit a check with `status: FAIL`|is the failure in the guard/,
    reason:
      "validation rules on the YAML the step emits — they read the count step 4 copied from the record",
  },
];

/** Shipped sources only: shared/resources/*.md and skills/*\/SKILL.md, plus un-bannered references. */
function shippedDocs() {
  const out = [];
  const shared = path.join(REPO_ROOT, "shared", "resources");
  for (const f of fs.readdirSync(shared)) {
    if (f.endsWith(".md")) out.push(path.join(shared, f));
  }
  const skills = path.join(REPO_ROOT, "skills");
  for (const skill of fs.readdirSync(skills)) {
    const md = path.join(skills, skill, "SKILL.md");
    if (fs.existsSync(md)) out.push(md);
    const refs = path.join(skills, skill, "references");
    if (!fs.existsSync(refs)) continue;
    for (const f of fs.readdirSync(refs)) {
      if (!f.endsWith(".md")) continue;
      const abs = path.join(refs, f);
      const head = fs
        .readFileSync(abs, "utf8")
        .split("\n")
        .slice(0, 20)
        .join("\n");
      if (!head.includes("AUTO-GENERATED")) out.push(abs);
    }
  }
  return out;
}

function classify(lines, i) {
  const window = lines
    .slice(Math.max(0, i - WINDOW), i + WINDOW + 1)
    .join("\n");
  return READS_ARTEFACT_RE.test(window);
}

function collectSites() {
  const sites = [];
  for (const abs of shippedDocs()) {
    const rel = path.relative(REPO_ROOT, abs);
    const lines = fs.readFileSync(abs, "utf8").split("\n");
    lines.forEach((text, i) => {
      if (!SITE_RE.test(text)) return;
      sites.push({
        file: rel,
        line: i + 1,
        text,
        readsArtefact: classify(lines, i),
      });
    });
  }
  return sites;
}

function allowlisted(site) {
  return ALLOWLIST.find(
    (e) =>
      (e.file instanceof RegExp
        ? e.file.test(site.file)
        : e.file === site.file) && e.match.test(site.text),
  );
}

const SITES = collectSites();

test("the walk finds the population (non-vacuity floor)", () => {
  // relationship-assertion-lint: allow — a walk-sanity floor on the site count, not a row mapping; the producer files are each asserted by name below
  assert.ok(
    SITES.length >= 10,
    `only ${SITES.length} probes_executed sites found — the walk or SITE_RE is probably broken`,
  );
  const producers = new Set(
    SITES.filter((s) => s.readsArtefact).map((s) => s.file),
  );
  assert.ok(
    producers.size >= 2,
    `only ${producers.size} file(s) read the run record — task.118 named two producer sites and found a third; fewer than two means the matcher no longer sees them: ${[...producers].join(", ")}`,
  );
});

test("every site reads the engine's artefact or is allowlisted with a reason", () => {
  const bare = SITES.filter((s) => !s.readsArtefact && !allowlisted(s));
  assert.deepEqual(
    bare.map((s) => `${s.file}:${s.line}  ${s.text.trim()}`),
    [],
    "these sites mention a probe count with no run record / --record / --emit-block within " +
      `±${WINDOW} lines and no allowlist entry. Either make the site copy the count from the ` +
      "engine's record (see security-review-prompt.md §4) or add an allowlist entry with a reason " +
      "explaining why this site consumes rather than produces the count.",
  );
});

test("no allowlist entry is stale — each still excuses at least one site", () => {
  const stale = ALLOWLIST.filter(
    (e) => !SITES.some((s) => allowlisted(s) === e),
  );
  assert.deepEqual(
    stale.map((e) => `${e.file}: ${e.reason}`),
    [],
    "an allowlist entry matches nothing — the line it excused moved or was fixed; remove the entry",
  );
  for (const e of ALLOWLIST) {
    assert.ok(
      typeof e.reason === "string" && e.reason.length > 20,
      "every allowlist entry carries a reason",
    );
  }
});

test("the three named producer sites read the record", () => {
  for (const file of [
    "shared/resources/security-review-prompt.md",
    "shared/resources/finalise-dod-security-prompt.md",
    "skills/qa-task/SKILL.md",
    "skills/qa-story/SKILL.md",
    "skills/review-security/SKILL.md",
  ]) {
    assert.ok(
      SITES.some((s) => s.file === file && s.readsArtefact),
      `${file}: no probes_executed site reads the run record — the count is typed again`,
    );
  }
});

/**
 * Every shipped invocation of the engine that names an --entry must also pass
 * --repo-root. From an installed skill the engine's default containment root is
 * the skill directory, so a repo-relative entry resolved there does not exist
 * and records `unverifiable` / 0 for every control — the exact run this task
 * exists to make impossible to misreport (QA cycle 1, CR-1: the review-security
 * command itself shipped without the flag).
 */
function invocationsOf(lines) {
  const out = [];
  lines.forEach((text, i) => {
    if (!/security-probe\.mjs/.test(text) || /^\s*(#|\/\/)/.test(text)) return;
    // Reassemble a backslash-continued command before reading its flags.
    let cmd = text;
    let j = i;
    while (/\\\s*$/.test(lines[j]) && j + 1 < lines.length) {
      j += 1;
      cmd += " " + lines[j];
    }
    if (/--entry\b/.test(cmd)) out.push({ line: i + 1, cmd });
  });
  return out;
}

test("every shipped security-probe invocation that names an --entry passes --repo-root", () => {
  const bare = [];
  let total = 0;
  for (const abs of shippedDocs()) {
    const rel = path.relative(REPO_ROOT, abs);
    const lines = fs.readFileSync(abs, "utf8").split("\n");
    for (const inv of invocationsOf(lines)) {
      total += 1;
      if (!/--repo-root\b/.test(inv.cmd))
        bare.push(`${rel}:${inv.line}  ${inv.cmd.trim().slice(0, 100)}`);
    }
  }
  // relationship-assertion-lint: allow — a walk-sanity floor on the invocation count, not a row mapping
  assert.ok(
    total >= 4,
    `only ${total} engine invocations found — the reassembly or the walk is broken`,
  );
  assert.deepEqual(
    bare,
    [],
    "these invocations would resolve the entry under the skill directory from an installed copy",
  );
});

test("negative control — the matcher sees a hand-typed count", () => {
  const typed = [
    "**4. Report only what reproduced.**",
    "Report the total in **`probes_executed:`** — every candidate you ran,",
    "counted by hand from your script's output.",
  ];
  assert.equal(
    classify(typed, 1),
    false,
    "a site with no record reference must classify as not reading the artefact",
  );
  const reads = [...typed, "taken from the run record (`totals.executed`)."];
  assert.equal(classify(reads, 1), true);
});
