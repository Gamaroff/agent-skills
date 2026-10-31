#!/usr/bin/env node
/**
 * security-probe — run a security probe against a named export and compute the
 * verdict from what actually happened.
 *
 * Usage:
 *   node <this-file> --sink <name> --entry <path#exportName> [options]
 *   node <this-file> --sink <name> --entry shell:<path>     [options]
 *   node <this-file> --sink <name> --entry shell-fn:<path>#<function> [--fake-gh <dir>] [options]
 *   node <this-file> --sink <name> --entry cli:<path> --argv '<JSON array>' [options]
 *   node <this-file> --sink <name> --entry shell-argv:<path> --argv '<JSON array>' [--fixture-setup <path>] [options]
 *   node <this-file> --sink <name> --entry 'fence:<doc.md>#<heading>' --slot '<token>' [options]
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
 *                        or `cli:relative/path.mjs` — a NODE CLI run with the
 *                        `--argv` template, one probe per case; a `.py` path is
 *                        a PYTHON CLI, run the same way under python3. See "The
 *                        cli entry form".
 *                        or `shell-argv:relative/path.sh` — a SHELL SCRIPT taking
 *                        several arguments or flags, run with the `--argv`
 *                        template under bash, called from bash and (when present)
 *                        zsh. See "The shell-argv entry form".
 *                        or `fence:relative/doc.md#Heading` — the first ```bash
 *                        block under that heading of a MARKDOWN STEP DOC, read
 *                        on every run and run as a script per case under bash
 *                        and (when present) zsh. See "The fence entry form".
 *   --slot <token>       the fence: form's placeholder — the literal text in the
 *                        block that each case's input replaces. Required with
 *                        fence:, refused (exit 2, `bad-slot`) with every other form
 *   --argv <json>        the cli: and shell-argv: forms' argv template — a JSON
 *                        array of strings with exactly one "{input}" element and
 *                        optionally "{fixture}" elements. Required with cli: and
 *                        shell-argv:, refused (exit 2, `bad-argv`) with every
 *                        other form
 *   --fixture-setup <path> the shell-argv: form's per-run setup — a committed
 *                        shell script inside the repo root, run as
 *                        `bash <path> <fixture-dir>` before each (case, shell)
 *                        run. A non-zero exit makes that run `errored`, never a
 *                        verdict. Refused (exit 2, `bad-fixture-setup`) with
 *                        every other form; recorded as `fixture_setup`
 *   --args-json <json>   a JSON ARRAY of fixed extra arguments appended after the
 *                        case's input on every call — `fn(input, ...args)` — so a
 *                        `(text, opts)` validator is probeable (task.131). The JS
 *                        entry form only: refused (exit 2, `bad-args`) with every
 *                        other form. Recorded as `args`. The engine never guesses
 *                        an argument; the caller states it
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
 * exit, stderr, paths that must be absent after the run (`absent`), paths the
 * fixture creates that the run must delete (`removed`; both relative to the
 * case directory, task.232) — is what the run is compared
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
 * per shell, `<shell> --norc -c 'exit() { builtin exit 97; }; source "$1";
 * src=$?; …; "$fn" "$@"'` with the library, the function name and the case's
 * input as ARGV, never a string (`exit` shadowed and the status taken as a
 * simple command during the source: task.140 — see SHELL_FN_BODY).
 * Exit 97 is reserved for "the source itself failed" and exit 98 for "the
 * function is not defined after sourcing", so a broken or misnamed library is
 * a NAMED decline (`entry-not-probeable`) rather than a silent `absent`; the
 * function runs in a subshell and its own 97/98 is re-mapped to 99 and scored,
 * so the sentinels can only come from the harness. No per-case file is written
 * for this form — the input is argv, so it may carry a `/`. A
 * function that consults `gh` is answered by `--fake-gh <dir>`: the directory
 * is prepended to PATH with `FAKE_GH=1` in the env, so the fixture's `gh`
 * answers and a real `gh` — or the network — never does; a library or script
 * that names `gh` (or sources, one level deep, a file that does) and was given
 * no `--fake-gh` is declined `needs-fake-gh` under both shell forms. What the function
 * must print is NOT the sink corpus's `expected` (that describes a script
 * printing a gate number): the caller names a cases file with `--cases-file`.
 *
 * THE CLI ENTRY FORM (task.144). A boundary delivered as a MULTI-FLAG NODE CLI
 * matched none of the three forms — the JS runner calls an export with ONE
 * argument, and `uat-status.mjs`'s `--env` guard lives behind a three-argument
 * function and a flag parser — so task.141's finalise recorded
 * `probes_executed: 0` and was accepted over it. `--entry cli:<path> --argv
 * '<JSON array>'` runs `process.execPath <path> ...argv` per case, with the
 * template's one `{input}` element replaced by the case's input as ONE argv
 * element (never split, never parsed by a shell) and each `{fixture}` element by
 * that case's fixture directory. A slot is a whole element or nothing:
 * `--x={input}` is refused rather than interpolated, so no argv element is ever
 * built by string concatenation from probe input. The sandbox is the shell
 * arm's — the fixture sits inside the sandbox root, HOME and TMPDIR point inside
 * it, stdin is empty, and the script's own directory is watched — because a
 * Node CLI can write to `os.homedir()` exactly as a shell script can write to
 * `$HOME`. THE VERDICT IS THE EXIT STATUS: exit 0 is `accepted`, non-zero is
 * `rejected`, which is a contract the CLI must honour — one that exits 0 while
 * refusing is scored as accepting, and a case that needs a finer signal carries
 * `expected`, which is then compared exactly as the shell arm compares it. A
 * CLI that CRASHES (an uncaught error: Node's own `Node.js vX.Y.Z` footer on
 * stderr), is killed, or times out is `errored` — "could not look", never a
 * refusal — so a script that fails to load is declined `entry-not-probeable`
 * rather than scored as a control that rejects everything. Only an UNCAUGHT
 * error carries that footer: a CLI that catches its own failure and exits
 * non-zero (`main().catch(e => { console.error(e); process.exitCode = 1 })`)
 * is indistinguishable from one that refused, and is scored `rejected` — a
 * FALSE PASS on a hostile case. An `expected` that only a genuine refusal
 * produces turns it into a false alarm (the crash mismatches, so a hostile
 * case scores `accepted`); neither makes it `errored` (QA cycles 2–3). A `--argv` shape
 * error is an argument error (exit 2, nothing runs, no record); an entry that
 * escapes the root or is not a `.mjs`/`.js` regular file is a named decline,
 * as for every other form. The record carries the template as `argv`, and a
 * `cli:` control's key is its `--name` when one is given, else its argv
 * SKELETON (flags and positionals kept, flag values dropped — see controlKey),
 * so two different controls on one script
 * (`--env {input}`, `--clear-note {input}`) are two controls, not one.
 *
 * A PYTHON CLI (task.215) takes the same form: `cli:<path>.py` runs the script
 * under `python3 -E -s -B` with the same template, sandbox, timeout and
 * verdict. The interpreter is chosen by extension (CLI_INTERPRETERS) and the
 * host's python3 is resolved once per process (probePython); when it does not
 * run, the entry is declined `entry-not-probeable` once, by name. A Python crash
 * exits 1 — a refusal's status — and prints no Node footer, so the script runs
 * inside PYTHON_BOOTSTRAP, which writes an exit record on fd 3 for every exit
 * it controls — `answer` when the body returns or raises SystemExit, `crash`
 * when it raises anything else, caught before any excepthook runs. A case
 * with no record is `errored`, so every way to lose the write fails safe.
 * A traceback on stderr with exit 1 (isPythonCrash) is read as a crash too. The
 * result and the record carry `interpreter` ({ name, version }), null for every
 * other form.
 *
 * A `cli:` case's `fixture` (`env`, `files`) is honoured as for shell-argv:
 * (task.216): its files are written into the case directory — the child's cwd —
 * before the spawn, its env merged over the sandbox's, with the same refusals
 * (a path that leaves the directory, HOME, TMPDIR, LC_ALL) and more of the
 * form's own, PATH, NODE_OPTIONS and any `LD_*` or `DYLD_*` dynamic-loader
 * variable, which steer the interpreter rather than the CLI (steersInterpreter). It is how a CLI
 * that refuses on what it finds in a data directory gets a legitimate case that
 * is accepted; without it every input reads as overblocked and the verdict is
 * `rejects-every-input`. Repository state is not reachable this way: fixture
 * files are text, which make no commit and no staged index, and
 * `--fixture-setup` stays shell-argv:'s.
 *
 * THE SHELL-ARGV ENTRY FORM (task.181). A boundary delivered as a SHELL SCRIPT
 * TAKING SEVERAL ARGUMENTS OR FLAGS (`verify-push-state.sh --base … --scope …`,
 * `reenter-qa-after-finalise.sh <doc-dir> <report>`) matched none of the forms —
 * `shell:` passes exactly one positional — so every such change tripped the
 * zero-guard and was probed by hand (task.147, task.170). `--entry
 * shell-argv:<path> --argv '<JSON array>'` is the cli: contract on a bash script:
 * the same template grammar, the same verdict (exit status, or `expected` when a
 * case carries one), the same record key (`--name`, else the argv skeleton).
 * Each shell from probeShells() is the CALLER and bash the INTERPRETER —
 * `<shell> -c 'bash "$@"' <shell> <script> ...argv` — as for `shell:`. A case's
 * `fixture` (`env`, `files`) is honoured as for fence:, and `--fixture-setup
 * <path>` names a committed script, contained like the entry, run as
 * `bash <setup> <case-dir>` before each (case, shell) run, after the case's
 * fixture files are written: it builds the scratch repository these scripts
 * read. A setup that exits non-zero, times out or never starts makes that run
 * `errored`, never `rejected`; so does a setup that writes anywhere but the case
 * directory — its writes are watched in their own list and never charged to the
 * entry (TASK-181-002). Every run is watched beside the case directory as
 * fence:'s is (caseWatchedSpawn, TASK-181-003). It is a shell form for `gh`: a script, a setup,
 * or a case fixture's env values or file contents that name `gh` without
 * `--fake-gh` are declined `needs-fake-gh`, and every PATH directory holding the
 * host `gh` is shadowed (ghFreePath), as for fence: (TASK-181-001). The record
 * carries the setup as `fixture_setup`.
 *
 * THE FENCE ENTRY FORM (task.180). Many of this repository's boundaries ship as
 * a fenced bash block inside a Markdown step doc — a precondition, a refusal, a
 * guard — and none of the four forms reaches one, so every `/finalise` on such a
 * change recorded `probes_executed: 0` and hand-wrote a wrapper under the
 * gitignored `.claude/state/` (task.159, task.167). `--entry
 * 'fence:<doc.md>#<heading>' --slot '<token>'` reads the doc on EVERY run,
 * finds the heading (outside fences — a `# comment` inside a block is not a
 * heading), takes the first ```bash block before the next heading of the same
 * or a higher level, and replaces every `<token>` in it with the case's input.
 * THE SLOT IS SOURCE SUBSTITUTION, NOT DATA: the input becomes script text, as
 * it does for the document's reader, so a `$(…)` in it runs — the probe models
 * the block as shipped. Its effects land in the case's own directory, which is
 * the block's cwd, inside the sandbox; a write elsewhere in the sandbox is an
 * escape, and under the work dir so is a deletion or a new directory. A write
 * to an absolute path OUTSIDE the sandbox (an injected `$(touch /x)`) is not
 * observed — a stated limit (TASK-180-016). A
 * case's optional `fixture` supplies the rest of what the block reads: `env`
 * (never HOME, TMPDIR or LC_ALL — the sandbox owns them) and `files` written
 * into the case directory, refused when a path leaves it. The script runs as
 * `<shell> <script>` per shell, rc files off, with the shell arm's trip-wire
 * `gh` (or `--fake-gh`) first on PATH, every PATH directory holding the host
 * `gh` shadowed by a copy without it (ghFreePath), and the shell forms' `gh`
 * text check over the block, the inputs and the fixtures. A default-path lookup
 * (`command -p gh`) that no checked text spells out is a stated limit. A HOSTILE case must carry `expected` — the
 * guard's own refusal OUTPUT, a non-empty stdout or stderr — and is declined
 * without one: under source
 * substitution an exit status cannot tell a refusal from a shell that stopped
 * on the input or from an injected `exit`, and three QA cycles of stderr
 * classification each let one of them read as a refusal (task.180). A
 * legitimate case without `expected` is scored by exit status (0 accepted).
 * A generated script that does not parse (`<shell> -n`) is `errored`. The
 * order is scoreFenceRun's. A missing heading, an
 * ambiguous one, a heading with no bash block under it, or a slot the block
 * does not contain is a named decline, never a verdict. The record names
 * `fence:<doc>#<heading>`, which resolves in every checkout.
 */

import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  accessSync,
  constants as fsConstants,
  mkdtempSync,
  mkdirSync,
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  normalize,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  extractBlocks,
  isWithin,
  sandboxEnv,
  snapshotTree,
} from "./qa-execute-snippets.mjs";
import {
  DIRECTIONS,
  MATERIALISED_SINKS,
  SINKS,
  corpusFor,
} from "./security-input-corpus.mjs";
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

  // obs #156 — an ABSENT export is told apart from a non-function one. A
  // module-private predicate is still a boundary; the remedy is one word
  // (export), and a decline that says only "is not a function" reads as a
  // reason to record boundary: false instead. (No backticks here: this child
  // source is itself a template literal.)
  if (spec.exportName !== "default" && !(spec.exportName in mod)) {
    return {
      stage: "export",
      error:
        spec.exportName +
        " is not exported by " +
        spec.entryPath +
        " — a module-private predicate is still a boundary: export it and re-run",
    };
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
    const extra = Array.isArray(spec.extraArgs) ? spec.extraArgs : [];
    const returned = await fn(spec.input, ...extra);
    // A control "rejects" by throwing, or by answering with a value that means
    // "no". Returning null/undefined/false is the non-throwing rejection shape a
    // validator commonly uses; treating it as acceptance would score a working
    // control as absent. So is a RESULT OBJECT whose own ok is false — the
    // shape report-lint.js#lintReport answers with ({ ok, variant, problems }).
    // Without it every refusal such a validator makes scored accepted and a
    // working validator read absent (task.131). Own property, strictly false,
    // plain non-array object: nothing else changes meaning.
    const refusedByResult =
      typeof returned === "object" &&
      returned !== null &&
      !Array.isArray(returned) &&
      Object.prototype.hasOwnProperty.call(returned, "ok") &&
      returned.ok === false;
    const rejected =
      returned === null ||
      returned === undefined ||
      returned === false ||
      refusedByResult;
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
 * The repository root. In the source tree the engine lives in `shared/resources/`,
 * so two levels up is the repo root. A bundled copy lives in
 * `<skills>/<skill>/references/`, where two levels up is the skills directory —
 * a repo-relative entry then resolved under it, did not exist, and the failed
 * run reached the record (obs #211). There the root is the git checkout the
 * caller runs in, falling back to two levels up when git cannot say.
 * Overridable (`repoRoot`, `--repo-root`) so tests can point the containment
 * check at a fixture tree; an explicit root always wins.
 */
export function defaultRepoRoot() {
  const twoUp = resolve(__dirname, "..", "..");
  if (
    basename(__dirname) === "resources" &&
    basename(dirname(__dirname)) === "shared"
  ) {
    return twoUp;
  }
  const r = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  const top =
    r.status === 0 && typeof r.stdout === "string" ? r.stdout.trim() : "";
  return top !== "" ? top : twoUp;
}

/**
 * The first supplied case the engine cannot score, or `null` (obs #201).
 *
 * Scoring splits cases by `direction`, so a case whose direction is neither
 * `hostile` nor `legitimate` counted toward neither side: the run executed,
 * and the verdict was computed over fewer cases than it was given, with no
 * mention of the value. `sink` is optional on a case (the run's sink applies
 * when it is absent) but, when present, must name a sink — it selects the
 * fixture. Checked: not an object, a `direction` outside `DIRECTIONS`, a
 * present `sink` outside `SINKS`. A `null` sink is absent, as the readers'
 * `c.sink ?? sink` treat it.
 *
 * @returns {null | {id: string, field: string, value: unknown, accepted: string[]}}
 */
export function validateCases(cases) {
  if (!Array.isArray(cases)) {
    return {
      id: "(file)",
      field: "cases",
      value: cases === null ? "null" : typeof cases,
      accepted: ["array"],
    };
  }
  for (const [i, c] of cases.entries()) {
    const isObject = c !== null && typeof c === "object" && !Array.isArray(c);
    const id = isObject && c.id != null ? String(c.id) : `#${i}`;
    if (!isObject) {
      return {
        id,
        field: "case",
        value: c === null ? "null" : Array.isArray(c) ? "array" : typeof c,
        accepted: ["object"],
      };
    }
    if (!DIRECTIONS.includes(c.direction)) {
      return {
        id,
        field: "direction",
        value: c.direction,
        accepted: [...DIRECTIONS],
      };
    }
    if (c.sink != null && !SINKS.includes(c.sink)) {
      return { id, field: "sink", value: c.sink, accepted: [...SINKS] };
    }
  }
  return null;
}

/**
 * The one sentence a `validateCases` finding renders as, for the CLI and the library.
 * It never throws: a library caller's BigInt or circular value is rendered with
 * `String`, so `runProbeSpec` declines `bad-cases` rather than throwing.
 */
export function describeBadCase(bad) {
  let value;
  try {
    value = bad.value === undefined ? "undefined" : JSON.stringify(bad.value);
  } catch {
    value = String(bad.value);
  }
  return `case "${bad.id}" has ${bad.field} ${value}; accepted: ${bad.accepted.join(", ")}`;
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
 * function name, because it is called by name after the source. The
 * `cli:<path>` form (task.144) takes the same containment and returns
 * `kind: "cli"`; its arguments come from `--argv`, never from the entry. The `fence:<doc.md>#<heading>` form
 * (task.180) splits on the FIRST `#` — a heading may contain one, a path may
 * not — requires a `.md` path, takes the same containment, and returns
 * `kind: "fence"` with the heading.
 *
 * @returns {{ok: true, kind: "js", entryPath: string, exportName: string}
 *          |{ok: true, kind: "shell", entryPath: string}
 *          |{ok: true, kind: "shell-fn", entryPath: string, fnName: string}
 *          |{ok: true, kind: "cli", entryPath: string}
 *          |{ok: true, kind: "fence", entryPath: string, heading: string}
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
  // The two prefixes are disjoint (`shell:` vs `shell-fn:` differ at byte 5),
  // so no guard against the other is needed (task.140, PR-review CR-3).
  const isShell = entry.startsWith(SHELL_PREFIX);
  // `shell-argv:` is disjoint from both: it differs from `shell:` at byte 5 and
  // from `shell-fn:` at byte 6, so no check order is load-bearing (task.181).
  const isShellArgv = entry.startsWith(SHELL_ARGV_PREFIX);
  const isCli = entry.startsWith(CLI_PREFIX);
  // Disjoint from the other three: no prefix shares `fence:`'s first byte.
  const isFence = entry.startsWith(FENCE_PREFIX);
  let rawPath;
  let exportName = null;
  let fnName = null;
  let heading = null;
  if (isFence) {
    const body = entry.slice(FENCE_PREFIX.length);
    const hash = body.indexOf("#");
    if (hash <= 0 || body.slice(hash + 1).trim() === "") {
      return {
        ok: false,
        reason: "bad-entry",
        detail: `entry must be "fence:path.md#heading", got "${entry}"`,
      };
    }
    rawPath = body.slice(0, hash);
    heading = body.slice(hash + 1).trim();
    if (!rawPath.endsWith(".md")) {
      return {
        ok: false,
        reason: "bad-entry",
        detail: `fence: names a Markdown file, got "${rawPath}"`,
      };
    }
  } else if (isCli) {
    rawPath = entry.slice(CLI_PREFIX.length);
    if (rawPath.trim() === "" || rawPath.includes("#")) {
      return {
        ok: false,
        reason: "bad-entry",
        detail: `entry must be "cli:path" with no export name — the arguments go in --argv, got "${entry}"`,
      };
    }
  } else if (isShellFn) {
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
  } else if (isShell || isShellArgv) {
    const prefix = isShellArgv ? SHELL_ARGV_PREFIX : SHELL_PREFIX;
    rawPath = entry.slice(prefix.length);
    if (rawPath.trim() === "" || rawPath.includes("#")) {
      return {
        ok: false,
        reason: "bad-entry",
        detail: `entry must be "${prefix}path" with no export name, got "${entry}"`,
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

  // Containment is decided on REAL paths, both sides (task.140 — the lexical
  // check carried as a limit since task.128 gate 1): a symlink inside the root
  // that points outside it is refused here, before anything imports or spawns
  // it, and a root reached through a symlink still contains its own files. A
  // path that does not exist yet cannot be realpath'd and keeps its lexical
  // form; it is then refused by the readable-file check before any spawn.
  const root = realpathSafe(resolve(repoRoot));
  const entryPath = realpathSafe(
    isAbsolute(rawPath) ? resolve(rawPath) : resolve(root, rawPath),
  );

  // The root itself is refused (a directory is not an entry); anything else must
  // lie beneath it. isWithin, not a bare startsWith(".."), so an entry under a
  // `..name` directory is inside, not an escape (task.158; TASK-149 gate 7 CR-2).
  const escapes = entryPath === root || !isWithin(root, entryPath);
  const rel = relative(root, entryPath);
  if (escapes) {
    return {
      ok: false,
      reason: "outside-repo-root",
      detail: `${entryPath} is outside ${root}`,
    };
  }
  if (rel.split(sep).includes("node_modules")) {
    return {
      ok: false,
      reason: "outside-repo-root",
      detail: `${entryPath} is under node_modules`,
    };
  }
  if (isFence) return { ok: true, kind: "fence", entryPath, heading };
  if (isCli) return { ok: true, kind: "cli", entryPath };
  if (isShellArgv) return { ok: true, kind: "shell-argv", entryPath };
  if (isShellFn) return { ok: true, kind: "shell-fn", entryPath, fnName };
  return isShell
    ? { ok: true, kind: "shell", entryPath }
    : { ok: true, kind: "js", entryPath, exportName };
}

/** The entry-spec prefix that selects the shell form. */
export const SHELL_PREFIX = "shell:";
/** The entry-spec prefix that selects the multi-argument shell form (task.181). */
export const SHELL_ARGV_PREFIX = "shell-argv:";
/** The entry-spec prefix that selects the sourced-function form (task.136). */
export const SHELL_FN_PREFIX = "shell-fn:";
/** The entry-spec prefix that selects the Node CLI form (task.144). */
export const CLI_PREFIX = "cli:";
/** The entry-spec prefix that selects the fenced-block form (task.180). */
export const FENCE_PREFIX = "fence:";
/**
 * The slots a `--argv` template may carry. A slot is a WHOLE element: an
 * element that merely contains one (`--env={input}`) is refused, so the case's
 * input is only ever an argv element of its own, never spliced into a string.
 */
export const ARGV_SLOTS = Object.freeze(["{input}", "{fixture}"]);
/** Anything shaped like a slot, known or not — used to refuse unknown and embedded ones. */
const SLOT_SHAPE = /\{[A-Za-z_][A-Za-z0-9_-]*\}/;
/**
 * The interpreter the cli: form runs a script under, by extension. `node` is
 * `process.execPath`; `python3` is the host's, resolved once per process by
 * probePython() (task.215).
 */
const CLI_INTERPRETERS = Object.freeze({
  ".mjs": "node",
  ".js": "node",
  ".py": "python3",
});
const CLI_EXTENSIONS = Object.freeze(Object.keys(CLI_INTERPRETERS));
/**
 * How a `.py` entry is run: `python3 -E -s -B -c PYTHON_BOOTSTRAP <entry>
 * ...argv` (task.215). `-E` ignores every PYTHON* variable (a second line:
 * caseEnv passes none), `-s` drops user site-packages, and `-B` writes no
 * bytecode — without it a script that imports a sibling writes __pycache__/
 * into its own directory, which watchedSpawn reports as an escape on every
 * case. Never `-I`: it drops the script's directory from sys.path, so a
 * sibling import fails to start.
 */
const PYTHON_FLAGS = Object.freeze(["-E", "-s", "-B"]);

/**
 * The fd a Python child reports how it ended on: the first after stdin,
 * stdout and stderr. runCliCase gives a Python child a pipe there; nothing
 * else writes it.
 */
const PYTHON_RECORD_FD = 3;

/**
 * The two records PYTHON_BOOTSTRAP writes on PYTHON_RECORD_FD, each followed
 * by the case's nonce: `answer <nonce>` when the body returned or raised
 * SystemExit, `crash <nonce>` when it raised anything else.
 */
const PYTHON_ANSWER = "answer";
const PYTHON_CRASH = "crash";

/**
 * The status CPython exits with when flushing sys.stdout or sys.stderr fails
 * at interpreter shutdown — after the body returned and `answer` was written.
 * A refusal never needs it, and read as one it scored a crash `rejected`
 * (QA cycle 6, TASK-215-QA6-1). A script that calls sys.exit(120) itself is
 * `errored` too: the safe direction.
 */
const PYTHON_FINALIZE_STATUS = 120;

/**
 * Runs the entry as `python3 <entry>` would — sys.argv[0] is the entry,
 * sys.path[0] its directory, the body executed in a fresh `__main__` module
 * that stays `sys.modules["__main__"]` after the body returns (atexit handlers
 * and threads see the script's module, as under `python3 <entry>`; QA cycle 3,
 * TASK-215-QA3-4) — and reports how the body ended on PYTHON_RECORD_FD.
 *
 * THE CHANNEL IS POSITIVE (QA cycle 4, TASK-215-QA4-1). Every exit the
 * bootstrap controls writes a record: `answer <nonce>` when the body returns
 * or raises SystemExit (the script's answer, which propagates untouched), and
 * `crash <nonce>` when it raises anything else — caught BEFORE any excepthook
 * runs, so a replaced sys.excepthook (rich, Typer), sys.stderr redirected or
 * None, or sys.tracebacklimit = 0 cannot hide it (QA cycle 2). The crash
 * record is a constant written before the exception is touched; its
 * `Class: message` follows on the next line, best-effort, as the detail only
 * (QA cycle 3). Then the script's own excepthook prints the crash as it would
 * have (traceback trimmed to the entry's frames) and the child exits 1.
 *
 * A child with NO record is `errored`: whatever lost the write — a script
 * that closed or reopened fd 3, os._exit, an exec, an interpreter that never
 * reached the bootstrap (TASK-215-QA4-2) — fails safe. Cycles 2–4 wrote a
 * record only on a crash and read its absence as an answer, so every way to
 * lose the write was a false `rejected`. A record is written only while fd 3
 * is still the pipe the bootstrap started with (same st_dev and st_ino), so a
 * script that closed it and opened a file of its own there never has a record
 * written into that file. The nonce is the engine's, per case, and comes off
 * argv before the body runs: nothing else on the fd reads as a record.
 *
 * The record speaks for the body's frame only. An exception Python prints and
 * swallows elsewhere — a joined worker thread, an atexit handler, a finaliser
 * — leaves `python3 <entry>` exiting 0 after `answer` was written, and the
 * case is scored by that exit status: a hostile case reads accepted, a false
 * alarm, never a pass. The one such failure that changes the status, a
 * failed flush at shutdown (exit 120), is errored (PYTHON_FINALIZE_STATUS,
 * QA cycle 6). A stated limit in probe-boundary-rule.md (QA cycle 5,
 * TASK-215-QA5-1).
 *
 * Only the process that started the bootstrap writes, and a forked child
 * closes the fd (QA cycle 3, TASK-215-QA3-2/QA3-3): a child would otherwise
 * report for the parent, and a daemon holding the pipe kept every case
 * waiting for the timeout. The fd is also not inherited across exec, so no
 * process the script starts can hold the pipe open past its exit.
 */
const PYTHON_BOOTSTRAP = [
  "import os, sys",
  "boot_pid = os.getpid()",
  "try:",
  `    boot_st = os.fstat(${PYTHON_RECORD_FD})`,
  "    boot_id = (boot_st.st_dev, boot_st.st_ino)",
  `    os.set_inheritable(${PYTHON_RECORD_FD}, False)`,
  "except OSError:",
  "    boot_id = None",
  "def close_record_fd():",
  "    try:",
  `        os.close(${PYTHON_RECORD_FD})`,
  "    except OSError:",
  "        pass",
  "os.register_at_fork(after_in_child=close_record_fd)",
  "def record(data):",
  "    if boot_id is None or os.getpid() != boot_pid:",
  "        return",
  "    try:",
  `        st = os.fstat(${PYTHON_RECORD_FD})`,
  "        if (st.st_dev, st.st_ino) == boot_id:",
  `            os.write(${PYTHON_RECORD_FD}, data)`,
  "    except BaseException:",
  "        pass",
  "nonce = sys.argv[1].encode()",
  "entry = sys.argv[2]",
  "sys.argv = sys.argv[2:]",
  "sys.path[0] = os.path.dirname(os.path.abspath(entry))",
  "boot_main = sys.modules['__main__']",
  "main = type(sys)('__main__')",
  "main.__file__ = entry",
  "main.__cached__ = None",
  "sys.modules['__main__'] = main",
  "try:",
  "    with open(entry, 'rb') as f:",
  "        source = f.read()",
  "    exec(compile(source, entry, 'exec'), main.__dict__)",
  "except SystemExit:",
  `    record(b'${PYTHON_ANSWER} ' + nonce + b'\\n')`,
  "    raise",
  "except BaseException as e:",
  `    record(b'${PYTHON_CRASH} ' + nonce + b'\\n')`,
  "    try:",
  "        line = type(e).__name__",
  "        try:",
  "            text = (str(e).splitlines() or [''])[0]",
  "            if text:",
  "                line = line + ': ' + text",
  "        except BaseException:",
  "            pass",
  "        record(line.encode('utf-8', 'replace')[:400] + b'\\n')",
  "    except BaseException:",
  "        pass",
  "    tb = e.__traceback__",
  "    while tb is not None and tb.tb_frame.f_code.co_filename != entry:",
  "        tb = tb.tb_next",
  "    try:",
  "        sys.excepthook(type(e), e.with_traceback(tb), tb)",
  "    except BaseException:",
  "        pass",
  "    sys.exit(1)",
  "else:",
  `    record(b'${PYTHON_ANSWER} ' + nonce + b'\\n')`,
].join("\n");

/**
 * Validate a `--argv` template (task.144). Accepts the CLI's JSON text or an
 * already-parsed array (the `runProbeSpec` boundary). One validator for both
 * callers, so the CLI's exit 2 and the library's `bad-argv` decline cannot
 * disagree about what a well-formed template is.
 *
 * @returns {{ok: true, template: string[]} | {ok: false, detail: string}}
 */
export function parseArgvTemplate(raw) {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch (e) {
      return { ok: false, detail: `--argv is not JSON: ${e.message}` };
    }
  }
  if (!Array.isArray(value)) {
    return { ok: false, detail: "--argv must be a JSON array of strings" };
  }
  const bad = value.findIndex((a) => typeof a !== "string");
  if (bad !== -1) {
    return {
      ok: false,
      detail: `--argv element ${bad} is ${describeType(value[bad])}, not a string`,
    };
  }
  // A NUL cannot be an argv element — spawnSync throws on one, out of a
  // function whose contract is to return a verdict (the BUG-3 shape).
  if (value.some((a) => a.includes("\0"))) {
    return { ok: false, detail: "--argv element contains a NUL byte" };
  }
  for (const a of value) {
    if (ARGV_SLOTS.includes(a)) continue;
    const m = a.match(SLOT_SHAPE);
    if (m) {
      return {
        ok: false,
        detail: ARGV_SLOTS.includes(m[0])
          ? `--argv element "${a}" embeds ${m[0]} — a slot must be a whole element, never part of one`
          : `--argv element "${a}" names unknown slot ${m[0]} — known: ${ARGV_SLOTS.join(", ")}`,
      };
    }
  }
  const inputs = value.filter((a) => a === "{input}").length;
  if (inputs !== 1) {
    return {
      ok: false,
      detail: `--argv must carry exactly one "{input}" element, got ${inputs}`,
    };
  }
  return { ok: true, template: [...value] };
}
/**
 * `gh` as a command word somewhere in a library's text — the signal that a
 * shell-fn run needs `--fake-gh` (QA cycle 2, CR-2). A mention in a comment
 * matches too; that is a named decline the caller answers by passing the
 * fixture, not a wrong verdict.
 */
const GH_COMMAND_WORD = /(^|[\s;|&(`$"'\\])gh([\s;|&)>"']|$)/m;
/**
 * `gh` reached through a variable named `GH` (`"$GH" api …`, `${GH}`) — the one
 * indirection a literal-word match cannot see (task.140, c3-CR-3). `$GH_TOKEN`
 * and the like are other variables, not this one.
 */
const GH_VARIABLE = /\$\{?GH(?![A-Za-z0-9_])/;
/**
 * A top-level `source <p>` / `. <p>` — at the start of a line, or after `;`,
 * `&&`, `||`, `|`, `then` or `do` (`[ -f x ] && source x`, `set -e; . x`:
 * task.140 QA cycle 1, CR-3). Group 1 is the path as written.
 */
const SOURCE_LINE =
  /(?:^|[;&|]|\b(?:then|do)\b)[ \t]*(?:source|\.)[ \t]+["']?([^"'\s;|&)]+)["']?/gm;
/**
 * Remove a probe sandbox, including one a case left unreadable. A case
 * controls its directory, so it can leave a mode-000 directory that `rmSync`
 * cannot list (task.232 QA2-1), or nest it past PATH_MAX, which Node 22's
 * `rmSync` (an absolute-path walk) fails with ENAMETOOLONG. On EACCES, EPERM
 * or ENAMETOOLONG every directory gets owner rwx back and the tree is removed
 * by `chmod -R` and `rm -rf`, not by a walk in this process: both descend by
 * relative path, so depth does not stop them, and neither follows a symlink,
 * so nothing outside the sandbox changes mode or is removed (task.234).
 */
function removeSandbox(root) {
  try {
    rmSync(root, { recursive: true, force: true });
    return;
  } catch (e) {
    if (!["EACCES", "EPERM", "ENAMETOOLONG"].includes(e.code)) throw e;
  }
  const run = (cmd, argv) => {
    const r = spawnSync(cmd, argv, {
      encoding: "utf8",
      stdio: ["ignore", "ignore", "pipe"],
    });
    const why = r.error?.code ?? `exit ${r.status}`;
    return `${cmd} ${why}${r.stderr ? `: ${r.stderr.trim()}` : ""}`;
  };
  const chmod = run("chmod", ["-R", "u+rwx", "--", root]);
  const rm = run("rm", ["-rf", "--", root]);
  if (existsSync(root)) {
    throw new Error(`removeSandbox: ${root} is still there (${chmod}; ${rm})`);
  }
}

/**
 * Kill whatever is left of a case's process group — a background grandchild
 * that released the case's stdio outlives `spawnSync` and could write after
 * the case's side effects are read. The case was spawned `detached`, so its
 * pid is its group id. ESRCH means the group is already gone. A grandchild
 * that calls `setsid` leaves the group and is not reached (task.234).
 */
function reapGroup(pid) {
  if (!pid) return;
  try {
    process.kill(-pid, "SIGKILL");
  } catch (e) {
    if (e.code !== "ESRCH") throw e;
  }
}

/**
 * The real path of `p`, or — when `p` does not exist — the real path of its
 * deepest existing ancestor with the missing segments re-joined. So a missing
 * leaf under a symlinked intermediate is contained by where the link really
 * points, and a missing file under a symlinked root is still inside it
 * (task.140 QA cycle 2, CR-5).
 */
function realpathSafe(p) {
  const missing = [];
  let cur = p;
  for (;;) {
    try {
      return join(realpathSync(cur), ...missing);
    } catch {
      const parent = dirname(cur);
      if (parent === cur) return p;
      missing.unshift(basename(cur));
      cur = parent;
    }
  }
}
/** The trip-wire's marker file, under the harness dir. */
const GH_TRIPPED = "gh-tripped";
/**
 * The trip-wire gh: first on PATH when a shell-form run has no --fake-gh. It
 * never answers — it records the call and exits 127 ("command not found").
 * The marker path is written INTO the stub, not passed in the environment: a
 * call under `env -i PATH="$PATH" gh` still reaches the stub, and an
 * environment variable would be gone by then (task.140 QA cycle 3, BUG-6).
 */
function tripwireGh(markerPath) {
  const quoted = `'${markerPath.replace(/'/g, `'\\''`)}'`;
  return `#!/bin/sh\n: > ${quoted} 2>/dev/null\necho "security-probe: gh invoked without --fake-gh (trip-wire)" >&2\nexit 127\n`;
}
/** Per-process counter naming each spawn's source-completed marker. */
let harnessSeq = 0;
/**
 * Does this library or script — or a file it sources at top level — name `gh`?
 * ONE level, deliberately: the indirection this repository uses is a library
 * that sources `gh-labels.sh`, never a chain. A sourced path is tried against
 * the library's own directory, then the root (the repository's idiom,
 * `source references/gh-labels.sh`, is cwd-relative); a path holding a `$` is
 * not followable, and one outside the root is not ours to read. `text`, when
 * given, is read in place of the file — the fence: form passes its extracted
 * block, whose sourced paths still resolve from the doc's directory.
 */
export function namesGh(entryPath, root, text = null) {
  const read = (p) => {
    try {
      return readFileSync(p, "utf8");
    } catch {
      return null;
    }
  };
  // The root is realpath'd HERE, not only by the caller: every candidate below is
  // realpath'd, so a lexical root reached through a symlink would put every one
  // of them "outside" and read as "names no gh" (task.140 QA cycle 1, CR-6).
  root = realpathSafe(root);
  const first = text ?? read(entryPath);
  if (first === null) return false;
  const texts = [first];
  const seen = new Set([entryPath]);
  for (const m of first.matchAll(SOURCE_LINE)) {
    const raw = m[1];
    if (raw.includes("$")) continue;
    const candidates = isAbsolute(raw)
      ? [raw]
      : [resolve(dirname(entryPath), raw), resolve(root, raw)];
    for (const c of candidates) {
      const p = realpathSafe(c);
      // isWithin, never a bare startsWith("..") — an in-tree `..name`
      // directory is inside (task.158).
      if (seen.has(p) || !isWithin(root, p)) continue;
      const t = read(p);
      if (t === null) continue;
      seen.add(p);
      texts.push(t);
      break;
    }
  }
  return texts.some((t) => GH_COMMAND_WORD.test(t) || GH_VARIABLE.test(t));
}
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
  // An EXIT trap around the source: `source` runs the library in THIS shell,
  // so a top-level `exit N` inside it ends the harness with N — every case
  // then mismatches and the verdict is a SCORED `absent` with a full count,
  // the task.125 shape (task.136 QA cycle 2, BUG-2). The trap re-maps that exit
  // to the source-failed sentinel and is disarmed once the source returns.
  //
  // `exit` is also SHADOWED for the duration of the source: a library that
  // installs its own `trap … EXIT` replaces ours, so a later `|| exit 1` guard
  // ended the harness with 1. A function named `exit` intercepts the CALL,
  // before any trap, and `builtin exit 97` is the sentinel; `unset -f exit`
  // restores the builtin before the function runs (task.140, c3-CR-1). A
  // library that defines its own `exit` function loses it — none here does.
  //
  // The source's status is taken as a SIMPLE COMMAND, not on the left of `||`:
  // there both shells suspend errexit for everything the library runs at top
  // level, so `set -e; false` was sourced to completion and scored where a
  // consumer's own `source` would have aborted (task.140, PR-review CR-1). Now
  // errexit ends the source, the trap maps it to 97, and the explicit test
  // keeps the non-zero-last-command case. Verified bash 5.3 / 3.2, zsh 5.9.
  //
  // The DECISION, though, is a positive marker, not an exit code: once the
  // source has returned 0 the body writes `$PROBE_SOURCED` (a file under the
  // work dir, named per spawn by runShellCase), and the runner declines
  // whenever it is absent. Every way the shell can die during the source then
  // reads the same — an explicit exit, errexit, a replaced EXIT trap however it
  // was installed (`trap … exit`, `builtin trap`, `command trap`, zsh's
  // TRAPEXIT), `exec`. Filtering trap installations was an enumeration over
  // shell syntax with no last entry (task.140 QA cycle 2, CR-1 / BUG-3); the
  // shadowed `exit` and the EXIT trap stay only so the common case still names
  // exit 97. A TRAPEXIT the library defined is unset so it cannot run at the
  // harness's own exit — `|| :`, because zsh's `unset -f` of an undefined
  // function returns 1, and under a library's `set -e` that ended the harness.
  `exit() { builtin exit ${SHELL_FN_SOURCE_FAILED}; }; trap 'exit ${SHELL_FN_SOURCE_FAILED}' EXIT; ` +
  `source "$1"; src=$?; trap - EXIT; unset -f exit; unset -f TRAPEXIT 2>/dev/null || :; ` +
  `[ "$src" -eq 0 ] || exit ${SHELL_FN_SOURCE_FAILED}; : > "$PROBE_SOURCED" || exit ${SHELL_FN_SOURCE_FAILED}; ` +
  `shift; fn="$1"; shift; ` +
  `typeset -f "$fn" >/dev/null 2>&1 || exit ${SHELL_FN_NOT_DEFINED}; ` +
  // The function runs in a SUBSHELL: a function that calls `exit` would
  // otherwise end the harness shell with that code before the remap below
  // ever ran, and `exit 97` inside the function would read as "the source
  // failed" (task.136 QA cycle 1, CR-2 — found by its own row). errexit is
  // snapshotted from `$-`, switched OFF in the harness so `rc=$?` and the
  // remap always run, and switched back ON inside the subshell so the
  // function keeps the semantics its library set (QA cycle 2, CR-3: under
  // `set -e` errexit fired on the non-zero subshell before the remap).
  `ee=; case $- in *e*) ee=1;; esac; set +e; ` +
  `( [ -n "$ee" ] && set -e; "$fn" "$@" ); rc=$?; ` +
  `case $rc in ${SHELL_FN_SOURCE_FAILED}|${SHELL_FN_NOT_DEFINED}) exit ${SHELL_FN_RESERVED_COLLISION};; esac; exit $rc`;

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
let _python;
/**
 * The host's `python3`, as `{ name, version }`, or null when `python3 --version`
 * does not run on the engine's PATH — the PATH caseEnv hands the child, so the
 * resolution and the spawn agree. Memoised like probeShells(): once per process,
 * never once per case (task.215). It runs under the engine's environment, not
 * caseEnv, so it can pass for an interpreter that then cannot start inside the
 * sandbox (a real-HOME dependency); such a child writes no exit record and
 * every case is `errored`, never scored (QA cycle 4, TASK-215-QA4-2).
 */
export function probePython() {
  if (_python !== undefined) return _python;
  const r = spawnSync("python3", ["--version"], {
    encoding: "utf8",
    timeout: 10_000,
  });
  // Python 3.4+ prints the version on stdout; older ones on stderr.
  const version = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim().split("\n")[0];
  _python =
    r.status === 0 && /^Python \d/.test(version)
      ? Object.freeze({ name: "python3", version })
      : null;
  return _python;
}

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
 * caught it. `absent` and `removed` paths are checked against the fixture
 * directory, through casePathState, which never reads past it (task.232).
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
  for (const [k, present] of [
    ["absent", "was created"],
    ["removed", "was not removed"],
  ]) {
    for (const rel of expected[k] ?? []) {
      const where = casePathState(fixtureDir, rel);
      if (where.state === "outside") {
        mismatches.push(
          `${rel}: an ancestor resolves outside the case directory`,
        );
      } else if (where.state === "unreadable") {
        mismatches.push(`${rel} could not be read (${where.code})`);
      } else if (where.state === "present") {
        mismatches.push(`${rel} ${present}`);
      }
    }
  }
  return mismatches;
}

/**
 * Where one `absent` / `removed` path stands after the run, as `{ state }`:
 * "outside" when an ancestor resolves out of the case directory (the run
 * planted a symlink), else "present" or "missing". The ancestors are resolved
 * and the leaf is not: `lstatSync` counts a symlink at the leaf as present
 * without following it, so nothing outside the directory is ever read
 * (task.232). Any other lstat failure — a loop, an unreadable ancestor, both
 * left by the run — is "unreadable" with its `code`, never a throw: the run
 * controls the directory, and one case's path must not end the probe (QA1-4).
 */
function casePathState(dir, rel) {
  const root = realpathSafe(dir);
  const target = resolve(dir, rel);
  const real = join(realpathSafe(dirname(target)), basename(target));
  if (real !== root && !isWithin(root, real)) return { state: "outside" };
  try {
    lstatSync(target);
    return { state: "present" };
  } catch (e) {
    if (e.code === "ENOENT" || e.code === "ENOTDIR")
      return { state: "missing" };
    return { state: "unreadable", code: e.code ?? String(e) };
  }
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
 * @param {string[]|string} [spec.argv] the cli: form's argv template (task.144) —
 *                                 required with cli:, a `bad-argv` decline with any other form
 * @param {Array} [spec.args]      fixed extra arguments appended after each case's input
 *                                 (task.131) — the JS form only, a `bad-args` decline otherwise
 * @param {string} [spec.slot]     the fence: form's placeholder token (task.180) — required
 *                                 with fence:, a `bad-slot` decline with any other form
 * @param {number} [spec.timeoutMs] per-case timeout; defaults to the shared spawn budget
 * @param {string} [spec.repoRoot] containment root; defaults to the repository root
 * @returns {{sink, entry, verdict, reason, executed, passed, reproduced, overblocked, declined, cases}}
 */
export function runProbeSpec({
  sink,
  entry,
  cases,
  fakeGh,
  argv,
  args,
  slot,
  fixtureSetup,
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
    // The interpreter a cli: `.py` entry ran under (task.215), or null for
    // every other form and for anything declined before a case ran.
    interpreter: null,
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
    // The cli: form's argv TEMPLATE, or null (task.144). The template, never a
    // substituted input: the record says how the CLI was called, not with what.
    argv: null,
    // The fixed extra arguments every JS call received after its input, or null
    // (task.131). Stated so the record says how the export was called.
    args: null,
    // The fence: form's placeholder token, or null (task.180).
    slot: null,
    // The shell-argv: form's per-run setup script (its real path), or null
    // (task.181). Stated so the record says what built each case directory.
    fixtureSetup: null,
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
  if (!resolved.ok) {
    // A cli: probe declined HERE (a wrong --repo-root) still carries the
    // template it was given: the template is part of an unnamed control's key,
    // and without it the corrected re-run keyed differently and left this
    // `unverifiable` entry beside the real verdict (task.144 5c CR-1).
    // Likewise shell-argv:, which keys the same way (task.181).
    if (
      typeof entry === "string" &&
      (entry.startsWith(CLI_PREFIX) || entry.startsWith(SHELL_ARGV_PREFIX))
    ) {
      const parsed = parseArgvTemplate(argv);
      if (parsed.ok) base.argv = parsed.template;
    }
    // Likewise a fence: probe carries its slot, which keys an unnamed fence:
    // control (task.180 QA cycle 2, TASK-180-007).
    if (
      typeof entry === "string" &&
      entry.startsWith(FENCE_PREFIX) &&
      typeof slot === "string" &&
      slot !== ""
    ) {
      base.slot = slot;
    }
    return decline(resolved.reason, resolved.detail);
  }
  const isShellForm = resolved.kind === "shell" || resolved.kind === "shell-fn";
  const isCliForm = resolved.kind === "cli";
  const isFenceForm = resolved.kind === "fence";
  // `shell-argv:` (task.181): a bash script called with the --argv template. It
  // takes cli:'s argv contract and the shell forms' PATH handling (`gh`).
  const isShellArgvForm = resolved.kind === "shell-argv";
  const takesArgv = isCliForm || isShellArgvForm;
  // `slot` — validated here, the boundary a library caller crosses, exactly as
  // `argv` is for cli: (task.180).
  const slotGiven = slot !== undefined && slot !== null;
  if (isFenceForm) {
    if (typeof slot !== "string" || slot === "") {
      return decline(
        "bad-slot",
        "the fence: entry form needs --slot — the placeholder text in the block that each case's input replaces",
      );
    }
    base.slot = slot;
  } else if (slotGiven) {
    return decline(
      "bad-slot",
      "--slot applies to the fence: entry form only — the other forms take their input from the case",
    );
  }
  // `argv` is validated HERE as well as in `main()`: this is the boundary a
  // library caller crosses, and the CLI's exit 2 would otherwise be the only
  // guard. The same validator, so the two cannot disagree (task.144).
  let template = null;
  const argvGiven = argv !== undefined && argv !== null;
  if (takesArgv) {
    if (!argvGiven) {
      return decline(
        "bad-argv",
        `the ${isCliForm ? "cli:" : "shell-argv:"} entry form needs --argv — a JSON array with one "{input}" element`,
      );
    }
    const parsed = parseArgvTemplate(argv);
    if (!parsed.ok) return decline("bad-argv", parsed.detail);
    template = parsed.template;
  } else if (argvGiven) {
    return decline(
      "bad-argv",
      "--argv applies to the cli: and shell-argv: entry forms only — the other forms take their input from the case",
    );
  }
  base.argv = template;
  // `args` — validated here for the same reason `argv` is: a library caller
  // crosses this boundary, not main(). Only the JS runner can append an
  // argument to a call; the shell and cli: forms take their input as a file or
  // an argv element, so args there would be recorded without being used —
  // declined, not ignored, like --fake-gh on the JS form.
  if (args !== undefined && args !== null) {
    if (isShellForm || isCliForm || isFenceForm || isShellArgvForm) {
      return decline(
        "bad-args",
        "--args-json applies to the JS entry form (path#export) only — the shell, cli:, shell-argv: and fence: forms take their input from the case",
      );
    }
    if (!Array.isArray(args)) {
      return decline("bad-args", "--args-json must be a JSON array");
    }
    base.args = args;
  }
  if (
    isCliForm &&
    !CLI_EXTENSIONS.some((x) => resolved.entryPath.endsWith(x))
  ) {
    // The interpreter is chosen by extension, so a .sh or extensionless file
    // has none — declined here, once, by name, rather than handed to node and
    // surfacing as N identical crashes.
    return decline(
      "entry-not-probeable",
      `${resolved.entryPath} is not a ${CLI_EXTENSIONS.join(" / ")} script — the cli: form runs .mjs / .js with node and .py with python3`,
    );
  }
  if (isShellForm || isCliForm || isFenceForm || isShellArgvForm) {
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
  // The cli: child's interpreter (task.215). A `.py` entry needs the host's
  // python3; without one it is declined once, by name — every case would
  // otherwise fail to spawn and read as N identical errors.
  const cliRuntime = isCliForm
    ? CLI_INTERPRETERS[
        CLI_EXTENSIONS.find((x) => resolved.entryPath.endsWith(x))
      ]
    : null;
  let interpreter = null;
  if (cliRuntime === "python3") {
    interpreter = probePython();
    if (interpreter === null) {
      return decline(
        "entry-not-probeable",
        `${resolved.entryPath} is a .py script and \`python3 --version\` does not run on this PATH — the cli: form runs .py with python3`,
      );
    }
  }
  // `fixtureSetup` (task.181) — the shell-argv: form's per-run setup script.
  // Validated HERE, the boundary a library caller crosses, as `slot` and `argv`
  // are; with the entry's own containment, because it is code the engine runs.
  // Declined, not ignored, on any other form: a caller who passed it meant it.
  let setupPath = null;
  if (fixtureSetup !== undefined && fixtureSetup !== null) {
    if (!isShellArgvForm) {
      return decline(
        "bad-fixture-setup",
        "--fixture-setup applies to the shell-argv: entry form only",
      );
    }
    if (typeof fixtureSetup !== "string" || fixtureSetup.trim() === "") {
      return decline("bad-fixture-setup", "--fixture-setup must name a script");
    }
    const root = realpathSafe(resolve(repoRoot));
    setupPath = realpathSafe(
      isAbsolute(fixtureSetup)
        ? resolve(fixtureSetup)
        : resolve(root, fixtureSetup),
    );
    if (setupPath === root || !isWithin(root, setupPath)) {
      return decline("bad-fixture-setup", `${setupPath} is outside ${root}`);
    }
    if (relative(root, setupPath).split(sep).includes("node_modules")) {
      return decline("bad-fixture-setup", `${setupPath} is under node_modules`);
    }
    try {
      if (!statSync(setupPath).isFile()) throw new Error("not a regular file");
      accessSync(setupPath, fsConstants.R_OK);
    } catch (e) {
      return decline(
        "bad-fixture-setup",
        `setup script is not a readable regular file: ${e.message}`,
      );
    }
  }
  base.fixtureSetup = setupPath;
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
    if (!isShellForm && !isFenceForm && !isShellArgvForm) {
      return decline(
        "bad-fake-gh",
        isCliForm
          ? "--fake-gh applies to the shell entry forms only (shell:, shell-fn:, shell-argv:, fence:) — a CLI that consults gh is a networked CLI, which the cli: form does not probe"
          : "--fake-gh applies to the shell entry forms only (shell:, shell-fn:, shell-argv:, fence:) — a JS export never consults PATH",
      );
    }
    if (typeof fakeGh !== "string" || fakeGh.trim() === "") {
      return decline("bad-fake-gh", "--fake-gh must name a directory");
    }
    // Real paths, both sides — the same containment resolveEntry applies, so a
    // symlink inside the root that points out of it is not a fixture this
    // repository owns (task.140 QA cycle 1, CR-2).
    const root = realpathSafe(resolve(repoRoot));
    fakeGhDir = realpathSafe(
      isAbsolute(fakeGh) ? resolve(fakeGh) : resolve(root, fakeGh),
    );
    if (fakeGhDir === root || !isWithin(root, fakeGhDir)) {
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
  // A shell-fn library whose body names `gh` and was given no `--fake-gh` is
  // DECLINED, not scored: run bare, `gh` fails from the sandbox cwd, the
  // function takes its read-failed passthrough, and the verdict lands on
  // `absent` / `present-but-inert` — the same values a missing control
  // produces — with only `fake_gh: null` deep in the record to say "could not
  // look" rather than "nothing filters" (task.136 QA cycle 2, CR-2). Two
  // states, one value is the defect class this engine exists to remove.
  //
  // EVERY shell form, not only shell-fn: a `shell:` script that names `gh` ran
  // the host `gh` — host PATH, host keychain — and was scored (task.140,
  // c3-CR-2). The detector reads the entry and one level of what it sources.
  // `shell-argv:` is a shell form here too, and its setup script is code the
  // run executes on the same PATH, so it is read as well (task.181).
  if ((isShellForm || isShellArgvForm) && fakeGhDir === null) {
    const root = realpathSafe(resolve(repoRoot));
    for (const path of [resolved.entryPath, setupPath]) {
      if (path !== null && namesGh(path, root)) {
        return decline(
          "needs-fake-gh",
          `${path} names \`gh\` — pass --fake-gh <dir> so the fixture answers instead of the real binary`,
        );
      }
    }
  }

  // The fence: block is extracted HERE, on every run — never cached — and a doc
  // the engine cannot read a block from is a named decline, never a verdict.
  // The pre-spawn `gh` text check runs below, over the extracted block and the
  // case inputs (never the whole document), once the cases are known.
  let fenceBlock = null;
  if (isFenceForm) {
    let docText;
    try {
      docText = readFileSync(resolved.entryPath, "utf8");
    } catch (e) {
      return decline(
        "entry-not-probeable",
        `cannot read ${resolved.entryPath}: ${e.message}`,
      );
    }
    const extracted = extractFencedBlock(docText, resolved.heading);
    if (!extracted.ok) return decline("entry-not-probeable", extracted.detail);
    if (!extracted.code.includes(slot)) {
      return decline(
        "bad-slot",
        `slot "${slot}" does not appear in the block under "${resolved.heading}" (line ${extracted.line}) — a slot that substitutes nothing tests nothing`,
      );
    }
    fenceBlock = extracted.code;
  }

  let probeCases;
  if (cases !== undefined && cases !== null) {
    // Refused before any case runs: a case the scorer cannot place would
    // otherwise execute and count toward neither side (obs #201).
    const bad = validateCases(cases);
    if (bad) return decline("bad-cases", describeBadCase(bad));
    probeCases = cases;
  } else {
    try {
      probeCases = corpusFor(sink);
    } catch (e) {
      return decline("unknown-sink", String(e && e.message));
    }
  }

  // The trip-wire answers only a PATH-resolved `gh`: a block (or an input —
  // the slot is source) that resolves it to a path (`type -ap gh`) ran the host
  // binary and was scored. This check catches a lookup spelled out in the text;
  // an absolute path to `gh` it does not match, and that stays a stated limit. So fence: gets the text check the
  // shell forms get, over what will actually run (TASK-180-015).
  if (isFenceForm && fakeGhDir === null) {
    // Every string a case carries can run: its input (the slot is source), its
    // fixture's env values and its fixture's files (BASH_ENV, a sourced
    // fixture script). Spellings that skip PATH — `command -p gh`, `env -u
    // PATH gh` — are caught here or not at all (TASK-180-019).
    const strings = (o) =>
      o && typeof o === "object" && !Array.isArray(o)
        ? Object.values(o).filter((v) => typeof v === "string")
        : [];
    const inputs = probeCases
      .flatMap((c) => [
        ...(typeof c?.input === "string" ? [c.input] : []),
        ...strings(c?.fixture?.env),
        ...strings(c?.fixture?.files),
      ])
      .join("\n");
    if (
      namesGh(
        resolved.entryPath,
        realpathSafe(resolve(repoRoot)),
        `${fenceBlock}\n${inputs}`,
      )
    ) {
      return decline(
        "needs-fake-gh",
        `the block under "${resolved.heading}" in ${resolved.entryPath}, or a case's input or fixture, names \`gh\` — pass --fake-gh <dir> so the fixture answers instead of the real binary`,
      );
    }
  }

  // shell-argv: honours a case's fixture as fence: does, so the fixture strings
  // get the same text check (TASK-181-001): `env` values and `files` contents can
  // run (BASH_ENV, a sourced fixture script). The case's INPUT is not checked —
  // it crosses as one argv element, data, never source. runShellArgvCase also
  // shadows every PATH directory holding a gh (ghFreePath), which catches a
  // lookup this text check cannot spell.
  if (isShellArgvForm && fakeGhDir === null) {
    const strings = (o) =>
      o && typeof o === "object" && !Array.isArray(o)
        ? Object.values(o).filter((v) => typeof v === "string")
        : [];
    const fixtureText = probeCases
      .flatMap((c) => [
        ...strings(c?.fixture?.env),
        ...strings(c?.fixture?.files),
      ])
      .join("\n");
    if (
      fixtureText !== "" &&
      namesGh(resolved.entryPath, realpathSafe(resolve(repoRoot)), fixtureText)
    ) {
      return decline(
        "needs-fake-gh",
        `a case's fixture (env or files) for ${resolved.entryPath} names \`gh\` — pass --fake-gh <dir> so the fixture answers instead of the real binary`,
      );
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
  // BUG-12). The cli: child gets the same (task.144) — a Node CLI writes to
  // os.homedir() and os.tmpdir() as readily as a script writes to $HOME. The
  // JS runner keeps sandboxEnv()'s values: its child imports one export and
  // never sees a shell.
  const sandboxHome = join(sandboxRoot, "home");
  const sandboxTmp = join(sandboxRoot, "tmp");
  mkdirSync(sandboxHome);
  mkdirSync(sandboxTmp);
  // The harness's own files — source-completed markers and the trip-wire gh —
  // live under the WORK dir, which the escape sentinel deliberately skips.
  const harnessDir = join(workDir, ".probe-harness");
  if (isShellForm || isFenceForm || isShellArgvForm) {
    mkdirSync(join(harnessDir, "bin"), { recursive: true });
    if (fakeGhDir === null) {
      writeFileSync(
        join(harnessDir, "bin", "gh"),
        tripwireGh(join(harnessDir, GH_TRIPPED)),
        { mode: 0o755 },
      );
    }
  }
  let ghTripped = false;

  const caseResults = [];
  const escapes = [];
  const shells =
    isShellForm || isFenceForm || isShellArgvForm ? probeShells() : null;
  try {
    for (const c of probeCases) {
      if (isFenceForm) {
        runFenceCase(c, {
          block: fenceBlock,
          slot,
          docPath: resolved.entryPath,
          fakeGhDir,
          harnessDir,
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
      if (isShellArgvForm) {
        runShellArgvCase(c, {
          sink,
          entryPath: resolved.entryPath,
          template,
          setupPath,
          fakeGhDir,
          harnessDir,
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
      if (isCliForm) {
        runCliCase(c, {
          sink,
          entryPath: resolved.entryPath,
          runtime: cliRuntime,
          template,
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
      if (isShellForm) {
        runShellCase(c, {
          sink,
          entryPath: resolved.entryPath,
          fnName: resolved.fnName ?? null,
          fakeGhDir,
          harnessDir,
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
            // null when --args-json was not given; the runner's own
            // Array.isArray default is the one place the fallback lives.
            extraArgs: base.args,
          }),
          cwd: workDir,
          env: sandboxEnv({ cwd: workDir }),
          encoding: "utf8",
          timeout: perCaseTimeout,
          maxBuffer: 8 * 1024 * 1024,
          detached: true,
        },
      );
      reapGroup(child.pid);

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
    ghTripped =
      (isShellForm || isFenceForm || isShellArgvForm) &&
      existsSync(join(harnessDir, GH_TRIPPED));
  } finally {
    removeSandbox(sandboxRoot);
  }

  // The run reached `gh` with no fixture: the trip-wire answered instead of the
  // host binary, and whatever the cases then did was shaped by a stub, so
  // nothing is scored. This is the GUARANTEE the pre-spawn detector above only
  // approximates — it sees every PATH-resolved spelling (`${GH_BIN:-gh}`, an
  // assign-then-call variable, a wrapper however it sources gh-labels.sh) —
  // while the stub stays first on PATH and the call happens inside the spawn.
  // An absolute path, a library PATH prepend and a call backgrounded past the
  // spawn all reach a real gh unrecorded: stated limits (probe-boundary-rule.md §5).
  //
  // The decline still carries what the runs OBSERVED — escapes, the cases, the
  // shells — as entry-not-probeable does: nothing is scored, but a side effect
  // seen during an unscored run is still a side effect (task.140 QA cycle 3,
  // BUG-5; the rule is task.136 cycle 4, CR-3).
  if (ghTripped) {
    return {
      ...decline(
        "needs-fake-gh",
        `${resolved.entryPath} invoked \`gh\` at run time with no --fake-gh — the trip-wire on PATH answered, so nothing was scored; pass --fake-gh <dir>`,
      ),
      cases: caseResults,
      escapes,
      shells: shells ?? null,
      interpreter,
      fakeGh: fakeGhDir,
      args: base.args,
    };
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
      interpreter,
      fakeGh: fakeGhDir,
      args: base.args,
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
    // The interpreter a cli: `.py` entry ran under (task.215), or null.
    interpreter,
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
    argv: template,
    args: base.args,
    slot: base.slot,
    fixtureSetup: base.fixtureSetup,
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
  for (const k of ["absent", "removed"]) {
    if (expected[k] === undefined) continue;
    if (!Array.isArray(expected[k]) || !expected[k].every(isCasePath)) {
      return `\`expected.${k}\` must be an array of relative paths inside the case directory, other than . and .. — no ".." segment, not absolute, no NUL`;
    }
  }
  return null;
}

/**
 * The grammar of an `absent` or `removed` entry (task.232): a non-empty
 * string with no NUL, not absolute, whose normalised form is not "." and has
 * no ".." segment — a path that stays inside the case directory. "." and ".."
 * ALWAYS exist, so a case naming one would score every run as a side effect
 * and the fixed script as absent with a full count (task.128 QA cycle 4,
 * BUG-13); "a/.." normalises to ".", so it is refused for the same reason.
 * Compared by `caseKey`, so "./" and "a/../" are "." too (QA1-2). Exported so
 * the probe can reach it (`--sink path`, QA1-5).
 */
export function isCasePath(p) {
  if (typeof p !== "string" || p === "" || p.includes("\0") || isAbsolute(p)) {
    return false;
  }
  const n = caseKey(p);
  return n !== "." && !n.split(sep).includes("..");
}

/**
 * The one spelling of a case path every comparison uses: `normalize`, then
 * any trailing separator dropped. `normalize` keeps a trailing separator, and
 * the scorer's `resolve` does not, so "sub/" and "sub" are one directory to
 * the scorer and were two to every comparison — "./" passed the "." test and
 * "sub/" passed the collision rule (task.232 QA1-2, QA1-3).
 */
export function caseKey(p) {
  let n = normalize(p);
  while (n.length > 1 && n.endsWith(sep)) n = n.slice(0, -1);
  return n;
}

/**
 * Whether a case's path assertions can be scored, given the relative paths
 * its own fixture creates (every one a file). Null, or the reason to decline.
 * One definition for every runner (task.232): they differ only in what they
 * pass as `created`.
 *
 * `absent` is compared case-folded — on a case-insensitive filesystem PWNED
 * and pwned are one file (TASK-180-010), and a fold here can only decline
 * more. `removed` is compared exactly: a fold would accept "foo" against a
 * fixture "Foo", and on a case-sensitive filesystem the case would pass with
 * nothing removed (task.232 review 1, C1). A path in both lists needs no rule
 * of its own: created, the first `absent` rule declines it; not created, the
 * `removed` rule does (review 1, I5).
 */
export function pathAssertionProblem(expected, created) {
  const made = created.map((p) => caseKey(p));
  const madeFolded = made.map((p) => p.toLowerCase());
  for (const p of expected?.absent ?? []) {
    const f = caseKey(p).toLowerCase();
    // Exists before the script runs, so it would score every run as a side
    // effect (BUG-13's second shape) — the path itself, or a directory above.
    if (madeFolded.some((m) => m === f || m.startsWith(f + sep))) {
      return `\`expected.absent\` names "${p}", which the fixture itself creates`;
    }
    if (madeFolded.some((m) => f.startsWith(m + sep))) {
      return `\`expected.absent\` names "${p}", beneath a file the fixture creates — it can never exist`;
    }
  }
  for (const p of expected?.removed ?? []) {
    if (!made.includes(caseKey(p))) {
      return `\`expected.removed\` names "${p}", which the fixture does not create — it would pass with nothing removed`;
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
 * Make one case's fixture directory inside `workDir` — the sink's controls,
 * plus (when `writeInput`) a file named by the case's input. Shared by the
 * shell arm and the cli: arm (task.144), so the two cannot drift on how a
 * fixture is built. THROWS on a name the filesystem refuses; the caller turns
 * that into a declined case.
 *
 * The case's own name is appended RAW: `join` normalises "/" and "..", which
 * would turn a traversal name into a write outside the fixture, so any
 * separator in it is a decline, not a normalised path.
 */
function materialiseFixture(workDir, controls, input, { writeInput }) {
  const fixtureDir = mkdtempSync(join(workDir, "fixture-"));
  for (const control of controls) {
    writeFileSync(join(fixtureDir, control), "");
  }
  if (writeInput) {
    if (input.includes("/") || input.includes("\0")) {
      throw new Error("name carries a path separator or NUL");
    }
    writeFileSync(`${fixtureDir}/${input}`, "");
  } else if (input.includes("\0")) {
    throw new Error("input carries a NUL");
  }
  return fixtureDir;
}

/**
 * The env a sandboxed per-case child runs under: `sandboxEnv()` with HOME and
 * TMPDIR moved inside the sandbox root (so a write to either is an escape the
 * sentinel sees — BUG-12) and `LC_ALL=C` (so glob order is byte order). Shared
 * by the shell and cli: arms (task.144).
 */
function caseEnv({ fixtureDir, sandboxHome, sandboxTmp }) {
  return {
    ...sandboxEnv({ cwd: fixtureDir }),
    HOME: sandboxHome,
    TMPDIR: sandboxTmp,
    LC_ALL: "C",
  };
}

/**
 * Spawn one per-case child with its escape sentinels around it: the sandbox
 * root (minus the work dir) and, non-recursively, the target's OWN directory —
 * a `cd "$(dirname "$0")"` idiom, or a Node CLI resolving paths from
 * `import.meta.url`, writes its side effect there, in the real tree, where
 * neither the fixture check nor the sandbox sentinel looks (BUG-12). ARGV, never
 * a string; stdin empty. Shared by the shell and cli: arms (task.144).
 */
function watchedSpawn(
  command,
  argv,
  { cwd, env, timeoutMs, extraFds = 0 },
  { sandboxRoot, workDirName, scriptDir, escapes, escapeId, shell = null },
) {
  const before = snapshotTree(sandboxRoot, workDirName);
  const scriptDirBefore = listDirStamps(scriptDir);
  // extraFds: further pipes after stderr, read back as child.output[3…].
  const child = spawnSync(command, argv, {
    input: "",
    cwd,
    env,
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: 8 * 1024 * 1024,
    detached: true,
    ...(extraFds > 0
      ? { stdio: ["pipe", "pipe", "pipe", ...Array(extraFds).fill("pipe")] }
      : {}),
  });
  reapGroup(child.pid);
  const tag = shell === null ? {} : { shell };
  const after = snapshotTree(sandboxRoot, workDirName);
  for (const [path, stamp] of after) {
    if (before.get(path) !== stamp)
      escapes.push({ id: escapeId, ...tag, path });
  }
  for (const [name, stamp] of listDirStamps(scriptDir)) {
    if (scriptDirBefore.get(name) !== stamp) {
      escapes.push({ id: escapeId, ...tag, path: join(scriptDir, name) });
    }
  }
  return child;
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
    harnessDir,
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
  // What the fixture creates: the controls, and the case's own input. The
  // shell-fn form writes no per-case file (CR-3), so its input is not a name
  // the fixture creates and may legitimately be an `absent` path (QA cycle 2,
  // CR-4).
  const paths = pathAssertionProblem(c.expected, [
    ...fixture.controls,
    ...(fnName === null ? [c.input] : []),
  ]);
  if (paths !== null) {
    decline(`case's ${paths}`);
    return;
  }

  for (const shell of shells) {
    // One directory per (case, shell): a side effect from the bash run must
    // not be read as one from the zsh run.
    let fixtureDir;
    try {
      // The shell-fn form gets the input as ARGV, not as a directory entry, so
      // it does not need the file — and must not be declined for a name a
      // file cannot carry: a real label such as `area/backend` is exactly the
      // kind of input a label filter must be probed with (task.136 QA cycle
      // 1, CR-3). The controls are still written, so `absent` and the cwd
      // sentinel keep their meaning.
      fixtureDir = materialiseFixture(workDir, fixture.controls, c.input, {
        writeInput: fnName === null,
      });
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
    const env = caseEnv({ fixtureDir, sandboxHome, sandboxTmp });
    if (fakeGhDir !== null) {
      // First on PATH, and armed: the fixture's `gh` refuses to run without
      // FAKE_GH=1, so a stray invocation from any other context exits 2.
      env.PATH = `${fakeGhDir}:${env.PATH}`;
      env.FAKE_GH = "1";
    } else {
      // No fixture: the TRIP-WIRE gh is first on PATH instead. It records that it
      // was called and exits 127, so a PATH-resolved gh never reaches the host
      // binary, and runProbeSpec declines the whole run `needs-fake-gh` (task.140
      // QA cycle 2, BUG-4). Its limits are stated in probe-boundary-rule.md §5.
      env.PATH = `${join(harnessDir, "bin")}:${env.PATH}`;
    }
    // The source-completed marker, one per spawn, under the WORK dir — the
    // sentinel skips it, so the marker is never read as an escape.
    const sourcedMark =
      fnName === null ? null : join(harnessDir, `sourced-${++harnessSeq}`);
    if (sourcedMark !== null) env.PROBE_SOURCED = sourcedMark;
    const child = watchedSpawn(
      shell,
      argv,
      { cwd: fixtureDir, env, timeoutMs },
      {
        sandboxRoot,
        workDirName,
        scriptDir,
        escapes,
        escapeId: `${c.id}@${shell}`,
        shell,
      },
    );

    const sourced = sourcedMark !== null && existsSync(sourcedMark);
    if (sourcedMark !== null) rmSync(sourcedMark, { force: true });
    let outcome;
    let detail = null;
    if (neverRan(child)) {
      outcome = "errored";
      detail = child.signal ? `timed out after ${timeoutMs}ms` : "never ran";
    } else if (
      fnName !== null &&
      (child.status === SHELL_FN_SOURCE_FAILED || !sourced)
    ) {
      // The source itself failed — a syntax error, a `return` at top level,
      // an `exit` in the library (re-mapped by the EXIT trap around the
      // source — BUG-2). A property of the ENTRY, so every case
      // reports it identically and runProbeSpec folds them into one decline.
      // Without the reserved exit this read as N mismatches and scored
      // `absent` with a full count (task.136).
      outcome = "errored";
      detail = `source "${entryPath}" failed (exit ${child.status}): ${(child.stderr ?? "").trim().split("\n")[0].slice(0, 160)}`;
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

/**
 * Node's own footer on an uncaught error: the last stderr line reads
 * `Node.js vX.Y.Z`. It is how a CRASH is told apart from a refusal — both exit
 * non-zero, and only one of them is the CLI answering. Matched on the exact
 * version the child ran under, since the child is always `process.execPath`.
 */
const NODE_FATAL_FOOTER = new RegExp(
  `(?:^|\\n)Node\\.js ${escapeRegExp(process.version)}\\s*$`,
);

/**
 * A frame of a Python traceback: `  File "<path>", line N`, always indented.
 * An ExceptionGroup prefixes each of its lines with `|` (`  |   File …`).
 */
const PY_FRAME = /^(?: *\|)? {2,}File ".*", line \d+/m;
/**
 * The header an uncaught runtime exception prints, plain or as an
 * ExceptionGroup's (`  + Exception Group Traceback (most recent call last):`).
 */
const PY_TRACEBACK =
  /^(?: *[+|] )?(?:Exception Group )?Traceback \(most recent call last\):$/m;
/** Compile-time errors print a frame and this line, with no Traceback header. */
const PY_COMPILE_ERROR = /^(?:SyntaxError|IndentationError|TabError)\b/m;
/** An exception line, after an ExceptionGroup's `|` prefix: a (dotted) class, optionally `: message`. */
const PY_EXCEPTION_LINE = /^(?: *\| )?([A-Za-z_][\w.]*(?::\s.*)?)$/;

/**
 * Did a Python child CRASH rather than answer (task.215)? A Python crash exits
 * 1 — the status a refusal exits with — and prints no footer like Node's, so
 * the exit code cannot tell them apart. Its stderr can: a `File "…", line N`
 * frame AND either a `Traceback (most recent call last):` header (an uncaught
 * runtime exception, an ExceptionGroup's included) or a SyntaxError-family
 * line (a compile error, which prints the frame with no header).
 *
 * What comes AFTER the traceback does not matter. A multi-line message, an
 * `add_note()` hint, an ExceptionGroup's box drawing and an atexit handler's
 * output all put something other than the exception last, and keying on the
 * last line read each of them as a refusal — a false pass (QA cycle 1,
 * TASK-215-QA1-1). So a script that catches its failure and prints the
 * traceback itself, then refuses, also reads as a crash: `errored`, "could not
 * look" — the safe direction. A refusal that prints an exception-shaped line
 * with no frame, or a frame-shaped log line with no header, stays a refusal.
 * The caller asks only on exit 1 (an uncaught exception always exits 1), so an
 * "Exception ignored" traceback before a refusal that exits 3 is not a crash.
 */
export function isPythonCrash(stderr) {
  if (typeof stderr !== "string") return false;
  if (!PY_FRAME.test(stderr)) return false;
  return PY_TRACEBACK.test(stderr) || PY_COMPILE_ERROR.test(stderr);
}

/**
 * The record PYTHON_BOOTSTRAP wrote on PYTHON_RECORD_FD for this case's
 * `nonce`: `{ kind: "crash", line }`, `{ kind: "answer" }`, or null when there
 * is none — the bootstrap never ran, or the write was lost, and the caller
 * reads that as "could not look" (QA cycle 4, TASK-215-QA4-1). Only a whole
 * line `<kind> <nonce>` is a record; a crash wins over an answer. `line` is
 * the exception's `Class: message` when the bootstrap could format it.
 */
function pythonExitRecord(child, nonce) {
  const text = child.output?.[PYTHON_RECORD_FD];
  if (typeof text !== "string") return null;
  const lines = text.split("\n");
  const crashAt = lines.indexOf(`${PYTHON_CRASH} ${nonce}`);
  if (crashAt !== -1) {
    const line = lines[crashAt + 1];
    return { kind: "crash", line: line && line.trim() !== "" ? line : null };
  }
  return lines.includes(`${PYTHON_ANSWER} ${nonce}`)
    ? { kind: "answer" }
    : null;
}

/**
 * The exception line of a Python crash, for the decline detail: the first
 * exception-shaped line after the last frame, which skips the frame's source
 * and caret lines and stops before a message's continuation, a note or an
 * atexit line. The last non-empty line when none is found.
 */
function pythonExceptionLine(stderr) {
  const lines = stderr.split("\n");
  let lastFrame = -1;
  lines.forEach((l, i) => {
    if (PY_FRAME.test(l)) lastFrame = i;
  });
  for (const l of lines.slice(lastFrame + 1)) {
    const m = PY_EXCEPTION_LINE.exec(l);
    if (m) return m[1];
  }
  return lines.filter((l) => l.trim() !== "").at(-1) ?? "uncaught exception";
}

/**
 * Run one case against a Node or Python CLI through its `--argv` template
 * (task.144; Python, task.215 — `runtime` is "python3" for a `.py` entry).
 *
 * One probe per case — the interpreter is the runtime, so there is no shell
 * multiplicity.
 * The template's `{input}` element becomes the case's input as ONE argv element
 * and each `{fixture}` element becomes this case's fixture directory, which is
 * built by the same helper the shell arm uses: the sink's controls plus the
 * case's own name when the sink is in `MATERIALISED_SINKS`, otherwise empty.
 *
 * Outcome:
 *   killed, timed out, never ran, or crashed      → "errored" (could not look)
 *   Python, no exit record from the bootstrap      → "errored" (could not look)
 *   no `expected`: exit 0                          → "accepted"
 *   no `expected`: exit non-zero                   → "rejected"
 *   `expected`: compared, mapped through direction → as the shell arm
 * A crash is Node's fatal-error footer on stderr, or for Python the crash
 * record PYTHON_BOOTSTRAP writes on PYTHON_RECORD_FD, or an exit 1 whose stderr
 * isPythonCrash reads as a traceback (Python exits 1 on a crash, as a refusal
 * does, so the exit status alone cannot tell them apart).
 * Scoring it as a refusal
 * would let a script that fails to LOAD read as a control that rejects every
 * hostile input; errored, every case folds into one `entry-not-probeable`.
 */
function runCliCase(
  c,
  {
    sink,
    entryPath,
    runtime = "node",
    template,
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
  const fixture = MATERIALISED_SINKS[c.sink ?? sink] ?? null;
  const decline = (detail) =>
    caseResults.push({
      id: c.id,
      direction: c.direction,
      outcome: "errored",
      detail,
    });
  if (typeof c.input !== "string") {
    decline(
      `case input is ${describeType(c.input)}, not a string — an argv element is a string`,
    );
    return;
  }
  const hasExpected = c.expected !== undefined;
  if (hasExpected) {
    // Declined, never scored — the BUG-8 / BUG-11 rule the shell arm applies.
    const problem = expectedProblem(c.expected);
    if (problem !== null) {
      decline(`case's ${problem}`);
      return;
    }
  }
  // The case's own `fixture` (task.216), validated as the fence: and
  // shell-argv: arms validate it. `fixture` above is the SINK's; this is c's.
  const fixtureProblemText = fixtureProblem(c.fixture);
  if (fixtureProblemText !== null) {
    decline(`case's ${fixtureProblemText}`);
    return;
  }
  const steers = Object.keys(c.fixture?.env ?? {}).find(steersInterpreter);
  if (steers !== undefined) {
    decline(
      `case's \`fixture.env\` may not set ${steers} on the cli: form — it steers the interpreter the form runs, not the CLI under probe`,
    );
    return;
  }
  const files = Object.entries(c.fixture?.files ?? {});
  // What the fixture creates: the sink's controls and input, when there is a
  // sink, and every `fixture.files` path (task.128 BUG-13; task.232).
  const paths = pathAssertionProblem(c.expected, [
    ...(fixture !== null ? [...fixture.controls, c.input] : []),
    ...files.map(([rel]) => rel),
  ]);
  if (paths !== null) {
    decline(`case's ${paths}`);
    return;
  }

  let fixtureDir;
  try {
    fixtureDir = materialiseFixture(workDir, fixture?.controls ?? [], c.input, {
      writeInput: fixture !== null,
    });
  } catch (e) {
    decline(`fixture: cannot materialise "${c.input}": ${e.message}`);
    return;
  }
  try {
    writeFixtureFiles(fixtureDir, files);
  } catch (e) {
    decline(`fixture: ${e.message}`);
    return;
  }

  // Whole-element substitution only — parseArgvTemplate refused any element
  // that merely CONTAINS a slot, so nothing here builds a string from input.
  const args = template.map((a) =>
    a === "{input}" ? c.input : a === "{fixture}" ? fixtureDir : a,
  );
  const isPython = runtime === "python3";
  const nonce = isPython ? randomBytes(12).toString("hex") : null;
  const child = watchedSpawn(
    isPython ? "python3" : process.execPath,
    isPython
      ? [...PYTHON_FLAGS, "-c", PYTHON_BOOTSTRAP, nonce, entryPath, ...args]
      : [entryPath, ...args],
    {
      cwd: fixtureDir,
      env: fixtureCaseEnv(c.fixture, { fixtureDir, sandboxHome, sandboxTmp }),
      timeoutMs,
      extraFds: isPython ? PYTHON_RECORD_FD - 2 : 0,
    },
    {
      sandboxRoot,
      workDirName,
      scriptDir: dirname(entryPath),
      escapes,
      escapeId: c.id,
    },
  );

  // Read once (QA cycle 3, CR-3); null for a Node child, which has no record.
  const pyRecord = isPython ? pythonExitRecord(child, nonce) : null;
  let outcome;
  let detail = null;
  if (neverRan(child)) {
    outcome = "errored";
    detail = child.signal
      ? `killed by ${child.signal} (timeout ${timeoutMs}ms)`
      : `never ran: ${child.error?.message ?? "no exit status"}`;
  } else if (isPython && pyRecord === null) {
    // No record: the bootstrap did not see the body end — the write was lost
    // (fd 3 closed or replaced, os._exit, an exec) or python3 never reached
    // it. Not an answer; the safe direction (QA cycle 4, TASK-215-QA4-1/QA4-2).
    outcome = "errored";
    const said = (child.stderr ?? "").trim().split("\n")[0].slice(0, 160);
    detail = `the CLI exited (exit ${child.status}) without the bootstrap's exit record — could not tell an answer from a crash${said ? `: ${said}` : ""}`;
  } else if (
    isPython &&
    (pyRecord.kind === "crash" ||
      (child.status === 1 && isPythonCrash(child.stderr)))
  ) {
    // The crash record is the signal: it is written whatever the script did
    // to stderr or its excepthook. A traceback on stderr with exit 1 is read
    // too — a script that prints its own and exits 1 is not answering. Exit 1
    // only for that one: an "Exception ignored" traceback on any other status
    // sits beside an answer.
    outcome = "errored";
    const line =
      (pyRecord.kind === "crash" ? pyRecord.line : null) ??
      pythonExceptionLine(child.stderr ?? "");
    detail = `the CLI crashed (exit ${child.status}) rather than answering: ${line.trim().slice(0, 160)}`;
  } else if (isPython && child.status === PYTHON_FINALIZE_STATUS) {
    // The body answered, then Python failed at shutdown (QA cycle 6).
    outcome = "errored";
    detail = `the CLI answered, then python3 failed at shutdown (exit ${PYTHON_FINALIZE_STATUS}, a failed flush of stdout or stderr) — could not tell an answer from a crash`;
  } else if (!isPython && NODE_FATAL_FOOTER.test(child.stderr ?? "")) {
    outcome = "errored";
    const first = (child.stderr ?? "")
      .split("\n")
      .find((l) => /^\w*Error\b|^Error:/.test(l.trim()));
    detail = `the CLI crashed (exit ${child.status}) rather than answering: ${(first ?? "uncaught error").trim().slice(0, 160)}`;
  } else if (hasExpected) {
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
  } else {
    outcome = child.status === 0 ? "accepted" : "rejected";
    detail =
      child.status === 0
        ? null
        : `exit ${child.status}: ${(child.stderr ?? "").trim().split("\n")[0].slice(0, 160)}`;
  }
  caseResults.push({
    id: c.id,
    direction: c.direction,
    outcome,
    detail,
    exit: child.status,
  });
}

/**
 * Write a case's `fixture.files` into its directory. Shared by the fence:,
 * shell-argv: (task.181) and cli: (task.216) arms, so they cannot drift on what a fixture file
 * may name. THROWS on a path that leaves the directory; the caller turns that
 * into an `errored` run.
 */
function writeFixtureFiles(caseDir, files) {
  for (const [rel, content] of files) {
    const target = resolve(caseDir, rel);
    if (target === caseDir || !isWithin(caseDir, target)) {
      throw new Error(
        `\`fixture.files\` path "${rel}" leaves the case directory`,
      );
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
}

/**
 * `caseEnv` with a case's `fixture.env` merged in. The case's env first, the
 * sandbox's own keys last: fixtureProblem already refuses HOME/TMPDIR/LC_ALL,
 * and the order holds even if it did not. Shared by the fence:, shell-argv:
 * (task.181) and cli: (task.216) arms.
 */
function fixtureCaseEnv(fixture, { fixtureDir, sandboxHome, sandboxTmp }) {
  const sandbox = caseEnv({ fixtureDir, sandboxHome, sandboxTmp });
  return {
    ...sandbox,
    ...(fixture?.env ?? {}),
    HOME: sandbox.HOME,
    TMPDIR: sandbox.TMPDIR,
    LC_ALL: sandbox.LC_ALL,
  };
}

/**
 * The env one per-case shell run gets: `fixtureCaseEnv`, then every PATH
 * directory holding the host `gh` shadowed by a copy without it (fixture.env's
 * PATH included), then the fake `gh` (armed) or the trip-wire first on PATH.
 * ONE definition for the fence: and shell-argv: arms — the arms whose case
 * fixture can run — so they cannot drift on it (TASK-181-001 was this
 * isolation copied into one arm and not the other).
 */
function caseShellEnv(
  fixture,
  { caseDir, sandboxHome, sandboxTmp, harnessDir, fakeGhDir },
) {
  const env = fixtureCaseEnv(fixture, {
    fixtureDir: caseDir,
    sandboxHome,
    sandboxTmp,
  });
  env.PATH = ghFreePath(env.PATH, join(harnessDir, "path"), caseDir);
  if (fakeGhDir !== null) {
    env.PATH = `${fakeGhDir}:${env.PATH}`;
    env.FAKE_GH = "1";
  } else {
    env.PATH = `${join(harnessDir, "bin")}:${env.PATH}`;
  }
  return env;
}

/**
 * `watchedSpawn` for a run whose cwd is a case directory inside the work dir,
 * plus the work-dir snapshot that only such a run needs: the sandbox sentinel
 * skips the work dir, so a write beside the case directory (`../pwned`, a
 * sibling case, the harness dir) is an escape only this sees, as is a deletion
 * or an empty directory there — a deleted trip-wire stub lets later cases reach
 * the host's real `gh` (TASK-180-011, -013). The trip-wire's own marker is the
 * harness's write, reported as a gh call, not here. ONE definition for the
 * fence: and shell-argv: arms (TASK-181-003 was this snapshot missing from one).
 */
function caseWatchedSpawn(
  command,
  argv,
  { cwd, env, timeoutMs },
  {
    sandboxRoot,
    workDir,
    workDirName,
    harnessDir,
    scriptDir,
    escapes,
    escapeId,
    shell,
  },
) {
  const caseName = basename(cwd);
  const ownWrite = `${basename(harnessDir)}/${GH_TRIPPED}`;
  const workBefore = workDirStamps(workDir, caseName);
  const child = watchedSpawn(
    command,
    argv,
    { cwd, env, timeoutMs },
    { sandboxRoot, workDirName, scriptDir, escapes, escapeId, shell },
  );
  // Both ways: a path that appeared or changed, and a path that is gone.
  const workAfter = workDirStamps(workDir, caseName);
  const changed = [...workAfter]
    .filter(
      ([path, stamp]) => path !== ownWrite && workBefore.get(path) !== stamp,
    )
    .map(([path]) => path);
  const gone = [...workBefore.keys()].filter((path) => !workAfter.has(path));
  for (const path of [...changed, ...gone]) {
    escapes.push({ id: escapeId, shell, path: `${workDirName}/${path}` });
  }
  return child;
}

/**
 * Why a child produced no answer — `neverRan` says THAT it did not; this says
 * which of three things happened, so "could not start" and "killed for another
 * reason" never read as a timeout (task.181 QA cycle 2, CR-4).
 */
function neverRanDetail(child, timeoutMs) {
  if (child.error?.code === "ETIMEDOUT")
    return `timed out after ${timeoutMs}ms`;
  if (child.signal) return `killed by ${child.signal}`;
  return `never ran: ${child.error?.message ?? "no exit status"}`;
}

// ── The shell-argv entry form (task.181) ─────────────────────────────────────

/**
 * The argv one shell-argv: run spawns `shell` with: the shell is the CALLER,
 * with its rc files off, of a fixed body that hands the script and its
 * arguments to bash as "$@" — bash is always the interpreter. Exported so the
 * rule is held on a host without zsh, where the zsh arm never runs.
 */
export function shellArgvSpawnArgs(shell, entryPath, args) {
  return [...noRcFlags(shell), "-c", 'bash "$@"', shell, entryPath, ...args];
}

/**
 * Run one case against a multi-argument shell script, once per shell.
 *
 * The cli: arm's contract on a bash script: the case's input is ONE element of
 * the `--argv` template (`{fixture}` elements become the case directory), the
 * exit status is the verdict (0 accepted, non-zero rejected), and a case's
 * `expected`, when given, is compared as the shell arm compares it. Each shell
 * from probeShells() is the CALLER and bash the INTERPRETER —
 * `<shell> -c 'bash "$@"' <shell> <script> ...argv` — as for `shell:`: the
 * script's shebang fixes its interpreter, and a bash script interpreted by zsh
 * would fail on a bash construct and read as a refusal ("could not look" scored
 * as "refused").
 *
 * Before each (case, shell) run: the case's own `fixture` (`files`, `env`) is
 * written exactly as the fence: arm writes it, then the `--fixture-setup`
 * script, when given, runs as `bash <setup> <case-dir>` under the same env and
 * sentinels. A setup that exits non-zero, times out or never starts makes the
 * run `errored` — the engine could not build what the script needs — never
 * `rejected`.
 */
function runShellArgvCase(
  c,
  {
    sink,
    entryPath,
    template,
    setupPath = null,
    fakeGhDir = null,
    harnessDir,
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
  const sinkFixture = MATERIALISED_SINKS[c.sink ?? sink] ?? null;
  const errored = (shell, detail) =>
    caseResults.push({
      id: c.id,
      shell,
      direction: c.direction,
      outcome: "errored",
      detail,
    });
  const decline = (detail) => {
    for (const shell of shells) errored(shell, detail);
  };
  if (typeof c.input !== "string") {
    decline(
      `case input is ${describeType(c.input)}, not a string — an argv element is a string`,
    );
    return;
  }
  const hasExpected = c.expected !== undefined;
  if (hasExpected) {
    // Declined, never scored — the BUG-8 / BUG-11 rule the shell arm applies.
    const problem = expectedProblem(c.expected);
    if (problem !== null) {
      decline(`case's ${problem}`);
      return;
    }
  }
  const problem = fixtureProblem(c.fixture);
  if (problem !== null) {
    decline(`case's ${problem}`);
    return;
  }
  const files = Object.entries(c.fixture?.files ?? {});
  // What the fixture creates: the sink's controls and input, when there is a
  // sink, and every `fixture.files` path (task.128 BUG-13; task.232).
  const paths = pathAssertionProblem(c.expected, [
    ...(sinkFixture !== null ? [...sinkFixture.controls, c.input] : []),
    ...files.map(([rel]) => rel),
  ]);
  if (paths !== null) {
    decline(`case's ${paths}`);
    return;
  }

  for (const shell of shells) {
    // One directory per (case, shell): a side effect from the bash run must not
    // be read as one from the zsh run, and the setup builds each afresh.
    let fixtureDir;
    try {
      fixtureDir = materialiseFixture(
        workDir,
        sinkFixture?.controls ?? [],
        c.input,
        { writeInput: sinkFixture !== null },
      );
      writeFixtureFiles(fixtureDir, files);
    } catch (e) {
      errored(shell, `fixture: ${e.message}`);
      continue;
    }
    // The same isolation as fence: — one definition (caseShellEnv).
    const env = caseShellEnv(c.fixture, {
      caseDir: fixtureDir,
      sandboxHome,
      sandboxTmp,
      harnessDir,
      fakeGhDir,
    });
    const watch = {
      sandboxRoot,
      workDir,
      workDirName,
      harnessDir,
      escapeId: `${c.id}@${shell}`,
      shell,
    };

    if (setupPath !== null) {
      // The setup builds its case directory and nothing else. Its writes are
      // watched into their OWN list, never the entry's: a setup write charged
      // to the entry read as the entry escaping (TASK-181-002). A write
      // anywhere but the case directory — the sandbox HOME or TMPDIR, a
      // sibling case, the harness — errors this run, named: it leaves the
      // entry's escape baseline unknown. A setup that needs scratch space
      // makes it inside "$1".
      const setupWrites = [];
      const setup = caseWatchedSpawn(
        "bash",
        [setupPath, fixtureDir],
        { cwd: fixtureDir, env, timeoutMs },
        { ...watch, scriptDir: dirname(setupPath), escapes: setupWrites },
      );
      if (neverRan(setup)) {
        errored(shell, `fixture setup ${neverRanDetail(setup, timeoutMs)}`);
        continue;
      }
      if (setupWrites.length > 0) {
        const paths = [...new Set(setupWrites.map((e) => e.path))];
        errored(
          shell,
          `fixture setup wrote outside the case directory: ${paths.slice(0, 5).join(", ")}${paths.length > 5 ? ` (+${paths.length - 5} more)` : ""} — a setup builds "$1" and nothing else`,
        );
        continue;
      }
      if (setup.status !== 0) {
        errored(
          shell,
          `fixture setup exited ${setup.status}: ${(setup.stderr ?? "").trim().split("\n")[0].slice(0, 160)}`,
        );
        continue;
      }
    }

    // Whole-element substitution only — parseArgvTemplate refused any element
    // that merely CONTAINS a slot, so nothing here builds a string from input.
    // ARGV, never a string: the shell's body is fixed and the script and its
    // arguments arrive as "$@".
    const args = template.map((a) =>
      a === "{input}" ? c.input : a === "{fixture}" ? fixtureDir : a,
    );
    const child = caseWatchedSpawn(
      shell,
      shellArgvSpawnArgs(shell, entryPath, args),
      { cwd: fixtureDir, env, timeoutMs },
      { ...watch, scriptDir: dirname(entryPath), escapes },
    );

    let outcome;
    let detail = null;
    if (neverRan(child)) {
      outcome = "errored";
      detail = neverRanDetail(child, timeoutMs);
    } else if (hasExpected) {
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
    } else {
      outcome = child.status === 0 ? "accepted" : "rejected";
      detail =
        child.status === 0
          ? null
          : `exit ${child.status}: ${(child.stderr ?? "").trim().split("\n")[0].slice(0, 160)}`;
    }
    caseResults.push({
      id: c.id,
      shell,
      direction: c.direction,
      outcome,
      detail,
      exit: child.status,
    });
  }
}

// ── The fence entry form (task.180) ──────────────────────────────────────────

/** An opening or closing fence — `extractBlocks`' own pattern, so the two agree. */
const FENCE_LINE = /^(\s*)(`{3,}|~{3,})\s*([A-Za-z0-9_+-]*)([^`]*)$/;
/** An ATX heading: level, then its text with any closing `#`s dropped. */
const ATX_HEADING = /^(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;

/**
 * The first ```bash block under `heading` in a Markdown document.
 *
 * Headings are read ONLY from lines outside fences, tracking fence state the
 * way `extractBlocks` does: a bash `# comment` is heading-shaped, and the
 * step-3 doc alone carries ten inside fences. A raw line scan read each as a
 * level-1 heading — ending the section before its block, or matching the
 * heading a second time (task.180 review I2). The section runs to the next
 * heading of the same or a higher level; the block is the first `bash` block
 * `extractBlocks` reports inside it (an `sh` block is not one).
 *
 * @returns {{ok: true, code: string, line: number, headingLine: number}
 *          |{ok: false, detail: string}}
 */
export function extractFencedBlock(docText, heading) {
  const want = String(heading).trim();
  // A CRLF checkout ends every heading in \r, which no heading matched
  // (task.180 QA cycle 2, TASK-180-008): normalise before reading anything.
  const text = String(docText).replace(/\r\n?/g, "\n");
  const lines = text.split("\n");
  const headings = [];
  let open = null;
  for (let i = 0; i < lines.length; i++) {
    const fence = FENCE_LINE.exec(lines[i]);
    if (fence) {
      const [, , marker, info] = fence;
      if (open === null) {
        open = { marker: marker[0], len: marker.length };
      } else if (
        marker[0] === open.marker &&
        marker.length >= open.len &&
        info === ""
      ) {
        open = null;
      }
      continue;
    }
    if (open !== null) continue;
    const h = ATX_HEADING.exec(lines[i]);
    if (h) headings.push({ line: i + 1, level: h[1].length, text: h[2] });
  }
  const matches = headings.filter((h) => h.text === want);
  if (matches.length === 0) {
    return { ok: false, detail: `heading not found: "${want}"` };
  }
  if (matches.length > 1) {
    return {
      ok: false,
      detail: `heading "${want}" is ambiguous — it appears at lines ${matches.map((m) => m.line).join(" and ")}`,
    };
  }
  const [match] = matches;
  const next = headings.find(
    (h) => h.line > match.line && h.level <= match.level,
  );
  const end = next ? next.line : Number.POSITIVE_INFINITY;
  const block = extractBlocks(text).find(
    (b) => b.line > match.line && b.line < end,
  );
  if (!block) {
    return {
      ok: false,
      detail: `no bash block under heading "${want}" (line ${match.line})`,
    };
  }
  return {
    ok: true,
    code: block.code,
    line: block.line,
    headingLine: match.line,
  };
}

/** The environment keys the sandbox owns; a case's fixture may not set them. */
const SANDBOX_OWNED_ENV = Object.freeze(["HOME", "TMPDIR", "LC_ALL"]);

/**
 * The keys a `cli:` case's `fixture.env` may not set either (task.216): they
 * steer the interpreter the form runs rather than the CLI under probe. `PATH`
 * selects the `python3` binary (spawned by name), whose crash record the
 * verdict reads; `NODE_OPTIONS` loads code into a Node child before the entry
 * and can hide the fatal-error footer; the dynamic-loader variables (any
 * `LD_*` or `DYLD_*` name, CLI_LOADER_ENV_PREFIXES) load or redirect a library
 * into either interpreter before it starts (QA cycle 2; by prefix since
 * task.226). Python's own variables need no entry: `-E` already ignores them.
 */
const CLI_INTERPRETER_ENV = Object.freeze(["PATH", "NODE_OPTIONS"]);
/** The dynamic loaders' namespaces (glibc `LD_*`, macOS dyld `DYLD_*`): every
 * name in them can load or redirect code before the interpreter starts. The
 * match is case-sensitive, as POSIX environment names are. */
const CLI_LOADER_ENV_PREFIXES = Object.freeze(["LD_", "DYLD_"]);
const steersInterpreter = (k) =>
  CLI_INTERPRETER_ENV.includes(k) ||
  CLI_LOADER_ENV_PREFIXES.some((p) => k.startsWith(p));
const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Validate a case's `fixture` (task.180). Returns null when well-formed, else
 * the reason to decline the case. The SHAPE only — whether a file path stays
 * inside the case directory is decided against the real directory when the
 * file is written, by `isWithin`.
 */
export function fixtureProblem(fixture) {
  if (fixture === undefined) return null;
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    return "`fixture` is not an object";
  }
  const unknown = Object.keys(fixture).filter(
    (k) => k !== "env" && k !== "files",
  );
  if (unknown.length > 0) {
    return `\`fixture\` carries unknown keys: ${unknown.join(", ")} — only env and files`;
  }
  for (const key of ["env", "files"]) {
    const v = fixture[key];
    if (v === undefined) continue;
    if (!v || typeof v !== "object" || Array.isArray(v)) {
      return `\`fixture.${key}\` is not an object`;
    }
    for (const [k, val] of Object.entries(v)) {
      if (typeof val !== "string") {
        return `\`fixture.${key}["${k}"]\` must be a string, got ${describeType(val)}`;
      }
      if (k.includes("\0") || val.includes("\0")) {
        return `\`fixture.${key}\` carries a NUL`;
      }
    }
  }
  for (const k of Object.keys(fixture.env ?? {})) {
    if (!ENV_NAME.test(k))
      return `\`fixture.env\` key "${k}" is not a variable name`;
    if (SANDBOX_OWNED_ENV.includes(k)) {
      return `\`fixture.env\` may not set ${k} — the sandbox owns it`;
    }
  }
  for (const k of Object.keys(fixture.files ?? {})) {
    if (k === "") return "`fixture.files` names an empty path";
  }
  return null;
}

/**
 * Whether the generated script PARSES under `shell`: `<shell> -n`, rc files off,
 * which reads every command and executes none. Returns null when it parses, else
 * a one-line reason (task.180 QA cycle 3, TASK-180-009 — the third strike on the
 * stderr classifier this replaces). A parse failure is a property of the script
 * text, so it is decided before and apart from the run: no message the block
 * prints at run time can be mistaken for it, and no runtime error the block hits
 * after its guard answered can be mistaken for "never answered".
 */
export function parseCheck(shell, scriptPath, { cwd, env, timeoutMs }) {
  const r = spawnSync(shell, [...noRcFlags(shell), "-n", scriptPath], {
    input: "",
    cwd,
    env,
    encoding: "utf8",
    timeout: timeoutMs,
  });
  if (r.status === 0) return null;
  if (neverRan(r)) {
    return `\`${shell} -n\` did not complete: ${r.error?.message ?? r.signal ?? "no exit status"}`;
  }
  const first = (r.stderr ?? "").trim().split("\n")[0] ?? "";
  return `\`${shell} -n\` exit ${r.status}: ${first.slice(0, 160)}`;
}

/**
 * Score one fence: run — the ONE ordered decision (task.180 QA cycle 2: two
 * cycles of HIGH findings were each a branch checked in the wrong order, so the
 * order is stated here, once):
 *   1. a path `expected.absent` names exists in the case directory → the side
 *      effect happened: compared, so a hostile case is reproduced — even when
 *      the shell then stopped, was killed or timed out (TASK-180-006, -018)
 *   2. the child never answered (killed, timed out) or the shell could not open
 *      the script → errored
 *   3. the generated script does not parse (`parseError`, from parseCheck) →
 *      errored: the guard never ran (TASK-180-001)
 *   4. `expected` → compared, mapped through direction. Every hostile case
 *      reaches this step with a stated refusal OUTPUT: runFenceCase declines
 *      one with no `expected`, or with one that is only an exit code or an
 *      empty output (TASK-180-012), so a shell that stopped on the input
 *      (`${x:?}`, a word-split `cd`) or an injected `exit` mismatches the
 *      stated refusal instead of passing for it (TASK-180-005, -009)
 *   5. otherwise (a legitimate case) exit 0 is accepted, any other exit rejected
 * No step reads the shell's stderr to decide whether the guard answered.
 *
 * @returns {{outcome: string, detail: string|null}}
 */
export function scoreFenceRun(
  child,
  { c, shell, scriptPath, caseDir, timeoutMs, parseError = null },
) {
  const compared = () => {
    const mismatches = compareExpected(c.expected, child, caseDir);
    const matched = mismatches.length === 0;
    const good = c.direction === "hostile" ? "rejected" : "accepted";
    const bad = c.direction === "hostile" ? "accepted" : "rejected";
    return {
      outcome: matched ? good : bad,
      detail: matched ? null : mismatches.join("; "),
    };
  };
  // A side effect that happened is a reproduction whatever the shell then did —
  // stopped, was killed, or timed out (TASK-180-006, -018). Read through
  // casePathState, as compareExpected reads it: a planted symlink out of the
  // case directory is itself the side effect, and is never followed (task.232).
  // An unreadable path counts too: the run left something there.
  const absent = c.expected?.absent ?? [];
  if (absent.some((p) => casePathState(caseDir, p).state !== "missing")) {
    return compared();
  }
  if (neverRan(child)) {
    return {
      outcome: "errored",
      detail:
        child.error?.code === "ETIMEDOUT"
          ? `timed out after ${timeoutMs}ms`
          : child.signal
            ? `killed by ${child.signal}`
            : `never ran: ${child.error?.message ?? "no exit status"}`,
    };
  }
  if (isLaunchFailure(child, scriptPath)) {
    return {
      outcome: "errored",
      detail: `${shell} could not open the script (exit ${child.status}): ${(child.stderr ?? "").trim().slice(0, 160)}`,
    };
  }
  if (parseError !== null) {
    return {
      outcome: "errored",
      detail: `the substituted block does not parse under ${shell} — the guard never ran: ${parseError}`,
    };
  }
  if (c.expected !== undefined) return compared();
  return child.status === 0
    ? { outcome: "accepted", detail: null }
    : {
        outcome: "rejected",
        detail: `exit ${child.status}: ${((child.stderr ?? "").trim() || (child.stdout ?? "").trim()).split("\n")[0].slice(0, 160)}`,
      };
}

/** True when `expected` names a non-blank stdout or stderr — the only part of a refusal a stopped shell cannot also produce. */
const statesRefusalOutput = (expected) =>
  ["stdout", "stderr"].some(
    (k) => typeof expected?.[k] === "string" && expected[k].trim() !== "",
  );

/**
 * Every entry under `dir` except `skip`: files keyed by path with
 * snapshotTree's stamp, directories keyed `path/` and stamped `dir` — a
 * directory's mtime moves whenever anything is written inside it, so it is not
 * a stamp. Directories are listed so an empty `mkdir` is seen (TASK-180-013).
 */
function workDirStamps(dir, skip) {
  const out = snapshotTree(dir, skip);
  const walk = (d, prefix) => {
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (rel === skip) continue;
      out.set(`${rel}/`, "dir");
      walk(join(d, e.name), rel);
    }
  };
  walk(dir, "");
  return out;
}

/**
 * `path` with every absolute directory that holds an executable `gh` replaced by
 * a copy of it WITHOUT `gh` — a directory of symlinks under `farmRoot`, one per
 * entry, built once per directory and reused. A PATH lookup in the child
 * (`gh`, `type -ap gh`, `command -v gh`) then finds only the trip-wire or the
 * fixture prepended ahead of it, whatever the block, an input or a fixture
 * says. Enumerating the text that will run could not do this: under fence:
 * everything a case carries can run (TASK-180-015, -017). An absolute path to a
 * real `gh`, and a PATH the block itself prepends, stay the stated limits. A
 * directory that holds `gh` but cannot be listed is dropped rather than kept.
 * A relative entry is resolved against `cwd` (the case directory) for the test.
 * A default-path lookup (`command -p gh`, `env -u PATH gh`) searches
 * /bin:/usr/bin, not PATH: the text check is what catches it (TASK-180-019).
 */
export function ghFreePath(path, farmRoot, cwd = null) {
  return (path ?? "")
    .split(":")
    .flatMap((entry) => {
      // A relative entry (`""` included) is searched from the child's cwd, so
      // it is tested there: `../../…/.local/bin` from a fixture's PATH must not
      // keep a host gh in reach. With no cwd it cannot be tested, and is kept.
      if (!isAbsolute(entry) && cwd === null) return [entry];
      const dir = isAbsolute(entry) ? entry : resolve(cwd, entry);
      try {
        accessSync(join(dir, "gh"), fsConstants.X_OK);
      } catch {
        return [entry];
      }
      const farm = join(
        farmRoot,
        createHash("sha1").update(dir).digest("hex").slice(0, 16),
      );
      if (existsSync(farm)) return [farm];
      try {
        const names = readdirSync(dir).filter((n) => n !== "gh");
        mkdirSync(farm, { recursive: true });
        for (const n of names) symlinkSync(join(dir, n), join(farm, n));
        return [farm];
      } catch {
        rmSync(farm, { recursive: true, force: true });
        return [];
      }
    })
    .join(":");
}

/**
 * Run one case against a fenced block, once per shell (task.180).
 *
 * Per shell: a fresh case directory under the work dir — the fixture's files,
 * and the block's cwd — then the block with every `slot` replaced by the
 * case's input, written as a script under the harness dir (which the sentinel
 * skips) and run as `<shell> <script>`, rc files off. The replacement is a
 * FUNCTION, so a `$&` in the input is text; the input is still script SOURCE,
 * so a `$(…)` in it runs — in the case directory, where `expected.absent` can
 * see it and the escape sentinel does not need to. Outcome: the cli: arm's —
 * exit status, or `expected` when the case carries one.
 */
function runFenceCase(
  c,
  {
    block,
    slot,
    docPath,
    fakeGhDir = null,
    harnessDir,
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
  if (typeof c.input !== "string") {
    decline(
      `case input is ${describeType(c.input)}, not a string — it replaces the slot's text`,
    );
    return;
  }
  if (c.input.includes("\0")) {
    decline("case input carries a NUL");
    return;
  }
  const hasExpected = c.expected !== undefined;
  if (hasExpected) {
    const problem = expectedProblem(c.expected);
    if (problem !== null) {
      decline(`case's ${problem}`);
      return;
    }
  }
  if (!hasExpected && c.direction === "hostile") {
    decline(
      "hostile fence: case has no `expected` — state the guard's refusal (its non-empty stdout or stderr); an exit status alone cannot tell a refusal from a shell that stopped on the input",
    );
    return;
  }
  // An exit code, or an empty output, is also what a shell that stopped on the
  // input (`${x:?}`) or an injected `exit 1` produces, so an `expected` made only
  // of those matches the very runs it was required to tell apart (TASK-180-012).
  // A guard that refuses silently is therefore unprobeable here, by design: a
  // decline says so, where a score would read a false `engages`.
  if (c.direction === "hostile" && !statesRefusalOutput(c.expected)) {
    decline(
      "hostile fence: case's `expected` states no refusal output — an exit code or an empty stdout/stderr is also what a shell that stopped on the input, or an injected `exit`, produces; state the guard's non-empty stdout or stderr",
    );
    return;
  }
  const problem = fixtureProblem(c.fixture);
  if (problem !== null) {
    decline(`case's ${problem}`);
    return;
  }
  const files = Object.entries(c.fixture?.files ?? {});
  // What the fixture creates: every `fixture.files` path. An `absent` path it
  // writes would make every hostile case score accepted and the verdict read
  // `absent` behind a full count (task.128 BUG-13; task.180 QA cycle 2,
  // TASK-180-004). The helper normalises and case-folds (`./pwned`,
  // `b/../pwned` and `PWNED` all write `pwned`, TASK-180-010). A path that
  // leaves the case directory is refused below, per shell.
  const paths = pathAssertionProblem(
    c.expected,
    files.map(([rel]) => rel),
  );
  if (paths !== null) {
    decline(`case's ${paths}`);
    return;
  }
  const script = block.replaceAll(slot, () => c.input);

  for (const shell of shells) {
    const caseDir = mkdtempSync(join(workDir, "fixture-"));
    try {
      writeFixtureFiles(caseDir, files);
    } catch (e) {
      caseResults.push({
        id: c.id,
        shell,
        direction: c.direction,
        outcome: "errored",
        detail: `fixture: ${e.message}`,
      });
      continue;
    }
    const scriptPath = join(harnessDir, `fence-${++harnessSeq}.sh`);
    writeFileSync(scriptPath, script);

    // The per-case isolation shared with shell-argv: (caseShellEnv).
    const env = caseShellEnv(c.fixture, {
      caseDir,
      sandboxHome,
      sandboxTmp,
      harnessDir,
      fakeGhDir,
    });
    const parseError = parseCheck(shell, scriptPath, {
      cwd: caseDir,
      env,
      timeoutMs,
    });
    // Watched beside the case directory too (TASK-180-011, -013) — the
    // snapshot is caseWatchedSpawn's, shared with shell-argv:.
    const child = caseWatchedSpawn(
      shell,
      [...noRcFlags(shell), scriptPath],
      { cwd: caseDir, env, timeoutMs },
      {
        sandboxRoot,
        workDir,
        workDirName,
        harnessDir,
        scriptDir: dirname(docPath),
        escapes,
        escapeId: `${c.id}@${shell}`,
        shell,
      },
    );

    const { outcome, detail } = scoreFenceRun(child, {
      c,
      shell,
      scriptPath,
      caseDir,
      timeoutMs,
      parseError,
    });
    caseResults.push({
      id: c.id,
      shell,
      direction: c.direction,
      outcome,
      detail,
      exit: child.status,
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
// derived from `{sink, entry}` (plus, for a cli: control, its --name or else its argv skeleton —
// see controlKey), so two controls never share a file and a re-run
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

// An UNNAMED cli: control is keyed by its argv SKELETON (task.144): every flag and
// every bare positional, in order, with only the VALUES of flags dropped
// (`--root /tmp/x` → `--root *`, `--cases=/a.json` → `--cases=*`) and the slots
// kept wherever they sit. Two earlier keys each failed in one direction, and
// this is the replacement rather than a third patch:
//   - the whole template (first design) kept per-run operands, so a re-run of
//     ONE control with a different scratch path or mkdtemp --root recorded a
//     second control — executed counted twice, the first verdict never retired
//     (QA cycle 2, QA-1, reproduced);
//   - the element before "{input}" alone (cycle 2's fix) dropped too much, so
//     two DIFFERENT controls sharing an input flag merged — uat-status's
//     `--set D.1 blocked --note {input}` and `--accept D.1 --note {input}` both
//     keyed as --note, and `add {input}` / `remove {input}` as #1 (cycle 3, CR-1).
// The skeleton's one reading rule: an element that follows a flag and is not
// itself a flag or a slot is that flag's value. So a bare positional placed
// right after a BOOLEAN flag reads as its value and is dropped, and a value
// that starts with "-" reads as a flag and is kept — both stated in
// probe-boundary-rule.md §5. Every other form has `argv: null` (or no key, in a
// record written before this), so its key — and therefore its entry-file name
// — is byte-identical to what it was.
export function cliControlKey(template) {
  const isSlot = (a) => ARGV_SLOTS.includes(a);
  const isFlag = (a) => a.startsWith("-") && !isSlot(a);
  const out = [];
  for (let i = 0; i < template.length; i += 1) {
    const a = template[i];
    if (isSlot(a)) out.push(a);
    else if (isFlag(a)) {
      const eq = a.indexOf("=");
      out.push(eq > 0 ? `${a.slice(0, eq)}=*` : a);
    } else if (
      i > 0 &&
      isFlag(template[i - 1]) &&
      !template[i - 1].includes("=")
    ) {
      out.push("*");
    } else out.push(a);
  }
  return JSON.stringify(out);
}
// A NAMED cli: control is keyed on its name (QA cycle 4). Three cycles found a
// derived key wrong three ways — the whole template split re-runs, the flag
// before "{input}" merged different controls, and the skeleton merges controls
// whose flag VALUES select behaviour (--mode strict / --mode lax). Any key that
// drops a value has a counter-example, so identity the caller states wins, and
// the skeleton is only the fallback for an unnamed control, where recordRun
// reports a replacement whose full argv differs instead of making it silently.
// The name is keyed for cli: controls ONLY: every other form's key, and so its
// entry-file name, is unchanged. A control is a cli: control by its ENTRY
// PREFIX, not by carrying a template: a bad-argv decline has none to carry,
// and keying on `Array.isArray(argv)` dropped its name, so its corrected run
// landed in a second entry (task.144 5c CR-1).
const controlKey = (c) => {
  const base = `${c.sink ?? ""}\u0000${c.entry ?? ""}`;
  // A fence: entry names a BLOCK, not how it was called: its --name, else its
  // slot, is what tells two controls on one block apart. Keyed on sink + entry
  // alone, a second slot or name silently replaced the first (task.180 QA
  // cycle 1, TASK-180-002) — the cli: precedent, below.
  if (typeof c.entry === "string" && c.entry.startsWith(FENCE_PREFIX)) {
    const name = cliControlName(c);
    if (name !== null) return `${base}\u0000name:${name}`;
    return typeof c.slot === "string" ? `${base}\u0000slot:${c.slot}` : base;
  }
  const isCli =
    Array.isArray(c.argv) ||
    (typeof c.entry === "string" &&
      (c.entry.startsWith(CLI_PREFIX) ||
        c.entry.startsWith(SHELL_ARGV_PREFIX)));
  if (!isCli) return base;
  const name = cliControlName(c);
  if (name !== null) return `${base}\u0000name:${name}`;
  return Array.isArray(c.argv) ? `${base}\u0000${cliControlKey(c.argv)}` : base;
};

/**
 * A cli: control's stated identity — its `--name`, trimmed — or null when it
 * has none. One function for the key AND the replace report, so the two can
 * never disagree about whether a control is named (QA cycle 5, CR-1): the
 * report is for the DERIVED key only, and a named re-run whose argv differs is
 * an ordinary replacement. Trimmed, so "x" and " x " are one control (CR-3).
 */
function cliControlName(c) {
  return typeof c.name === "string" && c.name.trim() !== ""
    ? c.name.trim()
    : null;
}

/**
 * Reduce a `runProbeSpec` result to the per-control entry the record stores.
 * Counts, plus each declined case's id, reason and detail — the per-case
 * results of the cases that ran stay in the engine's own `--json` output.
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
    // Why each declined case was not run (obs #207). The count alone told a
    // reader that cases were declined but not why; the reason surfaced only on
    // a --json re-run. Additive: every reader of the record reads the counts.
    declined_cases: (Array.isArray(result.declined) ? result.declined : []).map(
      (d) => ({
        id: d?.id ?? null,
        reason: d?.reason ?? null,
        detail: d?.detail ?? null,
      }),
    ),
    escaped: result.escapes?.length ?? 0,
    // Which shells each case ran under (shell form), or null. The count is
    // cases × shells, and a reader must not have to divide (cycle 2, CR-5).
    shells: Array.isArray(result.shells) ? [...result.shells] : null,
    // The interpreter a cli: `.py` entry ran under (task.215), or null — the
    // record says which python3 answered, as `shells` says which shells did.
    interpreter:
      result.interpreter && typeof result.interpreter === "object"
        ? {
            name: result.interpreter.name ?? null,
            version: result.interpreter.version ?? null,
          }
        : null,
    // The directory whose `gh` answered the shell runs (task.136), or null —
    // the record must say what answered, not leave a reader to assume the
    // real one did not.
    fake_gh: typeof result.fakeGh === "string" ? result.fakeGh : null,
    // The cli: form's argv template (task.144), or null for every other form.
    // Part of the control's key — see controlKey.
    argv: Array.isArray(result.argv) ? [...result.argv] : null,
    // The JS form's fixed extra arguments (task.131), or null.
    args: Array.isArray(result.args) ? [...result.args] : null,
    // The fence: form's placeholder token (task.180), or null for every other
    // form. Part of an unnamed fence: control's key — see controlKey.
    slot: typeof result.slot === "string" ? result.slot : null,
    // The shell-argv: form's setup script (task.181), or null for every other
    // form — the record says what built each case directory.
    fixture_setup:
      typeof result.fixtureSetup === "string" ? result.fixtureSetup : null,
    ran_at: new Date().toISOString(),
  };
}

// `escaped` is totalled beside `executed` so every reader of the record sees it at the same depth.
// It used to live only per control, and qa-task gated PASS over a record whose one control had
// escaped 10 times while /finalise, reading the same record, halted on it (obs #73).
function totalsOf(controls) {
  return controls.reduce(
    (t, c) => ({
      executed: t.executed + (c.executed ?? 0),
      reproduced: t.reproduced + (c.reproduced ?? 0),
      escaped: t.escaped + (c.escaped ?? 0),
    }),
    { executed: 0, reproduced: 0, escaped: 0 },
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
 * One control per `{sink, entry}` (and --name or else argv skeleton, for a cli: control),
 * latest run wins. The writer already
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
 * (atomic, named from `{sink, entry}` and, for cli:, the --name or else the argv skeleton), then fold the directory into the
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
  // An unnamed cli: control is keyed on a DERIVED skeleton, which can merge two
  // controls that differ only in a dropped flag value. Such a merge is a
  // replacement of an entry whose full argv differs: report it through
  // `onReplace(previous, next)` rather than making it silently (QA cycle 4,
  // CR-1). An identical re-run is not reported.
  if (
    typeof opts.onReplace === "function" &&
    Array.isArray(entry.argv) &&
    cliControlName(entry) === null
  ) {
    let previous = null;
    try {
      previous = JSON.parse(
        readFileSync(join(dir, entryFileName(entry)), "utf8"),
      );
    } catch {
      previous = null;
    }
    if (
      previous &&
      Array.isArray(previous.argv) &&
      JSON.stringify(previous.argv) !== JSON.stringify(entry.argv)
    ) {
      opts.onReplace(previous, entry);
    }
  }
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
      "  escaped: 0",
      `  evidence: ${evidence}    # computed by security-probe.mjs; measured needs a record`,
      "  controls: []",
    );
    return `${lines.join("\n")}\n`;
  }
  const totals = totalsOf(record.controls);
  lines.push(
    `  probes_executed: ${totals.executed}`,
    // A non-zero count is a finding whatever the verdicts say (probe-boundary-rule.md).
    `  escaped: ${totals.escaped}`,
    `  evidence: ${evidence}    # computed by security-probe.mjs from the run record`,
  );
  if (record.controls.length === 0) {
    lines.push("  controls: []");
  } else {
    lines.push("  controls:");
    for (const c of record.controls) {
      lines.push(
        `    - name: ${yamlStr(c.name ?? defaultControlName(c))}`,
        `      verdict: ${yamlStr(c.verdict)}`,
        `      severity: ${yamlStr(SEVERITY_BY_VERDICT[c.verdict])}`,
        `      call_site: ${yamlStr(c.call_site)}`,
        `      entry: ${yamlStr(c.entry)}`,
        `      sink: ${yamlStr(c.sink)}`,
        `      reason: ${yamlStr(c.reason)}`,
        `      probes_executed: ${c.executed}`,
        `      escaped: ${c.escaped ?? 0}`,
        ...(Array.isArray(c.shells) && c.shells.length > 0
          ? [`      shells: [${c.shells.join(", ")}]`]
          : []),
        // Which python3 ran a cli: `.py` control (task.215).
        ...(c.interpreter && typeof c.interpreter.version === "string"
          ? [`      interpreter: ${yamlStr(c.interpreter.version)}`]
          : []),
        // A JSON array of strings is a valid YAML flow sequence. Printed so two
        // cli: controls on one script read as two in the block (task.144).
        ...(Array.isArray(c.argv)
          ? [`      argv: ${JSON.stringify(c.argv)}`]
          : []),
        // The slot, for the same reason: two fence: controls on one block are
        // two controls, keyed apart by their slot (TASK-180-002, -021).
        ...(typeof c.slot === "string"
          ? [`      slot: ${yamlStr(c.slot)}`]
          : []),
      );
    }
  }
  return `${lines.join("\n")}\n`;
}

/**
 * An unnamed control's display name: `<sink>:<the text after the FIRST #>` — a
 * fence: heading may itself contain `#` (`C# and F#`) — plus the slot for a
 * fence: control, so two slots on one block read as two (TASK-180-021).
 */
function defaultControlName(c) {
  const entry = String(c.entry ?? "");
  const hash = entry.indexOf("#");
  const tail = hash < 0 ? entry : entry.slice(hash + 1);
  return typeof c.slot === "string"
    ? `${c.sink}:${tail} [${c.slot}]`
    : `${c.sink}:${tail}`;
}

// ── CLI ──────────────────────────────────────────────────────────────────────

/** Flags that take exactly one operand. A missing or flag-shaped operand is exit 2. */
const OPERAND_FLAGS = Object.freeze({
  "--sink": "sink",
  "--entry": "entry",
  "--cases-file": "casesFile",
  "--fake-gh": "fakeGh",
  "--argv": "argv",
  "--args-json": "argsJson",
  "--slot": "slot",
  "--fixture-setup": "fixtureSetup",
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
      "--entry <path#exportName | shell:path | shell-fn:path#function | cli:path | shell-argv:path | fence:doc.md#heading> is required\n",
    );
    return 2;
  }
  if (!opts.sink && !opts.casesFile) {
    process.stderr.write("one of --sink or --cases-file is required\n");
    return 2;
  }

  // `--argv` shape errors are ARGUMENT errors (task.144): exit 2 before any
  // case runs and before any record is touched. runProbeSpec applies the same
  // validator and declines `bad-argv` for a library caller; here the flag is
  // wrong, not the probe, and a wrong flag must not write a record entry.
  const isCliEntry = opts.entry.startsWith(CLI_PREFIX);
  const isShellArgvEntry = opts.entry.startsWith(SHELL_ARGV_PREFIX);
  const takesArgv = isCliEntry || isShellArgvEntry;
  if (takesArgv && opts.argv === undefined) {
    process.stderr.write(
      `bad-argv: the ${isCliEntry ? "cli:" : "shell-argv:"} entry form needs --argv — a JSON array with one "{input}" element\n`,
    );
    return 2;
  }
  if (!takesArgv && opts.argv !== undefined) {
    process.stderr.write(
      "bad-argv: --argv applies to the cli: and shell-argv: entry forms only\n",
    );
    return 2;
  }
  // `--fixture-setup` is the shell-argv: form's (task.181), as `--slot` is the
  // fence: form's: given with any other form it is an argument error.
  if (!isShellArgvEntry && opts.fixtureSetup !== undefined) {
    process.stderr.write(
      "bad-fixture-setup: --fixture-setup applies to the shell-argv: entry form only\n",
    );
    return 2;
  }
  if (takesArgv) {
    const parsed = parseArgvTemplate(opts.argv);
    if (!parsed.ok) {
      process.stderr.write(`bad-argv: ${parsed.detail}\n`);
      return 2;
    }
  }

  // `--slot` is the fence: form's, as `--argv` is the cli: form's (task.180):
  // missing with fence: or given with any other form is an argument error.
  const isFenceEntry = opts.entry.startsWith(FENCE_PREFIX);
  if (isFenceEntry && (opts.slot === undefined || opts.slot === "")) {
    process.stderr.write(
      "bad-slot: the fence: entry form needs --slot <placeholder> — the text in the block each case's input replaces\n",
    );
    return 2;
  }
  if (!isFenceEntry && opts.slot !== undefined) {
    process.stderr.write(
      "bad-slot: --slot applies to the fence: entry form only\n",
    );
    return 2;
  }

  // `--args-json` shape errors are ARGUMENT errors, like --argv's: exit 2 before
  // any case runs and before any record is touched.
  let extraArgs;
  if (opts.argsJson !== undefined) {
    if (
      isCliEntry ||
      isFenceEntry ||
      isShellArgvEntry ||
      opts.entry.startsWith(SHELL_PREFIX) ||
      opts.entry.startsWith(SHELL_FN_PREFIX)
    ) {
      process.stderr.write(
        "bad-args: --args-json applies to the JS entry form (path#export) only\n",
      );
      return 2;
    }
    try {
      extraArgs = JSON.parse(opts.argsJson);
    } catch (e) {
      process.stderr.write(`bad-args: --args-json is not JSON: ${e.message}\n`);
      return 2;
    }
    if (!Array.isArray(extraArgs)) {
      process.stderr.write("bad-args: --args-json must be a JSON array\n");
      return 2;
    }
  }

  // The two refusals below are ARGUMENT errors that a `--json` caller must be
  // able to read: stderr carries the line, and under --json stdout carries
  // `{reason, detail}`. Both run before preflightRecord, so a run the engine
  // cannot set up never reaches the record (obs #201, #211).
  const refuse = (reason, detail) => {
    process.stderr.write(`${reason}: ${detail}\n`);
    if (opts.json) {
      process.stdout.write(`${JSON.stringify({ reason, detail }, null, 2)}\n`);
    }
    return 2;
  };

  let cases;
  if (opts.casesFile) {
    try {
      cases = JSON.parse(readFileSync(opts.casesFile, "utf8"));
    } catch (e) {
      process.stderr.write(`cannot read --cases-file: ${e.message}\n`);
      return 2;
    }
    const bad = validateCases(cases);
    if (bad) return refuse("bad-cases", describeBadCase(bad));
  }

  // The entry must exist before anything runs or is recorded. A resolveEntry
  // failure (bad-entry, outside-repo-root) is left to runProbeSpec, which
  // declines it as before; only the missing path is refused here.
  const repoRoot = opts.repoRoot ? resolve(opts.repoRoot) : defaultRepoRoot();
  const resolvedEntry = resolveEntry(opts.entry, repoRoot);
  if (resolvedEntry.ok && !existsSync(resolvedEntry.entryPath)) {
    return refuse(
      "entry-not-found",
      `${resolvedEntry.entryPath} (repo root ${repoRoot})`,
    );
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
    argv: opts.argv,
    args: extraArgs,
    slot: opts.slot,
    fixtureSetup: opts.fixtureSetup,
    timeoutMs: opts.timeoutMs,
    repoRoot,
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
        onReplace: (prev, next) =>
          process.stderr.write(
            `warning: replaced control ${prev.name ?? "(unnamed)"} — argv ${JSON.stringify(prev.argv)} with ${JSON.stringify(next.argv)}; ` +
              "they share a derived key — pass --name to keep them apart\n",
          ),
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

// Resolve BOTH sides through realpath: `.agents/skills` is a symlink to `../skills` here and in
// symlinked consumer installs, so argv[1] arrives symlinked while import.meta.url is already real.
// Compared raw (`pathToFileURL(argv[1]).href === import.meta.url`), main() never ran through the
// documented path — no output, exit 0, a probe that never executed reading as a clean one
// (obs #126). Same form as finalise-fix-and-recheck.mjs and qa-execute-snippets.mjs; held for the
// whole population by tests/entrypoint-guard-realpath.test.mjs.
function isInvokedDirectly() {
  if (!process.argv[1]) return false;
  try {
    return (
      realpathSync(process.argv[1]) ===
      realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  }
}

if (isInvokedDirectly()) {
  process.exitCode = main();
}
