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
//                          Driven end-to-end off the gate's real return value, not a
//                          hand-written outcome, which would pin nothing.
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

// A double that OFFERS a matching transition, so the un-gated path really does
// move the card. `recordingHttp` answers `{transitions: []}`, under which an
// un-gated call cannot reach `transitioned: true` at all — which is why tests
// built on it cannot detect the gate being REMOVED, only its return shape being
// changed. C and C2 use this one instead.
function transitioningHttp() {
  const calls = [];
  const handler = async (url, opts) => {
    const method = (opts && opts.method) || "GET";
    calls.push({ url, method });
    if (method === "GET")
      return {
        ok: true,
        status: 200,
        json: async () => ({
          transitions: [
            { id: "31", name: "Done", to: { name: "Done", id: "3" } },
          ],
        }),
      };
    return {
      ok: true,
      status: 204,
      json: async () => ({}),
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

// The fixture for C/C2 is chosen so the UN-GATED path would visibly do
// something. `currentStatus: "Done"` — the obvious choice — is useless here:
// "Done" is already in the `accepted` candidate list, so an un-gated call
// short-circuits with `reason: "already"` and no HTTP, and C would pass with the
// gate deleted. That is the tautology this test was rewritten to escape, so the
// fixture, not just the plumbing, is load-bearing. "In Review" is not a
// candidate, and `transitioningHttp` offers a real "Done" transition, so without
// the gate this call transitions and earns a Change Log row.
const SUPPRESSED = {
  localStatus: "accepted",
  currentStatus: "In Review",
  noTransition: true,
};

test("C: a suppressed sync writes no Change Log row — and would without the gate", async () => {
  const { calls, http } = transitioningHttp();
  const outcome = await lib.syncDocumentStatus({
    ...BASE,
    http,
    ...SUPPRESSED,
  });

  assert.equal(calls.length, 0, "the suppressed call must issue no request");
  const entries = lib.buildChangeLogEntries({
    created: false,
    issueKey: "PROJ-715",
    statusOutcome: outcome,
    author: "sync-jira-task",
    docNoun: "task",
    date: "2026-09-06",
  });
  assert.deepEqual(entries, []);
});

test("C0: the fixture is sound — un-gated, this same call DOES earn a row", async () => {
  // The control for C. Without it C proves nothing: "no Change Log row" is the
  // default for almost any outcome, so C is only meaningful if the identical
  // call, un-gated, produces one. If this ever goes red the fixture has drifted
  // and C has quietly become tautological again.
  const { http } = transitioningHttp();
  const outcome = await lib.syncDocumentStatus({
    ...BASE,
    http,
    ...SUPPRESSED,
    noTransition: false,
  });

  assert.equal(
    outcome.transitioned,
    true,
    `expected a real transition, got ${JSON.stringify(outcome)}`,
  );
  const entries = lib.buildChangeLogEntries({
    created: false,
    issueKey: "PROJ-715",
    statusOutcome: outcome,
    author: "sync-jira-task",
    docNoun: "task",
    date: "2026-09-06",
  });
  assert.equal(entries.length, 1);
});

test("C2: the same real outcome is also exit-0 under --fail-on-status-skip", async () => {
  // The end-to-end twin of B. B pins a hand-written reason string; this pins
  // that the object the gate actually produces satisfies it.
  const { http } = transitioningHttp();
  const outcome = await lib.syncDocumentStatus({
    ...BASE,
    http,
    ...SUPPRESSED,
  });
  assert.equal(outcome.reason, "transition-suppressed");
  assert.equal(
    lib.summariseStatusOutcome(outcome, { failOnSkip: true, repoRoot: REPO }),
    0,
  );
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
  // balancing.
  //
  // Three deliberate hardenings, each closing a way this check could pass while
  // the invariant it guards is broken:
  //   - the call is matched by REGEX allowing whitespace, so reformatting the
  //     call to `syncDocumentStatus(\n  {` does not make a site invisible;
  //   - an UNBALANCED slice is reported rather than silently returning the rest
  //     of the file, which would let a *later* call site's `noTransition:`
  //     satisfy an earlier one's assertion — a false pass in exactly the miss
  //     this test exists to catch;
  //   - the brace counter is naive about braces inside strings and comments.
  //     That is accepted: these are four known call sites in reviewed code, and
  //     the `balanced` flag turns a mis-slice into a failure rather than a
  //     false pass.
  const objs = [];
  const re = /syncDocumentStatus\(\s*\{/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    let depth = 0;
    let j = m.index + m[0].length - 1; // at the opening brace
    let balanced = false;
    for (; j < src.length; j++) {
      if (src[j] === "{") depth++;
      else if (src[j] === "}") {
        depth--;
        if (depth === 0) {
          balanced = true;
          break;
        }
      }
    }
    objs.push({ offset: m.index, text: src.slice(m.index, j + 1), balanced });
    re.lastIndex = j;
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
      assert.ok(
        site.balanced,
        `${rel}: could not find the closing brace of the syncDocumentStatus ` +
          `call at offset ${site.offset}; the extractor mis-sliced, so a pass ` +
          `here would be meaningless`,
      );
      // The VALUE, not just the key. `noTransition: false` hardcoded would
      // satisfy a presence-only check while ignoring the flag entirely.
      assert.match(
        site.text,
        /\bnoTransition:\s*args\.noTransition\b/,
        `${rel}: the syncDocumentStatus call at offset ${site.offset} does not ` +
          `forward args.noTransition, so --no-transition is silently ignored ` +
          `on that path`,
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

// ---------------------------------------------------------------------------
// F — no shipped text still claims the transition ALWAYS runs
// ---------------------------------------------------------------------------
//
// A documentation invariant, and the right tool for a documentation defect.
// "The status transition still runs" was true, and stated as an unconditional,
// in five places across the sync skills' prose, step lists and runtime output.
// `--no-transition` falsified all five at once. The sweep for them missed one on
// the first pass and a different one on the second — a doc-level absolute is
// exactly the kind of claim that is cheap to write, invisible to every
// behavioural test, and wrong the moment an opt-out exists.
//
// This asserts the qualification travels with the claim, wherever the claim is.

test("F: every 'status transition still runs' claim is qualified", async () => {
  const { readFileSync } = await import("node:fs");
  const { globSync } = await import("node:fs");

  const files = [
    "skills/sync-jira-task/SKILL.md",
    "skills/sync-jira-story/SKILL.md",
    "skills/sync-jira-epic/SKILL.md",
    "skills/sync-jira-task/scripts/sync-jira-task.js",
    "skills/sync-jira-story/scripts/sync-jira-story.js",
    "skills/sync-jira-epic/scripts/sync-jira-epic.js",
  ];

  const unqualified = [];
  for (const rel of files) {
    const lines = readFileSync(join(REPO, rel), "utf8").split("\n");
    lines.forEach((line, i) => {
      if (!/status transitions?\s+(still\s+)?runs?/i.test(line)) return;
      // Qualified if the exemption is named anywhere in the surrounding few
      // lines. The window looks BOTH ways and is deliberately generous: a
      // ternary names the flag on the branch line above its else-arm, and a
      // prose comment can carry the caveat a paragraph below the claim. A
      // forward-only 3-line window flagged both as violations on first run.
      const window = lines.slice(Math.max(0, i - 6), i + 8).join(" ");
      if (/--no-transition|noTransition/.test(window)) return;
      unqualified.push(`${rel}:${i + 1}: ${line.trim()}`);
    });
  }

  assert.deepEqual(
    unqualified,
    [],
    "these still assert the transition always runs, which --no-transition " +
      "falsifies:\n  " +
      unqualified.join("\n  "),
  );
});

// ---------------------------------------------------------------------------
// G — every WRITING sync-jira-* invocation in shipped prose is a conscious
//     status decision
// ---------------------------------------------------------------------------
//
// Guards bug.12, which is bug.11's defect at the three call sites bug.11 did not
// reach. bug.11 built `--no-transition` and wired it into finalise's re-link —
// the one caller it had observed. `review-story` 9.6, `review-task` 8.6 and
// `review-epic` 11.5 all describe themselves as body/link-only syncs and all
// still let `loadStatusMap` re-resolve the card's status afterwards, walking it
// back out of the position the tracker-workflow ladder had just set.
//
// The failure mode is ENUMERATION, not logic: the flag worked perfectly, and
// whoever wired it simply listed one caller instead of four. A behavioural test
// cannot catch that — every individual call is correct in isolation. Only a
// check over the whole population can, which is why this asserts on shipped
// prose. That is not a proxy for behaviour here: a SKILL.md bash block IS the
// program, executed by an agent, exactly as tests E and F already treat it.
//
// The rule: an invocation that WRITES must either carry `--no-transition`, or
// be named below as a deliberate status push. Read-only invocations classify
// themselves out via `--check-card`, `--probe-workflow` or `--dry-run`.

// Deliberate status pushes: syncs whose PURPOSE is to move the card. Keyed by
// file plus a heading prefix, because `review-story/SKILL.md` holds one of each
// kind — Step 9.6 (body-only, must carry the flag) and Step 10 (the push) — and
// a file-level allowlist would silently re-admit the very defect this guards.
// Every entry must still match a real site (asserted in G2), so the list cannot
// rot into a set of permanent excuses for sites that no longer exist.
const DELIBERATE_STATUS_PUSHES = [
  ["skills/review-story/SKILL.md", "Step 10: Update Document Status"],
  ["skills/ensure-story-jira-issue/SKILL.md", "Step SJ4:"],
  ["skills/ensure-task-jira-issue/SKILL.md", "Step TJ4:"],
  ["skills/ensure-epic-jira-issue/SKILL.md", "Step EJ4:"],
  // The sync skills documenting their own end-to-end behaviour. A full sync is
  // what these skills ARE; suppressing the transition in their own worked
  // example would document the opposite of what they do.
  ["skills/sync-jira-story/SKILL.md", "4. Sync the Story"],
  ["skills/sync-jira-task/SKILL.md", "4. Sync the Task"],
  ["skills/sync-jira-epic/SKILL.md", "3. Sync the Epic"],
];

// `sync-jira-${WORKITEM}.js` is a real, shipped form — finalise builds the
// script path from a variable. A literal-only pattern would make that site
// invisible to this check, which is the same "invisible to grep" trap the
// repo has been bitten by before.
const INVOCATION =
  /sync-jira-(?:story|task|epic|\$\{[A-Za-z_][A-Za-z0-9_]*\})\.js\b/;
const READ_ONLY = /--check-card\b|--probe-workflow\b|--dry-run\b/;

/**
 * Every `node …sync-jira-*.js…` invocation in shipped prose, with the whole
 * logical command (line continuations joined) and the heading it sits under.
 *
 * Only `skills/` and `shared/resources/` are scanned: those are the files an
 * agent executes. `docs/` describes the defect — including quoting the broken
 * command lines verbatim, as bug.12's own report does — and scanning it would
 * make the guard fail on its own bug report.
 */
async function shippedInvocations() {
  const { readFileSync, readdirSync, statSync, existsSync } =
    await import("node:fs");

  const files = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === "node_modules" || entry === "tests") continue;
        walk(full);
      } else if (entry.endsWith(".md")) {
        files.push(full);
      }
    }
  };
  walk(join(REPO, "skills"));
  walk(join(REPO, "shared", "resources"));

  const sites = [];
  for (const full of files) {
    const rel = full.slice(REPO.length + 1);
    const lines = readFileSync(full, "utf8").split("\n");
    let heading = "(no heading)";
    let inFence = false;
    for (let i = 0; i < lines.length; i++) {
      // Track fenced blocks BEFORE reading headings. A bash comment
      // (`# only pin if …`) is indistinguishable from an h1 by shape, and the
      // very first run of this test mis-attributed review-story's Step 9.6 site
      // to one — which would let an allowlist prefix match a site it was never
      // meant to cover, i.e. a false pass in the exact check this performs.
      if (/^\s*(```|~~~)/.test(lines[i])) {
        inFence = !inFence;
        continue;
      }
      if (!inFence) {
        const h = /^#{1,6}\s+(.*)/.exec(lines[i]);
        if (h) heading = h[1].trim();
      }
      if (!INVOCATION.test(lines[i])) continue;

      // Walk back to the first line of the command, then forward to its end,
      // so a flag on any continuation line counts. Looking only forward would
      // miss a command whose script path sits on a continuation line.
      let start = i;
      while (start > 0 && lines[start - 1].trimEnd().endsWith("\\")) start--;
      let end = i;
      while (end + 1 < lines.length && lines[end].trimEnd().endsWith("\\"))
        end++;
      const command = lines.slice(start, end + 1).join(" ");

      // Prose mentions the scripts constantly ("run sync-jira-story.js");
      // only an actual `node` command line is an invocation.
      if (!/\bnode\b/.test(command)) continue;

      sites.push({ file: rel, line: start + 1, heading, command });
      i = end;
    }
  }
  return sites;
}

const isDeliberate = (site) =>
  DELIBERATE_STATUS_PUSHES.some(
    ([file, prefix]) => site.file === file && site.heading.startsWith(prefix),
  );

test("G: every writing sync-jira-* invocation is flagged or allowlisted", async () => {
  const sites = await shippedInvocations();

  // Guard the guard. If the scan silently matched nothing — a renamed script, a
  // reorganised tree, a regex that stopped working — every assertion below
  // would pass vacuously, which is the one outcome worse than a red test.
  assert.ok(
    sites.length >= 10,
    `only ${sites.length} sync-jira-* invocations found in shipped prose; the ` +
      `scanner has probably stopped matching. Fix the scan rather than lowering ` +
      `this floor.`,
  );

  const offenders = sites
    .filter((s) => !READ_ONLY.test(s.command))
    .filter((s) => !/--no-transition\b/.test(s.command))
    .filter((s) => !isDeliberate(s))
    .map((s) => `${s.file}:${s.line} (under "${s.heading}")`);

  assert.deepEqual(
    offenders,
    [],
    "these sync-jira-* invocations write to Jira but neither pass " +
      "--no-transition nor appear in DELIBERATE_STATUS_PUSHES, so each " +
      "silently re-resolves the card's status through loadStatusMap after the " +
      "tracker-workflow ladder has already set it (bug.11, bug.12):\n  " +
      offenders.join("\n  "),
  );
});

test("G2: no stale entries in the deliberate-status-push allowlist", async () => {
  const sites = await shippedInvocations();
  const unmatched = DELIBERATE_STATUS_PUSHES.filter(
    ([file, prefix]) =>
      !sites.some((s) => s.file === file && s.heading.startsWith(prefix)),
  ).map(([file, prefix]) => `${file} — "${prefix}"`);

  assert.deepEqual(
    unmatched,
    [],
    "these allowlist entries match no invocation any more. An allowlist that " +
      "is never re-checked stops being a set of decisions and becomes a set of " +
      "excuses — delete the entry, or fix the heading it no longer matches:\n  " +
      unmatched.join("\n  "),
  );
});

test("G3: the three bug.12 call sites are covered by name", async () => {
  // G is a population check, so it would still pass if these three sites were
  // deleted outright. bug.12 is about these specific steps; pin them, so that
  // removing one is a decision someone has to make rather than a silent pass.
  const sites = await shippedInvocations();
  const required = [
    ["skills/review-story/SKILL.md", "Step 9.6"],
    ["skills/review-task/SKILL.md", "Step 8.6"],
    ["skills/review-epic/SKILL.md", "Step 11.5"],
  ];

  for (const [file, step] of required) {
    const match = sites.find(
      (s) =>
        s.file === file &&
        s.heading.includes(step) &&
        !READ_ONLY.test(s.command),
    );
    assert.ok(
      match,
      `${file}: found no writing sync-jira-* invocation under ${step}. If the ` +
        `step moved or was renamed, update this list; if the sync was removed, ` +
        `say so here rather than deleting the assertion.`,
    );
    assert.match(
      match.command,
      /--no-transition\b/,
      `${file}:${match.line} (${step}) is documented as a body/link-only sync ` +
        `but does not pass --no-transition, so it re-resolves status after the ` +
        `ladder has moved the card (bug.12).`,
    );
  }
});
