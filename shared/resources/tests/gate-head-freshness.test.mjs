// gate-head-freshness.test.mjs — every schema-2 QA gate names the commit it judged, and its
// `updated:` does not claim to predate that commit (task.135).
//
// A gate's `head:` is what the next QA cycle scopes from (`git diff --name-only <head>..HEAD`), so
// a missing or invented head silently changes what gets reviewed. Its `updated:` used to be typed
// by hand: on task.130 gate 7 read 12:58Z for a commit authored at 13:12Z.
//
// For every `docs/**/*.gate.*.yml` with `schema: 2`:
//   1. `head:` is present and a full 40-hex SHA
//   2. `updated:` is an ISO-8601 instant with a zone — `Z` or an explicit offset, the shape
//      `date -u +%Y-%m-%dT%H:%M:%SZ` writes. A zone-less value parses as LOCAL time, so its verdict
//      would depend on the machine's TZ (task.135 QA cycle 3, CR3-5); a date alone, or `1`, is not
//      an instant at all
//   3. when the head resolves in this checkout, `updated:` is not earlier than its author time
//
// What this test deliberately does NOT assert: that the head exists, or that it is an ancestor of
// HEAD. Both are true while the gate's branch is under QA and false, legitimately, afterwards:
// develop-batch rebases each open item onto the new tip before its quality gate and CI run, and
// `developNext.mergeStrategy` accepts squash and rebase. A rewritten branch leaves every gate on it
// naming a pre-rewrite SHA — not an ancestor locally, absent from a fresh CI clone. The first
// design judged every gate against history (red on develop after any rewrite, task.135 QA cycle 1
// CR-1); the second judged only the branch's own gates (still red on develop-batch's rebase of an
// open PR, cycle 2 CR2-2). No corpus-wide rule can tell a rewritten head from an invented one once
// the old commit is gone, so existence and ancestry are checked where history is still intact:
// the Step 3b scope block HALTs on either at the next QA cycle, and the 5c conformance lens flags
// either on the PR before it leaves the loop. This test holds only what a rewrite cannot break.
//
// An unresolvable head is reported as a diagnostic, not a failure. Schema-1 gates predate the
// field and are counted and skipped — never backfilled. The schema-2 set the walker finds is
// compared with an independent `git ls-files` enumeration, so a walker that silently matches
// nothing cannot pass as "no schema-2 gates yet".
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

/**
 * Top-level `key: value` from a gate's YAML, quotes and a trailing `# comment` stripped.
 * Trim BEFORE unquoting, as the QA blocks' sed does: stripping the quotes first left
 * `head: 'abc'  ` reading `abc'` here and `abc` in the shell (task.168, 5c CR-2).
 */
export function field(yml, key) {
  const m = new RegExp(`^${key}:[ \\t]*(.*)$`, "m").exec(yml);
  if (!m) return null;
  return m[1]
    .replace(/\s+#.*$/, "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .trim();
}

/** The `date -u` shape, or an explicit offset; fractional seconds allowed. */
const INSTANT =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function gitOk(cwd, ...args) {
  return spawnSync("git", args, { cwd, encoding: "utf8" }).status === 0;
}

/**
 * Judge one gate. Returns null for a gate that is not schema 2 (it predates `head:` and is skipped,
 * not judged); otherwise `{ problems, resolved }`, where `resolved` says whether the head was found
 * in this checkout and so whether rule 3 could be applied.
 */
export function checkGate(yml, cwd) {
  if (field(yml, "schema") !== "2") return null;
  const problems = [];
  const head = field(yml, "head");
  if (!head || !/^[0-9a-f]{40}$/.test(head)) {
    problems.push(
      `head: missing or not a full 40-hex SHA (read ${JSON.stringify(head)})`,
    );
    return { problems, resolved: false };
  }
  const updated = field(yml, "updated");
  const updatedAt = INSTANT.test(updated ?? "") ? Date.parse(updated) : NaN;
  if (Number.isNaN(updatedAt)) {
    problems.push(
      `updated: ${JSON.stringify(updated)} is not an ISO-8601 instant with a zone (e.g. 2026-09-30T12:45:39Z)`,
    );
    return { problems, resolved: false };
  }
  if (!gitOk(cwd, "cat-file", "-e", `${head}^{commit}`)) {
    return { problems, resolved: false };
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
  return { problems, resolved: true };
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

/** Judge every gate path; `unresolved` lists schema-2 gates whose head this checkout lacks. */
export function judgeCorpus(root, gates) {
  const schema2 = [];
  const unresolved = [];
  let skipped = 0;
  const failures = [];
  for (const g of gates) {
    const rel = path.relative(root, g);
    const r = checkGate(fs.readFileSync(g, "utf8"), root);
    if (r === null) {
      skipped++;
      continue;
    }
    schema2.push(rel);
    if (!r.resolved && r.problems.length === 0) unresolved.push(rel);
    for (const p of r.problems) failures.push(`${rel}: ${p}`);
  }
  return { schema2, unresolved, skipped, failures };
}

// ── The corpus ────────────────────────────────────────────────────────────────

const SCHEMA_2 = /^schema:\s*['"]?2['"]?\s*(#.*)?$/m;

test("every schema-2 gate under docs/ is well-formed and does not predate the head it names", (t) => {
  const gates = gatesUnder(path.join(ROOT, "docs"));
  assert.ok(
    gates.length > 0,
    "found no gate files under docs/ — the walk is broken, not the corpus empty",
  );
  const { schema2, unresolved, skipped, failures } = judgeCorpus(ROOT, gates);
  t.diagnostic(
    `${schema2.length} schema-2 gate(s), ${schema2.length - unresolved.length} with a resolvable head; ${skipped} schema-1 skipped`,
  );
  for (const u of unresolved) {
    t.diagnostic(
      `${u}: head not in this checkout — rewritten branch or shallow clone; author time not checked`,
    );
  }

  // Independent enumeration (CR-8): git's own view of the gate files, not the walker's. A walker
  // regex that stopped matching would read the corpus as empty and pass on nothing.
  const listed = execFileSync(
    "git",
    [
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "--",
      ":(glob)docs/**/*.gate.*.yml",
    ],
    { cwd: ROOT, encoding: "utf8" },
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
    `malformed or stale gates:\n  ${failures.join("\n  ")}`,
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
  const r = checkGate(
    gate([`head: '${head}'  # reviewed`, "updated: '2026-09-20T11:20:00Z'"]),
    dir,
  );
  assert.deepEqual(r, { problems: [], resolved: true });
});

test("a gate whose updated: precedes its head's author time is red", () => {
  const { dir, head } = scratch();
  // 10:58Z is 12:58+02:00 — fourteen minutes before the head: task.130 gate 7's shape.
  const r = checkGate(
    gate([`head: '${head}'`, "updated: '2026-09-20T10:58:00Z'"]),
    dir,
  );
  assert.equal(r.problems.length, 1);
  assert.match(r.problems[0], /precedes its head's author time/);
});

test("a schema-2 gate with no head: is red", () => {
  const { dir } = scratch();
  const r = checkGate(gate(["updated: '2026-09-20T11:20:00Z'"]), dir);
  assert.match(r.problems[0], /head: missing/);
});

test("an updated: that does not parse is red", () => {
  const { dir, head } = scratch();
  const r = checkGate(gate([`head: '${head}'`, "updated: 'yesterday'"]), dir);
  assert.match(r.problems[0], /not an ISO-8601 instant/);
});

test("a schema-1 gate is skipped, not judged", () => {
  const { dir } = scratch();
  const r = checkGate(
    "schema: 1\ngate: PASS\nupdated: '2020-01-01T00:00:00Z'\n",
    dir,
  );
  assert.equal(r, null);
});

// ── Rewrite-proof (CR-1, CR2-2): a rewritten branch does not turn the suite red ─

test("a head this checkout lacks (rebased and force-pushed, or squash-merged) is unresolved, not red", () => {
  const { dir } = scratch();
  fs.mkdirSync(path.join(dir, "docs"));
  const g = path.join(dir, "docs", "t.gate.1.x.yml");
  fs.writeFileSync(
    g,
    gate([`head: '${"b".repeat(40)}'`, "updated: '2026-09-20T11:20:00Z'"]),
  );
  const c = judgeCorpus(dir, [g]);
  assert.deepEqual(c.failures, []);
  assert.deepEqual(c.unresolved, ["docs/t.gate.1.x.yml"]);
});

test("a head off the current branch (rebased locally) is still judged on author time, not ancestry", () => {
  const { dir, git } = scratch();
  git("checkout", "-q", "-b", "side");
  fs.writeFileSync(path.join(dir, "b.txt"), "b\n");
  git("add", "b.txt");
  git("commit", "-q", "-m", "side");
  const side = git("rev-parse", "HEAD");
  git("checkout", "-q", "main");
  assert.deepEqual(
    checkGate(
      gate([`head: '${side}'`, "updated: '2026-09-20T11:20:00Z'"]),
      dir,
    ),
    { problems: [], resolved: true },
    "not an ancestor of HEAD — and not a failure",
  );
  assert.match(
    checkGate(gate([`head: '${side}'`, "updated: '2026-09-20T10:58:00Z'"]), dir)
      .problems[0],
    /precedes its head's author time/,
    "the author-time rule still applies to a resolvable off-branch head",
  );
});

test("a zone-less, date-only or bare-number updated: is red — its meaning would depend on TZ (CR3-5)", () => {
  const { dir, head } = scratch();
  for (const v of ["2026-09-20T11:20:00", "2026-09-20", "1"]) {
    const r = checkGate(gate([`head: '${head}'`, `updated: '${v}'`]), dir);
    assert.match(r.problems[0] ?? "", /not an ISO-8601 instant/, v);
  }
  assert.deepEqual(
    checkGate(
      gate([`head: '${head}'`, "updated: '2026-09-20T13:20:00+02:00'"]),
      dir,
    ),
    { problems: [], resolved: true },
    "an explicit offset is an instant",
  );
});

test("field() reads a quoted head with trailing spaces exactly as the QA blocks' sed does (task.168, 5c CR-2)", () => {
  // The shell readers are taken FROM THE SHIPPED TEXT — qa-task's Phase 0 GATE_HEAD line and the
  // shared rule's LAST_GATE_HEAD line — never copied here: a copy would keep passing after the
  // shipped sed changed, which is the drift this test exists to catch (QA cycle 1, CR-5).
  const shipped = [
    [path.join(ROOT, "skills", "qa-task", "SKILL.md"), "GATE_HEAD"],
    [
      path.join(ROOT, "shared", "resources", "qa-re-review-scope.md"),
      "LAST_GATE_HEAD",
    ],
  ].map(([file, name]) => {
    const m = new RegExp(
      `^\\s*${name}=\\$\\(grep -E '\\^head:'.*\\| sed -E "(.*)"\\)\\s*$`,
      "m",
    ).exec(fs.readFileSync(file, "utf8"));
    assert.ok(
      m,
      `${path.relative(ROOT, file)}: the ${name}= sed reader must be found`,
    );
    // The expression is double-quoted in the shell: \" is a quote there, nothing else is escaped.
    return [`${path.relative(ROOT, file)} ${name}`, m[1].replace(/\\"/g, '"')];
  });
  const sha = "0123456789abcdef0123456789abcdef01234567";
  for (const [where, expr] of shipped) {
    for (const line of [
      `head: '${sha}'  `,
      `head: "${sha}"\t`,
      `head: '${sha}'  # git rev-parse HEAD`,
      `head: ${sha}`,
    ]) {
      const shell = execFileSync("sed", ["-E", expr], {
        input: `${line}\n`,
        encoding: "utf8",
      }).replace(/\n$/, ""); // only the newline: a .trim() here hid a sed that kept trailing spaces
      assert.equal(shell, sha, `${where} reads ${JSON.stringify(line)}`);
      assert.equal(
        field(`${line}\n`, "head"),
        shell,
        `field() agrees with ${where} on ${JSON.stringify(line)}`,
      );
    }
  }
});
