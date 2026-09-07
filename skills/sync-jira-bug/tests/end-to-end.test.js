/**
 * End-to-end: sync a bug twice against a fake Jira, then READ THE ADF BACK.
 *
 * The acceptance criterion for this skill is stated in terms of what the API
 * holds, not what a page renders: a bug card whose description carries live
 * links to its bug file, its parent document and its parent's card, and whose
 * second run changes nothing.
 *
 * The measured failure this skill exists to fix was invisible from the rendered
 * page. On a live board, bug card RAPP-713 and its siblings RAPP-706/707/708
 * each had a description whose ADF contained **zero** `link` marks — the bug
 * report was a bare plain-text path — with `parent: null` and an empty
 * `remotelink` list. The card looked fine and linked to nothing.
 *
 * So these tests assert against the JSON the script actually PUT/POSTed, which
 * is the same bytes `GET /issue/{key}?fields=description` would return. They do
 * not stand in for the live run against a real tenant — a fake Jira cannot prove
 * a real board accepts the payload — but they do prove the half that was broken.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const bugSync = require("../scripts/sync-jira-bug.js");

const BB = "https://bitbucket.org/ws/repo";
const BASE = "https://example.atlassian.net";

const ENV = {
  JIRA_URL: BASE,
  JIRA_API_TOKEN: "t",
  JIRA_USER_EMAIL: "e@example.com",
  JIRA_PROJECT_KEY: "PROJ",
  BITBUCKET_REPO_URL: BB,
  JIRA_DOC_BRANCH: "develop",
};

// ---------------------------------------------------------------------------
// A fake Jira: enough of the API for one create and one update.
// ---------------------------------------------------------------------------
function fakeJira() {
  const state = {
    issues: {},
    links: [],
    labels: {},
    requests: [],
    nextKey: 901,
  };
  const ok = (body) => ({
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });

  const fetchImpl = async (url, opts = {}) => {
    const method = opts.method || "GET";
    const body = opts.body ? JSON.parse(opts.body) : null;
    state.requests.push({ url, method, body });

    if (url.includes("/rest/api/3/priority"))
      return ok([{ name: "Highest" }, { name: "High" }, { name: "Medium" }]);

    if (url.includes("/rest/api/3/search/jql")) {
      const m = /labels = "([^"]+)"/.exec(body.jql || "");
      const key = m && state.labels[m[1]];
      return ok({ issues: key ? [{ key, fields: {} }] : [] });
    }

    if (url.includes("/issuetypes") || url.includes("createmeta"))
      return ok({ issueTypes: [{ id: "10004", name: "Bug" }] });

    if (url.includes("/rest/api/3/issueLinkType"))
      return ok({
        issueLinkTypes: [
          {
            id: "10",
            name: "Blocks",
            inward: "is blocked by",
            outward: "blocks",
          },
          {
            id: "20",
            name: "Relates",
            inward: "relates to",
            outward: "relates to",
          },
        ],
      });

    if (url.includes("/rest/api/3/issueLink") && method === "POST") {
      state.links.push(body);
      return {
        ok: true,
        status: 201,
        json: async () => ({}),
        text: async () => "",
      };
    }

    // Board config — report Kanban so backlog placement is skipped cleanly.
    if (url.includes("/board/") && url.includes("/configuration"))
      return ok({ type: "kanban" });

    const issueMatch = /\/rest\/api\/3\/issue\/([A-Z]+-\d+)/.exec(url);
    if (issueMatch) {
      const key = issueMatch[1];
      const issue = state.issues[key];
      if (!issue)
        return {
          ok: false,
          status: 404,
          json: async () => ({}),
          text: async () => "",
        };

      if (url.includes("/transitions")) {
        const available = [
          { id: "21", name: "Start", to: { name: "In Progress" } },
          {
            id: "41",
            name: "Close",
            to: { name: "Done", statusCategory: { key: "done" } },
          },
        ];
        if (method === "POST") {
          // Apply it. A stub whose status never moves would make every run look
          // like a fresh transition, and the "second run changes nothing"
          // assertion below would be testing the stub rather than the skill.
          const chosen = available.find((t) => t.id === body.transition.id);
          if (chosen) issue.status = chosen.to.name;
          issue.updated = new Date(Date.now() + 1000).toISOString();
          return {
            ok: true,
            status: 204,
            json: async () => ({}),
            text: async () => "",
          };
        }
        return ok({ transitions: available });
      }

      if (method === "PUT") {
        Object.assign(issue.fields, body.fields);
        issue.updated = new Date(Date.now() + 1000).toISOString();
        return ok({ fields: { ...issue.fields, updated: issue.updated } });
      }

      if (url.includes("fields=issuelinks"))
        return ok({
          fields: {
            issuelinks: state.links
              .filter((l) => l.inwardIssue.key === key)
              .map((l) => ({
                type: { name: l.type.name },
                outwardIssue: { key: l.outwardIssue.key },
              })),
          },
        });

      return ok({
        key,
        fields: {
          ...issue.fields,
          updated: issue.updated,
          status: { name: issue.status },
        },
      });
    }

    if (url.endsWith("/rest/api/3/issue") && method === "POST") {
      const key = `PROJ-${state.nextKey++}`;
      state.issues[key] = {
        fields: { ...body.fields },
        updated: new Date().toISOString(),
        status: "To Do",
      };
      for (const l of body.fields.labels || []) state.labels[l] = key;
      return {
        ok: true,
        status: 201,
        json: async () => ({ key }),
        text: async () => "",
      };
    }

    return {
      ok: false,
      status: 404,
      json: async () => ({}),
      text: async () => "",
    };
  };

  return { state, fetchImpl };
}

// Walk an ADF doc and return every link mark's href, in document order.
function hrefsIn(node, acc = []) {
  if (Array.isArray(node)) {
    for (const n of node) hrefsIn(n, acc);
    return acc;
  }
  if (!node || typeof node !== "object") return acc;
  for (const mark of node.marks || [])
    if (mark.type === "link" && mark.attrs?.href) acc.push(mark.attrs.href);
  if (node.content) hrefsIn(node.content, acc);
  return acc;
}

// The description the fake Jira is holding — the same bytes
// `GET /issue/{key}?fields=description` would hand back.
function descriptionOf(state, key) {
  return state.issues[key].fields.description;
}

// ---------------------------------------------------------------------------
// A repo on disk, because the script resolves paths and links from a real tree.
// ---------------------------------------------------------------------------
function repoWithStoryBug() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bug-e2e-"));
  const real = fs.realpathSync(dir);
  execFileSync("git", ["init", "-q"], { cwd: real });

  const docs = path.join(real, "docs", "prd", "epic-7");
  fs.mkdirSync(docs, { recursive: true });
  fs.mkdirSync(path.join(real, "docs", "prd"), { recursive: true });

  fs.writeFileSync(
    path.join(real, "docs", "prd", "epic.7.checkout.md"),
    "---\ntype: epic\n---\n\n# Epic 7\n",
  );
  fs.writeFileSync(
    path.join(docs, "story.7.4.tap-targets.md"),
    "---\ntype: story\njira_key: PROJ-123\nepic_source: ../epic.7.checkout.md\n---\n\n# Story 7.4\n",
  );
  fs.writeFileSync(
    path.join(docs, "story.7.4.bug.4.review.1.tap-target.md"),
    "# Bug review\n",
  );

  const bug = path.join(docs, "story.7.4.bug.4.tap-target.md");
  fs.writeFileSync(
    bug,
    `---
type: bug
status: in-progress
severity: 'Major'
priority: 'High'
created: 2026-09-07
related: 'story 7.4'
description: 'Tap target below the 44px minimum'
---

# Bug: Tap target below the 44px minimum

## Bug Description

The primary control renders at 24px, below the 44px minimum. It violates
[the story](./story.7.4.tap-targets.md) acceptance criteria.

## Reproduction Steps

1. Open the checkout screen.
2. Measure the confirm control.

## Acceptance Criteria Violation

- AC-3 requires a 44px minimum tap target.

## Status History

| Date       | Status | Changed By | Notes       |
| ---------- | ------ | ---------- | ----------- |
| 2026-09-01 | new    | QA         | Bug created |

## Resolution Summary

[Will be completed when bug is closed]
`,
  );
  return { root: real, bug };
}

async function runSync(root, bug, fetchImpl, extraArgs = []) {
  const cwd = process.cwd();
  const saved = {};
  for (const [k, v] of Object.entries(ENV)) {
    saved[k] = process.env[k];
    process.env[k] = v;
  }
  process.chdir(root);
  try {
    return await bugSync.run({
      argv: ["node", "sync-jira-bug", "--file", bug, ...extraArgs],
      fetchImpl,
    });
  } finally {
    process.chdir(cwd);
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

// ===========================================================================
// The acceptance criterion
// ===========================================================================

test("a story bug synced twice produces ONE card, fully linked, and the second run changes nothing", async () => {
  const { root, bug } = repoWithStoryBug();
  const { state, fetchImpl } = fakeJira();

  // ---- first run: create -------------------------------------------------
  const first = await runSync(root, bug, fetchImpl, ["--quiet"]);
  const key = first.result.issueKey;
  assert.equal(key, "PROJ-901");
  assert.equal(first.isUpdate, false);

  // ---- the ADF, read back ------------------------------------------------
  const hrefs = hrefsIn(descriptionOf(state, key));
  assert.ok(
    hrefs.length >= 4,
    `expected >= 4 link marks in the description ADF, got ${hrefs.length}: ${JSON.stringify(hrefs, null, 2)}`,
  );

  const relPath = (p) => `${BB}/src/develop/${p}`;
  for (const want of [
    relPath("docs/prd/epic-7/story.7.4.bug.4.tap-target.md"), // the bug file
    relPath("docs/prd/epic-7/story.7.4.tap-targets.md"), // the parent story doc
    `${BASE}/browse/PROJ-123`, // the parent's CARD
    relPath("docs/prd/epic.7.checkout.md"), // the epic doc
  ]) {
    assert.ok(
      hrefs.includes(want),
      `the card does not link ${want}\nlinks were:\n${hrefs.join("\n")}`,
    );
  }

  // Not one relative or plain-text path survived into the published ADF — the
  // exact defect measured on RAPP-713.
  assert.ok(
    hrefs.every((h) => /^https?:\/\//.test(h)),
    `a non-absolute href reached the card: ${hrefs.filter((h) => !/^https?:\/\//.test(h))}`,
  );

  // ---- the issue link ----------------------------------------------------
  assert.equal(state.links.length, 1);
  assert.deepEqual(state.links[0], {
    type: { name: "Relates" },
    inwardIssue: { key },
    outwardIssue: { key: "PROJ-123" },
  });
  assert.equal(first.linkOutcome.linked, true);

  // ---- the local file ----------------------------------------------------
  const afterFirst = fs.readFileSync(bug, "utf-8");
  assert.match(afterFirst, /^jira_key: "?PROJ-901"?$/m);
  assert.match(afterFirst, /^\*\*Jira\*\*: \[PROJ-901\]/m);
  assert.match(
    afterFirst,
    /\| .* \| in-progress \| sync-jira-bug \| Jira bug created \(PROJ-901\) \|/,
  );

  // ---- second run: no-op -------------------------------------------------
  const before = fs.readFileSync(bug, "utf-8");
  const linksBefore = state.links.length;
  const second = await runSync(root, bug, fetchImpl, ["--quiet"]);

  assert.equal(second.isUpdate, true, "the second run created a second card");
  assert.equal(second.result.issueKey, key);
  assert.equal(
    second.changeSummary,
    "Sync (no field changes detected)",
    "the second run thought something had changed",
  );
  assert.equal(second.linkOutcome.reason, "already");
  assert.equal(
    state.links.length,
    linksBefore,
    "a duplicate issue link was created",
  );
  assert.equal(
    Object.keys(state.issues).length,
    1,
    "a second card was created",
  );

  // The bug file is byte-identical apart from the refreshed sync timestamp,
  // which moves because the fake Jira's `updated` moves on every PUT.
  const after = fs.readFileSync(bug, "utf-8");
  const strip = (t) => t.replace(/^jira_last_synced_at:.*$/m, "");
  assert.equal(
    strip(after),
    strip(before),
    "the second run rewrote the document",
  );

  // And the description it holds is the same document as before.
  assert.deepEqual(hrefsIn(descriptionOf(state, key)), hrefs);
});

test("deleting jira_key adopts the existing card instead of creating a second", async () => {
  // The synced-from-* label search is the sole guarantor of idempotent create
  // when the write-back does not happen.
  const { root, bug } = repoWithStoryBug();
  const { state, fetchImpl } = fakeJira();

  await runSync(root, bug, fetchImpl, ["--quiet"]);
  assert.equal(Object.keys(state.issues).length, 1);

  fs.writeFileSync(
    bug,
    fs.readFileSync(bug, "utf-8").replace(/^jira_key:.*\n/m, ""),
    "utf-8",
  );

  const again = await runSync(root, bug, fetchImpl, ["--quiet"]);
  assert.equal(
    Object.keys(state.issues).length,
    1,
    "the label search failed to adopt the existing card",
  );
  assert.equal(again.result.issueKey, "PROJ-901");
});

test("a general bug's card links the bug report and the registry, and takes no issue link", async () => {
  const dir = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "bug-e2e-gen-")),
  );
  execFileSync("git", ["init", "-q"], { cwd: dir });
  const bugsDir = path.join(dir, "docs", "bugs", "bug.12.a-thing");
  fs.mkdirSync(bugsDir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "docs", "bugs", "bug-registry.md"),
    "# Bug Registry\n",
  );
  const bug = path.join(bugsDir, "bug.12.a-thing.md");
  fs.writeFileSync(
    bug,
    `---
type: bug
status: new
severity: 'Minor'
priority: 'Low'
created: 2026-09-07
related: 'none — cross-cutting (no single owner)'
description: 'A cross-cutting thing'
---

# Bug: A cross-cutting thing

## Bug Description

It is broken everywhere.

## Reproduction Steps

1. Look.

## Scope & Impact

- Affects every screen.
`,
  );

  const { state, fetchImpl } = fakeJira();
  const res = await runSync(dir, bug, fetchImpl, ["--quiet"]);
  const hrefs = hrefsIn(descriptionOf(state, res.result.issueKey));

  assert.deepEqual(hrefs, [
    `${BB}/src/develop/docs/bugs/bug.12.a-thing/bug.12.a-thing.md`,
    `${BB}/src/develop/docs/bugs/bug-registry.md`,
  ]);
  assert.equal(state.links.length, 0, "a cross-cutting bug was given a parent");
  assert.equal(res.linkOutcome, null);
});

test("a bug with NO frontmatter is created, keyed, and converges on the second run", async () => {
  const dir = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "bug-e2e-nf-")),
  );
  execFileSync("git", ["init", "-q"], { cwd: dir });
  const tasks = path.join(dir, "docs", "tasks", "task.67.qa-gate");
  fs.mkdirSync(tasks, { recursive: true });
  fs.writeFileSync(
    path.join(tasks, "task.67.qa-gate.md"),
    "---\ntype: task\njira_key: PROJ-500\n---\n\n# Task 67\n",
  );
  const bug = path.join(tasks, "task.67.bug.3.names.md");
  fs.writeFileSync(
    bug,
    `# Bug: Obfuscated names

**Bug ID**: task.67.bug.3
**Related**: task 67
**Status**: 🔄 In Progress
**Priority**: High
**Severity**: Major
**Created**: 2026-07-21

## Bug Description

Names are obfuscated.

## Reproduction Steps

1. Run it.

## Success Criteria Violation

- SC-2 is not met.
`,
  );
  const originalBody = fs.readFileSync(bug, "utf-8");

  const { state, fetchImpl } = fakeJira();
  const first = await runSync(dir, bug, fetchImpl, ["--quiet"]);

  const written = fs.readFileSync(bug, "utf-8");
  assert.ok(written.startsWith("---\n"), "frontmatter was not adopted");
  assert.match(written, /^jira_key: "?PROJ-901"?$/m);
  assert.match(
    written,
    /^status: "?in-progress"?$/m,
    "the emoji status was not mapped",
  );
  assert.match(written, /^severity: "?Major"?$/m);

  // The body survived verbatim apart from the two upserted link lines.
  const body = written
    .slice(written.indexOf("\n---\n", 3) + 5)
    .replace(/^\n+/, "");
  const stripped = body
    .replace(/^\*\*Jira\*\*:.*\n/m, "")
    .replace(/^\*\*Bug File\*\*:.*\n/m, "")
    .replace(/## Status History[\s\S]*$/m, "")
    .replace(/\n{3,}/g, "\n\n");
  assert.equal(stripped.trim(), originalBody.trim());

  // Linked to the parent task's card, and the card links the task document.
  assert.equal(state.links[0].outwardIssue.key, "PROJ-500");
  const hrefs = hrefsIn(descriptionOf(state, first.result.issueKey));
  assert.ok(hrefs.includes(`${BASE}/browse/PROJ-500`));
  assert.ok(
    hrefs.includes(
      `${BB}/src/develop/docs/tasks/task.67.qa-gate/task.67.qa-gate.md`,
    ),
  );

  // Second run converges: one card, one link, no new history row.
  const before = fs.readFileSync(bug, "utf-8");
  const second = await runSync(dir, bug, fetchImpl, ["--quiet"]);
  assert.equal(Object.keys(state.issues).length, 1);
  assert.equal(state.links.length, 1);
  assert.equal(second.changeSummary, "Sync (no field changes detected)");
  const strip = (t) => t.replace(/^jira_last_synced_at:.*$/m, "");
  assert.equal(strip(fs.readFileSync(bug, "utf-8")), strip(before));
});

test("a parent with no card links the document only, and the link lands on a later run", async () => {
  const { root, bug } = repoWithStoryBug();
  const story = path.join(root, "docs/prd/epic-7/story.7.4.tap-targets.md");
  fs.writeFileSync(
    story,
    fs.readFileSync(story, "utf-8").replace(/^jira_key:.*\n/m, ""),
  );

  const { state, fetchImpl } = fakeJira();
  const first = await runSync(root, bug, fetchImpl, ["--quiet"]);

  assert.equal(
    state.links.length,
    0,
    "a link was made to a card that does not exist",
  );
  assert.equal(first.linkOutcome, null);
  const hrefs = hrefsIn(descriptionOf(state, first.result.issueKey));
  assert.ok(
    hrefs.includes(
      `${BB}/src/develop/docs/prd/epic-7/story.7.4.tap-targets.md`,
    ),
    "the parent document was not linked either",
  );
  assert.ok(!hrefs.some((h) => h.includes("/browse/PROJ-123")));

  // The parent gets its card later; the bug's next sync is what connects them.
  fs.writeFileSync(
    story,
    fs
      .readFileSync(story, "utf-8")
      .replace("type: story", "type: story\njira_key: PROJ-123"),
  );
  const second = await runSync(root, bug, fetchImpl, ["--quiet"]);
  assert.equal(second.linkOutcome.linked, true);
  assert.equal(state.links.length, 1);
  assert.ok(
    hrefsIn(descriptionOf(state, first.result.issueKey)).includes(
      `${BASE}/browse/PROJ-123`,
    ),
    "the card link was made but the description was not refreshed",
  );
});
