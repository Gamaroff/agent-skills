/**
 * Layer-1 unit tests for loop-supervisor's adapter table and probe interpreter.
 *
 * The empty-stdout case is the one that matters most and is tested hardest:
 * `select-next.mjs`'s direct-invocation guard exits 0 with no output when it is
 * reached through a path that does not realpath to the module, and a probe that
 * read that as "no work" would report a clean night's sleep while doing nothing.
 * It must be an error, and it must not be reachable as `stop` by any route.
 *
 * Run via: node --test evals/loop-supervisor/unit/adapters.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  ADAPTERS,
  DEFAULT_PROBE_SCRIPT,
  PROBE_SCRIPT_CANDIDATES,
  findExisting,
  firstExisting,
  interpretProbe,
  probeMissing,
  resolveAdapter,
  tickCommitOracle,
  anyCommitOracle,
} from "../../../skills/loop-supervisor/references/adapters.js";

// ── the empty-stdout guard (gotcha 1) ────────────────────────────────────────

test("empty stdout with exit 0 is an ERROR, never stop", () => {
  const r = interpretProbe({ code: 0, stdout: "" });
  assert.equal(
    r.status,
    "error",
    "exit 0 + no output is select-next.mjs's silent guard, not an empty frontier",
  );
  assert.notEqual(r.status, "stop");
});

test("whitespace-only stdout is also an error", () => {
  assert.equal(
    interpretProbe({ code: 0, stdout: "  \n\t \n" }).status,
    "error",
  );
});

test("the empty-stdout error names the realpath guard so the fix is obvious", () => {
  const r = interpretProbe({ code: 0, stdout: "" });
  assert.match(r.reason, /realpath/);
  assert.match(r.reason, /select-next\.mjs/);
});

test("no route through interpretProbe turns empty stdout into stop", () => {
  for (const code of [0, 1, null, 127]) {
    assert.notEqual(interpretProbe({ code, stdout: "" }).status, "stop");
  }
});

// ── never branch on exit code alone ──────────────────────────────────────────

test("a `stop` payload on exit 0 is read as stop, from .status not the code", () => {
  const r = interpretProbe({
    code: 0,
    stdout: JSON.stringify({
      status: "stop",
      stopReason: "human-gated",
      detail: "manual row",
    }),
  });
  assert.equal(r.status, "stop");
  assert.match(r.reason, /human-gated/);
  assert.match(r.reason, /manual row/);
});

test("a `selected` payload on exit 0 is read as selected", () => {
  const r = interpretProbe({
    code: 0,
    stdout: JSON.stringify({
      status: "selected",
      rationale: "no deps",
      item: {
        id: "T62",
        command: "/develop-task",
        commandArg: "docs/tasks/task.62.x/task.62.x.md",
      },
    }),
  });
  assert.equal(r.status, "selected");
  assert.equal(r.itemId, "T62");
  assert.equal(r.command, "/develop-task");
  assert.equal(r.commandArg, "docs/tasks/task.62.x/task.62.x.md");
});

test("a `halt` payload surfaces lint.errors verbatim", () => {
  const r = interpretProbe({
    code: 1,
    stdout: JSON.stringify({
      status: "halt",
      lint: { errors: ["row 4 unparseable"] },
    }),
  });
  assert.equal(r.status, "halt");
  assert.deepEqual(r.lintErrors, ["row 4 unparseable"]);
});

test("lint.warnings never make a selected payload fail (gotcha 3)", () => {
  const r = interpretProbe({
    code: 0,
    stdout: JSON.stringify({
      status: "selected",
      item: {
        id: "T7",
        command: "/develop-task",
        commandArg: "docs/tasks/a/a.md",
      },
      lint: {
        errors: [],
        warnings: ["archived dep", "recap row", "annotation row"],
      },
    }),
  });
  assert.equal(
    r.status,
    "selected",
    "warnings are noisy by design and non-fatal",
  );
});

// ── commandArg is verbatim (gotcha 2) ────────────────────────────────────────

test("commandArg is passed through byte-for-byte, never resolved", () => {
  const raw =
    "docs/tasks/task.62.loop-supervisor-runner/task.62.loop-supervisor-runner.md";
  const r = interpretProbe({
    code: 0,
    stdout: JSON.stringify({
      status: "selected",
      item: { id: "T62", command: "/develop-task", commandArg: raw },
    }),
  });
  assert.equal(r.commandArg, raw);
  assert.ok(
    !r.commandArg.startsWith("docs/development/"),
    "must not be resolved against the roadmap dir",
  );
});

// ── malformed input ──────────────────────────────────────────────────────────

test("non-JSON stdout is an error", () => {
  const r = interpretProbe({
    code: 0,
    stdout: "Node Version Manager (v0.40.0)\nUsage:\n",
  });
  assert.equal(r.status, "error");
  assert.match(r.reason, /not JSON/);
});

test("an unrecognised status is an error, not a pass-through", () => {
  const r = interpretProbe({
    code: 0,
    stdout: JSON.stringify({ status: "maybe" }),
  });
  assert.equal(r.status, "error");
  assert.match(r.reason, /unrecognised status/);
});

test("a spawn failure is an error naming the cause", () => {
  const r = interpretProbe({
    spawnError: new Error("ENOENT node"),
    stdout: "",
  });
  assert.equal(r.status, "error");
  assert.match(r.reason, /ENOENT node/);
});

test("a timeout is an error", () => {
  const r = interpretProbe({ timedOut: true, stdout: "" });
  assert.equal(r.status, "error");
  assert.match(r.reason, /timed out/);
});

test("JSON null stdout is an error, not a silent pass", () => {
  assert.equal(interpretProbe({ code: 0, stdout: "null" }).status, "error");
});

// ── adapter table ────────────────────────────────────────────────────────────

test("three adapters ship", () => {
  assert.deepEqual(Object.keys(ADAPTERS).sort(), [
    "develop-batch",
    "develop-next",
    "generic",
  ]);
});

test("develop-next probes select-next.mjs and honours --roadmap", () => {
  const a = ADAPTERS["develop-next"];
  assert.deepEqual(a.probeArgs({}), [
    "skills/develop-next/scripts/select-next.mjs",
  ]);
  assert.deepEqual(a.probeArgs({ roadmapPath: "docs/r.md" }), [
    "skills/develop-next/scripts/select-next.mjs",
    "--roadmap",
    "docs/r.md",
  ]);
});

test("develop-batch probes the same selector with --batch", () => {
  assert.ok(ADAPTERS["develop-batch"].probeArgs({}).includes("--batch"));
});

test("generic has no probe, so the loop always spawns", () => {
  assert.equal(ADAPTERS.generic.probeArgs({}), null);
});

test("each adapter names the state files the classifier reads", () => {
  assert.equal(
    ADAPTERS["develop-next"].stateFile,
    ".claude/state/develop-next.state.json",
  );
  assert.equal(
    ADAPTERS["develop-batch"].stateFile,
    ".claude/state/develop-batch.state.json",
  );
  assert.equal(
    ADAPTERS.generic.stateFile,
    null,
    "a generic command has no run-state file",
  );
  for (const a of Object.values(ADAPTERS)) {
    assert.equal(a.lockFile, ".claude/state/develop-pipeline.lock");
    assert.equal(a.haltFile, ".claude/state/develop-pipeline.last-halt.json");
  }
});

test("resolveAdapter rejects an unknown name rather than defaulting", () => {
  assert.throws(() => resolveAdapter("nope"), /unknown adapter/);
});

test("resolveAdapter applies declarative config overrides without mutating the table", () => {
  // A temp cwd, never the repository root: there the gitignored .agents/skills
  // symlink would resolve the probe to .agents/skills/… locally and skills/… in CI.
  const cwd = probeProject(["skills/"]);
  const a = resolveAdapter(
    "develop-next",
    {
      loopSupervisor: {
        adapters: {
          "develop-next": { stateFile: ".claude/state/custom.json" },
        },
      },
    },
    { cwd },
  );
  assert.equal(a.stateFile, ".claude/state/custom.json");
  assert.equal(
    ADAPTERS["develop-next"].stateFile,
    ".claude/state/develop-next.state.json",
    "the shared table must not be mutated by a resolve",
  );
  assert.equal(typeof a.probeArgs, "function", "methods survive the merge");
  assert.ok(
    a.probeArgs({}).includes("skills/develop-next/scripts/select-next.mjs"),
  );
});

// ── probeScript default: found wherever the skills are installed (task 214) ──

/** A temp project holding an empty select-next.mjs under each given root. */
function probeProject(roots) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "ls-probe-"));
  for (const root of roots) {
    const file = path.join(dir, root, "develop-next/scripts/select-next.mjs");
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, "");
  }
  return dir;
}

test("the candidate order is .agents/skills, .claude/skills, skills", () => {
  assert.deepEqual(PROBE_SCRIPT_CANDIDATES, [
    ".agents/skills/develop-next/scripts/select-next.mjs",
    ".claude/skills/develop-next/scripts/select-next.mjs",
    "skills/develop-next/scripts/select-next.mjs",
  ]);
});

for (const name of ["develop-next", "develop-batch"]) {
  for (const root of [".agents/skills/", ".claude/skills/", "skills/"]) {
    test(`${name}: only ${root} present → that copy is the probe`, () => {
      const a = resolveAdapter(name, undefined, { cwd: probeProject([root]) });
      assert.equal(
        a.probeScript,
        root + "develop-next/scripts/select-next.mjs",
      );
      assert.equal(a.probeArgs({})[0], a.probeScript);
    });
  }

  test(`${name}: none present → the skills/… default is kept and the miss is recorded in probeSearched`, () => {
    const a = resolveAdapter(name, undefined, { cwd: probeProject([]) });
    assert.equal(a.probeScript, "skills/develop-next/scripts/select-next.mjs");
    assert.deepEqual(a.probeSearched, [...PROBE_SCRIPT_CANDIDATES]);
  });

  test(`${name}: the table default is the last candidate (one definition, CR-2)`, () => {
    assert.equal(
      ADAPTERS[name].probeScript,
      PROBE_SCRIPT_CANDIDATES[PROBE_SCRIPT_CANDIDATES.length - 1],
    );
    assert.equal(ADAPTERS[name].probeScript, DEFAULT_PROBE_SCRIPT);
  });
}

test("two candidates present → the earlier one in the search order wins", () => {
  const a = resolveAdapter("develop-next", undefined, {
    cwd: probeProject(["skills/", ".agents/skills/"]),
  });
  assert.equal(
    a.probeScript,
    ".agents/skills/develop-next/scripts/select-next.mjs",
  );
});

test("a configured probeScript is returned verbatim and never searched", () => {
  const cwd = probeProject([".agents/skills/", ".claude/skills/", "skills/"]);
  const a = resolveAdapter(
    "develop-next",
    {
      loopSupervisor: {
        adapters: { "develop-next": { probeScript: "tools/my-probe.mjs" } },
      },
    },
    { cwd },
  );
  assert.equal(a.probeScript, "tools/my-probe.mjs");
  assert.equal(a.probeArgs({})[0], "tools/my-probe.mjs");
});

test("a configured probeScript resets probeSearched, even when nothing exists", () => {
  const a = resolveAdapter(
    "develop-next",
    {
      loopSupervisor: {
        adapters: { "develop-next": { probeScript: "tools/missing.mjs" } },
      },
    },
    { cwd: probeProject([]) },
  );
  assert.equal(a.probeScript, "tools/missing.mjs");
  assert.equal(a.probeSearched, null);
});

test("probeSearched is a fresh copy, not the frozen candidate list", () => {
  const a = resolveAdapter("develop-next", undefined, {
    cwd: probeProject([]),
  });
  assert.notEqual(a.probeSearched, PROBE_SCRIPT_CANDIDATES);
  a.probeSearched.push("x");
  assert.equal(PROBE_SCRIPT_CANDIDATES.length, 3);
});

test("one candidate present → probeSearched is null", () => {
  const a = resolveAdapter("develop-next", undefined, {
    cwd: probeProject([".claude/skills/"]),
  });
  assert.equal(a.probeSearched, null);
});

test("generic keeps its null probe and is not searched", () => {
  const a = resolveAdapter("generic", undefined, {
    cwd: probeProject([".agents/skills/"]),
  });
  assert.equal(a.probeScript, null);
  assert.equal(a.probeArgs({}), null);
});

test("resolving does not change the table's probeScript literal", () => {
  resolveAdapter("develop-next", undefined, {
    cwd: probeProject([".agents/skills/"]),
  });
  assert.equal(
    ADAPTERS["develop-next"].probeScript,
    "skills/develop-next/scripts/select-next.mjs",
  );
});

test("firstExisting checks each candidate at most once and stops at the first hit", () => {
  const calls = [];
  const count = (hit) => (p) => {
    calls.push(p);
    return p.endsWith(hit);
  };
  firstExisting("/proj", PROBE_SCRIPT_CANDIDATES, count("nothing-matches"));
  assert.equal(calls.length, 3, "no candidate exists: one check each, no more");

  calls.length = 0;
  const found = firstExisting(
    "/proj",
    PROBE_SCRIPT_CANDIDATES,
    count(path.join(".agents/skills", "develop-next/scripts/select-next.mjs")),
  );
  assert.equal(found, PROBE_SCRIPT_CANDIDATES[0]);
  assert.equal(calls.length, 1, "the first candidate exists: one check only");
});

test("findExisting returns null when no candidate exists, else the first that does", () => {
  assert.equal(findExisting(probeProject([]), PROBE_SCRIPT_CANDIDATES), null);
  assert.equal(
    findExisting(
      probeProject(["skills/", ".claude/skills/"]),
      PROBE_SCRIPT_CANDIDATES,
    ),
    ".claude/skills/develop-next/scripts/select-next.mjs",
  );
});

// ── probeMissing: a missing probe script is its own error (task 224) ─────────

test("probeMissing: the generic adapter has no probe → null", () => {
  const cwd = probeProject([]);
  assert.equal(
    probeMissing(resolveAdapter("generic", undefined, { cwd }), cwd),
    null,
  );
});

test("probeMissing: the resolved script exists → null", () => {
  const cwd = probeProject([".claude/skills/"]);
  const a = resolveAdapter("develop-next", undefined, { cwd });
  assert.equal(probeMissing(a, cwd), null);
});

for (const name of ["develop-next", "develop-batch"]) {
  test(`probeMissing: ${name}, nothing installed → names the default and every path searched`, () => {
    const cwd = probeProject([]);
    const r = probeMissing(resolveAdapter(name, undefined, { cwd }), cwd);
    assert.equal(r.status, "error");
    assert.ok(
      r.reason.startsWith(
        "probe script not found: skills/develop-next/scripts/select-next.mjs",
      ),
      r.reason,
    );
    for (const c of PROBE_SCRIPT_CANDIDATES) assert.ok(r.reason.includes(c), c);
    assert.ok(
      r.reason.includes("loopSupervisor.adapters." + name + ".probeScript"),
      r.reason,
    );
    assert.doesNotMatch(r.reason, /realpath|symlink/);
  });
}

test("probeMissing: a missing override names its config key, not the search", () => {
  const cwd = probeProject([]);
  const a = resolveAdapter(
    "develop-next",
    {
      loopSupervisor: {
        adapters: { "develop-next": { probeScript: "tools/missing.mjs" } },
      },
    },
    { cwd },
  );
  const r = probeMissing(a, cwd);
  assert.equal(r.status, "error");
  assert.ok(
    r.reason.startsWith("probe script not found: tools/missing.mjs"),
    r.reason,
  );
  assert.ok(
    r.reason.includes("loopSupervisor.adapters.develop-next.probeScript"),
    r.reason,
  );
  assert.ok(!r.reason.includes(".agents/skills/"), r.reason);
});

test("probeMissing: an absolute override that exists → null (resolved, not joined)", () => {
  const cwd = probeProject([]);
  const elsewhere = probeProject(["skills/"]);
  const abs = path.join(
    elsewhere,
    "skills/develop-next/scripts/select-next.mjs",
  );
  const a = resolveAdapter(
    "develop-next",
    { loopSupervisor: { adapters: { "develop-next": { probeScript: abs } } } },
    { cwd },
  );
  assert.equal(probeMissing(a, cwd), null);
});

test("probeMissing makes one exists call for a probe, none without one", () => {
  const calls = [];
  const exists = (p) => {
    calls.push(p);
    return true;
  };
  const a = resolveAdapter("develop-next", undefined, {
    cwd: probeProject([]),
  });
  probeMissing(a, "/proj", exists);
  assert.equal(calls.length, 1);
  assert.equal(calls[0], path.resolve("/proj", a.probeScript));

  calls.length = 0;
  probeMissing(
    resolveAdapter("generic", undefined, { cwd: "/proj" }),
    "/proj",
    exists,
  );
  assert.equal(calls.length, 0);
});

// ── progress oracles, against a real throwaway repo ──────────────────────────

function tmpRepo() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "loopsup-"));
  const run = (args) =>
    execFileSync("git", args, { cwd: dir, stdio: "ignore" });
  run(["init", "-q", "-b", "develop"]);
  run(["config", "user.email", "t@example.com"]);
  run(["config", "user.name", "T"]);
  writeFileSync(path.join(dir, "a.txt"), "1");
  run(["add", "-A"]);
  run(["commit", "-qm", "chore: init"]);
  return { dir, run };
}
const sha = (dir, ref) =>
  execFileSync("git", ["rev-parse", ref], {
    cwd: dir,
    encoding: "utf8",
  }).trim();

test("tickCommitOracle fires on a docs(roadmap): tick commit", () => {
  const { dir, run } = tmpRepo();
  const before = sha(dir, "develop");
  writeFileSync(path.join(dir, "a.txt"), "2");
  run(["commit", "-aqm", "docs(roadmap): tick T62 [x] — loop supervisor"]);
  assert.equal(
    tickCommitOracle({ cwd: dir, baseRef: "develop", beforeSha: before }),
    true,
  );
});

test("tickCommitOracle does NOT fire on an unrelated commit", () => {
  const { dir, run } = tmpRepo();
  const before = sha(dir, "develop");
  writeFileSync(path.join(dir, "a.txt"), "2");
  run(["commit", "-aqm", "feat(x): something else entirely"]);
  assert.equal(
    tickCommitOracle({ cwd: dir, baseRef: "develop", beforeSha: before }),
    false,
    "a commit is not progress; a roadmap tick is",
  );
});

test("tickCommitOracle does not fire when nothing moved", () => {
  const { dir } = tmpRepo();
  const before = sha(dir, "develop");
  assert.equal(
    tickCommitOracle({ cwd: dir, baseRef: "develop", beforeSha: before }),
    false,
  );
});

test("tickCommitOracle finds the tick among several new commits", () => {
  const { dir, run } = tmpRepo();
  const before = sha(dir, "develop");
  for (const [f, msg] of [
    ["b.txt", "feat: work"],
    ["c.txt", "test: more"],
    ["d.txt", "docs(roadmap): tick T9 [x] — done"],
  ]) {
    writeFileSync(path.join(dir, f), "x");
    run(["add", "-A"]);
    run(["commit", "-qm", msg]);
  }
  assert.equal(
    tickCommitOracle({ cwd: dir, baseRef: "develop", beforeSha: before }),
    true,
  );
});

test("tickCommitOracle is false without a beforeSha rather than guessing", () => {
  const { dir } = tmpRepo();
  assert.equal(
    tickCommitOracle({ cwd: dir, baseRef: "develop", beforeSha: null }),
    false,
  );
});

test("anyCommitOracle fires on any new commit", () => {
  const { dir, run } = tmpRepo();
  const before = sha(dir, "HEAD");
  writeFileSync(path.join(dir, "a.txt"), "2");
  run(["commit", "-aqm", "anything at all"]);
  assert.equal(anyCommitOracle({ cwd: dir, beforeSha: before }), true);
});

test("anyCommitOracle is false when HEAD did not move", () => {
  const { dir } = tmpRepo();
  assert.equal(
    anyCommitOracle({ cwd: dir, beforeSha: sha(dir, "HEAD") }),
    false,
  );
});

test("oracles return false rather than throwing when git fails", () => {
  assert.equal(
    tickCommitOracle({
      cwd: "/nonexistent-path-xyz",
      baseRef: "develop",
      beforeSha: "abc",
    }),
    false,
  );
});
