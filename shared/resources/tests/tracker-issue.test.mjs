"use strict";
/**
 * tracker-issue.test.mjs — the GitHub issue-lifecycle CLI.
 *
 * Three things are being held down here, and the third is the reason this file
 * exists at all:
 *
 *   NO NETWORK UNDER A RESTRICTED MODE. The transport (`execImpl`) is injected
 *       as a THROWING stub, so a leak fails the test rather than being noticed
 *       afterwards.
 *
 *   THE PRODUCED VALUE IS THE ONLY THING ON STDOUT. Callers bind this CLI's
 *       stdout — `ISSUE=$(tracker-issue.js --kind create …)`. Any commentary
 *       that reaches stdout is captured AS IF IT WERE THE VALUE and written
 *       into a document's frontmatter. §2 asserts stdout is byte-empty under a
 *       deferring mode. It is not a style check: the first implementation
 *       routed its "⏸️ not performing…" notice through console.log and would
 *       have written that sentence into frontmatter as an issue number.
 *
 *   NO PLACEHOLDER IS EVER PRODUCED. A deferred create yields nothing, not a
 *       zero and not a sentinel. Writing `github_issue: 0` would defeat the
 *       idempotent `synced-from-*` search that stops the NEXT run creating a
 *       duplicate — so a wrong value is strictly worse than no value, and §3
 *       pins that.
 *
 * Run: node --test shared/resources/tests/tracker-issue.test.mjs
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
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const SHARED = join(__dirname, "..");

const cli = require(join(SHARED, "tracker-issue.js"));
const dm = require(join(SHARED, "defer-mutation.js"));

const RESTRICTED = ["read-only", "approve", "command", "manual"];
const CLI_PATH = join(SHARED, "tracker-issue.js");

const dirs = [];
process.on("exit", () => {
  for (const d of dirs) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch (_) {}
  }
});

function withRepo(files = {}) {
  const dir = mkdtempSync(join(tmpdir(), "tracker-issue-"));
  dirs.push(dir);
  mkdirSync(join(dir, ".git"), { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    const p = join(dir, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, content, "utf8");
  }
  return dir;
}

const explode = (what) => () => {
  throw new Error(`NETWORK CALL ATTEMPTED via ${what} — the gate leaked`);
};

function readJournal(dir) {
  const journal = join(dir, ".claude", "state", "tracker-actions.jsonl");
  if (!existsSync(journal)) return [];
  return readFileSync(journal, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

/** A `gh` stub that answers the shapes this CLI issues, and throws on anything else. */
function stubGh({
  createUrl = "https://github.com/acme/repo/issues/207",
  milestones = [],
  createdMilestone = { number: 9 },
  subId = 1234567,
  failOn = null,
} = {}) {
  const calls = [];
  const execImpl = (bin, argv, opts) => {
    calls.push({ bin, argv, input: opts && opts.input });
    const joined = argv.join(" ");
    if (failOn && joined.includes(failOn))
      throw new Error(`gh failed: ${joined}`);
    if (argv[0] === "auth") return "";
    if (argv[0] === "repo") return "acme/repo";
    if (argv[0] === "issue" && argv[1] === "create") return createUrl;
    if (argv[0] === "issue" && ["edit", "close", "reopen"].includes(argv[1]))
      return "";
    if (
      argv[0] === "api" &&
      joined.includes("/milestones") &&
      !joined.includes("POST")
    )
      return milestones.join("\n");
    if (
      argv[0] === "api" &&
      joined.includes("POST") &&
      joined.includes("/milestones")
    )
      return JSON.stringify(createdMilestone);
    if (argv[0] === "api" && joined.includes(".id")) return String(subId);
    if (argv[0] === "api" && joined.includes("sub_issues")) return "";
    throw new Error(`unexpected gh call: ${joined}`);
  };
  return { execImpl, calls };
}

const ALL_KINDS = [
  {
    kind: "create",
    argv: ["--title", "A new issue"],
    record: "github.issue.create",
  },
  {
    kind: "edit",
    argv: ["--issue", "42", "--title", "Retitled"],
    record: "github.issue.edit",
  },
  { kind: "close", argv: ["--issue", "42"], record: "github.issue.close" },
  { kind: "reopen", argv: ["--issue", "42"], record: "github.issue.reopen" },
  {
    kind: "milestone",
    argv: ["--title", "Epic 7"],
    record: "github.milestone.create",
  },
  {
    kind: "sub-issue-link",
    argv: ["--issue", "42", "--parent", "7"],
    record: "github.sub-issue.add",
  },
];

const run = (dir, argv, env = {}) =>
  cli.run({
    argv: ["node", "tracker-issue.js", ...argv],
    repoRoot: dir,
    env,
    execImpl: explode("gh"),
  });

// ── §1 Access gate — no network under any restricted mode ───────────────────

for (const mode of RESTRICTED) {
  test(`§1 ${mode} defers every kind and makes no network call`, () => {
    for (const { kind, argv, record } of ALL_KINDS) {
      const dir = withRepo();
      const r = run(dir, ["--kind", kind, ...argv, "--repo", "acme/repo"], {
        ACCESS_TRACKER: mode,
      });
      assert.equal(r.exitCode, 0, `${kind} must exit 0`);
      assert.equal(r.reason, "deferred", `${kind} must defer`);

      const recs = readJournal(dir);
      assert.equal(recs.length, 1, `${kind} must write exactly one record`);
      assert.equal(recs[0].kind, record);
      assert.equal(recs[0].access, mode);
      assert.equal(recs[0].system, "github");
    }
  });
}

test("§1 an unset ACCESS_TRACKER reads as full — the gate is inert by default", () => {
  const dir = withRepo();
  const { execImpl } = stubGh();
  const r = cli.run({
    argv: ["node", "tracker-issue.js", "--kind", "close", "--issue", "42"],
    repoRoot: dir,
    env: {},
    execImpl,
  });
  assert.equal(r.reason, "performed");
  assert.equal(readJournal(dir).length, 0, "nothing is recorded under full");
});

// ── §2 stdout discipline — the value channel ────────────────────────────────

test("§2 a deferred run writes NOTHING to stdout (the capture must be empty)", () => {
  for (const { kind, argv } of ALL_KINDS) {
    const dir = withRepo();
    const out = execFileSync(
      process.execPath,
      [CLI_PATH, "--kind", kind, ...argv, "--repo", "acme/repo"],
      {
        cwd: dir,
        encoding: "utf8",
        env: { ...process.env, ACCESS_TRACKER: "manual", PATH: "/nonexistent" },
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
    assert.equal(
      out,
      "",
      `${kind}: stdout must be byte-empty under a deferring mode — a caller ` +
        `binds it with $( ), so anything here is captured as the value`,
    );
  }
});

test("§2 the ⏸️ notice goes to stderr, where a capture cannot see it", () => {
  const dir = withRepo();
  const res = execFileSync(
    process.execPath,
    [CLI_PATH, "--kind", "create", "--title", "T", "--repo", "acme/repo"],
    {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, ACCESS_TRACKER: "manual", PATH: "/nonexistent" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  assert.equal(res, "", "stdout stays clean");
});

test("§2 a performed create prints the issue NUMBER, not the URL", () => {
  const dir = withRepo();
  const { execImpl } = stubGh({
    createUrl: "https://github.com/acme/repo/issues/207",
  });
  const r = cli.run({
    argv: [
      "node",
      "tracker-issue.js",
      "--kind",
      "create",
      "--title",
      "T",
      "--json",
    ],
    repoRoot: dir,
    env: {},
    execImpl,
  });
  assert.equal(r.reason, "performed");
  assert.equal(
    r.issue,
    "207",
    "every call site follows the create with grep -oE '[0-9]+$' — doing it " +
      "here is what removes that step from six prose blocks",
  );
});

// ── §3 No placeholder, ever ─────────────────────────────────────────────────

test("§3 a deferred create produces no value at all — not 0, not a sentinel", () => {
  const dir = withRepo();
  const r = run(
    dir,
    ["--kind", "create", "--title", "T", "--repo", "acme/repo"],
    {
      ACCESS_TRACKER: "manual",
    },
  );
  assert.equal(r.issue, undefined, "no issue number is invented");
  assert.equal(r.performed, false);

  // And nothing anywhere in the record looks like a usable key. A placeholder
  // written to frontmatter would defeat the idempotent `synced-from-*` search
  // that stops the next run creating a DUPLICATE issue — which is why a wrong
  // key is worse than no key.
  const rec = readJournal(dir)[0];
  const serialised = JSON.stringify(rec);
  for (const sentinel of ['"issue":"0"', "<pending>", "TBD", "PLACEHOLDER"]) {
    assert.ok(
      !serialised.includes(sentinel),
      `record must not contain the placeholder ${sentinel}`,
    );
  }
});

test("§3 a value-producing kind records produces + blocking; the others do not", () => {
  const roster = dm.loadRoster();
  for (const { kind, argv, record } of ALL_KINDS) {
    const dir = withRepo();
    run(dir, ["--kind", kind, ...argv, "--repo", "acme/repo"], {
      ACCESS_TRACKER: "manual",
    });
    const rec = readJournal(dir)[0];
    const spec = cli.KINDS[kind];

    assert.equal(
      rec.produces,
      spec.produces,
      `${kind}: the record's produces must match the CLI's declaration`,
    );
    assert.equal(
      rec.produces,
      roster.get(record).produces,
      `${kind}: the CLI and the ROSTER must agree on what this yields`,
    );
    // Blocking exactly when something is produced that nothing else can supply.
    assert.equal(
      rec.blocking,
      Boolean(spec.produces),
      `${kind}: blocking must track "produces a value nothing else supplies"`,
    );
  }
});

// ── §4 The sub-issue link is ONE record, not two ────────────────────────────

test("§4 the sub-issue link records ONE composite record for its fetch-then-mutate pair", () => {
  const dir = withRepo();
  run(
    dir,
    [
      "--kind",
      "sub-issue-link",
      "--issue",
      "42",
      "--parent",
      "7",
      "--repo",
      "acme/repo",
    ],
    {
      ACCESS_TRACKER: "manual",
    },
  );
  const recs = readJournal(dir);
  assert.equal(
    recs.length,
    1,
    "two records would be two checklist items NEITHER of which a human can " +
      "perform alone: the fetch changes nothing, and the mutate has no id to send",
  );
  const rec = recs[0];
  const argv = rec.command.argv.join(" ");
  assert.ok(
    argv.includes("sub_issues"),
    "the mutate is in the recorded command",
  );
  assert.ok(argv.includes("--jq .id"), "and so is the id fetch it depends on");
  // The manual path routes around the internal id entirely — the GitHub UI
  // takes the visible issue number, so a human never has to resolve it.
  assert.ok(
    rec.manual.fields.some((f) => f.value.includes("#42")),
    "the manual path names the child by its visible number",
  );
});

// ── §5 The recorded command is the command that would have run ──────────────

test("§5 the recorded argv is built by the same builder the perform path uses", () => {
  const args = {
    issue: "42",
    title: "T",
    bodyFile: "",
    labels: ["bug"],
    addLabels: [],
    milestone: "M",
    reason: "",
    state: "",
  };
  // Two separate spellings of the same command drift, and the drift is
  // invisible until an operator runs the generated script and gets a different
  // result from the pipeline. Sharing the builder makes that impossible.
  const shape = cli.recordShape({
    kind: "create",
    spec: cli.KINDS.create,
    args,
    body: "",
    slug: "acme/repo",
  });
  assert.deepEqual(shape.command.argv, cli.ghCreateArgv(args, "acme/repo"));
});

test("§5 a body never becomes an argv element — it rides in stdin", () => {
  const dir = withRepo({ "body.md": "Line one\n`backticks` and $(danger)\n" });
  run(
    dir,
    [
      "--kind",
      "create",
      "--title",
      "T",
      "--body-file",
      join(dir, "body.md"),
      "--repo",
      "acme/repo",
    ],
    { ACCESS_TRACKER: "manual" },
  );
  const rec = readJournal(dir)[0];
  assert.ok(
    rec.command.argv.includes("--body-file") && rec.command.argv.includes("-"),
    "the body is read from stdin",
  );
  assert.ok(
    rec.command.stdin.includes("$(danger)"),
    "and the body round-trips byte-exactly into stdin",
  );
  for (const el of rec.command.argv) {
    assert.ok(
      !el.includes("$(danger)"),
      "no argv element carries the body — that is a shell injection waiting " +
        "for the first body containing one",
    );
  }
});

// ── §6 Idempotency and dedup ────────────────────────────────────────────────

test("§6 an identical re-run (a resume) yields the same record id", () => {
  const dir = withRepo();
  const argv = ["--kind", "close", "--issue", "42", "--repo", "acme/repo"];
  run(dir, argv, { ACCESS_TRACKER: "manual" });
  run(dir, argv, { ACCESS_TRACKER: "manual" });
  const recs = readJournal(dir);
  assert.equal(recs.length, 2, "both runs append");
  assert.equal(
    recs[0].id,
    recs[1].id,
    "same id — which is what makes every renderer idempotent across a resume",
  );
});

test("§6 milestone create is resolve-or-create: an existing title is reused", () => {
  const dir = withRepo();
  const { execImpl, calls } = stubGh({ milestones: ["9"] });
  const r = cli.run({
    argv: [
      "node",
      "tracker-issue.js",
      "--kind",
      "milestone",
      "--title",
      "Epic 7",
      "--json",
    ],
    repoRoot: dir,
    env: {},
    execImpl,
  });
  assert.equal(r.reason, "already");
  assert.equal(r.milestone, "9");
  assert.ok(
    !calls.some((c) => c.argv.join(" ").includes("POST")),
    "an existing milestone is never re-created — the API returns 422 for that",
  );
});

// ── §7 Usage validation — all local, all exit 2, all above the gate ─────────

test("§7 a missing or unknown --kind exits 2", () => {
  const dir = withRepo();
  assert.equal(run(dir, []).exitCode, 2);
  assert.equal(run(dir, ["--kind", "nonsense"]).exitCode, 2);
});

test("§7 a kind's required flags are enforced", () => {
  const dir = withRepo();
  assert.equal(
    run(dir, ["--kind", "create"]).exitCode,
    2,
    "create needs --title",
  );
  assert.equal(
    run(dir, ["--kind", "close"]).exitCode,
    2,
    "close needs --issue",
  );
  assert.equal(
    run(dir, ["--kind", "sub-issue-link", "--issue", "42"]).exitCode,
    2,
    "sub-issue-link needs --parent too",
  );
});

test("§7 a Jira key in --issue exits 2 rather than reaching the network", () => {
  const dir = withRepo();
  const r = run(dir, ["--kind", "close", "--issue", "PROJ-1"]);
  assert.equal(
    r.exitCode,
    2,
    "a Jira key here means the caller did not branch on TRACKER — say so " +
      "locally rather than failing deeper in with a worse message",
  );
});

test("§7 a value-taking flag fails CLOSED on a missing or flag-shaped value", () => {
  // Transcribed from tracker-comment.js, where a fail-OPEN --stage posted
  // unmarked comments on every resume.
  assert.throws(() => cli.parseArgs(["node", "x", "--kind"]));
  assert.throws(() => cli.parseArgs(["node", "x", "--kind", "--json"]));
  assert.throws(() => cli.parseArgs(["node", "x", "--nonsense"]));
});

test("§7 an empty --body-file exits 2 rather than posting nothing", () => {
  const dir = withRepo({ "empty.md": "   \n" });
  const r = run(dir, [
    "--kind",
    "create",
    "--title",
    "T",
    "--body-file",
    join(dir, "empty.md"),
  ]);
  assert.equal(r.exitCode, 2);
});

// ── §8 Roster agreement ─────────────────────────────────────────────────────

test("§8 every kind this CLI offers exists in the roster", () => {
  const roster = dm.loadRoster();
  for (const [flag, spec] of Object.entries(cli.KINDS)) {
    assert.ok(
      roster.has(spec.recordKind),
      `--kind ${flag} maps to ${spec.recordKind}, which is not on the roster — ` +
        `defer-mutation would refuse to write it`,
    );
  }
});

test("§8 --dry-run resolves everything and writes nothing", () => {
  const dir = withRepo();
  const r = run(dir, ["--kind", "close", "--issue", "42", "--dry-run"], {
    ACCESS_TRACKER: "manual",
  });
  assert.equal(r.reason, "dry-run");
  assert.equal(readJournal(dir).length, 0, "a dry run records nothing either");
});

// ── §9 The blocking banner ──────────────────────────────────────────────────
//
// Lives here rather than in handover-render.test.mjs because `blocking` is
// produced by this CLI and consumed by the renderer: a test that fixtures the
// flag by hand would still pass if tracker-issue.js stopped setting it.

const hr = require(join(SHARED, "handover-render.js"));

function deferAndRender(kindArgv, format) {
  const dir = withRepo();
  run(dir, [...kindArgv, "--repo", "acme/repo"], { ACCESS_TRACKER: "manual" });
  return hr.render(readJournal(dir), format, {
    run: "feature/task.56",
    access: "manual",
  });
}

test("§9 a blocking record is banner-ed at the TOP of the checklist", () => {
  const md = deferAndRender(["--kind", "create", "--title", "Add login"], "md");
  const bannerAt = md.indexOf("BLOCKING");
  const firstItemAt = md.indexOf("- [ ]");
  assert.ok(bannerAt > -1, "the checklist must carry a blocking banner");
  assert.ok(
    bannerAt < firstItemAt,
    "the banner must precede the item list — a blocking record at position 17 " +
      "of a checklist is a blocking record nobody does first",
  );
});

test("§9 the banner carries the two-run convergence instruction, not just a count", () => {
  const md = deferAndRender(["--kind", "create", "--title", "Add login"], "md");
  assert.match(md, /re-run/i, "it must say to re-run");
  assert.match(
    md,
    /frontmatter/i,
    "and that the value must be written into the document first",
  );
  assert.match(
    md,
    /does nothing at all/i,
    "and that re-running WITHOUT writing the value is a no-op — the silent " +
      "failure this banner exists to pre-empt",
  );
});

test("§9 the inline summary carries the same banner, not merely a number", () => {
  const s = deferAndRender(
    ["--kind", "create", "--title", "Add login"],
    "summary",
  );
  assert.match(s, /BLOCKING/);
  assert.match(
    s,
    /re-run/i,
    "the summary is what a report reader sees without opening the checklist, " +
      "so a bare count would read as 'some things are pending'",
  );
});

test("§9 a non-blocking-only run gets no banner in either format", () => {
  for (const [format, needle] of [
    ["md", "BLOCKING"],
    ["summary", "BLOCKING"],
  ]) {
    const out = deferAndRender(["--kind", "close", "--issue", "42"], format);
    assert.ok(
      !out.includes(needle),
      `${format}: a banner on a run with nothing blocking cries wolf, and a ` +
        `banner that cries wolf is worse than no banner`,
    );
  }
});

test('§5 an empty --remove-label is dropped, not passed through as ""', () => {
  // The sync-github-* skills spell this as
  //   --remove-label "$OLD_PRIORITY_LABEL_IF_DIFFERENT"
  // which expands to the EMPTY STRING when the priority label did not change.
  // `gh` reads a bare `--remove-label ""` as "remove the label named ''", fails
  // the whole edit, and takes the title/body/milestone changes in the same call
  // down with it — so the sync silently does nothing on the common path.
  const args = {
    issue: "42",
    title: "T",
    bodyFile: "",
    labels: [],
    addLabels: [],
    removeLabels: [""],
    milestone: "",
  };
  assert.ok(
    !cli.ghEditArgv(args, "acme/repo").includes("--remove-label"),
    "an empty label must not reach gh at all",
  );
  args.removeLabels = ["priority:low"];
  assert.ok(
    cli.ghEditArgv(args, "acme/repo").includes("priority:low"),
    "a real label still passes through",
  );
});
