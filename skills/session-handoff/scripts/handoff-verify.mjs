#!/usr/bin/env node
/**
 * handoff-verify.mjs — re-measure a session handoff before trusting it.
 *
 * The handoff (`.agents/handoff.md` by default) records project state as
 * figures, and every figure carries the command that produced it. This script
 * re-runs those commands and reports, per figure, whether the recorded value
 * still holds. It NEVER writes the handoff — read mode is a measurement, and a
 * measurement that edits its subject is not one.
 *
 * Where a figure's command lives (parse rule, decided at task.110 review):
 *
 *   - Header table `| Check | Command | Result |`: the FIRST backticked span in
 *     the Command cell is the command. A cell with no backticked span (prose
 *     such as "inspect docs/…") is `unverifiable: no command` — never executed.
 *     The figures are the **bold** spans in the Result cell; a Result cell with
 *     no bold span is compared as a whole.
 *   - Prose lines: a trailing `<!-- cmd: … -->` comment on the same line is
 *     that line's command. The figures are the bold spans on the line, unless
 *     the comment carries `; expect: …`, which overrides them. `expect:` takes
 *     plain text (token-subset match) or `/regex/`.
 *
 * Verdicts, per figure:
 *
 *   confirmed     the command ran and every figure still holds
 *   stale         the command ran and a figure has moved — both values reported
 *   unverifiable  the figure could not be checked here; the `detail` says why:
 *                 no command · not on whitelist · shell operator · timeout ·
 *                 command failed (exit N) · could not run · no figure
 *
 * `unverifiable` is a verdict, not an error. "The figure holds" and "I could
 * not check" are the same tick to a reader shown only a tick, and the
 * reassuring reading is the one that gets taken — so they are never merged.
 *
 * How a figure is compared: an `exit N` figure is compared against the exit
 * code. Any other figure is normalised (emphasis stripped, lower-cased,
 * punctuation removed) and every one of its tokens must appear in the
 * normalised output — a token-subset match, not equality on the full output,
 * because a recorded figure is a human paraphrase of a command's output.
 *
 * Commands run only through a read-only whitelist (see `isAllowed`), applied to
 * the first token after an optional `command ` prefix, and any shell operator
 * (`;`, `&&`, `|`, `>`, `$(`, backtick) is refused outright. The whitelist is
 * fail-closed: anything it does not recognise is `unverifiable`, not run. The
 * runner is injectable (`verify(…, { runner })`) so tests exercise every
 * verdict without executing a real command.
 *
 * Output: a per-line table on stdout, or with `--json` a single object:
 *   { reason, file, counts: {confirmed, stale, unverifiable}, lines: […], exitCode }
 *
 * `reason` / exit code:
 *   ok            every figure confirmed                         exit 0
 *   stale         ≥1 figure stale (information, not failure)    exit 0
 *   unverifiable  nothing stale, ≥1 figure could not be checked exit 0 — unless
 *                 NO figure could be checked at all, which is a claim about the
 *                 instrument rather than the handoff                exit 1
 *   no-figures    the file parsed but carries no verifiable figure exit 1
 *   missing       the handoff file does not exist                 exit 1
 *   usage         bad arguments                                   exit 2
 *
 * Emits with `process.exitCode = n; return` — never `process.exit()`, which
 * tears the process down before a piped stdout drains (traps.md).
 */

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Whitelist — per-binary ALLOW-lists
// ---------------------------------------------------------------------------

/**
 * The rule is the same for every binary: a token that starts with `-` must
 * be in that binary's allow-list — as an exact name, or as `name=value` where
 * the entry ends in `=` — and a token that does not must satisfy the binary's
 * positional policy. Anything else is refused. Unknown ⇒ refused is the whole
 * design: git accepts unambiguous long-option PREFIXES (`--del`,
 * `--set-upstream-t=`), npm forwards `--check` to any script, gh has joined
 * flag forms, and a deny-list has to enumerate every one of those; an
 * allow-list refuses them by never having heard of them.
 *
 * Two QA cycles produced this. Gate 1 found the first deny-list porous
 * (`gh api -XPOST`, `node -e`, `git branch -D`); gate 2's refute pass found
 * the patched deny-list porous in the same class (`git ls-remote
 * --upload-pack=<cmd>`, `git remote -v add`, `npm run format --check`,
 * `--del`, `gh api --hostname`). The mechanism was replaced rather than
 * patched a third time. Every shape both gates named is a refused-list test.
 *
 * The command is spawned WITHOUT a shell, so the argv a spec approves is the
 * argv that runs, and there is no quoting to get wrong.
 */

/** Positional policies. */
const POS = Object.freeze({
  NONE: "none", // no positional at all
  PATHS: "paths", // relative paths / refs: no leading `-`, no `/` prefix, no `..` segment
  ANY: "any", // any non-flag token (values of flags, jq filters, patterns)
});

/**
 * Absolute on POSIX (`/x`), UNC (`\\x`, and `//host` by the same rule) or a
 * Windows drive letter (`C:/x`, `C:\\x`). The design refused `//host` as UNC
 * for Windows' sake but accepted `C:\\tmp\\evil.js` on the same platform
 * (gate 6, QA-4); one predicate now answers for every spelling.
 */
function isAbsoluteToken(tok) {
  return (
    tok.startsWith("/") || tok.startsWith("\\") || /^[A-Za-z]:[\\/]/.test(tok)
  );
}

function isSafePositional(tok, policy, { allowAbsolute = false } = {}) {
  if (policy === POS.NONE) return false;
  if (tok.startsWith("-")) return false;
  if (policy === POS.ANY) return !tok.split(/[\\/]/).includes("..");
  if (!allowAbsolute && isAbsoluteToken(tok)) return false;
  return !tok.split(/[\\/]/).includes("..");
}

/**
 * Check `args` against a spec: { flags: [...], flagPattern?: RegExp,
 * positional: POS.*, allowAbsolute?: boolean, requirePositionalWhen?: [...],
 * requireFlag?: [...] }. Entries in `flags` ending in `=` accept a joined
 * value; `flagPattern` admits short-flag clusters (`-rn`) where a binary
 * takes them. Returns true only if every token is accounted for.
 */
/**
 * Flags whose value is a PATTERN, not a path: a leading `/` there is regex
 * syntax (`--test-name-pattern=/select/i`, `--grep=/foo`), so only the `..`
 * segment rule applies to them (gate 4, CR-3). Everything else that takes a
 * value is treated as a path — `--config=`, `--ignore-path=`, `-p=` — and a
 * prettier/eslint config is JavaScript (gate 3, PRB-6).
 */
const PATTERN_FLAGS = new Set([
  "--test-name-pattern",
  "--grep",
  "--match",
  "--jq",
  "--search",
  "--template",
  "--since",
  "--until",
  "--after",
  "--before",
  "--author",
  "--sort",
  "--testNamePattern",
  "--severity",
  "--exclude",
  "--shell",
  "--log-level",
  "--porcelain",
  "--untracked-files",
  "--color",
  "--state",
  "--limit",
  "--label",
  "--assignee",
  "--milestone",
  "--branch",
  "--workflow",
  "--status",
  "--event",
  "--user",
  "--commit",
  "--order",
  "--cache",
  "--header",
  "--preview",
  "--iso-8601",
  "--rfc-3339",
  "--max-old-space-size",
  "--test-concurrency",
  "--max-warnings",
  "--ext",
  "--maxWorkers",
  "--timeout",
  "--head",
  "--base",
  "--short",
  "--abbrev",
  "--max-count",
  "--lines",
  "--bytes",
]);

/** A joined flag value: empty is fine; no `..` segment ever; no absolute path unless the flag takes a pattern or the spec allows one. */
function valueOk(name, v, spec) {
  // A per-flag value pattern is checked FIRST and is a full answer: gh's
  // `--repo` is `[HOST/]OWNER/REPO` and the host part is the egress bug.9
  // executed, so its value is held to OWNER/REPO whether joined or spaced.
  const vp = spec.valuePatterns?.[name];
  if (vp) return vp.test(v);
  if (v === "") return true;
  if (v.split(/[\\/]/).includes("..")) return false;
  // The exemption is global for genuinely pattern-only names, and PER-SPEC for
  // names that are a pattern under one binary and a module to load under
  // another: `--format` is a git pretty-format but an eslint formatter module,
  // `--reporter` is a mocha module. Gate 5 found the global set re-opened the
  // gate-3 invariant for five names (`--format` `--pretty` `--reporter`
  // `--reporters` `--formatter`); a spec now opts its own in.
  if (PATTERN_FLAGS.has(name) || (spec.patternFlags ?? []).includes(name))
    return true;
  if (!spec.allowAbsolute && isAbsoluteToken(v)) return false;
  return true;
}

/**
 * One joined-flag decision for both call sites (gate 4, CR-5): is `a` an
 * allow-listed flag, and if it carries `=value`, is the value acceptable?
 */
function flagTokenOk(a, { flags, withValue, flagPattern, spec }) {
  const eq = a.indexOf("=");
  const name = eq > 0 ? a.slice(0, eq) : a;
  if (eq > 0 && withValue.has(name))
    return valueOk(name, a.slice(eq + 1), spec);
  return flags.has(a) || (flagPattern instanceof RegExp && flagPattern.test(a));
}

function checkArgs(args, spec) {
  const flags = new Set(spec.flags ?? []);
  const withValue = new Set(
    [...flags].filter((f) => f.endsWith("=")).map((f) => f.slice(0, -1)),
  );
  // Flags whose value is the NEXT token (`--repo o/r`, `--workspace /x`).
  // Before this the value fell through as a positional and was judged by
  // the positional policy, not by the flag it belonged to — which is how
  // `-R evil/o/r` reached a host (gate 7, bug.9).
  const valueFlags = new Set(spec.valueFlags ?? []);
  let positionals = 0;
  let passthrough = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (passthrough) {
      // The spec's OWN positional policy, not POS.ANY: `git diff --no-index
      // -- /etc/hosts x` read an outside file through an arm whose policy
      // refuses a leading `/` (gate 7, QA-6).
      if (
        !isSafePositional(a, spec.positional, {
          allowAbsolute: spec.allowAbsolute,
        })
      )
        return false;
      if (spec.positionalPattern && !spec.positionalPattern.test(a))
        return false;
      continue;
    }
    if (valueFlags.has(a)) {
      const v = args[i + 1];
      if (v === undefined || v.startsWith("-")) return false;
      if (!valueOk(a, v, spec)) return false;
      i += 1;
      continue;
    }
    if (a === "--") {
      if (!spec.allowDashDash) return false;
      passthrough = true;
      continue;
    }
    if (a.startsWith("-")) {
      if (
        !flagTokenOk(a, {
          flags,
          withValue,
          flagPattern: spec.flagPattern,
          spec,
        })
      )
        return false;
      continue;
    }
    if (
      !isSafePositional(a, spec.positional, {
        allowAbsolute: spec.allowAbsolute,
      })
    )
      return false;
    if (spec.positionalPattern && !spec.positionalPattern.test(a)) return false;
    positionals += 1;
  }
  if (
    spec.requireFlag &&
    !args.some((a) => spec.requireFlag.includes(a.split("=")[0]))
  )
    return false;
  if (positionals > 0 && spec.requirePositionalWhen) {
    const gate = spec.requirePositionalWhen;
    if (!args.some((a) => gate.includes(a.split("=")[0]))) return false;
  }
  return true;
}

// --- git -------------------------------------------------------------------
// No global options: rest[0] must be a subcommand, so `-C`, `-c`, `--git-dir`
// and `--exec-path` are refused before any subcommand spec is consulted.
const GIT_COMMON_LOG_FLAGS = [
  "--oneline",
  "--format=",
  "--pretty=",
  "--date=",
  "--since=",
  "--until=",
  "--after=",
  "--before=",
  "--author=",
  "--grep=",
  "--max-count=",
  "-n",
  "--name-only",
  "--name-status",
  "--stat",
  "--shortstat",
  "--numstat",
  "--no-merges",
  "--merges",
  "--first-parent",
  "--reverse",
  "--all",
  "--decorate",
  "--no-decorate",
  "--abbrev-commit",
  "--follow",
  "--no-color",
  "-p",
  "--patch",
  "-s",
  "--no-patch",
];
const GIT_PATTERN_FLAGS = ["--format", "--pretty", "--date"];
const GIT_SPECS = Object.freeze({
  log: {
    patternFlags: GIT_PATTERN_FLAGS,
    flags: GIT_COMMON_LOG_FLAGS,
    flagPattern: /^-\d+$/,
    positional: POS.PATHS,
    allowDashDash: true,
  },
  show: {
    patternFlags: GIT_PATTERN_FLAGS,
    flags: GIT_COMMON_LOG_FLAGS,
    positional: POS.PATHS,
    allowDashDash: true,
  },
  status: {
    flags: [
      "--porcelain",
      "--porcelain=",
      "-s",
      "--short",
      "-b",
      "--branch",
      "--untracked-files=",
      "--no-color",
    ],
    positional: POS.PATHS,
    allowDashDash: true,
  },
  "rev-parse": {
    flags: [
      "--short",
      "--short=",
      "--abbrev-ref",
      "--verify",
      "--is-inside-work-tree",
      "--git-dir",
      "--show-toplevel",
      "--symbolic-full-name",
      "--quiet",
      "-q",
    ],
    positional: POS.ANY,
  },
  describe: {
    flags: [
      "--tags",
      "--abbrev=",
      "--always",
      "--long",
      "--exact-match",
      "--dirty",
      "--match=",
    ],
    positional: POS.PATHS,
  },
  "ls-files": {
    flags: [
      "-o",
      "--others",
      "--exclude-standard",
      "-c",
      "--cached",
      "-m",
      "--modified",
      "-d",
      "--deleted",
      "--full-name",
    ],
    positional: POS.PATHS,
    allowDashDash: true,
  },
  // Positionals are a remote NAME or ref pattern — never a URL: a handoff must
  // not point the reader's SSH agent at an arbitrary host (gate 3, PRB-8).
  "ls-remote": {
    // POS.PATHS refuses a leading slash (`//host` is UNC on Windows); the
    // anchor additionally refuses a leading `.`, `*`, `_` or `-`.
    positionalPattern: /^[A-Za-z0-9][A-Za-z0-9._\/*-]*$/,
    flags: [
      "--heads",
      "-h",
      "--tags",
      "-t",
      "--refs",
      "--exit-code",
      "-q",
      "--quiet",
    ],
    positional: POS.PATHS,
  },
  diff: {
    flags: [
      "--stat",
      "--shortstat",
      "--numstat",
      "--name-only",
      "--name-status",
      "--quiet",
      "--cached",
      "--staged",
      "--no-color",
      "-M",
      "--find-renames",
      "--no-index",
    ],
    positional: POS.PATHS,
    allowDashDash: true,
  },
  "rev-list": {
    flags: [
      "--count",
      "--all",
      "--max-count=",
      "-n",
      "--since=",
      "--until=",
      "--no-merges",
      "--first-parent",
    ],
    positional: POS.ANY,
    allowDashDash: true,
  },
  "cat-file": { flags: ["-t", "-p", "-s", "-e"], positional: POS.ANY },
  blame: {
    flags: [
      "-L",
      "--line-porcelain",
      "-p",
      "--porcelain",
      "-w",
      "-s",
      "-e",
      "--date=",
    ],
    patternFlags: GIT_PATTERN_FLAGS,
    positional: POS.PATHS,
    allowDashDash: true,
  },
  shortlog: {
    flags: [
      "-s",
      "-n",
      "-e",
      "--since=",
      "--after=",
      "--until=",
      "--before=",
      "--no-merges",
    ],
    positional: POS.PATHS,
    allowDashDash: true,
  },
  // A positional on branch/tag is a pattern only when a list-selecting flag
  // is present; otherwise it would create. `-v`/`-vv` decorate a listing and
  // do NOT select one (gate 2, CR-4).
  branch: {
    flags: [
      "--list",
      "-l",
      "--show-current",
      "-a",
      "-r",
      "--all",
      "--remotes",
      "-v",
      "-vv",
      "--verbose",
      "--contains",
      "--no-contains",
      "--merged",
      "--no-merged",
      "--points-at",
      "--sort=",
      "--format=",
      "--no-color",
    ],
    positional: POS.ANY,
    requirePositionalWhen: [
      "--list",
      "-l",
      "--contains",
      "--no-contains",
      "--merged",
      "--no-merged",
      "--points-at",
    ],
  },
  tag: {
    flags: [
      "--list",
      "-l",
      "--contains",
      "--no-contains",
      "--merged",
      "--no-merged",
      "--points-at",
      "--sort=",
      "--format=",
      "-n",
    ],
    flagPattern: /^-n\d+$/,
    positional: POS.ANY,
    requirePositionalWhen: [
      "--list",
      "-l",
      "--contains",
      "--no-contains",
      "--merged",
      "--no-merged",
      "--points-at",
    ],
  },
});

function gitRule(rest) {
  const [sub, ...args] = rest;
  if (sub === "remote") {
    // Decorating flags first, then an optional read verb; nothing else.
    const rem = args.filter((a) => a !== "-v" && a !== "--verbose");
    if (rem.length === 0)
      return args.every((a) => a === "-v" || a === "--verbose");
    const [verb, ...more] = rem;
    if (verb === "show") return more.every((a) => isSafePositional(a, POS.ANY));
    if (verb === "get-url")
      return checkArgs(more, {
        flags: ["--push", "--all"],
        positional: POS.ANY,
      });
    return false;
  }
  const spec = GIT_SPECS[sub];
  return spec ? checkArgs(args, spec) : false;
}

// --- gh --------------------------------------------------------------------
// list/view flags are split by whether they take a value. A value-taking flag
// CONSUMES its next token, so what is left over is a genuine positional and can
// be anchored: gate 7 (bug.9) executed `gh pr list -R 127.0.0.1:8099/o/r`
// against a local listener — `-R` was a bare flag and the host-bearing repo
// spec slid through as a POS.ANY positional.
const GH_LIST_VIEW_SWITCHES = [
  "--comments",
  "-c",
  "--draft",
  "--required",
  "--exclude-drafts",
  "--exclude-pre-releases",
  "--name-only",
  "--patch",
];
const GH_LIST_VIEW_VALUE_FLAGS = [
  "--json",
  "--jq",
  "-q",
  "--template",
  "-t",
  "--state",
  "-s",
  "--limit",
  "-L",
  "--head",
  "--base",
  "--label",
  "-l",
  "--author",
  "-A",
  "--assignee",
  "-a",
  "--search",
  "-S",
  "--repo",
  "-R",
  "--milestone",
  "--branch",
  "-b",
  "--status",
  "--event",
  "--user",
  "-u",
  "--commit",
  "--order",
  "--sort",
  "--color",
];
// `-w` is `--workflow <name>` under `run list` and `--web` — open the
// reader's browser — on every `view` (gate 7, QA-5). Admitted only where it
// names a workflow.
const GH_RUN_LIST_VALUE_FLAGS = ["--workflow", "-w"];
// `[HOST/]OWNER/REPO` minus the HOST: exactly two segments, no dot-dot, no
// scheme. A host-bearing value is a request to that host.
const GH_OWNER_REPO = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;
const GH_REPO_VALUE_PATTERNS = Object.freeze({
  "--repo": GH_OWNER_REPO,
  "-R": GH_OWNER_REPO,
});
// A list/view positional is a number, a branch, a tag, a run id or a workflow
// file: no `:` (a URL, a host:port), no `//`. `repo view` takes NAME or
// OWNER/NAME, never HOST/OWNER/NAME.
const GH_POSITIONAL = /^(?!.*\/\/)[A-Za-z0-9._/@#-]+$/;
const GH_REPO_POSITIONAL = /^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)?$/;
const GH_API_FLAGS = [
  "--jq",
  "--jq=",
  "-q",
  "--paginate",
  "--slurp",
  "--cache",
  "--cache=",
  "--template",
  "--template=",
  "-t",
  "-i",
  "--include",
  "--silent",
  "--verbose",
  "-H",
  "--header",
  "--header=",
  "-p",
  "--preview",
  "--preview=",
];

function ghListViewSpec(group, verb) {
  const valueFlags = [
    ...GH_LIST_VIEW_VALUE_FLAGS,
    ...(group === "run" && verb === "list" ? GH_RUN_LIST_VALUE_FLAGS : []),
  ];
  return {
    flags: [...GH_LIST_VIEW_SWITCHES, ...valueFlags.map((f) => `${f}=`)],
    valueFlags,
    valuePatterns: GH_REPO_VALUE_PATTERNS,
    positional: POS.ANY,
    positionalPattern: group === "repo" ? GH_REPO_POSITIONAL : GH_POSITIONAL,
  };
}

function ghRule(rest) {
  const [group, ...args] = rest;
  if (group === "api") {
    const [path0, ...more] = args;
    if (!path0 || path0.startsWith("-")) return false; // the path comes first, always
    // An endpoint containing `://` is taken by gh as a full request URL and
    // sent to that host — the egress `--hostname` was refused for, through
    // another spelling (gate 6, bug.7). A leading `//` is refused for the
    // same reason it is everywhere else. `/user` stays: that is a path.
    if (path0.includes("://") || path0.startsWith("//")) return false;
    if (!isSafePositional(path0, POS.PATHS, { allowAbsolute: true }))
      return false;
    return checkArgs(more, { flags: GH_API_FLAGS, positional: POS.ANY });
  }
  const [verb, ...more] = args;
  if (!["pr", "issue", "repo", "run", "release", "workflow"].includes(group))
    return false;
  if (!["list", "view", "status", "checks", "diff"].includes(verb))
    return false;
  return checkArgs(more, ghListViewSpec(group, verb));
}

// --- interpreters ----------------------------------------------------------
// Flags before the script are allow-listed; the script is one of an EXACT
// list of read-only in-repo entry points, and what follows it is held to
// that entry point's own spec. Until gate 7 any relative script passed and
// everything after it was passed through — the NPM_SCRIPTS discipline applied
// to npm and not to node — so `node node_modules/prettier/bin/prettier.cjs
// --write x` rewrote a file through read mode, and the repo's own writers
// (registry-tick.js, gh-stage.js, tracker-comment.js, generate_catalog.py)
// were one spelling away from the `npm run` forms that refuse them (bug.8).
//
// Each entry names the script by the locations it is installed at — this
// repository's `skills/<skill>/…` and a consumer's `.agents/skills/<skill>/…`
// — so a handoff written in either verifies in both. An engine that ships as
// a bundled copy (`observation-log.js`) is admitted under any skill's
// `references/` and under `shared/resources/`, because the bundle test holds
// every copy byte-identical to the source.
function makeFlagOk(safeFlags, safePattern) {
  const flags = new Set(safeFlags);
  const withValue = new Set(
    safeFlags.filter((f) => f.endsWith("=")).map((f) => f.slice(0, -1)),
  );
  return (a) =>
    flagTokenOk(a, { flags, withValue, flagPattern: safePattern, spec: {} });
}
/**
 * The `--test`-mode rule: no script, so every dash token is the
 * interpreter's own and is held to its allow-list; positionals are relative
 * patterns. One function, used by the `node` arm AND by `npm test -- …`,
 * whose tail is exactly this argv (gate 6, bug.6).
 */
function testModeArgsOk(tokens, flagOk) {
  return tokens.every((t) =>
    t.startsWith("-") ? flagOk(t) : isSafePositional(t, POS.PATHS),
  );
}
const SKILL_ROOT = "(?:\\.agents/)?skills/";
const ENGINE_COPY = `(?:${SKILL_ROOT}[A-Za-z0-9._-]+/references|shared/resources)/`;
const scriptAt = (re) => new RegExp(`^${re}$`);
const NODE_SCRIPTS = Object.freeze([
  {
    // Roadmap selection: pure read of the roadmap and registries. `--lint`
    // and `--batch` are the two shapes the handoff cites.
    path: scriptAt(`${SKILL_ROOT}develop-next/scripts/select-next\\.mjs`),
    spec: {
      flags: ["--lint", "--batch", "--require-touches"],
      valueFlags: ["--roadmap", "--bug-registry", "--task-registry"],
      positional: POS.NONE,
    },
  },
  {
    // The observation log's READ verbs only. `write`, `init`, `set-status`,
    // `archive` and `checkpoint` all write the log; the workspace lives
    // outside the repo, so `--workspace` may be absolute.
    path: scriptAt(`${ENGINE_COPY}observation-log\\.js`),
    spec: {
      flags: ["--json", "--quiet", "--audit", "--workspace=", "--audit-root="],
      valueFlags: ["--workspace", "--audit-root"],
      allowAbsolute: true,
      positional: POS.ANY,
      positionalPattern: /^(doctor|scan|queue|next-id|families)$/,
    },
  },
]);
const PY_SCRIPTS = Object.freeze([
  {
    // Skill validation: reads SKILL.md, writes nothing.
    path: scriptAt(`${SKILL_ROOT}create-skill/scripts/quick_validate\\.py`),
    spec: { positional: POS.PATHS },
  },
]);
function interpreterRule(safeFlags, safePattern, scripts, testModeFlag) {
  const flagOk = makeFlagOk(safeFlags, safePattern);
  return (rest) => {
    let testMode = false;
    for (let i = 0; i < rest.length; i++) {
      const a = rest[i];
      if (a.startsWith("-")) {
        if (!flagOk(a)) return false;
        if (testModeFlag && a === testModeFlag) testMode = true;
        continue;
      }
      if (!isSafePositional(a, POS.PATHS)) return false;
      const after = rest.slice(i + 1);
      // In test mode the positionals are patterns, not a script, and node
      // keeps parsing ITS OWN options after them — `node --test x/ -r pre.js`
      // preloads pre.js (found by the cycle-2 re-probe). So every later dash
      // token is held to the same allow-list.
      if (testMode) return testModeArgsOk(after, flagOk);
      // A real script: node stops parsing at it and the rest is the script's,
      // so the rest is held to THAT script's spec — and only a listed script
      // has one.
      const entry = scripts.find((e) => e.path.test(a));
      return entry ? checkArgs(after, entry.spec) : false;
    }
    return false; // no script: REPL / stdin
  };
}
const NODE_FLAGS = [
  "--test",
  "--test-only",
  "--test-concurrency=",
  "--test-name-pattern=",
  "--enable-source-maps",
  "--no-warnings",
  "--trace-warnings",
  "--max-old-space-size=",
  "--experimental-strip-types",
  "--no-deprecation",
];
// `--test-reporter=<module>` loads code; only the built-in names are accepted.
const NODE_FLAG_PATTERN = /^--test-reporter=(spec|tap|dot|junit|lcov)$/;
const PY_FLAGS = ["-u", "-B", "-O", "-OO", "-q", "-s", "-E", "-I"];
const PY_FLAG_PATTERN = /^-(W|X)[A-Za-z0-9:.,=_-]+$/;

// --- npm / npx -------------------------------------------------------------
// Scripts are named EXACTLY, and none of these takes a tail. `test` has its
// own arm below. `bundle` is admitted only in its check form, as the whole
// argv `run bundle -- --check` — `--check` anywhere else means nothing to npm
// and is forwarded to whatever the script is (gate 2, CR-3).
const NPM_SCRIPTS = new Set([
  "ci",
  "ci:fast",
  "format:check",
  "bundle:check",
  "validate",
  "validate:all",
  "test:platform",
  "test:tracker-access",
  "test:bitbucket-auth",
]);
// Everything after `--` is appended to the LAST command of the script, so the
// tail of `npm test` is `node --test …` and the tail of `format:check` is
// `prettier --check .`. Gate 6 (bug.6) executed both: `-- --write` rewrote the
// tree and `-- -r /tmp/evil.js` preloaded a file, through the one arm that did
// not look at its arguments. So: `test` takes a tail held to the node
// `--test`-mode rule — the SAME rule the `node` arm applies — and no other
// script takes a tail at all, because none of them has a read-only argument
// worth a handoff line.
const NODE_TEST_FLAG_OK = makeFlagOk(NODE_FLAGS, NODE_FLAG_PATTERN);
function npmTestTailOk(more) {
  if (more.length === 0) return true;
  if (more[0] !== "--") return false;
  return testModeArgsOk(more.slice(1), NODE_TEST_FLAG_OK);
}
// `eval:*:cli` and `eval:*:sdk` set DRIVER=claude-* and shell out to a live,
// billed agent run the repo documents as opt-in (gate 6, QA-3).
const EVAL_SCRIPT = /^eval:[a-z0-9][a-z0-9:-]*$/;
const EVAL_LIVE_DRIVER = /:(cli|sdk)$/;
// A bare package name — optional @scope, name, optional @range — and, for
// `view`, a field selector (`version`, `dist-tags.latest`), which the same
// shape covers. A package SPEC may also be a tarball URL, a `git+…` URL, a
// `file:` path or a GitHub shorthand (`owner/repo`), and npm fetches each one:
// gate 7 (bug.9) executed `npm view http://127.0.0.1:8099/pkg.tgz` and
// `npm view git+http://…` against a local listener. No `:`, no `/` outside a
// scope, no leading `.`.
const NPM_PKG_SPEC =
  /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*(@[a-z0-9.^~<>=*|+-]+)?$/i;
function npmRule(rest) {
  const [verb, ...args] = rest;
  if (verb === "test") return npmTestTailOk(args);
  if (verb === "ls" || verb === "view")
    return args.every((a) => NPM_PKG_SPEC.test(a));
  if (verb !== "run") return false;
  const [script, ...more] = args;
  if (!script || script.startsWith("-")) return false;
  if (script === "test") return npmTestTailOk(more);
  if (script === "bundle")
    return more.length === 2 && more[0] === "--" && more[1] === "--check";
  if (EVAL_SCRIPT.test(script))
    return more.length === 0 && !EVAL_LIVE_DRIVER.test(script);
  if (!NPM_SCRIPTS.has(script)) return false;
  return more.length === 0;
}

const NPX_TOOLS = Object.freeze({
  prettier: {
    flags: [
      "--check",
      "--list-different",
      "-l",
      "--config=",
      "--ignore-path=",
      "--no-error-on-unmatched-pattern",
      "--log-level=",
    ],
    positional: POS.PATHS,
  },
  eslint: {
    flags: [
      "--max-warnings=",
      "--format=",
      "-f",
      "--config=",
      "-c",
      "--quiet",
      "--no-eslintrc",
      "--ext=",
    ],
    positional: POS.PATHS,
  },
  tsc: {
    flags: ["--noEmit", "-p", "--project", "--pretty", "--pretty="],
    positional: POS.PATHS,
    requireFlag: ["--noEmit"],
  },
  markdownlint: {
    flags: ["--config=", "-c", "--ignore-path=", "-p", "--quiet", "-q"],
    positional: POS.PATHS,
  },
  "markdownlint-cli2": {
    flags: ["--config=", "--no-globs"],
    positional: POS.PATHS,
  },
  stylelint: {
    flags: [
      "--config=",
      "-c",
      "--ignore-path=",
      "--quiet",
      "-q",
      "--formatter=",
    ],
    positional: POS.PATHS,
  },
  jest: {
    flags: [
      "--ci",
      "--silent",
      "-t",
      "--testNamePattern=",
      "--passWithNoTests",
      "--maxWorkers=",
      "--reporters=",
    ],
    positional: POS.PATHS,
  },
  vitest: {
    flags: [
      "--run",
      "--reporter=",
      "-t",
      "--testNamePattern=",
      "--passWithNoTests",
      "--silent",
    ],
    positional: POS.PATHS,
  },
  mocha: {
    flags: ["--reporter=", "-R", "-t", "--timeout=", "--grep=", "-g"],
    positional: POS.PATHS,
  },
  shellcheck: {
    flags: [
      "--severity=",
      "-S",
      "-f",
      "--format=",
      "-x",
      "-e",
      "--exclude=",
      "--shell=",
      "-s",
      "--version",
    ],
    positional: POS.PATHS,
  },
});
// The runner is non-TTY with CI=1, under which npm 11 installs a missing
// package from the registry without a prompt (gate 7, bug.10: `npx cowsay`
// printed "will be installed" and ran) — and nine of the ten tools here are
// absent from this repo's node_modules, so `npx tsc --noEmit` would fetch and
// run whatever the registry publishes under `tsc`. `--no-install` (npx
// rewrites it to `--yes=false`) makes a missing tool an error instead:
// "npx canceled due to missing packages". It is INJECTED into the argv by
// `isAllowed` rather than required in the handoff, so every handoff already
// written keeps verifying, and the rule refuses to run without it. `--no` is
// NOT an alias: to npx 7+ it is an unknown option that swallows the next
// token as its value, so `npx --no prettier --check .` runs npm with
// `no=prettier` and prettier never starts.
const NPX_NO_INSTALL = "--no-install";
function npxRule(rest) {
  const i = rest[0] === NPX_NO_INSTALL ? 1 : 0;
  const tool = rest[i];
  const spec = NPX_TOOLS[tool];
  if (!spec) return false;
  return checkArgs(rest.slice(i + 1), spec);
}
/** The argv that RUNS for an approved npx command: `--no-install` first, once. */
function npxArgv(argv) {
  return argv[1] === NPX_NO_INSTALL
    ? argv
    : [argv[0], NPX_NO_INSTALL, ...argv.slice(1)];
}

// --- small read-only utilities --------------------------------------------
const UTIL_SPECS = Object.freeze({
  grep: {
    flags: [
      "--count",
      "--include=",
      "--exclude=",
      "--exclude-dir=",
      "--color=",
      "-e",
      "--line-number",
      "--recursive",
    ],
    flagPattern: /^-[cnrRlLiwxvEFoqshHmABC0-9]+$/,
    positional: POS.PATHS,
    allowAbsolute: true,
    allowDashDash: true,
  },
  ls: {
    flags: [],
    flagPattern: /^-[la1dhtrSAFp]+$/,
    positional: POS.PATHS,
    allowAbsolute: true,
    allowDashDash: true,
  },
  wc: {
    flags: [],
    flagPattern: /^-[lcwm]+$/,
    positional: POS.PATHS,
    allowAbsolute: true,
  },
  cat: {
    flags: ["-n"],
    positional: POS.PATHS,
    allowAbsolute: true,
    allowDashDash: true,
  },
  head: {
    flags: ["-n", "-c", "--lines=", "--bytes="],
    flagPattern: /^-\d+$/,
    positional: POS.PATHS,
    allowAbsolute: true,
  },
  tail: {
    flags: ["-n", "-c", "--lines=", "--bytes="],
    flagPattern: /^-\d+$/,
    positional: POS.PATHS,
    allowAbsolute: true,
  }, // no -f: it never returns
  stat: {
    flags: ["-f", "-c", "--format=", "-L"],
    positional: POS.PATHS,
    allowAbsolute: true,
  },
  test: {
    flags: [
      "-f",
      "-d",
      "-e",
      "-s",
      "-r",
      "-x",
      "-L",
      "-z",
      "-n",
      "-eq",
      "-ne",
      "-gt",
      "-ge",
      "-lt",
      "-le",
      "-o",
      "-a",
    ],
    positional: POS.ANY,
  },
  jq: {
    flags: [
      "-r",
      "--raw-output",
      "-c",
      "--compact-output",
      "-e",
      "--exit-status",
      "-n",
      "--null-input",
      "-s",
      "--slurp",
      "-S",
      "--sort-keys",
      "-M",
      "--tab",
      "--indent",
      "--arg",
      "--argjson",
      "-rc",
      "-cr",
      "-re",
      "-er",
    ],
    positional: POS.PATHS,
    allowAbsolute: true,
  },
  shellcheck: NPX_TOOLS.shellcheck,
  find: {
    flags: [
      "-name",
      "-iname",
      "-path",
      "-ipath",
      "-type",
      "-newer",
      "-mtime",
      "-mmin",
      "-size",
      "-maxdepth",
      "-mindepth",
      "-not",
      "-o",
      "-a",
      "-print",
      "-print0",
      "-empty",
      "-prune",
      "-regex",
      "-iregex",
      "!",
    ],
    positional: POS.PATHS,
    allowAbsolute: true,
  },
  // Read-only date: a positional sets the clock on BSD and GNU alike, so only
  // `+format` is allowed as one (gate 2, CR-9).
  date: {
    flags: [
      "-u",
      "--utc",
      "-j",
      "-r",
      "-I",
      "-R",
      "--iso-8601",
      "--iso-8601=",
      "--rfc-3339=",
    ],
    positional: POS.ANY,
  },
});
function utilRule(bin) {
  const spec = UTIL_SPECS[bin];
  return (rest) => {
    if (
      bin === "date" &&
      rest.some((a) => !a.startsWith("-") && !a.startsWith("+"))
    )
      return false;
    if (bin === "find" && rest.some((a) => a === "!"))
      return checkArgs(
        rest.filter((a) => a !== "!"),
        spec,
      );
    return checkArgs(rest, spec);
  };
}

export const WHITELIST = Object.freeze({
  git: gitRule,
  gh: ghRule,
  node: interpreterRule(NODE_FLAGS, NODE_FLAG_PATTERN, NODE_SCRIPTS, "--test"),
  python3: interpreterRule(PY_FLAGS, PY_FLAG_PATTERN, PY_SCRIPTS),
  npm: npmRule,
  npx: npxRule,
  grep: utilRule("grep"),
  ls: utilRule("ls"),
  wc: utilRule("wc"),
  cat: utilRule("cat"),
  head: utilRule("head"),
  tail: utilRule("tail"),
  stat: utilRule("stat"),
  test: utilRule("test"),
  jq: utilRule("jq"),
  shellcheck: utilRule("shellcheck"),
  find: utilRule("find"),
  date: utilRule("date"),
});

/**
 * Binaries for which exit 1 is a measurement, not a failure: grep exits 1 on
 * "no match", test exits 1 on "false". A recorded `**0**` for a grep count is
 * a real figure and must be comparable.
 */
export const EXIT_1_IS_A_RESULT = new Set(["grep", "test"]);

// A newline can never be part of one command. Checked on the raw string.
const RAW_REFUSED = /[\n\r]/;
// Shell operators are refused per TOKEN, after quotes are honoured: a bare
// `|` is a pipe, `'a|b'` is a grep pattern (gate 2, CR-12).
const OPERATOR_TOKEN = /^(\||\|\||&&|;|>|>>|<|<<|&)$/;
const OPERATOR_INSIDE = /(\$\(|`|[<>])/; // a redirect glued to a word is still a redirect
// Nothing expands without a shell: a glob star, a tilde or a variable would
// run LITERALLY and diverge from what the author saw. `?` and `[…]` are the
// bread and butter of jq filters and cannot expand without a shell either.
const SHELL_EXPANSION = /(\*|~|\$)/;

/** Split on whitespace, honouring simple single/double quotes. */
export function tokenize(cmd) {
  const out = [];
  let cur = "";
  let q = null;
  for (const ch of cmd) {
    if (q) {
      if (ch === q) q = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") q = ch;
    else if (/\s/.test(ch)) {
      if (cur) (out.push(cur), (cur = ""));
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * Whitelist decision for one command string.
 * Returns { ok: true, argv } or { ok: false, detail }.
 */
export function isAllowed(cmd, whitelist = WHITELIST) {
  if (typeof cmd !== "string" || !cmd.trim())
    return { ok: false, detail: "no command" };
  if (RAW_REFUSED.test(cmd)) return { ok: false, detail: "shell operator" };
  const argv = tokenize(cmd.trim());
  if (argv[0] === "command") argv.shift();
  if (!argv.length) return { ok: false, detail: "no command" };
  if (
    argv.some(
      (a) =>
        OPERATOR_TOKEN.test(a) ||
        OPERATOR_INSIDE.test(a) ||
        /^[;|&]|[;|&]$/.test(a),
    )
  )
    return { ok: false, detail: "shell operator" };
  if (argv.some((a) => SHELL_EXPANSION.test(a)))
    return {
      ok: false,
      detail: "shell expansion not supported (glob, ~ or $)",
    };
  const bin = argv[0];
  if (bin.includes("/") || bin.includes("\\"))
    return { ok: false, detail: `not on whitelist: ${path.basename(bin)}` };
  const rule = whitelist[bin];
  if (!rule || !rule(argv.slice(1)))
    return { ok: false, detail: `not on whitelist: ${bin}` };
  // The one place the approved argv and the running argv differ, and only by
  // a flag that removes a capability (see npxRule).
  return { ok: true, argv: bin === "npx" ? npxArgv(argv) : argv };
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

const TABLE_ROW = /^\s*\|(.+)\|\s*$/;
const CMD_COMMENT = /<!--\s*cmd:\s*(.*?)\s*-->\s*$/;

function splitCells(line) {
  const m = line.match(TABLE_ROW);
  if (!m) return null;
  // `\|` is an escaped pipe inside a cell, not a cell boundary.
  return m[1].split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, "|").trim());
}

function firstBacktick(s) {
  const m = s.match(/`([^`]+)`/);
  return m ? m[1] : null;
}

/**
 * `expect:` is plain text, or `/regex/flags`. A slash-delimited value that is
 * not a valid regex — `/usr/bin/node` has "flags" of `node` — becomes a figure
 * the verifier marks `unverifiable: bad expect regex`, never a throw: one
 * malformed line must cost one verdict, not the run.
 */
function parseExpect(expect) {
  const rx = expect.match(/^\/(.+)\/([a-z]*)$/);
  if (!rx) return expect;
  try {
    return { regex: new RegExp(rx[1], rx[2] || "") };
  } catch (e) {
    return { badRegex: expect, error: String(e.message || e) };
  }
}

function boldSpans(s) {
  const out = [];
  const re = /\*\*([^*]+)\*\*/g;
  let m;
  while ((m = re.exec(s))) out.push(m[1].trim());
  return out;
}

/**
 * Parse a handoff document into figures.
 * Each figure: { line, source: 'table'|'comment', check, command, figures: [..], recorded }
 * `figures` may contain strings or { regex: RegExp }.
 */
export function parseHandoff(text) {
  const lines = String(text).split(/\r?\n/);
  const out = [];
  let inFence = false;
  let headerCols = null; // column indexes for Check/Command/Result
  let sawHeaderSeparator = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (/^\s*```/.test(raw)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const cells = splitCells(raw);
    if (cells) {
      const lower = cells.map((c) => c.toLowerCase());
      if (
        lower.includes("command") &&
        lower.includes("result") &&
        !headerCols
      ) {
        headerCols = {
          check: lower.indexOf("check"),
          command: lower.indexOf("command"),
          result: lower.indexOf("result"),
        };
        sawHeaderSeparator = false;
        continue;
      }
      if (
        headerCols &&
        !sawHeaderSeparator &&
        cells.every((c) => /^:?-+:?$/.test(c))
      ) {
        sawHeaderSeparator = true;
        continue;
      }
      if (headerCols && sawHeaderSeparator) {
        const check =
          headerCols.check >= 0 ? cells[headerCols.check] : `row ${i + 1}`;
        const cmdCell = cells[headerCols.command] ?? "";
        const resCell = cells[headerCols.result] ?? "";
        const command = firstBacktick(cmdCell);
        const bold = boldSpans(resCell);
        // A Result cell with nothing comparable in it is `no figure`, not a
        // figure of "" that every output trivially fails to contain.
        const figures = (bold.length ? bold : [stripEmphasis(resCell)]).filter(
          (f) => normalise(f) !== "",
        );
        out.push({
          line: i + 1,
          source: "table",
          check,
          command,
          figures,
          recorded: resCell,
        });
        continue;
      }
      continue;
    }
    // Any non-table line — a blank one included, as in Markdown — ends the table.
    if (headerCols) {
      headerCols = null;
      sawHeaderSeparator = false;
    }

    const cm = raw.match(CMD_COMMENT);
    if (cm) {
      const body = cm[1];
      let command = body;
      let expect = null;
      const ex = body.match(/^(.*?);\s*expect:\s*(.*)$/);
      if (ex) {
        command = ex[1].trim();
        expect = ex[2].trim();
      }
      const prose = raw.replace(CMD_COMMENT, "").trim();
      let figures;
      if (expect !== null) {
        figures = [parseExpect(expect)];
      } else {
        figures = boldSpans(prose).filter((f) => normalise(f) !== "");
      }
      out.push({
        line: i + 1,
        source: "comment",
        check:
          prose
            .replace(/[#*_`]/g, "")
            .trim()
            .slice(0, 100) || `line ${i + 1}`,
        command: command.trim() || null,
        figures,
        recorded: expect !== null ? expect : prose,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

export function stripEmphasis(s) {
  return String(s)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

export function normalise(s) {
  return stripEmphasis(s)
    .toLowerCase()
    .replace(/[^a-z0-9\s./-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const EXIT_FIGURE = /^exit\s+(\d+)$/i;

/**
 * Compare one figure against a run result.
 * Returns { holds: boolean, measured: string }.
 */
export function compareFigure(figure, run) {
  const output = `${run.stdout ?? ""}\n${run.stderr ?? ""}`;
  if (figure && typeof figure === "object" && figure.regex) {
    return { holds: figure.regex.test(output), measured: firstLines(output) };
  }
  const f = normalise(figure);
  const ex = f.match(EXIT_FIGURE);
  if (ex) {
    return {
      holds: Number(ex[1]) === run.status,
      measured: `exit ${run.status}`,
    };
  }
  const hay = normalise(output);
  const tokens = f.split(" ").filter(Boolean);
  if (!tokens.length) return { holds: false, measured: firstLines(output) };
  // Every token must appear as a whole token in the output (not a substring of
  // another token): "b13" must not be satisfied by "b130".
  const hayTokens = new Set(hay.split(" "));
  const holds = tokens.every((t) => hayTokens.has(t));
  return { holds, measured: firstLines(output) };
}

/**
 * A compact "what the command said": for JSON output, the top-level scalar
 * fields (so `select-next` reads `status: selected · item.id: T110`); for
 * anything else, the first two lines. Truncated, never the whole output.
 */
function firstLines(output, max = 160) {
  const text = String(output).trim();
  let s = null;
  if (text.startsWith("{")) {
    try {
      const obj = JSON.parse(text);
      const parts = [];
      for (const [k, v] of Object.entries(obj)) {
        if (v === null || ["string", "number", "boolean"].includes(typeof v))
          parts.push(`${k}: ${v}`);
        else if (v && typeof v === "object" && !Array.isArray(v))
          for (const [k2, v2] of Object.entries(v))
            if (
              v2 === null ||
              ["string", "number", "boolean"].includes(typeof v2)
            )
              parts.push(`${k}.${k2}: ${v2}`);
        if (parts.length >= 6) break;
      }
      if (parts.length) s = parts.slice(0, 6).join(" · ");
    } catch {
      /* not JSON after all — fall through to the line form */
    }
  }
  if (s === null) s = text.split(/\r?\n/).slice(0, 2).join(" ⏎ ");
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

// ---------------------------------------------------------------------------
// Running
// ---------------------------------------------------------------------------

/**
 * The child currently running, if any — so a SIGINT/SIGTERM handler can kill
 * its process group before the verifier itself dies (gate 2, CR-7). Exported
 * for the CLI; tests inject their own runner and never set it.
 */
export const activeChild = { pid: null };

function killGroup(pid) {
  try {
    process.kill(-pid, "SIGKILL"); // the group, not the leader alone
  } catch {
    /* already gone */
  }
}

/**
 * Default runner: the argv is spawned DIRECTLY — no shell. That is what makes
 * the whitelist meaningful (the argv the rule saw is the argv that runs), it
 * is why no `command` prefix is needed (a shell-function `node` from nvm is
 * only interposed by a shell, and there is none — traps.md), and it is what
 * makes a timeout kill the command itself rather than a wrapper around it.
 *
 * The child is its own process group (`detached`), so on timeout — or on the
 * verifier being interrupted — the whole group is killed: `npm test` and every
 * worker it forked, not just the pid Node knows about. The spawn is ASYNC so
 * that a signal handler can actually run while the child is alive; gate 1
 * found the bash wrapper left a ten-minute suite running after `timeout`, and
 * gate 2 found the synchronous detached child survived Ctrl-C.
 *
 * Resolves { status, stdout, stderr, timedOut, error, truncated } — `truncated`
 * is true when collected output hit the cap, and verify() then reports the
 * figure `unverifiable` rather than compare against a partial stream.
 */
export function defaultRunner(argv, { cwd, timeoutMs }) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(argv[0], argv.slice(1), {
        cwd,
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, CI: process.env.CI ?? "1" },
      });
    } catch (e) {
      resolve({
        status: null,
        stdout: "",
        stderr: "",
        timedOut: false,
        error: String(e.message || e),
        truncated: false,
      });
      return;
    }
    activeChild.pid = child.pid;
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let spawnError = null;
    const timer = setTimeout(() => {
      timedOut = true;
      killGroup(child.pid);
    }, timeoutMs);
    // Bounded: a chatty command must not grow two strings without limit
    // (gate 3, PRB-7). The tail is what a figure is compared against anyway.
    const CAP = 16 * 1024 * 1024; // characters (UTF-16 units) after setEncoding, not bytes
    let truncated = false;
    const take = (buf, d) => {
      if (buf.length >= CAP) {
        truncated = true;
        return buf;
      }
      return buf + d;
    };
    // Decode at the stream so a multi-byte glyph split across chunks is not
    // mangled (gate 4, CR-4).
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (d) => (stdout = take(stdout, d)));
    child.stderr.on("data", (d) => (stderr = take(stderr, d)));
    child.on("error", (e) => (spawnError = String(e.message || e)));
    child.on("close", (code) => {
      clearTimeout(timer);
      if (activeChild.pid === child.pid) activeChild.pid = null;
      if (timedOut) killGroup(child.pid); // stragglers that forked after the first kill
      resolve({
        status: code,
        stdout,
        stderr,
        truncated, // verify() reports this as unverifiable — a partial stream is not a measurement (gate 4, CR-2)
        timedOut,
        error: spawnError && !timedOut ? spawnError : null,
      });
    });
  });
}

/**
 * Verify parsed figures. Pure apart from the injected runner.
 * Returns { reason, counts, lines, exitCode }.
 */
export async function verify(figures, opts = {}) {
  const runner = opts.runner ?? defaultRunner;
  const whitelist = opts.whitelist ?? WHITELIST;
  const cwd = opts.cwd ?? process.cwd();
  const timeoutMs = (opts.timeoutSeconds ?? 60) * 1000;

  const lines = [];
  for (const fig of figures) {
    const base = {
      line: fig.line,
      check: fig.check,
      command: fig.command,
      recorded: fig.recorded,
    };
    if (!fig.command) {
      lines.push({
        ...base,
        verdict: "unverifiable",
        detail: "no command",
        measured: null,
      });
      continue;
    }
    if (!fig.figures.length) {
      lines.push({
        ...base,
        verdict: "unverifiable",
        detail: "no figure",
        measured: null,
      });
      continue;
    }
    const bad = fig.figures.find(
      (f) => f && typeof f === "object" && f.badRegex,
    );
    if (bad) {
      lines.push({
        ...base,
        verdict: "unverifiable",
        detail: `bad expect regex: ${bad.error}`,
        measured: null,
      });
      continue;
    }
    const allowed = isAllowed(fig.command, whitelist);
    if (!allowed.ok) {
      lines.push({
        ...base,
        verdict: "unverifiable",
        detail: allowed.detail,
        measured: null,
      });
      continue;
    }
    let run;
    try {
      run = await runner(allowed.argv, { cwd, timeoutMs });
    } catch (e) {
      lines.push({
        ...base,
        verdict: "unverifiable",
        detail: `could not run: ${e.message || e}`,
        measured: null,
      });
      continue;
    }
    if (run.timedOut) {
      lines.push({
        ...base,
        verdict: "unverifiable",
        detail: `timeout (${timeoutMs / 1000}s)`,
        measured: null,
      });
      continue;
    }
    if (run.truncated) {
      lines.push({
        ...base,
        verdict: "unverifiable",
        detail:
          "output truncated (more than 16 M characters) — a partial stream is not a measurement",
        measured: null,
      });
      continue;
    }
    if (run.error) {
      lines.push({
        ...base,
        verdict: "unverifiable",
        detail: `could not run: ${run.error}`,
        measured: null,
      });
      continue;
    }
    const isExitFigure = fig.figures.some(
      (f) => typeof f === "string" && EXIT_FIGURE.test(normalise(f)),
    );
    const exitIsResult =
      run.status === 1 && EXIT_1_IS_A_RESULT.has(allowed.argv[0]);
    if (run.status !== 0 && !isExitFigure && !exitIsResult) {
      lines.push({
        ...base,
        verdict: "unverifiable",
        detail: `command failed (exit ${run.status})`,
        measured: firstLines(`${run.stdout}\n${run.stderr}`),
      });
      continue;
    }
    const results = fig.figures.map((f) => ({
      figure: f.regex ? String(f.regex) : f,
      ...compareFigure(f, run),
    }));
    const moved = results.filter((r) => !r.holds);
    if (moved.length) {
      lines.push({
        ...base,
        verdict: "stale",
        detail: `moved: ${moved.map((m) => m.figure).join(", ")}`,
        measured: moved[0].measured,
      });
    } else {
      lines.push({
        ...base,
        verdict: "confirmed",
        detail: null,
        measured: results[0].measured,
      });
    }
  }

  const counts = { confirmed: 0, stale: 0, unverifiable: 0 };
  for (const l of lines) counts[l.verdict] += 1;

  let reason;
  let exitCode = 0;
  if (!lines.length) {
    reason = "no-figures";
    exitCode = 1;
  } else if (counts.stale) reason = "stale";
  else if (counts.unverifiable) {
    reason = "unverifiable";
    // Nothing could be checked: that is a claim about the instrument, not the
    // handoff, and it is the one answer nobody questions — so it trips.
    if (!counts.confirmed) exitCode = 1;
  } else reason = "ok";

  return { reason, counts, lines, exitCode };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export function parseArgs(argv) {
  const opts = {
    file: ".agents/handoff.md",
    json: false,
    timeoutSeconds: 60,
    cwd: null,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (a === "--help" || a === "-h") opts.help = true;
    else if (a === "--timeout") {
      const v = Number(argv[++i]);
      if (!Number.isFinite(v) || v <= 0)
        return { error: `--timeout needs a positive number of seconds` };
      opts.timeoutSeconds = v;
    } else if (a === "--cwd") {
      if (!argv[i + 1]) return { error: `--cwd needs a directory` };
      opts.cwd = argv[++i];
    } else if (a.startsWith("--")) return { error: `unknown flag: ${a}` };
    else opts.file = a;
  }
  return opts;
}

export const USAGE = `usage: handoff-verify.mjs [path] [--json] [--timeout <seconds>] [--cwd <dir>]

Re-measures every figure in a session handoff (default .agents/handoff.md) and
reports each as confirmed / stale / unverifiable. Never writes the handoff.`;

function renderTable(result, file) {
  const rows = result.lines.map((l) => {
    const mark =
      l.verdict === "confirmed" ? "✓" : l.verdict === "stale" ? "✗" : "?";
    const tail =
      l.verdict === "stale"
        ? `${l.detail} → now: ${l.measured}`
        : l.verdict === "unverifiable"
          ? l.detail
          : "";
    return `${mark} ${l.verdict.padEnd(12)} ${String(l.line).padStart(4)}  ${l.check}${tail ? `  — ${tail}` : ""}`;
  });
  const c = result.counts;
  return [
    `handoff-verify: ${file}`,
    ...rows,
    `${c.confirmed} confirmed · ${c.stale} stale · ${c.unverifiable} unverifiable → ${result.reason}`,
  ].join("\n");
}

export async function run(argv, io = {}) {
  const readFile = io.readFile ?? ((p) => fs.readFileSync(p, "utf8"));
  const exists = io.exists ?? ((p) => fs.existsSync(p));
  const opts = parseArgs(argv);
  if (opts.error) return { reason: "usage", detail: opts.error, exitCode: 2 };
  if (opts.help) return { reason: "usage", detail: USAGE, exitCode: 0 };
  const cwd = opts.cwd ?? process.cwd();
  const file = path.resolve(cwd, opts.file);
  if (!exists(file))
    return { reason: "missing", file, exitCode: 1, json: opts.json };
  const figures = parseHandoff(readFile(file));
  const result = await verify(figures, {
    runner: io.runner,
    cwd,
    timeoutSeconds: opts.timeoutSeconds,
  });
  return { ...result, file, json: opts.json };
}

function isInvokedDirectly() {
  try {
    return fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isInvokedDirectly()) {
  // An interrupted verifier must not leave its command running (gate 2, CR-7):
  // kill the child's process group, then die by the same signal.
  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, () => {
      if (activeChild.pid) killGroup(activeChild.pid);
      process.exitCode = sig === "SIGINT" ? 130 : 143;
      process.exit(); // deliberate: nothing is left to drain after a signal
    });
  }
  const r = await run(process.argv.slice(2));
  if (r.reason === "usage") {
    process.stderr.write(`${r.detail}\n`);
  } else if (r.json) {
    // Every non-usage outcome is one JSON object on stdout — `missing` included,
    // so a caller reading the stream never has to fall back to stderr.
    const { json, ...rest } = r;
    process.stdout.write(JSON.stringify(rest, null, 2) + "\n");
  } else if (r.reason === "missing") {
    process.stderr.write(`handoff-verify: ${r.file} does not exist\n`);
  } else {
    process.stdout.write(renderTable(r, r.file) + "\n");
  }
  process.exitCode = r.exitCode;
}
