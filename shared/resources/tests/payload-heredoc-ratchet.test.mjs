/**
 * Payload-heredoc ratchet (task.265).
 *
 * Shipped skill prose must not teach an agent to write a payload through a shell heredoc: an
 * unquoted one executes backticks and `$(…)` in the text, a quoted one ends early when the payload
 * holds its own delimiter line (obs #15, #88, #106). The rule and its replacements are in
 * file-write-rules.md.
 *
 * This is a ratchet, not a ban: 32 sites remain today and are allow-listed by file and line text.
 * A new heredoc fails the test; so does an allow-list entry whose line has gone, which makes each
 * removal a visible deletion here. Moving the 32 sites off is a separate task.
 *
 * Definition (the same one the task measured): a line holding `cat` or `tee`, then a `<<` or `<<-`
 * redirect with a word delimiter, with no pipe between them. Population: tracked
 * `skills/*\/SKILL.md` and `shared/resources/*.md`, minus the security corpus, whose rows are test
 * data. The population comes from `git ls-files`, so a gitignored symlink cannot change it.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..", "..");

const PAYLOAD_HEREDOC = /(cat|tee)[^|\n]*<<-?['"]?[A-Za-z_]+['"]?/;
const EXCLUDED = new Set(["shared/resources/security-input-corpus.md"]);

/** Payload-heredoc lines in `text`, trimmed. */
export function payloadHeredocLines(text) {
  return text
    .split("\n")
    .filter((line) => PAYLOAD_HEREDOC.test(line))
    .map((line) => line.trim());
}

/** Compare found "file\ttext" -> count against the allow-list; both directions are findings. */
export function diffAgainstAllowlist(found, allowed) {
  const added = [];
  const stale = [];
  for (const [key, n] of found) {
    const ok = allowed.get(key) ?? 0;
    if (n > ok) added.push(`${key} (found ${n}, allowed ${ok})`);
  }
  for (const [key, ok] of allowed) {
    const n = found.get(key) ?? 0;
    if (n < ok) stale.push(`${key} (found ${n}, allowed ${ok})`);
  }
  return { added, stale };
}

const A = "cat > .claude/state/comment-body.md <<EOF";
const AQ = "cat > .claude/state/comment-body.md <<'EOF'";
const ISSUE = "cat > .claude/state/issue-body.md <<EOF";
const LOCK = "cat > .claude/state/develop-pipeline.lock <<EOF";
const FINDINGS = "cat > \"$FINDINGS_JSON\" <<'JSON'";
const BODY = "cat > \"$BODY_FILE\" <<'EOF'";

// [file, line text, count]. Delete an entry in the commit that removes its heredoc.
const ALLOWLIST = [
  [
    "shared/resources/develop-pipeline-resume-contract.md",
    "cat > \"{doc-directory}/.summaries/step-0a-resume-detector.json\" <<'DETECTOR_EOF'",
    1,
  ],
  ["shared/resources/develop-pipeline-step-0-resolve-and-prepare.md", A, 1],
  ["shared/resources/develop-pipeline-step-1-create-branch.md", LOCK, 2],
  ["shared/resources/develop-pipeline-step-2-review.md", AQ, 3],
  ["shared/resources/develop-pipeline-step-3-develop-loop.md", AQ, 2],
  ["shared/resources/develop-pipeline-step-4-create-pr.md", A, 1],
  ["shared/resources/develop-pipeline-step-7-finalise.md", A, 3],
  ["shared/resources/tracker-comment-contract.md", AQ, 1],
  ["skills/create-issue/SKILL.md", "cat > \"$body_file\" <<'EOF'", 1],
  ["skills/create-pr/SKILL.md", A, 2],
  ["skills/ensure-bug-github-issue/SKILL.md", ISSUE, 1],
  ["skills/ensure-epic-github-issue/SKILL.md", ISSUE, 1],
  ["skills/ensure-story-github-issue/SKILL.md", ISSUE, 1],
  ["skills/ensure-task-github-issue/SKILL.md", ISSUE, 1],
  ["skills/finalise/SKILL.md", A, 2],
  [
    "skills/finalise/SKILL.md",
    "cat > .claude/state/finalise-fix-finding.json <<'JSON'",
    1,
  ],
  ["skills/qa-story/SKILL.md", FINDINGS, 1],
  ["skills/qa-story/SKILL.md", BODY, 1],
  ["skills/qa-task/SKILL.md", FINDINGS, 1],
  ["skills/qa-task/SKILL.md", BODY, 1],
  ["skills/review-bug/SKILL.md", A, 1],
  ["skills/review-story/SKILL.md", AQ, 1],
  ["skills/review-task/SKILL.md", A, 2],
];

const allowed = new Map(ALLOWLIST.map(([f, t, n]) => [`${f}\t${t}`, n]));

function trackedPopulation() {
  const out = execFileSync(
    "git",
    ["ls-files", "--", "skills/*/SKILL.md", "shared/resources/*.md"],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
    },
  );
  return out
    .split("\n")
    .filter(Boolean)
    .filter((f) => !EXCLUDED.has(f))
    .filter((f) => !f.startsWith("shared/resources/tests/"));
}

function measure() {
  const found = new Map();
  for (const file of trackedPopulation()) {
    for (const line of payloadHeredocLines(
      fs.readFileSync(path.join(REPO_ROOT, file), "utf8"),
    )) {
      const key = `${file}\t${line}`;
      found.set(key, (found.get(key) ?? 0) + 1);
    }
  }
  return found;
}

const total = (m) => [...m.values()].reduce((a, b) => a + b, 0);

test("calibration: a quoted and an unquoted payload heredoc are both counted", () => {
  const text = [
    "cat > a.md <<EOF",
    "body",
    "EOF",
    "cat > b.json <<'JSON'",
    "{}",
    "JSON",
    "tee out.txt <<-X",
  ].join("\n");
  assert.equal(payloadHeredocLines(text).length, 3);
});

test("control: prose that mentions a heredoc, and a read loop, are not counted", () => {
  const text = [
    "Never write a body with `<<'EOF'` in shipped prose.",
    'while read -r l; do echo "$l"; done <<EOF',
    "cat file.md | grep '<<EOF'",
  ].join("\n");
  assert.equal(payloadHeredocLines(text).length, 0);
});

test("the allow-list diff reports a new site and a stale entry", () => {
  const found = new Map([["f.md\tcat > x <<EOF", 2]]);
  const r = diffAgainstAllowlist(
    found,
    new Map([
      ["f.md\tcat > x <<EOF", 1],
      ["g.md\tcat > y <<EOF", 1],
    ]),
  );
  assert.equal(r.added.length, 1);
  assert.equal(r.stale.length, 1);
});

test("non-vacuity: the population is read and the allow-list holds 32 sites", () => {
  assert.ok(
    trackedPopulation().length > 100,
    "the tracked population looks too small to be the prose set",
  );
  assert.equal(
    [...allowed.values()].reduce((a, b) => a + b, 0),
    32,
  );
  assert.equal(total(measure()), 32);
});

test("no payload heredoc is added to shipped prose, and none is left allow-listed after removal", () => {
  const { added, stale } = diffAgainstAllowlist(measure(), allowed);
  assert.deepEqual(
    added,
    [],
    "A payload heredoc was added to shipped prose. Write the file with the file tool and pass it by path " +
      "(shared/resources/file-write-rules.md#the-rule).",
  );
  assert.deepEqual(
    stale,
    [],
    "An allow-listed heredoc is gone. Delete its entry from ALLOWLIST in payload-heredoc-ratchet.test.mjs.",
  );
});
