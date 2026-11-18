"use strict";
/**
 * Fence-reader ratchet (task.280, obs #48): a test under `tests/` that reads fenced blocks out of a
 * skill document with a regex of its own is held to a reasoned allowlist, so the set only shrinks.
 *
 * WHY: a hand-written fence regex ignores fence nesting, so it drops blocks the real reader
 * (`extractBlocks` in shared/resources/qa-execute-snippets.mjs) sees, and a test passes on a document
 * the engines read differently. tests/epic-numbering-retirement.test.js did exactly that for five QA
 * cycles. `extractBlocks` reads only the `bash` info string, so a reader of another language
 * (yaml, mermaid, markdown, json) and a line-state scanner that needs the position of a fence are
 * legitimately outside it; each such file is listed with the reason.
 *
 * WHAT COUNTS: a source line (not a comment) of a tracked `tests/**` .js/.mjs file holding a regex
 * literal that contains a three-backtick fence token. The token is assembled here, never written,
 * so this file does not match itself.
 *
 * A NEW reader is not on the list and fails the run: use `extractBlocks`, or add the file WITH a
 * reason. An entry whose file no longer holds a reader fails as stale: delete it with the migration.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const REPO_ROOT = path.resolve(__dirname, "..");
const FENCE = "`".repeat(3);
const ESCAPED_FENCE = "\\`\\`\\`";

/** True for a non-comment line holding a regex literal that contains a fence token. */
function holdsFenceRegex(line) {
  const t = line.trim();
  if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*"))
    return false;
  const literal = /\/(?:\\.|[^/\n\\])*\/[gimsuyd]*/g;
  for (const m of t.matchAll(literal)) {
    if (m[0].includes(FENCE) || m[0].includes(ESCAPED_FENCE)) return true;
  }
  return false;
}

const NOT_BASH =
  "reads a non-bash language, which extractBlocks does not return";
const SH_TOO =
  "reads sh fences as well as bash; extractBlocks returns bash only";
const LINE_STATE =
  "a line-state scanner that needs the position of the fence, which extractBlocks does not return";
const SLICE =
  "cuts one fence out of a slice of a section, not out of a whole document";

/** `tests/` file → why its own fence reader is acceptable. */
const ALLOWED = new Map([
  [
    "tests/create-bug-report-bug-reports-heading.test.js",
    `${LINE_STATE}; reads a markdown fence`,
  ],
  ["tests/create-task-authoring-evidence.test.js", LINE_STATE],
  [
    "tests/deferred-work-placement.test.js",
    `${LINE_STATE}; reads a markdown fence`,
  ],
  [
    "tests/doc-id-chokepoint.test.js",
    `${SLICE}; anchored on a per-skill heading`,
  ],
  ["tests/doc-link-branch-sites-execute.test.js", LINE_STATE],
  ["tests/ensure-bug-label-tolerance.test.js", LINE_STATE],
  ["tests/fenced-bash-optional-file-globs.test.js", SH_TOO],
  ["tests/gh-labels.test.js", LINE_STATE],
  ["tests/identity-rule-probe.test.js", LINE_STATE],
  [
    "tests/key-lookup-single-statement.test.js",
    `${SLICE}; takes the first block after an anchor`,
  ],
  ["tests/qa-cycle.test.js", LINE_STATE],
  [
    "tests/qa-fix-structural-move.test.js",
    `${SLICE}; the documentation-deliverable block of one step`,
  ],
  [
    "tests/qa-read-back-block.test.js",
    `${LINE_STATE}; keeps the list indent of the fence`,
  ],
  ["tests/qa-results-step12-wiring.test.js", LINE_STATE],
  ["tests/restricted-access-docs.test.js", NOT_BASH],
  ["tests/unbound-default-reads.test.js", SH_TOO],
  ["tests/untrusted-content-rule.test.js", `${SLICE}; anchored on one heading`],
]);

function readers() {
  const out = execFileSync("git", ["ls-files", "-z", "--", "tests"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  const files = out
    .split("\0")
    .filter(Boolean)
    .filter((f) => /\.(js|mjs)$/.test(f) && !f.startsWith("tests/fixtures/"))
    .filter((f) => f !== "tests/fence-reader-ratchet.test.js")
    .filter((f) => fs.existsSync(path.join(REPO_ROOT, f)));
  const found = new Set();
  for (const f of files) {
    const text = fs.readFileSync(path.join(REPO_ROOT, f), "utf8");
    if (text.split("\n").some(holdsFenceRegex)) found.add(f);
  }
  return { files, found };
}

test("every hand-written fence reader in tests/ is on the allowlist, with a reason", () => {
  const { files, found } = readers();
  assert.ok(
    files.length >= 50,
    `non-vacuity floor: expected ≥ 50 test files scanned (78 on 2026-11-18), found ${files.length}`,
  );
  assert.ok(
    found.size >= 10,
    `non-vacuity floor: expected ≥ 10 readers found, found ${found.size}`,
  );
  const unlisted = [...found].filter((f) => !ALLOWED.has(f));
  assert.deepEqual(
    unlisted,
    [],
    `a test reads fenced blocks with a regex of its own — use extractBlocks (shared/resources/qa-execute-snippets.mjs), or add the file to ALLOWED with a reason:\n  ${unlisted.join("\n  ")}`,
  );
});

test("the allowlist is not stale — every entry still holds a reader, and states a reason", () => {
  const { found } = readers();
  for (const [f, why] of ALLOWED) {
    assert.ok(why && why.length > 10, `${f} needs a stated reason`);
    assert.ok(
      found.has(f),
      `${f} is listed but no longer holds a fence regex — it migrated; delete the entry`,
    );
  }
});

test("the detector flags a reader fixture and passes its controls", () => {
  const reader = `const m = text.match(/${FENCE}bash\\n([\\s\\S]*?)${FENCE}/);`;
  assert.equal(
    holdsFenceRegex(reader),
    true,
    "a regex literal holding a fence is a reader",
  );
  assert.equal(
    holdsFenceRegex(`// a ${FENCE}bash block, described in a comment`),
    false,
    "a comment is not a reader",
  );
  assert.equal(
    holdsFenceRegex(`const s = "${FENCE}bash";`),
    false,
    "a string with no regex literal is not a reader",
  );
  assert.equal(
    holdsFenceRegex(`const { extractBlocks } = require("x");`),
    false,
    "a migrated test has no fence regex",
  );
});
