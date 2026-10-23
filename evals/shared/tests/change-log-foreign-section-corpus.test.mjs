/**
 * Corpus guard — no tracked document holds a foreign section inside its
 * change-log markers.
 *
 * task.230. Only the log lives between `<!-- change-log-start -->` and
 * `<!-- change-log-end -->`. A sibling section written there used to be folded
 * into the log on the next append, silently: the QA loop's `## Deferred Work`
 * on task.229 (obs #91), and finalise's `## Definition of Done - PASSED ✅` on
 * task.166, 170, 175 and 203 (obs #229). The engine now lifts such a section on
 * every write; this guard turns a document that still holds one red in CI,
 * instead of leaving it for whichever write happens to touch it next.
 *
 * The definition is the guard's: tracked Markdown (`git ls-files '*.md'`),
 * marker blocks only (an unmarked log ends at the next sibling heading, so it
 * cannot hold one), and the predicate IMPORTED from `change-log.js`
 * (`foreignSections`) — never restated here. A second definition of "foreign"
 * in a test drifts in the worst direction: it passes a document the engine
 * would rewrite.
 *
 * Run via: node --test evals/shared/tests/change-log-foreign-section-corpus.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const require = createRequire(import.meta.url);
const CL = require(
  path.join(REPO_ROOT, "shared", "resources", "change-log.js"),
);

/**
 * Non-vacuity floor. 120 tracked documents carried a marker block on 2026-10-22
 * (this test's own `blocks` count, measured on the task.230 branch), and the
 * corpus only grows. Without a floor, a scan that read nothing — a moved root, a
 * `git ls-files` that failed quietly — would find no offenders and pass.
 */
const MIN_BLOCKS = 100;

function scanCorpus() {
  const files = execFileSync("git", ["ls-files", "-z", "--", "*.md"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
  let blocks = 0;
  const offenders = [];
  for (const rel of files) {
    let content;
    try {
      content = readFileSync(path.join(REPO_ROOT, rel), "utf8");
    } catch {
      continue; // tracked but deleted in the working tree
    }
    const found = CL.findChangeLog(content);
    if (!found || !found.hasMarkers) continue;
    blocks++;
    for (const s of CL.foreignSections(content)) {
      offenders.push(`${rel}: ${s.heading} (${s.side} the table)`);
    }
  }
  return { files: files.length, blocks, offenders };
}

test("no tracked document holds a foreign section inside its change-log markers", () => {
  const { blocks, offenders } = scanCorpus();
  assert.ok(
    blocks >= MIN_BLOCKS,
    `vacuous read: ${blocks} marker blocks scanned, floor ${MIN_BLOCKS}`,
  );
  assert.deepEqual(
    offenders,
    [],
    `foreign sections inside change-log markers — repair with liftForeignSections (or the next upsertChangeLog write):\n${offenders.join("\n")}`,
  );
});

test("the guard sees a section planted inside a real document's block", () => {
  // Positive control on live input: take a tracked document with a clean block,
  // plant a sibling section between the start marker and the table, and the
  // predicate the guard reads must report it.
  const rel =
    "docs/tasks/task.230.change-log-block-foreign-sections/task.230.change-log-block-foreign-sections.md";
  const content = readFileSync(path.join(REPO_ROOT, rel), "utf8");
  assert.deepEqual(CL.foreignSections(content), [], `${rel} is not clean`);
  // Splice at the block the engine located, never at the first marker string: a
  // document about this engine quotes the marker in prose and in fenced examples.
  const found = CL.findChangeLog(content);
  assert.ok(found?.hasMarkers, `${rel} has no marker block`);
  const at = found.start + CL.CL_START.length + 1;
  assert.equal(content.slice(found.start, at), `${CL.CL_START}\n`);
  const planted =
    content.slice(0, at) +
    "## Planted\n\nInside the block.\n\n" +
    content.slice(at);
  assert.deepEqual(
    CL.foreignSections(planted).map((s) => s.heading),
    ["## Planted"],
  );
});
