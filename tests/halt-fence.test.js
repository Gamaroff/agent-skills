"use strict";
/**
 * The terminal-HALT fence in develop-task, develop-story and develop-bug SKILL.md (task.276, obs #49).
 *
 * A HALT used to be a copied `jq`/`rm` fence in each of these files, and a HALT that ran only its
 * message left the lock in place with no snapshot — three runs (task.205, task.238, task.242), each
 * recovered by a snapshot written by hand. The fence is now one call to
 * `advance-pipeline-lock.sh --halt`. Two things are asserted, and the second is the one that matters:
 *
 *   1. No SKILL.md still carries the hand-rolled writer (no second definition of the snapshot).
 *   2. The fence AS WRITTEN, extracted from the file and run in a consumer-shaped sandbox with its
 *      placeholders filled, leaves the state a HALT must leave: a snapshot carrying the reason and the
 *      step, no lock, no transient test logs. A grep for the string `--halt` would pass a fence that
 *      names the flag and does not work.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const REPO_ROOT = path.resolve(__dirname, "..");
const SCRIPT = path.join(
  REPO_ROOT,
  "shared",
  "resources",
  "advance-pipeline-lock.sh",
);
const SKILLS = [
  { skill: "develop-task", dirPlaceholder: "{task-directory}" },
  { skill: "develop-story", dirPlaceholder: "{story-directory}" },
  { skill: "develop-bug", dirPlaceholder: "{bug-directory}" },
];

/** Every ```bash fence in a Markdown file, with its text. */
function bashFences(md) {
  const out = [];
  const re = /^[ \t]*```bash\n([\s\S]*?)^[ \t]*```/gm;
  let m;
  while ((m = re.exec(md))) out.push(m[1]);
  return out;
}

for (const { skill, dirPlaceholder } of SKILLS) {
  const file = path.join(REPO_ROOT, "skills", skill, "SKILL.md");
  const md = fs.readFileSync(file, "utf8");
  const fences = bashFences(md);
  const haltFences = fences.filter((f) =>
    /advance-pipeline-lock\.sh --halt\b/.test(f),
  );

  test(`${skill}: exactly one --halt fence, and no hand-rolled snapshot writer`, () => {
    assert.equal(
      haltFences.length,
      1,
      `${skill}/SKILL.md must carry exactly one --halt fence`,
    );
    const handRolled = fences.filter(
      (f) =>
        /halt_reason:\s*\$reason/.test(f) ||
        /rm -f \.claude\/state\/develop-pipeline\.lock/.test(f),
    );
    assert.deepEqual(
      handRolled,
      [],
      `${skill}/SKILL.md still carries a hand-rolled HALT writer`,
    );
  });

  test(`${skill}: the fence, run as written, snapshots the lock and removes it`, () => {
    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "halt-fence-"));
    try {
      const refs = path.join(sandbox, ".agents", "skills", skill, "references");
      fs.mkdirSync(refs, { recursive: true });
      fs.copyFileSync(SCRIPT, path.join(refs, "advance-pipeline-lock.sh"));
      const state = path.join(sandbox, ".claude", "state");
      fs.mkdirSync(state, { recursive: true });
      const docDir = path.join(sandbox, "docs", "item.1.x");
      fs.mkdirSync(docDir, { recursive: true });
      fs.writeFileSync(
        path.join(state, "develop-pipeline.lock"),
        JSON.stringify({
          skill,
          current_step: 6,
          task_or_story_directory: "docs/item.1.x",
          branch: "b",
        }),
      );
      fs.writeFileSync(path.join(state, "test-output-1.log"), "log");

      const fence = haltFences[0]
        .replace("{halt_reason}", "loop-limit")
        .replace("{halt_step}", "6")
        .replace(dirPlaceholder, "docs/item.1.x");
      assert.ok(
        !/\{[a-z_-]+\}/.test(fence),
        `an unfilled placeholder is left in the fence: ${fence}`,
      );

      const r = spawnSync("bash", ["-c", fence], {
        cwd: sandbox,
        encoding: "utf8",
      });
      assert.equal(r.status, 0, `the fence failed: ${r.stdout}${r.stderr}`);

      assert.ok(
        !fs.existsSync(path.join(state, "develop-pipeline.lock")),
        "the lock must be removed",
      );
      assert.ok(
        !fs.existsSync(path.join(state, "test-output-1.log")),
        "transient test logs must be removed",
      );
      const snap = JSON.parse(
        fs.readFileSync(
          path.join(state, "develop-pipeline.last-halt.json"),
          "utf8",
        ),
      );
      assert.equal(snap.halt_reason, "loop-limit");
      assert.equal(String(snap.halt_step), "6");
      assert.equal(snap.task_or_story_directory, "docs/item.1.x");
      assert.equal(
        snap.branch,
        "b",
        "the lock's own fields ride along in the snapshot",
      );
    } finally {
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });
}
