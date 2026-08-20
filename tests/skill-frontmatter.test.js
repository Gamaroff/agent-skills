"use strict";
/**
 * L1/L3 frontmatter checker — every SKILL.md must parse as strict YAML.
 *
 * Regression guard for a live defect: develop-story shipped a description that
 * was a single-quoted YAML scalar containing an unescaped apostrophe
 * ("that epic's integration branch"). The quote closed the string early, so no
 * YAML parser could read the frontmatter — the agent loader fell back to
 * treating body prose as the description, and the catalog generator emitted a
 * stray leading quote. quick_validate.py passed the file the whole time,
 * because it too parsed frontmatter with regex.
 *
 * These tests assert the strict parse is real and is actually enforced.
 *
 * Run: node --test tests/
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");

const REPO_ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(REPO_ROOT, "skills");
const SCRIPTS_DIR = path.join(SKILLS_DIR, "create-skill", "scripts");
const VALIDATOR = path.join(SCRIPTS_DIR, "quick_validate.py");

function python(args, opts = {}) {
  return spawnSync("python3", args, { encoding: "utf-8", ...opts });
}

function hasPyYAML() {
  return python(["-c", "import yaml"]).status === 0;
}

function listSkills() {
  return fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((n) => fs.existsSync(path.join(SKILLS_DIR, n, "SKILL.md")));
}

/** Write a throwaway skill dir containing the given SKILL.md text. */
function fixtureSkill(name, skillMd) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `skill-fm-${name}-`));
  const skillDir = path.join(dir, name);
  fs.mkdirSync(skillDir);
  fs.writeFileSync(path.join(skillDir, "SKILL.md"), skillMd);
  return skillDir;
}

// The strict path is the point of these tests. Without PyYAML the validator
// degrades to regex, so a green run here would prove nothing — fail loudly
// rather than skip silently.
test("PyYAML is available, so frontmatter is strictly validated", () => {
  assert.ok(
    hasPyYAML(),
    "PyYAML is not importable — install it (pip install pyyaml). Without it " +
      "quick_validate.py cannot detect malformed frontmatter.",
  );
});

test("every SKILL.md frontmatter parses as YAML with name + description", () => {
  const script = [
    "import sys, json",
    `sys.path.insert(0, ${JSON.stringify(SCRIPTS_DIR)})`,
    "import skill_frontmatter",
    "out = {}",
    "for p in sys.argv[1:]:",
    "    data, err = skill_frontmatter.parse(open(p, encoding='utf-8').read())",
    "    if err:",
    "        out[p] = {'error': err}",
    "    else:",
    "        out[p] = {",
    "            'name': data.get('name'),",
    "            'description': data.get('description'),",
    "        }",
    "print(json.dumps(out))",
  ].join("\n");

  const files = listSkills().map((n) => path.join(SKILLS_DIR, n, "SKILL.md"));
  const res = python(["-c", script, ...files]);
  assert.equal(res.status, 0, `parser crashed: ${res.stderr}`);

  const parsed = JSON.parse(res.stdout);
  const failures = [];
  for (const [file, result] of Object.entries(parsed)) {
    const rel = path.relative(REPO_ROOT, file);
    if (result.error) {
      failures.push(`${rel}: ${result.error}`);
      continue;
    }
    if (!result.name) failures.push(`${rel}: missing 'name'`);
    if (!result.description) failures.push(`${rel}: missing 'description'`);
  }

  assert.deepEqual(failures, [], `\n${failures.join("\n")}\n`);
});

test("validator rejects an unescaped apostrophe in a quoted description", () => {
  const dir = fixtureSkill(
    "bad-apostrophe",
    [
      "---",
      "name: bad-apostrophe",
      "description: 'Cuts stories from and PRs into that epic's integration " +
        "branch, with enough words here to clear the length warning threshold.'",
      "---",
      "",
      "# Bad",
      "",
    ].join("\n"),
  );

  const res = python([VALIDATOR, dir]);
  assert.equal(res.status, 1, "validator should reject malformed frontmatter");
  const out = res.stdout + res.stderr;
  assert.match(out, /not valid YAML/);
  // The parser points several columns past the cause; the message must name it.
  assert.match(out, /unescaped apostrophe/);
});

test("validator accepts the same description once the apostrophe is escaped", () => {
  const dir = fixtureSkill(
    "good-apostrophe",
    [
      "---",
      "name: good-apostrophe",
      "description: 'Cuts stories from and PRs into that epic''s integration " +
        "branch, with enough words here to clear the length warning threshold.'",
      "---",
      "",
      "# Good",
      "",
    ].join("\n"),
  );

  const res = python([VALIDATOR, dir]);
  assert.equal(
    res.status,
    0,
    `validator rejected valid frontmatter: ${res.stdout}${res.stderr}`,
  );
});

test("parsed descriptions carry no leftover opening quote", () => {
  // The old catalog generator stripped only double quotes, so single-quoted
  // descriptions rendered with a stray leading `'` in skill-catalog.md.
  //
  // Only the opening quote is checked. A trailing quote is routinely legitimate
  // prose — jira-sprint-review-prep ends on `or "generate release notes."` —
  // so asserting on it would flag correct authoring.
  const script = [
    "import sys, json",
    `sys.path.insert(0, ${JSON.stringify(SCRIPTS_DIR)})`,
    "import skill_frontmatter",
    "bad = []",
    "for p in sys.argv[1:]:",
    "    data, err = skill_frontmatter.parse(open(p, encoding='utf-8').read())",
    "    if err: continue",
    "    d = str(data.get('description', ''))",
    "    if d[:1] in ('\"', \"'\"):",
    "        bad.append(p)",
    "print(json.dumps(bad))",
  ].join("\n");

  const files = listSkills().map((n) => path.join(SKILLS_DIR, n, "SKILL.md"));
  const res = python(["-c", script, ...files]);
  assert.equal(res.status, 0, `parser crashed: ${res.stderr}`);
  const bad = JSON.parse(res.stdout).map((f) => path.relative(REPO_ROOT, f));
  assert.deepEqual(
    bad,
    [],
    `descriptions retain an opening quote:\n${bad.join("\n")}`,
  );
});

test("generated catalog is in sync with SKILL.md frontmatter", () => {
  const catalog = path.join(REPO_ROOT, "docs", "reference", "skill-catalog.md");
  const before = fs.readFileSync(catalog, "utf-8");
  try {
    execFileSync("python3", [path.join(SCRIPTS_DIR, "generate_catalog.py")], {
      cwd: REPO_ROOT,
      stdio: "pipe",
    });
    const after = fs.readFileSync(catalog, "utf-8");
    assert.equal(
      after,
      before,
      "skill-catalog.md is stale — run 'npm run generate-catalog' and commit the diff.",
    );
  } finally {
    fs.writeFileSync(catalog, before);
  }
});
