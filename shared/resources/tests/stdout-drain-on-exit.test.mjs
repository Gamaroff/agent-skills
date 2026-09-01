"use strict";
/**
 * stdout-drain-on-exit — the regression guard for bug.3.stdout-truncation-on-exit.
 *
 * THE DEFECT
 * ----------
 * Node makes `process.stdout` SYNCHRONOUS for files and TTYs but ASYNCHRONOUS for
 * pipes. `process.exit()` does not flush a pending asynchronous write, so a CLI
 * that ends `write(...); process.exit(code)` silently truncates its own output at
 * the ~64KB pipe buffer — and only when the caller pipes it. Redirect the same
 * command to a file and it is complete. That asymmetry is why the defect sat in
 * three shipped CLIs unnoticed until `select-next.mjs --lint` grew past 64KB and
 * took `npm test` red with `Unterminated string in JSON at position 65266`.
 *
 * The correct idiom is `process.exitCode = code` plus normal control flow, which
 * lets the event loop drain the buffer before the process ends.
 *
 * WHY FOUR LAYERS
 * ---------------
 * 1. THE MECHANISM. A synthetic pair proves, on the machine actually running the
 *    suite, that exit-after-write truncates and exitCode-after-write does not.
 *    Without this the other layers assert a rule whose premise is unverified — and
 *    if a future Node makes pipe writes synchronous, this is the test that says so
 *    rather than the whole suite quietly becoming vacuous.
 *
 * 2. THE LIVE CASE. `select-next.mjs --lint` really does emit >64KB. Piped, it must
 *    parse. This is the only layer that fails on the pre-fix code, so it is the one
 *    that carries the mutation proof.
 *
 * 3. DRAIN EQUIVALENCE. For each fixed CLI, the bytes seen through a pipe must equal
 *    the bytes seen through a file. This is the bug's own statement of correct
 *    behaviour ("Output must not depend on whether the caller redirects to a file or
 *    reads a pipe") checked directly. At today's output sizes two of the three
 *    would pass pre-fix, so this layer characterises rather than catches — layer 4
 *    is what holds those two.
 *
 * 4. THE STRUCTURAL GUARD. Fixing three files and trusting memory is what the bug
 *    explicitly asked us not to do. This layer scans the source for the pattern, so
 *    a fourth instance cannot be added silently. Files not yet migrated are named in
 *    KNOWN_UNMIGRATED — a visible, shrinking list rather than invisible debt. The
 *    guard fails both ways: a NEW file with the pattern fails it, and an allowlisted
 *    file that has since been fixed also fails it, so the list cannot go stale.
 *
 * Run: node --test shared/resources/tests/stdout-drain-on-exit.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  closeSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { spawnBudget } from "./spawn-budget.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..", "..", "..");
const { timeoutMs: SPAWN_TIMEOUT_MS } = spawnBudget("STDOUT_DRAIN");

/** Node's pipe buffer. Output must exceed this for truncation to be observable. */
const PIPE_BUFFER_BYTES = 65536;

/* ------------------------------------------------------------------ *
 * Layer 1 — the mechanism
 * ------------------------------------------------------------------ */

/** A throwaway CLI that writes `bytes` of payload and then ends via `ending`. */
function writeThenEnd(bytes, ending) {
  return `
const payload = "x".repeat(${bytes});
process.stdout.write(JSON.stringify({ payload }) + "\\n");
${ending}
`;
}

function runScript(source) {
  const dir = mkdtempSync(join(os.tmpdir(), "drain-"));
  const file = join(dir, "cli.mjs");
  writeFileSync(file, source);
  try {
    // Piped stdout: `spawnSync` without stdio:inherit gives the child a pipe,
    // which is exactly the caller shape that truncates.
    const r = spawnSync(process.execPath, [file], {
      encoding: "utf-8",
      maxBuffer: 64 * 1024 * 1024,
      timeout: SPAWN_TIMEOUT_MS,
    });
    return { stdout: r.stdout ?? "", status: r.status };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("mechanism: process.exit() after a large write truncates on a pipe", () => {
  const { stdout } = runScript(
    writeThenEnd(200_000, "process.exit(0);"),
  );

  assert.ok(
    stdout.length < 200_000,
    "PREMISE FAILED: process.exit() no longer truncates a large piped write on " +
      `this Node (${process.version}). If Node has made pipe writes synchronous, ` +
      "this whole suite is now vacuous and the structural guard below is the only " +
      "thing still doing work — say so rather than deleting it.",
  );
  assert.throws(
    () => JSON.parse(stdout),
    "a truncated payload must not parse — otherwise this is not the defect",
  );
});

test("mechanism: process.exitCode after a large write drains on a pipe", () => {
  const { stdout, status } = runScript(
    writeThenEnd(200_000, "process.exitCode = 3;"),
  );

  const parsed = JSON.parse(stdout); // must not throw
  assert.equal(parsed.payload.length, 200_000);
  assert.equal(status, 3, "exitCode must still reach the caller");
});

/* ------------------------------------------------------------------ *
 * Layer 2 — the live case that took npm test red
 * ------------------------------------------------------------------ */

const SELECT_NEXT = join(REPO, "skills", "develop-next", "scripts", "select-next.mjs");
const LINT_FIXTURE = join(
  REPO,
  "evals",
  "develop-next",
  "unit",
  "fixtures",
  "10-real-world.md",
);

test("select-next --lint emits complete, parseable JSON through a pipe", () => {
  const stdout = execFileSync(
    process.execPath,
    [SELECT_NEXT, "--lint", "--roadmap", LINT_FIXTURE],
    { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024, timeout: SPAWN_TIMEOUT_MS },
  );

  assert.ok(
    stdout.length > PIPE_BUFFER_BYTES,
    `--lint output is ${stdout.length}B, at or below the ${PIPE_BUFFER_BYTES}B pipe ` +
      "buffer. This assertion is the precondition that makes the rest of this test a " +
      "regression test rather than a tautology: below the buffer, the pre-fix code " +
      "passes too. If the roadmap/registries have shrunk, enlarge the fixture — do " +
      "not delete this check.",
  );

  const report = JSON.parse(stdout); // the exact throw the bug reported
  assert.ok(Array.isArray(report.errors), "parsed report must carry errors[]");
});

test("select-next preserves its exit codes under the exitCode idiom", () => {
  // The fix must not buy drainage at the cost of the contract --lint has with
  // /develop-next: exit 1 on a broken roadmap, 0 on a clean one.
  const clean = spawnSync(
    process.execPath,
    [SELECT_NEXT, "--lint", "--roadmap", LINT_FIXTURE],
    { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024, timeout: SPAWN_TIMEOUT_MS },
  );
  assert.equal(clean.status, 0, "clean roadmap must exit 0");

  const missing = spawnSync(
    process.execPath,
    [SELECT_NEXT, "--roadmap", join(os.tmpdir(), "no-such-roadmap-xyz.md")],
    { encoding: "utf-8", timeout: SPAWN_TIMEOUT_MS },
  );
  assert.equal(missing.status, 1, "unreadable roadmap must exit 1");
  assert.equal(
    JSON.parse(missing.stdout).status,
    "halt",
    "and must still emit its halt JSON",
  );

  const badArg = spawnSync(process.execPath, [SELECT_NEXT, "--nope"], {
    encoding: "utf-8",
    timeout: SPAWN_TIMEOUT_MS,
  });
  assert.equal(badArg.status, 1, "unknown argument must exit 1");
  assert.match(badArg.stderr, /unknown argument/);
});

/* ------------------------------------------------------------------ *
 * Layer 3 — drain equivalence: pipe bytes == file bytes
 * ------------------------------------------------------------------ */

const EQUIVALENCE_CASES = [
  {
    name: "select-next --lint",
    argv: [SELECT_NEXT, "--lint", "--roadmap", LINT_FIXTURE],
  },
  {
    name: "generate-prd-epic-index --check",
    argv: [join(REPO, "shared", "resources", "generate-prd-epic-index.mjs"), "--check"],
  },
  {
    name: "qa-execute-snippets (usage path)",
    argv: [join(REPO, "shared", "resources", "qa-execute-snippets.mjs"), "--help"],
  },
];

for (const { name, argv } of EQUIVALENCE_CASES) {
  test(`drain equivalence: ${name} writes the same bytes to a pipe and a file`, () => {
    const dir = mkdtempSync(join(os.tmpdir(), "drain-eq-"));
    try {
      const piped = spawnSync(process.execPath, argv, {
        encoding: "utf-8",
        cwd: REPO,
        maxBuffer: 64 * 1024 * 1024,
        timeout: SPAWN_TIMEOUT_MS,
      });

      // `stdio: [ignore, fd, pipe]` hands the child a real file descriptor, which
      // is the synchronous-write shape that always produced complete output.
      const out = join(dir, "out.txt");
      const fd = openSync(out, "w");
      let toFile;
      try {
        toFile = spawnSync(process.execPath, argv, {
          encoding: "utf-8",
          cwd: REPO,
          stdio: ["ignore", fd, "pipe"],
          timeout: SPAWN_TIMEOUT_MS,
        });
      } finally {
        closeSync(fd);
      }

      assert.equal(
        toFile.status,
        piped.status,
        "exit status must not depend on how stdout is captured",
      );
      assert.equal(
        piped.stdout,
        readFileSync(out, "utf-8"),
        "piped stdout must be byte-identical to file-redirected stdout",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

/* ------------------------------------------------------------------ *
 * Layer 4 — the structural guard
 * ------------------------------------------------------------------ */

const WRITE_CALL =
  /(?:console\.(?:log|error|warn|info)|process\.(?:stdout|stderr)\.write)\s*\(/;
const EXIT_CALL = /(?<![\w.])process\.exit\s*\(/;
const COMMENT_LINE = /^\s*(?:\/\/|\*|\/\*)/;

/**
 * How far back from a `process.exit()` to look for a write, in characters.
 *
 * A CHARACTER WINDOW, NOT A LINE WINDOW — and this is the whole subtlety. The
 * first version of this guard walked back six non-blank LINES, which sounds
 * equivalent and is not: the write that caused bug.3 is a `process.stdout.write(
 * JSON.stringify({...}, null, 2) + "\n")` spanning roughly twenty formatted
 * lines, so a six-line window never reached it. That guard passed on the exact
 * defect it was written to catch, and only a mutation test exposed it. Counting
 * characters makes the window independent of how the write is formatted.
 */
const LOOKBACK_CHARS = 1200;

/**
 * Every `process.exit()` in `src` that has a write to stdout or stderr shortly
 * before it — the idiom that truncates on a pipe.
 *
 * Deliberately a source scan and not an AST walk: the rule is about one idiom,
 * the files are plain scripts, and a guard anyone can read and amend is likelier
 * to survive than a parser dependency. It over-reports rather than under-reports
 * — a write that is merely nearby, not sequenced before, is still flagged —
 * because a false positive costs a comment and a false negative costs another
 * 64KB bug.
 */
export function findExitAfterWrite(src) {
  // Blank out comments so a `process.exit()` discussed in prose (this file's own
  // subjects included) is neither a hit nor a shield for one, while keeping every
  // character offset and line break exactly where it was.
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + " ".repeat(m.length - p.length));

  const hits = [];
  const exits = /(?<![\w.])process\.exit\s*\(/g;
  let m;
  while ((m = exits.exec(code)) !== null) {
    const window = code.slice(Math.max(0, m.index - LOOKBACK_CHARS), m.index);
    const write = [...window.matchAll(new RegExp(WRITE_CALL, "g"))].pop();
    if (!write) continue;
    hits.push({
      line: code.slice(0, m.index).split("\n").length,
      via: write[0].replace(/\s*\($/, ""),
    });
  }
  return hits;
}

/** The three CLIs bug.3 fixed. These must stay clean, absolutely. */
const FIXED_BY_BUG_3 = [
  "skills/develop-next/scripts/select-next.mjs",
  "shared/resources/qa-execute-snippets.mjs",
  "shared/resources/generate-prd-epic-index.mjs",
];

/**
 * Files carrying the same idiom that bug.3 did NOT fix — its Scope & Impact names
 * three files, and migrating fifteen more in one bugfix PR would trade a known
 * defect for an unknown regression surface across a dozen skills.
 *
 * This is an allowlist, not an exoneration. Two entries are the same shape as the
 * bug that manifested — `schedule.mjs` and `run-loop.mjs` write orchestrator JSON
 * to stdout and are read through a pipe — so they are latent 64KB bugs, not merely
 * untidy. The rest exit after a short `console.error`, which truncates only in
 * principle. Tracked as follow-up work; shrink this list, never grow it.
 */
const KNOWN_UNMIGRATED = [
  "shared/resources/defer-mutation.js",
  "shared/resources/gh-stage.js",
  "shared/resources/handover-render.js",
  "shared/resources/handover-verify.js",
  "shared/resources/jira-stage.js",
  "shared/resources/tracker-comment.js",
  "shared/resources/tracker-issue.js",
  "skills/develop-batch/scripts/schedule.mjs",
  "skills/jira-epic-creator/scripts/jira-create-epic.js",
  "skills/loop-supervisor/scripts/run-loop.mjs",
  "skills/scaffold-tracker-workflow/scripts/scaffold-tracker-workflow.js",
  "skills/sync-jira-epic/scripts/sync-jira-epic.js",
  "skills/sync-jira-story/scripts/sync-jira-story.js",
  "skills/sync-jira-task/scripts/sync-jira-task.js",
  "skills/tracker-reconcile/scripts/tracker-reconcile.js",
];

/**
 * Every shipped CLI source. `references/` is excluded because those are bundled
 * copies of `shared/resources/` — `npm run bundle` regenerates them, so scanning
 * them would report each finding up to five times and let a fix look like five.
 */
function shippedCliSources() {
  const r = spawnSync(
    "git",
    ["ls-files", "shared/resources/*.mjs", "shared/resources/*.js", "skills/*/scripts/*.mjs", "skills/*/scripts/*.js"],
    { cwd: REPO, encoding: "utf-8", timeout: SPAWN_TIMEOUT_MS },
  );
  assert.equal(r.status, 0, `git ls-files failed: ${r.stderr}`);
  return r.stdout
    .split("\n")
    .filter(Boolean)
    .filter((p) => !p.includes("/references/") && !p.includes("/tests/"));
}

test("guard: the three CLIs bug.3 fixed carry no exit-after-write", () => {
  for (const rel of FIXED_BY_BUG_3) {
    const hits = findExitAfterWrite(readFileSync(join(REPO, rel), "utf-8"));
    assert.deepEqual(
      hits,
      [],
      `${rel} has regressed to process.exit() after a write:\n` +
        hits.map((h) => `  L${h.line}  ${h.via}`).join("\n") +
        "\nUse `process.exitCode = code` and let control flow return instead.",
    );
  }
});

test("guard: no NEW file adopts exit-after-write", () => {
  const allowed = new Set([...KNOWN_UNMIGRATED]);
  const offenders = [];

  for (const rel of shippedCliSources()) {
    if (allowed.has(rel)) continue;
    const hits = findExitAfterWrite(readFileSync(join(REPO, rel), "utf-8"));
    if (hits.length) offenders.push(`${rel}: ${hits.map((h) => `L${h.line}`).join(", ")}`);
  }

  assert.deepEqual(
    offenders,
    [],
    "These files write to stdout/stderr and then call process.exit(), which truncates\n" +
      "the write at ~64KB when the caller pipes them (bug.3.stdout-truncation-on-exit):\n" +
      offenders.map((o) => `  ${o}`).join("\n") +
      "\n\nFix: set `process.exitCode` and return, rather than calling process.exit().",
  );
});

test("guard: the unmigrated allowlist has no stale entries", () => {
  // An entry that no longer has the pattern means someone fixed the file and left
  // the allowlist behind, which would hide the NEXT regression in that same file.
  const stale = [];
  for (const rel of KNOWN_UNMIGRATED) {
    const hits = findExitAfterWrite(readFileSync(join(REPO, rel), "utf-8"));
    if (hits.length === 0) stale.push(rel);
  }
  assert.deepEqual(
    stale,
    [],
    "These files are allowlisted as unmigrated but are now clean — remove them from\n" +
      "KNOWN_UNMIGRATED so the guard protects them:\n" +
      stale.map((s) => `  ${s}`).join("\n"),
  );
});
