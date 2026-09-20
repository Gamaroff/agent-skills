// stale-snapshot-delete.test.mjs — the resume contract's Consume Output blocks are the ONE place a
// stale halt snapshot is bound, validated and deleted; the delete acts only on a verdict label,
// only on the one canonical file, only after re-reading the evidence from disk, and it fails closed
// on every broken input (task.130 Phase 3; PR #436 review CR-3; QA cycles 1–3).
//
// The defect this closes: the detector prompt — a read-only Explore subagent — was told to `rm -f`
// a `last-halt.json` it had proved stale and to REPORT the delete in the same breath. A subagent
// that self-reports a write it may not have performed is worse than one that reports nothing.
// The delete now lives in the orchestrator, in one fenced block every orchestrator cites and none
// copies. Three QA cycles then found, by executing that block, each shape a first draft gets wrong;
// every case below names the cycle that added it.
//
// Each block is the smallest claim whose reverse turns it red:
//   A — a `stale-snapshot: PR merged` delta on the canonical path, snapshot for this document,
//       PR MERGED → deleted, exit 0                                    (drop `rm -f` → red)
//   B — a delta whose concern is not the exact verdict label is left in place (widen select → red)
//   C — a path that survives the rm is a HALT with exit 1                 (drop the re-read → red)
//   D — no orchestrator SKILL.md carries a copy of the loop; each cites the section
//   E — no persisted detector file HALTs                                     (drop the -s guard → red)
//   F — a delta with no `concern` is a non-match, kept, exit 0               (drop `// ""` → red)
//   G — a non-array deltas_since_pause / unparsable JSON HALTs with exit 1   (drop the `||` → red)
//   H — the detector's two SKIP notes are never acted on                (prefix selector → red)
//   I — a path outside the rule is a HALT, nothing deleted             (drop containment → red)
//   J — a delta with no string path is a HALT, never `rm -f null`      (drop the type check → red)
//   K — the bind-and-validate block persists the returned JSON, binds DETECTOR_JSON, and rejects
//       a non-array and a bare-string element                       (drop either check → red)
//   L — a bare-string note reaching the delete block is skipped          (drop select(object) → red)
//   M — a snapshot for ANOTHER document is a HALT, kept                (drop the directory read → red)
//   N — PR not MERGED on re-check (OPEN / gh fails) → KEPT, exit 0         (drop the gh read → red)
//   O — canonical then foreign path → HALT with nothing deleted        (collapse the two passes → red)
//   P — bind block and delete block in TWO processes → deleted        (read the variable again → red)
//   N2 — a snapshot with no pr_url is KEPT before any gh call          (drop the guard → red)
//   Q — the detector prompt files no bare-string note                  (restore a string site → red)

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { extractBlocks } from "../qa-execute-snippets.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const CONTRACT = path.join(
  ROOT,
  "shared",
  "resources",
  "develop-pipeline-resume-contract.md",
);
const SKILLS = ["develop-task", "develop-story", "develop-bug"].map((s) =>
  path.join(ROOT, "skills", s, "SKILL.md"),
);
const hasZsh = spawnSync("zsh", ["-c", "true"]).status === 0;
const SHELLS = hasZsh ? ["bash", "zsh"] : ["bash"];
const argvFor = (shell, script) =>
  shell === "zsh"
    ? ["-f", "-c", script]
    : ["--noprofile", "--norc", "-c", script];

// Keyed on each block's own comment line, not on the tokens under proof — an extractor that keys
// on the mutated token reports every case red the moment the token goes, which reads like a proof
// and is only a missing block.
function deleteBlock() {
  const md = fs.readFileSync(CONTRACT, "utf8");
  const blocks = extractBlocks(md).filter((b) =>
    /Every `stale-snapshot: PR merged` delta names a snapshot the detector proved/.test(
      b.code,
    ),
  );
  assert.equal(
    blocks.length,
    1,
    `expected exactly one stale-snapshot delete block, found ${blocks.length}`,
  );
  return blocks[0].code;
}

function bindBlock() {
  const md = fs.readFileSync(CONTRACT, "utf8");
  const blocks = extractBlocks(md).filter((b) =>
    /Persist the JSON the Explore dispatch RETURNED/.test(b.code),
  );
  assert.equal(
    blocks.length,
    1,
    `expected exactly one bind-and-validate block, found ${blocks.length}`,
  );
  return blocks[0].code;
}

const GH_STUB = {
  merged: "#!/bin/sh\necho MERGED\n",
  open: "#!/bin/sh\necho OPEN\n",
  fail: '#!/bin/sh\necho "gh: HTTP 401" >&2\nexit 1\n',
};

// One sandbox per run: a repo-shaped temp dir with `.claude/state/`, this document's directory,
// a second document's directory, a stub `gh` on PATH, and a snapshot carrying the evidence the
// block re-reads (this document's directory and a PR URL).
function run(
  shell,
  {
    concern,
    readOnlyDir,
    rawJson,
    unsetVar,
    extraFile,
    prState = "merged",
    snapshotDir,
    snapshotRaw,
    noPrUrl,
  } = {},
) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stale-snapshot-"));
  const state = path.join(dir, ".claude", "state");
  fs.mkdirSync(state, { recursive: true });
  const docDir = path.join(dir, "docs", "tasks", "task.1.x");
  fs.mkdirSync(docDir, { recursive: true });
  fs.mkdirSync(path.join(dir, "docs", "tasks", "task.2.other"), {
    recursive: true,
  });
  const bin = path.join(dir, "bin");
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, "gh"), GH_STUB[prState], { mode: 0o755 });
  const snap = path.join(state, "develop-pipeline.last-halt.json");
  fs.writeFileSync(
    snap,
    snapshotRaw !== undefined
      ? snapshotRaw
      : JSON.stringify({
          skill: "develop-task",
          task_or_story_directory:
            snapshotDir !== undefined ? snapshotDir : docDir,
          ...(noPrUrl ? {} : { pr_url: "https://github.com/x/y/pull/1" }),
        }) + "\n",
  );
  const json = JSON.stringify({
    schema_version: 1,
    recommended_step: 1,
    deltas_since_pause: [
      { path: snap, old_mtime: "x", new_mtime: "x", concern },
    ],
    blocking_issues: [],
  });
  if (extraFile) fs.writeFileSync(path.join(dir, extraFile), "x\n");
  // A directory the shell cannot write to makes `rm -f` fail silently (-f) and leaves the file —
  // the case the re-read exists to catch.
  if (readOnlyDir) fs.chmodSync(state, 0o555);
  const bound = rawJson !== undefined ? rawJson : json;
  // The delete block reads the PERSISTED FILE, never a variable from an earlier fence (bug 9).
  // No variable is injected; the file is what carries the detector output across shells.
  if (!unsetVar) {
    fs.mkdirSync(path.join(docDir, ".summaries"), { recursive: true });
    fs.writeFileSync(
      path.join(docDir, ".summaries", "step-0a-resume-detector.json"),
      bound + "\n",
    );
  }
  const prelude = "unset DETECTOR_JSON";
  const code = deleteBlock().replace(/\{doc-directory\}/g, docDir);
  const script = `${prelude}\n${code}\necho "BLOCK_DONE"\n`;
  const r = spawnSync(shell, argvFor(shell, script), {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
  });
  const exists = fs.existsSync(snap);
  const extraExists = extraFile
    ? fs.existsSync(path.join(dir, extraFile))
    : undefined;
  if (readOnlyDir) fs.chmodSync(state, 0o755);
  fs.rmSync(dir, { recursive: true, force: true });
  return {
    status: r.status,
    stdout: r.stdout,
    stderr: r.stderr,
    exists,
    extraExists,
  };
}

const SKIP_NOTES = [
  "stale-snapshot check skipped — pr_url is not a GitHub PR",
  "stale-snapshot check skipped — gh pr view failed: offline",
];

for (const sh of SHELLS) {
  test(`A [${sh}] — verdict label + this document + MERGED → deleted; exit 0`, () => {
    const r = run(sh, { concern: "stale-snapshot: PR merged" });
    assert.equal(r.status, 0, `stderr: ${r.stderr} stdout: ${r.stdout}`);
    assert.equal(r.exists, false, "snapshot still on disk");
    assert.match(r.stdout, /removed \(PR .* is MERGED; directory matches\)/);
    assert.match(r.stdout, /BLOCK_DONE/);
  });

  test(`B [${sh}] — a delta with another concern is left in place`, () => {
    const r = run(sh, { concern: "modified after pause" });
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.equal(r.exists, true, "a non-stale delta's path was deleted");
  });

  test(
    `C [${sh}] — a path that survives rm is a HALT (exit 1)`,
    {
      skip:
        process.getuid &&
        process.getuid() === 0 &&
        "root ignores directory permissions",
    },
    () => {
      const r = run(sh, {
        concern: "stale-snapshot: PR merged",
        readOnlyDir: true,
      });
      assert.equal(
        r.status,
        1,
        `expected exit 1; stdout: ${r.stdout} stderr: ${r.stderr}`,
      );
      assert.match(r.stdout, /HALT: stale snapshot .* survived deletion/);
      assert.doesNotMatch(
        r.stdout,
        /BLOCK_DONE/,
        "the block ran past the HALT",
      );
    },
  );

  test(`E [${sh}] — no persisted detector file (bind block did not run) is a HALT, snapshot untouched`, () => {
    const r = run(sh, { unsetVar: true });
    assert.equal(r.status, 1, `expected exit 1; stdout: ${r.stdout}`);
    assert.match(
      r.stdout,
      /HALT: .*step-0a-resume-detector\.json is absent or empty — run the bind-and-validate block first/,
    );
    assert.doesNotMatch(r.stdout, /BLOCK_DONE/, "the block ran past the HALT");
    assert.equal(r.exists, true);
  });

  test(`P [${sh}] — TWO SHELLS: bind block in one process, delete block in another → deleted (bug 9)`, () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "two-shell-"));
    const state = path.join(dir, ".claude", "state");
    fs.mkdirSync(state, { recursive: true });
    const docDir = path.join(dir, "docs", "tasks", "task.1.x");
    fs.mkdirSync(docDir, { recursive: true });
    const bin = path.join(dir, "bin");
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin, "gh"), GH_STUB.merged, { mode: 0o755 });
    const snap = path.join(state, "develop-pipeline.last-halt.json");
    fs.writeFileSync(
      snap,
      JSON.stringify({
        task_or_story_directory: docDir,
        pr_url: "https://github.com/x/y/pull/1",
      }) + "\n",
    );
    const json = JSON.stringify({
      schema_version: 1,
      recommended_step: 1,
      blocking_issues: [],
      deltas_since_pause: [
        { path: snap, concern: "stale-snapshot: PR merged" },
      ],
    });
    const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
    const bind = bindBlock()
      .replace(/\{doc-directory\}/g, docDir)
      .replace(
        /\{the JSON object the detector returned, pasted verbatim\}/,
        json,
      );
    const r1 = spawnSync(sh, argvFor(sh, bind), {
      cwd: dir,
      encoding: "utf8",
      env,
    });
    assert.equal(r1.status, 0, `bind block: ${r1.stderr}`);
    const del =
      deleteBlock().replace(/\{doc-directory\}/g, docDir) +
      '\necho "BLOCK_DONE"\n';
    const r2 = spawnSync(sh, argvFor(sh, del), {
      cwd: dir,
      encoding: "utf8",
      env,
    });
    assert.equal(
      r2.status,
      0,
      `delete block (fresh shell): stdout ${r2.stdout} stderr ${r2.stderr}`,
    );
    assert.match(r2.stdout, /removed \(PR .* is MERGED; directory matches\)/);
    assert.equal(
      fs.existsSync(snap),
      false,
      "snapshot still on disk after a two-shell run",
    );
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test(`F [${sh}] — a delta with no concern is a non-match, not a jq abort; exit 0, snapshot kept`, () => {
    const r = run(sh, {
      rawJson: JSON.stringify({
        deltas_since_pause: [
          { path: ".claude/state/develop-pipeline.last-halt.json" },
        ],
      }),
    });
    assert.equal(r.status, 0, `stderr: ${r.stderr} stdout: ${r.stdout}`);
    assert.equal(r.exists, true, "a concern-less delta's path was deleted");
    assert.match(r.stdout, /BLOCK_DONE/);
  });

  test(`G [${sh}] — a non-array deltas_since_pause (or unparsable JSON) is a HALT (exit 1)`, () => {
    const notArray = run(sh, {
      rawJson: JSON.stringify({ deltas_since_pause: "nope" }),
    });
    assert.equal(notArray.status, 1, `stdout: ${notArray.stdout}`);
    assert.match(notArray.stdout, /HALT: could not read stale-snapshot deltas/);
    assert.equal(notArray.exists, true);
    const garbage = run(sh, { rawJson: "{not json" });
    assert.equal(garbage.status, 1, `stdout: ${garbage.stdout}`);
    assert.match(garbage.stdout, /HALT: could not read stale-snapshot deltas/);
  });

  for (const note of SKIP_NOTES) {
    test(`H [${sh}] — skip note "${note.slice(0, 40)}…" is NOT acted on; snapshot kept, exit 0`, () => {
      const r = run(sh, { concern: note });
      assert.equal(r.status, 0, `stderr: ${r.stderr} stdout: ${r.stdout}`);
      assert.equal(
        r.exists,
        true,
        "a live snapshot was deleted on a skip note",
      );
      assert.match(r.stdout, /BLOCK_DONE/);
    });
  }

  test(`I [${sh}] — a stale-snapshot delta naming a path outside the rule is a HALT; nothing deleted`, () => {
    const r = run(sh, {
      rawJson: JSON.stringify({
        deltas_since_pause: [
          { path: "unrelated.txt", concern: "stale-snapshot: PR merged" },
        ],
      }),
      extraFile: "unrelated.txt",
    });
    assert.equal(r.status, 1, `stdout: ${r.stdout}`);
    assert.match(
      r.stdout,
      /HALT: the detector reported a stale-snapshot path outside the rule/,
    );
    assert.equal(r.extraExists, true, "the foreign path was deleted");
    assert.equal(r.exists, true);
  });

  test(`J [${sh}] — a stale-snapshot delta with no path is a HALT, never rm -f null`, () => {
    const r = run(sh, {
      rawJson: JSON.stringify({
        deltas_since_pause: [{ concern: "stale-snapshot: PR merged" }],
      }),
    });
    assert.equal(r.status, 1, `stdout: ${r.stdout}`);
    assert.match(
      r.stdout,
      /HALT: could not read stale-snapshot deltas .*without a string path/,
    );
    assert.equal(r.exists, true);
  });

  test(`K [${sh}] — bind block persists the returned JSON, binds DETECTOR_JSON, rejects a non-array and a bare-string element`, () => {
    const base = {
      schema_version: 1,
      recommended_step: 2,
      blocking_issues: [],
    };
    const cases = [
      ["good", JSON.stringify({ ...base, deltas_since_pause: [] }), 0],
      ["not-array", JSON.stringify({ ...base, deltas_since_pause: "nope" }), 1],
      [
        "string-note",
        JSON.stringify({ ...base, deltas_since_pause: [SKIP_NOTES[0]] }),
        1,
      ],
      [
        "object-note",
        JSON.stringify({
          ...base,
          deltas_since_pause: [{ path: null, concern: SKIP_NOTES[0] }],
        }),
        0,
      ],
    ];
    for (const [name, json, expect] of cases) {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bind-block-"));
      const docDir = path.join(dir, "docs", "tasks", "task.1.x");
      fs.mkdirSync(docDir, { recursive: true });
      // The block is a CHECK the prose reads ("If validation fails …"), not an exit — so read the
      // status of its last pipeline, the way the prose does.
      const script =
        bindBlock()
          .replace(/\{doc-directory\}/g, docDir)
          .replace(
            /\{the JSON object the detector returned, pasted verbatim\}/,
            json,
          ) +
        '\nSCHEMA_RC=$?; echo "SCHEMA_RC=$SCHEMA_RC BOUND=${#DETECTOR_JSON}"\n';
      const r = spawnSync(sh, argvFor(sh, script), {
        cwd: dir,
        encoding: "utf8",
      });
      const m = /SCHEMA_RC=(\d+) BOUND=(\d+)/.exec(r.stdout);
      assert.ok(
        m,
        `[${name}] no status line; stdout: ${r.stdout} stderr: ${r.stderr}`,
      );
      assert.equal(
        Number(m[1]),
        expect,
        `[${name}] expected schema check exit ${expect}`,
      );
      assert.ok(
        Number(m[2]) > 0,
        `[${name}] DETECTOR_JSON not bound by the block`,
      );
      assert.ok(
        fs.existsSync(
          path.join(docDir, ".summaries", "step-0a-resume-detector.json"),
        ),
        `[${name}] the block did not persist the returned JSON to .summaries/`,
      );
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`L [${sh}] — a bare-string note reaching the delete block is skipped by the selector; exit 0`, () => {
    const r = run(sh, {
      rawJson: JSON.stringify({ deltas_since_pause: [SKIP_NOTES[0]] }),
    });
    assert.equal(r.status, 0, `stdout: ${r.stdout} stderr: ${r.stderr}`);
    assert.equal(r.exists, true);
    assert.match(r.stdout, /BLOCK_DONE/);
  });

  test(`M [${sh}] — a snapshot whose task_or_story_directory is another document's is a HALT; kept`, () => {
    const r = run(sh, {
      concern: "stale-snapshot: PR merged",
      snapshotDir: "docs/tasks/task.2.other",
    });
    assert.equal(r.status, 1, `stdout: ${r.stdout}`);
    assert.match(
      r.stdout,
      /HALT: .* is not a snapshot for .* — the detector mislabelled it; nothing deleted/,
    );
    assert.equal(r.exists, true, "a mislabelled live snapshot was deleted");
  });

  test(`N [${sh}] — PR re-check OPEN or gh failure → snapshot KEPT, exit 0, reason named`, () => {
    for (const prState of ["open", "fail"]) {
      const r = run(sh, { concern: "stale-snapshot: PR merged", prState });
      assert.equal(
        r.status,
        0,
        `[${prState}] stdout: ${r.stdout} stderr: ${r.stderr}`,
      );
      assert.equal(
        r.exists,
        true,
        `[${prState}] snapshot deleted on a non-MERGED re-check`,
      );
      assert.match(r.stdout, /KEPT — its PR .* did not read MERGED/);
    }
  });

  test(`N2 [${sh}] — a snapshot with NO pr_url is KEPT before any gh call, even with a MERGED gh (bug 11)`, () => {
    const r = run(sh, {
      concern: "stale-snapshot: PR merged",
      noPrUrl: true,
      prState: "merged",
    });
    assert.equal(r.status, 0, `stdout: ${r.stdout} stderr: ${r.stderr}`);
    assert.equal(
      r.exists,
      true,
      "a snapshot with no pr_url was deleted on the current branch PR state",
    );
    assert.match(
      r.stdout,
      /KEPT — it names no pr_url, so there is no merge evidence to re-read/,
    );
  });

  test(`O [${sh}] — canonical then foreign path: HALT before any rm; canonical snapshot still present`, () => {
    const r = run(sh, {
      rawJson: JSON.stringify({
        deltas_since_pause: [
          {
            path: ".claude/state/develop-pipeline.last-halt.json",
            concern: "stale-snapshot: PR merged",
          },
          { path: "unrelated.txt", concern: "stale-snapshot: PR merged" },
        ],
      }),
      extraFile: "unrelated.txt",
    });
    assert.equal(r.status, 1, `stdout: ${r.stdout}`);
    assert.match(r.stdout, /nothing deleted/);
    assert.equal(
      r.exists,
      true,
      '"nothing deleted" was printed after the canonical snapshot was removed',
    );
    assert.equal(r.extraExists, true);
  });
}

test("Q — the detector prompt files no bare-string note in deltas_since_pause (bug 10)", () => {
  const PROMPT = path.join(
    ROOT,
    "shared",
    "resources",
    "pipeline-resume-detector-prompt.md",
  );
  const lines = fs.readFileSync(PROMPT, "utf8").split(/\r?\n/);
  // A note SITE is a prose line that tells the subagent to put something in deltas_since_pause
  // and quotes the something. It is well-formed when the quoted thing sits inside an object
  // literal (`{ "path": …, "concern": "…" }`) on the SAME line, or when the line is the
  // continuation of an object literal the PREVIOUS line opened and did not close (a wrapped
  // object). A ±1-line window is NOT the same test: two adjacent sites vouch for each other, and
  // restoring the bare string at :112 stayed green because :113 still carried `"concern":`.
  const offenders = [];
  lines.forEach((l, i) => {
    if (!/deltas_since_pause/.test(l)) return;
    if (/^\s*[|#]/.test(l) || /^\s*"deltas_since_pause"/.test(l)) return;
    const prev = lines[i - 1] || "";
    // The quoted literal may itself be wrapped: one `"` on this line closing one the previous
    // line opened. Test the join, or a wrapped bare string is never seen as quoted at all.
    const quotedHere = /"[^"]{4,}"/.test(l);
    const quotedAcross = /^[^"]*"[^"]*$/.test(l) && /"[^"]*$/.test(prev);
    if (!quotedHere && !quotedAcross) return;
    const openedAbove =
      /\{[^}]*$/.test(prev) && /"concern"\s*:/.test(`${prev}\n${l}`);
    const objectHere = /\{[^}]*"concern"\s*:/.test(l);
    if (!objectHere && !openedAbove)
      offenders.push(`${i + 1}: ${l.trim().slice(0, 100)}`);
  });
  assert.deepEqual(
    offenders,
    [],
    `bare-string note instructions in the detector prompt:\n  ${offenders.join("\n  ")}`,
  );
  const sites = lines.filter((l) => /"concern"\s*:/.test(l)).length;
  assert.ok(
    sites >= 5,
    `expected ≥5 object-shaped note sites in the prompt, found ${sites}`,
  );
});

test("D — no orchestrator SKILL.md copies the loop; each cites § Consume Output", () => {
  for (const file of SKILLS) {
    const md = fs.readFileSync(file, "utf8");
    const rel = path.relative(ROOT, file);
    assert.doesNotMatch(
      md,
      /stale-snapshot: PR merged"\)/,
      `${rel} carries a copy of the delete loop`,
    );
    assert.match(
      md,
      /Stale snapshots the detector reports[^\n]*resume contract § Consume Output/,
      `${rel} does not cite the contract's one statement of the delete`,
    );
  }
});
