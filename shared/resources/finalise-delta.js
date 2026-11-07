#!/usr/bin/env node
/**
 * finalise-delta — two recorded acceptance arms for /finalise (task 271), decided by one engine.
 *
 * Both arms ask the same question of git: is every file that changed between two commits a
 * documentation file? The definition of "documentation" is not restated here. It is
 * `ci.docsOnly.patterns` and `isDocsPath` from ci-tree-equivalence.js, read from the commit being
 * judged, so there is one definition of a docs path in the repository (obs #32, #50).
 *
 *   docs-only       Arm 1 (obs #32). A measured figure taken on commit M counts for head H when the
 *                   delta M..H is docs-only. `--base M --head H`.
 *   rerun-eligible  Arm 2 (obs #50). A red CI reading on head H may be re-run ONCE when (a) no
 *                   re-run has been recorded yet, (b) the failing test file(s) lie outside the PR's
 *                   own diff, and (c) the delta from the last green head G to H is docs-only.
 *                   `--base G --head H --pr-base <target> --failed-file <path>... --attempts N`.
 *
 * FAILS CLOSED, like ci-tree-equivalence.js. Exit 0 means exactly one thing: `tree-equivalent`
 * (docs-only) or `eligible` (rerun-eligible). Every other answer, including a failed git read,
 * exits 1; a usage error exits 2. A shell `if` therefore cannot round a "no" up to an acceptance.
 * Neither arm accepts anything by itself: the caller records the basis (the commits and this
 * result; both CI attempts) in the DoD, and a case that does not match stays a FAIL.
 *
 * Usage:
 *   finalise-delta.js docs-only --base <rev> --head <rev> [--workspace-root <dir>] [--json]
 *   finalise-delta.js rerun-eligible --base <rev> --head <rev> --pr-base <rev> --attempts <n>
 *                     --failed-file <path> [--failed-file <path> ...] [--workspace-root <dir>] [--json]
 *
 * `--json` prints { command, reason, base, head, changed, changedCount, detail } and nothing else on
 * stdout. `changed` is capped at 200 entries; `changedCount` is the real length.
 *
 * Reasons: docs-only → tree-equivalent | code-changed | disabled | unverifiable
 *          rerun-eligible → eligible | already-rerun | no-failed-file | bad-failed-file | in-diff | code-changed |
 *                           disabled | unverifiable
 *
 * Depends on ci-tree-equivalence.js (and the three modules it pulls in) and nothing else.
 */

"use strict";

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const {
  isDocsPath,
  diffNames,
  readConfigAtCommit,
} = require("./ci-tree-equivalence.js");

const MAX_CHANGED = 200;
const EXEC_OPTS = { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] };

const USAGE = [
  "usage:",
  "  finalise-delta.js docs-only --base <rev> --head <rev> [--workspace-root <dir>] [--json]",
  "  finalise-delta.js rerun-eligible --base <rev> --head <rev> --pr-base <rev> --attempts <n>",
  "                    --failed-file <path> [--failed-file <path> ...] [--workspace-root <dir>] [--json]",
].join("\n");

class UsageError extends Error {}

const REASONS = Object.freeze({
  TREE_EQUIVALENT: "tree-equivalent",
  ELIGIBLE: "eligible",
  CODE_CHANGED: "code-changed",
  DISABLED: "disabled",
  UNVERIFIABLE: "unverifiable",
  ALREADY_RERUN: "already-rerun",
  NO_FAILED_FILE: "no-failed-file",
  IN_DIFF: "in-diff",
  BAD_FAILED_FILE: "bad-failed-file",
});

/** 0 for the one accepting reason of each command, 1 for every other answer. */
function exitCodeFor(reason) {
  return reason === REASONS.TREE_EQUIVALENT || reason === REASONS.ELIGIBLE
    ? 0
    : 1;
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (command !== "docs-only" && command !== "rerun-eligible") {
    throw new UsageError(
      `unknown command "${command === undefined ? "" : command}"`,
    );
  }
  const out = {
    command,
    base: "",
    head: "",
    prBase: "",
    attempts: null,
    failedFiles: [],
    root: "",
    json: false,
  };
  const need = (i, flag) => {
    const v = rest[i + 1];
    if (v === undefined || v.startsWith("--")) {
      throw new UsageError(`${flag} needs a value`);
    }
    return v;
  };
  for (let i = 0; i < rest.length; i += 1) {
    const a = rest[i];
    if (a === "--json") out.json = true;
    else if (a === "--base") out.base = need(i++, a);
    else if (a === "--head") out.head = need(i++, a);
    else if (a === "--pr-base") out.prBase = need(i++, a);
    else if (a === "--workspace-root") out.root = need(i++, a);
    else if (a === "--failed-file") out.failedFiles.push(need(i++, a));
    else if (a === "--attempts") {
      const v = need(i++, a);
      if (!/^\d+$/.test(v)) {
        throw new UsageError(
          `--attempts must be a non-negative integer, got "${v}"`,
        );
      }
      out.attempts = Number(v);
    } else throw new UsageError(`unknown argument "${a}"`);
  }
  if (!out.base) throw new UsageError("--base is required");
  if (!out.head) throw new UsageError("--head is required");
  if (command === "rerun-eligible") {
    if (!out.prBase) throw new UsageError("--pr-base is required");
    if (out.attempts === null) throw new UsageError("--attempts is required");
  }
  return out;
}

/** The full commit a revision names; throws when it names none. */
function commitOf(exec, cwd, rev) {
  return String(
    exec("git", ["rev-parse", "--verify", `${rev}^{commit}`], {
      ...EXEC_OPTS,
      cwd,
    }),
  ).trim();
}

function repoRoot(exec, cwd) {
  try {
    return (
      String(
        exec("git", ["rev-parse", "--show-toplevel"], { ...EXEC_OPTS, cwd }),
      ).trim() || cwd
    );
  } catch {
    return cwd;
  }
}

/**
 * A failed-file spelling reduced to the repo-root-relative form git prints, or null when it cannot
 * be (T271-QA-1, QA-2). `./x`, `a/./b`, `a//b` and an absolute path under the root all reduce to the
 * same name as `a/b`; a path that leaves the root, an unsubstituted `{placeholder}`, a glob and a
 * NUL are refused, because each would otherwise be "a file the PR did not change" by being no file.
 */
function canonicalFile(p, root) {
  const raw = String(p);
  if (raw.trim() === "" || /[{}*?\0]/.test(raw)) return null;
  let abs = path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(root, raw);
  // A symlinked DIRECTORY in the spelling (macOS /var → /private/var) must not read as outside the
  // root, but the final component stays as written: git names a symlink by the link's own path, and
  // following it would turn a changed link into its unchanged target (T271-QA-7).
  try {
    abs = path.join(fs.realpathSync(path.dirname(abs)), path.basename(abs));
  } catch {
    /* the directory may not exist at this checkout: judge the spelling as written */
  }
  let realRoot = root;
  try {
    realRoot = fs.realpathSync(root);
  } catch {
    /* keep the root as given */
  }
  const rel = path.relative(realRoot, abs);
  if (rel === "" || rel === ".." || rel.startsWith(".." + path.sep)) {
    return null;
  }
  if (path.isAbsolute(rel)) return null;
  return rel.split(path.sep).join("/");
}

/**
 * The decision, with git behind an injectable `exec`. Returns the result record; never throws for a
 * git failure (that is `unverifiable`). A malformed `skills-config.yaml` at the head commit throws a
 * UsageError from readConfigAtCommit, which the caller turns into exit 2.
 */
function decide(args, exec, cwd) {
  const root = args.root || repoRoot(exec, cwd);
  const result = (reason, extra) => ({
    command: args.command,
    reason,
    base: args.base,
    head: args.head,
    changed: [],
    changedCount: 0,
    detail: "",
    ...extra,
  });

  // Rerun-eligible: the cheapest, config-free refusals come first, so a spent re-run never costs a
  // git read and the answer for it cannot depend on the repository's state.
  if (args.command === "rerun-eligible") {
    if (args.attempts >= 1) {
      return result(REASONS.ALREADY_RERUN, {
        detail: `${args.attempts} re-run(s) already recorded; the arm allows exactly one`,
      });
    }
    if (args.failedFiles.length === 0) {
      return result(REASONS.NO_FAILED_FILE, {
        detail:
          "no failing test file was named; a red whose file is unknown cannot be shown to lie outside the diff",
      });
    }
  }

  // Every failed file must reduce to a repo-relative name before the arm can say anything about it.
  let failed = [];
  if (args.command === "rerun-eligible") {
    const bad = args.failedFiles.filter((f) => canonicalFile(f, root) === null);
    if (bad.length > 0) {
      return result(REASONS.BAD_FAILED_FILE, {
        detail: `cannot reduce to a path inside the repository (an unsubstituted placeholder, a glob, or a path outside it): ${bad.join(", ")}`,
      });
    }
    failed = args.failedFiles.map((f) => canonicalFile(f, root));
  }

  let base;
  let head;
  try {
    base = commitOf(exec, root, args.base);
    head = commitOf(exec, root, args.head);
  } catch (e) {
    return result(REASONS.UNVERIFIABLE, {
      detail: `a revision could not be resolved: ${firstLine(e)}`,
    });
  }

  const cfg = readConfigAtCommit(exec, root, head);
  if (cfg.enabled === false) {
    return result(REASONS.DISABLED, {
      detail: "ci.docsOnly.enabled is false",
    });
  }

  if (args.command === "rerun-eligible") {
    let prBase;
    let prNames;
    try {
      prBase = String(
        exec("git", ["merge-base", commitOf(exec, root, args.prBase), head], {
          ...EXEC_OPTS,
          cwd: root,
        }),
      ).trim();
      prNames = diffNames(exec, root, prBase, head);
    } catch (e) {
      return result(REASONS.UNVERIFIABLE, {
        detail: `the PR's own diff could not be computed: ${firstLine(e)}`,
      });
    }
    if (!Array.isArray(prNames)) {
      return result(REASONS.UNVERIFIABLE, {
        detail: "the PR's own diff could not be computed",
      });
    }
    const inPr = new Set(prNames.map((f) => path.posix.normalize(f)));
    const hit = failed.find((f) => inPr.has(f));
    if (hit !== undefined) {
      return result(REASONS.IN_DIFF, {
        detail: `${hit} is changed by this PR, so its red is the PR's own and is not re-run`,
      });
    }
  }

  const changed = diffNames(exec, root, base, head);
  if (!Array.isArray(changed)) {
    return result(REASONS.UNVERIFIABLE, {
      detail: `the diff ${base}..${head} could not be computed`,
    });
  }
  const capped = changed.slice(0, MAX_CHANGED);
  const code = changed.find((f) => !isDocsPath(f, cfg.patterns));
  if (code !== undefined) {
    return result(REASONS.CODE_CHANGED, {
      changed: capped,
      changedCount: changed.length,
      detail: `${code} is not a docs path (changed since ${base})`,
    });
  }
  return result(
    args.command === "docs-only" ? REASONS.TREE_EQUIVALENT : REASONS.ELIGIBLE,
    {
      changed: capped,
      changedCount: changed.length,
      detail: `${changed.length} docs-only path(s) since ${base}`,
    },
  );
}

function firstLine(e) {
  const msg = e && e.stderr ? String(e.stderr) : String((e && e.message) || e);
  return msg.split("\n").find((l) => l.trim() !== "") || "unknown error";
}

function main(argv, { exec = execFileSync, cwd = process.cwd() } = {}) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (e) {
    return { exitCode: 2, stderr: `${e.message}\n${USAGE}\n`, stdout: "" };
  }
  let res;
  try {
    res = decide(args, exec, cwd);
  } catch (e) {
    // A UsageError from the config reader (a malformed ci block) is a usage problem, not a "no".
    if (e && e.constructor && e.constructor.name === "UsageError") {
      return { exitCode: 2, stderr: `${e.message}\n`, stdout: "" };
    }
    // Anything else is not a pass: report it as unverifiable.
    res = {
      command: args.command,
      reason: REASONS.UNVERIFIABLE,
      base: args.base,
      head: args.head,
      changed: [],
      changedCount: 0,
      detail: `unexpected failure: ${firstLine(e)}`,
    };
  }
  const exitCode = exitCodeFor(res.reason);
  const stdout = args.json
    ? `${JSON.stringify(res)}\n`
    : `${res.command}: ${res.reason} — ${res.detail}\n`;
  return { exitCode, stdout, stderr: "" };
}

if (require.main === module) {
  const { exitCode, stdout, stderr } = main(process.argv.slice(2));
  if (stderr) process.stderr.write(stderr);
  // exitCode, not exit(): process.exit() right after a write to a pipe can truncate it (traps.md).
  process.exitCode = exitCode;
  process.stdout.write(stdout);
}

module.exports = { REASONS, USAGE, parseArgs, decide, main, exitCodeFor };
