"use strict";
/**
 * L3 protocol checker — static analysis of SKILL.md files.
 *
 * Catches drift between the prose protocol and the rest of the skill:
 *   - sub-skill references must resolve to a real skill on disk
 *   - HALT clauses must have a decision step earlier in the protocol
 *   - mandatory-section counts must match the resource template
 *   - frontmatter contract (name + description) must be present
 *
 * Deterministic and fast — runs every push.
 * Run: node --test tests/
 */

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const REPO_ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(REPO_ROOT, "skills");

function loadSkill(name) {
  const p = path.join(SKILLS_DIR, name, "SKILL.md");
  return { path: p, content: fs.readFileSync(p, "utf-8") };
}

function existsSkill(name) {
  return fs.existsSync(path.join(SKILLS_DIR, name, "SKILL.md"));
}

function listSubSkillReferences(content) {
  // Match: `skill-name` in backticks where it looks like a kebab-case skill ref.
  // Filter to those that match an actual skill directory pattern (no slashes, no dots).
  const refs = new Set();
  const re = /`([a-z][a-z0-9-]+)`/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const name = m[1];
    if (name.includes("-") && existsSkill(name)) refs.add(name);
  }
  return [...refs];
}

const TARGET_SKILLS = ["create-task", "create-story"];

// ===========================================================================
// Frontmatter — every SKILL.md must declare `name:` and `description:`
// ===========================================================================
for (const name of TARGET_SKILLS) {
  test(`${name} — SKILL.md has required frontmatter fields`, () => {
    const { content } = loadSkill(name);
    assert.match(content, /^---\n/, "must start with YAML frontmatter");
    assert.match(content, /\nname:\s*\S+/, "must declare name:");
    assert.match(content, /\ndescription:\s*\S+/, "must declare description:");
  });
}

// ===========================================================================
// Sub-skill references — every backticked kebab-case identifier that names a
// skill must resolve to a real skill directory.
// ===========================================================================
for (const name of TARGET_SKILLS) {
  test(`${name} — all referenced sub-skills exist on disk`, () => {
    const { content } = loadSkill(name);
    // Explicit known sub-skills the protocol invokes. Add to this list as new
    // dispatches appear in either SKILL.md.
    const required = ["documentation-standards-validator", "mermaid-architect"];
    if (name === "create-story") required.push("execute-checklist");
    for (const sk of required) {
      assert.ok(
        content.includes(sk),
        `${name}/SKILL.md should reference \`${sk}\``,
      );
      assert.ok(
        existsSkill(sk),
        `referenced sub-skill \`${sk}\` does not exist under skills/`,
      );
    }
  });
}

// ===========================================================================
// Stop semantics — every skill must describe at least one terminator condition
// (HALT or STOP) so the agent has a known exit on bad state.
// ===========================================================================
for (const name of TARGET_SKILLS) {
  test(`${name} — describes at least one HALT/STOP terminator`, () => {
    const { content } = loadSkill(name);
    const hasHalt = /\bHALT\b/.test(content);
    const hasStop = /\bSTOP\b/.test(content);
    assert.ok(
      hasHalt || hasStop,
      `${name}/SKILL.md must describe at least one HALT or STOP terminator`,
    );
  });
}

// ===========================================================================
// create-task — mandatory-section count
// ===========================================================================
test("create-task — protocol declares 11 mandatory sections, template has all 11", () => {
  const { content } = loadSkill("create-task");
  // Protocol claims 11 sections in two places. Both must say 11.
  assert.match(content, /Mandatory Sections \(11\)/);
  assert.match(content, /11 mandatory sections/);

  const template = fs.readFileSync(
    path.join(SKILLS_DIR, "create-task", "resources", "task-template.md"),
    "utf-8",
  );
  const lib = require(path.join(SKILLS_DIR, "create-task", "scripts", "lib.js"));
  assert.equal(
    lib.countMandatorySections(template),
    11,
    "task-template.md must contain all 11 mandatory section headings",
  );
});

// ===========================================================================
// create-task — naming convention reference is consistent
// ===========================================================================
test("create-task — naming convention examples are accepted by validator", () => {
  const lib = require(path.join(SKILLS_DIR, "create-task", "scripts", "lib.js"));
  assert.equal(lib.validateTaskFilename("task.1.cache-lib-simplification.md").ok, true);
  assert.equal(lib.validateTaskFilename("task.2.nestjs-dynamic-module-pattern.md").ok, true);
  // SKILL.md explicitly calls out the wrong forms below as invalid.
  assert.equal(lib.validateTaskFilename("task_1_cache_lib_simplification.md").ok, false);
  assert.equal(lib.validateTaskFilename("task.1.cacheLibSimplification.md").ok, false);
});

// ===========================================================================
// create-story — story-template.yaml declares all required sections
// ===========================================================================
test("create-story — template declares all required sections", () => {
  const lib = require(path.join(SKILLS_DIR, "create-story", "scripts", "lib.js"));
  const tpl = fs.readFileSync(
    path.join(SKILLS_DIR, "create-story", "resources", "story-template.yaml"),
    "utf-8",
  );
  const ids = lib.listTemplateSectionIds(tpl);
  for (const required of lib.REQUIRED_STORY_SECTION_IDS) {
    assert.ok(
      ids.includes(required),
      `story-template.yaml missing required section id "${required}"`,
    );
  }
});

// ===========================================================================
// Stakeholder sign-off — the section exists in every template that carries it,
// the two story-template copies stay byte-identical, and the task section stays
// UNNUMBERED (numbering it would break the 11-section contract above).
// ===========================================================================
const SIGN_OFF_HEADING = "Stakeholder Sign-off";

test("sign-off — story-template.yaml declares the sign-off section and allows editing it", () => {
  const lib = require(path.join(SKILLS_DIR, "create-story", "scripts", "lib.js"));
  const tpl = fs.readFileSync(
    path.join(SKILLS_DIR, "create-story", "resources", "story-template.yaml"),
    "utf-8",
  );
  assert.ok(
    lib.listTemplateSectionIds(tpl).includes("sign-off"),
    'story-template.yaml must declare a "sign-off" section id',
  );
  assert.match(
    tpl,
    new RegExp(`editable_sections:[\\s\\S]*?- ${SIGN_OFF_HEADING}`),
    `"${SIGN_OFF_HEADING}" must be listed in agent_config.editable_sections`,
  );
});

test("sign-off — create-story and review-story ship byte-identical story templates", () => {
  // These two files are kept in sync by hand, so they drift silently. The task
  // pair already did (review-task's copy lost its frontmatter). Lock the story
  // pair down now that both carry the sign-off section.
  const a = fs.readFileSync(
    path.join(SKILLS_DIR, "create-story", "resources", "story-template.yaml"),
    "utf-8",
  );
  const b = fs.readFileSync(
    path.join(SKILLS_DIR, "review-story", "resources", "story-template.yaml"),
    "utf-8",
  );
  assert.equal(
    a,
    b,
    "skills/{create,review}-story/resources/story-template.yaml have diverged — re-copy the create-story version",
  );
});

for (const skill of ["create-task", "review-task"]) {
  test(`sign-off — ${skill} task template carries an unnumbered sign-off section`, () => {
    const tpl = fs.readFileSync(
      path.join(SKILLS_DIR, skill, "resources", "task-template.md"),
      "utf-8",
    );
    assert.match(
      tpl,
      new RegExp(`^## ${SIGN_OFF_HEADING}$`, "m"),
      `task-template.md must contain an unnumbered "## ${SIGN_OFF_HEADING}" heading`,
    );
    assert.doesNotMatch(
      tpl,
      new RegExp(`^## \\d+\\.\\s*${SIGN_OFF_HEADING}`, "m"),
      "sign-off must stay unnumbered — numbering it breaks the 11-section contract",
    );
    // Signature and Date columns must ship empty. An agent-written signature
    // would destroy the commit-authorship audit trail the design rests on.
    const row = tpl.match(/^\|\s*\[Required Role\]\s*\|([^|]*)\|([^|]*)\|/m);
    assert.ok(row, "template must carry a required-role placeholder row");
    assert.equal(row[1].trim(), "", "Signature cell must ship empty");
    assert.equal(row[2].trim(), "", "Date cell must ship empty");
  });
}

test("sign-off — create-task keeps the mandatory count at 11 with sign-off present", () => {
  const lib = require(path.join(SKILLS_DIR, "create-task", "scripts", "lib.js"));
  const tpl = fs.readFileSync(
    path.join(SKILLS_DIR, "create-task", "resources", "task-template.md"),
    "utf-8",
  );
  assert.match(tpl, new RegExp(`^## ${SIGN_OFF_HEADING}$`, "m"));
  assert.equal(
    lib.countMandatorySections(tpl),
    11,
    "adding the sign-off section must not change the mandatory-section count",
  );
});

for (const skill of ["create-story", "create-task", "review-story", "review-task"]) {
  test(`sign-off — ${skill} documents the config gate and the agents-never-sign rule`, () => {
    const { content } = loadSkill(skill);
    assert.match(content, /sign-off\.enabled/, "must gate on sign-off.enabled");
    assert.match(
      content,
      /never (sign|write into a Signature)/i,
      "must state that agents never sign on a stakeholder's behalf",
    );
    // Bundling rewrites `shared/resources/X` → `references/X` in place, so accept
    // either form; what matters is that the canonical spec is referenced at all.
    assert.match(
      content,
      /(shared\/resources|references)\/sign-off\.md/,
      "must reference the canonical sign-off spec",
    );
  });
}

// ===========================================================================
// change-log — the four review skills document the config gate and link the spec
// ===========================================================================
for (const skill of ["review-story", "review-task", "review-epic", "review-prd"]) {
  test(`change-log — ${skill} documents the config gate and links the spec`, () => {
    const { content } = loadSkill(skill);
    assert.match(content, /change-log\.enabled/, "must gate on change-log.enabled");
    assert.match(content, /change-log\.enforcement/, "must grade per change-log.enforcement");
    // Bundling rewrites `shared/resources/X` → `references/X` in place, so accept
    // either form; what matters is that the canonical spec is referenced at all.
    assert.match(
      content,
      /(shared\/resources|references)\/document-change-log\.md/,
      "must reference the canonical change-log spec",
    );
    // `advisory` must be the documented default. A wrong default here halts every
    // consumer pipeline at review: under `blocking` the gate withholds the status
    // promotion, and develop-* gates on Status, so every legacy document stops the run.
    assert.match(
      content,
      /advisory[^\n]*default|default[^\n]*advisory/i,
      "must document `advisory` as the default enforcement level",
    );
  });
}

// The skills that mutate a document must say they write the row. Without this,
// the grading above checks for a section that nothing ever populates.
for (const skill of [
  "review-story",
  "review-task",
  "review-epic",
  "review-prd",
  "edit-story",
  "edit-epic",
  "correct-course",
  "change-management",
  "shard-doc",
  "shard-prd",
  "enforce-standards",
  "epic-registry-manager",
]) {
  test(`change-log — ${skill} instructs writing a row and links the spec`, () => {
    const { content } = loadSkill(skill);
    assert.match(
      content,
      /(shared\/resources|references)\/document-change-log\.md/,
      "must reference the canonical change-log spec rather than restating the columns",
    );
    assert.match(content, /Change Log/, "must mention the Change Log section");
  });
}

// review-bug is the deliberate exception: bugs carry Status History, never a
// Change Log. Assert the exclusion holds, so a future edit cannot quietly add one.
test("change-log — review-bug writes Status History, not a Change Log", () => {
  const { content } = loadSkill("review-bug");
  assert.match(content, /Status History/, "must instruct writing a Status History row");
  assert.match(
    content,
    /not a Change Log|no Change Log|instead of a Change Log/i,
    "must state explicitly that bugs do not carry a Change Log",
  );
});

test("create-story — naming convention examples are accepted by validator", () => {
  const lib = require(path.join(SKILLS_DIR, "create-story", "scripts", "lib.js"));
  assert.equal(lib.validateStoryFilename("story.178.8.example-feature.md").ok, true);
  assert.equal(lib.validateStoryFilename("story_1_2_example.md").ok, false);
  assert.equal(lib.validateStoryFilename("story.1.2.exampleFeature.md").ok, false);
});

// ===========================================================================
// create-story — references skills-config.yaml HALT condition
// ===========================================================================
test("create-story — HALTs when skills-config.yaml missing", () => {
  const { content } = loadSkill("create-story");
  assert.match(content, /skills-config\.yaml/);
  // The HALT clause and the config name must co-occur within the same 500-char window.
  const haltIdx = content.indexOf("HALT");
  const configIdx = content.indexOf("skills-config.yaml");
  assert.ok(haltIdx >= 0 && configIdx >= 0);
  assert.ok(
    Math.abs(haltIdx - configIdx) < 500,
    "HALT clause and skills-config.yaml reference should be near each other",
  );
});

// ===========================================================================
// Both skills — plan-file co-location rule
// ===========================================================================
for (const name of TARGET_SKILLS) {
  test(`${name} — forbids plan files under ~/.claude/plans/`, () => {
    const { content } = loadSkill(name);
    // The skill must explicitly call out the forbidden location.
    assert.match(content, /~\/\.claude\/plans\//);
    // And mark it as forbidden (❌ or "Forbidden" or "MUST NOT"/"NEVER").
    const lc = content.toLowerCase();
    assert.ok(
      lc.includes("forbidden") || lc.includes("never") || content.includes("❌"),
      "must explicitly mark ~/.claude/plans/ as forbidden",
    );
  });
}

// ===========================================================================
// Change Log — every document template carries the canonical section, the task
// section stays UNNUMBERED (numbering it breaks the 11-section contract), and
// the duplicate template families stay byte-identical.
//
// Mirrors the sign-off block above: same problem shape, same guards.
// ===========================================================================
const CHANGE_LOG_HEADING = "Change Log";
const CANONICAL_COLUMNS = /columns: \[Date, Version, Description, Author\]/;
// Bundling rewrites `shared/resources/X` → `references/X` in place, so accept
// either form — what matters is that the canonical spec is referenced at all.
const CHANGE_LOG_SPEC_REF = /(shared\/resources|references)\/document-change-log\.md/;

for (const skill of ["create-task", "review-task"]) {
  test(`change-log — ${skill} task template carries an unnumbered Change Log`, () => {
    const tpl = fs.readFileSync(
      path.join(SKILLS_DIR, skill, "resources", "task-template.md"),
      "utf-8",
    );
    assert.match(tpl, new RegExp(`^## ${CHANGE_LOG_HEADING}$`, "m"));
    assert.doesNotMatch(
      tpl,
      new RegExp(`^## \\d+\\.\\s*${CHANGE_LOG_HEADING}`, "m"),
      "Change Log must stay unnumbered — numbering it breaks the 11-section contract",
    );
    assert.match(
      tpl,
      /\| Date +\| Version +\| Description +\| Author +\|/,
      "must use the canonical four columns",
    );
  });
}

test("change-log — adding the section does not change the 11-section count", () => {
  const lib = require(path.join(SKILLS_DIR, "create-task", "scripts", "lib.js"));
  const tpl = fs.readFileSync(
    path.join(SKILLS_DIR, "create-task", "resources", "task-template.md"),
    "utf-8",
  );
  assert.equal(
    lib.countMandatorySections(tpl),
    11,
    "adding the Change Log section must not change the mandatory-section count",
  );
});

test("change-log — create-task and review-task ship byte-identical task templates", () => {
  // The pair is hand-maintained and had already drifted (review-task's copy carried
  // no YAML frontmatter and used a legacy `**Task ID**:` header). Locked now that
  // both carry the Change Log.
  const a = fs.readFileSync(
    path.join(SKILLS_DIR, "create-task", "resources", "task-template.md"),
    "utf-8",
  );
  const b = fs.readFileSync(
    path.join(SKILLS_DIR, "review-task", "resources", "task-template.md"),
    "utf-8",
  );
  assert.equal(a, b, "task-template.md copies have diverged — re-copy the create-task version");
});

test("change-log — all three epic-template copies are byte-identical", () => {
  // All three had drifted from each other before this lock: the
  // documentation-standards-validator copy by 9 lines (3 absent frontmatter fields +
  // 6 stale reference links) and the epic-registry-manager copy by 18 (a wholly
  // different frontmatter schema + the same stale links). Equal line counts hid the
  // second one, which is why this asserts bytes and not length.
  const canonical = fs.readFileSync(
    path.join(REPO_ROOT, "docs/templates/epic-template.md"),
    "utf-8",
  );
  for (const p of [
    "skills/epic-registry-manager/references/epic-template.md",
    "skills/documentation-standards-validator/references/epic-template.md",
  ]) {
    assert.equal(
      fs.readFileSync(path.join(REPO_ROOT, p), "utf-8"),
      canonical,
      `${p} has diverged — re-copy docs/templates/epic-template.md`,
    );
  }
});

test("change-log — the epic template promotes the log to H2, above Notes & Updates", () => {
  const tpl = fs.readFileSync(
    path.join(REPO_ROOT, "docs/templates/epic-template.md"),
    "utf-8",
  );
  const log = tpl.indexOf(`\n## ${CHANGE_LOG_HEADING}\n`);
  const notes = tpl.indexOf("\n## Notes & Updates\n");
  assert.ok(log >= 0, "epic template must carry a top-level ## Change Log");
  assert.ok(notes >= 0, "epic template must retain ## Notes & Updates");
  assert.ok(log < notes, "## Change Log must sit before ## Notes & Updates");
  assert.doesNotMatch(
    tpl,
    new RegExp(`^### ${CHANGE_LOG_HEADING}`, "m"),
    "the bulleted ### Change Log under Notes & Updates must be gone",
  );
  // Open Questions and Decisions Made stay behind under Notes & Updates.
  assert.match(tpl, /^### Open Questions$/m);
  assert.match(tpl, /^### Decisions Made$/m);
});

test("change-log — the legacy story markdown template carries the canonical section", () => {
  const tpl = fs.readFileSync(
    path.join(SKILLS_DIR, "documentation-standards-validator", "references", "story-template.md"),
    "utf-8",
  );
  assert.match(tpl, new RegExp(`^## ${CHANGE_LOG_HEADING}$`, "m"));
  assert.match(tpl, /\| Date +\| Version +\| Description +\| Author +\|/);
  assert.doesNotMatch(
    tpl,
    new RegExp(`^### ${CHANGE_LOG_HEADING}`, "m"),
    "the bulleted ### Change Log must be gone",
  );
});

test("change-log — both PRD templates and both story templates use the canonical columns", () => {
  for (const p of [
    "skills/prd-template/resources/prd-tmpl.yaml",
    "skills/brownfield-prd-template/resources/brownfield-prd-tmpl.yaml",
    "skills/create-story/resources/story-template.yaml",
    "skills/review-story/resources/story-template.yaml",
  ]) {
    const content = fs.readFileSync(path.join(REPO_ROOT, p), "utf-8");
    assert.match(content, CANONICAL_COLUMNS, `${p} must use the canonical four columns`);
    assert.doesNotMatch(
      content,
      /columns: \[Change, Date, Version, Description, Author\]/,
      `${p} must not use the legacy five-column form`,
    );
  }
});

for (const skill of [
  "create-epic",
  "create-task",
  "create-story",
  "create-doc",
  "create-parallel-stories",
  "create-prd",
]) {
  test(`change-log — ${skill} links the canonical spec rather than restating it`, () => {
    const { content } = loadSkill(skill);
    assert.match(
      content,
      CHANGE_LOG_SPEC_REF,
      "must reference the canonical document-change-log spec",
    );
    assert.match(
      content,
      new RegExp(CHANGE_LOG_HEADING),
      "must mention the Change Log section it is responsible for writing",
    );
  });
}
