"use strict";
/**
 * No consumer names in shipped skills (task.220).
 *
 * The library was built against one consumer's board and repository, and its
 * names leaked into what ships: provenance notes, example keys and hosts, test
 * fixture values and file names, and a whole wireframe format profile.
 * `shared/resources/tests/pipeline-answers-generic.test.mjs` guards only the
 * files task.201 touched; this guard covers every tracked file under `skills/`
 * and `shared/`, bundled `references/` copies included, and checks each file's
 * PATH as well as its contents — the fixture payloads were named with the key.
 *
 * The key and brand patterns are bounded by letters, not by `\b`: `\b` treats
 * `_` as a word character, so `\bKEY\b` passes over `KEY_RECORD`, and the key
 * appears in lower case in file names and a host (task.220 review 1).
 *
 * Out of scope: `CHANGELOG.md` and `docs/` keep their history by design, and
 * nothing executes them.
 *
 *   1. The scanner flags each consumer identifier, and no look-alike.
 *   2. The walk is not vacuous.
 *   3. No shipped line names the consumer.
 *   4. No shipped path names the consumer.
 *
 * Run: node --test tests/no-consumer-names.test.js
 */

const fs = require("fs");
const path = require("path");
const assert = require("node:assert/strict");
const test = require("node:test");
const { execFileSync } = require("child_process");

const REPO_ROOT = path.resolve(__dirname, "..");

// The consumer's repository and product name, Jira key, brand (also a CSS class
// and file-name prefix) and Jira host.
const CONSUMER_NAMES = [
  /rebirth/i,
  /(?<![a-z])rapp(?![a-z])/i,
  /(?<![a-z])rbt(?![a-z])/i,
  /mediastreamag/i,
];
const SCOPE = ["skills", "shared"];
// The older guard's calibration samples hold the names on purpose.
const SELF = new Set([
  "shared/resources/tests/pipeline-answers-generic.test.mjs",
]);
const FLOOR_FILES = 500;

const named = (text) => CONSUMER_NAMES.some((re) => re.test(text));

function consumerHits(text) {
  return text
    .split("\n")
    .map((line, i) => ({ line: i + 1, text: line.trim() }))
    .filter((l) => named(l.text));
}

/** Tracked paths under SCOPE, minus SELF. */
function shippedPaths() {
  return execFileSync("git", ["ls-files", "-z", "--", ...SCOPE], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
  })
    .split("\0")
    .filter((rel) => rel && !SELF.has(rel));
}

function isBinary(buf) {
  return buf.subarray(0, 8192).includes(0);
}

/** Text files among the shipped paths, as { rel, text }. */
function shippedText() {
  const out = [];
  for (const rel of shippedPaths()) {
    const buf = fs.readFileSync(path.join(REPO_ROOT, rel));
    if (!isBinary(buf)) out.push({ rel, text: buf.toString("utf-8") });
  }
  return out;
}

test("1: the scanner flags each consumer identifier, and no look-alike", () => {
  for (const sample of [
    "see rebirth-wallet",
    "Rebirth",
    "RAPP-702",
    "the RAPP board",
    "const RAPP_RECORD = {",
    "rapp-story-in-progress.json",
    'baseUrl: "https://rapp.atlassian.net"',
    '<body class="phone rbt-theme">',
    "an RBT screen",
    "https://mediastreamag.atlassian.net/browse/X-1",
    "```bash\n# rebirth in a fenced comment\n```",
  ]) {
    assert.equal(consumerHits(`ok\n${sample}\nok`).length, 1, sample);
  }
  for (const alike of [
    "rapport",
    "TRAPPED",
    "wrapper",
    "bootstrapped",
    "unwrapped",
    "TestWrapper",
    "WRAPPING",
    "orbit",
    "acme.atlassian.net",
  ]) {
    assert.equal(consumerHits(alike).length, 0, alike);
  }
});

test("2: the walk covers the shipped tree, not a fraction of it", () => {
  const files = shippedText().map((f) => f.rel);
  assert.ok(files.length >= FLOOR_FILES, `only ${files.length} files walked`);
  for (const must of [
    "shared/resources/jira-sync.js",
    "skills/finalise/SKILL.md",
    "skills/wireframe/SKILL.md",
    "skills/develop-task/references/jira-sync.js",
  ])
    assert.ok(files.includes(must), `${must} missing from the walk`);
});

test("3: no shipped line names the consumer", () => {
  const found = [];
  for (const { rel, text } of shippedText())
    for (const h of consumerHits(text))
      found.push(`${rel}:${h.line}: ${h.text}`);
  assert.deepEqual(found, []);
});

test("4: no shipped path names the consumer", () => {
  assert.deepEqual(shippedPaths().filter(named), []);
});
