// pipeline-completeness.test.mjs — the merge-time guard that refuses a run whose implementation
// report does not record every pipeline step as done (bug.128, 2026-11-09).
//
// Every block drives the CLI as a subprocess and asserts the exit code and the problem ids, so a
// reverted check turns a named test red:
//
//   A  the real bug.128 report    exit 1, step-not-done for Step 2 and nothing else
//   B  a complete report          exit 0 — bug shape, story/task shape, extra `1a` rows, and a
//                                 `✅ … (skipped — already reviewed)` row
//   C  lite mode is no waiver     lite on + QA row skipped → exit 1 (the lite-mode and bug
//                                 references skip no step; see the engine header)
//   D  lite mode off              QA row skipped → exit 1
//   E  unreadable → exit 2        missing file, no --report, unknown flag, no heading, empty
//                                 heading, garbage, header without Status — never 0 or 1
//   F  empty time on a ✅ row     exit 1, step-time-missing
//   G  a step with no row         exit 1, row-missing
//   H  the one waiver             story/task Step 2 `--skip review` AND a Decisions Log line → 0;
//                                 each of the four conjuncts removed → 1; a bug never qualifies
//   I  malformed row, fences      row-malformed; a table quoted inside a fence is not the table
//   J  --json                     reason ok | incomplete | usage with the same exit codes

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, "..", "pipeline-completeness.js");
const REAL = path.join(
  HERE,
  "fixtures",
  "pipeline-completeness",
  "bug.128.implementation.1.reduced-shape.md",
);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pipeline-completeness-"));
test.after(() => fs.rmSync(TMP, { recursive: true, force: true }));

let n = 0;
function write(text) {
  const p = path.join(TMP, `report-${(n += 1)}.md`);
  fs.writeFileSync(p, text);
  return p;
}
function run(args) {
  const r = spawnSync("node", [CLI, ...args], { encoding: "utf8" });
  return { rc: r.status, out: r.stdout, err: r.stderr };
}
const check = (text, extra = []) => run(["--report", write(text), ...extra]);
const ids = (res) =>
  [...res.out.matchAll(/^ {2}([a-z-]+) \(line/gm)].map((m) => m[1]);

const T = "2026-11-09T13:35Z";
const BUG_STEPS = [
  ["1", "create-branch"],
  ["2", "review-bug"],
  ["3", "investigate-fix"],
  ["4", "create-pr"],
  ["5–6", "verify-fix loop"],
  ["7", "finalise-close"],
  ["8", "commit-changes"],
];
// rows: { [stepId]: { status?, time?, notes? } } overrides; { [stepId]: null } drops the row.
function bugReport({ lite = "off", rows = {}, extra = "" } = {}) {
  const body = BUG_STEPS.filter(([id]) => rows[id] !== null).map(
    ([id, skill]) => {
      const o = rows[id] || {};
      const time = "time" in o ? o.time : T;
      return `| ${id} | ${skill} | ${o.status ?? "✅ Done"} | ${o.notes ?? ""} | | ${time} |`;
    },
  );
  return `---
type: implementation-report
bug: 'bug.9'
---

# Implementation Report — bug.9

**Lite mode:** ${lite}

## Pipeline Progress

| Step | Skill | Status | Notes | Subagent summary ref | Completed (UTC) |
|------|-------|--------|-------|----------------------|-----------------|
${body.join("\n")}

## Decisions Log

${extra}
`;
}
const STORY_STEPS = [
  ["1. create-story-branch", "1"],
  ["2. review-story", "2"],
  ["3. develop", "3"],
  ["4. create-pr", "4"],
  ["5–6. qa-story / qa-fix loop", "5-6"],
  ["7. finalise", "7"],
  ["8. commit-changes", "8"],
];
function storyReport({ rows = {}, extraRows = "", extra = "" } = {}) {
  const body = STORY_STEPS.map(([label, id]) => {
    const o = rows[id] || {};
    const time = "time" in o ? o.time : T;
    return `| ${label} | ${o.status ?? "✅ Done"} | \`artifact\` | ${o.notes ?? ""} | — | ${time} |`;
  });
  return `# Implementation Report

**Story**: \`story.1.2.3.x.md\`

## Pipeline Progress

| Step | Status | Required Artifacts | Notes | Subagent summary ref | Completed (UTC) |
| ---- | ------ | ------------------ | ----- | -------------------- | --------------- |
${extraRows}${body.join("\n")}

## Decisions Log

${extra}
`;
}
// ── A ────────────────────────────────────────────────────────────────────────

test("A: the real bug.128 report (Step 2 skipped) is incomplete — exit 1, step-not-done for Step 2 only", () => {
  const r = run(["--report", REAL]);
  assert.equal(r.rc, 1, r.out + r.err);
  assert.deepEqual(ids(r), ["step-not-done"]);
  assert.match(r.out, /step-not-done \(line 24\): Step 2 .*⏭️ Skipped/);
});

// ── B ────────────────────────────────────────────────────────────────────────

test("B: a complete bug report exits 0", () => {
  const r = check(bugReport());
  assert.equal(r.rc, 0, r.out + r.err);
  assert.deepEqual(ids(r), []);
});

test("B: a complete story/task-shaped report exits 0, including 1a/1b rows and an already-reviewed ✅ row", () => {
  const extraRows =
    "| 1a. create-epic-branch | ✅ Done | `epic` | | — | " + T + " |\n";
  const r = check(
    storyReport({
      extraRows,
      rows: { 2: { status: "✅ Done (skipped — already reviewed)" } },
    }),
  );
  assert.equal(r.rc, 0, r.out + r.err);
});

test("B: an extra row that is not done is judged like the rest", () => {
  const extraRows =
    "| 1a. create-epic-branch | ⏳ Pending | `epic` | | — | |\n";
  const r = check(storyReport({ extraRows }));
  assert.equal(r.rc, 1);
  assert.deepEqual(ids(r), ["step-not-done"]);
});

// ── C, D ─────────────────────────────────────────────────────────────────────

test("C: lite mode on does not make a skipped QA row acceptable — exit 1", () => {
  const r = check(
    bugReport({
      lite: "on",
      rows: { "5–6": { status: "⏭️ Skipped", time: "" } },
    }),
  );
  assert.equal(r.rc, 1, r.out);
  assert.deepEqual(ids(r), ["step-not-done"]);
  assert.match(r.out, /Step 5-6/);
});

test("C: lite mode on does not make a skipped review row acceptable either", () => {
  const r = check(
    bugReport({ lite: "on", rows: { 2: { status: "⏭️ Skipped", time: "" } } }),
  );
  assert.equal(r.rc, 1, r.out);
});

test("D: lite mode off + QA row skipped — exit 1", () => {
  const r = check(
    bugReport({
      lite: "off",
      rows: { "5–6": { status: "⏭️ Skipped", time: "" } },
    }),
  );
  assert.equal(r.rc, 1);
  assert.deepEqual(ids(r), ["step-not-done"]);
});

test("D: a Pending, Failed or In-progress row is step-not-done", () => {
  for (const status of [
    "⏳ Pending",
    "❌ Failed",
    "🔄 In progress",
    "⏸️ Paused",
    "",
  ]) {
    const r = check(bugReport({ rows: { 3: { status, time: "" } } }));
    assert.equal(r.rc, 1, `status ${JSON.stringify(status)}\n${r.out}`);
    assert.deepEqual(
      ids(r),
      ["step-not-done"],
      `status ${JSON.stringify(status)}`,
    );
  }
});

// ── E ────────────────────────────────────────────────────────────────────────

test("E: a missing file is exit 2", () => {
  const r = run(["--report", path.join(TMP, "does-not-exist.md")]);
  assert.equal(r.rc, 2);
  assert.match(r.err, /cannot read/);
});

test("E: a directory, no --report, a flag with no value, an unknown flag are exit 2", () => {
  assert.equal(run(["--report", TMP]).rc, 2);
  assert.equal(run([]).rc, 2);
  assert.equal(run(["--report"]).rc, 2);
  assert.equal(run(["--report", REAL, "--bogus"]).rc, 2);
});

test("E: no Pipeline Progress heading, an empty heading, garbage and an empty file are exit 2 and name table-missing", () => {
  for (const text of [
    "# Implementation Report\n\nnothing here\n",
    "## Pipeline Progress\n\nno table\n\n## Next\n",
    "\u0000\u0001\u0002 not markdown ✅✅✅ \n| a | b |\n",
    "",
  ]) {
    const r = check(text);
    assert.equal(r.rc, 2, JSON.stringify(text) + "\n" + r.out);
    assert.notEqual(r.rc, 0);
  }
  assert.deepEqual(ids(check("# x\n")), ["table-missing"]);
  assert.deepEqual(ids(check("## Pipeline Progress\n\nno table\n")), [
    "table-missing",
  ]);
});

test("E: a table with no Status column is unparseable — exit 2", () => {
  const r = check(
    "## Pipeline Progress\n\n| Step | Notes |\n|---|---|\n| 1 | ✅ |\n",
  );
  assert.equal(r.rc, 2);
  assert.deepEqual(ids(r), ["table-unparseable"]);
});

// ── F ────────────────────────────────────────────────────────────────────────

test("F: a ✅ row with an empty Completed (UTC) cell is exit 1, step-time-missing", () => {
  for (const time of ["", "—"]) {
    const r = check(bugReport({ rows: { 4: { time } } }));
    assert.equal(r.rc, 1, r.out);
    assert.deepEqual(ids(r), ["step-time-missing"]);
    assert.match(r.out, /Step 4/);
  }
});

test("F: a not-done row without a time reports step-not-done only, not a second problem", () => {
  const r = check(
    bugReport({ rows: { 4: { status: "⏳ Pending", time: "" } } }),
  );
  assert.deepEqual(ids(r), ["step-not-done"]);
});

// ── G ────────────────────────────────────────────────────────────────────────

test("G: a pipeline step with no row is row-missing", () => {
  const r = check(bugReport({ rows: { 7: null } }));
  assert.equal(r.rc, 1);
  assert.deepEqual(ids(r), ["row-missing"]);
  assert.match(r.out, /Step 7/);
});

// ── H ────────────────────────────────────────────────────────────────────────

const WAIVER_ROW = {
  status: "⏭️ Skipped — `--skip review` (waived)",
  time: "",
};
const WAIVER_LOG =
  "- review-story skipped — `--skip review` (flag); waiver: review skipped, approved by Dev\n";

test("H: story/task Step 2 `--skip review` with a Decisions Log line is the one waiver — exit 0", () => {
  const r = check(storyReport({ rows: { 2: WAIVER_ROW }, extra: WAIVER_LOG }));
  assert.equal(r.rc, 0, r.out);
});

test("H: the waiver needs the Decisions Log line", () => {
  const r = check(storyReport({ rows: { 2: WAIVER_ROW } }));
  assert.equal(r.rc, 1);
});

test("H: the waiver covers Step 2 only", () => {
  const r = check(storyReport({ rows: { 3: WAIVER_ROW }, extra: WAIVER_LOG }));
  assert.equal(r.rc, 1);
  assert.match(r.out, /Step 3/);
});

test("H: the waiver needs the `--skip review` wording on the row", () => {
  const r = check(
    storyReport({
      rows: { 2: { status: "⏭️ Skipped", time: "" } },
      extra: WAIVER_LOG,
    }),
  );
  assert.equal(r.rc, 1);
});

test("H: the waiver needs a ⏭️ status (a Pending row naming the flag is not waived)", () => {
  const r = check(
    storyReport({
      rows: { 2: { status: "⏳ Pending", notes: "--skip review", time: "" } },
      extra: WAIVER_LOG,
    }),
  );
  assert.equal(r.rc, 1);
});

test("H: a bug report never qualifies — develop-bug refuses --skip", () => {
  const r = check(bugReport({ rows: { 2: WAIVER_ROW }, extra: WAIVER_LOG }));
  assert.equal(r.rc, 1);
});

// ── I ────────────────────────────────────────────────────────────────────────

test("I: a row with the wrong cell count is row-malformed", () => {
  const text = bugReport().replace(
    "| 3 | investigate-fix | ✅ Done |",
    "| 3 | investigate-fix | ✅ Done | extra | cell |",
  );
  const r = check(text);
  assert.equal(r.rc, 1);
  assert.ok(ids(r).includes("row-malformed"), r.out);
});

test("I: a pipe-table quoted inside a fence is not the table", () => {
  const fenced =
    "# Report\n\n```\n## Pipeline Progress\n\n| Step | Status | Completed (UTC) |\n|--|--|--|\n| 1 | ✅ | t |\n```\n";
  const r = check(fenced);
  assert.equal(r.rc, 2, "the fenced table must not count, so no table exists");
  const both =
    bugReport({ rows: { 3: { status: "⏳ Pending", time: "" } } }) + fenced;
  assert.equal(check(both).rc, 1);
});

test("I: a fenced example before or inside the real section does not shadow or poison the real table", () => {
  const example =
    "```\n## Pipeline Progress\n\n| Step | Status | Completed (UTC) |\n|--|--|--|\n| 1 | ⏳ Pending | |\n```\n\n";
  const real = bugReport();
  assert.equal(check(example + real).rc, 0, "fenced heading first");
  const inside = real.replace(
    "\n## Decisions Log",
    "\n```\n| 3 | investigate-fix | ⏳ Pending | | | |\n```\n\n## Decisions Log",
  );
  assert.equal(check(inside).rc, 0, "fenced row inside the section");
});

// ── J ────────────────────────────────────────────────────────────────────────

test("J: --json carries reason ok | incomplete | usage with exit 0 | 1 | 2", () => {
  const ok = check(bugReport(), ["--json"]);
  assert.equal(ok.rc, 0);
  assert.equal(JSON.parse(ok.out).reason, "ok");
  const bad = run(["--report", REAL, "--json"]);
  assert.equal(bad.rc, 1);
  const j = JSON.parse(bad.out);
  assert.equal(j.reason, "incomplete");
  assert.equal(j.problems[0].code, "step-not-done");
  const none = check("nothing\n", ["--json"]);
  assert.equal(none.rc, 2);
  assert.equal(JSON.parse(none.out).reason, "usage");
  assert.equal(run(["--json"]).rc, 2);
});

// ── K — the develop-next Step 3 snippet, executed ────────────────────────────
// The lookup lives in prose; this extracts the fenced block that calls the guard and runs it, so
// the report it picks (and the verdict it exits with) is behaviour, not a string in a document.

const SKILL = path.join(
  HERE,
  "..",
  "..",
  "..",
  "skills",
  "develop-next",
  "SKILL.md",
);
const SNIPPET = fs
  .readFileSync(SKILL, "utf8")
  .split("```bash\n")
  .map((b) => b.split(/\n\s*```/)[0]) // the block sits in a list item, so its closing fence is indented
  .find((b) => b.includes("pipeline-completeness.js"));

function lookup(itemDoc) {
  assert.ok(
    SNIPPET,
    "no bash block in develop-next SKILL.md calls pipeline-completeness.js",
  );
  const script = SNIPPET.replace(
    "<item.commandArg>",
    JSON.stringify(itemDoc),
  ).replace(
    "node .agents/skills/develop-next/references/pipeline-completeness.js",
    `echo "REPORT=$REPORT"; node ${JSON.stringify(CLI)}`,
  );
  const r = spawnSync("bash", ["-c", script], { encoding: "utf8" });
  return {
    rc: r.status,
    out: r.stdout + r.stderr,
    picked: /^REPORT=(.*)$/m.exec(r.stdout)?.[1],
  };
}

test("K: the snippet picks each item's own report — a task and its co-located bug, newest number, any shape", () => {
  const dir = fs.mkdtempSync(path.join(TMP, "item-"));
  const put = (name, text) => fs.writeFileSync(path.join(dir, name), text);
  const good = bugReport();
  const bad = bugReport({ rows: { 2: { status: "⏭️ Skipped", time: "" } } });
  put("task.67.slug.md", "doc");
  put("task.67.bug.3.slug.md", "doc");
  put("task.6.slug.md", "doc");
  put("task.67.implementation.2.first.md", bad); //                       task.67, older
  put("task.67.implementation.10.second.md", good); //                    task.67, newest (10 > 2)
  put("task.67.bug.3.implementation.20.fix.md", bad); //                   the bug's own report
  put("task.67.other.implementation.11.shape2.md", bad); //               `{prefix}.{slug}.implementation.N`, newest
  put("task.6.implementation.1.other-task.md", good);

  const task6 = lookup(path.join(dir, "task.6.slug.md"));
  assert.equal(
    path.basename(task6.picked),
    "task.6.implementation.1.other-task.md",
  );
  assert.equal(
    task6.rc,
    0,
    `task.6 must not read task.67's reports\n${task6.out}`,
  );

  const bug = lookup(path.join(dir, "task.67.bug.3.slug.md"));
  assert.equal(
    path.basename(bug.picked),
    "task.67.bug.3.implementation.20.fix.md",
  );
  assert.equal(
    bug.rc,
    1,
    "the bug's own incomplete report decides, not its parent task's complete one",
  );

  const task = lookup(path.join(dir, "task.67.slug.md"));
  assert.equal(
    path.basename(task.picked),
    "task.67.other.implementation.11.shape2.md",
  );
  assert.equal(task.rc, 1, "the task never reads its child bug's report");
});

test("K: no implementation report for the prefix is a HALT (exit 1)", () => {
  const dir = fs.mkdtempSync(path.join(TMP, "item-"));
  fs.writeFileSync(path.join(dir, "bug.5.slug.md"), "doc");
  fs.writeFileSync(path.join(dir, "bug.50.implementation.1.x.md"), bugReport());
  const r = lookup(path.join(dir, "bug.5.slug.md"));
  assert.equal(r.rc, 1);
  assert.match(r.out, /HALT: no implementation report for bug\.5/);
});
