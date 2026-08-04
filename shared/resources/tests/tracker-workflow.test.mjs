"use strict";
/**
 * `tracker-workflow.js` — the consumer-owned status ladder engine.
 *
 * What each group exists to catch:
 *
 * - **Default snapshot** is the compatibility contract, and the reason this file
 *   was written first. Every consumer with no `tracker-workflow.yaml` resolves
 *   through the built-in default, so if it differs from today's candidate lists
 *   in any way, every unconfigured consumer silently changes behaviour the moment
 *   tasks 38–40 wire this up. The expectations are DERIVED from `jira-sync.js`'s
 *   exported `DEFAULT_STAGE_MAP` / `DEFAULT_STATUS_RANK` rather than transcribed,
 *   so editing those constants fails here loudly instead of passing a stale copy.
 *
 * - **Rank / rung sugar** guards the modelling decision that a rung may carry
 *   alternatives. Collapsing today's candidate *lists* to one name per rung is
 *   the single easiest way to break the contract above, and it would not be
 *   visible in any other test.
 *
 * - **planMove** guards the claim that ordering replaces a transition graph.
 *   The `[]`-on-backwards case is the backward-move guard; the off-ladder case
 *   encodes "a side-state is entered directly, never walked to".
 *
 * - **Overlay** guards replace-not-merge semantics, matching `resolveStage`.
 *   A merging overlay would let a per-type ladder inherit rungs its board has
 *   never had.
 *
 * - **Failure modes** guard the swallow-everything contract. A throw here would
 *   surface as a crashed pipeline step on a board this module cannot even reach.
 *
 * - **Flow collections** are pinned as REJECTED. `parseYamlSubset` degrades them
 *   to a plain string with no error, so accepting one would build a rung whose
 *   single "name" is the literal text `[A, B, C]` — a silent, total misparse.
 *
 * Run: node --test shared/resources/tests/tracker-workflow.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, writeFileSync, mkdirSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const tw = require(join(__dirname, "..", "tracker-workflow.js"));
const {
  loadWorkflow,
  buildWorkflow,
  rankOf,
  resolveMoment,
  planMove,
  resolveDocumentStatus,
  validateWorkflow,
  normalizeRung,
  MOMENTS,
  DEFAULT_LADDER,
  DEFAULT_PIPELINE,
} = tw;

const jira = require(join(__dirname, "..", "jira-sync.js"));
const { parseYamlSubset } = require(join(__dirname, "..", "yaml-subset.js"));

/** Build a workflow from YAML text, without touching the filesystem. */
const fromYaml = (text) => buildWorkflow(parseYamlSubset(text), { source: "file", path: "<test>" });

/** A ladder with a bespoke gate column, used across several groups. */
const BESPOKE = `
statuses:
  - Backlog
  - Selected for Development
  - In Progress
  - Waiting for Review
  - Ready for Testing
  - Ready for Showcase
  - Done

pipeline:
  work-started: In Progress
  in-review: Waiting for Review
  in-qa: Ready for Testing
  ready-for-merge: Ready for Showcase
  blocked: Blocked
  done: Done
`;

// ── 1. Default snapshot — the compatibility contract ─────────────────────────

test("default snapshot — the ladder reproduces jira-sync's candidate lists, rung by rung", () => {
  const M = jira.DEFAULT_STAGE_MAP;

  // Rung 0 is the "new" band. Derived from DEFAULT_STATUS_RANK's rank-10 entries,
  // which is exactly how jira-sync builds it from NEW_CANDIDATES.
  const rank10 = Object.entries(jira.DEFAULT_STATUS_RANK)
    .filter(([, v]) => v === 10)
    .map(([k]) => k)
    .sort();
  assert.deepEqual(
    DEFAULT_LADDER[0].names.map((n) => n.toLowerCase()).sort(),
    rank10,
    "rung 0 must be exactly the rank-10 (new) statuses jira-sync already recognises",
  );

  const expected = [
    ["work-started", 1],
    ["in-review", 2],
    ["in-qa", 3],
    ["ready-for-merge", 4],
    ["done", 5],
  ];
  for (const [stage, index] of expected) {
    assert.deepEqual(
      DEFAULT_LADDER[index].names.slice(),
      M[stage].candidates.slice(),
      `rung ${index} must equal DEFAULT_STAGE_MAP["${stage}"].candidates verbatim, in order — ` +
        "order is preference order, so a reordering is a behaviour change",
    );
  }
  assert.equal(DEFAULT_LADDER.length, 6, "six rungs: new, in-progress, review, qa, merge, done");
});

test("default snapshot — ladder order matches DEFAULT_STAGE_MAP's rank order", () => {
  // The ladder's index IS its rank, so the two orderings must agree or the
  // backward-move guard changes its mind about which way is forwards.
  const M = jira.DEFAULT_STAGE_MAP;
  const ranks = ["work-started", "in-review", "in-qa", "ready-for-merge", "done"].map(
    (s) => M[s].rank,
  );
  assert.deepEqual(ranks, [20, 30, 40, 50, 60], "the ranks this ladder was derived from");
  const sorted = ranks.slice().sort((a, b) => a - b);
  assert.deepEqual(ranks, sorted, "ladder order must be ascending rank order");
});

test("default snapshot — exactly the defaultEnabled stages are wired, and no others", () => {
  const M = jira.DEFAULT_STAGE_MAP;
  const enabled = Object.entries(M)
    .filter(([, spec]) => spec.defaultEnabled)
    .map(([k]) => k)
    .sort();
  assert.deepEqual(
    Object.keys(DEFAULT_PIPELINE).sort(),
    enabled,
    "omission is disablement, so the default pipeline must name exactly the stages that " +
      "are defaultEnabled today — in-qa, ready-for-merge and blocked stay off",
  );
});

test("default snapshot — the three enabled moments resolve to the same candidate lists", () => {
  // The end-to-end form of the contract: not just the ladder data, but what
  // resolveMoment actually hands a caller.
  const wf = loadWorkflow({ repoRoot: mkdtempSync(join(tmpdir(), "tw-none-")) });
  const M = jira.DEFAULT_STAGE_MAP;
  for (const stage of ["work-started", "in-review", "done"]) {
    const r = resolveMoment(stage, wf);
    assert.ok(r, `${stage} must be enabled by default`);
    assert.deepEqual(
      r.targets,
      M[stage].candidates.slice(),
      `${stage} must offer every candidate jira-sync offers today, in the same order`,
    );
    assert.equal(r.offLadder, false);
  }
});

test("default snapshot — the three default-off moments resolve to null", () => {
  const wf = loadWorkflow({ repoRoot: mkdtempSync(join(tmpdir(), "tw-none-")) });
  for (const stage of ["in-qa", "ready-for-merge", "blocked"]) {
    assert.equal(resolveMoment(stage, wf), null, `${stage} is defaultEnabled:false today`);
  }
});

test("default snapshot — MOMENTS is the closed set, including the two not yet wired", () => {
  assert.deepEqual(MOMENTS.slice(), [
    "work-started",
    "in-review",
    "changes-requested",
    "in-qa",
    "ready-for-merge",
    "pr-merged",
    "blocked",
    "done",
  ]);
  // Every stage jira-sync knows must exist as a moment, or a wired stage would
  // have no moment to be configured through.
  for (const stage of jira.STAGE_NAMES) {
    assert.ok(MOMENTS.includes(stage), `stage "${stage}" must have a matching moment`);
  }
});

// ── 2. Rank, and rung alternatives ───────────────────────────────────────────

test("rank — a rung's index is its rank", () => {
  const wf = fromYaml(BESPOKE);
  assert.equal(rankOf("Backlog", wf), 0);
  assert.equal(rankOf("In Progress", wf), 2);
  assert.equal(rankOf("Ready for Showcase", wf), 5);
  assert.equal(rankOf("Done", wf), 6);
});

test("rank — a bespoke column is ranked, where DEFAULT_STATUS_RANK has no opinion", () => {
  // The motivating bug: `resolveStatusRank("READY FOR SHOWCASE")` returns null
  // today, so a resumed run can drag a card back out of that column.
  assert.equal(jira.resolveStatusRank("READY FOR SHOWCASE", {}), null, "the status quo");
  const wf = fromYaml(BESPOKE);
  assert.equal(rankOf("READY FOR SHOWCASE", wf), 5, "declaring it in order is all it takes");
});

test("rank — off-ladder returns null (no opinion, guard allows)", () => {
  const wf = fromYaml(BESPOKE);
  assert.equal(rankOf("Blocked", wf), null);
  assert.equal(rankOf("Some Column Nobody Declared", wf), null);
});

test("rank — matching is case-insensitive and emoji-stripped", () => {
  const wf = fromYaml(BESPOKE);
  assert.equal(rankOf("in progress", wf), 2);
  assert.equal(rankOf("IN PROGRESS", wf), 2);
  assert.equal(rankOf("🚧 In Progress", wf), 2, "GitHub columns routinely carry emoji");
  assert.equal(rankOf("  In Progress  ", wf), 2);
});

test("rank — an empty or missing status is null, not rung 0", () => {
  const wf = fromYaml(BESPOKE);
  assert.equal(rankOf("", wf), null);
  assert.equal(rankOf(null, wf), null);
  assert.equal(rankOf(undefined, wf), null);
});

test("rung sugar — a plain string is a one-name rung", () => {
  assert.deepEqual(normalizeRung("Backlog"), { names: ["Backlog"] });
  const wf = fromYaml(BESPOKE);
  assert.deepEqual(wf.ladder[0], { names: ["Backlog"] });
});

test("rung alternatives — any name on a rung matches, and all are offered as targets", () => {
  const wf = fromYaml(`
statuses:
  - Backlog
  - names:
      - In Progress
      - Doing
      - Development
  - Done

pipeline:
  work-started: Doing
`);
  assert.equal(rankOf("In Progress", wf), 1);
  assert.equal(rankOf("Doing", wf), 1, "an alternative ranks the same as the first name");
  assert.equal(rankOf("Development", wf), 1);

  const r = resolveMoment("work-started", wf);
  assert.deepEqual(
    r.targets,
    ["In Progress", "Doing", "Development"],
    "targets is the rung's FULL list in preference order — returning names[0] alone " +
      "would make every alternative unreachable as a move target",
  );
  assert.equal(r.rank, 1);
});

// ── 3. planMove ──────────────────────────────────────────────────────────────

test("planMove — the rungs strictly between, in order", () => {
  const wf = fromYaml(BESPOKE);
  const hops = planMove("In Progress", "Done", wf);
  assert.deepEqual(
    hops.map((r) => r.names[0]),
    ["Waiting for Review", "Ready for Testing", "Ready for Showcase"],
    "a board that gates Done behind a showcase column needs no transition graph — " +
      "the ladder already says what lies between",
  );
});

test("planMove — adjacent rungs have nothing between them", () => {
  const wf = fromYaml(BESPOKE);
  assert.deepEqual(planMove("Ready for Showcase", "Done", wf), []);
});

test("planMove — already at target is []", () => {
  const wf = fromYaml(BESPOKE);
  assert.deepEqual(planMove("In Progress", "In Progress", wf), []);
});

test("planMove — moving backwards is [] (the monotonicity guard)", () => {
  const wf = fromYaml(BESPOKE);
  assert.deepEqual(planMove("Done", "In Progress", wf), []);
});

test("planMove — an off-ladder end yields [] (side-states are entered, not walked to)", () => {
  const wf = fromYaml(BESPOKE);
  assert.deepEqual(planMove("Blocked", "Done", wf), []);
  assert.deepEqual(planMove("In Progress", "Blocked", wf), []);
});

test("planMove — each hop carries its full name list, not just the first name", () => {
  const wf = fromYaml(`
statuses:
  - Backlog
  - names:
      - In Review
      - Waiting for Review
  - Done
`);
  const hops = planMove("Backlog", "Done", wf);
  assert.deepEqual(hops, [{ names: ["In Review", "Waiting for Review"] }]);
});

// ── 4. Moments: targets, disablement, off-ladder ─────────────────────────────

test("moments — an omitted moment resolves to null (omission is disablement)", () => {
  const wf = fromYaml(`
statuses:
  - Backlog
  - In Progress
  - Done

pipeline:
  work-started: In Progress
`);
  assert.ok(resolveMoment("work-started", wf));
  assert.equal(resolveMoment("done", wf), null, "declared nowhere, so it does not fire");
  assert.equal(resolveMoment("in-qa", wf), null);
});

test("moments — an explicit ~ / null / empty value also disables", () => {
  const wf = fromYaml(`
statuses:
  - Backlog
  - Done

pipeline:
  work-started: ~
  in-review: null
  done: Done
`);
  assert.equal(resolveMoment("work-started", wf), null);
  assert.equal(resolveMoment("in-review", wf), null);
  assert.ok(resolveMoment("done", wf));
});

test("moments — a target absent from statuses is an off-ladder side-state", () => {
  const wf = fromYaml(BESPOKE);
  const r = resolveMoment("blocked", wf);
  assert.deepEqual(r, { targets: ["Blocked"], rank: null, offLadder: true });
});

test("moments — resolution is case-insensitive on the moment name", () => {
  const wf = fromYaml(BESPOKE);
  assert.ok(resolveMoment("WORK-STARTED", wf));
});

// ── 5. byIssueType overlay ───────────────────────────────────────────────────

const OVERLAY = `
statuses:
  - Backlog
  - In Progress
  - Waiting for Review
  - Ready for Testing
  - Done

pipeline:
  work-started: In Progress
  in-review: Waiting for Review
  in-qa: Ready for Testing
  done: Done

byIssueType:
  "IT / DevOps Task":
    statuses:
      - Selected for Development
      - In Progress
      - In Review
      - Done
    pipeline:
      in-qa: ~
`;

test("overlay — a quoted issue-type key with / and spaces survives parsing", () => {
  // The whole overlay silently vanished before yaml-subset learned quoted keys.
  const wf = fromYaml(OVERLAY);
  assert.ok(
    wf.byIssueType["IT / DevOps Task"],
    "byIssueType keys are LIVE tracker issue type names; they routinely contain spaces and slashes",
  );
});

test("overlay — statuses are REPLACED, not merged", () => {
  const wf = fromYaml(OVERLAY);
  const t = { issueType: "IT / DevOps Task" };
  assert.equal(rankOf("Selected for Development", wf, t), 0);
  assert.equal(rankOf("In Review", wf, t), 2);
  assert.equal(
    rankOf("Waiting for Review", wf, t),
    null,
    "a merging overlay would let this type inherit a rung its board has never had",
  );
  // The base ladder is untouched for everyone else.
  assert.equal(rankOf("Waiting for Review", wf), 2);
});

test("overlay — a moment can be nulled out for one issue type only", () => {
  const wf = fromYaml(OVERLAY);
  assert.equal(resolveMoment("in-qa", wf, { issueType: "IT / DevOps Task" }), null);
  assert.ok(resolveMoment("in-qa", wf), "still enabled for every other type");
});

test("overlay — the issue-type key matches case-insensitively", () => {
  const wf = fromYaml(OVERLAY);
  assert.equal(rankOf("In Review", wf, { issueType: "it / devops task" }), 2);
});

test("overlay — an unknown issue type falls through to the base ladder", () => {
  const wf = fromYaml(OVERLAY);
  assert.equal(rankOf("Waiting for Review", wf, { issueType: "Bug" }), 2);
  assert.ok(resolveMoment("in-qa", wf, { issueType: "Bug" }));
});

test("overlay — planMove walks the overlaid ladder for that type", () => {
  const wf = fromYaml(OVERLAY);
  const hops = planMove("In Progress", "Done", wf, { issueType: "IT / DevOps Task" });
  assert.deepEqual(hops.map((r) => r.names[0]), ["In Review"]);
});

// ── 6. documentStatus ────────────────────────────────────────────────────────

test("documentStatus — maps a local status to a board status", () => {
  const wf = fromYaml(`
statuses:
  - Backlog
  - Done
documentStatus:
  ready-for-development: Selected for Development
  accepted: Done
`);
  assert.equal(resolveDocumentStatus("ready-for-development", wf), "Selected for Development");
  assert.equal(resolveDocumentStatus("READY-FOR-DEVELOPMENT", wf), "Selected for Development");
  assert.equal(resolveDocumentStatus("accepted", wf), "Done");
  assert.equal(resolveDocumentStatus("nonexistent", wf), null);
});

test("documentStatus — absent block resolves to null, never a throw", () => {
  const wf = fromYaml("statuses:\n  - Done\n");
  assert.equal(resolveDocumentStatus("accepted", wf), null);
});

// ── 7. Flow collections are rejected, loudly ─────────────────────────────────

test("flow collections — `statuses: [A, B, C]` is rejected and falls back to defaults", () => {
  const wf = fromYaml("statuses: [Backlog, In Progress, Done]\n");
  assert.deepEqual(
    wf.ladder.map((r) => r.names[0]),
    DEFAULT_LADDER.map((r) => r.names[0]),
    "a misparsed ladder must not be used — silently building a one-rung ladder named " +
      "'[Backlog, In Progress, Done]' is the worst possible outcome",
  );
  const errs = validateWorkflow(wf).filter((w) => w.level === "error");
  assert.ok(errs.some((e) => /flow sequence/i.test(e.message)), "and it must say why");
});

test("flow collections — a rung's `names: [A, B]` is rejected with a specific warning", () => {
  const wf = fromYaml(`
statuses:
  - Backlog
  - names: [In Progress, Doing]
  - Done
`);
  assert.deepEqual(wf.ladder.map((r) => r.names[0]), ["Backlog", "Done"], "the bad rung is dropped");
  const errs = validateWorkflow(wf).filter((w) => w.level === "error");
  assert.ok(errs.some((e) => /flow sequence/i.test(e.message)));
});

// ── 8. validateWorkflow ──────────────────────────────────────────────────────

test("validate — an unknown moment is an error naming the closed set", () => {
  const wf = fromYaml(`
statuses:
  - Done
pipeline:
  shipped-it: Done
`);
  const errs = validateWorkflow(wf).filter((w) => w.level === "error");
  assert.ok(errs.some((e) => /unknown moment "shipped-it"/.test(e.message)));
});

test("validate — a status on two rungs is an error", () => {
  const wf = fromYaml(`
statuses:
  - In Progress
  - Done
  - In Progress
`);
  const errs = validateWorkflow(wf).filter((w) => w.level === "error");
  assert.ok(errs.some((e) => /may sit at only one position/.test(e.message)));
});

test("validate — an off-ladder pipeline target is info, not an error", () => {
  // Off-ladder is free by design; flagging it as an error would make the
  // documented side-state pattern un-authorable without a warning.
  const wf = fromYaml(BESPOKE);
  const all = validateWorkflow(wf);
  const blocked = all.find((w) => /Blocked/.test(w.message));
  assert.ok(blocked);
  assert.equal(blocked.level, "info");
  assert.equal(all.filter((w) => w.level === "error").length, 0);
});

test("validate — a clean bespoke workflow produces no errors", () => {
  assert.deepEqual(validateWorkflow(fromYaml(BESPOKE)).filter((w) => w.level === "error"), []);
});

test("validate — never throws, even on nonsense", () => {
  assert.doesNotThrow(() => validateWorkflow(null));
  assert.doesNotThrow(() => validateWorkflow({}));
  assert.doesNotThrow(() => validateWorkflow(fromYaml("statuses:\n  - 1\n")));
});

// ── 9. Loading and failure modes ─────────────────────────────────────────────

function repoWith(files) {
  const root = mkdtempSync(join(tmpdir(), "tw-repo-"));
  for (const [rel, content] of Object.entries(files)) {
    const p = join(root, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, content);
  }
  return root;
}

test("load — a missing file yields the default ladder, source 'default', with a pointer", () => {
  const wf = loadWorkflow({ repoRoot: repoWith({}) });
  assert.equal(wf.source, "default");
  assert.deepEqual(wf.ladder, DEFAULT_LADDER.map((r) => ({ names: r.names.slice() })));
  assert.ok(wf.warnings.some((w) => /built-in default ladder/.test(w.message)));
});

test("load — a present file is used, source 'file'", () => {
  const wf = loadWorkflow({ repoRoot: repoWith({ "tracker-workflow.yaml": BESPOKE }) });
  assert.equal(wf.source, "file");
  assert.equal(rankOf("Ready for Showcase", wf), 5);
});

test("load — tracker.workflowFile relocates the file", () => {
  const root = repoWith({
    "skills-config.yaml": "tracker:\n  workflowFile: config/board.yaml\n",
    "config/board.yaml": BESPOKE,
  });
  const wf = loadWorkflow({ repoRoot: root });
  assert.equal(wf.source, "file");
  assert.equal(rankOf("Ready for Showcase", wf), 5);
});

test("load — a SCALAR `tracker:` does not crash the loader", () => {
  // `tracker` is documented today as a scalar platform override (`tracker: jira`).
  // A consumer who set it that way must fall back to the default path, not throw.
  const root = repoWith({
    "skills-config.yaml": "tracker: jira\nprd:\n  prdShardedLocation: docs/prd\n",
    "tracker-workflow.yaml": BESPOKE,
  });
  const wf = loadWorkflow({ repoRoot: root });
  assert.equal(wf.source, "file", "the default path still applies");
  assert.equal(rankOf("Ready for Showcase", wf), 5);
});

test("load — malformed content yields defaults rather than throwing", () => {
  const root = repoWith({ "tracker-workflow.yaml": "!!!! not : valid : yaml : at all\n\t\x00" });
  let wf;
  assert.doesNotThrow(() => {
    wf = loadWorkflow({ repoRoot: root });
  });
  assert.deepEqual(wf.ladder, DEFAULT_LADDER.map((r) => ({ names: r.names.slice() })));
});

test("load — a file whose statuses are the wrong shape yields defaults + an error", () => {
  const root = repoWith({ "tracker-workflow.yaml": "statuses: just-a-string\n" });
  const wf = loadWorkflow({ repoRoot: root });
  assert.deepEqual(wf.ladder, DEFAULT_LADDER.map((r) => ({ names: r.names.slice() })));
  assert.ok(validateWorkflow(wf).some((w) => w.level === "error"));
});

test("load — an unreadable file yields defaults rather than throwing", () => {
  const root = repoWith({ "tracker-workflow.yaml": BESPOKE });
  chmodSync(join(root, "tracker-workflow.yaml"), 0o000);
  let wf;
  assert.doesNotThrow(() => {
    wf = loadWorkflow({ repoRoot: root });
  });
  // Root can read a 000 file, so accept either outcome — the assertion that
  // matters is that neither path throws.
  assert.ok(wf.source === "default" || wf.source === "file");
  chmodSync(join(root, "tracker-workflow.yaml"), 0o644);
});

test("load — an empty file yields defaults", () => {
  const wf = loadWorkflow({ repoRoot: repoWith({ "tracker-workflow.yaml": "" }) });
  assert.deepEqual(wf.ladder, DEFAULT_LADDER.map((r) => ({ names: r.names.slice() })));
});

test("load — every exported function tolerates the default workflow", () => {
  const wf = loadWorkflow({ repoRoot: repoWith({}) });
  assert.doesNotThrow(() => {
    rankOf("In Progress", wf);
    resolveMoment("done", wf);
    planMove("In Progress", "Done", wf);
    resolveDocumentStatus("accepted", wf);
    validateWorkflow(wf);
  });
});

// ── 9b. Parse caching ────────────────────────────────────────────────────────

test("cache — the file is read once per process, not once per resolution", () => {
  // A single pipeline step resolves several moments. Without a cache each one
  // re-reads and re-parses the same file.
  const root = repoWith({ "tracker-workflow.yaml": BESPOKE });
  tw.clearWorkflowCache();

  const { readFileSync } = require("node:fs");
  const fsMod = require("node:fs");
  const target = join(root, "tracker-workflow.yaml");
  let reads = 0;
  const orig = fsMod.readFileSync;
  fsMod.readFileSync = function (p, ...rest) {
    if (String(p) === target) reads++;
    return orig.call(this, p, ...rest);
  };
  try {
    loadWorkflow({ repoRoot: root });
    loadWorkflow({ repoRoot: root });
    loadWorkflow({ repoRoot: root });
  } finally {
    fsMod.readFileSync = orig;
  }
  assert.equal(reads, 1, `expected exactly one read of the workflow file, saw ${reads}`);
  void readFileSync;
});

test("cache — a cached workflow cannot be poisoned by a caller mutating it", () => {
  const root = repoWith({ "tracker-workflow.yaml": BESPOKE });
  tw.clearWorkflowCache();
  const a = loadWorkflow({ repoRoot: root });
  a.ladder.length = 0;
  a.pipeline["work-started"] = "Nonsense";
  const b = loadWorkflow({ repoRoot: root });
  assert.equal(b.ladder.length, 7, "the second caller must not inherit the first's mutation");
  assert.equal(rankOf("Ready for Showcase", b), 5);
});

test("cache — clearWorkflowCache lets a rewritten file be re-read", () => {
  const root = repoWith({ "tracker-workflow.yaml": BESPOKE });
  tw.clearWorkflowCache();
  assert.equal(rankOf("Ready for Showcase", loadWorkflow({ repoRoot: root })), 5);
  writeFileSync(join(root, "tracker-workflow.yaml"), "statuses:\n  - Only\n");
  tw.clearWorkflowCache();
  const wf = loadWorkflow({ repoRoot: root });
  assert.deepEqual(wf.ladder, [{ names: ["Only"] }]);
});

// ── 10. Purity ───────────────────────────────────────────────────────────────

test("purity — loading the module does not pull jira-sync.js into the graph", () => {
  // Asserted behaviourally, in a clean child process, rather than by grepping the
  // source: this file itself requires jira-sync.js for the snapshot expectations,
  // so require.cache here is already polluted, and a textual scan would also match
  // the module's own comment explaining why it does NOT require it.
  const { execFileSync } = require("node:child_process");
  const target = join(__dirname, "..", "tracker-workflow.js");
  const loaded = execFileSync(
    process.execPath,
    [
      "-e",
      `require(${JSON.stringify(target)});` +
        "console.log(Object.keys(require.cache).filter(p => !p.includes('node:')).join('\\n'));",
    ],
    { encoding: "utf-8" },
  );
  assert.ok(
    !/jira-sync\.js/.test(loaded),
    "a GitHub-only consumer must never pull the Jira client in behind this module. Loaded:\n" +
      loaded,
  );
  assert.ok(/yaml-subset\.js/.test(loaded), "but it does load the shared parser it depends on");
});

test("purity — the only shell-out is git rev-parse --show-toplevel", () => {
  const { readFileSync } = require("node:fs");
  const src = readFileSync(join(__dirname, "..", "tracker-workflow.js"), "utf-8");
  const calls = [...src.matchAll(/execSync\(\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(calls, ["git rev-parse --show-toplevel"]);
});

test("purity — an injected repoRoot means no shell-out at all", () => {
  // Injectability is what makes the engine testable and safe to call from a
  // linked worktree; if it silently shelled out anyway, a non-repo cwd would break it.
  const root = repoWith({ "tracker-workflow.yaml": BESPOKE });
  const wf = loadWorkflow({ repoRoot: root });
  assert.equal(wf.path, join(root, "tracker-workflow.yaml"));
});

// ── 11. Dogfood + shipped template ───────────────────────────────────────────

test("dogfood — this repo's own tracker-workflow.yaml parses and resolves", () => {
  const root = join(__dirname, "..", "..", "..");
  const wf = loadWorkflow({ repoRoot: root });
  assert.equal(wf.source, "file", "this repo dogfoods the format");
  assert.deepEqual(
    validateWorkflow(wf).filter((w) => w.level === "error"),
    [],
    "the repo's own file must be error-free — it is the worked example",
  );
  assert.equal(rankOf("Todo", wf), 0);
  assert.ok(resolveMoment("work-started", wf));
});

test("shipped template — the reference doc shows it byte-for-byte", () => {
  // §9's migration criterion: the template and the block the reference doc shows
  // must be the same bytes, so a reader who copies from either gets the same file.
  // Asserted rather than maintained by hand — the two are ~100 lines apart in two
  // files, which is exactly the shape of thing that drifts unnoticed.
  const { readFileSync } = require("node:fs");
  const docsRoot = join(__dirname, "..", "..", "..", "docs");
  const template = readFileSync(join(docsRoot, "examples", "tracker-workflow.default.yaml"), "utf-8");
  const doc = readFileSync(join(docsRoot, "reference", "tracker-workflow.md"), "utf-8");

  const marker = "## The shipped template";
  const start = doc.indexOf(marker);
  assert.ok(start !== -1, "the reference doc must have a `## The shipped template` section");
  const fenceStart = doc.indexOf("```yaml\n", start) + "```yaml\n".length;
  const fenceEnd = doc.indexOf("\n```", fenceStart) + 1;
  const shown = doc.slice(fenceStart, fenceEnd);

  assert.equal(
    shown,
    template,
    "the reference doc's template block has drifted from docs/examples/tracker-workflow.default.yaml",
  );
});

test("shipped template — docs/examples/tracker-workflow.default.yaml parses cleanly", () => {
  const { readFileSync } = require("node:fs");
  const p = join(__dirname, "..", "..", "..", "docs", "examples", "tracker-workflow.default.yaml");
  const wf = fromYaml(readFileSync(p, "utf-8"));
  assert.deepEqual(validateWorkflow(wf).filter((w) => w.level === "error"), []);
  for (const moment of Object.keys(wf.pipeline)) {
    assert.ok(MOMENTS.includes(moment), `template names only real moments (${moment})`);
  }
  assert.ok(
    !("changes-requested" in wf.pipeline) && !("pr-merged" in wf.pipeline),
    "the template must name only moments wired today — those two land in task.41",
  );
});
