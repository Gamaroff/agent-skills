"use strict";
/**
 * Bundle comment-origin guard — a `shared/resources/` path on a comment-only
 * line of a `.js`/`.mjs` source is a dependency declaration the bundler will
 * follow, and the live tree must carry none that are not declared as such.
 *
 * WHY THIS EXISTS
 * ---------------
 * `bundle_skill.py`'s `SHARED_REF_RE` matches `shared/resources/<path>` anywhere
 * in a file — code, string or comment alike. Right for `.md`, where every
 * reference is prose; a trap for `.js`. Observation #39: four constants moved
 * into `jira-sync.js` (bundled into 21 skills) carried comments saying
 * `see shared/resources/tracker-card-summary.md`, one naming a test's path. The
 * next `npm run bundle` copied a 646-line test and a 172-line doc into twenty
 * skills that use neither — +16,000 lines of churn from four comment lines —
 * and the bundler reported ✅, as it always does.
 *
 * Task.119 gave the bundler a warning (`⚠️  comment-only reference: <file>:<line>
 * → <target>`) and a declaration form that silences it — a line reading
 * `// bundle-dependency: shared/resources/X` — for the honest case where a file
 * is loaded at runtime by basename and a comment is the only place the full path
 * can live (`defer-mutation.js` does this twice, deliberately). But a warning has
 * no reader in CI; this test is the reader.
 *
 * Two halves, both required:
 *   §1 FIXTURE — a throwaway skill whose script carries a comment-only reference
 *      makes the bundler print the warning naming file, line and target; the same
 *      reference spelled as a `bundle-dependency:` declaration does not. This is
 *      what proves the warning fires at all — a live-tree assertion over a tree
 *      that happens to be clean would otherwise pass with a warning that never
 *      prints.
 *   §2 LIVE TREE — every `.js`/`.mjs` the bundler reads (all of
 *      `shared/resources/`, all of each skill except its generated `references/`)
 *      has zero undeclared comment-only references, with an
 *      allowlist whose every entry carries a reason and is checked for
 *      staleness. Same shape as tests/mutation-call-site-coverage.test.js.
 *
 * Deterministic and fast — runs every push via `npm test` (tests/*.test.js).
 * Run: node --test tests/bundle-comment-origin.test.js
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

/** Mirrors SHARED_REF_RE / COMMENT_LINE_RE / BUNDLE_DECL_RE in bundle_skill.py. */
const SHARED_REF_RE =
  /(?<![\w-]\/)(?:\.\.\/)*shared\/resources\/([^\s`'")\]*]+)/g;
const COMMENT_LINE_RE = /^\s*(?:\/\/|\/\*|\*|#)/;
const BUNDLE_DECL_RE = /bundle-dependency:\s*(?:\.\.\/)*shared\/resources\//;

/**
 * Sites where a comment-only reference is tolerated WITHOUT the declaration
 * form. Each entry names file (repo-relative), 1-based line, and a reason a
 * reviewer can check. Empty at authoring time: of the twelve live hits, ten
 * were rewritten to a bare filename (prose) or converted to `bundle-dependency:`
 * declarations (defer-mutation.js, which loads both targets at runtime), and two
 * were self-references (a file naming its own shared path), which neither the
 * bundler nor this scan counts — following one is a no-op.
 *
 * @type {Array<{file: string, line: number, reason: string}>}
 */
const ALLOWLIST = [];

/** Non-vacuity floor for the live scan — well over 100 sources at authoring time. */
const MIN_SOURCES = 10;

function commentOnlyRefs(text) {
  const out = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!COMMENT_LINE_RE.test(line) || BUNDLE_DECL_RE.test(line)) continue;
    for (const m of line.matchAll(SHARED_REF_RE)) {
      const target = m[1].replace(/[.,;:]+$/, "");
      if (target) out.push({ line: i + 1, target, text: line.trim() });
    }
  }
  return out;
}

/** The bundler's own exclusions (EXCLUDE_DIRS in bundle_skill.py). */
const EXCLUDE_DIRS = new Set([
  "__pycache__",
  ".git",
  "node_modules",
  ".DS_Store",
]);

function walk(dir, out, skip) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (skip && skip(entry.name)) continue;
      walk(abs, out, null);
    } else if (/\.(js|mjs)$/.test(entry.name)) {
      out.push(path.relative(REPO_ROOT, abs));
    }
  }
}

/**
 * Exactly the set of JS/MJS files the bundler's discovery reads: every one
 * under `shared/resources/` (recursively — it follows into `tests/`), and every
 * one under a skill directory except the generated `references/` copies. A
 * guard's stated scope and its scanned scope must agree, and the bundler's
 * warning is the stated scope.
 */
function liveSources() {
  const out = [];
  walk(path.join(REPO_ROOT, "shared", "resources"), out, null);
  const skills = path.join(REPO_ROOT, "skills");
  for (const d of fs.readdirSync(skills)) {
    const abs = path.join(skills, d);
    if (!fs.statSync(abs).isDirectory()) continue;
    walk(abs, out, (name) => name === "references");
  }
  return out.sort();
}

/** A file naming its own shared path is not a dependency (see bundle_skill.py). */
function isSelfReference(rel, target) {
  return (
    path.resolve(REPO_ROOT, rel) ===
    path.resolve(REPO_ROOT, "shared", "resources", target)
  );
}

function bundleFixture({ skillFiles, sharedFiles }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-comment-origin-"));
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
    stdout,
    exists: (rel) => fs.existsSync(path.join(skillDir, rel)),
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

const SKILL_MD =
  "---\nname: fixture-skill\ndescription: fixture\n---\n\n# Fixture\n\nRun `scripts/tool.js`.\n";

test("§1a the bundler warns on a comment-only reference, naming file, line and target", () => {
  const fx = bundleFixture({
    skillFiles: {
      "SKILL.md": SKILL_MD,
      "scripts/tool.js": [
        '"use strict";',
        "// see shared/resources/dep.md for the schema",
        "module.exports = {};",
        "",
      ].join("\n"),
    },
    sharedFiles: { "dep.md": "# dep\n" },
  });
  try {
    const warn = fx.stdout
      .split("\n")
      .filter((l) => l.includes("comment-only reference"));
    assert.equal(
      warn.length,
      1,
      `expected exactly one warning, got:\n${fx.stdout}`,
    );
    assert.match(
      warn[0],
      /skills\/fixture-skill\/scripts\/tool\.js:2 → shared\/resources\/dep\.md/,
    );
    // The reference is still FOLLOWED — the warning names it, it does not refuse it.
    assert.ok(fx.exists("references/dep.md"), "dep.md should still be bundled");
  } finally {
    fx.cleanup();
  }
});

test("§1b a `bundle-dependency:` declaration is followed silently", () => {
  const fx = bundleFixture({
    skillFiles: {
      "SKILL.md": SKILL_MD,
      "scripts/tool.js": [
        '"use strict";',
        "// The roster is read from dep.md at runtime, beside this file in either layout.",
        "// bundle-dependency: shared/resources/dep.md",
        'const fs = require("fs"); module.exports = () => fs.readFileSync(__dirname + "/dep.md");',
        "",
      ].join("\n"),
    },
    sharedFiles: { "dep.md": "# dep\n" },
  });
  try {
    assert.ok(
      !fx.stdout.includes("comment-only reference"),
      `unexpected warning:\n${fx.stdout}`,
    );
    assert.ok(
      fx.exists("references/dep.md"),
      "declared dependency should be bundled",
    );
  } finally {
    fx.cleanup();
  }
});

test("§1c a reference in code is not a comment-only origin", () => {
  const fx = bundleFixture({
    skillFiles: {
      "SKILL.md": SKILL_MD,
      "scripts/tool.js": [
        '"use strict";',
        'const shared = require("../../../shared/resources/dep.js");',
        "module.exports = shared;",
        "",
      ].join("\n"),
    },
    sharedFiles: { "dep.js": "module.exports = 1;\n" },
  });
  try {
    assert.ok(
      !fx.stdout.includes("comment-only reference"),
      `unexpected warning:\n${fx.stdout}`,
    );
    assert.ok(fx.exists("references/dep.js"));
  } finally {
    fx.cleanup();
  }
});

test("§2 the live tree has no undeclared comment-only shared/resources references", () => {
  const sources = liveSources();
  assert.ok(
    sources.length >= MIN_SOURCES,
    `Scanned only ${sources.length} JS sources (floor ${MIN_SOURCES}) — the scan has lost its inputs`,
  );
  const offenders = [];
  for (const rel of sources) {
    const text = fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
    for (const hit of commentOnlyRefs(text)) {
      if (isSelfReference(rel, hit.target)) continue;
      if (ALLOWLIST.some((a) => a.file === rel && a.line === hit.line))
        continue;
      offenders.push(
        `  ${rel}:${hit.line} → shared/resources/${hit.target}  ${hit.text.slice(0, 90)}`,
      );
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `Comment-only shared/resources/ references — the bundler follows these, so a ` +
      `comment changes the bundle graph. Name the sibling by bare filename, or if the ` +
      `file is genuinely loaded at runtime declare it on its own line as ` +
      `\`// bundle-dependency: shared/resources/X\`, or allowlist WITH A REASON:\n` +
      offenders.join("\n"),
  );
});

test("§3 every allowlist entry still names a live hit and states a reason", () => {
  const stale = [];
  for (const a of ALLOWLIST) {
    const abs = path.join(REPO_ROOT, a.file);
    if (!fs.existsSync(abs)) {
      stale.push(
        `${a.file}:${a.line} — allowlisted but the file no longer exists`,
      );
      continue;
    }
    const hits = commentOnlyRefs(fs.readFileSync(abs, "utf8"));
    if (!hits.some((h) => h.line === a.line)) {
      stale.push(
        `${a.file}:${a.line} — allowlisted but that line is no longer a comment-only reference`,
      );
    }
    if (!a.reason || a.reason.trim().split(/\s+/).length < 5) {
      stale.push(
        `${a.file}:${a.line} — an allowlist entry must state WHY, in a sentence a reviewer can check`,
      );
    }
  }
  assert.deepEqual(stale, [], `Stale allowlist entries:\n${stale.join("\n")}`);
});

module.exports = { commentOnlyRefs, liveSources, ALLOWLIST };
