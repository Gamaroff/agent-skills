/**
 * `updateEpicFile` writes RELATIVE document links.
 *
 * Sibling of the same-named suites under `sync-jira-task` and `sync-jira-story`.
 * The epic write-back carries the one rule neither of the others has: an
 * existing **hand-authored** relative `**Parent PRD**` link wins over the one
 * computed from `prd_source`, because it may point at a differently-named PRD
 * and overwriting it would be the tool second-guessing the author. An authored
 * *absolute* link earns no such deference — that is the rot this card removes.
 *
 * `updateEpicFile` swallows its own failures into `output.err`, so these tests
 * pass an `err` that throws. Without it a write-back that never ran would look
 * indistinguishable from one that ran and wrote nothing.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const epicSync = require("../scripts/sync-jira-epic.js");
const lib = require("../references/jira-sync.js");

const BB = "https://bitbucket.org/ws/repo";
const LOUD = {
  info() {},
  warn() {},
  err(msg) {
    throw new Error(`updateEpicFile reported a failure: ${msg}`);
  },
};

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "rel-epic-links-"));
}

function writeDoc(dir, name, body) {
  const file = path.join(dir, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body, "utf-8");
  return file;
}

const EPIC_DOC = `---
id: epic.1
title: 'The epic'
type: epic
status: planned
prd_source: docs/prd/onboarding/prd.onboarding.md
---

# Epic 1: The epic

## Overview

Body.
`;

/** An epic at docs/epics/, with its PRD two directories away. */
function scaffold(overrides = {}) {
  const dir = tmpdir();
  const file = writeDoc(
    dir,
    "docs/epics/epic.1.the-epic.md",
    overrides.doc || EPIC_DOC,
  );
  const prdFile = writeDoc(
    dir,
    "docs/prd/onboarding/prd.onboarding.md",
    "# Onboarding PRD\n",
  );
  return { dir, file, prdFile };
}

function update(file, prdFile, overrides = {}) {
  epicSync.updateEpicFile({
    filePath: file,
    issueKey: "PROJ-1",
    issueUrl: "https://example.atlassian.net/browse/PROJ-1",
    epicBbUrl: `${BB}/src/feature/doomed-branch/docs/epics/epic.1.the-epic.md`,
    prdBbUrl: `${BB}/src/feature/doomed-branch/docs/prd/onboarding/prd.onboarding.md`,
    prdFilePath: prdFile,
    changeLogEntries: [],
    lastSyncedAt: null,
    bodyHash: null,
    metaHash: null,
    output: LOUD,
    ...overrides,
  });
  return fs.readFileSync(file, "utf-8");
}

// ---------------------------------------------------------------------------
// Frontmatter: neither key is minted
// ---------------------------------------------------------------------------

test("epic: neither epic_bitbucket_url nor prd_bitbucket_url is written", () => {
  const { file, prdFile } = scaffold();
  const { frontmatter } = lib.parseFrontmatter(update(file, prdFile));

  assert.equal(frontmatter.epic_bitbucket_url, undefined);
  assert.equal(frontmatter.prd_bitbucket_url, undefined);
  assert.equal(frontmatter.jira_key, "PROJ-1", "jira_key must still be written");
});

test("epic: a hand-set prd_bitbucket_url survives the write", () => {
  // It is the documented `prd_source` fallback, so the write-back must leave a
  // deliberately-set value alone — it only stops minting new ones.
  const authored = `${BB}/src/main/docs/prd/onboarding/prd.onboarding.md`;
  const { file, prdFile } = scaffold({
    doc: EPIC_DOC.replace(
      "status: planned",
      `status: planned\nprd_bitbucket_url: "${authored}"`,
    ),
  });

  const { frontmatter } = lib.parseFrontmatter(update(file, prdFile));
  assert.equal(frontmatter.prd_bitbucket_url, authored);
});

// ---------------------------------------------------------------------------
// Body lines: both relative
// ---------------------------------------------------------------------------

test("epic: the Epic File line is a relative link to the document itself", () => {
  const { file, prdFile } = scaffold();
  assert.match(
    update(file, prdFile),
    /^\*\*Epic File\*\*: \[epic\.1\.the-epic\.md\]\(\.\/epic\.1\.the-epic\.md\)$/m,
  );
});

test("epic: the Parent PRD line walks up to the PRD's own directory", () => {
  const { file, prdFile } = scaffold();
  assert.match(
    update(file, prdFile),
    /^\*\*Parent PRD\*\*: \[prd\.onboarding\.md\]\(\.\.\/prd\/onboarding\/prd\.onboarding\.md\)$/m,
  );
});

test("epic: no absolute src/<ref>/ URL appears anywhere in the document", () => {
  const { file, prdFile } = scaffold();
  assert.doesNotMatch(
    update(file, prdFile),
    /bitbucket\.org\/[^\s)]*\/src\//,
    "a branch-pinned Bitbucket URL survived somewhere in the document",
  );
});

test("epic: stale absolute lines are REPLACED, not duplicated", () => {
  const { file, prdFile } = scaffold({
    doc: EPIC_DOC.replace(
      "# Epic 1: The epic\n",
      "# Epic 1: The epic\n\n" +
        `**Epic File**: [View on Bitbucket](${BB}/src/feature/gone/docs/epics/epic.1.the-epic.md)\n` +
        `**Parent PRD**: [View on Bitbucket](${BB}/src/feature/gone/docs/prd/onboarding/prd.onboarding.md)\n`,
    ),
  });

  const written = update(file, prdFile);
  assert.doesNotMatch(written, /View on Bitbucket/);
  assert.equal((written.match(/^\*\*Epic File\*\*:/gm) || []).length, 1);
  assert.equal((written.match(/^\*\*Parent PRD\*\*:/gm) || []).length, 1);
});

test("epic: both lines are written when no Bitbucket base could be resolved", () => {
  const { file, prdFile } = scaffold();
  const written = update(file, prdFile, { epicBbUrl: null, prdBbUrl: null });

  assert.match(written, /^\*\*Epic File\*\*: \[/m);
  assert.match(written, /^\*\*Parent PRD\*\*: \[/m);
});

// ---------------------------------------------------------------------------
// The authored-link rule — the epic's own
// ---------------------------------------------------------------------------

test("epic: an authored relative Parent PRD link is preferred over the computed one", () => {
  // The author pointed at a differently-named PRD than `prd_source` resolves to.
  // Recomputing would silently redirect the link.
  const { file, prdFile } = scaffold({
    doc: EPIC_DOC.replace(
      "# Epic 1: The epic\n",
      "# Epic 1: The epic\n\n" +
        "**Parent PRD**: [prd.the-real-one.md](../prd/other/prd.the-real-one.md)\n",
    ),
  });

  assert.match(
    update(file, prdFile),
    /^\*\*Parent PRD\*\*: \[prd\.the-real-one\.md\]\(\.\.\/prd\/other\/prd\.the-real-one\.md\)$/m,
    "the author's link was overwritten with the computed one",
  );
});

test("epic: an authored ABSOLUTE Parent PRD link earns no deference", () => {
  // Deference is for relative links. An absolute one is the rot this card
  // removes, so it is replaced by the computed relative link.
  const { file, prdFile } = scaffold({
    doc: EPIC_DOC.replace(
      "# Epic 1: The epic\n",
      "# Epic 1: The epic\n\n" +
        `**Parent PRD**: [prd.onboarding.md](${BB}/src/feature/gone/docs/prd/onboarding/prd.onboarding.md)\n`,
    ),
  });

  const written = update(file, prdFile);
  assert.doesNotMatch(written, /bitbucket\.org\/[^\s)]*\/src\//);
  assert.match(
    written,
    /^\*\*Parent PRD\*\*: \[prd\.onboarding\.md\]\(\.\.\/prd\/onboarding\/prd\.onboarding\.md\)$/m,
  );
});

test("epic: with no PRD path and no authored link, the line is omitted rather than guessed", () => {
  // A Bitbucket URL alone is not enough — there is no path to build a relative
  // link from, and writing the absolute one back is the defect.
  const { file } = scaffold();
  const written = update(file, null, { prdFilePath: null });

  assert.doesNotMatch(written, /^\*\*Parent PRD\*\*:/m);
  assert.match(written, /^\*\*Epic File\*\*: \[/m, "the epic link still lands");
});

// ---------------------------------------------------------------------------
// Jira is unharmed — the half that must NOT change
// ---------------------------------------------------------------------------

test("epic: resolveRelativeLink absolutises the written Parent PRD href", () => {
  const { dir, file, prdFile } = scaffold();
  const written = update(file, prdFile);
  const href = written.match(/^\*\*Parent PRD\*\*: \[[^\]]*\]\(([^)]+)\)$/m)[1];

  const resolver = lib.makeRelativeLinkResolver({
    filePath: file,
    repoRoot: dir,
    bbBase: BB,
    branch: "develop",
  });

  assert.equal(
    resolver(href),
    `${BB}/src/develop/docs/prd/onboarding/prd.onboarding.md`,
    "Jira must still receive the absolute URL the old code wrote",
  );
});
