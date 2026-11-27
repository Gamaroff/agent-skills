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
const RERUN = fenceContaining("finalise-rerun-at-head.js \\"); // Step 3a's re-run at the head (task 319)
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

function repo(extra = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "finalise-3a3c-"));
  git(dir, "init", "-q", "-b", "main");
  for (const [p, body] of Object.entries({
    [DOC]: doc(),
    ...extra,
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
// The same answer naming this document, as the AC prompt asks: merge refuses one that names none
// (task 332). AGENT_ALL_PASS stays unnamed for the cases that test that refusal.
const AGENT_NAMED = AGENT_ALL_PASS.replace(
  "ac_traceability:\n",
  `ac_traceability:\n  story_file: "${DOC}"\n`,
);

/** Step 3a's two blocks, in the document's order: the second reads the first's record. */
function step3a(shell, dir, dodN) {
  const r = run(shell, dir, substitute(RERUN, { dodN }));
  if (r.status !== 0) return r;
  const s = run(shell, dir, substitute(STEP_3A, { dodN }));
  return { ...s, stdout: r.stdout + s.stdout, stderr: r.stderr + s.stderr };
}

test("Step 3a runs the named commands before it computes the scope, and after the record preflight that can commit", () => {
  const at = (s) => {
    const i = skill.indexOf(s);
    assert.ok(i > 0, s);
    return i;
  };
  assert.ok(at("finalise-record-preflight.js check") < at(RERUN));
  assert.ok(at(RERUN) < at(STEP_3A));
});

test("Step 8a grades the re-run on the fix head again, output as well as exit code, and cut output decides nothing (T319-CR-202, CR-209)", () => {
  const at = skill.indexOf(
    "**4. Re-run ONLY the failed section's reproduction.**",
  );
  const step = skill.slice(at, skill.indexOf("**5. Append the deviations", at));
  assert.ok(at > 0 && step.length > 0);
  const flat = step.replace(/\s+/g, " ");
  assert.match(
    flat,
    /grade every criterion the new record lists again, on the new run/,
  );
  assert.match(
    flat,
    /its exit code \*\*and\*\* the output the criterion states/,
  );
  assert.match(flat, /no longer passes → Step 8/);
  assert.match(flat, /anything but `ran` → Step 8/);
  assert.doesNotMatch(flat, /a command whose exit code is not what/);
  const prompt = readFileSync(
    path.join(REPO_ROOT, "shared/resources/finalise-dod-ac-prompt.md"),
    "utf8",
  );
  assert.match(
    prompt,
    /`FAIL` when it does not, when `exit_code` is `null`, when the criterion states what the command must print and `output_capped` is `true` or `output_overwritten` names the stream that decides it/,
  );
});

for (const shell of SHELLS) {
  test(`[${shell}] Step 3a's re-run block refuses a DOD_N that is not a number, before anything runs (T319-CR-211)`, () => {
    const dir = repo();
    try {
      for (const dodN of ["", "1; touch owned", "one", "../1"]) {
        const r = run(shell, dir, substitute(RERUN, { dodN }));
        assert.equal(r.status, 1, dodN);
        assert.match(r.stdout, /^HALT: DOD_N \('/, dodN);
      }
      assert.ok(!existsSync(path.join(dir, ".claude")), "nothing was started");
      assert.ok(!existsSync(path.join(dir, "owned")));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`[${shell}] Step 3a end to end: a criterion the re-run lists is re-judged although the last run passed it (T319-CR-5)`, () => {
    const dir = repo({
      [DOC]: doc().replace(
        "SC-2: the second criterion",
        "SC-2: `sh check.sh` passes",
      ),
      "skills-config.yaml":
        'finalise:\n  rerunAtHead:\n    - "sh check.sh"\nci:\n  docsOnly:\n    patterns:\n      - "**/*.md"\n',
      "check.sh": "exit 0\n",
    });
    try {
      const a1 = step3a(shell, dir, 1);
      assert.equal(a1.status, 0, a1.stdout + a1.stderr);
      assert.match(a1.stdout, /re-run at head: ran/);
      assert.match(a1.stdout, /sh check\.sh -> exit 0/);
      writeFileSync(
        path.join(dir, ".claude/state/finalise-ac-result-task.9-1.yaml"),
        AGENT_NAMED, // the citation says nothing of a re-run
      );
      const c1 = run(shell, dir, substitute(STEP_3C, { dodN: 1 }));
      assert.equal(c1.status, 0, c1.stdout + c1.stderr);
      writeFileSync(path.join(dir, "README.md"), "r2\n");
      git(dir, "add", "-A");
      git(dir, "commit", "-q", "-m", "B");
      const a2 = step3a(shell, dir, 2);
      assert.equal(a2.status, 0, a2.stdout + a2.stderr);
      assert.match(
        a2.stdout,
        /re-run scope: scoped \(prior-record\) — 1 to re-judge, 2 carried/,
      );
      // uncommitted code stops the block, before anything is graded
      writeFileSync(path.join(dir, "src/a.js"), "edited\n");
      const dirty = step3a(shell, dir, 3);
      assert.equal(dirty.status, 1, dirty.stdout);
      assert.match(dirty.stdout, /re-run at head: dirty-tree/);
      assert.match(dirty.stdout, /HALT: finalise-rerun-at-head\.js/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`[${shell}] Steps 3a + 3c as substituted: a first run is full and writes ${"${STEM}"}.dod.1.ac.json; the next run finds it and is scoped`, () => {
    const dir = repo();
    try {
      const a1 = step3a(shell, dir, 1);
      assert.equal(a1.status, 0, a1.stdout + a1.stderr);
      assert.match(a1.stdout, /re-run scope: full \(no-prior-record\)/);

      writeFileSync(
        path.join(dir, ".claude/state/finalise-ac-result-task.9-1.yaml"),
        AGENT_NAMED,
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

      const a2 = step3a(shell, dir, 2);
      assert.equal(a2.status, 0, a2.stdout + a2.stderr);
      assert.match(
        a2.stdout,
        /re-run scope: scoped \(prior-record\) — 0 to re-judge, 3 carried/,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`[${shell}] Step 3c refuses another document's scope at this item's stem-keyed path, and names the scope, not this item's answer (T331-CR-1, task 332)`, () => {
    const dir = repo();
    try {
      const a1 = step3a(shell, dir, 1);
      assert.equal(a1.status, 0, a1.stdout + a1.stderr);
      // Step 3a writes the scope at the stem-keyed path, and Step 3c reads it there (task 332,
      // G3-1). Mutation target: either path reverted to `finalise-rerun-scope-${DOD_N}.json`.
      const scopeFile = path.join(
        dir,
        ".claude/state/finalise-rerun-scope-task.9-1.json",
      );
      assert.ok(
        !existsSync(
          path.join(dir, ".claude/state/finalise-rerun-scope-1.json"),
        ),
        "no run-number-keyed scope file is written",
      );
      const other = "docs/tasks/task.8.other/task.8.other.md";
      writeFileSync(
        scopeFile,
        JSON.stringify({
          ...JSON.parse(readFileSync(scopeFile, "utf8")),
          document: other,
        }),
      );
      const result = path.join(
        dir,
        ".claude/state/finalise-ac-result-task.9-1.yaml",
      );
      const record = path.join(dir, DOC_DIR, "task.9.dod.1.ac.json");
      // A result naming no document (it would merge without the check: a silent wrong record),
      // then this item's correct answer (it would be called another document's).
      for (const answer of [
        AGENT_ALL_PASS,
        AGENT_ALL_PASS.replace(
          "ac_traceability:\n",
          `ac_traceability:\n  story_file: "${DOC}"\n`,
        ),
      ]) {
        writeFileSync(result, answer);
        const c = run(shell, dir, substitute(STEP_3C, { dodN: 1 }));
        assert.equal(c.status, 1, c.stdout + c.stderr);
        assert.match(
          c.stdout,
          /HALT: --scope is the re-run scope of docs\/tasks\/task\.8\.other\/task\.8\.other\.md, not docs\/tasks\/task\.9\.demo\/task\.9\.demo\.md/,
        );
        assert.match(
          c.stdout,
          /--scope is not this item's: check STEM and DOD_N, re-run Step 3a for this item/,
        );
        assert.doesNotMatch(c.stdout, /another document's answer/);
        assert.ok(!existsSync(record), "nothing is recorded");
      }
      // A scope with no document (written before task 331) has its own arm and remedy (task 332).
      writeFileSync(
        scopeFile,
        JSON.stringify({
          ...JSON.parse(readFileSync(scopeFile, "utf8")),
          document: null,
        }),
      );
      const missing = run(shell, dir, substitute(STEP_3C, { dodN: 1 }));
      assert.equal(missing.status, 1, missing.stdout + missing.stderr);
      assert.match(missing.stdout, /HALT: --scope has no document/);
      assert.match(
        missing.stdout,
        /re-run Step 3a, the AC agent and the extract above, then this block/,
      );
      assert.doesNotMatch(missing.stdout, /merge answered/);
      assert.ok(!existsSync(record), "nothing is recorded");
      // DOC_PATH left unsubstituted is refused before the engine runs.
      const un = run(
        shell,
        dir,
        substitute(STEP_3C, { dodN: 1 }).replace(
          `DOC_PATH="${DOC}"`,
          'DOC_PATH="{document-path}"',
        ),
      );
      assert.equal(un.status, 1, un.stdout + un.stderr);
      assert.match(
        un.stdout,
        /HALT: DOC_PATH \('\{document-path\}'\) must be substituted/,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`[${shell}] Step 3c HALTs on another document's result in its own arm, naming the remedy, and records nothing (task 331)`, () => {
    // The other document exists: a story_file naming no file is refused with its own message
    // (task 332), and this case is about a real other document's answer.
    const other = "docs/tasks/task.8.other/task.8.other.md";
    const dir = repo({ [other]: "# task 8\n" });
    try {
      const a1 = step3a(shell, dir, 1);
      assert.equal(a1.status, 0, a1.stdout + a1.stderr);
      writeFileSync(
        path.join(dir, ".claude/state/finalise-ac-result-task.9-1.yaml"),
        AGENT_ALL_PASS.replace(
          "ac_traceability:\n",
          `ac_traceability:\n  story_file: "${other}"\n`,
        ),
      );
      const c = run(shell, dir, substitute(STEP_3C, { dodN: 1 }));
      assert.equal(c.status, 1, c.stdout + c.stderr);
      assert.match(
        c.stdout,
        /HALT: --result is for docs\/tasks\/task\.8\.other\/task\.8\.other\.md, not docs\/tasks\/task\.9\.demo\/task\.9\.demo\.md: it is another document's answer/,
      );
      // The arm's own remedy, not the generic `merge answered …` line the `*)` arm prints.
      assert.match(
        c.stdout,
        /re-run the extract above, or hand-copy THIS item's AC agent answer to the result path, then re-run this block; never merge it/,
      );
      assert.doesNotMatch(c.stdout, /merge answered/);
      assert.ok(
        !existsSync(path.join(dir, DOC_DIR, "task.9.dod.1.ac.json")),
        "nothing is recorded",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`[${shell}] Step 3c HALTs on a result that names no document in its own arm, naming the remedy, and records nothing (task 332)`, () => {
    const dir = repo();
    try {
      const a1 = step3a(shell, dir, 1);
      assert.equal(a1.status, 0, a1.stdout + a1.stderr);
      assert.ok(
        !/story_file/.test(AGENT_ALL_PASS),
        "the fixture names no document",
      );
      writeFileSync(
        path.join(dir, ".claude/state/finalise-ac-result-task.9-1.yaml"),
        AGENT_ALL_PASS,
      );
      const c = run(shell, dir, substitute(STEP_3C, { dodN: 1 }));
      assert.equal(c.status, 1, c.stdout + c.stderr);
      assert.match(c.stdout, /HALT: --result names no document/);
      assert.match(
        c.stdout,
        /re-run the extract above, or hand-copy THIS item's full AC agent answer to the result path, then re-run this block/,
      );
      assert.doesNotMatch(c.stdout, /merge answered/);
      assert.ok(
        !existsSync(path.join(dir, DOC_DIR, "task.9.dod.1.ac.json")),
        "nothing is recorded",
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
      const un = run(shell, dir, RERUN);
      assert.equal(un.status, 1, un.stdout + un.stderr);
      assert.match(un.stdout, /HALT: DOC_PATH and DOD_N must be substituted/);
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
