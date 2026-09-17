"use strict";
/**
 * review-security contract tests.
 *
 * The point of this file is that the skill's own PASS is falsifiable. Most of
 * it is BEHAVIOURAL: it runs the fixtures through the real engine and asserts
 * the verdict the engine computed. No agent is in the loop, so these are
 * deterministic red/green in CI.
 *
 * The remaining assertions are prose contracts on SKILL.md and the reviewer
 * prompt. They prove a string exists, not that a behaviour holds — which is the
 * weaker thing, and is why they are the minority here.
 *
 * Run: node --test 'skills/review-security/tests/*.test.js'
 *      (the directory form `node --test skills/review-security/tests/` fails
 *       MODULE_NOT_FOUND, per the sibling suites)
 */

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const SKILL_ROOT = path.join(__dirname, "..");
const REPO_ROOT = path.join(__dirname, "..", "..", "..");

const read = (rel) => fs.readFileSync(path.join(SKILL_ROOT, rel), "utf8");
const readRepo = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");

const SKILL = read("SKILL.md");
const PROMPT = readRepo("shared/resources/security-review-prompt.md");

// ---------------------------------------------------------------------------
// Engine access + per-spec memoisation
//
// Each probe spawns one child per corpus case (12), so a naive test file would
// spawn ~60 processes. Run each spec once and share the result.
// ---------------------------------------------------------------------------

let enginePromise;
const engine = () => {
  enginePromise ??= import(
    require("node:url").pathToFileURL(
      path.join(REPO_ROOT, "shared/resources/security-probe.mjs"),
    ).href
  );
  return enginePromise;
};

// The probe specs are IMPORTED, never redeclared. Each fixture family ships a
// `probe.mjs` exporting its `engaged` and `inert` specs, and those files are the
// single source of truth for what gets probed. Writing the {sink, entry} objects
// out again here would give the entry paths two homes and execute only one of
// them — a spec could then drift to a nonexistent entry while this suite stayed
// green: the declared artifact present, and provably doing nothing. That is the
// shape this skill exists to catch, and not one to ship inside it.
const SPEC_FILES = {
  "redis-tls": "tests/fixtures/redis-tls/probe.mjs",
  "db-url": "tests/fixtures/db-url/probe.mjs",
};

const FIXTURE_NAMES = [
  "redis-tls/engaged",
  "redis-tls/inert",
  "db-url/engaged",
  "db-url/inert",
];

let specsPromise;
const specs = () => {
  specsPromise ??= (async () => {
    const out = {};
    for (const [family, rel] of Object.entries(SPEC_FILES)) {
      const mod = await import(
        require("node:url").pathToFileURL(path.join(SKILL_ROOT, rel)).href
      );
      out[`${family}/engaged`] = mod.engaged;
      out[`${family}/inert`] = mod.inert;
    }
    return out;
  })();
  return specsPromise;
};

const results = new Map();
async function probe(name) {
  if (!results.has(name)) {
    const { runProbeSpec } = await engine();
    const spec = (await specs())[name];
    assert.ok(spec, `no probe spec exported for ${name}`);
    results.set(name, runProbeSpec(spec));
  }
  return results.get(name);
}

const hostile = (r) => r.cases.filter((c) => c.direction === "hostile");
const legitimate = (r) => r.cases.filter((c) => c.direction === "legitimate");

// ---------------------------------------------------------------------------
// The probe specs are the artifact. Assert they are wired, well-formed, and
// point at entries that actually resolve — otherwise "the spec file exists" and
// "the spec file works" are the same observation, which is the confusion this
// whole skill is about.
// ---------------------------------------------------------------------------

test("every fixture name resolves to an imported probe spec", async () => {
  const loaded = await specs();
  for (const name of FIXTURE_NAMES) {
    assert.ok(loaded[name], `${name} has no exported spec`);
    assert.equal(typeof loaded[name].sink, "string");
    assert.equal(typeof loaded[name].entry, "string");
  }
  assert.deepEqual(Object.keys(loaded).sort(), [...FIXTURE_NAMES].sort());
});

test("every spec names a sink the corpus knows and an entry that resolves", async () => {
  const { SINKS } = await import(
    require("node:url").pathToFileURL(
      path.join(REPO_ROOT, "shared/resources/security-input-corpus.mjs"),
    ).href
  );
  const { resolveEntry } = await engine();
  for (const [name, spec] of Object.entries(await specs())) {
    assert.ok(
      SINKS.includes(spec.sink),
      `${name}: sink "${spec.sink}" is not one of ${SINKS.join(", ")}`,
    );
    // The drift guard. Note what `resolveEntry` does and does not do: it
    // validates SHAPE and CONTAINMENT only, and says so in its own comment —
    // "a path that may not exist yet". So it returns ok:true for any
    // well-formed in-repo path, present or absent. Asserting only on it would
    // read as an existence check while being nothing of the kind, which is the
    // precise defect class this suite is about. Check the file and the export
    // too.
    const resolved = resolveEntry(spec.entry, REPO_ROOT);
    assert.ok(
      resolved.ok,
      `${name}: entry "${spec.entry}" is malformed or escapes the repo (${resolved.reason})`,
    );
    assert.ok(
      fs.existsSync(resolved.entryPath),
      `${name}: entry file does not exist — ${resolved.entryPath}`,
    );
    const mod = await import(
      require("node:url").pathToFileURL(resolved.entryPath).href
    );
    assert.equal(
      typeof mod[resolved.exportName],
      "function",
      `${name}: "${resolved.exportName}" is not an exported function of ${spec.entry}`,
    );
  }
});

// ---------------------------------------------------------------------------
// The central falsifiability assertion: the engine computes these, not us.
// ---------------------------------------------------------------------------

for (const name of ["redis-tls/engaged", "db-url/engaged"]) {
  test(`${name} → engages (engine-computed)`, async () => {
    const r = await probe(name);
    assert.equal(
      r.verdict,
      "engages",
      `expected engages, got ${r.verdict} (${r.reason})`,
    );
  });

  test(`${name} — boundary: no hostile case accepted, ≥1 legitimate accepted`, async () => {
    const r = await probe(name);
    // These are the two conditions `engages` is made of. Asserting them
    // directly means a fixture edit that drifts out of the band fails on the
    // reason rather than only on the label.
    assert.equal(
      r.reproduced.length,
      0,
      `hostile inputs were accepted: ${JSON.stringify(r.reproduced)}`,
    );
    assert.ok(
      legitimate(r).some((c) => c.outcome === "accepted"),
      "no legitimate case was accepted — `engages` is unreachable",
    );
  });
}

for (const name of ["redis-tls/inert", "db-url/inert"]) {
  test(`${name} → present-but-inert (engine-computed)`, async () => {
    const r = await probe(name);
    assert.equal(
      r.verdict,
      "present-but-inert",
      `expected present-but-inert, got ${r.verdict} (${r.reason})`,
    );
  });

  test(`${name} — boundary: ≥1 hostile rejected AND ≥1 hostile accepted`, async () => {
    const r = await probe(name);
    const h = hostile(r);
    // The band is narrow in both directions and the failure modes are
    // different: reject nothing and the verdict is `absent`; reject everything
    // and it is `unverifiable`. Neither is what this fixture is for.
    assert.ok(
      h.some((c) => c.outcome === "rejected"),
      "no hostile case was rejected — this fixture scores `absent`, not `present-but-inert`",
    );
    assert.ok(
      h.some((c) => c.outcome === "accepted"),
      "every hostile case was rejected — nothing is inert here",
    );
  });
}

// ---------------------------------------------------------------------------
// The engaged fixture is what a reader consults to see what a correct control
// looks like, so its guard must not claim more than it does. Loopback has
// several standard spellings and a length-4 check alone accepts three of them.
// ---------------------------------------------------------------------------

test("the engaged redis fixture refuses loopback in every digits-and-dots form", async () => {
  const { buildRedisOptions } = await import(
    require("node:url").pathToFileURL(
      path.join(SKILL_ROOT, "tests/fixtures/redis-tls/engaged.mjs"),
    ).href
  );
  // Each of these resolves to the local machine.
  for (const host of [
    "127.0.0.1",
    "127.000.000.001",
    "127.1", // valid loopback shorthand
    "0177.0.0.1", // octal
    "2130706433", // the same address as a bare integer
  ]) {
    assert.equal(
      buildRedisOptions(host),
      false,
      `${host} resolves to loopback and must be refused`,
    );
  }
  // Fail closed on an IP-shaped host that does not parse as a clean quad.
  assert.equal(buildRedisOptions("1.2.3.4.5"), false);
  // RFC1918, and a hostname that merely begins with those digits.
  for (const host of ["10.0.0.5", "192.168.1.1", "172.20.0.1", "localhost"]) {
    assert.equal(buildRedisOptions(host), false, `${host} must be refused`);
  }
  for (const host of [
    "8.8.8.8",
    "172.32.0.1",
    "db.internal.example.com",
    "10.example.com",
    "172.20.example.com",
  ]) {
    assert.notEqual(
      buildRedisOptions(host),
      false,
      `${host} is legitimate and must be accepted`,
    );
  }
});

// ---------------------------------------------------------------------------
// The grep decoy.
//
// Without this, someone tidies an inert fixture into an `absent` case that any
// grep would catch, the suite stays green, and it proves nothing. Each inert
// variant must CONTAIN the literal tokens a grep-based reviewer accepts as
// evidence that the control is present.
// ---------------------------------------------------------------------------

const DECOYS = {
  "fixtures/redis-tls/inert.mjs": ["tls", "rejectUnauthorized"],
  "fixtures/db-url/inert.mjs": ["sslmode=require"],
};

for (const [file, tokens] of Object.entries(DECOYS)) {
  test(`${file} carries the grep-decoy tokens`, () => {
    const src = read(path.join("tests", file));
    for (const token of tokens) {
      assert.ok(
        src.includes(token),
        `${file} must contain the literal \`${token}\` — a grep reviewer accepts it as proof the control is present, and that acceptance is exactly what this fixture exists to falsify`,
      );
    }
  });
}

// ---------------------------------------------------------------------------
// Vacuity: zero executed cases is never a pass.
// ---------------------------------------------------------------------------

test("zero cases → unverifiable, never engages", async () => {
  const { runProbeSpec } = await engine();
  const r = runProbeSpec({
    ...(await specs())["redis-tls/engaged"],
    cases: [],
  });
  assert.equal(r.verdict, "unverifiable");
  assert.notEqual(r.verdict, "engages");
  assert.equal(r.executed, 0);
});

test("a spec whose entry names no file in scope is unverifiable", async () => {
  const { runProbeSpec } = await engine();
  const r = runProbeSpec({
    sink: "url-authority",
    entry: "skills/review-security/tests/fixtures/does-not-exist.mjs#nope",
  });
  assert.equal(r.verdict, "unverifiable");
});

// ---------------------------------------------------------------------------
// The output schema. `evidence: measured` must imply `probes_executed > 0`.
// ---------------------------------------------------------------------------

/** Minimal reader for the `security_review:` block's two scalar fields. */
function readBlock(yaml) {
  const num = /probes_executed:\s*(\d+)/.exec(yaml);
  const ev = /evidence:\s*([a-z]+)/.exec(yaml);
  return {
    probes_executed: num ? Number(num[1]) : null,
    evidence: ev ? ev[1] : null,
  };
}

test("the documented machine block satisfies measured ⇒ probes_executed > 0", () => {
  const block = /```yaml\n(security_review:[\s\S]*?)```/.exec(PROMPT);
  assert.ok(block, "the prompt must document a `security_review:` YAML block");
  const { probes_executed, evidence } = readBlock(block[1]);
  assert.ok(
    Number.isInteger(probes_executed),
    "block must carry probes_executed",
  );
  assert.ok(evidence, "block must carry evidence");
  if (evidence === "measured") {
    assert.ok(
      probes_executed > 0,
      "`evidence: measured` with zero probes executed is the exact claim this schema forbids",
    );
  }
});

test("the schema states the measured/reasoned rule and the reasoned fallback", () => {
  assert.match(PROMPT, /probes_executed\s*>\s*0/);
  assert.match(PROMPT, /reasoned/);
});

// ---------------------------------------------------------------------------
// No PASS token. A bare pass must be unrepresentable, not merely discouraged.
// ---------------------------------------------------------------------------

test("no PASS token exists in the output schema", async () => {
  const { VERDICTS } = await engine();
  assert.deepEqual(
    [...VERDICTS],
    ["engages", "present-but-inert", "absent", "unverifiable"],
  );
  for (const v of VERDICTS) {
    assert.notEqual(v.toUpperCase(), "PASS");
  }
  assert.ok(
    !/^\s*(PASS|verdict:\s*PASS)\s*$/m.test(PROMPT),
    "the prompt must not offer a bare PASS as an emittable value",
  );
});

test("present-but-inert is rated high, above absent", () => {
  assert.match(PROMPT, /`present-but-inert`[^|]*\|[^|]*\|\s*\*\*high\*\*/);
  assert.match(SKILL, /present-but-inert/);
});

// ---------------------------------------------------------------------------
// Prose contracts on SKILL.md.
// ---------------------------------------------------------------------------

test("SKILL.md declares name: review-security", () => {
  assert.match(SKILL, /^---[\s\S]*?\nname:\s*review-security\s*\n/);
});

test("the description leads with the discriminator, not the category", () => {
  const fm = /^---\n([\s\S]*?)\n---/.exec(SKILL);
  assert.ok(fm, "SKILL.md must have YAML frontmatter");
  const desc = /description:\s*'?([\s\S]*?)'?\s*$/m.exec(fm[1])[1];
  // "engages" and "executing" must appear before any mode or trigger list —
  // this is what stops a user's "do a security review" landing on the built-in
  // in the belief that it probed anything.
  assert.match(
    desc.slice(0, 200),
    /ENGAGES|engages/,
    "the description must lead with the engages/executes discriminator",
  );
  assert.match(desc, /execut/i);
});

test("the relationship-to-the-built-in section is present", () => {
  assert.match(
    SKILL,
    /^##\s+Relationship to the built-in `\/security-review`\s*$/m,
    "SKILL.md must carry `## Relationship to the built-in /security-review` — the name-ambiguity mitigation is load-bearing, not decoration",
  );
});

test("the built-in section names both tools and says when to prefer each", () => {
  const section = SKILL.split(
    "## Relationship to the built-in `/security-review`",
  )[1].split("\n## ")[0];
  assert.match(section, /security-review/);
  assert.match(section, /review-security/);
  assert.match(section, /built-in/);
});

test("both modes are documented", () => {
  assert.match(SKILL, /`diff`/);
  assert.match(SKILL, /`full`/);
  assert.match(PROMPT, /\|\s*`full`\s*\|/);
});

test("the skill states its own limits", () => {
  assert.match(SKILL, /^##\s+What this does not tell you\s*$/m);
  assert.match(SKILL, /Non-JS entry points/);
});

test("the skill claims no gate and no code edits", () => {
  assert.match(SKILL, /owns no gate|writes no gate/i);
});

// ---------------------------------------------------------------------------
// The prompt references the corpus rather than restating it.
// ---------------------------------------------------------------------------

test("the prompt references the corpus doc for method ordering", () => {
  assert.match(PROMPT, /security-input-corpus\.md/);
  assert.match(PROMPT, /method ordering/i);
});

test("the prompt does not restate the corpus cases", async () => {
  const { corpusFor } = await import(
    require("node:url").pathToFileURL(
      path.join(REPO_ROOT, "shared/resources/security-input-corpus.mjs"),
    ).href
  );
  // A handful of sink names is a reference; reproducing the case inputs is a
  // second copy that will drift from the first.
  const ids = corpusFor("url-authority").map((c) => c.id);
  const restated = ids.filter((id) => PROMPT.includes(id));
  assert.equal(
    restated.length,
    0,
    `the prompt restates corpus case ids (${restated.join(", ")}) — reference the corpus doc instead`,
  );
});

// ---------------------------------------------------------------------------
// The run record (task.118). `probes_executed` and `evidence` reach the block
// FROM THE ENGINE, never from the agent. These tests run the engine, write the
// record, emit the block, and assert the invariant on a REAL run rather than
// on the prompt's example — then perform the mutation: delete the record and
// the block must read `reasoned`.
// ---------------------------------------------------------------------------

const os = require("os");
const { spawn, spawnSync } = require("child_process");
const ENGINE_PATH = path.join(REPO_ROOT, "shared/resources/security-probe.mjs");

function tmpRecord() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "t118-record-"));
  return path.join(dir, "security-probe.run.json");
}

function cli(args) {
  return spawnSync(process.execPath, [ENGINE_PATH, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
}

test("recordRun merges by {sink, entry} and recomputes totals", async () => {
  const { recordRun, readRecord, evidenceOf } = await engine();
  const rec = tmpRecord();
  const a = await probe("redis-tls/inert");
  const b = await probe("db-url/engaged");
  recordRun(rec, a, { name: "redis-tls", callSite: "x.ts:41" });
  const r1 = readRecord(rec);
  assert.equal(r1.controls.length, 1);
  assert.equal(r1.totals.executed, a.executed);
  // Same key again → REPLACED, not appended.
  recordRun(rec, a, { name: "redis-tls" });
  assert.equal(readRecord(rec).controls.length, 1);
  // A second control → appended; totals are the sum.
  recordRun(rec, b);
  const r2 = readRecord(rec);
  assert.equal(r2.controls.length, 2);
  assert.equal(r2.totals.executed, a.executed + b.executed);
  assert.equal(evidenceOf(r2), "measured");
  assert.equal(
    r2.controls[0].call_site,
    null,
    "a re-run without --call-site clears it — the record is the latest run",
  );
});

test("the emitted block satisfies measured ⇒ probes_executed > 0 on a real run", async () => {
  const { recordRun, readRecord, emitBlock } = await engine();
  const rec = tmpRecord();
  const a = await probe("redis-tls/inert");
  recordRun(rec, a, { name: "redis-tls" });
  const block = emitBlock(readRecord(rec));
  const { probes_executed, evidence } = readBlock(block);
  assert.equal(probes_executed, a.executed);
  assert.ok(probes_executed > 0);
  assert.equal(evidence, "measured");
  assert.match(block, /^security_review:\n  mode: diff\n/);
  assert.match(
    block,
    /- name: redis-tls\n\s+verdict: present-but-inert\n\s+severity: high/,
  );
});

test("MUTATION — delete the record and the block reads reasoned with zero probes", async () => {
  const { recordRun, readRecord, emitBlock } = await engine();
  const rec = tmpRecord();
  recordRun(rec, await probe("redis-tls/inert"));
  fs.unlinkSync(rec);
  const block = emitBlock(readRecord(rec));
  const { probes_executed, evidence } = readBlock(block);
  assert.equal(probes_executed, 0);
  assert.equal(evidence, "reasoned");
  assert.doesNotMatch(block, /evidence:\s*measured/);
});

test("`measured` is unrepresentable without executed probes — evidenceOf never says it on zero", async () => {
  const { evidenceOf, emitBlock, RECORD_VERSION } = await engine();
  assert.equal(evidenceOf(null), "reasoned");
  const empty = {
    version: RECORD_VERSION,
    controls: [],
    totals: { executed: 0, reproduced: 0 },
  };
  assert.equal(evidenceOf(empty), "reasoned");
  assert.equal(readBlock(emitBlock(empty)).evidence, "reasoned");
  // A record whose stored totals were hand-edited upward with no control behind
  // them: the reader recomputes from controls, so the forgery renders reasoned.
  const forged = { ...empty, totals: { executed: 12, reproduced: 5 } };
  assert.equal(evidenceOf(forged), "reasoned");
  assert.equal(readBlock(emitBlock(forged)).evidence, "reasoned");
  assert.equal(readBlock(emitBlock(forged)).probes_executed, 0);
});

test("emitBlock quotes a value whose first character is a YAML indicator", async () => {
  const { emitBlock, RECORD_VERSION } = await engine();
  const rec = {
    version: RECORD_VERSION,
    totals: { executed: 1, reproduced: 0 },
    controls: [
      {
        sink: "path",
        entry: "a.mjs#b",
        name: "#foo",
        call_site: "@x:1",
        verdict: "engages",
        reason: "ok",
        executed: 1,
        reproduced: 0,
      },
    ],
  };
  const block = emitBlock(rec);
  assert.match(
    block,
    /name: "#foo"/,
    "a #-leading name must be quoted, or YAML reads it as a comment",
  );
  assert.match(block, /call_site: "@x:1"/);
  assert.match(block, /entry: a\.mjs#b\n/, "a safe value stays bare");
});

test("CLI: --record writes the record and --emit-block prints the block from it", async () => {
  const rec = tmpRecord();
  const spec = (await specs())["redis-tls/inert"];
  const run = cli([
    "--sink",
    spec.sink,
    "--entry",
    spec.entry,
    "--record",
    rec,
    "--name",
    "redis-tls",
    "--call-site",
    "apps/x.ts:41",
  ]);
  assert.equal(run.status, 1, `inert control exits 1: ${run.stderr}`);
  assert.ok(fs.existsSync(rec), "the record must exist after --record");
  const emitted = cli(["--emit-block", rec, "--mode", "full"]);
  assert.equal(emitted.status, 0, emitted.stderr);
  const { probes_executed, evidence } = readBlock(emitted.stdout);
  assert.ok(probes_executed > 0);
  assert.equal(evidence, "measured");
  assert.match(emitted.stdout, /mode: full/);
  assert.match(emitted.stdout, /call_site: apps\/x\.ts:41/);
});

test("CLI: --emit-block on a missing record renders the honest empty block, exit 0", () => {
  const emitted = cli([
    "--emit-block",
    path.join(os.tmpdir(), "t118-nope", "none.json"),
  ]);
  assert.equal(emitted.status, 0, emitted.stderr);
  const { probes_executed, evidence } = readBlock(emitted.stdout);
  assert.equal(probes_executed, 0);
  assert.equal(evidence, "reasoned");
  assert.match(emitted.stdout, /the engine did not run/);
});

test("CLI: a corrupt record is exit 2, never read as empty", () => {
  const rec = tmpRecord();
  fs.writeFileSync(rec, "{ not json");
  const emitted = cli(["--emit-block", rec]);
  assert.equal(emitted.status, 2);
  assert.match(emitted.stderr, /cannot read --emit-block record/);
  const wrongVersion = tmpRecord();
  fs.writeFileSync(wrongVersion, JSON.stringify({ version: 99, controls: [] }));
  assert.equal(cli(["--emit-block", wrongVersion]).status, 2);
  // A version-1 record with no totals is not a record either. Readers recompute
  // totals from controls, so this is a schema check, not crash prevention: a
  // file without the field was not written by this engine.
  const noTotals = tmpRecord();
  fs.writeFileSync(noTotals, JSON.stringify({ version: 1, controls: [] }));
  const r = cli(["--emit-block", noTotals]);
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /not a version-1/);
});

test("CLI: every operand flag rejects a missing or flag-shaped operand with exit 2, on its own", () => {
  // Each case supplies --sink and --entry so the only defect is the operand —
  // the old guards passed these only because --entry happened to be absent.
  const base = ["--sink", "url-authority", "--entry", "x.mjs#y"];
  for (const flag of [
    "--record",
    "--emit-block",
    "--repo-root",
    "--name",
    "--call-site",
    "--mode",
    "--cases-file",
  ]) {
    const r = cli([...base, flag]);
    assert.equal(r.status, 2, `${flag} trailing: ${r.stderr}`);
    assert.match(r.stderr, /requires an operand/);
    const r2 = cli([...base, flag, "--json"]);
    assert.equal(r2.status, 2, `${flag} followed by a flag: ${r2.stderr}`);
  }
  assert.equal(
    cli(["--emit-block", tmpRecord(), "--mode", "sideways"]).status,
    2,
  );
  // --mode is validated in probe mode too, not only under --emit-block.
  const probeMode = cli([...base, "--mode", "sideways"]);
  assert.equal(probeMode.status, 2);
  assert.match(probeMode.stderr, /--mode must be diff or full/);
});

test("CLI: --repo-root re-anchors containment so a bundled copy can probe the consumer's tree", async () => {
  // Copy the engine and its imports into a nested dir, as the bundler does into
  // skills/*/references/. From there defaultRepoRoot() is the nested dir and a
  // repo-relative entry is an escape; --repo-root makes it resolve again.
  const nest = fs.mkdtempSync(
    path.join(REPO_ROOT, "skills/review-security/tests/.t118-nest-"),
  );
  try {
    for (const f of [
      "security-probe.mjs",
      "security-input-corpus.mjs",
      "qa-execute-snippets.mjs",
      "spawn-budget.mjs",
    ]) {
      fs.copyFileSync(
        path.join(REPO_ROOT, "shared/resources", f),
        path.join(nest, f),
      );
    }
    const spec = (await specs())["redis-tls/engaged"];
    const runNested = (extra) =>
      spawnSync(
        process.execPath,
        [
          path.join(nest, "security-probe.mjs"),
          "--sink",
          spec.sink,
          "--entry",
          spec.entry,
          "--json",
          ...extra,
        ],
        { cwd: REPO_ROOT, encoding: "utf8" },
      );
    const without = JSON.parse(runNested([]).stdout);
    assert.equal(without.verdict, "unverifiable");
    // Not an escape: the path is CONTAINED in the nested root and simply does
    // not exist there. Asserting the reason is what keeps this test honest about
    // which failure --repo-root fixes.
    assert.equal(
      without.reason,
      "entry-not-probeable",
      JSON.stringify(without.declined),
    );
    const withRoot = JSON.parse(runNested(["--repo-root", REPO_ROOT]).stdout);
    assert.equal(
      withRoot.verdict,
      "engages",
      JSON.stringify(withRoot.declined),
    );
  } finally {
    fs.rmSync(nest, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// QA cycle 2 (task.118): the merge is serialised, the record's contents are
// validated, YAML-typed scalars are quoted, and a bad --record fails fast.
// ---------------------------------------------------------------------------

test("concurrent --record runs against one file converge — every control survives", async () => {
  const rec = tmpRecord();
  const all = await specs();
  const runs = [
    ["a", all["redis-tls/engaged"]],
    ["b", all["redis-tls/inert"]],
    ["c", all["db-url/engaged"]],
  ].map(
    ([name, spec]) =>
      new Promise((resolve) => {
        const child = spawn(
          process.execPath,
          [
            ENGINE_PATH,
            "--sink",
            spec.sink,
            "--entry",
            spec.entry,
            "--record",
            rec,
            "--name",
            name,
          ],
          { cwd: REPO_ROOT, stdio: "ignore" },
        );
        child.on("exit", resolve);
      }),
  );
  await Promise.all(runs);
  const { readRecord } = await engine();
  const r = readRecord(rec);
  assert.deepEqual(
    r.controls.map((c) => c.name).sort(),
    ["a", "b", "c"],
    "an unlocked read-merge-rename keeps only the last writer's control",
  );
  assert.equal(
    r.totals.executed,
    r.controls.reduce((n, c) => n + c.executed, 0),
  );
  assert.ok(!fs.existsSync(`${rec}.lock`), "the lock is released");
  assert.equal(
    fs.readdirSync(path.dirname(rec)).filter((f) => f.endsWith(".tmp")).length,
    0,
  );
});

test("readRecord rejects a record whose control elements are malformed", async () => {
  const { readRecord, RECORD_VERSION } = await engine();
  const bad = [
    [null],
    ["x"],
    [{ executed: "12", reproduced: 0, verdict: "engages" }],
    [{ executed: -1, reproduced: 0, verdict: "engages" }],
    [{ executed: 1, reproduced: 0 }],
  ];
  for (const controls of bad) {
    const rec = tmpRecord();
    fs.writeFileSync(
      rec,
      JSON.stringify({ version: RECORD_VERSION, controls, totals: {} }),
    );
    assert.throws(
      () => readRecord(rec),
      /not a version-1/,
      JSON.stringify(controls),
    );
    const r = cli(["--emit-block", rec]);
    assert.equal(
      r.status,
      2,
      `emit-block on ${JSON.stringify(controls)}: ${r.stderr}`,
    );
  }
});

test("emitBlock quotes a scalar YAML would type as a number, boolean or null", async () => {
  const { emitBlock, RECORD_VERSION } = await engine();
  const mk = (name, callSite) => ({
    version: RECORD_VERSION,
    totals: {},
    controls: [
      {
        sink: "path",
        entry: "a.mjs#b",
        name,
        call_site: callSite,
        verdict: "engages",
        reason: "ok",
        executed: 1,
        reproduced: 0,
      },
    ],
  });
  assert.match(emitBlock(mk("123", "true")), /name: "123"\n\s+verdict/);
  assert.match(emitBlock(mk("123", "true")), /call_site: "true"/);
  assert.match(emitBlock(mk("1e3", "null")), /name: "1e3"/);
  assert.match(emitBlock(mk("1e3", "null")), /call_site: "null"/);
  assert.match(
    emitBlock(mk("redis-tls", "x.ts:41")),
    /name: redis-tls\n/,
    "a plain name stays bare",
  );
});

test("CLI: a corrupt --record fails before the probe runs, and says it could not be used", async () => {
  const rec = tmpRecord();
  fs.writeFileSync(rec, "{ not json");
  const spec = (await specs())["redis-tls/engaged"];
  const r = cli(["--sink", spec.sink, "--entry", spec.entry, "--record", rec]);
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /cannot use --record/);
  assert.doesNotMatch(r.stderr, /cannot (write|update) --record/);
  // Fail-fast: the PROPERTY is that no probe ran — the engine prints a verdict
  // line on stdout after a run, so an empty stdout is the direct evidence. A
  // wall-clock bound was the previous assertion and failed under load with the
  // preflight having fired (CR4-5).
  assert.equal(
    r.stdout,
    "",
    "a verdict was printed — the probe ran before the preflight failed",
  );
});

test("SEVERITY_BY_VERDICT is the prompt's severity table — one definition", async () => {
  const { SEVERITY_BY_VERDICT, VERDICTS } = await engine();
  for (const v of VERDICTS) {
    const row = new RegExp(
      "^\\| `" + v + "` \\|[^|]*\\|\\s*([^|]+?)\\s*\\|",
      "m",
    ).exec(PROMPT);
    assert.ok(row, `the prompt's verdict table has no row for ${v}`);
    const prose = row[1].replace(/\*/g, "").trim();
    const expected = SEVERITY_BY_VERDICT[v];
    if (v === "unverifiable") {
      assert.match(
        prose,
        /^—/,
        "unverifiable carries no severity in the prompt — it is a finding, never a pass",
      );
    } else {
      assert.equal(
        prose,
        expected,
        `prompt says ${prose} for ${v}, engine says ${expected}`,
      );
    }
  }
});

// The three-process race above proves convergence but cannot reliably PROVOKE
// the race (the read→rename window is ~1 ms). These two prove the lock itself:
// a held lock blocks the write until released; a stale one is reclaimed.
test("recordRun waits on a held lock and writes once it is released", async () => {
  const rec = tmpRecord();
  const lock = `${rec}.lock`;
  fs.writeFileSync(lock, "");
  const script = `
    import(${JSON.stringify(require("node:url").pathToFileURL(ENGINE_PATH).href)}).then((m) => {
      m.recordRun(${JSON.stringify(rec)}, { sink: "s", entry: "e#f", verdict: "engages", reason: "ok", executed: 1, passed: 1, reproduced: [], overblocked: [], declined: [], escapes: [] });
    });`;
  const child = spawn(process.execPath, ["--input-type=module", "-e", script], {
    cwd: REPO_ROOT,
    stdio: "ignore",
  });
  const exited = new Promise((resolve) => child.on("exit", resolve));
  await new Promise((r) => setTimeout(r, 700));
  assert.ok(
    !fs.existsSync(rec),
    "the record must not be written while another process holds the lock",
  );
  assert.equal(
    child.exitCode,
    null,
    "the writer must still be waiting, not exited",
  );
  fs.rmSync(lock);
  const code = await exited;
  assert.equal(code, 0);
  assert.ok(fs.existsSync(rec), "released lock → the write goes through");
});

test("recordRun reclaims a stale lock left by a dead holder", async () => {
  const { recordRun } = await engine();
  const rec = tmpRecord();
  const lock = `${rec}.lock`;
  fs.writeFileSync(lock, "");
  const old = new Date(Date.now() - 60_000);
  fs.utimesSync(lock, old, old);
  const started = Date.now();
  recordRun(rec, {
    sink: "s",
    entry: "e#f",
    verdict: "engages",
    reason: "ok",
    executed: 1,
    passed: 1,
    reproduced: [],
    overblocked: [],
    declined: [],
    escapes: [],
  });
  assert.ok(
    Date.now() - started < 2000,
    "a stale lock must be reclaimed, not waited on",
  );
  assert.ok(fs.existsSync(rec));
  assert.ok(!fs.existsSync(lock));
});

// ---------------------------------------------------------------------------
// QA cycle 3 (task.118): the renderer's remaining YAML edges, the lock's
// timeout/stale ordering and rename-based reclaim, the preflight's write check.
// ---------------------------------------------------------------------------

test("emitBlock quotes a value ending in ':' and a leading-zero integer", async () => {
  const { emitBlock, RECORD_VERSION } = await engine();
  const mk = (name, callSite) => ({
    version: RECORD_VERSION,
    totals: {},
    controls: [
      {
        sink: "path",
        entry: "a.mjs#b",
        name,
        call_site: callSite,
        verdict: "engages",
        reason: "ok",
        executed: 1,
        reproduced: 0,
      },
    ],
  });
  assert.match(
    emitBlock(mk("foo:", "x.ts:")),
    /name: "foo:"\n/,
    "a trailing colon is a YAML parse error when bare",
  );
  assert.match(emitBlock(mk("foo:", "x.ts:")), /call_site: "x.ts:"\n/);
  assert.match(
    emitBlock(mk("007", "0123")),
    /name: "007"\n/,
    "js-yaml reads 007 as octal, yaml as 123",
  );
  assert.match(emitBlock(mk("007", "0123")), /call_site: "0123"\n/);
  assert.match(
    emitBlock(mk("x.ts:41", "a:b")),
    /call_site: a:b\n/,
    "an interior colon stays bare",
  );
});

test("the lock's wait timeout exceeds its stale window", async () => {
  // Exported for this assertion only: with timeout < stale a waiter that
  // arrives just after a holder dies exits 2 before the lock becomes reclaimable.
  const { LOCK_TIMING } = await engine();
  assert.ok(
    LOCK_TIMING.timeoutMs > LOCK_TIMING.staleMs,
    `timeout ${LOCK_TIMING.timeoutMs} must exceed stale ${LOCK_TIMING.staleMs}`,
  );
});

test("stale-lock reclaim is by atomic rename — two waiters cannot both win", async () => {
  const rec = tmpRecord();
  const lock = `${rec}.lock`;
  fs.writeFileSync(lock, "");
  const old = new Date(Date.now() - 60_000);
  fs.utimesSync(lock, old, old);
  // Two processes race to reclaim the same stale lock and each merge one control.
  const result = (name) => ({
    sink: "s",
    entry: `${name}#f`,
    verdict: "engages",
    reason: "ok",
    executed: 1,
    passed: 1,
    reproduced: [],
    overblocked: [],
    declined: [],
    escapes: [],
  });
  const script = (name) => `
    import(${JSON.stringify(require("node:url").pathToFileURL(ENGINE_PATH).href)}).then((m) => {
      m.recordRun(${JSON.stringify(rec)}, ${JSON.stringify(result(name))});
    });`;
  const kids = ["a", "b"].map(
    (n) =>
      new Promise((resolve) =>
        spawn(process.execPath, ["--input-type=module", "-e", script(n)], {
          cwd: REPO_ROOT,
          stdio: "ignore",
        }).on("exit", resolve),
      ),
  );
  const codes = await Promise.all(kids);
  assert.deepEqual(codes, [0, 0]);
  const r = JSON.parse(fs.readFileSync(rec, "utf8"));
  assert.deepEqual(
    r.controls.map((c) => c.entry).sort(),
    ["a#f", "b#f"],
    "an rm-based reclaim lets both waiters in and one merge is lost",
  );
  assert.ok(!fs.existsSync(lock));
  assert.equal(
    fs.readdirSync(path.dirname(rec)).filter((f) => f.includes(".stale."))
      .length,
    0,
    "the renamed stale lock is removed",
  );
});

test("reclaimStaleLock has exactly one winner per stale lock", async () => {
  const { reclaimStaleLock } = await engine();
  const lock = `${tmpRecord()}.lock`;
  fs.writeFileSync(lock, "");
  // Two reclaimers of the same path: the first removes it, the second must
  // report it was already gone — an rm-based reclaim returns true for both,
  // which is the TOCTOU that lets two waiters into the critical section.
  assert.equal(reclaimStaleLock(lock), true);
  assert.equal(reclaimStaleLock(lock), false);
  assert.ok(!fs.existsSync(lock));
  assert.equal(
    fs.readdirSync(path.dirname(lock)).filter((f) => f.includes(".stale."))
      .length,
    0,
  );
});

test("reclaimStaleLock puts back a lock that is not the stale one it was told about", async () => {
  const { reclaimStaleLock } = await engine();
  const lock = `${tmpRecord()}.lock`;
  fs.writeFileSync(lock, "");
  const stale = new Date(Date.now() - 60_000);
  fs.utimesSync(lock, stale, stale);
  const observed = fs.statSync(lock).mtimeMs;
  // Another waiter reclaimed and re-created the lock in between: the file at
  // the path is now FRESH. A caller still holding the old observation must not
  // take it.
  fs.rmSync(lock);
  fs.writeFileSync(lock, "");
  assert.equal(
    reclaimStaleLock(lock, observed),
    false,
    "a live lock was stolen",
  );
  assert.ok(fs.existsSync(lock), "the live lock must be restored");
  assert.equal(
    fs.readdirSync(path.dirname(lock)).filter((f) => f.includes(".stale."))
      .length,
    0,
  );
  // The genuine stale case still reclaims.
  fs.utimesSync(lock, stale, stale);
  assert.equal(reclaimStaleLock(lock, fs.statSync(lock).mtimeMs), true);
  assert.ok(!fs.existsSync(lock));
});

test("readRecord rejects a control whose verdict is not one of VERDICTS", async () => {
  const { readRecord, RECORD_VERSION } = await engine();
  const rec = tmpRecord();
  fs.writeFileSync(
    rec,
    JSON.stringify({
      version: RECORD_VERSION,
      totals: {},
      controls: [{ executed: 1, reproduced: 0, verdict: "engage" }],
    }),
  );
  assert.throws(() => readRecord(rec), /not a version-1/);
});

test("preflightRecord fails on an existing read-only directory before the probe runs", async () => {
  if (process.getuid && process.getuid() === 0) return; // root ignores mode bits
  const { preflightRecord } = await engine();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "t118-ro-"));
  fs.chmodSync(dir, 0o500);
  try {
    assert.throws(
      () => preflightRecord(path.join(dir, "run.json")),
      /EACCES|EPERM/,
    );
  } finally {
    fs.chmodSync(dir, 0o700);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
