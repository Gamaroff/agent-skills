"use strict";

/**
 * A tracker card's document-link branch is resolved in one place: doc-link-branch.js (task.200).
 *
 * Eight GitHub skills each derived it with `git rev-parse … @{u}` and jira-sync.js with a ninth
 * copy, so a card created while HEAD was another work item's branch linked to that branch and 404'd
 * once it was deleted (obs #287). A new copy is the regression, and it need not be spelled the old
 * way, so the check is keyed on the derivation — any upstream ref, `@{u}` or `@{upstream}` — rather
 * than on the variable it lands in.
 *
 * Population, derived not listed: every `skills/*\/SKILL.md`, every file under `skills/*\/scripts/`,
 * every top-level file in `shared/resources/` and `scripts/`. Bundled `references/` copies are
 * generated from `shared/resources/` and checked there. One site is allowlisted: the create-branch
 * step's check that the story branch tracks origin, which reads the upstream to verify tracking and
 * builds no link.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const REPO = path.join(__dirname, "..");
const RESOLVER = "shared/resources/doc-link-branch.js";
const UPSTREAM_RE = /@\{(?:u|upstream)\}/;
// [file, a substring of the one line allowed there, why]
const ALLOW = [
  [
    "shared/resources/develop-pipeline-step-1-create-branch.md",
    "# story branch tracks origin",
    "verifies the story branch tracks origin; builds no link",
  ],
];
const CALL_FLOOR = 8;

function filesIn(dir, { recursive = false } = {}) {
  const abs = path.join(REPO, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((e) => {
    const rel = path.join(dir, e.name);
    if (e.isFile()) return [rel];
    if (e.isDirectory() && recursive) return filesIn(rel, { recursive });
    return [];
  });
}

function population() {
  const skills = fs
    .readdirSync(path.join(REPO, "skills"), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  return [
    ...skills
      .map((s) => `skills/${s}/SKILL.md`)
      .filter((f) => fs.existsSync(path.join(REPO, f))),
    ...skills.flatMap((s) =>
      filesIn(`skills/${s}/scripts`, { recursive: true }),
    ),
    ...filesIn("shared/resources"),
    ...filesIn("scripts"),
  ];
}

// The lines of `text` that read an upstream ref, unless `file`'s allowlisted line.
function upstreamDerivations(file, text) {
  if (file === RESOLVER) return [];
  const allowed = ALLOW.filter(([f]) => f === file).map(([, line]) => line);
  return text
    .split("\n")
    .map((line, i) => ({ line, n: i + 1 }))
    .filter(
      ({ line }) =>
        UPSTREAM_RE.test(line) && !allowed.some((a) => line.includes(a)),
    )
    .map(({ line, n }) => `${file}:${n}: ${line.trim()}`);
}

test("the scan catches a restatement under another spelling and variable name", () => {
  // Control case: a check that has never caught anything proves nothing.
  assert.equal(
    upstreamDerivations(
      "skills/x/SKILL.md",
      "BR=$(git rev-parse --abbrev-ref @{upstream})",
    ).length,
    1,
  );
  assert.equal(
    upstreamDerivations("shared/resources/x.js", '  "@{u}",').length,
    1,
    "a JS argv split across lines is still a derivation",
  );
  assert.equal(
    upstreamDerivations(
      ALLOW[0][0],
      "git rev-parse @{u} # story branch tracks origin",
    ).length,
    0,
  );
  assert.equal(
    upstreamDerivations(ALLOW[0][0], "LINK=$(git rev-parse @{u})").length,
    1,
  );
});

test("no skill source derives a document link from the upstream outside doc-link-branch.js", () => {
  const files = population();
  assert.ok(
    files.length > 100,
    `population is ${files.length} files — the scan found nothing to read`,
  );
  assert.ok(files.includes(RESOLVER), `${RESOLVER} is in the population`);
  const found = files.flatMap((f) =>
    upstreamDerivations(f, fs.readFileSync(path.join(REPO, f), "utf8")),
  );
  assert.deepEqual(
    found,
    [],
    "resolve the link branch with doc-link-branch.js (shared/resources/doc-link-branch.js), " +
      "or allowlist a site that builds no link, with a reason:\n" +
      found.join("\n"),
  );
});

// A link need not read the upstream to be wrong: create-epic built its PRD link from the checked-out
// branch, which the upstream scan cannot see (task.200 QA cycle 1, TASK-200-004). So the second scan
// is keyed on the link itself: every `blob/${V}` or `src/${V}` link must take V from a line that
// calls doc-link-branch.js. [file, the link variable, why]
const LINK_RE = /\b(?:blob|src)\/\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?\//g;
const LINK_ALLOW = [
  [
    "skills/finalise/SKILL.md",
    "DURABLE_BRANCH",
    "rewrites accepted links onto the durable branch; resolves no work item",
  ],
  [
    "shared/resources/jira-sync.js",
    "ref",
    "buildBitbucketUrl's branch argument comes from resolveDocBranch, which delegates to doc-link-branch.js",
  ],
];

// The links in `text` whose branch variable is not resolved: no line assigns it, or some line
// assigns it without calling doc-link-branch.js. One resolver assignment does not vouch for the
// others — a later `V=$(git branch --show-current)` before the link passed when it did (task.200 QA
// cycle 2, TASK-200-008).
function unresolvedLinks(file, text) {
  if (file === RESOLVER) return [];
  const lines = text.split("\n");
  const assigns = (v) =>
    lines.filter((l) => new RegExp(`(?:^|[\\s;&|(])${v}=(?!=)`).test(l));
  const resolved = (v) => {
    const a = assigns(v);
    return a.length > 0 && a.every((l) => l.includes("doc-link-branch.js"));
  };
  return lines.flatMap((line, i) =>
    [...line.matchAll(LINK_RE)]
      .map((m) => m[1])
      .filter(
        (v) =>
          !resolved(v) && !LINK_ALLOW.some(([f, a]) => f === file && a === v),
      )
      .map((v) => `${file}:${i + 1}: ${v} in ${line.trim()}`),
  );
}

test("the link scan catches a branch taken from HEAD, under any spelling", () => {
  // Control case: create-epic's pre-fix shape, reaching the link through an alias.
  const head = [
    "CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)",
    'BRANCH="$CURRENT_BRANCH"',
    'PRD_URL="https://github.com/${REPO}/blob/${BRANCH}/${PRD_SOURCE_PATH}"',
  ].join("\n");
  assert.equal(unresolvedLinks("skills/x/SKILL.md", head).length, 1);
  assert.equal(
    unresolvedLinks("skills/x/SKILL.md", 'U="${B}/src/$BR/${P}"').length,
    1,
    "a Bitbucket src/ link with an unbraced variable is still a link",
  );
  const fixed = [
    'BRANCH=$(command node .agents/skills/x/references/doc-link-branch.js --doc "${P}")',
    'PRD_URL="https://github.com/${REPO}/blob/${BRANCH}/${P}"',
  ].join("\n");
  assert.equal(unresolvedLinks("skills/x/SKILL.md", fixed).length, 0);
  // The resolver's answer, overwritten from the checked-out branch before the link.
  const reassigned = [
    'BRANCH=$(command node .agents/skills/x/references/doc-link-branch.js --doc "${P}")',
    "BRANCH=$(git branch --show-current)",
    'PRD_URL="https://github.com/${REPO}/blob/${BRANCH}/${P}"',
  ].join("\n");
  assert.equal(
    unresolvedLinks("skills/x/SKILL.md", reassigned).length,
    1,
    "a reassignment that bypasses the resolver is caught",
  );
});

test("every document link takes its branch from doc-link-branch.js", () => {
  const files = population();
  const found = files.flatMap((f) =>
    unresolvedLinks(f, fs.readFileSync(path.join(REPO, f), "utf8")),
  );
  assert.deepEqual(
    found,
    [],
    "assign the link's branch from doc-link-branch.js, or allowlist a link that resolves no " +
      "work item, with a reason:\n" +
      found.join("\n"),
  );
  for (const [file, v, why] of LINK_ALLOW) {
    const text = fs.readFileSync(path.join(REPO, file), "utf8");
    assert.ok(
      [...text.matchAll(LINK_RE)].some((m) => m[1] === v),
      `${file} no longer builds a link from ${v} — drop it from LINK_ALLOW (${why})`,
    );
  }
});

test("every allowlisted site still exists and still reads the upstream", () => {
  for (const [file, line, why] of ALLOW) {
    const text = fs.readFileSync(path.join(REPO, file), "utf8");
    assert.ok(
      text.split("\n").some((l) => l.includes(line) && UPSTREAM_RE.test(l)),
      `${file} no longer has "${line}" reading the upstream — drop it from ALLOW (${why})`,
    );
  }
});

test(`at least ${CALL_FLOOR} skills resolve the link through the CLI`, () => {
  const calls = population()
    .filter((f) => f.endsWith("/SKILL.md"))
    .filter((f) =>
      /doc-link-branch\.js --doc /.test(
        fs.readFileSync(path.join(REPO, f), "utf8"),
      ),
    );
  assert.ok(
    calls.length >= CALL_FLOOR,
    `${calls.length} SKILL.md files call doc-link-branch.js --doc (floor ${CALL_FLOOR}): ${calls.join(", ")}`,
  );
});
