"use strict";
/**
 * pr-inline-comment.test.mjs — the inline PR comment CLI.
 *
 * ONE INVARIANT DOMINATES THIS FILE: a finding is never dropped.
 *
 *     Anchoring fails routinely — a line outside the diff hunk is a 422, and a
 *     finding about an unchanged function whose caller moved has no line to
 *     attach to. So the tests below do not merely check that a rejection is
 *     handled; they check that the rejected finding's TEXT reaches the summary
 *     comment, and that it reports `anchor-failed` rather than `posted`. A
 *     degraded finding reported as posted is indistinguishable from a dropped
 *     one to the person reading the review.
 *
 * NO NETWORK UNDER A RESTRICTED MODE. Both transports (`execImpl`, `fetchImpl`)
 * are injected as THROWING stubs in the gate tests, so a leak fails the test
 * rather than being counted after the fact.
 *
 * Run: node --test shared/resources/tests/pr-inline-comment.test.mjs
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

const cli = require(join(SHARED, "pr-inline-comment.js"));
const CLI_PATH = join(SHARED, "pr-inline-comment.js");

const RESTRICTED = ["read-only", "approve", "command", "manual"];

const dirs = [];
process.on("exit", () => {
  for (const d of dirs) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch (_) {}
  }
});

function withRepo(files = {}) {
  const dir = mkdtempSync(join(tmpdir(), "pr-inline-"));
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

const FINDINGS = [
  { path: "src/a.ts", line: 12, body: "**Bug** — null deref on `x`." },
  { path: "src/b.ts", line: 7, body: "Simplify this branch." },
];

function findingsFile(dir, findings = FINDINGS) {
  const p = join(dir, "findings.json");
  writeFileSync(p, JSON.stringify(findings), "utf8");
  return p;
}

/**
 * A `gh` stub. `rejectBatch` makes the batched review fail (forcing the
 * per-comment fallback); `rejectLines` names the 1-based lines whose
 * per-comment POST returns a 422.
 */
function stubGh({
  existing = [],
  rejectBatch = false,
  rejectLines = [],
  summaryFails = false,
  listFails = false,
} = {}) {
  const calls = [];
  const execImpl = (bin, argv, opts) => {
    calls.push({ bin, argv, input: opts && opts.input });
    if (argv[0] === "auth") return "";
    if (argv[0] === "remote") return "git@github.com:acme/repo.git";
    if (argv[0] === "repo") {
      return JSON.stringify({ owner: { login: "acme" }, name: "repo" });
    }
    if (argv[0] === "pr" && argv[1] === "view") {
      return JSON.stringify({ headRefOid: "abc123def456" });
    }
    if (argv[0] === "pr" && argv[1] === "comment") {
      if (summaryFails) throw new Error("gh pr comment failed");
      return "";
    }
    if (argv[0] === "api") {
      const method = argv[argv.indexOf("--method") + 1];
      const route = argv.find((a) => a.startsWith("/repos/"));
      if (!argv.includes("--method")) {
        // The paginated read of existing review comments.
        if (listFails) throw new Error("gh api list failed");
        return JSON.stringify(existing);
      }
      if (method === "POST" && route.endsWith("/reviews")) {
        if (rejectBatch) throw new Error("HTTP 422: Unprocessable Entity");
        return "{}";
      }
      if (method === "POST" && route.endsWith("/comments")) {
        const body = JSON.parse(opts.input);
        if (rejectLines.includes(body.line)) {
          throw new Error("HTTP 422: line must be part of the diff");
        }
        return "{}";
      }
      if (method === "PATCH") return "{}";
    }
    throw new Error(`unexpected gh call: ${argv.join(" ")}`);
  };
  return { execImpl, calls };
}

const summaryOf = (calls) => {
  const c = calls.find((x) => x.argv[0] === "pr" && x.argv[1] === "comment");
  return c ? c.input : null;
};

// ── 1. THE INVARIANT: a rejected finding is delivered, not dropped ─────────

test("§1 a 422 degrades to the summary comment and the finding text survives", async () => {
  const dir = withRepo();
  const { execImpl, calls } = stubGh({ rejectBatch: true, rejectLines: [12] });
  const r = await cli.run({
    argv: [
      "node",
      "cli",
      "--pr",
      "5",
      "--findings-file",
      findingsFile(dir),
      "--json",
    ],
    execImpl,
    repoRoot: dir,
    env: { VCS: "github", ACCESS_TRACKER: "full" },
  });

  assert.equal(r.exitCode, 0, "commenting never gates anything");
  assert.equal(r.reason, "partial", "some inline, some degraded");
  assert.equal(r.posted, 1, "the anchorable finding still posted inline");
  assert.equal(r.degraded, 1);

  const rejected = r.findings.find((f) => f.line === 12);
  assert.equal(
    rejected.reason,
    "anchor-failed",
    "a degraded finding must NEVER report `posted` — that hides the failure",
  );

  const summary = summaryOf(calls);
  assert.ok(
    summary,
    "a summary comment must be posted to carry the degraded finding",
  );
  assert.match(
    summary,
    /null deref on `x`/,
    "THE INVARIANT: the degraded finding's own text must reach the reader",
  );
  assert.match(
    summary,
    /could not be anchored/i,
    "and must say why it is there",
  );
});

test("§1 every finding degrading still delivers every one of them", async () => {
  const dir = withRepo();
  const { execImpl, calls } = stubGh({
    rejectBatch: true,
    rejectLines: [12, 7],
  });
  const r = await cli.run({
    argv: [
      "node",
      "cli",
      "--pr",
      "5",
      "--findings-file",
      findingsFile(dir),
      "--json",
    ],
    execImpl,
    repoRoot: dir,
    env: { VCS: "github", ACCESS_TRACKER: "full" },
  });
  assert.equal(r.posted, 0);
  assert.equal(r.degraded, 2);
  const summary = summaryOf(calls);
  assert.match(summary, /null deref on `x`/);
  assert.match(summary, /Simplify this branch/);
});

test("§1 an unpostable summary prints the findings to stderr rather than losing them", async () => {
  const dir = withRepo();
  const { execImpl } = stubGh({
    rejectBatch: true,
    rejectLines: [12],
    summaryFails: true,
  });
  const seen = [];
  const origErr = console.error;
  console.error = (m) => seen.push(String(m));
  try {
    const r = await cli.run({
      argv: [
        "node",
        "cli",
        "--pr",
        "5",
        "--findings-file",
        findingsFile(dir),
        "--json",
      ],
      execImpl,
      repoRoot: dir,
      env: { VCS: "github", ACCESS_TRACKER: "full" },
    });
    assert.equal(r.reason, "summary-failed");
  } finally {
    console.error = origErr;
  }
  assert.ok(
    seen.some((l) => /null deref on `x`/.test(l)),
    "stderr is the last channel that cannot fail — the text must go there",
  );
});

// ── 2. GitHub payload shape ───────────────────────────────────────────────

test("§2 the batched review carries event, the PR head SHA, and a comments[] array", async () => {
  const dir = withRepo();
  const { execImpl, calls } = stubGh();
  await cli.run({
    argv: [
      "node",
      "cli",
      "--pr",
      "5",
      "--findings-file",
      findingsFile(dir),
      "--json",
    ],
    execImpl,
    repoRoot: dir,
    env: { VCS: "github", ACCESS_TRACKER: "full" },
  });

  const batch = calls.find((c) => c.argv.join(" ").includes("/reviews"));
  assert.ok(
    batch,
    "the batched form is preferred — one call, one notification",
  );
  const payload = JSON.parse(batch.input);
  assert.equal(payload.event, "COMMENT");
  assert.equal(
    payload.commit_id,
    "abc123def456",
    "commit_id must be the PR head SHA, never local HEAD",
  );
  assert.equal(payload.comments.length, 2);
  assert.equal(payload.comments[0].path, "src/a.ts");
  assert.equal(payload.comments[0].line, 12);
  assert.equal(payload.comments[0].side, "RIGHT");
});

test("§2 one batched call is made, not one call per finding", async () => {
  const dir = withRepo();
  const { execImpl, calls } = stubGh();
  await cli.run({
    argv: [
      "node",
      "cli",
      "--pr",
      "5",
      "--findings-file",
      findingsFile(dir),
      "--json",
    ],
    execImpl,
    repoRoot: dir,
    env: { VCS: "github", ACCESS_TRACKER: "full" },
  });
  const perComment = calls.filter(
    (c) =>
      c.argv.join(" ").includes("/pulls/5/comments") &&
      c.argv.includes("--method"),
  );
  assert.equal(
    perComment.length,
    0,
    "no per-comment POST when the batch succeeded",
  );
});

test("§2 a wholesale batch rejection falls back to per-comment, isolating the bad anchor", async () => {
  const dir = withRepo();
  const { execImpl, calls } = stubGh({ rejectBatch: true, rejectLines: [12] });
  const r = await cli.run({
    argv: [
      "node",
      "cli",
      "--pr",
      "5",
      "--findings-file",
      findingsFile(dir),
      "--json",
    ],
    execImpl,
    repoRoot: dir,
    env: { VCS: "github", ACCESS_TRACKER: "full" },
  });
  const perComment = calls.filter(
    (c) =>
      c.argv.includes("--method") &&
      c.argv.join(" ").includes("/pulls/5/comments"),
  );
  assert.equal(perComment.length, 2, "each finding is retried individually");
  assert.equal(
    r.posted,
    1,
    "the good one lands rather than dying with the batch",
  );
});

// ── 3. Bitbucket payload shape ────────────────────────────────────────────

function stubBb({ rejectLines = [] } = {}) {
  const posts = [];
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body);
    posts.push({ url, body });
    if (
      body.inline &&
      rejectLines.includes(body.inline.to || body.inline.from)
    ) {
      return { ok: false, status: 400, text: async () => "line not in diff" };
    }
    return { ok: true, status: 201, text: async () => "{}" };
  };
  const execImpl = (bin, argv) => {
    if (argv[0] === "remote") return "git@bitbucket.org:acme/repo.git";
    throw new Error(`unexpected exec: ${argv.join(" ")}`);
  };
  return { fetchImpl, execImpl, posts };
}

test("§3 the Bitbucket payload carries inline.path and inline.to", async () => {
  const dir = withRepo();
  const { fetchImpl, execImpl, posts } = stubBb();
  const r = await cli.run({
    argv: [
      "node",
      "cli",
      "--pr",
      "9",
      "--findings-file",
      findingsFile(dir),
      "--json",
    ],
    execImpl,
    fetchImpl,
    repoRoot: dir,
    env: {
      VCS: "bitbucket",
      ACCESS_TRACKER: "full",
      BITBUCKET_ACCESS_TOKEN: "tok",
    },
  });
  assert.equal(r.posted, 2);
  assert.equal(posts[0].body.inline.path, "src/a.ts");
  assert.equal(posts[0].body.inline.to, 12);
  assert.ok(posts[0].url.includes("/pullrequests/9/comments"));
});

test("§3 a deletion anchors with `from`, not `to`", async () => {
  const dir = withRepo();
  const { fetchImpl, execImpl, posts } = stubBb();
  const f = findingsFile(dir, [
    {
      path: "src/gone.ts",
      line: 40,
      side: "LEFT",
      body: "This deletion is wrong.",
    },
  ]);
  await cli.run({
    argv: ["node", "cli", "--pr", "9", "--findings-file", f, "--json"],
    execImpl,
    fetchImpl,
    repoRoot: dir,
    env: {
      VCS: "bitbucket",
      ACCESS_TRACKER: "full",
      BITBUCKET_ACCESS_TOKEN: "tok",
    },
  });
  assert.equal(
    posts[0].body.inline.from,
    40,
    "a LEFT-side finding anchors the SOURCE line — `to` would silently attach " +
      "to whatever now occupies that line number",
  );
  assert.equal(posts[0].body.inline.to, undefined);
});

test("§3 a rejected Bitbucket anchor degrades rather than dropping", async () => {
  const dir = withRepo();
  const { fetchImpl, execImpl, posts } = stubBb({ rejectLines: [12] });
  const r = await cli.run({
    argv: [
      "node",
      "cli",
      "--pr",
      "9",
      "--findings-file",
      findingsFile(dir),
      "--json",
    ],
    execImpl,
    fetchImpl,
    repoRoot: dir,
    env: {
      VCS: "bitbucket",
      ACCESS_TRACKER: "full",
      BITBUCKET_ACCESS_TOKEN: "tok",
    },
  });
  assert.equal(r.reason, "partial");
  assert.equal(r.findings.find((x) => x.line === 12).reason, "anchor-failed");
  const summary = posts.find((p) => !p.body.inline);
  assert.ok(summary, "a summary comment carries the degraded finding");
  assert.match(summary.body.content.raw, /null deref on `x`/);
});

test("§3 a failed Bitbucket summary is reported, not swallowed as posted", async () => {
  // The async trap. `postSummary` on this arm returns a promise; calling it
  // without awaiting lets the rejection escape the catch while `summaryPosted`
  // is set true anyway — a run that lost every degraded finding reporting
  // success. This test is the reason `finishRun` is async.
  const dir = withRepo();
  const posts = [];
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body);
    posts.push(body);
    if (!body.inline) {
      return { ok: false, status: 500, text: async () => "summary rejected" };
    }
    return { ok: false, status: 400, text: async () => "line not in diff" };
  };
  const execImpl = (bin, argv) =>
    argv[0] === "remote" ? "git@bitbucket.org:acme/repo.git" : "";
  const r = await cli.run({
    argv: [
      "node",
      "cli",
      "--pr",
      "9",
      "--findings-file",
      findingsFile(dir),
      "--json",
    ],
    execImpl,
    fetchImpl,
    repoRoot: dir,
    env: {
      VCS: "bitbucket",
      ACCESS_TRACKER: "full",
      BITBUCKET_ACCESS_TOKEN: "tok",
    },
  });
  assert.equal(
    r.reason,
    "summary-failed",
    "an unawaited rejection would leave this reporting success",
  );
  assert.equal(r.summaryPosted, false);
});

test("§3 no Bitbucket credential reports no-credentials and makes no call", async () => {
  const dir = withRepo();
  const r = await cli.run({
    argv: [
      "node",
      "cli",
      "--pr",
      "9",
      "--findings-file",
      findingsFile(dir),
      "--json",
    ],
    execImpl: (bin, argv) =>
      argv[0] === "remote" ? "git@bitbucket.org:acme/repo.git" : "",
    fetchImpl: explode("fetch"),
    repoRoot: dir,
    env: { VCS: "bitbucket", ACCESS_TRACKER: "full" },
  });
  assert.equal(r.reason, "no-credentials");
  assert.equal(r.exitCode, 0);
});

// ── 4. The re-run rule ────────────────────────────────────────────────────

test("§4 an existing marker is updated in place, not duplicated", async () => {
  const dir = withRepo();
  const marker = cli.markerHtml("src/a.ts:12:RIGHT");
  const { execImpl, calls } = stubGh({
    existing: [
      { id: 999, body: `${marker}\nold text`, path: "src/a.ts", line: 12 },
    ],
  });
  const r = await cli.run({
    argv: [
      "node",
      "cli",
      "--pr",
      "5",
      "--findings-file",
      findingsFile(dir),
      "--json",
    ],
    execImpl,
    repoRoot: dir,
    env: { VCS: "github", ACCESS_TRACKER: "full" },
  });
  const patch = calls.find((c) => c.argv.includes("PATCH"));
  assert.ok(patch, "the existing comment is edited, not re-posted");
  assert.match(patch.argv.join(" "), /pulls\/comments\/999/);
  assert.equal(r.findings.find((f) => f.line === 12).reason, "updated");
  assert.equal(r.posted, 1, "only the genuinely new finding posts");
});

test("§4 a duplicate marker is unverifiable — not resolved by taking the first", async () => {
  const dir = withRepo();
  const marker = cli.markerHtml("src/a.ts:12:RIGHT");
  const { execImpl, calls } = stubGh({
    existing: [
      { id: 1, body: `${marker}\nfirst`, path: "src/a.ts", line: 12 },
      { id: 2, body: `${marker}\nsecond`, path: "src/a.ts", line: 12 },
    ],
  });
  const r = await cli.run({
    argv: [
      "node",
      "cli",
      "--pr",
      "5",
      "--findings-file",
      findingsFile(dir),
      "--json",
    ],
    execImpl,
    repoRoot: dir,
    env: { VCS: "github", ACCESS_TRACKER: "full" },
  });
  assert.equal(r.findings.find((f) => f.line === 12).reason, "unverifiable");
  assert.equal(
    calls.filter((c) => c.argv.includes("PATCH")).length,
    0,
    "adopting the first hides the second forever — do neither",
  );
});

test("§4 unreadable existing comments degrade to the summary rather than duplicating", async () => {
  const dir = withRepo();
  const { execImpl, calls } = stubGh({ listFails: true });
  const r = await cli.run({
    argv: [
      "node",
      "cli",
      "--pr",
      "5",
      "--findings-file",
      findingsFile(dir),
      "--json",
    ],
    execImpl,
    repoRoot: dir,
    env: { VCS: "github", ACCESS_TRACKER: "full" },
  });
  assert.equal(
    r.posted,
    0,
    "posting blind is how a resume doubles every comment",
  );
  assert.match(summaryOf(calls), /null deref on `x`/, "still delivered");
});

// ── 5. The access gate ────────────────────────────────────────────────────

for (const mode of RESTRICTED) {
  test(`§5 access.tracker=${mode} records the findings and makes NO network call`, async () => {
    const dir = withRepo();
    const r = await cli.run({
      argv: [
        "node",
        "cli",
        "--pr",
        "5",
        "--findings-file",
        findingsFile(dir),
        "--json",
      ],
      execImpl: explode("execFileSync"),
      fetchImpl: explode("fetch"),
      repoRoot: dir,
      env: { VCS: "github", ACCESS_TRACKER: mode },
    });
    assert.equal(r.reason, "deferred");
    assert.equal(r.exitCode, 0);
    const journal = readJournal(dir);
    assert.equal(
      journal.length,
      2,
      "one record PER FINDING — a single batched record would collapse N " +
        "findings into one and lose N-1, relocating the drop into the handover",
    );
    assert.equal(journal[0].kind, "github.pr.comment");
    assert.ok(
      journal
        .map((j) => j.command.stdin)
        .includes("**Bug** — null deref on `x`."),
      "the full body rides in stdin, never interpolated",
    );
  });
}

test("§5 a restricted Bitbucket run records bitbucket.pr.comment", async () => {
  const dir = withRepo();
  const r = await cli.run({
    argv: [
      "node",
      "cli",
      "--pr",
      "9",
      "--findings-file",
      findingsFile(dir),
      "--json",
    ],
    execImpl: (bin, argv) =>
      argv[0] === "remote"
        ? "git@bitbucket.org:acme/repo.git"
        : explode("exec")(),
    fetchImpl: explode("fetch"),
    repoRoot: dir,
    env: {
      VCS: "bitbucket",
      ACCESS_TRACKER: "manual",
      BITBUCKET_ACCESS_TOKEN: "tok",
    },
  });
  assert.equal(r.reason, "deferred");
  assert.equal(readJournal(dir)[0].kind, "bitbucket.pr.comment");
});

test("§5 an unset ACCESS_TRACKER reads as full — never as restricted", async () => {
  const dir = withRepo();
  const { execImpl } = stubGh();
  const r = await cli.run({
    argv: [
      "node",
      "cli",
      "--pr",
      "5",
      "--findings-file",
      findingsFile(dir),
      "--json",
    ],
    execImpl,
    repoRoot: dir,
    env: { VCS: "github" },
  });
  assert.equal(
    r.reason,
    "posted",
    "the comparison is !== 'full', never truthiness — otherwise this CLI " +
      "silently stops commenting everywhere",
  );
});

// ── 6. --dry-run ──────────────────────────────────────────────────────────

test("§6 --dry-run resolves everything and makes no network call", async () => {
  const dir = withRepo();
  const r = await cli.run({
    argv: [
      "node",
      "cli",
      "--pr",
      "5",
      "--findings-file",
      findingsFile(dir),
      "--dry-run",
      "--json",
    ],
    execImpl: explode("execFileSync"),
    fetchImpl: explode("fetch"),
    repoRoot: dir,
    env: { VCS: "github", ACCESS_TRACKER: "full" },
  });
  assert.equal(r.reason, "dry-run");
  assert.equal(r.exitCode, 0);
  assert.equal(r.findings.length, 2);
});

test("§6 --dry-run under a restricted mode is still a dry run, and writes no journal", async () => {
  const dir = withRepo();
  const r = await cli.run({
    argv: [
      "node",
      "cli",
      "--pr",
      "5",
      "--findings-file",
      findingsFile(dir),
      "--dry-run",
      "--json",
    ],
    execImpl: explode("execFileSync"),
    repoRoot: dir,
    env: { VCS: "github", ACCESS_TRACKER: "manual" },
  });
  assert.equal(
    r.reason,
    "dry-run",
    "--dry-run is exempt: it performs no mutation",
  );
  assert.equal(readJournal(dir).length, 0);
});

// ── 7. Exit codes — identical to tracker-comment.js ───────────────────────

test("§7 a missing --pr is exit 2", async () => {
  const r = await cli.run({
    argv: ["node", "cli", "--findings-file", "/nope"],
    env: {},
  });
  assert.equal(r.exitCode, 2);
});

test("§7 a non-numeric --pr is exit 2", async () => {
  const r = await cli.run({
    argv: ["node", "cli", "--pr", "abc", "--findings-file", "/nope"],
    env: {},
  });
  assert.equal(r.exitCode, 2);
});

test("§7 a missing --findings-file is exit 2", async () => {
  const r = await cli.run({ argv: ["node", "cli", "--pr", "5"], env: {} });
  assert.equal(r.exitCode, 2);
});

test("§7 an unreadable findings file is exit 2", async () => {
  const r = await cli.run({
    argv: [
      "node",
      "cli",
      "--pr",
      "5",
      "--findings-file",
      "/definitely/not/here.json",
    ],
    env: {},
  });
  assert.equal(r.exitCode, 2);
});

test("§7 malformed findings JSON is exit 2, not a silent empty run", async () => {
  const dir = withRepo({ "bad.json": "{not json" });
  const r = await cli.run({
    argv: [
      "node",
      "cli",
      "--pr",
      "5",
      "--findings-file",
      join(dir, "bad.json"),
    ],
    repoRoot: dir,
    env: {},
  });
  assert.equal(r.exitCode, 2);
});

test("§7 a finding missing `line` is exit 2 — an unanchorable finding is a usage error", async () => {
  const dir = withRepo({
    "f.json": JSON.stringify([{ path: "a.ts", body: "x" }]),
  });
  const r = await cli.run({
    argv: ["node", "cli", "--pr", "5", "--findings-file", join(dir, "f.json")],
    repoRoot: dir,
    env: {},
  });
  assert.equal(r.exitCode, 2);
});

test("§7 an unknown flag is exit 2", async () => {
  const r = await cli.run({ argv: ["node", "cli", "--nope"], env: {} });
  assert.equal(r.exitCode, 2);
});

test("§7 a value-taking flag with no value fails CLOSED", async () => {
  const r = await cli.run({
    argv: ["node", "cli", "--pr", "--json", "--findings-file", "/x"],
    env: {},
  });
  assert.equal(r.exitCode, 2, "--pr --json must not swallow the flag");
});

test("§7 --strict turns a skip into exit 1; the default leaves it 0", async () => {
  const dir = withRepo();
  const args = (extra) => [
    "node",
    "cli",
    "--pr",
    "5",
    "--findings-file",
    findingsFile(dir),
    "--json",
    ...extra,
  ];
  const noGh = () => {
    throw new Error("gh missing");
  };
  const lenient = await cli.run({
    argv: args([]),
    execImpl: noGh,
    repoRoot: dir,
    env: { VCS: "github", ACCESS_TRACKER: "full" },
  });
  assert.equal(
    lenient.exitCode,
    0,
    "commenting never gates anything by default",
  );
  const strict = await cli.run({
    argv: args(["--strict"]),
    execImpl: noGh,
    repoRoot: dir,
    env: { VCS: "github", ACCESS_TRACKER: "full" },
  });
  assert.equal(strict.exitCode, 1);
});

test("§7 the real binary exits 0 on --help and 2 on a usage error", () => {
  const ok = spawnSync(process.execPath, [CLI_PATH, "--help"], {
    encoding: "utf8",
  });
  assert.equal(ok.status, 0);
  assert.match(ok.stdout, /pr-inline-comment/);
  const bad = spawnSync(process.execPath, [CLI_PATH, "--pr", "5"], {
    encoding: "utf8",
  });
  assert.equal(bad.status, 2, "missing --findings-file is a usage error");
});

// ── 8. Platform resolution — the VCS axis, not TRACKER ────────────────────

test("§8 VCS is resolved from the remote when unset, and TRACKER cannot steer it", () => {
  const bb = () => "https://bitbucket.org/acme/repo.git";
  assert.equal(cli.resolveVcs("", { TRACKER: "jira" }, bb), "bitbucket");
  const gh = () => "git@github.com:acme/repo.git";
  assert.equal(cli.resolveVcs("", { TRACKER: "jira" }, gh), "github");
});

test("§8 an explicit --vcs wins, and an unrecognised one throws", () => {
  assert.equal(
    cli.resolveVcs("bitbucket", { VCS: "github" }, () => ""),
    "bitbucket",
  );
  assert.throws(() => cli.resolveVcs("gitlab", {}, () => ""), /Unknown vcs/);
});

test("§8 the Bitbucket slug parses both ssh and https remotes", () => {
  assert.deepEqual(
    cli.bbSlug(() => "git@bitbucket.org:acme/repo.git"),
    {
      workspace: "acme",
      repo: "repo",
    },
  );
  assert.deepEqual(
    cli.bbSlug(() => "https://u@bitbucket.org/acme/repo.git"),
    {
      workspace: "acme",
      repo: "repo",
    },
  );
});

test("§8 Bitbucket auth prefers a Bearer token, falls back to Basic", () => {
  assert.equal(
    cli.bbAuthHeader({ BITBUCKET_ACCESS_TOKEN: "t" }).scheme,
    "bearer",
  );
  assert.equal(
    cli.bbAuthHeader({ BITBUCKET_USERNAME: "u", BITBUCKET_API_TOKEN: "p" })
      .scheme,
    "basic",
  );
  assert.equal(
    cli.bbAuthHeader({ BITBUCKET_USERNAME: "u", BITBUCKET_APP_PASSWORD: "p" })
      .scheme,
    "basic",
    "the legacy app password is still honoured",
  );
  assert.equal(cli.bbAuthHeader({}).scheme, "none");
});

// ── 9. Housekeeping ───────────────────────────────────────────────────────

test("§9 no findings is a no-op, not an error", async () => {
  const dir = withRepo({ "empty.json": "[]" });
  const r = await cli.run({
    argv: [
      "node",
      "cli",
      "--pr",
      "5",
      "--findings-file",
      join(dir, "empty.json"),
      "--json",
    ],
    execImpl: explode("execFileSync"),
    repoRoot: dir,
    env: { VCS: "github", ACCESS_TRACKER: "full" },
  });
  assert.equal(r.exitCode, 0);
  assert.equal(r.posted, 0);
});

test("§9 the inline marker prefix is distinct from the issue-comment one", () => {
  const tc = require(join(SHARED, "tracker-comment.js"));
  assert.notEqual(cli.INLINE_MARKER_PREFIX, tc.COMMENT_MARKER_PREFIX);
  assert.ok(
    !cli.INLINE_MARKER_PREFIX.startsWith(tc.COMMENT_MARKER_PREFIX) &&
      !tc.COMMENT_MARKER_PREFIX.startsWith(cli.INLINE_MARKER_PREFIX),
    "neither may prefix the other, or a search for one matches the other",
  );
});

test("§9 a caller-supplied id is the finding's identity across runs", () => {
  assert.equal(cli.findingId({ id: "F1", path: "a.ts", line: 1 }), "F1");
  assert.equal(cli.findingId({ path: "a.ts", line: 1 }), "a.ts:1:RIGHT");
});

test("§9 an id the marker finder could not match is squeezed, not written raw", () => {
  // A marker holding a space cannot be found by the finder's own regex, so
  // every re-run would post a duplicate instead of updating in place.
  const id = cli.findingId({ id: "my finding > here", path: "a.ts", line: 1 });
  assert.doesNotMatch(id, /[\s>]/);
  const marker = cli.markerHtml(id);
  const found = marker.match(
    new RegExp(`<!--\\s*${cli.INLINE_MARKER_PREFIX}([^\\s>]+?)\\s*-->`),
  );
  assert.ok(found, "the marker this id produces must be findable again");
  assert.equal(found[1], id);
});
