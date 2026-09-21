#!/usr/bin/env node
// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/security-probe.mjs. Regenerate via `npm run bundle`.
/**
 * security-probe — run a security probe against a named export and compute the
 * verdict from what actually happened.
 *
 * Usage:
 *   node <this-file> --sink <name> --entry <path#exportName> [options]
 *   node <this-file> --sink <name> --entry shell:<path>     [options]
 *   node <this-file> --sink <name> --entry shell-fn:<path>#<function> [--fake-gh <dir>] [options]
 *
 * Options:
 *   --sink <name>        one of the corpus sinks (see security-input-corpus.mjs)
 *   --entry <spec>       `relative/path.mjs#exportName` — the control under probe;
 *                        or `shell:relative/path.sh` — a SHELL SCRIPT taking one
 *                        positional argument, run as `bash <path> <fixture-dir>`
 *                        per case under bash and (when present) zsh. See "The
 *                        shell entry form" below. Same record, same count.
 *                        or `shell-fn:relative/path.sh#function` — a SOURCED
 *                        LIBRARY: the file is sourced and the function called
 *                        with the case's input as its argv, per case under bash
 *                        and (when present) zsh. See "The shell-fn entry form".
 *   --cases-file <path>  JSON array of cases, replacing the corpus for this run
 *   --fake-gh <dir>      a directory holding an executable `gh`, prepended to
 *                        PATH for every shell run (with FAKE_GH=1 in its env) so
 *                        a boundary that consults `gh` is answered by a fixture
 *                        rather than the network. Refused (`bad-fake-gh`) unless
 *                        <dir>/gh exists and is executable; recorded as `fake_gh`
 *   --timeout <ms>       per-case timeout (default: the shared spawn budget)
 *   --json               emit one JSON object on stdout
 *   --repo-root <path>   containment root for --entry (default: two dirs above this
 *                        file — the repo root in-tree, the SKILL dir in a bundled
 *                        copy; pass `$(git rev-parse --show-toplevel)` from a bundle)
 *   --record <path>      write this run's control to <path>.d/ and the folded
 *                        snapshot at <path> — see "The run record"
 *   --name <name>        control name stored in the record (with --record)
 *   --call-site <ref>    `file:line` of the call site, stored in the record (with --record)
 *
 * Emit mode (no probe is run):
 *   node <this-file> --emit-block <record> [--mode diff|full]
 *   Prints the `security_review:` YAML block with `probes_executed`, `evidence`
 *   and `controls[]` filled FROM THE RECORD. The block is pasted, never typed.
 *
 * Exit codes (repository convention):
 *   0  clean — the control engages
 *   1  findings present — absent, present-but-inert, OR unverifiable
 *   2  hard error (missing file, bad argument)
 *
 * `unverifiable` exits 1, NOT 0, and that is the whole point of this file. The
 * defect it exists to close is a probe that ran nothing and reported a pass;
 * exiting 0 on "could not verify" would reintroduce that defect one layer down,
 * where a CI check reading `$?` cannot tell the two apart.
 *
 * WHY THIS IS NOT A SNIPPET RUNNER. `qa-execute-snippets.mjs` gates untrusted
 * text extracted from markdown fences behind a command allow-list that fails
 * closed. A probe is a different trust class: the ENGINE chooses the command,
 * the caller supplies only a module path, an export name and input VALUES, and
 * those values cross to the child as JSON on stdin — never interpolated into a
 * shell string. That is why no interpreter is on `SAFE_COMMANDS`, and why adding
 * one to make probes runnable would be a regression rather than a shortcut. The
 * argument, and the limits of what this engine can honestly claim, are stated
 * once in `probe-boundary-rule.md`, which sits beside this file. Read that
 * first; this file is the mechanism, not the argument.
 *
 * THE SHELL ENTRY FORM (task.128). A boundary delivered as a bash script has no
 * export to import, and until this form existed the engine could only decline
 * it — which is what happened on task.121: five QA gates recorded
 * `probes_executed: 0` against a script whose header says it refuses rather
 * than guesses, and a by-hand probe then found two fail-closed defects in it.
 * `--entry shell:<path>` is an entry FORM, not a second engine: the case loop,
 * the two directions, `computeVerdict` and the record writer are unchanged.
 * What differs is how a case reaches the target. A sink listed in
 * `MATERIALISED_SINKS` (the corpus) is written to a fixture directory — the
 * sink's bracketing controls plus the case's own name — and the script is run
 * against the directory: `bash "$1" "$2"` with the script and directory as
 * ARGV, never a string; stdin closed; the engine's `sandboxEnv()` plus
 * `LC_ALL=C` so glob order is byte order. The case's `expected` — stdout,
 * exit, stderr, paths that must be absent — is what the run is compared
 * against; `direction` then says whether a match is the good outcome. Each
 * (case, shell) run is one executed probe, so the count is cases × shells and
 * the record says which shells ran. A script that cannot take its input this
 * way — stdin, a second positional, the network — is still declined, and
 * probe-boundary-rule.md §5 says so.
 *
 * THE SHELL-FN ENTRY FORM (task.136). The other shape a shell boundary takes in
 * this repository is a LIBRARY: a file whose header says "source it" and whose
 * function is then called — `gh-labels.sh`'s `gh_labels_filter`, sourced by
 * nine GitHub skills. Run through `shell:` such a file defines its function and
 * exits 0 with nothing on stdout; every case mismatches, the filtering branch
 * never runs, and the verdict reads `absent` with `escaped 0` behind a full
 * count. That is what task.125's finalise gate recorded, and the override it
 * forced is why this form exists. `--entry shell-fn:<path>#<function>` keeps
 * everything the `shell:` arm has — the same materialisation, shells, timeout,
 * `compareExpected` and verdict — and changes only the command line: per case
 * per shell, `<shell> --norc -c 'source "$1" || exit 97; …; "$fn" "$@"'` with
 * the library, the function name and the case's input as ARGV, never a string.
 * Exit 97 is reserved for "the source itself failed" and exit 98 for "the
 * function is not defined after sourcing", so a broken or misnamed library is
 * a NAMED decline (`entry-not-probeable`) rather than a silent `absent`; the
 * function runs in a subshell and its own 97/98 is re-mapped to 99 and scored,
 * so the sentinels can only come from the harness. No per-case file is written
 * for this form — the input is argv, so it may carry a `/`. A
 * function that consults `gh` is answered by `--fake-gh <dir>`: the directory
 * is prepended to PATH with `FAKE_GH=1` in the env, so the fixture's `gh`
 * answers and a real `gh` — or the network — never does. What the function
 * must print is NOT the sink corpus's `expected` (that describes a script
 * printing a gate number): the caller names a cases file with `--cases-file`.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  accessSync,
  constants as fsConstants,
  mkdtempSync,
  mkdirSync,
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { sandboxEnv, snapshotTree } from "./qa-execute-snippets.mjs";
import { MATERIALISED_SINKS, corpusFor } from "./security-input-corpus.mjs";
import { spawnBudget, neverRan, readInt } from "./spawn-budget.mjs";
// Re-exported so the signal list ships beside the engine in every bundled copy:
// the bundler follows sibling imports, and a prompt that cites the module by
// name from an installed skill needs the file to be there.
export {
  BOUNDARY_SIGNALS,
  classifyBoundaryText,
} from "./probe-boundary-signals.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** The four verdicts. Exported so a consumer cannot invent a fifth by typo. */
export const VERDICTS = Object.freeze([
  "engages",
  "present-but-inert",
  "absent",
  "unverifiable",
]);

/**
 * Per-case outcomes. `errored` means the HARNESS failed, not the control.
 *
 * Exported alongside `VERDICTS` as deliberate public vocabulary, not as test
 * scaffolding: a consumer that branches on an outcome should import the strings
 * rather than retype them, for the same reason `VERDICTS` exists — a typo in a
 * retyped `"rejected"` fails silently as a branch that never matches.
 */
export const OUTCOMES = Object.freeze(["rejected", "accepted", "errored"]);

// ── The child runner ─────────────────────────────────────────────────────────
//
// A fixed string. Nothing from the caller is interpolated into it — the entry
// path, export name and input all arrive as JSON on stdin, so no agent-authored
// value is ever parsed as code. This is the property that lets the engine run a
// probe without an interpreter on the snippet allow-list.
//
// The child prints exactly one JSON line on stdout and nothing else. Anything
// the module under probe writes to stdout would corrupt that, so the runner
// prints its result to fd 3... which is not portable. Instead it brackets the
// payload with a sentinel and the parent extracts the last one — a module that
// logs is common and must not be misread as a harness failure.
const RUNNER = `
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const MARK = "__PROBE_RESULT__";
const emit = (o) => process.stdout.write("\\n" + MARK + JSON.stringify(o) + MARK + "\\n");

// Every arm RETURNS rather than calling process.exit(). An exit immediately
// after an async stdout write truncates that write at ~64KB when the caller
// pipes the process — which this caller always does, since spawnSync captures
// stdout. That is bug.3, and stdout-drain-on-exit.test.mjs guards the whole
// repository against re-adopting it. A truncated payload would surface here as
// "no result payload from child", i.e. as a DECLINED case: a large probe result
// would silently become an unverifiable one.
async function run() {
  let spec;
  try {
    spec = JSON.parse(readFileSync(0, "utf8"));
  } catch (e) {
    return { stage: "spec", error: String(e && e.message) };
  }

  let mod;
  try {
    mod = await import(pathToFileURL(spec.entryPath).href);
  } catch (e) {
    return { stage: "import", error: String(e && e.message) };
  }

  const fn =
    spec.exportName === "default" ? (mod.default ?? mod) : mod[spec.exportName];
  if (typeof fn !== "function") {
    return {
      stage: "export",
      error: "export " + spec.exportName + " is not a function",
    };
  }

  try {
    const returned = await fn(spec.input);
    // A control "rejects" by throwing, or by answering with a value that means
    // "no". Returning null/undefined/false is the non-throwing rejection shape a
    // validator commonly uses; treating it as acceptance would score a working
    // control as absent.
    const rejected =
      returned === null || returned === undefined || returned === false;
    return { stage: "call", outcome: rejected ? "rejected" : "accepted" };
  } catch (e) {
    return { stage: "call", outcome: "rejected", threw: String(e && e.message) };
  }
}

emit(await run());
process.exitCode = 0;
`;

const MARK = "__PROBE_RESULT__";

function extractResult(stdout) {
  if (typeof stdout !== "string") return null;
  const parts = stdout.split(MARK);
  // parts: [before, payload, after, ...] — take the LAST complete payload so a
  // module that logs the sentinel-looking text cannot shadow the real one.
  for (let i = parts.length - 2; i >= 1; i -= 2) {
    try {
      return JSON.parse(parts[i]);
    } catch {
      /* keep looking */
    }
  }
  return null;
}

// ── Entry resolution ─────────────────────────────────────────────────────────

/**
 * The repository root — the directory two levels above this file
 * (it lives in `shared/resources/`, so two levels up is the repo root).
 * Overridable so tests can point the containment check at a fixture tree.
 */
export function defaultRepoRoot() {
  return resolve(__dirname, "..", "..");
}

/**
 * Split and contain an `entry` spec.
 *
 * CONTAINMENT IS CHECKED BEFORE THE IMPORT, not after. `import()` executes the
 * module's top level, so a path that escapes the repo root has already run
 * arbitrary code by the time any post-hoc check could notice. `..` traversal and
 * absolute paths are both rejected here, on the resolved path rather than the
 * literal — `a/../../etc/x` is only visibly an escape after resolution.
 *
 * The `shell:<path>` form takes the same containment — the path is checked
 * before anything is spawned, for the same reason it is checked before an
 * import — and returns `kind: "shell"` with no export name. The
 * `shell-fn:<path>#<function>` form takes it too and returns `kind: "shell-fn"`
 * with the function name; the name must be one a shell would accept as a
 * function name, because it is called by name after the source.
 *
 * @returns {{ok: true, kind: "js", entryPath: string, exportName: string}
 *          |{ok: true, kind: "shell", entryPath: string}
 *          |{ok: true, kind: "shell-fn", entryPath: string, fnName: string}
 *          |{ok: false, reason: string, detail: string}}
 */
export function resolveEntry(entry, repoRoot = defaultRepoRoot()) {
  if (typeof entry !== "string" || entry.trim() === "") {
    return { ok: false, reason: "bad-entry", detail: "entry is empty" };
  }
  // A NUL is never part of a path. For the JS form it fails at import (declined);
  // for the shell form it reached spawnSync, which THROWS on a NUL in argv — out
  // of runProbeSpec, whose contract is to return a verdict (task.128 BUG-3).
  if (entry.includes("\0")) {
    return {
      ok: false,
      reason: "bad-entry",
      detail: "entry contains a NUL byte",
    };
  }
  const isShellFn = entry.startsWith(SHELL_FN_PREFIX);
  const isShell = !isShellFn && entry.startsWith(SHELL_PREFIX);
  let rawPath;
  let exportName = null;
  let fnName = null;
  if (isShellFn) {
    const body = entry.slice(SHELL_FN_PREFIX.length);
    const hash = body.lastIndexOf("#");
    if (hash <= 0 || hash === body.length - 1) {
      return {
        ok: false,
        reason: "bad-entry",
        detail: `entry must be "shell-fn:path#function", got "${entry}"`,
      };
    }
    rawPath = body.slice(0, hash);
    fnName = body.slice(hash + 1);
    if (!SHELL_FN_NAME.test(fnName)) {
      return {
        ok: false,
        reason: "bad-entry",
        detail: `"${fnName}" is not a shell function name`,
      };
    }
  } else if (isShell) {
    rawPath = entry.slice(SHELL_PREFIX.length);
    if (rawPath.trim() === "" || rawPath.includes("#")) {
      return {
        ok: false,
        reason: "bad-entry",
        detail: `entry must be "shell:path" with no export name, got "${entry}"`,
      };
    }
  } else {
    const hash = entry.lastIndexOf("#");
    if (hash <= 0 || hash === entry.length - 1) {
      return {
        ok: false,
        reason: "bad-entry",
        detail: `entry must be "path#exportName" or "shell:path", got "${entry}"`,
      };
    }
    rawPath = entry.slice(0, hash);
    exportName = entry.slice(hash + 1);
  }

  const root = resolve(repoRoot);
  const entryPath = isAbsolute(rawPath)
    ? resolve(rawPath)
    : resolve(root, rawPath);

  const rel = relative(root, entryPath);
  const escapes = rel === "" || rel.startsWith("..") || isAbsolute(rel);
  if (escapes) {
    return {
      ok: false,
      reason: "outside-repo-root",
      detail: `${entryPath} is outside ${root}`,
    };
  }
  // A symlink pointing out of the tree resolves at import time, not here. Node
  // gives us no cheap pre-import realpath guarantee for a path that may not
  // exist yet, so this is stated as a limit in probe-boundary-rule.md rather
  // than claimed as a defence.
  if (rel.split(sep).includes("node_modules")) {
    return {
      ok: false,
      reason: "outside-repo-root",
      detail: `${entryPath} is under node_modules`,
    };
  }
  if (isShellFn) return { ok: true, kind: "shell-fn", entryPath, fnName };
  return isShell
    ? { ok: true, kind: "shell", entryPath }
    : { ok: true, kind: "js", entryPath, exportName };
}

/** The entry-spec prefix that selects the shell form. */
export const SHELL_PREFIX = "shell:";
/** The entry-spec prefix that selects the sourced-function form (task.136). */
export const SHELL_FN_PREFIX = "shell-fn:";
/** A name bash and zsh both accept as a function name — and nothing else. */
const SHELL_FN_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
/** Reserved exits of the shell-fn one-liner: the source failed / the function is undefined. */
export const SHELL_FN_SOURCE_FAILED = 97;
export const SHELL_FN_NOT_DEFINED = 98;
/**
 * What the body exits when the FUNCTION ITSELF returned 97 or 98: those two
 * are the harness's sentinels, and a function that answers a hostile input
 * with one of them must be SCORED (as a mismatch against `expected.exit`), not
 * declined as a broken library (task.136 QA cycle 1, CR-2). Any other exit
 * passes through unchanged.
 */
export const SHELL_FN_RESERVED_COLLISION = 99;
/**
 * Flags that keep a shell from reading any rc file. The sandbox HOME the
 * shell arm already sets is the first line; these are the second, and they
 * matter more here because this arm sources INTO the shell proper (the
 * `shell:` arm only ever runs `bash <script>` under zsh), so a zsh `.zshenv`
 * would be the one file a sandbox HOME cannot fully rule out.
 */
const noRcFlags = (shell) =>
  shell === "zsh" ? ["-f"] : ["--noprofile", "--norc"];
/**
 * The fixed body every shell-fn case runs. $1 is the library, $2 the function
 * name, the rest the case's argv. `typeset -f` is what both bash and zsh use
 * to ask "is this a defined function" without also matching an external
 * command, which `command -v` would.
 */
const SHELL_FN_BODY =
  `source "$1" || exit ${SHELL_FN_SOURCE_FAILED}; shift; fn="$1"; shift; ` +
  `typeset -f "$fn" >/dev/null 2>&1 || exit ${SHELL_FN_NOT_DEFINED}; ` +
  // The function runs in a SUBSHELL: a function that calls `exit` would
  // otherwise end the harness shell with that code before the remap below
  // ever ran, and `exit 97` inside the function would read as "the source
  // failed" (task.136 QA cycle 1, CR-2 — found by its own row).
  `( "$fn" "$@" ); rc=$?; case $rc in ${SHELL_FN_SOURCE_FAILED}|${SHELL_FN_NOT_DEFINED}) exit ${SHELL_FN_RESERVED_COLLISION};; esac; exit $rc`;

/**
 * The shells a shell-form probe runs under. bash always; zsh when the host has
 * it — that is the Bash tool's shell on the machines that execute this
 * repository's prose, and the unmatched-glob behaviour that differs between the
 * two is exactly what `qa-cycle.sh`'s `bash …` invocation exists to avoid.
 * The zsh run verifies the CALLER shape (`$(bash <script> "$dir")` issued from
 * zsh), not the script's own interpreter, which its shebang fixes.
 * Memoised: probing for zsh once per process, not once per case.
 */
let _shells;
export function probeShells() {
  if (_shells) return _shells;
  const hasZsh =
    spawnSync("zsh", ["-c", "true"], { stdio: "ignore" }).status === 0;
  _shells = Object.freeze(["bash", ...(hasZsh ? ["zsh"] : [])]);
  return _shells;
}

/**
 * Compare one shell run against a case's `expected`.
 *
 * Every key of `expected` is compared and every mismatch is named, so a
 * reader of the case result sees WHICH signal moved — the pre-fix qa-cycle.sh
 * fails on stdout only when the fixture brackets the hostile name, and on
 * stderr on every ordering; reporting only a boolean would hide which one
 * caught it. `absent` paths are checked against the fixture directory.
 *
 * @returns {string[]} mismatches; empty means the run matched `expected`
 */
export function compareExpected(expected, run, fixtureDir) {
  const mismatches = [];
  if (expected.stdout !== undefined && run.stdout !== expected.stdout) {
    mismatches.push(
      `stdout ${JSON.stringify(run.stdout)} ≠ ${JSON.stringify(expected.stdout)}`,
    );
  }
  if (expected.exit !== undefined && run.status !== expected.exit) {
    mismatches.push(`exit ${run.status} ≠ ${expected.exit}`);
  }
  if (expected.stderr !== undefined && run.stderr !== expected.stderr) {
    mismatches.push(
      `stderr ${JSON.stringify(run.stderr.slice(0, 120))} ≠ ${JSON.stringify(expected.stderr)}`,
    );
  }
  for (const rel of expected.absent ?? []) {
    if (existsSync(join(fixtureDir, rel))) {
      mismatches.push(`${rel} was created`);
    }
  }
  return mismatches;
}

// ── Verdict computation ──────────────────────────────────────────────────────

/**
 * The verdict, computed from the run. Never from a caller-supplied field.
 *
 * `correct` in the corpus is human-readable prose, so "handled as `correct`
 * says" cannot be evaluated mechanically. `direction` is the machine-readable
 * expectation and this is the derivation from it:
 *
 *   hostile    → the control SHOULD reject. An accepted hostile case means the
 *                vulnerability reproduces.
 *   legitimate → the control SHOULD accept. A rejected legitimate case is
 *                over-blocking.
 *
 * The branches, in the order they are checked:
 *
 *   executed === 0            → unverifiable. Zero cases is never a pass; this
 *                               is the defect the whole series exists to close.
 *   no hostile case executed  → unverifiable. Legitimate cases alone are
 *                               evidence the function runs, not that it guards.
 *   reproduced, none rejected → absent. Nothing is filtering anything.
 *   reproduced, some rejected → present-but-inert. A control demonstrably
 *                               EXISTS (it rejected something) and demonstrably
 *                               let a hostile case through. HIGH SEVERITY: worse
 *                               than absent, because it has already been
 *                               reviewed and believed.
 *   none reproduced, ≥1 legit → engages.
 *   none reproduced, 0 legit  → unverifiable. A function that rejects EVERY
 *                               input, hostile and legitimate alike, is
 *                               indistinguishable from a stub that always
 *                               throws. Scoring that `engages` would let an
 *                               unimplemented control report a clean probe,
 *                               which is the same failure as a zero count in a
 *                               different costume.
 *
 * @returns {{verdict: string, reason: string}}
 */
export function computeVerdict(caseResults) {
  const ran = caseResults.filter((c) => c.outcome !== "errored");
  if (ran.length === 0) {
    return { verdict: "unverifiable", reason: "no-cases-executed" };
  }

  const hostile = ran.filter((c) => c.direction === "hostile");
  const legitimate = ran.filter((c) => c.direction === "legitimate");
  if (hostile.length === 0) {
    return { verdict: "unverifiable", reason: "no-hostile-evidence" };
  }

  const reproduced = hostile.filter((c) => c.outcome === "accepted");
  const hostileRejected = hostile.filter((c) => c.outcome === "rejected");

  if (reproduced.length > 0) {
    return hostileRejected.length === 0
      ? { verdict: "absent", reason: "no-hostile-case-was-rejected" }
      : {
          verdict: "present-but-inert",
          reason: "a-hostile-case-passed-a-control-that-rejects-others",
        };
  }

  const legitimateAccepted = legitimate.filter((c) => c.outcome === "accepted");
  if (legitimateAccepted.length === 0) {
    return {
      verdict: "unverifiable",
      reason:
        legitimate.length === 0
          ? "no-legitimate-evidence"
          : "rejects-every-input",
    };
  }
  return { verdict: "engages", reason: "hostile-rejected-legitimate-accepted" };
}

// ── The runner ───────────────────────────────────────────────────────────────

/**
 * Run one probe spec and return the computed verdict.
 *
 * @param {object} spec
 * @param {string} spec.sink       one of `SINKS`; supplies the corpus when `cases` is absent
 * @param {string} spec.entry      `path#exportName`, resolved relative to the repo root
 * @param {Array}  [spec.cases]    caller-supplied cases in the corpus shape
 * @param {string} [spec.fakeGh]   directory holding an executable `gh`, prepended to PATH
 *                                 for every shell run (shell and shell-fn forms)
 * @param {number} [spec.timeoutMs] per-case timeout; defaults to the shared spawn budget
 * @param {string} [spec.repoRoot] containment root; defaults to the repository root
 * @returns {{sink, entry, verdict, reason, executed, passed, reproduced, overblocked, declined, cases}}
 */
export function runProbeSpec({
  sink,
  entry,
  cases,
  fakeGh,
  timeoutMs,
  repoRoot = defaultRepoRoot(),
} = {}) {
  const budget = spawnBudget("PROBE");
  // Validated HERE, not only in `main()`, because this is the boundary a caller
  // actually crosses: `task.81` calls this function, never the CLI. Cycle 1
  // validated the flag and left the parameter open, so `timeoutMs: NaN` still
  // reached spawnSync and threw an uncaught RangeError, and `timeoutMs: 0` still
  // meant "no timeout" — the reported symptom was fixed while the mechanism it
  // named stayed reachable by the route that mattered.
  //
  // An unparseable value FALLS BACK to the budget rather than throwing. The
  // function's contract is that it returns a verdict; making it throw for a bad
  // argument would hand callers a second failure mode to handle and would make
  // an out-of-range timeout louder than an unimportable entry point, which is
  // backwards. The CLI keeps its `return 2` on top, so a bad *flag* is still
  // reported as an argument error rather than as a probe result.
  const perCaseTimeout = readInt(timeoutMs, 1) ?? budget.timeoutMs;

  // Every field the success path returns, so EVERY return path carries the same
  // shape. `escapes` in particular: it was previously added only on the success
  // path, which left it `undefined` on all four early returns — and a consumer
  // reading `result.escapes.length` then throws on exactly the paths a probe
  // most often takes, since a declined or unverifiable target is the common
  // case in v1 by this engine's own admission. A missing KEY is invisible to
  // any per-path assertion about values, which is why the test added alongside
  // this compares key sets rather than contents.
  const base = {
    sink: sink ?? null,
    entry: entry ?? null,
    shells: null,
    executed: 0,
    passed: 0,
    reproduced: [],
    overblocked: [],
    declined: [],
    escapes: [],
    cases: [],
    // The directory whose `gh` answered the shell runs, or null. Stated in the
    // result so the record says what answered (task.136).
    fakeGh: null,
  };

  // `declined` is its own state and is NEVER folded into `executed: 0`. Both
  // render as "nothing ran", but they answer different questions: declined says
  // the engine refused or could not reach the target, executed-zero says it
  // reached it and found nothing to run. Collapsing them is the defect task.73
  // chased through four QA cycles.
  const decline = (reason, detail) => ({
    ...base,
    verdict: "unverifiable",
    reason,
    declined: [{ id: entry ?? sink ?? "(spec)", reason, detail }],
  });

  const resolved = resolveEntry(entry, repoRoot);
  if (!resolved.ok) return decline(resolved.reason, resolved.detail);
  const isShellForm = resolved.kind === "shell" || resolved.kind === "shell-fn";
  if (isShellForm) {
    // The script must be a readable regular file BEFORE anything is compared.
    // Without this a missing path made every run exit 127, every case mismatch
    // `expected`, and the verdict read `absent` with executed = cases × shells —
    // "could not look" scored as "the control is absent", with a count behind
    // it (task.128 QA cycle 1, BUG-2). A property of the ENTRY, so it is
    // checked once here (cycle 2, CR-7), and declined exactly as the JS form
    // declines an unimportable entry.
    try {
      const st = statSync(resolved.entryPath);
      if (!st.isFile()) throw new Error("not a regular file");
      accessSync(resolved.entryPath, fsConstants.R_OK);
    } catch (e) {
      return decline(
        "entry-not-probeable",
        `script is not a readable regular file: ${e.message}`,
      );
    }
  }
  // `--fake-gh` is validated BEFORE anything spawns, like the entry: a
  // directory with no `gh` in it would let the real one answer from further
  // down PATH, which is the exact outcome the flag exists to prevent, with
  // nothing in the record to say so. Same containment as an entry — a fake
  // outside the repo root is not a fixture this repository owns.
  let fakeGhDir = null;
  if (fakeGh !== undefined && fakeGh !== null) {
    // Only the shell forms consult PATH. The JS runner hands the entry its
    // input as JSON on stdin and never spawns a shell, so a fake it cannot
    // reach must not be RECORDED as having answered — `fake_gh: <dir>` on a
    // JS-form record would claim a fixture where the real binary ran
    // (TASK-136-BUG-1). Declined, not ignored: a caller who passed it meant it.
    if (!isShellForm) {
      return decline(
        "bad-fake-gh",
        "--fake-gh applies to the shell entry forms only (shell:, shell-fn:) — a JS export never consults PATH",
      );
    }
    if (typeof fakeGh !== "string" || fakeGh.trim() === "") {
      return decline("bad-fake-gh", "--fake-gh must name a directory");
    }
    const root = resolve(repoRoot);
    fakeGhDir = isAbsolute(fakeGh) ? resolve(fakeGh) : resolve(root, fakeGh);
    const rel = relative(root, fakeGhDir);
    if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) {
      return decline("bad-fake-gh", `${fakeGhDir} is outside ${root}`);
    }
    try {
      if (!statSync(fakeGhDir).isDirectory())
        throw new Error("not a directory");
      const bin = join(fakeGhDir, "gh");
      if (!statSync(bin).isFile()) throw new Error("gh is not a regular file");
      accessSync(bin, fsConstants.X_OK);
    } catch (e) {
      return decline(
        "bad-fake-gh",
        `${fakeGhDir} does not hold an executable gh: ${e.message}`,
      );
    }
  }
  base.fakeGh = fakeGhDir;

  let probeCases;
  if (Array.isArray(cases)) {
    probeCases = cases;
  } else {
    try {
      probeCases = corpusFor(sink);
    } catch (e) {
      return decline("unknown-sink", String(e && e.message));
    }
  }

  if (probeCases.length === 0) {
    // Zero cases yields `unverifiable`, never `engages` and never a pass.
    return { ...base, verdict: "unverifiable", reason: "no-cases-executed" };
  }

  // Containment: a temp sandbox root with the working copy inside it. The
  // sentinel watches the ROOT while the child runs in the WORK dir, so a write
  // the probe makes beside its own directory is visible.
  const sandboxRoot = mkdtempSync(join(tmpdir(), "security-probe-"));
  const workDirName = "work";
  const workDir = join(sandboxRoot, workDirName);
  mkdirSync(workDir);
  // A shell child's HOME and TMPDIR live INSIDE the sandbox root, outside the
  // work dir, so a side effect written to either is an escape the sentinel
  // sees rather than a write to the reader's real home (task.128 QA cycle 3,
  // BUG-12). The JS runner keeps sandboxEnv()'s values: its child never sees
  // a shell.
  const sandboxHome = join(sandboxRoot, "home");
  const sandboxTmp = join(sandboxRoot, "tmp");
  mkdirSync(sandboxHome);
  mkdirSync(sandboxTmp);

  const caseResults = [];
  const escapes = [];
  const shells = isShellForm ? probeShells() : null;
  try {
    for (const c of probeCases) {
      if (isShellForm) {
        runShellCase(c, {
          sink,
          entryPath: resolved.entryPath,
          fnName: resolved.fnName ?? null,
          fakeGhDir,
          shells,
          sandboxRoot,
          sandboxHome,
          sandboxTmp,
          workDir,
          workDirName,
          timeoutMs: perCaseTimeout,
          caseResults,
          escapes,
        });
        continue;
      }
      const before = snapshotTree(sandboxRoot, workDirName);

      const child = spawnSync(
        process.execPath,
        ["--input-type=module", "-e", RUNNER],
        {
          input: JSON.stringify({
            entryPath: resolved.entryPath,
            exportName: resolved.exportName,
            input: c.input,
          }),
          cwd: workDir,
          env: sandboxEnv({ cwd: workDir }),
          encoding: "utf8",
          timeout: perCaseTimeout,
          maxBuffer: 8 * 1024 * 1024,
        },
      );

      const after = snapshotTree(sandboxRoot, workDirName);
      for (const [path, stamp] of after) {
        // One entry per (case, path). NOT de-duplicated by path, deliberately:
        // the question a reader asks of an escape is "which inputs caused a write
        // outside the sandbox?", and collapsing to a path set answers a different
        // one. A probe that escapes on exactly one hostile input and a probe that
        // escapes on all twelve are different findings; de-duplicating would
        // render them identically. A consumer wanting the path set can take
        // `new Set(escapes.map((e) => e.path))` — that direction is lossless,
        // the other is not.
        if (before.get(path) !== stamp) escapes.push({ id: c.id, path });
      }

      let outcome, detail;
      if (neverRan(child)) {
        // A child that never produced an answer is not an answer. This is a
        // harness failure, so the case is DECLINED, not counted as executed.
        outcome = "errored";
        detail = child.signal
          ? `timed out after ${perCaseTimeout}ms`
          : "never ran";
      } else {
        const payload = extractResult(child.stdout);
        if (!payload) {
          outcome = "errored";
          detail = "no result payload from child";
        } else if (payload.stage === "call") {
          outcome = payload.outcome;
          detail = payload.threw ?? null;
        } else {
          outcome = "errored";
          detail = `${payload.stage}: ${payload.error}`;
        }
      }

      caseResults.push({
        id: c.id,
        direction: c.direction,
        outcome,
        detail: detail ?? null,
      });
    }
  } finally {
    rmSync(sandboxRoot, { recursive: true, force: true });
  }

  // An import or export failure is a property of the ENTRY, not of one case, so
  // it presents identically for every case. Reporting N identical declines
  // would read as N problems; report it once, against the entry.
  const allErrored = caseResults.every((c) => c.outcome === "errored");
  if (allErrored && caseResults.length > 0) {
    const first = caseResults[0].detail ?? "unknown";
    return {
      ...base,
      verdict: "unverifiable",
      reason: "entry-not-probeable",
      cases: caseResults,
      declined: [{ id: entry, reason: "entry-not-probeable", detail: first }],
      // A side effect observed during runs that then errored is still a side
      // effect; and the record must say which shells ran (cycle 4, CR-3).
      escapes,
      shells: shells ?? null,
      fakeGh: fakeGhDir,
    };
  }

  const { verdict, reason } = computeVerdict(caseResults);

  const ran = caseResults.filter((c) => c.outcome !== "errored");
  const reproduced = ran.filter(
    (c) => c.direction === "hostile" && c.outcome === "accepted",
  );
  const overblocked = ran.filter(
    (c) => c.direction === "legitimate" && c.outcome === "rejected",
  );
  const declined = caseResults
    .filter((c) => c.outcome === "errored")
    .map((c) => ({
      id: c.shell ? `${c.id}@${c.shell}` : c.id,
      reason: "case-errored",
      detail: c.detail,
    }));

  return {
    sink: sink ?? null,
    entry,
    verdict,
    reason,
    // Which shells each case ran under, for the shell form; null for the JS
    // form. Stated in the result so a record can say "bash only" on a host
    // without zsh rather than leaving the reader to divide the count.
    shells: shells ?? null,
    executed: ran.length,
    passed: ran.length - reproduced.length - overblocked.length,
    // A shell-form case ran once per shell, so its id carries the shell: two
    // identical ids would read as one finding counted twice, and "reproduced
    // under bash but not zsh" is a real, reportable difference.
    reproduced: reproduced.map((c) => (c.shell ? `${c.id}@${c.shell}` : c.id)),
    overblocked: overblocked.map((c) =>
      c.shell ? `${c.id}@${c.shell}` : c.id,
    ),
    declined,
    escapes,
    cases: caseResults,
    fakeGh: fakeGhDir,
  };
}

/** The `expected` keys that compare a run; `absent` alone compares nothing. */
const COMPARABLE_KEYS = Object.freeze(["stdout", "exit", "stderr"]);

/**
 * bash failed to OPEN the script — its own message names the script path.
 * Observed shapes: `bash: <path>: No such file or directory`,
 * `<path>: <path>: Is a directory`, `bash: <path>: Permission denied`,
 * `bash: <path>: cannot execute binary file`. The exit code is 126 or 127
 * in every case, but the code alone is also what a target script exits
 * with, so both are required.
 */
export function isLaunchFailure(child, entryPath) {
  if (child.status !== 126 && child.status !== 127) return false;
  const err = child.stderr ?? "";
  // The message must be ABOUT the script — `bash: <script>: …` or
  // `<script>: <script>: …` — with no `line N:` segment. bash prefixes every
  // runtime error INSIDE a script with the script's path too
  // (`<script>: line 3: <fixture>/x: Permission denied`, exit 126), and that is
  // the target answering, not bash failing to open it (task.128 QA cycle 3,
  // BUG-9). Containment alone matched both.
  const subject = escapeRegExp(entryPath);
  const re = new RegExp(
    `^(?:bash|${subject}): ${subject}: (?:No such file or directory|Is a directory|Permission denied|cannot execute)`,
    // Case-insensitive: /bin/bash 3.2 (macOS without Homebrew bash) prints
    // "is a directory" (cycle 4, CR-2).
    "mi",
  );
  return re.test(err);
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Validate a materialised case's `expected` (task.128 QA cycle 3, BUG-11).
 * Returns null when well-formed, else the reason to decline. A malformed
 * `expected` mismatched every run and scored `absent` with a full count — a
 * bad case and a real defect reporting one value — and a non-array `absent`
 * threw out of runProbeSpec.
 */
export function expectedProblem(expected) {
  if (!expected || typeof expected !== "object" || Array.isArray(expected)) {
    return "`expected` is not an object";
  }
  if (!COMPARABLE_KEYS.some((k) => expected[k] !== undefined)) {
    return "`expected` compares nothing — it needs at least one of stdout, exit, stderr";
  }
  for (const k of ["stdout", "stderr"]) {
    if (expected[k] !== undefined && typeof expected[k] !== "string") {
      return `\`expected.${k}\` must be a string, got ${describeType(expected[k])}`;
    }
  }
  if (expected.exit !== undefined && !Number.isInteger(expected.exit)) {
    return `\`expected.exit\` must be an integer, got ${describeType(expected.exit)}`;
  }
  if (expected.absent !== undefined) {
    if (
      !Array.isArray(expected.absent) ||
      expected.absent.some(
        (p) =>
          typeof p !== "string" ||
          p === "" ||
          p === "." ||
          p === ".." ||
          p.includes("/") ||
          p.includes("\0"),
      )
    ) {
      // "." and ".." carry no separator and ALWAYS exist, so a case naming
      // one would score every run as a side effect and the fixed script as
      // absent with a full count (task.128 QA cycle 4, BUG-13).
      return "`expected.absent` must be an array of separator-free, non-empty names other than . and ..";
    }
  }
  return null;
}

const describeType = (v) =>
  v === null ? "null" : Array.isArray(v) ? "array" : typeof v;

/** Non-recursive name → mtime stamps of one directory (the script's own). */
function listDirStamps(dir) {
  const out = new Map();
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return out;
  }
  for (const n of names) {
    try {
      const st = statSync(join(dir, n));
      out.set(n, `${st.size}:${st.mtimeMs}`);
    } catch {
      out.set(n, "?");
    }
  }
  return out;
}

/**
 * Run one MATERIALISED case against a shell script, once per shell.
 *
 * Pushes one entry onto `caseResults` per (case, shell) — that is the unit
 * `executed` counts, and it is what "cases × shells" means. A case the engine
 * cannot materialise (a name the filesystem refuses, a sink with no fixture
 * definition, a case with no `expected`) is DECLINED — outcome `errored` —
 * never counted as executed and never as passed, exactly as a JS case whose
 * child never ran.
 *
 * Outcome derivation, from `expected` + `direction`:
 *   hostile,    run matches expected → "rejected"  (the name was handled)
 *   hostile,    run differs          → "accepted"  (the name got through — reproduced)
 *   legitimate, run matches expected → "accepted"  (the name was taken)
 *   legitimate, run differs          → "rejected"  (over-blocked)
 * which is the same vocabulary `computeVerdict` already reads.
 */
function runShellCase(
  c,
  {
    sink,
    entryPath,
    fnName = null,
    fakeGhDir = null,
    shells,
    sandboxRoot,
    sandboxHome,
    sandboxTmp,
    workDir,
    workDirName,
    timeoutMs,
    caseResults,
    escapes,
  },
) {
  // The script's OWN directory is in the real tree; a `cd "$(dirname "$0")"`
  // idiom writes its side effect there, where neither the fixture check nor
  // the sandbox sentinel looks. Snapshot it (non-recursively) around each run
  // and report a change as an escape (BUG-12).
  const scriptDir = dirname(entryPath);
  const fixture = MATERIALISED_SINKS[c.sink ?? sink];
  const decline = (detail) => {
    for (const shell of shells) {
      caseResults.push({
        id: c.id,
        shell,
        direction: c.direction,
        outcome: "errored",
        detail,
      });
    }
  };
  if (!fixture) {
    decline(
      `sink "${c.sink ?? sink}" is not materialised — the shell entry form needs a fixture definition in MATERIALISED_SINKS`,
    );
    return;
  }
  if (!c.expected || typeof c.expected !== "object") {
    decline(
      "case has no `expected` — a shell run has nothing to compare against",
    );
    return;
  }
  // BUG-8 (cycle 2) + BUG-11 (cycle 3): an `expected` that compares nothing,
  // or compares with the wrong types, is declined — never scored. The pre-fix
  // qa-cycle.sh scored `engages` on `expected: {}`; `{ stdout: 12 }` scored
  // `absent` with a full count; `{ absent: 5 }` threw.
  const problem = expectedProblem(c.expected);
  if (problem !== null) {
    decline(`case's ${problem}`);
    return;
  }
  // An `absent` name that the fixture itself creates — a control, or the
  // case's own input — exists before the script runs, so it too would score
  // every run as a side effect (BUG-13's second shape).
  const collides = (c.expected.absent ?? []).find(
    (p) => fixture.controls.includes(p) || p === c.input,
  );
  if (collides !== undefined) {
    decline(
      `case's \`expected.absent\` names "${collides}", which the fixture itself creates`,
    );
    return;
  }

  for (const shell of shells) {
    // One directory per (case, shell): a side effect from the bash run must
    // not be read as one from the zsh run.
    let fixtureDir;
    try {
      fixtureDir = mkdtempSync(join(workDir, "fixture-"));
      for (const control of fixture.controls) {
        writeFileSync(join(fixtureDir, control), "");
      }
      // The case's own name. `join` normalises "/" and "..", which would turn
      // a traversal name into a write outside the fixture — so the name is
      // appended raw and any separator in it is a decline, not a normalised
      // path.
      //
      // The shell-fn form gets the input as ARGV, not as a directory entry, so
      // it does not need the file — and must not be declined for a name a
      // file cannot carry: a real label such as `area/backend` is exactly the
      // kind of input a label filter must be probed with (task.136 QA cycle
      // 1, CR-3). The controls are still written, so `absent` and the cwd
      // sentinel keep their meaning.
      if (fnName === null) {
        if (c.input.includes("/") || c.input.includes("\0")) {
          throw new Error("name carries a path separator or NUL");
        }
        writeFileSync(`${fixtureDir}/${c.input}`, "");
      } else if (c.input.includes("\0")) {
        throw new Error("input carries a NUL");
      }
    } catch (e) {
      caseResults.push({
        id: c.id,
        shell,
        direction: c.direction,
        outcome: "errored",
        detail: `fixture: cannot materialise "${c.input}": ${e.message}`,
      });
      continue;
    }

    const before = snapshotTree(sandboxRoot, workDirName);
    const scriptDirBefore = listDirStamps(scriptDir);
    // ARGV, never a string: the script path and the directory are $1 and $2
    // of a fixed one-line body. Building `bash <script> <dir>` as text would
    // put a caller-supplied path through a second parse, which is the class
    // of defect this engine exists to probe for.
    // cwd is the FIXTURE directory, not workDir (task.128 QA cycle 2, BUG-5):
    // a script that re-parses a name without `cd "$1"` — the qa-cycle.sh
    // shape, which globs "$DIR"/* from wherever it is — writes its side effect
    // to its cwd, and `absent` looks in the fixture. With cwd: workDir the
    // marker landed where neither `absent` nor the sentinel (which skips
    // workDir) could see it, and the case scored `rejected`.
    //
    // The shell-fn form (task.136) keeps the ARGV rule: the library path, the
    // function name and the case's input are $1, $2 and $3 of a fixed body,
    // and the shell is spawned with its rc files off — this arm sources INTO
    // the shell, where the `shell:` arm only ever runs `bash <script>`.
    const argv =
      fnName === null
        ? ["-c", 'bash "$1" "$2"', shell, entryPath, fixtureDir]
        : [
            ...noRcFlags(shell),
            "-c",
            SHELL_FN_BODY,
            "probe",
            entryPath,
            fnName,
            c.input,
          ];
    const env = {
      ...sandboxEnv({ cwd: fixtureDir }),
      HOME: sandboxHome,
      TMPDIR: sandboxTmp,
      LC_ALL: "C",
    };
    if (fakeGhDir !== null) {
      // First on PATH, and armed: the fixture's `gh` refuses to run without
      // FAKE_GH=1, so a stray invocation from any other context exits 2.
      env.PATH = `${fakeGhDir}:${env.PATH}`;
      env.FAKE_GH = "1";
    }
    const child = spawnSync(shell, argv, {
      input: "",
      cwd: fixtureDir,
      env,
      encoding: "utf8",
      timeout: timeoutMs,
      maxBuffer: 8 * 1024 * 1024,
    });
    const after = snapshotTree(sandboxRoot, workDirName);
    for (const [path, stamp] of after) {
      if (before.get(path) !== stamp) {
        escapes.push({ id: `${c.id}@${shell}`, shell, path });
      }
    }
    const scriptDirAfter = listDirStamps(scriptDir);
    for (const [name, stamp] of scriptDirAfter) {
      if (scriptDirBefore.get(name) !== stamp) {
        escapes.push({
          id: `${c.id}@${shell}`,
          shell,
          path: join(scriptDir, name),
        });
      }
    }

    let outcome;
    let detail = null;
    if (neverRan(child)) {
      outcome = "errored";
      detail = child.signal ? `timed out after ${timeoutMs}ms` : "never ran";
    } else if (fnName !== null && child.status === SHELL_FN_SOURCE_FAILED) {
      // The source itself failed — a syntax error, a `return` at top level,
      // an `exit` in the library. A property of the ENTRY, so every case
      // reports it identically and runProbeSpec folds them into one decline.
      // Without the reserved exit this read as N mismatches and scored
      // `absent` with a full count (task.136).
      outcome = "errored";
      detail = `source "${entryPath}" failed (exit ${SHELL_FN_SOURCE_FAILED}): ${(child.stderr ?? "").trim().split("\n")[0].slice(0, 160)}`;
    } else if (fnName !== null && child.status === SHELL_FN_NOT_DEFINED) {
      outcome = "errored";
      detail = `function "${fnName}" is not defined after sourcing "${entryPath}" (exit ${SHELL_FN_NOT_DEFINED})`;
    } else if (isLaunchFailure(child, entryPath)) {
      // bash could not OPEN the script (a race with the readability check in
      // runProbeSpec, or a permission change under it). Keyed on bash's own
      // message about entryPath, not on the exit code alone: 126/127 are also
      // what a TARGET exits with when a hostile name makes an unquoted script
      // run it as a command, and that is a reproduction to compare, not a
      // decline (task.128 QA cycle 2, BUG-7). `bash "$1"` never consults the
      // shebang, so "interpreter missing" is not a state this branch can see.
      outcome = "errored";
      detail = `bash could not open the script (exit ${child.status}): ${(child.stderr ?? "").trim().slice(0, 160)}`;
    } else {
      const mismatches = compareExpected(c.expected, child, fixtureDir);
      const matched = mismatches.length === 0;
      outcome =
        c.direction === "hostile"
          ? matched
            ? "rejected"
            : "accepted"
          : matched
            ? "accepted"
            : "rejected";
      detail = matched ? null : mismatches.join("; ");
    }
    caseResults.push({
      id: c.id,
      shell,
      direction: c.direction,
      outcome,
      detail,
      // The shell-fn form materialises no per-case file (CR-3), and the
      // record must not claim one.
      fixture:
        fnName === null
          ? [...fixture.controls, c.input]
          : [...fixture.controls],
    });
  }
}

// ── The run record ───────────────────────────────────────────────────────────
//
// `probes_executed` and `evidence` in a review's output block used to be typed
// by the agent, and the contract test read the DOCUMENTED example rather than a
// real run — so an agent that executed nothing and wrote `12` satisfied both
// the prose rule and CI. The condition the check exists to catch (probes
// skipped) is exactly the one under which a self-report is unreliable (obs #10).
//
// This record is the number's only legitimate route from the engine to the
// block. `--record <path>` writes it; `--emit-block <record>` reads it back and
// prints the YAML the report carries. `evidence` is COMPUTED from the totals and
// never accepted as input, so `measured` is unrepresentable without a record
// whose `totals.executed` is positive. Delete the record and the block reads
// `reasoned` — that is the mutation the contract test performs.
//
// One record per review, one ENTRY FILE per control. `--record <path>` writes
// this run's control to `<path>.d/<key>.json` — an atomic temp+rename to a name
// derived from `{sink, entry}`, so two controls never share a file and a re-run
// of the same control replaces only its own — and then writes the folded
// snapshot at `<path>` for readers. `readRecord` folds the entry directory,
// never the snapshot, so the snapshot cannot mislead the engine.
//
// WHY ENTRY FILES AND NOT A MERGED FILE. The first version merged every run
// into one JSON file: read → filter → push → rename. Concurrent runs (an agent
// issuing its probes as parallel tool calls) lost controls to last-writer-wins
// (CR2-1). A lock fixed that and then spent four QA cycles growing crash-
// recovery edges — stale reclaim, reclaim TOCTOU, put-back overwrite, orphan
// stall, pid-write leak (CR3-2, CR4-1, CR5-1, CR5-2, CR6-1) — each real, each
// fixed, each exposing the next. Distinct files per control have no shared
// write, so there is nothing to lock, reclaim, put back or identify. The
// reviewer proposed this in cycle 2; it took four more to earn it.

export const RECORD_VERSION = 1;

/** Severity the review prompt assigns each verdict — stated once, here. */
export const SEVERITY_BY_VERDICT = Object.freeze({
  engages: "none",
  "present-but-inert": "high",
  absent: "medium",
  unverifiable: "unverifiable",
});

const controlKey = (c) => `${c.sink ?? ""}\u0000${c.entry ?? ""}`;

/**
 * Reduce a `runProbeSpec` result to the per-control entry the record stores.
 * Counts only — the per-case detail stays in the engine's own `--json` output.
 */
export function toRecordEntry(result, { name, callSite } = {}) {
  return {
    sink: result.sink ?? null,
    entry: result.entry ?? null,
    name: name ?? null,
    call_site: callSite ?? null,
    verdict: result.verdict,
    reason: result.reason,
    executed: result.executed ?? 0,
    passed: result.passed ?? 0,
    reproduced: result.reproduced?.length ?? 0,
    overblocked: result.overblocked?.length ?? 0,
    declined: result.declined?.length ?? 0,
    escaped: result.escapes?.length ?? 0,
    // Which shells each case ran under (shell form), or null. The count is
    // cases × shells, and a reader must not have to divide (cycle 2, CR-5).
    shells: Array.isArray(result.shells) ? [...result.shells] : null,
    // The directory whose `gh` answered the shell runs (task.136), or null —
    // the record must say what answered, not leave a reader to assume the
    // real one did not.
    fake_gh: typeof result.fakeGh === "string" ? result.fakeGh : null,
    ran_at: new Date().toISOString(),
  };
}

function totalsOf(controls) {
  return controls.reduce(
    (t, c) => ({
      executed: t.executed + (c.executed ?? 0),
      reproduced: t.reproduced + (c.reproduced ?? 0),
    }),
    { executed: 0, reproduced: 0 },
  );
}

/** The entry directory beside a record path. */
export function recordEntriesDir(recordPath) {
  return `${recordPath}.d`;
}

const isCount = (n) => Number.isInteger(n) && n >= 0;
const validControl = (c) =>
  c !== null &&
  typeof c === "object" &&
  !Array.isArray(c) &&
  isCount(c.executed) &&
  isCount(c.reproduced) &&
  VERDICTS.includes(c.verdict) &&
  (c.ran_at === undefined || c.ran_at === null || typeof c.ran_at === "string");

/** The one ordering of runs: ISO timestamps compare as strings; missing sorts first. */
const ranAt = (c) => c.ran_at ?? "";

/**
 * Read a record by folding its entry directory. `null` when there is no
 * directory; throws on an entry that is not a control — the record is
 * rejected as a unit, because reading around one hand-edited or truncated
 * entry would let it through as "a record with one bad row". The folded
 * snapshot at `recordPath` is never read: it is for humans, and a stale or
 * edited snapshot must not be able to change what the engine emits.
 */
export function readRecord(recordPath, { readdir = readdirSync } = {}) {
  const dir = recordEntriesDir(recordPath);
  let names;
  try {
    names = readdir(dir);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
    // No entries. A snapshot standing alone is not "no record": it is a record
    // whose entries are gone (or one written by the merged-file layout this
    // replaced), and reading it as empty would let the next --record silently
    // overwrite it (QA cycle 7, CR7-2). Loud, like every other unreadable record.
    //
    // But look at the DIRECTORY again before concluding, not only at the
    // snapshot: a sibling first run may have created the directory, written its
    // entry and its snapshot between our readdir and this check, and that is a
    // record, not an orphan (QA cycle 9, CR9-1). One re-read settles it.
    if (existsSync(recordPath)) {
      try {
        names = readdir(dir);
      } catch (again) {
        if (again.code !== "ENOENT") throw again;
        throw new Error(
          `${recordPath} has no entry directory (${dir}) — a snapshot without entries is not a record; re-run the probes with --record`,
        );
      }
    } else {
      return null;
    }
  }
  const controls = [];
  for (const name of names.filter((n) => n.endsWith(".json")).sort()) {
    let entry;
    try {
      entry = JSON.parse(readFileSync(join(dir, name), "utf8"));
    } catch {
      entry = null;
    }
    if (!validControl(entry)) {
      throw new Error(
        `${join(dir, name)} is not a version-${RECORD_VERSION} security-probe run record entry`,
      );
    }
    controls.push(entry);
  }
  return foldRecord(dedupeByKey(controls));
}

/**
 * One control per `{sink, entry}`, latest run wins. The writer already
 * guarantees this by file name, but the fold must not depend on it: a copy of
 * an entry under another name would otherwise count one control twice (CR7-3).
 */
function dedupeByKey(controls) {
  const byKey = new Map();
  for (const c of controls) {
    const k = controlKey(c);
    const prev = byKey.get(k);
    if (!prev || ranAt(c) >= ranAt(prev)) byKey.set(k, c);
  }
  return [...byKey.values()];
}

function foldRecord(controls) {
  return {
    version: RECORD_VERSION,
    controls,
    totals: totalsOf(controls),
    updated_at:
      controls.reduce((m, c) => (ranAt(c) > m ? ranAt(c) : m), "") || null,
  };
}

/** Filesystem-safe, collision-free name for a control's entry file. */
function entryFileName(entry) {
  return `${createHash("sha256").update(controlKey(entry)).digest("hex").slice(0, 24)}.json`;
}

/** Atomic write: temp in the same directory, then rename. */
function writeAtomic(target, text) {
  const tmp = `${target}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    writeFileSync(tmp, text);
    renameSync(tmp, target);
  } catch (e) {
    rmSync(tmp, { force: true });
    throw e;
  }
}

/**
 * Record one probe run: write this control's entry file under `<path>.d/`
 * (atomic, named from `{sink, entry}`), then fold the directory into the
 * snapshot at `<path>`. Concurrent runs of different controls write different
 * files and never contend; a re-run of the same control replaces only its own.
 * Returns the folded record.
 */
/**
 * Read-then-create: the one prologue every writer runs. Reading FIRST is what
 * makes a snapshot with no entries throw instead of being written over
 * (CR7-2), and having it here rather than in each caller is what gives a
 * library caller the same guard as the CLI preflight (CR8-1, CR9-2).
 * @returns the entry directory
 */
function openRecordForWrite(recordPath) {
  readRecord(recordPath); // throws on a corrupt entry or an orphaned snapshot
  const dir = recordEntriesDir(recordPath);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function recordRun(recordPath, result, opts = {}) {
  const dir = openRecordForWrite(recordPath);
  const entry = toRecordEntry(result, opts);
  // This control's own file; a concurrent run of a DIFFERENT control writes a
  // different name and a re-run of the SAME control replaces this one, which
  // is the merge semantics the single file used to implement with a lock.
  writeAtomic(
    join(dir, entryFileName(entry)),
    `${JSON.stringify(entry, null, 2)}\n`,
  );
  // The snapshot is a convenience for a reader opening the record by hand. Two
  // runs may race to write it and the loser's view is momentarily stale — that
  // is fine, because nothing in the engine reads it: --emit-block folds the
  // directory and rewrites the snapshot exactly.
  const record = readRecord(recordPath);
  writeSnapshot(recordPath, record);
  return record;
}

export function writeSnapshot(recordPath, record) {
  writeAtomic(recordPath, `${JSON.stringify(record, null, 2)}\n`);
}

/**
 * Fail fast on a --record that cannot be used, BEFORE the probe run spends its
 * spawn budget: a corrupt existing record or an unwritable directory used to
 * be discovered only after every corpus case had run, and reported as a write
 * failure even when the read was what failed (CR2-4).
 */
export function preflightRecord(recordPath) {
  const dir = openRecordForWrite(recordPath);
  // mkdirSync is a no-op on an EXISTING read-only directory, so the write
  // permission is checked explicitly (CR3-5) — on both the entry directory
  // and the snapshot's parent.
  accessSync(dir, fsConstants.W_OK);
  accessSync(dirname(resolve(recordPath)), fsConstants.W_OK);
}

/**
 * The `evidence` value a record supports. Computed, never supplied: this is the
 * one function that decides whether `measured` may appear at all.
 *
 * The totals are RECOMPUTED from `controls`, never read from the file. The
 * stored `totals` is a convenience for a human reader; a record whose
 * `totals.executed` was hand-edited upward with no control behind it must still
 * render `reasoned`, or the field becomes the typed count one layer down.
 */
export function evidenceOf(record) {
  if (!record) return "reasoned";
  return totalsOf(record.controls ?? []).executed > 0 ? "measured" : "reasoned";
}

/**
 * First characters YAML reads as an indicator. A value starting with one is
 * JSON-quoted even when the rest of it is in the safe class — `name: #foo` is
 * a comment, not a name.
 */
const YAML_INDICATOR_START = /^[-?:,[\]{}#&*!|>'"%@`]/;

/**
 * Plain scalars YAML's core schema resolves to something other than a string.
 * A `--name 123` must stay the string the agent passed, so these are quoted
 * even though every character is in the safe class.
 */
// YAML 1.2 core-schema forms, which is the target: the number alternative
// covers every plain integer run (leading zeros included — a 1.2 reader types
// 007 as 7, a 1.1 reader as octal; both as a NUMBER) as well as floats with a
// bare leading or trailing dot, so no separate int branch is needed; then the
// 0o/0x, inf/nan, bool and null words. YAML 1.1-only forms (1_000, dates)
// are deliberately not covered — a 1.1 reader of this block is out of scope.
const YAML_TYPED_SCALAR =
  /^(?:[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)(?:[eE][-+]?[0-9]+)?|0o[0-7]+|0x[0-9a-fA-F]+|[-+]?\.(?:inf|Inf|INF)|\.(?:nan|NaN|NAN)|true|True|TRUE|false|False|FALSE|yes|Yes|YES|no|No|NO|on|On|ON|off|Off|OFF|null|Null|NULL|~)$/;
// A ":" at the END of a plain scalar makes `key: value:` a parse error in every
// YAML implementation tried (CR3-1); the indicator-START rule cannot see it.
const YAML_TRAILING_COLON = /:$/;

const yamlStr = (v) => {
  if (v === null || v === undefined) return "null";
  const s = String(v);
  return /^[A-Za-z0-9_./#:@-]+$/.test(s) &&
    !YAML_INDICATOR_START.test(s) &&
    !YAML_TRAILING_COLON.test(s) &&
    !YAML_TYPED_SCALAR.test(s)
    ? s
    : JSON.stringify(s);
};

/**
 * Render the `security_review:` block from a record. A `null` record renders
 * the honest empty block — zero probes, `reasoned`, no controls — with a comment
 * saying no engine run was recorded, so a report that skipped the engine says so
 * in the artefact a gate reads rather than in prose a reader may skip.
 */
export function emitBlock(record, { mode = "diff" } = {}) {
  const lines = ["security_review:", `  mode: ${mode}`];
  // One function owns the answer on every path, including the missing-record
  // one — a hardcoded "reasoned" here would be correct today and silently
  // decoupled from evidenceOf() the day that function changes.
  const evidence = evidenceOf(record);
  if (!record) {
    lines.push(
      "  probes_executed: 0    # no run record — the engine did not run",
      `  evidence: ${evidence}    # computed by security-probe.mjs; measured needs a record`,
      "  controls: []",
    );
    return `${lines.join("\n")}\n`;
  }
  const totals = totalsOf(record.controls);
  lines.push(
    `  probes_executed: ${totals.executed}`,
    `  evidence: ${evidence}    # computed by security-probe.mjs from the run record`,
  );
  if (record.controls.length === 0) {
    lines.push("  controls: []");
  } else {
    lines.push("  controls:");
    for (const c of record.controls) {
      lines.push(
        `    - name: ${yamlStr(
          c.name ??
            `${c.sink}:${String(c.entry ?? "")
              .split("#")
              .pop()}`,
        )}`,
        `      verdict: ${yamlStr(c.verdict)}`,
        `      severity: ${yamlStr(SEVERITY_BY_VERDICT[c.verdict])}`,
        `      call_site: ${yamlStr(c.call_site)}`,
        `      entry: ${yamlStr(c.entry)}`,
        `      sink: ${yamlStr(c.sink)}`,
        `      reason: ${yamlStr(c.reason)}`,
        `      probes_executed: ${c.executed}`,
        ...(Array.isArray(c.shells) && c.shells.length > 0
          ? [`      shells: [${c.shells.join(", ")}]`]
          : []),
      );
    }
  }
  return `${lines.join("\n")}\n`;
}

// ── CLI ──────────────────────────────────────────────────────────────────────

/** Flags that take exactly one operand. A missing or flag-shaped operand is exit 2. */
const OPERAND_FLAGS = Object.freeze({
  "--sink": "sink",
  "--entry": "entry",
  "--cases-file": "casesFile",
  "--fake-gh": "fakeGh",
  "--repo-root": "repoRoot",
  "--record": "record",
  "--name": "name",
  "--call-site": "callSite",
  "--emit-block": "emitBlock",
  "--mode": "mode",
});

export function main(argv = process.argv.slice(2)) {
  const opts = { json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (Object.hasOwn(OPERAND_FLAGS, a)) {
      // Checked at parse time: `argv[++i]` on a trailing flag yields undefined,
      // which a post-loop `!== undefined` guard cannot tell from the flag never
      // having been given — `--record` with no path used to exit 2 only because
      // `--entry` happened to be absent too.
      const operand = argv[i + 1];
      if (operand === undefined || operand.startsWith("--")) {
        process.stderr.write(`${a} requires an operand\n`);
        return 2;
      }
      opts[OPERAND_FLAGS[a]] = operand;
      i += 1;
    } else if (a === "--timeout") {
      // Validated with the SAME rule the spawn budget applies to its env vars,
      // imported rather than restated. `Number()` alone was the defect: it
      // yields NaN for a missing or non-numeric value, NaN is neither null nor
      // undefined so it survives the `??` default below, and `spawnSync` then
      // throws an uncaught RangeError instead of the exit 2 this file documents
      // for a bad argument. `0` was worse — it survives too, and `timeout: 0`
      // means NO timeout to spawnSync, silently removing per-case containment.
      // Hence a floor of 1, which is what `readInt`'s own `min` argument is for.
      const parsed = readInt(argv[++i], 1);
      if (parsed === undefined) {
        process.stderr.write(
          "--timeout must be a positive integer (milliseconds)\n",
        );
        return 2;
      }
      opts.timeoutMs = parsed;
    } else {
      process.stderr.write(`unknown argument: ${a}\n`);
      return 2;
    }
  }
  // Emit mode runs no probe: it renders the block from whatever the record
  // says. A missing record is a legitimate input here (it renders `reasoned`);
  // a corrupt one is not, and exits 2 rather than reading as empty.
  // Validated regardless of mode: a bad --mode is a bad argument whether or
  // not this run happens to emit a block.
  if (opts.mode !== undefined && opts.mode !== "diff" && opts.mode !== "full") {
    process.stderr.write("--mode must be diff or full\n");
    return 2;
  }
  if (opts.emitBlock !== undefined) {
    let record;
    try {
      record = readRecord(opts.emitBlock);
    } catch (e) {
      process.stderr.write(`cannot read --emit-block record: ${e.message}\n`);
      return 2;
    }
    // The snapshot is a reader convenience; failing to refresh it must not
    // cost the block, which is the deliverable (QA cycle 7, CR7-1).
    if (record) {
      try {
        writeSnapshot(opts.emitBlock, record);
      } catch (e) {
        process.stderr.write(
          `warning: could not refresh the snapshot at ${opts.emitBlock}: ${e.message}\n`,
        );
      }
    }
    process.stdout.write(emitBlock(record, { mode: opts.mode ?? "diff" }));
    return 0;
  }
  if (!opts.entry) {
    process.stderr.write(
      "--entry <path#exportName | shell:path | shell-fn:path#function> is required\n",
    );
    return 2;
  }
  if (!opts.sink && !opts.casesFile) {
    process.stderr.write("one of --sink or --cases-file is required\n");
    return 2;
  }

  let cases;
  if (opts.casesFile) {
    try {
      cases = JSON.parse(readFileSync(opts.casesFile, "utf8"));
    } catch (e) {
      process.stderr.write(`cannot read --cases-file: ${e.message}\n`);
      return 2;
    }
  }

  if (opts.record) {
    try {
      preflightRecord(opts.record);
    } catch (e) {
      process.stderr.write(`cannot use --record: ${e.message}\n`);
      return 2;
    }
  }

  const result = runProbeSpec({
    sink: opts.sink,
    entry: opts.entry,
    cases,
    fakeGh: opts.fakeGh,
    timeoutMs: opts.timeoutMs,
    ...(opts.repoRoot ? { repoRoot: resolve(opts.repoRoot) } : {}),
  });

  const escaped = result.escapes?.length ?? 0;

  // Written BEFORE the output so a caller reading the block can rely on the
  // record existing whenever the summary line was printed. A record write that
  // fails is a hard error: the count was the deliverable, and printing a verdict
  // whose count then cannot be carried forward is the self-report this file
  // exists to remove.
  if (opts.record) {
    try {
      recordRun(opts.record, result, {
        name: opts.name,
        callSite: opts.callSite,
      });
    } catch (e) {
      process.stderr.write(`cannot update --record: ${e.message}\n`);
      return 2;
    }
  }

  if (opts.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    // `escaped` is appended rather than folded into the counts, and it is never
    // omitted when non-zero. The escape sentinel is the last line of
    // containment, and it was the one result this line dropped: an escaping
    // probe printed a clean-looking summary while the sentinel had fired, and
    // only `--json` revealed it.
    process.stdout.write(
      `${result.verdict} (${result.reason}) — executed ${result.executed}, ` +
        `passed ${result.passed}, reproduced ${result.reproduced.length}, ` +
        `declined ${result.declined.length}` +
        (escaped > 0 ? `, ESCAPED ${escaped}` : "") +
        `\n`,
    );
  }

  // `unverifiable` exits 1, not 0. See the exit-code note at the top of the file.
  //
  // An ESCAPE also exits 1, even on an `engages` verdict. A probe that wrote
  // outside its sandbox is not a clean run whatever verdict it earned: the
  // verdict describes the control under probe, the escape describes the probe
  // itself, and a caller reading only `$?` must not be told the second was fine
  // because the first was.
  if (escaped > 0) return 1;
  return result.verdict === "engages" ? 0 : 1;
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  process.exitCode = main();
}
