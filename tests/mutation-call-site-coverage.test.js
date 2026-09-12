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
 *   CANONICAL SOURCES ONLY: `skills/*​/SKILL.md` plus `shared/resources/*.md`,
 *   and — since bug.14 — the tracked SHELL sources an agent does not read but
 *   the harness runs: `shared/resources/*.sh`, `skills/*​/scripts/*.sh` and
 *   `scripts/*.sh`. The PreCompact hook posted a bare `gh issue comment` for
 *   months while this guard scanned Markdown only; the one caller with no prose
 *   step behind it was exactly the one no guard saw, and AGENTS.md said the
 *   guard caught "shipped source". A guard's stated scope and its scanned scope
 *   must agree, so the scan now covers what the sentence claims.
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

/**
 * A line is already routed when the chokepoint appears on it.
 *
 * **Routing is per-shape, and it has to be.** This was one global alternation
 * until task 105, which meant `tracker_write` satisfied *every* shape — so
 * `tracker_call_with_retry gh issue comment …` read as routed and was skipped.
 * Seven such sites shipped for months, in a repository whose guard already named
 * `gh issue comment` as a watched shape. The guard passed on the exact
 * regression it was written to catch.
 *
 * The two wrappers are not interchangeable with the CLIs, and conflating them is
 * what hid the gap. `tracker_write` buys interception and retry — it is the
 * right answer for a mutation no CLI owns. It does **not** buy an idempotency
 * marker, and it does not make a `gh` call work on a Jira project. A comment
 * needs both, so only `tracker-comment.js` satisfies the comment shape.
 */
const CHOKEPOINTS = {
  trackerWrite: /tracker_write|tracker_call_with_retry/,
  trackerIssue: /tracker-issue\.js/,
  trackerComment: /tracker-comment\.js/,
};

/** Shapes whose only acceptable chokepoint is a specific CLI, and why. */
const CLI_ONLY = new Map([
  [
    "github.issue.comment",
    {
      re: CHOKEPOINTS.trackerComment,
      why:
        "A comment needs the idempotency marker (so a resumed run does not " +
        "post twice) and tracker-agnostic dispatch (so a Jira project gets it " +
        "at all). tracker_write gives neither.",
    },
  ],
]);

function isRouted(line, shape) {
  const cliOnly = CLI_ONLY.get(shape.kind);
  if (cliOnly) return cliOnly.re.test(line);
  return (
    CHOKEPOINTS.trackerWrite.test(line) ||
    CHOKEPOINTS.trackerIssue.test(line) ||
    CHOKEPOINTS.trackerComment.test(line)
  );
}

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
  [
    "shared/resources/tracker-access.test.sh",
    "The access gate's own test suite. It invokes `tracker_write gh issue " +
      "comment` on purpose, to prove the wrapper refuses it under a restricted " +
      "mode — the call is the thing under test, not a site that should be routed.",
  ],
]);

/**
 * Canonical sources: skill bodies, the shared sources they are bundled from, and
 * the shell that ships beside them. A `.sh` is scanned line-for-line — every
 * line of a script is "inside a bash fence" — so the invocation predicate
 * applies unchanged, and a `#` comment never starts an invocation.
 */
function collectCanonicalDocs() {
  const docs = [];

  const sharedDir = path.join(REPO_ROOT, "shared", "resources");
  for (const f of fs.readdirSync(sharedDir)) {
    if (f.endsWith(".md") || f.endsWith(".sh"))
      docs.push(path.join(sharedDir, f));
  }

  const skillsDir = path.join(REPO_ROOT, "skills");
  for (const skill of fs.readdirSync(skillsDir)) {
    const skillMd = path.join(skillsDir, skill, "SKILL.md");
    if (fs.existsSync(skillMd)) docs.push(skillMd);
    // skills/*/references/ is deliberately NOT walked — see the header.
    const scriptsDir = path.join(skillsDir, skill, "scripts");
    if (fs.existsSync(scriptsDir)) {
      for (const f of fs.readdirSync(scriptsDir)) {
        if (f.endsWith(".sh")) docs.push(path.join(scriptsDir, f));
      }
    }
  }

  const scriptsDir = path.join(REPO_ROOT, "scripts");
  if (fs.existsSync(scriptsDir)) {
    for (const f of fs.readdirSync(scriptsDir)) {
      if (f.endsWith(".sh")) docs.push(path.join(scriptsDir, f));
    }
  }

  return docs;
}

const DOCS = collectCanonicalDocs();

test("§0 the scan set includes the shell hooks it claims to cover", () => {
  // Non-vacuity for the bug.14 widening. A scan set is a claim about what the
  // guard sees, and a readdir that silently matched no `.sh` would pass §1
  // with the hook back to invisible. Name the file the bug was about, so the
  // guard cannot narrow itself without this turning red.
  const rel = DOCS.map((p) => path.relative(REPO_ROOT, p));
  assert.ok(
    rel.includes("shared/resources/develop-pipeline-on-precompact.sh"),
    "the PreCompact hook must be in the scan set",
  );
  const shell = rel.filter((p) => p.endsWith(".sh"));
  assert.ok(
    shell.length >= 20,
    `expected ≥20 shell sources in the scan set, got ${shell.length}`,
  );
  assert.ok(
    !rel.some((p) => p.includes("/references/")),
    "bundle output under skills/*/references/ must stay out of the scan set",
  );
});

/**
 * A call site is a line that INVOKES the command: the line begins with it
 * (allowing indentation, a `$(` capture, or a shell operator), rather than
 * mentioning it inside a sentence.
 */
function isInvocation(line, shape) {
  const m = shape.re.exec(line);
  if (!m) return false;

  // A comment is never a call site — in a shell source or inside a bash fence
  // alike. Checked BEFORE the connective split below: that split keeps only the
  // text after the last `&&`/`then`/…, so `# … && gh issue comment 42` would
  // otherwise lose its `#` and read as an invocation (bug.14 / CR-5).
  if (/^\s*#/.test(line)) return false;

  let before = line.slice(0, m.index);

  // Inline mention inside prose: preceded by a backtick, or by sentence text.
  // `--reason ${REASON}` style continuations still count as invocations because
  // the command itself starts the line.
  if (/`\s*$/.test(before)) return false;

  // A chokepoint WRAPPER may precede the command, and the wrapped line is still
  // an invocation — whether that particular wrapper is *sufficient* is
  // isRouted's question, not this one.
  //
  // Splitting the two questions is what closes the gap task 105 found. This
  // predicate used to reject a wrapped line outright, so
  // `tracker_call_with_retry gh issue comment …` was not classified as a call
  // site at all — and the routing check above it never ran. Two independent
  // reasons to skip the same line, and removing only one of them left the guard
  // exactly as blind as before: the fix to isRouted alone did not turn the
  // mutation red, which is how this second half was found.
  // A command CHAINED after another one still starts a command: `foo && gh issue
  // comment …` is as much a call site as a line beginning with it. Keep only the
  // text after the last connective, so the check below sees that segment's start.
  //
  // Found by probing the repaired guard rather than by reading it — the same
  // lesson as the two defects above: one sufficient explanation for a miss is not
  // evidence it was the only one. `true && gh issue comment …` slipped through a
  // guard that had just been fixed twice.
  const segments = before.split(/&&|\|\||[;|]|\bthen\b|\bdo\b/);
  before = segments[segments.length - 1];

  before = before.replace(
    /^(\s*)(?:tracker_write|tracker_call_with_retry)\s+/,
    "$1",
  );

  // Only leading whitespace or a capture may now precede it.
  return /^[\s]*(?:[A-Za-z_][A-Za-z0-9_]*=)?\$?\(?\s*$/.test(before);
}

test("§0b a shell comment is never an invocation, even one containing a connective", () => {
  // bug.14 / CR-5. isInvocation splits on connectives BEFORE it inspects what
  // precedes the command, so `# … && gh issue comment 42` used to read as a call
  // site — the widened shell scan makes every hook comment a latent false
  // positive, and a guard that cries wolf gets disabled.
  const shape = MUTATING_SHAPES.find((s) => s.kind === "github.issue.comment");
  assert.equal(
    isInvocation(
      "# before bug.14 this was && gh issue comment 42 --body x",
      shape,
    ),
    false,
  );
  assert.equal(
    isInvocation("  #   if foo; then gh issue comment 42", shape),
    false,
  );
  assert.equal(isInvocation("#gh issue comment 42", shape), false);
  // Non-vacuity: the predicate still sees a real call site on the same shape.
  assert.equal(
    isInvocation("  gh issue comment 42 --body-file -", shape),
    true,
  );
  assert.equal(isInvocation("true && gh issue comment 42", shape), true);
});

test("§1 no bare mutating tracker call in canonical prose", () => {
  const failures = [];

  for (const file of DOCS) {
    const rel = path.relative(REPO_ROOT, file);
    if (NOT_CALL_SITES.has(rel)) continue;

    const lines = fs.readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      for (const shape of MUTATING_SHAPES) {
        if (isRouted(line, shape)) continue;
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

// ── §4 The two-run convergence rests on prose that nothing else guards ───────

test("§4 every ensure-*/sync-* skill keeps the key-present short-circuit", () => {
  // The convergence story is: a deferred create writes no key, the operator
  // writes it by hand, and the SECOND run finds it present and takes the update
  // path instead of creating a duplicate.
  //
  // That second half lives entirely in prose. Nothing else in the suite asserts
  // it, so a refactor that drops one skill's early-exit turns the convergence
  // into "creates a duplicate on every run" — silently, and only in the
  // restricted mode nobody runs in CI. This is the guard for it.
  const SKILLS = [
    "ensure-story-github-issue",
    "ensure-task-github-issue",
    "ensure-epic-github-issue",
    "sync-github-story",
    "sync-github-task",
    "sync-github-epic",
  ];

  const missing = [];
  for (const skill of SKILLS) {
    const p = path.join(REPO_ROOT, "skills", skill, "SKILL.md");
    if (!fs.existsSync(p)) {
      missing.push(`${skill} — SKILL.md not found`);
      continue;
    }
    // STRIP THE FRONTMATTER FIRST. Every one of these skills says
    // "updates it if github_issue is already set" in its `description:` field,
    // so matching the whole file matched line 3 in all six — the guard passed
    // on the strength of a sentence that documents the behaviour rather than
    // implements it, and would have kept passing with the actual step deleted.
    const raw = fs.readFileSync(p, "utf8");
    const text = raw.replace(/^---\n[\s\S]*?\n---\n/, "");

    // The short-circuit, in the BODY: a step that checks for an existing issue
    // and returns without creating one.
    // Anchored on the STEP, not on a phrase that could appear in any prose.
    // `\bUpdate Path\b` was the first attempt and matched a sentence in this
    // task's own explanatory text — a guard that matches commentary about the
    // behaviour is the same vacuity as one that matches the frontmatter.
    const shortCircuits =
      // ensure-*: a step that checks for the key and returns without creating
      /###[^\n]*Already Exists[\s\S]{0,600}?Return immediately/i.test(text) ||
      // sync-*: an explicit update path selected on the key being present
      /####[^\n]*Update Path[^\n]*github_issue[^\n]*present/i.test(text);
    if (!shortCircuits) {
      missing.push(
        `${skill} — no "github_issue already present" short-circuit. Without it ` +
          `the second run of the two-run convergence creates a DUPLICATE issue.`,
      );
    }

    // The write must be guarded on a non-empty issue number — EITHER here, or
    // in the ensure-* sub-routine this skill delegates the create to. The
    // sync-github-* skills do the latter, so demanding a local guard from them
    // is a false positive: they never write the key themselves.
    const guardsTheWrite =
      /Skip this entire step when .*ISSUE_NUM.* is empty/i.test(text) ||
      /is a positive integer/i.test(text);
    const delegatesTheWrite =
      /Invoke the `ensure-\w+-github-issue` sub-routine/i.test(text);
    // Whichever route, an empty id must stop the run claiming success.
    const guardsTheClaim = /When .*ISSUE_NUM.* is empty, stop here/i.test(text);

    if (!guardsTheWrite && !(delegatesTheWrite && guardsTheClaim)) {
      missing.push(
        `${skill} — nothing stops a deferred create from writing an empty key ` +
          `or claiming a create that did not happen. Guard the write locally, or ` +
          `delegate it to an ensure-* sub-routine AND stop on an empty id.`,
      );
    }
  }

  assert.deepEqual(missing, [], missing.join("\n"));
});

test("§4 no skill writes a placeholder key", () => {
  // Belt to §4's braces. A placeholder defeats the idempotent lookup that stops
  // the next run creating a duplicate, so it is worse than writing nothing.
  const offenders = [];
  for (const file of DOCS) {
    const rel = path.relative(REPO_ROOT, file);
    const lines = fs.readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      // An ASSIGNMENT of a placeholder, not prose forbidding one.
      if (
        /^\s*(?:-\s*)?(?:github_issue|jira_key):\s*(?:0|["']?<?pending>?["']?|null\s*#)/.test(
          line,
        )
      ) {
        offenders.push(`${rel}:${i + 1} — ${line.trim()}`);
      }
    });
  }
  assert.deepEqual(offenders, [], offenders.join("\n"));
});

// ── §5 Heredoc terminators ──────────────────────────────────────────────────

test("§5 no heredoc in canonical prose has an indented terminator", () => {
  // Bash does not accept an indented terminator for a heredoc opened with
  // `<<EOF` or `<<'EOF'`. It warns "here-document delimited by end-of-file" and
  // swallows EVERYTHING after it into the body — including, in every instance
  // this guard was written for, the `tracker-comment.js` or `tracker-issue.js`
  // call on the next line.
  //
  // The failure is silent and total: the comment is never posted, the issue is
  // never closed, and the run reports success. Eight instances existed across
  // the repo when this was first checked — two introduced by task.56 and six
  // pre-existing, every one of them inside a numbered list where the indentation
  // looked natural. `<<-EOF` (tab-indented terminator) is the only indented form
  // bash accepts, and nothing here uses it.
  const offenders = [];

  for (const file of DOCS) {
    const rel = path.relative(REPO_ROOT, file);
    const lines = fs.readFileSync(file, "utf8").split("\n");

    lines.forEach((line, i) => {
      // An opener, capturing the delimiter. Accepts a bare, single- or
      // double-quoted delimiter, and tolerates trailing text — `cat <<EOF | tee f`
      // and `<<EOF 2>/dev/null` are openers too, and the first version of this
      // guard (anchored with `$`) missed both.
      //
      // `<<-` is exempt: it is the one form bash lets an indented (tab)
      // terminator close.
      const open = /<<\s*(?!-)(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/.exec(line);
      if (!open) return;
      const delim = open[2];

      // The FIRST line whose trimmed content equals the delimiter is taken as
      // the terminator. A body line that is itself exactly `EOF` would be a
      // false positive — accepted, because the alternative is parsing shell,
      // and a body line reading only `EOF` is vanishingly rare next to the
      // defect this catches.
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() !== delim) continue;
        if (lines[j] !== delim) {
          offenders.push(
            `${rel}:${j + 1} — heredoc opened at line ${i + 1} with <<${delim} ` +
              `has an INDENTED terminator ("${lines[j]}"). Bash will not close ` +
              `the here-document; everything after it is swallowed into the body.`,
          );
        }
        return;
      }
    });
  }

  assert.deepEqual(
    offenders,
    [],
    `Indented heredoc terminators found:\n\n${offenders.join("\n")}\n\n` +
      `Move the terminator to column 0. Body lines should be unindented too — ` +
      `leading whitespace is written into the file verbatim.`,
  );
});
