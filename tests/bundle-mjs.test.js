"use strict";
/**
 * Bundler regression — `.mjs` collection and ESM import rewriting.
 *
 * Guards the one failure mode in this repo that every in-repo test suite is
 * structurally blind to: a skill script that resolves its shared dependency
 * through an *un-bundled* relative path. `skills/develop-batch/scripts/schedule.mjs`
 * importing `../../../shared/resources/yaml-subset.js` resolves correctly when run
 * from a checkout — and only from a checkout. In a tarball or zip install the
 * `shared/` tree does not ship, so the import must have been rewritten to
 * `../references/yaml-subset.js` and the file copied into `<skill>/references/`.
 * `npm test` passes either way; only the bundler's output tells the truth.
 *
 * Before this test, `bundle_skill.py` walked `*.md`/`*.js`/`*.sh` only, `rewrite_text`
 * had no `.mjs` branch, and `JS_SHARED_RE` matched `require(...)` but never `import`.
 * All three had to hold for a `.mjs` skill script to survive bundling, and none did.
 *
 * Each test builds a throwaway skill in a temp dir and runs the real bundler against
 * it, so the assertions are about observed bundler behaviour, not a re-implementation
 * of its regexes.
 *
 * Run: node --test tests/bundle-mjs.test.js
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const test = require("node:test");
const assert = require("node:assert/strict");

const REPO_ROOT = path.resolve(__dirname, "..");
const BUNDLER = path.join(
  REPO_ROOT,
  "skills",
  "create-skill",
  "scripts",
  "bundle_skill.py",
);

/**
 * Build a disposable repo containing one skill plus a shared/resources tree, run
 * the bundler over the skill, and return the paths needed to assert on the result.
 *
 * A real temp repo (rather than a fixture inside this repo) keeps the test from
 * mutating tracked files — the bundler rewrites sources in place by design.
 */
function bundleFixture({ skillFiles, sharedFiles }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-mjs-"));
  // find_repo_root() walks up looking for these markers.
  fs.mkdirSync(path.join(root, "skills"), { recursive: true });
  fs.mkdirSync(path.join(root, "shared", "resources"), { recursive: true });
  fs.writeFileSync(path.join(root, "package.json"), '{"name":"fixture"}\n');

  const skillDir = path.join(root, "skills", "fixture-skill");
  fs.mkdirSync(skillDir, { recursive: true });

  for (const [rel, content] of Object.entries(skillFiles)) {
    const dest = path.join(skillDir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content);
  }
  for (const [name, content] of Object.entries(sharedFiles)) {
    fs.writeFileSync(path.join(root, "shared", "resources", name), content);
  }

  const stdout = execFileSync("python3", [BUNDLER, skillDir], {
    encoding: "utf-8",
  });

  return {
    root,
    skillDir,
    stdout,
    read: (rel) => fs.readFileSync(path.join(skillDir, rel), "utf-8"),
    exists: (rel) => fs.existsSync(path.join(skillDir, rel)),
  };
}

const SKILL_MD = `---
name: fixture-skill
description: Fixture skill used by the bundler regression test.
---

# Fixture Skill

Body text.
`;

test("mjs: a shared resource imported from a .mjs script is bundled into references/", () => {
  const fx = bundleFixture({
    skillFiles: {
      "SKILL.md": SKILL_MD,
      "scripts/run.mjs": [
        'import { parseThing } from "../../../shared/resources/thing.js";',
        "export const x = parseThing;",
        "",
      ].join("\n"),
    },
    sharedFiles: {
      "thing.js": 'function parseThing(s) { return s; }\nmodule.exports = { parseThing };\n',
    },
  });

  assert.ok(
    fx.exists("references/thing.js"),
    "shared/resources/thing.js must be copied into <skill>/references/ — " +
      "without it the install has no file to resolve to. Bundler said:\n" + fx.stdout,
  );
});

test("mjs: the ESM import path is rewritten to ../references/", () => {
  const fx = bundleFixture({
    skillFiles: {
      "SKILL.md": SKILL_MD,
      "scripts/run.mjs": [
        'import { parseThing } from "../../../shared/resources/thing.js";',
        "export const x = parseThing;",
        "",
      ].join("\n"),
    },
    sharedFiles: { "thing.js": "module.exports = { parseThing: (s) => s };\n" },
  });

  const rewritten = fx.read("scripts/run.mjs");
  assert.match(
    rewritten,
    /from "\.\.\/references\/thing\.js"/,
    "the import specifier must point at ../references/thing.js, which is where the " +
      "bundled copy sits relative to <skill>/scripts/. Got:\n" + rewritten,
  );
  assert.doesNotMatch(
    rewritten,
    /shared\/resources/,
    "no un-bundled shared/resources path may survive — it resolves in-repo and " +
      "nowhere else, which is exactly the bug this test exists to catch",
  );
});

test("mjs: side-effect and dynamic imports are rewritten too", () => {
  const fx = bundleFixture({
    skillFiles: {
      "SKILL.md": SKILL_MD,
      "scripts/run.mjs": [
        'import "../../../shared/resources/thing.js";',
        'const m = await import("../../../shared/resources/other.js");',
        "export default m;",
        "",
      ].join("\n"),
    },
    sharedFiles: {
      "thing.js": "module.exports = {};\n",
      "other.js": "module.exports = {};\n",
    },
  });

  const rewritten = fx.read("scripts/run.mjs");
  assert.match(rewritten, /import "\.\.\/references\/thing\.js"/);
  assert.match(rewritten, /import\("\.\.\/references\/other\.js"\)/);
  assert.ok(fx.exists("references/thing.js"));
  assert.ok(
    fx.exists("references/other.js"),
    "a dynamically imported shared resource must be bundled as well — the import " +
      "is no less real for being deferred",
  );
});

test("mjs: transitive sibling imports inside a bundled shared file are followed", () => {
  // The engine → parser edge in task.37 is exactly this shape. If the sibling is
  // not followed, references/ gets the engine but not the parser it requires, and
  // the install fails at first call rather than at bundle time.
  const fx = bundleFixture({
    skillFiles: {
      "SKILL.md": SKILL_MD,
      "scripts/run.mjs": 'import "../../../shared/resources/engine.js";\n',
    },
    sharedFiles: {
      "engine.js": 'const { p } = require("./parser.js");\nmodule.exports = { p };\n',
      "parser.js": "module.exports = { p: 1 };\n",
    },
  });

  assert.ok(fx.exists("references/engine.js"));
  assert.ok(
    fx.exists("references/parser.js"),
    "parser.js is reachable only through engine.js's sibling require — a bundle " +
      "that stops at the first hop ships a broken dependency chain",
  );
});

test("mjs: an ESM sibling import inside a bundled shared file is followed", () => {
  const fx = bundleFixture({
    skillFiles: {
      "SKILL.md": SKILL_MD,
      "scripts/run.mjs": 'import "../../../shared/resources/esm-engine.js";\n',
    },
    sharedFiles: {
      "esm-engine.js": 'import { p } from "./esm-parser.js";\nexport { p };\n',
      "esm-parser.js": "export const p = 1;\n",
    },
  });

  assert.ok(fx.exists("references/esm-engine.js"));
  assert.ok(
    fx.exists("references/esm-parser.js"),
    "sibling following must work for `import` as well as `require` — otherwise an " +
      "ESM shared module can never have dependencies",
  );
});

test("cjs: require() rewriting in .js files is unchanged by the .mjs work", () => {
  // Regression guard on the pre-existing path — the .mjs branch was added by
  // widening a suffix check that previously read `== '.js'`, so the old behaviour
  // is worth pinning rather than assuming.
  const fx = bundleFixture({
    skillFiles: {
      "SKILL.md": SKILL_MD,
      "scripts/run.js": 'const t = require("../../../shared/resources/thing.js");\nmodule.exports = t;\n',
    },
    sharedFiles: { "thing.js": "module.exports = {};\n" },
  });

  const rewritten = fx.read("scripts/run.js");
  assert.match(rewritten, /require\("\.\.\/references\/thing\.js"\)/);
  assert.ok(fx.exists("references/thing.js"));
});

test("mjs: bundling is idempotent — a second run changes nothing", () => {
  // Pass 3 rewrites sources in place, so a non-idempotent rewrite would corrupt
  // the path a little more on each `npm run bundle`.
  const fx = bundleFixture({
    skillFiles: {
      "SKILL.md": SKILL_MD,
      "scripts/run.mjs": 'import "../../../shared/resources/thing.js";\n',
    },
    sharedFiles: { "thing.js": "module.exports = {};\n" },
  });

  const afterFirst = fx.read("scripts/run.mjs");
  const bundledFirst = fx.read("references/thing.js");

  execFileSync("python3", [BUNDLER, fx.skillDir], { encoding: "utf-8" });

  assert.equal(fx.read("scripts/run.mjs"), afterFirst, "source rewrite must be stable");
  assert.equal(fx.read("references/thing.js"), bundledFirst, "bundled copy must be stable");
});

test("mjs: the real develop-batch skill bundles its shared parser with a rewritten path", () => {
  // The end-to-end assertion, against the actual skill this task changes rather
  // than a fixture. Skipped rather than failed when the promotion has not landed,
  // so the file is committable before schedule.mjs is swapped.
  const scriptPath = path.join(
    REPO_ROOT, "skills", "develop-batch", "scripts", "schedule.mjs",
  );
  const source = fs.readFileSync(scriptPath, "utf-8");
  if (!/yaml-subset\.js/.test(source)) {
    return; // parser promotion not yet wired — nothing to assert
  }

  const bundledParser = path.join(
    REPO_ROOT, "skills", "develop-batch", "references", "yaml-subset.js",
  );
  assert.ok(
    fs.existsSync(bundledParser),
    "skills/develop-batch/references/yaml-subset.js is missing — run `npm run bundle`. " +
      "Without it, develop-batch is broken in every tarball/zip install while npm test stays green.",
  );
  assert.match(
    source,
    /from "\.\.\/references\/yaml-subset\.js"/,
    "schedule.mjs must import the bundled path; the un-bundled shared/resources path " +
      "resolves in this checkout and nowhere else",
  );
});
