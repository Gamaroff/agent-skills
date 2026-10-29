// /finalise Steps 3a and 3c, EXECUTED — task 242, QA cycle 1 (CR-1, CR-2).
//
// The engine's own suite drives finalise-rerun-scope.js with a hard-coded stem,
// and the contract tests read the command text. Neither runs the fenced blocks
// an agent runs, so both passed while the blocks read STEM and DOD_N from an
// earlier block's shell: Step 3c HALTed on every run (`--dod-n ""`) and Step 3a
// never found a prior record. Each block below is lifted out of SKILL.md,
// substituted the way an agent substitutes it, and run in a real git repository
// whose `.agents/skills/finalise/references` is this checkout's bundled copy.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const skill = readFileSync(
  path.join(REPO_ROOT, "skills", "finalise", "SKILL.md"),
  "utf8",
);
const SHELLS = [
  "bash",
  ...(spawnSync("zsh", ["-c", "true"], { stdio: "ignore" }).status === 0
    ? ["zsh"]
    : []),
];

/** The one ```bash fence in SKILL.md whose body contains `needle`. */
function fenceContaining(needle) {
  // Line by line, so a longer fence (````markdown) that quotes a ```bash one
  // cannot shift the pairing the way a lazy regex over the whole file does.
  const fences = [];
  let open = null;
  for (const line of skill.split("\n")) {
    if (!open) {
      const m = /^\s*(`{3,})(\S*)\s*$/.exec(line);
      if (m) open = { tick: m[1].length, lang: m[2], body: [] };
    } else if (new RegExp(`^\\s*\`{${open.tick},}\\s*$`).test(line)) {
      if (open.lang === "bash") fences.push(open.body.join("\n"));
      open = null;
    } else {
      open.body.push(line);
    }
  }
  const hits = fences.filter((f) => f.includes(needle));
  assert.equal(hits.length, 1, `exactly one bash fence contains ${needle}`);
  return hits[0];
}
const STEP_3A = fenceContaining("finalise-rerun-scope.js scope");
const STEP_3C = fenceContaining("finalise-rerun-scope.js merge");

const DOC_DIR = "docs/tasks/task.9.demo";
const DOC = `${DOC_DIR}/task.9.demo.md`;

/** What an agent does to a block: fill every placeholder it documents. */
function substitute(block, { stem = "task.9", dodN }) {
  return block
    .replace(/STEM="\{[^\n"]*\}"/, `STEM="${stem}"`)
    .replace(/DOD_N="\{[^\n"]*\}"/, `DOD_N="${dodN}"`)
    .replace(/\{document-directory\}/g, DOC_DIR)
    .replace(/\{document-path\}/g, DOC);
}

const GIT = [
  "-c",
  "user.name=t",
  "-c",
  "user.email=t@t",
  "-c",
  "commit.gpgsign=false",
];
const git = (cwd, ...args) =>
  execFileSync("git", [...GIT, ...args], { cwd, encoding: "utf8" }).trim();

function doc(extra = "") {
  return [
    "---",
    "type: task",
    "status: in-progress",
    "---",
    "",
    "# Technical Task: Demo",
    "",
    "## 9. Success Criteria",
    "",
    "- [ ] SC-1: the first criterion",
    "- [ ] SC-2: the second criterion",
    "- [ ] SC-3: the third criterion",
    "",
    "## 10. Risk Assessment",
    "",
    `None.${extra}`,
    "",
  ].join("\n");
}

function repo() {
  const dir = mkdtempSync(path.join(tmpdir(), "finalise-3a3c-"));
  git(dir, "init", "-q", "-b", "main");
  for (const [p, body] of Object.entries({
    [DOC]: doc(),
    "src/a.js": "a\n",
    "tests/a.test.mjs": "ta\n",
    "README.md": "r\n",
  })) {
    mkdirSync(path.dirname(path.join(dir, p)), { recursive: true });
    writeFileSync(path.join(dir, p), body);
  }
  mkdirSync(path.join(dir, ".agents", "skills", "finalise"), {
    recursive: true,
  });
  symlinkSync(
    path.join(REPO_ROOT, "skills", "finalise", "references"),
    path.join(dir, ".agents", "skills", "finalise", "references"),
  );
  writeFileSync(
    path.join(dir, ".git", "info", "exclude"),
    ".agents/\n.claude/\n",
  );
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "A");
  return dir;
}

const run = (shell, dir, block) =>
  spawnSync(shell, ["-s", "--"], {
    input: block,
    cwd: dir,
    encoding: "utf8",
    env: { PATH: process.env.PATH, HOME: process.env.HOME },
  });

const AGENT_ALL_PASS = [
  "ac_traceability:",
  "  acs:",
  ...["SC-1", "SC-2", "SC-3"].flatMap((id) => [
    `    - ac_id: "${id}"`,
    "      status: PASS",
    '      code_citation: "src/a.js:1"',
    '      test_citation: "tests/a.test.mjs:1"',
    "      test_runs_per_pr: true",
  ]),
  "  docs: []",
  "  overall: PASS",
  "",
].join("\n");

for (const shell of SHELLS) {
  test(`[${shell}] Steps 3a + 3c as substituted: a first run is full and writes ${"${STEM}"}.dod.1.ac.json; the next run finds it and is scoped`, () => {
    const dir = repo();
    try {
      const a1 = run(shell, dir, substitute(STEP_3A, { dodN: 1 }));
      assert.equal(a1.status, 0, a1.stdout + a1.stderr);
      assert.match(a1.stdout, /re-run scope: full \(no-prior-record\)/);

      writeFileSync(
        path.join(dir, ".claude/state/finalise-ac-result-1.yaml"),
        AGENT_ALL_PASS,
      );
      const c1 = run(shell, dir, substitute(STEP_3C, { dodN: 1 }));
      assert.equal(c1.status, 0, c1.stdout + c1.stderr);
      assert.match(c1.stdout, /^AC_OVERALL=PASS$/m);
      const record = path.join(dir, DOC_DIR, "task.9.dod.1.ac.json");
      assert.ok(existsSync(record), "Step 3c wrote this run's record");
      assert.equal(JSON.parse(readFileSync(record, "utf8")).dod_n, 1);

      writeFileSync(path.join(dir, "README.md"), "r2\n");
      git(dir, "add", "-A");
      git(dir, "commit", "-q", "-m", "B");

      const a2 = run(shell, dir, substitute(STEP_3A, { dodN: 2 }));
      assert.equal(a2.status, 0, a2.stdout + a2.stderr);
      assert.match(
        a2.stdout,
        /re-run scope: scoped \(prior-record\) — 0 to re-judge, 3 carried/,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`[${shell}] Steps 3a and 3c run as delivered (placeholders unsubstituted) HALT before reaching the engine`, () => {
    const dir = repo();
    try {
      for (const block of [STEP_3A, STEP_3C]) {
        const r = run(shell, dir, block);
        assert.equal(r.status, 1, r.stdout + r.stderr);
        assert.match(
          r.stdout + r.stderr,
          /HALT: STEM and DOD_N must be substituted into this block/,
        );
      }
      // Bound but not a run number: still refused, never passed to the engine.
      const bad = run(shell, dir, substitute(STEP_3C, { dodN: "" }));
      assert.equal(bad.status, 1, bad.stdout + bad.stderr);
      assert.match(
        bad.stdout + bad.stderr,
        /HALT: DOD_N \(''\) is not Step 0's run number/,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}
