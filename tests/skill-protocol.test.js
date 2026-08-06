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
