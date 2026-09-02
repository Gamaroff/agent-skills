/**
 * Replay regression corpus for the snippet classifier's known fail-open routes.
 *
 * Why this exists: `task.67.bug.3` documented fourteen inputs that reached `runnable` past the
 * deny-list in `qa-execute-snippets.mjs`. Commit `0c4c05f` closed them. Nothing then held that
 * closure — the fourteen lived in a markdown table, and the only thing that had ever executed them
 * was a one-off script in /tmp that no longer exists.
 *
 * This pins both ends of the fix as an executable assertion: all fourteen reach `runnable` on the
 * pre-fix commit (so the corpus is discriminating and not vacuously satisfied by a classifier that
 * refuses everything), and none of them does on the shipped code (so the fix cannot silently regress).
 *
 * The pre-fix half needs git history. CI checks out at depth 1, so when the historical commit is not
 * present the pre-fix assertion SKIPS with a message saying why. It does not fail: a test that goes
 * red because of clone depth teaches people to ignore it, which is bug.2's lesson in this repository.
 * The post-fix half asserts against the working tree and always runs.
 *
 * Run: node --test evals/shared/tests/snippet-classifier-fail-open-replay.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");

const PRE_FIX = "a74c59a"; // "close thirteen fail-open holes" — bug.3's fourteen still open here
const POST_FIX = "0c4c05f"; // "close fourteen more fail-open routes found at the DoD gate"
const SUBJECT = "shared/resources/qa-execute-snippets.mjs";

/**
 * Read one verdict, insisting it exists. `classifyBlock(x)?.klass === "runnable"` filters a null
 * verdict away silently, so a classifier returning undefined would produce an empty result list and
 * a vacuous green — the exact silent-pass shape this file exists to prevent.
 */
function klassOf(classifyBlock, input) {
  const verdict = classifyBlock(input);
  assert.ok(
    verdict && typeof verdict.klass === "string",
    `classifyBlock returned no verdict for ${JSON.stringify(input)} — cannot evaluate the corpus`,
  );
  return verdict.klass;
}

/** The fourteen, verbatim from docs/tasks/task.67.execute-the-skill-qa-gate/task.67.bug.3.*.md */
const BUG3_ROUTES = [
  "who'am'i",
  'to"u"ch /tmp/x',
  "t\\ouch /tmp/x",
  "/usr/bin/[t]ouch /tmp/x",
  "/usr/bin/touc? /tmp/x",
  "~/../../usr/bin/whoami",
  "g\\h pr comment 1 --body x",
  "cu'r'l -X POST https://x/",
  "cat <<EOF > /tmp/x",
  "cat <<'EOF' >> ~/.zshrc",
  "sed 's/a/b/' -i file.txt",
  "sed -e 's/a/b/' -i file.txt",
  "sort --output=/tmp/x file.txt",
  "git diff --output=/tmp/x",
];

/**
 * The corpus must not be able to pass by being empty. Every assertion below is a `filter(...)`
 * over BUG3_ROUTES, and a filter over an empty array yields an empty array — so a corpus that lost
 * its entries would report success without having tested anything. That is the exact defect the
 * probe-mode guard this task delivers exists to catch, so it is guarded here too rather than
 * assumed away.
 */
test("the replay corpus still holds all fourteen routes", () => {
  assert.equal(
    BUG3_ROUTES.length,
    14,
    `the corpus has ${BUG3_ROUTES.length} entries, not 14 — every other assertion in this file is a ` +
      `filter over it and would pass vacuously. Re-derive from task.67.bug.3.`,
  );
  assert.equal(
    new Set(BUG3_ROUTES).size,
    14,
    "the corpus contains duplicate entries",
  );
});

function commitAvailable(sha) {
  try {
    execFileSync("git", ["cat-file", "-e", `${sha}^{commit}`], {
      cwd: repoRoot,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

/** Materialise a historical copy of the classifier and import it in isolation. */
async function classifierAt(sha) {
  const source = execFileSync("git", ["show", `${sha}:${SUBJECT}`], {
    cwd: repoRoot,
    encoding: "utf-8",
    maxBuffer: 32 * 1024 * 1024,
  });
  const dir = mkdtempSync(join(tmpdir(), "snippet-replay-"));
  const cleanup = () => rmSync(dir, { recursive: true, force: true });
  // Clean up on the failure path too. The caller's try/finally has not started yet at this point,
  // so a throw from the write or the dynamic import would otherwise strand the directory.
  try {
    const file = join(dir, `classifier-${sha}.mjs`);
    writeFileSync(file, source, "utf-8");
    const mod = await import(pathToFileURL(file).href);
    assert.equal(
      typeof mod.classifyBlock,
      "function",
      `${SUBJECT} at ${sha} does not export classifyBlock — the corpus cannot be evaluated`,
    );
    return { classifyBlock: mod.classifyBlock, cleanup };
  } catch (err) {
    cleanup();
    throw err;
  }
}

test(`all fourteen bug.3 routes reach 'runnable' on the pre-fix commit ${PRE_FIX}`, async (t) => {
  if (!commitAvailable(PRE_FIX)) {
    t.skip(
      `commit ${PRE_FIX} not in this clone (CI checks out at depth 1) — ` +
        `the anti-vacuity half of this corpus cannot run here`,
    );
    return;
  }
  const { classifyBlock, cleanup } = await classifierAt(PRE_FIX);
  try {
    const blocked = BUG3_ROUTES.filter(
      (input) => klassOf(classifyBlock, input) !== "runnable",
    );
    assert.deepEqual(
      blocked,
      [],
      `these inputs did NOT reach 'runnable' on ${PRE_FIX}, so the corpus no longer discriminates — ` +
        `if the classifier were broken open again, the post-fix assertion below might still pass ` +
        `vacuously. Re-derive the corpus from task.67.bug.3.`,
    );
  } finally {
    cleanup();
  }
});

test(`none of the fourteen reaches 'runnable' at the fix commit ${POST_FIX}`, async (t) => {
  if (!commitAvailable(POST_FIX)) {
    t.skip(`commit ${POST_FIX} not in this clone (CI checks out at depth 1)`);
    return;
  }
  const { classifyBlock, cleanup } = await classifierAt(POST_FIX);
  try {
    const open = BUG3_ROUTES.filter(
      (input) => klassOf(classifyBlock, input) === "runnable",
    );
    assert.deepEqual(open, [], `bug.3 routes still open at ${POST_FIX}`);
  } finally {
    cleanup();
  }
});

test("none of the fourteen reaches 'runnable' in the shipped classifier", async () => {
  const { classifyBlock } = await import(
    pathToFileURL(join(repoRoot, SUBJECT)).href
  );
  const open = BUG3_ROUTES.filter(
    (input) => klassOf(classifyBlock, input) === "runnable",
  );
  assert.deepEqual(
    open,
    [],
    `bug.3's fail-open routes have regressed in ${SUBJECT}. Each listed input reached 'runnable' ` +
      `and would therefore be EXECUTED by qa-task Step 4b.`,
  );
});
