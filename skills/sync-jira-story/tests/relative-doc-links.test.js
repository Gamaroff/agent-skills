/**
 * `updateStoryFile` writes RELATIVE document links.
 *
 * Sibling of `skills/sync-jira-task/tests/relative-doc-links.test.js`, which
 * covers the same contract for `updateTaskFile`. The story write-back is the
 * harder half: it writes *two* document links rather than one, and the
 * `**Epic File**` link crosses directories, so it exercises
 * `toRelativeDocLink` rather than a bare `./<basename>`.
 *
 * This file exists because the write-back had no coverage at all — which is
 * exactly how two scripts came to write a body line that no test ever read.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const storySync = require("../scripts/sync-jira-story.js");
const lib = require("../references/jira-sync.js");

const BB = "https://bitbucket.org/ws/repo";
const SILENT = { info() {}, warn() {} };

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "rel-story-links-"));
}

function writeDoc(dir, name, body) {
  const file = path.join(dir, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body, "utf-8");
  return file;
}

const STORY_DOC = `---
id: story.1.2
title: 'A story'
type: story
status: planned
---

# Story 1.2: A story

## Story

As a user, I want a thing.
`;

/** A story at docs/stories/epic-1/, with its epic one directory up. */
function scaffold(overrides = {}) {
  const dir = tmpdir();
  const file = writeDoc(
    dir,
    "docs/stories/epic-1/story.1.2.a-story.md",
    overrides.doc || STORY_DOC,
  );
  const epicFile = writeDoc(dir, "docs/epics/epic.1.the-epic.md", "# Epic 1\n");
  return { dir, file, epicFile };
}

function update(file, epicFile, overrides = {}) {
  storySync.updateStoryFile({
    filePath: file,
    issueKey: "PROJ-2",
    issueUrl: "https://example.atlassian.net/browse/PROJ-2",
    epicKey: "PROJ-1",
    epicBbUrl: `${BB}/src/feature/doomed-branch/docs/epics/epic.1.the-epic.md`,
    epicFilePath: epicFile,
    storyBbUrl: `${BB}/src/feature/doomed-branch/docs/stories/epic-1/story.1.2.a-story.md`,
    changeLogEntries: [],
    lastSyncedAt: null,
    bodyHash: null,
    metaHash: null,
    baseUrl: "https://example.atlassian.net",
    output: SILENT,
    ...overrides,
  });
  return fs.readFileSync(file, "utf-8");
}

// ---------------------------------------------------------------------------
// Frontmatter: neither key is minted
// ---------------------------------------------------------------------------

test("story: neither story_bitbucket_url nor epic_bitbucket_url is written", () => {
  const { file, epicFile } = scaffold();
  const { frontmatter } = lib.parseFrontmatter(update(file, epicFile));

  assert.equal(frontmatter.story_bitbucket_url, undefined);
  assert.equal(frontmatter.epic_bitbucket_url, undefined);
  assert.equal(
    frontmatter.jira_key,
    "PROJ-2",
    "jira_key must still be written",
  );
  assert.equal(
    frontmatter.jira_epic,
    "PROJ-1",
    "jira_epic must still be written",
  );
});

test("story: a hand-set epic_bitbucket_url survives the write", () => {
  // The read is a documented fallback, so the write-back must not strip a value
  // a consumer set deliberately — only stop minting new ones.
  const authored = `${BB}/src/main/docs/epics/epic.1.the-epic.md`;
  const { file, epicFile } = scaffold({
    doc: STORY_DOC.replace(
      "status: planned",
      `status: planned\nepic_bitbucket_url: "${authored}"`,
    ),
  });

  const { frontmatter } = lib.parseFrontmatter(update(file, epicFile));
  assert.equal(frontmatter.epic_bitbucket_url, authored);
});

// ---------------------------------------------------------------------------
// Body lines: both relative
// ---------------------------------------------------------------------------

test("story: the Story File line is a relative link to the document itself", () => {
  const { file, epicFile } = scaffold();
  assert.match(
    update(file, epicFile),
    /^\*\*Story File\*\*: \[story\.1\.2\.a-story\.md\]\(\.\/story\.1\.2\.a-story\.md\)$/m,
  );
});

test("story: the Epic File line walks up to the epic's own directory", () => {
  const { file, epicFile } = scaffold();
  assert.match(
    update(file, epicFile),
    /^\*\*Epic File\*\*: \[epic\.1\.the-epic\.md\]\(\.\.\/\.\.\/epics\/epic\.1\.the-epic\.md\)$/m,
  );
});

test("story: no absolute src/<ref>/ URL appears anywhere in the document", () => {
  const { file, epicFile } = scaffold();
  assert.doesNotMatch(
    update(file, epicFile),
    /bitbucket\.org\/[^\s)]*\/src\//,
    "a branch-pinned Bitbucket URL survived somewhere in the document",
  );
});

test("story: stale absolute lines are REPLACED, not duplicated", () => {
  const { file, epicFile } = scaffold({
    doc: STORY_DOC.replace(
      "# Story 1.2: A story\n",
      "# Story 1.2: A story\n\n" +
        `**Story File**: [View on Bitbucket](${BB}/src/feature/gone/docs/stories/epic-1/story.1.2.a-story.md)\n` +
        `**Epic File**: [View on Bitbucket](${BB}/src/feature/gone/docs/epics/epic.1.the-epic.md)\n`,
    ),
  });

  const written = update(file, epicFile);
  assert.doesNotMatch(written, /View on Bitbucket/);
  assert.equal((written.match(/^\*\*Story File\*\*:/gm) || []).length, 1);
  assert.equal((written.match(/^\*\*Epic File\*\*:/gm) || []).length, 1);
});

test("story: both lines are written when no Bitbucket base could be resolved", () => {
  // They used to be gated on the Bitbucket URL, so a repo with no Bitbucket
  // remote got no document links at all.
  const { file, epicFile } = scaffold();
  const written = update(file, epicFile, {
    storyBbUrl: null,
    epicBbUrl: null,
  });

  assert.match(written, /^\*\*Story File\*\*: \[/m);
  assert.match(written, /^\*\*Epic File\*\*: \[/m);
});

test("story: an unresolvable epic_source omits the Epic File line rather than guessing", () => {
  // Documented in SKILL.md: with no path there is nothing to compute a relative
  // link from, so the line is skipped and sync continues.
  const { file } = scaffold();
  const written = update(file, null, { epicFilePath: null });

  assert.doesNotMatch(written, /^\*\*Epic File\*\*:/m);
  assert.match(
    written,
    /^\*\*Story File\*\*: \[/m,
    "the story link still lands",
  );
});

// ---------------------------------------------------------------------------
// Jira is unharmed — the half that must NOT change
// ---------------------------------------------------------------------------

test("story: resolveRelativeLink absolutises the written Epic File href", () => {
  const { dir, file, epicFile } = scaffold();
  const written = update(file, epicFile);
  const href = written.match(/^\*\*Epic File\*\*: \[[^\]]*\]\(([^)]+)\)$/m)[1];

  const resolver = lib.makeRelativeLinkResolver({
    filePath: file,
    repoRoot: dir,
    bbBase: BB,
    branch: "develop",
  });

  assert.equal(
    resolver(href),
    `${BB}/src/develop/docs/epics/epic.1.the-epic.md`,
    "Jira must still receive the absolute URL the old code wrote",
  );
  assert.ok(fs.existsSync(epicFile), "sanity: the epic file is really there");
});
