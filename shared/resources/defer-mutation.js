#!/usr/bin/env node
// ---------------------------------------------------------------------------
// defer-mutation.js — the single writer of deferred-mutation records.
//
// A tracker mutation that cannot (or should not) be performed becomes a record
// appended to a per-run NDJSON journal. This file is the ONLY place that knows
// the record schema; everything downstream is a rendering of what it wrote.
//
// Dual entry point BY REQUIREMENT, not by taste: the same file must be
// `node defer-mutation.js …` from a shell chokepoint and `require`d from node
// in the same process. That forces CommonJS — an ESM module cannot be both
// without a wrapper. (bundle_skill.py follows either form, so bundling does not
// decide this; see yaml-subset.js's header for the same note.)
//
// Two invariants this file exists to hold:
//
//   1. An unknown `kind` is REFUSED, not written. A record nothing can render is
//      worse than no record: the checklist silently omits an action a human must
//      perform, which is the exact invisible-drift failure the sequence removes.
//      The roster is read from shared/resources/tracker-access-record.md, so the
//      schema doc and the writer cannot drift apart.
//
//      That path is written out in full DELIBERATELY. It is how bundle_skill.py
//      learns to copy the schema doc into each skill's references/ alongside this
//      file — the doc is loaded at runtime via `__dirname`, not `require`, so
//      nothing else would tell the bundler it is a dependency, and a bundled
//      skill would throw "Cannot read the kind roster" on first use. Resolution
//      works in both layouts because the doc always sits next to this file.
//
//   2. No credential value is ever written. Redaction happens HERE, before the
//      line hits disk, and again in the renderers on the way out. Committing the
//      rendered script and JSON is defensible only because of this.
//
// Usage (CLI):
//   node defer-mutation.js --kind github.issue.comment --system github \
//     --intent "Post the DoD summary" --target '{"issue":"230"}' \
//     --command-argv '["gh","issue","comment","230","--body-file","-"]' \
//     --stdin-file body.md --json
//
// Usage (library):
//   const { defer, KINDS } = require("./defer-mutation.js");
//   defer({ kind: "jira.transition", system: "jira", intent: "…", … });
//
// Tested by tests/handover-render.test.mjs and tests/stage-access-gate.test.mjs
// (`node --test` — see package.json). The path is written relative on purpose:
// a shared-resources path prefix here would make bundle_skill.py follow it
// and copy the test suite into every consuming skill. (Spelling that prefix
// out — even inside a comment, even with an ellipsis — is itself enough to
// make the bundler chase it, which is how this warning first appeared.)
// ---------------------------------------------------------------------------
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { parseYamlSubset } = require("./yaml-subset.js");

const SCHEMA_VERSION = 1;
const DEFAULT_JOURNAL = ".claude/state/tracker-actions.jsonl";
const ROSTER_DOC = "tracker-access-record.md";

// Asserted, not merely non-zero. A reformatted row used to truncate the roster
// silently; pinning the count turns that into an immediate, explicit failure.
const EXPECTED_KIND_COUNT = 21;

const ACCESS_MODES = Object.freeze([
  "full",
  "read-only",
  "approve",
  "command",
  "manual",
]);

const CONSEQUENCES = Object.freeze([
  "state-drift",
  "communication",
  "irreversible",
]);

// Hardening is allowed, softening is not. A caller that knows this particular
// board move cannot be undone may raise it; nobody may lower a merge to a
// comment. Index = severity.
const CONSEQUENCE_RANK = Object.freeze({
  communication: 0,
  "state-drift": 1,
  irreversible: 2,
});

// ---------------------------------------------------------------------------
// Roster — parsed from tracker-access-record.md, never hard-coded here
// ---------------------------------------------------------------------------
//
// The schema doc is the roster. Duplicating it in JS would create exactly the
// two-sources-of-truth problem the doc's own header warns about, and would let
// the totality test pass vacuously against a list the doc no longer contains.

/**
 * Parse the kind roster out of the schema document.
 *
 * A kind row is a table row whose first cell is a single backtick-quoted token
 * containing a dot, inside a table whose header's first cell is exactly
 * `` `kind` ``. That shape is asserted by the doc itself, so a well-meaning
 * reformat that breaks it fails the suite rather than silently emptying the
 * roster.
 *
 * @param {string} text - contents of tracker-access-record.md
 * @returns {Map<string, {kind: string, consequence: string, produces: string|null}>}
 */
function parseRoster(text) {
  const roster = new Map();
  const lines = String(text).split(/\r?\n/);
  let inKindTable = false;

  for (const line of lines) {
    const cells = splitRow(line);
    if (!cells) {
      // A blank line ends a table; prose between two tables must not let the
      // second one inherit the first one's header.
      if (!line.trim()) inKindTable = false;
      continue;
    }
    // Match the roster table's FULL header, not just its first cell. The field
    // reference table earlier in the doc has a data row whose first cell is
    // literally `kind` (`| `kind` | string | yes | Must appear in the roster |`),
    // which a first-cell-only test reads as the start of a roster table — and
    // then treats `consequence`, `produces` and the rest of that table's rows as
    // malformed kinds.
    if (cells[0] === "`kind`" && /consequence/i.test(cells[1] || "")) {
      inKindTable = true;
      continue;
    }
    // The |---|---| separator row.
    if (/^:?-{2,}:?$/.test(cells[0])) continue;
    if (!inKindTable) continue;

    const m = /^`([a-z0-9]+(?:\.[a-z0-9-]+)+)`$/.exec(cells[0]);
    if (!m) {
      // A cell that merely ends the table (prose, a totals row) is fine. A cell
      // that LOOKS like a kind but does not parse is not: bolding one row used
      // to silently drop every kind below it, `roster.size` stayed non-zero so
      // nothing complained, and `defer()` then threw "unknown kind" inside the
      // stage-CLI gate — which swallows the throw into a warning and returns
      // `deferred` with NO record. The board move was neither performed nor
      // recorded. Refuse loudly instead.
      if (cells[0].includes("`")) {
        throw new Error(
          `${ROSTER_DOC}: row "${cells[0]}" sits in a kind table but does not ` +
            `parse as a kind. Keep the shape documented under "The 21 kinds" — ` +
            `a single backtick-quoted token, no other markup.`,
        );
      }
      inKindTable = false;
      continue;
    }
    const kind = m[1];
    const consequence = (cells[1] || "").trim();
    const producesCell = (cells[2] || "").trim();
    const produces =
      !producesCell || producesCell === "—" || producesCell === "-"
        ? null
        : producesCell.replace(/`/g, "").trim();

    if (!CONSEQUENCES.includes(consequence)) {
      throw new Error(
        `${ROSTER_DOC}: kind "${kind}" has unknown consequence "${consequence}". ` +
          `Known: ${CONSEQUENCES.join(", ")}`,
      );
    }
    roster.set(kind, { kind, consequence, produces });
  }

  if (roster.size !== EXPECTED_KIND_COUNT) {
    throw new Error(
      `${ROSTER_DOC}: parsed ${roster.size} kinds, expected ${EXPECTED_KIND_COUNT}. ` +
        `Either the roster table shape changed (see the note under "The 21 kinds") ` +
        `or a kind was added/removed without updating EXPECTED_KIND_COUNT in ` +
        `defer-mutation.js. Both halves must move together — that is what stops a ` +
        `silent truncation from looking like a smaller roster.`,
    );
  }
  return roster;
}

/** Split a markdown table row into trimmed cells, or null if it is not one. */
function splitRow(line) {
  const t = String(line).trim();
  if (!t.startsWith("|") || !t.endsWith("|")) return null;
  return t
    .slice(1, -1)
    .split("|")
    .map((c) => c.trim());
}

let _rosterCache = null;

/**
 * The 21 kinds, keyed by kind. Memoised — the doc is read once per process.
 * @param {{docPath?: string, force?: boolean}} [opts]
 */
function loadRoster(opts = {}) {
  if (_rosterCache && !opts.force && !opts.docPath) return _rosterCache;
  const docPath = opts.docPath || path.join(__dirname, ROSTER_DOC);
  let text;
  try {
    text = fs.readFileSync(docPath, "utf8");
  } catch (e) {
    throw new Error(
      `Cannot read the kind roster at ${docPath}: ${e.message}. ` +
        `defer-mutation.js refuses to write a record it cannot validate.`,
    );
  }
  const roster = parseRoster(text);
  if (!opts.docPath) _rosterCache = roster;
  return roster;
}

// ---------------------------------------------------------------------------
// Redaction
// ---------------------------------------------------------------------------

// Anchored to whole `_`-delimited segments. An unanchored /AUTH/ matched
// GIT_AUTHOR_NAME — which git sets in every hook context — so an operator's own
// name was swept out of intents and checklist fields and replaced with
// `$GIT_AUTHOR_NAME`. AUTHOR is excluded explicitly for that reason.
const SECRET_ENV_NAME =
  /(^|_)(TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIALS?|API_?KEY|APIKEY|PAT|AUTH)(_|$)/i;
const NOT_SECRET_ENV_NAME = /AUTHOR/i;

// Flags whose FOLLOWING argv element is a secret — but only for clients that
// actually use them that way. `-u` and `-p` used to be masked unconditionally,
// which turned `git push -u origin HEAD` into `git push -u «redacted» HEAD` and
// `mkdir -p docs/tasks` into `mkdir -p «redacted»`.
const SECRET_FLAGS = new Set([
  "--token",
  "--password",
  "--passwd",
  "--api-key",
  "--apikey",
  "--secret",
  "--auth",
]);

// `-u` / `-p` are secret-bearing ONLY for these clients.
const SHORT_FLAG_CLIENTS = new Set([
  "curl",
  "wget",
  "mysql",
  "mysqldump",
  "psql",
  "mongo",
  "mongosh",
  "redis-cli",
  "svn",
]);
const SHORT_SECRET_FLAGS = new Set(["-u", "-p"]);

const REDACTED = "«redacted»";

// Unambiguous secret shapes. These are safe to apply to EVERY string, because
// nothing else looks like them — a `ghp_…` or an `ATATT…` in a comment body is a
// leaked token, not prose.
const SECRET_SHAPES = [
  /\b(?:ghp|gho|ghs|ghu|ghr)_[A-Za-z0-9]{16,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /\bATATT[A-Za-z0-9_\-=+/]{20,}\b/g,
  /\b(?:Bearer|bearer)\s+[A-Za-z0-9._\-=+/]{12,}/g,
  /\b(?:Basic|basic)\s+[A-Za-z0-9+/=]{12,}/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
];

// Credentials embedded in a URL's userinfo. Only the password half is masked —
// the user half is usually a username or an email and is worth keeping.
const URL_USERINFO = /(\/\/[^/\s:@]+):([^/\s@]+)@/g;

/**
 * Build the env-sweep replacement table: secret VALUE → `$NAME`.
 *
 * Replacing with the variable's name rather than a blanket mask is what keeps
 * the output actionable — an operator reading the script learns which variable
 * to export, without ever seeing its contents.
 *
 * @param {Record<string,string>} env
 * @returns {Array<[string, string]>} longest value first, so a value that is a
 *   prefix of another cannot mask the longer one.
 */
function buildEnvTable(env) {
  const pairs = [];
  for (const [name, value] of Object.entries(env || {})) {
    if (!value || typeof value !== "string") continue;
    if (!SECRET_ENV_NAME.test(name) || NOT_SECRET_ENV_NAME.test(name)) continue;
    // Length floor with an escape hatch for short-but-real secrets. A flat
    // 8-char floor let `JIRA_PASSWORD=hunter2` through; sweeping everything ≥1
    // char instead would replace `AUTH_MODE=full`'s value wherever the word
    // "full" appeared. Requiring a digit below 12 characters separates a
    // password from a config word without a hand-maintained deny-list.
    if (value.length < 6) continue;
    if (value.length < 12 && !/\d/.test(value)) continue;
    pairs.push([value, `$${name}`]);
  }
  pairs.sort((a, b) => b[0].length - a[0].length);
  return pairs;
}

/** Replace every occurrence of each secret value with its `$NAME`. */
function sweepEnv(str, envTable) {
  let out = str;
  for (const [value, name] of envTable) {
    if (out.includes(value)) out = out.split(value).join(name);
  }
  return out;
}

/** Replace unambiguous secret shapes with the mask. Safe on any string. */
function sweepShapes(str) {
  let out = str;
  for (const re of SECRET_SHAPES) {
    re.lastIndex = 0;
    out = out.replace(re, (m) => (m.includes("$") ? m : REDACTED));
  }
  URL_USERINFO.lastIndex = 0;
  out = out.replace(URL_USERINFO, (m, prefix, pass) =>
    pass.startsWith("$") ? m : `${prefix}:${REDACTED}@`,
  );
  return out;
}

/**
 * Redact one string: env sweep first (so names survive), then shape match.
 *
 * Applies only the UNAMBIGUOUS rules — never the high-entropy heuristic, which
 * belongs to credential-bearing positions alone (see `maskOrName`).
 *
 * @param {string} str
 * @param {Array<[string,string]>} envTable
 */
function redactString(str, envTable) {
  if (typeof str !== "string" || !str) return str;
  return sweepShapes(sweepEnv(str, envTable));
}

/**
 * True when a value has already been through redaction.
 *
 * Matches a variable reference ANYWHERE in the string, not just a bare `$NAME`.
 * The first version tested `/^\$IDENT$/`, which covered `--token $GITHUB_TOKEN`
 * but not `Authorization: Bearer $JIRA_API_TOKEN` — so an auth header the write
 * pass had correctly named was masked to `«redacted»` by the render pass, and
 * the operator lost the one piece of information that made the script runnable.
 * Same defect as the bare case, one nesting level down.
 */
function alreadyRedacted(raw) {
  return raw.includes(REDACTED) || /\$[A-Za-z_][A-Za-z0-9_]*/.test(raw);
}

/**
 * A secret's replacement: its `$NAME` when the env sweep recognised it,
 * otherwise the blanket mask.
 *
 * "Unchanged by the sweeps" is the signal that nothing recognised this value —
 * and an unrecognised value sitting in a known-secret position is exactly the
 * one we must not emit. Masking is the fail-closed answer.
 */
function maskOrName(raw, envTable) {
  const s = String(raw);

  // IDEMPOTENCY. Redaction runs twice by design — once in `defer()` on write,
  // once in `render()` on read as defence in depth. Without this guard the
  // second pass saw the `$GITHUB_TOKEN` the first pass produced, found it
  // unchanged by the sweeps, concluded "unrecognised value in a secret
  // position", and masked it to «redacted» — handing the operator a script
  // containing `--token «redacted»` that cannot run, in the one mode whose
  // entire purpose is a runnable script.
  if (alreadyRedacted(s)) return s;

  const swept = redactString(s, envTable);
  if (swept !== s) return swept; // env named it, or a shape matched it

  // Nothing recognised it. Every path that reaches here is already a
  // credential-bearing position — the value after an explicit secret flag, the
  // value after `-u`/`-p` for a client that uses them for credentials, or an
  // auth header's value — so fail closed and mask, whatever it looks like. A
  // three-character token is still a token.
  return REDACTED;
}

/**
 * Redact an argv array, honouring flag pairs.
 *
 * `-u user:app_password` is the case the shape matcher alone gets wrong: the
 * username half is not secret-shaped, so masking the whole element is the only
 * safe answer.
 *
 * @param {string[]} argv
 * @param {Array<[string,string]>} envTable
 */
function redactArgv(argv, envTable) {
  if (!Array.isArray(argv)) return argv;
  // `-u` / `-p` mean credentials for curl and the database clients, and mean
  // "set upstream" / "make parents" for git and mkdir. Deciding by argv[0] is
  // what stops `git push -u origin HEAD` becoming `git push -u «redacted» HEAD`.
  const client = String(argv[0] || "")
    .split("/")
    .pop();
  const shortFlagsAreSecret = SHORT_FLAG_CLIENTS.has(client);

  const out = [];
  for (let i = 0; i < argv.length; i++) {
    const cur = String(argv[i]);

    // `--token=abc` — flag and value in one element.
    const inline = /^(--[a-z-]+)=([\s\S]+)$/.exec(cur);
    if (inline && SECRET_FLAGS.has(inline[1])) {
      out.push(`${inline[1]}=${maskOrName(inline[2], envTable)}`);
      continue;
    }

    out.push(redactString(cur, envTable));

    const next = i + 1 < argv.length ? String(argv[i + 1]) : undefined;
    const isAuthHeader =
      (cur === "-H" || cur === "--header") &&
      next !== undefined &&
      /^(authorization|proxy-authorization|x-api-key)\s*:/i.test(next);
    const isShortSecret = shortFlagsAreSecret && SHORT_SECRET_FLAGS.has(cur);

    if (next === undefined) continue;
    if (!SECRET_FLAGS.has(cur) && !isShortSecret && !isAuthHeader) continue;

    if (isAuthHeader) {
      // Keep the header NAME, redact only its value — `Authorization: Bearer
      // $JIRA_API_TOKEN` is actionable; a bare `«redacted»` is not.
      const m = /^([^:]+):\s*([\s\S]*)$/.exec(next);
      out.push(m ? `${m[1]}: ${maskOrName(m[2], envTable)}` : REDACTED);
    } else {
      out.push(maskOrName(next, envTable));
    }
    i++;
  }
  return out;
}

/**
 * Recursively redact every string in a record.
 * `command.argv` gets the flag-pair treatment; everything else gets the
 * env + shape sweep.
 *
 * @param {any} value
 * @param {Array<[string,string]>} envTable
 * @param {string} [keyPath]
 */
function redactDeep(value, envTable, keyPath = "") {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactString(value, envTable);
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    if (keyPath === "command.argv") return redactArgv(value, envTable);
    return value.map((v, i) => redactDeep(v, envTable, `${keyPath}[${i}]`));
  }
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    // Keys are redacted too. `desired` and `target` are free-form objects, and a
    // credential used as a KEY (a header map, a field name taken from input)
    // otherwise survived untouched into describeDesired() and the raw json
    // records array.
    const safeKey = redactString(k, envTable);
    out[safeKey] = redactDeep(v, envTable, keyPath ? `${keyPath}.${k}` : k);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Access mode
// ---------------------------------------------------------------------------

/**
 * The tracker access mode in force, for a node caller.
 *
 * ENVIRONMENT ONLY, and unset reads as `full`. Both halves are deliberate.
 *
 * `resolve-platform.sh` is the single resolver: it reads `access.tracker` from
 * skills-config.yaml, reads the env override, applies most-restrictive-wins,
 * validates the result and EXPORTS `ACCESS_TRACKER`. Re-deriving any of that
 * here would put a second, subtly different resolution path in the tree — which
 * is the exact class of silent escalation task 60 spent a cycle closing. A node
 * script reads the resolver's answer; it does not compute its own.
 *
 * Unset therefore means "nobody resolved a restriction", which is `full`. That
 * is the safe default for the blast radius that matters: `jira-stage.js` and
 * `gh-stage.js` are called from seven skills and six pipeline steps, and a gate
 * that fires for a full-access consumer stops every one of them moving cards.
 *
 * An UNRECOGNISED value is refused rather than defaulted. Defaulting a typo to
 * `full` would turn a declared restriction into an unintended tracker write —
 * the failure mode this whole sequence exists to remove.
 *
 * @param {Record<string,string>} [env]
 * @returns {"full"|"read-only"|"approve"|"command"|"manual"}
 */
function resolveAccessTracker(env = process.env, opts = {}) {
  // THREE tiers, most-restrictive-wins — the same contract resolve-platform.sh
  // documents, and the reason this function now lives in one place instead of
  // four. Cycle 2 found what four copies cost: jira-sync.js read one env var,
  // the stage CLIs read a different one, and NONE of them read the config key an
  // operator actually edits, so `access: {tracker: manual}` in skills-config.yaml
  // was ignored by every bare `node …` invocation the skills document.
  //
  //   1. ACCESS_TRACKER                — the resolver's own output
  //   2. AGENT_SKILLS_ACCESS_TRACKER   — the knob an operator sets
  //   3. access.tracker in skills-config.yaml — the committed declaration
  //
  // Most-restrictive-wins rather than first-wins: picking the wrong tracker is a
  // mistake, picking the wrong access is an escalation. A run may lock itself
  // down; nothing may loosen a config that deliberately restricts.
  const candidates = [
    env && env.ACCESS_TRACKER,
    env && env.AGENT_SKILLS_ACCESS_TRACKER,
  ];
  if (opts.config !== false) candidates.push(readConfiguredAccessTracker(opts));

  const seen = candidates.map((v) => String(v || "").trim()).filter(Boolean);
  if (!seen.length) return "full";

  // An UNRECOGNISED value is refused rather than defaulted. Defaulting a typo to
  // `full` would turn a declared restriction into an unintended tracker write —
  // the failure mode this whole sequence exists to remove.
  for (const raw of seen) {
    if (!ACCESS_MODES.includes(raw)) {
      throw new Error(
        `ACCESS_TRACKER="${raw}" is not a recognised access mode. ` +
          `Known: ${ACCESS_MODES.join(", ")}. Refusing rather than defaulting to ` +
          `"full", because that would silently escalate a declared restriction ` +
          `into a tracker write.`,
      );
    }
  }
  return seen.reduce((a, b) => (ACCESS_RANK[b] < ACCESS_RANK[a] ? b : a));
}

// Permissiveness order, least to most. Mirrors resolve-platform.sh's access_rank.
const ACCESS_RANK = Object.freeze({
  manual: 0,
  command: 1,
  approve: 2,
  "read-only": 3,
  full: 4,
});

// `access.tracker` from skills-config.yaml, or "" when absent/unreadable.
//
// Memoised per resolved path: the gate is consulted once per mutation and a
// stat+parse per Jira call is waste. A malformed file reads as ABSENT here on
// purpose — the strict refusal for that case belongs to read-config.sh, which
// runs before any of this and halts; duplicating it would mean two different
// answers to the same question.
const _cfgAccessCache = new Map();

function readConfiguredAccessTracker({ cwd, configPath } = {}) {
  try {
    let file = configPath;
    if (!file) {
      let dir = cwd || process.cwd();
      for (let i = 0; i < 12; i++) {
        const candidate = path.join(dir, "skills-config.yaml");
        if (fs.existsSync(candidate)) {
          file = candidate;
          break;
        }
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
      }
    }
    if (!file) return "";
    if (_cfgAccessCache.has(file)) return _cfgAccessCache.get(file);
    const doc = parseYamlSubset(fs.readFileSync(file, "utf8"));
    const v = doc && doc.access && doc.access.tracker;
    const out = typeof v === "string" ? v.trim() : "";
    _cfgAccessCache.set(file, out);
    return out;
  } catch (_) {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

/** Serialise with sorted keys so field order cannot change identity. */
function stableStringify(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
    .join(",")}}`;
}

/**
 * sha1-8 over system, kind, target and a fingerprint of what is wanted.
 *
 * Deduplicating on this is what makes rendering idempotent across a resume for
 * free — the pipelines re-emit records when a step re-runs, and the renderer
 * must not list the same action twice.
 */
function computeId(rec) {
  const targetKey = stableStringify(rec.target || null);

  // The fingerprint must separate two mutations that differ only in their
  // PAYLOAD. It previously fell back to `command.argv` alone, so posting the DoD
  // summary and posting the QA gate result to the same issue — identical argv
  // (`gh issue comment 230 --body-file -`), different bodies — produced the same
  // id, and `dedupe` silently discarded one of them. A wanted tracker action
  // vanished from all four renderings with nothing to signal it, which is the
  // precise invisible-drift failure this whole sequence exists to remove, and
  // strictly worse than the status quo it replaces (where a failed mutation at
  // least becomes a warning line).
  //
  // `intent` and `command.stdin` are therefore ALWAYS part of the fingerprint,
  // not a fallback. Two records are the same action only if they say the same
  // thing and carry the same payload.
  const parts = [
    rec.intent || "",
    rec.desired !== null && rec.desired !== undefined
      ? stableStringify(rec.desired)
      : "",
    rec.manual && Array.isArray(rec.manual.fields)
      ? stableStringify(
          rec.manual.fields.map((f) => [f && f.name, f && f.value]),
        )
      : "",
    rec.command && Array.isArray(rec.command.argv)
      ? rec.command.argv.join(" ")
      : "",
    rec.command && rec.command.stdin ? String(rec.command.stdin) : "",
  ];

  return crypto
    .createHash("sha1")
    .update(`${rec.system}|${rec.kind}|${targetKey}|${parts.join(" ")}`)
    .digest("hex")
    .slice(0, 8);
}

// ---------------------------------------------------------------------------
// Journal
// ---------------------------------------------------------------------------

/** Resolve the journal path: explicit arg → env override → default. */
function journalPath({ journal, env = process.env, cwd = process.cwd() } = {}) {
  const p = journal || env.TRACKER_ACTIONS_JOURNAL || DEFAULT_JOURNAL;
  return path.isAbsolute(p) ? p : path.join(cwd, p);
}

/**
 * Next `order` for this journal: one past the highest already present.
 *
 * Read-then-append is not atomic, but `order` is a display hint, not an
 * identity — `id` carries identity and `dependsOn` carries ordering that
 * matters. A duplicate `order` under concurrency degrades to a tie broken by
 * `ts` then `id`, which the renderer already does.
 */
function nextOrder(file) {
  let max = 0;
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    return 1;
  }
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line).order;
      if (Number.isFinite(o) && o > max) max = o;
    } catch {
      // A malformed line contributes no order. It is the renderer's job to
      // warn about it, not the writer's to refuse because of it.
    }
  }
  return max + 1;
}

// ---------------------------------------------------------------------------
// The writer
// ---------------------------------------------------------------------------

/**
 * Build a validated, redacted record WITHOUT writing it.
 * Exported so tests and the renderers can construct records hermetically.
 *
 * @param {object} input
 * @param {object} [opts]
 * @param {Record<string,string>} [opts.env]
 * @param {Map} [opts.roster]
 * @param {string} [opts.now] - ISO timestamp, injectable for determinism
 * @returns {object} the record
 */
function buildRecord(input, opts = {}) {
  const env = opts.env || process.env;
  const roster =
    opts.roster || loadRoster(opts.docPath ? { docPath: opts.docPath } : {});

  if (!input || typeof input !== "object") {
    throw new Error("defer-mutation: a record object is required");
  }

  const kind = String(input.kind || "").trim();
  if (!kind) throw new Error("defer-mutation: `kind` is required");

  const spec = roster.get(kind);
  if (!spec) {
    // Refuse rather than write. See the header's invariant 1.
    throw new Error(
      `defer-mutation: unknown kind "${kind}". It is not in the roster in ` +
        `${ROSTER_DOC}. Add a row there (and a renderer case) before emitting it. ` +
        `Known kinds: ${[...roster.keys()].join(", ")}`,
    );
  }

  const system = String(input.system || kind.split(".")[0]).trim();
  if (system !== kind.split(".")[0]) {
    throw new Error(
      `defer-mutation: system "${system}" disagrees with kind "${kind}" ` +
        `(whose namespace is "${kind.split(".")[0]}")`,
    );
  }

  const access = String(input.access || env.ACCESS_TRACKER || "full").trim();
  if (!ACCESS_MODES.includes(access)) {
    throw new Error(
      `defer-mutation: unknown access mode "${access}". Known: ${ACCESS_MODES.join(", ")}`,
    );
  }

  const intent = String(input.intent || "").trim();
  if (!intent) {
    throw new Error(
      `defer-mutation: \`intent\` is required — it is the only field written for a ` +
        `human, and no renderer can reconstruct it from an argv array`,
    );
  }

  // Consequence: roster default, hardened (never softened) by the caller.
  let consequence = spec.consequence;
  if (input.consequence) {
    const asked = String(input.consequence);
    if (!CONSEQUENCES.includes(asked)) {
      throw new Error(
        `defer-mutation: unknown consequence "${asked}". Known: ${CONSEQUENCES.join(", ")}`,
      );
    }
    if (CONSEQUENCE_RANK[asked] > CONSEQUENCE_RANK[consequence]) {
      consequence = asked;
    }
  }

  const rec = {
    v: SCHEMA_VERSION,
    id: "",
    order: Number.isFinite(input.order) ? input.order : 0,
    dependsOn: Array.isArray(input.dependsOn) ? input.dependsOn.slice() : [],
    ts:
      opts.now ||
      input.ts ||
      new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),

    run: String(input.run || env.PIPELINE_RUN || env.GIT_BRANCH || ""),
    step:
      input.step === undefined || input.step === null ? "" : String(input.step),
    skill: String(input.skill || ""),

    system,
    access,
    kind,
    consequence,
    produces:
      input.produces === undefined ? spec.produces : input.produces || null,

    intent,
    target: input.target || {},
    desired: input.desired === undefined ? null : input.desired,
    observed: input.observed === undefined ? null : input.observed,
    satisfied: input.satisfied === true,

    manual: input.manual || null,
    command: input.command || null,
    verify: input.verify || null,

    retry_of: input.retry_of || null,
  };

  // Redact BEFORE hashing, so an id is stable whether or not a secret happened
  // to be expanded in the caller's environment at the time.
  const envTable = buildEnvTable(env);
  const redacted = redactDeep(rec, envTable);
  redacted.id = input.id || computeId(redacted);
  return redacted;
}

/**
 * Append one record to the journal. Returns the record as written.
 *
 * @param {object} input - the record fields
 * @param {object} [opts] - {journal, env, cwd, now, roster, docPath}
 */
function defer(input, opts = {}) {
  const file = journalPath(opts);
  const rec = buildRecord(
    Number.isFinite(input.order) ? input : { ...input, order: nextOrder(file) },
    opts,
  );
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // One `appendFileSync` of a single line: under 4 KiB this is atomic on POSIX,
  // which is what lets a node script and a shell function write in the same
  // step without a lock.
  fs.appendFileSync(file, `${JSON.stringify(rec)}\n`, "utf8");
  return rec;
}

/**
 * Read a journal into records, skipping malformed lines with a warning.
 * Shared with the renderers so both agree on what "a journal" means.
 *
 * @returns {{records: object[], warnings: string[]}}
 */
function readJournal(file, { onWarn } = {}) {
  const warnings = [];
  const warn = (m) => {
    warnings.push(m);
    if (onWarn) onWarn(m);
  };
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    return { records: [], warnings };
  }
  const records = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (!line.trim()) return;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch (e) {
      warn(`line ${i + 1}: skipped — not valid JSON (${e.message})`);
      return;
    }
    if (!rec || typeof rec !== "object") {
      warn(`line ${i + 1}: skipped — not an object`);
      return;
    }
    if (Number.isFinite(rec.v) && rec.v > SCHEMA_VERSION) {
      // Guessing at a future schema is how a renderer emits a wrong checklist.
      warn(
        `line ${i + 1}: skipped — record schema v${rec.v} is newer than this ` +
          `reader (v${SCHEMA_VERSION})`,
      );
      return;
    }
    if (!rec.kind || !rec.id) {
      warn(`line ${i + 1}: skipped — missing \`id\` or \`kind\``);
      return;
    }
    records.push(rec);
  });
  return { records, warnings };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const USAGE = `Usage: defer-mutation --kind <kind> --intent <text> [options]

Appends one deferred-mutation record to the journal
(default .claude/state/tracker-actions.jsonl, override with TRACKER_ACTIONS_JOURNAL).

Required:
  --kind <k>            one of the roster kinds in ${ROSTER_DOC}
  --intent <text>       one-line, imperative, human-facing

Common:
  --system <s>          jira | github (default: the kind's namespace)
  --access <mode>       ${ACCESS_MODES.join(" | ")} (default: $ACCESS_TRACKER, else full)
  --target <json>       e.g. '{"issue":"PROJ-1","url":"…"}'
  --desired <json>      e.g. '{"status":"In Review"}'
  --consequence <c>     ${CONSEQUENCES.join(" | ")} (may harden the roster default, never soften)
  --produces <sym>      symbol this action yields
  --depends-on <ids>    comma-separated record ids
  --satisfied           mark already-correct
  --retry-of <id>       this is a FAILED full-access mutation, not a policy deferral

Renderings:
  --manual-ui <text>          the click path
  --manual-deep-link <url>    where to start
  --manual-field <n=v>        repeatable
  --command-argv <json>       e.g. '["gh","issue","comment","1","--body-file","-"]'
  --stdin <text> | --stdin-file <path>
  --verify-cmd <cmd>          cheap read-back
  --verify-expect <text>

Provenance:
  --run <r>  --step <s>  --skill <s>

Other:
  --journal <path>      override the journal path
  --list-kinds          print the roster and exit
  --resolve-access      print the resolved access mode and exit (for shell gates)
  --json                print the written record as JSON
  -h, --help`;

function parseArgs(argv) {
  const args = {
    manualFields: [],
    dependsOn: [],
  };
  const rest = argv.slice(2);
  const need = (i, flag) => {
    if (i + 1 >= rest.length) throw new Error(`${flag} requires a value`);
    return rest[i + 1];
  };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    switch (a) {
      case "-h":
      case "--help":
        args.help = true;
        break;
      case "--json":
        args.json = true;
        break;
      case "--resolve-access":
        args.resolveAccess = true;
        break;
      case "--list-kinds":
        args.listKinds = true;
        break;
      case "--satisfied":
        args.satisfied = true;
        break;
      case "--kind":
        args.kind = need(i, a);
        i++;
        break;
      case "--system":
        args.system = need(i, a);
        i++;
        break;
      case "--access":
        args.access = need(i, a);
        i++;
        break;
      case "--intent":
        args.intent = need(i, a);
        i++;
        break;
      case "--consequence":
        args.consequence = need(i, a);
        i++;
        break;
      case "--produces":
        args.produces = need(i, a);
        i++;
        break;
      case "--target":
        args.target = need(i, a);
        i++;
        break;
      case "--desired":
        args.desired = need(i, a);
        i++;
        break;
      case "--depends-on":
        args.dependsOn = need(i, a)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        i++;
        break;
      case "--retry-of":
        args.retryOf = need(i, a);
        i++;
        break;
      case "--manual-ui":
        args.manualUi = need(i, a);
        i++;
        break;
      case "--manual-deep-link":
        args.manualDeepLink = need(i, a);
        i++;
        break;
      case "--manual-field": {
        const raw = need(i, a);
        const eq = raw.indexOf("=");
        if (eq < 1)
          throw new Error(`--manual-field expects name=value, got "${raw}"`);
        args.manualFields.push({
          name: raw.slice(0, eq),
          value: raw.slice(eq + 1),
        });
        i++;
        break;
      }
      case "--command-argv":
        args.commandArgv = need(i, a);
        i++;
        break;
      case "--stdin":
        args.stdin = need(i, a);
        i++;
        break;
      case "--stdin-file":
        args.stdinFile = need(i, a);
        i++;
        break;
      case "--verify-cmd":
        args.verifyCmd = need(i, a);
        i++;
        break;
      case "--verify-expect":
        args.verifyExpect = need(i, a);
        i++;
        break;
      case "--run":
        args.run = need(i, a);
        i++;
        break;
      case "--step":
        args.step = need(i, a);
        i++;
        break;
      case "--skill":
        args.skill = need(i, a);
        i++;
        break;
      case "--journal":
        args.journal = need(i, a);
        i++;
        break;
      default:
        throw new Error(`unknown flag "${a}"`);
    }
  }
  return args;
}

function parseJsonFlag(raw, flag) {
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`${flag} must be valid JSON: ${e.message}`);
  }
}

function run({
  argv = process.argv,
  env = process.env,
  cwd = process.cwd(),
} = {}) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (e) {
    console.error(`Error: ${e.message}`);
    console.error(USAGE);
    return { exitCode: 2 };
  }

  if (args.help) {
    console.log(USAGE);
    return { exitCode: 0 };
  }

  let roster;
  try {
    roster = loadRoster();
  } catch (e) {
    console.error(`Error: ${e.message}`);
    return { exitCode: 2 };
  }

  // The one resolver, reachable from a shell. jira-sprint-lib.sh calls this
  // rather than carrying a fourth copy of the mode table — and a copy is exactly
  // what a shell gate cannot keep in step, since the config tier needs a YAML
  // read that bash has no business doing.
  if (args.resolveAccess) {
    try {
      console.log(resolveAccessTracker());
      return { exitCode: 0 };
    } catch (e) {
      console.error(e.message);
      return { exitCode: 2 };
    }
  }

  if (args.listKinds) {
    for (const spec of roster.values()) {
      console.log(`${spec.kind}\t${spec.consequence}\t${spec.produces || "-"}`);
    }
    return { exitCode: 0, kinds: roster.size };
  }

  let stdin = args.stdin;
  if (args.stdinFile !== undefined) {
    try {
      stdin = fs.readFileSync(args.stdinFile, "utf8");
    } catch (e) {
      console.error(`Error: --stdin-file unreadable: ${e.message}`);
      return { exitCode: 2 };
    }
  }

  let input;
  try {
    const commandArgv = parseJsonFlag(args.commandArgv, "--command-argv");
    if (commandArgv !== undefined && !Array.isArray(commandArgv)) {
      throw new Error("--command-argv must be a JSON array");
    }
    input = {
      kind: args.kind,
      system: args.system,
      access: args.access,
      intent: args.intent,
      consequence: args.consequence,
      produces: args.produces,
      dependsOn: args.dependsOn,
      satisfied: args.satisfied,
      retry_of: args.retryOf,
      target: parseJsonFlag(args.target, "--target"),
      desired: parseJsonFlag(args.desired, "--desired"),
      run: args.run,
      step: args.step,
      skill: args.skill,
      manual:
        args.manualUi || args.manualDeepLink || args.manualFields.length
          ? {
              deepLink: args.manualDeepLink || null,
              ui: args.manualUi || "",
              fields: args.manualFields,
            }
          : null,
      command:
        commandArgv !== undefined
          ? { argv: commandArgv, stdin: stdin === undefined ? null : stdin }
          : null,
      verify:
        args.verifyCmd || args.verifyExpect
          ? { cmd: args.verifyCmd || "", expect: args.verifyExpect || "" }
          : null,
    };
  } catch (e) {
    console.error(`Error: ${e.message}`);
    return { exitCode: 2 };
  }

  let rec;
  try {
    rec = defer(input, { journal: args.journal, env, cwd, roster });
  } catch (e) {
    console.error(`Error: ${e.message}`);
    return { exitCode: 2 };
  }

  if (args.json) console.log(JSON.stringify(rec, null, 2));
  else console.log(`📝 deferred ${rec.kind} (${rec.id}) — ${rec.intent}`);
  return { exitCode: 0, record: rec };
}

if (require.main === module) {
  const r = run();
  process.exit(r.exitCode || 0);
}

module.exports = {
  SCHEMA_VERSION,
  DEFAULT_JOURNAL,
  ACCESS_MODES,
  CONSEQUENCES,
  CONSEQUENCE_RANK,
  resolveAccessTracker,
  readConfiguredAccessTracker,
  ACCESS_RANK,
  parseRoster,
  loadRoster,
  buildEnvTable,
  redactString,
  maskOrName,
  redactArgv,
  redactDeep,
  stableStringify,
  computeId,
  journalPath,
  nextOrder,
  buildRecord,
  defer,
  readJournal,
  parseArgs,
  run,
  USAGE,
};
