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
 *   2. A non-vacuity floor: the walk must have visited >= FLOOR_FILES files and
 *      >= FLOOR_LINKS links. An empty walk reports `scan-broken`, not clean —
 *      a checker that opened nothing has proved nothing.
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

// Floors are a fraction of the measured corpus (606 files / ~1,900 inline links
// on 2026-09-12 — the count is of every link the reader parsed, external ones
// included, because after the bundler's rewrite most cross-repo links ARE
// external and a floor on relative links alone would drift with the fix), not
// a near-match: they exist to catch a walk that returned nothing, not to pin
// the count.
const FLOOR_FILES = 200;
const FLOOR_LINKS = 1000;

function gitLsFiles(...patterns) {
  return execFileSync("git", ["ls-files", "--", ...patterns], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
  })
    .split("\n")
    .filter(Boolean);
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
  const files = gitLsFiles("skills/**/*.md", "shared/resources/**/*.md");
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
      // A trailing slash names a directory; normalize() keeps it, the tracked
      // set has no such entry, so strip it before the lookup.
      const resolved = path.posix
        .normalize(
          path.posix.join(
            path.posix.dirname(file),
            decodeURIComponent(noFragment),
          ),
        )
        .replace(/\/$/, "");
      if (!tracked.has(resolved) && !trackedDirs.has(resolved)) {
        broken.push({ file, line, target, resolved });
      }
    }
  }
  return { files: files.length, links, relative, broken };
}

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
    "[keep](../real.md#section) ![img](assets/pic.png)",
  ].join("\n");
  assert.deepEqual(
    extractRelativeLinks(text).map((l) => l.target),
    ["../real.md#section", "assets/pic.png"],
  );
});

test("extractor: proseOnly preserves line numbers", () => {
  const text = "one\n```\ntwo\nthree\n```\nfour [x](x.md)";
  assert.equal(proseOnly(text).split("\n").length, text.split("\n").length);
  assert.deepEqual(extractRelativeLinks(text), [{ target: "x.md", line: 6 }]);
});

test("non-vacuity floor: the walk visited a corpus, not nothing", () => {
  const { files, links } = scan();
  assert.ok(
    files >= FLOOR_FILES && links >= FLOOR_LINKS,
    `scan-broken: visited ${files} files / ${links} links, floor is ${FLOOR_FILES} / ${FLOOR_LINKS} — ` +
      "an empty walk is a broken reader, not a clean corpus",
  );
});

test("every relative link under skills/** and shared/resources/** resolves to a tracked file", () => {
  const { broken, files, links, relative } = scan();
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
