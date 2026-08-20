"use strict";
/**
 * Restricted-access documentation drift guard.
 *
 * Motivation: ten consumer documents already restate pipeline behaviour
 * independently and have drifted silently. This sequence adds a concept page,
 * a decision guide, a runbook, and vocabulary that must stay aligned with
 * the five access modes the resolver actually accepts — not with a list
 * copied into this test.
 *
 * Scope is deliberately mechanical. A guard that grades style gets disabled.
 * It asserts:
 *   - every ACCESS_MODES entry in defer-mutation.js appears in the concept
 *     doc and in configuration.md;
 *   - yaml fences marked as access-model examples parse and use only those
 *     modes;
 *   - the page set is linked from the docs indexes;
 *   - `/tracker-reconcile` is registered honestly (live skill vs not shipped);
 *   - glossary carries the vocabulary the sequence introduced;
 *   - `deferred` is documented where reason codes are enumerated;
 *   - mermaid fences exist on the concept and decision pages.
 *
 * Mutation-prove: add a sixth mode in ACCESS_MODES without mentioning it in
 * the concept doc → red. Rename deferred on one side only → red. Drop a new
 * page from docs/README.md → red. Put `access.tracker: extra` in an example
 * → red.
 *
 * Deterministic and offline. Runs every push via `npm test` (tests/*.test.js).
 * Run: node --test tests/restricted-access-docs.test.js
 */

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const REPO_ROOT = path.resolve(__dirname, "..");
const { ACCESS_MODES } = require("../shared/resources/defer-mutation.js");
const { parseYamlSubset } = require("../shared/resources/yaml-subset.js");

const CONCEPT = "docs/concepts/restricted-access.md";
const DECISION = "docs/concepts/which-access.md";
const RUNBOOK = "docs/runbooks/restricted-access.md";
const CONFIG = "docs/reference/configuration.md";
const COMMANDS = "docs/reference/commands.md";
const PHRASES = "docs/reference/activation-phrases.md";
const GLOSSARY = "docs/reference/glossary.md";
const TROUBLE = "docs/reference/troubleshooting.md";
const CATALOG = "docs/reference/skill-catalog.md";
const DOCS_INDEX = "docs/README.md";
const CONCEPTS_INDEX = "docs/concepts/README.md";
const RUNBOOKS_INDEX = "docs/runbooks/README.md";
const SKILL = "skills/tracker-reconcile/SKILL.md";

const VOCABULARY = [
  "access model",
  "handover",
  "deferred",
  "divergent",
  "unverifiable",
  "retry_of",
  "UNRECORDED",
  "tracker-reconcile",
  // task.56. Added after the concept doc drifted for a full task cycle while
  // this guard stayed green — see the coverage test below.
  "blocking",
];

const SEQUENCE_REASONS = ["deferred"];

function read(rel) {
  return fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(REPO_ROOT, rel));
}

function fencedYaml(md, marker) {
  const start = `<!-- ${marker}:start -->`;
  const end = `<!-- ${marker}:end -->`;
  const a = md.indexOf(start);
  const b = md.indexOf(end);
  assert.ok(a !== -1, `${marker}:start marker missing`);
  assert.ok(b !== -1 && b > a, `${marker}:end marker missing`);
  const slice = md.slice(a + start.length, b);
  const blocks = [];
  const re = /```yaml\r?\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(slice))) blocks.push(m[1]);
  return blocks;
}

test("ACCESS_MODES from code appear in the concept doc and configuration.md", () => {
  assert.ok(ACCESS_MODES.length >= 5, "resolver still ships the five modes");
  const concept = read(CONCEPT);
  const config = read(CONFIG);
  for (const mode of ACCESS_MODES) {
    assert.match(
      concept,
      new RegExp("`" + mode + "`"),
      `${CONCEPT} must mention access mode \`${mode}\``,
    );
    assert.match(
      config,
      new RegExp("`" + mode + "`|" + mode),
      `${CONFIG} must mention access mode ${mode}`,
    );
  }
});

test("access-model yaml examples parse and only use resolver modes", () => {
  const blocks = fencedYaml(read(CONFIG), "access-model-examples");
  assert.ok(blocks.length >= ACCESS_MODES.length, "one example per mode");
  const seen = new Set();
  for (const raw of blocks) {
    const obj = parseYamlSubset(raw);
    assert.ok(obj && obj.access, "example must have an access: block");
    const mode = obj.access.tracker;
    assert.ok(
      ACCESS_MODES.includes(mode),
      `example access.tracker: ${mode} is not a resolver mode`,
    );
    seen.add(mode);
  }
  for (const mode of ACCESS_MODES) {
    assert.ok(seen.has(mode), `no config example for access.tracker: ${mode}`);
  }
});

test("new pages are reachable from the docs indexes", () => {
  const docs = read(DOCS_INDEX);
  const concepts = read(CONCEPTS_INDEX);
  const runbooks = read(RUNBOOKS_INDEX);
  assert.match(docs, /restricted-access\.md/);
  assert.match(docs, /which-access\.md/);
  assert.match(docs, /runbooks\/restricted-access\.md/);
  assert.match(concepts, /restricted-access\.md/);
  assert.match(concepts, /which-access\.md/);
  assert.match(runbooks, /restricted-access\.md/);
  assert.ok(exists(CONCEPT));
  assert.ok(exists(DECISION));
  assert.ok(exists(RUNBOOK));
});

test("tracker-reconcile is registered honestly", () => {
  const commands = read(COMMANDS);
  const phrases = read(PHRASES);
  const catalog = exists(CATALOG) ? read(CATALOG) : "";
  const concept = read(CONCEPT);
  const runbook = read(RUNBOOK);
  assert.match(commands, /tracker-reconcile/);
  assert.match(phrases, /tracker-reconcile/);
  assert.match(concept, /tracker-reconcile/);
  assert.match(runbook, /tracker-reconcile/);
  if (exists(SKILL)) {
    assert.match(
      catalog,
      /tracker-reconcile/,
      "live skill must appear in the generated catalog",
    );
    assert.doesNotMatch(
      commands,
      /not shipped/i,
      "live /tracker-reconcile must not be labelled not shipped",
    );
  } else {
    assert.match(
      commands,
      /not shipped|task\.57/i,
      "absent skill must be labelled not shipped (task.57) in commands.md",
    );
    assert.doesNotMatch(
      catalog,
      /tracker-reconcile/,
      "catalog must not list a skill that does not exist",
    );
  }
});

test("glossary carries the restricted-access vocabulary", () => {
  const glossary = read(GLOSSARY).toLowerCase();
  for (const term of VOCABULARY) {
    assert.ok(
      glossary.includes(term.toLowerCase()),
      `glossary.md missing term: ${term}`,
    );
  }
});

test("the concept doc does not claim a gated path is ungated", () => {
  // THE ASSERTION THIS GUARD WAS MISSING.
  //
  // task.56 gated the GitHub issue lifecycle, and rewrote both the runtime
  // notice in resolve-platform.sh and the access.tracker row in
  // configuration.md to say so. The concept page kept saying the opposite —
  // "Still not gated ... gh issue create, sub-issue links" — for a whole task
  // cycle, and this suite stayed green throughout, because it checked that
  // vocabulary was PRESENT and never that a claim was still TRUE.
  //
  // Vocabulary coverage cannot catch a contradiction. This can.
  const concept = read(CONCEPT);
  // Strip markdown emphasis BEFORE matching. The first version of this check
  // was itself vacuous: it looked for `not **gated**` while the prose actually
  // read `**not** gated`, so restoring the exact stale sentence left it green.
  // Caught by reverting the sentence and watching nothing happen — which is the
  // only way this class of defect is ever caught.
  const plain = concept.replace(/\*\*/g, "");
  const stale = [
    // The exact shape of the drift: naming a now-gated call as ungated.
    /not gated[^.]*gh issue create/i,
    /not gated[^.]*sub-issue link/i,
    /gh issue create[^.]*(?:still proceed|not gated|ungated)/i,
  ];
  for (const re of stale) {
    assert.doesNotMatch(
      plain,
      re,
      `${CONCEPT} claims the GitHub issue lifecycle is ungated. It has been ` +
        `gated since task.56 via tracker-issue.js — resolve-platform.sh's ` +
        `runtime notice and configuration.md both say so, and a concept page ` +
        `that contradicts the runtime notice is worse than one that says nothing.`,
    );
  }

  // And the mechanism the reader needs is actually described, not just named.
  assert.match(
    concept,
    /frontmatter/i,
    `${CONCEPT} must tell the reader to write the produced value into ` +
      `frontmatter — without that step the two-run convergence silently never ` +
      `converges, which is the failure it exists to prevent`,
  );
  assert.match(
    concept,
    /BLOCKING/,
    `${CONCEPT} must name the 🚫 BLOCKING marker — it is the higher-priority ` +
      `rendering marker and outranks ⚠️ UNRECORDED for what the reader does first`,
  );
});

test("the runbook walks the blocking path, not only the status-move path", () => {
  // A runbook that only teaches ticking leaves a reader stuck in a silent
  // no-op loop the first time a run creates something.
  const runbook = read(RUNBOOK);
  assert.match(runbook, /BLOCKING/, `${RUNBOOK} must cover blocking records`);
  assert.match(
    runbook,
    /frontmatter/i,
    `${RUNBOOK} must include the write-back step — ticking a blocking record ` +
      `is not sufficient and never converges`,
  );
});

test("sequence reason codes are enumerated in troubleshooting.md", () => {
  const trouble = read(TROUBLE);
  for (const reason of SEQUENCE_REASONS) {
    assert.match(
      trouble,
      new RegExp("`" + reason + "`|" + reason),
      `troubleshooting.md must document reason ${reason}`,
    );
  }
});

test("concept and decision pages include a mermaid diagram", () => {
  assert.match(read(CONCEPT), /```mermaid/);
  assert.match(read(DECISION), /```mermaid/);
  assert.match(read(RUNBOOK), /```mermaid/);
});

test("the accept gap is a DECISION: finalise accepts locally AND records the debt — both, or red", () => {
  // task.57 pinned this deliberately so a future reader cannot quietly "fix"
  // the accept gap into a halt. finalise writes `status: accepted` under every
  // access mode; the restricted modes additionally record the debt loudly.
  // Weakening EITHER half — refusing to accept, or accepting silently — must
  // fail here.
  const step7 = read("shared/resources/develop-pipeline-step-7-finalise.md");
  assert.match(
    step7,
    /writes `status: accepted` and moves on, \*\*by design\*\*/,
    "step-7 must state that finalise accepts locally under restricted modes — " +
      "the accept gap is a decision, not a bug to halt on",
  );
  assert.match(step7, /\*\*Tracker debt:?\*\*/, "the debt line must be specified");
  assert.match(step7, /## Tracker Actions Required/);
  assert.match(
    step7,
    /both-or-red|never one without the other/,
    "the both-or-red coupling must be stated on the checklist item",
  );
  assert.doesNotMatch(
    step7,
    /do not write `status: accepted` under|refuse to accept under/i,
    "the accept gap must never be re-read as a reason to withhold acceptance",
  );

  // The two standing-rule amendments that stop the deferral being read as the
  // prohibited Step 7 skip.
  const anti = read("docs/reference/anti-patterns.md");
  assert.match(
    anti,
    /restricted-access deferral is not this skip/i,
    "anti-patterns.md must carry the amendment paragraph",
  );
  assert.match(anti, /tracker-reconcile/);
  const faq = read("docs/reference/faq.md");
  assert.match(
    faq,
    /deferred, not skipped/i,
    "faq.md must carry the amendment paragraph",
  );

  // And the report templates carry the debt line, so a restricted run's
  // Completion block cannot read "Completed" with the gap unstated.
  const step0 = read(
    "shared/resources/develop-pipeline-step-0-resolve-and-prepare.md",
  );
  const debtLines = step0.match(/\*\*Tracker debt\*\*/g) || [];
  assert.ok(
    debtLines.length >= 2,
    "both implementation-report templates must carry the Tracker debt line",
  );
});
