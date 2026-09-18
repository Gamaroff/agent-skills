"use strict";
/**
 * The QA cycle — `shared/resources/qa-cycle.sh` — and the rule that every fenced
 * block which uses it derives it (task.121, TASK-121-BUG-2).
 *
 * The cycle is the `-N` suffix on the cycle-scoped tracker-comment stages
 * (`qa-gate-N`, `qa-fix-N`), and that suffix keys each comment's idempotency
 * marker. Two things therefore have to hold and are tested here:
 *
 *   1. The helper never GUESSES. A directory with no numbered gate yields empty
 *      stdout, one warning line on stderr and exit 1 — never `1`. A guessed `1`
 *      would key every cycle to cycle 1's marker, so cycle 2 onward would read
 *      `already` and post nothing: the bare-stage suppression task.121 removed,
 *      wearing a suffix. The earlier `${VAR:-1}` fallback did exactly that and
 *      its test pinned it as correct.
 *
 *   2. Every fenced block that passes a cycle-scoped stage derives the cycle
 *      itself, by calling the helper. A skill's blocks run as separate shells,
 *      so a value derived in one block does not exist in the next; the cycle-1
 *      shape (derive above the lead, read at the tracker call, two blocks
 *      later) posted nothing when executed as written.
 *
 * The helper is run under `bash` AND `zsh` (when zsh is available) because the
 * Bash tool on the machines that execute this prose is zsh, whose unmatched-glob
 * behaviour differs from bash's; the `bash references/qa-cycle.sh` invocation is
 * what makes that difference not matter, and this is where that claim is tested.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const REPO_ROOT = path.resolve(__dirname, "..");
const HELPER = path.join(REPO_ROOT, "shared", "resources", "qa-cycle.sh");

function zshAvailable() {
  return spawnSync("zsh", ["-c", "true"], { stdio: "ignore" }).status === 0;
}
const SHELLS = ["bash", ...(zshAvailable() ? ["zsh"] : [])];

/** Invoke the helper the way a call site does — `bash references/qa-cycle.sh "$DIR"` — from `shell`. */
function run(shell, dir) {
  const r = spawnSync(
    shell,
    ["-c", `bash ${JSON.stringify(HELPER)} ${JSON.stringify(dir)}`],
    { encoding: "utf8" },
  );
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qa-cycle-"));
  // Identical mtimes on purpose: a fresh checkout looks like this, and the
  // helper must not depend on mtime order to pick the current gate.
  const t = new Date("2026-01-01T00:00:00Z");
  for (const name of files) {
    const p = path.join(dir, name);
    fs.writeFileSync(p, "");
    fs.utimesSync(p, t, t);
  }
  return dir;
}

for (const shell of SHELLS) {
  test(`[${shell}] the highest-numbered gate is the cycle, regardless of mtime or lexical order`, () => {
    const dir = fixture([
      "task.121.gate.1.first.yml",
      "task.121.gate.2.second.yml",
      "task.121.gate.10.tenth.yml",
    ]);
    const r = run(shell, dir);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, "10\n");
    assert.equal(r.stderr, "");
  });

  test(`[${shell}] story gates are read the same way`, () => {
    const dir = fixture(["story.7.3.gate.3.x.yml", "story.7.3.gate.1.x.yml"]);
    assert.equal(run(shell, dir).stdout, "3\n");
  });

  test(`[${shell}] no gate at all → refuse: empty stdout, one warning, exit 1`, () => {
    const r = run(shell, fixture([]));
    assert.equal(r.status, 1);
    assert.equal(r.stdout, "");
    assert.match(r.stderr, /no gate file/);
    assert.equal(r.stderr.trim().split("\n").length, 1);
  });

  test(`[${shell}] only un-numbered gates → refuse, never guess 1 (TASK-121-BUG-2)`, () => {
    const r = run(shell, fixture(["task.121.gate.legacy-unnumbered.yml"]));
    assert.equal(r.status, 1);
    assert.equal(
      r.stdout,
      "",
      `helper guessed ${JSON.stringify(r.stdout.trim())}`,
    );
    assert.match(r.stderr, /carry no cycle number/);
  });

  test(`[${shell}] an un-numbered gate beside numbered ones is ignored, not fatal`, () => {
    const dir = fixture(["task.121.gate.legacy.yml", "task.121.gate.2.b.yml"]);
    const r = run(shell, dir);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, "2\n");
  });

  test(`[${shell}] a missing directory → exit 1, empty stdout`, () => {
    const r = run(shell, path.join(os.tmpdir(), "qa-cycle-does-not-exist"));
    assert.equal(r.status, 1);
    assert.equal(r.stdout, "");
  });
}

// ── Same-block guard ──────────────────────────────────────────────────────────
// A block that passes a cycle-scoped stage must derive the cycle in that block.

const SKILLS = [
  "skills/qa-task/SKILL.md",
  "skills/qa-story/SKILL.md",
  "skills/qa-fix/SKILL.md",
];
const USES_CYCLE = /--stage "qa-(?:gate|fix)-\$\{(?:QA|FIX)_CYCLE\}"/;
const DERIVES_CYCLE =
  /^\s*(?:QA|FIX)_CYCLE=\$\(bash references\/qa-cycle\.sh /m;
const INLINE_DERIVATION = /\| *sed -n?E? 's\/\.\*\\\.gate\\\./;

function fencedBlocks(file) {
  const lines = fs.readFileSync(path.join(REPO_ROOT, file), "utf8").split("\n");
  const blocks = [];
  let open = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (open === null) {
      if (/^\s*```bash\b/.test(l)) open = { start: i + 1, lines: [] };
    } else if (/^\s*```\s*$/.test(l)) {
      blocks.push({ start: open.start, text: open.lines.join("\n") });
      open = null;
    } else {
      open.lines.push(l);
    }
  }
  return blocks;
}

test("every fenced block that passes a cycle-scoped stage derives the cycle in that block", () => {
  const offenders = [];
  let using = 0;
  for (const file of SKILLS) {
    for (const b of fencedBlocks(file)) {
      if (!USES_CYCLE.test(b.text)) continue;
      using += 1;
      if (!DERIVES_CYCLE.test(b.text)) {
        offenders.push(
          `${file}: block at line ${b.start} uses the cycle but does not call references/qa-cycle.sh`,
        );
      }
    }
  }
  // Non-vacuity: two blocks per skill (the pull-request lead and the tracker
  // comment) — six in all. A count below that means the collector stopped
  // seeing the sites, not that the skills stopped commenting.
  assert.ok(
    using >= 6,
    `only ${using} blocks pass a cycle-scoped stage — expected ≥ 6`,
  );
  assert.deepEqual(offenders, []);
});

test("no shipped skill carries an inline gate-number derivation any more", () => {
  // One definition, in the helper. An inline `| sed … \.gate\.` copy is a second
  // definition, and two definitions of "which gate is current" drift.
  const hits = [];
  for (const file of SKILLS) {
    const lines = fs
      .readFileSync(path.join(REPO_ROOT, file), "utf8")
      .split("\n");
    lines.forEach((l, i) => {
      if (INLINE_DERIVATION.test(l)) hits.push(`${file}:${i + 1}`);
    });
  }
  assert.deepEqual(hits, []);
});

test("the helper is bundled into every skill whose prose calls it", () => {
  // `bash references/qa-cycle.sh` in a SKILL.md is a promise that the bundled
  // copy exists beside it; a consumer installs the skill directory verbatim.
  const missing = SKILLS.map((f) =>
    path.join(path.dirname(f), "references", "qa-cycle.sh"),
  ).filter((p) => !fs.existsSync(path.join(REPO_ROOT, p)));
  assert.deepEqual(missing, []);
});
