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

/**
 * A description of exactly `n` characters with no leading, trailing or doubled
 * whitespace, so its normalised length (`' '.join(s.split())`, which is what
 * the validator measures) is also `n`. A trailing space would be folded away
 * and a 1,025-char fixture would silently measure 1,024 — the first fixture
 * written for this test did exactly that and "proved" the cap on a pass.
 */
function descriptionOfLength(n) {
  let s = "ab "
    .repeat(Math.ceil(n / 3))
    .slice(0, n)
    .trimEnd();
  return s + "x".repeat(n - s.length);
}

test("validator rejects a description over the Agent Skills 1,024-char cap", () => {
  // The spec caps `description` at 1,024 characters; a loader that enforces it
  // rejects the whole skill. develop-story shipped at 1,025 (normalised) and
  // every skill "passed", because nothing here measured it (task 111).
  const desc = descriptionOfLength(1025);
  const dir = fixtureSkill(
    "over-cap",
    [
      "---",
      "name: over-cap",
      `description: '${desc}'`,
      "---",
      "",
      "# Over",
      "",
    ].join("\n"),
  );
  const res = python([VALIDATOR, dir]);
  assert.equal(
    res.status,
    1,
    "validator should reject a 1,025-char description",
  );
  assert.match(res.stdout + res.stderr, /1025 chars as parsed \(max 1024/);
});

test("validator accepts a description of exactly 1,024 chars", () => {
  const desc = descriptionOfLength(1024);
  const dir = fixtureSkill(
    "at-cap",
    [
      "---",
      "name: at-cap",
      `description: '${desc}'`,
      "---",
      "",
      "# At",
      "",
    ].join("\n"),
  );
  const res = python([VALIDATOR, dir]);
  assert.equal(
    res.status,
    0,
    `validator rejected a description at the cap: ${res.stdout}${res.stderr}`,
  );
});

/**
 * Split `desc` into folded-scalar continuation lines at word boundaries so no
 * line starts with whitespace. A continuation line that begins with a space is
 * a YAML "more-indented" line: the fold keeps its newline, the parsed value
 * grows by one, and a fixture meant to sit exactly at the cap silently sits
 * above it (QA cycle 2, CR-1 — the first folded fixture did this).
 */
function foldedLines(desc, indent = "  ") {
  const words = desc.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    if (cur.length + w.length + 1 > 500 && cur) {
      lines.push(indent + cur);
      cur = w;
    } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) lines.push(indent + cur);
  return lines;
}

test("validator accepts a block-scalar description of exactly 1,024 chars", () => {
  // The cap is measured on the parsed value (outer whitespace stripped) — a
  // folded scalar's indicator, indentation and clip newline do not count.
  // This is the fixture the corpus check below must agree with the validator on.
  const desc = descriptionOfLength(1024);
  const dir = fixtureSkill(
    "at-cap-folded",
    [
      "---",
      "name: at-cap-folded",
      "description: >",
      ...foldedLines(desc),
      "---",
      "",
      "# At (folded)",
      "",
    ].join("\n"),
  );
  const res = python([VALIDATOR, dir]);
  assert.equal(
    res.status,
    0,
    `validator rejected a folded description at the cap: ${res.stdout}${res.stderr}`,
  );
});

test("validator measures the parsed value, so a more-indented fold line counts its newline", () => {
  // 1,024 characters of content laid out so the second line begins with a
  // space: YAML preserves that newline, a loader sees 1,025+ characters, and
  // the validator must say so rather than normalise it away.
  const desc = descriptionOfLength(1024);
  const dir = fixtureSkill(
    "over-cap-folded",
    [
      "---",
      "name: over-cap-folded",
      "description: >",
      `  ${desc.slice(0, 500)}`,
      `  ${desc.slice(500)}`, // starts with a space → more-indented line
      "---",
      "",
      "# Over (folded)",
      "",
    ].join("\n"),
  );
  const res = python([VALIDATOR, dir]);
  assert.equal(res.status, 1, "validator should measure the parsed value");
  assert.match(res.stdout + res.stderr, /chars as parsed \(max 1024/);
});

test("every SKILL.md description is within the 1,024-char cap", () => {
  // The corpus-level assertion: the fixture tests prove the check works; this
  // proves the tree satisfies it, so the next skill to drift over is caught
  // here as well as in validate:all.
  // Measure the PARSED value through the same parser the validator uses —
  // never a regex re-parse of the frontmatter. The regex version disagreed
  // with the validator by two characters on every block-scalar skill (QA
  // cycle 1, CR-2) and would disagree again on any quoting it did not model.
  const script = [
    "import sys, json",
    `sys.path.insert(0, ${JSON.stringify(SCRIPTS_DIR)})`,
    "import skill_frontmatter",
    "out = {}",
    "for p in sys.argv[1:]:",
    "    data, err = skill_frontmatter.parse(open(p, encoding='utf-8').read())",
    "    out[p] = None if err else len(str(data.get('description', '')).strip())",
    "print(json.dumps(out))",
  ].join("\n");
  const files = listSkills().map((n) => path.join(SKILLS_DIR, n, "SKILL.md"));
  const res = python(["-c", script, ...files]);
  assert.equal(res.status, 0, `parser crashed: ${res.stderr}`);
  const lengths = JSON.parse(res.stdout);
  assert.ok(
    Object.keys(lengths).length >= 100,
    "corpus check read too few skills",
  );
  const over = [];
  for (const [file, n] of Object.entries(lengths)) {
    if (n === null) continue; // the strict-parse test above owns that failure
    if (n > 1024) over.push(`${path.relative(SKILLS_DIR, file)}: ${n}`);
  }
  assert.deepEqual(
    over,
    [],
    `descriptions over 1,024 chars:\n${over.join("\n")}`,
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
