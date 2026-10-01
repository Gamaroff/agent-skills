#!/usr/bin/env node
/**
 * continuation.mjs — decide where a continuation file goes, and what the
 * resume prompt says (session-handoff `continue` mode, task.156).
 *
 * A continuation file hands ONE piece of in-flight work to a fresh context. The
 * agent writes it; this script only answers the two questions that must not
 * depend on the agent remembering a rule under context pressure:
 *
 *   1. Where does the file go? Beside the work item when the branch names one
 *      whose directory exists, otherwise under `.agents/handoffs/`.
 *   2. What does the next session run first? The verifier that re-measures the
 *      file, at a path that exists for the reader, or — when no verifier can be
 *      found — an explicit instruction to re-measure by hand. The step is never
 *      silently omitted.
 *
 * It WRITES NOTHING. Resolution is pure (`resolveContinuation`, filesystem
 * injected) and the CLI is a thin reader around it.
 *
 * Path rules (first match wins; the branch slug must be kebab-case, so a branch
 * name can never steer the path out of its directory):
 *
 *   feature/task.N.slug       + docs/tasks/task.N.slug/ exists
 *                             → docs/tasks/task.N.slug/task.N.handoff.{k}.slug.md
 *   feature/story.E.S.slug    + a story.E.S.*.md found under the PRD root
 *                             → <that dir>/story.E.S.handoff.{k}.slug.md
 *   anything else             → .agents/handoffs/{YYYY-MM-DD}-{slug}.md,
 *                               suffixed -2, -3, … when taken
 *
 * `{k}` is the highest existing handoff index + 1, parsed base 10 — a lexical
 * sort puts `handoff.10` before `handoff.9`.
 *
 * Verifier order (first that exists): the sibling `handoff-verify.mjs` in this
 * script's own directory — the two ship together, so it is present in every
 * install, including a source checkout where `.agents/skills` is a gitignored
 * symlink a fresh clone lacks — then `<repo>/.agents/skills/…`,
 * `~/.agents/skills/…`, `~/.claude/skills/…`. A path under the repository root
 * is emitted relative (the prompt says to run it from the root); any other is
 * emitted absolute.
 *
 * PRD root (CLI only): `--prd-root`, else `prd.prdShardedLocation` from
 * `skills-config.yaml` at the repository root — the key the shell path
 * resolver reads, which a Node script cannot source — else `docs/prd`. Read
 * with a line scan, as the PRD-epic index generator does, because this script
 * ships inside the skill and imports nothing outside it.
 *
 * Output: `path` then the prompt on stdout, or with `--json` one object:
 *   { reason, path, workItem, verifier, resumePrompt, exitCode }
 *
 * `reason` / exit code:
 *   ok            a verifier was found                          exit 0
 *   no-verifier   none found; the prompt says verify by hand    exit 0
 *   usage         bad arguments (--help prints usage, exit 0)   exit 2
 *
 * Emits with `process.exitCode = n; return` — never `process.exit()`, which
 * tears the process down before a piped stdout drains (traps.md).
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const VERIFIER = "handoff-verify.mjs";
export const FALLBACK_DIR = ".agents/handoffs";
export const TASKS_DIR = "docs/tasks";
export const DEFAULT_PRD_ROOT = "docs/prd";

const TASK_BRANCH = /^feature\/task\.(\d+)\.([a-z0-9][a-z0-9-]*)$/;
const STORY_BRANCH = /^feature\/story\.(\d+)\.(\d+)\.([a-z0-9][a-z0-9-]*)$/;

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/** Lower-case kebab; never empty, never a path. `../x y` → `x-y`. */
export function kebab(s) {
  const k = String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return k || "session";
}

/**
 * Highest `{prefix}.handoff.{n}.` index in `names`, plus one. Base-10 parse:
 * `handoff.9` and `handoff.10` give 11, not 10.
 */
export function nextIndex(names, prefix) {
  const esc = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${esc}\\.handoff\\.(\\d+)\\.`);
  let max = 0;
  for (const n of names) {
    const m = re.exec(n);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

/** `true` when `abs` sits inside `root` (or is it). */
function isInside(root, abs) {
  const rel = path.relative(root, abs);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/** Repo-relative POSIX path when inside the root, else the absolute path. */
function emitPath(root, abs) {
  return isInside(root, abs)
    ? path.relative(root, abs).split(path.sep).join("/")
    : abs;
}

/** The verifier locations, in the order they are tried. */
export function verifierCandidates({ repoRoot, home, selfDir }) {
  const tail = path.join("skills", "session-handoff", "scripts", VERIFIER);
  return [
    selfDir ? path.join(selfDir, VERIFIER) : null,
    path.join(repoRoot, ".agents", tail),
    home ? path.join(home, ".agents", tail) : null,
    home ? path.join(home, ".claude", tail) : null,
  ].filter(Boolean);
}

/** The fixed resume prompt. One template string — the SKILL does not restate it. */
export function buildResumePrompt({ path: file, verifier }) {
  const step1 = verifier
    ? `1. From the repository root, run \`command node ${verifier} ${file}\` and read every line's verdict. Treat \`stale\` and \`unverifiable\` figures as unknown, not as true.`
    : `1. No verifier is installed — re-run each command in the file's state table by hand and compare its output with the recorded figure before trusting it. Treat any figure you did not re-measure as unknown, not as true.`;
  return [
    `Continue the work handed off in \`${file}\`.`,
    step1,
    `2. Read the file. §4 "Ruled out" lists approaches already rejected — do not retry them without a new reason.`,
    `3. Start at §1 "Next step".`,
  ].join("\n");
}

/**
 * Resolve the continuation path, the verifier and the resume prompt.
 * Every filesystem read is injected: `exists(abs)`, `list(absDir)` (readdir,
 * `[]` on ENOENT) and `findStory(epic, story)` (absolute dir, or null).
 */
export function resolveContinuation({
  repoRoot,
  branch,
  home,
  selfDir,
  today,
  slug,
  exists,
  list,
  findStory,
}) {
  let rel = null;
  let workItem = null;

  const task = TASK_BRANCH.exec(branch ?? "");
  const story = task ? null : STORY_BRANCH.exec(branch ?? "");
  if (task) {
    const [, n, s] = task;
    const dir = path.join(repoRoot, TASKS_DIR, `task.${n}.${s}`);
    if (exists(dir)) {
      const k = nextIndex(list(dir), `task.${n}`);
      rel = emitPath(
        repoRoot,
        path.join(dir, `task.${n}.handoff.${k}.${s}.md`),
      );
      workItem = {
        kind: "task",
        id: `task.${n}`,
        dir: emitPath(repoRoot, dir),
      };
    }
  } else if (story) {
    const [, e, st, s] = story;
    const dir = findStory ? findStory(e, st) : null;
    if (dir && isInside(repoRoot, dir)) {
      const k = nextIndex(list(dir), `story.${e}.${st}`);
      rel = emitPath(
        repoRoot,
        path.join(dir, `story.${e}.${st}.handoff.${k}.${s}.md`),
      );
      workItem = {
        kind: "story",
        id: `story.${e}.${st}`,
        dir: emitPath(repoRoot, dir),
      };
    }
  }

  if (!rel) {
    const base = `${today}-${kebab(slug ?? (branch === "HEAD" ? null : branch))}`;
    let name = `${base}.md`;
    for (let i = 2; exists(path.join(repoRoot, FALLBACK_DIR, name)); i++) {
      name = `${base}-${i}.md`;
    }
    rel = `${FALLBACK_DIR}/${name}`;
  }

  const found = verifierCandidates({ repoRoot, home, selfDir }).find((p) =>
    exists(p),
  );
  const verifier = found ? emitPath(repoRoot, found) : null;
  return {
    reason: verifier ? "ok" : "no-verifier",
    path: rel,
    workItem,
    verifier,
    resumePrompt: buildResumePrompt({ path: rel, verifier }),
  };
}

/** `prd.prdShardedLocation` from skills-config.yaml text, or "". */
export function prdRootFromConfig(text) {
  let inBlock = false;
  for (const line of String(text ?? "").split("\n")) {
    if (/^prd:\s*(#.*)?$/.test(line)) {
      inBlock = true;
      continue;
    }
    if (inBlock && /^\S/.test(line)) inBlock = false;
    if (inBlock) {
      const m = line.match(/^\s+prdShardedLocation:\s*(.+?)\s*$/);
      if (m)
        return m[1]
          .replace(/\s+#.*$/, "")
          .replace(/^['"]|['"]$/g, "")
          .trim();
    }
  }
  return "";
}

/** Local calendar date, YYYY-MM-DD (not UTC: a late-evening handoff keeps its day). */
export function localDate(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export const USAGE = `usage: continuation.mjs [--json] [--slug <s>] [--repo <dir>] [--prd-root <dir>]

Prints where a continuation file for the current branch goes, and the resume
prompt a fresh session should be given. Writes nothing.`;

export function parseArgs(argv) {
  const opts = {
    json: false,
    slug: null,
    repo: null,
    prdRoot: null,
    help: false,
  };
  const takes = { "--slug": "slug", "--repo": "repo", "--prd-root": "prdRoot" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (a === "--help" || a === "-h") opts.help = true;
    else if (takes[a]) {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--"))
        return { error: `${a} needs a value` };
      opts[takes[a]] = v;
      i++;
    } else return { error: `unknown argument: ${a}` };
  }
  return opts;
}

function git(args, cwd) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

/** Walk `root` for the first `story.E.S.*.md`; return its directory or null. */
function makeFindStory(root) {
  return (e, s) => {
    const want = `story.${e}.${s}.`;
    const stack = [root];
    while (stack.length) {
      const dir = stack.pop();
      let entries;
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const ent of entries) {
        if (ent.isDirectory()) {
          if (ent.name !== "node_modules" && !ent.name.startsWith(".")) {
            stack.push(path.join(dir, ent.name));
          }
        } else if (ent.name.startsWith(want) && ent.name.endsWith(".md")) {
          return dir;
        }
      }
    }
    return null;
  };
}

export function run(argv, io = {}) {
  const opts = parseArgs(argv);
  if (opts.error) return { reason: "usage", detail: opts.error, exitCode: 2 };
  if (opts.help) return { reason: "usage", detail: USAGE, exitCode: 0 };
  const start = path.resolve(opts.repo ?? io.cwd ?? process.cwd());
  // Outside a git repository there is no branch: resolve from the directory
  // given, as a detached session, onto the fallback path.
  const repoRoot = git(["rev-parse", "--show-toplevel"], start) ?? start;
  // `symbolic-ref` names the branch even before the first commit; it fails
  // (→ "HEAD") only when detached.
  const branch =
    git(["symbolic-ref", "--short", "-q", "HEAD"], repoRoot) ?? "HEAD";
  let prdRoot = opts.prdRoot;
  if (!prdRoot) {
    try {
      prdRoot = prdRootFromConfig(
        fs.readFileSync(path.join(repoRoot, "skills-config.yaml"), "utf8"),
      );
    } catch {
      prdRoot = "";
    }
  }
  prdRoot = path.resolve(repoRoot, prdRoot || DEFAULT_PRD_ROOT);
  const result = resolveContinuation({
    repoRoot,
    branch,
    home: io.home ?? os.homedir(),
    selfDir: io.selfDir ?? path.dirname(fileURLToPath(import.meta.url)),
    today: io.today ?? localDate(),
    slug: opts.slug,
    exists: (p) => fs.existsSync(p),
    list: (d) => {
      try {
        return fs.readdirSync(d);
      } catch {
        return [];
      }
    },
    findStory: makeFindStory(prdRoot),
  });
  return { ...result, exitCode: 0, json: opts.json };
}

function isInvokedDirectly() {
  try {
    return fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isInvokedDirectly()) {
  const r = run(process.argv.slice(2));
  if (r.reason === "usage") {
    (r.exitCode === 0 ? process.stdout : process.stderr).write(`${r.detail}\n`);
  } else if (r.json) {
    const { json, ...rest } = r;
    process.stdout.write(JSON.stringify(rest, null, 2) + "\n");
  } else {
    process.stdout.write(`${r.path}\n\n${r.resumePrompt}\n`);
  }
  process.exitCode = r.exitCode;
}
