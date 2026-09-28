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
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
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
// 2b. One parser, not two (T102-001)
// ---------------------------------------------------------------------------

test("B: the authoring path and the sync path read the SAME body", () => {
  // The first draft of card-preflight.js hand-rolled its own frontmatter strip.
  // It diverged from lib.parseFrontmatter on exactly the two inputs below, and
  // no real document disagreed — which is how a latent parse divergence stays
  // invisible right up until the authoring check passes a body the sync then
  // reads differently. These two shapes are the ones that actually differed;
  // keep them literal rather than generalising them away.
  const shapes = {
    "body opens with a blank line":
      "---\nid: t\n---\n\n## 1. Overview\n\nx y z.\n\n## Success Criteria\n\n1. [ ] a\n",
    "CRLF line endings":
      "---\r\nid: t\r\n---\r\n\r\n## 1. Overview\r\n\r\nx y z.\r\n\r\n## Success Criteria\r\n\r\n1. [ ] a\r\n",
    "body opens with a horizontal rule":
      "---\nid: t\n---\n\n---\n\n## 1. Overview\n\nx y z.\n\n## Success Criteria\n\n1. [ ] a\n",
    "no frontmatter at all": "## 1. Overview\n\nx y z.\n",
    // The authoring path reads the title and the sync path does not
    // (task.150). The section findings must still match exactly; the title
    // finding is the only difference, asserted below.
    "title over the bound": `---\nid: t\ntitle: "${"t".repeat(101)}"\n---\n\n## 1. Overview\n\nx y z.\n\n## Success Criteria\n\n1. [ ] a\n`,
  };

  let compared = 0;
  let titleOnlyDifference = 0;
  for (const [name, text] of Object.entries(shapes)) {
    withTempDoc("task.998.parity.md", text, (file) => {
      // What the authoring path produces...
      const authoring = pf.preflight(file, "task");
      // ...against the body the sync path resolves, through the same checker.
      const syncBody = lib.parseFrontmatter(readFileSync(file, "utf8")).body;
      const sync = lib.checkCardSections(
        syncBody,
        lib.CARD_SECTIONS_BY_KIND.task,
      );

      // Compare the BODY, not only the verdict. The original divergence
      // produced identical verdicts on every real document — a verdict-only
      // assertion passes while the two paths read different text, which is the
      // state this test exists to forbid. `body` is exposed on the result for
      // exactly this comparison; nothing else reads it.
      assert.equal(
        authoring.body,
        syncBody,
        `${name}: the two paths resolved DIFFERENT bodies — a verdict that happens to match is not parity`,
      );
      // The title findings are the one thing the authoring path adds; they all
      // carry section "(title)". Filter on that, then prove the filter removed
      // only title findings: each one it kept out names a title code, and none
      // of the section findings it kept is a title code. (The earlier form
      // compared two complementary filters over one array, which cannot fail.)
      const TITLE_CODES = [
        "title-too-long",
        "title-not-inline",
        "title-unreadable-bom",
      ];
      const titleOnly = authoring.findings.filter(
        (f) => f.section === "(title)",
      );
      const sectionFindings = authoring.findings.filter(
        (f) => f.section !== "(title)",
      );
      assert.ok(
        titleOnly.every((f) => TITLE_CODES.includes(f.code)),
        `${name}: a (title) finding carries a non-title code`,
      );
      assert.ok(
        sectionFindings.every((f) => !TITLE_CODES.includes(f.code)),
        `${name}: a title code escaped the (title) section`,
      );
      if (titleOnly.length) {
        assert.equal(
          name,
          "title over the bound",
          `${name}: unexpected title finding`,
        );
        assert.equal(titleOnly.length, 1);
        titleOnlyDifference++;
      }
      assert.equal(
        sectionFindings.length === 0,
        sync.ok,
        `${name}: ok differs`,
      );
      assert.deepEqual(
        sectionFindings.map((f) => `${f.section}:${f.severity}`),
        sync.findings.map((f) => `${f.section}:${f.severity}`),
        `${name}: findings differ`,
      );
      assert.deepEqual(
        authoring.blocks.map((b) => `${b.heading}:${b.status}:${b.chars}`),
        sync.blocks.map((b) => `${b.heading}:${b.status}:${b.chars}`),
        `${name}: block resolution differs — the two paths are reading different bodies`,
      );
      compared++;
    });
  }
  assert.equal(compared, 5, "non-vacuity: every shape must have been compared");
  assert.equal(
    titleOnlyDifference,
    1,
    "non-vacuity: the long-title shape must have produced its one title finding",
  );
});

test("B: --json does not emit the document body", () => {
  // `body` is on the returned object for the parity test above. Emitting it
  // makes the payload 94% document — found by /review-pr's code lens after the
  // parity fix added the field.
  const real = join(
    repoRoot,
    "docs/tasks/task.102.authoring-time-card-preflight/task.102.authoring-time-card-preflight.md",
  );
  const { code, stdout } = runCli(["--file", real, "--json"]);
  assert.equal(code, 0);
  const payload = JSON.parse(stdout);
  assert.equal(
    payload.body,
    undefined,
    "--json must not carry the document body",
  );
  assert.ok(
    payload.ok === true && Array.isArray(payload.blocks),
    "non-vacuity: the payload must still be a real result",
  );
  assert.ok(
    stdout.length < 4096,
    `--json payload is ${stdout.length} bytes — the body is probably back in it`,
  );

  // ...while the library caller still gets it, which is what the parity test needs.
  assert.equal(typeof pf.preflight(real, "task").body, "string");
});

test("B: every sync-jira-* --check-card --json carries the same scope statement (CR2-6)", () => {
  // A CARD document is the one whose basename equals its directory; every
  // other file in the folder (dod, qa, gate, plan, review) is a sibling
  // artifact no card is built from. Walked with readdirSync, as the corpus
  // test beside this one does — no shell, no path quoting (CR4-2).
  const first = (prefix) => {
    const stack = [join(repoRoot, "docs")];
    const hits = [];
    while (stack.length) {
      const dir = stack.pop();
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          stack.push(full);
        } else if (
          entry.startsWith(`${prefix}.`) &&
          entry.endsWith(".md") &&
          entry === `${dir.split(sep).at(-1)}.md`
        ) {
          hits.push(full);
        }
      }
    }
    return hits.sort()[0];
  };
  const docs = {
    task: join(
      repoRoot,
      "docs/tasks/task.102.authoring-time-card-preflight/task.102.authoring-time-card-preflight.md",
    ),
    story: first("story"),
    epic: first("epic"),
    bug: first("bug"),
  };
  let checked = 0;
  for (const [kind, doc] of Object.entries(docs)) {
    assert.ok(doc, `no ${kind} document found for the scope check`);
    const out = execFileSync(
      process.execPath,
      [
        join(repoRoot, `skills/sync-jira-${kind}/scripts/sync-jira-${kind}.js`),
        "--file",
        doc,
        "--check-card",
        "--json",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    const payload = JSON.parse(out.slice(out.indexOf("{")));
    assert.match(
      payload.scope,
      /^\d+ card blocks? resolves? — this checks the card sections only, not template completeness\.$/,
      `${kind}: scope missing or malformed`,
    );
    // ...and it is derived from THIS payload's resolved blocks — not a
    // constant, and not the preflight CLI's count: the epic sync checks one
    // block more than the shared spec (Stories Breakdown, where `no-table`
    // lives), so equality across the two tools would be the wrong pin.
    const resolved = payload.blocks.filter((b) => b.status === "ok").length;
    assert.equal(
      Number.parseInt(payload.scope, 10),
      resolved,
      `${kind}: scope count does not match the payload's resolved blocks`,
    );
    checked++;
  }
  assert.equal(
    checked,
    4,
    "non-vacuity: all four sync scripts must have been run",
  );
});

test("B: --json and the display both carry the scope statement", () => {
  const real = join(
    repoRoot,
    "docs/tasks/task.102.authoring-time-card-preflight/task.102.authoring-time-card-preflight.md",
  );
  const { stdout } = runCli(["--file", real, "--json"]);
  const payload = JSON.parse(stdout);
  assert.equal(payload.ok, true);
  assert.match(
    payload.scope,
    // The authoring preflight also reads the title (task.150), and its scope
    // line says so; the sync paths' wording is pinned by the four-script test.
    /^\d+ card blocks? resolves? — this checks the card sections and the title only, not template completeness\.$/,
  );
  const shown = runCli(["--file", real]).stdout;
  assert.match(shown, /No problems found\. \d+ card block/);
  assert.match(shown, /not template completeness/);
});

test("B: card-preflight does not implement its own frontmatter parse", () => {
  const src = readFileSync(CLI, "utf8");
  assert.match(
    src,
    /lib\.parseFrontmatter\(/,
    "it must use the library's parser",
  );
  // A local `---` slicer is the shape the divergence came in. Catch the
  // reimplementation, not just its old name.
  assert.equal(
    /indexOf\(\s*["\'`]\\n---/.test(src) ||
      /startsWith\(\s*["\'`]---/.test(src),
    false,
    "card-preflight.js appears to slice frontmatter itself again",
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

// ---------------------------------------------------------------------------
// Title bound (task.150, obs #128)
// ---------------------------------------------------------------------------

// A complete, clean task document whose only variable is its title, so every
// finding below is the title's.
const withTitle = (title, h1 = "Technical Task: a short name") => `---
id: task.997
type: task
${title == null ? "" : `title: "${title}"\n`}---

# ${h1}

## 1. Overview

A summary sentence the card can publish.

## 9. Success Criteria

- [ ] One criterion the card can publish.
`;

test("A: a 101-character title gets exactly one title-too-long finding naming the H1", () => {
  withTempDoc("task.997.title.md", withTitle("t".repeat(101)), (file) => {
    const r = pf.preflight(file, "task");
    const t = r.findings.filter((f) => f.code === "title-too-long");
    assert.equal(t.length, 1, "exactly one title finding");
    assert.equal(r.findings.length, 1, "the fixture has no other finding");
    assert.equal(t[0].severity, "important");
    assert.equal(t[0].section, "(title)");
    assert.match(
      t[0].fix,
      /Technical Task: a short name/,
      "the fix names the H1",
    );
    assert.equal(r.ok, false, "ok covers the title as well as the sections");
  });
});

test("A: a title of exactly CARD_TITLE_MAX characters gets no finding (the bound is >, not >=)", () => {
  assert.equal(lib.CARD_TITLE_MAX, 100);
  withTempDoc(
    "task.997.title.md",
    withTitle("t".repeat(lib.CARD_TITLE_MAX)),
    (file) => {
      const r = pf.preflight(file, "task");
      assert.deepEqual(r.findings, []);
      assert.equal(r.ok, true);
    },
  );
});

test("A: no title gets no finding", () => {
  withTempDoc("task.997.title.md", withTitle(null), (file) => {
    assert.deepEqual(pf.preflight(file, "task").findings, []);
  });
});

test("A: an H1 over the bound is not offered as the fix", () => {
  const f = lib.checkCardTitle(
    { title: "t".repeat(150) },
    `# ${"h".repeat(120)}\n`,
  );
  assert.equal(f.length, 1);
  assert.match(f[0].fix, /Shorten the title/);
});

test("A: the title finding appears for story and epic documents too", () => {
  const long = "t".repeat(101);
  for (const kind of ["story", "epic"]) {
    const doc = `---\ntitle: "${long}"\n---\n\n# Short\n`;
    withTempDoc(`${kind}.1.x.md`, doc, (file) => {
      const r = pf.preflight(file, kind);
      assert.equal(
        r.findings.filter((f) => f.code === "title-too-long").length,
        1,
        `${kind}: one title finding`,
      );
    });
  }
});

test("A: a long title exits 0 by default and 1 under --strict", () => {
  withTempDoc("task.997.title.md", withTitle("t".repeat(101)), (file) => {
    const plain = runCli(["--file", file]);
    assert.equal(plain.code, 0);
    assert.match(plain.stdout, /title-too-long|\(title\)/);
    assert.equal(runCli(["--file", file, "--strict", "--json"]).code, 1);
  });
});

test("A: a clean result says it read the title; the sync scope line does not", () => {
  withTempDoc("task.997.title.md", withTitle("a short title"), (file) => {
    const out = runCli(["--file", file]).stdout;
    assert.match(out, /checks the card sections and the title only/);
    const json = JSON.parse(runCli(["--file", file, "--json"]).stdout);
    assert.match(json.scope, /and the title only/);
  });
  // The sync path never sets titleChecked, so its wording is unchanged.
  const sync = lib.checkCardSections(
    "## 1. Overview\n\nx.\n\n## Success Criteria\n\n- [ ] a\n",
    lib.CARD_SECTIONS_BY_KIND.task,
  );
  assert.match(lib.describeCardScope(sync), /checks the card sections only/);
});

// The three shapes the finalise security probe reproduced (task.150 DoD): each
// hid an over-bound title from the line-based parser, so the bound passed it.
test("A: a folded block-scalar title is flagged, not measured by its indicator", () => {
  const doc = `---\ntitle: >-\n  ${"word ".repeat(40).trim()}\n---\n\n# Short\n\n## 1. Overview\n\nA sentence.\n\n## 9. Success Criteria\n\n- [ ] one\n`;
  withTempDoc("task.996.folded.md", doc, (file) => {
    const codes = pf.preflight(file, "task").findings.map((f) => f.code);
    assert.deepEqual(codes, ["title-not-inline"]);
  });
});

test("A: a literal block-scalar title is flagged, not measured by its indicator", () => {
  const doc = `---\ntitle: |\n  ${"x".repeat(150)}\n---\n\n# Short\n\n## 1. Overview\n\nA sentence.\n\n## 9. Success Criteria\n\n- [ ] one\n`;
  withTempDoc("task.996.literal.md", doc, (file) => {
    const codes = pf.preflight(file, "task").findings.map((f) => f.code);
    assert.deepEqual(codes, ["title-not-inline"]);
  });
});

test("A: a BOM before the frontmatter is flagged, and the title behind it is still measured", () => {
  const doc = `\uFEFF---\ntitle: "${"x".repeat(368)}"\n---\n\n# Short\n\n## 1. Overview\n\nA sentence.\n\n## 9. Success Criteria\n\n- [ ] one\n`;
  withTempDoc("task.996.bom.md", doc, (file) => {
    const r = pf.preflight(file, "task");
    const title = r.findings
      .filter((f) => f.section === "(title)")
      .map((f) => f.code);
    assert.deepEqual(title, ["title-unreadable-bom", "title-too-long"]);
    assert.equal(r.ok, false);
  });
  // A BOM with a short title still gets the BOM finding: the sync cannot read it.
  withTempDoc(
    "task.996.bom-short.md",
    `\uFEFF---\ntitle: "a name"\n---\n\n# Short\n`,
    (file) => {
      const codes = pf
        .preflight(file, "task")
        .findings.filter((f) => f.section === "(title)")
        .map((f) => f.code);
      assert.deepEqual(codes, ["title-unreadable-bom"]);
    },
  );
});

// The seven shapes DoD run 2 reproduced (task.150.dod.2.security.run.json): each
// made the line-based parser measure something other than the YAML title. The
// title is now read from the raw header, and every non-inline form is refused.
test("A: every title that is not one single-line column-0 value is title-not-inline", () => {
  const L = "Long title word ".repeat(10).trim();
  const shapes = {
    "block scalar with a comment": `title: >- # name\n  ${L}`,
    "tagged block scalar": `title: !!str >-\n  ${L}`,
    "anchored block scalar": `title: &t >-\n  ${L}`,
    "multi-line plain scalar": `title: Short start\n  ${L}`,
    "value on the next line": `title:\n  ${L}`,
    "multi-line double-quoted scalar": `title: "Short start\n  ${L}"`,
    "indented title overwriting the real one": `title: ${L}\nnotes: |\n  title: short`,
  };
  let checked = 0;
  for (const [name, header] of Object.entries(shapes)) {
    const doc = `---\n${header}\ntype: task\n---\n\n# Short\n\n## 1. Overview\n\nA sentence.\n\n## 9. Success Criteria\n\n- [ ] one\n`;
    withTempDoc("task.995.shape.md", doc, (file) => {
      const codes = pf
        .preflight(file, "task")
        .findings.filter((f) => f.section === "(title)")
        .map((f) => f.code);
      assert.deepEqual(
        codes,
        ["title-not-inline"],
        `${name}: ${JSON.stringify(codes)}`,
      );
    });
    checked++;
  }
  assert.equal(checked, 7, "non-vacuity: every shape was checked");
  // And the inline forms real documents use are NOT refused.
  for (const header of [
    `title: "[Task 1] a name"`,
    `title: 'a name'`,
    `title: a name: with a colon`,
  ]) {
    assert.deepEqual(
      lib.readCardTitle(`---\n${header}\n---\n`).problem,
      null,
      header,
    );
  }
});

// Success Criterion: CARD_TITLE_MAX is defined once, in shared/resources/jira-sync.js,
// and anywhere else only as a generated references/ copy of that file. This is a
// source-structure property, so a scan of the TRACKED tree is the instrument. The
// pattern is assembled at runtime so this file does not match itself.
test("B: CARD_TITLE_MAX is defined in exactly one source file", () => {
  const name = ["CARD", "TITLE", "MAX"].join("_");
  const out = execFileSync(
    "git",
    ["grep", "-l", "-E", `${name}[[:space:]]*=`, "--", "shared", "skills"],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );
  const files = out.split("\n").filter(Boolean);
  assert.ok(
    files.includes("shared/resources/jira-sync.js"),
    "non-vacuity: the source definition is found",
  );
  const others = files.filter(
    (f) =>
      f !== "shared/resources/jira-sync.js" &&
      !/^skills\/[^/]+\/references\/jira-sync\.js$/.test(f),
  );
  assert.deepEqual(
    others,
    [],
    `a second definition of ${name}: ${others.join(", ")}`,
  );
});
