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
import { execFileSync, spawnSync } from "node:child_process";

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
  milestoneTitle = "Epic 7",
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
      // NDJSON — one compact object per line, which is what the constant
      // `--jq '.[] | {number, title}'` filter emits. A faithful stub is what
      // lets these tests catch a parsing regression.
      return milestones
        .map((n) =>
          JSON.stringify({ number: Number(n), title: milestoneTitle }),
        )
        .join("\n");
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
  // Assert BOTH halves. The earlier version checked only that stdout was empty,
  // which the preceding test already covers — so it would have passed with
  // info() deleted entirely and the operator told nothing at all. An empty
  // stdout is only half the contract; the other half is that the notice still
  // reaches a human.
  const res = spawnSync(
    process.execPath,
    [CLI_PATH, "--kind", "create", "--title", "T", "--repo", "acme/repo"],
    {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, ACCESS_TRACKER: "manual", PATH: "/nonexistent" },
    },
  );
  assert.equal(res.stdout, "", "stdout stays clean — it is the value channel");
  assert.match(
    res.stderr,
    /⏸️.*recorded as/,
    "and the deferral notice still reaches the operator, on stderr",
  );
});

test("§2 a performed create prints the issue NUMBER to STDOUT", () => {
  // END-TO-END, through a real subprocess and a fake `gh` on PATH.
  //
  // The earlier version passed --json and asserted on the returned payload,
  // which is NOT the contract: callers bind stdout —
  //   ISSUE_NUM=$(node references/tracker-issue.js --kind create …)
  // — so deleting `output.value(num)` left that capture empty while the test
  // stayed green. Demonstrated by reverting the line: the payload assertion
  // held. This is the single most important behaviour in the file, so it is
  // now exercised the way a caller exercises it.
  const dir = withRepo();
  const bin = join(dir, "bin");
  mkdirSync(bin, { recursive: true });
  writeFileSync(
    join(bin, "gh"),
    [
      "#!/bin/sh",
      'case "$1 $2" in',
      '  "auth status") exit 0 ;;',
      '  "repo view") echo acme/repo ;;',
      '  "issue create") echo https://github.com/acme/repo/issues/207 ;;',
      "  *) exit 1 ;;",
      "esac",
    ].join("\n"),
    { mode: 0o755 },
  );

  const res = spawnSync(
    process.execPath,
    [CLI_PATH, "--kind", "create", "--title", "T", "--repo", "acme/repo"],
    {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
    },
  );

  assert.equal(
    res.stdout,
    "207\n",
    "stdout must carry the NUMBER and nothing else — every call site used to " +
      "follow the create with grep -oE '[0-9]+$', and doing it here is what " +
      "removed that step from six prose blocks",
  );
  assert.equal(res.status, 0);
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

// ── §10 QA cycle 1 fixes ────────────────────────────────────────────────────

test("§10 a deferred record never carries an unexpanded $OWNER/$REPO", () => {
  // handover-render.js POSIX-single-quotes every argv element, so a literal
  // `$OWNER/$REPO` reaches `gh api` verbatim and 404s. The `sh` renderer exists
  // to be RUNNABLE; an unexpanded variable in it is the one thing that makes it
  // not. The slug is now read from the git remote — a LOCAL read, so the gate's
  // no-network promise is untouched.
  // NOTE: --repo is deliberately NOT passed. An explicit --repo wins on every
  // path, so a test that supplies it proves nothing about the resolution this
  // guards — it passed against the old --repo-only code too. The repo fixture
  // carries a real `origin` remote instead, which is what the fixed code reads.
  for (const [kind, argv] of [
    ["milestone", ["--title", "Epic 7"]],
    ["sub-issue-link", ["--issue", "42", "--parent", "7"]],
  ]) {
    const dir = withRepo();
    execFileSync("git", ["init", "-q"], { cwd: dir });
    execFileSync(
      "git",
      ["remote", "add", "origin", "git@github.com:acme/repo.git"],
      { cwd: dir },
    );
    run(dir, ["--kind", kind, ...argv], { ACCESS_TRACKER: "manual" });
    const rec = readJournal(dir)[0];
    const serialised = JSON.stringify(rec.command.argv);
    assert.ok(
      !serialised.includes("$OWNER") && !serialised.includes("$REPO"),
      `${kind}: recorded argv still carries an unexpanded shell variable: ${serialised}`,
    );
    assert.ok(
      serialised.includes("acme/repo"),
      `${kind}: the resolved slug must appear in the recorded command`,
    );
  }
});

test("§10 --reason is validated and the underscore form normalised", () => {
  const dir = withRepo();
  // The sync skills pass `not_planned` (the REST spelling). `gh` accepts only
  // `completed | not planned | duplicate`, so the underscore form silently
  // failed every cancelled close.
  const { execImpl, calls } = stubGh();
  cli.run({
    argv: [
      "node",
      "x",
      "--kind",
      "close",
      "--issue",
      "42",
      "--reason",
      "not_planned",
    ],
    repoRoot: dir,
    env: {},
    execImpl,
  });
  const closeCall = calls.find((c) => c.argv[1] === "close");
  assert.ok(
    closeCall.argv.includes("not planned"),
    "not_planned must be normalised to the spelling gh accepts",
  );

  // And an unknown reason is a usage error, not something gh discovers later.
  assert.equal(
    run(dir, ["--kind", "close", "--issue", "42", "--reason", "nonsense"])
      .exitCode,
    2,
  );
});

test("§10 a milestone title containing a quote does not break the lookup", () => {
  const dir = withRepo();
  // The title used to be interpolated into a jq program, so a double quote was
  // a jq syntax error — which surfaced as "no match" and led to a blind POST
  // and a 422. Titles are compared in JavaScript now.
  const nasty = 'Epic 3 — the "new" flow';
  const { execImpl, calls } = stubGh({
    milestones: ["9"],
    milestoneTitle: nasty,
  });
  const r = cli.run({
    argv: ["node", "x", "--kind", "milestone", "--title", nasty, "--json"],
    repoRoot: dir,
    env: {},
    execImpl,
  });
  assert.equal(r.reason, "already");
  assert.equal(r.milestone, "9");

  // AND the filter is a constant. Asserting only the outcome was vacuous: the
  // stub returns its NDJSON whatever --jq is passed, so reverting to the
  // interpolated `select(.title == "${args.title}")` left this green while a
  // quote in the title would have been a jq syntax error in production.
  const lookup = calls.find(
    (c) => c.argv[0] === "api" && c.argv.join(" ").includes("/milestones"),
  );
  const jqArg = lookup.argv[lookup.argv.indexOf("--jq") + 1];
  assert.equal(
    jqArg,
    ".[] | {number, title}",
    "the jq program must be CONSTANT — no title may reach it, or the title's " +
      "own characters can break its own lookup",
  );
  assert.ok(
    !jqArg.includes(nasty),
    "the title must never be interpolated into the filter",
  );
});

test("§10 the milestone lookup asks for ALL states, paginated", () => {
  const dir = withRepo();
  // The endpoint defaults to open-only, 30 per page: a closed milestone or a
  // busy repo silently missed an existing title and tried to re-create it.
  const { execImpl, calls } = stubGh({ milestones: [] });
  cli.run({
    argv: ["node", "x", "--kind", "milestone", "--title", "Epic 7"],
    repoRoot: dir,
    env: {},
    execImpl,
  });
  const lookup = calls.find(
    (c) => c.argv[0] === "api" && c.argv.join(" ").includes("/milestones"),
  );
  const joined = lookup.argv.join(" ");
  assert.match(joined, /--paginate/, "must paginate");
  assert.match(joined, /state=all/, "must include closed milestones");
});

test("§10 a milestone title containing ] [ is still matched", () => {
  // The regression this pins is one the FIX introduced, not the original code.
  // Moving off jq-interpolation, the first attempt split --paginate's
  // concatenated arrays on /(?<=\])\s*(?=\[)/ — which cuts inside a title
  // containing `] [`, so both halves fail to parse and the milestone is
  // silently dropped. Same failure class as the jq syntax error it replaced:
  // a title's own characters breaking its own lookup.
  const dir = withRepo();
  const nasty = "Epic ] [ bracket";
  const { execImpl } = stubGh({ milestones: ["11"], milestoneTitle: nasty });
  const r = cli.run({
    argv: ["node", "x", "--kind", "milestone", "--title", nasty, "--json"],
    repoRoot: dir,
    env: {},
    execImpl,
  });
  assert.equal(r.reason, "already");
  assert.equal(r.milestone, "11");
});

test("§10 the slug resolver handles every remote URL form", () => {
  // Anchoring on the literal `github.com` silently returned "" for every
  // GitHub Enterprise host and for a URL with a trailing slash — a degraded
  // record rather than a crash, which is the kind of gap nobody notices.
  const forms = [
    ["git@github.com:acme/repo.git", "acme/repo", {}],
    ["https://github.com/acme/repo.git", "acme/repo", {}],
    ["https://github.com/acme/repo", "acme/repo", {}],
    ["https://github.com/acme/repo/", "acme/repo", {}],
    ["ssh://git@github.com/acme/repo.git", "acme/repo", {}],
    ["https://user@github.com/acme/repo.git", "acme/repo", {}],
    ["https://github.com/acme/my.repo.js", "acme/my.repo.js", {}],
    // A GitHub Enterprise host is recognised ONLY when GH_HOST names it —
    // gh itself already requires that, so it costs a GHE user nothing.
    [
      "git@github.mycorp.com:acme/repo.git",
      "acme/repo",
      { GH_HOST: "github.mycorp.com" },
    ],
    [
      "git@ghe.corp.example.com:acme/repo.git",
      "acme/repo",
      { GH_HOST: "ghe.corp.example.com" },
    ],
  ];
  for (const [url, expected, extraEnv] of forms) {
    const dir = withRepo();
    execFileSync("git", ["init", "-q"], { cwd: dir });
    execFileSync("git", ["remote", "add", "origin", url], { cwd: dir });
    run(dir, ["--kind", "milestone", "--title", "M"], {
      ACCESS_TRACKER: "manual",
      ...extraEnv,
    });
    const rec = readJournal(dir)[0];
    assert.ok(
      rec.command && rec.command.argv.join(" ").includes(`/repos/${expected}/`),
      `${url} → expected slug ${expected}, got ${JSON.stringify(rec.command)}`,
    );
  }
});

test("§10 a non-GitHub remote yields NO slug and NO command, never a wrong one", () => {
  // A plausible-but-wrong slug is worse than none: handed to `gh --repo` it
  // aims at an unrelated github.com repository. Matching any host — the first
  // attempt at host-agnosticism — turned `git@bitbucket.org:acme/repo.git` and
  // a bare local path into `acme/repo`.
  for (const url of [
    "git@bitbucket.org:acme/repo.git",
    "https://gitlab.com/acme/repo.git",
    "/srv/git/acme/repo.git",
    // A lookalike host. `github.evil.com` and `github.mycorp.com` are
    // indistinguishable by shape, so neither is accepted without GH_HOST.
    "git@github.evil.com:acme/repo.git",
    // …and an unnamed GHE host is refused for the same reason.
    "git@github.mycorp.com:acme/repo.git",
  ]) {
    const dir = withRepo();
    execFileSync("git", ["init", "-q"], { cwd: dir });
    execFileSync("git", ["remote", "add", "origin", url], { cwd: dir });
    run(dir, ["--kind", "milestone", "--title", "M"], {
      ACCESS_TRACKER: "manual",
    });
    const rec = readJournal(dir)[0];
    assert.equal(
      rec.command,
      null,
      `${url}: a record whose command cannot run is worse than one with none — ` +
        `the sh renderer would emit a script that 404s and an operator seeing ` +
        `no error would assume the action was performed`,
    );
    // The manual path still works — the record is degraded, not broken.
    assert.ok(rec.manual, "the manual path must survive");
  }
});

test("§10 --dry-run under a restricted mode makes NO network call", () => {
  // This has regressed twice, from opposite directions: cycle 1 left
  // `gh repo view` on the dry-run path, cycle 2 fixed it and then reintroduced
  // it by gating on `access === "full" || args.dryRun`. Pinned directly with a
  // throwing transport so it cannot come back a third time quietly.
  for (const mode of RESTRICTED) {
    const dir = withRepo();
    // COUNT THE ATTEMPT, do not merely throw. ghRepoSlug catches its own
    // errors, so a throwing stub proves nothing: the call happens, the throw is
    // swallowed, and the assertion passes anyway. That is the same swallow that
    // made the cycle-1 version of this check vacuous.
    const attempted = [];
    const execImpl = (bin, argv) => {
      attempted.push([bin, ...argv].join(" "));
      throw new Error("no network in a test");
    };
    const r = cli.run({
      argv: ["node", "x", "--kind", "milestone", "--title", "M", "--dry-run"],
      repoRoot: dir,
      env: { ACCESS_TRACKER: mode },
      execImpl,
    });
    assert.deepEqual(
      attempted,
      [],
      `${mode}: --dry-run attempted ${attempted.join(", ")} — a gated run must ` +
        `issue no network call, and an attempt counts even when it fails`,
    );
    assert.equal(r.reason, "dry-run", `${mode}: must report dry-run`);
    assert.equal(r.exitCode, 0);
    assert.equal(
      readJournal(dir).length,
      0,
      `${mode}: a dry run records nothing either`,
    );
  }
});

test("§10 an explicit --repo short-circuits slug resolution entirely", () => {
  // No transport call at all when the caller already said which repo.
  const dir = withRepo();
  const { execImpl, calls } = stubGh();
  cli.run({
    argv: [
      "node",
      "x",
      "--kind",
      "close",
      "--issue",
      "42",
      "--repo",
      "acme/repo",
    ],
    repoRoot: dir,
    env: {},
    execImpl,
  });
  assert.ok(
    !calls.some((c) => c.argv[0] === "repo"),
    "gh repo view must not run when --repo was supplied",
  );
});

test("§10 both slug tiers resolve against the RESOLVED root, not process.cwd()", () => {
  // repoSlug passes cwd and says why; ghRepoSlug did not, and it takes
  // precedence — so the higher-priority tier reintroduced the exact hazard the
  // lower one documents. An agent invoking this from a parent directory would
  // have pinned every mutation to whatever repo that directory belongs to.
  const dir = withRepo();
  const seen = [];
  const execImpl = (bin, argv, opts) => {
    seen.push({ argv: argv.join(" "), cwd: opts && opts.cwd });
    if (argv[0] === "auth") return "";
    if (argv[0] === "repo") return "acme/repo";
    return "";
  };
  cli.run({
    argv: ["node", "x", "--kind", "close", "--issue", "42"],
    repoRoot: dir,
    env: {},
    execImpl,
  });
  const view = seen.find((c) => c.argv.startsWith("repo view"));
  assert.ok(view, "gh repo view should run on the perform path");
  assert.equal(
    view.cwd,
    dir,
    "gh must resolve against the repo root the caller supplied",
  );
});

test("§10 GH_REPO with a foreign host is refused, not silently truncated", () => {
  // gh --repo accepts `[HOST/]OWNER/REPO`, so discarding the host turned
  // `ghe.corp/acme/repo` into `acme/repo` and aimed it at github.com.
  const cases = [
    [{ GH_REPO: "acme/repo" }, true],
    [{ GH_REPO: "github.com/acme/repo" }, true],
    [{ GH_REPO: "ghe.corp.example.com/acme/repo" }, false],
    [
      {
        GH_REPO: "ghe.corp.example.com/acme/repo",
        GH_HOST: "ghe.corp.example.com",
      },
      true,
    ],
  ];
  for (const [envExtra, shouldResolve] of cases) {
    const dir = withRepo();
    run(dir, ["--kind", "milestone", "--title", "M"], {
      ACCESS_TRACKER: "manual",
      ...envExtra,
    });
    const rec = readJournal(dir)[0];
    if (shouldResolve) {
      assert.ok(
        rec.command && rec.command.argv.join(" ").includes("/repos/acme/repo/"),
        `${JSON.stringify(envExtra)} should resolve to acme/repo`,
      );
    } else {
      assert.equal(
        rec.command,
        null,
        `${JSON.stringify(envExtra)} names a host we cannot verify — refuse ` +
          `rather than aim at github.com`,
      );
    }
  }
});

test("§10 no shape EVER carries a command with an empty slug in its path", () => {
  // The rule is enforced at CONSTRUCTION, not by a caller remembering to null
  // the command afterwards. recordShape used to return `/repos//milestones`
  // for a slugless milestone and rely on run() to clear it — correct, but
  // enforced one level from where the broken value was built, so a second
  // caller could reintroduce it. shapeFor holds the invariant at the source.
  for (const kind of cli.KIND_NAMES) {
    const args = {
      issue: "42",
      parent: "7",
      title: "T",
      bodyFile: "",
      labels: [],
      addLabels: [],
      removeLabels: [],
      milestone: "",
      reason: "",
      state: "",
    };
    const shape = cli.shapeFor({ kind, args, body: "", slug: "" });
    if (cli.SLUG_EMBEDDING_KINDS.includes(kind)) {
      assert.equal(
        shape.command,
        null,
        `${kind} embeds the slug in a REST path — with no slug there is no ` +
          `runnable command, and a broken one is worse than none`,
      );
    } else {
      const argv = shape.command.argv.join(" ");
      assert.ok(
        !argv.includes("/repos//") && !argv.includes("$OWNER"),
        `${kind}: ${argv}`,
      );
      // …and it is genuinely runnable: gh resolves the repo from the cwd the
      // handover script is generated into.
      assert.ok(
        argv.startsWith("gh issue "),
        `${kind} should be a gh issue verb`,
      );
    }
  }
});

// ── §11 QA cycle 4 — the perform path ───────────────────────────────────────

test("§11 EVERY perform-path gh call carries the resolved cwd", () => {
  // Fixing ghRepoSlug's cwd left the hazard one step down: `gh issue close 42`
  // with no --repo and no cwd resolves from wherever the PROCESS is, so an
  // unresolvable slug closed the issue in an unrelated repository — reported
  // as `performed`. Demonstrated in review before it was fixed.
  const dir = withRepo();
  const seen = [];
  const execImpl = (bin, argv, opts) => {
    seen.push({ argv: argv.join(" "), cwd: opts && opts.cwd });
    if (argv[0] === "auth") return "";
    if (argv[0] === "repo") return "acme/repo";
    if (argv[0] === "issue" && argv[1] === "create")
      return "https://github.com/acme/repo/issues/207";
    if (argv[0] === "api") return JSON.stringify({ number: 9 });
    return "";
  };
  for (const { kind, argv } of ALL_KINDS) {
    seen.length = 0;
    cli.run({
      argv: ["node", "x", "--kind", kind, ...argv, "--repo", "acme/repo"],
      repoRoot: dir,
      env: {},
      execImpl,
    });
    const unanchored = seen.filter((c) => c.cwd !== dir);
    assert.deepEqual(
      unanchored.map((c) => c.argv),
      [],
      `${kind}: these calls ran with cwd=${JSON.stringify(
        unanchored[0] && unanchored[0].cwd,
      )} instead of the resolved root — gh would resolve the repository from ` +
        `wherever the process happens to be`,
    );
  }
});

test("§11 the --body-file path carries the cwd too — it is the hot path", () => {
  // ALL_KINDS never passes --body-file, so the sweep above exercises `plain()`
  // and never `withStdin()` — yet withStdin is what EVERY real caller hits:
  // create and edit both write the body to a file. Removing its `cwd` left the
  // whole suite green, which is the one coverage gap the final review named.
  const dir = withRepo({ "body.md": "a body\n" });
  const seen = [];
  const execImpl = (bin, argv, opts) => {
    seen.push({ argv: argv.join(" "), cwd: opts && opts.cwd });
    if (argv[0] === "auth") return "";
    if (argv[0] === "repo") return "acme/repo";
    return "https://github.com/acme/repo/issues/207";
  };
  cli.run({
    argv: [
      "node",
      "x",
      "--kind",
      "create",
      "--title",
      "T",
      "--body-file",
      join(dir, "body.md"),
      "--repo",
      "acme/repo",
    ],
    repoRoot: dir,
    env: {},
    execImpl,
  });
  const create = seen.find((c) => c.argv.startsWith("issue create"));
  assert.ok(create, "the create should have run through the stdin path");
  assert.ok(
    create.argv.includes("--body-file -"),
    "…and it must be the stdin path, not an inline body",
  );
  assert.equal(
    create.cwd,
    dir,
    "the body-file path must resolve against the caller's root like every other",
  );
});

test("§11 the perform path refuses, not guesses, when the slug is unresolvable", () => {
  // Both `!slug` refusals were untested: disabling either left the whole suite
  // green, so cycle 3's fix for the sub-issue arm was never actually watched.
  for (const [kind, argv] of [
    ["milestone", ["--title", "M"]],
    ["sub-issue-link", ["--issue", "42", "--parent", "7"]],
  ]) {
    const dir = withRepo();
    execFileSync("git", ["init", "-q"], { cwd: dir });
    // A non-GitHub remote: the resolver refuses it, so slug is "".
    execFileSync(
      "git",
      ["remote", "add", "origin", "git@bitbucket.org:a/b.git"],
      {
        cwd: dir,
      },
    );
    const calls = [];
    const execImpl = (bin, av) => {
      calls.push(av.join(" "));
      if (av[0] === "auth") return "";
      if (av[0] === "repo") throw new Error("gh cannot resolve it either");
      return "";
    };
    const r = cli.run({
      argv: ["node", "x", "--kind", kind, ...argv, "--json"],
      repoRoot: dir,
      env: {},
      execImpl,
    });
    assert.equal(
      r.reason,
      "unverifiable",
      `${kind} must refuse rather than build a /repos// path`,
    );
    assert.ok(
      !calls.some((c) => c.includes("/repos//")),
      `${kind} must not put a malformed path on the wire: ${calls.join(" | ")}`,
    );
  }
});

test("§11 --repo is validated — it outranks every checked source", () => {
  const dir = withRepo();
  const bad = [
    ["acme", "one segment"],
    ["a/b/c/d", "four segments"],
    ["ghe.corp.example.com/acme/repo", "a host we cannot vouch for"],
  ];
  for (const [value, why] of bad) {
    assert.equal(
      run(dir, ["--kind", "milestone", "--title", "M", "--repo", value])
        .exitCode,
      2,
      `--repo ${value} (${why}) must be a usage error, caught locally`,
    );
  }
  // HOST/OWNER/REPO with a host we CAN vouch for is accepted and stripped.
  run(
    dir,
    ["--kind", "milestone", "--title", "M", "--repo", "github.com/acme/repo"],
    {
      ACCESS_TRACKER: "manual",
    },
  );
  const rec = readJournal(dir)[0];
  assert.ok(
    rec.command.argv.join(" ").includes("/repos/acme/repo/milestones"),
    `the host must be stripped for the API path, got ${rec.command.argv.join(" ")}`,
  );
});

test("§11 no kind emits a placeholder slug via repoFlag", () => {
  // The $OWNER/$REPO invariant was enforced for 2 of 6 kinds only; restoring
  // the placeholder in repoFlag kept the suite green.
  for (const kind of cli.KIND_NAMES) {
    const args = {
      issue: "42",
      parent: "7",
      title: "T",
      bodyFile: "",
      labels: [],
      addLabels: [],
      removeLabels: [],
      milestone: "",
      reason: "",
      state: "",
    };
    const shape = cli.shapeFor({ kind, args, body: "", slug: "" });
    if (!shape.command) continue;
    const argv = shape.command.argv.join(" ");
    for (const bad of ["$OWNER", "$REPO", "/repos//"]) {
      assert.ok(!argv.includes(bad), `${kind} emitted ${bad}: ${argv}`);
    }
  }
});

test("§11 a slug with shell metacharacters is refused, from every source", () => {
  // The slug is interpolated into the RECORDED sub-issue-link `bash -c` string,
  // and handover-render.js quotes that whole string as ONE argv element —
  // quoting protects the rendering, not the script inside it. So a hostile
  // `origin` like https://github.com/o/n$(cmd) would execute when an operator
  // ran the generated handover script. GitHub owner/repo names are
  // [A-Za-z0-9._-], so this rejects nothing real.
  assert.ok(cli.isSlugShaped("acme/repo"));
  assert.ok(cli.isSlugShaped("acme/my.repo.js"), "dots are legal in repo names");
  for (const bad of ["o/n$(cmd)", "o/`id`", "a b/c", "x/y;z", "o/n|w", "o/n&w"]) {
    assert.ok(!cli.isSlugShaped(bad), `${bad} must be refused`);
  }

  // From the git remote: refused, so the record carries no command at all.
  const dir = withRepo();
  execFileSync("git", ["init", "-q"], { cwd: dir });
  execFileSync(
    "git",
    ["remote", "add", "origin", "https://github.com/o/n$(touch /tmp/pwned).git"],
    { cwd: dir },
  );
  run(dir, ["--kind", "sub-issue-link", "--issue", "42", "--parent", "7"], {
    ACCESS_TRACKER: "manual",
  });
  const rec = readJournal(dir)[0];
  assert.equal(
    rec.command,
    null,
    "a slug we will not vouch for yields no command, rather than one that " +
      "executes something when the operator runs the handover script",
  );

  // And from --repo: a usage error, caught locally.
  assert.equal(
    run(dir, ["--kind", "milestone", "--title", "M", "--repo", "o/n$(cmd)"])
      .exitCode,
    2,
  );
});
