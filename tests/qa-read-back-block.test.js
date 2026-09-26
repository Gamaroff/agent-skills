"use strict";

/**
 * The read-back blocks — qa-task Step 12b, qa-story Review Completion item 3e —
 * EXECUTED, not grepped (task.149, TASK-149-BUG-2).
 *
 * `tests/qa-evidence-integrity.test.js` proves the rule is stated at each site.
 * That is not evidence the block works: the first version of the halt passed the
 * population test and failed closed on EVERY input, because a jq `length + (…)`
 * evaluated `.unterminatedFence` against an array. Only running the block found
 * it. So this file lifts each fenced block out of its SKILL.md verbatim and runs
 * it, in a consumer-shaped temporary repository (its own `.agents/skills/<skill>/
 * references/` holding the engines), under bash and — when present — zsh.
 *
 * Four scenarios, each with the exit status and the line the block must print:
 *   clean   — report, gate and bug report on disk and staged by the block → 0
 *   missing — the linked report was never written                         → 1
 *   ignored — a linked file is on disk but gitignored                     → 1
 *   stale   — the newest Change Log row is dated after `updated:`         → 1
 * plus the unset-input guard, which must name the variable.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { sectionOf } = require("./lib/markdown-section");

const REPO_ROOT = path.join(__dirname, "..");
const ENGINES = ["doc-links.js", "change-log.js", "qa-cycle.sh"];

const SKILLS = [
  {
    skill: "qa-task",
    heading: "### Step 12b: Read the claims back",
    label: "Step 12b",
    input: (dir) => ({ TASK_DIR: dir }),
    inputName: "TASK_DIR",
  },
  {
    skill: "qa-story",
    heading: "### Review Completion",
    label: "item 3e",
    input: (dir) => ({ STORY_FILE: `${dir}/task.9.x.md` }),
    inputName: "STORY_FILE",
  },
];

/** The single bash fence in the section, de-indented (item 3e sits in a list). */
function blockOf(skill, heading, label) {
  const lines = sectionOf(
    fs.readFileSync(path.join(REPO_ROOT, "skills", skill, "SKILL.md"), "utf8"),
    heading,
  );
  assert.ok(lines, `${skill}: heading not found: ${heading}`);
  const text = lines.join("\n");
  const fences = [...text.matchAll(/^( *)```bash\n([\s\S]*?)^\1```/gm)].filter(
    (m) => m[2].includes("doc-links.js") && m[2].includes(`${label}: HALT`),
  );
  assert.equal(fences.length, 1, `${skill}: exactly one read-back block`);
  const indent = fences[0][1].length;
  return fences[0][2]
    .split("\n")
    .map((l) => l.slice(Math.min(indent, l.length - l.trimStart().length)))
    .join("\n");
}

const DOC_DIR = "docs/tasks/task.9.x";

function consumerRepo(skill, mutate) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "qa-read-back-"));
  const refs = path.join(root, ".agents", "skills", skill, "references");
  fs.mkdirSync(refs, { recursive: true });
  for (const f of ENGINES)
    fs.copyFileSync(
      path.join(REPO_ROOT, "shared", "resources", f),
      path.join(refs, f),
    );
  const git = (...args) =>
    spawnSync("git", ["-c", "user.email=a@b", "-c", "user.name=a", ...args], {
      cwd: root,
      encoding: "utf8",
    });
  git("init", "-q");
  fs.writeFileSync(path.join(root, ".gitignore"), "*.log\n");
  git("add", ".gitignore");
  git("commit", "-qm", "init");
  const dir = path.join(root, DOC_DIR);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "task.9.x.md"),
    [
      "---",
      "type: task",
      "updated: 2026-09-26",
      "---",
      "# T",
      "",
      "- [r](./task.9.qa.1.x.md) [g](./task.9.gate.1.x.yml) [b](./task.9.bug.1.y.md)",
      "",
      "## Change Log",
      "",
      "| Date | Version | Description | Author |",
      "| -- | -- | -- | -- |",
      "| 2026-09-26 | | x | a |",
      "",
    ].join("\n"),
  );
  fs.writeFileSync(path.join(dir, "task.9.gate.1.x.yml"), "gate: FAIL\n");
  fs.writeFileSync(path.join(dir, "task.9.qa.1.x.md"), "# r\n");
  fs.writeFileSync(path.join(dir, "task.9.bug.1.y.md"), "# b\n");
  if (mutate) mutate(dir);
  return root;
}

const SCENARIOS = [
  { name: "clean", exit: 0, says: /read-back clean/ },
  {
    name: "missing",
    exit: 1,
    says: /missing: \.\/task\.9\.qa\.1\.x\.md[\s\S]*HALT/,
    mutate: (dir) => fs.rmSync(path.join(dir, "task.9.qa.1.x.md")),
  },
  {
    name: "ignored",
    exit: 1,
    says: /ignored: \.\/run\.log[\s\S]*HALT/,
    mutate: (dir) => {
      fs.appendFileSync(path.join(dir, "task.9.x.md"), "[l](./run.log)\n");
      fs.writeFileSync(path.join(dir, "run.log"), "x\n");
    },
  },
  {
    name: "stale",
    exit: 1,
    says: /HALT — change-log --check-updated rc=1/,
    mutate: (dir) => {
      const f = path.join(dir, "task.9.x.md");
      fs.writeFileSync(
        f,
        fs
          .readFileSync(f, "utf8")
          .replace("updated: 2026-09-26", "updated: 2026-09-25"),
      );
    },
  },
];

const SHELLS = ["bash"].concat(
  spawnSync("zsh", ["-c", "true"]).status === 0 ? ["zsh"] : [],
);

for (const s of SKILLS) {
  const block = blockOf(s.skill, s.heading, s.label);
  for (const shell of SHELLS) {
    for (const sc of SCENARIOS) {
      test(`${s.skill} ${s.label} under ${shell}: ${sc.name} → exit ${sc.exit}`, () => {
        const root = consumerRepo(s.skill, sc.mutate);
        try {
          const r = spawnSync(shell, ["-c", block], {
            cwd: root,
            encoding: "utf8",
            env: { ...process.env, ...s.input(DOC_DIR) },
          });
          const out = `${r.stdout}${r.stderr}`;
          assert.equal(r.status, sc.exit, out);
          assert.match(out, sc.says);
          if (sc.name === "clean")
            assert.match(
              out,
              /untracked: \.\/task\.9\.bug\.1\.y\.md|read-back clean/,
            );
        } finally {
          fs.rmSync(root, { recursive: true, force: true });
        }
      });
    }
    test(`${s.skill} ${s.label} under ${shell}: an unset input is named, not a usage error`, () => {
      const root = consumerRepo(s.skill);
      try {
        const env = { ...process.env };
        delete env[s.inputName];
        const r = spawnSync(shell, ["-c", block], {
          cwd: root,
          encoding: "utf8",
          env,
        });
        assert.notEqual(r.status, 0);
        assert.match(
          `${r.stdout}${r.stderr}`,
          new RegExp(`${s.inputName}: ${s.label} needs`),
        );
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });
  }
}
