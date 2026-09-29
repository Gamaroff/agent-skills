// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/call-sites.js. Regenerate via `npm run bundle`.
"use strict";

/**
 * call-sites.js — every place shipped source INVOKES one of this repository's
 * engines, measured rather than recalled.
 *
 * Why this exists (task.129, obs #120). A task that scopes itself as "the N
 * call sites of engine X" makes a claim about a population, and review checked
 * the N it named and never the population. On task.121 the document named three
 * `tracker-comment.js` sites and one orchestrator duplicate; the collector the
 * task's own guard reused found two more in scope — one a live consumer a
 * success criterion would have forbidden. They were found only because the
 * reviewer happened to run the collector. The collector lived inside
 * `tests/comment-slot-coverage.test.mjs`, where no review step could name it.
 * It lives here now, and the guard test imports it: the review and the guard
 * cannot disagree about what a call site is, because there is one definition.
 *
 * What a call site is. A line that BEGINS an invocation of the engine —
 * optionally indented, optionally `command node` (the form that survives an nvm
 * shell function shadowing `node`), optionally inside a `VAR=$(…)` capture — in
 * a shipped source. A sentence that mentions the engine is not a call site. A
 * shell invocation continues across `\`-terminated lines and is reassembled
 * before its flags are read; reading only the first line would report every
 * multi-line call as flagless.
 *
 * Shipped source (the roots):
 *   shared/resources/*.md and *.sh        the sources skills are bundled from
 *   skills/*\/SKILL.md                     skill bodies
 *   skills/*\/references/*.md              only the UN-bannered ones — a copy
 *                                          headed AUTO-GENERATED is bundle output,
 *                                          ~30 echoes of one source; a
 *                                          hand-authored reference (develop-bug's
 *                                          step docs) is a source like any other
 *   skills/*\/scripts/*.sh, scripts/*.sh  the shell the harness runs and no agent
 *                                          reads (the roots
 *                                          mutation-call-site-coverage.test.js
 *                                          already scans; bug.14)
 * `docs/` is excluded: a task document quoting a call is showing the BEFORE side
 * of a diff, not shipping a call.
 *
 * Contract:
 *   node call-sites.js --engine <name> [--root <dir>] [--json]
 *   Every outcome is a row of REASONS below — reason, exit code and meaning are
 *   defined there ONCE, every exit path takes its code from that table, and
 *   call-sites.test.mjs drives each row and asserts the code. Two cycles of QA
 *   each found this header's hand-written list saying something the code did
 *   not do (QA cycle 2, narrowing-residue move: consolidate the contract).
 *   --json → { reason, exitCode, engine, root, count, sites: [{ file, line,
 *              engine, stage, kind, slots }] }
 *
 * Root. With no `--root`, the cwd's git top level (the cwd itself outside a
 * repository), so the CLI answers the same from any directory in the repo. An
 * explicit `--root` is measured AS GIVEN — never widened to an enclosing
 * repository: an exported tree (`git archive <rev> | tar -x -C <dir>`) has no
 * `.git` of its own, and measuring a population as of an earlier commit is
 * exactly what reviewing an old document needs, wherever the export sits. Never
 * `__dirname`: bundled into `.agents/skills/<skill>/references/`, this file
 * would otherwise measure the inside of a skill.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

/**
 * The invocation shape of each engine. The first two are the guard's shapes,
 * moved here unchanged — `stakeholder-summary-cli` deliberately requires a
 * `$(` for a capture, because every such site captures the rendered lead —
 * so the guard's population is exactly what it was before the lift.
 *
 * The rest take the general shape, which also admits the two wrappers shipped
 * prose puts in front of `node`: a retry/record helper
 * (`tracker_call_with_retry node … tracker-issue.js \` in the finalise step
 * doc) and a guard test (`[ -n "$X" ] && node … tracker-issue.js`). A shape
 * that stops at `node` misses both — the same class of miss as the bare-`node`
 * anchor that hid the PreCompact hook's `$(command node …)` (bug.14).
 */
const general = (file) =>
  new RegExp(
    String.raw`^\s*(?:\[[^\]]*\]\s*&&\s*)?(?:(?:tracker_call_with_retry|tracker_write)\s+)?` +
      String.raw`(?:[A-Za-z_][A-Za-z0-9_]*=)?\$?\(?\s*(?:command\s+)?node\s+.*` +
      file.replace(/[.]/g, "\\."),
  );

const ENGINES = Object.freeze({
  "tracker-comment": {
    file: "tracker-comment.js",
    re: /^\s*(?:[A-Za-z_][A-Za-z0-9_]*=)?\$?\(?\s*(?:command\s+)?node\s+.*tracker-comment\.js/,
  },
  "stakeholder-summary-cli": {
    file: "stakeholder-summary-cli.js",
    re: /^\s*(?:[A-Za-z_][A-Za-z0-9_]*=)?\$\(\s*(?:command\s+)?node\s+.*stakeholder-summary-cli\.js|^\s*(?:command\s+)?node\s+.*stakeholder-summary-cli\.js/,
  },
  "gh-stage": { file: "gh-stage.js", re: general("gh-stage.js") },
  "jira-stage": { file: "jira-stage.js", re: general("jira-stage.js") },
  "tracker-issue": {
    file: "tracker-issue.js",
    re: general("tracker-issue.js"),
  },
});

const BANNER = "AUTO-GENERATED";

/** Every outcome the CLI can report. `exitCode` is unique per non-zero reason,
 *  so a caller can branch on the code alone: exit 1 is ONLY `no-roots`, never a
 *  crash that happened to exit 1 (QA cycle 2, C2-CR-2). */
const REASONS = Object.freeze({
  ok: Object.freeze({ exitCode: 0, meaning: "sites found" }),
  empty: Object.freeze({
    exitCode: 0,
    meaning:
      "the walk ran over a source tree and found none — a claim about the instrument as much as the tree",
  }),
  "no-roots": Object.freeze({
    exitCode: 1,
    meaning:
      "not a source tree (no shared/resources/ beside a skills/*/SKILL.md) — a consumer install keeps skills as bundled copies; no number is reported",
  }),
  usage: Object.freeze({
    exitCode: 2,
    meaning:
      "unknown engine, unknown flag, a flag with no operand, or a root that is not a directory",
  }),
  unreadable: Object.freeze({
    exitCode: 3,
    meaning:
      "a directory or file under the root could not be read — the population is unknown, not empty",
  }),
  "internal-error": Object.freeze({
    exitCode: 4,
    meaning: "the collector failed for a reason it does not classify",
  }),
});

/** A read failure the CLI reports as `unreadable`, carrying the path. */
class Unreadable extends Error {
  constructor(where, cause) {
    super(`${where}: ${cause.code || cause.message}`);
    this.where = where;
  }
}

// "Not there" is the only quiet answer. Anything else — EACCES, EIO — means the
// walk could not look, and reporting it as an empty directory would turn
// "could not look" into "found nothing" (QA cycle 2, C2-CR-5).
const ABSENT = new Set(["ENOENT", "ENOTDIR", "ELOOP"]);

function listDir(dir) {
  try {
    return fs.readdirSync(dir).sort();
  } catch (e) {
    if (ABSENT.has(e.code)) return [];
    throw new Unreadable(dir, e);
  }
}

/** A name that passes a suffix filter is read only when it is a regular file:
 *  a directory named `x.md` or a dangling symlink would otherwise throw out of
 *  the walk, outside the CLI's exit-code contract (QA cycle 1, CR-6). */
function isFile(abs) {
  try {
    return fs.statSync(abs).isFile();
  } catch (e) {
    if (ABSENT.has(e.code)) return false;
    throw new Unreadable(abs, e);
  }
}

function readText(abs) {
  try {
    return fs.readFileSync(abs, "utf8");
  } catch (e) {
    throw new Unreadable(abs, e);
  }
}

/** A generated `references/` copy carries the banner after its frontmatter —
 *  a `description:` routinely runs past 400 characters on its own, so the head
 *  is taken by LINES (a structural bound), not by bytes. */
function isBannered(abs) {
  const head = readText(abs).split("\n").slice(0, 20).join("\n");
  return head.includes(BANNER);
}

/** Every shipped source under `root`, as absolute paths, in a stable order. */
function shippedSources(root) {
  const out = [];
  const shared = path.join(root, "shared", "resources");
  for (const f of listDir(shared)) {
    if (f.endsWith(".md") || f.endsWith(".sh")) out.push(path.join(shared, f));
  }
  const skills = path.join(root, "skills");
  for (const skill of listDir(skills)) {
    const md = path.join(skills, skill, "SKILL.md");
    if (isFile(md)) out.push(md);
    const refs = path.join(skills, skill, "references");
    for (const f of listDir(refs)) {
      if (!f.endsWith(".md")) continue;
      const abs = path.join(refs, f);
      if (isFile(abs) && !isBannered(abs)) out.push(abs);
    }
    const scripts = path.join(skills, skill, "scripts");
    for (const f of listDir(scripts)) {
      if (f.endsWith(".sh")) out.push(path.join(scripts, f));
    }
  }
  for (const f of listDir(path.join(root, "scripts"))) {
    if (f.endsWith(".sh")) out.push(path.join(root, "scripts", f));
  }
  return out.filter(isFile);
}

/** The roots `shippedSources` walks. */
const ROOTS = Object.freeze(["shared/resources", "skills", "scripts"]);

/** Is `root` a tree this collector can measure? The marker is the pair only a
 *  skills SOURCE tree has: `shared/resources/` and at least one
 *  `skills/<name>/SKILL.md`. "Any root exists" accepted a consumer's own
 *  `scripts/` and answered `empty` in every install that had one (QA cycle 2,
 *  C2-CR-1). */
function isSourceTree(root) {
  let shared = false;
  try {
    shared = fs.statSync(path.join(root, "shared", "resources")).isDirectory();
  } catch (e) {
    if (!ABSENT.has(e.code))
      throw new Unreadable(path.join(root, "shared", "resources"), e);
  }
  if (!shared) return false;
  const skills = path.join(root, "skills");
  return listDir(skills).some((d) => isFile(path.join(skills, d, "SKILL.md")));
}

/**
 * A shell script names an engine once and runs it through a variable:
 * `_cli=".agents/…/gh-stage.js"` then `_out=$(node "$_cli" --init-workflow)` —
 * setup-consumer.sh does exactly this. A shape that needs the filename on the
 * `node` line cannot see it (QA cycle 1, CR-2). So each file is read twice: the
 * variables assigned the engine's path, then the lines that run `node` on one of
 * them.
 *
 * This is a BEST-EFFORT derivation, and its limits are stated here rather than
 * patched with more rules (QA cycle 2, narrowing-residue move: scope the claim —
 * C2-CR-3, C2-CR-4). A variable counts when it was assigned the engine's path
 * earlier in the same shell function (a function header resets the set). So:
 *   - within a function, a later reassignment to another value does NOT cancel
 *     an earlier engine assignment (both arms of an if/elif reach the call);
 *   - a top-level engine variable used inside a later function is NOT seen;
 *   - in a Markdown source the set spans the file's fenced blocks, which are
 *     separate shells.
 * The review checks say the same in one sentence: a site reached only through
 * a variable may be missed or over-counted, and the reviewer names it by hand.
 */
const PREFIX = String.raw`^\s*(?:\[[^\]]*\]\s*&&\s*)?(?:(?:tracker_call_with_retry|tracker_write)\s+)?(?:[A-Za-z_][A-Za-z0-9_]*=)?\$?\(?\s*(?:command\s+)?node\s+`;

/** For each line, the variables that MAY hold the engine's path there (the rule
 *  and its limits are stated above). Returns an array of Sets, one per line —
 *  the state before that line. */
function engineVarsByLine(lines, file) {
  const assign =
    /^\s*(?:local\s+|export\s+|readonly\s+)?([A-Za-z_][A-Za-z0-9_]*)=(\S*)/;
  const header =
    /^\s*(?:function\s+[A-Za-z_][A-Za-z0-9_-]*(?:\s*\(\s*\))?|[A-Za-z_][A-Za-z0-9_-]*\s*\(\s*\))\s*\{?\s*$/;
  const isEngine = new RegExp(
    String.raw`^["']?[^"'\s]*` +
      file.replace(/[.]/g, "\\.") +
      String.raw`["']?$`,
  );
  let current = new Set();
  const byLine = [];
  for (const l of lines) {
    if (header.test(l)) current = new Set();
    byLine.push(new Set(current));
    const m = assign.exec(l);
    if (m && isEngine.test(m[2])) current.add(m[1]);
  }
  return byLine;
}

function viaVariable(line, vars) {
  if (vars.size === 0) return false;
  const m = new RegExp(
    PREFIX + String.raw`["']?\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?["']?(?:\s|\)|$)`,
  ).exec(line);
  return Boolean(m && vars.has(m[1]));
}

/**
 * Collect every invocation of `engine` under `root`.
 *
 * Returns [{ file, line, engine, stage, kind, slots, text }], `file` relative
 * to `root`, `line` 1-based. `stage` is the `--stage` value (null when absent);
 * `kind` is `--kind` (tracker-issue's subcommand; null when absent); `slots` are
 * the `--slot` names in order.
 *
 * `stage` stops at a non-identifier character, with an optional opening quote:
 * `$(node … --stage done)` captures `done`, not `done)`, and
 * `--stage "qa-gate-${N}"` captures `qa-gate-` — the caller strips the hyphen.
 */
function collect({ engine, root }) {
  // Own properties only: `ENGINES["toString"]` is a function on the prototype,
  // and reading `.file` off it threw a TypeError (QA cycle 2, C2-CR-2).
  const spec = Object.hasOwn(ENGINES, engine) ? ENGINES[engine] : null;
  if (!spec) throw new Error(`unknown engine: ${engine}`);
  const sites = [];
  for (const abs of shippedSources(root)) {
    const rel = path.relative(root, abs);
    const lines = readText(abs).split("\n");
    const varsAt = engineVarsByLine(lines, spec.file);
    for (let i = 0; i < lines.length; i++) {
      if (!spec.re.test(lines[i]) && !viaVariable(lines[i], varsAt[i]))
        continue;
      let text = lines[i];
      let j = i;
      while (text.trimEnd().endsWith("\\") && j + 1 < lines.length) {
        j += 1;
        text += "\n" + lines[j];
      }
      const stage = /--stage\s+"?([A-Za-z0-9_-]+)/.exec(text)?.[1] ?? null;
      const kind = /--kind\s+"?([A-Za-z0-9_-]+)/.exec(text)?.[1] ?? null;
      const slots = [
        ...text.matchAll(/--slot\s+([A-Za-z_][A-Za-z0-9_]*)=/g),
      ].map((m) => m[1]);
      sites.push({ file: rel, line: i + 1, engine, stage, kind, slots, text });
    }
  }
  return sites;
}

/** `dir`'s git top level when it is inside a repository, else `dir` itself. */
function resolveRoot(dir) {
  const r = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: dir,
    encoding: "utf8",
  });
  return r.status === 0 && r.stdout.trim()
    ? path.resolve(r.stdout.trim())
    : dir;
}

/** Write one outcome and return its exit code — the only path by which the CLI
 *  ends, so a code cannot disagree with its reason. */
function emit(json, reason, fields, human) {
  const { exitCode } = REASONS[reason];
  if (json)
    process.stdout.write(
      JSON.stringify({ reason, exitCode, ...fields }, null, 2) + "\n",
    );
  else if (human) process.stdout.write(human);
  return exitCode;
}

function usage(json, error) {
  process.stderr.write(
    `call-sites: ${error}\nusage: call-sites.js --engine <${Object.keys(ENGINES).join("|")}> [--root <dir>] [--json]\n`,
  );
  return emit(json, "usage", { error }, null);
}

function run(argv, json) {
  let engine = null;
  let rootArg = null;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--json") continue;
    if (a === "--engine" || a === "--root") {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--"))
        return usage(json, `${a} needs an operand`);
      if (a === "--engine") engine = v;
      else rootArg = path.resolve(v);
      i += 1;
      continue;
    }
    return usage(json, `unknown argument ${a}`);
  }
  if (!engine) return usage(json, "--engine is required");
  // `--engine gh-stage.js` is the natural spelling after reading a document
  // that names engines by file; accept it (QA cycle 1, CR-5).
  engine = engine.replace(/\.js$/, "");
  if (!Object.hasOwn(ENGINES, engine))
    return usage(json, `unknown engine: ${engine}`);
  // An explicit --root is measured AS GIVEN. Resolving it to an enclosing git
  // top level replaced a tree exported inside a work tree with the current
  // one, and reported that as `ok` (QA cycle 1, CR-1). Only the cwd default is
  // resolved, so the CLI works from any directory inside the repository.
  const given = rootArg !== null;
  const candidate = given ? rootArg : process.cwd();
  let isDir = false;
  try {
    isDir = fs.statSync(candidate).isDirectory();
  } catch {
    isDir = false;
  }
  if (!isDir) return usage(json, `--root is not a directory: ${candidate}`);
  const root = given ? candidate : resolveRoot(candidate);
  if (!isSourceTree(root)) {
    const error = `${root} has no shared/resources/ beside a skills/*/SKILL.md — not a tree this collector can measure (a consumer install keeps skills under .agents/skills/ as bundled copies)`;
    return emit(
      json,
      "no-roots",
      { engine, root, error },
      `no-roots call-sites: ${error}\n`,
    );
  }
  const sites = collect({ engine, root });
  const reason = sites.length ? "ok" : "empty";
  const human =
    sites
      .map((s) => {
        const tag = s.stage
          ? ` --stage ${s.stage}`
          : s.kind
            ? ` --kind ${s.kind}`
            : "";
        return `${s.file}:${s.line}${tag}\n`;
      })
      .join("") +
    (sites.length
      ? `ok call-sites: ${sites.length} ${engine} site(s) under ${root}\n`
      : `empty call-sites: no ${engine} site under ${root} — check the root before believing the zero\n`);
  const out = sites.map(({ text: _text, ...s }) => s);
  return emit(
    json,
    reason,
    { engine, root, count: sites.length, sites: out },
    human,
  );
}

function main(argv) {
  const json = argv.includes("--json");
  try {
    return run(argv, json);
  } catch (e) {
    // Every failure leaves through REASONS. An uncaught throw exits 1 in Node —
    // the code `no-roots` owns — which is exactly the ambiguity C2-CR-2 found.
    if (e instanceof Unreadable) {
      process.stderr.write(`call-sites: cannot read ${e.message}\n`);
      return emit(json, "unreadable", { error: e.message }, null);
    }
    process.stderr.write(`call-sites: ${e && e.stack ? e.stack : e}\n`);
    return emit(
      json,
      "internal-error",
      { error: String((e && e.message) || e) },
      null,
    );
  }
}

module.exports = {
  ENGINES,
  ROOTS,
  REASONS,
  collect,
  shippedSources,
  isSourceTree,
  resolveRoot,
  main,
};

// process.exitCode, never a hard exit: exiting after a stdout write truncates
// the write at ~64KB when the caller pipes it (bug.3).
if (require.main === module) process.exitCode = main(process.argv.slice(2));
