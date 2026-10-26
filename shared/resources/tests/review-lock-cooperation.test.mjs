// Both review skills advance the pipeline lock to 3 as their last action, and only on a passing
// review that promoted the document (task 165). The orchestrators' Step 2 HALTs on a failed review,
// and a lock already at 3 would let the Stop hook or a resume send the run to Step 3 (develop) on
// work that failed review. review-story's block was unconditional; review-task had none, so the
// `review-story|review-task → 3` arm of the --skill mapping was half true.
//
// Each skill's `## Pipeline Lock Cooperation` block is extracted and run as written, from a
// consumer-shaped root whose `.agents/skills` points at this repository's skills — the shape of
// finalise-gaps-path.test.mjs's cooperation-block test.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  ROOT,
  SHELLS,
  readDoc,
  blockBy,
  bind,
  run,
} from "./lib/executed-prose.mjs";

const LOCK = ".claude/state/develop-pipeline.lock";

const SKILLS = [
  {
    skill: "review-task",
    doc: "{task-file}",
    cases: [
      ["READY TO IMPLEMENT", "ready-for-development", 3],
      ["NEEDS REVISION", "planned", 2],
      ["REQUIRES REWORK", "planned", 2],
      // A READY review that a blocking sign-off or Change Log kept at planned.
      ["READY TO IMPLEMENT", "planned", 2],
    ],
  },
  {
    skill: "review-story",
    doc: "{story-file}",
    cases: [
      ["GO", "ready-for-development", 3],
      ["NO-GO (Revision)", "draft", 2],
      ["NO-GO (Rework)", "draft", 2],
      // A GO that a blocking sign-off kept at draft: develop-story Step 2 HALTs on it.
      ["GO", "draft", 2],
    ],
  },
];

function consumerRoot(status) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "t165-review-lock-"));
  fs.mkdirSync(path.join(dir, ".claude/state"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, LOCK),
    JSON.stringify({ skill: "develop-task", current_step: 2 }) + "\n",
  );
  fs.mkdirSync(path.join(dir, ".agents"));
  fs.symlinkSync(path.join(ROOT, "skills"), path.join(dir, ".agents/skills"));
  const doc = path.join(dir, "work-item.md");
  fs.writeFileSync(
    doc,
    `---\ntype: task\nstatus: ${status}\n---\n\n# Work item\n`,
  );
  return { dir, doc };
}
const stepOf = (dir) =>
  JSON.parse(fs.readFileSync(path.join(dir, LOCK), "utf8")).current_step;

for (const shell of SHELLS) {
  for (const { skill, doc: docSlot, cases } of SKILLS) {
    test(`[${shell}] ${skill}'s cooperation block, as written in SKILL.md, advances only on a passing, promoted review`, () => {
      const block = blockBy(
        readDoc(`skills/${skill}/SKILL.md`),
        `--skill ${skill}`,
      );
      for (const [outcome, status, want] of cases) {
        const { dir, doc } = consumerRoot(status);
        try {
          const code = bind(block, { "{outcome}": outcome, [docSlot]: doc });
          const r = run(shell, code, { cwd: dir });
          assert.equal(r.status, 0, r.stdout + r.stderr);
          assert.equal(
            stepOf(dir),
            want,
            `${skill}: outcome "${outcome}" with status ${status}`,
          );
        } finally {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      }
    });
  }
}

// Standalone: no lock, so the block is a no-op whatever the outcome.
test("each review skill's block is a no-op without a lock", () => {
  for (const { skill, doc: docSlot } of SKILLS) {
    const block = blockBy(
      readDoc(`skills/${skill}/SKILL.md`),
      `--skill ${skill}`,
    );
    const { dir, doc } = consumerRoot("ready-for-development");
    try {
      fs.rmSync(path.join(dir, LOCK));
      const pass = skill === "review-task" ? "READY TO IMPLEMENT" : "GO";
      const r = run(
        "bash",
        bind(block, { "{outcome}": pass, [docSlot]: doc }),
        { cwd: dir },
      );
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.ok(
        !fs.existsSync(path.join(dir, LOCK)),
        `${skill}: a lock appeared`,
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});
