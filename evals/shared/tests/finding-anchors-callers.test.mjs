/**
 * Population guard — every skill that dispatches the shared code reviewer checks the
 * reviewer's anchors before it renders, posts or gates on them (task.194).
 *
 * The checker (`shared/resources/finding-anchors.js`) is code with its own tests. What
 * no unit test can see is a dispatcher that never calls it: a fifth skill that hands
 * `code-review-prompt.md` to a subagent and renders the `file_line`s it gets back as
 * fact. This file is what turns that omission into a failure.
 *
 * **The population is derived, never listed.** It is every `skills/*\/SKILL.md` that
 * mentions `code-review-prompt.md` — the bare filename, the superset. A compound
 * "dispatch" regex (`… prompt from [`references/code-review-prompt.md`]…`) matched the
 * same four files on 2026-10-07, but it passes over a dispatcher phrased any other way
 * ("run the reviewer in references/code-review-prompt.md"), which is the token-free
 * restatement obs #135 warns about. A SKILL.md that only CITES the prompt goes in
 * `CITE_ONLY`, with its reason; the list is empty today.
 *
 * What each member must carry (task.194 SC-5, SC-6b):
 *   - an invocation of `finding-anchors.js` inside a fenced block;
 *   - the `⚠️ unverified anchor` marker, so a malformed anchor is rendered, not dropped;
 *   - review-code: the `--fix` skip for a malformed anchor;
 *   - qa-task / qa-story: the `(location unverified: …)` top_issues[] wording.
 *
 * Run via: node --test evals/shared/tests/finding-anchors-callers.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// FINDING_ANCHORS_ROOT points the test at a copy of the tree, for mutation proofs.
const ROOT =
  process.env.FINDING_ANCHORS_ROOT || path.resolve(__dirname, "..", "..", "..");
const POPULATION_KEY = "code-review-prompt.md";
/** SKILL.md files that mention the prompt without dispatching it: name -> reason. Empty on 2026-10-07. */
const CITE_ONLY = new Map();
const FLOOR = 4;

function population() {
  const dir = path.join(ROOT, "skills");
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => {
      const p = path.join(dir, name, "SKILL.md");
      return existsSync(p) && readFileSync(p, "utf8").includes(POPULATION_KEY);
    })
    .filter((name) => !CITE_ONLY.has(name))
    .sort();
}

/** The bodies of every fenced code block in a Markdown file. */
function fencedBlocks(text) {
  const out = [];
  const re = /^([ \t]*)(```+)[^\n]*\n([\s\S]*?)^\1\2[ \t]*$/gm;
  let m;
  while ((m = re.exec(text))) out.push(m[3]);
  return out;
}

const read = (name) =>
  readFileSync(path.join(ROOT, "skills", name, "SKILL.md"), "utf8");

test("the dispatcher population is non-vacuous", () => {
  const pop = population();
  assert.ok(
    pop.length >= FLOOR,
    `expected at least ${FLOOR} skills mentioning ${POPULATION_KEY}, found ${pop.length}: ${pop.join(", ")} — ` +
      "a scan that matches nothing passes over everything",
  );
});

test("every CITE_ONLY entry still names a real skill and carries a reason", () => {
  for (const [name, reason] of CITE_ONLY) {
    assert.ok(
      existsSync(path.join(ROOT, "skills", name, "SKILL.md")),
      `CITE_ONLY names a missing skill: ${name}`,
    );
    assert.ok(
      reason && reason.trim(),
      `CITE_ONLY entry ${name} needs a reason`,
    );
  }
});

for (const name of population()) {
  test(`${name}: runs finding-anchors.js in a fenced block and marks unverified anchors`, () => {
    const text = read(name);
    assert.ok(
      fencedBlocks(text).some((b) => /finding-anchors\.js/.test(b)),
      `${name}/SKILL.md dispatches the code reviewer but no fenced block runs finding-anchors.js — ` +
        "its file_line anchors would render as fact (task.194). If it only cites the prompt, add it to CITE_ONLY with a reason.",
    );
    assert.ok(
      text.includes("⚠️ unverified anchor"),
      `${name}/SKILL.md must render a malformed anchor with "⚠️ unverified anchor", never drop it`,
    );
  });
}

test("review-code: --fix skips a finding with an unverified anchor", () => {
  const text = read("review-code").replace(/\s+/g, " ");
  assert.match(
    text,
    /skipped — unverified anchor/,
    "review-code --fix must list a malformed finding as skipped",
  );
  assert.match(
    text,
    /Step 5 never edits it/,
    "review-code must say --fix never edits an unverified line",
  );
});

for (const name of ["qa-task", "qa-story"]) {
  test(`${name}: a malformed anchor maps to top_issues[] as location unverified`, () => {
    const text = read(name).replace(/\s+/g, " ");
    assert.match(
      text,
      /\(location unverified: \{file_line\}\)/,
      `${name} must mark a malformed finding's top_issues[] entry "(location unverified: …)"`,
    );
  });
}
