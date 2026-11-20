/**
 * No payload heredoc in shipped prose (task.265 added the guard as a ratchet; task.284 emptied it).
 *
 * Shipped skill prose must not teach an agent to write a payload through a shell heredoc: an
 * unquoted one executes backticks and `$(…)` in the text, a quoted one ends early when the payload
 * holds its own delimiter line (obs #15, #88, #106). The rule and its replacements are in
 * file-write-rules.md.
 *
 * The allow-list the ratchet carried is gone: every site was moved to the file tool, so any match
 * is now a failure. The test file keeps its name so the references to it stay true.
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
import { loadSensitive } from "../spawn-budget.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..", "..");

// `cat`/`tee`, then (within 200 characters, no pipe) `<<` or `<<-`, optional spaces, an optional
// quote or backslash, and a delimiter word. The bound keeps a long line of repeated `cat` linear.
const PAYLOAD_HEREDOC =
  /\b(?:cat|tee)\b[^|\n]{0,200}<<-?[ \t]*[\\'"]?[A-Za-z_]+/;
const EXCLUDED = new Set(["shared/resources/security-input-corpus.md"]);

/** Payload-heredoc lines in `text`, trimmed. */
export function payloadHeredocLines(text) {
  return text
    .split("\n")
    .filter((line) => PAYLOAD_HEREDOC.test(line))
    .map((line) => line.trim());
}

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

/** Every payload-heredoc line in the population, as "file\ttext". */
function measure() {
  const found = [];
  for (const file of trackedPopulation()) {
    for (const line of payloadHeredocLines(
      fs.readFileSync(path.join(REPO_ROOT, file), "utf8"),
    )) {
      found.push(`${file}\t${line}`);
    }
  }
  return found;
}

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

test("calibration: a heredoc with a space after the operator, or a backslash delimiter, is counted", () => {
  const text = [
    "cat > a.md << EOF",
    "cat > b.md << 'EOF'",
    'cat > c.md << "EOF"',
    "cat > d.md <<\\EOF",
    "tee e.txt <<- EOF",
  ].join("\n");
  assert.equal(payloadHeredocLines(text).length, 5);
});

test("a long line of repeated cat is scanned in bounded time", () => {
  const started = Date.now();
  assert.equal(payloadHeredocLines("cat ".repeat(20000)).length, 0);
  const elapsed = Date.now() - started;
  assert.ok(
    elapsed < 500,
    loadSensitive(
      `long-line scan took ${elapsed}ms — the scan is quadratic again`,
    ),
  );
});

test("control: prose that mentions a heredoc, and a read loop, are not counted", () => {
  const text = [
    "Never write a body with `<<'EOF'` in shipped prose.",
    'while read -r l; do echo "$l"; done <<EOF',
    "cat file.md | grep '<<EOF'",
  ].join("\n");
  assert.equal(payloadHeredocLines(text).length, 0);
});

test("non-vacuity: the tracked population is read", () => {
  assert.ok(
    trackedPopulation().length > 100,
    "the tracked population looks too small to be the prose set",
  );
});

test("no payload heredoc is left in shipped prose", () => {
  assert.deepEqual(
    measure(),
    [],
    "A payload heredoc is in shipped prose. Write the file with the file tool and pass it by path " +
      "(shared/resources/file-write-rules.md#the-rule).",
  );
});
