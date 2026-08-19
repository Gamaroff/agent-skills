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
    if (argv[0] === "repo") return "owner/repo";
    // The paginated read is the primary path; `issue view` is the fallback.
    if (argv[0] === "api") {
      if (viewFails) throw new Error("gh api failed");
      return comments.map((c) => String(c.body || "").split("\n").join(" ")).join("\n");
    }
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

// ── Marker prefix collision (QA-1) ──────────────────────────────────────────

test("a stage that PREFIXES another stage does not match its marker", async () => {
  // The regression: the search used the bare prefix as a substring, so
  // `agent-skills-comment:review` matched an existing `review-story` marker.
  // Live consequence — /review-story comments first with --stage review-story,
  // then step 2 posts --stage review on the same issue, sees "1 match", reports
  // `already`, exits 0, and the review comment is never posted. Silent comment
  // loss, which is the failure this whole module exists to prevent.
  const dir = withRepo();
  const f = bodyFile(dir, "Step 2 review body");
  const gh = stubGh({
    comments: [{ body: `${cli.markerHtml("review-story")}\nearlier` }],
  });
  const r = await cli.run({
    argv: ["node", "x", "--issue", "42", "--body-file", f, "--stage", "review", "--quiet"],
    execImpl: gh.execImpl,
    repoRoot: dir,
    env: { ...baseEnv },
  });
  assert.equal(r.reason, "posted", "`review` must not be suppressed by `review-story`");
  assert.ok(gh.calls.some((c) => c.argv[1] === "comment"));
});

test("qa-cycle does not match qa-cycle-2", async () => {
  const dir = withRepo();
  const f = bodyFile(dir, "body");
  const gh = stubGh({
    comments: [{ body: `${cli.markerHtml("qa-cycle-2")}\ncycle two` }],
  });
  const r = await cli.run({
    argv: ["node", "x", "--issue", "42", "--body-file", f, "--stage", "qa-cycle", "--quiet"],
    execImpl: gh.execImpl,
    repoRoot: dir,
    env: { ...baseEnv },
  });
  assert.equal(r.reason, "posted");
});

test("the Jira footer marker matches exactly, not by prefix", () => {
  // The Jira marker has no closing delimiter (ADF drops unknown nodes, so it
  // cannot be an HTML comment), so substring matching cannot separate
  // `…:review` from `…:review-story`. Exact text-node equality can.
  const doc = jira.buildCommentAdf("body", "review-story");
  assert.equal(jira.adfContainsExactText(doc, jira.commentMarkerText("review")), false);
  assert.equal(jira.adfContainsExactText(doc, jira.commentMarkerText("review-story")), true);
});

test("jira: a prefixing stage does not match through the real search path", async () => {
  // The assertion above exercises the HELPER. This one exercises the CODE PATH:
  // reverting findCommentsByMarker to a substring test must fail something, and
  // a helper-only assertion does not — it kept passing while the live search
  // regressed. Same collision as the GitHub case: /review-story comments first,
  // then step 2 posts --stage review on the same issue.
  const dir = withRepo();
  const f = bodyFile(dir, "Step 2 review body");
  const j = stubJira({ comments: [jiraComment("review-story")] });
  const r = await cli.run({
    argv: ["node", "x", "--issue", "PROJ-1", "--body-file", f, "--stage", "review", "--quiet"],
    execImpl: explode("gh"),
    fetchImpl: j.fetchImpl,
    repoRoot: dir,
    env: { ...JIRA_ENV },
  });
  assert.equal(r.reason, "posted", "`review` must not be suppressed by `review-story`");
  assert.ok(j.calls.some((c) => c.method === "POST"));
});

// ── Flags fail closed (QA-4) ────────────────────────────────────────────────

test("--stage without a value is a usage error, not a silently unmarked comment", () => {
  // It used to fail OPEN: stage became undefined, the marker was dropped, and
  // the comment re-posted on every resume — while --issue and --body-file
  // correctly exited 2 in the same situation.
  const dir = withRepo({ "b.md": "hi" });
  const r = spawnSync(
    process.execPath,
    [CLI_PATH, "--issue", "42", "--body-file", join(dir, "b.md"), "--stage"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, TRACKER: "github" } },
  );
  assert.equal(r.status, 2);
});

test("--stage does not swallow the following flag", () => {
  const dir = withRepo({ "b.md": "hi" });
  const r = spawnSync(
    process.execPath,
    [CLI_PATH, "--issue", "42", "--body-file", join(dir, "b.md"), "--stage", "--json"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, TRACKER: "github" } },
  );
  assert.equal(r.status, 2, "swallowing --json would also suppress the JSON the caller parses");
});

// ── Stage validation (QA-5) ─────────────────────────────────────────────────

test("an unknown --stage is a usage error", async () => {
  const dir = withRepo();
  const f = bodyFile(dir, "body");
  const r = await cli.run({
    argv: ["node", "x", "--issue", "42", "--body-file", f, "--stage", "totally-made-up", "--quiet"],
    execImpl: explode("gh"),
    repoRoot: dir,
    env: { ...baseEnv },
  });
  assert.equal(r.exitCode, 2, "an unlisted stage produces a permanently un-deduplicable marker");
});

test("a cycle-scoped stage may take a numeric suffix", () => {
  assert.equal(cli.isKnownStage("qa-cycle-2"), true);
  assert.equal(cli.isKnownStage("qa-fix-11"), true);
  assert.equal(cli.isKnownStage("qa-cycle-x"), false, "only a numeric suffix");
  assert.equal(cli.isKnownStage("done"), true);
});

// ── Post failure (QA-6) ─────────────────────────────────────────────────────

test("a failed gh post reports unverifiable, never a silent success", async () => {
  const dir = withRepo();
  const f = bodyFile(dir, "body");
  const gh = stubGh({ postFails: true });
  const r = await cli.run({
    argv: ["node", "x", "--issue", "42", "--body-file", f, "--quiet"],
    execImpl: gh.execImpl,
    repoRoot: dir,
    env: { ...baseEnv },
  });
  assert.equal(r.reason, "unverifiable");
  assert.equal(r.cause, "post-failed");
  assert.equal(r.posted, false);
});

// ── Jira branch (QA-6) ──────────────────────────────────────────────────────

const JIRA_ENV = {
  TRACKER: "jira",
  JIRA_URL: "https://example.atlassian.net",
  JIRA_API_TOKEN: "t",
  JIRA_USER_EMAIL: "e@example.com",
};

/** A fetch stub answering the comment GET and POST. */
function stubJira({ comments = [], total = null, getOk = true, postOk = true } = {}) {
  const calls = [];
  const fetchImpl = async (url, opts = {}) => {
    calls.push({ url, method: opts.method || "GET", body: opts.body });
    if ((opts.method || "GET") === "GET") {
      if (!getOk) return { ok: false, status: 500, async json() { return {}; }, async text() { return ""; }, headers: { get: () => null } };
      const payload = { comments, total: total === null ? comments.length : total };
      return { ok: true, status: 200, async json() { return payload; }, async text() { return JSON.stringify(payload); }, headers: { get: () => null } };
    }
    if (!postOk) return { ok: false, status: 400, async json() { return { errorMessages: ["nope"] }; }, async text() { return "nope"; }, headers: { get: () => null } };
    return { ok: true, status: 201, async json() { return { id: "10001" }; }, async text() { return "{}"; }, headers: { get: () => null } };
  };
  return { fetchImpl, calls };
}

const jiraComment = (stage) =>
  ({ id: "1", body: jira.buildCommentAdf("prior", stage) });

test("jira: no marker match → posts via REST, and the body is ADF", async () => {
  const dir = withRepo();
  const f = bodyFile(dir, "## Done\n\nAccepted.");
  const j = stubJira({ comments: [] });
  const r = await cli.run({
    argv: ["node", "x", "--issue", "PROJ-1", "--body-file", f, "--stage", "done", "--quiet"],
    execImpl: explode("gh"),
    fetchImpl: j.fetchImpl,
    repoRoot: dir,
    env: { ...JIRA_ENV },
  });
  assert.equal(r.reason, "posted");
  const post = j.calls.find((c) => c.method === "POST");
  assert.ok(post, "a POST was made");
  const sent = JSON.parse(post.body);
  assert.equal(sent.body.type, "doc", "ADF document, not a plain string");
  assert.ok(jira.adfContainsExactText(sent.body, jira.commentMarkerText("done")));
});

test("jira: exactly one marker match → already, nothing posted", async () => {
  const dir = withRepo();
  const f = bodyFile(dir, "body");
  const j = stubJira({ comments: [jiraComment("done")] });
  const r = await cli.run({
    argv: ["node", "x", "--issue", "PROJ-1", "--body-file", f, "--stage", "done", "--quiet"],
    execImpl: explode("gh"),
    fetchImpl: j.fetchImpl,
    repoRoot: dir,
    env: { ...JIRA_ENV },
  });
  assert.equal(r.reason, "already");
  assert.ok(!j.calls.some((c) => c.method === "POST"));
});

test("jira: two marker matches → unverifiable, nothing posted", async () => {
  const dir = withRepo();
  const f = bodyFile(dir, "body");
  const j = stubJira({ comments: [jiraComment("done"), jiraComment("done")] });
  const r = await cli.run({
    argv: ["node", "x", "--issue", "PROJ-1", "--body-file", f, "--stage", "done", "--quiet"],
    execImpl: explode("gh"),
    fetchImpl: j.fetchImpl,
    repoRoot: dir,
    env: { ...JIRA_ENV },
  });
  assert.equal(r.reason, "unverifiable");
  assert.equal(r.matches, 2);
  assert.ok(!j.calls.some((c) => c.method === "POST"));
});

test("jira: an unreadable comment list → unverifiable, not a blind post", async () => {
  const dir = withRepo();
  const f = bodyFile(dir, "body");
  const j = stubJira({ getOk: false });
  const r = await cli.run({
    argv: ["node", "x", "--issue", "PROJ-1", "--body-file", f, "--stage", "done", "--quiet"],
    execImpl: explode("gh"),
    fetchImpl: j.fetchImpl,
    repoRoot: dir,
    env: { ...JIRA_ENV },
  });
  assert.equal(r.reason, "unverifiable");
  assert.ok(!j.calls.some((c) => c.method === "POST"));
});

test("jira: a TRUNCATED comment list is unverifiable, never a blind post (QA-7)", async () => {
  // total > returned means the marker may be outside the window. Reading a
  // partial list as "absent" is how the CLI would post the duplicate the
  // cardinality rule exists to prevent.
  const dir = withRepo();
  const f = bodyFile(dir, "body");
  const j = stubJira({ comments: [], total: 250 });
  const r = await cli.run({
    argv: ["node", "x", "--issue", "PROJ-1", "--body-file", f, "--stage", "done", "--quiet"],
    execImpl: explode("gh"),
    fetchImpl: j.fetchImpl,
    repoRoot: dir,
    env: { ...JIRA_ENV },
  });
  assert.equal(r.reason, "unverifiable");
  assert.ok(!j.calls.some((c) => c.method === "POST"));
});

test("jira: a failed POST reports unverifiable", async () => {
  const dir = withRepo();
  const f = bodyFile(dir, "body");
  const j = stubJira({ comments: [], postOk: false });
  const r = await cli.run({
    argv: ["node", "x", "--issue", "PROJ-1", "--body-file", f, "--stage", "done", "--quiet"],
    execImpl: explode("gh"),
    fetchImpl: j.fetchImpl,
    repoRoot: dir,
    env: { ...JIRA_ENV },
  });
  assert.equal(r.reason, "unverifiable");
  assert.equal(r.cause, "post-failed");
});

test("jira: no credentials → no-credentials, the MCP fallback's only cue", async () => {
  const dir = withRepo();
  const f = bodyFile(dir, "body");
  const r = await cli.run({
    argv: ["node", "x", "--issue", "PROJ-1", "--body-file", f, "--quiet"],
    execImpl: explode("gh"),
    fetchImpl: explode("fetch"),
    repoRoot: dir,
    env: { TRACKER: "jira", JIRA_URL: "https://example.atlassian.net" },
  });
  assert.equal(r.reason, "no-credentials");
  assert.equal(r.exitCode, 0);
});

test("jira: a restricted mode defers with the jira.comment.add kind", async () => {
  const dir = withRepo();
  const f = bodyFile(dir, "body");
  const r = await cli.run({
    argv: ["node", "x", "--issue", "PROJ-1", "--body-file", f, "--stage", "done", "--quiet"],
    execImpl: explode("gh"),
    fetchImpl: explode("fetch"),
    repoRoot: dir,
    env: { ...JIRA_ENV, ACCESS_TRACKER: "manual" },
  });
  assert.equal(r.reason, "deferred");
  const recs = readJournal(dir);
  assert.equal(recs.length, 1);
  assert.equal(recs[0].kind, "jira.comment.add");
  assert.equal(recs[0].system, "jira");
});

// ── Fence rendering regressions (QA-2, QA-3) ────────────────────────────────

test("a multi-word info string is a fence, and the tail is not swallowed", () => {
  // The regression: RE_CODE_FENCE required a single-token info string, so
  // ```js title="x" did not match. The opening line rendered as prose and the
  // CLOSING fence was then read as an opening one, absorbing every subsequent
  // block. Silent content loss in the published description.
  const nodes = jira.textToAdfNodes(
    'intro\n\n```js title="x"\nconst a = 1;\n```\n\ntail prose',
  );
  assert.deepEqual(nodes.map((n) => n.type), ["paragraph", "codeBlock", "paragraph"]);
  assert.equal(nodes[1].attrs.language, "js", "only the first token is the language");
  assert.equal(nodes[1].content[0].text, "const a = 1;");
  assert.equal(nodes[2].content[0].text, "tail prose", "the tail survives");
});

test("a 4-backtick fence is not closed by a 3-backtick line", () => {
  // Three shipped documents in this repo nest ``` inside ````.
  const nodes = jira.textToAdfNodes("````\na\n```\nb\n````");
  assert.deepEqual(nodes.map((n) => n.type), ["codeBlock"]);
  assert.equal(nodes[0].content[0].text, "a\n```\nb");
});

test("a closing fence carrying an info string does not close", () => {
  const nodes = jira.textToAdfNodes("```\na\n```js\nb\n```");
  assert.deepEqual(nodes.map((n) => n.type), ["codeBlock"]);
  assert.ok(nodes[0].content[0].text.includes("```js"));
});

test("a prose line opening with an inline code span is NOT a fence (NEW-1)", () => {
  // The first fix for the multi-word info string relaxed the tail to `[^\n]*`,
  // which let backticks back in — so a prose line merely BEGINNING with an
  // inline code span of three or more backticks became an opening fence. One
  // live document hit it: task.42 line 313, where 31,235 characters collapsed
  // into a single code block. CommonMark's actual rule is that a BACKTICK
  // fence's info string may not contain a backtick; tilde fences are exempt,
  // because `~` cannot open a code span.
  assert.equal(jira.matchCodeFence("```` ``` ```` or `~~~` fenced block."), null);
  assert.equal(jira.matchCodeFence("``` `x` ```"), null);
  // ...while the shapes that ARE fences still are.
  assert.deepEqual(jira.matchCodeFence("```"), { delim: "```", lang: "" });
  assert.deepEqual(jira.matchCodeFence("```js"), { delim: "```", lang: "js" });
  assert.deepEqual(jira.matchCodeFence('```js title="x"'), { delim: "```", lang: "js" });
  assert.deepEqual(jira.matchCodeFence("````"), { delim: "````", lang: "" });
  // A tilde fence MAY carry a backtick in its info string.
  assert.deepEqual(jira.matchCodeFence("~~~ `x`"), { delim: "~~~", lang: "`x`" });
});

test("a real shipped document round-trips without collapsing (NEW-1)", () => {
  // The regression test with teeth: the actual file that broke. A unit test on
  // the predicate would not have caught the first fix's failure, because the
  // shape only appears in prose nobody thought to write down.
  const md = readFileSync(
    join(
      __dirname, "..", "..", "..",
      "docs/tasks/task.42.change-log-spec-and-engine/task.42.change-log-spec-and-engine.md",
    ),
    "utf8",
  );
  const nodes = jira.textToAdfNodes(md);
  const biggest = Math.max(
    ...nodes
      .filter((n) => n.type === "codeBlock")
      .map((n) => (n.content ? n.content[0].text.length : 0)),
    0,
  );
  assert.ok(nodes.length > 100, `document collapsed to ${nodes.length} nodes`);
  assert.ok(biggest < 5000, `a code block swallowed ${biggest} characters`);
});

test("the renderer never treats as a fence something the extractor would not", () => {
  // Direction matters. The extractor being permissive is survivable; the
  // RENDERER being permissive loses content. So the requirement is
  // renderer ⊆ extractor, not the reverse — the earlier symmetric assertion is
  // what pushed the renderer to over-match.
  const RE_FENCE = /^\s*(```|~~~)/;
  for (const line of [
    "```", "```js", '```js title="x"', "````", "~~~", "~~~python",
    "   ```bash extra words here", "```` ``` ```` or `~~~` fenced block.",
    "not a fence", "`inline`",
  ]) {
    if (jira.matchCodeFence(line)) {
      assert.ok(RE_FENCE.test(line), `renderer matched a non-fence: ${line}`);
    }
  }
});

test("a body that renders to nothing produces legal ADF, not an empty text node", () => {
  // ADF rejects a text node with an empty string; Jira 400s and the run reports
  // unverifiable instead of posting. Reachable with a body of only `---`.
  const doc = jira.buildCommentAdf("---", "");
  const json = JSON.stringify(doc);
  assert.ok(!json.includes('"text":""'), `empty text node in ${json}`);
});

test("jira: a comment list with no `total` fails CLOSED (NEW-2)", async () => {
  // Every other unreadable path fails closed; this one read a payload without
  // `total` as "nothing found" and posted the duplicate.
  const dir = withRepo();
  const f = bodyFile(dir, "body");
  // Record the POST rather than throwing on it: a thrown POST is ALSO reported
  // as `unverifiable` (cause: post-failed), so throwing cannot distinguish
  // "never posted" from "tried and failed" — and the mutation that reverts this
  // fix would slip straight through.
  const posts = [];
  const fetchImpl = async (url, opts = {}) => {
    if ((opts.method || "GET") === "GET") {
      return { ok: true, status: 200, async json() { return { comments: [] }; },
               async text() { return "{}"; }, headers: { get: () => null } };
    }
    posts.push(url);
    return { ok: true, status: 201, async json() { return { id: "1" }; },
             async text() { return "{}"; }, headers: { get: () => null } };
  };
  const r = await cli.run({
    argv: ["node", "x", "--issue", "PROJ-1", "--body-file", f, "--stage", "done", "--quiet"],
    execImpl: explode("gh"), fetchImpl, repoRoot: dir, env: { ...JIRA_ENV },
  });
  assert.equal(posts.length, 0, "must not post on a list it could not verify");
  assert.equal(r.reason, "unverifiable");
});

test("github: the comment read is paginated, and a partial read is unverifiable (NEW-3)", async () => {
  const dir = withRepo();
  const f = bodyFile(dir, "body");
  const seen = [];
  // `gh api --paginate` unavailable → falls back to the partial read, which
  // must NOT report a confident zero.
  const execImpl = (bin, argv) => {
    seen.push(argv.join(" "));
    if (argv[0] === "auth") return "";
    if (argv[0] === "repo") return "owner/repo";
    if (argv[0] === "api") throw new Error("no --paginate on this gh");
    if (argv[0] === "issue" && argv[1] === "view") return JSON.stringify({ comments: [] });
    // Recorded, not thrown — a thrown post is also `unverifiable`, so throwing
    // could not tell "never posted" from "tried and failed".
    if (argv[0] === "issue" && argv[1] === "comment") return "";
    throw new Error(`unexpected gh call: ${argv.join(" ")}`);
  };
  const r = await cli.run({
    argv: ["node", "x", "--issue", "42", "--body-file", f, "--stage", "done", "--quiet"],
    execImpl, repoRoot: dir, env: { ...baseEnv },
  });
  assert.ok(seen.some((c) => c.startsWith("api --paginate")), "tried the paginated read first");
  assert.ok(
    !seen.some((c) => c.startsWith("issue comment")),
    "must not post on the strength of a partial list",
  );
  assert.equal(r.reason, "unverifiable");
});

test("github: the paginated read finds a marker across pages (NEW-3)", async () => {
  const dir = withRepo();
  const f = bodyFile(dir, "body");
  const marker = cli.markerHtml("done");
  const execImpl = (bin, argv) => {
    if (argv[0] === "auth") return "";
    if (argv[0] === "repo") return "owner/repo";
    if (argv[0] === "api") {
      // 120 comments, the marked one last — beyond a single unpaginated window.
      return [...Array(119).fill("chatter"), `${marker}\nposted earlier`].join("\n");
    }
    throw new Error("should not post");
  };
  const r = await cli.run({
    argv: ["node", "x", "--issue", "42", "--body-file", f, "--stage", "done", "--quiet"],
    execImpl, repoRoot: dir, env: { ...baseEnv },
  });
  assert.equal(r.reason, "already");
});

test("the numeric suffix is legal only for cycle-scoped stages (NEW-6)", () => {
  assert.equal(cli.isKnownStage("qa-cycle-2"), true);
  assert.equal(cli.isKnownStage("qa-fix-11"), true);
  // `done-1` used to pass, which made the runtime rule broader than the error
  // message promised — a rule nobody can predict from its own message.
  assert.equal(cli.isKnownStage("done-1"), false);
  assert.equal(cli.isKnownStage("review-3"), false);
  assert.deepEqual([...cli.CYCLE_SCOPED_STAGES], ["qa-cycle", "qa-fix"]);
});
