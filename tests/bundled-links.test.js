"use strict";
/**
 * Bundled-link guard — every relative Markdown link under `skills/**` and
 * `shared/resources/**` must resolve to a tracked file.
 *
 * Motivation (task.108): `bundle_skill.py` copies `shared/resources/X` into
 * `skills/<skill>/references/X` and rewrites the `shared/resources/` spelling —
 * but a link authored for `shared/resources/` depth (`../../docs/…`, a bare
 * sibling `open-knowledge-format.md`) resolved one level wrong from the copy.
 * Measured 2026-09-12 by this test before the fix: 845 broken links in 215 files,
 * and BOTH existing guards certified it — `bundle --check` compares copy to
 * source byte-for-byte, and `docs-link-check.yml` is path-filtered to `docs/**`.
 *
 * WHAT THIS ASSERTS:
 *   1. Zero unresolved relative links across the walked corpus (the corpus is
 *      `git ls-files`, so an untracked stray cannot satisfy a link).
 *   2. A non-vacuity floor: the walk must have visited >= FLOOR_FILES files,
 *      >= FLOOR_LINKS links and >= FLOOR_SHARED_SOURCES top-level shared
 *      sources. An empty walk reports `scan-broken`, not clean — a checker
 *      that opened nothing has proved nothing — and the per-half floor exists
 *      because a pathspec once narrowed the shared half to one file while the
 *      total stayed comfortably above the floor.
 *   3. The extractor itself: fence tracking is line-based and an inline ```
 *      mention does not flip parity; placeholder targets are skipped by pattern.
 *
 * Run: node --test tests/bundled-links.test.js
 */

const fs = require("fs");
const path = require("path");
const assert = require("node:assert/strict");
const test = require("node:test");
const { execFileSync } = require("child_process");
const {
  extractAllLinks,
  extractRelativeLinks,
  proseOnly,
} = require("./lib/markdown-links");

const REPO_ROOT = path.resolve(__dirname, "..");

// Floors are a fraction of the measured corpus (663 files / ~2,100 inline links
// on 2026-09-12 — the count is of every link the reader parsed, external ones
// included, because after the bundler's rewrite most cross-repo links ARE
// external and a floor on relative links alone would drift with the fix), not
// a near-match: they exist to catch a walk that returned nothing, not to pin
// the count.
const FLOOR_FILES = 200;
const FLOOR_LINKS = 1000;
// Top-level shared/resources/*.md actually walked (58 on 2026-09-12).
const FLOOR_SHARED_SOURCES = 20;

function gitLsFiles(...patterns) {
  return execFileSync("git", ["ls-files", "--", ...patterns], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
  })
    .split("\n")
    .filter(Boolean);
}

// A `%` that is not a valid escape makes decodeURIComponent throw; a link like
// that is broken, not a reason to abort the whole scan.
function decodeURIComponentSafe(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * Walk the corpus and return { files, links, broken } where `broken` is
 * [{ file, line, target, resolved }].
 */
function scan() {
  const tracked = new Set(gitLsFiles());
  const trackedDirs = new Set();
  for (const f of tracked) {
    let d = path.posix.dirname(f);
    while (d && d !== "." && !trackedDirs.has(d)) {
      trackedDirs.add(d);
      d = path.posix.dirname(d);
    }
  }
  // Default (non-`:(glob)`) git pathspecs: `*` already crosses `/`, and `**`
  // is just `*` — so `shared/resources/**/*.md` demanded a literal slash
  // after the first segment and matched ONLY nested files (1 of 58). The
  // 57 top-level shared sources were never walked until QA cycle 3 of
  // task.108 noticed the corpus count was 605 skills files + 1 fixture.
  const files = gitLsFiles("skills/*.md", "shared/resources/*.md");
  let links = 0; // every inline link the reader parsed — external ones included
  let relative = 0; // the subset the rule applies to
  const broken = [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(REPO_ROOT, file), "utf-8");
    links += extractAllLinks(text).length;
    for (const { target, line } of extractRelativeLinks(text)) {
      relative += 1;
      const noFragment = target.split("#")[0];
      if (noFragment === "") continue; // "#anchor" is filtered upstream; belt and braces
      const decoded = decodeURIComponentSafe(noFragment);
      // A trailing slash names a directory; normalize() keeps it, the tracked
      // set has no such entry, so strip it before the lookup.
      const resolved = path.posix
        .normalize(path.posix.join(path.posix.dirname(file), decoded))
        .replace(/\/$/, "");
      if (!tracked.has(resolved) && !trackedDirs.has(resolved)) {
        broken.push({ file, line, target, resolved });
      }
    }
  }
  // Per-half counts, so a pathspec that silently narrows one half again is
  // caught by the floor rather than hidden inside a still-large total.
  const sharedSources = files.filter(
    (f) =>
      f.startsWith("shared/resources/") &&
      !f.slice("shared/resources/".length).includes("/"),
  ).length;
  return { files: files.length, links, relative, broken, sharedSources };
}

// The two corpus tests below read the same walk; parse it once.
let _scanned;
const scanned = () => (_scanned ??= scan());

test("extractor: line-based fences — an inline ``` mention does not flip parity", () => {
  const text = [
    "A sentence containing at least one fenced ```bash block. See [real](real.md).",
    "```",
    "[example](inside-fence.md)",
    "```",
    "After the fence: [also-real](also-real.md).",
    "~~~~",
    "[tilde-example](inside-tilde.md)",
    "~~~", // shorter than the opener — does NOT close
    "[still-inside](still-inside.md)",
    "~~~~",
    "[last](last.md)",
  ].join("\n");
  assert.deepEqual(
    extractRelativeLinks(text).map((l) => l.target),
    ["real.md", "also-real.md", "last.md"],
  );
});

test("extractor: inline code spans are skipped, links beside them are not", () => {
  const text =
    "See [`references/x.md`](x.md) and `[not](a-link.md)` and ``[nor](this.md)``.";
  assert.deepEqual(
    extractRelativeLinks(text).map((l) => l.target),
    ["x.md"],
  );
});

test("extractor: placeholders and externals are skipped by pattern", () => {
  const text = [
    "[a](url) [b](path) [c](…) [d](#anchor) [e](https://example.com/x.md) [f](mailto:x@y)",
    "[g](./task.{id}.{name}.md) [h](../../prd.[name].md) [i]({jira_url}) [j](<relative/path/to/x.md>)",
    "[keep](../real.md#section) ![img](assets/pic.png) [abs](/docs/x.md)",
  ].join("\n");
  assert.deepEqual(
    extractRelativeLinks(text).map((l) => l.target),
    ["../real.md#section", "assets/pic.png"],
  );
});

test("scan: a malformed % escape is a broken link, not a crash", () => {
  // decodeURIComponent throws on "100%.md"; the resolver must fall back to the
  // raw target and let the resolution test report the file/line.
  assert.doesNotThrow(() => decodeURIComponentSafe("100%.md"));
  assert.equal(decodeURIComponentSafe("100%.md"), "100%.md");
  assert.equal(decodeURIComponentSafe("a%20b.md"), "a b.md");
});

test("extractor: proseOnly preserves line numbers", () => {
  const text = "one\n```\ntwo\nthree\n```\nfour [x](x.md)";
  assert.equal(proseOnly(text).split("\n").length, text.split("\n").length);
  assert.deepEqual(extractRelativeLinks(text), [{ target: "x.md", line: 6 }]);
});

test("non-vacuity floor: the walk visited a corpus, not nothing", () => {
  const { files, links, sharedSources } = scanned();
  assert.ok(
    files >= FLOOR_FILES && links >= FLOOR_LINKS,
    `scan-broken: visited ${files} files / ${links} links, floor is ${FLOOR_FILES} / ${FLOOR_LINKS} — ` +
      "an empty walk is a broken reader, not a clean corpus",
  );
  assert.ok(
    sharedSources >= FLOOR_SHARED_SOURCES,
    `scan-broken: only ${sharedSources} top-level shared/resources/*.md visited (floor ${FLOOR_SHARED_SOURCES}) — ` +
      "the shared half of the corpus is not being walked",
  );
});

test("every relative link under skills/** and shared/resources/** resolves to a tracked file", () => {
  const { broken, files, links, relative } = scanned();
  const byTarget = new Map();
  for (const b of broken)
    byTarget.set(b.target, (byTarget.get(b.target) || 0) + 1);
  const top = [...byTarget.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([t, n]) => `    ${t}  ×${n}`)
    .join("\n");
  const sample = broken
    .slice(0, 15)
    .map((b) => `    ${b.file}:${b.line}  ${b.target}  → ${b.resolved}`)
    .join("\n");
  assert.equal(
    broken.length,
    0,
    `${broken.length} broken relative link(s) in ${new Set(broken.map((b) => b.file)).size} file(s) ` +
      `(${files} files / ${links} links parsed, ${relative} relative).\n  Top targets:\n${top}\n  First occurrences:\n${sample}\n` +
      "  A broken link inside skills/*/references/ is usually a bundler rewrite miss — fix in\n" +
      "  skills/create-skill/scripts/bundle_skill.py and re-run `npm run bundle`, never edit the copy.",
  );
});
