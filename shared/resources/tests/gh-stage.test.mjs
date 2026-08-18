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
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
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
    if (argv[0] === "repo")
      return argv.includes("owner") ? "Gamaroff" : "agent-skills";
    if (argv[0] === "project" && argv[1] === "item-add") {
      if (failWrites) throw new Error("item-add failed");
      return "added";
    }
    const q = String(argv[argv.length - 1] || "");
    if (q.includes("mutation")) {
      const r = mutationResponses[mutIdx++];
      if (r instanceof Error) throw r;
      return r !== undefined
        ? r
        : JSON.stringify({
            data: {
              updateProjectV2ItemFieldValue: { projectV2Item: { id: "x" } },
            },
          });
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

const noSleep = () => {};
const go = (args, s, root) =>
  cli.run({
    argv: ["node", "gh-stage.js", ...args],
    execImpl: s.execImpl,
    repoRoot: root,
    // Retries and the propagation dance are exercised for their behaviour, not
    // their wall-clock cost.
    sleepImpl: noSleep,
  });

// ===========================================================================
// Unit — resolveOption
// ===========================================================================

test("resolveOption: exact case-insensitive match in both directions", () => {
  const opts = [{ id: "1", name: "Done" }];
  assert.equal(cli.resolveOption(opts, ["done"], "").match.id, "1");
  assert.equal(
    cli.resolveOption([{ id: "2", name: "done" }], ["Done"], "").match.id,
    "2",
  );
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
  assert.equal(
    cli.resolveOption(opts, ["In Review", "Waiting for Review"], "").match.id,
    "b",
  );
  assert.equal(
    cli.resolveOption(opts, ["Waiting for Review", "In Review"], "").match.id,
    "a",
  );
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
  const opts = [
    { id: "1", name: "Todo" },
    { id: "2", name: "Shipped" },
  ];
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
  assert.equal(
    cli.resolveOption(item.options, ["Done"], "").match.id,
    "cv-done-lower",
  );
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
    cli.selectBoard(twoBoards(), { board: "12", projectYml: {} }).item
      .projectTitle,
    "Org Portfolio",
  );
  assert.equal(
    cli.selectBoard(twoBoards(), { board: "Team Sprint", projectYml: {} }).item
      .projectNumber,
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
  assert.equal(
    cli.selectBoard(twoBoards(), noFlag).rule,
    "github.projectBoard",
  );
  assert.equal(
    cli.selectBoard(twoBoards(), noFlag).item.projectTitle,
    "Org Portfolio",
  );

  const ymlOnly = { projectYml: { boardNumber: "7" } };
  assert.equal(
    cli.selectBoard(twoBoards(), ymlOnly).rule,
    "project.yml project_board_number",
  );
});

test("selectBoard: an unmatched hint FAILS CLOSED — it never falls through", () => {
  // The regression this pins: `tryHint` returned null both for "hint absent" and
  // for "hint present but matched nothing", so an `||` chain could not tell them
  // apart. A mistyped --board then fell through to project.yml and set the
  // status on a board the operator explicitly did not name — the exact outcome
  // the never-fan-out rule exists to prevent.
  //
  // Note the lower tiers here are POPULATED and each would match. If any of them
  // is consulted, this test fails.
  const r = cli.selectBoard(twoBoards(), {
    board: "999",
    configured: "12",
    projectYml: { boardNumber: "7", boardName: "Team Sprint" },
  });
  assert.equal(r.item, null, "must not pick a board the operator did not name");
  assert.equal(r.reason, "ambiguous-board");
  assert.equal(r.unmatchedHint, "999");
  assert.equal(r.unmatchedRule, "--board");

  // Same rule one tier down: a wrong github.projectBoard does not fall through
  // to project.yml either.
  const r2 = cli.selectBoard(twoBoards(), {
    configured: "999",
    projectYml: { boardNumber: "7" },
  });
  assert.equal(r2.item, null);
  assert.equal(r2.unmatchedRule, "github.projectBoard");

  // But an ABSENT tier still falls through normally.
  const r3 = cli.selectBoard(twoBoards(), { projectYml: { boardNumber: "7" } });
  assert.equal(r3.rule, "project.yml project_board_number");
});

test("selectBoard: project.yml's two keys are ONE tier — name is reachable past a stale number", () => {
  // `project_board_number` and `project_board_name` are two spellings of the
  // SAME board, so failing closed between them would make the name unreachable
  // whenever the number is set — which is the normal config — and a stale number
  // would refuse a move the name resolves perfectly well.
  const r = cli.selectBoard(twoBoards(), {
    projectYml: { boardNumber: "999", boardName: "Team Sprint" },
  });
  assert.equal(r.item.projectTitle, "Team Sprint");
  assert.equal(r.rule, "project.yml project_board_name");

  // Both wrong → still fails closed, and names both hints.
  const r2 = cli.selectBoard(twoBoards(), {
    projectYml: { boardNumber: "999", boardName: "Nope" },
  });
  assert.equal(r2.item, null);
  assert.equal(r2.reason, "ambiguous-board");
  assert.ok(
    r2.unmatchedHint.includes("999") && r2.unmatchedHint.includes("Nope"),
  );

  // The operator-supplied tiers keep their HARD stop — a wrong --board must not
  // be rescued by project.yml.
  const r3 = cli.selectBoard(twoBoards(), {
    board: "999",
    projectYml: { boardNumber: "7", boardName: "Team Sprint" },
  });
  assert.equal(r3.item, null);
  assert.equal(r3.unmatchedRule, "--board");
});

test("boardHintNumber: a non-numeric hint yields no add, never another board", () => {
  const yml = { boardNumber: "1", boardName: "Agent Skills" };
  // A numeric hint passes straight through.
  assert.equal(cli.boardHintNumber("12", "", yml), "12");
  // A TITLE hint yields "" — meaning "do not add". It must NOT fall back to
  // project.yml's number, which is a different board entirely; that is what used
  // to add the issue to one board while the status went to another.
  //
  // Resolving a title to a number would need the OWNER's project list. The only
  // read this CLI performs is issue-scoped, so it lists boards the issue is
  // already on — resolving against it could only ever "add" to a board the issue
  // is already on, which is a no-op. `--add-to-board` therefore needs a number.
  assert.equal(cli.boardHintNumber("Team Sprint", "", yml), "");
  assert.equal(cli.boardHintNumber("No Such Board", "", yml), "");
  // Absent hints fall through to the configured value, then project.yml.
  assert.equal(cli.boardHintNumber("", "4", yml), "4");
  assert.equal(cli.boardHintNumber("", "", yml), "1");
});

// ===========================================================================
// Integration — the run() flow, gh stubbed
// ===========================================================================

test("run: moves the card, and the verify re-read CONFIRMS the landed option", () => {
  const root = withRepo({
    "tracker-workflow.yaml": LADDER,
    "project.yml": PROJECT_YML,
  });
  // gh-status-verify carries the SAME itemId as gh-status-unset with the status
  // now set. Without a matching itemId the verify lookup misses, `landed` falls
  // back to the requested name, and the assertion below would pass even if the
  // re-read were deleted entirely — which is exactly how this test used to lie.
  const s = stubGh({ boardQueue: ["gh-status-unset", "gh-status-verify"] });
  const r = go(["--issue", "42", "--stage", "work-started"], s, root);
  assert.equal(r.exitCode, 0);
  assert.equal(r.transitioned, true);
  assert.equal(r.reason, "transitioned");
  assert.equal(r.to, "In Progress");
  assert.equal(
    r.verified,
    true,
    "the re-read agreed, so the move is confirmed",
  );
  const mutations = s.calls.filter((c) =>
    String(c[c.length - 1]).includes("mutation"),
  );
  assert.equal(mutations.length, 1);
  assert.ok(mutations[0][mutations[0].length - 1].includes("u-prog"));
  // Three gh api calls: read, mutate, verify-read.
  assert.equal(s.calls.filter((c) => c[0] === "api").length, 3);
});

test("run: a stale verify read does NOT overwrite the reported option, but IS surfaced", () => {
  const root = withRepo({
    "tracker-workflow.yaml": LADDER,
    "project.yml": PROJECT_YML,
  });
  // Both reads return the UNSET fixture — i.e. the second read has not caught up.
  // Believing it would report the move as landing on the old column, which is the
  // inverse of the silent-no-op detection the re-read exists for.
  const s = stubGh({ boardQueue: ["gh-status-unset", "gh-status-unset"] });
  const r = go(["--issue", "42", "--stage", "work-started"], s, root);
  assert.equal(r.transitioned, true);
  assert.equal(
    r.to,
    "In Progress",
    "falls back to the REQUESTED option, not the stale read",
  );
  assert.equal(r.verified, false, "and says so");
  // Discarding the observed value entirely would make a genuine silent no-op and
  // a merely lagging read byte-identical — which is the only thing the re-read
  // was ever for.
  assert.equal(
    r.observed,
    "",
    "the observed column is reported even when it disagrees",
  );
});

test("run: already there → no mutation issued", () => {
  // Board sits at "In Development"; the bespoke ladder's work-started target is
  // the same column, so this must short-circuit before any mutation.
  const root = withRepo({
    "tracker-workflow.yaml": BESPOKE_LADDER,
    "project.yml": PROJECT_YML,
  });
  const s = stubGh({ board: "gh-bespoke-columns" });
  const r = go(["--issue", "42", "--stage", "work-started"], s, root);
  assert.equal(r.reason, "already");
  assert.equal(r.exitCode, 0);
  assert.equal(
    s.calls.filter((c) => String(c[c.length - 1]).includes("mutation")).length,
    0,
  );
});

test("run: a bespoke board resolves through its own ladder", () => {
  const root = withRepo({
    "tracker-workflow.yaml": BESPOKE_LADDER,
    "project.yml": PROJECT_YML,
  });
  const s = stubGh({
    boardQueue: ["gh-bespoke-columns", "gh-bespoke-columns"],
  });
  const r = go(["--issue", "42", "--stage", "done"], s, root);
  assert.equal(r.transitioned, true);
  const mutation = s.calls.find((c) =>
    String(c[c.length - 1]).includes("mutation"),
  );
  assert.ok(mutation[mutation.length - 1].includes("b-shipped"));
});

test("run: not on any board → not-on-board, exit 0", () => {
  const root = withRepo({
    "tracker-workflow.yaml": LADDER,
    "project.yml": PROJECT_YML,
  });
  const s = stubGh({ board: "gh-not-on-board" });
  const r = go(["--issue", "42", "--stage", "done"], s, root);
  assert.equal(r.reason, "not-on-board");
  assert.equal(r.exitCode, 0);
});

test("run: no Status field → skip, not a crash", () => {
  const root = withRepo({
    "tracker-workflow.yaml": LADDER,
    "project.yml": PROJECT_YML,
  });
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
  const r = go(
    ["--issue", "42", "--stage", "in-review", "--board", "12"],
    s,
    root,
  );
  assert.equal(r.transitioned, true);
  const mutation = s.calls.find((c) =>
    String(c[c.length - 1]).includes("mutation"),
  );
  assert.ok(mutation[mutation.length - 1].includes("o-rev"));
});

test("run: no matching option → no-option listing what the board offered", () => {
  const root = withRepo({
    "tracker-workflow.yaml": LADDER,
    "project.yml": PROJECT_YML,
  });
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
  assert.equal(
    s.calls.filter((c) => String(c[c.length - 1]).includes("mutation")).length,
    0,
  );
});

// ===========================================================================
// Integration — the backward-move guard
// ===========================================================================

test("guard: allows a forward move (card behind the target)", () => {
  const root = withRepo({
    "tracker-workflow.yaml": LADDER,
    "project.yml": PROJECT_YML,
  });
  // Board 4 sits at "Todo" (rank 0); work-started targets "In Progress" (rank 1).
  // Forward, so the guard must NOT interfere.
  const s = stubGh({ board: "gh-two-boards-done-ids" });
  const r = go(
    ["--issue", "42", "--stage", "work-started", "--board", "4"],
    s,
    root,
  );
  assert.equal(r.transitioned, true);
  assert.equal(r.from, "Todo");
});

test("guard: refuses a lower-ranked target", () => {
  // The card sits at "Done" (rank 2); the moment targets "In Progress" (rank 1).
  // Strictly backwards — and on GitHub the guard is the ONLY thing that can
  // refuse it, since a single-select accepts any option from any other.
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
  const s = stubGh({ board: "gh-card-done" });
  const r = go(["--issue", "42", "--stage", "work-started"], s, root);
  assert.equal(r.reason, "would-regress");
  assert.equal(r.from, "Done");
  assert.equal(r.to, "In Progress");
  assert.equal(r.currentRank, 2);
  assert.equal(r.targetRank, 1);
  assert.equal(r.exitCode, 0);
  assert.equal(
    s.calls.filter((c) => String(c[c.length - 1]).includes("mutation")).length,
    0,
    "a refused move must issue no mutation",
  );
});

test("guard: would-regress when the card is past the target", () => {
  const root = withRepo({
    "tracker-workflow.yaml": LADDER,
    "project.yml": PROJECT_YML,
  });
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
  const r = go(
    ["--issue", "42", "--stage", "work-started", "--board", "1"],
    s,
    backwards,
  );
  assert.equal(r.reason, "would-regress");
  assert.equal(r.from, "In Progress");
  assert.equal(r.to, "Todo");
  assert.equal(r.exitCode, 0);
  assert.equal(
    s.calls.filter((c) => String(c[c.length - 1]).includes("mutation")).length,
    0,
  );
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
    [
      "--issue",
      "42",
      "--stage",
      "work-started",
      "--board",
      "1",
      "--allow-regress",
    ],
    s,
    backwards,
  );
  assert.equal(r.transitioned, true);
});

test("guard: unranked either side means no opinion — allow", () => {
  // Both the card's column ("Done") and the target ("Todo") are absent from this
  // ladder, so rankOf returns null for each and the guard must have no opinion —
  // even though this move is backwards by any ordinary reading. That is the
  // documented semantics, and it is the sharp edge of relying on the ladder: an
  // undeclared board gets no protection at all.
  //
  // The target must DIFFER from the card's current value, or resolveOption
  // short-circuits to `already` and the guard is never reached — which is what
  // made the earlier version of this test vacuous.
  const root = withRepo({
    "tracker-workflow.yaml": `
statuses:
  - Alpha
  - Omega
pipeline:
  work-started: Todo
`,
    "project.yml": PROJECT_YML,
  });
  const wf = tw.loadWorkflow({ repoRoot: root });
  assert.equal(tw.rankOf("Done", wf), null, "card's column is off-ladder");
  assert.equal(tw.rankOf("Todo", wf), null, "target is off-ladder too");

  const s = stubGh({ boardQueue: ["gh-card-done", "gh-card-done"] });
  const r = go(["--issue", "42", "--stage", "work-started"], s, root);
  assert.equal(r.reason, "transitioned", "unranked means allow, not refuse");
  assert.equal(r.transitioned, true);
  assert.equal(r.from, "Done");
  assert.equal(r.to, "Todo");
  assert.equal(
    s.calls.filter((c) => String(c[c.length - 1]).includes("mutation")).length,
    1,
    "the mutation really was issued — the guard did not intervene",
  );
});

// ===========================================================================
// Contract — --dry-run issues NO write
// ===========================================================================

test("--dry-run issues no mutation and no item-add, even with --add-to-board", () => {
  const root = withRepo({
    "tracker-workflow.yaml": LADDER,
    "project.yml": PROJECT_YML,
  });
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
  const root = withRepo({
    "tracker-workflow.yaml": LADDER,
    "project.yml": PROJECT_YML,
  });
  for (const board of ["gh-not-on-board", "gh-no-status-field"]) {
    const s = stubGh({ board });
    assert.equal(
      go(["--issue", "42", "--stage", "done"], s, root).exitCode,
      0,
      board,
    );
  }
  const amb = stubGh({ board: "gh-issue-on-two-boards" });
  assert.equal(go(["--issue", "42", "--stage", "done"], amb, root).exitCode, 0);
});

test("--strict turns a skip into exit 1", () => {
  const root = withRepo({
    "tracker-workflow.yaml": LADDER,
    "project.yml": PROJECT_YML,
  });
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
    cli.run({
      argv: ["node", "gh-stage.js", "--nope"],
      execImpl: s.execImpl,
      repoRoot: root,
    }).exitCode,
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

test("a mutation error envelope is retried 3×, then warned about, then exit 0", () => {
  const root = withRepo({
    "tracker-workflow.yaml": LADDER,
    "project.yml": PROJECT_YML,
  });
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
  // The count is the assertion that matters. A GraphQL error envelope is a
  // SUCCESSFUL process exit, so when the errors check sat outside the retried
  // closure withRetry never saw a failure and exactly one mutation was issued —
  // and this test passed anyway, because it only looked at the reason.
  assert.equal(
    s.calls.filter((c) => String(c[c.length - 1]).includes("mutation")).length,
    3,
    "a transient board-mutation failure must be retried, not given up on after one try",
  );
});

test("a mutation that succeeds on the second attempt is not reported as failed", () => {
  const root = withRepo({
    "tracker-workflow.yaml": LADDER,
    "project.yml": PROJECT_YML,
  });
  const s = stubGh({
    boardQueue: ["gh-status-unset", "gh-status-verify"],
    mutationResponses: [
      raw("gh-mutation-error"),
      JSON.stringify({
        data: { updateProjectV2ItemFieldValue: { projectV2Item: { id: "x" } } },
      }),
    ],
  });
  const r = go(["--issue", "42", "--stage", "work-started"], s, root);
  assert.equal(r.transitioned, true);
  assert.equal(
    s.calls.filter((c) => String(c[c.length - 1]).includes("mutation")).length,
    2,
  );
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
  const root = withRepo({
    "tracker-workflow.yaml": BESPOKE_LADDER,
    "project.yml": PROJECT_YML,
  });
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

test("--probe-board reports an unmatched hint accurately, even with one board", () => {
  // The message must not claim "you are on several boards — pass --board" when
  // the issue is on ONE board and --board was already passed. run() was given
  // this reporting in cycle 3; probeBoard was left behind.
  const root = withRepo({ "tracker-workflow.yaml": LADDER });
  const s = stubGh({ board: "gh-status-unset" }); // a single board, #1
  const r = go(["--probe-board", "--issue", "42", "--board", "999"], s, root);
  assert.equal(r.reason, "ambiguous-board");
  assert.equal(r.unmatchedHint, "999");
  assert.equal(r.unmatchedRule, "--board");
  assert.equal(r.partialRead, false);
  assert.deepEqual(s.calls.filter(isWrite), [], "probe stays read-only");
});

test("--probe-board surfaces a moment the board cannot serve", () => {
  const root = withRepo({
    "tracker-workflow.yaml": LADDER,
    "project.yml": PROJECT_YML,
  });
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

test("--write-ladder does NOT write under --dry-run", () => {
  // --dry-run is a no-write contract for the whole CLI. A filesystem write is
  // still a write, and this path used to make one.
  const root = withRepo({ "project.yml": PROJECT_YML });
  const s = stubGh({ board: "gh-bespoke-columns" });
  const r = go(
    ["--probe-board", "--write-ladder", "--dry-run", "--issue", "42"],
    s,
    root,
  );
  assert.equal(r.ladderWritten.written, false);
  assert.equal(r.ladderWritten.reason, "dry-run");
  assert.equal(
    existsSync(join(root, "tracker-workflow.yaml")),
    false,
    "--dry-run must leave the filesystem untouched",
  );
  // It still reports what it would have written, so the flag is useful.
  assert.deepEqual(r.ladderWritten.statuses, [
    "Backlog",
    "In Development",
    "Ready for Showcase",
    "Shipped",
  ]);
});

test("readBoard tolerates a PARTIAL-success envelope (errors + usable nodes)", () => {
  // GraphQL answers partially: an error for one board the token cannot see, plus
  // usable nodes for the rest. Throwing on any error would turn a perfectly
  // movable card into board-unreadable. A read is not a mutation.
  const root = withRepo({
    "tracker-workflow.yaml": LADDER,
    "project.yml": PROJECT_YML,
  });
  const partial = JSON.parse(raw("gh-status-unset"));
  partial.errors = [{ message: "Resource not accessible: ProjectV2 #99" }];
  const body = JSON.stringify(partial);
  const execImpl = (argv) => {
    if (argv[0] === "auth") return "ok";
    if (argv[0] === "repo")
      return argv.includes("owner") ? "Gamaroff" : "agent-skills";
    if (String(argv[argv.length - 1]).includes("mutation"))
      return JSON.stringify({
        data: { updateProjectV2ItemFieldValue: { projectV2Item: { id: "x" } } },
      });
    return body;
  };
  const r = cli.run({
    argv: ["node", "gh-stage.js", "--issue", "42", "--stage", "work-started"],
    execImpl,
    repoRoot: root,
    sleepImpl: noSleep,
  });
  assert.equal(r.transitioned, true, "a usable node means the move proceeds");
  assert.notEqual(r.reason, "board-unreadable");
});

test("a PARTIAL read must not let the one survivor bypass an explicit --board", () => {
  // The regression this pins, and it is the cycle-1 defect re-entering through
  // the door the partial-read tolerance opened: the operator names board 7, the
  // token cannot see board 7, so the read returns errors plus board 12 alone —
  // and a one-board short-circuit placed BEFORE the hint check writes the status
  // to board 12 without ever comparing its name. Silently, because under --json
  // output.warn is suppressed and that is how the pipelines call it.
  const root = withRepo({ "tracker-workflow.yaml": LADDER });
  const full = JSON.parse(raw("gh-issue-on-two-boards"));
  const partial = {
    data: {
      repository: {
        issue: {
          projectItems: {
            nodes: [full.data.repository.issue.projectItems.nodes[1]],
          },
        },
      },
    },
    errors: [{ message: "Resource not accessible: ProjectV2 #7" }],
  };
  const body = JSON.stringify(partial);
  const calls = [];
  const execImpl = (argv) => {
    calls.push(argv);
    if (argv[0] === "auth") return "ok";
    if (argv[0] === "repo")
      return argv.includes("owner") ? "Gamaroff" : "agent-skills";
    if (String(argv[argv.length - 1]).includes("mutation"))
      return JSON.stringify({
        data: { updateProjectV2ItemFieldValue: { projectV2Item: { id: "x" } } },
      });
    return body;
  };
  const r = cli.run({
    argv: [
      "node",
      "gh-stage.js",
      "--issue",
      "42",
      "--stage",
      "in-review",
      "--board",
      "7",
    ],
    execImpl,
    repoRoot: root,
    sleepImpl: noSleep,
  });
  assert.equal(r.reason, "ambiguous-board");
  assert.equal(
    calls.filter((c) => String(c[c.length - 1]).includes("mutation")).length,
    0,
    "must not write to the board that merely happened to survive the read",
  );
  // And the payload must carry the partial-read hint, because output.warn is
  // invisible under --json and the candidate list actively hides the reason:
  // the named board is missing precisely because it could not be read.
  assert.equal(r.partialRead, true);
  assert.equal(r.unmatchedRule, "--board");
});

test("readBoard surfaces a GraphQL error instead of reporting not-on-board", () => {
  // An errors-bearing response with a null repository used to degrade into an
  // empty node list, which reads as the benign 'this issue is not on a board'
  // skip — hiding a real auth/scope/rate-limit failure.
  const root = withRepo({
    "tracker-workflow.yaml": LADDER,
    "project.yml": PROJECT_YML,
  });
  const errBody = JSON.stringify({
    data: { repository: null },
    errors: [{ message: "Could not resolve to a Repository" }],
  });
  const calls = [];
  const execImpl = (argv) => {
    calls.push(argv);
    if (argv[0] === "auth") return "ok";
    if (argv[0] === "repo")
      return argv.includes("owner") ? "Gamaroff" : "agent-skills";
    return errBody;
  };
  const r = cli.run({
    argv: ["node", "gh-stage.js", "--issue", "42", "--stage", "work-started"],
    execImpl,
    repoRoot: root,
    sleepImpl: noSleep,
  });
  assert.equal(r.reason, "board-unreadable");
  assert.notEqual(r.reason, "not-on-board");
  assert.equal(r.exitCode, 0, "still a shrug, not a pipeline-killing exit");
});

test("--probe-board also rejects a non-numeric --issue", () => {
  // The validation used to live inside the non-probe branch, so the probe path
  // interpolated whatever it was given straight into the GraphQL document.
  const root = withRepo({ "tracker-workflow.yaml": LADDER });
  const s = stubGh({ board: "gh-status-unset" });
  const r = go(["--probe-board", "--issue", "42) { evil }"], s, root);
  assert.equal(r.exitCode, 2);
  assert.equal(
    s.calls.filter((c) => c[0] === "api").length,
    0,
    "must be rejected before any query is built",
  );
});

test("--write-ladder never overwrites an existing ladder", () => {
  const root = withRepo({
    "tracker-workflow.yaml": LADDER,
    "project.yml": PROJECT_YML,
  });
  const s = stubGh({ board: "gh-bespoke-columns" });
  const r = go(["--probe-board", "--write-ladder", "--issue", "42"], s, root);
  assert.equal(r.ladderWritten.written, false);
  assert.equal(r.ladderWritten.reason, "exists");
  assert.equal(
    readFileSync(join(root, "tracker-workflow.yaml"), "utf-8"),
    LADDER,
  );
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
    hints.some(
      (h) => h.includes("Ready for Showcase") && h.includes("in-review"),
    ),
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

test("--add-to-board with a NUMERIC hint adds to exactly that board", () => {
  const root = withRepo({ "tracker-workflow.yaml": LADDER });
  const s = stubGh({
    boardQueue: ["gh-issue-on-two-boards", "gh-issue-on-two-boards"],
  });
  const r = go(
    ["--issue", "42", "--stage", "in-review", "--board", "7", "--add-to-board"],
    s,
    root,
  );
  const adds = s.calls.filter((c) => c[1] === "item-add");
  assert.equal(adds.length, 1);
  assert.ok(
    adds[0].includes("7"),
    `added to board 7, got: ${adds[0].join(" ")}`,
  );
  assert.equal(r.transitioned, true);
});

test("--add-to-board with a TITLE hint skips the add rather than faking it", () => {
  // A title cannot become a board number here: `item-add` needs a number, and
  // the only read this CLI performs is issue-scoped — it lists boards the issue
  // is ALREADY on, so resolving a title against it could only ever "add" to a
  // board the issue is already on. That is a no-op costing a write, a 3s sleep
  // and a second read, so it is not attempted at all.
  //
  // The previous version of this test asserted exactly that redundant case and
  // passed because its fixture already contained the titled board — a vacuous
  // test of the kind cycle 1 spent a round removing.
  const root = withRepo({ "tracker-workflow.yaml": LADDER });
  const s = stubGh({ boardQueue: ["gh-issue-on-two-boards"] });
  const r = go(
    [
      "--issue",
      "42",
      "--stage",
      "in-review",
      "--board",
      "Team Sprint",
      "--add-to-board",
    ],
    s,
    root,
  );
  assert.equal(
    s.calls.filter((c) => c[1] === "item-add").length,
    0,
    "no add attempted",
  );
  // The status move itself still works — selectBoard matches on the title.
  assert.equal(r.transitioned, true);
  assert.equal(r.board, "Team Sprint");
});

test("--add-to-board with an unresolvable hint skips the add rather than guessing", () => {
  const root = withRepo({ "tracker-workflow.yaml": LADDER });
  const s = stubGh({ boardQueue: ["gh-issue-on-two-boards"] });
  const r = go(
    [
      "--issue",
      "42",
      "--stage",
      "in-review",
      "--board",
      "No Such Board",
      "--add-to-board",
    ],
    s,
    root,
  );
  assert.equal(
    s.calls.filter((c) => c[1] === "item-add").length,
    0,
    "no blind add",
  );
  // And the unmatched hint still fails closed on selection.
  assert.equal(r.reason, "ambiguous-board");
});

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
  const requires = [...src.matchAll(/require\(["']([^"']+)["']\)/g)].map(
    (m) => m[1],
  );
  assert.ok(
    !requires.some((r) => r.includes("jira-sync")),
    `a GitHub-only consumer must not bundle jira-sync.js; found: ${requires.join(", ")}`,
  );
  // The sibling list is pinned deliberately: this CLI ships to GitHub-only
  // consumers, and every require here is bundled with it. `defer-mutation.js`
  // (task.52) is on the list because the access gate needs it; it pulls in only
  // node built-ins, so the GitHub-only property above still holds transitively.
  assert.deepEqual(requires.filter((r) => r.startsWith(".")).sort(), [
    "./defer-mutation.js",
    "./tracker-workflow.js",
    "./yaml-subset.js",
  ]);

  const deferSrc = readFileSync(join(__dirname, "..", "defer-mutation.js"), "utf-8");
  const deferRequires = [...deferSrc.matchAll(/require\(["']([^"']+)["']\)/g)].map(
    (m) => m[1],
  );
  assert.deepEqual(
    // A module's own name appears in its usage example; that is a self-reference,
    // not a dependency.
    deferRequires.filter(
      (r) => r.startsWith(".") && !r.endsWith("defer-mutation.js"),
    ),
    [],
    "defer-mutation.js must stay dependency-free, or it drags its deps into " +
      "every GitHub-only consumer of gh-stage.js",
  );
});

// ── task.41: --init-workflow and --check ─────────────────────────────────────
//
// Two properties dominate this group:
//
//  - `--init-workflow` must never clobber a hand-authored ladder without being
//    told to. The file encodes a board's real column names, which nothing can
//    re-derive; losing it is silent, because the pipelines keep running and
//    simply stop moving cards.
//  - `--check` must EXIT NON-ZERO on failure. It is the only mode in this family
//    that does, which makes it the one a future contributor is most likely to
//    "harmonise" with the others. A --check that cannot fail is not a check.

test("--init-workflow writes a full workflow file from the live board", () => {
  const root = withRepo();
  const { execImpl } = stubGh({ board: "gh-status-unset" });
  const r = cli.run({
    argv: ["node", "gh-stage", "--init-workflow", "--issue", "1"],
    execImpl,
    repoRoot: root,
  });
  assert.equal(r.exitCode, 0);
  assert.equal(r.ladderWritten.written, true);

  const body = readFileSync(join(root, tw.DEFAULT_WORKFLOW_PATH), "utf-8");
  // The ladder is the board's own option order.
  assert.match(
    body,
    /statuses:\n {2}- "Todo"\n {2}- "In Progress"\n {2}- "Done"/,
  );
  // Enabled moments resolve to real columns; the rest are commented, never
  // silently dropped — an author needs to see the moment exists.
  assert.match(body, /^ {2}work-started: "In Progress"$/m);
  assert.match(body, /^ {2}done: "Done"$/m);
  assert.match(body, /^ {2}# changes-requested:/m);
  assert.match(body, /^ {2}# pr-merged:/m);
  // Every moment appears exactly once, commented or not.
  for (const m of tw.MOMENTS) {
    const hits = body
      .split("\n")
      .filter((l) => new RegExp(`^ {2}#? ?${m}:`).test(l));
    assert.equal(hits.length, 1, `${m} must appear exactly once in pipeline:`);
  }
});

test("--init-workflow refuses to overwrite; --force overwrites", () => {
  const root = withRepo({
    [tw.DEFAULT_WORKFLOW_PATH]: "statuses:\n  - Mine\n",
  });
  const mk = () => stubGh({ board: "gh-status-unset" }).execImpl;

  const refused = cli.run({
    argv: ["node", "gh-stage", "--init-workflow", "--issue", "1"],
    execImpl: mk(),
    repoRoot: root,
  });
  assert.equal(refused.exitCode, 0, "refusing is not an error — it exits 0");
  assert.equal(refused.ladderWritten.reason, "exists");
  assert.equal(
    readFileSync(join(root, tw.DEFAULT_WORKFLOW_PATH), "utf-8"),
    "statuses:\n  - Mine\n",
    "the hand-authored file must be byte-identical after a refused run",
  );

  const forced = cli.run({
    argv: ["node", "gh-stage", "--init-workflow", "--force", "--issue", "1"],
    execImpl: mk(),
    repoRoot: root,
  });
  assert.equal(forced.ladderWritten.written, true);
  assert.match(
    readFileSync(join(root, tw.DEFAULT_WORKFLOW_PATH), "utf-8"),
    /- "Todo"/,
  );
});

test("--write-ladder still writes a statuses-only ladder (unchanged by --init-workflow)", () => {
  const root = withRepo();
  const { execImpl } = stubGh({ board: "gh-status-unset" });
  cli.run({
    argv: [
      "node",
      "gh-stage",
      "--probe-board",
      "--write-ladder",
      "--issue",
      "1",
    ],
    execImpl,
    repoRoot: root,
  });
  const body = readFileSync(join(root, tw.DEFAULT_WORKFLOW_PATH), "utf-8");
  assert.match(
    body,
    /--probe-board --write-ladder/,
    "keeps its own provenance header",
  );
  assert.ok(
    !/^pipeline:/m.test(body),
    "bare --write-ladder must NOT emit a pipeline block",
  );
});

test("--check exits 0 on a clean file and issues no board call under --offline", () => {
  const root = withRepo({
    [tw.DEFAULT_WORKFLOW_PATH]:
      "statuses:\n  - Todo\n  - In Progress\n  - Done\npipeline:\n  work-started: In Progress\n  done: Done\n",
  });
  const { execImpl, calls } = stubGh({ board: "gh-status-unset" });
  const r = cli.run({
    argv: ["node", "gh-stage", "--check", "--offline"],
    execImpl,
    repoRoot: root,
  });
  assert.equal(r.exitCode, 0);
  assert.equal(r.reason, "ok-offline");
  assert.deepEqual(calls, [], "--offline must issue NO network call at all");
});

test("--check exits NON-ZERO on an unknown moment and a duplicate rung", () => {
  const root = withRepo({
    [tw.DEFAULT_WORKFLOW_PATH]:
      "statuses:\n  - Todo\n  - In Progress\n  - Todo\npipeline:\n  work-started: In Progress\n  not-a-moment: Todo\n",
  });
  const r = cli.run({
    argv: ["node", "gh-stage", "--check", "--offline"],
    execImpl: stubGh().execImpl,
    repoRoot: root,
  });
  assert.equal(
    r.exitCode,
    1,
    "a broken file MUST fail — this is the inverted contract",
  );
  assert.equal(r.reason, "invalid");
  assert.ok(r.messages.some((m) => /unknown moment/.test(m)));
  assert.ok(r.messages.some((m) => /may sit at only one position/.test(m)));
});

test("--check catches a RENAMED column against the live board", () => {
  // The payload case. The file parses, every moment names a status, and nothing
  // moves — invisible until someone notices cards sitting still.
  const root = withRepo({
    [tw.DEFAULT_WORKFLOW_PATH]:
      "statuses:\n  - Todo\n  - Code Review\n  - Done\npipeline:\n  work-started: Code Review\n  done: Done\n",
  });
  const { execImpl } = stubGh({ board: "gh-status-unset" });
  const r = cli.run({
    argv: ["node", "gh-stage", "--check", "--issue", "1"],
    execImpl,
    repoRoot: root,
  });
  assert.equal(r.exitCode, 1);
  assert.equal(r.reason, "drift");
  assert.equal(r.drift[0].moment, "work-started");

  // …and the offline half passes on the very same file, which is why the board
  // half has to exist at all.
  const off = cli.run({
    argv: ["node", "gh-stage", "--check", "--offline"],
    execImpl: stubGh().execImpl,
    repoRoot: root,
  });
  assert.equal(off.exitCode, 0);
});

test("--check exits 0 with no credentials — a fork's PR cannot hold the secret", () => {
  const root = withRepo({
    [tw.DEFAULT_WORKFLOW_PATH]:
      "statuses:\n  - Todo\n  - In Progress\npipeline:\n  work-started: In Progress\n",
  });
  const { execImpl } = stubGh({ authOk: false });
  const r = cli.run({
    argv: ["node", "gh-stage", "--check", "--issue", "1"],
    execImpl,
    repoRoot: root,
  });
  assert.equal(r.exitCode, 0, "missing credentials is a skip, never a failure");
  assert.equal(r.reason, "no-credentials");
});

test("--check exits 0 when there is no file to check", () => {
  const root = withRepo();
  const r = cli.run({
    argv: ["node", "gh-stage", "--check", "--offline"],
    execImpl: stubGh().execImpl,
    repoRoot: root,
  });
  assert.equal(r.exitCode, 0);
  assert.equal(r.reason, "no-file");
});

test("--check never writes, even when the file would be regenerated", () => {
  const before =
    "statuses:\n  - Todo\n  - Code Review\npipeline:\n  work-started: Code Review\n";
  const root = withRepo({ [tw.DEFAULT_WORKFLOW_PATH]: before });
  cli.run({
    argv: ["node", "gh-stage", "--check", "--issue", "1"],
    execImpl: stubGh({ board: "gh-status-unset" }).execImpl,
    repoRoot: root,
  });
  assert.equal(
    readFileSync(join(root, tw.DEFAULT_WORKFLOW_PATH), "utf-8"),
    before,
    "--check is read-only; it reports drift, it does not fix it",
  );
});

test("the inverted --check exit code is documented as deliberate, and shimmed", () => {
  // Guards against exactly the "harmonisation" §10 predicts: someone making
  // --check exit 0 like every other mode, producing a CI check that cannot fail.
  const src = readFileSync(join(__dirname, "..", "gh-stage.js"), "utf-8");
  assert.match(
    src,
    /ONE mode in this family that exits non-zero/,
    "the inversion must carry a comment saying why, or it will be 'fixed'",
  );
  assert.match(
    src,
    /process\.exit\(process\.argv\.includes\("--check"\) \? 1 : 0\)/,
    "the module shim must not swallow a --check failure to exit 0",
  );
});

test("every non-check mode still exits 0 on a documented skip", () => {
  // The other half of the contract: only --check inverts.
  const root = withRepo({
    [tw.DEFAULT_WORKFLOW_PATH]: "statuses:\n  - Todo\npipeline: {}\n",
  });
  const r = cli.run({
    argv: ["node", "gh-stage", "--issue", "1", "--stage", "work-started"],
    execImpl: stubGh({ board: "gh-status-unset" }).execImpl,
    repoRoot: root,
  });
  assert.equal(r.exitCode, 0);
  assert.equal(r.reason, "stage-disabled");
});
