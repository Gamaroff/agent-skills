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
import { readFileSync, existsSync } from "node:fs";
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
