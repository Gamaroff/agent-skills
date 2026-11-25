#!/usr/bin/env node
// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/ci-tree-equivalence.js. Regenerate via `npm run bundle`.
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
 *                          [--workspace-root <dir>] [--platform github|bitbucket] [--destination <branch>]
 *
 * Exit codes:
 *   0  tree-equivalent
 *   1  every other answer: not-applicable, disabled, code-changed, no-green-ancestor,
 *      unverifiable, check-failed (and an unexpected throw, reported as unverifiable)
 *   2  usage error — including a malformed ci.docsOnly block, a configuration that has content but
 *      is no mapping, a row of its ci block the parse does not account for (mis-indented or duplicated), a
 *      key under ci other than docsOnly and skipMarker, and a skills-config.yaml that is not a regular file (a symlink):
 *      none of them falls back silently to the defaults
 *
 * `code-changed` is FINAL for a pinned head: it is reported only when no nearer ancestor was walked
 * past undecided (PENDING, NONE, CANCELLED, or green but not yet settled). Otherwise the answer is
 * `no-green-ancestor`, which a poll asks again (a CANCELLED ancestor is re-asked too: it costs
 * polling, never a wrong answer).
 *
 * `--json` prints { reason, greenSha, changed, changedCount, checkExit, pr, detail, reads } and nothing
 * else on stdout. `changed` is capped at 200 entries; `changedCount` is the real length.
 * `--pr` is recorded in that payload for the caller's log. On Bitbucket it also names the pull request
 * whose destination branch filters the ancestors' statuses, unless `--destination` gives it; a destination
 * that cannot be read, or is named by neither, is `unverifiable`.
 * The local check's own output goes to stderr for that reason.
 *
 * Config (skills-config.yaml, every key optional):
 *   ci:
 *     skipMarker: ""                  # read by --push-policy for push-policy.sh; no decision here uses it
 *     docsOnly:
 *       enabled: true                 # false restores a full CI wait everywhere
 *       patterns:                     # BLOCK list: the YAML subset reads an inline [..] as a string
 *         - "**\/*.md"                # `**\/*.md`, not `*.md`: `*` does not cross `/`
 *         - "docs/**"
 *       checkCommand: ""              # optional local check, run from the repo root (ONE line, no YAML block scalar)
 *       checkTimeoutSeconds: 1500     # the check is killed after this long and the finding is check-failed
 *       settleSeconds: 300            # an ancestor whose newest check is younger than this is still PENDING
 *
 * Depends on glob-match.js, yaml-subset.js and bb-auth.js and nothing else in shared/ — each
 * skill that bundles this file pays for those three, not for a QA or a PR-comment engine.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync, spawn: spawnAsync } = require("child_process");

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
const DEFAULT_SETTLE_SECONDS = 300;
const GITLINK_PREFIX = ":gitlink:";
const CHANGED_RECORD_CAP = 200; // entries of `changed` kept in the --json record
const DOCS_ONLY_KEYS = Object.freeze([
  "enabled",
  "patterns",
  "checkCommand",
  "checkTimeoutSeconds",
  "settleSeconds",
]);
const BB_API = "https://api.bitbucket.org/2.0";
const BB_MAX_PAGES = 5;

/** The keys `ci:` may hold: the docs-only block, and the marker push-policy.sh applies (task.319). */
const CI_KEYS = Object.freeze(["docsOnly", "skipMarker"]);
/** The keys `pipeline:` may hold (read by the push-policy mode only). */
const PIPELINE_KEYS = Object.freeze(["pushRecordCommits"]);
const PUSH_RECORD_COMMITS = Object.freeze(["batched", "eager"]);
const SKIP_MARKER_MAX = 80;
const UNPRINTABLE = /[\p{Cc}\p{Cf}\p{Cs}]/u;
const MARKER_RULE = `ci.skipMarker must be one printable line of at most ${SKIP_MARKER_MAX} characters, with nothing but plain spaces at its ends`;

const USAGE =
  "usage: ci-tree-equivalence.js --head-rollup <PENDING|NONE|...> [--head <sha>] [--pr <n>] " +
  "[--json] [--workspace-root <dir>] [--platform github|bitbucket] [--destination <branch>]\n" +
  "       ci-tree-equivalence.js --push-policy [--base <rev>] [--head <rev>] [--workspace-root <dir>]\n" +
  "       ci-tree-equivalence.js --reduce-bitbucket --destination <branch>  (statuses JSON on stdin)";

// ---------------------------------------------------------------------------
// Pure core
// ---------------------------------------------------------------------------

const val = async (x) => (typeof x === "function" ? x() : x);

/** The file this rule is configured in. Its basename, wherever it sits in the tree. */
const CONFIG_BASENAME = "skills-config.yaml";

/**
 * Is one path segment a spelling of `.git`? Git itself refuses these names (is_hfs_dotgit /
 * is_ntfs_dotgit), because on a case-insensitive or Unicode-folding filesystem they ARE the
 * repository directory: any case, HFS+-ignorable code points (zero-width and directional marks,
 * U+FEFF), trailing dots or spaces, and the NTFS short name `git~1`. A path through one names the
 * repository's internals, never documentation, so no pattern may accept it.
 */
const DOTGIT_IGNORABLE = /[\u200b-\u200f\u202a-\u202e\u206a-\u206f\ufeff]/g;
function isDotGitSegment(seg) {
  const folded = seg
    .replace(DOTGIT_IGNORABLE, "")
    .replace(/[. ]+$/, "")
    .toLowerCase();
  return folded === ".git" || folded === "git~1";
}

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
 *  - It contains a control character (U+0000–U+001F, U+007F). Git never emits a NUL, but a caller
 *    that hands this predicate a path read from a document can: the 5c classify block reads a review
 *    report's `ref`, and under zsh a NUL survives `read` while `git` sees the argument cut at it, so
 *    `src/a.js<NUL>.md` matched the default markdown glob here and then passed git's tracked-and-clean test as
 *    `src/a.js` (task.173 DoD run 3). Refusing reads the path as code, the fail-safe answer.
 *  - It has a `.`, `..` or empty segment. `docs/../src/a.js` matches `docs/**` as a string yet names
 *    `src/a.js`; git refuses to check such a name out, but a hand-built tree can carry one, and the
 *    rule must not read it as documentation (DoD security gate).
 *  - It has a segment that is a spelling of `.git` (`isDotGitSegment`): the repository's own
 *    internals. Git refuses to track such a path, so the 5c classifier already recorded it, but the
 *    predicate accepted it under `docs/**` (task.173 DoD run 4, a pre-existing LOW).
 *  - It matches none of the patterns.
 */
function isDocsPath(file, globs) {
  if (typeof file !== "string" || file === "") return false;
  if (/[\u0000-\u001f\u007f]/.test(file)) return false; // control characters: never documentation
  if (file.split("/").some((seg) => seg === "" || seg === "." || seg === ".."))
    return false;
  if (file.startsWith(GITLINK_PREFIX)) return false; // a submodule pointer: no pattern may accept it (CR3-8)
  if (file.split("/").some(isDotGitSegment)) return false; // the repository's internals, in any spelling
  if (file.split("/").pop() === CONFIG_BASENAME) return false;
  if (normalisePath(file) !== file) return false;
  return matchesAnyGlob(file, globs);
}

/**
 * The file a review finding's `fix_path` names, or `null` (task.278, obs #141, T278-QA-4).
 *
 * `fix_path` is the file the fix EDITS when `ref` anchors where the behaviour lives. It decides which
 * file the 5c carry may stage, so it is a boundary, and it lives here (not inline in the step doc's
 * classify block) so the probe engine can reach it. It counts only when the value, after one pair of
 * surrounding quotes is removed and the path normalised, is a `.md` directly inside `workItemDir`
 * (the directory of the review report) and a docs path. Anything else answers `null`, which the
 * caller reads as "no fix_path", so the finding classifies on `ref` exactly as before. "Tracked and
 * clean against HEAD" stays the second test, in the shell where git is.
 */
function fixPathTarget(raw, workItemDir, globs) {
  if (typeof raw !== "string" || typeof workItemDir !== "string") return null;
  const f = path.posix.normalize(raw.replace(/^["']|["']$/g, ""));
  // Both sides are normalised: `./docs/tasks/t`, `docs/tasks//t` and `docs/tasks/t/` name the same
  // directory as `docs/tasks/t`, and comparing one spelling to another dropped a legitimate
  // fix_path (T278-QA-5). `normalize` keeps a trailing slash, so it is removed.
  const dir = path.posix.normalize(workItemDir).replace(/\/+$/, "");
  return f.endsWith(".md") &&
    path.posix.dirname(f) === dir &&
    isDocsPath(f, globs)
    ? f
    : null;
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
  // The nearest ancestor the walk went PAST because its checks were not decided (PENDING, NONE,
  // CANCELLED, or green but not yet settled). Whatever the walk finds beyond it, the answer is not
  // final: that ancestor's run may still turn green, and then the delta is only docs (CR4-1).
  let undecided = null;

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
      if (undecided !== null) {
        // Not final: `code-changed` is a claim a poll may latch for a pinned head, and a nearer
        // ancestor that is still undecided can change it. Report the answer that is re-asked.
        return done(REASONS.NO_GREEN_ANCESTOR, {
          changed,
          detail: `${undecided.sha} is not decided yet (${undecided.rollup}) and ${code} is not a docs path (changed since ${a.sha}); the answer can still change, so it is not code-changed`,
        });
      }
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
    // evidence for the same code tree, so keep walking — and remember that the answer is not final.
    if (undecided === null) undecided = { sha: a.sha, rollup };
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

/**
 * A green reading taken while the ancestor's lanes are still registering is not a decision: a push
 * registers its fast lanes first, and a rollup that is SUCCESS across one completed check while the
 * slow lanes have not appeared yet is the partial-rollup window /finalise's 6c poll guards for the
 * head with a check-count floor (obs #87). An ancestor has no such floor, so it must have SETTLED:
 * its newest completed check or status is at least `settleSeconds` old. A SUCCESS whose timestamps are
 * missing cannot be shown to have settled, so it is PENDING (CR3-1, task.172 QA cycle 3).
 * `settleSeconds: 0` turns the guard off.
 */
function settle(rollup, stamps, settleSeconds, now) {
  if (rollup !== "SUCCESS" || !(settleSeconds > 0)) return rollup;
  const times = (stamps || []).map((t) => Date.parse(t));
  if (times.length === 0 || times.some((t) => Number.isNaN(t)))
    return "PENDING";
  return now - Math.max(...times) < settleSeconds * 1000
    ? "PENDING"
    : "SUCCESS";
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
const normKey = (k) => unescaped(k).toLowerCase().replace(/[-_]/g, "");

/**
 * Text with YAML's character escapes read. The YAML subset keeps one in a quoted key as text, so a block
 * under `"c\x69"` was neither read nor refused (task 320).
 */
const unescaped = (s) =>
  String(s).replace(
    /\\(?:x([0-9a-fA-F]{2})|u([0-9a-fA-F]{4})|U([0-9a-fA-F]{8}))/g,
    (_, x, u, U) =>
      String.fromCodePoint(Math.min(parseInt(x ?? u ?? U, 16), 0xfffd)),
  );

function defaultConfig() {
  return {
    enabled: true,
    patterns: [...DEFAULT_PATTERNS],
    checkCommand: "",
    checkTimeoutSeconds: DEFAULT_CHECK_TIMEOUT_SECONDS,
    settleSeconds: DEFAULT_SETTLE_SECONDS,
    skipMarker: "",
  };
}

/**
 * The lines that carry content: not blank, not a comment, not a document marker. A trailing comment
 * is stripped before the test, as the YAML subset does, so `--- # note` is a marker and not a row
 * the parse never consumes (CR6-3).
 */
function significantLines(text) {
  return String(text)
    .split(/\r?\n/)
    .filter((l) => {
      const t = l.replace(/(^|\s)#.*$/, "").trim();
      return t !== "" && t !== "---" && t !== "...";
    });
}

/**
 * The key of a row at column 0, in the YAML subset's own key grammar (bare or quoted), or null. A quoted
 * key counted as no key hid a second copy of a block: the parse keeps the last one, so a list checked in
 * the first copy ran from the second (T319-CR-201).
 */
function topLevelKey(line) {
  const m = /^(?:"([^"]+)"|'([^']+)'|([\w.-]+))\s*:/.exec(line);
  return m ? (m[1] ?? m[2] ?? m[3]) : null;
}

/**
 * The file's top-level keys: every key row of the source at the first row's indent or under it. The parse
 * has fewer: it stops at a row it does not read (the text of a block scalar), and a near miss after it was
 * neither read nor refused (task 320). A lone CR ends a line here, as it does in YAML and not in the parse.
 */
function topLevelKeys(text) {
  const rows = significantLines(text.replace(/\r(?!\n)/g, "\n"));
  const indent = (l) => l.length - l.trimStart().length;
  return rows
    .filter((l) => indent(l) <= indent(rows[0]))
    .map((l) => topLevelKey(l.trimStart()))
    .filter((k) => k !== null);
}

/**
 * How many source rows belong to a top-level `ci:` key: the `ci:` row itself and every row up to the
 * next row at column 0. Read from the text, not from the parse, so a row the parse dropped still
 * counts. Only this block is held to account (CR6-1): it is the only part of the file this engine
 * reads, and it holds nothing but mappings and lists of scalars, whose rows count exactly. Rows of
 * other sections are other skills' business, in whatever shape the YAML subset supports (a list of
 * maps, for one), and an engine that refused the file for them would lose the rule for a valid
 * configuration. A row at column 0 that is no key row (a list row, or one with no colon) ends nothing: the
 * parse stops there, and the rows after it are still this block's, unaccounted for (T319-CR-406).
 */
function ciBlockRows(text, key = "ci") {
  let n = 0;
  let inBlock = false;
  for (const l of significantLines(text)) {
    if (/^\S/.test(l) && !/^-(\s|$)/.test(l) && /:(\s|$)/.test(l))
      inBlock = topLevelKey(l) === key;
    if (inBlock) n++;
  }
  return n;
}

/**
 * How many source rows a parsed value accounts for: one per key, one per scalar list element,
 * recursively. A list element that is a map shares its row with its first key (`- name: x`), so it
 * adds its keys and nothing for the dash (CR6-1). The YAML subset ends a block at a dedent without an
 * error, so a row it never reached is simply absent from the result; comparing this count with the
 * source rows is what notices (CR5-2).
 */
function consumedRows(v) {
  if (Array.isArray(v)) {
    return v.reduce(
      (n, e) => n + (e && typeof e === "object" ? consumedRows(e) : 1),
      0,
    );
  }
  if (v && typeof v === "object") {
    return Object.keys(v).reduce((n, k) => n + 1 + consumedRows(v[k]), 0);
  }
  return 0;
}

/**
 * Refuse a file with content that does not parse to a mapping: a configuration the engine cannot read is
 * not an absent one (a top-level list, a line with no colon, or the one-line link text a symlinked file
 * reads as). Only a file with no significant line at all is "not configured" (CR4-2).
 */
function assertMapping(text, parsed) {
  if (
    significantLines(text).length > 0 &&
    (parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      Object.keys(parsed).length === 0)
  ) {
    throw new UsageError(
      `${CONFIG_BASENAME} has content but it does not parse to a mapping (a top-level list, a line without a colon, or the link text of a symlink); the rule will not guess what it meant`,
    );
  }
}

/**
 * Refuse a top-level block when the parse does not account for EVERY row of it. The subset ends a block
 * at a dedent without an error, skips a row it cannot read, and collapses a duplicate key into one, so a
 * row can vanish from the result with nothing said: an opt-out indented one level too deep or too shallow
 * was ignored one spelling at a time across five QA cycles (CR5-2), and a list at its key's own indent
 * read as an absent key (task.319, T319-CR-1). One check for the whole class, over one block only:
 * counted over the whole file it refused a valid configuration that holds a list of maps elsewhere, and
 * one miscount there offset a dropped row here (CR6-1, CR6-2).
 */
function assertBlockRows(text, parsed, key) {
  const rows = ciBlockRows(text, key);
  const consumed = Object.prototype.hasOwnProperty.call(parsed, key)
    ? 1 + consumedRows(parsed[key])
    : 0;
  if (consumed !== rows) {
    throw new UsageError(
      `${CONFIG_BASENAME} has ${rows} row(s) under ${key} but the parse accounts for ${consumed}: a row is mis-indented, duplicated or in a form the YAML subset does not read (a list goes one level deeper than its key); the rule will not guess which`,
    );
  }
}

/**
 * The ONE place that defines what the configuration may contain. Everything it does not recognise
 * is refused, because each silent fall back to the defaults across QA cycles 1 to 3 was a rule
 * applied to files its owner did not choose: a misspelt key, a `ci:` written as a flow mapping (the
 * YAML subset reads it as a string), a folded `checkCommand: >-` (read as the literal `>-`, which
 * `sh -c` runs as a redirection that exits 0).
 */
function parseConfig(rawText) {
  // One BOM strip for everything below: the parser counts a BOM as a column of indent on the first
  // row, so `ci:` at column 0 after a BOM'd first key was never read (CR5-1).
  const text = String(rawText).replace(/^\uFEFF/, "");
  const parsed = parseYamlSubset(text) || {};
  assertMapping(text, parsed);
  // The specific diagnostics (a block scalar, an unknown key) are produced first so they name the
  // cause; the completeness check below is the net under all of them.
  const cfg = interpretConfig(parsed, topLevelKeys(text));
  assertBlockRows(text, parsed, "ci");
  assertMarkerRow(text);
  return cfg;
}

/**
 * Refuse a `skipMarker` row with a control or format character anywhere in it, its comment included, or
 * with a space other than U+0020 at the value's ends: the parse trims both outside the quotes, so
 * `skipMarkerOf` never sees them (T320-CR-104, T320-CR-206). A tab there parts the value from what stands
 * beside it.
 */
function assertMarkerRow(text) {
  let block = null;
  for (const l of text.split(/\r?\n|\r$/)) {
    block = topLevelKey(l) ?? block;
    const row = /^\s+["']?skipMarker["']?\s*:(.*)/s.exec(l);
    if (block !== "ci" || !row) continue;
    // What is inside the quotes is skipMarkerOf's to judge, and a space in the comment is no one's.
    const outside = row[1]
      .replace(/^(\s*)(?:"[^"]*"|'[^']*')/, '$1""')
      .replace(/(^|\s)#.*$/s, "$1");
    if (
      UNPRINTABLE.test(l.replace(/\t/g, "")) ||
      /^[ \t]*[^\S \t]|[^\S \t][ \t]*$/.test(outside)
    )
      throw new UsageError(MARKER_RULE);
  }
}

/**
 * `ci.skipMarker`: the text push-policy.sh appends to the subject of a record-only head (task.319).
 * Absent, null or empty means off. It goes into a commit subject, so it is one printable line: no
 * control or format character (a C1 control and a bidi override are neither seen nor harmless where a
 * subject is displayed), and no surrogate on its own. A line or paragraph separator inside the value
 * never reaches this: the parse does not account for its row, and parseConfig refuses the block.
 */
function skipMarkerOf(v) {
  if (v === undefined || v === null) return "";
  if (typeof v !== "string") {
    throw new UsageError("ci.skipMarker must be a string (empty means off)");
  }
  const m = v.trim();
  // trim() drops a tab, a BOM and every kind of space; only U+0020 is dropped in silence (task 320)
  const dropped =
    v.slice(0, v.length - v.trimStart().length) + v.slice(v.trimEnd().length);
  if (
    UNPRINTABLE.test(m) ||
    /[^ ]/.test(dropped) ||
    [...m].length > SKIP_MARKER_MAX
  ) {
    throw new UsageError(MARKER_RULE);
  }
  if (/^[>|][+\-0-9]*$/.test(m)) {
    throw new UsageError(
      "ci.skipMarker is a YAML block scalar, which the YAML subset does not read: write it on one line",
    );
  }
  return m;
}

/**
 * The `pipeline:` block, read by the push-policy mode alone (task.319). It is kept out of
 * `parseConfig` so that a mistake in a push key cannot turn the docs-only rule's CI waits into usage
 * errors; it gets the same refusals as `ci`: an unknown key, a misspelt one, a flow mapping, and a
 * row the parse does not account for.
 */
function parsePipelineConfig(rawText) {
  const text = String(rawText).replace(/^﻿/, "");
  const parsed = parseYamlSubset(text) || {};
  const cfg = { pushRecordCommits: "batched" };
  if (typeof parsed !== "object" || Array.isArray(parsed)) return cfg;
  for (const k of topLevelKeys(text)) {
    if (k !== "pipeline" && normKey(k) === "pipeline") {
      throw new UsageError(
        `${k} looks like pipeline; the key is exactly "pipeline"`,
      );
    }
  }
  const block = parsed.pipeline;
  if (block === undefined || block === null) {
    assertBlockRows(text, parsed, "pipeline");
    return cfg;
  }
  if (typeof block !== "object" || Array.isArray(block)) {
    throw new UsageError(
      "pipeline must be a block mapping (a flow mapping is read as a string by the YAML subset and would be ignored)",
    );
  }
  const unknown = Object.keys(block).filter((k) => !PIPELINE_KEYS.includes(k));
  if (unknown.length > 0) {
    throw new UsageError(
      `pipeline has unknown key(s): ${unknown.join(", ")} (known: ${PIPELINE_KEYS.join(", ")})`,
    );
  }
  assertBlockRows(text, parsed, "pipeline");
  if ("pushRecordCommits" in block) {
    if (!PUSH_RECORD_COMMITS.includes(block.pushRecordCommits)) {
      throw new UsageError(
        `pipeline.pushRecordCommits must be one of ${PUSH_RECORD_COMMITS.join(", ")}`,
      );
    }
    cfg.pushRecordCommits = block.pushRecordCommits;
  }
  return cfg;
}

/**
 * `developNext.mergeStrategy` as the project WROTE it, or null (task.319, T319-CR-101). The default is
 * not filled in: push-policy.sh marks a commit only on a stated `merge`, because under any other strategy
 * the marked commit, or its subject, becomes the base branch's head. A block the parse does not account
 * for states nothing.
 */
function statedMergeStrategy(rawText) {
  const text = String(rawText).replace(/^﻿/, "");
  const parsed = parseYamlSubset(text) || {};
  const block = parsed.developNext;
  if (!block || typeof block !== "object" || Array.isArray(block)) return null;
  try {
    assertBlockRows(text, parsed, "developNext");
  } catch {
    return null;
  }
  const v = block.mergeStrategy;
  return typeof v === "string" && v !== "" ? v : null;
}

/** Interpret a parsed top-level mapping, and the file's top-level keys, as the ci.docsOnly configuration. */
function interpretConfig(parsed, keys) {
  const cfg = defaultConfig();
  for (const k of keys) {
    if (k !== "ci" && normKey(k) === "ci") {
      throw new UsageError(`${k} looks like ci; the key is exactly "ci"`);
    }
  }
  const ci = parsed.ci;
  if (ci === undefined || ci === null) return cfg;
  if (typeof ci !== "object" || Array.isArray(ci)) {
    throw new UsageError(
      "ci must be a block mapping (a flow mapping such as `ci: { docsOnly: {..} }` is read as a string by the YAML subset and would be ignored)",
    );
  }
  for (const k of Object.keys(ci)) {
    if (k !== "docsOnly" && normKey(k) === "docsonly") {
      throw new UsageError(
        `ci.${k} looks like ci.docsOnly; the key is exactly "docsOnly"`,
      );
    }
    if (!CI_KEYS.includes(k)) {
      throw new UsageError(
        `ci has an unknown key "${k}" (the known keys are ${CI_KEYS.join(" and ")}; a key written beside docsOnly instead of under it is ignored by the rule)`,
      );
    }
  }
  cfg.skipMarker = skipMarkerOf(ci.skipMarker);
  const block = ci.docsOnly;
  if (block === undefined || block === null) return cfg;
  if (typeof block !== "object" || Array.isArray(block)) {
    throw new UsageError("ci.docsOnly must be a block mapping");
  }
  const unknown = Object.keys(block).filter((k) => !DOCS_ONLY_KEYS.includes(k));
  if (unknown.length > 0) {
    throw new UsageError(
      `ci.docsOnly has unknown key(s): ${unknown.join(", ")} (known: ${DOCS_ONLY_KEYS.join(", ")})`,
    );
  }
  const posInt = (v, min) => Number.isInteger(v) && v >= min;
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
    const c = block.checkCommand;
    if (typeof c !== "string") {
      throw new UsageError("ci.docsOnly.checkCommand must be a string");
    }
    if (/^[>|][+\-0-9]*$/.test(c.trim())) {
      throw new UsageError(
        "ci.docsOnly.checkCommand is a YAML block scalar, which the YAML subset reads as the literal " +
          `"${c.trim()}" (a shell redirection that exits 0): write the command on one line`,
      );
    }
    cfg.checkCommand = c.trim();
  }
  if ("checkTimeoutSeconds" in block) {
    if (!posInt(block.checkTimeoutSeconds, 1)) {
      throw new UsageError(
        "ci.docsOnly.checkTimeoutSeconds must be a positive integer",
      );
    }
    cfg.checkTimeoutSeconds = block.checkTimeoutSeconds;
  }
  if ("settleSeconds" in block) {
    if (!posInt(block.settleSeconds, 0)) {
      throw new UsageError(
        "ci.docsOnly.settleSeconds must be a non-negative integer",
      );
    }
    cfg.settleSeconds = block.settleSeconds;
  }
  return cfg;
}

/** Read skills-config.yaml from a directory (tests, and a caller with no commit to name). */
function readConfig(root) {
  let text;
  try {
    const p = path.join(root, CONFIG_BASENAME);
    if (!fs.lstatSync(p).isFile()) {
      throw new UsageError(`${CONFIG_BASENAME} is not a regular file`);
    }
    text = fs.readFileSync(p, "utf8");
  } catch (e) {
    if (e instanceof UsageError) throw e;
    if (e && e.code === "ENOENT") return defaultConfig();
    throw new UsageError(`${CONFIG_BASENAME} could not be read: ${e.message}`);
  }
  return parseConfig(text);
}

/**
 * Read the configuration from the COMMIT BEING JUDGED, never from the working tree: an uncommitted
 * edit that widened `patterns` would otherwise decide a committed delta (CR3-6, task.172 QA cycle 3).
 * A commit without the file means "not configured" and gives the defaults.
 */
function readConfigAtCommit(exec, root, sha) {
  const text = configTextAtCommit(exec, root, sha);
  return text === null ? defaultConfig() : parseConfig(text);
}

/** The configuration's text at a commit, or null when the commit has no such file. */
function configTextAtCommit(exec, root, sha) {
  let entry;
  try {
    entry = String(
      exec("git", ["ls-tree", "--full-tree", sha, "--", CONFIG_BASENAME], {
        ...EXEC_OPTS,
        cwd: root,
      }),
    ).trim();
  } catch (e) {
    throw new UsageError(
      `${CONFIG_BASENAME} could not be read at ${sha}: ${e.message}`,
    );
  }
  if (entry === "") return null;
  // `<mode> <type> <sha>\t<path>`. A symlink (120000) or a submodule (160000) is not a file whose
  // text is the configuration: `git show` would return the link target's NAME, the YAML subset would
  // read nothing, and an owner opt-out held in the target would be ignored (CR4-2).
  const mode = entry.split(/\s+/)[0];
  if (mode !== "100644" && mode !== "100755") {
    throw new UsageError(
      `${CONFIG_BASENAME} at ${sha} is not a regular file (git mode ${mode}); commit the file itself, not a link to it`,
    );
  }
  let text;
  try {
    text = String(
      exec("git", ["show", `${sha}:${CONFIG_BASENAME}`], {
        ...EXEC_OPTS,
        cwd: root,
      }),
    );
  } catch (e) {
    throw new UsageError(
      `${CONFIG_BASENAME} could not be read at ${sha}: ${e.message}`,
    );
  }
  return text;
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
          ? `${GITLINK_PREFIX}${file}`
          : file,
      );
    }
    return names;
  } catch {
    return null;
  }
}

/** GitHub: the commit's OWN checks, not "any successful run on the branch". */
function githubRollup(
  exec,
  cwd,
  sha,
  { settleSeconds = 0, now = Date.now() } = {},
) {
  try {
    const jsonLines = (args, jq) =>
      String(exec("gh", [...args, "--jq", jq], { ...EXEC_OPTS, cwd }))
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => JSON.parse(l));
    const checkRuns = jsonLines(
      ["api", `repos/{owner}/{repo}/commits/${sha}/check-runs`, "--paginate"],
      ".check_runs[] | {status, conclusion, completed_at}",
    );
    const statuses = jsonLines(
      ["api", `repos/{owner}/{repo}/commits/${sha}/status`, "--paginate"],
      ".statuses[] | {state, updated_at}",
    );
    return settle(
      reduceChecks({ checkRuns, statuses }),
      [
        ...checkRuns.map((r) => r.completed_at),
        ...statuses.map((x) => x.updated_at),
      ],
      settleSeconds,
      now,
    );
  } catch {
    return "UNKNOWN";
  }
}

/** Bitbucket: /commit/{sha}/statuses. A 403 or any non-200 is UNKNOWN, never "no CI". */
async function bitbucketRollup(
  {
    exec,
    cwd,
    env,
    fetchImpl,
    destination,
    settleSeconds = 0,
    now = Date.now(),
  },
  sha,
) {
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
      const next = body.next || "";
      // The Authorization header goes wherever the URL points, so a `next` link is followed only
      // when it stays on the Bitbucket API (CR3-5, task.172 QA cycle 3).
      if (next && !next.startsWith(`${BB_API}/`)) return "UNKNOWN";
      url = next;
    }
    if (url) return "UNKNOWN"; // more pages than we read: do not decide on a partial list
    // An ancestor is read by the rule its PR's head is read by: a green for another destination is not
    // this PR's green, and a red for another destination is not its red (T319-CR-306). Its age is read
    // off the same statuses (T319-CR-409).
    return settle(
      bitbucketPrRollup(values, destination),
      bitbucketPrStatuses(values, destination).map((v) => v.updated_on),
      settleSeconds,
      now,
    );
  } catch {
    return "UNKNOWN";
  }
}

/** The branch a Bitbucket pull request merges into, or null when it cannot be read. */
async function bitbucketDestination({ exec, cwd, env, fetchImpl }, pr) {
  try {
    const auth = bbAuthHeader(env);
    if (auth.scheme === "none" || !/^\d+$/.test(String(pr))) return null;
    const { workspace, repo } = bbSlug((cmd, args, opts) =>
      exec(cmd, args, { ...opts, cwd }),
    );
    const res = await (fetchImpl || globalThis.fetch)(
      `${BB_API}/repositories/${workspace}/${repo}/pullrequests/${pr}`,
      { headers: { Authorization: auth.header } },
    );
    if (!res || res.status !== 200) return null;
    const name = (await res.json()).destination.branch.name;
    return typeof name === "string" && name !== "" ? name : null;
  } catch {
    return null;
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
    "--destination",
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
 * Signal every process left in the group `sh -c <checkCommand>` led. Best effort and silent: the
 * group is usually already empty (ESRCH), a fake `spawn` in a test has no pid, and Windows has no
 * process groups to signal.
 */
function killProcessGroup(pid) {
  if (!Number.isInteger(pid) || pid <= 1 || process.platform === "win32")
    return;
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    /* nothing left to kill, or not ours to kill */
  }
}

/** Signals a caller sends to stop the engine (`timeout`, Ctrl-C, a closed terminal). */
const FORWARDED_SIGNALS = ["SIGTERM", "SIGINT", "SIGHUP"];

/**
 * Run the check, asynchronously, and own its process group against every way the engine can stop
 * short of SIGKILL. Resolves with the `spawnSync`-shaped `{ pid, status, signal, error }` the caller
 * reads, so an injected synchronous `spawn` in a test is a drop-in.
 *
 * `onSpawn`, when given, gets the child, to stop it on a condition of the caller's. What a kill cannot reach: a descendant that
 * left the process group (`setsid`, a daemon, and coreutils' `timeout`, which makes a group of its own)
 * outlives a timeout and a signal.
 *
 * Why not `spawnSync` (obs #94): it blocks the event loop, so a SIGTERM to the engine (e.g. from
 * `timeout 120 node ci-tree-equivalence.js …`) ran no handler — node died at once and the detached
 * group, an `npm run ci:fast` in practice, ran on beside the real gate. Here a forwarded signal
 * kills the group, then re-raises itself so the engine's own exit still says it was signalled.
 */
function spawnCheck(file, args, { timeout, onSpawn, ...opts } = {}) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawnAsync(file, args, { ...opts, detached: true });
    } catch (error) {
      resolve({ pid: undefined, status: null, signal: null, error });
      return;
    }
    const pid = child.pid;
    if (onSpawn) onSpawn(child);
    let timedOut = false;
    let timer = null;
    const handlers = new Map();
    const release = () => {
      if (timer) clearTimeout(timer);
      for (const [sig, fn] of handlers) process.removeListener(sig, fn);
      handlers.clear();
    };
    for (const sig of FORWARDED_SIGNALS) {
      const fn = () => {
        release();
        killProcessGroup(pid);
        process.kill(process.pid, sig);
      };
      handlers.set(sig, fn);
      process.on(sig, fn);
    }
    if (timeout > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        killProcessGroup(pid);
      }, timeout);
    }
    child.on("error", (error) => {
      release();
      resolve({ pid, status: null, signal: null, error });
    });
    child.on("exit", (status, signal) => {
      release();
      const error = timedOut
        ? Object.assign(new Error("checkCommand timed out"), {
            code: "ETIMEDOUT",
          })
        : undefined;
      resolve({ pid, status, signal, error });
    });
  });
}

/**
 * Paths with uncommitted changes (staged, unstaged or untracked) that are NOT documentation per
 * `patterns`, or `null` when git status cannot be read. A rename lists both names.
 */
function dirtyNonDocsPaths(exec, root, patterns) {
  let out;
  try {
    out = String(
      exec("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], {
        ...EXEC_OPTS,
        cwd: root,
      }),
    );
  } catch {
    return null;
  }
  const parts = out.split("\0");
  const dirty = [];
  for (let i = 0; i < parts.length; i++) {
    const entry = parts[i];
    if (entry.length < 4) continue;
    dirty.push(entry.slice(3));
    if (/[RC]/.test(entry.slice(0, 2))) {
      i++; // a rename or copy is followed by its source path
      if (parts[i]) dirty.push(parts[i]);
    }
  }
  return dirty.filter((f) => !isDocsPath(f, patterns));
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
  spawn = spawnCheck,
  now = Date.now,
} = {}) {
  let result;
  let exitCode;
  try {
    const args = parseArgs(argv);
    const root = path.resolve(args.workspaceRoot || repoRoot(exec, cwd));
    const head = args.head || "HEAD";
    // The configuration is the one in the commit judged, not the working-tree file (CR3-6).
    const cfg = readConfigAtCommit(exec, root, commitOf(exec, root, head));

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
    const settleOpts = { settleSeconds: cfg.settleSeconds, now: now() };
    // Asked once, and only when an ancestor is read. A destination that was neither given nor can be read
    // from a PR leaves every ancestor UNKNOWN: unfiltered, another destination's green would be this PR's
    // (T319-CR-407).
    const bb = { exec, cwd: root, env, fetchImpl };
    let destination = null;
    const destinationOf = () =>
      (destination ??= Promise.resolve(
        args.destination || bitbucketDestination(bb, args.pr),
      ));
    let noDestination = false;
    const rollupOf = async (sha) => {
      if (platform !== "bitbucket")
        return githubRollup(exec, root, sha, settleOpts);
      const dest = await destinationOf();
      if (dest !== null)
        return bitbucketRollup(
          { ...bb, destination: dest, ...settleOpts },
          sha,
        );
      noDestination = true;
      return "UNKNOWN";
    };

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
      if (noDestination && result.reason === REASONS.UNVERIFIABLE)
        result.detail = `the pull request's destination branch is not known (--pr or --destination), so no ancestor's statuses were read; ${result.detail}`;
    }

    if (result.reason === REASONS.TREE_EQUIVALENT && cfg.checkCommand) {
      // The check runs in the WORKING TREE, so it can only vouch for the commit judged when that
      // tree holds that commit's code. Uncommitted code is refused (`unverifiable`, which a poll
      // re-asks). Uncommitted documentation is allowed: /finalise reading 1 runs with its own DoD
      // summary and report edits uncommitted, and a rule that refused those would never fire there.
      // That is a stated residual, not a proof: an uncommitted edit to a doc the check reads could
      // still colour a green.
      const dirty = dirtyNonDocsPaths(exec, root, cfg.patterns);
      if (dirty === null || dirty.length > 0) {
        result = {
          ...result,
          reason: REASONS.UNVERIFIABLE,
          detail:
            dirty === null
              ? "git status could not be read, so the working tree cannot be shown to hold the commit judged"
              : `the working tree has uncommitted changes outside documentation (${dirty.slice(0, 5).join(", ")}${dirty.length > 5 ? `, … ${dirty.length} in all` : ""}); ci.docsOnly.checkCommand runs in the working tree and would judge them, not the commit`,
        };
      }
    }
    if (result.reason === REASONS.TREE_EQUIVALENT && cfg.checkCommand) {
      // The child's stdout goes to OUR stderr: --json promises a clean stdout for `jq`.
      // Bounded: the 6c poll runs this inside its decision loop, and a hung check would otherwise
      // stall the poll past its own MAX_WAIT without ever writing a result (CR2-7).
      // `detached` makes `sh` the leader of its own process group, so the whole tree it starts can
      // be signalled (below): the timeout kills only the `sh` pid, and `npm run ci:fast && …`
      // leaves its children running, holding our stderr open (DoD security gate). The spawn is
      // asynchronous so a signal sent to the engine kills that group too (spawnCheck, obs #94).
      const r = await spawn("sh", ["-c", cfg.checkCommand], {
        cwd: root,
        stdio: ["ignore", 2, 2],
        timeout: cfg.checkTimeoutSeconds * 1000,
        killSignal: "SIGKILL",
        detached: true,
      });
      killProcessGroup(r && r.pid);
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
      // `changed` is capped: a huge delta made the record larger than a pipe buffer (CR3-7).
      stdout.write(
        `${JSON.stringify({
          checkExit: null,
          pr: args.pr ?? null,
          ...result,
          changed: result.changed.slice(0, CHANGED_RECORD_CAP),
          changedCount: result.changed.length,
        })}\n`,
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

/**
 * The push-policy mode (task.319): what `push-policy.sh` needs and a shell cannot compute. It reads
 * the configuration at the commit, so nothing here parses YAML or globs twice, and answers whether
 * every path of a delta is documentation. Read-only, offline, one JSON line on stdout.
 *
 * `--base <rev>` names the last pushed commit; without it there is no delta to judge and `docsOnly` is
 * null, which the caller reads as "not known", never as docs-only. `headDocsOnly` is the same question
 * about the head commit's own change (every parent of a merge is judged): the skip marker asks it, so a code commit whose effect a later
 * commit undid still never carries a marker. Both are false when `ci.docsOnly.enabled` is false: a
 * consumer that turned the rule off does not trust docs-only, so every delta counts as code.
 *
 * Exits 0 with the record, 2 with the reason on stderr (a bad argument, an unreadable commit, or a
 * malformed ci or pipeline block).
 */
function runPushPolicy({
  argv = process.argv.slice(2),
  exec = execFileSync,
  cwd = process.cwd(),
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  try {
    const out = { head: "HEAD" };
    for (let i = 0; i < argv.length; i += 1) {
      const a = argv[i];
      if (a === "--push-policy") continue;
      if (!["--base", "--head", "--workspace-root"].includes(a)) {
        throw new UsageError(`unknown argument ${a}`);
      }
      const v = argv[i + 1];
      if (v === undefined || v === "" || v.startsWith("--")) {
        throw new UsageError(`${a} needs a non-empty value`);
      }
      out[a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
      i += 1;
    }
    const root = path.resolve(out.workspaceRoot || repoRoot(exec, cwd));
    const head = commitOf(exec, root, out.head);
    const text = configTextAtCommit(exec, root, head);
    const ci = text === null ? defaultConfig() : parseConfig(text);
    const pipe =
      text === null
        ? { pushRecordCommits: "batched" }
        : parsePipelineConfig(text);
    const isDocs = (files) =>
      ci.enabled && files !== null
        ? files.every((f) => isDocsPath(f, ci.patterns))
        : false;
    let docsOnly = null;
    let files = 0;
    let code = [];
    if (out.base) {
      const changed = diffNames(
        exec,
        root,
        commitOf(exec, root, out.base),
        head,
      );
      docsOnly = isDocs(changed);
      files = changed === null ? 0 : changed.length;
      code = (changed || [])
        .filter((f) => !ci.enabled || !isDocsPath(f, ci.patterns))
        .slice(0, 5);
    }
    const parents = String(
      exec("git", ["rev-list", "--parents", "-n", "1", head], {
        ...EXEC_OPTS,
        cwd: root,
      }),
    )
      .trim()
      .split(/\s+/)
      .slice(1);
    // A root commit has no parent to compare with: not shown to be documentation, so it never is.
    const headDocsOnly =
      parents.length > 0 &&
      parents.every((p) => isDocs(diffNames(exec, root, p, head)));
    stdout.write(
      `${JSON.stringify({
        pushRecordCommits: pipe.pushRecordCommits,
        skipMarker: ci.skipMarker,
        mergeStrategy: text === null ? null : statedMergeStrategy(text),
        checkCommand: ci.checkCommand !== "",
        docsOnly,
        headDocsOnly,
        files,
        code,
      })}\n`,
    );
    return 0;
  } catch (e) {
    stderr.write(
      `ci-tree-equivalence: ${e && e.message ? e.message.split("\n")[0] : e}\n`,
    );
    return 2;
  }
}

/**
 * Bitbucket build statuses for a PR, by destination (task.319). A commit carries one status per
 * pipeline definition that ran on it; a PR pipeline's key is `prs:<pattern>:<destination>`, so a
 * commit on a PR into develop that also runs a branch pipeline, or sits in a second PR into main,
 * has statuses that say nothing about this PR. So a `prs:` key of ANOTHER destination is dropped, and
 * nothing else is: an external check, or a pipeline that uses no such key, reports on the commit itself
 * and its failure is this PR's failure (T319-CR-110).
 */
function bitbucketPrStatuses(values, destination) {
  const all = Array.isArray(values) ? values : [];
  const keyOf = (v) => String((v && v.key) || "");
  return all.filter(
    (v) => !keyOf(v).startsWith("prs:") || keyOf(v).endsWith(`:${destination}`),
  );
}

/**
 * The PR's rollup. NONE means the commit has no status at all. When `prs:` keys exist and none is for
 * this destination, the repository runs PR pipelines and this one has not registered yet: a green from
 * anything else is PENDING, never SUCCESS and never "no checks" (T319-CR-111). A failure is a failure.
 */
function bitbucketPrRollup(values, destination) {
  const all = Array.isArray(values) ? values : [];
  const mine = bitbucketPrStatuses(all, destination);
  const prs = (list) =>
    list.some((v) => String((v && v.key) || "").startsWith("prs:"));
  const rollup = reduceBitbucketStatuses(mine);
  if (prs(all) && !prs(mine) && rollup !== "FAILURE") return "PENDING";
  return rollup;
}

/** `--reduce-bitbucket`: the statuses response on stdin, `<STATE> <count>` on stdout. */
function runReduceBitbucket({
  argv = process.argv.slice(2),
  input = () => fs.readFileSync(0, "utf8"),
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  const i = argv.indexOf("--destination");
  const destination = i >= 0 ? argv[i + 1] : "";
  if (!destination || destination.startsWith("--")) {
    stderr.write(
      `ci-tree-equivalence: --destination needs a branch\n${USAGE}\n`,
    );
    return 2;
  }
  let body;
  try {
    body = JSON.parse(input());
  } catch {
    body = null;
  }
  // A page that names another page is a partial list: no decision is read off it.
  if (!body || !Array.isArray(body.values) || body.next) {
    stdout.write("UNKNOWN 0\n");
    return 0;
  }
  const mine = bitbucketPrStatuses(body.values, destination);
  const keys = new Set(mine.map((v) => String((v && (v.key || v.name)) || "")));
  stdout.write(`${bitbucketPrRollup(body.values, destination)} ${keys.size}\n`);
  return 0;
}

if (require.main === module && process.argv.includes("--push-policy")) {
  process.exitCode = runPushPolicy();
} else if (
  require.main === module &&
  process.argv.includes("--reduce-bitbucket")
) {
  process.exitCode = runReduceBitbucket();
} else if (require.main === module) {
  // exitCode, not exit(): process.exit() right after a write to a pipe truncated a large --json record at
  // the pipe buffer while exiting 0 (CR3-7, task.172 QA cycle 3).
  run()
    .then((r) => {
      process.exitCode = r.exitCode;
    })
    // run() does not reject; if it ever does, that is NOT a pass.
    .catch(() => {
      process.exitCode = 1;
    });
}

module.exports = {
  REASONS,
  DEFAULT_PATTERNS,
  MAX_ANCESTORS,
  USAGE,
  classifyTreeEquivalence,
  isDocsPath,
  fixPathTarget,
  exitCodeFor,
  reduceChecks,
  reduceBitbucketStatuses,
  bitbucketPrStatuses,
  bitbucketPrRollup,
  runPushPolicy,
  runReduceBitbucket,
  parsePipelineConfig,
  parseConfig,
  defaultConfig,
  readConfig,
  readConfigAtCommit,
  configTextAtCommit,
  // The bounded runner and the block reader's refusals, for finalise-rerun-at-head.js (task.319).
  UsageError,
  normKey,
  unescaped,
  assertMapping,
  assertBlockRows,
  topLevelKey,
  topLevelKeys,
  spawnCheck,
  killProcessGroup,
  settle,
  DEFAULT_CHECK_TIMEOUT_SECONDS,
  DEFAULT_SETTLE_SECONDS,
  parseArgs,
  listAncestors,
  diffNames,
  githubRollup,
  bitbucketRollup,
  run,
};
