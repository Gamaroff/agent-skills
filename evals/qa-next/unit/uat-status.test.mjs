/**
 * Layer-1 unit tests for the qa-next UAT registry tool (skills/qa-next/scripts/uat-status.mjs).
 *
 * The pure functions are tested on an inline registry; the CLI is exercised end-to-end against a
 * throwaway story corpus in a temp dir (init → author rows → coverage → next → set → accept → check),
 * because the rules the registry intro promises are only real if the CLI refuses what the intro
 * says it refuses.
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
const {
  parseRegistry,
  nextItem,
  checkRegistry,
  checkCoverage,
  scoreboard,
  storyIds,
  specPaths,
  parseFindings,
  checkFindings,
  isOpenFinding,
  listRunFiles,
  itemById,
  runPathFor,
  STATES,
  COLUMNS,
} = await import(TOOL);

const HEAD = `| # | Function | What it does | Entry | Stories | Items | Automated by | UAT | Last run | Notes / bug |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |`;
const RUN = "[2026-09-21-lan](runs/D.2/2026-09-21-lan.md)";
const REGISTRY = `
### A. Shell

${HEAD}
| A.1 | Open the site signed out | A visitor lands on Home. | / | 7.1 · 40.1 | A.1.1–A.1.3 | apps/portal/e2e/smoke/catalog.smoke.spec.ts | ${STATES.untested} |  |  |
| A.2 | Use the account menu | A signed-in user opens the menu. | / | [40.6](../prd/s.md) |  | manual only | ${STATES.na} |  | menu is chrome, accepted with A.1 |

### D. Score

${HEAD}
| D.1 | Play a game | A visitor plays in the sandboxed iframe. | /games/:slug | 7.5 | D.1.1–D.1.5 | apps/portal/e2e/smoke/play-score.smoke.spec.ts · apps/portal/src/x.spec.ts | ${STATES.accepted} | ${RUN} | accepted 2026-09-21 |
| D.2 | Submit a score | A game posts SCORE_SUBMIT. | /games/:slug | 7.5 · 31.1 | D.2.1–D.2.9 | \`apps/portal/e2e/smoke/play-score.smoke.spec.ts\` | ${STATES.fail} | ${RUN} | [bug.92.x](../bugs/bug.92.x.md) |
| D.3 | Theater mode | A player expands the frame. | /games/:slug | 31.2 |  |  | ${STATES.blocked} |  | flag off in test env |
| D.4 | See the leaderboard | A visitor reads the rail. | /games/:slug | 31.3 |  |  | ${STATES.untested} |  |  |
`;
const cfg = { storyNa: {}, uatSpecPattern: "^apps/portal/e2e/(smoke|uat)/" };
const story = (id, status = "accepted", surface = "D") => ({
  id,
  title: `Story ${id}`,
  path: `docs/prd/p/story.${id}.md`,
  status,
  surface,
});
const stories = ["7.1", "40.1", "40.6", "7.5", "31.1", "31.2", "31.3"].map(
  (id) => story(id),
);

test("parseRegistry is header-driven: cells are keyed by column name, the separator is skipped", () => {
  const { sections } = parseRegistry(REGISTRY);
  assert.deepEqual(
    sections.map((s) => s.letter),
    ["A", "D"],
  );
  assert.deepEqual(sections[0].columns, COLUMNS);
  assert.deepEqual(
    sections[1].rows.map((r) => r.id),
    ["D.1", "D.2", "D.3", "D.4"],
  );
  const d2 = sections[1].rows[1];
  assert.equal(d2.title, "Submit a score");
  assert.equal(d2.cells.Entry, "/games/:slug");
  assert.equal(d2.state, STATES.fail);
  assert.equal(d2.run, RUN);
  assert.equal(d2.cellCount, 10);
  // reordered + extra column still parses by name
  const reordered = parseRegistry(`### Z. Any

| UAT | # | Owner | Last run | Notes / bug |
| :--- | :--- | :--- | :--- | :--- |
| ${STATES.untested} | Z.1 | me |  |  |
`);
  const z = reordered.sections[0].rows[0];
  assert.equal(z.id, "Z.1");
  assert.equal(z.state, STATES.untested);
  assert.equal(z.cells.Owner, "me");
});

test("storyIds and specPaths read their cells", () => {
  assert.deepEqual(storyIds("[7.5](../x.md) · 31.1 · 7.5"), ["7.5", "31.1"]);
  assert.deepEqual(storyIds(""), []);
  assert.deepEqual(
    specPaths("`apps/portal/e2e/smoke/a.spec.ts` · apps/portal/src/b.spec.ts"),
    ["apps/portal/e2e/smoke/a.spec.ts", "apps/portal/src/b.spec.ts"],
  );
  assert.deepEqual(specPaths("manual only"), []);
});

test("nextItem is the first ⬜ row in file order; blocked and n/a are skipped", () => {
  assert.equal(nextItem(parseRegistry(REGISTRY)).id, "A.1");
  const aDone = REGISTRY.replace(
    `| ${STATES.untested} |  |  |\n| A.2`,
    `| ${STATES.pass} | ${RUN} |  |\n| A.2`,
  );
  assert.equal(nextItem(parseRegistry(aDone)).id, "D.4", "skips ⏸ D.3");
  assert.equal(
    nextItem(parseRegistry(REGISTRY.replaceAll(STATES.untested, STATES.na))),
    null,
  );
});

test("checkRegistry: a clean registry has no errors and no warnings", () => {
  assert.deepEqual(checkRegistry(parseRegistry(REGISTRY), stories, cfg), {
    errors: [],
    warns: [],
  });
});

test("checkRegistry flags duplicate, wrong-section, ragged and malformed rows and a missing required column", () => {
  const t = parseRegistry(
    REGISTRY +
      `| D.4 | again | x | / |  |  |  | ${STATES.untested} |  |  |
| E.9 | wrong letter | x | / |  |  |  | ${STATES.untested} |  |  |
| D.5 | ragged | x | / |  |  | ${STATES.untested} |  |  |
| not-an-id | x | x | / |  |  |  | ${STATES.untested} |  |  |

### F. Bad header

| # | Function | Last run | Notes / bug |
| :--- | :--- | :--- | :--- |
| F.1 | no UAT column |  |  |
`,
  );
  const { errors } = checkRegistry(t, stories, cfg);
  assert.ok(errors.some((e) => e.startsWith("D.4: duplicate row")));
  assert.ok(errors.includes("E.9: row is under surface D"));
  assert.ok(errors.includes("D.5: 9 cells, header has 10"));
  assert.ok(
    errors.some((e) => e.startsWith('D: malformed row id "not-an-id"')),
  );
  assert.ok(errors.includes('F: header lacks the "UAT" column'));
});

test("checkRegistry: state rules — pass/fail/accepted need a run, fail needs a bug, na/blocked need a note; links must resolve", () => {
  const t = parseRegistry(
    REGISTRY.replace("[bug.92.x](../bugs/bug.92.x.md)", "see later")
      .replace("menu is chrome, accepted with A.1", "")
      .replace("flag off in test env", "")
      .replace(
        `| ${STATES.untested} |  |  |\n| A.2`,
        `| ${STATES.pass} |  |  |\n| A.2`,
      ),
  );
  const { errors } = checkRegistry(t, stories, cfg);
  assert.ok(errors.includes("A.1: pass requires a Last run link"));
  assert.ok(errors.includes("D.2: fail requires a bug link in Notes"));
  assert.ok(errors.includes("A.2: na requires a note saying why"));
  assert.ok(errors.includes("D.3: blocked requires a note saying why"));
  const missing = checkRegistry(
    parseRegistry(REGISTRY),
    stories,
    cfg,
    () => false,
  ).errors;
  assert.ok(
    missing.includes("D.1: run file not found: runs/D.2/2026-09-21-lan.md"),
  );
  assert.ok(missing.includes("D.2: bug file not found: ../bugs/bug.92.x.md"));
});

test("checkRegistry: Stories must name real stories; non-accepted ones and uncovered accepted ones warn", () => {
  const t = parseRegistry(REGISTRY.replace("| 7.5 · 31.1 |", "| 7.5 · 99.9 |"));
  const { errors, warns } = checkRegistry(
    t,
    [
      ...stories.map((s) => (s.id === "31.3" ? { ...s, status: "draft" } : s)),
      story("50.1"),
    ],
    cfg,
  );
  assert.ok(errors.includes("D.2: Stories names 99.9, which is not a story"));
  assert.ok(warns.includes("D.4: story 31.3 is draft, not accepted"));
  assert.ok(
    warns.includes(
      "50.1: accepted story is covered by no function — --coverage",
    ),
  );
  assert.ok(
    warns.includes(
      "31.1: accepted story is covered by no function — --coverage",
    ),
    "31.1 lost its only reference when D.2 was edited",
  );
});

test("checkCoverage: unmapped carries a suggested surface; storyNa and non-accepted are excluded; unknown ids listed", () => {
  const c = checkCoverage(
    parseRegistry(REGISTRY.replace("| 7.5 · 31.1 |", "| 7.5 · 99.9 |")),
    [...stories, story("50.1", "accepted", "F"), story("50.2", "draft", "F")],
    { ...cfg, storyNa: { 31.1: "renamed away" } },
  );
  assert.deepEqual(
    c.unmapped.map((s) => [s.id, s.suggestedSurface]),
    [["50.1", "F"]],
    "31.1 is n/a, 50.2 is not accepted",
  );
  assert.deepEqual(c.unknown, ["99.9"]);
  assert.deepEqual(c.na, [{ id: "31.1", note: "renamed away" }]);
  assert.deepEqual(c.notAccepted, []);
});

test("scoreboard counts per surface and in total", () => {
  const { counts, total } = scoreboard(parseRegistry(REGISTRY));
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
      storyNa: { 7.1: "monorepo scaffolding — nothing observable" },
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

const REG = (root) => path.join(root, "docs/qa/uat-registry.md");
// Rows go under their own section: after the separator row that follows `### <letter>.`.
function addRows(root, letter, rows) {
  const lines = readFileSync(REG(root), "utf8").split("\n");
  const head = lines.findIndex((l) => l.startsWith(`### ${letter}. `));
  const sep = lines.findIndex((l, i) => i > head && /^\| :---/.test(l));
  lines.splice(sep + 1, 0, ...rows.trimEnd().split("\n"));
  writeFileSync(REG(root), lines.join("\n"));
}
const D_ROWS = `| D.1 | Play a game | A visitor plays. | /games/:slug | 7.5 |  | apps/portal/e2e/smoke/play-score.smoke.spec.ts · apps/portal/src/x.spec.ts | ⬜ untested |  |  |
| D.2 | Submit a score | A game posts a score. | /games/:slug | 7.5 · 31.1 | D.2.1–D.2.3, S2 |  | ⬜ untested |  |  |
`;

test("CLI: init writes an empty skeleton per surface and refuses to overwrite; rows are authored by hand", () => {
  const root = corpus();
  const { code, out } = run(root, "--init");
  assert.equal(code, 0);
  assert.match(out, /3 empty surface sections/);
  const text = readFileSync(REG(root), "utf8");
  assert.match(
    text,
    /^### A\. Shell\n\n\| # \| Function \| What it does \| Entry \| Stories \| Items \| Automated by \| UAT \| Last run \| Notes \/ bug \|\n\| :--- /m,
  );
  assert.equal((text.match(/^### /gm) ?? []).length, 3);
  assert.ok(existsSync(path.join(root, "docs/qa/runs")), "runs/ is created");
  assert.equal(
    run(root, "--init").code,
    2,
    "refuses to overwrite without --force",
  );
  assert.equal(run(root, "--sync").code, 2, "--sync no longer exists");
  assert.match(run(root, "--sync").out, /unknown option --sync/);
  assert.equal(
    run(root, "--next").code,
    3,
    "an empty registry has nothing untested",
  );
});

test("CLI: coverage names accepted stories no function covers, honouring storyNa and excluded PRDs", () => {
  const root = corpus();
  run(root, "--init");
  let { code, out } = run(root, "--coverage");
  assert.equal(code, 0);
  assert.match(out, /^unmapped {3}7\.5 {2}Story 7\.5 {2}→ surface D$/m);
  assert.match(out, /^unmapped {3}31\.1 /m);
  assert.doesNotMatch(
    out,
    /^unmapped +(7\.1|1\.1|31\.9) /m,
    "n/a, excluded and draft stories are not unmapped",
  );
  assert.match(
    out,
    /^coverage: 2 accepted stories covered by no function · 1 n\/a · 0 referenced but not accepted · 0 unknown$/m,
  );
  addRows(root, "D", D_ROWS);
  ({ code, out } = run(root, "--coverage", "--json"));
  assert.equal(code, 0);
  assert.deepEqual(JSON.parse(out).unmapped, []);
  assert.match(run(root).out, /^next: D\.1 — Play a game \(D\)$/m);
  assert.doesNotMatch(
    run(root).out,
    /^stories:/m,
    "scoreboard is silent when everything is covered",
  );
});

test("CLI: next resolves stories, filters UAT-lane specs and finds the checklists that hold the items", () => {
  const root = corpus();
  run(root, "--init");
  addRows(root, "D", D_ROWS);
  writeFileSync(
    path.join(root, "docs/qa/qa.d.score.md"),
    "# D\n\n## D.2 — Submit a score\n\n### D.2.1 Happy path\n\n- x\n",
  );
  writeFileSync(
    path.join(root, "docs/qa/qa.smoke.core.md"),
    "# S\n\n### S2 — Log in\n\n- x\n\n### S20 — other\n",
  );
  writeFileSync(
    path.join(root, "docs/qa/qa.a.shell.md"),
    "# A\n\n### A.1.1 Landing\n",
  );
  const d1 = JSON.parse(run(root, "--next", "--json").out);
  assert.equal(d1.id, "D.1");
  assert.equal(d1.function, "Play a game");
  assert.deepEqual(d1.stories, [
    {
      id: "7.5",
      title: "Story 7.5",
      path: "docs/prd/prd.live/epics/epic.7.e/stories/story.7.5.s/story.7.5.s.md",
      storyType: "",
    },
  ]);
  assert.deepEqual(d1.automatedBy, [
    "apps/portal/e2e/smoke/play-score.smoke.spec.ts",
    "apps/portal/src/x.spec.ts",
  ]);
  assert.deepEqual(
    d1.uatSpecs,
    ["apps/portal/e2e/smoke/play-score.smoke.spec.ts"],
    "only the UAT lane counts as lane evidence",
  );
  assert.deepEqual(d1.checklists, [], "D.1 has no items yet");
  run(root, "--set", "D.1", "na", "--note", "folded into D.2");
  const d2 = JSON.parse(run(root, "--next", "--json").out);
  assert.equal(d2.id, "D.2");
  assert.deepEqual(
    d2.stories.map((s) => s.id),
    ["7.5", "31.1"],
  );
  assert.deepEqual(d2.uatSpecs, []);
  assert.deepEqual(
    d2.checklists,
    ["docs/qa/qa.d.score.md", "docs/qa/qa.smoke.core.md"],
    "by function heading and by the S2 item; S20 is not S2",
  );
  const text = run(root, "--next").out;
  assert.match(text, /^next: D\.2 — Submit a score$/m);
  assert.match(
    text,
    /^ {2}checklists: docs\/qa\/qa\.d\.score\.md, docs\/qa\/qa\.smoke\.core\.md$/m,
  );
});

test("CLI: set → items → automated → accept round-trip; refusals are real; untouched rows are byte-identical", () => {
  const root = corpus();
  run(root, "--init");
  addRows(root, "D", D_ROWS);
  const d1Before = readFileSync(REG(root), "utf8")
    .split("\n")
    .find((l) => l.startsWith("| D.1 |"));
  assert.equal(
    run(root, "--accept", "D.2").code,
    2,
    "cannot accept an untested row",
  );
  assert.equal(run(root, "--set", "D.2", "na").code, 2, "n/a needs a note");
  assert.equal(run(root, "--set", "D.2", "pass").code, 2, "pass needs --run");
  assert.equal(
    run(root, "--set", "D.2", "fail", "--run", "runs/D.2/r.md").code,
    2,
    "fail needs --bug",
  );
  assert.equal(run(root, "--items", "D.2").code, 2, "--items needs a value");
  assert.equal(run(root, "--items", "D.2", "D.2.1–D.2.9").code, 0);
  assert.equal(
    run(root, "--automated", "D.2", "apps/portal/e2e/uat/D.2.uat.spec.ts").code,
    0,
  );
  assert.equal(
    run(root, "--set", "D.2", "pass", "--run", "runs/D.2/r.md").code,
    0,
  );
  assert.equal(run(root, "--check").code, 1, "run file does not exist yet");
  mkdirSync(path.join(root, "docs/qa/runs/D.2"), { recursive: true });
  writeFileSync(path.join(root, "docs/qa/runs/D.2/r.md"), "# run\n");
  assert.equal(run(root, "--check").code, 0, "a nested Last run link resolves");
  assert.equal(
    readFileSync(REG(root), "utf8")
      .split("\n")
      .find((l) => l.startsWith("| D.1 |")),
    d1Before,
    "the D.1 row is byte-identical after four writes to D.2",
  );
  assert.equal(run(root, "--accept", "D.2", "--note", "looks right").code, 0);
  mkdirSync(path.join(root, "docs/bugs"), { recursive: true });
  writeFileSync(path.join(root, "docs/bugs/bug.1.x.md"), "# bug\n");
  assert.equal(
    run(
      root,
      "--set",
      "D.1",
      "fail",
      "--run",
      "runs/D.2/r.md",
      "--bug",
      "docs/bugs/bug.1.x.md",
    ).code,
    0,
  );
  assert.equal(run(root, "--check").code, 0);
  const text = readFileSync(REG(root), "utf8");
  assert.match(
    text,
    /^\| D\.2 \| Submit a score \| A game posts a score\. \| \/games\/:slug \| 7\.5 · 31\.1 \| D\.2\.1–D\.2\.9 \| apps\/portal\/e2e\/uat\/D\.2\.uat\.spec\.ts \| ✅ accepted \| \[r\]\(runs\/D\.2\/r\.md\) \| accepted \d{4}-\d{2}-\d{2} — looks right \|$/m,
  );
  assert.match(
    text,
    /^\| D\.1 \|.*\| ❌ fail \| \[r\]\(runs\/D\.2\/r\.md\) \| \[bug\.1\.x\]\(\.\.\/bugs\/bug\.1\.x\.md\) \|$/m,
  );
  assert.equal(run(root, "--next").code, 3, "nothing untested left");
  assert.equal(run(root, "--next", "--json").out.trim(), "null");
});

test("CLI: check reports a ragged hand-edited row and a Stories id with no story file", () => {
  const root = corpus();
  run(root, "--init");
  addRows(
    root,
    "D",
    "| D.1 | Play | x | / | 7.5 · 8.8 |  | ⬜ untested |  |  |\n",
  );
  const { code, out } = run(root, "--check");
  assert.equal(code, 1);
  assert.match(out, /\[ERROR\] D\.1: 9 cells, header has 10/);
  assert.match(out, /\[ERROR\] D\.1: Stories names 8\.8, which is not a story/);
  assert.match(
    out,
    /\[warn \] 31\.1: accepted story is covered by no function/,
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

// ---------- findings ----------

const RUN_FILE = `# UAT run — D.2

## Items

### D.2.1 Score

- **Result:** pass

## Verdict

All items passed.

## Findings

Prose before the table is ignored, as are the header and separator rows.

| # | Where | What was observed | Severity | Filed as |
| :--- | :--- | :--- | :--- | :--- |
| 1 | /health | body has no redis field | Minor | note |
| 2 | /u/nobody | 500 instead of 404 | Major | [bug.3.x](../../bugs/bug.3.x/bug.3.x.md) |

## After

| 9 | not | a finding | Trivial | note |
`;

test("parseFindings reads only the Findings table; a link becomes bug, anything else is a note", () => {
  const f = parseFindings(RUN_FILE);
  assert.deepEqual(
    f.map((x) => [x.n, x.where, x.severity, x.bug]),
    [
      [1, "/health", "Minor", null],
      [2, "/u/nobody", "Major", "../../bugs/bug.3.x/bug.3.x.md"],
    ],
    "the row under a later heading is not a finding",
  );
  assert.equal(f[0].what, "body has no redis field");
  assert.deepEqual(parseFindings("# run\n\n## Findings\n\n_None._\n"), []);
  assert.deepEqual(parseFindings("# run\n\n## Verdict\n\nok\n"), []);
});

test("checkFindings names a finding whose bug link does not resolve; open = note or non-closed bug", () => {
  const rows = [
    { run: "runs/a.md", n: 1, bug: null, bugStatus: null },
    { run: "runs/a.md", n: 2, bug: "../../bugs/b.md", bugStatus: "missing" },
    { run: "runs/b.md", n: 1, bug: "../../bugs/c.md", bugStatus: "closed" },
    { run: "runs/b.md", n: 2, bug: "../../bugs/d.md", bugStatus: "new" },
  ];
  assert.deepEqual(checkFindings(rows), [
    "runs/a.md finding 2: bug file not found: ../../bugs/b.md",
  ]);
  assert.deepEqual(rows.map(isOpenFinding), [true, true, false, true]);
});

test("CLI: --findings walks runs/<id>/ recursively, oldest first across directories; --check fails on a dangling bug link", () => {
  const root = corpus();
  run(root, "--init");
  const runs = path.join(root, "docs/qa/runs");
  mkdirSync(path.join(root, "docs/bugs"), { recursive: true });
  writeFileSync(
    path.join(root, "docs/bugs/bug.1.closed.md"),
    "---\ntype: bug\nstatus: closed\n---\n",
  );
  writeFileSync(
    path.join(root, "docs/bugs/bug.2.open.md"),
    "---\ntype: bug\nstatus: new\n---\n",
  );
  const table = (rows) =>
    `# run\n\n## Findings\n\n| # | Where | What was observed | Severity | Filed as |\n| :--- | :--- | :--- | :--- | :--- |\n${rows.join("\n")}\n`;
  // D.2 is written first and sorts first by directory; the walk must still order by date.
  mkdirSync(path.join(runs, "D.2"), { recursive: true });
  mkdirSync(path.join(runs, "A.1"), { recursive: true });
  writeFileSync(
    path.join(runs, "D.2/2026-09-22-lan.md"),
    table([
      "| 1 | /play | toast fires twice | Minor | [bug.2.open](../../../bugs/bug.2.open.md) |",
    ]),
  );
  writeFileSync(
    path.join(runs, "A.1/2026-09-21-lan.md"),
    table([
      "| 1 | /health | no redis field | Minor | note |",
      "| 2 | /u/x | 500 | Major | [bug.1.closed](../../../bugs/bug.1.closed.md) |",
    ]),
  );
  writeFileSync(path.join(runs, "A.1/notes.txt"), "not a run file");
  writeFileSync(
    path.join(runs, "README.md"),
    "# runs\n\nno Findings section here\n",
  );
  assert.deepEqual(
    listRunFiles(runs),
    [
      "runs/A.1/2026-09-21-lan.md",
      "runs/D.2/2026-09-22-lan.md",
      "runs/README.md",
    ],
    "every .md at any depth, ordered by file name (date) before directory",
  );

  const open = JSON.parse(run(root, "--findings", "--json").out);
  assert.deepEqual(
    open.map((f) => [f.run, f.n, f.bugStatus]),
    [
      ["runs/A.1/2026-09-21-lan.md", 1, null],
      ["runs/D.2/2026-09-22-lan.md", 1, "new"],
    ],
    "the closed bug's finding is not open; runs are oldest first across directories",
  );
  assert.equal(
    JSON.parse(run(root, "--findings", "--all", "--json").out).length,
    3,
  );
  const text = run(root, "--findings").out;
  assert.match(
    text,
    /^runs\/A\.1\/2026-09-21-lan\.md\n {3}1 {2}Minor {4}\/health — no redis field {2}\[note\]$/m,
  );
  assert.match(text, /\[bug\.2\.open \(new\)\]/);
  assert.match(
    text,
    /^findings: 2 open \(1 unfiled, 1 in open bugs\) · 1 closed — --all to include them$/m,
  );
  assert.match(
    run(root).out,
    /^findings: 2 open — --findings to list them$/m,
    "the scoreboard surfaces the count",
  );
  assert.equal(run(root, "--check").code, 0, "no rows, links resolve");

  mkdirSync(path.join(runs, "D.3"), { recursive: true });
  writeFileSync(
    path.join(runs, "D.3/2026-09-23-lan.md"),
    table([
      "| 1 | /x | gone | Trivial | [bug.9.gone](../../../bugs/bug.9.gone.md) |",
    ]),
  );
  const check = run(root, "--check");
  assert.equal(check.code, 1);
  assert.match(
    check.out,
    /\[ERROR\] runs\/D\.3\/2026-09-23-lan\.md finding 1: bug file not found: \.\.\/\.\.\/\.\.\/bugs\/bug\.9\.gone\.md/,
  );
});

// ---------- task 141: targeting one named row, and re-running it ----------

test("itemById resolves any row whatever its state, attaching the section title; unknown ids are null", () => {
  const reg = parseRegistry(REGISTRY);
  assert.equal(itemById(reg, "D.3").title, "Theater mode");
  assert.equal(
    itemById(reg, "D.3").surfaceTitle,
    "Score",
    "the section carries the title, the row does not",
  );
  assert.equal(
    itemById(reg, "D.1").state,
    STATES.accepted,
    "a ✅ row resolves — the selector would never reach it",
  );
  assert.equal(itemById(reg, "Z.9"), null);
});

test("runPathFor: the day's first run is unsuffixed, then -02 … -10, zero-padded", () => {
  assert.equal(runPathFor([], "2026-09-22", "lan"), "2026-09-22-lan.md");
  const files = [];
  for (let i = 0; i < 10; i++)
    files.push(runPathFor(files, "2026-09-22", "lan"));
  assert.deepEqual(files.slice(0, 3), [
    "2026-09-22-lan.md",
    "2026-09-22-lan-02.md",
    "2026-09-22-lan-03.md",
  ]);
  assert.equal(
    files[9],
    "2026-09-22-lan-10.md",
    "padded, so -10 sorts after -02",
  );
  assert.equal(new Set(files).size, 10, "every path is distinct");
  assert.equal(
    runPathFor(["2026-09-22-lan.md"], "2026-09-22", "ci"),
    "2026-09-22-ci.md",
    "a different env label is a different sequence",
  );
  assert.equal(
    runPathFor(["runs/D.2/2026-09-22-lan.md"], "2026-09-22", "lan"),
    "2026-09-22-lan-02.md",
    "existing entries are compared by basename, so full paths work too",
  );
  // An env label ending in -NN would be indistinguishable from a run sequence, so seqKey would
  // sort run 1 last again — the inversion the sort key exists to remove. Refused at write time,
  // because at read time nothing knows the env.
  assert.throws(
    () => runPathFor([], "2026-09-22", "ci-02"),
    /may not end in -NN/,
    "an ambiguous env label is refused rather than written",
  );
  assert.equal(
    runPathFor([], "2026-09-22", "ci-2"),
    "2026-09-22-ci-2.md",
    "one digit is not a sequence — only the two-digit form is ambiguous",
  );
});

test("CLI: --run-path refuses an env label that would be read as a run sequence", () => {
  const root = corpus();
  run(root, "--init");
  addRows(root, "D", D_ROWS);
  const { code, out } = run(root, "--run-path", "D.2", "--env", "ci-02");
  assert.equal(code, 2, "a usage error, not a written file");
  assert.match(out, /an env label may not end in -NN/);
  // A refusal that has already created the directory is a refusal the caller cannot trust — and
  // asserting the exit code alone would not have noticed: the first version of this fix validated
  // AFTER mkdirSync and passed every assertion above.
  assert.equal(
    existsSync(path.join(root, "docs/qa/runs/D.2")),
    false,
    "a refused --run-path writes nothing at all",
  );
  assert.equal(
    run(root, "--run-path", "D.2", "--env", "ci").code,
    0,
    "the ordinary label is unaffected",
  );
});

test("listRunFiles puts the day's unsuffixed first run BEFORE its sequenced re-runs", () => {
  // The assertion the whole sequencing scheme rests on. A plain basename sort fails it: "." sorts
  // after "-", so ["…-lan.md","…-lan-02.md"].sort() yields ["…-lan-02.md","…-lan.md"] and the
  // day's FIRST run reads as its last. The ordering test above at "CLI: --findings walks runs/…"
  // uses two DIFFERENT dates and passes either way — it is not cover for this case.
  const root = mkdtempSync(path.join(os.tmpdir(), "qa-next-runs-"));
  const runs = path.join(root, "runs");
  mkdirSync(path.join(runs, "D.2"), { recursive: true });
  for (const name of [
    "2026-09-22-lan-10.md",
    "2026-09-22-lan-02.md",
    "2026-09-22-lan.md",
    "2026-09-23-lan.md",
  ])
    writeFileSync(path.join(runs, "D.2", name), "# run\n");
  assert.deepEqual(
    listRunFiles(runs).map((p) => path.basename(p)),
    [
      "2026-09-22-lan.md",
      "2026-09-22-lan-02.md",
      "2026-09-22-lan-10.md",
      "2026-09-23-lan.md",
    ],
    "chronological across the mixed set [plain, -02, -10] and into the next day",
  );
});

test("CLI: --item describes a named row exactly as --next describes it, and reaches rows --next never would", () => {
  const root = corpus();
  run(root, "--init");
  addRows(root, "D", D_ROWS);
  const viaNext = JSON.parse(run(root, "--next", "--json").out);
  const viaItem = JSON.parse(run(root, "--item", "D.1", "--json").out);
  assert.equal(viaNext.id, "D.1");
  assert.deepEqual(
    viaItem,
    viaNext,
    "field-identical — this is what pins the single describeRow; a source grep would not",
  );
  assert.deepEqual(
    JSON.parse(run(root, "--item", "d.1", "--json").out),
    viaNext,
    "a lowercase id resolves",
  );
  assert.deepEqual(
    [
      viaItem.state,
      viaItem.lastRun,
      viaItem.priorRuns,
      viaItem.notes,
      viaItem.bug,
    ],
    ["untested", null, [], "", null],
    "the re-run fields on a function that has never run",
  );

  // Take D.1 out of ⬜ so --next can no longer reach it, then resolve it by id.
  mkdirSync(path.join(root, "docs/qa/runs/D.1"), { recursive: true });
  writeFileSync(
    path.join(root, "docs/qa/runs/D.1/2026-09-20-lan.md"),
    "# run\n",
  );
  mkdirSync(path.join(root, "docs/bugs"), { recursive: true });
  writeFileSync(
    path.join(root, "docs/bugs/bug.7.x.md"),
    "---\nstatus: new\n---\n",
  );
  assert.equal(
    run(
      root,
      "--set",
      "D.1",
      "fail",
      "--run",
      "runs/D.1/2026-09-20-lan.md",
      "--bug",
      "docs/bugs/bug.7.x.md",
    ).code,
    0,
  );
  assert.equal(
    JSON.parse(run(root, "--next", "--json").out).id,
    "D.2",
    "the selector has moved on",
  );
  const failed = JSON.parse(run(root, "--item", "D.1", "--json").out);
  assert.equal(failed.state, "fail");
  assert.equal(failed.lastRun, "runs/D.1/2026-09-20-lan.md");
  assert.deepEqual(failed.priorRuns, ["runs/D.1/2026-09-20-lan.md"]);
  assert.equal(
    failed.bug,
    "../bugs/bug.7.x.md",
    "the bug link is parsed with checkRegistry's own regex, so Step 4 need not re-parse the registry",
  );
  assert.match(run(root, "--item", "D.1").out, /^item: D\.1 — Play a game$/m);
});

test("CLI: --item on an unknown id exits 4 and leaves the registry byte-identical", () => {
  const root = corpus();
  run(root, "--init");
  addRows(root, "D", D_ROWS);
  const before = readFileSync(REG(root), "utf8");
  const { code, out } = run(root, "--item", "Z.9");
  assert.equal(
    code,
    4,
    "4 is 'no such row', distinct from the usage family's 2",
  );
  assert.match(out, /Z\.9: no registry row/);
  assert.equal(run(root, "--item", "Z.9", "--json").code, 4);
  assert.equal(readFileSync(REG(root), "utf8"), before, "nothing was written");
});

test("CLI: --run-path returns the next free run file and creates its directory; an unknown id exits 4", () => {
  const root = corpus();
  run(root, "--init");
  addRows(root, "D", D_ROWS);
  const first = run(root, "--run-path", "D.2", "--env", "lan");
  assert.equal(first.code, 0);
  const p1 = first.out.trim();
  assert.match(p1, /^runs\/D\.2\/\d{4}-\d{2}-\d{2}-lan\.md$/);
  assert.ok(
    existsSync(path.join(root, "docs/qa/runs/D.2")),
    "the function's directory is created",
  );
  writeFileSync(path.join(root, "docs/qa", p1), "# run\n");
  const p2 = run(root, "--run-path", "d.2", "--env", "lan").out.trim();
  assert.match(
    p2,
    /-lan-02\.md$/,
    "a lowercase id resolves, and the day's second run is sequenced",
  );
  assert.notEqual(
    p1,
    p2,
    "a same-day re-run never returns the path already on disk",
  );
  assert.match(
    run(root, "--run-path", "D.2").out.trim(),
    /-local\.md$/,
    "--env defaults to local",
  );
  assert.equal(run(root, "--run-path", "Z.9").code, 4);
});

test("CLI: only a fail moves an ✅ accepted row — pass, blocked and n/a keep it and update Last run", () => {
  const root = corpus();
  run(root, "--init");
  addRows(root, "D", D_ROWS);
  mkdirSync(path.join(root, "docs/qa/runs/D.2"), { recursive: true });
  for (const n of ["r1", "r2", "r3"])
    writeFileSync(path.join(root, `docs/qa/runs/D.2/${n}.md`), "# run\n");
  mkdirSync(path.join(root, "docs/bugs"), { recursive: true });
  writeFileSync(
    path.join(root, "docs/bugs/bug.1.x.md"),
    "---\nstatus: new\n---\n",
  );
  const state = () =>
    readFileSync(REG(root), "utf8")
      .split("\n")
      .find((l) => l.startsWith("| D.2 |"))
      .split("|")
      .map((c) => c.trim());

  run(root, "--set", "D.2", "pass", "--run", "runs/D.2/r1.md");
  assert.equal(run(root, "--accept", "D.2", "--note", "looks right").code, 0);
  assert.equal(state()[8], STATES.accepted);
  const acceptedNote = state()[10];
  assert.match(acceptedNote, /^accepted \d{4}-\d{2}-\d{2} — looks right$/);

  // pass on ✅ — kept, Last run updated, and the tool SAYS it took that branch.
  const passed = run(root, "--set", "D.2", "pass", "--run", "runs/D.2/r2.md");
  assert.equal(passed.code, 0);
  assert.match(passed.out, /^D\.2: ✅ accepted \(kept\) · \[r2\]/m);
  assert.equal(
    state()[8],
    STATES.accepted,
    "the owner's sign-off survives a machine re-pass",
  );
  assert.equal(state()[9], "[r2](runs/D.2/r2.md)");
  assert.equal(state()[10], acceptedNote, "and so does its provenance");
  assert.equal(run(root, "--check").code, 0);

  // blocked and n/a on ✅ — the rule is over the verdict set, not over "pass". These two MANDATE
  // --note, so a guard that REFUSED --note here made them impossible against an accepted row,
  // which SKILL.md and the README both say is allowed. The kept path appends instead: the verdict
  // gets its say and the sign-off survives.
  for (const verdict of ["blocked", "na"]) {
    const r = run(root, "--set", "D.2", verdict, "--note", `env: ${verdict}`);
    assert.equal(r.code, 0, `${verdict} is legitimate against an accepted row`);
    assert.match(r.out, /✅ accepted \(kept\)/);
    assert.equal(state()[8], STATES.accepted);
    assert.ok(
      state()[10].startsWith(acceptedNote),
      `the owner's sign-off survives a ${verdict} re-run — appended to, never replaced`,
    );
    assert.match(
      state()[10],
      new RegExp(`env: ${verdict}$`),
      "and the verdict's note is there too",
    );
  }
  assert.equal(run(root, "--check").code, 0);

  // THE DOOR THE ENUMERATION MISSED. --bug also writes that cell, took the kept branch, and
  // replaced the sign-off with a bug link while --check stayed green. Under the append rule no
  // flag can reopen it, so this leg is the property test for every future one.
  const withBug = run(
    root,
    "--set",
    "D.2",
    "pass",
    "--run",
    "runs/D.2/r1.md",
    "--bug",
    "docs/bugs/bug.1.x.md",
  );
  assert.equal(withBug.code, 0);
  assert.match(withBug.out, /✅ accepted \(kept\)/);
  assert.ok(
    state()[10].startsWith(acceptedNote),
    "--bug appends to the sign-off rather than replacing it",
  );
  assert.match(state()[10], /bug\.1\.x/);
  assert.equal(run(root, "--check").code, 0);

  // untested — the DEMOTION, not a verdict. It must move the row: it is the documented way to
  // take an owner's ✅ back, and keeping ✅ for it left an accepted row whose Last run had been
  // cleared by the untested block below, which --check rejects (TASK-141-BUG-1). This is the leg
  // the original group never sent, which is why all ten mutations went red and none caught it.
  const demoted = run(root, "--set", "D.2", "untested", "--note", "reopening");
  assert.equal(demoted.code, 0);
  assert.doesNotMatch(
    demoted.out,
    /\(kept\)/,
    "untested is the demotion — it is never kept",
  );
  assert.equal(state()[8], STATES.untested);
  assert.equal(state()[9], "", "untested clears Last run, as it always has");
  assert.equal(state()[10], "reopening");
  assert.equal(
    run(root, "--check").code,
    0,
    "an ⬜ row needs no run link — the registry is valid after the documented demotion",
  );
  assert.equal(
    JSON.parse(run(root, "--item", "D.2", "--json").out).state,
    "untested",
    "and the demoted row is back in the selector's queue (D.1 still shadows it in file order, which is why this asserts the row's state rather than --next)",
  );

  // Put it back to ✅ for the fail leg below.
  run(root, "--set", "D.2", "pass", "--run", "runs/D.2/r1.md");
  run(root, "--accept", "D.2", "--note", "re-accepted");

  // fail — the one verdict that moves it, from ✅ directly.
  const failed = run(
    root,
    "--set",
    "D.2",
    "fail",
    "--run",
    "runs/D.2/r3.md",
    "--bug",
    "docs/bugs/bug.1.x.md",
  );
  assert.equal(failed.code, 0);
  assert.doesNotMatch(failed.out, /\(kept\)/);
  assert.equal(state()[8], STATES.fail);
  assert.equal(run(root, "--check").code, 0);

  // and a non-accepted row is untouched by the rule: pass still writes 🟡.
  run(root, "--set", "D.1", "pass", "--run", "runs/D.2/r1.md");
  assert.equal(
    readFileSync(REG(root), "utf8")
      .split("\n")
      .find((l) => l.startsWith("| D.1 |"))
      .split("|")
      .map((c) => c.trim())[8],
    STATES.pass,
  );
});

test("CLI: --clear-note empties Notes / bug, and is refused where clearing would lose something", () => {
  const root = corpus();
  run(root, "--init");
  addRows(root, "D", D_ROWS);
  mkdirSync(path.join(root, "docs/qa/runs/D.2"), { recursive: true });
  for (const n of ["r1", "r2"])
    writeFileSync(path.join(root, `docs/qa/runs/D.2/${n}.md`), "# run\n");
  mkdirSync(path.join(root, "docs/bugs"), { recursive: true });
  writeFileSync(
    path.join(root, "docs/bugs/bug.1.x.md"),
    "---\nstatus: new\n---\n",
  );
  const notes = (id) =>
    readFileSync(REG(root), "utf8")
      .split("\n")
      .find((l) => l.startsWith(`| ${id} |`))
      .split("|")
      .map((c) => c.trim())[10];

  run(
    root,
    "--set",
    "D.2",
    "fail",
    "--run",
    "runs/D.2/r1.md",
    "--bug",
    "docs/bugs/bug.1.x.md",
  );
  assert.match(notes("D.2"), /^\[bug\.1\.x\]/);
  assert.equal(
    run(root, "--set", "D.2", "pass", "--run", "runs/D.2/r2.md", "--clear-note")
      .code,
    0,
  );
  assert.equal(
    notes("D.2"),
    "",
    "a 🟡 that follows a ❌ carries no stale bug link",
  );
  assert.equal(run(root, "--check").code, 0);

  const bad = run(
    root,
    "--set",
    "D.2",
    "pass",
    "--run",
    "runs/D.2/r2.md",
    "--clear-note",
    "--note",
    "x",
  );
  assert.equal(bad.code, 2);
  assert.match(bad.out, /--clear-note cannot be combined with --note or --bug/);
  assert.equal(
    run(
      root,
      "--set",
      "D.2",
      "fail",
      "--run",
      "runs/D.2/r2.md",
      "--bug",
      "docs/bugs/bug.1.x.md",
      "--clear-note",
    ).code,
    2,
    "--clear-note beside --bug is refused, which is why the fail row of the note table says --bug",
  );

  // On an accepted row the note cell holds the owner's sign-off, and --check imposes no note
  // requirement there — so the refusal has to live in cmdSet or the loss would be silent.
  run(root, "--set", "D.2", "pass", "--run", "runs/D.2/r1.md");
  run(root, "--accept", "D.2", "--note", "signed off");
  const signOff = notes("D.2");
  const refused = run(
    root,
    "--set",
    "D.2",
    "pass",
    "--run",
    "runs/D.2/r2.md",
    "--clear-note",
  );
  assert.equal(refused.code, 2);
  assert.match(
    refused.out,
    /--clear-note cannot empty an accepted row's sign-off note/,
    "clearing is the one operation append cannot express, so it stays refused",
  );
  assert.equal(notes("D.2"), signOff, "byte-identical — nothing was written");
  assert.equal(run(root, "--check").code, 0);
});

test("CLI: --item → --run-path → --set → --check composes, and a same-day re-run keeps the first run's findings", () => {
  const root = corpus();
  run(root, "--init");
  addRows(root, "D", D_ROWS);
  mkdirSync(path.join(root, "docs/bugs"), { recursive: true });
  writeFileSync(
    path.join(root, "docs/bugs/bug.2.open.md"),
    "---\nstatus: new\n---\n",
  );
  const finding = (n, what) =>
    `# run\n\n## Findings\n\n| # | Where | What was observed | Severity | Filed as |\n| :--- | :--- | :--- | :--- | :--- |\n| ${n} | /g | ${what} | Minor | [bug.2.open](../../../bugs/bug.2.open.md) |\n`;

  const id = JSON.parse(run(root, "--item", "D.2", "--json").out).id;
  const first = run(root, "--run-path", id, "--env", "lan").out.trim();
  writeFileSync(
    path.join(root, "docs/qa", first),
    finding(1, "toast fires twice"),
  );
  assert.equal(run(root, "--set", id, "pass", "--run", first).code, 0);
  assert.equal(run(root, "--check").code, 0);

  const second = run(root, "--run-path", id, "--env", "lan").out.trim();
  assert.notEqual(
    second,
    first,
    "the same day, the same env — a different file",
  );
  writeFileSync(
    path.join(root, "docs/qa", second),
    finding(1, "still fires twice"),
  );
  assert.equal(
    run(root, "--set", id, "pass", "--run", second, "--clear-note").code,
    0,
  );
  assert.equal(run(root, "--check").code, 0);

  const findings = JSON.parse(run(root, "--findings", "--json").out);
  assert.deepEqual(
    findings.map((f) => [f.run, f.what]),
    [
      [first, "toast fires twice"],
      [second, "still fires twice"],
    ],
    "both runs' findings survive, oldest first — the first run was not overwritten",
  );
  const payload = JSON.parse(run(root, "--item", id, "--json").out);
  assert.deepEqual(
    payload.priorRuns,
    [first, second],
    "and priorRuns cites both, in order",
  );
  assert.equal(payload.lastRun, second);
});

test("CLI: the commands task 141 does not touch keep their arguments, output and exit codes", () => {
  const root = corpus();
  run(root, "--init");
  addRows(root, "D", D_ROWS);
  assert.equal(
    run(root, "--accept", "D.2").code,
    2,
    "--accept still refuses a non-🟡",
  );
  assert.equal(
    run(root, "--set", "D.2", "accepted").code,
    2,
    "--set still refuses accepted",
  );
  assert.equal(
    run(root, "--set", "D.2", "pass").code,
    2,
    "pass still needs --run",
  );
  assert.equal(run(root, "--check").code, 0);
  assert.equal(run(root, "--coverage").code, 0);
  assert.equal(run(root, "--findings").code, 0);
  assert.equal(
    run(root, "--item").code,
    2,
    "a bare --item is a USAGE error — 'you named no row' is not 'you named a row that is not there', and Step 1 maps exit 4 to STOP unknown-item",
  );
  assert.equal(
    run(root, "--item", "--json").code,
    2,
    "and a flag-shaped value is not an id either",
  );
  assert.equal(run(root, "--run-path").code, 2, "same for --run-path");
  assert.equal(
    run(root, "--clear-note").code,
    0,
    "--clear-note alone is not a command",
  );
  run(root, "--set", "D.1", "na", "--note", "x");
  run(root, "--set", "D.2", "na", "--note", "x");
  assert.equal(
    run(root, "--next").code,
    3,
    "--next still exits 3 when nothing is untested",
  );
  assert.equal(run(root, "--next", "--json").out.trim(), "null");
});

test("the run template and SKILL.md state ONE evidence path (TASK-141-BUG-2)", () => {
  // The skill argues the rule; the template is what the agent fills in. Two authored statements of
  // one path is the enumeration class, and this pair had already drifted: SKILL.md Step 3 moved to
  // the run-file basename so a same-day re-run cannot overwrite the first run's screenshots, while
  // the template still named `<date>-<env>/` — the colliding path the change set exists to remove.
  // A prose fix nothing enforces drifts again, so the agreement is asserted rather than trusted.
  const skillDir = path.resolve(__dirname, "../../../skills/qa-next");
  const skill = readFileSync(path.join(skillDir, "SKILL.md"), "utf8");
  const template = readFileSync(
    path.join(skillDir, "assets", "run.template.md"),
    "utf8",
  );
  const EVIDENCE_DIR = /\.claude\/state\/qa-next\/<id>\/([^/\s`}]+)\//g;

  const seg = (text) => [...text.matchAll(EVIDENCE_DIR)].map((m) => m[1]);
  const inSkill = seg(skill);
  const inTemplate = seg(template);

  // Non-vacuity floor: a regex that matches nothing would make this test pass on exactly the
  // defect it was written for — "found nothing" and "could not look" must not be one result.
  assert.ok(
    inSkill.length >= 1,
    "SKILL.md must name the evidence directory at least once — if this fails the matcher is broken, not the docs",
  );
  assert.ok(
    inTemplate.length >= 2,
    "the template names it on both its Report and Evidence lines",
  );
  assert.deepEqual(
    [...new Set([...inSkill, ...inTemplate])],
    ["<run-file-basename>"],
    "every statement of the evidence directory, in both files, is the run-file basename",
  );
});

test("every command that takes a row id accepts it case-insensitively (TASK-141-BUG-6)", () => {
  // The POPULATION, enumerated. `normaliseId` was added to --item and --run-path, the two commands
  // this task introduced, and the four that already took an id kept comparing raw — each site
  // correct alone, the set never listed. A run carrying the owner's spelling resolved and computed
  // a run path, then failed at --set: the RECORDING step, after the function had been exercised.
  // Sampling two of six is what let that through, so this test names all six.
  const ID_TAKING_COMMANDS = [
    { label: "--item", argv: (id) => ["--item", id, "--json"] },
    { label: "--run-path", argv: (id) => ["--run-path", id, "--env", "lan"] },
    {
      label: "--set",
      argv: (id) => ["--set", id, "pass", "--run", "runs/D.2/r1.md"],
    },
    { label: "--items", argv: (id) => ["--items", id, "D.2.1"] },
    { label: "--automated", argv: (id) => ["--automated", id, "a/b.spec.ts"] },
    { label: "--accept", argv: (id) => ["--accept", id] },
  ];

  const root = corpus();
  run(root, "--init");
  addRows(root, "D", D_ROWS);
  mkdirSync(path.join(root, "docs/qa/runs/D.2"), { recursive: true });
  writeFileSync(path.join(root, "docs/qa/runs/D.2/r1.md"), "# run\n");

  const rejected = [];
  for (const { label, argv } of ID_TAKING_COMMANDS) {
    const { code, out } = run(root, ...argv("d.2"));
    if (code !== 0 || /no registry row/.test(out))
      rejected.push(`${label} (${code})`);
  }
  assert.deepEqual(
    rejected,
    [],
    "every id-taking command must accept the lowercase id the Arguments table promises",
  );
  // Non-vacuity: the loop above is only evidence if it actually ran every command.
  assert.equal(ID_TAKING_COMMANDS.length, 6);
});

test("a missing id is a usage error on every id-taking command, not a missing row (TASK-141-CR3-4)", () => {
  // The same population as the case-insensitivity test, asserted for the other boundary property.
  // `requireIdValue` was applied to the two readers only, so `--accept` with no id produced the
  // subjectless `uat-status: : no registry row` and `--accept --force` reported
  // `--FORCE: no registry row` — a flag read as an id. Enumerating the population is what closes it.
  const root = corpus();
  run(root, "--init");
  addRows(root, "D", D_ROWS);
  const bare = [
    ["--item"],
    ["--run-path"],
    ["--set"],
    ["--items"],
    ["--automated"],
    ["--accept"],
    ["--accept", "--force"],
  ];
  const wrong = [];
  for (const argv of bare) {
    const { code, out } = run(root, ...argv);
    if (code !== 2 || /no registry row/.test(out))
      wrong.push(`${argv.join(" ")} (${code})`);
  }
  assert.deepEqual(
    wrong,
    [],
    "a missing or flag-shaped id is exit 2 everywhere — 'you named no row' is never 'no such row'",
  );
  assert.equal(bare.length, 7);
});
