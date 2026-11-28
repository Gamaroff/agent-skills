// review-story's doc-link pin blocks bind their own inputs (task 333 follow-up, gate 2 CR-1/CR-2).
//
// Step 9.6's Jira block and Step 10's status-push block read $STORY_FILE_PATH and $PIN_BRANCH. Each
// fenced block runs as its own shell, and neither bound them, so a block run as written sent
// `--file ""` to sync-jira-story and dropped the pinned branch. Each block now takes both as
// substituted inputs and HALTs on a placeholder left verbatim. The resolve block prints PIN_BRANCH
// so the agent can carry it.
//
// These cases RUN the blocks, under bash and zsh, with a stub `node` that prints its argv one per
// line, so the assertions are on the arguments the sync would receive, not on the prose.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { extractBlocks, zshAvailable } from "../qa-execute-snippets.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);
const SKILL = path.join(ROOT, "skills/review-story/SKILL.md");
const md = fs.readFileSync(SKILL, "utf8");
const blocks = extractBlocks(md);

const RESOLVE = blocks.filter((b) =>
  b.code.includes("Prefer develop, fall back to repo default branch"),
);
const SYNCS = blocks.filter(
  (b) =>
    b.code.includes("sync-jira-story/scripts/sync-jira-story.js") &&
    b.code.includes("PIN_ARGS"),
);

const SHELLS = ["bash", ...(zshAvailable() ? ["zsh"] : [])];

// Replace a `NAME="{…}"` input line with a value. A block that has no such line keeps reading the
// name unbound, which is the defect: the assertions below then see an empty value.
function bind(code, values) {
  let out = code;
  for (const [name, value] of Object.entries(values)) {
    out = out.replace(
      new RegExp(`^(\\s*)${name}="\\{[^}\\n]*\\}"$`, "m"),
      `$1${name}="${value}"`,
    );
  }
  return out;
}

function sandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "review-story-pin-"));
  const bin = path.join(dir, "bin");
  fs.mkdirSync(bin);
  fs.writeFileSync(
    path.join(bin, "node"),
    '#!/bin/sh\nfor a in "$@"; do printf "ARG:%s\\n" "$a"; done\n',
    { mode: 0o755 },
  );
  const story = path.join(dir, "story.1.2.3.example.md");
  fs.writeFileSync(story, "---\nstatus: draft\n---\n# Story\n");
  spawnSync("git", ["init", "-q"], { cwd: dir });
  return { dir, bin, story };
}

function run(shell, code, sb) {
  const r = spawnSync(shell, ["-c", code], {
    cwd: sb.dir,
    encoding: "utf8",
    // STORY_FILE_PATH and PIN_BRANCH are deliberately absent: a block must not depend on the caller's env.
    env: { PATH: `${sb.bin}:${process.env.PATH}`, HOME: sb.dir },
  });
  const args = r.stdout
    .split("\n")
    .filter((l) => l.startsWith("ARG:"))
    .map((l) => l.slice(4));
  return { ...r, args };
}

test("population: one resolve block and two pin-carrying sync blocks", () => {
  assert.equal(RESOLVE.length, 1, "the Step 9.6 resolve block");
  assert.equal(
    SYNCS.length,
    2,
    "Step 9.6's Jira block and Step 10's status push",
  );
});

for (const shell of SHELLS) {
  for (const [i, block] of SYNCS.entries()) {
    const label = `[${shell}] sync block ${i + 1} (line ${block.line})`;

    test(`${label}: a pinned branch reaches the sync as two words, with the story path`, () => {
      const sb = sandbox();
      const r = run(
        shell,
        bind(block.code, { STORY_FILE_PATH: sb.story, PIN_BRANCH: "develop" }),
        sb,
      );
      assert.equal(r.status, 0, r.stderr + r.stdout);
      const f = r.args.indexOf("--file");
      assert.ok(f >= 0, `no --file in ${JSON.stringify(r.args)}`);
      assert.equal(r.args[f + 1], sb.story);
      const d = r.args.indexOf("--doc-branch");
      assert.ok(d >= 0, `no --doc-branch in ${JSON.stringify(r.args)}`);
      assert.equal(r.args[d + 1], "develop");
    });

    test(`${label}: an empty PIN_BRANCH passes no --doc-branch`, () => {
      const sb = sandbox();
      const r = run(
        shell,
        bind(block.code, { STORY_FILE_PATH: sb.story, PIN_BRANCH: "" }),
        sb,
      );
      assert.equal(r.status, 0, r.stderr + r.stdout);
      assert.equal(r.args[r.args.indexOf("--file") + 1], sb.story);
      assert.ok(!r.args.includes("--doc-branch"), JSON.stringify(r.args));
    });

    test(`${label}: run verbatim it HALTs before the sync`, () => {
      const sb = sandbox();
      const r = run(shell, block.code, sb);
      assert.equal(r.status, 1);
      assert.match(
        r.stdout,
        /HALT: STORY_FILE_PATH and PIN_BRANCH must be substituted/,
      );
      assert.deepEqual(r.args, []);
    });
  }

  test(`[${shell}] resolve block: run verbatim it HALTs; substituted it prints PIN_BRANCH`, () => {
    const sb = sandbox();
    const verbatim = run(shell, RESOLVE[0].code, sb);
    assert.equal(verbatim.status, 1);
    assert.match(verbatim.stdout, /HALT: STORY_FILE_PATH must be substituted/);
    const bound = run(
      shell,
      bind(RESOLVE[0].code, { STORY_FILE_PATH: sb.story }),
      sb,
    );
    assert.equal(bound.status, 0, bound.stderr + bound.stdout);
    assert.match(
      bound.stdout,
      /^PIN_BRANCH=$/m,
      "no origin here, so nothing is pinned and the value is printed empty",
    );
  });
}
