"use strict";
/**
 * The QA cycle derivation — the shell that turns the newest gate filename into the
 * `-N` suffix on `qa-gate-N` / `qa-fix-N` (task.121).
 *
 * The suffix keys the tracker comment's idempotency marker, so a wrong value is
 * not a cosmetic slip: an empty one makes `qa-gate-`, which neither CLI accepts
 * (exit 2, nothing posts), and a path-valued one makes `qa-gate-/abs/path`, the
 * same. Both are reached from ordinary directory states — no gate yet, or a
 * gate named without a number — and both must land on the documented fallback
 * of `1`. TASK-121-BUG-1 was the second case: `sed -E` without `-n … p` echoes
 * its input on a non-match, so the fallback was unreachable exactly there.
 *
 * These tests run the SHIPPED lines, extracted from each SKILL.md, not a retyped
 * copy: a copy would prove the copy. Each site derives from its own directory
 * variable and glob, so the three are exercised separately rather than assumed
 * equivalent.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const REPO_ROOT = path.resolve(__dirname, "..");

/** Each site: the SKILL.md, the variable it derives, the dir variable it reads, and the gate stem. */
const SITES = [
  {
    file: "skills/qa-task/SKILL.md",
    out: "QA_CYCLE",
    dir: "TASK_DIR",
    stem: "task.121",
  },
  {
    file: "skills/qa-story/SKILL.md",
    out: "QA_CYCLE",
    dir: "STORY_DIR",
    stem: "story.7.3",
  },
  {
    file: "skills/qa-fix/SKILL.md",
    out: "FIX_CYCLE",
    dir: "DOC_DIR",
    stem: "task.121",
  },
];

/**
 * Pull the derivation out of the shipped prose: from the `VAR=$(ls -t "$DIR"`
 * line through the `VAR=${VAR:-1}` fallback, comment lines dropped. Exactly one
 * such span per file — two would mean the derivation was duplicated, which is the
 * drift the "derive once, above both calls" rule exists to prevent.
 */
function extractDerivation({ file, out, dir }) {
  const lines = fs.readFileSync(path.join(REPO_ROOT, file), "utf8").split("\n");
  const start = lines.findIndex((l) =>
    l.startsWith(`${out}=$(ls -t "$${dir}"`),
  );
  assert.notEqual(start, -1, `${file}: no \`${out}=$(ls -t "$${dir}"\` line`);
  const end = lines.findIndex(
    (l, i) => i > start && l.startsWith(`${out}=\${${out}:-1}`),
  );
  assert.notEqual(
    end,
    -1,
    `${file}: no \`${out}=\${${out}:-1}\` fallback after line ${start + 1}`,
  );
  const again = lines.findIndex(
    (l, i) => i > end && l.startsWith(`${out}=$(ls -t "$${dir}"`),
  );
  assert.equal(
    again,
    -1,
    `${file}: the derivation appears twice (second at line ${again + 1})`,
  );
  return lines
    .slice(start, end + 1)
    .filter((l) => !l.trim().startsWith("#"))
    .join("\n");
}

function runDerivation(site, fixtureDir) {
  const script = `${site.dir}=${JSON.stringify(fixtureDir)}\n${extractDerivation(site)}\nprintf '%s' "$${site.out}"`;
  return execFileSync("bash", ["-c", script], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qa-cycle-"));
  let t = Date.now() - 60_000;
  for (const name of files) {
    const p = path.join(dir, name);
    fs.writeFileSync(p, "");
    // Strictly increasing mtimes in list order, so `ls -t` is deterministic and
    // the LAST file listed is the newest — the one the skill just wrote.
    t += 1000;
    fs.utimesSync(p, new Date(t), new Date(t));
  }
  return dir;
}

for (const site of SITES) {
  test(`${site.file}: the newest gate's number is the cycle`, () => {
    const dir = fixture([
      `${site.stem}.gate.1.first.yml`,
      `${site.stem}.gate.10.tenth.yml`,
      `${site.stem}.gate.2.second.yml`,
    ]);
    // gate.2 is the newest by mtime; a lexical or numeric-max reading would say 10.
    assert.equal(runDerivation(site, dir), "2");
  });

  test(`${site.file}: no gate at all falls back to 1`, () => {
    assert.equal(runDerivation(site, fixture([])), "1");
  });

  test(`${site.file}: a gate named without a number falls back to 1, not to its path (TASK-121-BUG-1)`, () => {
    const dir = fixture([`${site.stem}.gate.legacy-unnumbered.yml`]);
    const got = runDerivation(site, dir);
    assert.equal(
      got,
      "1",
      `derivation echoed ${JSON.stringify(got)} — the stage would be qa-gate-${got}`,
    );
  });
}

test("the derivation is the same shape at all three sites (mutation-provable)", () => {
  // The extracted bodies differ only by variable name and gate stem. Normalise
  // those and assert equality, so a fix applied at one site and not the others
  // — the exact shape of BUG-1's origin — fails here before a QA cycle finds it.
  const norm = (site) =>
    extractDerivation(site)
      .replaceAll(site.out, "OUT")
      .replaceAll(`$${site.dir}`, "$DIR")
      .replace(/"\/(task|story)\.\*\.gate/, '"/*.gate');
  const [a, b, c] = SITES.map(norm);
  assert.equal(a, b, "qa-task and qa-story derivations differ");
  assert.equal(a, c, "qa-task and qa-fix derivations differ");
});
