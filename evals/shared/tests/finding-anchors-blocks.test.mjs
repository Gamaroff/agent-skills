/**
 * The four dispatcher checker blocks, RUN — not read (task.195 SC-4).
 *
 * Each of `/review-pr`, `/review-code`, `/qa-task` and `/qa-story` runs `finding-anchors.js` from a
 * fenced block in its SKILL.md. Those blocks used to branch on the exit code in a comment
 * (`# exit 1 = malformed anchors exist. NOT a halt`), and `node` also exits 1 when the script cannot
 * load: reproduced in task.194 QA cycle 3, a call from the wrong cwd annotated nothing and the reader
 * was told to mark and continue. The blocks now decide on the checker's JSON `reason`. A grep for
 * `case "$REASON"` would prove the string exists, not that it decides (obs: assert behaviour, not
 * source text) — so this file extracts each block and runs it in a scratch repository three times:
 *
 *   (a) the checker is absent              → the block HALTs "not runnable", exit non-zero
 *   (b) the checker present, one malformed → the block continues, exit 0, the finding annotated
 *   (c) control: one clean finding         → the block continues, exit 0 (a block that HALTs on
 *                                            every run fails here)
 *
 * Every `.agents/skills/<skill>/…` helper a block references other than the checker is stubbed; an
 * unknown helper fails the test rather than being silently skipped.
 *
 * Run via: node --test evals/shared/tests/finding-anchors-blocks.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  symlinkSync,
  chmodSync,
} from "node:fs";
import { spawnSync, execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "..");
const ENGINE = path.join(ROOT, "shared", "resources", "finding-anchors.js");
const DISPATCHERS = ["review-pr", "review-code", "qa-task", "qa-story"];

/** The bodies of every fenced code block in a Markdown file, with their indentation removed. */
function fencedBlocks(text) {
  const out = [];
  const re = /^([ \t]*)(```+)[^\n]*\n([\s\S]*?)^\1\2[ \t]*$/gm;
  let m;
  while ((m = re.exec(text))) {
    const indent = m[1];
    out.push(
      m[3]
        .split("\n")
        .map((l) => (l.startsWith(indent) ? l.slice(indent.length) : l))
        .join("\n"),
    );
  }
  return out;
}

/** The one block that INVOKES the checker (another may only mention it in a comment). */
function checkerBlock(skill) {
  const text = readFileSync(
    path.join(ROOT, "skills", skill, "SKILL.md"),
    "utf8",
  );
  const hits = fencedBlocks(text).filter((b) =>
    /command node \S*finding-anchors\.js/.test(b),
  );
  assert.equal(
    hits.length,
    1,
    `${skill}: expected exactly one fenced block that runs finding-anchors.js, found ${hits.length}`,
  );
  return hits[0];
}

/** Stubs for the helpers a block may source or run besides the checker. */
const STUBS = {
  "resolve-platform.sh": "VCS=github\nTRACKER=github\nexport VCS TRACKER\n",
  "resolve-head-rev.sh":
    "#!/usr/bin/env bash\nprintf 'rev=%s\\nvia=head-branch\\n' \"$(git rev-parse HEAD)\"\n",
};

function scratchRepo(skill, block, { withChecker, stage }) {
  const dir = mkdtempSync(path.join(os.tmpdir(), `fa-blocks-${skill}-`));
  const git = (...a) =>
    execFileSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...a], {
      cwd: dir,
      stdio: "ignore",
    });
  git("init", "-q");
  writeFileSync(path.join(dir, "a.js"), "first line\nsecond line\n");
  git("add", ".");
  git("commit", "-q", "-m", "c");
  if (stage) {
    // Staged content differs from both HEAD and the working tree.
    writeFileSync(path.join(dir, "a.js"), "first line\nstaged line\n");
    git("add", "a.js");
    writeFileSync(path.join(dir, "a.js"), "first line\nworktree line\n");
  }
  const rels = new Set();
  for (const [, rel] of block.matchAll(
    /\.agents\/skills\/[^/\s]+\/((?:references|scripts)\/[^\s"');]+)/g,
  ))
    rels.add(rel);
  for (const rel of rels) {
    const dest = path.join(dir, ".agents", "skills", skill, rel);
    mkdirSync(path.dirname(dest), { recursive: true });
    const base = path.basename(rel);
    if (base === "finding-anchors.js") {
      if (withChecker) symlinkSync(ENGINE, dest);
    } else {
      assert.ok(
        STUBS[base],
        `${skill}: the checker block references ${rel}, which this test has no stub for — add one`,
      );
      writeFileSync(dest, STUBS[base]);
      chmodSync(dest, 0o755);
    }
  }
  return dir;
}

/**
 * Substitute the block's `{placeholders}` (never a `${…}` expansion). `{findings-json}` is the
 * findings JSON itself where the block writes it through a heredoc, else a path to it.
 */
function instantiate(block, dir, findings, target = "worktree") {
  const file = path.join(dir, "findings.json");
  const heredoc = /<<'JSON'\n\{findings-json\}\nJSON/.test(block);
  if (!heredoc) writeFileSync(file, JSON.stringify(findings));
  return {
    file: heredoc ? null : file,
    script: block.replace(/(?<!\$)\{([a-z][^{}\n]*)\}/g, (_, name) => {
      if (name === "findings-json")
        return heredoc ? JSON.stringify(findings) : file;
      if (name.startsWith("target:")) return target;
      return "x";
    }),
  };
}

function runBlock(skill, { withChecker, findings, target, stage }) {
  const block = checkerBlock(skill);
  const dir = scratchRepo(skill, block, { withChecker, stage });
  try {
    const { file, script } = instantiate(block, dir, findings, target);
    // Print where the block left FINDINGS_JSON, so the annotation can be read back.
    const r = spawnSync(
      "bash",
      ["-c", `${script}\nprintf 'FINDINGS_AT=%s\\n' "$FINDINGS_JSON"`],
      { cwd: dir, encoding: "utf8" },
    );
    const at = (r.stdout.match(/^FINDINGS_AT=(.*)$/m) || [])[1] || file;
    let annotated = null;
    try {
      annotated = JSON.parse(readFileSync(at, "utf8"));
    } catch {
      annotated = null;
    }
    return { code: r.status, out: r.stdout + r.stderr, annotated };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const doc = (finding) => ({ code_review: { findings: [finding] } });
const verdict = (annotated) =>
  annotated?.code_review?.findings?.[0]?.anchor_check;

test("the dispatcher population is the four skills that run the checker", () => {
  for (const skill of DISPATCHERS) checkerBlock(skill);
});

for (const skill of DISPATCHERS) {
  test(`${skill}: a checker that cannot load HALTs as not runnable — never "mark and continue"`, () => {
    const r = runBlock(skill, {
      withChecker: false,
      findings: doc({
        id: "CR-1",
        file_line: "a.js:1",
        line_text: "first line",
      }),
    });
    assert.notEqual(
      r.code,
      0,
      `${skill}: the block continued past a missing checker:\n${r.out}`,
    );
    assert.match(r.out, /HALT: finding-anchors checker not runnable/);
    assert.doesNotMatch(r.out, /finding-anchors: (ok|malformed-anchors)/);
  });

  test(`${skill}: malformed anchors continue, with the finding annotated`, () => {
    const r = runBlock(skill, {
      withChecker: true,
      findings: doc({
        id: "CR-1",
        file_line: "a.js:1",
        line_text: "not on this line",
      }),
    });
    assert.equal(
      r.code,
      0,
      `${skill}: the block halted on malformed anchors:\n${r.out}`,
    );
    assert.match(r.out, /finding-anchors: malformed-anchors/);
    assert.equal(verdict(r.annotated), "text-mismatch");
  });

  test(`${skill}: control — a clean finding set continues with reason ok`, () => {
    const r = runBlock(skill, {
      withChecker: true,
      findings: doc({
        id: "CR-1",
        file_line: "a.js:2",
        line_text: "second line",
      }),
    });
    assert.equal(
      r.code,
      0,
      `${skill}: the block halted on a clean run:\n${r.out}`,
    );
    assert.match(r.out, /finding-anchors: ok/);
    assert.equal(verdict(r.annotated), "ok");
  });
}

// /review-code --staged diffs the index; its block must check anchors against the staged content, so
// an unstaged edit on top cannot turn a correct anchor into a text-mismatch (task.195 problem 4).
test("review-code: target staged reads the index, not the working tree", () => {
  const staged = runBlock("review-code", {
    withChecker: true,
    stage: true,
    target: "staged",
    findings: doc({
      id: "CR-1",
      file_line: "a.js:2",
      line_text: "staged line",
    }),
  });
  assert.equal(staged.code, 0, staged.out);
  assert.equal(verdict(staged.annotated), "ok");
  // Control: the worktree target reads the file on disk, where that line says something else.
  const worktree = runBlock("review-code", {
    withChecker: true,
    stage: true,
    target: "worktree",
    findings: doc({
      id: "CR-1",
      file_line: "a.js:2",
      line_text: "staged line",
    }),
  });
  assert.equal(verdict(worktree.annotated), "text-mismatch");
});
