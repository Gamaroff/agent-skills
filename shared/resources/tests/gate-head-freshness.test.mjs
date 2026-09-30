// gate-head-freshness.test.mjs — every schema-2 QA gate names the commit it judged, and its
// `updated:` does not claim to predate that commit (task.135).
//
// A gate's `head:` is what the next QA cycle scopes from (`git diff --name-only <head>..HEAD`), so
// a missing or invented head silently changes what gets reviewed. Its `updated:` used to be typed
// by hand: on task.130 gate 7 read 12:58Z for a commit authored at 13:12Z. For every
// `docs/**/*.gate.*.yml` with `schema: 2`:
//
//   1. `head:` is present and a full 40-hex SHA
//   2. the commit exists in this checkout (`git cat-file -e`)
//   3. it is an ancestor of HEAD — the branch that carries the gate (CI checks out with
//      fetch-depth 0, so an old head resolves)
//   4. `updated:` parses, and is not earlier than the head's author time
//
// Schema-1 gates predate the field and are counted and skipped — never backfilled. The count of
// gates checked is compared against an independent count of `schema: 2` headers, so a reader that
// silently matches nothing cannot pass as "no schema-2 gates yet".
//
// The rules are also run against scratch-repo fixtures (a gate dated before its head; a gate with
// no head; a head that is not in the history), so each assertion is proven able to go red without
// touching a real gate.

import test from "node:test";
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

/**
 * The problems with one gate, or [] when it is fresh. Returns null for a gate that is not schema 2
 * (it predates `head:` and is skipped, not judged).
 */
export function checkGate(yml, cwd) {
  if (field(yml, "schema") !== "2") return null;
  const problems = [];
  const head = field(yml, "head");
  if (!head || !/^[0-9a-f]{40}$/.test(head)) {
    problems.push(
      `head: missing or not a full 40-hex SHA (read ${JSON.stringify(head)})`,
    );
    return problems;
  }
  if (!gitOk(cwd, "cat-file", "-e", `${head}^{commit}`)) {
    problems.push(`head ${head} does not exist in this checkout`);
    return problems;
  }
  if (!gitOk(cwd, "merge-base", "--is-ancestor", head, "HEAD")) {
    problems.push(
      `head ${head} is not an ancestor of HEAD — the gate names a commit off this branch`,
    );
  }
  const updated = field(yml, "updated");
  const updatedAt = Date.parse(updated ?? "");
  if (Number.isNaN(updatedAt)) {
    problems.push(
      `updated: ${JSON.stringify(updated)} does not parse as a timestamp`,
    );
    return problems;
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

// ── The corpus ────────────────────────────────────────────────────────────────

test("every schema-2 gate under docs/ names a head that exists, is on this branch, and does not postdate updated:", () => {
  const gates = gatesUnder(path.join(ROOT, "docs"));
  assert.ok(
    gates.length > 0,
    "found no gate files under docs/ — the walk is broken, not the corpus empty",
  );

  let checked = 0;
  let skipped = 0;
  const failures = [];
  for (const g of gates) {
    const problems = checkGate(fs.readFileSync(g, "utf8"), ROOT);
    if (problems === null) {
      skipped++;
      continue;
    }
    checked++;
    for (const p of problems) failures.push(`${path.relative(ROOT, g)}: ${p}`);
  }

  // Independent count: a `field()` that stopped matching would read every gate as schema 1 and
  // pass on nothing. The raw header count cannot drift with it.
  const schema2 = gates.filter((g) =>
    /^schema:\s*['"]?2['"]?\s*(#.*)?$/m.test(fs.readFileSync(g, "utf8")),
  ).length;
  assert.equal(
    checked,
    schema2,
    `checked ${checked} gates but ${schema2} carry a schema: 2 header`,
  );
  assert.equal(checked + skipped, gates.length);
  assert.deepEqual(
    failures,
    [],
    `stale or unanchored gates:\n  ${failures.join("\n  ")}`,
  );
});

// ── The rules can go red ──────────────────────────────────────────────────────

function scratch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gate-head-"));
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
  fs.rmSync(dir, { recursive: true, force: true });
  assert.deepEqual(p, []);
});

test("a gate whose updated: precedes its head's author time is red", () => {
  const { dir, head } = scratch();
  // 10:58Z is 12:58+02:00 — fourteen minutes before the head: task.130 gate 7's shape.
  const p = checkGate(
    gate([`head: '${head}'`, "updated: '2026-09-20T10:58:00Z'"]),
    dir,
  );
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(p.length, 1);
  assert.match(p[0], /precedes its head's author time/);
});

test("a schema-2 gate with no head: is red", () => {
  const { dir } = scratch();
  const p = checkGate(gate(["updated: '2026-09-20T11:20:00Z'"]), dir);
  fs.rmSync(dir, { recursive: true, force: true });
  assert.match(p[0], /head: missing/);
});

test("a head this checkout does not have is red", () => {
  const { dir } = scratch();
  const p = checkGate(
    gate([`head: '${"a".repeat(40)}'`, "updated: '2026-09-20T11:20:00Z'"]),
    dir,
  );
  fs.rmSync(dir, { recursive: true, force: true });
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
  fs.rmSync(dir, { recursive: true, force: true });
  assert.match(p[0], /not an ancestor of HEAD/);
});

test("a schema-1 gate is skipped, not judged", () => {
  const { dir } = scratch();
  const p = checkGate(
    "schema: 1\ngate: PASS\nupdated: '2020-01-01T00:00:00Z'\n",
    dir,
  );
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(p, null);
});
