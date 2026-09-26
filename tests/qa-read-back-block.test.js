"use strict";

/**
 * The read-back blocks — qa-task Step 12b, qa-story Review Completion item 3e —
 * EXECUTED as delivered (task.149).
 *
 * The decision lives in `shared/resources/qa-read-back.js`, whose own suite
 * (`shared/resources/tests/qa-read-back.test.mjs`) covers every halt. This file
 * holds the other half: that each SKILL.md block, lifted out verbatim, reaches the
 * bundled script and carries its verdict out as the block's exit status. It runs
 * the block the way an agent does — the `{placeholder}` substituted in the block
 * TEXT, never injected through `env` (an env-injected input is what hid
 * TASK-149-BUG-6) — in a consumer-shaped repository with its own
 * `.agents/skills/<skill>/references/`, under bash and, when present, zsh.
 *
 *   clean                       → 0
 *   a stale `updated:`          → 1
 *   the placeholder left as is  → 2 (could not look — never a pass)
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const { sectionOf } = require("./lib/markdown-section");

const REPO_ROOT = path.join(__dirname, "..");
const ENGINES = [
  "qa-read-back.js",
  "doc-links.js",
  "change-log.js",
  "qa-cycle.sh",
];
const DOC_DIR = "docs/tasks/task.9.x";
const DOC = `${DOC_DIR}/task.9.x.md`;

const SKILLS = [
  {
    skill: "qa-task",
    heading: "### Step 12b: Read the claims back",
    placeholder: "{task-file}",
  },
  {
    skill: "qa-story",
    heading: "### Review Completion",
    placeholder: "{story-file}",
  },
];

function blockOf(skill, heading) {
  const lines = sectionOf(
    fs.readFileSync(path.join(REPO_ROOT, "skills", skill, "SKILL.md"), "utf8"),
    heading,
  );
  assert.ok(lines, `${skill}: heading not found: ${heading}`);
  const fences = [
    ...lines.join("\n").matchAll(/^( *)```bash\n([\s\S]*?)^\1```/gm),
  ].filter((m) => m[2].includes("qa-read-back.js"));
  assert.equal(fences.length, 1, `${skill}: exactly one read-back block`);
  const indent = fences[0][1].length;
  return fences[0][2]
    .split("\n")
    .map((l) => l.slice(Math.min(indent, l.length - l.trimStart().length)))
    .join("\n");
}

function consumerRepo(skill, mutate) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "qa-read-back-block-"));
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
    });
  git("init", "-q");
  git("commit", "-q", "--allow-empty", "-m", "init");
  const dir = path.join(root, DOC_DIR);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(root, DOC),
    [
      "---",
      "type: task",
      "updated: 2026-09-26",
      "---",
      "# T",
      "",
      "- [r](./task.9.qa.1.x.md) [g](./task.9.gate.1.x.yml)",
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
  if (mutate) mutate(root);
  return root;
}

/** Async, so the concurrent cases do not queue behind a blocking spawnSync. */
function run(shell, block, cwd) {
  return new Promise((resolve) => {
    const child = spawn(shell, ["-c", block], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (status) => resolve({ status, out }));
  });
}

const SHELLS = ["bash"].concat(
  spawnSync("zsh", ["-c", "true"]).status === 0 ? ["zsh"] : [],
);

const CASES = [
  { name: "clean", exit: 0, says: /^ok qa-read-back:/m, substitute: true },
  {
    name: "a stale updated:",
    exit: 1,
    says: /^HALT qa-read-back:/m,
    substitute: true,
    mutate: (root) => {
      const f = path.join(root, DOC);
      fs.writeFileSync(
        f,
        fs
          .readFileSync(f, "utf8")
          .replace("updated: 2026-09-26", "updated: 2026-09-25"),
      );
    },
  },
  {
    name: "the placeholder left as delivered",
    exit: 2,
    says: /unsubstituted placeholder/,
    substitute: false,
  },
];

test.describe("read-back blocks, as delivered", { concurrency: true }, () => {
  for (const s of SKILLS) {
    const block = blockOf(s.skill, s.heading);
    test(`${s.skill}: the block names its input only by placeholder`, () => {
      assert.ok(block.includes(`--doc "${s.placeholder}"`), block);
      assert.doesNotMatch(
        block,
        /\$\{?[A-Z_]+/,
        "no shell variable — nothing to leave unbound",
      );
    });
    for (const shell of SHELLS) {
      for (const c of CASES) {
        test(`${s.skill} under ${shell}: ${c.name} → exit ${c.exit}`, async () => {
          const root = consumerRepo(s.skill, c.mutate);
          try {
            const text = c.substitute
              ? block.split(s.placeholder).join(DOC)
              : block;
            const r = await run(shell, text, root);
            assert.equal(r.status, c.exit, r.out);
            assert.match(r.out, c.says);
          } finally {
            fs.rmSync(root, { recursive: true, force: true });
          }
        });
      }
    }
  }
});
