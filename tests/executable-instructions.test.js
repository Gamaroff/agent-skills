"use strict";
/**
 * Executable-instruction guard — every command bundled prose tells a reader to RUN
 * must resolve to something that actually ships.
 *
 * Motivation: the lite-mode CLI defect. Four skills instructed consumers to run
 * `npm run lite-mode` / `node scripts/lite-mode.ts`, wrapping "production parsers"
 * that had never been implemented in any repo. Every consumer silently took the
 * documented fallback path. Nothing caught it because nothing checked that an
 * imperative instruction pointed at a real file.
 *
 * Scope is deliberately narrow — a guard that cries wolf gets disabled. It targets
 * only imperative invocations (`node x.ts`, `bash refs/y.sh`, `npm run z`), NOT every
 * path that appears in prose. Bundled docs may legitimately *describe* paths a reader
 * will never execute. The distinction is "run this" vs "this exists elsewhere".
 *
 * Deterministic and fast — runs every push via `npm test` (tests/*.test.js).
 * Run: node --test tests/
 */

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const REPO_ROOT = path.resolve(__dirname, "..");

/**
 * `npm run X` scripts that belong to the CONSUMER's project, not to agent-skills.
 * Skills that coach an agent through a consumer's build/test loop legitimately name
 * these; we cannot and should not ship them.
 *
 * Anything not listed here must exist in our own package.json. Adding an entry is a
 * deliberate act: it asserts "this is the user's script, and prose must treat its
 * absence as normal". That classification step is the point of the allowlist — it is
 * what `lite-mode` would have had to survive.
 */
const CONSUMER_PROVIDED_NPM_SCRIPTS = new Set([
  "build",
  "build:libraries",
  "dev:api",
  "docker:setup",
  "test:e2e:api",
  "test:e2e:setup",
  "test:local",
  "test:local:coverage",
  "test:local:e2e",
  "test:specific",
]);

/** Illustrative paths — teaching syntax, not naming a shipped file. */
function isIllustrative(p) {
  return p.startsWith("/") || p.startsWith("~") || p.includes("{") || p.includes("<");
}

/**
 * Does this path address a file agent-skills purports to SHIP, as opposed to one the
 * consumer project owns? Only the former is our problem.
 *
 * Bare `scripts/x` is genuinely ambiguous — `create-skill` means its own bundled
 * scripts, `deploy-remote` means the consumer's deploy scripts. The tell is whether the
 * owning skill ships a scripts/ directory at all. A skill with no scripts/ dir that says
 * `bash scripts/deploy-remote.sh` is unambiguously talking about the consumer's repo.
 *
 * Returns the absolute path to check, or null to skip.
 */
function bundlePathFor(rawPath, docPath) {
  const p = rawPath.replace(/^\.\//, "");
  // Bare filename: cwd is unknowable from prose, so we cannot judge it.
  if (!p.includes("/")) return null;

  const consumerInstall = p.match(/^\.agents\/skills\/(.+)$/);
  if (consumerInstall) return path.join(REPO_ROOT, "skills", consumerInstall[1]);

  if (p.startsWith("shared/resources/")) return path.join(REPO_ROOT, p);

  // Anchor to the repo-relative path: the repo root itself ends in "agent-skills",
  // so an unanchored /skills\// would match inside the root's own name.
  const skillMatch = path.relative(REPO_ROOT, docPath).match(/^skills\/([^/]+)\//);
  if (skillMatch) {
    const skillDir = path.join(REPO_ROOT, "skills", skillMatch[1]);
    if (p.startsWith("references/")) return path.join(skillDir, p);
    if (p.startsWith("scripts/")) {
      // Only ours if this skill ships scripts/ at all; otherwise it's the consumer's.
      return fs.existsSync(path.join(skillDir, "scripts"))
        ? path.join(skillDir, p)
        : null;
    }
    return null; // docs/, src/, and other consumer-project paths
  }

  // shared/resources/*.md — bundled into skills, so `references/x` is the post-bundle
  // name of a shared resource; verify the source exists. `scripts/x` is repo-root.
  if (p.startsWith("references/")) {
    return path.join(REPO_ROOT, "shared", "resources", path.basename(p));
  }
  if (p.startsWith("scripts/")) return path.join(REPO_ROOT, p);
  return null;
}

/** Docs whose prose is authored to be READ and RUN by an agent. */
function collectDocs() {
  const docs = [];
  const sharedDir = path.join(REPO_ROOT, "shared", "resources");
  for (const f of fs.readdirSync(sharedDir)) {
    if (f.endsWith(".md")) docs.push(path.join(sharedDir, f));
  }
  const skillsDir = path.join(REPO_ROOT, "skills");
  for (const skill of fs.readdirSync(skillsDir)) {
    const skillMd = path.join(skillsDir, skill, "SKILL.md");
    if (fs.existsSync(skillMd)) docs.push(skillMd);
    // references/ only — examples/ and assets/ are illustrative by construction.
    const refs = path.join(skillsDir, skill, "references");
    if (fs.existsSync(refs)) {
      for (const f of fs.readdirSync(refs)) {
        if (f.endsWith(".md")) docs.push(path.join(refs, f));
      }
    }
  }
  return docs;
}

const DOCS = collectDocs();

test("every interpreter invocation in skill prose points at a file that ships", () => {
  // `node --flag path/to/x.ts`, `bash refs/y.sh`, `python3 scripts/z.py`.
  // [ \t] not \s — an invocation must be on ONE line, or `bash` at the end of a
  // sentence would bind to a path on the next line.
  const re =
    /\b(?:node|bash|sh|python3|python)((?:[ \t]+--?[A-Za-z][\w-]*)*)[ \t]+([A-Za-z0-9_./-]+\.(?:ts|js|mjs|cjs|sh|py))/g;
  const failures = [];

  for (const doc of DOCS) {
    const content = fs.readFileSync(doc, "utf-8");
    let m;
    while ((m = re.exec(content)) !== null) {
      const scriptPath = m[2];
      if (isIllustrative(scriptPath)) continue;
      const target = bundlePathFor(scriptPath, doc);
      if (target && !fs.existsSync(target)) {
        failures.push(`${path.relative(REPO_ROOT, doc)} → \`${m[0].trim()}\``);
      }
    }
  }

  assert.deepEqual(
    failures,
    [],
    `Prose instructs running scripts that do not exist. Either ship the script, or ` +
      `rewrite the prose so it does not tell the reader to run it:\n  ` +
      failures.join("\n  ")
  );
});

/**
 * A doc a skill tells an agent to READ is as load-bearing as a script it tells it to
 * run — an unreadable reference means the agent proceeds without the rules it was sent
 * for, silently. `enforce-standards` pointed at `docs/standards/naming-conventions.md`,
 * which never existed, for months.
 *
 * This also catches the bundler's blind spot: it detects dependencies only via the
 * literal `shared/resources/X` string, so a shared doc referred to by its POST-bundle
 * name (`references/X.md`) is silently un-declared and may not ship. That is how
 * `develop-pipeline-autonomous-defaults.md` reached develop-story/develop-task (by
 * accident, via a transitive ref in step-2-review) but never qa-story/qa-task.
 */
test("every doc reference in skill prose resolves to a doc that ships", () => {
  const failures = [];

  // create-skill is the skill-AUTHORING guide: its prose illustrates the layout of
  // hypothetical skills (`references/finance.md` for financial schemas, …), so its
  // doc refs describe a shape, not files it ships. Its scripts stay covered by the
  // interpreter check above. Exempting the doc-ref check here only.
  const EXEMPT = new Set(["skills/create-skill/SKILL.md"]);

  for (const doc of DOCS) {
    const content = fs.readFileSync(doc, "utf-8");
    const rel = path.relative(REPO_ROOT, doc);
    if (EXEMPT.has(rel)) continue;
    const isShared = rel.startsWith("shared/");

    for (const m of content.matchAll(/`(?:\.\/)?((?:references|docs)\/[A-Za-z0-9_./-]+\.md)`/g)) {
      const ref = m[1];
      if (isIllustrative(ref)) continue;

      if (ref.startsWith("docs/")) {
        // Our own standards/reference tree. Consumer doc trees live under docs/ too
        // (docs/stories, docs/tasks, docs/prd), so check only dirs we own.
        if (!/^docs\/(standards|reference|operations|contributing|runbooks)\//.test(ref)) continue;
        if (!fs.existsSync(path.join(REPO_ROOT, ref))) {
          failures.push(`${rel} → \`${ref}\``);
        }
        continue;
      }

      // `references/X.md`
      const name = path.basename(ref);
      if (isShared) {
        // In shared/, `references/X.md` is the post-bundle name — invisible to the
        // bundler. Write `shared/resources/X.md`; the bundler rewrites it back on
        // bundle, so the output is identical AND the dependency is declared.
        if (fs.existsSync(path.join(REPO_ROOT, "shared", "resources", name))) {
          failures.push(
            `${rel} → \`${ref}\` (write it as \`shared/resources/${name}\` so the bundler ships it)`
          );
        }
        continue;
      }
      const skill = rel.match(/^skills\/([^/]+)\//);
      if (skill && !fs.existsSync(path.join(REPO_ROOT, "skills", skill[1], ref))) {
        failures.push(`${rel} → \`${ref}\``);
      }
    }
  }

  assert.deepEqual(
    failures,
    [],
    `Prose points a reader at a doc that is not there. An unreadable reference fails ` +
      `silently — the agent proceeds without the rules:\n  ` + failures.join("\n  ")
  );
});

test("every `npm run` instruction is either ours or a classified consumer script", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf-8"));
  const ours = new Set(Object.keys(pkg.scripts || {}));
  const failures = [];

  for (const doc of DOCS) {
    const content = fs.readFileSync(doc, "utf-8");
    const re = /npm run ([a-z0-9:_-]+)/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      const script = m[1];
      if (ours.has(script) || CONSUMER_PROVIDED_NPM_SCRIPTS.has(script)) continue;
      failures.push(`${path.relative(REPO_ROOT, doc)} → \`npm run ${script}\``);
    }
  }

  assert.deepEqual(
    failures,
    [],
    `Prose instructs running an npm script that is neither in our package.json nor ` +
      `classified as consumer-provided in CONSUMER_PROVIDED_NPM_SCRIPTS. If agent-skills ` +
      `is meant to provide it, ship it; if the consumer provides it, add it to the ` +
      `allowlist with that intent:\n  ` +
      failures.join("\n  ")
  );
});
