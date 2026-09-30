// detector-candidate-rule.test.mjs — the resume detector prompt and `advance-pipeline-lock.sh`
// `choose_candidate()` pick the same candidate, and the prompt's candidate listing runs under
// both shells (task.133 Phase 3; task.130 gate 5 CR-3).
//
// The prompt is a SECOND derivation of `choose_candidate()`: the detector recommends the step to
// resume at, and `--restore` restores the lock that step is read from. Where they disagree, the
// resume prompt names one step and the restore rebuilds another. Before task.133 the prompt was
// silent on a candidate with no `task_or_story_directory` and ranked by mtime alone, so a newer
// legacy `last-halt.json` beside an older matched claim made the detector recommend a candidate
// `--restore` refuses.
//
//   A — the prompt's Step 1 states both rules, each once, at a marker: a directory-less candidate
//       is dropped and filed as an object naming --accept-legacy; a matched candidate outranks a
//       legacy one whatever the mtimes, citing choose_candidate() as the authority
//                                                         (delete a marker's sentence → red)
//   B — the script behaves as the prompt says: an older matched claim beside a NEWER legacy
//       snapshot → --restore --which names the claim, with and without --accept-legacy; a
//       legacy-only set → nothing, exit 1   (rank by mtime alone → red; accept legacy → red)
//   C — the prompt's listing fence, executed under `zsh -f` and bash with no `.pausing.*`
//       present, lists the existing last-halt.json; with a newer claim, the claim comes first
//                                                   (the pre-task.137 `ls` glob → red under zsh)
//
// The prose is found by marker, not by phrase: a restatement that drops the marker reads as a
// missing rule, which is the failure this test exists to see.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { extractBlocks } from "../qa-execute-snippets.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RES = path.resolve(HERE, "..");
const PROMPT = path.join(RES, "pipeline-resume-detector-prompt.md");
const LOCK_SH = path.join(RES, "advance-pipeline-lock.sh");
const hasZsh = spawnSync("zsh", ["-c", "true"]).status === 0;
const SHELLS = hasZsh ? ["bash", "zsh"] : ["bash"];
const argvFor = (shell, script) =>
  shell === "zsh"
    ? ["-f", "-c", script]
    : ["--noprofile", "--norc", "-c", script];

// Step 1 runs from its heading to the next `### ` heading.
function step1() {
  const md = fs.readFileSync(PROMPT, "utf8");
  const start = md.indexOf("### Step 1 — Read the lock file");
  assert.ok(
    start >= 0,
    "detector prompt has no '### Step 1 — Read the lock file' heading",
  );
  const end = md.indexOf("\n### ", start + 1);
  return md.slice(start, end < 0 ? undefined : end);
}

// The list item or paragraph carrying the marker.
function ruleAt(text, marker) {
  const tag = `<!-- candidate-rule: ${marker} -->`;
  const n = text.split(tag).length - 1;
  assert.equal(
    n,
    1,
    `expected the '${tag}' marker exactly once in Step 1, found ${n}`,
  );
  const at = text.indexOf(tag);
  const end = text.indexOf("\n\n", at);
  return text.slice(at, end < 0 ? undefined : end);
}

test("A — Step 1 states the legacy and provenance rules, once each, at their markers", () => {
  const s1 = step1();
  const legacy = ruleAt(s1, "legacy");
  assert.match(
    legacy,
    /no `task_or_story_directory`/,
    "legacy rule does not name the missing field",
  );
  assert.match(
    legacy,
    /\{ "path": "[^"]+", "concern": "legacy snapshot \(no task_or_story_directory\)[^"]*--accept-legacy[^"]*" \}/,
    "legacy rule does not file an object-shaped note naming --accept-legacy",
  );
  const prov = ruleAt(s1, "provenance");
  assert.match(
    prov,
    /regardless of mtime|whatever their mtimes/i,
    "provenance rule does not override mtime",
  );
  assert.match(
    prov,
    /choose_candidate\(\)/,
    "provenance rule does not cite choose_candidate() as the authority",
  );
});

function sandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "detector-rule-"));
  const state = path.join(dir, "state");
  const doc = path.join(dir, "doc");
  fs.mkdirSync(state);
  fs.mkdirSync(doc);
  return {
    dir,
    state,
    doc,
    lock: path.join(state, "lock"),
    snap: path.join(state, "last-halt.json"),
  };
}

const which = (sb, ...flags) =>
  spawnSync("bash", [LOCK_SH, "--restore", ...flags, "--which", sb.doc], {
    encoding: "utf8",
    env: {
      ...process.env,
      PIPELINE_LOCK: sb.lock,
      PIPELINE_HALT_SNAPSHOT: sb.snap,
    },
  });

test("B — the script agrees: a matched claim outranks a newer legacy snapshot; legacy alone restores nothing", () => {
  const sb = sandbox();
  try {
    const claim = `${sb.lock}.pausing.4242`;
    fs.writeFileSync(
      claim,
      JSON.stringify({ task_or_story_directory: sb.doc, current_step: 5 }),
    );
    const old = new Date("2026-01-01T00:00:00Z");
    fs.utimesSync(claim, old, old);
    fs.writeFileSync(sb.snap, JSON.stringify({ halt_step: 2 })); // legacy, and newer
    let r = which(sb);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(
      r.stdout.trim(),
      claim,
      "the newer legacy snapshot outranked the matched claim",
    );
    // Provenance, not mere refusal: even with the legacy snapshot ACCEPTED, the older matched
    // claim wins — mtime ranks only within one provenance.
    r = which(sb, "--accept-legacy");
    assert.equal(r.status, 0, r.stderr);
    assert.equal(
      r.stdout.trim(),
      claim,
      "under --accept-legacy the newer legacy snapshot outranked the matched claim",
    );
    fs.rmSync(claim);
    r = which(sb);
    assert.equal(r.status, 1, `a legacy-only set was chosen: ${r.stdout}`);
    assert.equal(r.stdout.trim(), "");
  } finally {
    fs.rmSync(sb.dir, { recursive: true, force: true });
  }
});

function listingFence() {
  const blocks = extractBlocks(step1()).filter(
    (b) =>
      /develop-pipeline\.last-halt\.json/.test(b.code) &&
      /pausing/.test(b.code),
  );
  assert.equal(
    blocks.length,
    1,
    `expected one candidate-listing fence in Step 1, found ${blocks.length}`,
  );
  return blocks[0].code;
}

for (const sh of SHELLS) {
  test(`C [${sh}] — the listing fence lists last-halt.json with no .pausing.* present, newest first`, () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "detector-listing-"));
    try {
      const state = path.join(dir, ".claude", "state");
      fs.mkdirSync(state, { recursive: true });
      const snap = path.join(state, "develop-pipeline.last-halt.json");
      fs.writeFileSync(snap, "{}");
      const old = new Date("2026-01-01T00:00:00Z");
      fs.utimesSync(snap, old, old);
      let r = spawnSync(sh, argvFor(sh, listingFence()), {
        cwd: dir,
        encoding: "utf8",
      });
      assert.equal(r.status, 0, r.stderr);
      assert.deepEqual(
        r.stdout.trim().split("\n"),
        [".claude/state/develop-pipeline.last-halt.json"],
        `stderr: ${r.stderr}`,
      );
      fs.writeFileSync(
        path.join(state, "develop-pipeline.lock.pausing.77"),
        "{}",
      );
      r = spawnSync(sh, argvFor(sh, listingFence()), {
        cwd: dir,
        encoding: "utf8",
      });
      assert.deepEqual(r.stdout.trim().split("\n"), [
        ".claude/state/develop-pipeline.lock.pausing.77",
        ".claude/state/develop-pipeline.last-halt.json",
      ]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}
