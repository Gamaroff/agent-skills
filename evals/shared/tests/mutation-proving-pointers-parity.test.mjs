/**
 * Parity guard — no pointer to `mutation-proving.md` states a COUNT of the
 * document's contents, and the document's own count-bearing heading agrees with
 * its body.
 *
 * task.114, observation #18. `skills/develop/SKILL.md`, `skills/qa-story/SKILL.md`
 * and `skills/qa-task/SKILL.md` each pointed at `mutation-proving.md` as "the
 * **four** shapes vacuity takes" while the document was titled "The **six**
 * shapes". Three independent cross-references, stale by two — and the cost was
 * measured: a session read the pointer, never opened the target, and wrote "four
 * vacuity shapes" into a gate file, three QA reports, a DoD verification, a
 * sprint-review summary, two PR comments and two commit messages, all merged.
 *
 * A pointer that summarises its target's contents is a claim nothing keeps true,
 * and it fails in the direction of confidence: a reader who trusts it never opens
 * the target, which is exactly what the pointer is for. The document also says of
 * itself that the count is EXPECTED to change ("a seventh in a shape none of its
 * rules models will pass"), so an untested count in another file is a guaranteed
 * future defect rather than a possible one.
 *
 * Two assertions, both driven from the tree rather than from a list restated
 * here:
 *
 *   1. Every source file that references `mutation-proving.md` — skill bodies and
 *      shared resources, NOT the bundled copies of the document itself — carries
 *      no count word beside the word "shapes" within a window of the reference.
 *   2. The document's "## The N shapes vacuity takes" heading names the same N as
 *      the number of bold-numbered shape entries in that section. The document
 *      may describe itself with a count; it must not lie about it.
 *
 * Non-vacuity floors on both: the pointer scan must find at least the three
 * consumers that carried the defect, and the heading scan must find a heading.
 * A scan that finds nothing reports `scan-broken`-shaped failure, not a clean
 * zero — the reassuring reading is the one nobody questions.
 *
 * Mutation-proved at authoring by restoring "the four shapes" in one consumer
 * (assertion 1 red, names the file and line) and by changing the heading to
 * "six" with seven entries (assertion 2 red); and at QA cycle 1 by the two
 * spellings the per-line version missed — `the **four** shapes` and a hard wrap
 * between `four` and `shapes` — both red after CR-1. QA cycle 2 added: two
 * overlapping windows with a "four of five" decoy above (one report, right line)
 * and an authored skill reference carrying a count (scan widened).
 *
 * Run via: node --test evals/shared/tests/mutation-proving-pointers-parity.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const DOC = path.join(REPO_ROOT, "shared", "resources", "mutation-proving.md");

/** Sources that may point at the document: every skill body, every authored
 *  skill reference (e.g. `double-check/references/gate-playbooks.md` points at
 *  it — cycle 2, CR-4), and every shared resource. Only files NAMED
 *  `mutation-proving.md` are excluded: those are the document itself — the
 *  source and its six bundled copies — and the copies are covered by the
 *  byte-for-byte bundled-parity guard, not by this one. Bundled copies of OTHER
 *  shared resources are scanned too; they are identical to their sources, so a
 *  hit there is the same hit twice, never a missed one. */
function sourceFiles() {
  const out = [];
  const skills = path.join(REPO_ROOT, "skills");
  for (const name of readdirSync(skills)) {
    const skill = path.join(skills, name, "SKILL.md");
    try {
      if (statSync(skill).isFile()) out.push(skill);
    } catch {
      /* not a skill dir */
    }
    const refs = path.join(skills, name, "references");
    try {
      for (const ref of readdirSync(refs)) {
        if (ref.endsWith(".md") && ref !== "mutation-proving.md") {
          out.push(path.join(refs, ref));
        }
      }
    } catch {
      /* no references dir */
    }
  }
  const shared = path.join(REPO_ROOT, "shared", "resources");
  for (const name of readdirSync(shared)) {
    if (name.endsWith(".md") && name !== "mutation-proving.md") {
      out.push(path.join(shared, name));
    }
  }
  return out;
}

const COUNT_WORD =
  "(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\\d+)";
/** A count word immediately qualifying "shapes" — "the four shapes", "six shapes".
 *  Applied to the WINDOW joined into one line with Markdown emphasis stripped, never
 *  to a single physical line: this repo hard-wraps prose at ~90 columns and puts
 *  emphasis on the load-bearing word, so `the **four** shapes` and `four` / newline /
 *  `shapes` are the spellings the defect actually takes (task.114 QA cycle 1, CR-1). */
const COUNTED_SHAPES = new RegExp(`\\b${COUNT_WORD}\\s+shapes\\b`, "gi");
/** Markdown emphasis and code-span markers, removed before matching so `**four**`
 *  reads as `four`. Only the markers go; the words between them stay. */
const EMPHASIS = /[*_`]+/g;
/** Join a window's lines into one string the regex can see across a wrap, and
 *  return the offset at which each physical line begins in that string, so a
 *  match position maps back to the line it sits on (cycle 2, CR-2 — locating by
 *  re-searching for the bare count word picked "four of five" one line up). */
function flatten(lines) {
  const stripped = lines.map((l) => l.replace(EMPHASIS, ""));
  const starts = [];
  let pos = 0;
  for (const l of stripped) {
    starts.push(pos);
    pos += l.length + 1; // the joining space
  }
  return { text: stripped.join(" "), starts };
}
/** The index of the physical line that contains offset `at` of the joined text. */
function lineAt(starts, at) {
  let idx = 0;
  for (let k = 0; k < starts.length; k++) if (starts[k] <= at) idx = k;
  return idx;
}
const POINTER = /mutation-proving\.md/;
/** Lines on either side of a pointer that count as "beside" it. The three
 *  historical defects sat 0–1 lines from the link; 3 is generous without
 *  reaching into unrelated prose. */
const WINDOW = 3;

/** Minimum pointer-carrying files. The three consumers that carried the defect
 *  plus the authored references found when the scan was widened (CR-4) are the
 *  floor; below it the scan is not reading the tree it thinks it is. */
const MIN_POINTER_FILES = 4;

test("no source pointer to mutation-proving.md states a count of its shapes", () => {
  const files = sourceFiles();
  const withPointer = [];
  const violations = [];
  for (const file of files) {
    const lines = readFileSync(file, "utf8").split("\n");
    const pointerLines = [];
    lines.forEach((l, i) => {
      if (POINTER.test(l)) pointerLines.push(i);
    });
    if (pointerLines.length === 0) continue;
    withPointer.push(file);
    // One window per pointer, matched on the joined, emphasis-stripped text so a
    // count word split from "shapes" by a hard wrap, or wrapped in `**`, is still
    // seen (CR-1). Every match in the window is reported, not only the first
    // (CR-6). The physical line comes from the match OFFSET mapped back through
    // the line starts — pointer-independent, so two overlapping windows key the
    // same hit identically and it is reported once (CR-2).
    const seen = new Set();
    for (const i of pointerLines) {
      const lo = Math.max(0, i - WINDOW);
      const hi = Math.min(lines.length - 1, i + WINDOW);
      const { text, starts } = flatten(lines.slice(lo, hi + 1));
      for (const m of text.matchAll(COUNTED_SHAPES)) {
        const at = lo + lineAt(starts, m.index);
        const key = `${path.relative(REPO_ROOT, file)}:${at + 1}: "${m[0]}"`;
        if (seen.has(key)) continue;
        seen.add(key);
        violations.push(`${key} beside the pointer at line ${i + 1}`);
      }
    }
  }
  assert.ok(
    withPointer.length >= MIN_POINTER_FILES,
    `scan-broken: expected ≥${MIN_POINTER_FILES} source files pointing at mutation-proving.md, found ${withPointer.length} — the pointer scan is not reading the tree`,
  );
  assert.deepEqual(
    violations,
    [],
    `A pointer must name its target, not summarise its contents — drop the count or test it here:\n  ${violations.join("\n  ")}`,
  );
});

const WORD_TO_N = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

test("the document's counted heading agrees with the entries under it", () => {
  const text = readFileSync(DOC, "utf8");
  const heading = text.match(/^## The (\w+) shapes vacuity takes[ \t]*$/m);
  assert.ok(
    heading,
    "scan-broken: no '## The <N> shapes vacuity takes' heading found",
  );
  const word = heading[1].toLowerCase();
  const claimed = WORD_TO_N[word] ?? Number.parseInt(word, 10);
  assert.ok(
    Number.isInteger(claimed) && claimed > 0,
    `unreadable count word "${heading[1]}"`,
  );

  // The section runs from the heading to the next H2. `heading.index` is where the
  // match sits; re-searching with indexOf would find the same place only by luck (CR-3).
  const start = heading.index + heading[0].length;
  const rest = text.slice(start);
  const nextH2 = rest.search(/^## /m);
  const section = nextH2 === -1 ? rest : rest.slice(0, nextH2);
  const entries = section.match(/^\*\*\d+\.\s/gm) ?? [];
  assert.ok(
    entries.length > 0,
    "scan-broken: no bold-numbered shape entries found under the heading",
  );
  assert.equal(
    entries.length,
    claimed,
    `heading says ${claimed} shapes, section lists ${entries.length} — the document is describing itself with a stale count`,
  );
  // The entries are numbered 1..N in order, so a renumbering slip is caught too.
  entries.forEach((e, i) => {
    assert.equal(
      Number.parseInt(e.slice(2), 10),
      i + 1,
      `shape entries out of order at "${e.trim()}"`,
    );
  });
});
