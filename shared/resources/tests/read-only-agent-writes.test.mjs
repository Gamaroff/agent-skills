// The writes moved out of read-only Explore prompts land in the dispatching step, and work
// (task.189, obs #191, #218). Each block is cut from the shipped document and RUN — a grep of the
// document would prove the text exists, not that the write happens.
//
//   1. develop-pipeline-step-5-6-qa-loop.md "Write the matrix from the mapper's reply": the mapper
//      returns its matrix between markers; the block writes exactly that text, byte for byte, and
//      writes nothing (with a warning) when the reply carries no well-formed marked block.
//   2. finalise/SKILL.md Step 3b.1: the security agent returns a probe plan; the block runs it.
//      probes_executed is the record's totals.executed, an engine refusal is recorded and never
//      counted, and an argument holding a space reaches the engine as one argument.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  ROOT,
  SHELLS,
  readDoc,
  blockBy,
  bind,
  fixtureRepo,
  write,
  run,
} from "./lib/executed-prose.mjs";

// --- 1. The matrix write block ---------------------------------------------------------------------

const QA_LOOP = "shared/resources/develop-pipeline-step-5-6-qa-loop.md";
const matrixBlock = () =>
  bind(
    blockBy(
      readDoc(QA_LOOP),
      'MATRIX="{doc-directory}/.summaries/qa-traceability-matrix.md"',
    ),
    {
      "{doc-directory}": "docs/tasks/task.1.x",
    },
  );

const MATRIX =
  "# QA Traceability Matrix\n\n| Criterion | Spec | Src | Coverage | Uncertainty |\n|---|---|---|---|---|\n| SC1: `a | b` — ünïcode  | t.test.js | x.js | full | — |\n";

for (const shell of SHELLS) {
  test(`${shell}: a marked matrix is written byte for byte, and the reply file is removed`, () => {
    const { work } = fixtureRepo();
    write(
      work,
      ".claude/state/mapper-reply.md",
      `Mapped.\n<!-- matrix-start -->\n${MATRIX}<!-- matrix-end -->\n1 ACs mapped.\n`,
    );
    const r = run(shell, matrixBlock(), { cwd: work });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /matrix: written/);
    const out = path.join(
      work,
      "docs/tasks/task.1.x/.summaries/qa-traceability-matrix.md",
    );
    assert.equal(fs.readFileSync(out, "utf8"), MATRIX);
    assert.equal(
      fs.existsSync(path.join(work, ".claude/state/mapper-reply.md")),
      false,
    );
  });

  test(`${shell}: a reply without a well-formed marked block writes nothing and warns`, () => {
    for (const reply of [
      "Matrix written to docs/x/.summaries/qa-traceability-matrix.md — 3 ACs mapped.\n",
      `<!-- matrix-start -->\n${MATRIX}`,
      `<!-- matrix-end -->\n${MATRIX}<!-- matrix-start -->\n`,
      `<!-- matrix-start -->\n${MATRIX}<!-- matrix-end -->\n<!-- matrix-start -->\nx\n<!-- matrix-end -->\n`,
      "<!-- matrix-start -->\n<!-- matrix-end -->\n",
    ]) {
      const { work } = fixtureRepo();
      write(work, ".claude/state/mapper-reply.md", reply);
      const r = run(shell, matrixBlock(), { cwd: work });
      assert.equal(r.status, 0, r.stderr);
      assert.match(
        r.stdout,
        /⚠️ mapper returned (no|an empty) matrix/,
        `no warning for: ${JSON.stringify(reply)}`,
      );
      assert.equal(
        fs.existsSync(
          path.join(
            work,
            "docs/tasks/task.1.x/.summaries/qa-traceability-matrix.md",
          ),
        ),
        false,
        `a matrix was written for: ${JSON.stringify(reply)}`,
      );
      // QA-2 (task.189 cycle 1): a refused reply leaves nothing behind — not even the directory.
      assert.equal(
        fs.existsSync(path.join(work, "docs/tasks/task.1.x")),
        false,
        `a directory was created for: ${JSON.stringify(reply)}`,
      );
    }
  });
}

// --- 2. finalise Step 3b.1 -------------------------------------------------------------------------

const FINALISE = "skills/finalise/SKILL.md";
const RUNNER = path.join(ROOT, "shared/resources/security-probe-plan.mjs");
const FIXTURES = path.join(
  ROOT,
  "shared/resources/tests/fixtures/security-probe",
);

const WAIT_STUB = ".wait-stub.sh";
const waitLog = (work) =>
  fs.existsSync(path.join(work, ".wait.log"))
    ? fs.readFileSync(path.join(work, ".wait.log"), "utf8").trim().split("\n")
    : [];

function stepBlock() {
  return bind(blockBy(readDoc(FINALISE), "security-probe-plan.mjs"), {
    ".agents/skills/finalise/references/security-probe-plan.mjs": RUNNER,
    // A stand-in that logs its arguments, so the wait the block marks can be asserted (CR4-1).
    ".agents/skills/finalise/references/set-waiting-on.sh": WAIT_STUB,
    "{story.{P}.{E}.{S} | task.{id} | bug mode: the bug prefix, e.g. task.67.bug.3}":
      "task.9",
    "{Step 0's DOD_N}": "2",
    "{document-directory}": "docs/tasks/task.9.x",
  });
}

/** A fixture repository holding two controls: one that engages, one that accepts everything. */
function probeRepo(plan) {
  const { work } = fixtureRepo();
  for (const f of ["engaging-control.mjs", "absent-control.mjs"]) {
    write(work, `lib/${f}`, fs.readFileSync(path.join(FIXTURES, f), "utf8"));
  }
  write(work, ".claude/state/probe-plan.json", JSON.stringify(plan));
  write(work, WAIT_STUB, 'echo "$*" >> .wait.log\n');
  return work;
}

const result = (work) =>
  JSON.parse(
    fs.readFileSync(
      path.join(work, ".claude/state/probe-plan-result.json"),
      "utf8",
    ),
  );
const record = (work) =>
  JSON.parse(
    fs.readFileSync(
      path.join(work, "docs/tasks/task.9.x/task.9.dod.2.security.run.json"),
      "utf8",
    ),
  );

test("Step 3b.1: probes_executed is the record's totals.executed, across every control", () => {
  const work = probeRepo([
    {
      argv: [
        "--sink",
        "url-authority",
        "--entry",
        "lib/engaging-control.mjs#validateHost",
      ],
    },
    {
      argv: [
        "--sink",
        "url-authority",
        "--entry",
        "lib/absent-control.mjs#validateHost",
      ],
    },
  ]);
  const r = run("bash", stepBlock(), { cwd: work });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /probe-plan exit=0/);
  const out = result(work);
  const rec = record(work);
  assert.ok(
    rec.totals.executed > 0,
    "the record counted nothing — the fixture never ran",
  );
  assert.equal(out.probes_executed, rec.totals.executed);
  assert.equal(out.runs.length, 2);
  // An independent check (task.189 CR-5): the runs' own engine counts, summed, agree with the
  // record the runner read — the record is not the only witness.
  assert.equal(
    out.probes_executed,
    out.runs.reduce((n, x) => n + x.executed, 0),
  );
  // The accept-everything control reproduces hostile cases; each probe carries its input verbatim
  // and no severity (Step 8a must read it as not-low).
  const hostile = out.probes.filter(
    (p) => p.control.includes("absent-control") && p.expected === "rejected",
  );
  assert.ok(
    hostile.length > 0,
    "the accept-everything control reproduced nothing",
  );
  for (const p of out.probes) {
    assert.equal(typeof p.input, "string", `probe ${p.id} lost its input`);
    assert.equal(
      "severity" in p,
      false,
      `probe ${p.id} was graded by the orchestrator`,
    );
  }
});

test("Step 3b.1: an entry the engine refuses is recorded with its reason and never counted", () => {
  const work = probeRepo([
    {
      argv: [
        "--sink",
        "url-authority",
        "--entry",
        "lib/engaging-control.mjs#validateHost",
      ],
    },
    {
      argv: [
        "--sink",
        "url-authority",
        "--entry",
        "lib/absent-control.mjs#validateHost",
        "--bogus-flag",
      ],
    },
    {
      argv: [
        "--sink",
        "url-authority",
        "--entry",
        "lib/absent-control.mjs#validateHost",
        "--record",
        "/tmp/elsewhere.json",
      ],
    },
  ]);
  const r = run("bash", stepBlock(), { cwd: work });
  assert.equal(r.status, 0, r.stderr);
  const out = result(work);
  assert.deepEqual(
    out.runs.map((x) => x.index),
    [0],
    "a refused entry was counted as a run",
  );
  assert.deepEqual(
    out.refusals.map((x) => x.index),
    [1, 2],
  );
  assert.match(out.refusals[0].reason, /unknown argument|bogus/i);
  assert.match(out.refusals[1].reason, /plan-entry-owns-flag: --record/);
  assert.equal(out.probes_executed, record(work).totals.executed);
  assert.equal(
    record(work).controls.length,
    1,
    "a refused entry reached the record",
  );
  assert.equal(fs.existsSync("/tmp/elsewhere.json"), false);
});

test("Step 3b.1: an argument holding a space reaches the engine as one argument", () => {
  const work = probeRepo([
    {
      argv: [
        "--sink",
        "url-authority",
        "--entry",
        "lib/engaging-control.mjs#validateHost",
        "--name",
        "host check with spaces",
      ],
    },
  ]);
  const r = run("bash", stepBlock(), { cwd: work });
  assert.equal(r.status, 0, r.stderr);
  const out = result(work);
  assert.deepEqual(
    out.refusals,
    [],
    `split into separate arguments: ${JSON.stringify(out.refusals)}`,
  );
  assert.equal(record(work).controls[0].name, "host check with spaces");
});

test("Step 3b.1: inline cases are written beside the record, numbered by DOD_N, and used", () => {
  const cases = [
    {
      id: "t9.evil",
      sink: "url-authority",
      input: "evil.example@127.0.0.1",
      why: "userinfo",
      correct: "reject",
      direction: "hostile",
    },
    {
      id: "t9.ok",
      sink: "url-authority",
      input: "example.com",
      why: "plain host",
      correct: "accept",
      direction: "legitimate",
    },
  ];
  const work = probeRepo([
    {
      argv: [
        "--entry",
        "lib/absent-control.mjs#validateHost",
        "--sink",
        "url-authority",
      ],
      cases,
    },
  ]);
  const r = run("bash", stepBlock(), { cwd: work });
  assert.equal(r.status, 0, r.stderr);
  const file = path.join(
    work,
    "docs/tasks/task.9.x/task.9.dod.2.security.cases.json",
  );
  assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), cases);
  const out = result(work);
  assert.equal(out.probes_executed, 2);
  assert.deepEqual(
    out.probes.map((p) => [p.id, p.input]),
    [["t9.evil", "evil.example@127.0.0.1"]],
  );
});

test("Step 3b.1: an empty plan executes nothing, so the zero-guard has a zero to read", () => {
  const work = probeRepo([]);
  const r = run("bash", stepBlock(), { cwd: work });
  assert.equal(r.status, 0, r.stderr);
  const out = result(work);
  assert.equal(out.reason, "empty-plan");
  assert.equal(out.probes_executed, 0);
});

// --- task.189 QA cycle 1 regressions -------------------------------------------------------------

test("Step 3b.1: an escape reaches the result, even on a control that engages (CR-2)", () => {
  const work = probeRepo([]);
  write(
    work,
    "lib/engaging-but-escaping.mjs",
    fs.readFileSync(path.join(FIXTURES, "engaging-but-escaping.mjs"), "utf8"),
  );
  write(
    work,
    ".claude/state/probe-plan.json",
    JSON.stringify([
      {
        argv: [
          "--sink",
          "url-authority",
          "--entry",
          "lib/engaging-but-escaping.mjs#validateHost",
        ],
      },
    ]),
  );
  const r = run("bash", stepBlock(), { cwd: work });
  assert.equal(r.status, 0, r.stderr);
  const out = result(work);
  assert.equal(out.runs[0].verdict, "engages");
  assert.ok(out.runs[0].escapes > 0, "the run's escape count was dropped");
  assert.equal(out.escapes.length, out.runs[0].escapes);
  assert.match(out.escapes[0].path, /escaped-while-engaging/);
});

test("planArgvAllowed refuses every owned flag in both spellings, and allows a clean argv (QA-1)", async () => {
  const { planArgvAllowed } = await import(RUNNER);
  const base = ["--sink", "path", "--entry", "lib/x.js#isSafe"];
  assert.deepEqual(planArgvAllowed(base), base);
  for (const flag of [
    "--record",
    "--repo-root",
    "--cases-file",
    "--json",
    "--emit-block",
    "--timeout",
  ]) {
    assert.equal(
      planArgvAllowed([...base, flag, "v"]),
      null,
      `${flag} allowed`,
    );
    assert.equal(
      planArgvAllowed([...base, `${flag}=v`]),
      null,
      `${flag}=v allowed`,
    );
  }
  for (const bad of [[], "--sink path", [1, 2], null, ["--sink", 3]]) {
    assert.equal(planArgvAllowed(bad), null, `${JSON.stringify(bad)} allowed`);
  }
  // A value that merely CONTAINS an owned flag's name is not that flag.
  const named = [...base, "--name", "record-keeper --record"];
  assert.deepEqual(planArgvAllowed(named), named);
});

test("Step 3b.1: the runner refuses an owned flag in its --flag=value spelling (QA-1)", () => {
  const work = probeRepo([
    {
      argv: [
        "--sink",
        "url-authority",
        "--entry",
        "lib/engaging-control.mjs#validateHost",
        "--repo-root=/",
      ],
    },
  ]);
  const r = run("bash", stepBlock(), { cwd: work });
  assert.equal(r.status, 0, r.stderr);
  const out = result(work);
  assert.deepEqual(out.runs, []);
  assert.match(out.refusals[0].reason, /plan-entry-owns-flag: --repo-root/);
});

test("the runner reports an unfoldable record as record-unreadable, never as zero executed (CR-4)", async () => {
  const { runPlan } = await import(RUNNER);
  const { work } = fixtureRepo();
  // A stub engine: the CLI answers like a run, and readRecord() cannot fold the record.
  write(
    work,
    "stub-engine.mjs",
    [
      "export function readRecord() { throw new Error('entry 1 is not a control'); }",
      "if (process.argv[1] && process.argv[1].endsWith('stub-engine.mjs')) {",
      "  process.stdout.write(JSON.stringify({ entry: 'x#y', verdict: 'engages', executed: 4, reproduced: [], overblocked: [], escapes: [] }));",
      "}",
    ].join("\n"),
  );
  write(
    work,
    "plan.json",
    JSON.stringify([{ argv: ["--sink", "path", "--entry", "x#y"] }]),
  );
  const { exit, out } = await runPlan({
    plan: path.join(work, "plan.json"),
    record: path.join(work, "run.json"),
    casesBase: path.join(work, "cases"),
    repoRoot: work,
    engine: path.join(work, "stub-engine.mjs"),
  });
  assert.equal(exit, 0);
  assert.equal(out.runs.length, 1);
  assert.equal(out.reason, "record-unreadable");
  assert.match(out.error, /not a control/);
});

// --- task.189 QA cycle 2 regressions -------------------------------------------------------------

test("each probe carries a key unique within the run, even when two controls share case ids (CR2-1)", () => {
  const work = probeRepo([]);
  write(
    work,
    "lib/absent-control-2.mjs",
    fs.readFileSync(path.join(FIXTURES, "absent-control.mjs"), "utf8"),
  );
  write(
    work,
    ".claude/state/probe-plan.json",
    JSON.stringify([
      {
        argv: [
          "--sink",
          "url-authority",
          "--entry",
          "lib/absent-control.mjs#validateHost",
        ],
      },
      {
        argv: [
          "--sink",
          "url-authority",
          "--entry",
          "lib/absent-control-2.mjs#validateHost",
        ],
      },
    ]),
  );
  const r = run("bash", stepBlock(), { cwd: work });
  assert.equal(r.status, 0, r.stderr);
  const out = result(work);
  const ids = out.probes.map((p) => p.id);
  const keys = out.probes.map((p) => p.key);
  assert.ok(
    new Set(ids).size < ids.length,
    "the fixture no longer shares ids — the test proves nothing",
  );
  assert.equal(new Set(keys).size, keys.length, "two probes share a key");
  for (const p of out.probes) assert.match(p.key, /^\d+:/);
});

async function stubRun(work, body, extra = {}) {
  const { runPlan } = await import(RUNNER);
  write(work, "stub.mjs", body);
  write(
    work,
    "plan.json",
    JSON.stringify([{ argv: ["--sink", "path", "--entry", "x#y"] }]),
  );
  return runPlan({
    plan: path.join(work, "plan.json"),
    record: path.join(work, "run.json"),
    casesBase: path.join(work, "cases"),
    repoRoot: work,
    engine: path.join(work, "stub.mjs"),
    ...extra,
  });
}

test("a run whose record has no entry directory is record-unreadable, not zero (CR2-3)", async () => {
  const { work } = fixtureRepo();
  const { out } = await stubRun(
    work,
    [
      "export function readRecord() { return null; }",
      "if (process.argv[1] && process.argv[1].endsWith('stub.mjs')) {",
      "  process.stdout.write(JSON.stringify({ entry: 'x#y', verdict: 'engages', executed: 4, reproduced: [], overblocked: [], escapes: [] }));",
      "}",
    ].join("\n"),
  );
  assert.equal(out.runs.length, 1);
  assert.equal(out.reason, "record-unreadable");
});

test("an engine run past the overall bound is killed and recorded as a refusal, never executed (CR2-4)", async () => {
  const { work } = fixtureRepo();
  const { out } = await stubRun(work, "setTimeout(() => {}, 60000);", {
    engineTimeoutMs: 300,
  });
  assert.deepEqual(out.runs, []);
  assert.match(out.refusals[0].reason, /timed out/);
  assert.equal(out.probes_executed, 0);
});

// --- task.189 QA cycle 3 regressions -------------------------------------------------------------

test("Step 3b.1: a run killed mid-write leaves no result — never a partial or a stale one (QA3-1)", () => {
  const { work } = fixtureRepo();
  // A stand-in runner that prints half a JSON object and dies the way a killed process does.
  write(
    work,
    "killed-runner.mjs",
    // Deliberate on both paths (CR5-3): imported for the budget it exports a bound; run as the CLI it
    // prints half a JSON object and dies the way a killed process does.
    'export const ENGINE_TIMEOUT_MS = 60000;\nif (process.argv[1] && process.argv[1].endsWith(\'killed-runner.mjs\')) { process.stdout.write(\'{"reason": "ran", "probes_exec\'); process.exit(137); }\n',
  );
  write(work, ".claude/state/probe-plan.json", "[]");
  write(work, WAIT_STUB, 'echo "$*" >> .wait.log\n');
  write(
    work,
    ".claude/state/probe-plan-result.json",
    JSON.stringify({ reason: "ran", probes_executed: 99 }),
  );
  const block = bind(blockBy(readDoc(FINALISE), "security-probe-plan.mjs"), {
    ".agents/skills/finalise/references/security-probe-plan.mjs": path.join(
      work,
      "killed-runner.mjs",
    ),
    ".agents/skills/finalise/references/set-waiting-on.sh": WAIT_STUB,
    "{story.{P}.{E}.{S} | task.{id} | bug mode: the bug prefix, e.g. task.67.bug.3}":
      "task.9",
    "{Step 0's DOD_N}": "2",
    "{document-directory}": "docs/tasks/task.9.x",
  });
  const r = run("bash", block, { cwd: work });
  assert.match(r.stdout, /probe-plan exit=137/);
  assert.match(r.stdout, /probe-plan: no result — the run did not complete/);
  // The budget path is taken on purpose (CR5-3), so assert it was (CR6-3): an empty plan is one entry.
  assert.deepEqual(waitLog(work), [
    "step-7 probe plan --kind task --budget-minutes 6",
    "--clear",
  ]);
  assert.equal(
    fs.existsSync(path.join(work, ".claude/state/probe-plan-result.json")),
    false,
    "a stale or partial result survived",
  );
  assert.equal(
    fs.existsSync(path.join(work, ".claude/state/probe-plan-result.json.tmp")),
    false,
  );
});

test("the runner refuses inline cases that repeat an id, so every probe key stays unique (CR3-2)", async () => {
  const { runPlan } = await import(RUNNER);
  const { work } = fixtureRepo();
  const c = {
    sink: "url-authority",
    input: "a",
    why: "w",
    correct: "c",
    direction: "hostile",
  };
  write(
    work,
    "plan.json",
    JSON.stringify([
      {
        argv: ["--sink", "url-authority", "--entry", "x#y"],
        cases: [
          { id: "dup", ...c },
          { id: "dup", ...c },
        ],
      },
    ]),
  );
  const { out } = await runPlan({
    plan: path.join(work, "plan.json"),
    record: path.join(work, "run.json"),
    casesBase: path.join(work, "cases"),
    repoRoot: work,
  });
  assert.deepEqual(out.runs, []);
  assert.match(out.refusals[0].reason, /plan-entry-cases-duplicate-id: dup/);
  assert.deepEqual(out.cases_files, [], "a refused entry's cases were written");
});

test("every site that lists the runner's owned flags names each one (CR3-3)", async () => {
  const { OWNED_FLAGS } = await import(RUNNER);
  assert.ok(
    OWNED_FLAGS.length >= 6,
    "OWNED_FLAGS shrank — check this test still means something",
  );
  const step = readDoc(FINALISE);
  const at = step.indexOf("#### Step 3b.1: Run the security probe plan");
  assert.ok(at >= 0);
  const step3b1 = step.slice(at, step.indexOf("#### Step 3c", at));
  const prompt = readDoc("shared/resources/finalise-dod-security-prompt.md");
  const yaml = prompt.match(/```yaml\n([\s\S]*?)```/)[1];
  const prose = prompt.slice(
    prompt.indexOf("Do not pass the arguments"),
    prompt.indexOf("Do not pass the arguments") + 400,
  );
  for (const flag of OWNED_FLAGS) {
    assert.ok(
      step3b1.includes(`\`${flag}\``),
      `finalise Step 3b.1 does not name ${flag}`,
    );
    assert.ok(
      yaml.includes(flag),
      `the prompt's output YAML comment does not name ${flag}`,
    );
    assert.ok(
      prose.includes(`\`${flag}\``),
      `the prompt's owned-argument sentence does not name ${flag}`,
    );
  }
});

// --- task.189 QA cycle 4 regressions -------------------------------------------------------------

test("the block marks its own wait with a budget from the plan and clears it (CR4-1, CR4-2)", async () => {
  const { ENGINE_TIMEOUT_MS } = await import(RUNNER);
  const work = probeRepo([
    {
      argv: [
        "--sink",
        "url-authority",
        "--entry",
        "lib/engaging-control.mjs#validateHost",
      ],
    },
    {
      argv: [
        "--sink",
        "url-authority",
        "--entry",
        "lib/absent-control.mjs#validateHost",
      ],
    },
  ]);
  // The block discards the budget import's stderr; the test sends it to a file instead, so the guard
  // below can see a CLI run it would otherwise never be shown (CR6-1).
  const IMPORT_ERR = `"$RUNNER" 2>/dev/null)`;
  const source = stepBlock();
  assert.equal(
    source.split(IMPORT_ERR).length,
    2,
    "the budget import's stderr redirect moved",
  );
  const r = run(
    "bash",
    source.split(IMPORT_ERR).join(`"$RUNNER" 2>.budget.err)`),
    {
      cwd: work,
    },
  );
  assert.equal(r.status, 0, r.stderr);
  const log = waitLog(work);
  const expected = Math.ceil((2 * ENGINE_TIMEOUT_MS) / 60000) + 5;
  assert.equal(
    log.length,
    2,
    `expected a mark and a clear, got: ${JSON.stringify(log)}`,
  );
  assert.match(
    log[0],
    new RegExp(`^step-7 probe plan --kind task --budget-minutes ${expected}$`),
  );
  assert.equal(log[1], "--clear");
  // Importing the runner to read its bound must not run it as a CLI (its entry guard reads argv[1]).
  const importErr = fs.readFileSync(path.join(work, ".budget.err"), "utf8");
  assert.equal(
    importErr,
    "",
    `the budget import printed to stderr: ${importErr}`,
  );
});

test("the result is validated with node, so a host without jq still gets a result (CR4-3)", () => {
  const work = probeRepo([]);
  const block = "jq() { return 127; }\n" + stepBlock();
  const r = run("bash", block, { cwd: work });
  assert.doesNotMatch(
    r.stdout,
    /no result/,
    "a missing jq was reported as a run that did not complete",
  );
  assert.ok(
    fs.existsSync(path.join(work, ".claude/state/probe-plan-result.json")),
    `no result without jq: ${r.stdout}`,
  );
});

test("a repeated falsy inline case is still refused as a duplicate (CR4-5)", async () => {
  const { runPlan } = await import(RUNNER);
  const { work } = fixtureRepo();
  write(
    work,
    "plan.json",
    JSON.stringify([
      { argv: ["--sink", "path", "--entry", "x#y"], cases: [null, null] },
    ]),
  );
  const { out } = await runPlan({
    plan: path.join(work, "plan.json"),
    record: path.join(work, "run.json"),
    casesBase: path.join(work, "cases"),
    repoRoot: work,
  });
  assert.deepEqual(out.runs, []);
  assert.match(out.refusals[0].reason, /plan-entry-cases-duplicate-id/);
});

// --- task.189 QA cycle 5 regressions -------------------------------------------------------------

test("a runner that fails to load still removes the stale result and reports no result (CR5-1)", () => {
  const work = probeRepo([]);
  write(
    work,
    ".claude/state/probe-plan-result.json",
    JSON.stringify({ reason: "ran", probes_executed: 99 }),
  );
  const block = bind(blockBy(readDoc(FINALISE), "security-probe-plan.mjs"), {
    ".agents/skills/finalise/references/security-probe-plan.mjs":
      "no-such-runner.mjs",
    ".agents/skills/finalise/references/set-waiting-on.sh": WAIT_STUB,
    "{story.{P}.{E}.{S} | task.{id} | bug mode: the bug prefix, e.g. task.67.bug.3}":
      "task.9",
    "{Step 0's DOD_N}": "2",
    "{document-directory}": "docs/tasks/task.9.x",
  });
  const r = run("bash", block, { cwd: work });
  assert.match(r.stdout, /the runner did not load — the wait is not marked/);
  assert.match(r.stdout, /probe-plan exit=[1-9]/);
  assert.deepEqual(
    waitLog(work),
    ["--clear"],
    "a wait was marked for a runner that did not load",
  );
  assert.match(r.stdout, /probe-plan: no result — the run did not complete/);
  assert.equal(
    fs.existsSync(path.join(work, ".claude/state/probe-plan-result.json")),
    false,
    "the stale result survived",
  );
});
