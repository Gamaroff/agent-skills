/**
 * Contract test for the /finalise DoD security prompt.
 *
 * Why this exists: the security prompt was a grep-only inspector. On task 67 a substituted prompt
 * that *executed* candidate inputs found fourteen fail-open routes past a boundary the grep version
 * had reported as PASS — two of them commands the code deny-listed by name. The prompt now carries a
 * gated **probe mode** that executes candidates instead of reading for them.
 *
 * Prose has no compiler, so nothing but a test stops the load-bearing pieces from being softened
 * back out by a later edit: the detection rule that gates probe mode, the instruction to execute
 * rather than reason, the read-only clauses that keep execution safe, and the guard that makes zero
 * executed candidates a finding rather than a pass. Each assertion below names the piece it protects.
 *
 * Run: node --test evals/shared/tests/finalise-dod-prompt-contract.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");

const PROMPT = "finalise-dod-security-prompt.md";
const sourcePath = join(repoRoot, "shared", "resources", PROMPT);
const bundledPath = join(repoRoot, "skills", "finalise", "references", PROMPT);
const skillPath = join(repoRoot, "skills", "finalise", "SKILL.md");

/**
 * Read lazily. A module-scope `readFileSync` throws ENOENT before any test runs, which makes the
 * existence assertions below unreachable — they could never observe a false, and their failure
 * messages could never be shown.
 */
let _source, _skill, _bundled;
const source = () => (_source ??= readFileSync(sourcePath, "utf-8"));
const skill = () => (_skill ??= readFileSync(skillPath, "utf-8"));
const bundled = () => (_bundled ??= readFileSync(bundledPath, "utf-8"));

/**
 * Match on collapsed whitespace. These assertions test a RULE, not the column its paragraph happens
 * to wrap at. Matching raw text makes a harmless rewrap fail with a message claiming the rule was
 * deleted — a false alarm that costs more than the assertion is worth.
 */
const flat = (t) => t.replace(/\s+/g, " ");
const has = (haystack, needle) => flat(haystack).includes(flat(needle));

test("the security prompt source exists where the bundler expects it", () => {
  assert.ok(existsSync(sourcePath), `missing shared/resources/${PROMPT}`);
});

// --- Phase 1: the detection rule ------------------------------------------------------------

test("the prompt defines when a deliverable counts as a boundary", () => {
  assert.match(
    source(),
    /###\s+Step 1b: Is the deliverable a boundary\?/,
    `${PROMPT}: the Step 1b boundary-detection heading is gone — probe mode has nothing to gate on`,
  );
  for (const signal of [
    "accept or reject",
    "allow-list or deny-list",
    "exported predicate",
    "Success Criteria",
  ]) {
    assert.ok(
      has(source(), signal),
      `${PROMPT}: the boundary detection rule no longer names "${signal}"`,
    );
  }
});

test("the detection rule states its negative case, so probe mode cannot fire on everything", () => {
  assert.ok(
    has(source(), "The negative case is explicit"),
    `${PROMPT}: the negative case is gone — without it probe mode fires on every work item`,
  );
  for (const nonBoundary of ["CRUD endpoint", "renderer", "report writer"]) {
    assert.ok(
      has(source(), nonBoundary),
      `${PROMPT}: the negative case no longer names "${nonBoundary}" as a non-boundary`,
    );
  }
  assert.ok(
    has(source(), "Probe mode must **not** fire on them"),
    `${PROMPT}: the prohibition on firing probe mode for non-boundaries has been softened`,
  );
});

test("the boundary decision is recorded explicitly, never inferred from an empty probes list", () => {
  assert.ok(
    has(source(), "Do **not** signal the decision by leaving `probes`"),
    `${PROMPT}: Step 1b no longer forbids signalling the decision via an empty list. An empty ` +
      `\`probes\` is ALSO the correct output for a boundary that was probed and held, so the two ` +
      `outcomes stop being distinguishable.`,
  );
});

// --- Phase 2: probe mode --------------------------------------------------------------------

test("the prompt has a probe-mode section gated on the detection rule", () => {
  assert.match(
    source(),
    /###\s+Step 4: Probe mode — only when Step 1b fired/,
    `${PROMPT}: the probe-mode heading is missing or no longer gated on Step 1b`,
  );
  assert.ok(
    has(source(), "Skip this step entirely when Step 1b found no boundary"),
    `${PROMPT}: probe mode is no longer explicitly skippable — it must not run on non-boundaries`,
  );
});

test("probe mode instructs execution, not abstract reasoning", () => {
  assert.ok(
    has(source(), "Do not reason abstractly"),
    `${PROMPT}: the "do not reason abstractly" instruction is gone. This is THE instruction — ` +
      `without it the agent inspects the boundary again and the prompt is a grep checklist with extra steps`,
  );
  assert.match(
    source(),
    /\*\*3\. Execute them\.\*\*/,
    `${PROMPT}: the "Execute them" step has been removed or renamed`,
  );
});

test("probe mode names every candidate axis that defeats boundaries in practice", () => {
  for (const axis of [
    "Alternative spellings",
    "Position",
    "Composition",
    "The unparseable case",
    "Flag forms",
  ]) {
    assert.ok(
      has(source(), axis),
      `${PROMPT}: candidate axis "${axis}" is gone — each one corresponds to a real task-67 escape`,
    );
  }
});

test("probe mode asserts the accept direction too, so an over-strict fix is caught", () => {
  assert.ok(
    has(source(), "legitimate inputs that must still be accepted"),
    `${PROMPT}: the legitimate-input direction is gone — a boundary that refuses everything ` +
      `would now read as a pass`,
  );
});

test("probe mode reports only what reproduced, and counts everything it ran", () => {
  assert.ok(
    has(source(), "Report only what reproduced"),
    `${PROMPT}: the reproduced-only rule is gone — unreproduced suspicions would enter the gate`,
  );
  assert.ok(
    has(source(), "A candidate you did not run is not a finding"),
    `${PROMPT}: the "did not run is not a finding" rule has been softened`,
  );
  assert.ok(
    has(source(), "Report the total in **`probes_executed:`**"),
    `${PROMPT}: the execution count is no longer required. Without it a filtered \`probes\` list ` +
      `is the only signal, and "probed and held" is indistinguishable from "probed nothing".`,
  );
});

// --- The read-only contract -----------------------------------------------------------------

test("the read-only contract survives, redefined as does-not-mutate rather than does-not-run", () => {
  assert.ok(
    has(
      source(),
      "Read-only means you do not mutate. It does not mean you do not run.",
    ),
    `${PROMPT}: the read-only redefinition is gone. Restoring a bare "read-only agent" is what ` +
      `foreclosed execution and let the fourteen routes through`,
  );
  for (const clause of [
    "modify, stage, or commit any file tracked by the repository",
    "open a network connection",
    "write anywhere outside a temporary directory",
  ]) {
    assert.ok(
      has(source(), clause),
      `${PROMPT}: the read-only clause "${clause}" is missing — probe mode is only safe with all three`,
    );
  }
});

// --- Phase 3: return shape and the zero-probes guard -----------------------------------------

test("the returned YAML keeps the shape finalise/SKILL.md renders", () => {
  for (const key of [
    "security_review:",
    "story_type:",
    "checks:",
    "general:",
    "overall:",
    "summary:",
  ]) {
    assert.ok(
      has(source(), key),
      `${PROMPT}: returned YAML no longer carries "${key}" — skills/finalise/SKILL.md renders it`,
    );
  }
});

test("the returned YAML carries the probe fields, inside the fenced output block", () => {
  // Slice the fenced ```yaml block out first. Matching these keys against the whole document would
  // pass even if they were moved out of the return shape entirely — the vacuity this file exists
  // to prevent elsewhere.
  const block = source().match(/```yaml\n([\s\S]*?)```/);
  assert.ok(block, `${PROMPT}: no fenced yaml output block found`);
  const yaml = block[1];
  for (const field of [
    "boundary:",
    "probes_executed:",
    "probes:",
    "input:",
    "expected:",
    "actual:",
    "reproduced:",
  ]) {
    assert.ok(
      yaml.includes(field),
      `${PROMPT}: the returned YAML block no longer carries "${field}"`,
    );
  }
});

test("zero executed candidates on a boundary is a finding, not a pass", () => {
  assert.ok(
    has(
      source(),
      "Zero executed candidates on a boundary deliverable is a finding, not a pass",
    ),
    `${PROMPT}: the zero-probes guard is gone. Without it a probe mode that ran nothing reports ` +
      `success — the same self-certifying defect this prompt exists to catch`,
  );
  assert.ok(
    has(source(), "probe mode executed no candidates"),
    `${PROMPT}: the named FAIL check for an empty probe run is missing`,
  );
});

test("the zero-executed guard keys on the execution count, not on an empty probes list", () => {
  assert.ok(
    has(source(), "If `boundary: true` and `probes_executed: 0`"),
    `${PROMPT}: the guard no longer keys on probes_executed. Keying it on an empty \`probes\` ` +
      `condemns the one outcome everybody wants — a boundary probed thoroughly that held.`,
  );
  assert.ok(
    has(source(), "An empty `probes` is not by itself a failure"),
    `${PROMPT}: the clarification that an empty probes list can be the GOOD result is gone`,
  );
  assert.ok(
    has(source(), "What is never a pass is a boundary that executed nothing"),
    `${PROMPT}: the probe rule no longer names what actually cannot pass`,
  );
});

// --- The consumer ---------------------------------------------------------------------------

test("skills/finalise/SKILL.md renders probe results in the Security section", () => {
  assert.ok(
    has(skill(), "### Probe Results"),
    "skills/finalise/SKILL.md: the Probe Results sub-block is missing from the Security append",
  );
  for (const marker of [
    "security_result.probes",
    "Candidates executed:",
    "reproduced:",
  ]) {
    assert.ok(
      has(skill(), marker),
      `skills/finalise/SKILL.md: the probe render no longer references "${marker}"`,
    );
  }
});

test("the probe render branches on boundary, not on list emptiness", () => {
  assert.ok(
    has(skill(), "{if security_result.boundary is not true:}"),
    "skills/finalise/SKILL.md: the probe render must branch on `boundary`. Branching on an empty " +
      "`probes` reports a boundary that held and one that was never probed identically.",
  );
  assert.ok(
    has(skill(), "{security_result.probes_executed}"),
    "skills/finalise/SKILL.md: the candidate count must render `probes_executed`, not the length " +
      "of the filtered `probes` list",
  );
  assert.ok(
    has(skill(), "The boundary held"),
    "skills/finalise/SKILL.md: the probed-and-held case has no render branch of its own, so the " +
      "good outcome is reported as though probe mode never ran",
  );
  assert.ok(
    has(skill(), "Probe mode executed no candidates"),
    "skills/finalise/SKILL.md: the zero-executed case has no render branch of its own",
  );
});

test("the probe render sits inside the Security section, before the agent summary", () => {
  const probeAt = skill().indexOf("### Probe Results");
  const generalAt = skill().indexOf("### General Security");
  const summaryAt = skill().indexOf(
    "**Agent summary:** {security_result.summary}",
  );
  assert.ok(
    generalAt !== -1 && probeAt !== -1 && summaryAt !== -1,
    "security render anchors missing",
  );
  assert.ok(
    generalAt < probeAt && probeAt < summaryAt,
    "skills/finalise/SKILL.md: Probe Results must render after General Security and before the agent summary",
  );
});

// --- Bundling -------------------------------------------------------------------------------

test("finalise bundles the security prompt under references/", () => {
  assert.ok(
    existsSync(bundledPath),
    `run \`npm run bundle\` — skills/finalise/references/${PROMPT} is missing`,
  );
});

test("the bundled copy is in step with the source", () => {
  for (const marker of [
    "Step 1b: Is the deliverable a boundary?",
    "Step 4: Probe mode — only when Step 1b fired",
    "Do not reason abstractly",
    "Zero executed candidates on a boundary deliverable is a finding, not a pass",
    "probes_executed:",
  ]) {
    assert.ok(
      has(bundled(), marker),
      `skills/finalise/references/${PROMPT} is stale — run \`npm run bundle\` and commit it (missing: ${marker})`,
    );
  }
});
