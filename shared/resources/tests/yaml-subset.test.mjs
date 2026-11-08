"use strict";
/**
 * `yaml-subset.js` — the promoted parser.
 *
 * Two jobs, in order of importance:
 *
 * 1. **Contract.** `parseYamlSubset` moved out of `skills/develop-batch/scripts/schedule.mjs`
 *    and changed export form on the way (`export function` → `module.exports`). Task 37's
 *    §9 compatibility criterion says its *behaviour* must be unchanged. The export statement
 *    necessarily changed, so pinning the export is meaningless — these tests pin the only
 *    thing that matters by parsing the shapes `skills-config.yaml` actually uses and
 *    asserting the exact output. `schedule.mjs` reads real consumer configs through this
 *    function; a silent change here mis-schedules real work.
 *
 * 2. **Known limits, asserted rather than assumed.** The header says "no flow collections".
 *    That is not decoration: an unsupported construct comes back as a plain *string* with no
 *    error, so a `tracker-workflow.yaml` written with `[A, B, C]` would parse into nonsense
 *    and disable a whole overlay silently. The limit is pinned here so `tracker-workflow.js`
 *    can warn about it deliberately, and so nobody "fixes" the format docs to use flow
 *    sequences without a test failing.
 *
 * Quoted-key support (added after promotion, deliberately additive — see
 * `quoted keys` group) is what makes `byIssueType:` expressible at all: its keys are live
 * Jira issue type names like "IT / DevOps Task".
 *
 * Run: node --test shared/resources/tests/yaml-subset.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const { parseYamlSubset } = require(join(__dirname, "..", "yaml-subset.js"));

// ── 1. Contract: the shapes skills-config.yaml actually uses ─────────────────

test("contract — nested maps parse to nested objects", () => {
  const out = parseYamlSubset(
    ["prd:", "  prdShardedLocation: docs/prd", ""].join("\n"),
  );
  assert.deepEqual(out, { prd: { prdShardedLocation: "docs/prd" } });
});

test("contract — a list of scalars parses to an array", () => {
  const out = parseYamlSubset(
    [
      "devLoadAlwaysFiles:",
      "  - docs/architecture/concepts/coding-standards.md",
      "  - docs/architecture/concepts/tech-stack.md",
      "",
    ].join("\n"),
  );
  assert.deepEqual(out, {
    devLoadAlwaysFiles: [
      "docs/architecture/concepts/coding-standards.md",
      "docs/architecture/concepts/tech-stack.md",
    ],
  });
});

test("contract — a list of maps parses to an array of objects", () => {
  const out = parseYamlSubset(
    [
      "items:",
      "  - name: a",
      "    weight: 2",
      "  - name: b",
      "    weight: 3",
      "",
    ].join("\n"),
  );
  assert.deepEqual(out, {
    items: [
      { name: "a", weight: 2 },
      { name: "b", weight: 3 },
    ],
  });
});

test("contract — the real dogfood skills-config.yaml parses to its known shape", () => {
  // Reads the committed file rather than a copy: if the repo's own config grows a
  // construct this parser cannot read, that is a fact worth failing on.
  const { readFileSync } = require("node:fs");
  const cfg = parseYamlSubset(
    readFileSync(
      join(__dirname, "..", "..", "..", "skills-config.yaml"),
      "utf-8",
    ),
  );
  assert.equal(cfg.prd.prdShardedLocation, "docs/prd");
  assert.equal(
    cfg.architecture.architectureShardedLocation,
    "docs/architecture",
  );
  assert.equal(cfg.devLoadAlwaysFiles.length, 3);
  assert.ok(
    cfg.devLoadAlwaysFiles.every(
      (f) => typeof f === "string" && f.endsWith(".md"),
    ),
  );
});

test("contract — scalar coercion: bool, null, ~, int, float, quoted", () => {
  const out = parseYamlSubset(
    [
      "t: true",
      "f: false",
      "n: null",
      "tilde: ~",
      "i: 42",
      "neg: -7",
      "fl: 1.5",
      'dq: "quoted string"',
      "sq: 'single'",
      "plain: bare words",
      "emptyList: []",
      "emptyMap: {}",
      "",
    ].join("\n"),
  );
  assert.deepEqual(out, {
    t: true,
    f: false,
    n: null,
    tilde: null,
    i: 42,
    neg: -7,
    fl: 1.5,
    dq: "quoted string",
    sq: "single",
    plain: "bare words",
    emptyList: [],
    emptyMap: {},
  });
});

test("contract — a key with no value and no indented block is null", () => {
  assert.deepEqual(parseYamlSubset("lonely:\n"), { lonely: null });
});

test("contract — comments are stripped, including inline, without eating quoted #", () => {
  const out = parseYamlSubset(
    [
      "# leading comment",
      "a: 1   # trailing comment",
      'b: "has # inside"',
      "c: 'also # inside'",
      "# another",
      "",
    ].join("\n"),
  );
  assert.deepEqual(out, { a: 1, b: "has # inside", c: "also # inside" });
});

test("contract — empty and comment-only input yields {}", () => {
  assert.deepEqual(parseYamlSubset(""), {});
  assert.deepEqual(parseYamlSubset("# just a comment\n\n   \n"), {});
});

test("contract — CRLF line endings parse identically to LF", () => {
  const lf = parseYamlSubset("a:\n  b: 1\n");
  const crlf = parseYamlSubset("a:\r\n  b: 1\r\n");
  assert.deepEqual(crlf, lf);
});

// ── 2. Known limits, pinned on purpose ───────────────────────────────────────

test("limit — flow sequences are NOT supported and come back as strings", () => {
  // This is why tracker-workflow.yaml documents block sequences only, and why
  // validateWorkflow() warns when it sees a `[`-shaped scalar where a list belongs.
  // The failure is otherwise completely silent.
  const out = parseYamlSubset("statuses: [A, B, C]\n");
  assert.equal(
    out.statuses,
    "[A, B, C]",
    "if this ever becomes an array, the format docs and the validateWorkflow warning " +
      "both need revisiting — do not silently accept the improvement",
  );
  assert.ok(!Array.isArray(out.statuses));
});

test("limit — a flow sequence nested in a list item is a string too", () => {
  const out = parseYamlSubset(
    ["statuses:", "  - names: [In Progress, Doing]", ""].join("\n"),
  );
  assert.deepEqual(out.statuses, [{ names: "[In Progress, Doing]" }]);
});

// ── 3. Quoted keys — additive extension, required by byIssueType ─────────────

test("quoted keys — a double-quoted key containing / and spaces round-trips", () => {
  const out = parseYamlSubset(
    [
      "byIssueType:",
      '  "IT / DevOps Task":',
      "    pipeline:",
      "      in-qa: ~",
      "",
    ].join("\n"),
  );
  assert.deepEqual(out, {
    byIssueType: { "IT / DevOps Task": { pipeline: { "in-qa": null } } },
  });
});

test("quoted keys — a single-quoted key round-trips", () => {
  const out = parseYamlSubset(
    ["m:", "  'Sub-task / Bug':", "    a: 1", ""].join("\n"),
  );
  assert.deepEqual(out, { m: { "Sub-task / Bug": { a: 1 } } });
});

test("quoted keys — a quoted key with an inline scalar value works", () => {
  const out = parseYamlSubset(
    ['"IT / DevOps Task": In Progress', ""].join("\n"),
  );
  assert.deepEqual(out, { "IT / DevOps Task": "In Progress" });
});

test("quoted keys — the quoted key is NOT dropped (the pre-fix behaviour)", () => {
  // Before the extension this produced {} — the whole overlay vanished with no error.
  // Task 37 §10 rated this "Medium probability"; it was certain.
  const out = parseYamlSubset(["a:", '  "X / Y":', "    b: 1", ""].join("\n"));
  assert.notDeepEqual(out.a, {}, "quoted key must not be silently skipped");
});

test("quoted keys — a quoted key inside a list item works", () => {
  const out = parseYamlSubset(["l:", '  - "A / B": 1', ""].join("\n"));
  assert.deepEqual(out, { l: [{ "A / B": 1 }] });
});

test("quoted keys — unquoted keys are unaffected by the extension", () => {
  // The additive claim, asserted rather than argued: every plain key still takes the
  // identical path and yields the identical result.
  const out = parseYamlSubset(
    ["a.b-c: 1", "plain: 2", "under_score: 3", "  ", ""].join("\n"),
  );
  assert.deepEqual(out, { "a.b-c": 1, plain: 2, under_score: 3 });
});

test("quoted keys — a colon inside a quoted key does not split the key", () => {
  const out = parseYamlSubset(['"a: b": v', ""].join("\n"));
  assert.deepEqual(out, { "a: b": "v" });
});
