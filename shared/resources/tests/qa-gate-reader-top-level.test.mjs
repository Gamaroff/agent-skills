// ---------------------------------------------------------------------------
// qa-gate-reader-top-level.test.mjs
// ---------------------------------------------------------------------------
// task.278 / obs #151. The gate reader (`readTopIssues`) took an entry's
// `status` from text a finding QUOTED: `finding: "… status: waived …"` read as a
// waived entry, and FIRST wins, so the quoted text beat the entry's own
// `status: open` that followed it. Every case below pairs a planted quote with a
// CONTROL that must keep its old reading, so a reader that simply stopped
// reading `status` would fail the controls.
//
// Run: node --test shared/resources/tests/qa-gate-reader-top-level.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const { readTopIssues } = require(
  join(__dirname, "..", "qa-diminishing-returns.js"),
);

const gate = (...entryLines) =>
  `top_issues:\n${entryLines.join("\n")}\nwaiver:\n  active: false\n`;
const only = (text) => {
  const entries = readTopIssues(text);
  assert.equal(
    entries.length,
    1,
    `expected one entry, got ${JSON.stringify(entries)}`,
  );
  return entries[0];
};

test("a block entry whose finding quotes `status: waived` still reads its own status", () => {
  const e = only(
    gate(
      "  - id: X1",
      "    severity: high",
      "    file: a.js",
      '    finding: "the writer read status: waived from this text"',
      "    status: open",
    ),
  );
  assert.equal(e.status, "open");
});

test("control: a real top-level `status: waived` in a block entry reads waived", () => {
  const e = only(
    gate(
      "  - id: X1",
      "    severity: high",
      "    file: a.js",
      '    finding: "plain text"',
      "    status: waived",
    ),
  );
  assert.equal(e.status, "waived");
});

test("a block entry that quotes a status and has none of its own reads null, not the quote", () => {
  const e = only(
    gate(
      "  - id: X1",
      "    severity: high",
      "    file: a.js",
      '    finding: "quotes status: waived"',
    ),
  );
  assert.equal(e.status, null);
});

test("a single-quoted value is skipped too, and '' inside it does not end it early", () => {
  const e = only(
    gate(
      "  - id: X1",
      "    severity: high",
      "    file: a.js",
      "    finding: 'it''s noted, status: waived here'",
      "    status: open",
    ),
  );
  assert.equal(e.status, "open");
});

test("a flow entry whose finding quotes `status: waived` still reads its own status", () => {
  const e = only(
    gate(
      '  - {id: X1, severity: high, file: a.js, finding: "quotes status: waived", status: open}',
    ),
  );
  assert.equal(e.status, "open");
  assert.equal(e.file, "a.js");
});

test("control: a flow entry's own `status: waived` is read through the same path", () => {
  const e = only(
    gate(
      '  - {id: X1, severity: high, file: a.js, finding: "plain", status: waived}',
    ),
  );
  assert.equal(e.status, "waived");
});

test("a quote that contains a comma does not hide the real key after it", () => {
  const e = only(
    gate(
      '  - {id: X1, severity: high, file: a.js, finding: "has, status: waived", status: open}',
    ),
  );
  assert.equal(e.status, "open");
});

test("a key nested one flow level down is not the entry's own", () => {
  const e = only(
    gate(
      "  - {id: X1, severity: high, file: a.js, meta: {status: waived}, status: open}",
    ),
  );
  assert.equal(e.status, "open");
});

test("an apostrophe in plain prose is not a quote", () => {
  const e = only(
    gate(
      "  - id: X1",
      "    severity: high",
      "    file: a.js",
      "    finding: it's a plain scalar",
      "    status: waived",
    ),
  );
  assert.equal(e.status, "waived");
});

test("quoted id and file values are still read (the fix skips key text, not values)", () => {
  const e = only(
    gate(
      '  - id: "X-1"',
      "    severity: HIGH",
      '    file: "src/A.js"',
      "    status: Open",
    ),
  );
  assert.equal(e.id, "X-1");
  assert.equal(e.file, "src/A.js");
  assert.equal(e.severity, "high");
  assert.equal(e.status, "open");
});

test("a quoted `severity:` inside a finding does not override the entry's severity", () => {
  const e = only(
    gate(
      "  - id: X1",
      '    finding: "was severity: low, now worse"',
      "    severity: high",
      "    file: a.js",
    ),
  );
  assert.equal(e.severity, "high");
});
