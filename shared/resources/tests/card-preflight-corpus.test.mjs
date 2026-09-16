"use strict";
/**
 * Population check: does any task document in THIS repository publish a card
 * block that is a label with nothing under it?
 *
 * The defect this pins (task.117): `summariseSection` took a leading bold-only
 * line (`**Functional**:`) as a section's prose and stopped there, so the
 * criteria list under it never reached the card. The observation that filed
 * the task counted 15 of 106 documents whose block was `**Functional**` and
 * nothing else (2026-09-10). This test, run before the fix on 2026-09-17,
 * counted 29 of 120: the 15, plus 11 (task.16–27) whose label sat directly
 * above its bullets with no blank line — the prose path joined label and list
 * into one run-on string, which the narrower instrument's character count
 * missed — plus 3 Breaking Changes blocks. The preflight passed every one of
 * them, because its vocabulary was missing / empty and the block was neither.
 *
 * Written in POPULATION form, not as one fixture, for the reason in
 * docs/reference/anti-patterns.md § "Never fix N call sites without a
 * population check": a fixture proves the summariser handles the shape it was
 * shown; this proves no document in the corpus still produces the finding.
 * Reverting the summariser fix turns this red at 28 (task.104's block was
 * fixed in the document, where that fix belongs) — that is the mutation proof,
 * and it is why the count is asserted at exactly zero rather than "fewer than
 * before".
 *
 * The floor on documents visited is what stops the zero being vacuous. A glob
 * that matches nothing reports zero findings with the same confidence as a
 * corpus that is clean.
 *
 * Run: node --test shared/resources/tests/card-preflight-corpus.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");
const lib = require(join(__dirname, "..", "jira-sync.js"));
const { checkCardSections, CARD_SECTIONS_BY_KIND, parseFrontmatter } = lib;

// A task CARD document is `docs/tasks/task.N.name/task.N.name.md` — basename
// equals its directory. Everything else in the folder (plans, reviews, QA
// write-ups, gates, implementation reports) is a sibling artifact no card is
// built from, and a suffix blocklist misses the ones nobody thought of.
function taskCardDocuments() {
  const root = join(repoRoot, "docs", "tasks");
  const out = [];
  for (const entry of readdirSync(root)) {
    const dir = join(root, entry);
    if (!statSync(dir).isDirectory()) continue;
    const doc = join(dir, `${entry}.md`);
    try {
      if (statSync(doc).isFile()) out.push(doc);
    } catch {
      // a task directory without its card document is not this test's concern
    }
  }
  return out;
}

// The corpus floor. 120 documents on 2026-09-17; a number well under that
// still proves the walk found the corpus, and a number over it never fails.
const CORPUS_FLOOR = 100;

test("corpus: no task document publishes a label-only card block", () => {
  const docs = taskCardDocuments();
  assert.ok(
    docs.length >= CORPUS_FLOOR,
    `expected at least ${CORPUS_FLOOR} task documents, found ${docs.length} — the walk is broken, not the corpus`,
  );

  const headingOnly = [];
  for (const file of docs) {
    const { body } = parseFrontmatter(readFileSync(file, "utf8"));
    const r = checkCardSections(body, CARD_SECTIONS_BY_KIND.task);
    for (const f of r.findings) {
      if (f.code === "heading-only") {
        headingOnly.push(`${file.split("/").pop()} → ${f.section}`);
      }
    }
  }

  assert.deepEqual(
    headingOnly,
    [],
    `${headingOnly.length} of ${docs.length} task documents publish a card block that is a label with nothing under it:\n  ${headingOnly.join("\n  ")}`,
  );
});

// The property that defines `heading-only`, stated once as a fixture beside the
// corpus walk so a reader can see what the population test is counting.
test("corpus: the finding fires on a bold label alone and clears when the list under it is rendered", () => {
  const specs = CARD_SECTIONS_BY_KIND.task;
  const doc = (criteria) =>
    `## 1. Overview\n\nA thing.\n\n## 9. Success Criteria\n\n${criteria}\n`;

  // The shape 26 real documents had, and what the card must now show for it.
  const labelled = checkCardSections(
    doc(
      "**Functional**:\n\n- [x] one\n- [x] two\n\n**Code Quality**:\n\n- [x] three",
    ),
    specs,
  );
  assert.equal(labelled.ok, true, JSON.stringify(labelled.findings));
  const sc = labelled.blocks.find((b) => b.heading === "Success Criteria");
  assert.equal(sc.kind, "list");

  // A label with genuinely nothing under it is the finding, by name.
  const alone = checkCardSections(doc("**Functional**"), specs);
  assert.equal(alone.ok, false);
  assert.deepEqual(
    alone.findings.map((f) => [f.section, f.code]),
    [["Success Criteria", "heading-only"]],
  );
});
