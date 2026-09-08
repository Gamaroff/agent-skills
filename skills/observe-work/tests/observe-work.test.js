"use strict";
/**
 * observe-work contract tests.
 *
 * Prose-driven skill — assert the structural invariants of SKILL.md and the
 * references, never that a particular sentence exists. Grepping the source
 * proves the string is there; it does not prove the behaviour works. Each
 * assertion below is about a property a future edit could plausibly break.
 *
 * The two invariants this file exists for:
 *
 *   1. **Progressive disclosure is real.** The body is an always-loaded,
 *      per-invocation tax; the references are not. Upstream states a 500-line
 *      rule in a 710-line body. A pointer without a load trigger reads as
 *      optional and gets skipped, which turns the pointer list into a
 *      bibliography and quietly moves the whole cost back into the body.
 *
 *   2. **Every log operation goes through the engine.** The moment a snippet
 *      here hand-rolls an id, an archival sweep or a frontmatter parse, the
 *      guards in observation-log.js are bypassed and the defects they exist to
 *      prevent (octal id parsing, archiving a just-resolved entry, a grep-based
 *      queue that drops statusless files) come back one snippet at a time.
 *
 * Run: node --test 'skills/observe-work/tests/*.test.js'
 */

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const SKILL_DIR = path.join(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(SKILL_DIR, rel), "utf8");

/**
 * Read a file OUTSIDE the skill directory — the repo root, a sibling skill,
 * shared/resources. Returns null on ENOENT instead of throwing.
 *
 * `tests/` ships inside the packaged skill (package_skill.py walks the whole
 * skill dir), so a consumer can run this suite with observe-work installed and
 * the rest of the repo absent. There these assertions have nothing to compare
 * against and skip. In THIS repo the targets are always present, so they always
 * run — which is the point, and is asserted separately below so that a
 * degradation which skipped everywhere could not leave a green suite behind.
 */
const readOutside = (...segs) => {
  try {
    return fs.readFileSync(path.join(SKILL_DIR, "..", "..", ...segs), "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
};

const SKILL = read("SKILL.md");

/** The body — everything after the closing `---` of the frontmatter block. */
const BODY = (() => {
  const m = SKILL.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  assert.ok(m, "SKILL.md must open with a YAML frontmatter block");
  return m[1];
})();

/** The frontmatter block, without its fences. */
const FRONTMATTER = SKILL.match(/^---\n([\s\S]*?)\n---\n/)[1];

/** The five authored references. Bundled copies are asserted separately. */
const AUTHORED_REFS = [
  "signals.md",
  "review-cycle.md",
  "applying-updates.md",
  "environments.md",
  "starter-principles.md",
];

// ── Frontmatter ──────────────────────────────────────────────────────────────

test("frontmatter: name matches the directory", () => {
  assert.match(FRONTMATTER, /^name: observe-work$/m);
  assert.equal(path.basename(SKILL_DIR), "observe-work");
});

test("frontmatter: description contains no angle brackets", () => {
  // quick_validate.py rejects these outright — a hard failure, not a warning.
  const desc = FRONTMATTER.match(
    /^description: ([\s\S]*?)(?=\n[a-z_-]+:|\n*$)/m,
  );
  assert.ok(desc, "description must be present");
  assert.doesNotMatch(desc[1], /[<>]/);
});

test("frontmatter: description stays under the 150-word context budget", () => {
  const desc = FRONTMATTER.match(
    /^description: ([\s\S]*?)(?=\n[a-z_-]+:|\n*$)/m,
  )[1];
  const words = desc.trim().split(/\s+/).length;
  assert.ok(
    words <= 150,
    `description is ${words} words; quick_validate.py warns over 150 and it is ` +
      `always in context`,
  );
});

test("frontmatter: invokes is inline flow form and names real skills", () => {
  // Block form (`invokes:` then a `- name` list) is rejected loudly by
  // scripts/generate-skill-dependencies.mjs. Asserting the flow form here is
  // what keeps `npm run generate-skill-deps` from failing on this skill.
  const line = FRONTMATTER.match(/^invokes:[ \t]*(.*)$/m);
  assert.ok(line, "invokes: must be present");
  assert.match(
    line[1],
    /^\[[^\]]*\]$/,
    "invokes: must be inline flow form — `invokes: [a, b]`, never a block list",
  );

  const names = line[1]
    .slice(1, -1)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  assert.ok(names.length > 0, "invokes: must name at least one skill");

  for (const name of names) {
    const sibling = readOutside("skills", name, "SKILL.md");
    if (sibling === null) continue; // packaged install without the sibling
    assert.ok(
      sibling.length > 0,
      `invokes: names ${name}, whose SKILL.md is empty`,
    );
  }
});

// ── Progressive disclosure ───────────────────────────────────────────────────

test("body stays under the 500-line ceiling", () => {
  const lines = BODY.split("\n").length;
  assert.ok(
    lines <= 500,
    `SKILL.md body is ${lines} lines. The body is an always-loaded per-invocation ` +
      `cost; content that does not change behaviour on EVERY invocation belongs ` +
      `in a reference.`,
  );
});

test("every references/ path named in the body resolves to a shipped file", () => {
  const refs = new Set(
    [...BODY.matchAll(/(?:^|[\s`(\[])references\/([A-Za-z0-9._-]+)/g)].map(
      (m) => m[1],
    ),
  );
  assert.ok(refs.size > 0, "the body must point at its references");
  for (const ref of refs) {
    assert.ok(
      fs.existsSync(path.join(SKILL_DIR, "references", ref)),
      `SKILL.md names references/${ref}, which is not shipped`,
    );
  }
});

/**
 * The pointer table's rows, parsed into {target, trigger}.
 *
 * Parsed rather than substring-matched, deliberately. "Is this reference
 * pointed at?" is a claim about a RELATIONSHIP — this file, in the pointer
 * table, with a trigger — and `BODY.includes("references/x.md")` is satisfied
 * by the name appearing anywhere at all, including in another row's prose or in
 * an unrelated paragraph. That would let a reference lose its pointer entirely
 * while the assertion stayed green, which is the precise failure this suite is
 * supposed to make impossible.
 */
const POINTER_ROWS = (() => {
  const section = BODY.split(/^## Load these when their trigger fires$/m)[1];
  assert.ok(section, "the body must carry a triggered pointer table");
  return section
    .split("\n")
    .filter((l) => /^\|\s*\[/.test(l)) // rows whose first cell is a link
    .map((row) => {
      const cells = row.split("|").map((c) => c.trim());
      const link = cells[1].match(/\]\(([^)]+)\)/);
      return { row, target: link ? link[1] : null, trigger: cells[2] || "" };
    });
})();

test("every authored reference has its own row in the pointer table", () => {
  // The converse of the assertion above: a reference nothing points at is
  // dead weight that ships on every install and loads for nobody.
  // A Set keyed on each row's own parsed link destination. Exact membership,
  // not substring containment: the question is whether THIS reference has its
  // own row, and a name appearing inside another row's prose must not answer it.
  const targets = new Set(POINTER_ROWS.map((r) => r.target));
  for (const ref of AUTHORED_REFS) {
    assert.ok(
      targets.has(`references/${ref}`),
      `references/${ref} is shipped but has no row in the pointer table. ` +
        `Rows point at: ${[...targets].join(", ")}`,
    );
  }
});

test("every pointer-table entry states a load trigger, not a description", () => {
  // A pointer without a trigger reads as optional and gets skipped; an
  // unconditioned list of filenames is a bibliography, not progressive
  // disclosure.
  assert.ok(
    POINTER_ROWS.length >= AUTHORED_REFS.length,
    "every authored reference needs a row",
  );

  for (const { row, trigger } of POINTER_ROWS) {
    assert.match(
      trigger,
      /^(you|the|`\/observe-work|Session Start)/i,
      `pointer row has no load trigger in its second cell: ${row}`,
    );
    assert.ok(
      trigger.length > 15,
      `pointer trigger is too short to be a condition: ${trigger}`,
    );
  }
});

test("each authored reference declares its own load trigger", () => {
  for (const ref of AUTHORED_REFS) {
    const body = read(path.join("references", ref));
    assert.match(
      body,
      /^> \*\*Load when\*\* /m,
      `references/${ref} must open with a "> **Load when** …" line matching its ` +
        `pointer in SKILL.md`,
    );
  }
});

test("references over 300 lines carry a table of contents", () => {
  for (const ref of AUTHORED_REFS) {
    const body = read(path.join("references", ref));
    if (body.split("\n").length <= 300) continue;
    assert.match(
      body,
      /^## Contents$/m,
      `references/${ref} is over 300 lines and needs a table of contents`,
    );
  }
});

// ── Attribution (a licence obligation, not a courtesy) ───────────────────────

test("the attribution block is complete", () => {
  // CC BY 4.0 requires attribution wherever the work travels, and requires
  // that modifications be indicated. All four elements must be present.
  assert.match(BODY, /Eoghan Henn/, "must name the author");
  assert.match(BODY, /CC BY 4\.0/, "must name the licence");
  assert.match(
    BODY,
    /github\.com\/rebelytics\/one-skill-to-rule-them-all/,
    "must link the canonical repo",
  );
  assert.match(
    BODY,
    /\*\*Changes were made\*\*/,
    "CC BY 4.0 requires modifications to be indicated",
  );
});

// ── The engine boundary ──────────────────────────────────────────────────────

test("no snippet hand-rolls a log operation", () => {
  // Each of these bypasses a guard the engine owns:
  //   .id-floor      → the id rule's third input; hand-reading it skips the sweep
  //   find over logs → the archival gate and the statusless-is-open rule
  //   awk/sed on ^status → the queue rule (a grep drops statusless files)
  const forbidden = [
    [/\.id-floor/, "reads archive/.id-floor directly — use `next-id`/`write`"],
    [
      /find\s+[^\n]*observation-log[^\n]*-name/,
      "enumerates the log with find — use `scan` or `queue`",
    ],
    [/(awk|sed)\s+[^\n]*\^status/, "parses frontmatter by hand — use `scan`"],
    [
      /grep\s+[^\n]*['"]status:\s*open/,
      "derives the queue from a status grep — `status` is optional and its " +
        "absence means open, so the grep drops exactly the files that belong " +
        "in the queue. Use `queue`.",
    ],
  ];
  for (const [re, why] of forbidden) {
    assert.doesNotMatch(BODY, re, `SKILL.md ${why}`);
  }
});

test("every engine subcommand named in the body exists in the engine", () => {
  const engine = readOutside("shared", "resources", "observation-log.js");
  if (engine === null) return; // packaged install without the repo

  const named = new Set(
    [...BODY.matchAll(/observation-log\.js\s+([a-z-]+)/g)].map((m) => m[1]),
  );
  assert.ok(named.size > 0, "the body must invoke the engine");

  const declared = engine.match(
    /const SUBCOMMANDS = new Set\(\[([\s\S]*?)\]\)/,
  );
  assert.ok(declared, "engine must declare SUBCOMMANDS");
  const known = new Set(
    [...declared[1].matchAll(/"([a-z-]+)"/g)].map((m) => m[1]),
  );

  for (const sub of named) {
    assert.ok(
      known.has(sub),
      `SKILL.md invokes \`observation-log.js ${sub}\`, which the engine does not ` +
        `implement. Known: ${[...known].sort().join(", ")}`,
    );
  }
});

test("every reason the body branches on is in the engine's vocabulary", () => {
  const engine = readOutside("shared", "resources", "observation-log.js");
  if (engine === null) return;

  // Collect from every line that mentions `reason`, not just the object-literal
  // form. The engine emits `fork-detected` by assignment (`reason = "…"`) and
  // `already` from a ternary (`reason: x ? "ok" : "already"`), so a regex keyed
  // on `reason: "…"` alone under-collects the vocabulary — and an
  // under-collected "known" set makes this assertion fail on reasons that are
  // real, which is the failure mode that looks most like a finding.
  const known = new Set();
  for (const line of engine.split("\n")) {
    if (!/\breason\b/.test(line)) continue;
    for (const m of line.matchAll(/"([a-z0-9-]+)"/g)) known.add(m[1]);
  }
  // Reasons the body names in its reason tables, as backticked literals.
  const branched = [
    "ok",
    "ephemeral-workspace",
    "fork-detected",
    "empty",
    "scan-broken",
  ];
  for (const reason of branched) {
    assert.ok(
      BODY.includes(`\`${reason}\``),
      `the body should document the \`${reason}\` branch`,
    );
    assert.ok(
      known.has(reason),
      `the body branches on reason \`${reason}\`, which the engine never emits`,
    );
  }
});

test("the missing-workspace branch keys on `healthy`, not on `reason`", () => {
  // TASK-94-001. `doctor` on an uninitialised workspace returns reason "ok",
  // healthy false, exitCode 0, and a checks[] entry `workspace-exists` with
  // ok:false. A protocol that branches on `reason` alone matches the "Nothing"
  // row and never runs `init`; the next step's `scan` then answers `empty` for
  // a directory that does not exist. Two silent failures compounding into a
  // reassuring one, in the skill's first action of every session.
  const step1 = BODY.split(/\*\*1\. Storage\.\*\*/)[1];
  assert.ok(step1, "Session Start step 1 must exist");
  const scoped = step1.split(/\*\*2\. Scan\.\*\*/)[0];

  assert.match(
    scoped,
    /`healthy`/,
    "step 1 must tell the reader to read `healthy` — a missing workspace is a " +
      "failing CHECK, not a failing call",
  );
  assert.match(
    scoped,
    /workspace-exists/,
    "step 1 must name the `workspace-exists` check that carries the signal",
  );

  // The init row must be keyed on healthy/checks, never on a `reason` value.
  const initRow = scoped
    .split("\n")
    .find((l) => /\binit\b/.test(l) && l.startsWith("|"));
  assert.ok(initRow, "step 1 must carry a row whose action is `init`");
  assert.match(
    initRow,
    /healthy|workspace-exists/,
    `the init row must key on healthy/checks, not on a reason value: ${initRow}`,
  );

  // These two ARE real reason values and must stay keyed on reason.
  for (const r of ["ephemeral-workspace", "fork-detected"]) {
    const row = scoped
      .split("\n")
      .find((l) => l.startsWith("|") && l.includes(r));
    assert.ok(row, `step 1 must still carry a row for the ${r} reason`);
    assert.match(
      row,
      /`reason`/,
      `${r} IS a real reason value and its row must stay keyed on reason: ${row}`,
    );
  }
});

test("the body never invokes bare `node`", () => {
  // On a machine where `node` is an nvm shell function, the bare form prints
  // nvm's help to stdout and corrupts every --json payload the caller captures.
  // Negative lookbehind rather than a post-filter: the match starts at the
  // character BEFORE `node`, so a post-filter for "command node" never sees
  // the word "command" and passes everything.
  const bare = [
    ...BODY.matchAll(/(?<!command )(?<![A-Za-z_./-])node\s+\S/g),
  ].map((m) => m[0]);
  assert.deepEqual(
    bare,
    [],
    "use `command node`, never bare `node` — see the Quick reference note",
  );
});

test("the resolver is always sourced guarded", () => {
  const sources = [
    ...BODY.matchAll(/^.*source .*resolve-observation-workspace\.sh.*$/gm),
  ];
  assert.ok(sources.length > 0, "the body must source the resolver");
  for (const [line] of sources) {
    // Inside a markdown table cell the shell `||` is escaped as `\|\|`, so the
    // guard must be recognised in both forms — a check that only knew the bare
    // form would pass a table row that had silently lost its guard.
    assert.match(
      line,
      /(\\\||\|)(\\\||\|)\s*exit 1/,
      "a bare `source` prints the resolver's error and carries on with the " +
        "variables unset, which turns every filter into a match-nothing glob " +
        `and reports a clean, empty backlog: ${line}`,
    );
  }
});

// ── Safety properties ────────────────────────────────────────────────────────

test("the staging-only rule is stated in the body, not only in a reference", () => {
  // Staging-only is what makes an autonomous review acceptable. A rule that
  // lives only in a reference is a rule that is absent whenever the reference
  // was not loaded — and the acting contexts do not all load one.
  assert.match(
    BODY,
    /never edits a live skill file/i,
    "the body must state the live-file rule",
  );
});

test("write is never shown with an --id flag", () => {
  // The engine rejects it: ids are always derived, and a batch that pre-computes
  // a base collapses N independent max-checks into one stale read.
  const writes = [
    ...BODY.matchAll(/observation-log\.js write[\s\S]{0,300}?(?=\n\n|\n```)/g),
  ];
  for (const [snippet] of writes) {
    assert.doesNotMatch(snippet, /--id\b/, "`write` does not accept --id");
  }
});

test("siblings-checked is present on every documented write", () => {
  const writes = [
    ...BODY.matchAll(/observation-log\.js write[\s\S]{0,300}?(?=\n\n|\n```)/g),
  ];
  assert.ok(writes.length > 0, "the body must document the write call");
  for (const [snippet] of writes) {
    assert.match(
      snippet,
      /--siblings-checked/,
      "--siblings-checked is mandatory: the two states of a one-entry skill " +
        "list — siblings evaluated and excluded, versus never considered — are " +
        "otherwise byte-identical",
    );
  }
});

// ── In-repo guard ────────────────────────────────────────────────────────────

test("in this repo, the cross-file assertions actually ran", () => {
  // readOutside() returns null on ENOENT so a packaged install can run this
  // suite. That degradation must not silently apply HERE, where it would delete
  // the engine-boundary guards and leave a green suite behind.
  if (!fs.existsSync(path.join(SKILL_DIR, "..", "..", "package.json"))) return;
  assert.ok(
    readOutside("shared", "resources", "observation-log.js"),
    "running in the agent-skills repo but the engine was not readable — the " +
      "engine-boundary assertions above silently skipped",
  );
  assert.ok(
    readOutside("skills", "create-skill", "SKILL.md"),
    "running in the agent-skills repo but create-skill was not readable — the " +
      "invokes: assertion silently skipped",
  );
});
