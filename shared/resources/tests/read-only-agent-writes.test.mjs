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

function stepBlock() {
  return bind(blockBy(readDoc(FINALISE), "security-probe-plan.mjs"), {
    ".agents/skills/finalise/references/security-probe-plan.mjs": RUNNER,
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
