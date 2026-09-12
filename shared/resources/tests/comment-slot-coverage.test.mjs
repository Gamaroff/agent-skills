/**
 * Guard B — every tracker-comment call site feeds the lead, with slot names the
 * stage actually reads.
 *
 * WHY THIS IS THE DELIVERABLE, NOT THE 24 EDITS. `docs/reference/anti-patterns.md`
 * §"Never fix N call sites without a population check": when a fix is the same
 * edit applied at more than one call site, the deliverable is the check that
 * finds site N+1. Task 105 added `--slot` values at two dozen sites by hand,
 * from a table of line numbers its own author flagged as decaying. Without this,
 * site 25 ships with no slot and nothing notices.
 *
 * AND — the sharper half — nothing notices a slot name that is simply WRONG.
 * `tracker-comment.js` validates no slot names: it splits `--slot k=v` on the
 * first `=` and stores any key, and `normaliseSlots` passes an unrecognised key
 * through to a template that never reads it. No exit code, no warning. The
 * comment posts and reads exactly as it would have with no slot at all.
 *
 * That is not hypothetical. Task 105's own §3 table shipped three wrong names
 * into review: `pr` on `qa-gate` and `count` on `qa-cycle` are real slot names
 * belonging to OTHER stages, which is precisely what made them look right. This
 * test is the mechanical form of the review that caught them.
 *
 * The per-stage mapping is IMPORTED from stakeholder-summary.js, never restated.
 * Two enumerations of "which slots a stage reads" drift silently and in the
 * worst direction — a test that passes a call site the engine then ignores.
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);

const {
  LEAD_TEMPLATES,
  TEXT_SLOTS,
  BOOLEAN_SLOTS,
  NUMERIC_SLOTS,
  renderLead,
} = require(
  path.join(REPO_ROOT, "shared", "resources", "stakeholder-summary.js"),
);

/**
 * Which slots each stage reads, derived from the template SOURCE rather than
 * declared here. `renderLead` cannot tell us — it returns a finished string —
 * so the template function's own text is the only place the answer exists
 * without restating it.
 *
 * Deriving beats declaring for exactly the reason this file exists: a declared
 * copy is a second enumeration, and the failure it permits (test agrees with
 * the doc, both disagree with the engine) is worse than no test.
 */
function slotsReadBy(stage) {
  const src = String(LEAD_TEMPLATES[stage]);
  const names = new Set();
  for (const m of src.matchAll(/\bs\.([A-Za-z_][A-Za-z0-9_]*)/g))
    names.add(m[1]);
  return names;
}

const ALL_CLASSIFIED = new Set([
  ...TEXT_SLOTS,
  ...BOOLEAN_SLOTS,
  ...NUMERIC_SLOTS,
]);

/** Cycle-scoped stages carry a numeric suffix; strip it for catalogue lookup. */
// Built from the engine's own list rather than restated: a third copy of
// "which stages take a suffix" is the enumeration class this repository keeps
// paying for, and the engine exports it (require-safe — run() is guarded by
// require.main === module).
const { CYCLE_SCOPED_STAGES } = require(
  path.join(REPO_ROOT, "shared/resources/tracker-comment.js"),
);
const CYCLE_RE = new RegExp(`^(${CYCLE_SCOPED_STAGES.join("|")})-`);
function baseStage(stage) {
  const m = CYCLE_RE.exec(stage);
  return m ? m[1] : stage;
}

/**
 * Shipped source only. `skills/*​/references/` is `npm run bundle` output — the
 * same sources copied ~30×, which would turn one finding into thirty echoes of
 * itself. `docs/` is excluded because a task document quoting a call is showing
 * the BEFORE side of a diff, not shipping a call.
 */
function shippedDocs() {
  const out = [];
  const shared = path.join(REPO_ROOT, "shared", "resources");
  for (const f of fs.readdirSync(shared)) {
    if (f.endsWith(".md") || f.endsWith(".sh")) out.push(path.join(shared, f));
  }
  const skills = path.join(REPO_ROOT, "skills");
  for (const skill of fs.readdirSync(skills)) {
    const md = path.join(skills, skill, "SKILL.md");
    if (fs.existsSync(md)) out.push(md);
    // develop-bug's step docs are SOURCES — no AUTO-GENERATED banner, no
    // shared/resources counterpart. Every other skills/*/references/ file is
    // generated, so the directory is walked only for the un-bannered ones.
    const refs = path.join(skills, skill, "references");
    if (!fs.existsSync(refs)) continue;
    for (const f of fs.readdirSync(refs)) {
      if (!f.endsWith(".md")) continue;
      const abs = path.join(refs, f);
      // The banner sits on line 5, AFTER the frontmatter — and a `description:`
      // field routinely runs past 400 characters on its own, so a short window
      // reads a generated file as a source and reports ~30 echoes of every
      // finding. Take the first 20 lines, which is a structural bound rather
      // than a guessed byte count.
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

/**
 * Collect every `tracker-comment.js` invocation with its stage and slot names.
 * A shell invocation continues across `\`-terminated lines, so the whole
 * command is reassembled before parsing — reading only the first line would
 * report every multi-line call as slotless.
 */
// `command node` as well as bare `node`, and a `VAR=$(…)` capture before it: the
// PreCompact hook is shell, not prose, and writes both engine calls that way —
// a regex anchored on a bare `node` never saw them (bug.14 / cycle-2 CR-2).
function collectCallSites(
  engineRe = /^\s*(?:[A-Za-z_][A-Za-z0-9_]*=)?\$?\(?\s*(?:command\s+)?node\s+.*tracker-comment\.js/,
  engine = "tracker-comment.js",
) {
  const sites = [];
  for (const file of shippedDocs()) {
    const rel = path.relative(REPO_ROOT, file);
    const lines = fs.readFileSync(file, "utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (!engineRe.test(lines[i])) continue;
      let inv = lines[i];
      let j = i;
      while (inv.trimEnd().endsWith("\\") && j + 1 < lines.length) {
        j += 1;
        inv += "\n" + lines[j];
      }
      // Stop at a non-identifier character. `[^\s\\]+` absorbed shell
      // punctuation: a single-line call written `$(node … --stage done)` — the
      // shape 4 of the 11 pull-request sites use — captured `done)`, which is
      // not a catalogue key, so the two content guards below `continue`d past it
      // and validated nothing. The non-vacuity floor still passed, because the
      // site was FOUND; it was just never CHECKED. Found by adversarial review,
      // not by the guard itself.
      // An optional opening quote: a shell site writes --stage "pipeline-paused-${N}",
      // and the match stops at the dollar sign — leaving the base stage with its
      // trailing hyphen, which baseStage strips.
      const stage = /--stage\s+"?([A-Za-z0-9_-]+)/.exec(inv)?.[1] ?? null;
      const slots = [
        ...inv.matchAll(/--slot\s+([A-Za-z_][A-Za-z0-9_]*)=/g),
      ].map((m) => m[1]);
      sites.push({ file: rel, line: i + 1, stage, slots, text: inv, engine });
    }
  }
  return sites;
}

const SITES = collectCallSites();

/**
 * Pull-request call sites, which reach the same catalogue through a different
 * door. `stakeholder-summary-cli.js` renders a lead for a shell site to fold
 * into a comment body it posts itself; `tracker-comment.js` renders AND posts.
 * Two engines, one catalogue — so the slot-name guard below has to cover both,
 * or half the call sites in the repository are unguarded against the exact
 * defect it exists to catch.
 *
 * That is not hypothetical. Task 105 shipped three wrong slot names into review
 * (`pr` on `qa-gate`, `count` on `qa-cycle`) precisely because each is a real
 * slot name on a DIFFERENT stage, and neither engine validates slot names: an
 * unrecognised key reaches a template that never reads it, and the comment
 * posts reading exactly as it would have with no slot at all.
 */
const PR_SITES = collectCallSites(
  /^\s*(?:[A-Za-z_][A-Za-z0-9_]*=)?\$\(\s*(?:command\s+)?node\s+.*stakeholder-summary-cli\.js|^\s*(?:command\s+)?node\s+.*stakeholder-summary-cli\.js/,
  "stakeholder-summary-cli.js",
);

/**
 * Sites that legitimately pass no slot, each with the reason. An entry is a
 * classification act, not a silencer.
 */
const NO_SLOT_ALLOWED = new Map([
  [
    "shared/resources/develop-pipeline-on-precompact.sh",
    "The PreCompact hook. Its `pipeline-paused` lead is slot-free BY DESIGN — " +
      "the hook holds only what the lock file holds, and a step number is jargon " +
      "to the reader the lead is written for; the template reads no slot, so " +
      "there is nothing to pass. The step travels in the stage suffix instead.",
  ],
  [
    "shared/resources/tracker-comment-contract.md",
    "The CLI's own contract. Its example is the canonical call SHAPE with " +
      "placeholder values, not a call any agent makes — and it does carry a " +
      "--slot line, so this entry exists only to keep a placeholder stage from " +
      "being resolved against the catalogue.",
  ],
]);

test("Guard B — the walk found the call sites (non-vacuity floor)", () => {
  // A guard that silently matches nothing passes forever. The floor is set
  // below the count at the time of writing (24) so ordinary churn does not trip
  // it, but far enough above zero that a broken walk cannot masquerade as a
  // clean repository. This is the same reasoning as `empty` vs `scan-broken`
  // in the observation-log engine: an empty result is a claim about the
  // instrument, and a reassuring zero is the answer nobody questions.
  assert.ok(
    SITES.length >= 20,
    `Only ${SITES.length} tracker-comment.js call sites found — the walk is ` +
      `probably broken, not the repository clean. Expected at least 20.`,
  );
});

test("Guard B — the walk sees a `$(command node …)` call site (bug.14 / cycle-2 CR-2)", () => {
  // The PreCompact hook invokes both engines as `$(command node …)` — the form
  // that survives an nvm shell function shadowing `node`. A regex anchored on a
  // bare `node` never saw it, so the one call site written by a shell script
  // rather than by prose was invisible to the guard AGENTS.md says catches a
  // slot-free site. Name the file, so the walk cannot narrow back silently.
  const hook = "shared/resources/develop-pipeline-on-precompact.sh";
  const seen = SITES.filter((s) => s.file === hook);
  assert.ok(
    seen.length >= 1,
    "the PreCompact hook's tracker-comment.js call was not collected",
  );
  assert.equal(seen[0].stage && baseStage(seen[0].stage), "pipeline-paused");
  const pr = PR_SITES.filter((s) => s.file === hook);
  assert.ok(
    pr.length >= 1,
    "the PreCompact hook's stakeholder-summary-cli.js call was not collected",
  );
  assert.equal(pr[0].stage, "pipeline-paused");
});

test("Guard B — every call site passes at least one --slot", () => {
  const bare = SITES.filter(
    (s) => s.slots.length === 0 && !NO_SLOT_ALLOWED.has(s.file),
  ).map((s) => `${s.file}:${s.line} — --stage ${s.stage} with no --slot`);

  assert.deepEqual(
    bare,
    [],
    `Call sites feeding the lead nothing:\n${bare.join("\n")}\n\n` +
      `Every tracker comment opens with a plain-language lead rendered from its ` +
      `--stage. With no slots it says the same thing every time, and a paragraph ` +
      `a reader has seen five times is a paragraph they have learned to skip — ` +
      `which is the exact failure the lead exists to prevent, arriving by a ` +
      `different route.\n\n` +
      `See stakeholder-summary.md for which slots this stage reads. If the value ` +
      `genuinely is not bound at this point, OMIT the slot rather than passing a ` +
      `placeholder — the templates are grammatical with none — and add the file ` +
      `to NO_SLOT_ALLOWED with the reason.`,
  );
});

test("Guard B — every slot name passed is one its stage's template reads", () => {
  const wrong = [];
  for (const site of SITES) {
    if (!site.stage) continue;
    const stage = baseStage(site.stage);
    // Placeholder stages in contract/example prose (`{moment}`) resolve to no
    // template; they are shape documentation, not calls.
    if (!Object.prototype.hasOwnProperty.call(LEAD_TEMPLATES, stage)) continue;
    const reads = slotsReadBy(stage);
    for (const name of site.slots) {
      if (!reads.has(name)) {
        const owners = Object.keys(LEAD_TEMPLATES).filter((st) =>
          slotsReadBy(st).has(name),
        );
        wrong.push(
          `${site.file}:${site.line} — --stage ${site.stage} passes --slot ${name}=, ` +
            `which that template never reads. ` +
            (owners.length
              ? `(${name} belongs to: ${owners.join(", ")}.) `
              : `(${name} is read by no template at all.) `) +
            `This stage reads: ${[...reads].join(", ") || "nothing"}.`,
        );
      }
    }
  }

  assert.deepEqual(
    wrong,
    [],
    `Slot names no template reads:\n${wrong.join("\n")}\n\n` +
      `tracker-comment.js validates no slot names — it stores any k=v, and an ` +
      `unrecognised key reaches a template that never reads it. Nothing errors ` +
      `and nothing warns: the comment posts and reads exactly as it would have ` +
      `with no slot at all. A name borrowed from a neighbouring stage is the ` +
      `common way in, because it is a real slot name somewhere else.`,
  );
});

/**
 * slotsReadBy() scans the template FUNCTION SOURCE for `s.NAME`, which works only
 * because every template is written `(s) => … s.foo …`. A template written with
 * destructuring — `({verdict, cycle}) => …` — or bracket access would read a slot
 * this scan cannot see, and the "is this name real?" assertion above would then
 * reject a CORRECT call site. That failure is worse than the one it guards, because
 * it argues against a true statement and the obvious remedy is to delete the slot.
 *
 * So the scan is checked against a method that shares none of its assumptions:
 * render the lead with the slot and without it, and see whether the output moves.
 * If the two ever disagree, the regex has fallen behind the templates.
 */
test("Guard B — the source scan agrees with what rendering actually does", () => {
  const PROBE = {
    title: "T",
    pr: "P",
    verdict: "PASS",
    outcome: "O",
    blocking: "1",
    count: "7",
    blocking_count: "9",
    cycle: "3",
  };
  const disagreements = [];

  for (const stage of Object.keys(LEAD_TEMPLATES)) {
    const scanned = slotsReadBy(stage);
    const base = renderLead(stage, {});
    const rendered = new Set(
      Object.keys(PROBE).filter(
        (k) => renderLead(stage, { [k]: PROBE[k] }) !== base,
      ),
    );
    for (const name of rendered) {
      if (!scanned.has(name)) {
        disagreements.push(
          `${stage}: rendering shows '${name}' IS read, but the source scan missed it ` +
            `— slotsReadBy's /s\\.NAME/ pattern has fallen behind the template style ` +
            `(destructuring or bracket access?). Correct call sites will now be rejected.`,
        );
      }
    }
    for (const name of scanned) {
      if (!rendered.has(name) && name in PROBE) {
        disagreements.push(
          `${stage}: the source scan says '${name}' is read, but supplying it changes ` +
            `nothing in the rendered lead — the scan is over-matching.`,
        );
      }
    }
  }

  assert.deepEqual(disagreements, [], disagreements.join("\n"));
});

test("Guard B — every slot a template reads is classified, so coercion is per-type", () => {
  // stakeholder-summary.js has its own version of this assertion; it is
  // repeated here against the SAME imported lists because this file's other
  // tests trust the classification to decide what a legal slot name is. If the
  // lists fall behind the templates, an unclassified name gets TEXT semantics
  // silently — and for a boolean slot that re-opens the defect the per-type
  // coercion was written to close, since `--slot flag=false` is a truthy string.
  const unclassified = [];
  for (const stage of Object.keys(LEAD_TEMPLATES)) {
    for (const name of slotsReadBy(stage)) {
      if (!ALL_CLASSIFIED.has(name))
        unclassified.push(`${stage} reads s.${name}`);
    }
  }
  assert.deepEqual(
    unclassified,
    [],
    `Slots read by a template but classified in none of TEXT_SLOTS / ` +
      `BOOLEAN_SLOTS / NUMERIC_SLOTS:\n${unclassified.join("\n")}`,
  );
});

/**
 * Comment-then-close ordering.
 *
 * Splitting `gh issue close --comment` into two calls made them able to fail
 * independently, and the two orders fail differently. Comment first, close
 * second leaves the RECOVERABLE state on a partial failure: an open issue that
 * carries its own explanation, which a human can close. Close first leaves the
 * MISLEADING one: a closed issue with no explanation, which nobody will look at
 * again.
 *
 * The task named this as a success criterion in the form "asserted, not just
 * documented" — because the ordering is a single line's difference in a document
 * a reader executes, and prose stating a rule is exactly what the seven bypass
 * sites proved insufficient.
 *
 * Scope: blocks that do BOTH. A close with no comment is a different act — the
 * sync-github-* skills close an issue to mirror a document's lifecycle status —
 * and has no ordering to get wrong.
 */
test("Guard B — where a block both comments and closes, the comment comes first", () => {
  const CLOSE =
    /tracker-issue\.js[\s\S]{0,120}?--kind\s+close|--kind\s+close[\s\S]{0,120}?tracker-issue\.js/;
  const violations = [];
  let checked = 0;

  for (const file of shippedDocs()) {
    const rel = path.relative(REPO_ROOT, file);
    const text = fs.readFileSync(file, "utf8");
    // Each fenced bash block is one procedure; ordering is only meaningful
    // within one. Comparing across blocks would pair a close in one worked
    // example with a comment in an unrelated one.
    for (const block of text.split(/```/).filter((b) => b.startsWith("bash"))) {
      const closeAt = block.search(CLOSE);
      if (closeAt === -1) continue;
      const commentAt = block.indexOf("tracker-comment.js");
      // A close with NO comment is not this rule's business. The sync-github-*
      // skills close an issue to mirror a document's lifecycle status, and there
      // is no comment to order against — demanding one would be a NEW rule this
      // task never claimed, imposed on skills outside its scope, which is how the
      // freshness guard came to freeze a file nobody meant to freeze.
      if (commentAt === -1) continue;
      checked += 1;
      if (commentAt > closeAt) {
        violations.push(
          `${rel} — the close precedes its comment. Comment first: a failed close ` +
            `leaves an open issue carrying its summary; a failed comment after a ` +
            `close leaves a closed issue with none.`,
        );
      }
    }
  }

  assert.ok(
    checked >= 2,
    `Only ${checked} comment-and-close blocks found — the walk is probably broken. ` +
      `develop-pipeline-step-7-finalise.md alone has two (story and task variants).`,
  );
  assert.deepEqual(violations, [], violations.join("\n"));
});

// ---------------------------------------------------------------------------
// Guard C — the pull-request call sites (task 106).
//
// Same catalogue, same silent-drop failure mode, different engine. These three
// mirror Guard B, and deliberately do NOT reuse its bodies: the no-slot rule
// differs between the two audiences, and folding them together would mean
// weakening one to fit the other.
// ---------------------------------------------------------------------------

test("Guard C — every collected stage resolves to a real catalogue key", () => {
  // The floor below proves sites were FOUND. This proves they are CHECKABLE.
  // Both content guards skip a stage that is not a catalogue key, so a capture
  // bug downgrades them to no-ops without failing anything — which is exactly
  // what happened: `done)` and `in-review)` skipped 4 of 11 sites silently.
  // Assert what the guards depend on rather than trusting the extraction.
  const unresolved = [...SITES, ...PR_SITES]
    .filter((s) => s.stage)
    .filter(
      (s) =>
        !Object.prototype.hasOwnProperty.call(
          LEAD_TEMPLATES,
          baseStage(s.stage),
        ) && !/^\{|\}$/.test(s.stage), // `{moment}` placeholders in contract prose
    )
    .map(
      (s) =>
        `${s.file}:${s.line} — --stage ${JSON.stringify(s.stage)} is not a ` +
        `catalogue key. If this is shell punctuation absorbed by the capture, ` +
        `the two content guards are silently skipping this site.`,
    );
  assert.deepEqual(unresolved, [], unresolved.join("\n"));
});

test("Guard C — the walk found the pull-request call sites (non-vacuity floor)", () => {
  // Eleven conversation templates is what task 106 converted. The floor sits
  // just below that so ordinary churn does not trip it, and far enough above
  // zero that a broken walk cannot masquerade as a clean repository — the same
  // reasoning as Guard B's floor.
  assert.ok(
    PR_SITES.length >= 9,
    `Only ${PR_SITES.length} stakeholder-summary-cli.js call sites found — the ` +
      `walk is probably broken, not the repository clean. Expected at least 9.`,
  );
});

test("Guard C — every pull-request slot name is one its stage's template reads", () => {
  const wrong = [];
  for (const site of PR_SITES) {
    if (!site.stage) continue;
    const stage = baseStage(site.stage);
    if (!Object.prototype.hasOwnProperty.call(LEAD_TEMPLATES, stage)) continue;
    const reads = slotsReadBy(stage);
    for (const name of site.slots) {
      if (!reads.has(name)) {
        const owners = Object.keys(LEAD_TEMPLATES).filter((st) =>
          slotsReadBy(st).has(name),
        );
        wrong.push(
          `${site.file}:${site.line} — --stage ${site.stage} passes --slot ${name}=, ` +
            `which that template never reads. ` +
            (owners.length
              ? `(${name} belongs to: ${owners.join(", ")}.) `
              : `(${name} is read by no template at all.) `) +
            `This stage reads: ${[...reads].join(", ") || "nothing"}.`,
        );
      }
    }
  }
  assert.deepEqual(
    wrong,
    [],
    `Pull-request slot names no template reads:\n${wrong.join("\n")}\n\n` +
      `stakeholder-summary-cli.js validates no slot names either — it stores any ` +
      `k=v and an unrecognised key reaches a template that never reads it. The ` +
      `lead renders, the comment posts, and it says exactly what it would have ` +
      `said with no slot at all.`,
  );
});

test("Guard C — a pull-request site omits slots only when the sole slot is 'pr' or the template reads none", () => {
  // Guard B requires every TRACKER site to pass a slot: a lead that says the
  // same thing every time is one a reader learns to skip. On a PULL-REQUEST
  // comment that rule has one principled exception — `pr` names the pull
  // request, and the reader of this comment is already looking at it. Naming it
  // back to them is noise, not variation.
  //
  // Stated as a checkable property rather than an allowlist: an allowlist grows
  // an entry every time someone finds passing a slot inconvenient, and each
  // entry looks locally reasonable.
  const bare = [];
  for (const site of PR_SITES) {
    if (site.slots.length > 0) continue;
    if (!site.stage) continue;
    const stage = baseStage(site.stage);
    if (!Object.prototype.hasOwnProperty.call(LEAD_TEMPLATES, stage)) continue;
    const reads = [...slotsReadBy(stage)];
    const onlyPr = reads.length === 1 && reads[0] === "pr";
    // A template that reads NO slot has nothing to be fed: the slot-free call
    // is the only correct one, and Guard C's sibling above would reject any
    // name passed to it. `pipeline-paused` is the first such stage (bug.14) —
    // still a property, not an allowlist: it is read off the template.
    const slotFree = reads.length === 0;
    if (!onlyPr && !slotFree) {
      bare.push(
        `${site.file}:${site.line} — --stage ${site.stage} passes no --slot, but ` +
          `that template reads: ${reads.join(", ")}. Only a stage whose sole ` +
          `slot is 'pr', or one that reads no slot at all, may go slotless on a ` +
          `pull request.`,
      );
    }
  }
  assert.deepEqual(
    bare,
    [],
    `Pull-request call sites feeding the lead nothing:\n${bare.join("\n")}`,
  );
});

test("Guard C — a pull-request stage is never passed to the tracker engine", () => {
  // The separation task 106 built, checked where it can actually be violated:
  // in shipped prose. tracker-comment.js exits 2 on a PR stage, so this would
  // surface at runtime as a step that posts nothing — but it would surface on
  // someone's live board, not here.
  const { PR_COMMENT_STAGES } = require(
    path.join(REPO_ROOT, "shared/resources/stakeholder-summary.js"),
  );
  const prStages = new Set(PR_COMMENT_STAGES);
  const offenders = SITES.filter(
    (s) => s.stage && prStages.has(baseStage(s.stage)),
  ).map(
    (s) =>
      `${s.file}:${s.line} — tracker-comment.js --stage ${s.stage} is a ` +
      `pull-request stage; that call exits 2 and posts nothing.`,
  );
  assert.deepEqual(offenders, [], offenders.join("\n"));
});
