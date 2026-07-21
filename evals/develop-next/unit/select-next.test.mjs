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
import { writeFileSync, mkdtempSync } from "node:fs";
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

const { parseRoadmap, selectNext } = await import(pathToFileURL(SCRIPT).href);

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
