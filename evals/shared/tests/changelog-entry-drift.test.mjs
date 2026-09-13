/**
 * Corpus guard — every accepted task merged since the last tag is cited in
 * `CHANGELOG.md` under `## [Unreleased]`.
 *
 * task.115 (obs #59). The release checklist in `docs/contributing/releases.md`
 * has one box per generated artefact, and every one of them had a mechanism —
 * the catalog diffs in CI, `bundle --check` is a lane, the task registry has a
 * drift test, the roadmap has a linter — except the CHANGELOG box, which was
 * read by a human at release time. At the v0.46.0 prep five merged tasks had no
 * `[Unreleased]` entry at all, four of them the four most recent merges. That is
 * not carelessness; it is the shape of the thing. The newest work is the least
 * likely to be remembered at release time and the most likely to be what the
 * release is *for*, and nothing failed when it was forgotten.
 *
 * This test is what turns the omission into a failure — task.103's pattern (a
 * check first, then an owner). The owner is `/finalise` Step 7 action 6d, which
 * greps the same section at acceptance and warns; this is the backstop for the
 * runs that ignore the warning.
 *
 * WHAT IS CHECKED, EXACTLY
 * -------------------------
 *   window   = merge commits in `<last tag>..HEAD` whose subject names a PR
 *   required = accepted task documents whose `pr_number` is one of those PRs
 *   cited    = task numbers `[Unreleased]` names as `(task N` / `task N` / `task.N`
 *   assert   required ⊆ cited, naming every task that is not
 *
 * Tasks only. `[Unreleased]` today cites bug 14 but not bugs 13 and 15 — all
 * three merged since v0.46.0 — so a `(bug N)` walk would be red on work this
 * task did not touch, and a test that is red at birth teaches readers to skip
 * it. `releases.md` names the bug backfill as the follow-on that lets this widen.
 *
 * TWO THINGS THIS TEST REFUSES TO DO
 * ----------------------------------
 * It refuses to report a clean zero from a broken reader. An empty `required`
 * set is the normal state right after a release — but an empty *corpus* (no
 * accepted task with a `pr_number` anywhere) means the frontmatter parser or the
 * glob is wrong, and that is asserted separately as a non-vacuity floor. The
 * floor is on the corpus, not on the window, so it does not fire on the
 * legitimately empty release-day case.
 *
 * And it refuses to skip when the window cannot be computed. A shallow clone with
 * no reachable tag cannot answer the question; answering "nothing required" would
 * be the one reassuring answer nobody questions. CI checks out with
 * `fetch-depth: 0` for exactly this class of test.
 *
 * Run via: node --test evals/shared/tests/changelog-entry-drift.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const CHANGELOG = path.join(REPO_ROOT, "CHANGELOG.md");
const TASKS_DIR = path.join(REPO_ROOT, "docs", "tasks");

// ---------------------------------------------------------------------------
// The pieces, exported for the self-tests below. Everything the assertion
// depends on is a function that can be run against a fixture string.

/** The body of `## [Unreleased]` — from that heading to the next `## [` heading. */
export function unreleasedSection(changelog) {
  const lines = changelog.split("\n");
  const start = lines.findIndex((l) => /^## \[Unreleased\]/.test(l));
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^## \[/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start + 1, end).join("\n");
}

/**
 * Task numbers a changelog section cites. The convention (`releases.md`) is
 * `(task N)`; `task N` and `task.N` as whole words are accepted too, because the
 * corpus already uses them and a convention that fails the existing entries is
 * one nobody adopts. `T115` and `#115` are NOT citations — the first is registry
 * shorthand, the second is a PR or issue number.
 */
export function citedTasks(section) {
  const out = new Set();
  const re = /\btask[ .]([0-9]+)\b/gi;
  let m;
  while ((m = re.exec(section)) !== null) out.add(Number(m[1]));
  return out;
}

/** Frontmatter `status:` and `pr_number:` of a task document, or null when there is no block. */
export function taskFrontmatter(markdown) {
  if (!markdown.startsWith("---\n")) return null;
  const close = markdown.indexOf("\n---", 4);
  if (close === -1) return null;
  const block = markdown.slice(4, close);
  const get = (key) => {
    const m = block.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m"));
    return m ? m[1].replace(/^["']|["']$/g, "") : null;
  };
  const pr = get("pr_number");
  return {
    status: get("status"),
    pr_number: pr && /^[0-9]+$/.test(pr) ? Number(pr) : null,
  };
}

/** The main task document beside each `docs/tasks/task.N.*` directory. */
export function acceptedTasksWithPr(tasksDir) {
  const out = [];
  if (!existsSync(tasksDir)) return out;
  for (const dir of readdirSync(tasksDir, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const m = dir.name.match(/^task\.([0-9]+)\./);
    if (!m) continue;
    const n = Number(m[1]);
    const doc = path.join(tasksDir, dir.name, `${dir.name}.md`);
    if (!existsSync(doc)) continue;
    const fm = taskFrontmatter(readFileSync(doc, "utf8"));
    if (!fm) continue;
    if (fm.status === "accepted" && fm.pr_number !== null) {
      out.push({ n, pr: fm.pr_number, doc: path.relative(REPO_ROOT, doc) });
    }
  }
  return out;
}

/** PR numbers named by merge-commit subjects in `<since>..HEAD`. */
export function mergedPrsSince(since, cwd = REPO_ROOT) {
  const subjects = execFileSync(
    "git",
    ["log", "--merges", "--format=%s", `${since}..HEAD`],
    { cwd, encoding: "utf8" },
  );
  const out = new Set();
  for (const line of subjects.split("\n")) {
    const m = line.match(/Merge pull request #([0-9]+)/);
    if (m) out.add(Number(m[1]));
  }
  return out;
}

function lastTag(cwd = REPO_ROOT) {
  try {
    return execFileSync("git", ["describe", "--tags", "--abbrev=0"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Self-tests: the regexes behave as documented. These are what make the corpus
// assertion below trustworthy — a citation matcher that also matched `task 1150`
// for N=115 would pass on a typo.

test("citedTasks matches the documented forms and nothing looser", () => {
  const cited = citedTasks(
    "- entry one (task 115)\n- entry two, task 114 and task.113\n- T112 is not a citation, nor is #111\n- (tasks 110–109) is not mechanical",
  );
  assert.deepEqual(
    [...cited].sort((a, b) => a - b),
    [113, 114, 115],
  );
  assert.ok(!cited.has(112), "T112 is registry shorthand, not a citation");
  assert.ok(!cited.has(111), "#111 is a PR or issue number, not a citation");
  assert.ok(!citedTasks("(task 1150)").has(115), "whole-word: 1150 is not 115");
});

test("unreleasedSection stops at the next release heading", () => {
  const s = unreleasedSection(
    "# Changelog\n\n## [Unreleased]\n\n- (task 1)\n\n## [v1.0.0] - 2026-01-01\n\n- (task 2)\n",
  );
  assert.ok(s.includes("(task 1)"));
  assert.ok(
    !s.includes("(task 2)"),
    "a released entry is not an Unreleased citation",
  );
  assert.equal(unreleasedSection("# Changelog\n\n## [v1.0.0]\n"), null);
});

test("taskFrontmatter reads status and a numeric pr_number, and rejects the rest", () => {
  assert.deepEqual(
    taskFrontmatter("---\nstatus: accepted\npr_number: 371\n---\n# T"),
    {
      status: "accepted",
      pr_number: 371,
    },
  );
  assert.deepEqual(
    taskFrontmatter("---\nstatus: accepted\npr_number: TBD\n---\n"),
    {
      status: "accepted",
      pr_number: null,
    },
  );
  assert.equal(taskFrontmatter("# no frontmatter\n"), null);
});

// ---------------------------------------------------------------------------
// The corpus assertion.

test("the CHANGELOG has an [Unreleased] section", () => {
  assert.ok(existsSync(CHANGELOG), "CHANGELOG.md is missing");
  assert.notEqual(
    unreleasedSection(readFileSync(CHANGELOG, "utf8")),
    null,
    "CHANGELOG.md has no `## [Unreleased]` heading — the release flow relies on it",
  );
});

test("non-vacuity floor: the corpus read finds accepted tasks with a pr_number", () => {
  const corpus = acceptedTasksWithPr(TASKS_DIR);
  assert.ok(
    corpus.length > 0,
    `no accepted task document with a pr_number found under ${path.relative(REPO_ROOT, TASKS_DIR)} — ` +
      "this repo has more than a hundred; the frontmatter parser or the glob is broken, not the corpus",
  );
});

test("every accepted task merged since the last tag is cited in [Unreleased]", () => {
  const tag = lastTag();
  assert.ok(
    tag,
    "no tag reachable from HEAD — the window `<last tag>..HEAD` cannot be computed. " +
      "Run `git fetch --tags` (or unshallow the clone); this test refuses to answer 'nothing required' from a clone that cannot see the release history",
  );

  const merged = mergedPrsSince(tag);
  const corpus = acceptedTasksWithPr(TASKS_DIR);
  const required = corpus
    .filter((t) => merged.has(t.pr))
    .sort((a, b) => a.n - b.n);
  const cited = citedTasks(unreleasedSection(readFileSync(CHANGELOG, "utf8")));

  const missing = required.filter((t) => !cited.has(t.n));
  assert.deepEqual(
    missing.map((t) => `task ${t.n} (PR #${t.pr}, ${t.doc})`),
    [],
    `accepted and merged since ${tag}, but not cited under ## [Unreleased] as \`(task N)\`:\n  ` +
      missing.map((t) => `task ${t.n} — PR #${t.pr} — ${t.doc}`).join("\n  ") +
      "\nWrite the entry at acceptance (`/finalise` warns on this — convention in docs/contributing/releases.md).",
  );
});
