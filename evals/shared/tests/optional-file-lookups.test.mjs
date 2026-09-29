/**
 * Optional-file lookups execute correctly with the file ABSENT, under both shells.
 *
 * task.137 (obs #145) swept every `ls <dir>/<glob> 2>/dev/null` optional-file
 * lookup in the pipeline prose to quoted `find -maxdepth 1 -name`. The fixtures
 * every earlier test used always had the file there, which is exactly the case
 * the two shells agree on; the case they disagree on — the file absent — is
 * where zsh's NOMATCH aborts the whole command before `ls` runs and `$(…)` reads
 * empty. Each row below slices the LIVE line out of its document (so the test
 * tracks the text as shipped), substitutes the placeholders, runs it in an empty
 * scratch directory under bash and zsh, and asserts the value the following
 * prose expects: "" for a path, "0" for a count, and never zsh's own error.
 *
 * Numbered shapes get a second row: `.9` and `.19` present, `.19` wins — the
 * lexical `sort | tail -1` these sites used to carry picked `.9` (TASK-125-BUG-14).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnBudget } from "../../../shared/resources/spawn-budget.mjs";
import { makeConsumerRoot } from "../lib/consumer-root.mjs";

const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
// A `cwd: "repo"` row runs a snippet that invokes `.agents/skills/<name>/…` —
// the path a CONSUMER has because setup-consumer.sh vendors it. It resolves at
// the repo root only through the developer's gitignored `.agents/skills ->
// ../skills` symlink, which is why those rows passed locally and failed on CI
// (no `.agents/` there). So "repo" means this consumer-shaped root, never REPO.
const CONSUMER_ROOT = makeConsumerRoot(REPO, "ofl-consumer-");
const { timeoutMs: SPAWN_TIMEOUT_MS } = spawnBudget("optional-file-lookups");
const SHELLS = [
  "bash",
  ...(spawnSync("zsh", ["-c", "true"], { stdio: "ignore" }).status === 0
    ? ["zsh"]
    : []),
];
const flags = (sh) =>
  sh === "zsh" ? ["-f", "-s", "--"] : ["--noprofile", "--norc", "-s", "--"];

/** The line(s) in `file` whose trimmed text starts with `needle`, plus `more` continuation lines. */
function slice(file, needle, more = 0) {
  const lines = readFileSync(path.join(REPO, file), "utf8").split("\n");
  const i = lines.findIndex((l) => l.trim().startsWith(needle));
  assert.notEqual(
    i,
    -1,
    `${file}: no line starts with ${JSON.stringify(needle)} — the sweep's text moved; update the row`,
  );
  return lines
    .slice(i, i + 1 + more)
    .map((l) => l.trim())
    .join("\n");
}

function run(shell, script, cwd) {
  return spawnSync(shell, flags(shell), {
    input: script,
    cwd,
    encoding: "utf8",
    timeout: SPAWN_TIMEOUT_MS,
  });
}

const P = (dir) => ({
  "{task-directory}": dir,
  "{story-directory}": dir,
  "{story-or-task-directory}": dir,
  "{doc-directory}": dir,
  "{DOC_DIR}": dir,
  "{id}": "7",
  "{epic}": "2",
  "{story}": "3",
  "{story-or-task-prefix}": "task.7",
  // The step docs address a bundled helper through the pipeline placeholder;
  // any one member resolves in the consumer root (task.158).
  "{develop-story|develop-task|develop-bug}": "develop-task",
  "{develop-story|develop-task}": "develop-task",
});
const subst = (text, dir) =>
  Object.entries(P(dir)).reduce((t, [k, v]) => t.split(k).join(v), text);

// One row per swept site. `kind`/`ext` mark a numbered-newest shape (gets the .9/.19 row).
const ROWS = [
  // qa-task / qa-story Step 3b
  {
    file: "skills/qa-task/SKILL.md",
    needle: "PRIOR_CYCLE=$(bash",
    more: 6,
    cwd: "repo",
    env: "TASK_DIR",
    varName: "LATEST_GATE",
    expect: "",
    kind: "gate",
    ext: "yml",
    stem: "task.7",
  },
  {
    file: "skills/qa-task/SKILL.md",
    needle: "LATEST_QA_NUM=$(find",
    more: 2,
    env: "TASK_DIR",
    varName: "LATEST_QA_NUM",
    expect: "",
    numberOnly: { kind: "qa", ext: "md", stem: "task.7" },
  },
  {
    file: "skills/qa-task/SKILL.md",
    needle: "PRIOR_GATES=$(find",
    env: "TASK_DIR",
    varName: "PRIOR_GATES",
    expect: "0",
  },
  {
    // task.158: THIS_GATE comes from qa-cycle.sh --path gate, gated on the cycle
    // the same block derives — so the row derives it too.
    file: "skills/qa-task/SKILL.md",
    needle: 'THIS_GATE=""',
    more: 4,
    cwd: "repo",
    env: "TASK_DIR",
    pre: 'QA_CYCLE=$(bash .agents/skills/qa-task/references/qa-cycle.sh "$TASK_DIR" 2>/dev/null)',
    varName: "THIS_GATE",
    expect: "",
    kind: "gate",
    ext: "yml",
    stem: "task.7",
  },
  {
    file: "skills/qa-story/SKILL.md",
    needle: "PRIOR_CYCLE=$(bash",
    more: 6,
    cwd: "repo",
    env: "STORY_DIR",
    varName: "LATEST_GATE",
    expect: "",
    kind: "gate",
    ext: "yml",
    stem: "story.2.3",
  },
  {
    file: "skills/qa-story/SKILL.md",
    needle: "LATEST_QA_NUM=$(find",
    more: 2,
    env: "STORY_DIR",
    varName: "LATEST_QA_NUM",
    expect: "",
    numberOnly: { kind: "qa", ext: "md", stem: "story.2.3" },
  },
  {
    file: "skills/qa-story/SKILL.md",
    needle: "PRIOR_GATES=$(find",
    env: "STORY_DIR",
    varName: "PRIOR_GATES",
    expect: "0",
  },
  {
    // task.158: THIS_GATE comes from qa-cycle.sh --path gate, gated on the cycle
    // the same block derives — so the row derives it too.
    file: "skills/qa-story/SKILL.md",
    needle: 'THIS_GATE=""',
    more: 4,
    cwd: "repo",
    env: "STORY_DIR",
    pre: 'QA_CYCLE=$(bash .agents/skills/qa-story/references/qa-cycle.sh "$STORY_DIR" 2>/dev/null)',
    varName: "THIS_GATE",
    expect: "",
    kind: "gate",
    ext: "yml",
    stem: "story.2.3",
  },
  // step-7-finalise
  {
    file: "shared/resources/develop-pipeline-step-7-finalise.md",
    needle: "DOD_FILE=$(find",
    varName: "DOD_FILE",
    expect: "",
    kind: "dod",
    ext: "md",
    stem: "task.7",
  },
  {
    file: "shared/resources/develop-pipeline-step-7-finalise.md",
    needle: "DOD_PATH=$(find",
    varName: "DOD_PATH",
    expect: "",
    kind: "dod",
    ext: "md",
    stem: "task.7",
  },
  {
    // task.158: the completion comment's gate file comes from qa-cycle.sh --path gate.
    file: "shared/resources/develop-pipeline-step-7-finalise.md",
    needle: "FINAL_GATE_FILE=$(bash",
    more: 4,
    cwd: "repo",
    varName: "FINAL_GATE_FILE",
    expect: "",
    kind: "gate",
    ext: "yml",
    stem: "task.7",
  },
  {
    file: "shared/resources/develop-pipeline-step-7-finalise.md",
    needle: "FINAL_GATE_FILE=$(bash",
    more: 4,
    cwd: "repo",
    varName: "FINAL_GATE",
    expect: "N/A",
  },
  {
    file: "shared/resources/develop-pipeline-step-7-finalise.md",
    needle:
      'find {story-directory} -maxdepth 1 -name "story.{epic}.{story}.dod',
    stdout: "",
    kind: "dod",
    ext: "md",
    stem: "story.2.3",
  },
  {
    file: "shared/resources/develop-pipeline-step-7-finalise.md",
    needle: 'find {task-directory} -maxdepth 1 -name "task.{id}.dod',
    stdout: "",
    kind: "dod",
    ext: "md",
    stem: "task.7",
  },
  // step-2-review
  {
    file: "shared/resources/develop-pipeline-step-2-review.md",
    needle:
      'find {story-directory} -maxdepth 1 -name "story.{epic}.{story}.review',
    stdout: "",
    kind: "review",
    ext: "md",
    stem: "story.2.3",
  },
  {
    file: "shared/resources/develop-pipeline-step-2-review.md",
    needle: 'find {task-directory} -maxdepth 1 -name "task.{id}.review',
    stdout: "",
    kind: "review",
    ext: "md",
    stem: "task.7",
  },
  // step-0
  {
    file: "shared/resources/develop-pipeline-step-0-resolve-and-prepare.md",
    needle:
      'find {story-directory} -maxdepth 1 -name "story.{epic}.{story}.implementation',
    stdout: "",
  },
  {
    file: "shared/resources/develop-pipeline-step-0-resolve-and-prepare.md",
    needle: 'find {task-directory} -maxdepth 1 -name "task.{id}.implementation',
    stdout: "",
  },
  // step-3
  {
    file: "shared/resources/develop-pipeline-step-3-develop-loop.md",
    needle:
      'find {story-directory} -maxdepth 1 -name "story.{epic}.{story}.plan',
    stdout: "",
  },
  {
    file: "shared/resources/develop-pipeline-step-3-develop-loop.md",
    needle: 'find {task-directory} -maxdepth 1 -name "task.{id}.plan',
    stdout: "",
  },
  // step-5-6 — one qa-cycle.sh block for both pipelines since task.158
  {
    file: "shared/resources/develop-pipeline-step-5-6-qa-loop.md",
    needle: "QA_CYCLE=$(bash .agents/skills/{develop-story|develop-task}/",
    more: 8,
    cwd: "repo",
    varName: "LATEST_GATE",
    expect: "",
    kind: "gate",
    ext: "yml",
    stem: "task.7",
  },
  // resume contract
  {
    file: "shared/resources/develop-pipeline-resume-contract.md",
    needle: "plan=$(find {story-directory}",
    varName: "plan",
    expect: "",
  },
  {
    file: "shared/resources/develop-pipeline-resume-contract.md",
    needle: "plan=$(find {task-directory}",
    varName: "plan",
    expect: "",
  },
  {
    // task.158: the cycle comes from qa-cycle.sh; rc 1 (no gate) reads 0.
    file: "shared/resources/develop-pipeline-resume-contract.md",
    needle:
      "QA_CYCLE=$(bash .agents/skills/{develop-story|develop-task|develop-bug}/",
    more: 11,
    cwd: "repo",
    varName: "QA_CYCLE",
    expect: "0",
    numberOnly: { kind: "gate", ext: "yml", stem: "task.7" },
  },
  // resume detector prompt
  {
    file: "shared/resources/pipeline-resume-detector-prompt.md",
    needle: "find .claude/state -maxdepth 1",
    stdout: "",
    mkdirs: [".claude/state"],
  },
  {
    file: "shared/resources/pipeline-resume-detector-prompt.md",
    needle: 'find "{DOC_DIR}/.summaries"',
    stdout: "",
    mkdirs: [".summaries"],
  },
  // develop-story / develop-task Step 0
  {
    file: "skills/develop-story/SKILL.md",
    needle:
      'find {story-directory} -maxdepth 1 -name "story.{epic}.{story}.implementation',
    stdout: "",
    kind: "implementation",
    ext: "md",
    stem: "story.2.3",
  },
  {
    file: "skills/develop-task/SKILL.md",
    needle: 'find {task-directory} -maxdepth 1 -name "task.{id}.implementation',
    stdout: "",
    kind: "implementation",
    ext: "md",
    stem: "task.7",
  },
];

function scriptFor(row, dir) {
  const body = subst(slice(row.file, row.needle, row.more ?? 0), dir);
  const pre = [
    row.env ? `${row.env}=${JSON.stringify(dir)}` : "",
    row.pre ?? "",
  ]
    .filter(Boolean)
    .join("\n");
  const out = row.varName ? `\nprintf '%s' "$${row.varName}"` : "";
  return `${pre}\n${body}${out}\n`;
}

assert.ok(
  ROWS.length >= 25,
  `non-vacuity: ${ROWS.length} rows — the sweep covered 29 sites (obs #145)`,
);

for (const row of ROWS) {
  for (const shell of SHELLS) {
    test(`[${shell}] ${row.file} :: ${row.needle.slice(0, 48)} — file absent reads ${JSON.stringify(row.expect ?? row.stdout ?? row.expectOneOf)}`, () => {
      const dir = mkdtempSync(path.join(tmpdir(), "ofl-"));
      try {
        for (const d of row.mkdirs ?? [])
          mkdirSync(path.join(dir, d), { recursive: true });
        const r = run(
          shell,
          scriptFor(row, dir),
          row.cwd === "repo" ? CONSUMER_ROOT : dir,
        );
        assert.doesNotMatch(
          r.stderr,
          /no matches found|No such file/i,
          `stderr: ${r.stderr}`,
        );
        const got = row.varName ? r.stdout : r.stdout.trim();
        if (row.expectOneOf)
          assert.ok(
            row.expectOneOf.includes(got.trim()),
            `got ${JSON.stringify(got)}`,
          );
        else
          assert.equal(
            got,
            row.expect ?? row.stdout,
            `stdout ${JSON.stringify(r.stdout)} stderr ${JSON.stringify(r.stderr)}`,
          );
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    const num = row.kind ? row : row.numberOnly;
    if (num) {
      test(`[${shell}] ${row.file} :: ${row.needle.slice(0, 48)} — .19 beats .9 (numeric, not lexical)`, () => {
        const dir = mkdtempSync(path.join(tmpdir(), "ofl-"));
        try {
          const nine = `${num.stem}.${num.kind}.9.x.${num.ext}`,
            nineteen = `${num.stem}.${num.kind}.19.x.${num.ext}`;
          writeFileSync(path.join(dir, nine), "gate: PASS\n");
          writeFileSync(path.join(dir, nineteen), "gate: CONCERNS\n");
          const r = run(
            shell,
            scriptFor(row, dir),
            row.cwd === "repo" ? CONSUMER_ROOT : dir,
          );
          assert.doesNotMatch(r.stderr, /no matches found/i, r.stderr);
          const got = (row.varName ? r.stdout : r.stdout.trim()).trim();
          if (row.numberOnly) assert.equal(got, "19");
          else
            assert.equal(
              path.basename(got),
              nineteen,
              `got ${JSON.stringify(got)}`,
            );
        } finally {
          rmSync(dir, { recursive: true, force: true });
        }
      });
    }
  }
}

// task.158 QA cycle 2 (QA2-CR-1, QA2-CR-3) — the resume contract's cycle reconstruction, run
// whole from its `[ -d "{doc-directory}" ]` guard to its `QA_CYCLE=${QA_CYCLE:-0}` default,
// under both shells, in the four states that decide it. The helper answers rc 1 for three of
// them, and only one of those is a fresh start.
function resumeBlock(dir) {
  const file = "shared/resources/develop-pipeline-resume-contract.md";
  const lines = readFileSync(path.join(REPO, file), "utf8").split("\n");
  const start = lines.findIndex((l) =>
    l.trim().startsWith('[ -d "{doc-directory}" ]'),
  );
  const end = lines.findIndex(
    (l, i) => i > start && l.trim() === "QA_CYCLE=${QA_CYCLE:-0}",
  );
  assert.ok(
    start !== -1 && end > start,
    `${file}: the resume block moved — update this test`,
  );
  return `${subst(lines.slice(start, end + 1).join("\n"), dir)}\nprintf '%s' "$QA_CYCLE"\n`;
}

for (const shell of SHELLS) {
  test(`[${shell}] resume contract: missing dir, unnumbered gates, empty dir and gate.02 are four answers, not one`, () => {
    const base = mkdtempSync(path.join(tmpdir(), "ofl-resume-"));
    try {
      const missing = path.join(base, "no-such-dir");
      let r = run(shell, resumeBlock(missing), CONSUMER_ROOT);
      assert.notEqual(r.status, 0, "a missing directory halts");
      assert.match(r.stderr, /is not a directory/);

      const unnumbered = path.join(base, "unnumbered");
      mkdirSync(unnumbered);
      writeFileSync(path.join(unnumbered, "task.7.gate.x.yml"), "gate: PASS\n");
      r = run(shell, resumeBlock(unnumbered), CONSUMER_ROOT);
      assert.notEqual(
        r.status,
        0,
        "unnumbered gates halt — they are not a fresh start",
      );
      assert.match(r.stderr, /none carries a usable cycle number/);

      const empty = path.join(base, "empty");
      mkdirSync(empty);
      r = run(shell, resumeBlock(empty), CONSUMER_ROOT);
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.stdout, "0", "no gate file at all is the fresh start");

      const padded = path.join(base, "padded");
      mkdirSync(padded);
      writeFileSync(path.join(padded, "task.7.gate.02.x.yml"), "gate: PASS\n");
      r = run(shell, resumeBlock(padded), CONSUMER_ROOT);
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.stdout, "2", "a zero-padded gate is its number");
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
}
