"use strict";
/**
 * Mutation call-site guard — every mutating tracker call in canonical prose must
 * be routed, not bare.
 *
 * Motivation: tasks 51–56 moved ~28 `gh` mutations behind two chokepoints —
 * `tracker_write` (for calls nobody captures) and `tracker-issue.js` (for calls
 * whose stdout a caller binds). That work is only durable if a NEW bare call
 * cannot be added without somebody noticing. Before this guard the call-site
 * count was a number somebody audited once; after it, the number is maintained.
 *
 * Scope is deliberately narrow — a guard that cries wolf gets disabled.
 *
 *   CANONICAL PROSE ONLY: `skills/*​/SKILL.md` plus `shared/resources/*.md`.
 *   `skills/*​/references/` is EXCLUDED because it is `npm run bundle` output —
 *   the same ~30 copies of the same sources. Including it inflates every count
 *   ~30× and, worse, makes a real finding indistinguishable from its own echo.
 *
 *   INVOCATIONS ONLY, not mentions. A real call site starts a line (optionally
 *   indented) inside a bash fence. Prose that *describes* a mutation — "status
 *   transitions map to `gh issue close`", "skip the `gh issue create` block
 *   below" — is inline in a sentence and is not a call site. That distinction is
 *   the same "run this" vs "this exists elsewhere" line that
 *   tests/executable-instructions.test.js draws, and it is drawn here the same
 *   way.
 *
 * Deterministic and fast — runs every push via `npm test` (tests/*.test.js).
 * Run: node --test tests/
 */

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const REPO_ROOT = path.resolve(__dirname, "..");

/**
 * The mutating shapes this guard watches, and the chokepoint each must go
 * through.
 *
 * Kept in step with the roster in shared/resources/tracker-access-record.md. A
 * kind added there without an entry here is simply unwatched — which is a gap,
 * not a failure, and §3 below is what makes that gap visible.
 */
// Each shape names the roster `kind` it covers EXPLICITLY. §3 compares those
// names to the roster as a set — it does not try to infer the mapping from the
// text, which is a guess that goes wrong in both directions: `github.sub-issue.add`
// reads as "sub-issue link" and `github.board.item-add` as "gh project item-add",
// so a substring heuristic reported two covered kinds as unwatched.
const MUTATING_SHAPES = [
  {
    kind: "github.issue.create",
    re: /gh\s+issue\s+create\b/,
    what: "gh issue create",
    via: "tracker-issue.js --kind create",
  },
  {
    kind: "github.issue.edit",
    re: /gh\s+issue\s+edit\b/,
    what: "gh issue edit",
    via: "tracker-issue.js --kind edit",
  },
  {
    kind: "github.issue.close",
    re: /gh\s+issue\s+close\b/,
    what: "gh issue close",
    via: "tracker-issue.js --kind close",
  },
  {
    kind: "github.issue.reopen",
    re: /gh\s+issue\s+reopen\b/,
    what: "gh issue reopen",
    via: "tracker-issue.js --kind reopen",
  },
  {
    kind: "github.issue.comment",
    re: /gh\s+issue\s+comment\b/,
    what: "gh issue comment",
    via: "tracker-comment.js",
  },
  {
    kind: "github.milestone.create",
    re: /gh\s+api\s+[^\n]*\/milestones\b/,
    what: "milestone create",
    via: "tracker-issue.js --kind milestone",
  },
  {
    kind: "github.sub-issue.add",
    re: /gh\s+api\s+[^\n]*\/sub_issues\b/,
    what: "sub-issue link",
    via: "tracker-issue.js --kind sub-issue-link",
  },
  {
    kind: "github.board.item-add",
    re: /gh\s+project\s+item-add\b/,
    what: "gh project item-add",
    via: "tracker_write",
  },
  {
    kind: "github.board.field-set",
    re: /gh\s+api\s+graphql[^\n]*\bmutation\b/,
    what: "graphql mutation",
    via: "tracker_write",
  },
];

/** A line is already routed when the chokepoint appears on it. */
const ROUTED =
  /tracker_write|tracker_call_with_retry|tracker-issue\.js|tracker-comment\.js/;

/**
 * Files whose mutating lines are NOT call sites, each with the reason.
 *
 * An entry is a deliberate classification act, not a silencer — it asserts "the
 * mutating text in this file is not a call an agent will make". That is the same
 * bar tests/executable-instructions.test.js sets for its allowlist, and it is
 * what stops this file becoming the dumping ground the task's own risk table
 * warns about.
 *
 * Keyed by repo-relative path. Adding a path means writing the reason.
 */
const NOT_CALL_SITES = new Map([
  [
    "shared/resources/tracker-access-record.md",
    "The kind roster. Its 'Underlying call' column NAMES every mutation by its " +
      "underlying command — that naming is the roster's entire purpose, and " +
      "defer-mutation.js parses this table at runtime. Routing it would be " +
      "meaningless: there is no call here to route.",
  ],
  [
    "shared/resources/tracker-issue-cli.md",
    "The CLI's own contract document. It quotes the bare forms it replaces in " +
      "order to explain what it replaces.",
  ],
  [
    "shared/resources/platform-detection.md",
    "Describes which paths tracker_write covers and which get a CLI instead. It " +
      "names the calls to classify them, and classification is the point.",
  ],
  [
    "shared/resources/tracker-comment-contract.md",
    "The comment CLI's contract; names `gh issue comment` to say what it wraps.",
  ],
]);

/** Canonical prose: skill bodies and the shared sources they are bundled from. */
function collectCanonicalDocs() {
  const docs = [];

  const sharedDir = path.join(REPO_ROOT, "shared", "resources");
  for (const f of fs.readdirSync(sharedDir)) {
    if (f.endsWith(".md")) docs.push(path.join(sharedDir, f));
  }

  const skillsDir = path.join(REPO_ROOT, "skills");
  for (const skill of fs.readdirSync(skillsDir)) {
    const skillMd = path.join(skillsDir, skill, "SKILL.md");
    if (fs.existsSync(skillMd)) docs.push(skillMd);
    // skills/*/references/ is deliberately NOT walked — see the header.
  }

  return docs;
}

const DOCS = collectCanonicalDocs();

/**
 * A call site is a line that INVOKES the command: the line begins with it
 * (allowing indentation, a `$(` capture, or a shell operator), rather than
 * mentioning it inside a sentence.
 */
function isInvocation(line, shape) {
  const m = shape.re.exec(line);
  if (!m) return false;

  const before = line.slice(0, m.index);

  // Inline mention inside prose: preceded by a backtick, or by sentence text.
  // `--reason ${REASON}` style continuations still count as invocations because
  // the command itself starts the line.
  if (/`\s*$/.test(before)) return false;

  // Only leading whitespace, a capture, or a shell connective may precede it.
  return /^[\s]*(?:[A-Za-z_][A-Za-z0-9_]*=)?\$?\(?\s*(?:&&|\|\||;|then\s+|do\s+)?\s*$/.test(
    before,
  );
}

test("§1 no bare mutating tracker call in canonical prose", () => {
  const failures = [];

  for (const file of DOCS) {
    const rel = path.relative(REPO_ROOT, file);
    if (NOT_CALL_SITES.has(rel)) continue;

    const lines = fs.readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (ROUTED.test(line)) return;
      for (const shape of MUTATING_SHAPES) {
        if (isInvocation(line, shape)) {
          failures.push(
            `${rel}:${i + 1} — bare \`${shape.what}\`. Route it through ${shape.via}.\n` +
              `    ${line.trim()}`,
          );
          break;
        }
      }
    });
  }

  assert.deepEqual(
    failures,
    [],
    `Bare mutating tracker calls found in canonical prose.\n\n` +
      failures.join("\n") +
      `\n\nEvery mutating tracker call must go through a chokepoint, or a run ` +
      `with restricted access performs it anyway and the deferred-mutation ` +
      `journal is silently incomplete.\n\n` +
      `If this line genuinely is not a call site — prose that names a command ` +
      `to describe or classify it — add the FILE to NOT_CALL_SITES in this test ` +
      `with the reason. Writing the reason is the point: an allowlist nobody has ` +
      `to justify becomes a dumping ground, and a guard that cries wolf gets ` +
      `disabled.`,
  );
});

test("§2 every allowlisted file exists and still contains a mutating mention", () => {
  // An entry that no longer matches anything is stale: the prose it excused has
  // been rewritten or deleted, and leaving the entry behind means the NEXT bare
  // call added to that file is silently excused. Staleness in an allowlist is
  // how a guard rots into a no-op.
  const stale = [];
  for (const [rel, reason] of NOT_CALL_SITES) {
    const abs = path.join(REPO_ROOT, rel);
    if (!fs.existsSync(abs)) {
      stale.push(`${rel} — allowlisted but the file no longer exists`);
      continue;
    }
    const content = fs.readFileSync(abs, "utf8");
    if (!MUTATING_SHAPES.some((s) => s.re.test(content))) {
      stale.push(
        `${rel} — allowlisted but contains no mutating mention any more`,
      );
    }
    assert.ok(
      reason && reason.length > 40,
      `${rel} — an allowlist entry must state WHY, in a sentence a reviewer can check`,
    );
  }
  assert.deepEqual(stale, [], `Stale allowlist entries:\n${stale.join("\n")}`);
});

test("§3 the watched shapes cover every GitHub kind the roster names as a mutation", () => {
  // The roster is the source of truth for what a mutation IS. If it grows a
  // GitHub kind this guard does not watch, the new kind's call sites can be
  // added bare and nothing complains — so the gap is asserted here rather than
  // left to be noticed later.
  const dm = require(
    path.join(REPO_ROOT, "shared", "resources", "defer-mutation.js"),
  );
  const roster = dm.loadRoster();

  const githubKinds = [...roster.keys()].filter(
    (k) => k.startsWith("github.") && !k.endsWith("unknown-mutation"),
  );

  // Kinds that are out of this guard's scope, with the reason.
  const OUT_OF_SCOPE = new Map([
    [
      "github.pr.create",
      "VCS, governed by access.vcs — out of the tracker sequence's scope",
    ],
    ["github.pr.comment", "VCS, governed by access.vcs"],
    ["github.pr.merge", "VCS, governed by access.vcs"],
  ]);

  const watched = new Set(MUTATING_SHAPES.map((s) => s.kind));
  const unwatched = githubKinds.filter(
    (kind) => !watched.has(kind) && !OUT_OF_SCOPE.has(kind),
  );

  assert.deepEqual(
    unwatched,
    [],
    `Roster GitHub kinds no shape in MUTATING_SHAPES watches: ${unwatched.join(", ")}.\n` +
      `Add a shape, or add the kind to OUT_OF_SCOPE with the reason.`,
  );
});
