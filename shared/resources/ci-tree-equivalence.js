#!/usr/bin/env node
/**
 * ci-tree-equivalence — decide whether a PENDING (or empty) CI reading is satisfied because every
 * file changed since a green ancestor is documentation.
 *
 * The develop pipelines wait for a full CI run at three points after the code is final: /finalise
 * reading 1, /finalise reading 2, and the merge step of /develop-next and /develop-batch. The
 * commits those waits sit on are usually docs only, so the code tree is identical to one CI already
 * passed. This engine is the ONE definition of when that is enough. A reading is satisfied when:
 *
 *   1. the head's rollup is PENDING or NONE, and
 *   2. a first-parent ancestor of the head has a green rollup of its OWN, and
 *   3. every file changed between that ancestor and the head matches the docs patterns, and
 *   4. the configured local check (ci.docsOnly.checkCommand), if any, passes.
 *
 * The caller then records `SUCCESS (tree-equivalent to <sha12>)` — never plain `SUCCESS`, so the
 * record still says which commit CI actually verified.
 *
 * FAILS CLOSED. Exit 0 means exactly one thing: `tree-equivalent`. Every other answer — including
 * a throw — exits 1, so a shell `if` cannot round a "no" up to green. This is the opposite of
 * gh-stage.js, which exits 0 on everything because a skipped board move must not kill a run; here a
 * wrong 0 accepts unverified code.
 *
 * Usage:
 *   ci-tree-equivalence.js --head-rollup PENDING|NONE|... [--head <sha>] [--pr <n>] [--json]
 *                          [--workspace-root <dir>] [--platform github|bitbucket]
 *
 * Exit codes:
 *   0  tree-equivalent
 *   1  every other answer: not-applicable, disabled, code-changed, no-green-ancestor,
 *      unverifiable, check-failed (and an unexpected throw, reported as unverifiable)
 *   2  usage error — including a malformed ci.docsOnly block, which never falls back silently
 *
 * `--json` prints { reason, greenSha, changed, checkExit, pr, detail, reads } and nothing else on stdout.
 * `--pr` is recorded in that payload for the caller's log; no decision reads it.
 * The local check's own output goes to stderr for that reason.
 *
 * Config (skills-config.yaml, every key optional):
 *   ci:
 *     docsOnly:
 *       enabled: true                 # false restores a full CI wait everywhere
 *       patterns:                     # BLOCK list: the YAML subset reads an inline [..] as a string
 *         - "**\/*.md"                # `**\/*.md`, not `*.md`: `*` does not cross `/`
 *         - "docs/**"
 *       checkCommand: ""              # optional local check, run from the repo root
 *
 * Depends on glob-match.js, yaml-subset.js and bb-auth.js and nothing else in shared/ — each
 * skill that bundles this file pays for those three, not for a QA or a PR-comment engine.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");

const { matchesAnyGlob, normalisePath } = require("./glob-match.js");
const { parseYamlSubset } = require("./yaml-subset.js");
const { bbAuthHeader, bbSlug } = require("./bb-auth.js");

const REASONS = Object.freeze({
  TREE_EQUIVALENT: "tree-equivalent",
  NOT_APPLICABLE: "not-applicable",
  DISABLED: "disabled",
  CODE_CHANGED: "code-changed",
  NO_GREEN_ANCESTOR: "no-green-ancestor",
  UNVERIFIABLE: "unverifiable",
  CHECK_FAILED: "check-failed",
});

// `**/*.md`, not `*.md`: `*` does not cross `/` in glob-match.js, so the literal `*.md` would match
// only repository-root markdown (measured, task.172).
const DEFAULT_PATTERNS = Object.freeze(["**/*.md", "docs/**"]);
const MAX_ANCESTORS = 20;
const DEFAULT_CHECK_TIMEOUT_SECONDS = 1500; // matches /finalise's FINALISE_CI_MAX_WAIT default
const DOCS_ONLY_KEYS = Object.freeze([
  "enabled",
  "patterns",
  "checkCommand",
  "checkTimeoutSeconds",
]);
const BB_API = "https://api.bitbucket.org/2.0";
const BB_MAX_PAGES = 5;

const USAGE =
  "usage: ci-tree-equivalence.js --head-rollup <PENDING|NONE|...> [--head <sha>] [--pr <n>] " +
  "[--json] [--workspace-root <dir>] [--platform github|bitbucket]";

// ---------------------------------------------------------------------------
// Pure core
// ---------------------------------------------------------------------------

const val = async (x) => (typeof x === "function" ? x() : x);

/** The file this rule is configured in. Its basename, wherever it sits in the tree. */
const CONFIG_BASENAME = "skills-config.yaml";

/**
 * Is a changed path documentation? Three things make it NOT, whatever `patterns` say:
 *
 *  - It is the rule's own configuration file. `readConfig` reads the head being judged, so a commit
 *    that changed code and also widened `ci.docsOnly.patterns` (or set `checkCommand` to `true`)
 *    would otherwise decide its own diff (CR-1, task.172 QA cycle 1). A change to the configuration
 *    is never a docs change; the owner's committed config still applies to every other path.
 *  - It is not already in the form the matcher compares against. `normalisePath` was written for
 *    hand-typed gate values: it trims, strips a leading `/` and turns `\` into `/`. Git emits paths
 *    verbatim, so a file literally named `docs\evil.js` or ` docs/x.js` must not be normalised into
 *    `docs/**` (CR-4).
 *  - It matches none of the patterns.
 */
function isDocsPath(file, globs) {
  if (typeof file !== "string" || file === "") return false;
  if (file.split("/").pop() === CONFIG_BASENAME) return false;
  if (normalisePath(file) !== file) return false;
  return matchesAnyGlob(file, globs);
}

/**
 * Pure apart from the thunks it is handed. `ancestors` is first-parent order, nearest first:
 *
 *   [{ sha, changed: string[] | null | () => …, rollup: "SUCCESS"|… | () => … }]
 *
 * `changed` is the diff ancestor..head, and `null` means it could not be computed — which is
 * `unverifiable`, never docs-only (the null-vs-[] rule: "could not compute" and "nothing changed"
 * are different answers and must not collapse). Either field may be a thunk, evaluated lazily and
 * at most once per ancestor, so the CLI never reads an ancestor's checks after the walk has
 * already stopped on a code path — which is also what bounds the reads at
 * 1 + (docs-only commits on top of the green one).
 *
 * The decision order is fixed and the test table follows it row by row.
 */
async function classifyTreeEquivalence({
  headRollup,
  ancestors,
  patterns,
  enabled,
}) {
  const reads = { diffs: 0, rollups: 0 };
  const done = (reason, extra) => ({
    reason,
    greenSha: null,
    changed: [],
    detail: "",
    reads,
    ...extra,
  });

  if (enabled === false) {
    return done(REASONS.DISABLED, {
      detail: "ci.docsOnly.enabled is false",
    });
  }
  const head = String(headRollup == null ? "" : headRollup).toUpperCase();
  if (head !== "PENDING" && head !== "NONE") {
    return done(REASONS.NOT_APPLICABLE, {
      detail: `head rollup is ${head || "absent"}; only PENDING and NONE are candidates`,
    });
  }
  const globs = Array.isArray(patterns) ? patterns : DEFAULT_PATTERNS;
  const list = Array.isArray(ancestors) ? ancestors : [];

  for (const a of list) {
    reads.diffs += 1;
    const changed = await val(a.changed);
    if (!Array.isArray(changed)) {
      return done(REASONS.UNVERIFIABLE, {
        detail: `the diff ${a.sha}..head could not be computed`,
      });
    }
    const code = changed.find((f) => !isDocsPath(f, globs));
    if (code !== undefined) {
      // Older ancestors only add to the diff, so the walk stops here.
      return done(REASONS.CODE_CHANGED, {
        changed,
        detail: `${code} is not a docs path (changed since ${a.sha})`,
      });
    }
    reads.rollups += 1;
    const rollup = String((await val(a.rollup)) || "UNKNOWN").toUpperCase();
    if (rollup === "SUCCESS") {
      return done(REASONS.TREE_EQUIVALENT, {
        greenSha: a.sha,
        changed,
        detail: `${changed.length} docs-only path(s) since green ${a.sha}`,
      });
    }
    if (rollup === "UNKNOWN") {
      return done(REASONS.UNVERIFIABLE, {
        changed,
        detail: `the checks of ${a.sha} could not be read`,
      });
    }
    if (rollup === "FAILURE") {
      // The delta from this ancestor to the head is docs only, so the head inherits whatever this
      // commit's CI found red (a link checker, a test that reads docs/). Walking past it to an older
      // green commit would green a head on a state CI has already rejected (CR2-1, task.172 QA
      // cycle 2). CANCELLED is different and is walked past: cancel-in-progress cancels the run of
      // every superseded push, so a cancelled ancestor says nothing about the content.
      return done(REASONS.NO_GREEN_ANCESTOR, {
        changed,
        detail: `${a.sha} is red (FAILURE) and the head differs from it only by docs, so the head inherits that red; not walking past it to an older green commit`,
      });
    }
    // PENDING / NONE / CANCELLED: not green and not red. An older green ancestor is still valid
    // evidence for the same code tree, so keep walking.
  }
  return done(REASONS.NO_GREEN_ANCESTOR, {
    detail: `no green ancestor within the first ${MAX_ANCESTORS} first-parent commits`,
  });
}

/** The exit code a reason maps to: 0 for tree-equivalent and for nothing else. */
function exitCodeFor(reason) {
  return reason === REASONS.TREE_EQUIVALENT ? 0 : 1;
}

// ---------------------------------------------------------------------------
// Rollup reduction — the Step 6 semantics, applied to one commit's own checks
// ---------------------------------------------------------------------------

/**
 * Reduce one commit's checks to NONE | FAILURE | PENDING | CANCELLED | SUCCESS.
 * A CheckRun is decided only at `completed`. For an ANCESTOR, which is the whole evidence, green means
 * every check ran and succeeded: zero checks, or ANY skipped or neutral check, is NONE and never green.
 * This is stricter than the head reduction in skills/finalise/SKILL.md Step 6 (where a skipped job is
 * not a red), on purpose: a paths-filtered workflow whose "changes" job succeeds while its test jobs
 * are skipped would otherwise let a docs-only ancestor sitting on unverified code green a head
 * (CR2-2, task.172 QA cycle 2). Narrowing the claim here beats guessing which skips are vacuous.
 */
function reduceChecks({ checkRuns = [], statuses = [] }) {
  const states = [];
  for (const r of checkRuns) {
    const st = String((r && r.status) || "").toLowerCase();
    if (st !== "completed") {
      states.push("PENDING");
      continue;
    }
    const c = String((r && r.conclusion) || "").toLowerCase();
    if (c === "success") states.push("SUCCESS");
    else if (c === "skipped" || c === "neutral") states.push("SKIPPED");
    else if (c === "cancelled") states.push("CANCELLED");
    else if (c === "") states.push("PENDING");
    else states.push("FAILURE"); // failure, timed_out, startup_failure, action_required, stale…
  }
  for (const s of statuses) {
    const c = String((s && s.state) || "").toLowerCase();
    if (c === "success") states.push("SUCCESS");
    else if (c === "pending" || c === "") states.push("PENDING");
    else states.push("FAILURE"); // failure, error
  }
  if (states.length === 0) return "NONE";
  if (states.includes("FAILURE")) return "FAILURE";
  if (states.includes("PENDING")) return "PENDING";
  if (states.includes("CANCELLED")) return "CANCELLED";
  // Only successes: green. Any skipped/neutral check: not evidence (see above). The head's own
  // reading in /finalise Step 6 is unchanged.
  return states.includes("SKIPPED") ? "NONE" : "SUCCESS";
}

/** Bitbucket commit statuses → the same vocabulary. Empty list is NONE, never green. */
function reduceBitbucketStatuses(values) {
  if (!Array.isArray(values) || values.length === 0) return "NONE";
  const st = values.map((v) => String((v && v.state) || "").toUpperCase());
  if (st.includes("FAILED")) return "FAILURE";
  if (st.includes("INPROGRESS") || st.includes("")) return "PENDING";
  if (st.includes("STOPPED")) return "CANCELLED";
  return st.every((s) => s === "SUCCESSFUL") ? "SUCCESS" : "PENDING";
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

class UsageError extends Error {}

/**
 * Read ci.docsOnly from <root>/skills-config.yaml. A missing file or block gives the defaults. A
 * value of the wrong type is a UsageError naming the key — never a silent fall back to the
 * defaults, because a typo'd `patterns` that quietly widened to the default is a rule applied to
 * files its owner did not choose.
 */
function readConfig(root) {
  const cfg = {
    enabled: true,
    patterns: [...DEFAULT_PATTERNS],
    checkCommand: "",
    checkTimeoutSeconds: DEFAULT_CHECK_TIMEOUT_SECONDS,
  };
  let text;
  try {
    text = fs.readFileSync(path.join(root, "skills-config.yaml"), "utf8");
  } catch (e) {
    if (e && e.code === "ENOENT") return cfg;
    throw new UsageError(`skills-config.yaml could not be read: ${e.message}`);
  }
  const ci = (parseYamlSubset(text) || {}).ci || {};
  // `ci.docsonly:` would leave the rule ON for an owner who meant to configure it (CR2-4).
  for (const k of Object.keys(ci)) {
    if (k !== "docsOnly" && k.toLowerCase() === "docsonly") {
      throw new UsageError(
        `ci.${k} looks like ci.docsOnly; the key is case-sensitive`,
      );
    }
  }
  const block = ci.docsOnly;
  if (block === undefined || block === null) return cfg;
  if (typeof block !== "object" || Array.isArray(block)) {
    throw new UsageError("ci.docsOnly must be a mapping");
  }
  // An unknown key is a typo with a consequence (`checkcommand:` drops the safety net, a misspelled
  // `patterns:` widens to the default), so it is refused, not ignored (CR2-4, task.172 QA cycle 2).
  const unknown = Object.keys(block).filter((k) => !DOCS_ONLY_KEYS.includes(k));
  if (unknown.length > 0) {
    throw new UsageError(
      `ci.docsOnly has unknown key(s): ${unknown.join(", ")} (known: ${DOCS_ONLY_KEYS.join(", ")})`,
    );
  }
  if ("enabled" in block) {
    if (typeof block.enabled !== "boolean") {
      throw new UsageError("ci.docsOnly.enabled must be true or false");
    }
    cfg.enabled = block.enabled;
  }
  if ("patterns" in block) {
    const p = block.patterns;
    if (!Array.isArray(p) || p.some((g) => typeof g !== "string" || !g)) {
      throw new UsageError(
        "ci.docsOnly.patterns must be a block list of non-empty globs " +
          '(`- "docs/**"` on its own lines; the YAML subset reads an inline [..] as a string)',
      );
    }
    cfg.patterns = p;
  }
  if ("checkCommand" in block) {
    if (typeof block.checkCommand !== "string") {
      throw new UsageError("ci.docsOnly.checkCommand must be a string");
    }
    cfg.checkCommand = block.checkCommand.trim();
  }
  if ("checkTimeoutSeconds" in block) {
    const t = block.checkTimeoutSeconds;
    if (!Number.isInteger(t) || t <= 0) {
      throw new UsageError(
        "ci.docsOnly.checkTimeoutSeconds must be a positive integer",
      );
    }
    cfg.checkTimeoutSeconds = t;
  }
  return cfg;
}

// ---------------------------------------------------------------------------
// I/O adapters (injectable, so tests need no network and no real gh)
// ---------------------------------------------------------------------------

const EXEC_OPTS = { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] };

/** The repository root of `cwd`, or `cwd` itself outside a repository. */
function repoRoot(exec, cwd) {
  try {
    const top = String(
      exec("git", ["rev-parse", "--show-toplevel"], { ...EXEC_OPTS, cwd }),
    ).trim();
    return top || cwd;
  } catch {
    return cwd;
  }
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

/** First-parent ancestors of `head`, nearest first, at most MAX_ANCESTORS. Throws on failure. */
function listAncestors(exec, cwd, head) {
  // Ask for one more than we need and drop `head` itself: `<head>^` would fail on a root commit,
  // and a shallow clone that lacks the parents surfaces as a throw below instead of an empty list.
  const out = exec(
    "git",
    ["rev-list", "--first-parent", `--max-count=${MAX_ANCESTORS + 1}`, head],
    { ...EXEC_OPTS, cwd },
  );
  return String(out)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(1);
}

/**
 * Paths changed between `sha` and `head`, or null when git cannot say. Three flags are load-bearing:
 * `--no-renames` (with rename detection a `src/a.ts` → `docs/a.md` move lists only the new name, which
 * reads as docs-only while it deleted code), `-z` (odd file names stay intact) and
 * `--ignore-submodules=none` (a `diff.ignoreSubmodules=all` in the repository config would otherwise
 * report a pointer bump as an empty delta). A gitlink (mode 160000) is a submodule pointer, which is
 * code whatever directory it sits in, so it is returned as `:gitlink:<path>`, which no docs pattern
 * matches (CR2-5, task.172 QA cycle 2).
 */
function diffNames(exec, cwd, sha, head) {
  try {
    const out = exec(
      "git",
      [
        "diff",
        "--raw",
        "--no-renames",
        "--ignore-submodules=none",
        "-z",
        sha,
        head,
      ],
      { ...EXEC_OPTS, cwd },
    );
    const tokens = String(out).split("\0");
    const names = [];
    for (let i = 0; i < tokens.length; i += 1) {
      const meta = tokens[i];
      if (!meta.startsWith(":")) continue;
      const [oldMode, newMode] = meta.slice(1).split(" ");
      const file = tokens[i + 1];
      i += 1;
      if (file === undefined || file === "") return null;
      names.push(
        oldMode === "160000" || newMode === "160000"
          ? `:gitlink:${file}`
          : file,
      );
    }
    return names;
  } catch {
    return null;
  }
}

/** GitHub: the commit's OWN checks, not "any successful run on the branch". */
function githubRollup(exec, cwd, sha) {
  try {
    const jsonLines = (args, jq) =>
      String(exec("gh", [...args, "--jq", jq], { ...EXEC_OPTS, cwd }))
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => JSON.parse(l));
    const checkRuns = jsonLines(
      ["api", `repos/{owner}/{repo}/commits/${sha}/check-runs`, "--paginate"],
      ".check_runs[] | {status, conclusion}",
    );
    const statuses = jsonLines(
      ["api", `repos/{owner}/{repo}/commits/${sha}/status`, "--paginate"],
      ".statuses[] | {state}",
    );
    return reduceChecks({ checkRuns, statuses });
  } catch {
    return "UNKNOWN";
  }
}

/** Bitbucket: /commit/{sha}/statuses. A 403 or any non-200 is UNKNOWN, never "no CI". */
async function bitbucketRollup({ exec, cwd, env, fetchImpl }, sha) {
  try {
    const auth = bbAuthHeader(env);
    if (auth.scheme === "none") return "UNKNOWN";
    const { workspace, repo } = bbSlug((cmd, args, opts) =>
      exec(cmd, args, { ...opts, cwd }),
    );
    const doFetch = fetchImpl || globalThis.fetch;
    let url = `${BB_API}/repositories/${workspace}/${repo}/commit/${sha}/statuses?pagelen=100`;
    const values = [];
    for (let page = 0; url && page < BB_MAX_PAGES; page += 1) {
      const res = await doFetch(url, {
        headers: { Authorization: auth.header },
      });
      if (!res || res.status !== 200) return "UNKNOWN";
      const body = await res.json();
      values.push(...(body.values || []));
      url = body.next || "";
    }
    if (url) return "UNKNOWN"; // more pages than we read: do not decide on a partial list
    return reduceBitbucketStatuses(values);
  } catch {
    return "UNKNOWN";
  }
}

function detectPlatform(exec, cwd, env) {
  const forced = String(env.VCS || "").toLowerCase();
  if (forced === "github" || forced === "bitbucket") return forced;
  try {
    const url = String(
      exec("git", ["remote", "get-url", "origin"], { ...EXEC_OPTS, cwd }),
    );
    return /bitbucket\.org/i.test(url) ? "bitbucket" : "github";
  } catch {
    return "github";
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = { json: false };
  const takes = new Set([
    "--head-rollup",
    "--head",
    "--pr",
    "--workspace-root",
    "--platform",
  ]);
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (takes.has(a)) {
      const v = argv[i + 1];
      if (v === undefined || v === "" || v.startsWith("--")) {
        // An empty value is an unbound shell variable, and `--head ""` used to fall back to HEAD
        // silently (CR2-8, task.172 QA cycle 2).
        throw new UsageError(`${a} needs a non-empty value`);
      }
      out[a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
      i += 1;
    } else throw new UsageError(`unknown argument ${a}`);
  }
  if (out.headRollup === undefined) {
    throw new UsageError("--head-rollup is required");
  }
  if (
    out.platform !== undefined &&
    !["github", "bitbucket"].includes(out.platform)
  ) {
    throw new UsageError("--platform must be github or bitbucket");
  }
  return out;
}

/**
 * Run the engine. Returns { exitCode, result }. Never throws: an unexpected failure is reported
 * as `unverifiable` with exit 1, because a throw that escaped to exit 0 would be a wrong "yes".
 */
async function run({
  argv = process.argv.slice(2),
  env = process.env,
  exec = execFileSync,
  fetchImpl,
  cwd = process.cwd(),
  stdout = process.stdout,
  stderr = process.stderr,
  spawn = spawnSync,
} = {}) {
  let result;
  let exitCode;
  try {
    const args = parseArgs(argv);
    const root = path.resolve(args.workspaceRoot || repoRoot(exec, cwd));
    const cfg = readConfig(root);
    const head =
      args.head ||
      String(
        exec("git", ["rev-parse", "HEAD"], { ...EXEC_OPTS, cwd: root }),
      ).trim();

    let ancestorShas = null;
    let listError = "";
    const candidate =
      cfg.enabled &&
      ["PENDING", "NONE"].includes(args.headRollup.toUpperCase());
    if (candidate) {
      // The configuration is read, and checkCommand is run, in the working tree. They are only
      // meaningful for the commit that is checked out there, so a --head that is anything else (a
      // poll that outlived a checkout, a caller in the wrong directory) is refused rather than
      // judged against another tree (CR2-3, task.172 QA cycle 2).
      const want = commitOf(exec, root, head);
      const have = commitOf(exec, root, "HEAD");
      if (want !== have) {
        listError = `--head ${head} (${want.slice(0, 12)}) is not the checked-out HEAD (${have.slice(0, 12)}); the configuration and the local check apply to the working tree`;
      } else {
        try {
          ancestorShas = listAncestors(exec, root, head);
        } catch (e) {
          listError = e && e.message ? e.message : "git rev-list failed";
        }
      }
    }
    const platform = args.platform || detectPlatform(exec, root, env);
    const rollupOf = (sha) =>
      platform === "bitbucket"
        ? bitbucketRollup({ exec, cwd: root, env, fetchImpl }, sha)
        : githubRollup(exec, root, sha);

    if (ancestorShas === null && listError) {
      result = {
        reason: REASONS.UNVERIFIABLE,
        greenSha: null,
        changed: [],
        detail: `the ancestors of ${head} could not be judged: ${listError}`,
        reads: { diffs: 0, rollups: 0 },
      };
    } else {
      const ancestors = (ancestorShas || []).map((sha) => ({
        sha,
        changed: () => diffNames(exec, root, sha, head),
        rollup: () => rollupOf(sha),
      }));
      result = await classifyTreeEquivalence({
        headRollup: args.headRollup,
        ancestors,
        patterns: cfg.patterns,
        enabled: cfg.enabled,
      });
    }

    if (result.reason === REASONS.TREE_EQUIVALENT && cfg.checkCommand) {
      // The child's stdout goes to OUR stderr: --json promises a clean stdout for `jq`.
      // Bounded: the 6c poll runs this inside its decision loop, and a hung check would otherwise
      // stall the poll past its own MAX_WAIT without ever writing a result (CR2-7).
      const r = spawn("sh", ["-c", cfg.checkCommand], {
        cwd: root,
        stdio: ["ignore", 2, 2],
        timeout: cfg.checkTimeoutSeconds * 1000,
        killSignal: "SIGKILL",
      });
      const timedOut = Boolean(r.error && r.error.code === "ETIMEDOUT");
      const checkExit = typeof r.status === "number" ? r.status : 1;
      result = { ...result, checkExit };
      if (timedOut || checkExit !== 0) {
        result = {
          ...result,
          reason: REASONS.CHECK_FAILED,
          detail: timedOut
            ? `ci.docsOnly.checkCommand timed out after ${cfg.checkTimeoutSeconds}s`
            : `ci.docsOnly.checkCommand exited ${checkExit}`,
        };
      }
    }
    exitCode = exitCodeFor(result.reason);
    if (args.json) {
      stdout.write(
        `${JSON.stringify({ checkExit: null, pr: args.pr ?? null, ...result })}\n`,
      );
    } else if (result.reason === REASONS.TREE_EQUIVALENT) {
      stdout.write(
        `tree-equivalent to ${String(result.greenSha).slice(0, 12)} — ${result.detail}\n`,
      );
    } else {
      stdout.write(`${result.reason}: ${result.detail}\n`);
    }
  } catch (e) {
    const message = e && e.message ? e.message : String(e);
    if (e instanceof UsageError) {
      stderr.write(`ci-tree-equivalence: ${message}\n${USAGE}\n`);
      return { exitCode: 2, result: null };
    }
    result = {
      reason: REASONS.UNVERIFIABLE,
      greenSha: null,
      changed: [],
      detail: `unexpected failure: ${message}`,
      reads: { diffs: 0, rollups: 0 },
    };
    stdout.write(
      argv.includes("--json")
        ? `${JSON.stringify({ checkExit: null, ...result })}\n`
        : `${result.reason}: ${result.detail}\n`,
    );
    exitCode = 1;
  }
  return { exitCode, result };
}

if (require.main === module) {
  run()
    .then((r) => process.exit(r.exitCode))
    // run() does not reject; if it ever does, that is NOT a pass.
    .catch(() => process.exit(1));
}

module.exports = {
  REASONS,
  DEFAULT_PATTERNS,
  MAX_ANCESTORS,
  USAGE,
  classifyTreeEquivalence,
  isDocsPath,
  exitCodeFor,
  reduceChecks,
  reduceBitbucketStatuses,
  readConfig,
  DEFAULT_CHECK_TIMEOUT_SECONDS,
  parseArgs,
  listAncestors,
  diffNames,
  githubRollup,
  bitbucketRollup,
  run,
};
