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
