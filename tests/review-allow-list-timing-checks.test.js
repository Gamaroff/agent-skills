"use strict";

/**
 * Review: an allow-list that replaces a deny-list covers the whole set, and a wall-clock bound
 * names what it needs (task.312; obs #159, #171).
 *
 * review-task Step 3 states check 32 (found by name, its number derived here and never typed in; a
 * later check may follow it), lists it in the three places that list checks by number or shape, and
 * review-story carries its sibling. create-task § 3.5 and review-task Step 6 check 4 carry ONE
 * timing-statistic sentence, held together here.
 *
 * What this holds is PRESENCE, as its siblings do (tests/review-run-and-parity-checks.test.js): that
 * each rule is stated at its site with its trigger, coverage rule, probe and severity. That a
 * reviewer APPLIES it is a behaviour no CI layer exercises. The one claim that CAN be executed is
 * the probe's own: `uniq in out` writes `out`, which no flag table lists.
 *
 * REVIEW_ALLOW_LIST_ROOT points the test at a copy of the tree, for the mutation proof.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  readFileSync,
  mkdtempSync,
  writeFileSync,
  existsSync,
  rmSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { sectionOf } = require("./lib/markdown-section");

const ROOT = process.env.REVIEW_ALLOW_LIST_ROOT || path.join(__dirname, "..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

const RT = "skills/review-task/SKILL.md";
const RS = "skills/review-story/SKILL.md";
const CT = "skills/create-task/SKILL.md";
const STEP3 = "### Step 3: Technical Accuracy and Anti-Hallucination Review";
const STEP4_STORY =
  "### Step 4: Technical Accuracy and Anti-Hallucination Review";
const NAME =
  "An allow-list replacing a deny-list covers the whole set it gates";
const TIMING =
  /A wall-clock bound names where it is measured and how load is controlled, and on a shared host prefers a paired, interleaved ratio or CPU time \(user \+ sys\) over a ratio of medians \(obs #171\)/;

/** The text of the numbered item `N. **name**` up to the next top-level numbered item. */
function itemByName(lines, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const head = new RegExp(`^(\\d+)\\. \\*\\*${escaped}\\*\\*`);
  const start = lines.findIndex((l) => head.test(l));
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (
      /^\d+\. \*\*/.test(lines[i]) ||
      /^\*\*[A-Z][^*]+\*\*:?$/.test(lines[i].trim())
    ) {
      end = i;
      break;
    }
  }
  return {
    number: Number(lines[start].match(head)[1]),
    text: lines.slice(start, end).join("\n"),
  };
}

const step3 = sectionOf(read(RT), STEP3);
const item = step3 && itemByName(step3, NAME);

test("review-task Step 3 is found, and check 32 is in its list", () => {
  assert.ok(step3, `heading "${STEP3}" not found in ${RT}`);
  assert.ok(item, `check "${NAME}" missing from ${RT} Step 3`);
});

test("check 32 follows check 31, whatever either number becomes", () => {
  const c31 = itemByName(
    step3,
    "A plan's own command is run once, in a safe form",
  );
  assert.ok(c31, "check 31 missing");
  assert.ok(
    item.number > c31.number,
    `check ${item.number} follows ${c31.number}`,
  );
});

test("check 32 states its trigger, coverage rule, operand probe, example and severity", () => {
  const t = item.text;
  assert.match(t, /\(obs #159\)/, "obs id");
  assert.match(
    t,
    /^\s+- Trigger: .*deny-list with an allow-list/m,
    "trigger names the replacement",
  );
  assert.match(t, /^\s+- Coverage: /m, "coverage rule");
  assert.match(t, /every member of the set/, "every member");
  assert.match(
    t,
    /states the member count and\s+the command that measured it/,
    "or the count and its command",
  );
  assert.match(t, /^\s+- Probe: .*write-by-operand/m, "operand probe");
  assert.match(
    t,
    /`uniq in\.txt out\.txt` creates `out\.txt`/,
    "the uniq example",
  );
  assert.match(t, /scratch\s+directory/, "run in a scratch directory");
  assert.match(t, /^\s+- Worked example: .*task\.289/m, "worked example");
  assert.match(t, /\*\*Important\*\*/, "Important severity");
  assert.match(t, /Never auto-fix/, "never auto-fix");
});

test("control: check 32 does not fire on a task that adds an allow-list where none existed", () => {
  assert.match(
    item.text,
    /no deny-list is replaced, so the check does not\s+fire/,
  );
});

test("the three list sites name check 32 by its number", () => {
  const n = item.number;
  const joined = step3.join("\n");
  assert.match(
    joined,
    new RegExp(`^- ❌ .+\\(check ${n}\\)$`, "m"),
    "❌ pattern line",
  );
  assert.match(
    joined,
    new RegExp(`^- \\*\\*Important\\*\\*: .*check ${n} \\(`, "m"),
    "Issues to Flag, Important line",
  );
  assert.match(
    read(RT),
    new RegExp(
      `^\\d+\\. \\*\\*[A-Za-z-]+ Verification\\*\\*: .+\\(Step 3 check ${n}\\)$`,
      "m",
    ),
    "Anti-Hallucination Protocol detection rule",
  );
});

test("review-story carries the sibling check in Step 4 and cites review-task's", () => {
  const step4 = sectionOf(read(RS), STEP4_STORY);
  assert.ok(step4, `heading "${STEP4_STORY}" not found in ${RS}`);
  const sib = itemByName(step4, NAME);
  assert.ok(sib, "sibling check missing from review-story Step 4");
  assert.match(sib.text, /write \*\*by operand\*\*/, "operand probe");
  assert.match(
    sib.text,
    new RegExp(`review-task\` Step 3 check ${item.number}`),
    "cites the review-task check by its number",
  );
  assert.match(sib.text, /\*\*Important\*\*/, "Important severity");
});

test("the probe's own claim holds: `uniq in out` creates `out` (executed in a temp directory)", (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "allow-list-probe-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(path.join(dir, "in.txt"), "a\na\nb\n");
  const r = spawnSync("uniq", ["in.txt", "out.txt"], {
    cwd: dir,
    encoding: "utf8",
  });
  assert.equal(r.status, 0, `uniq exited ${r.status}: ${r.stderr}`);
  assert.ok(
    existsSync(path.join(dir, "out.txt")),
    "uniq wrote its second operand",
  );
  assert.equal(readFileSync(path.join(dir, "out.txt"), "utf8"), "a\nb\n");
});

test("create-task § 3.5 and review-task check 4 carry the same timing-statistic sentence", () => {
  assert.match(read(CT), TIMING, "create-task 3.5 timing bullet");
  const step6 = sectionOf(
    read(RT),
    "### Step 6: Consistency and Completeness Review",
  );
  assert.ok(step6, "review-task Step 6 not found");
  assert.match(
    step6.join("\n"),
    TIMING,
    "review-task Step 6 check 4 wall-clock note",
  );
  assert.match(
    read(CT),
    /\(obs #31\)/,
    "the existing rule it extends is still there",
  );
});

test("the timing sentence carries the measured figures that justify it", () => {
  for (const file of [CT, RT]) {
    const t = read(file);
    assert.match(t, /ratio of medians of 1\.22/, `${file}: ratio of medians`);
    assert.match(
      t,
      /paired-ratio median of 1\.07/,
      `${file}: paired-ratio median`,
    );
    assert.match(t, /CPU time of 1\.016/, `${file}: CPU time`);
  }
});
