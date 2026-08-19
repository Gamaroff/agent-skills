"use strict";
/**
 * tracker-comment.test.mjs — the comment CLI and the ADF renderer it needed.
 *
 * Two things are being held down here, and they fail in opposite directions:
 *
 *   NOTHING IS POSTED TWICE, AND NOTHING IS POSTED BLIND. Comments are
 *       non-blocking by policy, so a comment that silently does not appear
 *       looks exactly like success. The marker makes "have I already posted
 *       this?" answerable; the CARDINALITY rule makes an ambiguous answer stay
 *       ambiguous instead of being resolved by `| head -1`, which is how the
 *       existing PR-comment convention loses a duplicate forever.
 *
 *   NO NETWORK UNDER A RESTRICTED MODE. The transports (`execImpl`,
 *       `fetchImpl`) are injected as THROWING stubs, so a leak fails the test
 *       rather than being counted after the fact.
 *
 * Run: node --test shared/resources/tests/tracker-comment.test.mjs
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
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const SHARED = join(__dirname, "..");

const cli = require(join(SHARED, "tracker-comment.js"));
const jira = require(join(SHARED, "jira-sync.js"));

const RESTRICTED = ["read-only", "approve", "command", "manual"];
const CLI_PATH = join(SHARED, "tracker-comment.js");

const dirs = [];
process.on("exit", () => {
  for (const d of dirs) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch (_) {}
  }
});

function withRepo(files = {}) {
  const dir = mkdtempSync(join(tmpdir(), "tracker-comment-"));
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

/** A `gh` stub that answers `issue view` from a canned comment list. */
function stubGh({ comments = [], viewFails = false, postFails = false } = {}) {
  const calls = [];
  const execImpl = (bin, argv, opts) => {
    calls.push({ bin, argv, input: opts && opts.input });
    if (argv[0] === "auth") return "";
    if (argv[0] === "issue" && argv[1] === "view") {
      if (viewFails) throw new Error("gh view failed");
      return JSON.stringify({ comments });
    }
    if (argv[0] === "issue" && argv[1] === "comment") {
      if (postFails) throw new Error("gh comment failed");
      return "";
    }
    throw new Error(`unexpected gh call: ${argv.join(" ")}`);
  };
  return { execImpl, calls };
}

function bodyFile(dir, text, name = "body.md") {
  const p = join(dir, name);
  writeFileSync(p, text, "utf8");
  return p;
}

const baseEnv = { TRACKER: "github" };

// ── Access gate ─────────────────────────────────────────────────────────────

for (const mode of RESTRICTED) {
  test(`defers under access.tracker=${mode}: exit 0, reason "deferred", one record, no network`, async () => {
    const dir = withRepo();
    const f = bodyFile(dir, "## Done\n\nAll good.");
    const r = await cli.run({
      argv: ["node", "x", "--issue", "42", "--body-file", f, "--stage", "done", "--quiet"],
      execImpl: explode("gh"),
      fetchImpl: explode("fetch"),
      repoRoot: dir,
      env: { ...baseEnv, ACCESS_TRACKER: mode },
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.reason, "deferred");
    assert.equal(r.posted, false);
    const recs = readJournal(dir);
    assert.equal(recs.length, 1, "exactly one record per deferred comment");
    assert.equal(recs[0].kind, "github.issue.comment");
    assert.equal(recs[0].access, mode);
  });
}

test("deferred record carries the body in command.stdin, never interpolated into argv", async () => {
  const dir = withRepo();
  // Every shell metacharacter that has ever mattered, in one body.
  const nasty = "Backticks `x`, subshell $(rm -rf /), quote ' and \" and \\ and\nnewline";
  const f = bodyFile(dir, nasty);
  await cli.run({
    argv: ["node", "x", "--issue", "42", "--body-file", f, "--quiet"],
    execImpl: explode("gh"),
    repoRoot: dir,
    env: { ...baseEnv, ACCESS_TRACKER: "manual" },
  });
  const rec = readJournal(dir)[0];
  assert.ok(Array.isArray(rec.command.argv), "argv is an array, not a string");
  assert.equal(rec.command.stdin, nasty, "body rides in stdin verbatim");
  for (const a of rec.command.argv) {
    assert.ok(
      !a.includes("$(") && !a.includes("rm -rf"),
      `body leaked into argv: ${a}`,
    );
  }
  assert.equal(rec.manual.fields[0].name, "Comment");
  assert.equal(rec.manual.fields[0].value, nasty);
});

test("two different bodies on the same issue produce two records; the same body dedups", async () => {
  const dir = withRepo();
  const a = bodyFile(dir, "First body", "a.md");
  const b = bodyFile(dir, "Second, different body", "b.md");
  const ids = [];
  for (const f of [a, b, a]) {
    const r = await cli.run({
      argv: ["node", "x", "--issue", "42", "--body-file", f, "--stage", "done", "--quiet"],
      execImpl: explode("gh"),
      repoRoot: dir,
      env: { ...baseEnv, ACCESS_TRACKER: "manual" },
    });
    ids.push(r.record);
  }
  // The bug this guards: `fingerprint` once used argv alone, so two comments to
  // the same issue with identical argv collapsed to one id and a renderer
  // silently dropped one.
  assert.notEqual(ids[0], ids[1], "different bodies must not collapse to one id");
  assert.equal(ids[0], ids[2], "an identical re-run must dedup, for resume");
});

test("access.tracker unset reads as full — the gate is inert for ordinary consumers", async () => {
  const dir = withRepo();
  const f = bodyFile(dir, "hello");
  const gh = stubGh();
  const r = await cli.run({
    argv: ["node", "x", "--issue", "42", "--body-file", f, "--quiet"],
    execImpl: gh.execImpl,
    repoRoot: dir,
    env: { ...baseEnv },
  });
  assert.equal(r.reason, "posted");
  assert.equal(readJournal(dir).length, 0, "nothing deferred under full access");
});

// ── Marker cardinality ──────────────────────────────────────────────────────

test("no marker match → posts, with the marker prepended as the first line", async () => {
  const dir = withRepo();
  const f = bodyFile(dir, "## PR opened\n\nSee #42.");
  const gh = stubGh({ comments: [{ body: "unrelated chatter" }] });
  const r = await cli.run({
    argv: ["node", "x", "--issue", "42", "--body-file", f, "--stage", "in-review", "--quiet"],
    execImpl: gh.execImpl,
    repoRoot: dir,
    env: { ...baseEnv },
  });
  assert.equal(r.reason, "posted");
  const post = gh.calls.find((c) => c.argv[1] === "comment");
  assert.ok(post, "a comment was posted");
  assert.ok(
    post.input.startsWith(cli.markerHtml("in-review")),
    "marker is the FIRST line, so startswith matching works",
  );
  assert.ok(post.input.includes("See #42."), "body survives intact");
  assert.deepEqual(
    post.argv,
    ["issue", "comment", "42", "--body-file", "-"],
    "body goes by stdin, never as an argv string",
  );
});

test("exactly one marker match → reason 'already', nothing posted twice", async () => {
  const dir = withRepo();
  const f = bodyFile(dir, "body");
  const gh = stubGh({
    comments: [{ body: `${cli.markerHtml("done")}\nearlier run` }],
  });
  const r = await cli.run({
    argv: ["node", "x", "--issue", "42", "--body-file", f, "--stage", "done", "--quiet"],
    execImpl: gh.execImpl,
    repoRoot: dir,
    env: { ...baseEnv },
  });
  assert.equal(r.reason, "already");
  assert.equal(r.exitCode, 0);
  assert.ok(
    !gh.calls.some((c) => c.argv[1] === "comment"),
    "no second comment posted",
  );
});

test("two marker matches → 'unverifiable', never 'already', and nothing posted", async () => {
  const dir = withRepo();
  const f = bodyFile(dir, "body");
  const gh = stubGh({
    comments: [
      { body: `${cli.markerHtml("done")}\nfirst` },
      { body: `${cli.markerHtml("done")}\nsecond` },
    ],
  });
  const r = await cli.run({
    argv: ["node", "x", "--issue", "42", "--body-file", f, "--stage", "done", "--quiet"],
    execImpl: gh.execImpl,
    repoRoot: dir,
    env: { ...baseEnv },
  });
  // The whole point. `| head -1` would have reported "already" here and the
  // duplicate would never be reconciled.
  assert.equal(r.reason, "unverifiable");
  assert.equal(r.matches, 2);
  assert.notEqual(r.reason, "already");
  assert.ok(!gh.calls.some((c) => c.argv[1] === "comment"));
});

test("an unreadable comment list → 'unverifiable', not a blind post", async () => {
  const dir = withRepo();
  const f = bodyFile(dir, "body");
  const gh = stubGh({ viewFails: true });
  const r = await cli.run({
    argv: ["node", "x", "--issue", "42", "--body-file", f, "--stage", "done", "--quiet"],
    execImpl: gh.execImpl,
    repoRoot: dir,
    env: { ...baseEnv },
  });
  assert.equal(r.reason, "unverifiable");
  assert.equal(r.cause, "comments-unreadable");
  assert.ok(!gh.calls.some((c) => c.argv[1] === "comment"));
});

test("no --stage → unmarked comment, no marker search at all", async () => {
  const dir = withRepo();
  const f = bodyFile(dir, "plain body");
  const gh = stubGh();
  const r = await cli.run({
    argv: ["node", "x", "--issue", "42", "--body-file", f, "--quiet"],
    execImpl: gh.execImpl,
    repoRoot: dir,
    env: { ...baseEnv },
  });
  assert.equal(r.reason, "posted");
  assert.ok(
    !gh.calls.some((c) => c.argv[1] === "view"),
    "an unmarked comment does not search",
  );
  const post = gh.calls.find((c) => c.argv[1] === "comment");
  assert.equal(post.input, "plain body", "no marker added");
});

// ── Credentials and dry-run ─────────────────────────────────────────────────

test("gh unauthenticated → reason 'no-credentials', exit 0 (the MCP fallback's cue)", async () => {
  const dir = withRepo();
  const f = bodyFile(dir, "body");
  const execImpl = (bin, argv) => {
    if (argv[0] === "auth") throw new Error("not logged in");
    throw new Error("should not reach a write");
  };
  const r = await cli.run({
    argv: ["node", "x", "--issue", "42", "--body-file", f, "--quiet"],
    execImpl,
    repoRoot: dir,
    env: { ...baseEnv },
  });
  assert.equal(r.reason, "no-credentials");
  assert.equal(r.exitCode, 0);
});

test("--strict turns a skip into exit 1, but never turns 'already' into one", async () => {
  const dir = withRepo();
  const f = bodyFile(dir, "body");
  const execImpl = (bin, argv) => {
    if (argv[0] === "auth") throw new Error("not logged in");
    throw new Error("no write");
  };
  const strict = await cli.run({
    argv: ["node", "x", "--issue", "42", "--body-file", f, "--quiet", "--strict"],
    execImpl,
    repoRoot: dir,
    env: { ...baseEnv },
  });
  assert.equal(strict.exitCode, 1, "no-credentials is a skip");

  const gh = stubGh({ comments: [{ body: `${cli.markerHtml("done")}\nx` }] });
  const already = await cli.run({
    argv: ["node", "x", "--issue", "42", "--body-file", f, "--stage", "done", "--quiet", "--strict"],
    execImpl: gh.execImpl,
    repoRoot: dir,
    env: { ...baseEnv },
  });
  assert.equal(already.exitCode, 0, "'already' is success, not a skip");
});

test("--dry-run reads nothing and writes nothing", async () => {
  const dir = withRepo();
  const f = bodyFile(dir, "body");
  const r = await cli.run({
    argv: ["node", "x", "--issue", "42", "--body-file", f, "--stage", "done", "--dry-run", "--quiet"],
    execImpl: explode("gh"),
    fetchImpl: explode("fetch"),
    repoRoot: dir,
    env: { ...baseEnv },
  });
  assert.equal(r.reason, "dry-run");
  assert.equal(r.exitCode, 0);
  assert.equal(readJournal(dir).length, 0, "dry-run records nothing either");
});

test("--dry-run is exempt from the access gate (it mutates nothing)", async () => {
  const dir = withRepo();
  const f = bodyFile(dir, "body");
  const r = await cli.run({
    argv: ["node", "x", "--issue", "42", "--body-file", f, "--dry-run", "--quiet"],
    execImpl: explode("gh"),
    repoRoot: dir,
    env: { ...baseEnv, ACCESS_TRACKER: "manual" },
  });
  assert.equal(r.reason, "dry-run", "not 'deferred' — nothing to defer");
});

// ── Usage errors (exit 2, matching both peers) ──────────────────────────────

const usageCases = [
  ["missing --issue", ["--body-file", "/dev/null"]],
  ["missing --body-file", ["--issue", "42"]],
  ["unknown flag", ["--issue", "42", "--body-file", "/dev/null", "--bogus"]],
];

for (const [name, argv] of usageCases) {
  test(`usage error exits 2: ${name}`, () => {
    const dir = withRepo();
    const r = spawnSync(process.execPath, [CLI_PATH, ...argv], {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, TRACKER: "github" },
    });
    assert.equal(r.status, 2, r.stderr);
  });
}

test("an empty body file is a usage error, not an empty comment", () => {
  const dir = withRepo({ "empty.md": "   \n\n  " });
  const r = spawnSync(
    process.execPath,
    [CLI_PATH, "--issue", "42", "--body-file", join(dir, "empty.md")],
    { cwd: dir, encoding: "utf8", env: { ...process.env, TRACKER: "github" } },
  );
  assert.equal(r.status, 2);
});

test("a non-numeric issue on GitHub is a usage error", () => {
  const dir = withRepo({ "b.md": "hi" });
  const r = spawnSync(
    process.execPath,
    [CLI_PATH, "--issue", "PROJ-1", "--body-file", join(dir, "b.md"), "--tracker", "github"],
    { cwd: dir, encoding: "utf8" },
  );
  assert.equal(r.status, 2);
});

// ── Tracker resolution ──────────────────────────────────────────────────────

test("tracker resolution: explicit flag > TRACKER > JIRA_URL > github", () => {
  assert.equal(cli.resolveTracker("jira", {}), "jira");
  assert.equal(cli.resolveTracker("", { TRACKER: "jira" }), "jira");
  assert.equal(cli.resolveTracker("", { JIRA_URL: "https://x" }), "jira");
  assert.equal(cli.resolveTracker("", {}), "github");
  // An unrecognised value fails closed rather than defaulting, matching
  // resolve-platform.sh's contract.
  assert.throws(() => cli.resolveTracker("bitbucket", {}), /Unknown tracker/);
});

test("the marker prefix agrees with jira-sync.js", () => {
  // The GitHub branch must not require jira-sync.js, so the literal is
  // duplicated. This is the check that keeps the two copies honest.
  assert.equal(cli.COMMENT_MARKER_PREFIX, jira.COMMENT_MARKER_PREFIX);
});

// ── ADF rendering ───────────────────────────────────────────────────────────

test("markdown → ADF round-trips headings, tables, code fences and links", () => {
  const md = [
    "## Heading",
    "",
    "Intro with **bold**, `code` and [a link](https://example.com).",
    "",
    "```js",
    "const a = 1;",
    "",
    "const b = 2;",
    "| not | a | table |",
    "## not a heading",
    "```",
    "",
    "| Col A | Col B |",
    "| ----- | ----- |",
    "| 1     | 2     |",
  ].join("\n");
  const nodes = jira.textToAdfNodes(md);
  const types = nodes.map((n) => n.type);
  assert.deepEqual(types, ["heading", "paragraph", "codeBlock", "table"]);

  const code = nodes[2];
  assert.equal(code.attrs.language, "js", "language tag preserved");
  // The reason the fence branch lives in textToAdfNodes and not blockToAdf: a
  // blank line inside a fence would otherwise split the block, and the pipe row
  // and `##` line would each be re-parsed as a table and a heading.
  assert.equal(
    code.content[0].text,
    "const a = 1;\n\nconst b = 2;\n| not | a | table |\n## not a heading",
    "fence content is verbatim, including the blank line and the decoys",
  );

  const link = nodes[1].content.find(
    (n) => n.marks && n.marks.some((m) => m.type === "link"),
  );
  assert.equal(link.marks[0].attrs.href, "https://example.com");
  assert.equal(nodes[3].type, "table");
  assert.equal(nodes[3].content[0].content[0].type, "tableHeader");
});

test("a tilde fence is not closed by a backtick fence", () => {
  const nodes = jira.textToAdfNodes("~~~\n```\nstill inside\n~~~");
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].type, "codeBlock");
  assert.equal(nodes[0].content[0].text, "```\nstill inside");
});

test("an unterminated fence still yields a code block rather than vanishing", () => {
  const nodes = jira.textToAdfNodes("intro\n\n```sh\necho hi");
  assert.equal(nodes.at(-1).type, "codeBlock");
  assert.equal(nodes.at(-1).content[0].text, "echo hi");
});

test("an empty fence produces a legal ADF codeBlock (no empty content array)", () => {
  const [node] = jira.textToAdfNodes("```\n```");
  assert.equal(node.type, "codeBlock");
  assert.ok(
    !("content" in node) || node.content.length > 0,
    "ADF rejects an empty content array",
  );
});

test("the Jira identity footer is italic and lives in the comment body", () => {
  const doc = jira.buildCommentAdf("## Done\n\nAccepted.", "finalise-dod");
  const last = doc.content.at(-1);
  assert.equal(last.type, "paragraph");
  assert.deepEqual(last.content[0].marks, [{ type: "em" }]);
  assert.ok(last.content[0].text.includes("agent-skills-comment:finalise-dod"));
  // ADF drops unknown nodes, so an HTML comment would have been stripped
  // silently and taken idempotency with it — hence a visible footer on Jira.
  assert.ok(
    !JSON.stringify(doc).includes("<!--"),
    "no HTML comment survives into ADF",
  );
});

test("adfContainsText finds the marker at any depth", () => {
  const doc = jira.buildCommentAdf("| a | b |\n|---|---|\n| 1 | 2 |", "done");
  assert.ok(jira.adfContainsText(doc, "agent-skills-comment:done"));
  assert.ok(!jira.adfContainsText(doc, "agent-skills-comment:other"));
});

test("firstLineOf strips markdown for the record's `desired`", () => {
  assert.equal(jira.firstLineOf("## PR opened: 55\nbody"), "PR opened: 55");
  assert.equal(jira.firstLineOf("**bold** start"), "bold start");
  assert.equal(jira.firstLineOf(""), "(empty comment)");
  assert.ok(jira.firstLineOf("x".repeat(300)).length <= 120);
});
