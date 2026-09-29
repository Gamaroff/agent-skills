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
 *     exit 0, reason `ok`     — sites found; one `file:line` per site
 *     exit 0, reason `empty`  — the walk ran and found none. Reported, never
 *                               folded into `ok`: an empty population is a claim
 *                               about the instrument as much as the tree, and a
 *                               reassuring zero is the answer nobody questions
 *     exit 2, reason `usage`  — unknown engine, unknown flag, a flag with no
 *                               operand, or a root that is not a directory
 *   --json → { reason, exitCode, engine, root, count, sites: [{ file, line,
 *              engine, stage, kind, slots }] }
 *
 * Root. `--root` (default: the cwd) is resolved to its git top level when it is
 * inside a repository, and used as given when it is not — an exported tree
 * (`git archive <rev> | tar -x`) has no `.git`, and measuring a population as
 * of an earlier commit is exactly what reviewing an old document needs. Never
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

function listDir(dir) {
  try {
    return fs.readdirSync(dir).sort();
  } catch {
    return [];
  }
}

/** A generated `references/` copy carries the banner after its frontmatter —
 *  a `description:` routinely runs past 400 characters on its own, so the head
 *  is taken by LINES (a structural bound), not by bytes. */
function isBannered(abs) {
  const head = fs.readFileSync(abs, "utf8").split("\n").slice(0, 20).join("\n");
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
    if (fs.existsSync(md)) out.push(md);
    const refs = path.join(skills, skill, "references");
    for (const f of listDir(refs)) {
      if (!f.endsWith(".md")) continue;
      const abs = path.join(refs, f);
      if (!isBannered(abs)) out.push(abs);
    }
    const scripts = path.join(skills, skill, "scripts");
    for (const f of listDir(scripts)) {
      if (f.endsWith(".sh")) out.push(path.join(scripts, f));
    }
  }
  for (const f of listDir(path.join(root, "scripts"))) {
    if (f.endsWith(".sh")) out.push(path.join(root, "scripts", f));
  }
  return out;
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
  const spec = ENGINES[engine];
  if (!spec) throw new Error(`unknown engine: ${engine}`);
  const sites = [];
  for (const abs of shippedSources(root)) {
    const rel = path.relative(root, abs);
    const lines = fs.readFileSync(abs, "utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (!spec.re.test(lines[i])) continue;
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

function usage(json, error) {
  process.stderr.write(
    `${error ? `call-sites: ${error}\n` : ""}usage: call-sites.js --engine <${Object.keys(ENGINES).join("|")}> [--root <dir>] [--json]\n`,
  );
  if (json)
    process.stdout.write(
      JSON.stringify({ reason: "usage", exitCode: 2, error }) + "\n",
    );
  return 2;
}

function main(argv) {
  const json = argv.includes("--json");
  let engine = null;
  let rootArg = process.cwd();
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
  if (!ENGINES[engine]) return usage(json, `unknown engine: ${engine}`);
  let isDir = false;
  try {
    isDir = fs.statSync(rootArg).isDirectory();
  } catch {
    isDir = false;
  }
  if (!isDir) return usage(json, `--root is not a directory: ${rootArg}`);
  const root = resolveRoot(rootArg);
  const sites = collect({ engine, root });
  const reason = sites.length ? "ok" : "empty";
  if (json) {
    const out = sites.map(({ text: _text, ...s }) => s);
    process.stdout.write(
      JSON.stringify(
        { reason, exitCode: 0, engine, root, count: sites.length, sites: out },
        null,
        2,
      ) + "\n",
    );
    return 0;
  }
  for (const s of sites) {
    const tag = s.stage
      ? ` --stage ${s.stage}`
      : s.kind
        ? ` --kind ${s.kind}`
        : "";
    process.stdout.write(`${s.file}:${s.line}${tag}\n`);
  }
  process.stdout.write(
    sites.length
      ? `ok call-sites: ${sites.length} ${engine} site(s) under ${root}\n`
      : `empty call-sites: no ${engine} site under ${root} — check the root before believing the zero\n`,
  );
  return 0;
}

module.exports = { ENGINES, collect, shippedSources, resolveRoot, main };

// process.exitCode, never a hard exit: exiting after a stdout write truncates
// the write at ~64KB when the caller pipes it (bug.3).
if (require.main === module) process.exitCode = main(process.argv.slice(2));
