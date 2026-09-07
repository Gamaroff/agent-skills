/**
 * Local documents get RELATIVE links; Jira still gets absolute ones.
 *
 * The sync scripts used to stamp an absolute
 * `https://bitbucket.org/<ws>/<repo>/src/<ref>/<path>` URL into every document
 * they touched — once into frontmatter (`*_bitbucket_url`) and once into a body
 * line. The `<ref>` was whichever branch the sync happened to run on, so when
 * that branch was deleted after merge the link died while the file itself sat
 * perfectly safe on the default branch. Nothing validates an absolute URL — a
 * repo link checker only resolves relative paths — so the rot accumulated
 * invisibly: one consumer measured 1,889 such URLs across 614 documents, 44 of
 * them already dead.
 *
 * `sync-jira-bug` is held to the same contract from the start, and it has one
 * more surface than its siblings: a bug document that arrives with NO
 * frontmatter still has to end up with relative links and a persisted key.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const bugSync = require("../scripts/sync-jira-bug.js");
const lib = require("../references/jira-sync.js");

const BB = "https://bitbucket.org/ws/repo";
const QUIET = { info() {}, warn() {} };

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "bug-rel-doc-links-"));
}

function writeDoc(dir, name, body) {
  const file = path.join(dir, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body, "utf-8");
  return file;
}

const BUG_DOC = `---
type: bug
status: in-progress
severity: 'Major'
priority: 'High'
created: 2026-09-07
related: 'story 7.4'
description: 'Tap target too small'
---

# Bug: Tap target too small

## Bug Description

The control is 24px.
`;

const FIELDS = {
  type: "bug",
  status: "in-progress",
  severity: "Major",
  priority: "High",
  created: "2026-09-07",
  related: "story 7.4",
  description: "Tap target too small",
};

function sync(file, over = {}) {
  bugSync.updateBugFile({
    filePath: file,
    issueKey: "PROJ-1",
    issueUrl: "https://example.atlassian.net/browse/PROJ-1",
    bugFields: FIELDS,
    statusHistoryEntries: [],
    lastSyncedAt: "2026-01-01T00:00:00.000+0000",
    bodyHash: "abc",
    metaHash: "def",
    output: QUIET,
    ...over,
  });
  return fs.readFileSync(file, "utf-8");
}

// ---------------------------------------------------------------------------
// Frontmatter: the branch-pinned key is never minted
// ---------------------------------------------------------------------------

test("no bug_bitbucket_url is written to frontmatter", () => {
  const dir = tmpdir();
  const file = writeDoc(dir, "story.7.4.bug.4.tap-target.md", BUG_DOC);

  const { frontmatter } = lib.parseFrontmatter(sync(file));
  assert.equal(
    frontmatter.bug_bitbucket_url,
    undefined,
    "a branch-pinned URL was written back into frontmatter",
  );
  assert.equal(
    frontmatter.jira_key,
    "PROJ-1",
    "jira_key must still be written",
  );
  assert.equal(frontmatter.jira_last_synced_at, "2026-01-01T00:00:00.000+0000");
});

test("an absolute src/<ref>/ URL appears nowhere in the written document", () => {
  const dir = tmpdir();
  const file = writeDoc(dir, "story.7.4.bug.4.tap-target.md", BUG_DOC);

  assert.doesNotMatch(
    sync(file),
    /bitbucket\.org\/[^\s)]*\/src\//,
    "a branch-pinned Bitbucket URL survived somewhere in the document",
  );
});

// ---------------------------------------------------------------------------
// Body line: relative, and upserted rather than appended
// ---------------------------------------------------------------------------

test("the Bug File line is a relative link to the document itself", () => {
  const dir = tmpdir();
  const file = writeDoc(dir, "story.7.4.bug.4.tap-target.md", BUG_DOC);

  assert.match(
    sync(file),
    /^\*\*Bug File\*\*: \[story\.7\.4\.bug\.4\.tap-target\.md\]\(\.\/story\.7\.4\.bug\.4\.tap-target\.md\)$/m,
  );
});

test("an existing absolute Bug File line is REPLACED, not left in place", () => {
  const dir = tmpdir();
  const stale = BUG_DOC.replace(
    "# Bug: Tap target too small\n",
    `# Bug: Tap target too small\n\n**Bug File**: [View on Bitbucket](${BB}/src/feature/gone/story.7.4.bug.4.tap-target.md)\n`,
  );
  const file = writeDoc(dir, "story.7.4.bug.4.tap-target.md", stale);

  const written = sync(file);
  assert.doesNotMatch(written, /View on Bitbucket/);
  assert.equal(
    (written.match(/^\*\*Bug File\*\*:/gm) || []).length,
    1,
    "the line was duplicated instead of replaced",
  );
});

test("an existing **Jira** header-block line is replaced, not duplicated", () => {
  // The no-frontmatter half of the corpus carries `**Jira**:` in its header
  // block already, frequently pointing at a card that was created by hand.
  const dir = tmpdir();
  const stale = BUG_DOC.replace(
    "# Bug: Tap target too small\n",
    "# Bug: Tap target too small\n\n**Jira**: RAPP-000\n",
  );
  const file = writeDoc(dir, "story.7.4.bug.4.tap-target.md", stale);

  const written = sync(file);
  assert.equal((written.match(/^\*\*Jira\*\*:/gm) || []).length, 1);
  assert.match(written, /^\*\*Jira\*\*: \[PROJ-1\]\(/m);
  assert.doesNotMatch(written, /RAPP-000/);
});

test("the Bug File line is still written when no Bitbucket base could be resolved", () => {
  // A relative link needs nothing but the file's own path, so a repo with no
  // Bitbucket remote must still get one.
  const dir = tmpdir();
  const file = writeDoc(dir, "bug.12.a-bug.md", BUG_DOC);

  assert.match(sync(file), /^\*\*Bug File\*\*: \[/m);
});

// ---------------------------------------------------------------------------
// The no-frontmatter half of the corpus
// ---------------------------------------------------------------------------

const HEADERED_BUG = `# Bug: Tap target too small

**Bug ID**: story.7.4.bug.4
**Related**: [story 7.4](./story.7.4.tap-targets.md)
**Status**: ✅ Closed
**Priority**: High
**Severity**: Major
**Created**: 2026-07-21

## Bug Description

The control is 24px.
`;

test("a file with no frontmatter still ends up with a persisted jira_key", () => {
  // Without frontmatter adoption, upsertFrontmatterKeys returns its input
  // unchanged and SILENTLY — the issue is created and the key is never stored,
  // so the next run creates a duplicate.
  const dir = tmpdir();
  const file = writeDoc(dir, "story.7.4.bug.4.tap-target.md", HEADERED_BUG);

  const written = sync(file);
  const { frontmatter } = lib.parseFrontmatter(written);
  assert.equal(frontmatter.jira_key, "PROJ-1");
  assert.equal(frontmatter.jira_last_body_hash, "abc");
  assert.match(written, /^\*\*Bug File\*\*: \[/m);
  assert.doesNotMatch(written, /bitbucket\.org\/[^\s)]*\/src\//);
});

test("adopting frontmatter leaves the body verbatim", () => {
  const dir = tmpdir();
  const file = writeDoc(dir, "story.7.4.bug.4.tap-target.md", HEADERED_BUG);

  const written = sync(file);
  const body = lib.parseFrontmatter(written).body;
  // Everything the sync did not deliberately add or upsert is byte-identical.
  const stripped = body
    .replace(/^\*\*Jira\*\*:.*\n/m, "")
    .replace(/^\*\*Bug File\*\*:.*\n/m, "")
    .replace(/\n{3,}/g, "\n\n");
  assert.equal(stripped.trim(), HEADERED_BUG.trim());
});

// ---------------------------------------------------------------------------
// Jira still receives an absolute URL — the half that must NOT change
// ---------------------------------------------------------------------------

test("resolveRelativeLink turns the relative href back into an absolute URL", () => {
  const dir = tmpdir();
  const file = writeDoc(
    dir,
    "docs/prd/x/story.7.4.bug.4.tap-target.md",
    BUG_DOC,
  );
  const resolver = lib.makeRelativeLinkResolver({
    filePath: file,
    repoRoot: dir,
    bbBase: BB,
    branch: "develop",
  });

  assert.equal(
    resolver("./story.7.4.bug.4.tap-target.md"),
    `${BB}/src/develop/docs/prd/x/story.7.4.bug.4.tap-target.md`,
  );
});

test("a relative link INSIDE the bug body is absolutised at ADF-render time", () => {
  // The acceptance criterion for this skill is link MARKS in the published ADF.
  // A bug report's prose routinely links its own parent with a relative href;
  // rendering it verbatim into a Jira description produces a dead link, because
  // Jira has no "relative to this file" base path.
  const dir = tmpdir();
  writeDoc(dir, "docs/prd/x/story.7.4.tap-targets.md", "# Story\n");
  const file = writeDoc(
    dir,
    "docs/prd/x/story.7.4.bug.4.tap-target.md",
    `---
type: bug
status: new
---

# Bug

## Bug Description

Violates [the story](./story.7.4.tap-targets.md) acceptance criteria.
`,
  );
  const resolver = lib.makeRelativeLinkResolver({
    filePath: file,
    repoRoot: dir,
    bbBase: BB,
    branch: "develop",
  });

  const adf = bugSync.buildDescriptionAdf({
    body: lib.parseFrontmatter(fs.readFileSync(file, "utf-8")).body,
    fields: FIELDS,
    bugBbUrl: `${BB}/src/develop/docs/prd/x/story.7.4.bug.4.tap-target.md`,
    parentDocUrl: null,
    parentDocLabel: "Parent story document",
    parentKey: null,
    parentUrl: null,
    epicDocUrl: null,
    relatedDocLinks: [],
    linkResolver: resolver,
    output: QUIET,
  });

  const hrefs = collectHrefs(adf);
  assert.ok(
    hrefs.includes(`${BB}/src/develop/docs/prd/x/story.7.4.tap-targets.md`),
    `the in-body relative link was not absolutised; hrefs were ${JSON.stringify(hrefs)}`,
  );
  assert.ok(
    !hrefs.some((h) => h.startsWith("./")),
    "a relative href reached the published ADF",
  );
});

test("a relative link to a file that does not exist is left as authored", () => {
  // Pre-existing contract: don't mask a broken link by absolutising it.
  const dir = tmpdir();
  const file = writeDoc(dir, "docs/a.md", BUG_DOC);
  const resolver = lib.makeRelativeLinkResolver({
    filePath: file,
    repoRoot: dir,
    bbBase: BB,
    branch: "develop",
  });

  assert.equal(resolver("./nope.md"), "./nope.md");
});

// Walk an ADF doc and return every link mark's href.
function collectHrefs(node, acc = []) {
  if (Array.isArray(node)) {
    for (const n of node) collectHrefs(n, acc);
    return acc;
  }
  if (!node || typeof node !== "object") return acc;
  for (const mark of node.marks || []) {
    if (mark.type === "link" && mark.attrs?.href) acc.push(mark.attrs.href);
  }
  if (node.content) collectHrefs(node.content, acc);
  return acc;
}

module.exports = { collectHrefs };
