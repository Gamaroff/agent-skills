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

const FIXTURES = {
  "redis-tls/engaged": {
    sink: "url-authority",
    entry:
      "skills/review-security/tests/fixtures/redis-tls/engaged.mjs#buildRedisOptions",
  },
  "redis-tls/inert": {
    sink: "url-authority",
    entry:
      "skills/review-security/tests/fixtures/redis-tls/inert.mjs#buildRedisOptions",
  },
  "db-url/engaged": {
    sink: "url-authority",
    entry:
      "skills/review-security/tests/fixtures/db-url/engaged.mjs#composeDbUrl",
  },
  "db-url/inert": {
    sink: "url-authority",
    entry:
      "skills/review-security/tests/fixtures/db-url/inert.mjs#composeDbUrl",
  },
};

const results = new Map();
async function probe(name) {
  if (!results.has(name)) {
    const { runProbeSpec } = await engine();
    results.set(name, runProbeSpec(FIXTURES[name]));
  }
  return results.get(name);
}

const hostile = (r) => r.cases.filter((c) => c.direction === "hostile");
const legitimate = (r) => r.cases.filter((c) => c.direction === "legitimate");

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
  const r = runProbeSpec({ ...FIXTURES["redis-tls/engaged"], cases: [] });
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
