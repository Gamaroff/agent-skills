"use strict";
/**
 * The bundler's link re-relativisation pass (task.108), exercised on a synthetic
 * skill in a disposable repo.
 *
 * WHAT THIS ASSERTS:
 *   1. In a bundled copy, a link to a shared sibling the skill ALSO bundles stays
 *      a sibling; one it does not bundle becomes the upstream URL; a `../../docs`
 *      or `../../AGENTS.md` target becomes the upstream URL; a target inside the
 *      skill directory is emitted relative to the copy; `#fragment`s survive.
 *   2. Fenced blocks and inline code spans are left byte-for-byte alone.
 *   3. Placeholders (`{…}`, `[…]`, `<…>`, `url`) and absolute URLs are untouched.
 *   4. A second run is a no-op, and `--check` on the result reports 0 problems.
 *   5. The skill's OWN files are not re-relativised in-tree (their links are
 *      authored at skill depth and already resolve).
 *   6. The zip path writes the SAME bytes as the in-tree bundle for a bundled
 *      copy, and applies the outside-the-skill rule to the skill's own files.
 *
 * The checker half lives in tests/bundled-links.test.js; this file is the
 * rewriter half. Mutation-proof of the pair is recorded in the task's
 * implementation report.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const test = require("node:test");
const assert = require("node:assert/strict");

const REPO_ROOT = path.resolve(__dirname, "..");
const SCRIPTS = path.join(REPO_ROOT, "skills", "create-skill", "scripts");
const BUNDLER = path.join(SCRIPTS, "bundle_skill.py");
const PACKAGER = path.join(SCRIPTS, "package_skill.py");
const UPSTREAM = "https://github.com/Gamaroff/agent-skills/blob/develop/";

const SKILL_MD = [
  "---",
  "name: fixture-skill",
  "description: A fixture skill for the link re-relativisation test.",
  "---",
  "# Fixture",
  "",
  "Uses shared/resources/guide.md and shared/resources/bundled-sibling.md.",
  "Own link: [config](../../docs/reference/configuration.md) and [ref](references/native.md).",
  "",
].join("\n");

const GUIDE_MD = [
  "# Guide",
  "",
  "Bundled sibling: [b](bundled-sibling.md) and with fragment [b2](bundled-sibling.md#part).",
  "Unbundled sibling: [u](unbundled.md).",
  "Docs: [cfg](../../docs/reference/configuration.md#keys) and [agents](../../AGENTS.md).",
  "Inside the skill: [native](../../skills/fixture-skill/references/native.md).",
  "Directory: [examples](../../docs/examples/).",
  "Placeholders: [p1]({jira_url}) [p2](./task.[n].md) [p3](<path/to/x.md>) [p4](url).",
  "External: [ext](https://example.com/x.md) [anchor](#top).",
  "Code span: `[not](a-link.md)` stays.",
  "",
  "```markdown",
  "[fenced](../../docs/fenced.md)",
  "```",
  "",
].join("\n");

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-links-"));
  fs.mkdirSync(path.join(root, "shared", "resources"), { recursive: true });
  fs.mkdirSync(path.join(root, "docs", "reference"), { recursive: true });
  fs.writeFileSync(path.join(root, "package.json"), '{"name":"fixture"}\n');
  const skillDir = path.join(root, "skills", "fixture-skill");
  fs.mkdirSync(path.join(skillDir, "references"), { recursive: true });
  fs.writeFileSync(path.join(skillDir, "SKILL.md"), SKILL_MD);
  fs.writeFileSync(
    path.join(skillDir, "references", "native.md"),
    "# native\n",
  );
  fs.writeFileSync(
    path.join(root, "shared", "resources", "guide.md"),
    GUIDE_MD,
  );
  fs.writeFileSync(
    path.join(root, "shared", "resources", "bundled-sibling.md"),
    "# sib\n",
  );
  fs.writeFileSync(
    path.join(root, "shared", "resources", "unbundled.md"),
    "# un\n",
  );
  return { root, skillDir };
}

function run(script, args) {
  return execFileSync("python3", [script, ...args], { encoding: "utf-8" });
}

test("bundled copy: one rule — inside the skill relative, everything else upstream", () => {
  const { skillDir } = makeFixture();
  run(BUNDLER, [skillDir]);
  const copy = fs.readFileSync(
    path.join(skillDir, "references", "guide.md"),
    "utf-8",
  );

  assert.match(
    copy,
    /\[b\]\(bundled-sibling\.md\)/,
    "bundled sibling stays a sibling",
  );
  assert.match(
    copy,
    /\[b2\]\(bundled-sibling\.md#part\)/,
    "fragment survives on a sibling",
  );
  assert.match(
    copy,
    new RegExp(`\\[u\\]\\(${UPSTREAM}shared/resources/unbundled\\.md\\)`),
  );
  assert.match(
    copy,
    new RegExp(
      `\\[cfg\\]\\(${UPSTREAM}docs/reference/configuration\\.md#keys\\)`,
    ),
  );
  assert.match(copy, new RegExp(`\\[agents\\]\\(${UPSTREAM}AGENTS\\.md\\)`));
  assert.match(
    copy,
    /\[native\]\(native\.md\)/,
    "inside-the-skill target is relative to the copy",
  );
  assert.match(
    copy,
    new RegExp(`\\[examples\\]\\(${UPSTREAM}docs/examples/\\)`),
    "trailing slash kept",
  );
  assert.match(
    copy,
    /\[p1\]\(\{jira_url\}\) \[p2\]\(\.\/task\.\[n\]\.md\) \[p3\]\(<path\/to\/x\.md>\) \[p4\]\(url\)/,
  );
  assert.match(
    copy,
    /\[ext\]\(https:\/\/example\.com\/x\.md\) \[anchor\]\(#top\)/,
  );
  assert.match(copy, /`\[not\]\(a-link\.md\)`/, "inline code span untouched");
  assert.match(
    copy,
    /\[fenced\]\(\.\.\/\.\.\/docs\/fenced\.md\)/,
    "fenced block untouched",
  );
});

test("the skill's own files are not re-relativised in-tree", () => {
  const { skillDir } = makeFixture();
  run(BUNDLER, [skillDir]);
  const own = fs.readFileSync(path.join(skillDir, "SKILL.md"), "utf-8");
  assert.match(
    own,
    /\[config\]\(\.\.\/\.\.\/docs\/reference\/configuration\.md\)/,
  );
  assert.match(own, /\[ref\]\(references\/native\.md\)/);
});

test("idempotent: second run is a no-op and --check reports 0 problems", () => {
  const { skillDir } = makeFixture();
  run(BUNDLER, [skillDir]);
  const before = fs.readFileSync(
    path.join(skillDir, "references", "guide.md"),
    "utf-8",
  );
  const second = run(BUNDLER, [skillDir]);
  assert.match(second, /in sync/);
  assert.equal(
    fs.readFileSync(path.join(skillDir, "references", "guide.md"), "utf-8"),
    before,
  );
  assert.match(run(BUNDLER, ["--check", skillDir]), /0 problems/);
});

test("package path: same bytes as in-tree for a bundled copy; own files get the outside rule", () => {
  const { root, skillDir } = makeFixture();
  run(BUNDLER, [skillDir]);
  const inTree = fs.readFileSync(
    path.join(skillDir, "references", "guide.md"),
    "utf-8",
  );
  const out = path.join(root, "dist");
  fs.mkdirSync(out);
  run(PACKAGER, [skillDir, out]);
  execFileSync("unzip", [
    "-q",
    "-o",
    path.join(out, "fixture-skill.zip"),
    "-d",
    out,
  ]);
  const zipped = path.join(out, "fixture-skill");
  assert.equal(
    fs.readFileSync(path.join(zipped, "references", "guide.md"), "utf-8"),
    inTree,
  );
  const own = fs.readFileSync(path.join(zipped, "SKILL.md"), "utf-8");
  assert.match(
    own,
    new RegExp(
      `\\[config\\]\\(${UPSTREAM}docs/reference/configuration\\.md\\)`,
    ),
  );
  assert.match(
    own,
    /\[ref\]\(references\/native\.md\)/,
    "inside-the-skill link unchanged",
  );
  // No duplicate arcnames: the in-tree copy and the bundled source are one entry.
  const listing = execFileSync(
    "unzip",
    ["-Z1", path.join(out, "fixture-skill.zip")],
    {
      encoding: "utf-8",
    },
  )
    .split("\n")
    .filter(Boolean);
  assert.equal(
    new Set(listing).size,
    listing.length,
    "zip has no duplicate entries",
  );
});
