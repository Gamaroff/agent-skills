/**
 * Behavioural tests for `open-coverage.js` — the reader the QA loop's §5c calls to count a PR
 * review's open coverage findings (task.240).
 *
 * The defect it replaced: an awk program that listed the shapes it refused, so every shape it did
 * not list was skipped and read as "no coverage" (task.238 bug.1, bug.8, bug.15 to bug.19). These
 * tests pin the reverse: each accepted shape reads its count, each refusal reason is reachable,
 * and the CLI prints exactly one `OPEN_COVERAGE=` line and exits 0 whatever it reads. The parity
 * suite (evals/shared/tests/pr-review-loop-parity.test.mjs) runs task.238's fixture tables through
 * the same function; this file covers what those tables do not.
 *
 * Run via: node --test shared/resources/tests/open-coverage.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "..");
const CLI = path.resolve(__dirname, "..", "open-coverage.js");
const { countOpenCoverage, REASONS, CATEGORIES } = createRequire(
  import.meta.url,
)(CLI);

const report = (yaml) =>
  `# PR Review\n\n**Verdict:** CONCERNS\n\n## Machine-Readable Findings\n\n\`\`\`yaml\n${yaml}\`\`\`\n\n## Recommended Actions\n\n1. x\n`;
const findings = (list) =>
  report(
    `reviewed_gate: task.1.gate.1.x.yml\nfindings:\n${list}truncated_count: 0\n`,
  );

// Accepted shapes, each with the count it must read.
const ACCEPTED = [
  [
    "no findings: findings: []",
    report("findings: []\ntruncated_count: 0\n"),
    0,
  ],
  [
    "an empty findings: key with no entries",
    report("findings:\ntruncated_count: 0\n"),
    0,
  ],
  [
    "one open coverage finding",
    findings("  - id: PC-1\n    category: coverage\n"),
    1,
  ],
  [
    "a double-quoted value with escaped quotes (block style)",
    findings(
      '  - id: PC-1\n    category: coverage\n    finding: "the row reads \\"done\\" and \\\\ is literal"\n',
    ),
    1,
  ],
  [
    "a single-quoted value with a doubled quote",
    findings(
      "  - id: PC-1\n    category: 'coverage'\n    finding: 'it''s open'\n",
    ),
    1,
  ],
  [
    "a literal block scalar under finding:",
    findings(
      "  - id: PC-1\n    category: coverage\n    finding: |\n      line one\n      category: trail\n",
    ),
    1,
  ],
  // Wrapped values under a key that decides nothing (task.240 bug.1); each reads as PyYAML does.
  [
    "a plain finding: wrapped onto deeper lines",
    findings(
      "  - id: PC-1\n    category: coverage\n    finding: a long value\n      that wraps\n      twice\n",
    ),
    1,
  ],
  [
    "a quoted finding: whose wrapped lines hold `#`",
    findings(
      '  - id: PC-1\n    finding: "text # not a comment\n      # still text\n      done"\n    category: coverage\n',
    ),
    1,
  ],
  [
    "a quoted finding: closed on a deeper line, then a comment",
    findings(
      '  - id: PC-1\n    finding: "a\n      b" # note\n    category: coverage\n',
    ),
    1,
  ],
  // A nested value under an empty key in plain text, apostrophes included (task.240 bug.3).
  [
    "a nested list of plain, keyed and apostrophe values",
    findings(
      "  - id: PC-1\n    category: coverage\n    evidence:\n      - a.md\n      - c: d\n      - it's plain\n      - don't stop\n",
    ),
    1,
  ],
  [
    "a flow entry with a quoted comma",
    findings('  - {id: PC-1, category: coverage, ref: "a, b"}\n'),
    1,
  ],
  [
    "provenance compares case-blind",
    findings(
      "  - id: PC-1\n    category: coverage\n    provenance: Pre-Existing\n",
    ),
    0,
  ],
  [
    "blank lines and an indented comment between entries",
    findings(
      "  - id: PC-1\n    category: coverage\n\n  # a note\n  - id: PC-2\n    category: scope\n",
    ),
    1,
  ],
  [
    "review-pr's SKILL.md example block (two entries, one coverage)",
    report(
      'findings:\n  - id: PC-1\n    category: coverage\n    severity: high\n    confidence: high\n    ref: "AC-1 / src/age.js:8"\n    finding: "AC-1 says 18 and over is an adult; the diff returns false at 18."\n    suggested_action: "Use `age >= 18`."\n  - id: CR-1\n    category: bug\n    severity: high\n    confidence: high\n    ref: "src/age.js:8"\n    finding: "`age > 18` returns false for 18, contradicting AC-1."\n    suggested_action: "Change the comparison to `age >= 18` and add a test at 18."\ntruncated_count: 0\n',
    ),
    1,
  ],
];

for (const [label, text, want] of ACCEPTED) {
  test(`accepts ${label} → ${want}`, () => {
    assert.deepEqual(countOpenCoverage(text), { count: want });
  });
}

// Every refusal, keyed by the reason it must report. Each reason in REASONS appears at least once
// (asserted below), so a reason no input can reach fails the suite rather than sitting dead.
const REFUSED = [
  ["no-section", "# PR Review\n\n## Recommended Actions\n\n1. x\n"],
  [
    "no-fence",
    "# PR Review\n\n## Machine-Readable Findings\n\n```\nfindings: []\n```\n",
  ],
  [
    "unterminated",
    "# PR Review\n\n## Machine-Readable Findings\n\n```yaml\nfindings:\n  - id: PC-1\n    category: trail\n",
  ],
  ["no-findings-key", report("reviewed_gate: none\ntruncated_count: 0\n")],
  ["bad-line", report("verdict: CONCERNS\nfindings: []\n")],
  ["bad-line", findings("  - id: PC-1\n\tcategory: coverage\n")],
  ["bad-line", findings("  -\n    id: PC-1\n    category: coverage\n")],
  // A line the reader cannot place must never be skipped: skipping this one reads `trail` and
  // prints a false 0 for a report whose author meant coverage.
  [
    "bad-line",
    findings(
      "  - id: PC-1\n    finding: x\n   category: coverage\n    category: trail\n",
    ),
  ],
  ["bad-value", report("findings: [{id: PC-1, category: coverage}]\n")],
  ["bad-value", findings("  - id: PC-1\n    category: &a coverage\n")],
  [
    "bad-value",
    findings(
      '  - id: PC-1\n    category: coverage\n    finding: "never closed\n',
    ),
  ],
  // Wrapped values PyYAML rejects (task.240 bug.1): the wrap is accepted only where YAML reads it.
  [
    "bad-value",
    findings(
      "  - id: PC-1\n    category: trail\n    finding: a long value that\n      wraps: onto a key-shaped line\n",
    ),
  ],
  [
    "bad-value",
    findings(
      "  - id: PC-1\n    finding: a value # note\n      wraps on\n    category: trail\n",
    ),
  ],
  [
    "bad-value",
    findings(
      '  - id: PC-1\n    finding: "a\n      b" trailing\n    category: coverage\n',
    ),
  ],
  [
    "bad-value",
    findings(
      '  - id: PC-1\n    finding: "text\n    category: coverage"\n    category: trail\n',
    ),
  ],
  ["bad-value", findings("  - id: PC-1\n    category: cover\n      age\n")],
  // A quote still open when the block ends: no later line reaches the key-indent check.
  [
    "bad-value",
    report(
      'findings:\n  - id: PC-1\n    category: coverage\n    finding: "opened\n      never closed\n',
    ),
  ],
  // A nested value that opens a quote or a flow collection and does not close it on that line
  // (task.240 bug.2): YAML runs it over the key-indent lines below.
  [
    "bad-value",
    findings(
      "  - id: PC-1\n    category: coverage\n    evidence:\n      - sub: 'open\n    provenance: pre-existing'\n",
    ),
  ],
  [
    "bad-value",
    findings(
      "  - id: PC-1\n    category: coverage\n    evidence:\n      [a,\n    provenance: pre-existing]\n",
    ),
  ],
  // An escape in a value the count compares (task.240 bug.4): the reader does not decode escapes,
  // so it refuses one rather than compare a value YAML would read differently.
  ...[
    '    category: coverage\n    provenance: "pr\\e-existing"\n',
    '    category: coverage\n    provenance: "pre-exis\\ting"\n',
    '    category: "cover\\age"\n',
  ].map((lines) => ["bad-value", findings(`  - id: PC-1\n${lines}`)]),
  // An opener behind a prefix or inside a flow collection (task.240 bug.3), and a closed one: a
  // nested value may hold no quote or flow collection at all.
  ...[
    '[a, "b]',
    '- - "open',
    '- &a "open',
    '- sub key: "open',
    '- x: "closed"',
    "- [x, y]",
    "- {k: v}",
    "- 'quoted'",
  ].map((line) => [
    "bad-value",
    findings(
      `  - id: PC-1\n    category: coverage\n    evidence:\n      ${line}\n    provenance: pre-existing\n`,
    ),
  ]),
  [
    "duplicate-key",
    findings("  - id: PC-1\n    category: coverage\n    id: PC-2\n"),
  ],
  ["duplicate-key", report("findings: []\nfindings: []\n")],
  ["bad-category", findings("  - id: PC-1\n    category: coverage-gap\n")],
  ["no-category", findings("  - id: PC-1\n    severity: high\n")],
  ["not-a-map", findings("  - just a sentence\n")],
  // Control case (obs #176): a shape no task.238 bug names — `category:` given in a flow entry and
  // again on the next line. The flow entry is complete on its line, so the second key is refused.
  [
    "bad-line",
    findings("  - {id: PC-1, category: trail}\n    category: coverage\n"),
  ],
];

// The title names the row by index: a fence string inside a template-literal expression blinds the
// relationship-assertion scanner to the rest of the file.
for (const [i, [reason, text]] of REFUSED.entries()) {
  test(`refuses (${reason}): REFUSED[${i}]`, () => {
    const r = countOpenCoverage(text);
    assert.equal(r.unreadable, reason, JSON.stringify(r));
    assert.equal("count" in r, false);
  });
}

test("every reason in REASONS is reachable by some input", () => {
  const reached = new Set(REFUSED.map(([reason]) => reason));
  for (const reason of REASONS)
    assert.ok(reached.has(reason), `no test reaches ${reason}`);
});

test("CATEGORIES is review-pr's six tokens", () => {
  assert.deepEqual([...CATEGORIES].sort(), [
    "bug",
    "cleanup",
    "consistency",
    "coverage",
    "scope",
    "trail",
  ]);
  const reviewPr = execFileSync(
    "git",
    ["show", "HEAD:skills/review-pr/SKILL.md"],
    { cwd: ROOT, encoding: "utf8" },
  );
  assert.match(
    reviewPr,
    /category: \{coverage\|scope\|trail\|consistency for PC-\*, bug\|cleanup for CR-\*\}/,
  );
});

test("a non-string input is a refusal, never a throw", () => {
  assert.equal(countOpenCoverage(undefined).unreadable, "no-section");
  assert.equal(countOpenCoverage(null).unreadable, "no-section");
});

// The CLI contract: exactly one line matching ^OPEN_COVERAGE=(\d+|unreadable)$, exit 0 on every
// input, refusals included; the reason goes to stderr only. A usage error exits 2.
function cli(args) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
}

test("CLI: a count, a refusal and a missing file each print one line and exit 0", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "open-coverage-cli-"));
  try {
    const ok = path.join(dir, "ok.md");
    const bad = path.join(dir, "bad.md");
    writeFileSync(ok, findings("  - id: PC-1\n    category: coverage\n"));
    writeFileSync(
      bad,
      findings("  - id: PC-1\n    category: !!str coverage\n"),
    );
    for (const [file, want] of [
      [ok, "OPEN_COVERAGE=1\n"],
      [bad, "OPEN_COVERAGE=unreadable\n"],
      [path.join(dir, "absent.md"), "OPEN_COVERAGE=unreadable\n"],
    ]) {
      const r = cli(["--file", file]);
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.stdout, want);
      assert.match(r.stdout, /^OPEN_COVERAGE=(\d+|unreadable)\n$/);
    }
    assert.match(cli(["--file", bad]).stderr, /bad-value/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI: no --file is a usage error, exit 2, nothing on stdout", () => {
  const r = cli([]);
  assert.equal(r.status, 2);
  assert.equal(r.stdout, "");
});

// Non-vacuity over the tracked corpus ("an empty result is a claim about the instrument"): a reader
// that always said 0, or always unreadable, would pass the tables above only if they were wrong.
// Over every tracked review report it must read at least one `1` and at least one `unreadable`.
test("corpus: every tracked *.pr-review.*.md reads, with at least one 1 and one unreadable", () => {
  const files = execFileSync("git", ["ls-files", "*pr-review.*.md"], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
  assert.ok(
    files.length > 0,
    "git ls-files found no review reports — the corpus is not where it was",
  );
  const seen = new Map();
  for (const f of files) {
    const r = countOpenCoverage(readFileSync(path.join(ROOT, f), "utf8"));
    const v = "count" in r ? String(r.count) : "unreadable";
    seen.set(v, (seen.get(v) ?? 0) + 1);
  }
  assert.ok(
    seen.get("1") > 0,
    `no report read 1: ${JSON.stringify([...seen])}`,
  );
  assert.ok(
    seen.get("unreadable") > 0,
    `no report read unreadable: ${JSON.stringify([...seen])}`,
  );
});
