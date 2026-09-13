/**
 * Protocol-shape guard for `/finalise`'s publish boundary (task.115).
 *
 * `/finalise` Step 7 is the pipeline's publish step. Four observations recorded
 * that its checks ran before its own writes, or checked the wrong artefact, or did
 * not exist: a DoD header reading IN PROGRESS above a verdict reading ACCEPTED
 * (#57); a CI rollup read on an ancestor of the commit that carried the
 * acceptance (#40); a PASS gate certifying a working tree whose commit had been
 * rejected by a hook and swallowed by `>/dev/null 2>&1 || true` (#48); and a
 * CHANGELOG checklist box with no mechanism behind it (#59).
 *
 * The fix is prose — a reorder of Step 7 and three assertions — and prose is
 * executed by a reader, so a later edit can undo the order without any test
 * noticing. This file is what notices. Each assertion below is the mechanical
 * form of one sentence in the task's Success Criteria:
 *
 *   1. the DoD running summary carries its status in exactly one place
 *   2. the acceptance commit + push happens BEFORE the first outward side-effect,
 *      and the second CI reading sits between them
 *   3. artefact checks are tracked-and-pushed, and no code line suppresses a
 *      `git commit`'s output or exit status
 *   4. the CHANGELOG check exists in `/finalise`, and the release checklist names
 *      both the drift test and the advisory→blocking flip
 *
 * Sources are the `shared/resources/` and `skills/finalise/` files — never the
 * bundled `references/` copies, which `npm run bundle` regenerates.
 *
 * Run via: node --test evals/shared/tests/finalise-publish-boundary.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const read = (p) => readFileSync(path.join(REPO_ROOT, p), "utf8");

const FINALISE = "skills/finalise/SKILL.md";
const STEP7 = "shared/resources/develop-pipeline-step-7-finalise.md";
const STEP8 = "shared/resources/develop-pipeline-step-8-commit.md";
const QA_LOOP = "shared/resources/develop-pipeline-step-5-6-qa-loop.md";
const RELEASES = "docs/contributing/releases.md";
const DRIFT_TEST = "evals/shared/tests/changelog-entry-drift.test.mjs";

const finalise = read(FINALISE);

/** The text between two headings/markers, asserting both exist and are ordered. */
function between(text, startMarker, endMarker, file) {
  const a = text.indexOf(startMarker);
  const b = text.indexOf(endMarker, a + 1);
  assert.ok(a !== -1, `${file}: missing "${startMarker}"`);
  assert.ok(b !== -1, `${file}: missing "${endMarker}" after "${startMarker}"`);
  return text.slice(a, b);
}

/** Lines inside ```-fenced blocks only — prose that *talks about* a command is not a call site. */
function fencedLines(text) {
  const out = [];
  let inFence = false;
  for (const line of text.split("\n")) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) out.push(line);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 1. One status location (obs #57)

test("the DoD running-summary template carries no `**Status:**` header line", () => {
  const step0 = between(finalise, "### Step 0:", "### Step 1:", FINALISE);
  const template = between(
    step0,
    "# Definition of Done Verification",
    "## Verification Results",
    FINALISE,
  );
  assert.ok(
    !/\*\*Status:\*\*/.test(template),
    "the running summary's header has a `**Status:**` line again — its status is `**Final Status:**` in `## Verification Complete`, and nowhere else (task.115, obs #57)",
  );
});

test("Step 7 and Step 8 no longer instruct a status flip in the running summary", () => {
  assert.ok(
    !/Update status from "IN PROGRESS"/.test(finalise),
    'the "Update status from IN PROGRESS to COMPLETED - …" instruction is back — there is no header status to flip',
  );
  const step7 = between(finalise, "### Step 7:", "### Step 8:", FINALISE);
  assert.match(
    step7,
    /\*\*Final Status:\*\* ✅ ACCEPTED/,
    "Step 7 must still write the one status line",
  );
});

// ---------------------------------------------------------------------------
// 2. Publish after the last write (obs #40)

test("Step 7 orders: local writes → acceptance commit+push → second CI reading → PR comment → tracker", () => {
  const step7 = between(finalise, "### Step 7:", "### Step 8:", FINALISE);
  const idx = (marker) => {
    const i = step7.indexOf(marker);
    assert.ok(i !== -1, `${FINALISE} Step 7: missing "${marker}"`);
    return i;
  };
  const sprintReview = idx("6. **Generate Sprint Review Summary:**");
  const commit = idx("6a. **Acceptance commit + push.**");
  const assertions = idx("6b. **Tracked-and-pushed assertions.**");
  const ciRead = idx("6c. **Second CI reading");
  const changelog = idx("6d. **CHANGELOG citation check");
  const prComment = idx("7. **Add Canonical PR Comment");
  const tracker = idx("8. **Move Tracker Issue to Done:**");
  assert.ok(
    sprintReview < commit,
    "the acceptance commit must follow the last local write (sprint review)",
  );
  assert.ok(
    commit < assertions && assertions < ciRead,
    "commit → assertions → second CI reading, in that order",
  );
  assert.ok(
    ciRead < changelog && changelog < prComment,
    "the second CI reading and the CHANGELOG check both precede the first outward side-effect",
  );
  assert.ok(prComment < tracker, "PR comment before tracker close, as before");
});

test("both CI readings carry a head, and the second is the pushed acceptance head", () => {
  const step6 = between(finalise, "### Step 6:", "### Step 7:", FINALISE);
  assert.match(
    step6,
    /CI_HEAD_1=\$\(git rev-parse HEAD\)/,
    "Step 6 records the head reading 1 was taken on",
  );
  const step7 = between(finalise, "### Step 7:", "### Step 8:", FINALISE);
  assert.match(
    step7,
    /CI_HEAD_2=\$\(git rev-parse HEAD\)/,
    "6a records the pushed acceptance head",
  );
  assert.match(
    step7,
    /ci-not-green-on-acceptance-head/,
    "6c names its HALT reason",
  );
  assert.match(
    step7,
    /\*\*CI reading 1\*\*: \$\{CI_ROLLUP\} @/,
    "the PR canonical comment carries reading 1 with its head",
  );
  assert.match(
    step7,
    /\*\*CI reading 2\*\*: \$\{CI_ROLLUP_2\} @/,
    "the PR canonical comment carries reading 2 with its head",
  );
  // The PR head must be compared to the pushed head before reading CI on it — never gate one commit and read another.
  assert.match(
    step7,
    /PR_HEAD:0:12\}" = "\$\{CI_HEAD_2:0:12\}/,
    "6c asserts PR head == pushed acceptance head",
  );
});

test("the orchestrator's Step 8 commits the implementation report only", () => {
  const step8 = read(STEP8);
  assert.match(
    step8,
    /implementation report and nothing else new/,
    `${STEP8} must state that the acceptance artefacts are no longer its cargo`,
  );
  assert.match(
    step8,
    /Step 7 action 6a/,
    `${STEP8} must point at where the acceptance commit now happens`,
  );
  const step7doc = read(STEP7);
  assert.match(
    step7doc,
    /## The publish boundary/,
    `${STEP7} must describe what /finalise has already done before it returns`,
  );
  assert.match(
    step7doc,
    /CI reading 2/,
    `${STEP7} must tell the orchestrator where reading 2 is recorded`,
  );
});

// ---------------------------------------------------------------------------
// 3. A gate describes a working tree; a PR describes a branch (obs #48)

test("artefact checks assert tracked-and-pushed at /finalise 6b, the DoD-to-PR post, and 5c", () => {
  for (const [file, text, where] of [
    [
      FINALISE,
      between(
        finalise,
        "6b. **Tracked-and-pushed assertions.**",
        "6c. **Second CI reading",
        FINALISE,
      ),
      "6b",
    ],
    [
      STEP7,
      between(
        read(STEP7),
        "## Post DoD Body to PR",
        "## Tracker Issue Update",
        STEP7,
      ),
      "Post DoD Body to PR",
    ],
    [
      QA_LOOP,
      between(
        read(QA_LOOP),
        "#### Assert the trail is on the branch",
        "#### Invoke the review",
        QA_LOOP,
      ),
      "5c",
    ],
  ]) {
    assert.match(
      text,
      /git ls-files --error-unmatch/,
      `${file} ${where}: must assert the artefact is tracked`,
    );
    assert.match(
      text,
      /git show "origin\/\$\{BRANCH\}:/,
      `${file} ${where}: must assert the artefact is on the remote branch`,
    );
  }
});

test("no fenced `git commit` line suppresses its output or exit status", () => {
  const offenders = [];
  for (const file of [FINALISE, STEP7, STEP8, QA_LOOP]) {
    for (const line of fencedLines(read(file))) {
      if (!/^\s*git commit\b/.test(line)) continue;
      if (/>\s*\/dev\/null|2>&1|\|\|\s*(true|:)\b/.test(line))
        offenders.push(`${file}: ${line.trim()}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "a `git commit` whose rejection is swallowed is how a PASS gate certified an unpushed tree (obs #48)",
  );
  // Non-vacuity: the rule has at least one call site to bind to.
  const commits = fencedLines(finalise).filter((l) =>
    /^\s*git commit\b/.test(l),
  );
  assert.ok(
    commits.length >= 1,
    `${FINALISE} has no fenced \`git commit\` line — 6a's acceptance commit is missing`,
  );
});

test("6a reads the commit's and the push's exit codes", () => {
  const sixA = between(
    finalise,
    "6a. **Acceptance commit + push.**",
    "6b. **Tracked-and-pushed assertions.**",
    FINALISE,
  );
  assert.match(
    sixA,
    /COMMIT_EXIT=\$\?/,
    "the commit's exit status is captured",
  );
  assert.match(sixA, /PUSH_EXIT=\$\?/, "the push's exit status is captured");
  assert.ok(
    !/--allow-empty/.test(sixA.replace(/Never reach for `--allow-empty`/, "")),
    "`--allow-empty` is forbidden at the acceptance commit",
  );
});

// ---------------------------------------------------------------------------
// 4. The CHANGELOG box has a mechanism (obs #59)

test("/finalise warns `no-changelog-entry`, and the release checklist names the test and the flip", () => {
  const sixD = between(
    finalise,
    "6d. **CHANGELOG citation check",
    "7. **Add Canonical PR Comment",
    FINALISE,
  );
  assert.match(sixD, /no-changelog-entry/, "6d names its reason token");
  assert.match(sixD, /\[Unreleased\]/, "6d reads the [Unreleased] section");
  assert.match(
    sixD,
    /advisory/i,
    "6d is advisory in this release — the flip is a release decision",
  );

  const releases = read(RELEASES);
  assert.ok(
    existsSync(path.join(REPO_ROOT, DRIFT_TEST)),
    `${DRIFT_TEST} does not exist`,
  );
  assert.match(
    releases,
    new RegExp(DRIFT_TEST.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `${RELEASES} must name the drift test`,
  );
  assert.match(
    releases,
    /\(task 115\)/,
    `${RELEASES} must show the citation convention with a real example`,
  );
  assert.match(
    releases,
    /Flip the CHANGELOG check from advisory to blocking/,
    `${RELEASES} must carry the flip as a checklist line`,
  );
});
