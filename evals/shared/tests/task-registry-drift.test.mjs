/**
 * Corpus guard — a task document that reads `accepted` has a registry row that
 * reads `accepted`, and a row that reads `accepted` has a document that does.
 *
 * task.103. `docs/tasks/task-registry.md` carries a Status column per task and
 * NOTHING wrote it after creation. `create-task` appends the row; `develop-next`
 * only reads it as a selection fallback; `finalise` sets the *document's*
 * `status: accepted` and `completed_date` and touches no registry. Seventeen rows
 * (T67–T96) were finished, accepted and merged, and never ticked — the registry
 * reported 22 open tasks when 5 were, and it was wrong for weeks.
 *
 * **Why it survived that long is the interesting part, and it is what this test
 * is shaped around.** The selector judges eligibility on the DOCUMENT's own
 * frontmatter, never on the row (see `registryFrontier`), so a stale row cannot
 * cause a finished task to be re-selected and no machine consumer can be made
 * wrong by one. There was no failing anything. The entire cost fell on human
 * readers, on the one question the registry exists to answer — *how much is
 * left?* — and a cost with no failure attached is a cost nobody is told about.
 * This test is the thing that turns it into a failure.
 *
 * The lifecycle vocabulary and the registry parser are IMPORTED from
 * `select-next.mjs`, never restated here. A second copy of "what a registry row
 * looks like" is the drift this repo has written several tasks about, and it
 * would fail in the worst direction: a private parser that quietly matched
 * nothing would report a clean, reassuring zero.
 *
 * Run via: node --test evals/shared/tests/task-registry-drift.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
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

const { parseRegistry, parseFrontmatterStatus, DEFAULT_TASK_REGISTRY } =
  await import(pathToFileURL(SELECT_NEXT).href);

/**
 * Non-vacuity floor. The registry held 105 parseable rows when this test was
 * written and only ever grows — numbers are never reused, and a cancelled task
 * keeps its row. A floor set close to that number is what stops the whole suite
 * degrading into a silent pass: if the parser stops matching (a header reworded,
 * the table moved inside a fence, a column renamed), `rows` collapses toward
 * zero, every comparison below is skipped, and the test reports success for a
 * registry it never read. That failure mode has occurred in this repo more than
 * once, and it is indistinguishable from a healthy result unless something
 * asserts the instrument saw a plausible amount of input.
 */
const MIN_ROWS = 90;

/**
 * The same floor for the document-driven direction below. `docs/tasks/` held 106
 * task directories when this was written, and it only grows. It is a SEPARATE
 * constant rather than a reuse of MIN_ROWS because the two walks fail
 * independently: the registry table can stop parsing while the directory listing
 * is fine, and vice versa. One shared constant would let a reader think one floor
 * guards both.
 */
const MIN_DOCS = 90;

/** Where task documents live, relative to the repo root. */
const TASKS_DIR = "docs/tasks";

const REGISTRY_REL = DEFAULT_TASK_REGISTRY;
const REGISTRY_ABS = path.join(REPO_ROOT, REGISTRY_REL);

/** Resolve a row's document path (registry-relative) against the repo root. */
function documentPath(row) {
  return path.join(REPO_ROOT, row.path);
}

function loadRows() {
  assert.ok(
    existsSync(REGISTRY_ABS),
    `task registry not found at ${REGISTRY_REL} — this test's subject does not exist`,
  );
  const { rows, malformed } = parseRegistry(
    readFileSync(REGISTRY_ABS, "utf8"),
    "task",
    REGISTRY_REL,
  );
  return { rows, malformed };
}

test("the task registry parses, and yields a plausible number of rows", () => {
  const { rows } = loadRows();
  assert.ok(
    rows.length >= MIN_ROWS,
    `parsed only ${rows.length} rows from ${REGISTRY_REL}, expected at least ${MIN_ROWS}. ` +
      `Either the registry shrank (it should not — numbers are never reused), or the ` +
      `parser stopped matching its table. Do NOT lower MIN_ROWS to make this pass: a low ` +
      `row count is the symptom this floor exists to make visible.`,
  );
});

test("every registry row points at a readable task document", () => {
  const { rows } = loadRows();
  const unreadable = rows
    .filter((r) => !existsSync(documentPath(r)))
    .map((r) => `  task ${r.n} (registry line ${r.line}) → ${r.path}`);

  assert.deepEqual(
    unreadable,
    [],
    `${unreadable.length} registry row(s) name a document that does not exist:\n` +
      `${unreadable.join("\n")}\n` +
      `A row whose document cannot be read is not merely untidy — it is a row this ` +
      `test CANNOT evaluate, so tolerating it would let the agreement check below be ` +
      `skipped silently, one row at a time.`,
  );
});

test("document `accepted` and registry row `accepted` agree in both directions", () => {
  const { rows } = loadRows();

  /**
   * Only the `accepted` predicate is compared, deliberately — not the full
   * status string.
   *
   * A task is legitimately mid-flight for days: its document reads
   * `in-progress` or `ready-for-review` while the row still reads
   * `ready-for-development`, and that is not drift, it is work in progress. And
   * `cancelled` is terminal and legitimately not `accepted` on either side.
   * Comparing whole strings would fire on both, constantly, on a correct
   * registry — and a check that cries wolf on healthy states is one that gets
   * muted, which returns the repository to exactly where it started.
   *
   * `accepted` is the one value that is terminal, unambiguous, and the answer to
   * the question the registry is read for. Both directions matter: a row behind
   * its document is the seventeen-row drift; a row AHEAD of its document is
   * worse, because it reports work as finished that is not.
   */
  const stale = [];
  const ahead = [];
  let compared = 0;

  for (const row of rows) {
    const docFile = documentPath(row);
    if (!existsSync(docFile)) continue; // asserted zero by the test above
    const docStatus = parseFrontmatterStatus(readFileSync(docFile, "utf8"));
    compared++;

    const docAccepted = docStatus === "accepted";
    const rowAccepted = row.registryStatus === "accepted";
    if (docAccepted === rowAccepted) continue;

    const entry =
      `  task ${row.n} — document reads \`${docStatus ?? "(no status)"}\`, ` +
      `registry line ${row.line} reads \`${row.registryStatus}\``;
    (docAccepted ? stale : ahead).push(entry);
  }

  assert.ok(
    compared >= MIN_ROWS,
    `compared only ${compared} document/row pairs, expected at least ${MIN_ROWS} — ` +
      `the comparison was skipped for most of the registry.`,
  );

  assert.deepEqual(
    stale,
    [],
    `${stale.length} task document(s) read \`accepted\` while their registry row does not:\n` +
      `${stale.join("\n")}\n` +
      `Tick the row in ${REGISTRY_REL}. This is the drift task.103 was filed about — ` +
      `it stalls nothing, so nothing else will tell you.`,
  );

  assert.deepEqual(
    ahead,
    [],
    `${ahead.length} registry row(s) read \`accepted\` while their document does not:\n` +
      `${ahead.join("\n")}\n` +
      `The row claims work is finished that the document says is not. Either the task ` +
      `was reopened and the row was left behind, or the row was ticked early.`,
  );
});

/**
 * The direction the three tests above structurally cannot see.
 *
 * They all iterate registry ROWS, so a task document with no row at all is never
 * visited — it is not a mismatch, it is an absence. That gap mattered because
 * three shipped statements promised the opposite: `finalise`'s reason table tells
 * a reader that a `no-row` result will be caught by "CI's drift check", its DoD
 * line says the same, and `docs/standards/task-registry.md` claims a write that
 * does not happen is "loud rather than silent". None of that was true of a
 * row-driven check, and a backstop that is trusted for a case it does not cover
 * is worse than no backstop.
 *
 * It was not hypothetical either. When this test was first run it found
 * **task 97** — accepted, merged under PR #350, and entirely absent from the
 * registry since creation. The row-driven walk had no way to notice.
 *
 * Keyed on the DIRECTORY name rather than on a glob of markdown files: a task
 * directory accumulates review, QA, gate, bug, DoD, plan and implementation
 * artifacts that all begin `task.{N}.`, and the primary document is the one whose
 * basename matches its directory. That convention holds for all 106 directories
 * and is checked here rather than assumed.
 */
test("every task document has a registry row", () => {
  const { rows } = loadRows();
  const byId = new Map(rows.map((r) => [r.n, r]));

  const tasksAbs = path.join(REPO_ROOT, TASKS_DIR);
  assert.ok(existsSync(tasksAbs), `${TASKS_DIR} does not exist`);

  const orphans = [];
  const noPrimary = [];
  let examined = 0;

  for (const entry of readdirSync(tasksAbs, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const m = entry.name.match(/^task\.(\d+)\./);
    if (!m) continue; // not a task directory
    examined++;

    const primary = path.join(tasksAbs, entry.name, `${entry.name}.md`);
    if (!existsSync(primary)) {
      noPrimary.push(
        `  ${TASKS_DIR}/${entry.name} — expected ${entry.name}.md`,
      );
      continue;
    }
    const n = Number(m[1]);
    if (byId.has(n)) continue;

    const status = parseFrontmatterStatus(readFileSync(primary, "utf8"));
    orphans.push(
      `  task ${n} — \`${status ?? "(no status)"}\` at ${TASKS_DIR}/${entry.name}/${entry.name}.md`,
    );
  }

  assert.ok(
    examined >= MIN_DOCS,
    `examined only ${examined} task directories under ${TASKS_DIR}, expected at least ` +
      `${MIN_DOCS}. The directory walk matched almost nothing, so the absence check below ` +
      `proves nothing. Do NOT lower MIN_DOCS to make this pass.`,
  );

  assert.deepEqual(
    noPrimary,
    [],
    `${noPrimary.length} task director(ies) have no primary document:\n${noPrimary.join("\n")}\n` +
      `The convention is that the primary document's basename matches its directory. A directory ` +
      `that breaks it cannot be checked against the registry at all.`,
  );

  assert.deepEqual(
    orphans,
    [],
    `${orphans.length} task document(s) have no row in ${REGISTRY_REL}:\n${orphans.join("\n")}\n` +
      `Add the row. A task absent from the registry is invisible to every reader of it and to ` +
      `\`registry-tick.js\`, which reports \`no-row\` and — by design — does not block acceptance.`,
  );
});
