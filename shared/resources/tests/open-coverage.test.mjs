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

// Accepted shapes, each with the count it must read. Every value sits on its key's line.
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
    "findings: with a trailing comment, then the list",
    report("findings: # one entry per finding\n  - category: coverage\n"),
    1,
  ],
  // Shapes the differential suite found (open-coverage-differential.test.mjs), each pinned here
  // so a regression names its rule rather than a seed.
  [
    "a capitalised Provenance: is not provenance: keys are case-sensitive, as in YAML",
    findings(
      "  - id: PC-1\n    category: coverage\n    Provenance: pre-existing\n",
    ),
    1,
  ],
  // A dash with wider spacing: the entry's keys sit at its first key's column (task.240 bug.5).
  [
    "an entry whose keys line up after a two-space dash",
    findings("  -  category: coverage\n     provenance: pre-existing\n"),
    0,
  ],
  [
    "one open coverage finding",
    findings("  - id: PC-1\n    category: coverage\n"),
    1,
  ],
  [
    "a double-quoted value with escaped quotes and backslashes",
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
    "a quoted value followed by a comment",
    findings('  - id: PC-1\n    ref: "a # b" # c\n    category: coverage\n'),
    1,
  ],
  // The tracked reports' plain free text: a `#` after a space starts a comment and one with none
  // is text, a colon not followed by a space is text, and a value may start with a non-ASCII mark.
  [
    "plain free text as the tracked reports write it",
    findings(
      '  - id: PC-1\n    category: coverage\n    finding: PR #657 merged with a#b\n    suggested_action: § 3\'s bundle:check — use `x|y`, not "z"\n',
    ),
    1,
  ],
  [
    "a bracket in a plain value is text",
    findings(
      "  - id: PC-1\n    category: coverage\n    finding: see [x] here\n",
    ),
    1,
  ],
  [
    "an empty value is null, and the next key still reads",
    findings(
      "  - id: PC-1\n    finding:\n    category: coverage\n    provenance:\n",
    ),
    1,
  ],
  [
    "a trailing comment after a deciding value is not part of it",
    findings(
      "  - id: PC-1\n    category: coverage # was trail\n    provenance: pre-existing # was new\n",
    ),
    0,
  ],
  [
    "provenance compares case-blind",
    findings(
      "  - id: PC-1\n    category: coverage\n    provenance: Pre-Existing\n",
    ),
    0,
  ],
  [
    "blank lines and indented comments, at any depth, between keys and entries",
    findings(
      "  - id: PC-1\n    category: coverage\n\n  # a note\n        # deeper\n  - id: PC-2\n    category: scope\n",
    ),
    1,
  ],
  [
    "a spaces-only blank line between entries is blank",
    findings(
      "  - id: PC-1\n    category: coverage\n   \n  - id: PC-2\n    category: coverage\n",
    ),
    2,
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
  ["bad-value", report("findings: []# c\n")],
  [
    "duplicate-key",
    findings("  - id: PC-1\n    category: coverage\n    id: PC-2\n"),
  ],
  ["duplicate-key", report("findings: []\nfindings: []\n")],
  ["bad-category", findings("  - id: PC-1\n    category: coverage-gap\n")],
  // An empty category is YAML's null, not a token.
  ["bad-category", findings("  - id: PC-1\n    category:\n")],
  ["no-category", findings("  - id: PC-1\n    severity: high\n")],
  // A capitalised key is not the key: the entry has no category.
  ["no-category", findings("  - id: PC-1\n    Category: coverage\n")],
  ["not-a-map", findings("  - just a sentence\n")],
  // A key at `dash + 2` after a dash with wider spacing (task.240 bug.5): YAML rejects the block.
  ...["  -  ", "  -   "].map((dash) => [
    "bad-line",
    findings(`${dash}category: coverage\n    provenance: pre-existing\n`),
  ]),

  // One line per key. Every multi-line shape the first reader accepted — a wrapped value, a value
  // quoted across lines, a nested list or map, a block scalar — and every shape it refused for
  // what a deeper line held (task.240 bugs 1–3, 6), is now refused for being a deeper line.
  ...[
    "    finding: a long value\n      that wraps\n",
    "    finding: a long value that\n      wraps: onto a key-shaped line\n",
    "    finding: a value # note\n      wraps on\n",
    "    finding: a\n      # c\n      more\n",
    "    finding: a\n      b # c\n      more\n",
    "    finding: it reads, 0\n      more\n",
    "    provenance: pre-existing\n      on the base only\n",
    "    evidence:\n      - a.md\n      - it's plain\n",
    "    evidence:\n      - a.md # c\n      # c\n      - b.md\n",
    "    evidence:\n      word\n      # c\n      more\n",
    "    evidence:\n      - sub: 'open\n    provenance: pre-existing'\n",
    "    evidence:\n      [a,\n    provenance: pre-existing]\n",
    ...[
      '[a, "b]',
      '- - "open',
      '- &a "open',
      '- sub key: "open',
      '- x: "closed"',
      "- [x, y]",
      "- {k: v}",
      "- 'quoted'",
      "- &a x",
      "- k: x: y",
      "- *a",
    ].map(
      (line) => `    evidence:\n      ${line}\n    provenance: pre-existing\n`,
    ),
  ].map((lines) => [
    "bad-line",
    findings(`  - id: PC-1\n    category: coverage\n${lines}`),
  ]),
  ["bad-line", findings("  - id: PC-1\n    category: cover\n      age\n")],
  // A quoted value must close on its own line (task.240 bug.1): one that does not is refused there,
  // before YAML could run it over the key-indent lines below.
  ...[
    '    finding: "never closed\n',
    '    finding: "a\n      b"\n',
    '    finding: "a\n      b" trailing\n',
    '    finding: "text\n    category: coverage"\n    category: trail\n',
    "    finding: 'it''s long\n      and wraps'\n",
  ].map((lines) => [
    "bad-value",
    findings(`  - id: PC-1\n    category: coverage\n${lines}`),
  ]),
  // A block scalar, an anchor, a tag or an alias (task.238 bug.17).
  ...[
    "    finding: |\n      line one\n",
    "    finding: >-\n      line one\n",
    "    category: &a coverage\n",
    "    category: !!str coverage\n",
    "    finding: *a\n",
  ].map((lines) => ["bad-value", findings(`  - id: PC-1\n${lines}`)]),
  // A flow entry, however it is written (task.240 bug.10 and the shapes before it).
  ...[
    "{id: PC-1, category: coverage}",
    '{id: PC-1, category: coverage, ref: "a, b"}',
    "{id: PC-1, category:coverage}",
    "{id: x: y, category: coverage}",
    "{category: coverage, provenance: pre-existing]}",
  ].map((entry) => ["bad-line", findings(`  - ${entry}\n`)]),
  // Control case (obs #176): `category:` given in a flow entry and again on the next line.
  [
    "bad-line",
    findings("  - {id: PC-1, category: trail}\n    category: coverage\n"),
  ],

  // A plain value: no `: ` and no trailing `:`, under any key — task.238 bug.15's leniency for free
  // text is gone — and in a top-level value too.
  ...[
    "    category: cover: age\n",
    "    finding: it reads: 0\n",
    "    finding: QA filed it with provenance: pre-existing\n",
    "    finding: ends with:\n",
  ].map((lines) => ["bad-value", findings(`  - id: PC-1\n${lines}`)]),
  ["bad-value", report("reviewed_gate: a: b\nfindings: []\n")],
  // A plain value starts with a letter, a digit or a non-ASCII character: a YAML indicator there
  // (task.240 bug.7), and with it every ASCII mark, is refused.
  ...[
    "`x` is missing",
    "@foo",
    "%x",
    ", x",
    "- x",
    "? x",
    ": x",
    "|x",
    "-1",
    ":x",
    "(optional) x",
  ].map((v) => [
    "bad-value",
    findings(`  - id: PC-1\n    category: coverage\n    finding: ${v}\n`),
  ]),
  // A quoted value: nothing after its closing quote but a comment set off by a space, and in a
  // double-quoted one no escape but `\\` and `\"` (task.240 bug.4: kept literally, `pr\e-existing`
  // read as pre-existing).
  ...[
    '    finding: "a"#c\n',
    '    finding: "a" b\n',
    "    finding: 'a'b\n",
    '    provenance: "pr\\e-existing"\n',
    '    provenance: "pre-exis\\ting"\n',
    '    finding: "a\\/b"\n',
    '    finding: "\\u0041"\n',
  ].map((lines) => [
    "bad-value",
    findings(`  - id: PC-1\n    category: coverage\n${lines}`),
  ]),
  ["bad-value", findings('  - id: PC-1\n    category: "cover\\age"\n')],

  // A character the block may not hold: a tab (task.240 CR-4, bug.9), a carriage return, a no-break
  // or ideographic space, a line or paragraph separator, NEL, a BOM, a control character. The
  // no-break space is the dangerous one: trimmed, `pre-existing` + U+00A0 read as pre-existing and
  // printed a false 0, where YAML keeps it and reads the entry open.
  ...[
    "    category:\tcoverage\n",
    "    category: coverage\t# c\n",
    "    category: coverage\t\n",
    "    category: coverage\n  \t\n",
    "\tcategory: coverage\n",
    "    category: coverage\r\n",
    "    category: coverage\n    provenance: pre-existing\u00a0\n",
    "    category: coverage\n    finding: a\u3000b\n",
    "    category: coverage\n    finding: a\u2028b\n",
    "    category: coverage\n    finding: a\u0085b\n",
    "    category: coverage\n    finding: \ufeffa\n",
    "    category: coverage\n    finding: a\u0000b\n",
    "    category: coverage\n    finding: a\u001bb\n",
  ].map((lines) => ["bad-line", findings(`  - id: PC-1\n${lines}`)]),
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
