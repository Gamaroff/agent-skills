// Drift guards for the generated skill call graph and the profile definitions
// (task 84).
//
// The graph is DECLARED in each SKILL.md's `invokes:` frontmatter and generated
// into shared/resources/skill-dependencies.json. Two ways that rots:
//
//  (a) Someone edits `invokes:` and forgets to regenerate. Caught here and in
//      CI (validate.yml on PRs, release.yml at tag time).
//  (b) Someone adds a skill to a profile that does not exist, or renames a
//      skill and leaves a dangling edge. Caught here.
//
// A third kind of rot cannot be an assertion and is REPORTED instead: a skill
// in no profile. `full` is legitimately everything and the long tail (Railway,
// Docker, sprint ceremonies, UI design) is deliberately unprofiled, so failing
// on it would be wrong — and a check everyone learns to ignore is a check that
// does not exist. It prints to CI output where a reviewer sees it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildGraph,
  skillNames,
  parseInvokes,
  candidateEdges,
} from "../../../scripts/generate-skill-dependencies.mjs";

const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const GRAPH_FILE = path.join(
  REPO,
  "shared",
  "resources",
  "skill-dependencies.json",
);
const PROFILES_FILE = path.join(
  REPO,
  "shared",
  "resources",
  "skill-profiles.json",
);

const committed = JSON.parse(readFileSync(GRAPH_FILE, "utf8"));
const profiles = JSON.parse(readFileSync(PROFILES_FILE, "utf8"));
const names = skillNames();

test("committed skill-dependencies.json matches a fresh generation", () => {
  const fresh = buildGraph();
  assert.deepEqual(
    committed,
    fresh,
    "shared/resources/skill-dependencies.json is stale. Run `npm run generate-skill-deps` and commit the diff.",
  );
});

test("every skill in the tree has a key in the graph", () => {
  assert.deepEqual([...names].sort(), Object.keys(committed).sort());
});

test("no edge points at a skill that does not exist", () => {
  const dangling = [];
  for (const [skill, deps] of Object.entries(committed)) {
    for (const dep of deps)
      if (!names.has(dep)) dangling.push(`${skill} -> ${dep}`);
  }
  assert.deepEqual(
    dangling,
    [],
    "dangling edges — a skill was renamed or removed",
  );
});

test("no skill declares itself", () => {
  const self = Object.entries(committed).filter(([s, d]) => d.includes(s));
  assert.deepEqual(self, []);
});

test("the known-good edge sets hold for the two orchestrators that matter most", () => {
  // develop-story's steps ARE its dependencies; if one goes missing, a consumer
  // on a profile install gets a pipeline that dies at that step, in their repo,
  // hours after the install. Asserted explicitly rather than by count.
  for (const dep of [
    "create-branch",
    "review-story",
    "develop",
    "create-pr",
    "qa-story",
    "qa-fix",
    "finalise",
    "commit-changes",
  ]) {
    assert.ok(
      committed["develop-story"].includes(dep),
      `develop-story must declare ${dep} — it invokes it as a pipeline step`,
    );
  }
  for (const dep of [
    "create-branch",
    "review-task",
    "develop",
    "create-pr",
    "qa-task",
    "qa-fix",
    "finalise",
    "commit-changes",
  ]) {
    assert.ok(
      committed["develop-task"].includes(dep),
      `develop-task must declare ${dep} — it invokes it as a pipeline step`,
    );
  }
});

test("the tracker-sibling chain that task 83 depends on is intact", () => {
  // This is the edge that makes the ordering test in
  // setup-consumer-skill-profiles.test.mjs meaningful. If review-story stops
  // declaring the Jira sub-routine, that test still passes on its fixture while
  // the real interaction it stands for has quietly disappeared.
  assert.ok(committed["review-story"].includes("ensure-story-jira-issue"));
  assert.ok(committed["ensure-story-jira-issue"].includes("sync-jira-story"));
  assert.ok(committed["review-story"].includes("ensure-story-github-issue"));
});

test("`invokes:` uses the inline flow form everywhere it appears", () => {
  // Every SKILL.md in the tree parses. Kept, but it is NOT the guard against the
  // block form — see the next test for that, and see why below.
  for (const skill of names) {
    const text = readFileSync(
      path.join(REPO, "skills", skill, "SKILL.md"),
      "utf8",
    );
    assert.doesNotThrow(
      () => parseInvokes(text, skill),
      `${skill}: malformed invokes:`,
    );
  }
});

test("the block form of `invokes:` is REJECTED, not silently read as empty", () => {
  // EXHAUSTIVE BY DESIGN. This function was patched four times, one YAML shape
  // per QA cycle — `\\s+#` missed the no-space comment, then a blank line slipped
  // through, then a comment on the key line, then a zero-indent sequence. Each
  // fix was correct for the shape it named and blind to the next one.
  //
  // So the table below enumerates the SPACE rather than the shapes that happen to
  // have been found: every combination of {comment on the key line or not} x
  // {blank/comment lines between or not} x {indent style}. A silently-empty edge
  // list is invisible to CI — the generator and the committed JSON agree on it,
  // so both drift checks stay green — which is why this must be caught here.
  for (const [shape, body] of [
    ["plain", "invokes:\n  - a\n"],
    ["zero indent", "invokes:\n- a\n"],
    ["tab indent", "invokes:\n\t- a\n"],
    ["four-space indent", "invokes:\n    - a\n"],
    ["comment on the key line", "invokes:  # why\n  - a\n"],
    ["comment on the key line, no space", "invokes:# why\n  - a\n"],
    ["blank line first", "invokes:\n\n  - a\n"],
    ["two blank lines", "invokes:\n\n\n  - a\n"],
    ["comment line between", "invokes:\n  # note\n  - a\n"],
    ["comment on key AND between", "invokes: # k\n  # b\n  - a\n"],
    ["CRLF", "invokes:\r\n  - a\r\n"],
  ]) {
    assert.throws(
      () => parseInvokes("---\n" + body + "---\n", "x"),
      /must use the inline form/,
      `block list (${shape}) must be rejected loudly, not returned as []`,
    );
  }

  // And every legitimate shape must still parse to the RIGHT VALUE — an
  // over-eager guard that throws on `invokes:` with nothing after it would fail
  // 100 of the 120 skills.
  for (const [shape, body, want] of [
    ["inline", "invokes: [a, b]\n", ["a", "b"]],
    ["inline + comment", "invokes: [a]  # c\n", ["a"]],
    ["inline + comment, no space", "invokes: [a]# c\n", ["a"]],
    ["empty inline", "invokes: []\n", []],
    ["empty inline + comment", "invokes: []  # none\n", []],
    ["bare key, last in frontmatter", "name: x\ninvokes:\n", []],
    ["bare key, then another key", "invokes:\ntags: [x]\n", []],
    ["a DIFFERENT key's block list", "invokes: [a]\ntags:\n  - x\n", ["a"]],
    ["quoted names", 'invokes: ["a", "b"]\n', ["a", "b"]],
  ]) {
    assert.deepEqual(
      parseInvokes("---\n" + body + "---\n", "x"),
      want,
      `${shape} must parse to ${JSON.stringify(want)}`,
    );
  }
});

test("minimal is a subset of pipeline, which is a subset of full", () => {
  // The wizard presents the three as narrowing tiers ("1) full — every skill /
  // 2) pipeline — … / 3) minimal — branching, commits, PRs, code review only").
  // They were not nested: `create-issue` was a minimal seed reachable from no
  // pipeline seed, so choosing the BROADER-sounding tier silently dropped a
  // capability the narrower one granted, with nothing in the output saying so.
  const resolve = (profile) =>
    new Set(
      execFileSync(
        process.execPath,
        [
          path.join(REPO, "shared", "resources", "resolve-skill-set-cli.mjs"),
          "--profile",
          profile,
          "--tracker",
          "github",
        ],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      )
        .split("\n")
        .filter(Boolean),
    );

  const minimal = resolve("minimal");
  const pipeline = resolve("pipeline");
  const full = resolve("full");

  const missingFromPipeline = [...minimal].filter((s) => !pipeline.has(s));
  assert.deepEqual(
    missingFromPipeline,
    [],
    "every minimal skill must be in pipeline — the wizard presents them as tiers",
  );
  const missingFromFull = [...pipeline].filter((s) => !full.has(s));
  assert.deepEqual(missingFromFull, [], "every pipeline skill must be in full");
});

test("every skill named in a profile exists", () => {
  const missing = [];
  for (const [name, def] of Object.entries(profiles)) {
    if (name.startsWith("$")) continue;
    if (def.seeds === "*") continue;
    for (const seed of def.seeds)
      if (!names.has(seed)) missing.push(`${name}: ${seed}`);
  }
  assert.deepEqual(
    missing,
    [],
    "a profile names a skill that is not in skills/",
  );
});

test("every profile has a description and a non-empty seed list", () => {
  for (const [name, def] of Object.entries(profiles)) {
    if (name.startsWith("$")) continue;
    assert.ok(
      def.description,
      `${name} needs a description — the wizard prints it`,
    );
    assert.ok(
      def.seeds === "*" || def.seeds.length > 0,
      `${name} has no seeds and would install nothing`,
    );
  }
});

test("profile seeds carry no duplicates", () => {
  for (const [name, def] of Object.entries(profiles)) {
    if (name.startsWith("$") || def.seeds === "*") continue;
    assert.equal(
      new Set(def.seeds).size,
      def.seeds.length,
      `${name} has duplicate seeds`,
    );
  }
});

test("the three documented profiles exist", () => {
  for (const p of ["minimal", "pipeline", "full"]) {
    assert.ok(
      profiles[p],
      `profile '${p}' is documented in configuration.md and must exist`,
    );
  }
  assert.equal(profiles.full.seeds, "*");
});

test("REPORT: skills in no profile, and prose mentions not declared as edges", () => {
  // Deliberately never fails — see the header. Both lists are legitimate in
  // normal operation; they exist so a reviewer can eyeball them in CI output.
  const profiled = new Set();
  for (const [name, def] of Object.entries(profiles)) {
    if (name.startsWith("$") || def.seeds === "*") continue;
    for (const s of def.seeds) profiled.add(s);
  }
  const unprofiled = [...names].filter((n) => !profiled.has(n)).sort();
  console.log(
    `\n  [report] ${unprofiled.length}/${names.size} skills are in no profile ` +
      `(reachable via skills.include, or by installing 'full'):`,
  );
  console.log("  " + unprofiled.join(", ") + "\n");

  const cand = candidateEdges();
  const total = Object.values(cand).reduce((n, d) => n + d.length, 0);
  console.log(
    `  [report] ${total} prose mentions across ${Object.keys(cand).length} skills are not ` +
      `declared in 'invokes:'. Most are legitimate (cross-references, negations,\n` +
      `  called-by notes). Scan for a genuine missed invocation; do not bulk-add.\n`,
  );

  assert.ok(existsSync(GRAPH_FILE));
});

test("004: `invokes:` tolerates a trailing YAML comment", () => {
  // `invokes: [a, b]  # steps 1-2` is legal YAML. Checking `endsWith("]")` without
  // stripping the comment threw "unterminated list — missing ]" about a line whose
  // bracket is plainly there, failing BOTH CI drift checks with a message that
  // sends the reader to the wrong place.
  assert.deepEqual(
    parseInvokes(
      "---\ninvokes: [create-branch, develop]  # steps 1-2\n---\n",
      "x",
    ),
    ["create-branch", "develop"],
  );
  assert.deepEqual(
    parseInvokes("---\ninvokes: []  # none yet\n---\n", "x"),
    [],
  );
  assert.deepEqual(
    parseInvokes("---\ninvokes: [create-branch]\n---\n", "x"),
    ["create-branch"],
    "the no-comment form must be unaffected",
  );
});

test("004b: a genuinely unterminated list still throws", () => {
  // The comment strip must not swallow a real syntax error.
  assert.throws(
    () => parseInvokes("---\ninvokes: [create-branch, develop\n---\n", "x"),
    /unterminated/,
  );
  assert.throws(
    () => parseInvokes("---\ninvokes: create-branch\n---\n", "x"),
    /inline form/,
  );
});
