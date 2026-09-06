// jira-sync-no-transition.test.mjs — the `--no-transition` status-neutral gate
//
// Guards bug.11: `sync-jira-*` had no way to be status-neutral. `syncDocumentStatus`
// ran whenever a document's frontmatter carried a `status:`, so finalise's Step 7
// Document-link re-point was unavoidably ALSO a status decision — resolved by a
// second resolver (`loadStatusMap`) after the tracker-workflow ladder had already
// made the call. On a consumer mapping `accepted` to a non-terminal column, that
// second resolver walked the card back OUT of the terminal status the ladder had
// just set, stranding the resolution it was closed with (observed: RAPP-715,
// 2026-09-05 — closed to `Done`/`resolution: Done`, returned to `Waiting for
// Review` still carrying `resolution: Done`).
//
//   A — the gate itself.   `noTransition` issues ZERO HTTP requests and reports
//                          `reason: "transition-suppressed"`. Asserting on the request
//                          log rather than the return value is the point: the
//                          defect was a request being SENT, so "no request was
//                          made" is the only assertion that actually holds it.
//   B — exit semantics.    `no-transition` is a run behaving as configured, so
//                          it must exit 0 even under `--fail-on-status-skip`.
//                          Without this, `--no-transition --fail-on-status-skip`
//                          would fail every run that used both.
//   C — no Change Log row. Nothing moved, so nothing is an event worth a row.
//   D — the flag reaches   All three CLIs must parse `--no-transition`; a flag
//       every CLI.         wired into two of three is the failure mode that made
//                          this bug reachable from finalise in the first place.

import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const lib = require(join(__dirname, "..", "jira-sync.js"));

const REPO = join(__dirname, "..", "..", "..");

// An http double that records every request and fails loudly if one is made.
// `syncDocumentStatus` reaches Jira through `http`, so an untouched log is
// proof no transition was attempted — not merely that none was reported.
function recordingHttp() {
  const calls = [];
  const handler = async (url, opts) => {
    calls.push({ url, method: (opts && opts.method) || "GET" });
    return {
      ok: true,
      status: 200,
      json: async () => ({ transitions: [] }),
      text: async () => "",
    };
  };
  return { calls, http: lib.makeHttp({ fetchImpl: handler }) };
}

const BASE = {
  baseUrl: "https://example.atlassian.net",
  email: "e@example.com",
  token: "t",
  issueKey: "PROJ-715",
  docKind: "task",
  repoRoot: REPO,
};

// ---------------------------------------------------------------------------
// A — the gate issues no HTTP at all
// ---------------------------------------------------------------------------

test("A: noTransition makes syncDocumentStatus issue zero HTTP requests", async () => {
  const { calls, http } = recordingHttp();
  const out = await lib.syncDocumentStatus({
    ...BASE,
    http,
    localStatus: "accepted",
    currentStatus: "Done",
    noTransition: true,
  });

  assert.equal(
    calls.length,
    0,
    `expected no Jira requests, got: ${JSON.stringify(calls)}`,
  );
  assert.equal(out.transitioned, false);
  assert.equal(out.reason, "transition-suppressed");
  assert.equal(out.issueKey, "PROJ-715");
  assert.equal(out.localStatus, "accepted");
});

test("A2: without noTransition the same call DOES reach Jira", async () => {
  // The negative half. Without it, test A would still pass if the function had
  // simply stopped working — "made no request" has to be caused by the flag.
  const { calls, http } = recordingHttp();
  await lib.syncDocumentStatus({
    ...BASE,
    http,
    localStatus: "accepted",
    currentStatus: "In Review",
    noTransition: false,
  });

  assert.ok(
    calls.length > 0,
    "expected the un-flagged call to reach Jira; it made no request at all, " +
      "so test A proves nothing about the flag",
  );
});

test("A3: noTransition defaults to false — omitting it is unchanged behaviour", async () => {
  const { calls, http } = recordingHttp();
  await lib.syncDocumentStatus({
    ...BASE,
    http,
    localStatus: "accepted",
    currentStatus: "In Review",
  });
  assert.ok(calls.length > 0, "omitting the flag must not suppress the sync");
});

// ---------------------------------------------------------------------------
// B — exit semantics: asked-for is never a skip
// ---------------------------------------------------------------------------

test("B: a transition-suppressed outcome exits 0 even under --fail-on-status-skip", () => {
  const outcome = {
    transitioned: false,
    reason: "transition-suppressed",
    issueKey: "PROJ-715",
    localStatus: "accepted",
  };
  assert.equal(
    lib.summariseStatusOutcome(outcome, { failOnSkip: true, repoRoot: REPO }),
    0,
    "--no-transition --fail-on-status-skip must not fail a run that did " +
      "exactly what it was told to do",
  );
  assert.equal(
    lib.summariseStatusOutcome(outcome, { failOnSkip: false, repoRoot: REPO }),
    0,
  );
});

test("B2: a genuine `no-transition` skip still fails under --fail-on-status-skip", () => {
  // The near-miss this test exists for. `no-transition` was ALREADY a reason in
  // this module, meaning "the workflow offers no matching transition from here"
  // — a real skip. The first version of the suppression gate reused that exact
  // string and added it to summariseStatusOutcome's zero-exit list, which would
  // have silently stopped every genuine unreachable-transition skip from failing
  // under --fail-on-status-skip. Hence `transition-suppressed` as a distinct
  // name, and hence this test asserting on the ORIGINAL name specifically.
  const outcome = {
    transitioned: false,
    reason: "no-transition",
    issueKey: "PROJ-715",
    localStatus: "accepted",
  };
  assert.notEqual(
    lib.summariseStatusOutcome(outcome, {
      failOnSkip: true,
      repoRoot: REPO,
      output: { warn() {}, info() {} },
    }),
    0,
  );
});

// ---------------------------------------------------------------------------
// C — nothing moved, so nothing is logged
// ---------------------------------------------------------------------------

test("C: a transition-suppressed outcome writes no Change Log status row", () => {
  const entries = lib.buildChangeLogEntries({
    created: false,
    issueKey: "PROJ-715",
    statusOutcome: { transitioned: false, reason: "transition-suppressed" },
    author: "sync-jira-task",
    docNoun: "task",
    date: "2026-09-06",
  });
  assert.deepEqual(entries, []);
});

// ---------------------------------------------------------------------------
// D — every CLI parses the flag
// ---------------------------------------------------------------------------

const CLIS = [
  ["task", "skills/sync-jira-task/scripts/sync-jira-task.js"],
  ["story", "skills/sync-jira-story/scripts/sync-jira-story.js"],
  ["epic", "skills/sync-jira-epic/scripts/sync-jira-epic.js"],
];

for (const [kind, rel] of CLIS) {
  test(`D: sync-jira-${kind} parses --no-transition`, () => {
    const cli = require(join(REPO, rel));
    const argv = ["node", "x", "--file", "doc.md", "--no-transition"];
    assert.equal(cli.parseArgs(argv).noTransition, true);
  });

  test(`D: sync-jira-${kind} defaults noTransition to false`, () => {
    const cli = require(join(REPO, rel));
    const argv = ["node", "x", "--file", "doc.md"];
    assert.equal(cli.parseArgs(argv).noTransition, false);
  });
}

// ---------------------------------------------------------------------------
// E — every call site forwards the flag
// ---------------------------------------------------------------------------
//
// This block is a STRUCTURAL invariant, not a behavioural one, and that is a
// deliberate and bounded exception. Tests A–D hold the gate and the parsing;
// what none of them can see is a CLI that parses `--no-transition` correctly and
// then forgets to pass it at one call site. That is not hypothetical — it is
// exactly what happened while fixing this bug: `sync-jira-epic` has TWO
// `syncDocumentStatus` call sites (the normal path and the no-field-changes skip
// path), the first patch wired only one, and every behavioural test above still
// passed. An epic synced with `--no-transition` whose body had not changed would
// have transitioned anyway — the precise defect bug.11 is about, reintroduced.
//
// The behavioural alternative is to drive each CLI's `run()` with a mocked Jira
// and assert no request reaches `/transitions`. That was tried and rejected:
// `run()` reaches the status block only after live-priority resolution, an
// idempotency search, an issue GET and a PUT, so the test would assert far more
// about the shape of the mock than about the flag, and would break on changes
// that have nothing to do with this invariant.
//
// So: a source-level check, scoped to one question, that fails loudly and names
// the file and offset. It proves the argument is present, not that it is
// honoured — tests A–C are what prove the honouring, once it arrives.

function callSiteArgObjects(src) {
  // Extract the `{...}` argument of each `syncDocumentStatus(` call by brace
  // balancing, so nested objects and template literals don't truncate it.
  const objs = [];
  const needle = "syncDocumentStatus({";
  let i = src.indexOf(needle);
  while (i !== -1) {
    let depth = 0;
    let j = i + needle.length - 1; // at the opening brace
    for (; j < src.length; j++) {
      if (src[j] === "{") depth++;
      else if (src[j] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    objs.push({ offset: i, text: src.slice(i, j + 1) });
    i = src.indexOf(needle, j);
  }
  return objs;
}

for (const [kind, rel] of CLIS) {
  test(`E: every sync-jira-${kind} syncDocumentStatus call forwards noTransition`, async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(join(REPO, rel), "utf8");
    const sites = callSiteArgObjects(src);

    assert.ok(
      sites.length >= 1,
      `found no syncDocumentStatus call sites in ${rel} — if the call was ` +
        `renamed or removed, update this test rather than deleting it`,
    );

    for (const site of sites) {
      assert.match(
        site.text,
        /\bnoTransition:/,
        `${rel}: the syncDocumentStatus call at offset ${site.offset} does not ` +
          `forward noTransition, so --no-transition is silently ignored on ` +
          `that path`,
      );
    }
  });
}

test("E2: sync-jira-epic has both of its call sites covered", () => {
  // Pins the count that made the miss possible. If a third path appears, this
  // fails and whoever added it has to decide consciously whether it transitions.
  const { readFileSync } = require("node:fs");
  const src = readFileSync(
    join(REPO, "skills/sync-jira-epic/scripts/sync-jira-epic.js"),
    "utf8",
  );
  assert.equal(
    callSiteArgObjects(src).length,
    2,
    "sync-jira-epic is expected to have exactly two syncDocumentStatus call " +
      "sites (the normal path and the no-field-changes skip path)",
  );
});
