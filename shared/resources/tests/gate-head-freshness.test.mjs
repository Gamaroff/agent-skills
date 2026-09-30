// gate-head-freshness.test.mjs — every schema-2 QA gate names the commit it judged, and its
// `updated:` does not claim to predate that commit (task.135).
//
// A gate's `head:` is what the next QA cycle scopes from (`git diff --name-only <head>..HEAD`), so
// a missing or invented head silently changes what gets reviewed. Its `updated:` used to be typed
// by hand: on task.130 gate 7 read 12:58Z for a commit authored at 13:12Z.
//
// Every `docs/**/*.gate.*.yml` with `schema: 2` is held to the FORMAT rules:
//   1. `head:` is present and a full 40-hex SHA
//   2. `updated:` parses as a timestamp
// A gate this branch adds or changes (against the merge-base with the base branch, plus anything
// uncommitted) is also held to the HISTORY rules:
//   3. the head exists in this checkout (`git cat-file -e`)
//   4. it is an ancestor of HEAD — the branch that carries the gate
//   5. `updated:` is not earlier than the head's author time
//
// Why the history rules are branch-scoped (task.135 QA cycle 1, CR-1): develop-batch rebases each
// item onto the new tip before merging, and `developNext.mergeStrategy` accepts squash and rebase.
// After either, a merged gate names a SHA that is no longer an ancestor of develop, and is absent
// from a fresh clone once the branch is deleted. Judging it again on every later PR would turn the
// suite red for good. A gate is judged against history while its branch is the one under review —
// the only time the commit it names is guaranteed to be reachable.
//
// The base is `$GATE_HEAD_BASE` or `origin/develop`. When it cannot be resolved — release.yml runs
// `npm test` on a depth-1 tag checkout — the history rules are skipped and the test says so; the
// format rules still run.
//
// Schema-1 gates predate the field and are counted and skipped — never backfilled. The schema-2 set
// the walker finds is compared with an independent `git ls-files` enumeration, so a walker that
// silently matches nothing cannot pass as "no schema-2 gates yet".
//
// The rules are also run against scratch-repo fixtures, so each assertion is proven able to go red
// without touching a real gate.

import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");

/** Top-level `key: value` from a gate's YAML, quotes and a trailing `# comment` stripped. */
export function field(yml, key) {
  const m = new RegExp(`^${key}:[ \\t]*(.*)$`, "m").exec(yml);
  if (!m) return null;
  return m[1]
    .replace(/\s+#.*$/, "")
    .replace(/^['"]|['"]$/g, "")
    .trim();
}

function gitOk(cwd, ...args) {
  return spawnSync("git", args, { cwd, encoding: "utf8" }).status === 0;
}

function gitOut(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}

/**
 * The problems with one gate, or [] when it is fresh. Returns null for a gate that is not schema 2
 * (it predates `head:` and is skipped, not judged). `history: false` applies the format rules only.
 */
export function checkGate(yml, cwd, { history = true } = {}) {
  if (field(yml, "schema") !== "2") return null;
  const problems = [];
  const head = field(yml, "head");
  if (!head || !/^[0-9a-f]{40}$/.test(head)) {
    problems.push(
      `head: missing or not a full 40-hex SHA (read ${JSON.stringify(head)})`,
    );
    return problems;
  }
  const updated = field(yml, "updated");
  const updatedAt = Date.parse(updated ?? "");
  if (Number.isNaN(updatedAt)) {
    problems.push(
      `updated: ${JSON.stringify(updated)} does not parse as a timestamp`,
    );
    return problems;
  }
  if (!history) return problems;
  if (!gitOk(cwd, "cat-file", "-e", `${head}^{commit}`)) {
    problems.push(`head ${head} does not exist in this checkout`);
    return problems;
  }
  if (!gitOk(cwd, "merge-base", "--is-ancestor", head, "HEAD")) {
    problems.push(
      `head ${head} is not an ancestor of HEAD — the gate names a commit off this branch`,
    );
  }
  const authored = execFileSync("git", ["log", "-1", "--format=%aI", head], {
    cwd,
    encoding: "utf8",
  }).trim();
  if (updatedAt < Date.parse(authored)) {
    problems.push(
      `updated: ${updated} precedes its head's author time ${authored} — the gate claims to predate the tree it judged`,
    );
  }
  return problems;
}

/**
 * Repo-relative paths this branch adds or changes — the working tree against the merge-base with
 * `base`, plus untracked files — or null when `base` cannot be resolved (no history to judge by).
 */
export function branchChangedPaths(cwd, base) {
  if (!gitOk(cwd, "rev-parse", "--verify", "--quiet", `${base}^{commit}`))
    return null;
  const mb = gitOut(cwd, "merge-base", "HEAD", base).trim();
  const lines = [
    ...gitOut(cwd, "diff", "--name-only", mb).split("\n"),
    ...gitOut(cwd, "ls-files", "--others", "--exclude-standard").split("\n"),
  ];
  return new Set(lines.filter(Boolean));
}

function gatesUnder(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.gate\.\d+\..*\.yml$/.test(e.name)) out.push(p);
    }
  };
  walk(dir);
  return out.sort();
}

/**
 * Judge every gate path: format rules for every schema-2 gate, history rules only for those in
 * `onBranch` (a Set of repo-relative paths, or null for "no base — judge no history").
 */
export function judgeCorpus(root, gates, onBranch) {
  const schema2 = [];
  let skipped = 0;
  let historyChecked = 0;
  const failures = [];
  for (const g of gates) {
    const rel = path.relative(root, g);
    const history = onBranch !== null && onBranch.has(rel);
    const problems = checkGate(fs.readFileSync(g, "utf8"), root, { history });
    if (problems === null) {
      skipped++;
      continue;
    }
    schema2.push(rel);
    if (history) historyChecked++;
    for (const p of problems) failures.push(`${rel}: ${p}`);
  }
  return { schema2, skipped, historyChecked, failures };
}

// ── The corpus ────────────────────────────────────────────────────────────────

const SCHEMA_2 = /^schema:\s*['"]?2['"]?\s*(#.*)?$/m;

test("every schema-2 gate under docs/ is well-formed, and every gate this branch touches is anchored in its history", (t) => {
  const gates = gatesUnder(path.join(ROOT, "docs"));
  assert.ok(
    gates.length > 0,
    "found no gate files under docs/ — the walk is broken, not the corpus empty",
  );
  const base = process.env.GATE_HEAD_BASE || "origin/develop";
  const onBranch = branchChangedPaths(ROOT, base);
  if (onBranch === null) {
    t.diagnostic(
      `${base} does not resolve — history rules skipped, format rules only`,
    );
  }

  const { schema2, skipped, historyChecked, failures } = judgeCorpus(
    ROOT,
    gates,
    onBranch,
  );
  t.diagnostic(
    `${schema2.length} schema-2 gate(s), ${historyChecked} judged against history; ${skipped} schema-1 skipped`,
  );

  // Independent enumeration (CR-8): git's own view of the gate files, not the walker's. A walker
  // regex that stopped matching would read the corpus as empty and pass on nothing.
  const listed = gitOut(
    ROOT,
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "--",
    ":(glob)docs/**/*.gate.*.yml",
  )
    .split("\n")
    .filter(Boolean)
    .filter((p) => fs.existsSync(path.join(ROOT, p)))
    .filter((p) => SCHEMA_2.test(fs.readFileSync(path.join(ROOT, p), "utf8")))
    .sort();
  assert.deepEqual(
    schema2.sort(),
    listed,
    "the walker's schema-2 set differs from git ls-files'",
  );
  assert.equal(schema2.length + skipped, gates.length);
  assert.deepEqual(
    failures,
    [],
    `stale or unanchored gates:\n  ${failures.join("\n  ")}`,
  );
});

// ── The rules can go red ──────────────────────────────────────────────────────

// Every scratch directory is removed after the file's tests, pass or fail — a per-test rmSync
// after the assertions leaked the directory whenever setup or an assertion threw (CR-7).
const TMP = [];
after(() => {
  for (const d of TMP) fs.rmSync(d, { recursive: true, force: true });
});

function scratch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gate-head-"));
  TMP.push(dir);
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: "t",
    GIT_AUTHOR_EMAIL: "t@t",
    GIT_COMMITTER_NAME: "t",
    GIT_COMMITTER_EMAIL: "t@t",
    GIT_AUTHOR_DATE: "2026-09-20T13:12:00+02:00",
    GIT_COMMITTER_DATE: "2026-09-20T13:12:00+02:00",
  };
  const git = (...a) =>
    execFileSync("git", a, { cwd: dir, env, encoding: "utf8" }).trim();
  git("init", "-q", "-b", "main");
  fs.writeFileSync(path.join(dir, "a.txt"), "a\n");
  git("add", "a.txt");
  git("commit", "-q", "-m", "reviewed");
  const head = git("rev-parse", "HEAD");
  return { dir, head, git };
}

const gate = (lines) =>
  ["schema: 2", "gate: PASS", ...lines, "top_issues: []", ""].join("\n");

test("a gate stamped after its head's author time is fresh (offsets compared as instants)", () => {
  const { dir, head } = scratch();
  // 11:20Z is 13:20+02:00 — eight minutes after the head, though "11" < "13" as a string.
  const p = checkGate(
    gate([`head: '${head}'  # reviewed`, "updated: '2026-09-20T11:20:00Z'"]),
    dir,
  );
  assert.deepEqual(p, []);
});

test("a gate whose updated: precedes its head's author time is red", () => {
  const { dir, head } = scratch();
  // 10:58Z is 12:58+02:00 — fourteen minutes before the head: task.130 gate 7's shape.
  const p = checkGate(
    gate([`head: '${head}'`, "updated: '2026-09-20T10:58:00Z'"]),
    dir,
  );
  assert.equal(p.length, 1);
  assert.match(p[0], /precedes its head's author time/);
});

test("a schema-2 gate with no head: is red", () => {
  const { dir } = scratch();
  const p = checkGate(gate(["updated: '2026-09-20T11:20:00Z'"]), dir);
  assert.match(p[0], /head: missing/);
});

test("a head this checkout does not have is red", () => {
  const { dir } = scratch();
  const p = checkGate(
    gate([`head: '${"a".repeat(40)}'`, "updated: '2026-09-20T11:20:00Z'"]),
    dir,
  );
  assert.match(p[0], /does not exist in this checkout/);
});

test("a head off this branch is red", () => {
  const { dir, git } = scratch();
  git("checkout", "-q", "-b", "side");
  fs.writeFileSync(path.join(dir, "b.txt"), "b\n");
  git("add", "b.txt");
  git("commit", "-q", "-m", "side");
  const side = git("rev-parse", "HEAD");
  git("checkout", "-q", "main");
  const p = checkGate(
    gate([`head: '${side}'`, "updated: '2026-09-20T11:20:00Z'"]),
    dir,
  );
  assert.match(p[0], /not an ancestor of HEAD/);
});

test("a schema-1 gate is skipped, not judged", () => {
  const { dir } = scratch();
  const p = checkGate(
    "schema: 1\ngate: PASS\nupdated: '2020-01-01T00:00:00Z'\n",
    dir,
  );
  assert.equal(p, null);
});

// ── Branch scoping (CR-1): a merged gate is not re-judged against history ─────

test("a gate whose head is unreachable is still well-formed when history is not judged", () => {
  const { dir } = scratch();
  const p = checkGate(
    gate([`head: '${"b".repeat(40)}'`, "updated: '2026-09-20T11:20:00Z'"]),
    dir,
    { history: false },
  );
  assert.deepEqual(p, []);
});

test("format rules still hold when history is not judged", () => {
  const { dir } = scratch();
  assert.match(
    checkGate(gate(["updated: '2026-09-20T11:20:00Z'"]), dir, {
      history: false,
    })[0],
    /head: missing/,
  );
  assert.match(
    checkGate(
      gate([`head: '${"b".repeat(40)}'`, "updated: 'yesterday'"]),
      dir,
      { history: false },
    )[0],
    /does not parse/,
  );
});

test("branchChangedPaths: this branch's committed, modified and untracked gates — not the base's", () => {
  const { dir, git } = scratch();
  fs.mkdirSync(path.join(dir, "docs"));
  fs.writeFileSync(path.join(dir, "docs", "t.gate.1.x.yml"), "schema: 2\n");
  git("add", "-A");
  git("commit", "-q", "-m", "merged earlier");
  git("checkout", "-q", "-b", "feature");
  fs.writeFileSync(path.join(dir, "docs", "t.gate.2.x.yml"), "schema: 2\n");
  git("add", "-A");
  git("commit", "-q", "-m", "this branch");
  fs.writeFileSync(path.join(dir, "docs", "t.gate.3.x.yml"), "schema: 2\n");
  const on = branchChangedPaths(dir, "main");
  assert.ok(on.has("docs/t.gate.2.x.yml"), "committed on the branch");
  assert.ok(on.has("docs/t.gate.3.x.yml"), "untracked on the branch");
  assert.ok(!on.has("docs/t.gate.1.x.yml"), "already on the base");
  fs.appendFileSync(path.join(dir, "docs", "t.gate.1.x.yml"), "gate: PASS\n");
  assert.ok(
    branchChangedPaths(dir, "main").has("docs/t.gate.1.x.yml"),
    "a base gate edited in the working tree is judged",
  );
});

test("branchChangedPaths returns null when the base does not resolve", () => {
  const { dir } = scratch();
  assert.equal(branchChangedPaths(dir, "origin/no-such-branch"), null);
});

test("judgeCorpus: an unreachable head fails only when its gate is on this branch", () => {
  const { dir } = scratch();
  fs.mkdirSync(path.join(dir, "docs"));
  const g = path.join(dir, "docs", "t.gate.1.x.yml");
  fs.writeFileSync(
    g,
    gate([`head: '${"b".repeat(40)}'`, "updated: '2026-09-20T11:20:00Z'"]),
  );
  const merged = judgeCorpus(dir, [g], new Set());
  assert.deepEqual(
    merged.failures,
    [],
    "a merged gate is not re-judged against history",
  );
  assert.equal(merged.historyChecked, 0);
  const onBranch = judgeCorpus(dir, [g], new Set(["docs/t.gate.1.x.yml"]));
  assert.equal(onBranch.historyChecked, 1);
  assert.match(onBranch.failures[0], /does not exist in this checkout/);
  assert.deepEqual(
    judgeCorpus(dir, [g], null).failures,
    [],
    "no base resolves → no history judged",
  );
});
