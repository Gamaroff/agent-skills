"use strict";
/**
 * JSON is piped to jq with `printf '%s'`, never `echo` (obs #284).
 *
 * An agent runs a skill's bash snippet in whatever shell its harness gives it.
 * Under zsh, and under dash (Ubuntu's /bin/sh), `echo` expands backslash
 * escapes, so the `\n` inside a JSON string becomes a raw newline and jq rejects
 * the whole document. `create-pr` read `PR_URL=$(echo "$PR_RESPONSE" | jq …)`;
 * under zsh it came back empty for a PR that had been created, and the skill's
 * next instruction ("report and halt") invites a retry that opens a duplicate.
 *
 * Scope: Markdown an agent executes — `skills/*​/SKILL.md` and
 * `shared/resources/*.md`, lines inside fenced code blocks only (a sentence that
 * names the bad shape is not a call site). Shell scripts are out of scope: they
 * run under their `bash` shebang, and bash's `echo` leaves backslashes alone.
 * `skills/*​/references/` is bundle output and is excluded, as in
 * tests/mutation-call-site-coverage.test.js.
 *
 * Run: node --test tests/json-echo-to-jq.test.js
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const test = require("node:test");
const assert = require("node:assert/strict");

const REPO_ROOT = path.resolve(__dirname, "..");
const BAD = /\becho\s+"\$\{?[A-Za-z_][A-Za-z0-9_]*\}?"\s*\|\s*jq\b/;

function canonicalSources() {
  const out = [];
  for (const skill of fs.readdirSync(path.join(REPO_ROOT, "skills"))) {
    const f = path.join("skills", skill, "SKILL.md");
    if (fs.existsSync(path.join(REPO_ROOT, f))) out.push(f);
  }
  for (const f of fs.readdirSync(path.join(REPO_ROOT, "shared", "resources"))) {
    if (f.endsWith(".md")) out.push(path.join("shared", "resources", f));
  }
  return out;
}

/** Lines inside fenced code blocks, with their 1-based line numbers. */
function fencedLines(text) {
  const lines = text.split("\n");
  const out = [];
  let fence = null;
  lines.forEach((line, i) => {
    const m = /^\s*(`{3,}|~{3,})/.exec(line);
    if (m) {
      if (fence === null) fence = m[1];
      else if (m[1][0] === fence[0] && m[1].length >= fence.length)
        fence = null;
      return;
    }
    if (fence !== null) out.push({ n: i + 1, line });
  });
  return out;
}

test("premise: echo breaks JSON with an escaped newline in shells agents run; printf does not", (t) => {
  // A response whose string holds `\n`, as any PR description does.
  const json = '{"d":"line one\\nline two","url":"https://x.invalid/pr/1"}';
  const shells = ["zsh", "dash"].filter(
    (sh) => spawnSync(sh, ["-c", "exit 0"]).status === 0,
  );
  if (shells.length === 0) {
    t.skip(
      "neither zsh nor dash is installed, so the premise cannot be shown here",
    );
    return;
  }
  for (const sh of shells) {
    const run = (cmd) =>
      spawnSync(sh, ["-c", cmd], {
        env: { ...process.env, R: json },
        encoding: "utf8",
      });
    const viaEcho = run(`echo "$R" | jq -r '.url // empty'`);
    const viaPrintf = run(`printf '%s' "$R" | jq -r '.url // empty'`);
    assert.notEqual(
      viaEcho.stdout.trim(),
      "https://x.invalid/pr/1",
      `${sh}: echo did not break the JSON, so the premise of this guard is false here`,
    );
    assert.equal(viaPrintf.stdout.trim(), "https://x.invalid/pr/1", sh);
  }
});

test("no executed Markdown pipes a shell variable to jq through echo", () => {
  const files = canonicalSources();
  // Non-vacuity: the scan must have read the corpus, not nothing.
  assert.ok(files.length > 50, `only ${files.length} sources found`);
  let scanned = 0;
  const hits = [];
  for (const rel of files) {
    const text = fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
    for (const { n, line } of fencedLines(text)) {
      scanned += 1;
      if (BAD.test(line)) hits.push(`${rel}:${n}: ${line.trim()}`);
    }
  }
  assert.ok(scanned > 1000, `only ${scanned} fenced lines scanned`);
  assert.deepEqual(
    hits,
    [],
    `pipe JSON with printf '%s' "$VAR" | jq, not echo (obs #284):\n${hits.join("\n")}`,
  );
});

test("the guard's pattern matches the shape it exists for and passes the fix", () => {
  assert.ok(BAD.test(`PR_URL=$(echo "$PR_RESPONSE" | jq -r '.x')`));
  assert.ok(BAD.test(`if echo "\${BB_RESP}" | jq -e '.id' >/dev/null; then`));
  assert.ok(!BAD.test(`PR_URL=$(printf '%s' "$PR_RESPONSE" | jq -r '.x')`));
  assert.ok(!BAD.test(`echo "done" | tee log`));
});
