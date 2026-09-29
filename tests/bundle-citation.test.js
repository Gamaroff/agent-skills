"use strict";
/**
 * Bundler citation form — a citation copies one file, a dependency copies a closure (task.126).
 *
 * `bundle_skill.py` follows references to a fixed point, so pointing a reader at
 * one paragraph of a hub document used to cost the hub's whole closure: a
 * one-line pointer from qa-fix, review-task and review-story to
 * `develop-pipeline-autonomous-defaults.md` vendored 16–18 files into each, none
 * of which those skills read (observation #83).
 *
 * The rule under test, stated once in `quick_validate.ref_kind`:
 *   - a reference to an `.md` target carrying a `#fragment`, or sitting inside a
 *     `<!-- cite: … -->` comment, is a CITATION — the file is copied and nothing
 *     it names is followed;
 *   - every other reference is a DEPENDENCY — the file and its closure;
 *   - a cite of a script is a DEPENDENCY: a script copied without the siblings it
 *     requires is broken, so the fail-safe reading wins;
 *   - both spellings count, `shared/resources/X` and the `references/X` form the
 *     bundler rewrites every skill file into — a citation recognised only in the
 *     first spelling would convert nothing (task.126 review, C1).
 *
 * Each test builds a throwaway repo and runs the real bundler, so the assertions
 * are about what lands in `references/`, not a re-implementation of the regexes.
 *
 * Run: node --test tests/bundle-citation.test.js
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

const SKILL_MD_HEAD = `---
name: fixture-skill
description: Fixture skill used by the bundler citation-form regression test, which checks that a citation copies exactly one file while a dependency still copies its whole closure.
---

# Fixture Skill

`;

/**
 * The shared tree every test bundles against:
 *
 *   hub.md   → leaf-a.md (dep) → deep.md (dep)
 *            → leaf-b.js (dep) → sib.js (require)
 *   tool.js  → tool-sib.js (require)
 */
const SHARED = {
  "hub.md":
    "# Hub\n\n## The rule\n\nSee `shared/resources/leaf-a.md` and `shared/resources/leaf-b.js`.\n",
  "leaf-a.md": "# Leaf A\n\nDepends on `shared/resources/deep.md`.\n",
  "deep.md": "# Deep\n",
  "leaf-b.js": 'const s = require("./sib.js");\nmodule.exports = s;\n',
  "sib.js": "module.exports = 1;\n",
  "tool.js": 'const t = require("./tool-sib.js");\nmodule.exports = t;\n',
  "tool-sib.js": "module.exports = 2;\n",
};

/** A throwaway repo holding one skill whose SKILL.md body is `body`. */
function fixture(t, body, { shared = SHARED, git = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-citation-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const sharedDir = path.join(root, "shared", "resources");
  const skillDir = path.join(root, "skills", "fixture-skill");
  fs.mkdirSync(sharedDir, { recursive: true });
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(root, "package.json"), '{"name":"fixture"}\n');
  for (const [name, content] of Object.entries(shared)) {
    fs.writeFileSync(path.join(sharedDir, name), content);
  }
  fs.writeFileSync(path.join(skillDir, "SKILL.md"), SKILL_MD_HEAD + body);
  const sh = (cmd, args) =>
    execFileSync(cmd, args, { cwd: root, encoding: "utf-8" });
  if (git) {
    sh("git", ["init", "-q"]);
    sh("git", ["config", "user.email", "fixture@example.invalid"]);
    sh("git", ["config", "user.name", "fixture"]);
  }
  return {
    root,
    skillDir,
    sh,
    bundle: () => sh("python3", [BUNDLER, skillDir]),
    bundled: () => {
      const refs = path.join(skillDir, "references");
      return fs.existsSync(refs) ? fs.readdirSync(refs).sort() : [];
    },
    writeSkill: (b) =>
      fs.writeFileSync(path.join(skillDir, "SKILL.md"), SKILL_MD_HEAD + b),
  };
}

test("A — a fragment reference cites the hub alone", (t) => {
  const fx = fixture(t, "Rule: `shared/resources/hub.md#the-rule`.\n");
  fx.bundle();
  assert.deepEqual(fx.bundled(), ["hub.md"]);
});

test("B — a bare reference still depends on the hub's whole closure", (t) => {
  const fx = fixture(t, "Read `shared/resources/hub.md`.\n");
  fx.bundle();
  assert.deepEqual(fx.bundled(), [
    "deep.md",
    "hub.md",
    "leaf-a.md",
    "leaf-b.js",
    "sib.js",
  ]);
});

test("C — citing the hub and depending on a leaf copies exactly those two closures", (t) => {
  const fx = fixture(
    t,
    "Rule: `shared/resources/hub.md#the-rule`. Uses `shared/resources/leaf-a.md`.\n",
  );
  fx.bundle();
  assert.deepEqual(fx.bundled(), ["deep.md", "hub.md", "leaf-a.md"]);
});

test("D — the rewritten `references/` spelling cites too, on every run after the first", (t) => {
  // This is the spelling every skill file holds once the bundler has run: pass 3
  // rewrites `shared/resources/X` to `references/X` IN PLACE. The first run sees
  // the shared spelling; every later run sees only this one.
  const fx = fixture(t, "Rule: `shared/resources/hub.md#the-rule`.\n");
  fx.bundle();
  const md = fs.readFileSync(path.join(fx.skillDir, "SKILL.md"), "utf-8");
  assert.match(md, /`references\/hub\.md#the-rule`/, "rewritten in place");
  fx.bundle();
  assert.deepEqual(fx.bundled(), ["hub.md"]);
});

test("D2 — a skill written directly in the `references/` spelling cites the hub alone", (t) => {
  const fx = fixture(t, "Rule: `references/hub.md#the-rule`.\n");
  fx.bundle();
  assert.deepEqual(fx.bundled(), ["hub.md"]);
});

test("E — a fragment on a script is a dependency: the script keeps its siblings", (t) => {
  const fx = fixture(t, "Call `shared/resources/tool.js#main`.\n");
  fx.bundle();
  assert.deepEqual(fx.bundled(), ["tool-sib.js", "tool.js"]);
});

test("F — the cite comment copies one file, in both prefixes", (t) => {
  const fx = fixture(
    t,
    "The rule lives in the hub. <!-- cite: shared/resources/hub.md -->\n",
  );
  fx.bundle();
  assert.deepEqual(fx.bundled(), ["hub.md"]);
  const md = fs.readFileSync(path.join(fx.skillDir, "SKILL.md"), "utf-8");
  assert.match(md, /<!-- cite: references\/hub\.md -->/, "rewritten in place");
  fx.bundle();
  assert.deepEqual(
    fx.bundled(),
    ["hub.md"],
    "the rewritten comment still cites",
  );
});

test("G — a citation is a leaf even inside a dependency's closure", (t) => {
  const shared = {
    ...SHARED,
    "hub.md":
      "# Hub\n\nSee `shared/resources/leaf-a.md#leaf-a` for the rule.\n",
  };
  const fx = fixture(t, "Read `shared/resources/hub.md`.\n", { shared });
  fx.bundle();
  assert.deepEqual(
    fx.bundled(),
    ["hub.md", "leaf-a.md"],
    "deep.md not followed",
  );
});

test("H — a name reached as a cite and as a dependency is bundled once, with its closure", (t) => {
  // The order matters to discovery: `pending` is a stack. Both orders are
  // exercised so neither can mask the other.
  for (const body of [
    "`shared/resources/hub.md#the-rule` then `shared/resources/hub.md`.\n",
    "`shared/resources/hub.md` then `shared/resources/hub.md#the-rule`.\n",
  ]) {
    const fx = fixture(t, body);
    fx.bundle();
    assert.deepEqual(
      fx.bundled(),
      ["deep.md", "hub.md", "leaf-a.md", "leaf-b.js", "sib.js"],
      body,
    );
  }
});

test("I — validation passes on a fragment reference (it used to name `hub.md#the-rule`)", (t) => {
  const fx = fixture(t, "Rule: `shared/resources/hub.md#the-rule`.\n");
  const py = [
    "import json, sys",
    `sys.path.insert(0, ${JSON.stringify(SCRIPTS)})`,
    "from quick_validate import validate_skill, collect_shared_refs",
    `ok, msg = validate_skill(${JSON.stringify(fx.skillDir)})`,
    "print(json.dumps({'ok': ok, 'msg': msg}))",
  ].join("\n");
  const out = JSON.parse(
    execFileSync("python3", ["-c", py], { encoding: "utf-8" })
      .trim()
      .split("\n")
      .pop(),
  );
  assert.equal(out.ok, true, out.msg);
});

test("J — the status line reports the closure, and the gap to the committed copies", (t) => {
  const fx = fixture(t, "Read `shared/resources/hub.md`.\n", { git: true });
  let out = fx.bundle();
  // Nothing committed yet: every copy in the closure is new.
  assert.match(out, /✅ fixture-skill: .* · closure 5 \(\+5 vs committed\)/);
  fx.sh("git", ["add", "-A"]);
  fx.sh("git", ["commit", "-q", "-m", "fixture"]);
  out = fx.bundle();
  assert.match(
    out,
    /✅ fixture-skill: in sync · closure 5 \(\+0 vs committed\)/,
  );
  // Convert to a citation: the closure shrinks, and the four copies it stopped
  // reaching are what `git rm` is owed — the bundler never deletes one.
  fx.writeSkill("Rule: `references/hub.md#the-rule`.\n");
  out = fx.bundle();
  assert.match(out, /· closure 1 \(-4 vs committed\)/);
  assert.equal(fx.bundled().length, 5, "the bundler deleted nothing");
  // "vs committed" reads HEAD, not the index: staging the removal of the four
  // copies must not move the figure until the removal is committed (QA-1, CR-5).
  fx.sh("git", [
    "rm",
    "-q",
    "-f",
    "skills/fixture-skill/references/deep.md",
    "skills/fixture-skill/references/leaf-a.md",
    "skills/fixture-skill/references/leaf-b.js",
    "skills/fixture-skill/references/sib.js",
  ]);
  out = fx.bundle();
  assert.match(out, /· closure 1 \(-4 vs committed\)/);
  fx.sh("git", ["commit", "-q", "-m", "drop unreached"]);
  out = fx.bundle();
  assert.match(out, /· closure 1 \(\+0 vs committed\)/);
});

test("J2 — outside a git repository the comparison is omitted, not invented", (t) => {
  const fx = fixture(t, "Read `shared/resources/hub.md`.\n");
  const out = fx.bundle();
  assert.match(out, /· closure 5\n/);
  assert.doesNotMatch(out, /vs committed/);
});

test("K — the packager ships a fragment-cited file under its real name, with no warning", (t) => {
  // package_skill.py reads references through the same parser. Before task.126
  // it named `hub.md#the-rule`, warned "referenced but not found" and shipped a
  // zip without the file — and validate_skill, which it runs first, refused the
  // skill outright.
  const fx = fixture(t, "Rule: `shared/resources/hub.md#the-rule`.\n");
  const outDir = path.join(fx.root, "dist");
  const py = [
    "import sys, zipfile",
    `sys.path.insert(0, ${JSON.stringify(SCRIPTS)})`,
    "from package_skill import package_skill",
    `z = package_skill(${JSON.stringify(fx.skillDir)}, ${JSON.stringify(outDir)})`,
    "print('ZIP', z)",
    "print('NAMES', sorted(zipfile.ZipFile(z).namelist()) if z else None)",
  ].join("\n");
  const out = execFileSync("python3", ["-c", py], { encoding: "utf-8" });
  assert.doesNotMatch(out, /not found|Validation failed/, out);
  assert.match(out, /fixture-skill\/references\/hub\.md/, out);
  assert.doesNotMatch(
    out,
    /hub\.md#/,
    "the fragment is never part of a shipped name",
  );
});

test("L — a cited copy points at what it does not ship upstream, and at what it does locally", (t) => {
  // A cited document is copied without its closure, so `references/leaf-a.md`
  // in the copy would send a reader to a file that is not there — the
  // executable-instructions guard fails on exactly that. The mention becomes the
  // upstream URL instead (the task.108 rule for links, applied to prose). A
  // mention of something the skill DOES ship stays local, and a placeholder that
  // names no real file is left as it always was.
  const shared = {
    ...SHARED,
    "hub.md":
      "# Hub\n\n## The rule\n\nSee `shared/resources/leaf-a.md#part` and `shared/resources/deep.md`.\n" +
      "Template: `shared/resources/{name}.md`.\n",
  };
  const fx = fixture(
    t,
    "Rule: `shared/resources/hub.md#the-rule`. Uses `shared/resources/deep.md`.\n",
    { shared },
  );
  fx.bundle();
  assert.deepEqual(fx.bundled(), ["deep.md", "hub.md"]);
  const hub = fs.readFileSync(
    path.join(fx.skillDir, "references", "hub.md"),
    "utf-8",
  );
  assert.match(
    hub,
    /`https:\/\/github\.com\/Gamaroff\/agent-skills\/blob\/develop\/shared\/resources\/leaf-a\.md#part`/,
  );
  assert.match(hub, /`references\/deep\.md`/, "a shipped sibling stays local");
  assert.match(hub, /`references\/\{name\}\.md`/, "a placeholder is untouched");
  // The URL form is never rediscovered: a second run adds nothing.
  fx.bundle();
  assert.deepEqual(fx.bundled(), ["deep.md", "hub.md"]);
});

test("M — a cited copy's bytes do not depend on which UNREACHED copies are still on disk", (t) => {
  // "Unshipped" is decided on what discovery REACHES, not on what sits on disk.
  // Otherwise the cited copy keeps local mentions while stale copies exist and
  // switches to URLs the moment they are removed — so a commit carrying only
  // the removal leaves the cited copy STALE in CI (QA-1, CR-2).
  const fx = fixture(t, "Read `shared/resources/hub.md`.\n", { git: true });
  fx.bundle(); // dependency: hub and its whole closure land on disk
  fx.writeSkill("Rule: `references/hub.md#the-rule`.\n"); // now a citation
  fx.bundle(); // leaf-a.md and the rest are still on disk, UNREACHED
  const hubPath = path.join(fx.skillDir, "references", "hub.md");
  const withLeftovers = fs.readFileSync(hubPath, "utf-8");
  assert.match(withLeftovers, /\/blob\/develop\/shared\/resources\/leaf-a\.md/);
  for (const n of ["deep.md", "leaf-a.md", "leaf-b.js", "sib.js"]) {
    fs.rmSync(path.join(fx.skillDir, "references", n));
  }
  fx.bundle();
  assert.equal(fs.readFileSync(hubPath, "utf-8"), withLeftovers);
});
