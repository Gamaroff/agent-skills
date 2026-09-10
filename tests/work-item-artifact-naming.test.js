"use strict";
/**
 * Work-item artifact naming guard — a companion artifact must not be shaped like
 * the work item it belongs to.
 *
 * Motivation: `docs/tasks/task.58.restricted-access-documentation/task.58.test.md`
 * shipped as hand-verification instructions, but its NAME parses as a primary
 * task document — `task.{n}.{slug}.md` with slug `test`. Every glob that
 * enumerates tasks therefore counted it as a task, and reported it as a task
 * with no `status:` field. Nothing caught it, because nothing checked.
 *
 * That is the cheap half of the failure. The expensive half is that a file which
 * looks like a task document is one an orchestrator can be handed: `/develop-task
 * docs/tasks/…/task.58.test.md` resolves, reads no frontmatter, and proceeds.
 *
 * WHAT THIS ASSERTS, narrowly:
 *   1. Every `.md` inside a work-item directory either IS that work item's
 *      primary document, or carries a registered artifact-type segment.
 *   2. The registered segments are exactly the ones docs/standards/file-naming.md
 *      lists — read FROM that file, so the standard and the guard cannot drift.
 *
 * WHAT IT DELIBERATELY DOES NOT DO: rename history. Nineteen artifacts from
 * 2026-05-05 … 2026-05-10 predate the current standard, and every one belongs to
 * an `accepted` task. They are allowlisted below with that reason. This mirrors
 * the adoption rule the repo already applies to the Change Log and to OKF —
 * "additive and going-forward only, no backfill" — because renaming an artifact
 * of completed work breaks the cross-references in its parent document and buys
 * nothing. The allowlist is a dated boundary, not a dumping ground: it is closed,
 * and a NEW file cannot be added to it without someone writing down why.
 *
 * Run: node --test tests/
 */

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const REPO_ROOT = path.resolve(__dirname, "..");
const STANDARD = path.join(REPO_ROOT, "docs", "standards", "file-naming.md");

/**
 * The registered artifact-type segments, parsed out of the standard itself.
 *
 * Hard-coding the list here would let the guard and the document it enforces
 * drift apart — which is the same defect class this file exists to catch, one
 * level up.
 */
function registeredSegments(kind) {
  const text = fs.readFileSync(STANDARD, "utf8");
  const re = new RegExp(`${kind}\\.\\{[a-z]+\\}\\.([a-z-]+)\\.`, "g");
  const found = new Set();
  let m;
  while ((m = re.exec(text)) !== null) found.add(m[1]);
  return found;
}

/**
 * Fixed-name artifacts the pipeline itself generates.
 *
 * `/finalise` writes `{work-item-directory}/sprint-review-summary.md` under that
 * exact name — it is not a `task.{n}.…` artifact and was never meant to be. A
 * guard that flags it is wrong, not strict: it would fail on every accepted task
 * in the repository and be switched off within a day.
 *
 * Sourced from the skill that writes them, so the two cannot drift.
 */
const PIPELINE_FIXED_NAMES = new Set(["sprint-review-summary.md"]);

/**
 * Artifacts that predate the current standard.
 *
 * CLOSED as of 2026-08-20. Every entry belongs to an `accepted` task and dates
 * from 2026-05-05 … 2026-05-10, before the `{type}.{n}.{name}` shape settled.
 * Two legacy patterns are represented:
 *   • `task.{n}.{full-slug}.review.{date}.md` — the slug repeated, and a DATE
 *     where the standard now wants `{n}.{name}`
 *   • `task.{n}.{unregistered-type}.…` — `validation`, `audit`
 *
 * Adding to this set is not a fix. If a NEW artifact lands here, rename the
 * artifact instead — the whole point of a dated boundary is that it stops moving.
 */
const LEGACY_PRE_STANDARD = new Set([
  "task.3.qa-fix-bb-jira-dual-path/task.3.qa-fix-bb-jira-dual-path.review.2026-05-05.md",
  "task.5.ensure-epic-jira-issue-skill/task.5.ensure-epic-jira-issue-skill.review.2026-05-05.md",
  "task.6.create-epic-jira-tracker-path/task.6.create-epic-jira-tracker-path.review.2026-05-05.md",
  "task.7.skills-config-tracker-vcs-flags/task.7.skills-config-tracker-vcs-flags.review.2026-05-06.md",
  "task.8.audit-bug-report-and-epic-registry-manager/task.8.audit.1.findings.md",
  "task.9.platform-detection-resolver-migration/task.9.platform-detection-resolver-migration.review.2026-05-06.md",
  "task.10.pr-comment-consolidation/task.10.pr-comment-consolidation.review.2026-05-06.md",
  "task.11.review-task-tracker-dedup/task.11.review-task-tracker-dedup.review.2026-05-06.md",
  "task.13.develop-caller-context-contract/task.13.develop-caller-context-contract.review.2026-05-06.md",
  "task.14.implementation-report-stash-hardening/task.14.implementation-report-stash-hardening.review.2026-05-06.md",
  "task.14.implementation-report-stash-hardening/task.14.implementation-report-stash-hardening.qa.1.implementation-report-stash-hardening.md",
  "task.14.implementation-report-stash-hardening/task.14.implementation-report-stash-hardening.implementation.1.implementation-report-stash-hardening-initial-run.md",
  "task.15.develop-task-shadow-dir-cleanup/task.15.develop-task-shadow-dir-cleanup.review.2026-05-06.md",
  "task.16.review-story-prepass-subagent/task.16.review-story-prepass-subagent.review.2026-05-08.md",
  "task.18.develop-loop-test-failure-triage-subagent/task.18.develop-loop-test-failure-triage-subagent.review.2026-05-09.md",
  "task.20.qa-story-traceability-mapper-subagent/task.20.qa-story-traceability-mapper-subagent.review.2026-05-09.md",
  "task.21.qa-fix-findings-ingester-subagent/task.21.qa-fix-findings-ingester-subagent.review.2026-05-09.md",
  "task.27.review-task-prepass-subagent/task.27.review-task-prepass-subagent.review.2026-05-10.md",
  "task.28.develop-task-loop-iteration-audit-subagent/task.28.validation.2026-05-10.md",
]);

/** Every `.md` inside every `docs/tasks/task.{n}.{slug}/` directory. */
function collectTaskArtifacts() {
  const root = path.join(REPO_ROOT, "docs", "tasks");
  if (!fs.existsSync(root)) return [];
  const out = [];
  for (const dir of fs.readdirSync(root)) {
    const full = path.join(root, dir);
    if (!fs.statSync(full).isDirectory()) continue;
    if (!/^task\.\d+\./.test(dir)) continue;
    for (const f of fs.readdirSync(full)) {
      if (f.endsWith(".md")) out.push({ dir, file: f, rel: `${dir}/${f}` });
    }
  }
  return out;
}

test("§1 every task artifact is the primary doc or carries a registered type", () => {
  const registered = registeredSegments("task");
  assert.ok(
    registered.size >= 6,
    `parsed only ${registered.size} registered segments from ${path.relative(
      REPO_ROOT,
      STANDARD,
    )} — the parse is broken, which would make this guard vacuous`,
  );

  const offenders = [];
  for (const { dir, file, rel } of collectTaskArtifacts()) {
    if (LEGACY_PRE_STANDARD.has(rel)) continue;

    // The primary document: exactly the directory name.
    if (file === `${dir}.md`) continue;

    // A fixed-name artifact the pipeline generates.
    if (PIPELINE_FIXED_NAMES.has(file)) continue;

    // Otherwise the second dot-segment after the number must be a registered type.
    const m = /^task\.\d+\.([a-z-]+)\./.exec(file);
    if (!m) {
      offenders.push(
        `${rel} — cannot parse an artifact type from the filename`,
      );
      continue;
    }
    if (!registered.has(m[1])) {
      offenders.push(
        `${rel} — "${m[1]}" is not a registered artifact type ` +
          `(${[...registered].sort().join(", ")})`,
      );
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `Task artifacts whose names do not conform:\n\n${offenders.join("\n")}\n\n` +
      `A companion artifact must carry a registered type segment — ` +
      `task.{n}.{type}.{n}.{name}.md. A name shaped like the primary document ` +
      `(task.{n}.{slug}.md) is counted as a TASK by every glob that enumerates ` +
      `them, and can be handed to /develop-task as though it were one.\n\n` +
      `Register the type in docs/standards/file-naming.md, or rename the file. ` +
      `Do not add it to LEGACY_PRE_STANDARD — that boundary is closed.`,
  );
});

test("§2 every fixed-name exemption is still written by a shipped skill", () => {
  // An exemption for a filename nothing generates any more is an exemption that
  // silently excuses whatever takes that name next.
  const finalise = fs.readFileSync(
    path.join(REPO_ROOT, "skills", "finalise", "SKILL.md"),
    "utf8",
  );
  for (const name of PIPELINE_FIXED_NAMES) {
    assert.ok(
      finalise.includes(name),
      `${name} is exempted here but no longer written by skills/finalise/SKILL.md — ` +
        `remove the exemption, or point it at whatever writes the file now`,
    );
  }
});

test("§3 the legacy allowlist is closed and every entry still exists", () => {
  // An allowlist entry pointing at a file that has been renamed or deleted would
  // silently excuse a DIFFERENT file that later takes the same path. Staleness
  // in an allowlist is how a guard rots into a no-op.
  const stale = [];
  for (const rel of LEGACY_PRE_STANDARD) {
    if (!fs.existsSync(path.join(REPO_ROOT, "docs", "tasks", rel))) {
      stale.push(`${rel} — allowlisted but no longer present`);
    }
  }
  assert.deepEqual(stale, [], `Stale legacy entries:\n${stale.join("\n")}`);
});

test("§4 no allowlisted artifact belongs to a task that is still in flight", () => {
  // The boundary is "predates the standard", not "is inconvenient to rename".
  // A legacy entry under a task that is still being worked means the exemption
  // is being used to carry a live file, which is exactly the drift it excuses.
  const live = [];
  for (const rel of LEGACY_PRE_STANDARD) {
    const dir = rel.split("/")[0];
    const primary = path.join(REPO_ROOT, "docs", "tasks", dir, `${dir}.md`);
    if (!fs.existsSync(primary)) continue;
    const status = /^status:\s*(\S+)/m.exec(fs.readFileSync(primary, "utf8"));
    if (status && !["accepted", "cancelled"].includes(status[1])) {
      live.push(`${rel} — parent task is "${status[1]}", not accepted`);
    }
  }
  assert.deepEqual(
    live,
    [],
    `Legacy exemptions on in-flight work:\n${live.join("\n")}\n\n` +
      `Rename these rather than exempting them — the artifact is being written now.`,
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// §5 — the Change Log / `updated:` pairing.
//
// `shared/resources/document-change-log.md` states it as a hard rule: "Every
// entry bumps frontmatter `updated:` in the same edit" (`updated` is this repo's
// OKF `timestamp`). `change-log.js` exposes `bumpUpdated()` and case G tests it,
// so every skill that writes a row THROUGH THE ENGINE gets the pairing for free.
//
// The uncovered path is the hand-edit. A person or an external agent editing a
// document directly appends a row and never calls the engine — and nothing
// noticed, because the rule was documented and unenforced. Observed 2026-09-09
// on docs/tasks/task.100…: a row dated 2026-09-09 above `updated: 2026-09-08`.
//
// The failure is quiet in a way worth naming: `updated` is what OKF consumers
// and the freshness comparisons in review-task's gate read. A document whose
// frontmatter is older than its own log looks LESS recently touched than it is,
// so a staleness check answers "nothing has changed here" about a document that
// changed.
//
// Asserts one direction only. `updated` NEWER than the newest row is fine and
// common — an edit that adds no row (a typo fix, a status correction) still
// bumps it. The violation is a row the frontmatter does not account for.

/** Every `.md` under docs/ that carries a frontmatter block. */
function collectDocumentsWithFrontmatter() {
  const out = [];
  const skip =
    /\.(qa|gate|bug|implementation|review|dod|plan|handover|pr-review)\./;
  (function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith(".md") && !skip.test(e.name)) out.push(full);
    }
  })(path.join(REPO_ROOT, "docs"));
  return out;
}

/**
 * The dates of the rows in a document's Change Log, or null when it has none.
 *
 * Scoped to the Change Log SECTION and stripped of fenced blocks before the rows
 * are read. Both matter: documents carry other dated tables, and the change-log
 * engine's own corpus includes documents with a fenced EXAMPLE log beside a real
 * one (its test F covers exactly that). A naive scan for `| YYYY-MM-DD |` across
 * the whole file would read an illustration as history.
 */
function changeLogRowDates(text) {
  const heading = text.match(/^(#{2,3})\s+.*Change Log.*$/m);
  if (!heading) return null;
  const level = heading[1].length;
  const start = heading.index + heading[0].length;
  const rest = text.slice(start);
  // Stop at the next heading of the same or higher level.
  const next = rest.search(new RegExp(`^#{1,${level}}\\s`, "m"));
  const section = (next === -1 ? rest : rest.slice(0, next)).replace(
    /```[\s\S]*?```/g,
    "",
  );
  return [...section.matchAll(/^\|\s*(\d{4}-\d{2}-\d{2})\s*\|/gm)].map(
    (m) => m[1],
  );
}

test("§5 no Change Log row is dated after its document's frontmatter `updated:`", () => {
  const docs = collectDocumentsWithFrontmatter();
  const offenders = [];
  let checked = 0;

  for (const file of docs) {
    const text = fs.readFileSync(file, "utf8");
    const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
    if (!fm) continue;
    const rows = changeLogRowDates(text);
    if (!rows || rows.length === 0) continue;
    const updated = (fm[1].match(/^updated:\s*['"]?(\d{4}-\d{2}-\d{2})/m) ||
      [])[1];
    // A log with no `updated:` at all is an OKF gap the review-* skills already
    // enforce as Critical; not this guard's job, and flagging it here would
    // report one defect as another.
    if (!updated) continue;
    checked++;
    const newest = rows.slice().sort().pop();
    if (newest > updated) {
      offenders.push(
        `${path.relative(REPO_ROOT, file)} — newest row ${newest} > updated: ${updated}`,
      );
    }
  }

  // Non-vacuity floor. A regex that stops matching, or a walk that stops
  // descending, would otherwise report a clean corpus — the shape this repo
  // names "an empty result is a claim about the instrument". 83 documents
  // carried a Change Log when this was written; the floor is set well below
  // that so ordinary churn does not trip it, but a broken scan does.
  assert.ok(
    checked >= 40,
    `only ${checked} documents with a Change Log AND an \`updated:\` were ` +
      `examined (of ${docs.length} documents scanned) — the scan is broken, ` +
      "not the corpus clean",
  );

  assert.deepEqual(
    offenders,
    [],
    "a Change Log row is dated after its document's `updated:`, so the " +
      "frontmatter does not account for its own newest entry. " +
      "`document-change-log.md`: every entry bumps `updated:` in the same " +
      "edit. Use `bumpUpdated()` in change-log.js rather than editing by " +
      `hand.\n  ${offenders.join("\n  ")}`,
  );
});
