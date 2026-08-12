"use strict";
/**
 * Unit, integration and contract tests for the gh-stage.js CLI.
 *
 * These guard properties that are easy to break by accident and expensive to
 * discover in production — on a board a whole team reads:
 *
 *  - `--dry-run` must issue NO write. A naive port of jira-stage.js is unsafe
 *    here, because step-0's GitHub block runs `gh project item-add` BEFORE its
 *    read query, so "the dry-run path is GET-only" is true of Jira and false of
 *    GitHub. A comment cannot enforce this; the `gh` stub below fails the test
 *    on any argv containing a write verb.
 *  - Option ids are PER-PROJECT. Anything that caches or hardcodes a
 *    `singleSelectOptionId` corrupts a real board while passing hand-written
 *    tests — the GitHub analogue of Jira transition id 21 meaning different
 *    things per issue type.
 *  - The multi-board rule must never fan out. `set-github-project-*.sh`
 *    deliberately write to every board an issue is on; for a *status* that is
 *    wrong, and today's step files take `nodes[0]` by accident.
 *  - Matching must stay exact-case-insensitive with NO prefix matching, or
 *    "In Review" starts matching "In Review (blocked)".
 *  - Every documented reason must exit 0 outside `--strict`, because pipeline
 *    steps run inside shells and a non-zero exit on "this board has no review
 *    column" would kill the run.
 *
 * Fixtures: `fixtures/gh-*.json` are `gh api graphql` responses to the single
 * board query in gh-stage.js (`BOARD_QUERY`), trimmed to the fields the matcher
 * reads: `projectItems.nodes[].{id, fieldValueByName.name, project.{id, title,
 * number, fields.nodes[]}}`. Re-capture with:
 *
 *   gh api graphql -f query='{ repository(owner:"OWNER", name:"REPO") {
 *     issue(number:N) { projectItems(first:10) { nodes { id
 *     fieldValueByName(name:"Status"){ ... on ProjectV2ItemFieldSingleSelectValue { name } }
 *     project { id title number fields(first:50) { nodes {
 *     ... on ProjectV2SingleSelectField { id name options { id name } } } } } } } } } }'
 *
 * The `{}` entries in `fields.nodes` are real: the inline fragment leaves
 * non-single-select fields as empty objects, and dropping them from a fixture
 * would hide the filter that has to cope with them. Filenames encode the board
 * shape being pinned, not an issue key.
 *
 * Run: node --test shared/resources/tests/gh-stage.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const cli = require(join(__dirname, "..", "gh-stage.js"));
const tw = require(join(__dirname, "..", "tracker-workflow.js"));

// --- fixtures --------------------------------------------------------------

const fixturesDir = join(__dirname, "fixtures");
const raw = (name) => readFileSync(join(fixturesDir, `${name}.json`), "utf-8");
/** Unwrap to the node list the matcher actually consumes. */
const nodesOf = (name) =>
  JSON.parse(raw(name)).data.repository.issue.projectItems.nodes;

// --- helpers ---------------------------------------------------------------

const silent = { log() {}, info() {}, warn() {}, err() {}, emit() {} };

// Any argv that would change server state. The dry-run contract is asserted by
// failing on these rather than by trusting a code comment.
const WRITE_MARKERS = ["item-add", "mutation", "--method", "-X"];
const isWrite = (argv) =>
  argv.some((a) => WRITE_MARKERS.some((m) => String(a).includes(m)));

/**
 * Stub `gh`. Records every invocation, answers the board read from a fixture
 * (or a queue of fixtures, for the ensureOnBoard retry), and answers mutations
 * from `mutationResponses`.
 */
function stubGh({
  board = "gh-status-unset",
  boardQueue = null,
  mutationResponses = [],
  authOk = true,
  failWrites = false,
} = {}) {
  const calls = [];
  let readIdx = 0;
  let mutIdx = 0;
  const queue = boardQueue;
  const execImpl = (argv) => {
    calls.push(argv);
    if (argv[0] === "auth") {
      if (!authOk) throw new Error("not authenticated");
      return "Logged in";
    }
    if (argv[0] === "repo") return argv.includes("owner") ? "Gamaroff" : "agent-skills";
    if (argv[0] === "project" && argv[1] === "item-add") {
      if (failWrites) throw new Error("item-add failed");
      return "added";
    }
    const q = String(argv[argv.length - 1] || "");
    if (q.includes("mutation")) {
      const r = mutationResponses[mutIdx++];
      if (r instanceof Error) throw r;
      return r !== undefined ? r : JSON.stringify({ data: { updateProjectV2ItemFieldValue: { projectV2Item: { id: "x" } } } });
    }
    const name = queue ? queue[Math.min(readIdx++, queue.length - 1)] : board;
    return raw(name);
  };
  return { execImpl, calls };
}

const _tmpDirs = [];
/**
 * Pin the ladder. Without this, run() shells out to `git rev-parse
 * --show-toplevel` and reads THIS repo's committed tracker-workflow.yaml — a
 * file whose own comments invite editing — so every assertion below would
 * silently depend on it.
 *
 * `_cache` in tracker-workflow.js is keyed on the absolute path and mkdtemp
 * gives a unique dir per call, so no clearing is needed between tests.
 */
function withRepo(files = {}) {
  const dir = mkdtempSync(join(tmpdir(), "gh-stage-"));
  for (const [name, body] of Object.entries(files))
    writeFileSync(join(dir, name), body);
  _tmpDirs.push(dir);
  return dir;
}
process.on("exit", () => {
  for (const d of _tmpDirs) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch (_) {}
  }
});

const LADDER = `
statuses:
  - Todo
  - In Progress
  - In Review
  - Done
pipeline:
  work-started: In Progress
  in-review: In Review
  done: Done
`;

const BESPOKE_LADDER = `
statuses:
  - Backlog
  - In Development
  - Ready for Showcase
  - Shipped
pipeline:
  work-started: In Development
  in-review: Ready for Showcase
  done: Shipped
`;

const PROJECT_YML = `github:
  owner: Gamaroff
  repo: agent-skills
  project_board_name: "Agent Skills"
  project_board_number: 1
`;

const go = (args, s, root) =>
  cli.run({ argv: ["node", "gh-stage.js", ...args], execImpl: s.execImpl, repoRoot: root });

// ===========================================================================
// Unit — resolveOption
// ===========================================================================

test("resolveOption: exact case-insensitive match in both directions", () => {
  const opts = [{ id: "1", name: "Done" }];
  assert.equal(cli.resolveOption(opts, ["done"], "").match.id, "1");
  assert.equal(cli.resolveOption([{ id: "2", name: "done" }], ["Done"], "").match.id, "2");
});

test("resolveOption: emoji-stripped match", () => {
  const opts = [{ id: "1", name: "🚧 In Progress" }];
  const r = cli.resolveOption(opts, ["In Progress"], "");
  assert.equal(r.match.id, "1");
  assert.equal(r.rule, 'option="In Progress"');
});

test("resolveOption: candidates tried in order, first hit wins", () => {
  const opts = [
    { id: "a", name: "Waiting for Review" },
    { id: "b", name: "In Review" },
  ];
  assert.equal(cli.resolveOption(opts, ["In Review", "Waiting for Review"], "").match.id, "b");
  assert.equal(cli.resolveOption(opts, ["Waiting for Review", "In Review"], "").match.id, "a");
});

test("resolveOption: NO prefix matching — In Review must not match In Review (blocked)", () => {
  const opts = [{ id: "1", name: "In Review (blocked)" }];
  const r = cli.resolveOption(opts, ["In Review"], "");
  assert.equal(r.match, null);
  assert.equal(r.reason, "no-option");
});

test("resolveOption: already, when current matches a candidate", () => {
  const opts = [{ id: "1", name: "Done" }];
  assert.equal(cli.resolveOption(opts, ["Done"], "done").reason, "already");
  assert.equal(cli.resolveOption(opts, ["Done"], "🎉 Done").reason, "already");
});

test("resolveOption: no option → no-option, never a fallback pick", () => {
  const opts = [{ id: "1", name: "Todo" }, { id: "2", name: "Shipped" }];
  const r = cli.resolveOption(opts, ["Done"], "Todo");
  assert.equal(r.match, null);
  assert.equal(r.reason, "no-option");
});

test("resolveOption: empty option list is a skip, not a crash", () => {
  assert.equal(cli.resolveOption([], ["Done"], "").reason, "no-option");
  assert.equal(cli.resolveOption(null, ["Done"], "").reason, "no-option");
});

// ===========================================================================
// Unit — fixtures pin real board shapes
// ===========================================================================

test("fixture: option ids differ per project for the SAME option name", () => {
  const [a, b] = nodesOf("gh-two-boards-done-ids").map((n) =>
    cli.normalizeItem(n, "Status"),
  );
  const doneA = a.options.find((o) => o.name === "Done");
  const doneB = b.options.find((o) => o.name === "Done");
  assert.ok(doneA && doneB);
  assert.notEqual(
    doneA.id,
    doneB.id,
    "the whole point of this fixture: never cache an option id across projects",
  );
});

test("fixture: case variants both resolve, and the first candidate wins", () => {
  const item = cli.normalizeItem(nodesOf("gh-done-case-variants")[0], "Status");
  const names = item.options.map((o) => o.name);
  assert.ok(names.includes("done") && names.includes("Done"));
  // Two options are equal under eqName; order decides, and it must be stable.
  assert.equal(cli.resolveOption(item.options, ["Done"], "").match.id, "cv-done-lower");
});

test("fixture: a board with no Status field yields statusFieldId null, no throw", () => {
  const item = cli.normalizeItem(nodesOf("gh-no-status-field")[0], "Status");
  assert.equal(item.statusFieldId, null);
  assert.deepEqual(item.options, []);
});

test("fixture: fieldValueByName null becomes an empty current, not a crash", () => {
  const item = cli.normalizeItem(nodesOf("gh-status-unset")[0], "Status");
  assert.equal(item.current, "");
  assert.equal(item.options.length, 3);
});

test("fixture: options preserve board order — that IS the workflow order", () => {
  const item = cli.normalizeItem(nodesOf("gh-bespoke-columns")[0], "Status");
  assert.deepEqual(
    item.options.map((o) => o.name),
    ["Backlog", "In Development", "Ready for Showcase", "Shipped"],
  );
});

// ===========================================================================
// Unit — selectBoard (the never-fan-out rule)
// ===========================================================================

const twoBoards = () =>
  nodesOf("gh-issue-on-two-boards").map((n) => cli.normalizeItem(n, "Status"));

test("selectBoard: exactly one board is used without a hint", () => {
  const one = [cli.normalizeItem(nodesOf("gh-status-unset")[0], "Status")];
  const r = cli.selectBoard(one, { projectYml: {} });
  assert.equal(r.item.projectTitle, "Agent Skills");
  assert.equal(r.rule, "only-board");
});

test("selectBoard: no boards → not-on-board", () => {
  assert.equal(cli.selectBoard([], { projectYml: {} }).reason, "not-on-board");
});

test("selectBoard: two boards and no hint → ambiguous-board naming both", () => {
  const r = cli.selectBoard(twoBoards(), { projectYml: {} });
  assert.equal(r.item, null);
  assert.equal(r.reason, "ambiguous-board");
  assert.equal(r.candidates.length, 2);
  assert.ok(r.candidates.join(" ").includes("Team Sprint"));
  assert.ok(r.candidates.join(" ").includes("Org Portfolio"));
});

test("selectBoard: --board wins, by number or by title", () => {
  assert.equal(
    cli.selectBoard(twoBoards(), { board: "12", projectYml: {} }).item.projectTitle,
    "Org Portfolio",
  );
  assert.equal(
    cli.selectBoard(twoBoards(), { board: "Team Sprint", projectYml: {} }).item.projectNumber,
    "7",
  );
});

test("selectBoard: precedence is --board > github.projectBoard > project.yml", () => {
  const all = {
    board: "7",
    configured: "12",
    projectYml: { boardNumber: "12", boardName: "Org Portfolio" },
  };
  assert.equal(cli.selectBoard(twoBoards(), all).rule, "--board");

  const noFlag = { configured: "12", projectYml: { boardNumber: "7" } };
  assert.equal(cli.selectBoard(twoBoards(), noFlag).rule, "github.projectBoard");
  assert.equal(cli.selectBoard(twoBoards(), noFlag).item.projectTitle, "Org Portfolio");

  const ymlOnly = { projectYml: { boardNumber: "7" } };
  assert.equal(cli.selectBoard(twoBoards(), ymlOnly).rule, "project.yml project_board_number");
});

test("selectBoard: an unmatched hint is ambiguous, never a guess", () => {
  const r = cli.selectBoard(twoBoards(), { board: "999", projectYml: {} });
  assert.equal(r.item, null);
  assert.equal(r.reason, "ambiguous-board");
});

// ===========================================================================
// Integration — the run() flow, gh stubbed
// ===========================================================================

test("run: moves the card and reports the option that landed", () => {
  const root = withRepo({ "tracker-workflow.yaml": LADDER, "project.yml": PROJECT_YML });
  const s = stubGh({
    boardQueue: ["gh-status-unset", "gh-two-boards-done-ids"],
  });
  const r = go(["--issue", "42", "--stage", "work-started"], s, root);
  assert.equal(r.exitCode, 0);
  assert.equal(r.transitioned, true);
  assert.equal(r.reason, "transitioned");
  // The verify re-read is what makes this the LANDED option, not the requested one.
  assert.equal(r.to, "In Progress");
  const mutations = s.calls.filter((c) => String(c[c.length - 1]).includes("mutation"));
  assert.equal(mutations.length, 1);
  assert.ok(mutations[0][mutations[0].length - 1].includes("u-prog"));
});

test("run: already there → no mutation issued", () => {
  const root = withRepo({ "tracker-workflow.yaml": LADDER, "project.yml": PROJECT_YML });
  const s = stubGh({ board: "gh-two-boards-done-ids", boardQueue: ["gh-bespoke-columns"] });
  // Board is at "In Development"; bespoke ladder's work-started target is the same.
  const bespokeRoot = withRepo({
    "tracker-workflow.yaml": BESPOKE_LADDER,
    "project.yml": PROJECT_YML,
  });
  const r = go(["--issue", "42", "--stage", "work-started"], s, bespokeRoot);
  assert.equal(r.reason, "already");
  assert.equal(r.exitCode, 0);
  assert.equal(s.calls.filter((c) => String(c[c.length - 1]).includes("mutation")).length, 0);
});

test("run: a bespoke board resolves through its own ladder", () => {
  const root = withRepo({
    "tracker-workflow.yaml": BESPOKE_LADDER,
    "project.yml": PROJECT_YML,
  });
  const s = stubGh({ boardQueue: ["gh-bespoke-columns", "gh-bespoke-columns"] });
  const r = go(["--issue", "42", "--stage", "done"], s, root);
  assert.equal(r.transitioned, true);
  const mutation = s.calls.find((c) => String(c[c.length - 1]).includes("mutation"));
  assert.ok(mutation[mutation.length - 1].includes("b-shipped"));
});

test("run: not on any board → not-on-board, exit 0", () => {
  const root = withRepo({ "tracker-workflow.yaml": LADDER, "project.yml": PROJECT_YML });
  const s = stubGh({ board: "gh-not-on-board" });
  const r = go(["--issue", "42", "--stage", "done"], s, root);
  assert.equal(r.reason, "not-on-board");
  assert.equal(r.exitCode, 0);
});

test("run: no Status field → skip, not a crash", () => {
  const root = withRepo({ "tracker-workflow.yaml": LADDER, "project.yml": PROJECT_YML });
  const s = stubGh({ board: "gh-no-status-field" });
  const r = go(["--issue", "42", "--stage", "done"], s, root);
  assert.equal(r.reason, "no-status-field");
  assert.equal(r.exitCode, 0);
});

test("run: two boards, no hint → ambiguous-board and NO mutation", () => {
  const root = withRepo({ "tracker-workflow.yaml": LADDER });
  const s = stubGh({ board: "gh-issue-on-two-boards" });
  const r = go(["--issue", "42", "--stage", "in-review"], s, root);
  assert.equal(r.reason, "ambiguous-board");
  assert.equal(r.exitCode, 0);
  assert.equal(
    s.calls.filter((c) => String(c[c.length - 1]).includes("mutation")).length,
    0,
    "never fan a status change out to a board nobody asked about",
  );
});

test("run: two boards with --board → the named one is used", () => {
  const root = withRepo({ "tracker-workflow.yaml": LADDER });
  const s = stubGh({ board: "gh-issue-on-two-boards" });
  const r = go(["--issue", "42", "--stage", "in-review", "--board", "12"], s, root);
  assert.equal(r.transitioned, true);
  const mutation = s.calls.find((c) => String(c[c.length - 1]).includes("mutation"));
  assert.ok(mutation[mutation.length - 1].includes("o-rev"));
});

test("run: no matching option → no-option listing what the board offered", () => {
  const root = withRepo({ "tracker-workflow.yaml": LADDER, "project.yml": PROJECT_YML });
  // The default-ladder board has no "Ready for Showcase"; ask for a bespoke target.
  const s = stubGh({ board: "gh-status-unset" });
  const wf = withRepo({
    "tracker-workflow.yaml": `
statuses:
  - Todo
  - In Progress
  - Ready for Showcase
pipeline:
  in-review: Ready for Showcase
`,
    "project.yml": PROJECT_YML,
  });
  const r = go(["--issue", "42", "--stage", "in-review"], s, wf);
  assert.equal(r.reason, "no-option");
  assert.deepEqual(r.offered, ["Todo", "In Progress", "Done"]);
});

test("run: a moment absent from pipeline: is disabled, not defaulted", () => {
  const root = withRepo({
    "tracker-workflow.yaml": `
statuses:
  - Todo
  - In Progress
  - Done
pipeline:
  work-started: In Progress
`,
    "project.yml": PROJECT_YML,
  });
  const s = stubGh({ board: "gh-status-unset" });
  const r = go(["--issue", "42", "--stage", "done"], s, root);
  assert.equal(r.reason, "stage-disabled");
  assert.equal(r.exitCode, 0);
  assert.equal(s.calls.filter((c) => String(c[c.length - 1]).includes("mutation")).length, 0);
});

// ===========================================================================
// Integration — the backward-move guard
// ===========================================================================

test("guard: refuses a lower-ranked target", () => {
  const root = withRepo({ "tracker-workflow.yaml": LADDER, "project.yml": PROJECT_YML });
  // Board sits at "In Progress" (rank 1); work-started targets rank 1, done rank 3.
  // Ask for work-started from a card already in Review.
  const s = stubGh({ board: "gh-two-boards-done-ids", boardQueue: ["gh-two-boards-done-ids"] });
  const r = go(["--issue", "42", "--stage", "work-started", "--board", "4"], s, root);
  // Board 4 sits at "Todo" (rank 0) → forward to In Progress, allowed.
  assert.equal(r.transitioned, true);
});

test("guard: would-regress when the card is past the target", () => {
  const root = withRepo({ "tracker-workflow.yaml": LADDER, "project.yml": PROJECT_YML });
  const s = stubGh({ board: "gh-two-boards-done-ids" });
  // Board 1 sits at "In Progress" (rank 1); a `work-started` re-run is a no-op,
  // but asking to go back to Todo is not — use a ladder whose work-started is Todo.
  const backwards = withRepo({
    "tracker-workflow.yaml": `
statuses:
  - Todo
  - In Progress
  - Done
pipeline:
  work-started: Todo
`,
    "project.yml": PROJECT_YML,
  });
  const r = go(["--issue", "42", "--stage", "work-started", "--board", "1"], s, backwards);
  assert.equal(r.reason, "would-regress");
  assert.equal(r.from, "In Progress");
  assert.equal(r.to, "Todo");
  assert.equal(r.exitCode, 0);
  assert.equal(s.calls.filter((c) => String(c[c.length - 1]).includes("mutation")).length, 0);
});

test("guard: --allow-regress overrides it", () => {
  const s = stubGh({ board: "gh-two-boards-done-ids" });
  const backwards = withRepo({
    "tracker-workflow.yaml": `
statuses:
  - Todo
  - In Progress
  - Done
pipeline:
  work-started: Todo
`,
    "project.yml": PROJECT_YML,
  });
  const r = go(
    ["--issue", "42", "--stage", "work-started", "--board", "1", "--allow-regress"],
    s,
    backwards,
  );
  assert.equal(r.transitioned, true);
});

test("guard: unranked either side means no opinion — allow", () => {
  // A board column that appears on no ladder rung ranks null, so the guard is
  // inert. This is exactly why declaring a ladder matters on a tracker with no
  // transition graph.
  const root = withRepo({
    "tracker-workflow.yaml": `
statuses:
  - Alpha
  - Omega
pipeline:
  work-started: In Progress
`,
    "project.yml": PROJECT_YML,
  });
  const s = stubGh({ board: "gh-two-boards-done-ids" });
  assert.equal(tw.rankOf("In Progress", tw.loadWorkflow({ repoRoot: root })), null);
  const r = go(["--issue", "42", "--stage", "work-started", "--board", "1"], s, root);
  assert.equal(r.reason, "already");
});

// ===========================================================================
// Contract — --dry-run issues NO write
// ===========================================================================

test("--dry-run issues no mutation and no item-add, even with --add-to-board", () => {
  const root = withRepo({ "tracker-workflow.yaml": LADDER, "project.yml": PROJECT_YML });
  const s = stubGh({ board: "gh-status-unset" });
  const r = go(
    ["--issue", "42", "--stage", "work-started", "--dry-run", "--add-to-board"],
    s,
    root,
  );
  assert.equal(r.reason, "dry-run");
  assert.equal(r.would, "In Progress");
  assert.equal(r.exitCode, 0);
  const writes = s.calls.filter(isWrite);
  assert.deepEqual(
    writes,
    [],
    `--dry-run must issue no write; saw: ${JSON.stringify(writes)}`,
  );
});

test("--dry-run still applies the guard", () => {
  const backwards = withRepo({
    "tracker-workflow.yaml": `
statuses:
  - Todo
  - In Progress
  - Done
pipeline:
  work-started: Todo
`,
    "project.yml": PROJECT_YML,
  });
  const s = stubGh({ board: "gh-two-boards-done-ids" });
  const r = go(
    ["--issue", "42", "--stage", "work-started", "--board", "1", "--dry-run"],
    s,
    backwards,
  );
  assert.equal(r.reason, "would-regress");
  assert.deepEqual(s.calls.filter(isWrite), []);
});

// ===========================================================================
// Contract — exit codes
// ===========================================================================

test("every documented skip exits 0 without --strict", () => {
  const root = withRepo({ "tracker-workflow.yaml": LADDER, "project.yml": PROJECT_YML });
  for (const board of ["gh-not-on-board", "gh-no-status-field"]) {
    const s = stubGh({ board });
    assert.equal(go(["--issue", "42", "--stage", "done"], s, root).exitCode, 0, board);
  }
  const amb = stubGh({ board: "gh-issue-on-two-boards" });
  assert.equal(go(["--issue", "42", "--stage", "done"], amb, root).exitCode, 0);
});

test("--strict turns a skip into exit 1", () => {
  const root = withRepo({ "tracker-workflow.yaml": LADDER, "project.yml": PROJECT_YML });
  const s = stubGh({ board: "gh-not-on-board" });
  const r = go(["--issue", "42", "--stage", "done", "--strict"], s, root);
  assert.equal(r.reason, "not-on-board");
  assert.equal(r.exitCode, 1);
});

test("--strict does NOT turn would-regress or already into a failure", () => {
  // Both mean the board is at or past where the moment wanted it — the work is
  // further along than the caller thought, which is not a skip to escalate.
  const backwards = withRepo({
    "tracker-workflow.yaml": `
statuses:
  - Todo
  - In Progress
  - Done
pipeline:
  work-started: Todo
`,
    "project.yml": PROJECT_YML,
  });
  const s = stubGh({ board: "gh-two-boards-done-ids" });
  const r = go(
    ["--issue", "42", "--stage", "work-started", "--board", "1", "--strict"],
    s,
    backwards,
  );
  assert.equal(r.reason, "would-regress");
  assert.equal(r.exitCode, 0);
});

test("usage errors exit 2", () => {
  const root = withRepo({ "tracker-workflow.yaml": LADDER });
  const s = stubGh({});
  assert.equal(go(["--stage", "done"], s, root).exitCode, 2, "missing --issue");
  assert.equal(go(["--issue", "42"], s, root).exitCode, 2, "missing --stage");
  assert.equal(
    go(["--issue", "42", "--stage", "not-a-moment"], s, root).exitCode,
    2,
    "unknown moment",
  );
  assert.equal(
    go(["--issue", "not-a-number", "--stage", "done"], s, root).exitCode,
    2,
    "non-numeric issue must not reach the query builder",
  );
  assert.equal(
    cli.run({ argv: ["node", "gh-stage.js", "--nope"], execImpl: s.execImpl, repoRoot: root })
      .exitCode,
    2,
    "unknown option",
  );
});

test("no credentials is a normal exit-0 outcome, and a dead end", () => {
  const root = withRepo({ "tracker-workflow.yaml": LADDER });
  const s = stubGh({ authOk: false });
  const r = go(["--issue", "42", "--stage", "done"], s, root);
  assert.equal(r.reason, "no-credentials");
  assert.equal(r.exitCode, 0);
  assert.deepEqual(s.calls.filter(isWrite), []);
});

test("a mutation error envelope is retried, then warned about, then exit 0", () => {
  const root = withRepo({ "tracker-workflow.yaml": LADDER, "project.yml": PROJECT_YML });
  const s = stubGh({
    board: "gh-status-unset",
    mutationResponses: [
      raw("gh-mutation-error"),
      raw("gh-mutation-error"),
      raw("gh-mutation-error"),
    ],
  });
  const r = go(["--issue", "42", "--stage", "work-started"], s, root);
  assert.equal(r.reason, "mutation-failed");
  assert.equal(r.exitCode, 0);
  assert.ok(r.detail.includes("Resource not accessible"));
});

test("withRetry retries three times then rethrows", () => {
  let n = 0;
  const noSleep = () => {};
  assert.throws(
    () =>
      cli.withRetry(
        () => {
          n++;
          throw new Error("boom");
        },
        { sleepMs: noSleep },
      ),
    /boom/,
  );
  assert.equal(n, 3);

  let m = 0;
  const r = cli.withRetry(
    () => {
      m++;
      if (m < 2) throw new Error("transient");
      return "ok";
    },
    { sleepMs: noSleep },
  );
  assert.equal(r, "ok");
  assert.equal(m, 2);
});

test("the flag surface matches jira-stage.js where the concept exists", () => {
  const a = cli.parseArgs([
    "node",
    "gh-stage.js",
    "--issue",
    "1",
    "--stage",
    "done",
    "--json",
    "--quiet",
    "--dry-run",
    "--strict",
    "--allow-regress",
  ]);
  for (const k of ["json", "quiet", "dryRun", "strict", "allowRegress"])
    assert.equal(a[k], true, k);
  assert.equal(a.issue, "1");
  assert.equal(a.stage, "done");
});

// ===========================================================================
// --probe-board and --write-ladder
// ===========================================================================

test("--probe-board reports options in board order and each moment's verdict", () => {
  const root = withRepo({ "tracker-workflow.yaml": BESPOKE_LADDER, "project.yml": PROJECT_YML });
  const s = stubGh({ board: "gh-bespoke-columns" });
  const r = go(["--probe-board", "--issue", "42"], s, root);
  assert.equal(r.exitCode, 0);
  assert.deepEqual(r.options, [
    "Backlog",
    "In Development",
    "Ready for Showcase",
    "Shipped",
  ]);
  assert.equal(r.moments["work-started"].verdict, "resolved");
  assert.equal(r.moments["work-started"].option, "In Development");
  assert.equal(r.moments["done"].option, "Shipped");
  // Moments the file does not declare are disabled, not guessed at.
  assert.equal(r.moments["blocked"].verdict, "disabled");
  assert.deepEqual(s.calls.filter(isWrite), [], "probe is read-only");
});

test("--probe-board surfaces a moment the board cannot serve", () => {
  const root = withRepo({ "tracker-workflow.yaml": LADDER, "project.yml": PROJECT_YML });
  const s = stubGh({ board: "gh-bespoke-columns" });
  const r = go(["--probe-board", "--issue", "42"], s, root);
  assert.equal(r.moments["in-review"].verdict, "no-option");
  assert.deepEqual(r.moments["in-review"].targets, ["In Review"]);
});

test("--write-ladder derives the ladder from board option order", () => {
  const root = withRepo({ "project.yml": PROJECT_YML });
  const s = stubGh({ board: "gh-bespoke-columns" });
  const r = go(["--probe-board", "--write-ladder", "--issue", "42"], s, root);
  assert.equal(r.ladderWritten.written, true);
  const written = readFileSync(join(root, "tracker-workflow.yaml"), "utf-8");
  const wf = tw.loadWorkflow({ repoRoot: root });
  // Round-trips through tracker-workflow.js, in board order.
  assert.deepEqual(
    wf.ladder.map((rung) => rung.names[0]),
    ["Backlog", "In Development", "Ready for Showcase", "Shipped"],
  );
  assert.ok(written.includes("statuses:"));
});

test("--write-ladder never overwrites an existing ladder", () => {
  const root = withRepo({ "tracker-workflow.yaml": LADDER, "project.yml": PROJECT_YML });
  const s = stubGh({ board: "gh-bespoke-columns" });
  const r = go(["--probe-board", "--write-ladder", "--issue", "42"], s, root);
  assert.equal(r.ladderWritten.written, false);
  assert.equal(r.ladderWritten.reason, "exists");
  assert.equal(readFileSync(join(root, "tracker-workflow.yaml"), "utf-8"), LADDER);
});

// ===========================================================================
// describeAlternatives — the skip diagnosis
// ===========================================================================

test("describeAlternatives names the moment an unmatched option does serve", () => {
  const root = withRepo({ "tracker-workflow.yaml": BESPOKE_LADDER });
  const wf = tw.loadWorkflow({ repoRoot: root });
  const item = cli.normalizeItem(nodesOf("gh-bespoke-columns")[0], "Status");
  const hints = cli.describeAlternatives(item.options, "done", wf, "");
  assert.ok(
    hints.some((h) => h.includes("Ready for Showcase") && h.includes("in-review")),
    `expected a hint naming the in-review target; got ${JSON.stringify(hints)}`,
  );
});

test("describeAlternatives does not hint at the moment being resolved", () => {
  const root = withRepo({ "tracker-workflow.yaml": BESPOKE_LADDER });
  const wf = tw.loadWorkflow({ repoRoot: root });
  const item = cli.normalizeItem(nodesOf("gh-bespoke-columns")[0], "Status");
  const hints = cli.describeAlternatives(item.options, "in-review", wf, "");
  assert.ok(!hints.some((h) => h.includes("moment in-review")));
});

// ===========================================================================
// ensureOnBoard — the propagation dance
// ===========================================================================

test("ensureOnBoard re-reads once after an empty first read", () => {
  const s = stubGh({ boardQueue: ["gh-not-on-board", "gh-status-unset"] });
  const items = cli.ensureOnBoard({
    exec: s.execImpl,
    owner: "Gamaroff",
    repo: "agent-skills",
    issue: "42",
    statusField: "Status",
    boardNum: "1",
    sleepMs: () => {},
  });
  assert.equal(items.length, 1);
  const reads = s.calls.filter((c) => c[0] === "api");
  assert.equal(reads.length, 2, "one read, then exactly one retry");
  assert.equal(s.calls.filter((c) => c[1] === "item-add").length, 1);
});

test("ensureOnBoard tolerates item-add failing — the read is the real test", () => {
  const s = stubGh({ boardQueue: ["gh-status-unset"], failWrites: true });
  const items = cli.ensureOnBoard({
    exec: s.execImpl,
    owner: "Gamaroff",
    repo: "agent-skills",
    issue: "42",
    statusField: "Status",
    boardNum: "1",
    sleepMs: () => {},
  });
  assert.equal(items.length, 1);
});

// ===========================================================================
// Dependency boundary
// ===========================================================================

test("an unhandled throw still exits 0 — the require.main shim", () => {
  // Exercised as a real subprocess, because the property under test IS the
  // `if (require.main === module)` shim: an in-process call to run() can never
  // reach it. The child is given a `gh` that emits garbage on stdout, so JSON
  // parsing throws somewhere the CLI does not specifically guard.
  const dir = mkdtempSync(join(tmpdir(), "gh-stage-throw-"));
  _tmpDirs.push(dir);
  const fakeGh = join(dir, "gh");
  writeFileSync(fakeGh, "#!/bin/sh\necho 'not json at all'\n", { mode: 0o755 });

  const res = spawnSync(
    process.execPath,
    [join(__dirname, "..", "gh-stage.js"), "--issue", "1", "--stage", "done"],
    {
      cwd: dir,
      encoding: "utf-8",
      env: { ...process.env, PATH: `${dir}:${process.env.PATH}` },
    },
  );
  assert.equal(
    res.status,
    0,
    `a pipeline step runs inside a shell; a non-zero exit would kill the run. stderr: ${res.stderr}`,
  );

  // And the shim is the thing that guarantees it, not luck.
  const src = readFileSync(join(__dirname, "..", "gh-stage.js"), "utf-8");
  assert.match(src, /require\.main === module/);
  assert.match(src, /gh-stage failed/);
});

test("gh-stage.js does not depend on jira-sync.js", () => {
  const src = readFileSync(join(__dirname, "..", "gh-stage.js"), "utf-8");
  const requires = [...src.matchAll(/require\(["']([^"']+)["']\)/g)].map((m) => m[1]);
  assert.ok(
    !requires.some((r) => r.includes("jira-sync")),
    `a GitHub-only consumer must not bundle jira-sync.js; found: ${requires.join(", ")}`,
  );
  assert.deepEqual(
    requires.filter((r) => r.startsWith(".")).sort(),
    ["./tracker-workflow.js", "./yaml-subset.js"],
  );
});
