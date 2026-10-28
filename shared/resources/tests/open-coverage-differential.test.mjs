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
 * a missing or null provenance is not `pre-existing`. One documented leniency is modelled too: a
 * block-style free-text value (any key but `category`/`provenance`) written plain with a `: ` in it
 * is read to the end of its line, as task.238 bug.15 pins, because review-pr writes plain
 * sentences. YAML rejects that line; the reference quotes it first (`lenientFreeText`) so PyYAML
 * reads what the reader is documented to read.
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
    other: ["PC-1", "a", "it's here", "see #12", "a, b", "plain text"],
  };
  const ESCAPES = ["\\t", "\\e", '\\"', "\\\\", "\\x70", "\\u0041", "\\n"];

  // Each value is risky with this probability: a shape YAML may reject or read surprisingly.
  // The rest are shapes YAML reads, so the property is tested on counts and not only refusals.
  const RISK = 0.2;
  let risky = false;
  // Lines deeper than the key column — or, when risky, level with it or short of it.
  const deeperIndent = (col) =>
    col + (risky ? pick([2, 4, 1, 0, -1]) : pick([2, 2, 4]));
  const nestedItem = () =>
    risky
      ? pick([
          '- "quoted"',
          "- 'quoted'",
          '- "open',
          "- [x, y]",
          "- {k: v}",
          '- &a "open',
          "- - b",
          "plain",
          "plain # c",
          "# c",
          "x: y",
        ])
      : pick(["- a.md", "- it's fine", "- k: v", "- see #12"]);

  /** A value: the text after `key: ` on the key line, and any deeper lines with their indents. */
  function value(key, col) {
    risky = chance(RISK);
    const words = WORDS[key] || WORDS.other;
    const w = risky && chance(0.3) ? "x: y" : pick(words);
    const form = risky
      ? pick([
          "escape",
          "empty",
          "block",
          "wrap",
          "wrapquoted",
          "openquote",
          "anchor",
          "hashnospace",
          "indicator",
        ])
      : pick([
          "plain",
          "plain",
          "plain",
          "comment",
          "single",
          "double",
          "empty",
          "block",
          "wrap",
        ]);
    // One indent for the value's lines — or, when risky, a fresh one per line.
    const lineIndent = deeperIndent(col);
    const deeper = (lines) =>
      lines.map((t) => [risky ? deeperIndent(col) : lineIndent, t]);
    switch (form) {
      case "plain":
        return { inline: w, lines: [] };
      case "comment":
        return { inline: `${w} # note`, lines: [] };
      case "hashnospace":
        return { inline: `${w}#note`, lines: [] };
      case "single":
        return { inline: `'${w.replace(/'/g, "''")}'`, lines: [] };
      case "double":
        return { inline: `"${w}"`, lines: [] };
      case "escape": {
        const at = Math.floor(r() * (w.length + 1));
        return {
          inline: `"${w.slice(0, at)}${pick(ESCAPES)}${w.slice(at)}"`,
          lines: [],
        };
      }
      case "empty":
        return {
          inline: chance(0.2) ? "# note" : "",
          lines: deeper(
            Array.from({ length: 1 + Math.floor(r() * 2) }, nestedItem),
          ),
        };
      case "block":
        return {
          inline: pick(["|", ">", "|-", ">-"]),
          lines: deeper([
            pick([w, "key: value", '"quote', "- item", "# not a comment"]),
          ]),
        };
      case "wrap":
        // One to three wrapped lines; when risky, a comment may cut the value between them
        // (task.240 bug.6).
        return {
          inline: w,
          lines: deeper(
            Array.from({ length: 1 + Math.floor(r() * 3) }, () =>
              risky
                ? pick(["k: v", '"q', "# c", "more # c", "more"])
                : pick(["more words", "it's"]),
            ),
          ),
        };
      case "wrapquoted":
        return {
          inline: `"${w}`,
          lines: deeper([
            pick(['more"', 'more" # c', 'more" x', "more", "k: v"]),
          ]),
        };
      case "openquote":
        return { inline: `${pick(['"', "'"])}${w}`, lines: [] };
      case "anchor":
        return { inline: pick([`&a ${w}`, `!!str ${w}`, "*a"]), lines: [] };
      // A YAML indicator, or a `,` YAML reserves, at the start of a plain value (task.240 bug.7).
      case "indicator":
        return {
          inline: pick([
            "`x` y",
            "@foo",
            "%x",
            ", x",
            "- x",
            "? x",
            ": x",
            "|x",
          ]),
          lines: [],
        };
    }
  }

  function keyName(k) {
    return chance(0.04) ? k[0].toUpperCase() + k.slice(1) : k;
  }

  // The space after a key's colon — or, rarely, a tab, which YAML rejects there.
  const separator = () => (chance(0.03) ? pick(["\t", " \t"]) : " ");
  // A whitespace-only line — or, rarely, one holding a tab, which YAML rejects anywhere.
  const blank = (ind) =>
    chance(0.1)
      ? pick(["\t\n", `${sp(ind)}\t\n`])
      : pick(["\n", `${sp(ind)}\n`]);

  function flowEntry(listIndent) {
    const keys = ["id", "category", ...(chance(0.6) ? ["provenance"] : [])];
    const parts = keys.map((k) => {
      const words = WORDS[k] || WORDS.other;
      const w = pick(words).replace(/[,{}#]/g, "");
      risky = chance(RISK);
      const v = risky
        ? pick([`"${w}\\t"`, "x: y", `${w} # c`, `'${w}`, `${w}]`, `a[${w}`])
        : pick([w, w, `"${w}"`, `'${w.replace(/'/g, "''")}'`]);
      return `${keyName(k)}:${risky && chance(0.5) ? "" : separator()}${v}`;
    });
    return `${sp(listIndent)}-${pick([" ", " ", "  "])}{${parts.join(pick([", ", ","]))}}\n`;
  }

  function blockEntry(listIndent) {
    const dash = pick([1, 1, 1, 1, 2, 3]);
    const col = listIndent + 1 + dash;
    const pool = ["id", "category", "provenance", "finding", "evidence"];
    const keys = [];
    if (chance(0.92)) keys.push("category");
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
          : sp(chance(0.03) ? pick([col - 1, col + 1, listIndent + 2]) : col);
      out += `${head}${keyName(k)}:${v.inline === "" ? "" : separator() + v.inline}\n`;
      for (const [ind, text] of v.lines) {
        out += `${sp(ind)}${text}\n`;
        if (chance(0.03)) out += blank(ind);
      }
      if (chance(0.05))
        out += pick([
          `${sp(col)}# a comment\n`,
          blank(col),
          `${sp(listIndent)}# c\n`,
        ]);
    });
    return out;
  }

  return function block() {
    const listIndent = pick([0, 2, 2]);
    let out = "reviewed_gate: none\nfindings:\n";
    const n = 1 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++)
      out += chance(0.15) ? flowEntry(listIndent) : blockEntry(listIndent);
    if (chance(0.5)) out += "truncated_count: 0\n";
    return out;
  };
}

/**
 * The block as YAML would need it written for the reader's one leniency: a plain free-text value
 * holding `: ` single-quoted, its trailing comment kept. Nothing else changes.
 */
function lenientFreeText(block) {
  return block
    .split("\n")
    .map((line) => {
      const m = line.match(
        /^([ \t]*(?:-[ \t]+)?)([A-Za-z0-9_-]+):([ \t]+)(.*)$/,
      );
      if (!m || m[2] === "category" || m[2] === "provenance") return line;
      const [, head, key, gap, v] = m;
      if (/^["'[{|>&*!%@`#]/.test(v)) return line;
      const hash = v.search(/[ \t]#/);
      const body = hash < 0 ? v : v.slice(0, hash);
      const comment = hash < 0 ? "" : v.slice(hash);
      if (!/:(?:[ \t]|$)/.test(body)) return line;
      return `${head}${key}:${gap}'${body.replace(/'/g, "''")}'${comment}`;
    })
    .join("\n");
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
  const expected = yamlCounts(blocks.map(lenientFreeText));
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
  // property above while testing nothing. Each floor sits well under what every seed measured
  // produces (seeds 1-9 and 240 at 25,000 blocks: counted ~16%, open ~6%, 0 ~9%, refused ~84%,
  // YAML-rejected ~63%). `overRefused` — valid YAML the reader refuses — has no floor: refusing is
  // allowed, and the tracked-corpus suite is what holds the reader to the shapes writers emit.
  const floor = (name, share) =>
    assert.ok(
      tally[name] >= N * share,
      `too few ${name} (floor ${share * 100}%): ${JSON.stringify(tally)}`,
    );
  floor("counted", 0.1);
  floor("open", 0.03);
  floor("closed", 0.03);
  floor("refused", 0.1);
  floor("yamlRejects", 0.1);
});
