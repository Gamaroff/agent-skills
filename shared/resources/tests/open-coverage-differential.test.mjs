/**
 * Differential test for `open-coverage.js` against a real YAML parser (task.240, gate 5 CR-6).
 *
 * The QA loop on task.240 ran five cycles, and every cycle's refute pass hand-picked one more YAML
 * shape on which the reader printed a count YAML disagrees with (bugs 1–5). Hand-picked rows only
 * find what someone thought to write. This suite generates findings blocks from a seeded grammar —
 * dash spacing, key columns, quoting, escapes, comments, wraps, nested values, block scalars, flow
 * entries, anchors, key case — and holds the one property the reader exists for:
 *
 *   the reader prints `unreadable`, or the count PyYAML reads. Never another count.
 *
 * `unreadable` is always allowed: refusing is the fail-closed direction, and it costs a HALT where a
 * wrong count costs a false 0 (or a false 1). A block PyYAML rejects, or whose structure is not a
 * list of maps with a category, has no count, so any count the reader prints for it is wrong.
 *
 * The reference count mirrors the reader's documented value semantics: the category and the
 * provenance are compared case-blind (`category: Coverage` counts — the parity suite pins it), and
 * a missing or null provenance is not `pre-existing`. The reference models no leniency: plain free
 * text holding `: ` is refused, as YAML rejects it (task.238 bug.15's leniency went with the
 * one-line grammar). The suite compares strings, so it does not reach the CLI's UTF-8 decode;
 * tests/open-coverage.test.mjs holds that with byte-level rows (task.240 bug.11).
 *
 * PyYAML is a hard requirement, as it is for tests/skill-frontmatter.test.js; CI installs it. A
 * missing parser fails this suite rather than skipping it, because a skipped differential test
 * reads exactly like a passing one.
 *
 * Deeper runs: OPEN_COVERAGE_DIFF_N=50000 OPEN_COVERAGE_DIFF_SEED=7 node --test <this file>
 * (OPEN_COVERAGE_DIFF_DUMP=<file> writes every disagreement there as JSON).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { countOpenCoverage, CATEGORIES } = createRequire(import.meta.url)(
  path.resolve(__dirname, "..", "open-coverage.js"),
);

const N = Number(process.env.OPEN_COVERAGE_DIFF_N || 4000);
const SEED = Number(process.env.OPEN_COVERAGE_DIFF_SEED || 240);

const report = (yaml) =>
  `# PR Review\n\n## Machine-Readable Findings\n\n\`\`\`yaml\n${yaml}\`\`\`\n\n## Recommended Actions\n\n1. x\n`;

/** mulberry32: a small seeded PRNG, so a failure names a seed and an index that reproduce it. */
function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generator(r) {
  const pick = (a) => a[Math.floor(r() * a.length)];
  const chance = (p) => r() < p;
  const sp = (n) => " ".repeat(Math.max(0, n));

  const WORDS = {
    category: [...CATEGORIES, "coverage", "coverage", "Coverage"],
    provenance: ["pre-existing", "pre-existing", "new", "Pre-Existing"],
    other: [
      "PC-1",
      "a",
      "it's here",
      "PR #12 merged",
      "a, b",
      "bundle:check",
      "§ 3 Scope",
      'use `x|y` — not "z"',
      "a#b",
    ],
  };
  // Characters spliced into a value. The first group is ASCII the block may hold, each a YAML
  // indicator somewhere; the second is what the block may not hold — tab, CR, NEL, NBSP, line and
  // paragraph separators, a BOM, an ideographic space, controls; the third is non-ASCII it may.
  const CHARS = [
    ..."-?:,[]{}#&*!|>'\"%@`~\\ ",
    ..."\t\r\u0085\u00a0\u2028\u2029\ufeff\u3000\u0000\u007f\u001b",
    ..."§—→…é✅\u0301",
  ];
  const ESCAPES = [
    "\\\\",
    '\\"',
    "\\t",
    "\\e",
    "\\x70",
    "\\u0041",
    "\\n",
    "\\/",
  ];

  // Each value is risky with this probability: a shape YAML may reject or read surprisingly.
  // The rest are shapes YAML reads, so the property is tested on counts and not only refusals.
  const RISK = 0.07;
  let risky = false;

  /** A value: the text after `key: ` on the key line, and any deeper lines with their indents. */
  function value(key, col) {
    risky = chance(RISK);
    let w = pick(WORDS[key] || WORDS.other);
    // A character spliced in, or set at the start (task.240 bug.7: an indicator there).
    if (risky && chance(0.5)) {
      const at = chance(0.4) ? 0 : Math.floor(r() * (w.length + 1));
      w = w.slice(0, at) + pick(CHARS) + w.slice(at);
    }
    const form = risky
      ? pick([
          "plain",
          "single",
          "double",
          "escape",
          "colon",
          "openquote",
          "afterquote",
          "anchor",
          "block",
          "wrap",
          "nested",
          "flow",
        ])
      : pick([
          "plain",
          "plain",
          "plain",
          "comment",
          "single",
          "double",
          "escape",
          "empty",
        ]);
    const deeper = (lines) =>
      lines.map((t) => [col + pick([2, 2, 4, 1, 0]), t]);
    switch (form) {
      case "plain":
        return { inline: w, lines: [] };
      case "comment":
        return { inline: `${w} # note`, lines: [] };
      case "single":
        return { inline: `'${w.replace(/'/g, "''")}'`, lines: [] };
      case "double":
        return { inline: `"${w.replace(/["\\]/g, "\\$&")}"`, lines: [] };
      case "escape": {
        const at = Math.floor(r() * (w.length + 1));
        const e = risky ? pick(ESCAPES) : pick(ESCAPES.slice(0, 2));
        const q = w.replace(/["\\]/g, "\\$&");
        return { inline: `"${q.slice(0, at)}${e}${q.slice(at)}"`, lines: [] };
      }
      case "empty":
        return { inline: chance(0.3) ? "# note" : "", lines: [] };
      // `: ` mid-value or at the end, which made task.238 bug.15's leniency.
      case "colon":
        return { inline: pick([`${w}: x`, `${w}:`, `x: ${w}`]), lines: [] };
      case "openquote":
        return { inline: `${pick(['"', "'"])}${w}`, lines: [] };
      case "afterquote":
        return {
          inline: `"${w}"${pick(["#c", " x", "x", " # c", "  "])}`,
          lines: [],
        };
      case "anchor":
        return { inline: pick([`&a ${w}`, `!!str ${w}`, "*a"]), lines: [] };
      // Multi-line shapes the first reader accepted (task.240 bugs 1–6): each is now refused.
      case "block":
        return { inline: pick(["|", ">-"]), lines: deeper([w]) };
      case "wrap":
        return { inline: w, lines: deeper(["more words"]) };
      case "nested":
        return {
          inline: "",
          lines: deeper([pick(["- a.md", "k: v", "word"])]),
        };
      case "flow":
        return { inline: pick([`[${w}]`, `{k: ${w}}`, "[]"]), lines: [] };
    }
  }

  function keyName(k) {
    return chance(0.03) ? k[0].toUpperCase() + k.slice(1) : k;
  }

  // The space after a key's colon — or, rarely, a tab, or none.
  const separator = () =>
    chance(0.02) ? pick(["\t", " \t", ""]) : pick([" ", " ", "  "]);
  // A blank line — or, rarely, one holding a tab, which YAML rejects anywhere (task.240 bug.9).
  const blank = (ind) =>
    chance(0.1)
      ? pick(["\t\n", `${sp(ind)}\t\n`])
      : pick(["\n", `${sp(ind)}\n`]);

  function flowEntry(listIndent) {
    const keys = ["id", "category", ...(chance(0.6) ? ["provenance"] : [])];
    const parts = keys.map((k) => `${k}: ${pick(WORDS[k] || ["PC-1"])}`);
    return `${sp(listIndent)}- {${parts.join(", ")}}\n`;
  }

  function blockEntry(listIndent) {
    const dash = pick([1, 1, 1, 1, 2, 3]);
    const col = listIndent + 1 + dash;
    const pool = ["id", "category", "provenance", "finding", "ref"];
    const keys = [];
    if (chance(0.95)) keys.push("category");
    for (const k of pool) if (k !== "category" && chance(0.45)) keys.push(k);
    if (!keys.length) keys.push("id");
    // Shuffle so category is not always first.
    for (let i = keys.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [keys[i], keys[j]] = [keys[j], keys[i]];
    }
    let out = "";
    keys.forEach((k, i) => {
      const v = value(k, col);
      const head =
        i === 0
          ? `${sp(listIndent)}-${sp(dash)}`
          : sp(chance(0.02) ? pick([col - 1, col + 1, listIndent + 2]) : col);
      out += `${head}${keyName(k)}:${v.inline === "" ? "" : separator() + v.inline}\n`;
      for (const [ind, text] of v.lines) out += `${sp(ind)}${text}\n`;
      if (chance(0.05))
        out += pick([
          `${sp(col)}# a comment\n`,
          `${sp(col + 2)}# deeper comment\n`,
          blank(col),
          `${sp(listIndent)}# c\n`,
        ]);
    });
    return out;
  }

  return function block() {
    const listIndent = pick([0, 2, 2]);
    let out = `reviewed_gate: ${chance(0.03) ? pick(['"open', "& x", "a: b"]) : "none"}\n`;
    out += chance(0.03)
      ? pick(["findings: # c\n", "findings: []\n"])
      : "findings:\n";
    const n = 1 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++)
      out += chance(0.03) ? flowEntry(listIndent) : blockEntry(listIndent);
    if (chance(0.5)) out += "truncated_count: 0\n";
    return out;
  };
}

/** PyYAML's reading of every block, in one process: a count, or null when it has none. */
function yamlCounts(blocks) {
  const script = `
import json, sys, yaml
out = []
for b in json.load(sys.stdin):
    try:
        d = yaml.safe_load(b)
    except Exception:
        out.append(None); continue
    fs = d.get("findings") if isinstance(d, dict) else None
    if fs is None:
        out.append(0 if isinstance(d, dict) and "findings" in d else None); continue
    if not isinstance(fs, list):
        out.append(None); continue
    n = 0
    for e in fs:
        if not isinstance(e, dict) or not isinstance(e.get("category"), str):
            n = None; break
        prov = e.get("provenance")
        prov = "" if prov is None else str(prov)
        if e["category"].lower() == "coverage" and prov.lower() != "pre-existing":
            n += 1
    out.append(n)
json.dump(out, sys.stdout)
`;
  const res = spawnSync("python3", ["-I", "-c", script], {
    input: JSON.stringify(blocks),
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  assert.equal(
    res.status,
    0,
    `python3 with PyYAML is required for this suite (CI installs it): ${res.error?.message || res.stderr}`,
  );
  return JSON.parse(res.stdout);
}

test(`the reader prints unreadable or YAML's count — never another (seed ${SEED}, ${N} blocks)`, () => {
  // The floors below are shares of N, so a tiny N would pass them on nothing (gate 6 CR-5).
  assert.ok(
    N >= 1000,
    `OPEN_COVERAGE_DIFF_N=${N} is too small to test anything (minimum 1000)`,
  );
  const block = generator(prng(SEED));
  const blocks = Array.from({ length: N }, block);
  const expected = yamlCounts(blocks);
  assert.equal(expected.length, N, "PyYAML returned one reading per block");

  const tally = {
    counted: 0,
    open: 0,
    closed: 0,
    refused: 0,
    yamlRejects: 0,
    overRefused: 0,
  };
  const wrong = [];
  blocks.forEach((b, i) => {
    const got = countOpenCoverage(report(b));
    if (expected[i] === null) tally.yamlRejects++;
    if (got.unreadable) {
      tally.refused++;
      if (expected[i] !== null) tally.overRefused++; // allowed; reported for tuning only
      return;
    }
    tally.counted++;
    if (got.count > 0) tally.open++;
    else tally.closed++;
    if (got.count !== expected[i])
      wrong.push({ index: i, reader: got.count, yaml: expected[i], block: b });
  });

  if (process.env.OPEN_COVERAGE_DIFF_DUMP)
    writeFileSync(
      process.env.OPEN_COVERAGE_DIFF_DUMP,
      JSON.stringify(wrong, null, 1),
    );
  assert.deepEqual(
    wrong.slice(0, 5),
    [],
    `${wrong.length} block(s) read a count YAML disagrees with (seed ${SEED}); first shown`,
  );

  // Non-vacuity: a generator that produced only refusals, or only one answer, would pass the
  // property above while testing nothing. Each floor sits about half what every seed measured
  // produces (seeds 1, 2, 3, 7, 11, 42 and 240 at 25,000 blocks: counted ~30%, open ~14%, 0 ~16%,
  // refused ~70%, YAML-rejected ~51%). `overRefused` — valid YAML the reader refuses, ~19% — has no
  // floor: refusing is allowed, and the tracked-corpus suite is what holds the reader to the shapes
  // writers emit.
  const floor = (name, share) =>
    assert.ok(
      tally[name] >= N * share,
      `too few ${name} (floor ${share * 100}%): ${JSON.stringify(tally)}`,
    );
  floor("counted", 0.15);
  floor("open", 0.07);
  floor("closed", 0.07);
  floor("refused", 0.35);
  floor("yamlRejects", 0.25);
});
