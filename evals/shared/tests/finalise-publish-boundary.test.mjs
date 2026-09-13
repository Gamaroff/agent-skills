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

/** Fenced lines with comments removed — a `#` comment that *mentions* a command is not a call. */
function codeLines(text) {
  return fencedLines(text)
    .filter((l) => !/^\s*#/.test(l))
    .map((l) => l.replace(/\s+#\s.*$/, ""));
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
      if (/>\s*\/dev\/null|2>&1|\|\|\s*(true\b|:(?=[\s;)&|]|$))/.test(line))
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
    !codeLines(sixA).some((l) => /--allow-empty/.test(l)),
    "`--allow-empty` is forbidden at the acceptance commit",
  );
});

// ---------------------------------------------------------------------------
// 2b/3b. The two defects QA cycle 1 found by executing the prose (CR-1, CR-2)

test("6c never sleeps in the foreground — the poll is a backgrounded script read from a result file", () => {
  const sixC = between(
    finalise,
    "6c. **Second CI reading",
    "6d. **CHANGELOG citation check",
    FINALISE,
  );
  // Strip the poll script's own body (the quoted heredoc) — a `sleep` INSIDE the background
  // script is the design; a `sleep` OUTSIDE it is the foreground wait this test forbids.
  const outsideHeredoc = sixC.replace(
    /cat > "\$POLL" <<'POLLEOF'[\s\S]*?\nPOLLEOF\n/,
    "",
  );
  assert.match(
    sixC,
    /<<'POLLEOF'[\s\S]*\nPOLLEOF\n/,
    "6c must write the poll loop to a script via a heredoc",
  );
  assert.match(
    sixC,
    /nohup bash "\$POLL"[\s\S]*?&\s*$/m,
    "6c must launch the poll with nohup … & (backgrounded)",
  );
  const foregroundSleeps = codeLines(outsideHeredoc).filter((l) =>
    /\bsleep\b/.test(l),
  );
  assert.deepEqual(
    foregroundSleeps,
    [],
    "a fenced `sleep` outside the backgrounded script is a foreground wait that outlives the tool call (QA cycle 1, CR-2)",
  );
  assert.match(
    sixC,
    /\[ ! -f "\$RESULT" \]/,
    "6c must read the result file on a later turn rather than wait for it",
  );
});

test("6d derives the task number without BASH_REMATCH, so it fires under zsh too", () => {
  const sixD = between(
    finalise,
    "6d. **CHANGELOG citation check",
    "7. **Add Canonical PR Comment",
    FINALISE,
  );
  assert.ok(
    !codeLines(sixD).some((l) => /BASH_REMATCH/.test(l)),
    "BASH_REMATCH is unset under zsh — N was empty and the grep matched everything (QA cycle 1, CR-1)",
  );
  assert.match(
    sixD,
    /N="\$\{STEM#task\.\}"/,
    "6d derives N by parameter expansion",
  );
  assert.match(
    sixD,
    /\[\[ "\$N" =~ \^\[0-9\]\+\$ \]\]/,
    "6d guards N with a capture-free numeric match",
  );
});

test("6a's acceptance commit is guarded, so a re-run with nothing staged is not reported as a rejection", () => {
  const sixA = between(
    finalise,
    "6a. **Acceptance commit + push.**",
    "6b. **Tracked-and-pushed assertions.**",
    FINALISE,
  );
  const code = codeLines(sixA);
  const guardIdx = code.findIndex((l) =>
    /if git diff --cached --quiet; then/.test(l),
  );
  const commitIdx = code.findIndex((l) => /^\s*git commit\b/.test(l));
  assert.ok(
    guardIdx !== -1,
    "6a must test `git diff --cached --quiet` before committing (5c CR-2)",
  );
  assert.ok(
    commitIdx > guardIdx,
    "the guard must precede the commit, not follow it",
  );
});

test("6c creates .claude/state, records the poll pid, and HALTs a dead poll with no result", () => {
  const sixC = between(
    finalise,
    "6c. **Second CI reading",
    "6d. **CHANGELOG citation check",
    FINALISE,
  );
  const code = codeLines(sixC);
  assert.ok(
    code.some((l) => /^\s*mkdir -p \.claude\/state\b/.test(l)),
    "6c must `mkdir -p .claude/state` — the directory is gitignored and absent in a fresh worktree (5c CR-3)",
  );
  assert.ok(
    code.some((l) => /echo \$! > "\$PIDFILE"/.test(l)),
    "6c must record the poll pid",
  );
  assert.ok(
    code.some((l) => /kill -0 "\$\(cat "\$PIDFILE"\)"/.test(l)),
    'the later-turn read must check the poll is alive before saying "still polling"',
  );
});

test("the orchestrator's dirty-document rule exempts the Jira sync's frontmatter residue", () => {
  const step7doc = read(STEP7);
  const boundary = between(
    step7doc,
    "## The publish boundary",
    "## Post DoD Body to PR",
    STEP7,
  );
  assert.match(
    boundary,
    /jira_last_\(synced_at\|body_hash\|meta_hash\)/,
    `${STEP7}: the mechanical check must exempt exactly the three jira_last_* keys sync-jira rewrites after the 6a commit (5c CR-1)`,
  );
  assert.match(
    boundary,
    /HALT: \$f carries changes beyond the Jira sync residue/,
    `${STEP7}: any other change to the document must still HALT`,
  );
  assert.match(
    read(STEP8),
    /jira_last_\*/,
    `${STEP8} must name the same residue so the two docs agree`,
  );
});

test("6a reads the exit code of every `git add`, so a staging failure cannot pose as the idempotent path", () => {
  const sixA = between(
    finalise,
    "6a. **Acceptance commit + push.**",
    "6b. **Tracked-and-pushed assertions.**",
    FINALISE,
  );
  const code = codeLines(sixA);
  const adds = code.filter((l) => /^\s*git add\b/.test(l)).length;
  const checks = code.filter((l) => /ADD_EXIT=\$\?/.test(l)).length;
  assert.ok(
    adds >= 2,
    "6a stages the artefacts and (conditionally) the registry — two add sites expected",
  );
  assert.equal(
    checks,
    adds,
    "every `git add` in 6a must be followed by an ADD_EXIT=$? capture (5c pass 2, CR-1)",
  );
  const firstAdd = code.findIndex((l) => /^\s*git add\b/.test(l));
  const guard = code.findIndex((l) =>
    /if git diff --cached --quiet; then/.test(l),
  );
  assert.ok(
    firstAdd < guard,
    "the adds (and their exit checks) precede the idempotency guard",
  );
});

test("the residue check diffs against HEAD and filters only the two diff header lines", () => {
  const boundary = between(
    read(STEP7),
    "## The publish boundary",
    "## Post DoD Body to PR",
    STEP7,
  );
  const code = codeLines(boundary);
  const diffLine = code.find((l) => /git diff .*-- "\$f"/.test(l));
  assert.ok(diffLine, `${STEP7}: the residue check must diff the document`);
  assert.match(
    diffLine,
    /git diff HEAD -- "\$f"/,
    "a staged-but-uncommitted document has an empty unstaged diff — diff against HEAD (5c pass 2, CR-3)",
  );
  assert.match(
    diffLine,
    /grep -vE '\^\(\\\+\\\+\\\+\|---\) '/,
    "filter exactly the +++/--- header lines — `^[+-][^+-]` also drops changed bullets (5c pass 2, CR-2)",
  );
  assert.ok(
    !code.some((l) => /\^\[\+-\]\[\^\+-\]/.test(l)),
    "the bullet-dropping filter must not come back",
  );
});

test("6c head-binds the second reading: the poll records the sampled PR head and the later turn re-derives CI_HEAD_2", () => {
  const sixC = between(
    finalise,
    "6c. **Second CI reading",
    "6d. **CHANGELOG citation check",
    FINALISE,
  );
  assert.match(
    sixC,
    /sampled_head\(\) \{ gh pr view "\$PR_NUMBER" --json headRefOid/,
    "the poll script must read the head CI was sampled on from the PR, not echo its argument (5c pass 2, CR-4)",
  );
  assert.match(
    sixC,
    /"\$\(sampled_head\)" "\$WAITED" > "\$RESULT"/,
    "the result line carries the sampled head",
  );
  assert.ok(
    codeLines(sixC).some((l) =>
      /CI_HEAD_2=\$\{CI_HEAD_2:-\$\(git rev-parse HEAD\)\}/.test(l),
    ),
    "the later-turn read must re-derive CI_HEAD_2 — a fresh shell has no earlier variable",
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
