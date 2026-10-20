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
