"use strict";
/**
 * create-task --from-observation: the seed, the refusal, and the park round trip
 * (task.150, obs #147).
 *
 * `seedFromObservations` turns observation-log entries into the answers
 * create-task would otherwise have asked for, and into the `set-status` vectors
 * that park those entries. The vectors are only worth anything if the REAL
 * engine accepts them. So the round trip below runs them through
 * `observation-log.js`'s own `run()` against a scratch workspace and reads the
 * result back with `scan`, instead of asserting the vector's shape.
 *
 * The scratch workspace is REPO-LOCAL, never `os.tmpdir()`: the engine refuses
 * `/tmp` as ephemeral, so a tmpdir workspace is green on macOS (`/var/folders`)
 * and red in Linux CI. Same pattern and in-process assertion as
 * the observation-log engine's own test suite (its SCRATCH_ROOT). That suite is
 * named here without its path on purpose: a `shared/resources/` literal in a
 * skill's .js file is a bundling instruction, and would copy the suite into this
 * skill's references/.
 *
 * The engine is required by REPOSITORY path, not through `.agents/skills`, which
 * is a gitignored local symlink that CI does not have.
 *
 * Run: node --test skills/create-task/tests/from-observation.test.js
 */

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const lib = require("../scripts/lib.js");

const REPO = path.join(__dirname, "..", "..", "..");
const engine = require(
  path.join(REPO, "shared", "resources", "observation-log.js"),
);
const { CARD_TITLE_MAX } = require(
  path.join(REPO, "shared", "resources", "jira-sync.js"),
);

const SCRATCH_ROOT = path.join(REPO, ".observation-log-test-tmp");
fs.mkdirSync(SCRATCH_ROOT, { recursive: true });
const SCRATCH_REFUSAL = engine.ephemeralReason(fs.realpathSync(SCRATCH_ROOT));
if (SCRATCH_REFUSAL) {
  throw new Error(
    `scratch base ${SCRATCH_ROOT} is classified ephemeral (${SCRATCH_REFUSAL}) — the round trip would fail for a reason unrelated to what it asserts`,
  );
}

// Real-shaped entries: frontmatter keys as `renderObservation` writes them, and
// the Issue → Improvement → Principle body. The #128 title is the observation's
// own, 144 characters: the case the title bound exists for.
const OBS_128_TITLE =
  "create-task: frontmatter title unbounded — task.123 published a 252-char paragraph as the GitHub issue title; card preflight does not read title";

// `file` is part of a scan entry, and it is the entry's identity: set-status
// resolves `--id N` by the file's numeric prefix (findById), never the frontmatter.
function entry(
  id,
  {
    title,
    status = "open",
    skill = ["create-task"],
    improvement,
    file = `${String(id).padStart(4, "0")}-observation.md`,
  } = {},
) {
  return {
    frontmatter: {
      file,
      id,
      title: title || `create-task: short observation ${id}`,
      status,
      parked_until: "",
      type: "internal",
      skill,
      siblings_checked: "none",
    },
    body: [
      "## Issue",
      "",
      `What went wrong in observation ${id}. A second sentence.`,
      "",
      "## Improvement",
      "",
      improvement ||
        `Do the thing for ${id}. Then the rest of the paragraph,\nwrapped across lines.`,
      "",
      "## Principle",
      "",
      `The rule behind ${id}.`,
      "",
    ].join("\n"),
  };
}

test("parseObservationBody splits the three sections, and a missing one is empty", () => {
  const { body } = entry(7);
  const s = lib.parseObservationBody(body);
  assert.equal(s.issue, "What went wrong in observation 7. A second sentence.");
  assert.match(s.improvement, /^Do the thing for 7\./);
  assert.equal(s.principle, "The rule behind 7.");
  assert.deepEqual(lib.parseObservationBody("## Issue\n\nonly this\n"), {
    issue: "only this",
    improvement: "",
    principle: "",
  });
  // A whole file (frontmatter included) parses too, because the frontmatter has
  // no `## ` lines. That is how the skill passes it.
  const file = `---\nid: 7\ntitle: "t"\n---\n\n${body}`;
  assert.equal(lib.parseObservationBody(file).principle, "The rule behind 7.");
});

test("seed: ids, references and the Change Log description are ascending; tags are the skill union plus `observation`", () => {
  const seed = lib.seedFromObservations(
    [
      entry(135, { skill: ["create-task", "review-task"] }),
      entry(124),
      entry(127),
    ],
    { taskId: 150 },
  );
  assert.deepEqual(seed.ids, [124, 127, 135]);
  assert.deepEqual(
    seed.references.map((r) => r.split(" — ")[0]),
    ["Observation #124", "Observation #127", "Observation #135"],
  );
  assert.equal(
    seed.changeLogDescription,
    "Initial draft — cut from observations #124, #127, #135",
  );
  assert.deepEqual(seed.tags, ["create-task", "review-task", "observation"]);
  assert.equal(
    seed.description,
    "Do the thing for 124. Do the thing for 127. Do the thing for 135.",
  );
});

test("seed: a single short entry gives a title with the skill prefix removed", () => {
  const seed = lib.seedFromObservations(
    [entry(9, { title: "create-task: a short name" })],
    {
      taskId: 150,
    },
  );
  assert.equal(seed.title, "[Task 150] a short name");
  assert.equal(seed.titleReason, null);
  assert.equal(
    seed.changeLogDescription,
    "Initial draft — cut from observation #9",
  );
});

test("seed: an over-bound source title gives `title: null` (obs #128's own 144-char title)", () => {
  assert.equal(OBS_128_TITLE.length, 144);
  const seed = lib.seedFromObservations(
    [entry(128, { title: OBS_128_TITLE })],
    { taskId: 150 },
  );
  assert.equal(seed.title, null);
  assert.equal(seed.titleReason, "over-bound");
  // The bound is the shared constant, not a local number: a title exactly at it passes.
  const bare = "x".repeat(CARD_TITLE_MAX - "[Task 150] ".length);
  const atBound = lib.seedFromObservations([entry(1, { title: bare })], {
    taskId: 150,
  });
  assert.equal(atBound.title.length, CARD_TITLE_MAX);
  const overBound = lib.seedFromObservations(
    [entry(1, { title: `${bare}x` })],
    { taskId: 150 },
  );
  assert.equal(overBound.titleReason, "over-bound");
});

test("seed: two or more entries never name the task themselves", () => {
  const seed = lib.seedFromObservations([entry(1), entry(2)], { taskId: 150 });
  assert.equal(seed.title, null);
  assert.equal(seed.titleReason, "multiple-entries");
});

test("seed: an entry that is not `open` is refused, naming its status", () => {
  for (const status of ["parked", "actioned"]) {
    assert.throws(
      () =>
        lib.seedFromObservations([entry(1), entry(147, { status })], {
          taskId: 150,
        }),
      new RegExp(`observation #147 is ${status} — it already has a home`),
    );
  }
});

test("seed: a frontmatter id that disagrees with the file id is refused (TASK-150-BUG-1, -3)", () => {
  // The file `0124-observation.md` is entry #124 to set-status. Each frontmatter
  // id below was once ACCEPTED and converted ("0x10" → 16, "1e2" → 100, "" → 0),
  // so the park vector named a different entry. Now any disagreement refuses.
  const refused = [
    "",
    "0x10",
    "1e2",
    "-3",
    "0",
    " 12 ",
    "1.5",
    "0124",
    0,
    -1,
    1.5,
    12,
    "12",
    null,
    undefined,
    9007199254740993,
    1e21,
  ];
  for (const id of refused) {
    assert.throws(
      () =>
        lib.seedFromObservations([entry(id, { file: "0124-observation.md" })], {
          taskId: 150,
        }),
      /does not match its file id 124/,
      `frontmatter id ${JSON.stringify(id)} must be refused`,
    );
  }
  for (const id of [124, "124"]) {
    const seed = lib.seedFromObservations(
      [entry(id, { file: "0124-observation.md" })],
      { taskId: 150 },
    );
    assert.equal(
      seed.park[0][2],
      "124",
      `id ${JSON.stringify(id)} is accepted as itself`,
    );
  }
});

test("seed: an entry whose file gives no safe id is refused; two entries naming one id are refused", () => {
  for (const file of [
    "",
    "observation.md",
    "0-x.md",
    "x-0005.md",
    "9007199254740993-x.md",
  ]) {
    assert.throws(
      () => lib.seedFromObservations([entry(5, { file })], { taskId: 150 }),
      /has no usable file id/,
      `file ${JSON.stringify(file)} must be refused`,
    );
  }
  // No `file` at all (a raw frontmatter, not a scan entry). The fixture's
  // default parameter would supply one, so delete it explicitly.
  const noFile = entry(5);
  delete noFile.frontmatter.file;
  assert.throws(
    () => lib.seedFromObservations([noFile], { taskId: 150 }),
    /has no usable file id/,
  );
  // A path is accepted: the scan entry's `file` is a basename, but a caller may pass a path.
  assert.equal(
    lib.seedFromObservations([entry(5, { file: "log/0005-x.md" })], {
      taskId: 150,
    }).park[0][2],
    "5",
  );
  assert.throws(
    () =>
      lib.seedFromObservations(
        [entry(5), entry(5, { file: "0005-other.md" })],
        { taskId: 150 },
      ),
    /#5 is named by more than one entry/,
  );
});

test("seed on REAL scan output: a malformed frontmatter id is refused, not parked on another entry (TASK-150-BUG-3)", () => {
  // Scan runs parseInt on the id: `id: 1e2` in 0005-*.md arrives as 1, and the
  // cycle-1 guard, which read that 1, emitted `--id 1` — parking 0001-*. This
  // test drives the seed with what scan actually returns, not a raw value.
  const ws = fs.mkdtempSync(path.join(SCRATCH_ROOT, "from-observation-scan-"));
  try {
    assert.equal(engine.run(["init", "--workspace", ws, "--json"]).exitCode, 0);
    const logDir = path.join(ws, "skill-observations", "observation-log");
    const write = (name, id) =>
      fs.writeFileSync(
        path.join(logDir, name),
        `---\nid: ${id}\ntitle: "create-task: t"\nstatus: open\nskill:\n  - create-task\n---\n\n## Improvement\n\nDo it.\n`,
      );
    write("0001-bystander.md", "1");
    write("0005-malformed.md", "1e2");
    const scanned = engine.run(["scan", "--workspace", ws, "--json"]).entries;
    const malformed = scanned.find((e) => e.file === "0005-malformed.md");
    assert.ok(malformed, "non-vacuity: the malformed entry is scanned");
    assert.equal(
      malformed.id,
      1,
      "precondition: scan reads `id: 1e2` as 1 — the shape that bypassed the cycle-1 guard",
    );
    assert.throws(
      () =>
        lib.seedFromObservations([{ frontmatter: malformed, body: "" }], {
          taskId: 150,
        }),
      /0005-malformed\.md has frontmatter id 1, which does not match its file id 5/,
    );
    const bystander = scanned.find((e) => e.file === "0001-bystander.md");
    assert.deepEqual(
      lib
        .seedFromObservations([{ frontmatter: bystander, body: "" }], {
          taskId: 150,
        })
        .park[0].slice(0, 3),
      ["set-status", "--id", "1"],
      "a well-formed entry still seeds from scan output",
    );
  } finally {
    fs.rmSync(ws, { recursive: true, force: true });
  }
});

test("seed: status is read by the engine's statusOf, so an entry the log lists as open is open (TASK-150-BUG-2)", () => {
  for (const status of [" open ", "", null]) {
    const fm = { ...entry(5).frontmatter, status };
    assert.equal(
      engine.statusOf(fm),
      "open",
      "precondition: the engine reads this status as open",
    );
    assert.doesNotThrow(
      () =>
        lib.seedFromObservations([{ frontmatter: fm, body: "" }], {
          taskId: 150,
        }),
      `status ${JSON.stringify(status)} must be accepted`,
    );
  }
});

test("round trip: the park vectors are accepted by the real engine and leave each entry parked on the task", () => {
  const ws = fs.mkdtempSync(path.join(SCRATCH_ROOT, "from-observation-"));
  try {
    const init = engine.run(["init", "--workspace", ws, "--json"]);
    assert.equal(init.exitCode, 0, JSON.stringify(init));

    const written = [];
    for (const title of [
      "first distinct observation",
      "second unrelated finding",
    ]) {
      const bodyFile = path.join(ws, `${written.length}.body.md`);
      fs.writeFileSync(bodyFile, entry(0).body);
      const w = engine.run([
        "write",
        "--workspace",
        ws,
        "--title",
        title,
        "--skill",
        written.length ? "review-task" : "create-task",
        "--siblings-checked",
        "none",
        "--body-file",
        bodyFile,
        "--json",
      ]);
      assert.equal(w.reason, "ok", JSON.stringify(w));
      written.push(Number(w.id));
    }

    const scanned = engine.run(["scan", "--workspace", ws, "--json"]);
    const entries = scanned.entries.map((fm) => ({
      frontmatter: fm,
      body: "",
    }));
    assert.equal(
      entries.length,
      2,
      "non-vacuity: both written entries are scanned",
    );

    const seed = lib.seedFromObservations(entries, { taskId: 150 });
    assert.equal(seed.park.length, 2);
    for (const vector of seed.park) {
      const r = engine.run([...vector, "--workspace", ws]);
      assert.equal(
        r.reason,
        "ok",
        `${vector.join(" ")} → ${JSON.stringify(r)}`,
      );
    }

    const after = engine.run(["scan", "--workspace", ws, "--json"]).entries;
    for (const id of written) {
      const e = after.find((x) => Number(x.id) === id);
      assert.ok(e, `entry #${id} still scanned`);
      assert.equal(e.status, "parked");
      assert.equal(e.parked_until, "task.150 merged to develop");
    }
  } finally {
    fs.rmSync(ws, { recursive: true, force: true });
  }
});
