/**
 * Layer-1 unit tests for the qa-next UAT tracker tool (skills/qa-next/scripts/uat-status.mjs).
 *
 * The pure functions are tested on an inline tracker; the CLI is exercised end-to-end against a
 * throwaway story corpus in a temp dir (init → next → set → accept → sync → check), because the
 * rules the tracker intro promises are only real if the CLI refuses what the intro says it refuses.
 *
 * Run via: node --test evals/qa-next/unit/uat-status.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOOL = path.resolve(
  __dirname,
  "../../../skills/qa-next/scripts/uat-status.mjs",
);
const { parseTracker, nextItem, checkTracker, scoreboard, STATES } =
  await import(TOOL);

const RUN = "[2026-09-21-lan-7.5](runs/2026-09-21-lan-7.5.md)";
const TRACKER = `
### A. Shell

| Story | Title | Verified by | UAT | Last run | Notes / bug |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [7.1](../prd/x.md) | Scaffolding |  | ${STATES.na} |  | infra only |
| [40.1](../prd/y.md) | Header | A.1 | ${STATES.untested} |  |  |

### D. Score

| Story | Title | Verified by | UAT | Last run | Notes / bug |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [7.5](../prd/z.md) | Plausibility | D.2.7 | ${STATES.accepted} | ${RUN} | accepted 2026-09-21 |
| [31.1](../prd/w.md) | Theater |  | ${STATES.fail} | ${RUN} | [bug.92.x](../bugs/bug.92.x.md) |
| [31.2](../prd/v.md) | Hover |  | ${STATES.blocked} |  | flag off in test env |
| [31.3](../prd/u.md) | Cards |  | ${STATES.untested} |  |  |
`;
const stories = ["7.1", "40.1", "7.5", "31.1", "31.2", "31.3"].map((id) => ({
  id,
  status: "accepted",
}));

test("parseTracker reads sections and rows, including linked ids", () => {
  const { sections } = parseTracker(TRACKER);
  assert.deepEqual(
    sections.map((s) => s.letter),
    ["A", "D"],
  );
  assert.deepEqual(
    sections[1].rows.map((r) => r.id),
    ["7.5", "31.1", "31.2", "31.3"],
  );
  assert.equal(sections[1].rows[0].run, RUN);
});

test("nextItem is the first ⬜ row in surface order; blocked and n/a are skipped", () => {
  assert.equal(nextItem(parseTracker(TRACKER)).id, "40.1");
  const aDone = TRACKER.replace(
    `| A.1 | ${STATES.untested} |  |  |`,
    `| A.1 | ${STATES.pass} | ${RUN} |  |`,
  );
  assert.equal(
    nextItem(parseTracker(aDone)).id,
    "31.3",
    "skips the ⏸ blocked 31.2",
  );
  assert.equal(
    nextItem(parseTracker(TRACKER.replaceAll(STATES.untested, STATES.na))),
    null,
  );
});

test("checkTracker: a clean tracker has no errors", () => {
  assert.deepEqual(checkTracker(parseTracker(TRACKER), stories).errors, []);
});

test("checkTracker flags a missing row, a duplicate, and a pass without a run link", () => {
  const t = parseTracker(
    TRACKER +
      `| [31.3](../prd/u.md) | Cards again |  | ${STATES.pass} |  |  |\n`,
  );
  const { errors } = checkTracker(t, [
    ...stories,
    { id: "99.1", status: "accepted" },
  ]);
  assert.ok(
    errors.some((e) => e.startsWith("99.1: accepted story has no tracker row")),
  );
  assert.ok(errors.some((e) => e.startsWith("31.3: duplicate row")));
  assert.ok(
    errors.some((e) => e.startsWith("31.3: pass requires a Last run link")),
  );
});

test("checkTracker: run/bug links must resolve (existence is injected)", () => {
  const { errors } = checkTracker(parseTracker(TRACKER), stories, () => false);
  assert.ok(
    errors.includes("7.5: run file not found: runs/2026-09-21-lan-7.5.md"),
  );
  assert.ok(errors.includes("31.1: bug file not found: ../bugs/bug.92.x.md"));
});

test("checkTracker warns on a row whose story is no longer accepted", () => {
  const { warns } = checkTracker(
    parseTracker(TRACKER),
    stories.map((s) => (s.id === "31.1" ? { ...s, status: "superseded" } : s)),
  );
  assert.ok(
    warns.some((w) => w.startsWith("31.1: story status is superseded")),
  );
});

test("checkTracker: fail without a bug link, and n/a or blocked without a note, are errors", () => {
  const t = parseTracker(
    TRACKER.replace("[bug.92.x](../bugs/bug.92.x.md)", "see later")
      .replace("infra only", "")
      .replace("flag off in test env", ""),
  );
  const { errors } = checkTracker(t, stories);
  assert.ok(errors.includes("31.1: fail requires a bug link in Notes"));
  assert.ok(errors.includes("7.1: na requires a note saying why"));
  assert.ok(errors.includes("31.2: blocked requires a note saying why"));
});

test("scoreboard counts per surface and in total", () => {
  const { counts, total } = scoreboard(parseTracker(TRACKER));
  assert.equal(counts.A.na, 1);
  assert.equal(counts.A.untested, 1);
  assert.deepEqual(
    [counts.D.accepted, counts.D.fail, counts.D.blocked, counts.D.untested],
    [1, 1, 1, 1],
  );
  assert.equal(total.rows, 6);
});

// ---------- CLI end-to-end on a throwaway corpus ----------

function corpus() {
  const root = mkdtempSync(path.join(os.tmpdir(), "qa-next-"));
  const story = (prd, epic, n, status, extra = "") => {
    const dir = path.join(
      root,
      "docs/prd",
      prd,
      "epics",
      `epic.${epic}.e`,
      "stories",
      `story.${epic}.${n}.s`,
    );
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, `story.${epic}.${n}.s.md`),
      `---\ntitle: "Story ${epic}.${n}"\nstatus: ${status}\n${extra}---\n`,
    );
    // a sidecar that must NOT be read as a story
    writeFileSync(
      path.join(dir, `story.${epic}.${n}.qa.1.s.md`),
      `---\ntitle: sidecar\nstatus: accepted\n---\n`,
    );
  };
  story("prd.live", 7, 1, "accepted", "story_type: infra\n");
  story("prd.live", 7, 5, "accepted");
  story("prd.live", 31, 1, "accepted");
  story("prd.live", 31, 9, "draft");
  story("prd.legacy", 1, 1, "accepted");
  mkdirSync(path.join(root, "docs/qa"), { recursive: true });
  writeFileSync(
    path.join(root, "docs/qa/uat-surfaces.json"),
    JSON.stringify({
      excludedPrds: ["prd.legacy"],
      defaultSurface: "Z",
      surfaces: [
        { letter: "A", title: "Shell" },
        { letter: "D", title: "Score" },
        { letter: "Z", title: "Unmapped" },
      ],
      epicSurface: { 7: "D", 31: "D" },
      storySurface: { 7.1: "A" },
    }),
  );
  return root;
}

function run(root, ...args) {
  try {
    return {
      code: 0,
      out: execFileSync("node", [TOOL, "--root", root, ...args], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    };
  } catch (e) {
    return { code: e.status, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

test("CLI: init builds one row per accepted, non-excluded, canonical story; links are tracker-relative", () => {
  const root = corpus();
  assert.equal(run(root, "--init").code, 0);
  const text = readFileSync(path.join(root, "docs/qa/uat-tracker.md"), "utf8");
  const ids = [...text.matchAll(/^\| \[([0-9.]+)\]\(([^)]+)\)/gm)].map((m) => [
    m[1],
    m[2],
  ]);
  assert.deepEqual(
    ids.map((x) => x[0]),
    ["7.1", "7.5", "31.1"],
    "draft 31.9, legacy 1.1 and the sidecar are excluded",
  );
  assert.equal(
    ids[0][1],
    "../prd/prd.live/epics/epic.7.e/stories/story.7.1.s/story.7.1.s.md",
  );
  assert.ok(existsSync(path.join(root, "docs/qa/runs")), "runs/ is created");
  assert.equal(
    run(root, "--init").code,
    2,
    "refuses to overwrite without --force",
  );
});

test("CLI: next → set pass → accept; the refusals the tracker intro promises are real", () => {
  const root = corpus();
  run(root, "--init");
  const next = JSON.parse(run(root, "--next", "--json").out);
  assert.equal(next.id, "7.1");
  assert.equal(next.storyType, "infra");
  assert.equal(
    run(root, "--accept", "7.1").code,
    2,
    "cannot accept an untested row",
  );
  assert.equal(run(root, "--set", "7.1", "na").code, 2, "n/a needs a note");
  assert.equal(run(root, "--set", "7.1", "na", "--note", "infra only").code, 0);
  assert.equal(
    JSON.parse(run(root, "--next", "--json").out).id,
    "7.5",
    "n/a is skipped",
  );
  assert.equal(run(root, "--set", "7.5", "pass").code, 2, "pass needs --run");
  assert.equal(run(root, "--set", "7.5", "pass", "--run", "runs/r.md").code, 0);
  assert.equal(run(root, "--check").code, 1, "run file does not exist yet");
  writeFileSync(path.join(root, "docs/qa/runs/r.md"), "# run\n");
  assert.equal(run(root, "--check").code, 0);
  assert.equal(run(root, "--verified", "7.5", "D.2.7, D.2.8").code, 0);
  assert.equal(run(root, "--accept", "7.5", "--note", "looks right").code, 0);
  assert.equal(
    run(root, "--set", "31.1", "fail", "--run", "runs/r.md").code,
    2,
    "fail needs --bug",
  );
  mkdirSync(path.join(root, "docs/bugs"), { recursive: true });
  writeFileSync(path.join(root, "docs/bugs/bug.1.x.md"), "# bug\n");
  assert.equal(
    run(
      root,
      "--set",
      "31.1",
      "fail",
      "--run",
      "runs/r.md",
      "--bug",
      "docs/bugs/bug.1.x.md",
    ).code,
    0,
  );
  assert.equal(run(root, "--check").code, 0);
  const text = readFileSync(path.join(root, "docs/qa/uat-tracker.md"), "utf8");
  assert.match(
    text,
    /\| \[7\.5\]\([^)]+\) \| Story 7\.5 \| D\.2\.7, D\.2\.8 \| ✅ accepted \| \[r\]\(runs\/r\.md\) \| accepted \d{4}-\d{2}-\d{2} — looks right \|/,
  );
  assert.match(
    text,
    /\| ❌ fail \| \[r\]\(runs\/r\.md\) \| \[bug\.1\.x\]\(\.\.\/bugs\/bug\.1\.x\.md\) \|/,
  );
  assert.equal(run(root, "--next").code, 3, "nothing untested left");
});

test("CLI: sync appends a newly accepted story to its section without touching other rows", () => {
  const root = corpus();
  run(root, "--init");
  run(root, "--set", "7.5", "pass", "--run", "runs/r.md");
  const before = readFileSync(
    path.join(root, "docs/qa/uat-tracker.md"),
    "utf8",
  );
  assert.equal(
    run(root, "--check").code,
    1,
    "drift is not the only thing check reports — the run file is missing",
  );
  const dir = path.join(
    root,
    "docs/prd/prd.live/epics/epic.31.e/stories/story.31.9.s",
  );
  writeFileSync(
    path.join(dir, "story.31.9.s.md"),
    '---\ntitle: "Story 31.9"\nstatus: accepted\n---\n',
  );
  const { code, out } = run(root, "--sync");
  assert.equal(code, 0);
  assert.match(out, /added 1 row\(s\): 31\.9/);
  const after = readFileSync(path.join(root, "docs/qa/uat-tracker.md"), "utf8");
  assert.ok(
    after.includes(before.split("\n").find((l) => l.startsWith("| [7.5]"))),
    "the 7.5 row is byte-identical",
  );
  assert.match(
    after,
    /\| \[31\.1\][^\n]*\n\| \[31\.9\]\([^)]+\) \| Story 31\.9 \|  \| ⬜ untested \|  \|  \|\n/,
  );
  assert.equal(
    run(root, "--sync").out.trim(),
    "tracker in sync — nothing to add",
  );
});

test("CLI: a missing surfaces file is scaffolded from the template and the run stops", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "qa-next-"));
  mkdirSync(path.join(root, "docs/prd"), { recursive: true });
  const { code, out } = run(root, "--init");
  assert.equal(code, 2);
  assert.match(out, /a template was written there/);
  assert.ok(existsSync(path.join(root, "docs/qa/uat-surfaces.json")));
});
