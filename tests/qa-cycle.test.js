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
const { test, after } = require("node:test");
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

const FIXTURE_DIRS = [];
after(() => {
  for (const d of FIXTURE_DIRS) fs.rmSync(d, { recursive: true, force: true });
});

function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qa-cycle-"));
  FIXTURE_DIRS.push(dir);
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

  test(`[${shell}] a run of more than 9 digits is a malformed name, never a wrong lower cycle`, () => {
    // `[ -gt ]` is a 64-bit test; on a longer run it prints "integer expected"
    // and skips the comparison, so before the bound the helper exited 0 with
    // the LOWER number — a wrong cycle rather than a refusal (cycle-3 CR-3).
    const alone = run(
      shell,
      fixture(["task.121.gate.99999999999999999999.x.yml"]),
    );
    assert.equal(alone.status, 1);
    assert.equal(alone.stdout, "");
    const beside = run(
      shell,
      fixture([
        "task.121.gate.2.a.yml",
        "task.121.gate.99999999999999999999.x.yml",
      ]),
    );
    assert.equal(beside.status, 0, beside.stderr);
    assert.equal(beside.stdout, "2\n");
    assert.equal(
      beside.stderr,
      "",
      "a malformed sibling must not print 'integer expected'",
    );
  });

  test(`[${shell}] a filename with an embedded newline is un-numbered — never a lower, wrong cycle`, () => {
    // sed emits one line per input line, so the extracted value carried a
    // newline into `$((10#$n))`, which aborted the loop; the script then
    // printed the lower cycle it had seen and exited 0 (finalise DoD security
    // probe, task.121). Refuse alone; ignore beside real gates, with the
    // HIGHEST real gate still winning and nothing on stderr.
    const alone = run(shell, fixture(["x.gate.5.y\nz.gate.9.w.yml"]));
    assert.equal(alone.status, 1);
    assert.equal(alone.stdout, "");
    const beside = run(
      shell,
      fixture([
        "task.121.gate.3.a.yml",
        "x.gate.5.y\nz.gate.9.w.yml",
        "task.121.gate.12.b.yml",
      ]),
    );
    assert.equal(beside.status, 0, beside.stderr);
    assert.equal(beside.stdout, "12\n");
    assert.equal(beside.stderr, "", "no arithmetic error may leak");
  });

  test(`[${shell}] leading zeros are normalised — gate.007 is cycle 7`, () => {
    assert.equal(
      run(shell, fixture(["task.121.gate.007.x.yml", "task.121.gate.2.y.yml"]))
        .stdout,
      "7\n",
    );
  });

  test(`[${shell}] gate.0 (or gate.000) is not a cycle — refused alone, ignored beside a real one`, () => {
    // The `cycle` slot is positive-integer only and `qa-gate-0` names no round,
    // so a zero must never become the current gate (cycle-4 CR-5).
    const alone = run(shell, fixture(["task.121.gate.0.x.yml"]));
    assert.equal(alone.status, 1);
    assert.equal(alone.stdout, "");
    const beside = run(
      shell,
      fixture(["task.121.gate.000.x.yml", "task.121.gate.3.y.yml"]),
    );
    assert.equal(beside.status, 0, beside.stderr);
    assert.equal(beside.stdout, "3\n");
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
// Repository-root form only. Every block in these skills writes
// `.claude/state/…` and calls its engine from the root, so a skill-relative
// `bash references/qa-cycle.sh` is the BUG-4/BUG-6 shape: exit 127 from the
// cwd the rest of the block assumes. The path-form guard below says so by
// name; this pattern is what the same-block guard counts as "derived here".
const DERIVES_CYCLE =
  /^\s*(?:QA|FIX)_CYCLE=\$\(bash \.agents\/skills\/[a-z-]+\/references\/qa-cycle\.sh /m;
// Any command-substitution assignment that reads a NUMBER out of a gate
// filename, however spelled (sed/awk/grep/cut, -E/-En/-r, anchored or not), is
// a second definition of "which gate is current". A lookup that merely names a
// gate path (`LATEST_GATE=$(ls … .gate.*.yml …)`) extracts nothing and is not
// one. Only a call to the helper may extract digits near `.gate.` — spelled
// plain or with escaped dots (`\.gate\.`), as a sed/grep pattern would.
const INLINE_DERIVATION =
  /=\$\((?![^)]*qa-cycle\.sh)[^\n]*\\?\.gate\\?\.[^\n]*(?:\[0-9\]|\[\[:digit:\]\]|\\d|\bawk\b|\bcut -d)/;

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
  // Backslash continuations are joined: a guard applied per physical line misses
  // a command split across two — which is exactly how the original inline
  // derivation was written (`… | head -1 \` then `| sed -nE …`), and exactly
  // what the inline-derivation guard let through until cycle 4 (TASK-121-BUG-5).
  for (const b of blocks) b.text = b.text.replace(/\\\n\s*/g, " ");
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

test("every block addresses the helper from the repository root, like its engine call and its .claude/state paths", () => {
  // Two cwd assumptions in one block is how BUG-4 happened: `bash
  // references/qa-cycle.sh` beside `node .agents/skills/<s>/references/
  // tracker-comment.js` — from the cwd the engine call presupposes, the helper
  // is not found (exit 127) and the post is skipped on every cycle. The rule:
  // a block that addresses an engine from the repository root addresses the
  // helper from the repository root, and a block that addresses it
  // skill-relatively addresses the helper skill-relatively.
  const offenders = [];
  let checked = 0;
  for (const file of SKILLS) {
    for (const b of fencedBlocks(file)) {
      const helper =
        /bash ((?:\.agents\/skills\/[a-z-]+\/)?)references\/qa-cycle\.sh/.exec(
          b.text,
        );
      if (!helper) continue;
      const engine =
        /node ((?:\.agents\/skills\/[a-z-]+\/)?)references\/(?:tracker-comment|stakeholder-summary-cli)\.js/.exec(
          b.text,
        );
      if (!engine) continue;
      checked += 1;
      const helperRoot = helper[1] !== "";
      const engineRoot = engine[1] !== "";
      // `.claude/state/…` is only ever written relative to the repository root,
      // so a block that touches it has declared its cwd (cycle-4 BUG-6). Every
      // block resolves from the root: helper AND engine/lead call.
      const usesState = /\.claude\/state\//.test(b.text);
      if (!helperRoot || !engineRoot) {
        offenders.push(
          `${file}: block at line ${b.start} addresses ${!helperRoot ? "the helper" : "its engine call"} skill-relatively${usesState ? " while writing .claude/state/ from the repo root" : ""} — every block resolves from the repository root`,
        );
      }
    }
  }
  assert.ok(
    checked >= 6,
    `only ${checked} blocks pair a helper call with an engine call — expected ≥ 6`,
  );
  assert.deepEqual(offenders, []);
});

test("no shipped skill carries an inline gate-number derivation any more", () => {
  // One definition, in the helper. An inline `| sed … \.gate\.` copy is a second
  // definition, and two definitions of "which gate is current" drift. Scanned
  // over fenced blocks with continuations JOINED (see fencedBlocks), because
  // the derivation this repository actually shipped spanned two lines.
  const hits = [];
  for (const file of SKILLS) {
    for (const b of fencedBlocks(file)) {
      for (const l of b.text.split("\n")) {
        if (INLINE_DERIVATION.test(l))
          hits.push(`${file}: block at line ${b.start}`);
      }
    }
  }
  assert.deepEqual(hits, []);
});

test("the inline-derivation guard catches the two-line continued form it was written for (TASK-121-BUG-5)", () => {
  // Fixture: the exact cycle-1 spelling, split by a backslash continuation.
  // Run it through the same join fencedBlocks applies, then the same regex.
  const twoLine =
    'FIX_CYCLE=$(ls -t "$DOC_DIR"/*.gate.*.yml 2>/dev/null | head -1 \\\n' +
    "  | sed -nE 's/.*\\.gate\\.([0-9]+)\\..*/\\1/p')";
  const [l1, l2] = twoLine.split("\n");
  assert.equal(
    INLINE_DERIVATION.test(l1),
    false,
    "per-line: the first line alone must not be what catches it",
  );
  assert.equal(
    INLINE_DERIVATION.test(l2),
    false,
    "per-line: the second line alone must not be what catches it",
  );
  const joined = twoLine.replace(/\\\n\s*/g, " ");
  assert.equal(
    INLINE_DERIVATION.test(joined),
    true,
    "joined, the guard must fire",
  );
});

test("the helper is bundled into every skill whose prose calls it", () => {
  // `bash references/qa-cycle.sh` in a SKILL.md is a promise that the bundled
  // copy exists beside it; a consumer installs the skill directory verbatim.
  const missing = SKILLS.map((f) =>
    path.join(path.dirname(f), "references", "qa-cycle.sh"),
  ).filter((p) => !fs.existsSync(path.join(REPO_ROOT, p)));
  assert.deepEqual(missing, []);
});

// ── An explicit cycle for the bug verify loop (task.125, obs #122) ──────────
//
// develop-bug's verify loop writes no gate file, so the helper refuses on its
// directory BY DESIGN — and before task.125 that meant the bug issue got no
// `qa-fix-N` comment at all. The loop knows its cycle and now passes it as the
// Skill arg `fix_cycle=N`, which qa-fix binds as $FIX_CYCLE_ARG. These tests
// EXECUTE qa-fix's tracker block (extracted from SKILL.md, run under bash from a
// scratch repository root with a `node` shim that records argv) rather than
// reading its text: the block is prose, and prose that is only grepped is prose
// that was never run.

function qaFixTrackerBlock() {
  const blocks = fencedBlocks("skills/qa-fix/SKILL.md");
  const b = blocks.find(
    (x) =>
      /--issue "\$FIX_ISSUE"/.test(x.text) &&
      /--stage "qa-fix-\$\{FIX_CYCLE\}"/.test(x.text),
  );
  assert.ok(
    b,
    "qa-fix carries the tracker block that posts qa-fix-${FIX_CYCLE}",
  );
  // fencedBlocks joins continuations for the guards above; the block runs fine
  // joined (a continuation is whitespace to bash).
  return b.text;
}

function runQaFixTrackerBlock({ gates, fixCycleArg }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "qa-fix-cycle-"));
  FIXTURE_DIRS.push(root);
  const refs = path.join(root, ".agents", "skills", "qa-fix", "references");
  fs.mkdirSync(refs, { recursive: true });
  fs.copyFileSync(HELPER, path.join(refs, "qa-cycle.sh"));
  fs.writeFileSync(path.join(refs, "tracker-comment.js"), "");
  fs.mkdirSync(path.join(root, ".claude", "state"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".claude", "state", "comment-body.md"),
    "body\n",
  );
  const docDir = path.join(root, "docs", "bugs", "bug.9.x");
  fs.mkdirSync(docDir, { recursive: true });
  const story = path.join(docDir, "bug.9.x.md");
  fs.writeFileSync(story, "");
  for (const g of gates) fs.writeFileSync(path.join(docDir, g), "");
  const bin = path.join(root, "bin");
  fs.mkdirSync(bin);
  fs.writeFileSync(
    path.join(bin, "node"),
    [
      "#!/bin/sh",
      `printf '%s\\n' "$@" > "${root}/argv.log"`,
      'echo "{\\"reason\\":\\"posted\\"}"',
    ].join("\n"),
    { mode: 0o755 },
  );
  const env = {
    PATH: `${bin}:${process.env.PATH}`,
    STORY_FILE: story,
    FIX_ISSUE: "42",
  };
  if (fixCycleArg !== undefined) env.FIX_CYCLE_ARG = fixCycleArg;
  const r = spawnSync("bash", ["-c", qaFixTrackerBlock()], {
    cwd: root,
    encoding: "utf8",
    env,
  });
  const argvLog = path.join(root, "argv.log");
  const argv = fs.existsSync(argvLog)
    ? fs.readFileSync(argvLog, "utf8").split("\n")
    : null;
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, argv };
}

test("[fix_cycle] an empty gate directory + fix_cycle=2 → the tracker call carries qa-fix-2", () => {
  const r = runQaFixTrackerBlock({ gates: [], fixCycleArg: "2" });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.argv, "tracker-comment.js was invoked");
  assert.ok(
    r.argv.includes("qa-fix-2"),
    `--stage qa-fix-2 expected in ${JSON.stringify(r.argv)}`,
  );
  assert.ok(
    r.argv.includes("cycle=2"),
    "the cycle slot carries the same number",
  );
  assert.doesNotMatch(r.stdout + r.stderr, /QA cycle unknown/);
});

test("[fix_cycle] an empty gate directory + no arg → refuses as today: no post, one ⚠️", () => {
  const r = runQaFixTrackerBlock({ gates: [] });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(
    r.argv,
    null,
    "tracker-comment.js must NOT be invoked with a guessed cycle",
  );
  assert.match(r.stdout, /Tracker issue comment skipped — QA cycle unknown/);
});

test("[fix_cycle] a gate on disk + fix_cycle=2 → the arg wins over the gate", () => {
  const r = runQaFixTrackerBlock({
    gates: ["bug.9.gate.5.x.yml"],
    fixCycleArg: "2",
  });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(
    r.argv.includes("qa-fix-2"),
    `arg must win: ${JSON.stringify(r.argv)}`,
  );
  assert.ok(!r.argv.includes("qa-fix-5"));
});

test("[fix_cycle] a gate on disk + no arg → derived from the gate, unchanged behaviour", () => {
  const r = runQaFixTrackerBlock({ gates: ["bug.9.gate.5.x.yml"] });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.argv.includes("qa-fix-5"), JSON.stringify(r.argv));
});

// The last two are the 9-digit cap: `10#` arithmetic wraps silently past 19 digits
// (18446744073709551617 → 1), and a 10-digit value is not a cycle either (cycle-5 CR-7).
for (const bad of [
  "{N}",
  "0",
  "00",
  "000",
  "3 ",
  "two",
  "-1",
  "007x",
  "1234567890",
  "18446744073709551617",
]) {
  test(`[fix_cycle] an invalid arg ${JSON.stringify(bad)} reads as ABSENT — helper path, never a qa-fix-${bad} stage (TASK-125-BUG-7)`, () => {
    // Empty dir: the helper refuses, so the block must skip — not abort, not post.
    const r = runQaFixTrackerBlock({ gates: [], fixCycleArg: bad });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.argv, null, "nothing reaches tracker-comment.js");
    assert.match(
      r.stdout,
      /Tracker issue comment skipped — QA cycle unknown \(fix_cycle absent or invalid/,
    );
    // "supplied but malformed" is NOT "not supplied": the rejected value is named (cycle-3 CR-3) —
    // and it is the value the caller SUPPLIED, quoted verbatim: `000` was reported as `fix_cycle=0`
    // after `10#` normalisation, a value the caller never wrote (cycle-4 CR-5).
    const quoted = bad.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(
      r.stderr,
      new RegExp(
        `⚠️  fix_cycle='${quoted}' is not a positive .*ignored, deriving from the gate`,
      ),
      `the rejected value ${JSON.stringify(bad)} must be named verbatim on stderr: ${r.stderr}`,
    );
    // Gate on disk: the helper answers, so the invalid arg must not shadow it.
    const g = runQaFixTrackerBlock({
      gates: ["bug.9.gate.4.x.yml"],
      fixCycleArg: bad,
    });
    assert.equal(g.status, 0, g.stderr);
    assert.ok(
      g.argv && g.argv.includes("qa-fix-4"),
      `derived from the gate: ${JSON.stringify(g.argv)}`,
    );
  });
}

test("[fix_cycle] a leading-zero arg is NORMALISED — 007 is cycle 7, so the PR lead and the tracker engine agree (CR-5)", () => {
  const r = runQaFixTrackerBlock({ gates: [], fixCycleArg: "007" });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.argv && r.argv.includes("qa-fix-7"), JSON.stringify(r.argv));
  assert.ok(!r.argv.includes("qa-fix-007"));
});

// A pin on the DOCUMENTED invocation string, not proof of a runtime property: the
// runtime half — that a supplied cycle reaches the stage — is the executed cases
// above (cycle-3 CR-5).
test('[fix_cycle] the verify-loop reference documents the invocation as Skill(qa-fix, args="{bug-file-path} fix_cycle={N}") — a text pin', () => {
  const s = fs.readFileSync(
    path.join(
      REPO_ROOT,
      "skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md",
    ),
    "utf8",
  );
  assert.match(s, /Skill\(qa-fix, args="\{bug-file-path\} fix_cycle=\{N\}"\)/);
});
