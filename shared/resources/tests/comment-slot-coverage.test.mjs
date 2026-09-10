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

const { LEAD_TEMPLATES, TEXT_SLOTS, BOOLEAN_SLOTS, NUMERIC_SLOTS } = require(
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
function baseStage(stage) {
  const m = /^(qa-cycle|qa-fix)-/.exec(stage);
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
function collectCallSites() {
  const sites = [];
  for (const file of shippedDocs()) {
    const rel = path.relative(REPO_ROOT, file);
    const lines = fs.readFileSync(file, "utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (!/^\s*node\s+.*tracker-comment\.js/.test(lines[i])) continue;
      let inv = lines[i];
      let j = i;
      while (inv.trimEnd().endsWith("\\") && j + 1 < lines.length) {
        j += 1;
        inv += "\n" + lines[j];
      }
      const stage = /--stage\s+([^\s\\]+)/.exec(inv)?.[1] ?? null;
      const slots = [
        ...inv.matchAll(/--slot\s+([A-Za-z_][A-Za-z0-9_]*)=/g),
      ].map((m) => m[1]);
      sites.push({ file: rel, line: i + 1, stage, slots, text: inv });
    }
  }
  return sites;
}

const SITES = collectCallSites();

/**
 * Sites that legitimately pass no slot, each with the reason. An entry is a
 * classification act, not a silencer.
 */
const NO_SLOT_ALLOWED = new Map([
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
