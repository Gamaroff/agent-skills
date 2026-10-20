/**
 * Corpus guard — every general bug's file status equals its registry row's
 * status, and every row names a bug file that exists.
 *
 * task 219. A general bug (`docs/bugs/bug.{N}.{name}/`) carries its status twice:
 * frontmatter `status:` and the Status cell of its row in
 * `docs/bugs/bug-registry.md`. develop-bug mirrored the row by hand at four
 * transitions, and `/qa-fix` — the fifth writer — did not, so after a reopen the
 * row read `⚠️ Reopened` while the file read `ready-for-qa`. Consumers that wrote
 * their own guard (tinker-city's `check-bug-doc-consistency.js`) went red; this
 * repository had no guard at all, only a check that each row's status is a legal
 * lifecycle value. `task-registry-drift.test.mjs` is the precedent for tasks.
 *
 * Unlike the task guard, the WHOLE status is compared, not one predicate: the
 * develop-bug pipeline and `/qa-fix` now write the row at every transition, in
 * the same commit as the file, so any difference is a missed write.
 *
 * Nothing is restated here. The registry parser and the lifecycle come from
 * `select-next.mjs`; the label map and its normaliser come from
 * `registry-tick.js`, the row's one writer. A second copy of the five labels
 * would let the writer and this guard disagree about what a row says.
 *
 * Run via: node --test evals/shared/tests/bug-registry-drift.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readFileSync,
  existsSync,
  readdirSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const SELECTOR_REL = path.join(
  "skills",
  "develop-next",
  "scripts",
  "select-next.mjs",
);
const CLI = path.join(REPO_ROOT, "shared", "resources", "registry-tick.js");

const {
  parseRegistry,
  parseFrontmatterStatus,
  BUG_LIFECYCLE_STATUSES,
  DEFAULT_BUG_REGISTRY,
} = await import(pathToFileURL(path.join(REPO_ROOT, SELECTOR_REL)).href);
const { BUG_STATUS_LABELS, normaliseBugRegistryStatus } = createRequire(
  import.meta.url,
)(CLI);

/**
 * Non-vacuity floor. `docs/bugs/` held 19 general bugs when this was written,
 * and numbers are never reused, so the population only grows. If the directory
 * walk or the parser stops matching, the comparisons below are skipped and the
 * test would pass on a registry it never read — this floor is what fails first.
 */
const MIN_BUGS = 15;

const BUGS_DIR = "docs/bugs";
const GENERAL_BUG_DIR = /^bug\.(\d+)\.[^/]+$/;

/**
 * Every disagreement between bug files and registry rows. Defined once and
 * used by the corpus test and every fixture test, so a mutation to the
 * comparison reds them together.
 *
 *   bugs: [{ n, file, status }] — status is the file's frontmatter status
 *   rows / malformed: what `parseRegistry(text, "bug", …)` returned
 */
function bugRegistryDisagreements({ bugs, rows, malformed = [] }) {
  const out = [];
  const byN = new Map(rows.map((r) => [r.n, r]));
  const bugNs = new Set(bugs.map((b) => b.n));
  for (const b of bugs) {
    const r = byN.get(b.n);
    if (!r) {
      const rejected = malformed.find((m) => m.n === b.n);
      out.push(
        rejected
          ? `bug ${b.n}: its registry row (line ${rejected.line}) is malformed — ${rejected.reason}`
          : `bug ${b.n}: ${b.file} has no registry row`,
      );
      continue;
    }
    const rowStatus = normaliseBugRegistryStatus(r.registryStatus);
    if (rowStatus === null) {
      out.push(
        `bug ${b.n}: registry row (line ${r.line}) reads \`${r.registryStatus}\`, which is neither a lifecycle token nor a label`,
      );
    } else if (rowStatus !== b.status) {
      out.push(
        `bug ${b.n}: registry row (line ${r.line}) reads \`${r.registryStatus}\` (${rowStatus}) but ${b.file} reads \`${b.status}\``,
      );
    }
  }
  for (const r of rows) {
    if (!bugNs.has(r.n)) {
      out.push(`bug ${r.n}: registry row (line ${r.line}) names no bug file`);
    }
  }
  return out;
}

/** The general bugs under `<root>/docs/bugs`, read from the directory listing. */
function loadBugs(root) {
  const abs = path.join(root, BUGS_DIR);
  const bugs = [];
  const unparseable = [];
  for (const ent of readdirSync(abs, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const m = ent.name.match(GENERAL_BUG_DIR);
    if (!m) {
      unparseable.push(ent.name);
      continue;
    }
    // The bug file is named after its directory; the dir also holds
    // `.implementation.`, `.dod.`, `.pr-review.` … siblings, never this name.
    const file = path.join(BUGS_DIR, ent.name, `${ent.name}.md`);
    const fileAbs = path.join(root, file);
    if (!existsSync(fileAbs)) {
      unparseable.push(`${ent.name} (no ${ent.name}.md)`);
      continue;
    }
    const status = parseFrontmatterStatus(readFileSync(fileAbs, "utf8"));
    bugs.push({ n: Number(m[1]), file, status });
  }
  return { bugs, unparseable };
}

function loadRegistry(root) {
  const text = readFileSync(path.join(root, DEFAULT_BUG_REGISTRY), "utf8");
  return parseRegistry(text, "bug", DEFAULT_BUG_REGISTRY);
}

test("every general bug's file status equals its registry row, and every row has a file", () => {
  assert.ok(
    existsSync(path.join(REPO_ROOT, DEFAULT_BUG_REGISTRY)),
    `bug registry not found at ${DEFAULT_BUG_REGISTRY} — this test's subject does not exist`,
  );
  const { bugs, unparseable } = loadBugs(REPO_ROOT);
  assert.deepEqual(
    unparseable,
    [],
    `directories under ${BUGS_DIR} that are not a general bug with its bug.{N}.{name}.md`,
  );
  assert.ok(
    bugs.length >= MIN_BUGS,
    `found only ${bugs.length} general bugs under ${BUGS_DIR}, expected at least ${MIN_BUGS}. ` +
      "Do NOT lower MIN_BUGS to make this pass — find out why the walk stopped matching.",
  );
  for (const b of bugs) {
    assert.ok(
      BUG_LIFECYCLE_STATUSES.has(b.status),
      `${b.file} reads \`${b.status}\`, outside the bug lifecycle`,
    );
  }
  const { rows, malformed } = loadRegistry(REPO_ROOT);
  assert.ok(
    rows.length >= MIN_BUGS,
    `parsed only ${rows.length} rows from ${DEFAULT_BUG_REGISTRY}, expected at least ${MIN_BUGS}`,
  );
  assert.deepEqual(
    bugRegistryDisagreements({ bugs, rows, malformed }),
    [],
    "a general bug's file and its registry row disagree — run " +
      '`node shared/resources/registry-tick.js --bug-status --file "<bug file>"`',
  );
});

// ── fixtures ────────────────────────────────────────────────────────────────

const HEADER = [
  "# Bug Registry",
  "",
  "| # | Title | Status | Severity | Priority | Created | Area |",
  "| --- | --- | --- | --- | --- | --- | --- |",
];
const fixtureRow = (n, status) =>
  `| ${n} | [B${n}](bug.${n}.b${n}/bug.${n}.b${n}.md) | ${status} | Major | High | 2026-01-01 | area |`;

/**
 * A consumer-shaped sandbox: the real selector symlinked (never copied — a copy
 * is a second parser), a registry, and one bug file per row.
 */
function sandbox(rowStatuses, fileStatuses = rowStatuses) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "bug-registry-drift-"));
  mkdirSync(path.join(dir, path.dirname(SELECTOR_REL)), { recursive: true });
  symlinkSync(path.join(REPO_ROOT, SELECTOR_REL), path.join(dir, SELECTOR_REL));
  mkdirSync(path.join(dir, BUGS_DIR), { recursive: true });
  writeFileSync(
    path.join(dir, DEFAULT_BUG_REGISTRY),
    [...HEADER, ...rowStatuses.map((s, i) => fixtureRow(i + 1, s)), ""].join(
      "\n",
    ),
  );
  fileStatuses.forEach((s, i) => setFileStatus(dir, i + 1, s));
  return dir;
}

function setFileStatus(dir, n, status) {
  const d = path.join(dir, BUGS_DIR, `bug.${n}.b${n}`);
  mkdirSync(d, { recursive: true });
  const f = path.join(d, `bug.${n}.b${n}.md`);
  writeFileSync(
    f,
    `---\ntype: bug\nstatus: ${status} # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened\n---\n\n# B${n}\n`,
  );
  return path.relative(dir, f);
}

function disagreementsIn(dir) {
  const { bugs } = loadBugs(dir);
  return bugRegistryDisagreements({ bugs, ...loadRegistry(dir) });
}

function mirror(dir, file) {
  return JSON.parse(
    execFileSync(
      process.execPath,
      [CLI, "--bug-status", "--file", file, "--json"],
      { cwd: dir, encoding: "utf8" },
    ),
  ).reason;
}

test("the comparison reports a changed row, a row-less bug and a file-less row", () => {
  const dir = sandbox(["closed", "closed", "closed"]);
  try {
    assert.deepEqual(disagreementsIn(dir), []);
    // Mutation proof: one row's cell changes, and only that is reported.
    const reg = path.join(dir, DEFAULT_BUG_REGISTRY);
    writeFileSync(
      reg,
      readFileSync(reg, "utf8").replace(
        fixtureRow(2, "closed"),
        fixtureRow(2, "reopened"),
      ),
    );
    const found = disagreementsIn(dir);
    assert.equal(found.length, 1);
    assert.match(found[0], /^bug 2: .*reads `reopened`/);
    // A bug with no row, and a row with no bug.
    setFileStatus(dir, 9, "new");
    rmSync(path.join(dir, BUGS_DIR, "bug.3.b3"), { recursive: true });
    const more = disagreementsIn(dir).join("\n");
    assert.match(more, /bug 9: .* has no registry row/);
    assert.match(more, /bug 3: registry row .* names no bug file/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a full reopen cycle stays in agreement when the CLI runs after every status write", () => {
  for (const vocabulary of ["token", "label"]) {
    const cell = (s) => (vocabulary === "label" ? BUG_STATUS_LABELS[s] : s);
    const dir = sandbox(
      [cell("closed"), cell("closed"), cell("ready-for-qa")],
      ["closed", "closed", "ready-for-qa"],
    );
    try {
      assert.deepEqual(disagreementsIn(dir), [], vocabulary);
      for (const status of [
        "reopened",
        "in-progress",
        "ready-for-qa",
        "closed",
      ]) {
        const file = setFileStatus(dir, 3, status);
        // Between the file write and the call, the guard sees the drift…
        assert.equal(disagreementsIn(dir).length, 1, `${vocabulary} ${status}`);
        assert.equal(mirror(dir, file), "mirrored", `${vocabulary} ${status}`);
        // …and after it, agreement, in the registry's own vocabulary.
        assert.deepEqual(disagreementsIn(dir), [], `${vocabulary} ${status}`);
        const row = readFileSync(path.join(dir, DEFAULT_BUG_REGISTRY), "utf8")
          .split("\n")
          .find((l) => l.startsWith("| 3 |"));
        assert.equal(row.split("|")[3].trim(), cell(status));
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

/**
 * Control case (obs #176): a label registry whose target row holds the right
 * status as a plain token. The guard normalises both forms, so it reports
 * agreement before the CLI runs; the CLI still writes the label, because the
 * vocabulary comes from the other rows.
 */
test("a plain token in a label registry agrees with the guard, and the CLI heals it to the label", () => {
  const dir = sandbox(
    ["✅ Closed", "✅ Closed", "closed"],
    ["closed", "closed", "closed"],
  );
  try {
    assert.deepEqual(disagreementsIn(dir), []);
    assert.equal(
      mirror(dir, path.join(BUGS_DIR, "bug.3.b3", "bug.3.b3.md")),
      "mirrored",
    );
    assert.deepEqual(disagreementsIn(dir), []);
    assert.match(
      readFileSync(path.join(dir, DEFAULT_BUG_REGISTRY), "utf8"),
      /^\| 3 \|.*\| ✅ Closed \|/m,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
