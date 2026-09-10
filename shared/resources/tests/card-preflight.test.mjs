"use strict";
/**
 * Tests for the authoring-time card preflight (task.102).
 *
 * Two things are being held here, and only one of them is about the CLI.
 *
 * 1. ANTI-VACUITY — the point of the task. A document missing its
 *    `## Success Criteria` block must make the preflight report a finding. If it
 *    does not, the call is present and inert, which is worse than absent because
 *    it looks guarded. This is a fixture, not a prose assertion: the fixture
 *    below is the exact shape task.99 shipped in — an Overview plus a bespoke
 *    `## 7. The rule to add` heading standing in for Success Criteria.
 *
 * 2. ONE DEFINITION — the trap the task exists inside. The four section specs
 *    must be defined in exactly one file. A test that merely greps for a pattern
 *    passes when the pattern drifts and matches nothing, so every count here has
 *    a non-vacuity floor: it fails on zero as loudly as it fails on two.
 *
 * Run: node --test shared/resources/tests/card-preflight.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  readFileSync,
  readdirSync,
  writeFileSync,
  mkdtempSync,
  rmSync,
  existsSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join, sep } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");
const CLI = join(repoRoot, "shared/resources/card-preflight.js");

const lib = require(join(repoRoot, "shared/resources/jira-sync.js"));
const pf = require(CLI);

// The shape task.99 shipped in: an Overview, and a bespoke heading standing in
// for Success Criteria. Keep this literal — a fixture that happens to be missing
// the section is weaker evidence than one reproducing the observed defect.
const TASK_99_SHAPE = `---
id: task.999
type: task
---

# Technical Task: the shape that reached CI unchecked

## 1. Overview

An Overview is present, so the Summary block resolves and the card looks fine at
a glance. What is absent is the block the spec actually requires.

## 7. The rule to add

- [ ] Something that is not a success criterion.
`;

function withTempDoc(name, content, fn) {
  const dir = mkdtempSync(join(tmpdir(), "card-preflight-"));
  const file = join(dir, name);
  writeFileSync(file, content);
  try {
    return fn(file);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function runCli(args) {
  try {
    const stdout = execFileSync(process.execPath, [CLI, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, stdout };
  } catch (e) {
    return { code: e.status, stdout: e.stdout || "" };
  }
}

// ---------------------------------------------------------------------------
// 1. Anti-vacuity — the check must actually fire
// ---------------------------------------------------------------------------

test("A: a task missing Success Criteria produces a finding", () => {
  withTempDoc("task.999.no-success-criteria.md", TASK_99_SHAPE, (file) => {
    const r = pf.preflight(file, "task");
    assert.equal(
      r.ok,
      false,
      "preflight reported ok on a document with no Success Criteria",
    );
    const sc = r.findings.filter((f) => /Success Criteria/i.test(f.section));
    assert.equal(
      sc.length,
      1,
      `expected exactly one Success Criteria finding, got ${r.findings.length} findings`,
    );
    assert.equal(
      sc[0].severity,
      "critical",
      "a missing required block is critical, not a nicety",
    );
    assert.match(
      sc[0].fix,
      /Success Criteria/,
      "the finding must name the heading to add",
    );
  });
});

test("A: the same document read through the CLI prints the finding and its fix", () => {
  withTempDoc("task.999.no-success-criteria.md", TASK_99_SHAPE, (file) => {
    const { code, stdout } = runCli(["--file", file]);
    assert.equal(
      code,
      0,
      "authoring preflight must be advisory — exit 0 even with findings",
    );
    assert.match(stdout, /Success Criteria\s+MISSING/);
    assert.match(stdout, /Fix:/);
    assert.match(
      stdout,
      /[Aa]dvisory/,
      "the output must say it does not block",
    );
  });
});

test("A: --strict is the only way to get a non-zero exit", () => {
  withTempDoc("task.999.no-success-criteria.md", TASK_99_SHAPE, (file) => {
    assert.equal(runCli(["--file", file, "--quiet"]).code, 0);
    assert.equal(runCli(["--file", file, "--strict", "--json"]).code, 1);
  });
});

test("A: a complete task document passes", () => {
  const real = join(
    repoRoot,
    "docs/tasks/task.102.authoring-time-card-preflight/task.102.authoring-time-card-preflight.md",
  );
  const r = pf.preflight(real, "task");
  assert.deepEqual(
    r.findings,
    [],
    "task.102 itself must pass the check it adds",
  );
  assert.equal(r.ok, true);
});

// ---------------------------------------------------------------------------
// 2. One definition, with a non-vacuity floor
// ---------------------------------------------------------------------------

test("B: the four card section specs are defined in exactly one SOURCE file", () => {
  // A *definition* is `const X_CARD_SECTIONS = [`. A re-export is
  // `const X_CARD_SECTIONS = lib.X_CARD_SECTIONS;` and does not match.
  const DEFINITION = /const\s+(TASK|STORY|EPIC|BUG)_CARD_SECTIONS\s*=\s*\[/g;

  // `skills/*/references/` is GENERATED — `npm run bundle` copies shared files
  // there so an installed skill is self-contained. Counting those would count
  // one definition N times and make the assertion unstateable; the next test
  // asserts they are byte-identical to the source instead, which is the check
  // that actually catches drift.
  const isGenerated = (rel) =>
    /^skills\/[^/]+\/references\//.test(rel.split(sep).join("/"));

  const hits = [];
  const walk = (dir) => {
    for (const e of readdirSync(join(repoRoot, dir), { withFileTypes: true })) {
      const rel = [dir, e.name].join("/");
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === "__pycache__") continue;
        if (isGenerated(rel + "/")) continue;
        walk(rel);
      } else if (
        (e.name.endsWith(".js") || e.name.endsWith(".mjs")) &&
        !isGenerated(rel)
      ) {
        const text = readFileSync(join(repoRoot, rel), "utf8");
        for (const m of text.matchAll(DEFINITION))
          hits.push({ file: rel, name: m[1] });
      }
    }
  };
  ["shared/resources", "skills"].forEach(walk);

  // NON-VACUITY FLOOR. If the pattern ever drifts it matches nothing, and a
  // zero-match run would otherwise read as "defined in one place" — the
  // reassuring answer nobody questions. Four specs must be found, or the
  // instrument is broken and that is the finding.
  assert.equal(
    hits.length,
    4,
    `expected exactly 4 spec definitions in source, found ${hits.length}: ${JSON.stringify(hits)}`,
  );

  const files = [...new Set(hits.map((h) => h.file))];
  assert.deepEqual(
    files,
    ["shared/resources/jira-sync.js"],
    `card section specs must be defined only in the shared library; found in: ${files.join(", ")}`,
  );

  assert.deepEqual(
    hits.map((h) => h.name).sort(),
    ["BUG", "EPIC", "STORY", "TASK"],
    "all four kinds must be defined in the one place, not three of four",
  );
});

test("B: every generated copy of the library is identical to the source", () => {
  // The corollary of the test above: one *authored* definition is only one
  // *effective* definition while the generated copies match it. A stale
  // `references/jira-sync.js` is a second, older spec in everything but name —
  // and it is exactly what a forgotten `npm run bundle` leaves behind.
  // The bundler prepends one AUTO-GENERATED banner line and changes nothing
  // else in this file, so the comparison strips exactly that line rather than
  // relaxing into a fuzzy match — a fuzzy match here would stop catching the
  // drift the test exists for.
  const stripBanner = (t) =>
    t.startsWith("// AUTO-GENERATED") ? t.slice(t.indexOf("\n") + 1) : t;
  const source = stripBanner(
    readFileSync(join(repoRoot, "shared/resources/jira-sync.js"), "utf8"),
  );
  const copies = readdirSync(join(repoRoot, "skills"), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => `skills/${e.name}/references/jira-sync.js`)
    .filter((rel) => existsSync(join(repoRoot, rel)));

  assert.ok(
    copies.length > 0,
    "non-vacuity: found no bundled jira-sync.js at all — the glob is broken, not the tree",
  );

  const stale = copies.filter(
    (rel) => stripBanner(readFileSync(join(repoRoot, rel), "utf8")) !== source,
  );
  assert.deepEqual(
    stale,
    [],
    `stale bundled copies — run \`npm run bundle\`: ${stale.join(", ")}`,
  );
});

test("B: every sync-jira-* module still exports its own spec, unchanged", () => {
  const expected = {
    task: ["Summary", "Success Criteria", "Breaking Changes"],
    story: ["Summary", "Acceptance Criteria"],
    epic: ["Summary"],
    bug: ["Summary", "Reproduction", "Impact"],
  };
  let checked = 0;
  for (const [kind, headings] of Object.entries(expected)) {
    const mod = require(
      join(repoRoot, `skills/sync-jira-${kind}/scripts/sync-jira-${kind}.js`),
    );
    const key = `${kind.toUpperCase()}_CARD_SECTIONS`;
    assert.ok(mod[key], `${key} is no longer exported from sync-jira-${kind}`);
    assert.deepEqual(
      mod[key].map((s) => s.heading),
      headings,
    );

    // Value-equal to the shared source. NOT identity: each skill requires its
    // own BUNDLED `references/jira-sync.js`, so the two are different module
    // instances by design — that is what makes an installed skill
    // self-contained. Identity is asserted against the skill's own bundled
    // library instead, which is the check that actually distinguishes a
    // re-export from a re-declaration.
    assert.deepEqual(
      JSON.parse(JSON.stringify(mod[key])),
      JSON.parse(JSON.stringify(lib.CARD_SECTIONS_BY_KIND[kind])),
      `sync-jira-${kind}'s spec has drifted from the shared definition — re-run \`npm run bundle\``,
    );
    const bundled = require(
      join(repoRoot, `skills/sync-jira-${kind}/references/jira-sync.js`),
    );
    assert.equal(
      mod[key],
      bundled.CARD_SECTIONS_BY_KIND[kind],
      `sync-jira-${kind} declares its own spec instead of re-exporting the library's`,
    );
    checked++;
  }
  assert.equal(
    checked,
    4,
    "non-vacuity: all four sync modules must have been checked",
  );
});

test("B: CARD_SECTIONS_BY_KIND covers every kind the CLI can infer", () => {
  const kinds = Object.keys(lib.CARD_SECTIONS_BY_KIND).sort();
  assert.deepEqual(kinds, ["bug", "epic", "story", "task"]);
  assert.ok(kinds.length > 0, "non-vacuity: the kind map must not be empty");
  for (const k of kinds) {
    assert.equal(pf.inferKind(`${k}.1.example.md`), k);
  }
  assert.equal(
    pf.inferKind("notes.md"),
    null,
    "inference must return null rather than guess",
  );
});

// ---------------------------------------------------------------------------
// 3. The authoring path must not need a Jira sync skill installed
// ---------------------------------------------------------------------------

test("C: card-preflight defines no spec of its own", () => {
  const src = readFileSync(CLI, "utf8");
  // A spec definition here would be the drift this task exists to prevent.
  assert.equal(
    /const\s+\w*CARD_SECTIONS\s*=\s*\[/.test(src),
    false,
    "card-preflight.js must take every spec from jira-sync.js, never define one",
  );
  assert.match(
    src,
    /CARD_SECTIONS_BY_KIND/,
    "non-vacuity: it must actually read the shared map",
  );
});

test("C: the preflight runs with no sync-jira-* skill present", () => {
  // Copy only what a consumer installing `create-task` alone would get: the
  // CLI and the library it requires. If the preflight reaches into a
  // sync-jira-* skill, this fails.
  const dir = mkdtempSync(join(tmpdir(), "card-preflight-isolated-"));
  try {
    for (const f of [
      "card-preflight.js",
      "jira-sync.js",
      "tracker-workflow.js",
      "defer-mutation.js",
      "yaml-subset.js",
      "change-log.js",
    ]) {
      const src = join(repoRoot, "shared/resources", f);
      try {
        writeFileSync(join(dir, f), readFileSync(src));
      } catch {
        /* not every sibling exists; the require below is the real check */
      }
    }
    const doc = join(dir, "task.999.no-success-criteria.md");
    writeFileSync(doc, TASK_99_SHAPE);
    const out = execFileSync(
      process.execPath,
      [join(dir, "card-preflight.js"), "--file", doc, "--json"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    const r = JSON.parse(out);
    assert.equal(r.ok, false);
    assert.equal(r.kind, "task");
    assert.ok(
      r.findings.length >= 1,
      "non-vacuity: the isolated run must still find the missing section",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// 4. The three create-* skills actually call it
// ---------------------------------------------------------------------------

test("D: create-task, create-story and create-epic each invoke the preflight", () => {
  let called = 0;
  for (const skill of ["create-task", "create-story", "create-epic"]) {
    const src = readFileSync(
      join(repoRoot, `skills/${skill}/SKILL.md`),
      "utf8",
    );
    assert.match(
      src,
      /card-preflight\.js --file/,
      `${skill}/SKILL.md does not run the card preflight`,
    );
    // And it must not restate the spec — see task.102 § 7.
    assert.equal(
      /##\s*Success Criteria["'`]?\s*[,\]]/.test(src) &&
        /CARD_SECTIONS/.test(src),
      false,
      `${skill}/SKILL.md appears to restate the card section spec`,
    );
    called++;
  }
  assert.equal(
    called,
    3,
    "non-vacuity: all three authoring skills must have been checked",
  );
});
