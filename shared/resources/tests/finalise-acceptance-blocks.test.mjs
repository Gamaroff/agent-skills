/**
 * The two fenced bash blocks task 271 added to skills/finalise/SKILL.md, executed under bash and zsh
 * (T271-QA-2, T271-QA-4). Step 3b.1 item 5a read the owner list with `read -a`, which zsh rejects,
 * so under zsh every deferral silently answered no-approver-configured. These tests run the block
 * as shipped, with its placeholders bound, and assert the engine's answer, not the block's text.
 *
 * Run via: CI=true node --test shared/resources/tests/finalise-acceptance-blocks.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  symlinkSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ROOT,
  SHELLS,
  readDoc,
  blockBy,
  bind,
  git,
  run,
} from "./lib/executed-prose.mjs";

const SKILL = readDoc("skills/finalise/SKILL.md");
const cleanup = (d) =>
  rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });

/** A directory shaped like a consumer: .agents/skills, a skills-config.yaml, a gate and a work item. */
function consumer(owners) {
  const dir = mkdtempSync(join(tmpdir(), "fin-blocks-"));
  mkdirSync(join(dir, ".agents"));
  symlinkSync(join(ROOT, "skills"), join(dir, ".agents", "skills"));
  if (owners !== null) {
    writeFileSync(
      join(dir, "skills-config.yaml"),
      `finalise:\n  deferralApprover: ${owners}\n`,
    );
  }
  writeFileSync(
    join(dir, "gate.yml"),
    [
      "schema: 1",
      "gate: PASS",
      "recommendations:",
      "  immediate: []",
      "  future:",
      "    - action: 'oc10-x reproduces'",
      "      deferred_to: task.901",
      "      approved_by: Pat Owner",
      "      approved_on: 2026-10-28",
      "",
    ].join("\n"),
  );
  writeFileSync(join(dir, "w.md"), "# T\n");
  return dir;
}

const blockFive = () => blockBy(SKILL, "APPROVER_ARGS", "item 5a block");
const item5a = (gate) =>
  bind(blockFive(), {
    "{case-id}": "oc10-x",
    "{gate-file}": gate,
    "{work-item}": "w.md",
  });

for (const shell of SHELLS) {
  test(`[${shell}] item 5a: a configured owner list reaches the matcher and the deferral matches`, () => {
    const dir = consumer("Pat Owner, Sam Two");
    try {
      const r = run(shell, item5a("gate.yml"), { cwd: dir });
      const out = JSON.parse(r.stdout.trim().split("\n").pop());
      assert.equal(out.reason, "matched", r.stderr);
      assert.equal(r.status, 0);
      assert.equal(out.owner, "Pat Owner");
    } finally {
      cleanup(dir);
    }
  });

  test(`[${shell}] item 5a control: no owner configured refuses (no-approver-configured, exit 1)`, () => {
    const dir = consumer(null);
    try {
      const r = run(shell, item5a("gate.yml"), { cwd: dir });
      const out = JSON.parse(r.stdout.trim().split("\n").pop());
      assert.equal(out.reason, "no-approver-configured");
      assert.equal(r.status, 1);
    } finally {
      cleanup(dir);
    }
  });

  test(`[${shell}] item 5a control: an owner who did not approve is unapproved, and an empty gate slot is read`, () => {
    const dir = consumer("Someone Else");
    try {
      const r = run(shell, item5a("gate.yml"), { cwd: dir });
      assert.equal(
        JSON.parse(r.stdout.trim().split("\n").pop()).reason,
        "unapproved",
      );
      // No gate file at all: the empty --gate array expands to nothing and the work item decides.
      const noGate = run(shell, item5a(""), { cwd: dir });
      assert.equal(
        JSON.parse(noGate.stdout.trim().split("\n").pop()).reason,
        "no-match",
      );
    } finally {
      cleanup(dir);
    }
  });

  test(`[${shell}] re-run block: newline-delimited failed files, a placeholder and an in-diff file are all read`, () => {
    const dir = mkdtempSync(join(tmpdir(), "fin-rerun-"));
    try {
      git(dir, "init", "-q", "-b", "main");
      git(dir, "config", "user.email", "t@example.com");
      git(dir, "config", "user.name", "t");
      git(dir, "config", "commit.gpgsign", "false");
      git(dir, "config", "maintenance.auto", "false");
      git(dir, "config", "gc.auto", "0");
      mkdirSync(join(dir, "src"));
      writeFileSync(join(dir, "src", "a.js"), "a\n");
      writeFileSync(join(dir, "src", "other.test.js"), "t\n");
      git(dir, "add", "-A");
      git(dir, "commit", "-q", "-m", "base");
      git(dir, "checkout", "-q", "-b", "feature/x");
      writeFileSync(join(dir, "src", "a.js"), "a2\n");
      git(dir, "commit", "-qam", "pr change");
      const green = git(dir, "rev-parse", "HEAD").trim();
      mkdirSync(join(dir, "docs"));
      writeFileSync(join(dir, "docs", "n.md"), "n\n");
      git(dir, "add", "-A");
      git(dir, "commit", "-q", "-m", "docs");
      mkdirSync(join(dir, ".agents"));
      symlinkSync(join(ROOT, "skills"), join(dir, ".agents", "skills"));

      const block = (files) =>
        bind(blockBy(SKILL, "FAILED_ARGS", "re-run block"), {
          "{green-head}": green,
          "{pr-base}": "main",
          "{attempts}": "0",
          "{failed-files}": "FILES_SENTINEL",
        }).replace("FILES_SENTINEL", () => files);
      const reason = (files) => {
        const r = run(shell, block(files), { cwd: dir });
        return JSON.parse(r.stdout.trim().split("\n").pop()).reason;
      };
      assert.equal(reason("src/other.test.js"), "eligible");
      // A path with a space is one path, not two words (and is not a glob).
      assert.equal(reason("src/with space.test.js"), "eligible");
      assert.equal(reason("src/other.test.js\nsrc/a.js"), "in-diff");
      // The placeholder left unsubstituted must never read as a file outside the diff.
      assert.equal(reason("{failed-files}"), "bad-failed-file");
      // An empty list is no-failed-file, through the empty-array expansion.
      assert.equal(reason(""), "no-failed-file");
    } finally {
      cleanup(dir);
    }
  });
}
