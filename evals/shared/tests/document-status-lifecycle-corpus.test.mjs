/**
 * Corpus guard — every bug and task document in this repo carries a status its
 * lifecycle actually defines, and so does every registry row that points at one.
 *
 * bug.8. The lifecycle was enforced in exactly one place — `review-bug`, which
 * runs as `develop-bug` Step 2, on a bug the selector has ALREADY chosen. A bug
 * whose `status` was outside the lifecycle was never selected, so `review-bug`
 * never ran on it, so the check that would have caught the bad status could only
 * ever fire on inputs that did not need it. Two of this repo's ten general bugs
 * were filed that way (`status: open`), sat unselectable on `develop`, and
 * nothing anywhere said so.
 *
 * This test is the guard moved UPSTREAM of the gate — it reads the corpus
 * directly, so it fires the moment a bad status is committed, whether the
 * document was authored through `/create-bug-report` or (as both real cases
 * were) by an agent mid-pipeline that never touched the template.
 *
 * The lifecycles are IMPORTED from `select-next.mjs`, never restated here: a
 * fourth copy of the vocabulary is the drift this repo has written three tasks
 * about. `select-next.test.mjs` separately pins those sets against the prose in
 * `docs/standards/bug-documents.md`, so the chain is
 * prose → code → corpus with one comparison at each link.
 *
 * Run via: node --test evals/shared/tests/document-status-lifecycle-corpus.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, globSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const SELECT_NEXT = path.join(
  REPO_ROOT,
  "skills",
  "develop-next",
  "scripts",
  "select-next.mjs",
);

const {
  parseRegistry,
  parseFrontmatterStatus,
  BUG_LIFECYCLE_STATUSES,
  TASK_LIFECYCLE_STATUSES,
} = await import(pathToFileURL(SELECT_NEXT).href);

const LIFECYCLE = {
  bug: BUG_LIFECYCLE_STATUSES,
  task: TASK_LIFECYCLE_STATUSES,
};

/** OKF's one hard requirement is `type`, so that is what identifies a document. */
function frontmatterType(text) {
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return null;
  const m = fm[1].match(/^type:\s*(.+)$/m);
  return m
    ? m[1]
        .trim()
        .replace(/\s+#.*$/, "")
        .replace(/^['"]|['"]$/g, "")
    : null;
}

function docsOfType(kind) {
  const found = [];
  for (const rel of globSync("docs/**/*.md", { cwd: REPO_ROOT })) {
    const abs = path.join(REPO_ROOT, rel);
    let text;
    try {
      text = readFileSync(abs, "utf-8");
    } catch {
      continue;
    }
    if (frontmatterType(text) === kind) found.push({ rel, text });
  }
  return found;
}

// ── The corpus itself ────────────────────────────────────────────────────────

for (const kind of ["bug", "task"]) {
  test(`every \`type: ${kind}\` document carries a status in the ${kind} lifecycle`, () => {
    const docs = docsOfType(kind);

    // Anti-vacuity. A glob that silently matches nothing is a test that passes
    // by never looking — the exact shape of failure this file exists to stop.
    assert.ok(
      docs.length >= 5,
      `found only ${docs.length} \`type: ${kind}\` documents — the corpus scan is broken, not the corpus`,
    );

    const bad = [];
    for (const { rel, text } of docs) {
      const status = parseFrontmatterStatus(text);
      if (!LIFECYCLE[kind].has(status))
        bad.push(`${rel} → ${JSON.stringify(status)}`);
    }
    assert.deepEqual(
      bad,
      [],
      `${bad.length} ${kind} document(s) carry a status the ${kind} lifecycle does not define.\n` +
        `  lifecycle: ${[...LIFECYCLE[kind]].join(", ")}\n` +
        bad.map((b) => `  ${b}`).join("\n") +
        `\n  A status outside the lifecycle is not selectable by /develop-next and not\n` +
        `  reachable by /develop-${kind} — the document is filed but invisible. Fix the\n` +
        `  frontmatter; do NOT widen the lifecycle to admit it.`,
    );
  });
}

// ── The registries ───────────────────────────────────────────────────────────
//
// A row and its document can disagree — this repo has had three task rows read
// `draft` while their documents read `accepted`. The selector resolves that by
// trusting the document, so a bad ROW status does not make work invisible the
// way a bad document status does. It is still a filing error, and it is what a
// human reads when scanning the registry, so it is asserted too.

const REGISTRIES = [
  { kind: "bug", rel: "docs/bugs/bug-registry.md" },
  { kind: "task", rel: "docs/tasks/task-registry.md" },
];

for (const { kind, rel } of REGISTRIES) {
  test(`every row in ${rel} carries a status in the ${kind} lifecycle`, () => {
    const abs = path.join(REPO_ROOT, rel);
    const { rows, malformed } = parseRegistry(
      readFileSync(abs, "utf-8"),
      kind,
      rel,
    );

    assert.ok(rows.length >= 5, `parsed only ${rows.length} rows from ${rel}`);
    assert.deepEqual(
      malformed.map((m) => m.reason ?? m),
      [],
      `${rel} has malformed rows`,
    );

    const bad = rows
      .filter((r) => !LIFECYCLE[kind].has(r.registryStatus))
      .map((r) => `row ${r.n} → ${JSON.stringify(r.registryStatus)}`);
    assert.deepEqual(
      bad,
      [],
      `${rel}: ${bad.length} row(s) outside the ${kind} lifecycle (${[...LIFECYCLE[kind]].join(", ")})\n` +
        bad.map((b) => `  ${b}`).join("\n"),
    );
  });

  test(`every row in ${rel} points at a document that exists and parses`, () => {
    const abs = path.join(REPO_ROOT, rel);
    const { rows } = parseRegistry(readFileSync(abs, "utf-8"), kind, rel);

    const bad = [];
    for (const r of rows) {
      const docAbs = path.join(REPO_ROOT, r.path);
      if (!existsSync(docAbs)) {
        bad.push(`row ${r.n} → missing document ${r.path}`);
        continue;
      }
      const status = parseFrontmatterStatus(readFileSync(docAbs, "utf-8"));
      if (status === null)
        bad.push(`row ${r.n} → ${r.path} has no parseable frontmatter status`);
    }
    assert.deepEqual(bad, [], bad.join("\n"));
  });
}
