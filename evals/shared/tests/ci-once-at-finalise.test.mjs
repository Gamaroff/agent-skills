/**
 * Asserts the pipeline's CI rule is stated where it is acted on: CI green is
 * required exactly once, on the final commit, at `/finalise` — and no QA cycle,
 * gate or conformance review waits on CI before then.
 *
 * WHY THIS EXISTS
 * ---------------
 * On tinker-city task.122 (2026-09-28/29) an orchestrator made every QA cycle
 * wait for the PR's CI run — about 35 minutes each on one self-hosted runner —
 * before writing the gate. Cycles 3–7 stacked hours of waiting, and a sleeping
 * CI host stranded the loop twice. Nothing in the skills required the wait; but
 * nothing forbade it either, and `/review-pr`'s conformance lens raised "CI not
 * green" as a finding mid-loop, which pushed 5c to CONCERNS on a run that was
 * merely pending. An unstated rule is one each session re-derives, and the
 * cautious derivation is the expensive one.
 *
 * So the rule is written down in the four places a session decides whether to
 * wait, and this test holds each of them. The finalise assertion is the
 * non-vacuity half: the rule sends CI to `/finalise`, so `/finalise` must still
 * carry both readings or the rule points at a gate that no longer exists.
 *
 * Run: node --test evals/shared/tests/ci-once-at-finalise.test.mjs
 * Mutations that must go red: delete the "CI and the QA loop" paragraph from
 * the shared QA-loop doc; delete "That is the only wait." from qa-task;
 * delete the CI STATE bullet from pr-conformance-prompt.md; rename "CI reading
 * 2" in finalise.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");
const read = (p) => readFileSync(join(repoRoot, p), "utf-8");

/**
 * The loop documents that push per cycle, at their authoritative source. The
 * develop-bug file is skill-native — it has no shared/resources counterpart —
 * which is why it states the rule itself rather than inheriting it.
 */
const LOOP_DOCUMENTS = [
  "shared/resources/develop-pipeline-step-5-6-qa-loop.md",
  "skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md",
];

/** The gate-writing skills, each with its own Step 10 precondition. */
const GATE_SKILLS = ["skills/qa-task/SKILL.md", "skills/qa-story/SKILL.md"];

test("every per-cycle loop document says no cycle waits on CI", () => {
  for (const p of LOOP_DOCUMENTS) {
    const doc = read(p);
    assert.match(
      doc,
      /\*\*(CI and the QA loop — no cycle waits on CI|No verify cycle waits on CI)\.\*\*/,
      `${p} must state that no cycle waits on CI`,
    );
    assert.match(
      doc,
      /\*\*CI green is required exactly once,\s+on the final commit,\s+at `\/finalise`\*\*/,
      `${p} must name /finalise as the one CI gate`,
    );
  }
});

test("the QA loop names the fast gate as a cycle's suite evidence", () => {
  // Without this, "do not wait on CI" reads as "no suite evidence at all".
  const doc = read(LOOP_DOCUMENTS[0]);
  const section = doc.slice(doc.indexOf("**CI and the QA loop"));
  assert.match(
    section.slice(0, 1200),
    /suite evidence is the local fast\s+gate \(`develop\.fastGateCommand`/,
  );
});

test("the gate precondition waits on the review and nothing else", () => {
  for (const p of GATE_SKILLS) {
    const line = read(p)
      .split("\n")
      .find((l) =>
        l.startsWith(
          "> **Precondition — no dispatched review is outstanding.** Do not write a gate",
        ),
      );
    assert.ok(line, `${p} must keep its gate-step precondition`);
    assert.match(line, /\*\*That is the only wait\.\*\*/, `${p}: only wait`);
    assert.match(
      line,
      /CI run on the PR is \*\*not\*\* a precondition of this step/,
      `${p}: CI is not a gate precondition`,
    );
    assert.match(line, /at `\/finalise`/, `${p}: names /finalise`);
  }
});

test("the conformance lens does not flag CI state before /finalise", () => {
  const prompt = read("shared/resources/pr-conformance-prompt.md");
  assert.match(prompt, /^- CI STATE IS NOT A FINDING BEFORE \/finalise\./m);
  // The carve-out must survive too, or the rule silences a real red test.
  assert.match(
    prompt,
    /A CI failure attributable to the\s+change[^.]*can still be a\s+finding\./,
  );
});

test("/finalise still carries both CI readings the rule points at", () => {
  const finalise = read("skills/finalise/SKILL.md");
  assert.match(finalise, /CI reading 1/);
  assert.match(finalise, /CI reading 2/);
  assert.match(
    finalise,
    /\| `ci-reading-2` \| Step 7\.6c — CI reading 2 \| run \| run \|/,
    "bug mode must run CI reading 2 — develop-bug's verify loop defers CI to it",
  );
});
