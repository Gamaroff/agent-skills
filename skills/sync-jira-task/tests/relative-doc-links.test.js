/**
 * Local documents get RELATIVE links; Jira still gets absolute ones.
 *
 * The three sync scripts used to stamp an absolute
 * `https://bitbucket.org/<ws>/<repo>/src/<ref>/<path>` URL into every document
 * they touched — once into frontmatter (`*_bitbucket_url`) and once into a body
 * line (`**Task File**` / `**Story File**` / `**Epic File**` / `**Parent PRD**`).
 *
 * The `<ref>` was whichever branch the sync happened to run on. When that branch
 * was deleted after merge, the link died while the file itself sat perfectly safe
 * on the default branch. Nothing validates an absolute URL — a repo link checker
 * only resolves relative paths — so the rot accumulated invisibly: one consumer
 * measured 1,889 such URLs across 614 documents, 44 of them already dead.
 *
 * Both writes now emit relative hrefs, which a link checker validates and which
 * cannot rot. Jira loses nothing, because `resolveRelativeLink` absolutises them
 * when the description is rendered.
 *
 * Reading `*_bitbucket_url` is deliberately unchanged — `sync-jira-epic` documents
 * it as a `prd_source` fallback — so a value a consumer sets by hand keeps working.
 * This only stops the tools minting new ones.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const taskSync = require("../scripts/sync-jira-task.js");
const lib = require("../references/jira-sync.js");

const BB = "https://bitbucket.org/ws/repo";

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "rel-doc-links-"));
}

function writeDoc(dir, name, body) {
  const file = path.join(dir, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body, "utf-8");
  return file;
}

const TASK_DOC = `---
id: task.62
title: 'A task'
type: task
status: planned
---

# Task 62: A task

## Overview

Body.
`;

// ---------------------------------------------------------------------------
// Frontmatter: the key is no longer minted
// ---------------------------------------------------------------------------

test("no task_bitbucket_url is written to frontmatter", () => {
  const dir = tmpdir();
  const file = writeDoc(dir, "task.62.a-task.md", TASK_DOC);

  taskSync.updateTaskFile({
    filePath: file,
    issueKey: "PROJ-1",
    issueUrl: "https://example.atlassian.net/browse/PROJ-1",
    taskBbUrl: `${BB}/src/feature/doomed-branch/task.62.a-task.md`,
    changeLogEntries: [],
    lastSyncedAt: "2026-01-01T00:00:00.000+0000",
    bodyHash: "abc",
    metaHash: "def",
    output: { info() {}, warn() {} },
  });

  const written = fs.readFileSync(file, "utf-8");
  const { frontmatter } = lib.parseFrontmatter(written);
  assert.equal(
    frontmatter.task_bitbucket_url,
    undefined,
    "the branch-pinned URL was written back into frontmatter",
  );
  assert.equal(
    frontmatter.jira_key,
    "PROJ-1",
    "jira_key must still be written",
  );
});

test("an absolute src/<ref>/ URL appears nowhere in the written document", () => {
  const dir = tmpdir();
  const file = writeDoc(dir, "task.62.a-task.md", TASK_DOC);

  taskSync.updateTaskFile({
    filePath: file,
    issueKey: "PROJ-1",
    issueUrl: "https://example.atlassian.net/browse/PROJ-1",
    taskBbUrl: `${BB}/src/develop/task.62.a-task.md`,
    changeLogEntries: [],
    lastSyncedAt: null,
    bodyHash: null,
    metaHash: null,
    output: { info() {}, warn() {} },
  });

  const written = fs.readFileSync(file, "utf-8");
  assert.doesNotMatch(
    written,
    /bitbucket\.org\/[^\s)]*\/src\//,
    "a branch-pinned Bitbucket URL survived somewhere in the document",
  );
});

// ---------------------------------------------------------------------------
// Body line: relative, and still upserted
// ---------------------------------------------------------------------------

test("the Task File line is a relative link to the document itself", () => {
  const dir = tmpdir();
  const file = writeDoc(dir, "task.62.a-task.md", TASK_DOC);

  taskSync.updateTaskFile({
    filePath: file,
    issueKey: "PROJ-1",
    issueUrl: "https://example.atlassian.net/browse/PROJ-1",
    taskBbUrl: `${BB}/src/develop/task.62.a-task.md`,
    changeLogEntries: [],
    lastSyncedAt: null,
    bodyHash: null,
    metaHash: null,
    output: { info() {}, warn() {} },
  });

  const written = fs.readFileSync(file, "utf-8");
  assert.match(
    written,
    /^\*\*Task File\*\*: \[task\.62\.a-task\.md\]\(\.\/task\.62\.a-task\.md\)$/m,
  );
});

test("an existing absolute Task File line is REPLACED, not left in place", () => {
  // The line is upserted, so a document carrying the old form must be repaired by
  // the next sync rather than accumulating a second line beside it.
  const dir = tmpdir();
  const stale = TASK_DOC.replace(
    "# Task 62: A task\n",
    `# Task 62: A task\n\n**Task File**: [View on Bitbucket](${BB}/src/feature/gone/task.62.a-task.md)\n`,
  );
  const file = writeDoc(dir, "task.62.a-task.md", stale);

  taskSync.updateTaskFile({
    filePath: file,
    issueKey: "PROJ-1",
    issueUrl: "https://example.atlassian.net/browse/PROJ-1",
    taskBbUrl: `${BB}/src/develop/task.62.a-task.md`,
    changeLogEntries: [],
    lastSyncedAt: null,
    bodyHash: null,
    metaHash: null,
    output: { info() {}, warn() {} },
  });

  const written = fs.readFileSync(file, "utf-8");
  assert.doesNotMatch(written, /View on Bitbucket/);
  assert.equal(
    (written.match(/^\*\*Task File\*\*:/gm) || []).length,
    1,
    "the line was duplicated instead of replaced",
  );
});

test("the line is still written when no Bitbucket base could be resolved", () => {
  // It used to be gated on `taskBbUrl`, so a repo with no Bitbucket remote got no
  // link at all. A relative link needs nothing but the file's own path.
  const dir = tmpdir();
  const file = writeDoc(dir, "task.62.a-task.md", TASK_DOC);

  taskSync.updateTaskFile({
    filePath: file,
    issueKey: "PROJ-1",
    issueUrl: "https://example.atlassian.net/browse/PROJ-1",
    taskBbUrl: null,
    changeLogEntries: [],
    lastSyncedAt: null,
    bodyHash: null,
    metaHash: null,
    output: { info() {}, warn() {} },
  });

  assert.match(fs.readFileSync(file, "utf-8"), /^\*\*Task File\*\*: \[/m);
});

// ---------------------------------------------------------------------------
// Jira still receives an absolute URL — the half that must NOT change
// ---------------------------------------------------------------------------

test("resolveRelativeLink turns the relative href back into an absolute URL", () => {
  const dir = tmpdir();
  const file = writeDoc(dir, "docs/tasks/t/task.62.a-task.md", TASK_DOC);
  const resolver = lib.makeRelativeLinkResolver({
    filePath: file,
    repoRoot: dir,
    bbBase: BB,
    branch: "develop",
  });

  assert.equal(
    resolver("./task.62.a-task.md"),
    `${BB}/src/develop/docs/tasks/t/task.62.a-task.md`,
  );
});

test("a relative link to a file that does not exist is left as authored", () => {
  // Pre-existing contract: don't mask a broken link by absolutising it.
  const dir = tmpdir();
  const file = writeDoc(dir, "docs/a.md", TASK_DOC);
  const resolver = lib.makeRelativeLinkResolver({
    filePath: file,
    repoRoot: dir,
    bbBase: BB,
    branch: "develop",
  });

  assert.equal(resolver("./nope.md"), "./nope.md");
});
