// task.279 — Step 0.1a reads the evidence before it stops (obs #53, #66).
// The halt is resolved out of band only when the document is done AND the PR is MERGED.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  decide,
  readDocStatus,
  isBugDocument,
} from "../../../skills/develop-next/scripts/halt-evidence.mjs";

const SCRIPT = fileURLToPath(
  new URL(
    "../../../skills/develop-next/scripts/halt-evidence.mjs",
    import.meta.url,
  ),
);
const TASK_DOC = "docs/tasks/task.9.x/task.9.x.md";
const BUG_DOC = "docs/bugs/bug.9.x/bug.9.x.md";
const halted = { halted: true, prNumber: 714, commandArg: TASK_DOC };

test("halted, document accepted, PR MERGED: resolved out of band", () => {
  const v = decide({
    state: halted,
    docStatus: "accepted",
    prState: "MERGED",
    docFile: TASK_DOC,
  });
  assert.equal(v.resolved, true);
  assert.equal(v.reason, "resolved-out-of-band");
});

test("control: PR OPEN keeps the halt", () => {
  const v = decide({
    state: halted,
    docStatus: "accepted",
    prState: "OPEN",
    docFile: TASK_DOC,
  });
  assert.equal(v.resolved, false);
  assert.equal(v.reason, "pr-not-merged");
});

test("control: document in-progress keeps the halt even with the PR MERGED", () => {
  const v = decide({
    state: halted,
    docStatus: "in-progress",
    prState: "MERGED",
    docFile: TASK_DOC,
  });
  assert.equal(v.resolved, false);
  assert.equal(v.reason, "document-not-done");
});

test("a failed PR query keeps the halt", () => {
  for (const prState of ["unknown", "", undefined, "merged-ish"]) {
    const v = decide({
      state: halted,
      docStatus: "accepted",
      prState,
      docFile: TASK_DOC,
    });
    assert.equal(v.resolved, false, `prState ${JSON.stringify(prState)}`);
    assert.equal(v.reason, "pr-unknown");
  }
});

test("a halt with no prNumber recorded has no evidence", () => {
  for (const prNumber of [null, undefined, ""]) {
    const v = decide({
      state: { halted: true, prNumber, commandArg: TASK_DOC },
      docStatus: "accepted",
      prState: "MERGED",
      docFile: TASK_DOC,
    });
    assert.equal(v.resolved, false);
    assert.equal(v.reason, "no-evidence");
  }
});

test("an unreadable document keeps the halt", () => {
  const v = decide({
    state: halted,
    docStatus: null,
    prState: "MERGED",
    docFile: TASK_DOC,
  });
  assert.equal(v.resolved, false);
  assert.equal(v.reason, "no-document");
});

test("a bug resolves on closed, never on accepted", () => {
  const state = { halted: true, prNumber: 5, commandArg: BUG_DOC };
  assert.equal(isBugDocument(BUG_DOC), true);
  assert.equal(
    isBugDocument("docs/tasks/task.110.bug.1.y/task.110.bug.1.y.md"),
    true,
  );
  assert.equal(isBugDocument(TASK_DOC), false);
  assert.equal(
    decide({ state, docStatus: "closed", prState: "MERGED", docFile: BUG_DOC })
      .resolved,
    true,
  );
  const wrong = decide({
    state,
    docStatus: "accepted",
    prState: "MERGED",
    docFile: BUG_DOC,
  });
  assert.equal(wrong.resolved, false);
  assert.equal(wrong.reason, "document-not-done");
});

test("halted: false is not consulted", () => {
  const v = decide({
    state: { halted: false, prNumber: 1, commandArg: TASK_DOC },
    docStatus: "accepted",
    prState: "MERGED",
    docFile: TASK_DOC,
  });
  assert.equal(v.reason, "not-halted");
  assert.equal(v.resolved, false);
});

test("readDocStatus reads frontmatter only", () => {
  assert.equal(
    readDocStatus("---\nid: x\nstatus: accepted\n---\nbody status: nope\n"),
    "accepted",
  );
  assert.equal(readDocStatus('---\nstatus: "closed"\n---\n'), "closed");
  assert.equal(readDocStatus("no frontmatter\nstatus: accepted\n"), "");
});

// CLI: the exit code, the written state, and a file without the new field resuming unchanged.
function fixture(t, { docStatus, extra = {} }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "halt-evidence-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const doc = path.join(dir, "task.9.x.md");
  fs.writeFileSync(doc, `---\nstatus: ${docStatus}\n---\n`);
  const stateFile = path.join(dir, "develop-next.state.json");
  const state = {
    item: "T9",
    source: "task-registry",
    dispatched: true,
    prNumber: 714,
    merged: false,
    ticked: false,
    halted: true,
    haltKind: "pipeline-halt",
    commandArg: doc,
    ...extra,
  };
  fs.writeFileSync(stateFile, JSON.stringify(state));
  return { stateFile, state };
}
const run = (args) =>
  spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });

test("CLI: resolved exits 0 and --apply advances the state, recording the evidence", (t) => {
  const { stateFile } = fixture(t, { docStatus: "accepted" });
  const r = run([
    "--state",
    stateFile,
    "--pr-state",
    "MERGED",
    "--apply",
    "--json",
  ]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(r.stdout).reason, "resolved-out-of-band");
  const next = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  assert.equal(next.halted, false);
  assert.equal(next.merged, true);
  assert.equal(next.haltKind, null);
  assert.equal(next.ticked, false, "the tick is Step 4's, never this reader's");
  assert.equal(next.haltResolvedBy.prState, "MERGED");
});

test("CLI: a halt the evidence does not contradict exits 1 and writes nothing", (t) => {
  for (const [docStatus, pr] of [
    ["accepted", "OPEN"],
    ["in-progress", "MERGED"],
    ["accepted", "unknown"],
  ]) {
    const { stateFile, state } = fixture(t, { docStatus });
    const before = fs.readFileSync(stateFile, "utf8");
    const r = run([
      "--state",
      stateFile,
      "--pr-state",
      pr,
      "--apply",
      "--json",
    ]);
    assert.equal(r.status, 1, `${docStatus}/${pr}`);
    assert.equal(fs.readFileSync(stateFile, "utf8"), before, "state untouched");
    assert.equal(
      JSON.parse(fs.readFileSync(stateFile, "utf8")).halted,
      state.halted,
    );
  }
});

test("CLI: without --apply a resolved halt is reported and nothing is written", (t) => {
  const { stateFile } = fixture(t, { docStatus: "accepted" });
  const before = fs.readFileSync(stateFile, "utf8");
  const r = run(["--state", stateFile, "--pr-state", "MERGED", "--json"]);
  assert.equal(r.status, 0);
  assert.equal(JSON.parse(r.stdout).applied, false);
  assert.equal(fs.readFileSync(stateFile, "utf8"), before);
});

test("CLI: usage errors exit 2", () => {
  assert.equal(run(["--json"]).status, 2);
  assert.equal(run(["--state", "/nonexistent/state.json"]).status, 2);
  assert.equal(run(["--state", "x", "--bogus"]).status, 2);
});
