/**
 * Layer-1 unit tests for the develop-next deterministic selector.
 *
 * Each fixture under fixtures/ encodes one selection rule from
 * skills/develop-next/references/roadmap-selection.md. "After" states are
 * derived by string-mutating the fixture (ticking a row) so every rule is
 * tested on both sides of its boundary.
 *
 * Run via: node --test evals/develop-next/unit/select-next.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync, symlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const SCRIPT = path.join(
  REPO_ROOT,
  "skills",
  "develop-next",
  "scripts",
  "select-next.mjs",
);

const {
  parseRoadmap,
  selectNext,
  selectBatch,
  parseTouches,
  parseRegistry,
  parseFrontmatterStatus,
  registryFrontier,
  TASK_ELIGIBLE_STATUSES,
  BUG_ELIGIBLE_STATUSES,
} = await import(pathToFileURL(SCRIPT).href);

function fixture(name) {
  return readFileSync(path.join(__dirname, "fixtures", name), "utf-8");
}

function select(text) {
  return selectNext(parseRoadmap(text));
}

function tick(text, id) {
  const re = new RegExp(
    `- \\[ \\] \\*\\*${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\*\\*`,
  );
  assert.match(text, re, `fixture has no unticked row ${id}`);
  return text.replace(re, `- [x] **${id}**`);
}

// ── 01: first eligible row wins; shipped dep satisfies ───────────────────────

test("01: selects the first unticked row whose deps are shipped", () => {
  const r = select(fixture("01-first-item.md"));
  assert.equal(r.status, "selected");
  assert.equal(r.item.id, "5.1a");
  assert.equal(r.item.command, "/develop-task");
  assert.equal(r.item.commandArg, "docs/tasks/task.5.prod/task.5.prod.md");
  assert.equal(r.lint.errors.length, 0);
});

test("01: manual row at the phase frontier stops the run — even with an eligible later phase", () => {
  const r = select(tick(fixture("01-first-item.md"), "5.1a"));
  assert.equal(r.status, "stop");
  assert.equal(r.stopReason, "human-gated");
  assert.equal(r.item.id, "5.7");
});

// ── 02: dep skipping, gate:/flag: never block ────────────────────────────────

test("02: unsatisfied dep skips the row; gate:/flag: do not block", () => {
  const r = select(fixture("02-deps-and-markers.md"));
  assert.equal(r.status, "selected");
  assert.equal(
    r.item.id,
    "8.3",
    "8.3 must be selected despite gate: and flag: markers",
  );
  assert.equal(r.skipped.length, 1);
  assert.equal(r.skipped[0].id, "8.2");
  assert.match(r.skipped[0].reason, /deps unsatisfied: 8\.9/);
});

test("02: skipped row becomes eligible once its dep is ticked", () => {
  const r = select(tick(fixture("02-deps-and-markers.md"), "8.9"));
  assert.equal(r.status, "selected");
  assert.equal(r.item.id, "8.2");
});

// ── 03: flow chains (→ blocks, ‖ listed order) ───────────────────────────────

test("03: → chain blocks later members even when their deps line is satisfied", () => {
  const r = select(fixture("03-flow-chain.md"));
  assert.equal(r.status, "selected");
  assert.equal(r.item.id, "17.2");
});

test("03: ‖ siblings are taken in listed order once the chain reaches them", () => {
  const r = select(tick(fixture("03-flow-chain.md"), "17.2"));
  assert.equal(r.status, "selected");
  assert.equal(r.item.id, "17.4", "17.4 is listed before 17.3-1");
});

// ── 04: ⛔ BLOCKED annotation ────────────────────────────────────────────────

test("04: ⛔ row is skipped until the named item is accepted", () => {
  const r = select(fixture("04-blocked-annotation.md"));
  assert.equal(r.status, "selected");
  assert.equal(r.item.id, "13.1-1");
  assert.equal(r.skipped[0].id, "13.4");
  assert.match(r.skipped[0].reason, /⛔ blocked until 13\.1-1/);
});

test("04: ⛔ row unblocks once the named item is ticked", () => {
  const r = select(tick(fixture("04-blocked-annotation.md"), "13.1-1"));
  assert.equal(r.status, "selected");
  assert.equal(r.item.id, "13.4");
});

// ── 05: phases are hard boundaries ───────────────────────────────────────────

test("05: same-phase deadlock stops the run instead of skipping to the next phase", () => {
  const r = select(fixture("05-phase-blocked.md"));
  assert.equal(r.status, "stop");
  assert.equal(r.stopReason, "phase-blocked");
  assert.notEqual(r.item?.id, "2.1");
});

// ── 06: forward deps allow phase advance (the 11.5 case) ─────────────────────

test("06: earlier-phase rows blocked only by later-phase items do not gate execution", () => {
  const r = select(fixture("06-forward-deps.md"));
  assert.equal(r.status, "selected");
  assert.equal(r.item.id, "11.1");
  assert.match(r.rationale, /advanced past/);
});

// ── 07: excluded sections are never candidates ───────────────────────────────

test("07: Deferred/Housekeeping/Change Log rows are ignored entirely", () => {
  const r = select(fixture("07-excluded-sections.md"));
  assert.equal(r.status, "selected");
  assert.equal(r.item.id, "3.1");
  assert.equal(
    r.lint.errors.length,
    0,
    "id-less rows in excluded sections must not lint-error",
  );
});

test("07: roadmap completes when only excluded rows remain outstanding", () => {
  const r = select(tick(fixture("07-excluded-sections.md"), "3.1"));
  assert.equal(r.status, "stop");
  assert.equal(r.stopReason, "roadmap-complete");
});

// ── 08: documents without PHASE headings get one implicit phase ──────────────

test("08: implicit single phase when no PHASE headings exist", () => {
  const r = select(fixture("08-no-phase-headings.md"));
  assert.equal(r.status, "selected");
  assert.equal(r.item.id, "1.2");
});

// ── 09: planning-gap rows stop the loop BEFORE authoring ─────────────────────

test("09: /create-* row stops the run (authoring is attended work)", () => {
  const r = select(fixture("09-planning-gap.md"));
  assert.equal(r.status, "stop");
  assert.equal(r.stopReason, "planning-gap");
  assert.equal(r.item.id, "11.6");
});

// ── tolerant parsing (living-backlog semantics) ──────────────────────────────

test("tolerant: a dep not in the current backlog is assumed shipped/archived, not an error", () => {
  const text = fixture("01-first-item.md").replace(
    "deps: staging *(shipped)*",
    "deps: 99.9",
  );
  const r = select(text);
  assert.equal(
    r.status,
    "selected",
    "an archived-out dep must not block or halt",
  );
  assert.equal(r.item.id, "5.1a");
  assert.equal(r.lint.errors.length, 0);
  assert.match(r.lint.warnings.join("\n"), /99\.9 not in the current backlog/);
});

test("tolerant: a duplicate id that is a recap of a done item is a warning, not a halt", () => {
  // 8.9 already exists ticked-less; add a ticked recap of it → recap, not ambiguity.
  const text = fixture("02-deps-and-markers.md").replace(
    "- [ ] **8.9**",
    "- [x] **8.9** recap done\n- [ ] **8.9**",
  );
  const r = select(text);
  assert.notEqual(r.status, "halt");
  assert.match(r.lint.warnings.join("\n"), /duplicate id 8\.9/);
});

test("halt: two live, buildable rows sharing an id is a real ambiguity", () => {
  const text = fixture("08-no-phase-headings.md").replace(
    "- [x] **1.1**",
    "- [ ] **1.2** dup",
  );
  const r = select(text);
  assert.equal(r.status, "halt");
  assert.match(r.lint.errors.join("\n"), /duplicate outstanding id 1\.2/);
});

test("stop: an eligible row with no runnable command pauses for the operator (manual-checkpoint)", () => {
  const text = fixture("08-no-phase-headings.md").replace(
    "· /develop-task docs/tasks/task.2.next/task.2.next.md",
    "· run /review-prd first",
  );
  const r = select(text);
  assert.equal(r.status, "stop");
  assert.equal(r.stopReason, "manual-checkpoint");
  assert.equal(r.item.id, "1.2");
});

test("tolerant: a checkbox row with no item id is skipped with a warning, never halts", () => {
  const text = fixture("08-no-phase-headings.md").replace(
    "- [ ] **1.2**",
    "- [ ] a stray annotation row\n- [ ] **1.2**",
  );
  const r = select(text);
  assert.equal(r.status, "selected");
  assert.equal(r.item.id, "1.2");
  assert.match(r.lint.warnings.join("\n"), /no item id, skipped/);
});

test("halt: a roadmap with no parseable rows at all", () => {
  const r = select("# Just a heading\n\nSome prose, no checkboxes.\n");
  assert.equal(r.status, "halt");
  assert.match(r.haltReason, /no parseable checkbox rows/);
});

// A roadmap whose every phase has been archived at close is COMPLETE, not
// malformed. Its only remaining rows sit under Deferred / Housekeeping / Change
// Log, all excluded by design — so it parses to zero candidates, exactly like a
// file that is not a roadmap. Conflating the two turned the roadmap's own
// housekeeping rule ("archive accepted rows at each phase close") into a HALT:
// after the final archive, /develop-next reported "is this a roadmap?" instead
// of "nothing left to do".

test("complete: an all-archived roadmap stops, it does not halt", () => {
  const r = select(
    [
      "# Roadmap",
      "",
      "## Deferred / human-gated",
      "",
      "- [ ] **T99-fixtures** needs a live board · manual",
      "",
      "## Housekeeping",
      "",
      "- [ ] Archive accepted rows at each phase close",
      "",
    ].join("\n"),
  );
  assert.equal(r.status, "stop");
  assert.equal(r.stopReason, "roadmap-complete");
  assert.deepEqual(r.lint.errors, [], "an archived roadmap must lint clean");
});

test("complete: excluded rows are counted, so the not-a-roadmap guard still fires", () => {
  // The guard must keep catching a genuinely wrong path. The discriminator is
  // whether ANY checkbox row was seen, not whether any survived exclusion.
  const notARoadmap = select("# Notes\n\nProse only.\n");
  assert.equal(notARoadmap.status, "halt");

  const archived = parseRoadmap("# R\n\n## Housekeeping\n\n- [ ] a row\n");
  assert.equal(archived.rows.length, 0, "excluded rows are not candidates");
  assert.equal(archived.excludedRows, 1, "but they are counted");
});

// ── 10: real-world roadmap shape (synthetic, exercises every messy structure) ─

test("10: lints clean against a real-world-shaped roadmap", () => {
  const r = select(fixture("10-real-world.md"));
  assert.equal(
    r.lint.errors.length,
    0,
    `unexpected errors: ${r.lint.errors.join("; ")}`,
  );
});

test("10: ⏭️ SKIP rows are non-blocking — Phase 1 is stepped past, not stopped", () => {
  const r = select(fixture("10-real-world.md"));
  assert.equal(
    r.status,
    "selected",
    "must not stop at the manual+SKIP 5.7 row",
  );
  assert.equal(
    r.item.id,
    "12.1",
    "15/17 done, 12.1 is the first actionable item",
  );
});

test("10: the story path is resolved from the [story](…) link, command from backticks", () => {
  const r = select(fixture("10-real-world.md"));
  assert.equal(r.item.command, "/develop-story");
  assert.match(r.item.commandArg, /story\.12\.1\.events-and-recording\.md$/);
});

test("10: archived deps (8.1/8.2/7.3) do not block 12.1", () => {
  const r = select(fixture("10-real-world.md"));
  assert.equal(r.item.id, "12.1");
  assert.equal(r.skipped.length, 0);
});

test("10: -NFR suffix ids are distinct from their base id (7.11 ≠ 7.11-NFR2)", () => {
  const model = parseRoadmap(fixture("10-real-world.md"));
  assert.ok(model.byId.has("7.11"));
  assert.ok(model.byId.has("7.11-NFR2"));
  assert.equal(
    model.errors.length,
    0,
    "distinct suffixed ids must not read as duplicates",
  );
});

test("10: once 15/17/12/13 clear, the 🚧-gated Epic 25 row stops the run", () => {
  let text = fixture("10-real-world.md");
  for (const id of [
    "12.1",
    "12.2",
    "12.3",
    "12.4",
    "13.1-1",
    "13.2",
    "13.4",
    "7.11",
    "7.11-NFR2",
  ]) {
    text = tick(text, id);
  }
  const r = select(text);
  assert.equal(r.status, "stop");
  assert.equal(r.stopReason, "human-gated");
  assert.equal(r.item.id, "25.1");
});

// ── CLI contract ─────────────────────────────────────────────────────────────

test("CLI: emits JSON and exit 0 on selection", () => {
  const out = execFileSync(
    process.execPath,
    [SCRIPT, "--roadmap", path.join(__dirname, "fixtures", "01-first-item.md")],
    { encoding: "utf-8" },
  );
  const r = JSON.parse(out);
  assert.equal(r.status, "selected");
  assert.equal(r.item.id, "5.1a");
});

test("CLI: runs when invoked through a symlinked path", () => {
  // Consumer projects symlink `.claude/skills` -> `.agents/skills`, so argv[1]
  // arrives symlinked while import.meta.url is already real. Comparing them
  // without realpath makes the direct-invocation guard false and main() never
  // runs: exit 0, no output. That reads as "no item selected" rather than as a
  // failure, so the loop silently does nothing. Both sides must be realpath'd.
  const dir = mkdtempSync(path.join(os.tmpdir(), "select-next-symlink-"));
  const link = path.join(dir, "select-next-link.mjs");
  symlinkSync(SCRIPT, link);

  const out = execFileSync(
    process.execPath,
    [link, "--roadmap", path.join(__dirname, "fixtures", "01-first-item.md")],
    { encoding: "utf-8" },
  );
  const r = JSON.parse(out); // throws if the guard silently no-opped
  assert.equal(r.status, "selected");
  assert.equal(r.item.id, "5.1a");
});

test("CLI: --lint exits 1 on a broken roadmap, 0 on a clean one", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "select-next-lint-"));
  const broken = path.join(dir, "broken.md");
  // Two live rows sharing an id — a genuine ambiguity error.
  writeFileSync(
    broken,
    "# R\n\n## PHASE 1\n\n- [ ] **1.1** a · /develop-task x/task.1.a.md\n- [ ] **1.1** b · /develop-task x/task.1.b.md\n",
  );
  assert.throws(
    () =>
      execFileSync(process.execPath, [SCRIPT, "--lint", "--roadmap", broken], {
        encoding: "utf-8",
      }),
    /Command failed|duplicate outstanding/s,
  );
  const clean = execFileSync(
    process.execPath,
    [
      SCRIPT,
      "--lint",
      "--roadmap",
      path.join(__dirname, "fixtures", "10-real-world.md"),
    ],
    { encoding: "utf-8" },
  );
  assert.equal(JSON.parse(clean).errors.length, 0);
});

test("CLI: a missing roadmap halts with missing:true (skill offers to scaffold)", () => {
  let out = "";
  try {
    out = execFileSync(
      process.execPath,
      [SCRIPT, "--roadmap", "/no/such/roadmap.md"],
      { encoding: "utf-8" },
    );
    assert.fail("expected non-zero exit");
  } catch (e) {
    out = e.stdout;
  }
  const r = JSON.parse(out.slice(out.indexOf("{")));
  assert.equal(r.status, "halt");
  assert.equal(r.missing, true);
  assert.match(r.haltReason, /no roadmap at/);
});

test("template: the scaffold asset is a valid, lint-clean starter roadmap", () => {
  const tmpl = readFileSync(
    path.join(
      REPO_ROOT,
      "skills",
      "develop-next",
      "assets",
      "project-completion-roadmap.template.md",
    ),
    "utf-8",
  );
  const model = parseRoadmap(tmpl);
  assert.equal(
    model.errors.length,
    0,
    `template must lint clean: ${model.errors.join("; ")}`,
  );
  const r = selectNext(model);
  // A scaffold parses and reaches its first item; it won't be "selected" until
  // the placeholder <path> is replaced with a real story/task link.
  assert.notEqual(r.status, "halt");
  assert.equal(r.item.id, "1.1");
});

// ── 11: `T`-prefixed standalone-task ids ─────────────────────────────────────

test("11: a T-row parses as an item id, not an id-less annotation", () => {
  const m = parseRoadmap(fixture("11-task-ids.md"));
  assert.ok(m.byId.has("T22"), "T22 must resolve for dependency lookups");
  assert.ok(m.byId.has("T26"));
  assert.equal(
    m.warnings.filter((w) => /no item id/.test(w)).length,
    0,
    `T-rows must not be reported as id-less; got ${JSON.stringify(m.warnings)}`,
  );
});

test("11: an unticked T-dep BLOCKS its dependent", () => {
  // The bug this fixture exists for: `deps: T22` was dropped (the id grammar was
  // digit-anchored), so 28.2 looked eligible on 28.1 alone and would be dispatched
  // before the runtime migration it is explicitly sequenced after.
  const r = select(fixture("11-task-ids.md"));
  assert.equal(r.status, "selected");
  assert.equal(r.item.id, "T22", "T22 must be built before its dependent");
  assert.equal(r.item.command, "/develop-task");
  assert.equal(
    r.item.commandArg,
    "docs/tasks/task.22.runtime-migration/task.22.runtime-migration.md",
  );
  assert.ok(
    r.skipped.some(
      (s) => s.id === "28.2" && /deps unsatisfied: T22/.test(s.reason),
    ),
    `28.2 must be skipped for the unsatisfied T22 dep; got ${JSON.stringify(r.skipped)}`,
  );
});

test("11: ticking the T-dep unblocks its dependent", () => {
  const r = select(tick(fixture("11-task-ids.md"), "T22"));
  assert.equal(r.status, "selected");
  assert.equal(r.item.id, "28.2");
});

test("11: a T-row is excluded from its host epic's section rows", () => {
  // T-rows sit in their *consumer* epic's section for readability but are not
  // stories of it — counting them would strand the epic forever.
  const m = parseRoadmap(fixture("11-task-ids.md"));
  assert.deepEqual(
    m.epicSections["28"].rowIds,
    ["28.1", "28.2"],
    "T22 must be excluded from Epic 28",
  );
  assert.deepEqual(
    m.epicSections["20"].rowIds,
    ["20.8"],
    "T26 must be excluded from Epic 20",
  );
});

test("11: a SKIP'd T-row is stepped past, never selected", () => {
  const text = tick(tick(fixture("11-task-ids.md"), "T22"), "28.2");
  const r = select(text);
  assert.equal(r.status, "selected");
  assert.equal(
    r.item.id,
    "20.8",
    "T26 is ⏭️ SKIP — the loop must step past it to 20.8",
  );
});

test("11: depending on a SKIP'd row warns — the dep is silently satisfied", () => {
  // idDone() counts an all-SKIP id as done, so `deps: T26` resolves satisfied while
  // T26 is deferred. Intended (a SKIP block must not stall the loop) but a footgun:
  // 20.8 can build with its prerequisite unbuilt. Say so.
  const m = parseRoadmap(fixture("11-task-ids.md"));
  const w = m.warnings.filter((x) => /is ⏭️ SKIP/.test(x));
  assert.equal(
    w.length,
    1,
    `expected one SKIP-dep warning; got ${JSON.stringify(m.warnings)}`,
  );
  assert.match(w[0], /20\.8 dep T26/);
});

test("11: `deps: —` is recognised as no-deps, not an unparseable dep", () => {
  // `\b` cannot follow a dash, so the old `…|-)\b` never matched an em-dash and every
  // `deps: —` row emitted a spurious "has no item id — ignored".
  const m = parseRoadmap(fixture("11-task-ids.md"));
  assert.deepEqual(m.byId.get("T22").deps, []);
  assert.equal(m.warnings.filter((w) => /has no item id/.test(w)).length, 0);
});

test("11: `T` requires a following digit — 'Task 22' is not the id T22", () => {
  const m = parseRoadmap(
    [
      "# Roadmap",
      "",
      "## PHASE 1",
      "",
      "- [ ] **9.9** X · deps: Task 22 · /develop-story docs/prd/p/s/story.9.9.x/story.9.9.x.md",
      "",
    ].join("\n"),
  );
  assert.deepEqual(
    m.byId.get("9.9").deps.map((d) => d.id),
    ["22"],
    "'Task 22' must still read as 22",
  );
});

// ── 12: `touches:` parsing + `--batch` parallel worktree packing ─────────────

test("12: parseTouches reads severity marks; +own and - are dropped", () => {
  assert.deepEqual(
    parseTouches("x · touches: schema~, leaderboard!, +own · y"),
    [
      { tag: "schema", hard: false },
      { tag: "leaderboard", hard: true },
    ],
  );
  assert.deepEqual(parseTouches("x · touches: routes · y"), [
    { tag: "routes", hard: false },
    // unmarked defaults to soft
  ]);
  assert.deepEqual(parseTouches("no touches field here"), []);
});

test("12: touches: does not disturb the deps: capture beside it", () => {
  const m = parseRoadmap(
    [
      "# PHASE 1",
      "## Epic 9",
      "- [ ] **9.1** A · deps: — · touches: schema~ · /develop-story docs/p/s/story.9.1.a/story.9.1.a.md",
      "- [ ] **9.2** B · deps: 9.1 · touches: leaderboard! · /develop-story docs/p/s/story.9.2.b/story.9.2.b.md",
      "",
    ].join("\n"),
  );
  assert.deepEqual(m.byId.get("9.1").deps, [], "9.1 has no deps");
  assert.deepEqual(
    m.byId.get("9.2").deps.map((d) => d.id),
    ["9.1"],
    "9.2 dep still parses with touches: present",
  );
  assert.deepEqual(m.byId.get("9.1").touches, [{ tag: "schema", hard: false }]);
});

const BATCH_ROADMAP = [
  "# PHASE 1 — MVP",
  "## Epic 8",
  "- [ ] **8.1** Ready A · deps: — · touches: schema~, +own · /develop-story docs/p/s/story.8.1.a/story.8.1.a.md",
  "- [ ] **8.2** Ready B (soft-shares schema) · deps: — · touches: schema~ · /develop-story docs/p/s/story.8.2.b/story.8.2.b.md",
  "- [ ] **8.3** Ready C (hard leaderboard) · deps: — · touches: leaderboard! · /develop-story docs/p/s/story.8.3.c/story.8.3.c.md",
  "- [ ] **8.4** Ready D (hard leaderboard) · deps: — · touches: leaderboard! · /develop-story docs/p/s/story.8.4.d/story.8.4.d.md",
  // deps: 8.1 — an in-backlog, still-unticked row → genuinely blocked (an absent
  // dep id would be treated as archived/shipped and 8.5 would count as ready).
  "- [ ] **8.5** Blocked E · deps: 8.1 · touches: +own · /develop-story docs/p/s/story.8.5.e/story.8.5.e.md",
  "",
].join("\n");

test("12: --batch packs soft-overlapping ready rows, excludes hard conflicts", () => {
  const b = selectBatch(parseRoadmap(BATCH_ROADMAP));
  assert.equal(b.status, "batch");
  const ids = b.batch.map((r) => r.id);
  assert.deepEqual(
    ids,
    ["8.1", "8.2", "8.3"],
    "8.1+8.2 soft-share schema (ok); 8.3 first leaderboard wins",
  );
  assert.equal(b.excluded.length, 1);
  assert.equal(b.excluded[0].id, "8.4");
  assert.match(
    b.excluded[0].reason,
    /hard-conflict on 'leaderboard' with 8\.3/,
  );
  // 8.5 is dep-blocked, so it never reaches the batch (not an exclusion).
  assert.ok(!ids.includes("8.5") && !b.excluded.some((e) => e.id === "8.5"));
  // the accepted soft overlap is surfaced for the operator
  assert.ok(
    b.softOverlaps.some(
      (o) =>
        o.tag === "schema" &&
        o.between.includes("8.1") &&
        o.between.includes("8.2"),
    ),
  );
});

test("12: --batch emits a worktree command per batched row, based off develop", () => {
  const b = selectBatch(parseRoadmap(BATCH_ROADMAP));
  assert.equal(b.worktrees.length, b.batch.length);
  const w = b.worktrees.find((x) => x.id === "8.1");
  assert.equal(w.base, "develop");
  assert.match(w.shell, /^git worktree add .* -b story\/8-1 develop$/);
  assert.match(
    w.run,
    /^\/develop-story docs\/p\/s\/story\.8\.1\.a\/story\.8\.1\.a\.md$/,
  );
});

test("12: --batch advances past a fully-blocked phase, recording it", () => {
  const m = parseRoadmap(
    [
      "# PHASE 1 — blocked",
      "## Epic 7",
      // ⛔ with no parseable blocker id (a legal/ops gate) → never ready, but actionable.
      "- [ ] **7.1** Gated · deps: — · **⛔ legal-gate** — blocked on counsel · touches: +own · /develop-story docs/p/s/story.7.1.g/story.7.1.g.md",
      "# PHASE 2 — ready",
      "## Epic 8",
      "- [ ] **8.1** Ready · deps: — · touches: +own · /develop-story docs/p/s/story.8.1.a/story.8.1.a.md",
      "",
    ].join("\n"),
  );
  const b = selectBatch(m);
  assert.match(b.phase, /PHASE 2/);
  assert.deepEqual(
    b.batch.map((r) => r.id),
    ["8.1"],
  );
  assert.equal(b.skippedPhases.length, 1);
  assert.match(b.skippedPhases[0].phase, /PHASE 1/);
});

test("12: selectNext is unchanged by the presence of touches: (parity)", () => {
  const r = selectNext(parseRoadmap(BATCH_ROADMAP));
  assert.equal(r.status, "selected");
  assert.equal(r.item.id, "8.1", "single-item selection ignores touches:");
});

// ── 13: un-annotated (+own-default) rows — warn + optional requireTouches ─────
//
// A row with NO `touches:` field defaults to `+own` and never hard-conflicts, so
// the planner can co-schedule several of them while silently assuming they are
// write-disjoint. These fixtures cover the warn signal, the parse-distinction
// guard (`touches: +own` is deliberate, not a forgotten field), and the
// requireTouches downgrade that defers all but one un-annotated row.

const UNANNOTATED_ROADMAP = [
  "# PHASE 1 — MVP",
  "## Epic 9",
  // 9.1 and 9.2 have no touches: field at all → un-annotated (+own default).
  "- [ ] **9.1** Ready A · deps: — · /develop-story docs/p/s/story.9.1.a/story.9.1.a.md",
  "- [ ] **9.2** Ready B · deps: — · /develop-story docs/p/s/story.9.2.b/story.9.2.b.md",
  // 9.3 explicitly declares +own → annotated, must NOT be flagged.
  "- [ ] **9.3** Ready C · deps: — · touches: +own · /develop-story docs/p/s/story.9.3.c/story.9.3.c.md",
  "",
].join("\n");

test("13: touchesAnnotated distinguishes a missing field from an explicit +own", () => {
  const m = parseRoadmap(UNANNOTATED_ROADMAP);
  assert.equal(
    m.byId.get("9.1").touchesAnnotated,
    false,
    "no field → un-annotated",
  );
  assert.equal(
    m.byId.get("9.3").touchesAnnotated,
    true,
    "+own is a deliberate annotation",
  );
  // both still parse to an empty touches[] — the flag is the only signal
  assert.deepEqual(m.byId.get("9.1").touches, []);
  assert.deepEqual(m.byId.get("9.3").touches, []);
});

test("13: --batch warns when ≥2 un-annotated rows are co-scheduled", () => {
  const b = selectBatch(parseRoadmap(UNANNOTATED_ROADMAP));
  assert.equal(b.status, "batch");
  // all three are ready and none hard-conflict, so all are batched
  assert.deepEqual(
    b.batch.map((r) => r.id),
    ["9.1", "9.2", "9.3"],
  );
  // only the two field-less rows are reported un-annotated; +own 9.3 is excluded
  assert.deepEqual(
    b.unannotated.map((u) => u.id),
    ["9.1", "9.2"],
  );
  const warn = b.lint.warnings.filter((w) =>
    /un-annotated .* co-scheduled/.test(w),
  );
  assert.equal(
    warn.length,
    1,
    `expected one co-schedule warning; got ${JSON.stringify(b.lint.warnings)}`,
  );
  assert.match(warn[0], /9\.1, 9\.2/);
});

test("13: a single un-annotated row does not warn", () => {
  const m = parseRoadmap(
    [
      "# PHASE 1",
      "## Epic 9",
      "- [ ] **9.1** Ready A · deps: — · /develop-story docs/p/s/story.9.1.a/story.9.1.a.md",
      "- [ ] **9.3** Ready C · deps: — · touches: +own · /develop-story docs/p/s/story.9.3.c/story.9.3.c.md",
      "",
    ].join("\n"),
  );
  const b = selectBatch(m);
  assert.deepEqual(
    b.unannotated.map((u) => u.id),
    ["9.1"],
  );
  assert.equal(
    b.lint.warnings.filter((w) => /un-annotated .* co-scheduled/.test(w))
      .length,
    0,
    "one un-annotated row is not a co-scheduling risk",
  );
});

test("13: requireTouches keeps one un-annotated row, defers the rest", () => {
  const b = selectBatch(parseRoadmap(UNANNOTATED_ROADMAP), {
    requireTouches: true,
  });
  // 9.1 (first un-annotated) + 9.3 (annotated) batched; 9.2 deferred
  assert.deepEqual(
    b.batch.map((r) => r.id),
    ["9.1", "9.3"],
  );
  const dropped = b.excluded.find((e) => e.id === "9.2");
  assert.ok(dropped, "9.2 must be deferred");
  assert.match(dropped.reason, /unannotated-touches \(requireTouches\)/);
  // the downgrade resolves the risk → no residual co-schedule warning
  assert.equal(
    b.lint.warnings.filter((w) => /un-annotated .* co-scheduled/.test(w))
      .length,
    0,
    "deferring the extra row clears the warning",
  );
});

test("13: CLI --batch --require-touches defers un-annotated rows", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "roadmap-"));
  const file = path.join(dir, "roadmap.md");
  writeFileSync(file, UNANNOTATED_ROADMAP);
  const out = execFileSync(
    process.execPath,
    [SCRIPT, "--batch", "--require-touches", "--roadmap", file],
    { encoding: "utf-8" },
  );
  const r = JSON.parse(out);
  assert.equal(r.status, "batch");
  assert.deepEqual(
    r.batch.map((b) => b.id),
    ["9.1", "9.3"],
  );
  assert.ok(
    r.excluded.some((e) => e.id === "9.2" && /requireTouches/.test(e.reason)),
  );
});

// ── 14: /develop-bug rows are first-class runnable work ──────────────────────
//
// Before this, the selector reached `/develop-story` and `/develop-task` rows
// only, so bug work was unreachable by the autonomous loop — and a row naming
// `/develop-bug` was *worse* than no row at all: it returned a hard
// manual-checkpoint stop instead of the clean "no actionable rows".

const BUG_ROADMAP = [
  "# PHASE 1 — MVP",
  "## Epic 4",
  "- [ ] **4.1** Login times out · deps: — · touches: auth! · /develop-bug docs/bugs/bug.7.login-timeout/bug.7.login-timeout.md",
  "",
].join("\n");

test("14: a /develop-bug row with a valid .md arg is selected, not stopped on", () => {
  const r = selectNext(parseRoadmap(BUG_ROADMAP));
  assert.equal(r.status, "selected");
  assert.equal(r.item.id, "4.1");
  assert.equal(r.item.command, "/develop-bug");
  assert.equal(
    r.item.commandArg,
    "docs/bugs/bug.7.login-timeout/bug.7.login-timeout.md",
  );
});

test("14: a general bug resolves via a [bug](…) link, not just an inline arg", () => {
  // General bugs are `bug.{N}.{name}.md` — they carry no `story.`/`task.`
  // prefix, so the link fallback used to return null and the row stopped with
  // "no resolvable path" despite being correctly authored.
  const r = selectNext(
    parseRoadmap(
      [
        "# PHASE 1",
        "## Epic 4",
        "- [ ] **4.1** Login times out — [bug](docs/bugs/bug.7.login-timeout/bug.7.login-timeout.md) · deps: — · `/develop-bug`",
        "",
      ].join("\n"),
    ),
  );
  assert.equal(r.status, "selected");
  assert.equal(r.item.command, "/develop-bug");
  assert.equal(
    r.item.commandArg,
    "docs/bugs/bug.7.login-timeout/bug.7.login-timeout.md",
  );
});

test("14: story and task bug reports resolve via their link too", () => {
  for (const href of [
    "docs/prd/e2/story.2.3.x/story.2.3.bug.1.login-timeout.md",
    "docs/tasks/task.44.migrate/task.44.bug.1.migration-failure.md",
  ]) {
    const r = selectNext(
      parseRoadmap(
        `# PHASE 1\n\n## Epic 4\n\n- [ ] **4.1** Bug — [bug](${href}) · deps: — · \`/develop-bug\`\n`,
      ),
    );
    assert.equal(r.status, "selected", href);
    assert.equal(r.item.commandArg, href);
  }
});

test("14: kind resolves to bug — a bug row is never labelled a story", () => {
  const b = selectBatch(parseRoadmap(BUG_ROADMAP));
  assert.equal(b.status, "batch");
  const w = b.worktrees.find((x) => x.id === "4.1");
  assert.ok(w, "the bug row must produce a worktree plan");
  assert.match(
    w.shell,
    /^git worktree add .* -b bug\/4-1 develop$/,
    "two-way ternary would silently emit story/4-1",
  );
  assert.equal(w.base, "develop");
  assert.match(
    w.run,
    /^\/develop-bug docs\/bugs\/bug\.7\.login-timeout\/bug\.7\.login-timeout\.md$/,
  );
});

test("14: a /develop-bug row participates in --batch and touches: disjointness", () => {
  const b = selectBatch(
    parseRoadmap(
      [
        "# PHASE 1 — MVP",
        "## Epic 8",
        "- [ ] **8.1** Story A · deps: — · touches: schema~ · /develop-story docs/p/s/story.8.1.a/story.8.1.a.md",
        "- [ ] **8.2** Bug B (soft-shares schema) · deps: — · touches: schema~ · /develop-bug docs/bugs/bug.7.x/bug.7.x.md",
        "- [ ] **8.3** Bug C (hard auth) · deps: — · touches: auth! · /develop-bug docs/bugs/bug.8.y/bug.8.y.md",
        "- [ ] **8.4** Task D (hard auth) · deps: — · touches: auth! · /develop-task docs/tasks/task.9.z/task.9.z.md",
        "",
      ].join("\n"),
    ),
  );
  assert.deepEqual(
    b.batch.map((r) => r.id),
    ["8.1", "8.2", "8.3"],
    "a bug row packs like any other; 8.3 takes the hard 'auth' tag",
  );
  const dropped = b.excluded.find((e) => e.id === "8.4");
  assert.ok(dropped, "8.4 hard-conflicts with the bug row on 'auth'");
  assert.match(dropped.reason, /hard-conflict on 'auth' with 8\.3/);
  assert.ok(
    b.softOverlaps.some(
      (o) =>
        o.tag === "schema" &&
        o.between.includes("8.1") &&
        o.between.includes("8.2"),
    ),
    "a story/bug soft overlap is surfaced like any other",
  );
});

test("14: a bug row is dep-blocked and ⛔-blocked like any other row", () => {
  const text = [
    "# PHASE 1",
    "## Epic 4",
    "- [ ] **4.1** Prereq story · deps: — · /develop-story docs/p/s/story.4.1.a/story.4.1.a.md",
    "- [ ] **4.2** Bug · deps: 4.1 · /develop-bug docs/bugs/bug.7.x/bug.7.x.md",
    "",
  ].join("\n");
  const before = selectNext(parseRoadmap(text));
  assert.equal(before.item.id, "4.1", "the bug waits behind its dep");
  const after = selectNext(parseRoadmap(tick(text, "4.1")));
  assert.equal(after.status, "selected");
  assert.equal(after.item.id, "4.2");
  assert.equal(after.item.command, "/develop-bug");
});

test("14: regression — widening the alternation is not 'accept anything'", () => {
  // `/develop-epic` is not a runnable command. It must still be a
  // manual-checkpoint stop, and the stop detail must stay truthful now that
  // three commands are legal.
  const r = selectNext(
    parseRoadmap(
      "# PHASE 1\n\n## Epic 4\n\n- [ ] **4.1** Do the epic · deps: — · /develop-epic docs/p/e/epic.4.x.md\n",
    ),
  );
  assert.equal(r.status, "stop");
  assert.equal(r.stopReason, "manual-checkpoint");
  assert.equal(r.item.id, "4.1");
  assert.equal(
    r.item.command,
    null,
    "/develop-epic must not parse as runnable",
  );
  assert.match(
    r.detail,
    /\/develop-bug/,
    "stop detail must name every legal command",
  );
});

test("14: a /develop-bug row with no resolvable path is a manual-checkpoint stop", () => {
  const r = selectNext(
    parseRoadmap(
      "# PHASE 1\n\n## Epic 4\n\n- [ ] **4.1** Fix the thing · deps: — · `/develop-bug`\n",
    ),
  );
  assert.equal(r.status, "stop");
  assert.equal(r.stopReason, "manual-checkpoint");
  assert.equal(r.item.command, "/develop-bug");
  assert.match(r.detail, /no resolvable story\/task\/bug path/);
});

test("14: non-regression — a roadmap with zero bug rows selects exactly as before", () => {
  const r = selectNext(parseRoadmap(BATCH_ROADMAP));
  assert.equal(r.status, "selected");
  assert.equal(r.item.id, "8.1");
  assert.equal(r.item.command, "/develop-story");
  const b = selectBatch(parseRoadmap(BATCH_ROADMAP));
  assert.deepEqual(
    b.batch.map((x) => x.id),
    ["8.1", "8.2", "8.3"],
  );
  assert.deepEqual(
    b.worktrees.map((w) => w.branch),
    ["story/8-1", "story/8-2", "story/8-3"],
  );
});

// ── general-bug rows: the `B` id form ────────────────────────────────────────
//
// A bug row has always been expressible with a story-shaped id borrowed from its
// surrounding epic (see BUG_ROADMAP above, which uses `4.1`). What did NOT exist
// was a STANDALONE form — and a general bug has no parent epic to borrow from, so
// in a maintenance phase there was nothing correct to write. `**B2**` fell outside
// the id grammar, so the row was rejected as "checkbox row has no item id",
// SILENTLY SKIPPED, and the row below it selected instead. Found by filing a real
// bug into a maintenance phase and watching the loop step straight over it.

const STANDALONE_BUG_ROADMAP = `# Roadmap

## PHASE 1 — maintenance

- [ ] **B2** the suite fails for environmental reasons · deps: none · /develop-bug docs/bugs/bug.2.flake/bug.2.flake.md
- [ ] **T65** something else entirely · deps: none · /develop-task docs/tasks/task.65.x/task.65.x.md
`;

test("B: a general-bug row is a first-class candidate, not an id-less skip", () => {
  const r = select(STANDALONE_BUG_ROADMAP);
  assert.equal(r.status, "selected");
  assert.equal(r.item.id, "B2");
  assert.equal(r.item.command, "/develop-bug");
  assert.equal(
    r.item.commandArg,
    "docs/bugs/bug.2.flake/bug.2.flake.md",
    "the bug document path must survive parsing intact",
  );
  assert.deepEqual(r.lint.warnings, [], "a valid bug row must not warn");
  assert.deepEqual(r.lint.errors, []);
});

test("B: ticking the bug row advances to the next item rather than stalling", () => {
  const r = select(tick(STANDALONE_BUG_ROADMAP, "B2"));
  assert.equal(r.status, "selected");
  assert.equal(r.item.id, "T65");
});

test("B: a bug id satisfies deps like any other id", () => {
  const text = `# Roadmap

## PHASE 1 — maintenance

- [x] **B2** already fixed · /develop-bug docs/bugs/bug.2.flake/bug.2.flake.md
- [ ] **T65** depends on the fix · deps: B2 · /develop-task docs/tasks/task.65.x/task.65.x.md
`;
  const r = select(text);
  assert.equal(r.status, "selected");
  assert.equal(r.item.id, "T65", "a ticked B-dep must count as satisfied");
});

test("B: an outstanding bug dep blocks its dependent", () => {
  const text = `# Roadmap

## PHASE 1 — maintenance

- [ ] **B2** not fixed yet · /develop-bug docs/bugs/bug.2.flake/bug.2.flake.md
- [ ] **T65** depends on the fix · deps: B2 · /develop-task docs/tasks/task.65.x/task.65.x.md
`;
  const r = select(text);
  // B2 itself is eligible and comes first, so it is what gets selected — the point
  // of the assertion is that `deps: B2` parsed as an id at all. Before the `B`
  // form existed it was dropped silently, which would have let T65 run first.
  assert.equal(r.item.id, "B2");
});

// ── the inline-path matcher must not swallow markdown-link syntax ────────────
//
// Both forms are documented. Without excluding `[` from the inline alternative it
// won the race on a link-form row and captured the SYNTAX — `/develop-bug
// [bug](x/y.md)` yielded the literal `[bug](x/y.md`, an unbalanced, undispatchable
// string. Worse than not matching, because the caller would dispatch it.

test("a link-form row resolves to the href, never to the link syntax", () => {
  const text = `# Roadmap

## PHASE 1 — maintenance

- [ ] **B2** link form · /develop-bug [bug](docs/bugs/bug.2.flake/bug.2.flake.md)
`;
  const r = select(text);
  assert.equal(r.status, "selected");
  assert.equal(r.item.commandArg, "docs/bugs/bug.2.flake/bug.2.flake.md");
  assert.ok(
    !r.item.commandArg.includes("["),
    "the captured path must never contain link syntax",
  );
});

test("the inline form still wins when there is no link", () => {
  const text = `# Roadmap

## PHASE 1 — maintenance

- [ ] **T65** inline form · /develop-task docs/tasks/task.65.x/task.65.x.md
`;
  const r = select(text);
  assert.equal(r.item.commandArg, "docs/tasks/task.65.x/task.65.x.md");
});

test("B: a bug row inside an epic section is excluded from that epic's completion set", () => {
  // `isStandaloneId` governs this. Both `T` and `B` rows are conventionally written
  // inside a consumer epic's section for readability, but neither is a story OF that
  // epic — an epic is complete once its own stories are accepted, regardless of a
  // cross-cutting task or bug parked in the same section.
  //
  // Asserted against the PARSED MODEL rather than through selectNext: routed through
  // selection, the bug row is simply picked first (it is earlier in document order),
  // so the epic-membership branch is never reached and the assertion proves nothing.
  // A first attempt at this test did exactly that and survived the mutation.
  const model = parseRoadmap(`# Roadmap

## PHASE 1 — build

## Epic 4

- [x] **4.1** the only actual story · /develop-story docs/stories/story.4.1.x/story.4.1.x.md
- [ ] **T65** a cross-cutting task · /develop-task docs/tasks/task.65.x/task.65.x.md
- [ ] **B2** a cross-cutting bug · /develop-bug docs/bugs/bug.2.flake/bug.2.flake.md
`);

  const rowIds = model.epicSections[4].rowIds;
  assert.deepEqual(
    rowIds,
    ["4.1"],
    "an epic's completion set is its stories — not the standalone T/B rows filed beside them",
  );
  assert.ok(
    !rowIds.includes("B2"),
    "a general bug must never hold its host epic open",
  );
  assert.ok(!rowIds.includes("T65"), "nor must a standalone task");
});

// ── 15: registry fallback frontier (task.65) ─────────────────────────────────
//
// The roadmap is one hand-maintained index of work that already has two other
// indexes. A bug filed into `docs/bugs/bug-registry.md` or a task filed into
// `docs/tasks/task-registry.md` used to be invisible to selection, so the loop
// reported `roadmap-complete` — indistinguishable from "nothing to do" — while
// real work sat registered and unreferenced. That happened: bug.2 was filed,
// registered Major/High, and the selector reported roadmap-complete the same day.
//
// The fallback is deliberately reachable from EXACTLY ONE place: the terminal
// `roadmap-complete` return. The four other stops (`human-gated`,
// `planning-gap`, `manual-checkpoint`, `phase-blocked`) are deliberate operator
// decisions, and scanning past one of them would be the worst failure available
// here — the loop would look like it was working. The §SC9 block below is the
// guard against that, and it asserts the strong form: not merely "no registry
// item was selected", but "the registry loader was never CALLED".

const REG_BUG_PATH = "docs/bugs/bug-registry.md";
const REG_TASK_PATH = "docs/tasks/task-registry.md";

/** A loader that records every call, so a test can assert it was never invoked. */
function countingLoader(result) {
  const calls = { n: 0 };
  const load = () => {
    calls.n++;
    return result;
  };
  return { load, calls };
}

/** Minimal in-memory registry pair + a doc-status map, for pure-function tests. */
function registryOpts({ bugs = "", tasks = "", docs = {} } = {}) {
  const reads = [];
  return {
    reads,
    opts: {
      registries: {
        bugRegistry: { path: REG_BUG_PATH, text: bugs },
        taskRegistry: { path: REG_TASK_PATH, text: tasks },
        readStatus(p) {
          reads.push(p);
          return Object.prototype.hasOwnProperty.call(docs, p) ? docs[p] : null;
        },
      },
    },
  };
}

function bugRegistry(rows) {
  return [
    "# Bug Registry",
    "",
    "## Registry",
    "",
    "| #   | Title | Status | Severity | Priority | Created | Area |",
    "| --- | ----- | ------ | -------- | -------- | ------- | ---- |",
    ...rows,
    "",
  ].join("\n");
}

function taskRegistry(rows) {
  return [
    "# Task Registry",
    "",
    "## Registry",
    "",
    "| #   | Title | Status | Category | Priority | Created | Issue | Deps |",
    "| --- | ----- | ------ | -------- | -------- | -------- | ----- | ---- |",
    ...rows,
    "",
  ].join("\n");
}

const bugRow = (n, name, status, sev = "Major", pri = "High") =>
  `| ${n} | [Bug ${n}](bug.${n}.${name}/bug.${n}.${name}.md) | ${status} | ${sev} | ${pri} | 2026-08-29 | area |`;

const taskRow = (n, name, status, pri = "Medium") =>
  `| ${n} | [Task ${n}](task.${n}.${name}/task.${n}.${name}.md) | ${status} | infrastructure | ${pri} | 2026-08-29 | — | — |`;

// ── SC9: the four deliberate stops are never scanned past ────────────────────
//
// One test per stop reason. Each asserts BOTH halves: the stop is returned, and
// the registry loader was never called — the registries are not merely ignored,
// they are not read. Written before the fallback existed (per the task's review),
// and mutation-proved afterwards by widening the fallback to fire on any stop.

const SC9_CASES = [
  {
    reason: "human-gated",
    roadmap: [
      "# PHASE 1 — MVP",
      "- [ ] **9.1** Needs an operator · manual · deps: —",
      "- [ ] **9.2** Ready · deps: — · /develop-task docs/tasks/task.9.b/task.9.b.md",
      "",
    ].join("\n"),
  },
  {
    reason: "planning-gap",
    roadmap: [
      "# PHASE 1 — MVP",
      "- [ ] **9.1** Author it · deps: — · /create-story",
      "",
    ].join("\n"),
  },
  {
    reason: "manual-checkpoint",
    roadmap: [
      "# PHASE 1 — MVP",
      "- [ ] **9.1** Run /review-prd by hand · deps: —",
      "",
    ].join("\n"),
  },
  {
    reason: "phase-blocked",
    roadmap: [
      "# PHASE 1 — MVP",
      "- [ ] **9.1** Blocked · ⛔ BLOCKED until 9.9 accepted · deps: —",
      "- [ ] **9.9** Also blocked · ⛔ BLOCKED until 9.1 accepted · deps: —",
      "",
    ].join("\n"),
  },
];

for (const c of SC9_CASES) {
  test(`15/SC9: ${c.reason} stops the loop — the registries are never read`, () => {
    const { load, calls } = countingLoader({
      bugRegistry: {
        path: REG_BUG_PATH,
        text: bugRegistry([bugRow(1, "outstanding", "new")]),
      },
      taskRegistry: { path: REG_TASK_PATH, text: taskRegistry([]) },
      readStatus: () => "new",
    });
    const r = selectNext(parseRoadmap(c.roadmap), { loadRegistries: load });
    assert.equal(r.status, "stop");
    assert.equal(
      r.stopReason,
      c.reason,
      "the deliberate stop must be returned",
    );
    assert.equal(
      calls.n,
      0,
      `registries were read despite a ${c.reason} stop — the fallback scanned past a deliberate halt`,
    );
    assert.equal(r.item?.source ?? null, r.item ? "roadmap" : null);
  });
}

// ── SC1: an actionable roadmap makes the registries unreachable ──────────────

test("15/SC1: a roadmap selection is byte-identical to today's, modulo `source`", () => {
  const roadmap = fixture("01-first-item.md");
  const before = selectNext(parseRoadmap(roadmap));
  const { load, calls } = countingLoader({
    bugRegistry: {
      path: REG_BUG_PATH,
      text: bugRegistry([
        bugRow(1, "outstanding", "new", "Blocker", "Critical"),
      ]),
    },
    taskRegistry: { path: REG_TASK_PATH, text: taskRegistry([]) },
    readStatus: () => "new",
  });
  const after = selectNext(parseRoadmap(roadmap), { loadRegistries: load });

  assert.equal(
    calls.n,
    0,
    "an actionable roadmap must not read the registries",
  );
  assert.equal(after.item.source, "roadmap");
  // The ONLY difference in the whole verdict is the added `source` field.
  const strip = (r) => {
    const { source, ...rest } = r.item;
    return { ...r, item: rest };
  };
  assert.deepEqual(strip(after), strip(before));
});

test("15/SC1: `source` is present on a roadmap selection even with no loader", () => {
  const r = select(fixture("01-first-item.md"));
  assert.equal(
    r.item.source,
    "roadmap",
    "uniform shape — never an absent field",
  );
});

// ── SC2/SC3: the fallback selects when the roadmap is genuinely silent ───────

const EMPTY_ROADMAP = [
  "# PHASE 1 — MVP",
  "- [x] **9.1** Done · deps: —",
  "",
].join("\n");

function fallback({ bugs = [], tasks = [], docs = {} } = {}) {
  const { opts, reads } = registryOpts({
    bugs: bugRegistry(bugs),
    tasks: taskRegistry(tasks),
    docs,
  });
  const r = selectNext(parseRoadmap(EMPTY_ROADMAP), {
    loadRegistries: () => opts.registries,
  });
  return { r, reads };
}

test("15/SC2: an outstanding bug is selected once the roadmap is exhausted", () => {
  const { r } = fallback({
    bugs: [bugRow(7, "leak", "new")],
    docs: { "docs/bugs/bug.7.leak/bug.7.leak.md": "new" },
  });
  assert.equal(r.status, "selected");
  assert.equal(r.item.id, "B7");
  assert.equal(r.item.command, "/develop-bug");
  assert.equal(r.item.commandArg, "docs/bugs/bug.7.leak/bug.7.leak.md");
  assert.equal(r.item.source, "bug-registry");
});

test("15/SC3: an outstanding task is selected once the roadmap is exhausted", () => {
  const { r } = fallback({
    tasks: [taskRow(9, "refactor", "ready-for-development")],
    docs: {
      "docs/tasks/task.9.refactor/task.9.refactor.md": "ready-for-development",
    },
  });
  assert.equal(r.status, "selected");
  assert.equal(r.item.id, "T9");
  assert.equal(r.item.command, "/develop-task");
  assert.equal(
    r.item.commandArg,
    "docs/tasks/task.9.refactor/task.9.refactor.md",
  );
  assert.equal(r.item.source, "task-registry");
});

test("15: a `reopened` bug is eligible; an `in-progress` bug is not", () => {
  const open = fallback({
    bugs: [bugRow(7, "leak", "reopened")],
    docs: { "docs/bugs/bug.7.leak/bug.7.leak.md": "reopened" },
  });
  assert.equal(open.r.item.id, "B7");

  const mid = fallback({
    bugs: [bugRow(7, "leak", "in-progress")],
    docs: { "docs/bugs/bug.7.leak/bug.7.leak.md": "in-progress" },
  });
  assert.equal(mid.r.status, "stop");
  assert.equal(mid.r.stopReason, "roadmap-complete");
});

// ── SC4: bugs outrank tasks; ordering inside each kind is total ──────────────

test("15/SC4: a bug outranks a task, whatever their priorities say", () => {
  const { r } = fallback({
    bugs: [bugRow(9, "small", "new", "Trivial", "Low")],
    tasks: [taskRow(1, "urgent", "ready-for-development", "High")],
    docs: {
      "docs/bugs/bug.9.small/bug.9.small.md": "new",
      "docs/tasks/task.1.urgent/task.1.urgent.md": "ready-for-development",
    },
  });
  assert.equal(r.item.id, "B9", "known-broken outranks intended work");
});

test("15/SC4: bugs order by severity, then priority, then number", () => {
  const rows = [
    bugRow(1, "a", "new", "Minor", "High"),
    bugRow(2, "b", "new", "Blocker", "Low"),
    bugRow(3, "c", "new", "Major", "Low"),
    bugRow(4, "d", "new", "Major", "Critical"),
  ];
  const docs = Object.fromEntries(
    ["a", "b", "c", "d"].map((n, i) => [
      `docs/bugs/bug.${i + 1}.${n}/bug.${i + 1}.${n}.md`,
      "new",
    ]),
  );
  const forward = fallback({ bugs: rows, docs });
  assert.equal(forward.r.item.id, "B2", "Blocker first, despite Low priority");

  // Deterministic under input reordering — the order is a property of the rows,
  // not of the file.
  const reversed = fallback({ bugs: [...rows].reverse(), docs });
  assert.equal(reversed.r.item.id, "B2");
});

test("15/SC4: equal severity and priority tie-break on the lower number", () => {
  const { r } = fallback({
    bugs: [
      bugRow(8, "later", "new", "Major", "High"),
      bugRow(3, "earlier", "new", "Major", "High"),
    ],
    docs: {
      "docs/bugs/bug.8.later/bug.8.later.md": "new",
      "docs/bugs/bug.3.earlier/bug.3.earlier.md": "new",
    },
  });
  assert.equal(r.item.id, "B3");
});

test("15/SC4: tasks order by priority, then number", () => {
  const { r } = fallback({
    tasks: [
      taskRow(2, "low", "ready-for-development", "Low"),
      taskRow(9, "high", "ready-for-development", "High"),
      taskRow(4, "high2", "ready-for-development", "High"),
    ],
    docs: {
      "docs/tasks/task.2.low/task.2.low.md": "ready-for-development",
      "docs/tasks/task.9.high/task.9.high.md": "ready-for-development",
      "docs/tasks/task.4.high2/task.4.high2.md": "ready-for-development",
    },
  });
  assert.equal(r.item.id, "T4", "High before Low; 4 before 9");
});

// ── SC5: frontmatter decides, the registry row only nominates ────────────────
//
// The two demonstrably drift — three rows of THIS repo's task registry read
// `draft` while their documents read `accepted`. That is the current state of
// the file, not a hypothetical used to justify a guard. Asserted in BOTH
// directions, because a check that only catches stale-open rows would let a
// stale-closed row hide real work, which is the original bug pointed the other
// way.

test("15/SC5: registry stale-OPEN + terminal document → not selected", () => {
  const { r } = fallback({
    tasks: [taskRow(62, "shipped", "draft")], // the real drift shape
    docs: { "docs/tasks/task.62.shipped/task.62.shipped.md": "accepted" },
  });
  assert.equal(r.status, "stop");
  assert.equal(r.stopReason, "roadmap-complete");
  const row = r.registryFrontier.passedOver.find((p) => p.n === 62);
  assert.match(row.reason, /document status accepted/);
});

test("15/SC5: registry stale-CLOSED + open document → selected anyway", () => {
  const { r } = fallback({
    tasks: [taskRow(70, "live", "accepted")],
    docs: {
      "docs/tasks/task.70.live/task.70.live.md": "ready-for-development",
    },
  });
  assert.equal(r.status, "selected");
  assert.equal(r.item.id, "T70");
  assert.equal(r.item.registryStatus, "accepted");
  assert.equal(r.item.documentStatus, "ready-for-development");
  assert.match(r.rationale, /frontmatter is authoritative/);
});

test("15/SC5: the eligibility floor admits every status develop-task accepts", () => {
  // The three excluded values are exactly the three `develop-task` Phase 0c
  // HALTs on. `draft` and `planned` moved to the selectable sweep in task.71:
  // both are accepted by the dispatcher, and `planned` is what `/create-task`
  // emits, so excluding it made every freshly filed task invisible to
  // `/develop-next`. The review gate did not disappear with them — it moved to
  // `develop-task` Step 2, which HALTs on NEEDS REVISION / REQUIRES REWORK.
  //
  // This sweep is the BEHAVIOURAL half of the rule; the "eligibility floor vs
  // dispatcher" block below is the STRUCTURAL half, parsing the dispatcher's own
  // table. Both are needed: this one would still pass if the dispatcher changed
  // its mind, and that one would still pass if the floor were never consulted.
  for (const status of ["ready-for-review", "accepted", "cancelled"]) {
    const { r } = fallback({
      tasks: [taskRow(5, "spec", status)],
      docs: { "docs/tasks/task.5.spec/task.5.spec.md": status },
    });
    assert.equal(r.status, "stop", `${status} must not be selectable`);
  }
  for (const status of [
    "draft",
    "planned",
    "ready-for-development",
    "in-progress",
  ]) {
    const { r } = fallback({
      tasks: [taskRow(5, "spec", status)],
      docs: { "docs/tasks/task.5.spec/task.5.spec.md": status },
    });
    assert.equal(r.status, "selected", `${status} must be selectable`);
  }
});

// The repo's own task registry holds ZERO `draft` and ZERO `planned` rows — 66
// `accepted` and 5 `ready-for-development` — because every task filed so far was
// promoted by hand. So no real corpus exercises the widened floor, and the
// fixture below has to be synthetic. The obvious alternative check ("--lint
// reports tasks 67-70 as eligible") would be VACUOUS: all four are already
// `ready-for-development`, already eligible, and pass identically before and
// after the change.

test("15/SC5: a draft row and a planned row are both eligible; priority decides", () => {
  const rows = [
    taskRow(80, "speculative", "draft", "Medium"),
    taskRow(81, "fresh", "planned", "High"),
  ];
  const docs = {
    "docs/tasks/task.80.speculative/task.80.speculative.md": "draft",
    "docs/tasks/task.81.fresh/task.81.fresh.md": "planned",
  };
  const { opts } = registryOpts({ tasks: taskRegistry(rows), docs });
  const f = registryFrontier(opts.registries, { evaluateAll: true });

  // High beats Medium even though 81 > 80 — so this proves ELIGIBILITY, not the
  // ascending-number tie-break that would select T80 for free.
  assert.equal(f.selected.id, "T81");
  assert.equal(f.candidates, 2);

  // The decisive assertion: T80 is passed over for being OUTRANKED, not for
  // being outside the floor. Before task.71 both rows read
  // "outside the task eligibility floor" and nothing was selected at all.
  assert.equal(f.passedOver.length, 1);
  assert.equal(f.passedOver[0].n, 80);
  assert.doesNotMatch(
    f.passedOver[0].reason,
    /eligibility floor/,
    `a draft row must no longer be excluded by the floor — got: ${f.passedOver[0].reason}`,
  );
});

test("15/SC5: the widened floor does not disturb roadmap precedence", () => {
  // The registries are a FALLBACK, consulted only at `roadmap-complete`. Widening
  // the floor makes more rows eligible; it must not make them reachable sooner.
  const roadmap = fixture("01-first-item.md");
  const { load, calls } = countingLoader({
    bugRegistry: { path: REG_BUG_PATH, text: bugRegistry([]) },
    taskRegistry: {
      path: REG_TASK_PATH,
      text: taskRegistry([
        taskRow(80, "speculative", "draft", "Critical"),
        taskRow(81, "fresh", "planned", "Critical"),
      ]),
    },
    readStatus: () => "draft",
  });
  const r = selectNext(parseRoadmap(roadmap), { loadRegistries: load });

  assert.equal(r.item.source, "roadmap");
  assert.equal(
    calls.n,
    0,
    "an actionable roadmap must not read the registries, however wide the floor",
  );
});

test("15/SC5: a document that does not exist is never a candidate", () => {
  const { r } = fallback({
    tasks: [taskRow(5, "ghost", "ready-for-development")],
    docs: {}, // readStatus returns null
  });
  assert.equal(r.status, "stop");
  assert.match(
    r.registryFrontier.passedOver.find((p) => p.n === 5).reason,
    /document missing or unreadable/,
  );
});

// ── SC6: an item may be out of the frontier, never invisible ─────────────────

test("15/SC6: every passed-over row is listed with a reason — none is unlisted", () => {
  // Row 1 was `draft` until task.71 widened the floor to admit it. Its role in
  // this fixture is "a row outside the floor, which must still be LISTED with a
  // reason" — so it becomes `ready-for-review`, and rows 1/2/4 now spell out
  // exactly the three statuses the floor still excludes.
  const rows = [
    taskRow(1, "a", "ready-for-review"),
    taskRow(2, "b", "accepted"),
    taskRow(3, "c", "ready-for-development"),
    taskRow(4, "d", "cancelled"),
  ];
  const docs = {
    "docs/tasks/task.1.a/task.1.a.md": "ready-for-review",
    "docs/tasks/task.2.b/task.2.b.md": "accepted",
    "docs/tasks/task.3.c/task.3.c.md": "ready-for-development",
    "docs/tasks/task.4.d/task.4.d.md": "cancelled",
  };
  const { opts } = registryOpts({ tasks: taskRegistry(rows), docs });
  const f = registryFrontier(opts.registries, { evaluateAll: true });

  assert.equal(f.selected.id, "T3");
  assert.equal(f.candidates, 4);
  assert.equal(
    f.passedOver.length,
    3,
    "every non-selected row appears exactly once",
  );
  for (const p of f.passedOver) {
    assert.ok(p.reason && p.reason.length > 0, `row ${p.n} has no reason`);
  }
  assert.deepEqual(f.passedOver.map((p) => p.n).sort(), [1, 2, 4]);
});

test("15/SC6: selection short-circuits, lint evaluates everything", () => {
  const rows = [
    taskRow(1, "a", "ready-for-development"),
    taskRow(2, "b", "ready-for-development"),
  ];
  const docs = {
    "docs/tasks/task.1.a/task.1.a.md": "ready-for-development",
    "docs/tasks/task.2.b/task.2.b.md": "ready-for-development",
  };
  const { opts, reads } = registryOpts({ tasks: taskRegistry(rows), docs });

  const sel = registryFrontier(opts.registries);
  assert.equal(sel.selected.id, "T1");
  assert.equal(
    reads.length,
    1,
    "selection stops reading at the first eligible row",
  );
  assert.match(sel.passedOver[0].reason, /not evaluated — T1 ranked higher/);

  reads.length = 0;
  const lint = registryFrontier(opts.registries, { evaluateAll: true });
  assert.equal(reads.length, 2, "lint reads every candidate document");
  assert.match(lint.passedOver[0].reason, /eligible, but T1 ranked higher/);
  assert.equal(lint.passedOver[0].eligible, true);
});

// ── SC7: absent, empty and malformed registries degrade, never halt ──────────

test("15/SC7: an absent or empty registry yields no rows and never throws", () => {
  for (const text of ["", null, undefined, "   \n\n"]) {
    const p = parseRegistry(text, "task", REG_TASK_PATH);
    assert.deepEqual(p.rows, []);
    assert.deepEqual(p.malformed, []);
  }
  const { r } = fallback({});
  assert.equal(r.status, "stop");
  assert.equal(r.stopReason, "roadmap-complete");
});

test("15/SC7: a header-only registry and one with no table are both empty", () => {
  assert.deepEqual(
    parseRegistry(taskRegistry([]), "task", REG_TASK_PATH).rows,
    [],
  );
  assert.deepEqual(
    parseRegistry(
      "# Task Registry\n\nProse only, no table.\n",
      "task",
      REG_TASK_PATH,
    ).rows,
    [],
  );
});

test("15/SC7: one malformed row does not suppress the well-formed rows around it", () => {
  const p = parseRegistry(
    taskRegistry([
      taskRow(1, "good", "ready-for-development"),
      "| 2 | No link at all | ready-for-development | infra | High | 2026-08-29 | — | — |",
      taskRow(3, "alsogood", "ready-for-development"),
    ]),
    "task",
    REG_TASK_PATH,
  );
  assert.deepEqual(
    p.rows.map((x) => x.n),
    [1, 3],
  );
  assert.equal(p.malformed.length, 1);
  assert.equal(p.malformed[0].n, 2);
  assert.match(p.malformed[0].reason, /no \[title\]\(story\|task\|bug/);
});

test("15/SC7: a malformed row is passed over with a reason, never silently dropped", () => {
  const { opts } = registryOpts({
    tasks: taskRegistry([
      "| 2 | No link | ready-for-development | infra | High | 2026-08-29 | — | — |",
    ]),
  });
  const f = registryFrontier(opts.registries, { evaluateAll: true });
  assert.equal(f.selected, null);
  assert.equal(f.passedOver.length, 1);
  assert.match(f.passedOver[0].reason, /malformed row/);
});

test("15/SC7: a registry whose rows are all terminal selects nothing", () => {
  const { r } = fallback({
    bugs: [bugRow(1, "a", "closed"), bugRow(2, "b", "closed")],
    docs: {
      "docs/bugs/bug.1.a/bug.1.a.md": "closed",
      "docs/bugs/bug.2.b/bug.2.b.md": "closed",
    },
  });
  assert.equal(r.status, "stop");
  assert.equal(r.stopReason, "roadmap-complete");
});

test("15/SC7: a pipe table inside a fenced block is an example, not the registry", () => {
  const text = [
    "# Task Registry",
    "",
    "```markdown",
    taskRow(99, "sample", "ready-for-development"),
    "```",
    "",
    "## Registry",
    "",
    "| #   | Title | Status | Category | Priority | Created | Issue | Deps |",
    "| --- | ----- | ------ | -------- | -------- | ------- | ----- | ---- |",
    taskRow(1, "real", "ready-for-development"),
    "",
  ].join("\n");
  const p = parseRegistry(text, "task", REG_TASK_PATH);
  assert.deepEqual(
    p.rows.map((x) => x.n),
    [1],
    "the fenced sample row must not enter the frontier",
  );
});

test("15/SC7: an unrecognised severity or priority sorts last, it does not throw", () => {
  const { r } = fallback({
    bugs: [
      bugRow(1, "typo", "new", "Sever", "Urgnt"),
      bugRow(2, "sane", "new", "Minor", "Low"),
    ],
    docs: {
      "docs/bugs/bug.1.typo/bug.1.typo.md": "new",
      "docs/bugs/bug.2.sane/bug.2.sane.md": "new",
    },
  });
  assert.equal(r.item.id, "B2", "the parseable row outranks the typo'd one");
});

// ── SC8: roadmap-complete now means genuinely exhausted ──────────────────────

test("15/SC8: roadmap-complete is returned only when the registries are empty too", () => {
  const { r } = fallback({});
  assert.equal(r.stopReason, "roadmap-complete");
  assert.match(r.detail, /no outstanding registry item/);
  assert.equal(r.registryFrontier.passedOver.length, 0);
});

test("15/SC8: with no loader supplied, behaviour is exactly today's", () => {
  const r = selectNext(parseRoadmap(EMPTY_ROADMAP));
  assert.equal(r.stopReason, "roadmap-complete");
  assert.equal(r.detail, "no actionable candidate rows in any phase");
  assert.equal(r.registryFrontier, undefined);
});

// ── SC10: --batch never sees a registry item ────────────────────────────────

test("15/SC10: --batch is unchanged — registry items carry no touches: data", () => {
  const before = selectBatch(parseRoadmap(BATCH_ROADMAP));
  const after = selectBatch(parseRoadmap(BATCH_ROADMAP), {});
  assert.deepEqual(after, before);
  // selectBatch takes no registry loader at all: there is no way to inject one,
  // so a registry row cannot reach a batch even by mistake.
  const withLoader = selectBatch(parseRoadmap(EMPTY_ROADMAP), {
    loadRegistries: () => {
      throw new Error("selectBatch must never consult the registries");
    },
  });
  assert.deepEqual(withLoader.batch, []);
  const empty = selectBatch(parseRoadmap(EMPTY_ROADMAP));
  assert.deepEqual(empty.batch, [], "an exhausted roadmap batches nothing");
});

// ── frontmatter reading ─────────────────────────────────────────────────────

test("15: parseFrontmatterStatus reads one scalar and tolerates the rest", () => {
  assert.equal(parseFrontmatterStatus("---\nstatus: new\n---\n# Bug"), "new");
  assert.equal(
    parseFrontmatterStatus("---\nstatus: 'Accepted'\n---\n"),
    "accepted",
  );
  assert.equal(
    parseFrontmatterStatus(
      "---\nstatus: new # bug lifecycle: new → closed\n---\n",
    ),
    "new",
    "a trailing comment is not part of the value",
  );
  assert.equal(parseFrontmatterStatus("---\nid: task.5\n---\n"), null);
  assert.equal(parseFrontmatterStatus("# No frontmatter\n"), null);
  assert.equal(parseFrontmatterStatus(""), null);
  assert.equal(parseFrontmatterStatus(null), null);
});

test("15: registry hrefs resolve relative to the registry file, not the CWD", () => {
  const p = parseRegistry(
    bugRegistry([bugRow(4, "x", "new")]),
    "bug",
    "docs/bugs/bug-registry.md",
  );
  assert.equal(p.rows[0].path, "docs/bugs/bug.4.x/bug.4.x.md");
});

// ── 16: QA cycle-1 fixes (task.65 gate 1) ────────────────────────────────────

// ── H1: eligibility floor vs dispatcher — `===` for tasks, `\u2286` for bugs ───────
//
// The frontier names a command, so a status that command refuses produces a
// selection nothing can act on. `develop-task` Phase 0c HALTs on
// `Ready for Review`, and `/develop-next` leaves its run-state file in place
// across a pipeline HALT \u2014 so an unattended loop would stop at such an item and
// resume at the same one next invocation. It could not self-recover.
//
// The relation was `\u2286` on both axes until task.71. It is now `===` on the TASK
// axis: a strict subset is a gap the selector cannot explain, because it refuses
// work the dispatcher would accept, and the one status that mattered \u2014 `planned`,
// what `/create-task` actually emits \u2014 sat in that gap, making every freshly
// filed task invisible to `/develop-next`. Equality also catches OVER-widening,
// which `\u2286` never could: adding `accepted` to the floor now fails here.
//
// The BUG axis deliberately keeps `\u2286`. See the bug test below for the measured
// gap and why closing it is a different change.
//
// This test parses the DISPATCHERS' OWN status tables rather than restating
// them, so it re-checks itself if either pipeline changes what it accepts. Both
// sources are git-tracked: `.agents/skills/` is a gitignored symlink, and a test
// reading through it would pass locally and fail in CI, which is the most
// expensive shape a defect can take.

const STEP0_TASK = path.join(
  REPO_ROOT,
  "shared",
  "resources",
  "develop-pipeline-step-0-resolve-and-prepare.md",
);
const STEP0_BUG = path.join(
  REPO_ROOT,
  "skills",
  "develop-bug",
  "references",
  "develop-bug-step-0-resolve-bug.md",
);

/** `Ready for Development` → `ready-for-development`; `accepted` → `accepted`. */
const kebab = (v) => v.trim().toLowerCase().replace(/\s+/g, "-");

/**
 * Statuses a dispatcher's status table says it PROCEEDS on.
 *
 * A table row is `| \`Status\` | Action |`. A row whose action mentions HALT is a
 * refusal; anything else proceeds. A status cell may name several values
 * (`` `Ready for Review` / `accepted` ``), so split on the slash.
 */
function proceedStatuses(markdown, sectionHeading) {
  let body = markdown;
  if (sectionHeading) {
    const start = markdown.indexOf(sectionHeading);
    assert.ok(start > -1, `section ${sectionHeading} not found`);
    const after = markdown.slice(start + sectionHeading.length);
    const nextHeading = after.search(/\n#{1,4}\s/);
    body = nextHeading === -1 ? after : after.slice(0, nextHeading);
  }
  const proceed = new Set();
  let sawRow = false;
  for (const line of body.split("\n")) {
    const m = line.match(/^\|\s*(`[^|]*`(?:\s*\/\s*`[^|]*`)*)\s*\|(.*)\|\s*$/);
    if (!m) continue;
    sawRow = true;
    const action = m[2];
    if (/HALT/i.test(action)) continue;
    for (const v of m[1].split("/")) {
      const name = v.replace(/`/g, "").trim();
      if (name) proceed.add(kebab(name));
    }
  }
  assert.ok(sawRow, "no status-table rows parsed — the table shape changed");
  return proceed;
}

test("16/H1: the task eligibility floor EQUALS what develop-task proceeds on", () => {
  const md = readFileSync(STEP0_TASK, "utf-8");
  // The develop-task variant of the "Autonomous status handling" table.
  const idx = md.indexOf("**Autonomous status handling:**");
  assert.ok(idx > -1, "autonomous status handling section not found");
  const proceed = proceedStatuses(md.slice(idx), "#### develop-task");

  // Both guards below predate task.71 and are what stops an empty or mangled
  // parse from satisfying the comparison VACUOUSLY. `proceedStatuses` already
  // asserts `sawRow`; these two pin the CONTENT. Converting \u2286 to === made them
  // more load-bearing, not less: two empty sets are equal, so without an anchor
  // a table-shape change would turn this test green by parsing nothing at all.
  assert.ok(
    proceed.has("ready-for-development") && proceed.has("in-progress"),
    `parsed proceed-set looks wrong: ${[...proceed].join(", ")}`,
  );
  assert.ok(
    !proceed.has("ready-for-review"),
    "develop-task is documented as HALTing on Ready for Review — if that changed, revisit the floor",
  );

  // Two-way equality. \u2286 could only catch UNDER-widening (a floor status the
  // dispatcher refuses); it was blind to OVER-restriction (a status the
  // dispatcher accepts that the floor withholds), which is precisely how
  // `planned` \u2014 what `/create-task` emits \u2014 stayed outside the frontier.
  const onlyInFloor = [...TASK_ELIGIBLE_STATUSES].filter(
    (v) => !proceed.has(v),
  );
  const onlyInDispatcher = [...proceed].filter(
    (v) => !TASK_ELIGIBLE_STATUSES.has(v),
  );

  assert.deepEqual(
    { onlyInFloor, onlyInDispatcher },
    { onlyInFloor: [], onlyInDispatcher: [] },
    `the task eligibility floor and develop-task's accepted set have diverged.\n` +
      `  only in floor:      ${onlyInFloor.join(", ") || "(none)"}\n` +
      `      \u2192 the frontier would nominate work the dispatcher refuses; an\n` +
      `        unattended loop would HALT on it and resume at the same item.\n` +
      `  only in dispatcher: ${onlyInDispatcher.join(", ") || "(none)"}\n` +
      `      \u2192 the selector refuses work develop-task would accept; that work is\n` +
      `        invisible to /develop-next until a human promotes it by hand.\n` +
      `  If a divergence is deliberate, say so here and in select-next.mjs \u2014 it\n` +
      `  must not drift in silently.`,
  );
});

// The bug axis stays `\u2286` \u2014 a deliberate, MEASURED divergence, not an oversight.
//
//   develop-bug proceeds on : new, reopened, in-progress, ready-for-qa
//   BUG_ELIGIBLE_STATUSES   : new, reopened
//   gap                     : in-progress, ready-for-qa
//
// Task.71 tightened the TASK axis to `===` and deliberately declined to do the
// same here. Closing this gap would hand an unattended loop a `ready-for-qa` bug
// \u2014 one whose fix is already written and is only awaiting verification \u2014 and an
// `in-progress` bug someone may be actively holding. That is a change with its
// own Breaking Changes and Risk sections, not a corollary of this one. Recorded
// so the next reader starts from a fact rather than an open question.
test("16/H1: every bug eligibility status is one develop-bug proceeds on", () => {
  const proceed = proceedStatuses(readFileSync(STEP0_BUG, "utf-8"), null);
  assert.ok(
    proceed.has("new") && proceed.has("reopened"),
    `parsed proceed-set looks wrong: ${[...proceed].join(", ")}`,
  );
  for (const status of BUG_ELIGIBLE_STATUSES) {
    assert.ok(
      proceed.has(status),
      `BUG_ELIGIBLE_STATUSES contains "${status}", which develop-bug does not proceed on`,
    );
  }
});

test("16/H1: a ready-for-review task is not selected", () => {
  const { r } = fallback({
    tasks: [taskRow(9, "awaiting-qa", "ready-for-review")],
    docs: {
      "docs/tasks/task.9.awaiting-qa/task.9.awaiting-qa.md": "ready-for-review",
    },
  });
  assert.equal(r.status, "stop");
  assert.equal(r.stopReason, "roadmap-complete");
  assert.match(
    r.registryFrontier.passedOver.find((p) => p.n === 9).reason,
    /document status ready-for-review — outside the task eligibility floor/,
  );
});

// ── M2: a typo'd id is a malformed row, not an invisible one ────────────────

test("16/M2: a non-numeric id row is reported, not silently skipped", () => {
  const p = parseRegistry(
    taskRegistry([
      taskRow(1, "good", "ready-for-development"),
      // The prefixed form the roadmap uses — an easy thing to carry across by
      // hand. Previously indistinguishable from the header row, so it vanished.
      "| T65 | [Task 65](task.65.x/task.65.x.md) | ready-for-development | infra | High | x | — | — |",
      taskRow(3, "alsogood", "ready-for-development"),
    ]),
    "task",
    REG_TASK_PATH,
  );
  assert.deepEqual(
    p.rows.map((x) => x.n),
    [1, 3],
    "the well-formed rows around it still parse",
  );
  assert.equal(
    p.malformed.length,
    1,
    "the typo'd row is REPORTED, not skipped",
  );
  assert.match(p.malformed[0].reason, /id cell "T65" is not a number/);
  assert.equal(p.malformed[0].line, 8);
});

test("16/M2: the header row itself is still not reported as malformed", () => {
  const p = parseRegistry(
    taskRegistry([taskRow(1, "good", "ready-for-development")]),
    "task",
    REG_TASK_PATH,
  );
  assert.equal(p.malformed.length, 0, "a header is a header, not a bad row");
  assert.equal(p.rows.length, 1);
});

test("16/M2: a typo'd row reaches --lint rather than disappearing", () => {
  const { opts } = registryOpts({
    tasks: taskRegistry([
      "| T65 | [Task 65](task.65.x/task.65.x.md) | ready-for-development | infra | High | x | — | — |",
    ]),
  });
  const f = registryFrontier(opts.registries, { evaluateAll: true });
  assert.equal(f.selected, null);
  assert.equal(
    f.passedOver.length,
    1,
    "no row may be both ineligible and unlisted (SC6)",
  );
  assert.match(f.passedOver[0].reason, /not a number/);
});

// ── M3: columns are read by NAME when a header exists ───────────────────────

test("16/M3: a consumer registry with reordered columns reads correctly", () => {
  // Priority and Category swapped relative to this repo's own layout.
  const swapped = [
    "| #   | Title | Status | Priority | Category | Created |",
    "| --- | ----- | ------ | -------- | -------- | ------- |",
    "| 7 | [T](task.7.a/task.7.a.md) | ready-for-development | High | infra | 2026-01-01 |",
  ].join("\n");
  const p = parseRegistry(swapped, "task", REG_TASK_PATH);
  assert.equal(p.rows.length, 1);
  assert.equal(
    p.rows[0].priority,
    "High",
    "priority must come from the Priority column, not from position 4",
  );
  assert.equal(p.rows[0].registryStatus, "ready-for-development");
});

test("16/M3: reordered columns actually change the ORDER, not just the field", () => {
  const reg = [
    "| #   | Title | Status | Priority | Category | Created |",
    "| --- | ----- | ------ | -------- | -------- | ------- |",
    "| 1 | [Low](task.1.low/task.1.low.md) | ready-for-development | Low | infra | x |",
    "| 2 | [High](task.2.high/task.2.high.md) | ready-for-development | High | infra | x |",
  ].join("\n");
  const { opts } = registryOpts({
    tasks: reg,
    docs: {
      "docs/tasks/task.1.low/task.1.low.md": "ready-for-development",
      "docs/tasks/task.2.high/task.2.high.md": "ready-for-development",
    },
  });
  const f = registryFrontier(opts.registries);
  assert.equal(
    f.selected.id,
    "T2",
    "the High-priority row must win; reading position 4 would have made both 'infra' and tie on number",
  );
});

test("16/M3: bug severity is read by name too", () => {
  const reg = [
    "| #   | Title | Status | Priority | Severity | Created |",
    "| --- | ----- | ------ | -------- | -------- | ------- |",
    "| 1 | [A](bug.1.a/bug.1.a.md) | new | Low | Minor | x |",
    "| 2 | [B](bug.2.b/bug.2.b.md) | new | Low | Blocker | x |",
  ].join("\n");
  const { opts } = registryOpts({
    bugs: reg,
    docs: {
      "docs/bugs/bug.1.a/bug.1.a.md": "new",
      "docs/bugs/bug.2.b/bug.2.b.md": "new",
    },
  });
  const f = registryFrontier(opts.registries);
  assert.equal(f.selected.id, "B2", "Blocker outranks Minor at equal priority");
});

test("16/M3: a headerless table still parses at the documented positions", () => {
  // No separator row, so no header is ever promoted — the fallback must hold.
  const headerless =
    "| 4 | [T](task.4.a/task.4.a.md) | ready-for-development | infra | High | x | — | — |";
  const p = parseRegistry(headerless, "task", REG_TASK_PATH);
  assert.equal(p.rows.length, 1);
  assert.equal(p.rows[0].priority, "High");
  assert.equal(p.rows[0].registryStatus, "ready-for-development");
});

test("16/M3: a header missing a known column warns rather than reading blind", () => {
  const noPriority = [
    "| #   | Title | Status | Category | Created |",
    "| --- | ----- | ------ | -------- | ------- |",
    "| 4 | [T](task.4.a/task.4.a.md) | ready-for-development | infra | 2026-01-01 |",
  ].join("\n");
  const p = parseRegistry(noPriority, "task", REG_TASK_PATH);
  assert.equal(p.rows.length, 1);
  assert.equal(p.warnings.length, 1);
  assert.match(p.warnings[0], /names no priority column/);
});

// ── L4: the work-item href test is shared with the roadmap parser ───────────

test("16/L4: a preceding non-work-item link never wins over the work-item one", () => {
  // The realistic shape: a title that cites something before naming the item.
  const p = parseRegistry(
    taskRegistry([
      "| 1 | [design notes](../../.agents/plans/x.md) — [T](task.1.a/task.1.a.md) | ready-for-development | infra | High | x | — | — |",
    ]),
    "task",
    REG_TASK_PATH,
  );
  assert.equal(p.rows.length, 1);
  assert.equal(
    p.rows[0].path,
    "docs/tasks/task.1.a/task.1.a.md",
    "the first .md href is not the work item — the first WORK-ITEM href is",
  );
});

test("16/L4: a genuinely nested link degrades to malformed, not to a wrong path", () => {
  // Nested links are not valid markdown, and `MD_LINK_RE` cannot span the inner
  // `]`, so only the INNER href is visible. The honest outcome is to report the
  // row rather than resolve it to `notes.md` and dispatch something wrong — and
  // that is exactly what the work-item filter now buys: before it, this row
  // resolved to `docs/tasks/notes.md` and was silently rejected downstream as
  // "document missing", which named the wrong cause.
  const p = parseRegistry(
    taskRegistry([
      "| 1 | [See [notes](notes.md) here](task.1.a/task.1.a.md) | ready-for-development | infra | High | x | — | — |",
    ]),
    "task",
    REG_TASK_PATH,
  );
  assert.equal(p.rows.length, 0);
  assert.equal(p.malformed.length, 1);
  assert.match(p.malformed[0].reason, /no \[title\]\(story\|task\|bug/);
});

test("16/L4: a title whose only link is not a work item is malformed", () => {
  const p = parseRegistry(
    taskRegistry([
      "| 1 | [Design](../../.agents/plans/design.md) | ready-for-development | infra | High | x | — | — |",
    ]),
    "task",
    REG_TASK_PATH,
  );
  assert.equal(p.rows.length, 0);
  assert.equal(p.malformed.length, 1);
  assert.match(p.malformed[0].reason, /no \[title\]\(story\|task\|bug/);
});

// ── 17: column state is scoped to ONE table (task.65 gate 2, N1) ─────────────
//
// The M2 fix (§16) introduced this: `cols` was assigned when a header was
// promoted and never cleared, so once ANY header had been seen every later
// table row in the document was parsed as registry data. A `## Notes` key/value
// table produced spurious "malformed row" entries, and a second registry
// section's own header was reported as `id cell "#" is not a number`.
//
// It could not select anything wrong — malformed rows never become candidates —
// but it polluted the `--lint` report the SC6 visibility guarantee rests on.
// That is the invisible-row defect M2 fixed, pointed the other way: M2 made real
// rows visible, and in doing so made NON-rows falsely visible.
//
// These tests exist because the suite was green 113/113 both with and without
// the remedy, which is why the fix cycle that introduced it did not notice.

const REG_HEAD = [
  "| #   | Title | Status | Category | Priority | Created | Issue | Deps |",
  "| --- | ----- | ------ | -------- | -------- | ------- | ----- | ---- |",
];
const regRow = (n) =>
  `| ${n} | [T](task.${n}.a/task.${n}.a.md) | ready-for-development | infra | High | x | — | — |`;

test("17/N1: a key/value table AFTER the registry contributes nothing", () => {
  const p = parseRegistry(
    [
      ...REG_HEAD,
      regRow(1),
      "",
      "## Notes",
      "",
      "| Key | Meaning |",
      "| --- | ------- |",
      "| foo | bar |",
      "",
    ].join("\n"),
    "task",
    REG_TASK_PATH,
  );
  assert.deepEqual(
    p.rows.map((r) => r.n),
    [1],
  );
  assert.equal(
    p.malformed.length,
    0,
    "a documentation table is not a registry row — it must not reach --lint",
  );
});

test("17/N1: a term/definition table after the registry contributes nothing", () => {
  const p = parseRegistry(
    [
      ...REG_HEAD,
      regRow(1),
      "",
      "## Notes",
      "",
      "| Term | Definition |",
      "| ---- | ---------- |",
      "| SC | success criterion |",
      "",
    ].join("\n"),
    "task",
    REG_TASK_PATH,
  );
  assert.deepEqual(
    p.rows.map((r) => r.n),
    [1],
  );
  assert.equal(p.malformed.length, 0);
});

test("17/N1: a second registry section parses, header and all", () => {
  const p = parseRegistry(
    [
      ...REG_HEAD,
      regRow(1),
      "",
      "## Archived",
      "",
      ...REG_HEAD,
      regRow(2),
      "",
    ].join("\n"),
    "task",
    REG_TASK_PATH,
  );
  assert.deepEqual(
    p.rows.map((r) => r.n),
    [1, 2],
    "both sections' rows parse",
  );
  assert.equal(
    p.malformed.length,
    0,
    'the second section\'s header is a header, not `id cell "#" is not a number`',
  );
});

test("17/N1: a stray table's rows never reach --lint as passed-over rows", () => {
  const { opts } = registryOpts({
    tasks: [
      ...REG_HEAD,
      regRow(1),
      "",
      "## Notes",
      "",
      "| Key | Meaning |",
      "| --- | ------- |",
      "| foo | bar |",
      "",
    ].join("\n"),
    docs: { "docs/tasks/task.1.a/task.1.a.md": "accepted" },
  });
  const f = registryFrontier(opts.registries, { evaluateAll: true });
  assert.equal(f.candidates, 1, "only the real row is a candidate");
  assert.equal(
    f.passedOver.length,
    1,
    "exactly the one real row is reported — no documentation-table noise",
  );
  assert.match(f.passedOver[0].reason, /document status accepted/);
});

// The scenarios that already worked must keep working — the reset must not
// throw away a mapping that is still in force.

test("17/N1: a legend table BEFORE the registry does not disturb it", () => {
  const p = parseRegistry(
    [
      "| Key | Meaning |",
      "| --- | ------- |",
      "| foo | bar |",
      "",
      "## Registry",
      "",
      ...REG_HEAD,
      regRow(1),
      "",
    ].join("\n"),
    "task",
    REG_TASK_PATH,
  );
  assert.deepEqual(
    p.rows.map((r) => r.n),
    [1],
  );
  assert.equal(p.malformed.length, 0);
});

test("17/N1: a fenced block mid-table does not end the table, and the column mapping survives it", () => {
  // A fence resets the header CANDIDATE but not the resolved mapping — the rows
  // after it are still the same table.
  //
  // The columns here are deliberately SWAPPED relative to the documented
  // positions (Priority at 3, Category at 4). Without that this test cannot tell
  // the two apart: if the mapping were dropped at the fence, the parser would
  // fall back to documented positions and, on a conventionally ordered table,
  // produce exactly the same answer. Proved by mutation — an over-eager
  // `cols = null` on the fence toggle reddens this test only in this form, and
  // passed against the conventionally ordered version it replaced.
  const head = [
    "| #   | Title | Status | Priority | Category | Created |",
    "| --- | ----- | ------ | -------- | -------- | ------- |",
  ];
  const row = (n) =>
    `| ${n} | [T](task.${n}.a/task.${n}.a.md) | ready-for-development | High | infra | x |`;
  const p = parseRegistry(
    [...head, row(1), "```", "| 99 | fake |", "```", row(2), ""].join("\n"),
    "task",
    REG_TASK_PATH,
  );
  assert.deepEqual(
    p.rows.map((r) => r.n),
    [1, 2],
    "the fenced sample is skipped; the real rows either side both parse",
  );
  assert.equal(p.malformed.length, 0);
  assert.equal(
    p.rows[1].priority,
    "High",
    "the row AFTER the fence still reads Priority by name, not by position",
  );
});

test("17/N1: a separator with no header above it still falls back to positions", () => {
  const p = parseRegistry(
    [REG_HEAD[1], regRow(1), ""].join("\n"),
    "task",
    REG_TASK_PATH,
  );
  assert.deepEqual(
    p.rows.map((r) => r.n),
    [1],
  );
  assert.equal(p.rows[0].priority, "High");
});

test("17/N1: the real registries parse clean — no spurious malformed rows", () => {
  // The strongest form of this test: the actual files, not fixtures. Both carry
  // a `## Notes` section today, so a regression here reappears in this repo's
  // own `--lint` output rather than only in a consumer's.
  for (const [kind, rel] of [
    ["bug", "docs/bugs/bug-registry.md"],
    ["task", "docs/tasks/task-registry.md"],
  ]) {
    const text = readFileSync(path.join(REPO_ROOT, rel), "utf-8");
    const p = parseRegistry(text, kind, rel);
    assert.ok(p.rows.length > 0, `${rel} parsed no rows`);
    assert.deepEqual(
      p.malformed,
      [],
      `${rel} produced malformed rows: ${JSON.stringify(p.malformed)}`,
    );
    assert.deepEqual(p.warnings, [], `${rel} produced header warnings`);
  }
});
