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
 * Scenarios, each with the exit status and the line the block must print:
 *   clean   — report, gate and bug report on disk and staged by the block → 0
 *   missing — a linked bug report was never written                       → 1
 *   no QA report / no gate / no Change Log row (TASK-149-BUG-5)            → 1
 *   ignored — a linked file is on disk but gitignored                     → 1
 *   stale   — the newest Change Log row is dated after `updated:`         → 1
 *   a linked file nobody staged → staged by pass 1, clean                  → 0
 *   a case-mismatched link, a stage that fails, an engine that does not
 *   load (doc-links or change-log)                                         → 1
 * plus the unset-input guard, which must name the variable.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

/** An async shell run, so concurrent cases do not queue behind a blocking spawnSync. */
function run(shell, block, opts) {
  return new Promise((resolve) => {
    const child = spawn(shell, ["-c", block], {
      ...opts,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}
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
  if (mutate) mutate(dir, skill);
  return root;
}

const SCENARIOS = [
  { name: "clean", exit: 0, says: /read-back clean/ },
  {
    name: "missing",
    exit: 1,
    says: /missing: \.\/task\.9\.bug\.1\.y\.md[\s\S]*HALT/,
    mutate: (dir) => fs.rmSync(path.join(dir, "task.9.bug.1.y.md")),
  },
  // TASK-149-BUG-5 — the step runs after these must exist; absent, it halts.
  {
    name: "no QA report",
    exit: 1,
    says: /HALT — no QA report for cycle 1/,
    mutate: (dir) => {
      fs.rmSync(path.join(dir, "task.9.qa.1.x.md"));
      const f = path.join(dir, "task.9.x.md");
      fs.writeFileSync(
        f,
        fs.readFileSync(f, "utf8").replace("[r](./task.9.qa.1.x.md) ", ""),
      );
    },
  },
  {
    name: "no gate",
    exit: 1,
    says: /HALT — no numbered gate/,
    mutate: (dir) => {
      fs.rmSync(path.join(dir, "task.9.gate.1.x.yml"));
      const f = path.join(dir, "task.9.x.md");
      fs.writeFileSync(
        f,
        fs.readFileSync(f, "utf8").replace("[g](./task.9.gate.1.x.yml) ", ""),
      );
    },
  },
  {
    name: "no Change Log row",
    exit: 1,
    says: /HALT — no Change Log row/,
    mutate: (dir) => {
      const f = path.join(dir, "task.9.x.md");
      fs.writeFileSync(
        f,
        fs.readFileSync(f, "utf8").replace(/## Change Log[\s\S]*$/, ""),
      );
    },
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
    says: /HALT — the newest Change Log row is dated after updated:/,
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
  // TASK-149-BUG-3 — a linked file the block did not write is staged by pass 1,
  // and the second pass reads it as resolved.
  {
    name: "linked file nobody staged",
    exit: 0,
    says: /read-back clean/,
    mutate: (dir) => {
      fs.appendFileSync(path.join(dir, "task.9.x.md"), "[n](./notes.md)\n");
      fs.writeFileSync(path.join(dir, "notes.md"), "# n\n");
    },
    after: (root) =>
      assert.match(
        spawnSync("git", ["ls-files", "--", DOC_DIR], {
          cwd: root,
          encoding: "utf8",
        }).stdout,
        /notes\.md/,
        "pass 1 must stage the linked file",
      ),
  },
  {
    name: "case-mismatched link",
    exit: 1,
    says: /missing: \.\/Task\.9\.qa\.1\.x\.md[\s\S]*HALT/,
    mutate: (dir) =>
      fs.appendFileSync(
        path.join(dir, "task.9.x.md"),
        "[c](./Task.9.qa.1.x.md)\n",
      ),
  },
  {
    name: "a stage that fails",
    exit: 1,
    says: /HALT — could not stage/,
    mutate: (dir) =>
      fs.writeFileSync(
        path.join(dir, "..", "..", "..", ".git", "index.lock"),
        "",
      ),
  },
  {
    name: "doc-links that does not load",
    exit: 1,
    says: /HALT — doc-links did not run/,
    mutate: (dir, skill) =>
      fs.writeFileSync(
        path.join(
          dir,
          "..",
          "..",
          "..",
          ".agents",
          "skills",
          skill,
          "references",
          "doc-links.js",
        ),
        "throw new Error('broken install');\n",
      ),
  },
  {
    name: "change-log that does not load",
    exit: 1,
    says: /HALT — change-log --check-updated did not answer/,
    mutate: (dir, skill) =>
      fs.writeFileSync(
        path.join(
          dir,
          "..",
          "..",
          "..",
          ".agents",
          "skills",
          skill,
          "references",
          "change-log.js",
        ),
        "throw new Error('broken install');\n",
      ),
  },
];

const SHELLS = ["bash"].concat(
  spawnSync("zsh", ["-c", "true"]).status === 0 ? ["zsh"] : [],
);

// Every case builds and removes its own repository, so the cases are independent
// and run concurrently: sequential, the file took ~16 s of 40 spawned shells.
test.describe("read-back blocks", { concurrency: true }, () => {
  for (const s of SKILLS) {
    const block = blockOf(s.skill, s.heading, s.label);
    for (const shell of SHELLS) {
      for (const sc of SCENARIOS) {
        test(`${s.skill} ${s.label} under ${shell}: ${sc.name} → exit ${sc.exit}`, async () => {
          const root = consumerRepo(s.skill, sc.mutate);
          try {
            const r = await run(shell, block, {
              cwd: root,
              encoding: "utf8",
              env: { ...process.env, ...s.input(DOC_DIR) },
            });
            const out = `${r.stdout}${r.stderr}`;
            assert.equal(r.status, sc.exit, out);
            assert.match(out, sc.says);
            if (sc.exit === 0)
              assert.doesNotMatch(
                out,
                /untracked:/,
                "nothing may be left untracked on a clean read-back",
              );
            if (sc.after) sc.after(root);
          } finally {
            fs.rmSync(root, { recursive: true, force: true });
          }
        });
      }
      test(`${s.skill} ${s.label} under ${shell}: an unset input is named, not a usage error`, async () => {
        const root = consumerRepo(s.skill);
        try {
          const env = { ...process.env };
          delete env[s.inputName];
          const r = await run(shell, block, {
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
});
