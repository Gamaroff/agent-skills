# Anti-Patterns

> **Audience:** developers using these skills — things NOT to do, with rationale.

> **First time here?** Some rules below (gate files, registry rows, lifecycle status) won't fully land until you've shipped a story or task and seen the artifacts in person. Skim this list now to flag the names, then re-read after your first run through [`../concepts/quickstart-task.md`](../concepts/quickstart-task.md) or [`../concepts/quickstart-story.md`](../concepts/quickstart-story.md). The rules make a lot more sense once you've held the artifacts they protect.

Rules scattered across the docs, collected and explained. Each entry: the rule, why it exists, what happens if you ignore it, and how to do it right.

## Never edit gate files by hand

**Rule:** `*.gate.{N}.{name}.yml` files are owned by QA skills (`qa-story`, `qa-task`, `qa-gate`).

**Why:** Dev edits to gate decisions decouple "what the code does" from "what QA thinks of the code." Future runs read stale gate state and pipeline guarantees break.

**If you ignore it:** `finalise` may pass DoD against a gate that doesn't reflect the current state, shipping broken work as "accepted."

**Do this instead:** if a gate is wrong, re-run `qa-story` / `qa-task` to regenerate it. To record a `WAIVED` decision, use `/qa-gate`.

## Never reuse a cancelled epic or task number

**Rule:** Numbers in the [epic registry](../standards/epic-registry.md) and [task registry](../standards/task-registry.md) are append-only. Cancelled items keep their number forever.

**Why:** Branch names, PR titles, commit messages, and historical references all encode the number. Reuse creates ambiguity in `git log` and tracker history that can never be resolved.

**If you ignore it:** future readers of the codebase see the same number meaning two different things in different commits.

**Do this instead:** read **Next Available** from the registry and use that. Always.

## Never hand-merge conflicting gate files

**Rule:** When rebasing produces a merge conflict on `*.gate.{N}.{name}.yml`, do not resolve manually.

**Why:** Both versions of the gate file were valid QA outputs at their respective times. Merging by hand fabricates a third state QA never produced.

**Do this instead:** `git checkout --theirs path/to/gate.yml` and re-run `/qa-story` or `/qa-task` to regenerate against the merged code state.

## Never leave plans in agent scratch directories

**Rule:** Plans live in-repo, co-located with the work (`task.{N}.plan.*.md` inside the task dir, `story.{E}.{S}.plan.*.md` inside the story dir, or `.agents/plans/` for general plans). Never `~/.agents/plans/`, `~/.claude/plans/`, or `/tmp/`.

**Why:** Plans outside the repo are not version-controlled and invisible to teammates. They evaporate when you switch machines, lose their connection to the work, and can't be reviewed in PRs.

**Do this instead:** see [Plan file locations](../standards/plan-file-locations.md). If an agent generated a plan in a scratch dir, **relocate the content**, don't link to it.

## Never amend or force-push to merge cleanly

**Rule:** When a pre-commit hook fails or a PR check rejects, fix the underlying issue and create a **new** commit. Don't `--amend` or `--force-with-lease` to make the symptom disappear.

**Why:** `--amend` rewrites the last commit, but if a hook failed the commit didn't happen — so `--amend` modifies the *previous* commit, potentially destroying unrelated work. Force-pushing shared branches surprises collaborators.

**Do this instead:** fix the failure, `git add`, new commit.

## Never bundle unrelated work in a hotfix

**Rule:** A hotfix branch ships one fix. Unrelated cleanup, refactors, or version bumps go to `develop` via a normal task or story.

**Why:** Hotfixes are reviewed under time pressure. Bundled changes increase the chance of regressions slipping in alongside the fix, and complicate the second PR back to `develop`.

**Do this instead:** see [Hotfix Runbook](../runbooks/hotfix.md). One fix, one branch, one PR, one cherry-pick or merge back to `develop`.

## Never skip Step 7 (`finalise`) side-effects

**Rule:** `finalise` always runs its full side-effects — DoD check, PR comment, tracker update, board move — even in `--lite` mode.

**Why:** Lite mode is about skipping *context-gathering* before development (which is reversible and read-only). Step 7 side-effects are about *recording state* (which collaborators rely on).

**If you ignore it:** PRs ship without DoD records, tracker boards drift from reality, and Jira/GitHub state stops reflecting what's actually merged.

**Do this instead:** if you genuinely need to skip Step 7, bypass `develop-*` and drive the pipeline manually. The lite flag is not the right tool.

**The restricted-access deferral is not this skip.** Under `access.tracker: read-only | approve | command | manual`, Step 7 still runs in full — but its tracker mutations are **deferred and recorded** in the committed handover artifacts (`*.handover.{n}.{name}.{md,sh,json}`), the implementation report's `## Tracker Actions Required` section, a `**Tracker debt:**` line, and a PR comment. This rule's stated harm is *silent* drift; a deferral with a loud, committed, reviewable record — one a later `/tracker-reconcile` run ticks back against the live board — is the opposite of silent. Do not "fix" a restricted run into performing the mutations anyway, and do not read its deferral as a violation of this rule.

## Never set story numbers by hand

**Rule:** `create-story` computes the next `{S}` from existing siblings under the parent epic.

**Why:** Hand-editing `{S}` creates duplicates or gaps. Sibling stories then fail dependency analysis and ordering inference.

**Do this instead:** invoke `/create-story` and let it pick the number.

## Never invent epic numbers

**Rule:** Use `create-epic`, which delegates to `epic-registry-manager`. Never pick a number yourself.

**Why:** Concurrent authors will collide. The registry is the only safe source of "next available."

**If you ignore it:** two authors create `epic.42.*` in the same week and the merge is messy.

**Do this instead:** `/create-epic`, then commit the registry update atomically with the new epic file.

## Never edit `docs/reference/skill-catalog.md` by hand

**Rule:** The catalog is generated from skill frontmatter by `generate_catalog.py`.

**Why:** Hand edits are overwritten on the next `npm run generate-catalog`. If you want to change a skill's catalog entry, edit the skill's SKILL.md `description` and regenerate.

**Do this instead:** to add curated content alongside the catalog, write a sibling file (e.g. `docs/reference/featured-skills.md`) and link from it. To change the preface, edit `skills/create-skill/scripts/generate_catalog.py`.

## Never write QA artifacts to a central `docs/qa/` directory

**Rule:** QA review reports, NFR assessments, traceability matrices, DoD checklists, and gate files are **co-located** with the story or task document they belong to. There is no central `docs/qa/` directory and no `qa.qaLocation` configuration.

**Why:** Co-located artifacts travel with the work item — discoverable from one directory, easy to commit/move/rename as a unit, no cross-directory drift between the story and its quality record.

**If you ignore it:** the pipeline doesn't pick up your gate file (it looks alongside the story), QA history fragments across the repo, and the orchestrators can't trace artifacts back to their parent work item.

**Do this instead:** let the QA skills (`qa-story`, `qa-task`, `qa-gate`) write artifacts where they belong. See [Story documents](../standards/story-documents.md#co-located-artifacts) and [Task documents](../standards/task-documents.md#co-located-artifacts). Older skill text references `{qa.qaLocation}/gates/...` — that path is deprecated.

## Never source `shared/resources/` via symlinks or relative paths

**Rule:** Skills reference shared resources using the explicit path `shared/resources/<filename>` in their `.md` files. The packager rewrites this path at zip time.

**Why:** Symlinks don't survive packaging. Relative paths break when the skill is installed somewhere else in the consuming project's tree.

**Do this instead:** see [Authoring skills](../contributing/authoring-skills.md) § Shared Resources.

## Never narrate internal deliberation in agent output

**Rule:** Tool-using agents should give brief progress updates, not running commentary on their thought process.

**Why:** User-facing text should be relevant communication, not stream-of-consciousness. Long internal-monologue output increases context cost and degrades signal.

**Do this instead:** state results and decisions directly. One sentence per real update.

## Never let one signal report two states

**Rule:** for each falsy, empty or zero value a check can emit, name the distinct situations that produce it. If more than one situation produces the same value, and the right response differs between them, the signal needs separate values.

**Why:** "found nothing" and "could not look" are byte-identical from the caller's side, and a caller under time pressure reads whichever is more reassuring. This repository has diagnosed the same shape at least four times — a `probes: []` that meant either nothing-to-probe or probing-never-ran; a bug status that meant either legitimately-closed or outside-the-lifecycle; a runnable count of zero that meant either an under-configured run or a deliberately deny-listed one; an activation check that meant either the project has no instruction or no instruction file was found to read. Each time it was named in the postmortem of that instance, which is the one artifact the next instance does not read.

**If you ignore it:** the check reports clean, the reader believes it, and the failure it existed to catch ships. A green tick beside a property is worse than no tick, because an unguarded property invites scrutiny and a guarded-looking one never gets looked at again.

**Do this instead:** emit a distinct value per state — `review-security`'s verdict vocabulary (`engages` / `present-but-inert` / `absent` / `unverifiable`) is the working example — and, where the values must stay backward-compatible, add a `state` field beside the boolean rather than overloading it. In review, the observable finding is: *this condition is reached by two distinguishable states and reports one value.*

## Never fix N call sites without a population check

**Rule:** when a fix is the same edit applied at more than one call site, or the root cause is "this site was not updated when the contract changed", the deliverable is the check that finds site N+1 — not the N edits.

**Why:** enumeration defects are invisible to behavioural testing by construction. Every site is correct in isolation, every test passes, and the bug lives entirely in the set of sites nobody listed. Testing the sites you found re-confirms the finding; only testing the population can fail on the site you missed.

**If you ignore it:** the next site surfaces as a separate bug weeks later, and its fix repeats the same omission.

**Do this instead:** write a check that enumerates the population and asserts every member complies, carrying two properties that are load-bearing and usually skipped:

- a **non-vacuity floor** — a minimum expected match count — so a scan whose pattern stops matching fails instead of passing on zero;
- **staleness failure** on any allowlist, so an exempted site that no longer exists is an error rather than silent dead weight.

Then review the guard itself adversarially, and **build it on a matcher independent of the one under test**. A population check that reuses the buggy matcher inherits its blind spot and can never contradict it — it passes vacuously on exactly the defect it was written for.

## Never claim a relationship in an assertion that tests only co-occurrence

**Rule:** when an assertion's *message* claims a relationship — *X routes to Y*, *X fires at Y*, *X owns Y*, *X is listed under Z* — its *pattern* must establish that relationship, not merely that both names appear somewhere in the haystack. `assert.match(doc, /ALPHA[^|]*BRAVO/, "ALPHA must route to BRAVO")` passes when ALPHA and BRAVO sit in unrelated sentences of the same paragraph.

**Why:** the assertion passes against the exact mutation it was written to catch, so mutation-proving it *confirms* it. It is the message that is wrong, and nothing executes a message. Task 77 shipped this six times across eleven independent gates, and **two of the six were written inside the fix for the previous one** — widening the regex is the natural repair and is also the defect. Every one was caught by a human reviewer, one at a time.

**If you ignore it:** a reader auditing the file finds an assertion whose message says it checks the row when it does not, and stops looking. The property is unguarded and looks guarded — the failure mode of *Never let one signal report two states*, arriving through prose instead of through a return value.

**Do this instead:** anchor the pattern to the structure the claim is about — the table cell, the list item, the code block — rather than to a span of characters between the two names, and **ask the assertion the question the message asks**. Comparing two `indexOf` results proves *ordering*, which is a fine test of an ordering claim and no test at all of a **containment** claim:

```js
// The defect: ordering evidence, containment message.
const s5c = doc.indexOf("### 5c. ");
const stage = doc.indexOf("--stage ready-for-merge");
assert.ok(stage > s5c, "ready-for-merge must sit INSIDE 5c");   // also true if it sits in 5d

// The fix: extract the region, then ask it directly.
assert.ok(section5c().includes("--stage ready-for-merge"), "the stage call must sit inside 5c");
```

`tests/lib/relationship-assertion-lint.js` fails CI on the four shapes this has taken; it models the six instances that happened, so a seventh in an unmodelled shape still needs you to read the message against the pattern.

## Never anchor a Markdown edit on a bare substring of a heading

**The rule:** an edit that locates a heading must match it **at line start** — `l == "## Heading"`
over a line list, or `^## Heading$` with a multiline flag — never `s.replace("## Heading", …)` or
`s.index("## Heading")`.

**Why:** these documents routinely discuss their own structure, so a heading string is *especially*
likely to appear earlier as an inline code span (`` `## Change Log` ``). A bare substring match hits
the first occurrence, splices the new section into the middle of a sentence, and leaves a malformed
heading behind. The result is still valid Markdown, so a formatter, a link checker and a 3,000-test
suite are all silent on it — only a reader who compares meaning to intent sees it.

**What happens if you ignore it:** on task.107 a `## QA Testing Results` section was inserted 80
lines early inside a sentence in the Motivation, survived `prettier --check`, `markdown-link-check`,
`npm run ci:fast` and two full QA cycles, and was caught at Step 5c. The repair used `s.index(...)`
and did it again.

**How to do it right:** locate both boundaries by line, assert both, cut by explicit line range,
then verify fence parity (`$(grep -c '^```' "$f") % 2` must be `0`) and re-read the structure. A
gate that validates *form* cannot see a defect in *meaning*. (obs #61)

## Never write `grep -c … || echo 0`

**The rule:** `grep -c` prints a count on **every** path, including `0` when nothing matches — and
exits 1 in that case, so the `|| echo 0` fires *as well*. The captured value is the two-line string
`"0\n0"`, and the next `[ "$V" -gt 0 ]` aborts with `integer expression expected`.

**Why it matters more than a typo:** the failure does not look like this idiom. It looks like
something *else* stalled. On one run a waiter built on it silently never met its exit condition,
the stall was attributed to a different, healthy background poll, and that poll was killed three
samples from a SUCCESS verdict.

**How to do it right:** `$(grep -c PATTERN FILE || true)` when the exit code must not propagate,
or just `$(grep -c PATTERN FILE 2>/dev/null; true)`. And the wider rule: **a stalled result is a
claim about the instrument too** — when a background process looks stuck, read its output directly
or re-run its check inline before killing it, and suspect the thing you wrote three minutes ago
before the thing that has run correctly for two. (obs #28)

## Never copy a number from prose into prose

**The rule:** a figure derived from a command (`git ls-files … | wc -l`, a test count, a file
count) appears in documentation as the **invocation that produces it**, not as its output. Keep a
number only where it carries an argument the reader cannot reconstruct — and then date it, so it
reads as a measurement rather than a standing claim.

**Why:** a number in prose is a measurement with no timestamp and no owner. It is correct once and
decays at the rate the tree changes, while looking identical to a number that is still true. Three
files stated the ShellCheck lane's input as 247 / 56 files; five days and thirty merges later the
answer was 266 / 58, and a documentation sweep copied the stale figures into a fourth file —
stamped with a fresh commit date.

**How to do it right:** print the command. Where a doc sweep copies a factual claim from one file
to another, **re-derive it at the point of copying** — that is the moment checking is cheapest and
the appearance of freshness is highest. The same applies to a count of another *document's*
contents ("the four shapes" of a document that has six): drop the count or test it. (obs #60, #18)

## Never put a must-succeed path and a glob in one `rm` argv

**The rule:** a file that *must* be removed and a pattern that *may* match nothing never share an
`rm`. Remove the required path on its own line; sweep the optional matches with `find … -delete`
(or a `nullglob`-guarded loop), which is a noop on an empty match in every shell.

**Why:** `rm -f lock test-output-*.log` is two different commands in the two shells this repository
runs under. bash expands an unmatched glob to itself and `rm -f` ignores the missing file, so every
bash test passes. zsh — the default shell on every macOS host — treats an unmatched glob as
`nomatch`, which **aborts the whole command before `rm` runs**: the lock stays in place on every
HALT that had no test logs to sweep, and the next Stop hook re-prompts a pipeline that has halted.
The one-argv form made the required removal conditional on an unrelated file existing, and the
condition was invisible in the shell that wrote it. (obs #111; task.124)

**How to do it right:**

```bash
rm -f .claude/state/develop-pipeline.lock
find .claude/state -maxdepth 1 -name 'test-output-*.log' -delete 2>/dev/null || true
```

`lint:shell` never sees a fence, so `shared/resources/tests/halt-snippet-glob-safe.test.mjs`
extracts the HALT snippets and runs them under both shells with an empty glob.

## Never record `unverifiable` as a verdict when it is a reason

**The rule:** `unverifiable` names why an instrument could not reach a target — not a property of
the target. When a probe engine, a checker or a review reports it, the next question is *which
reason*, and the answer decides what happens: "the entry is a bash script" is a reason to use the
engine's shell entry form; "the script reads stdin" is a reason to probe by hand under a minimal
environment; "the sink is networked" is a decline to record. None of them is a reason to write
`boundary: false`, `probes_executed: 0` and PASS.

**Why:** an `unverifiable` that is read as a verdict is the one answer nobody questions — it looks
like diligence. On task.121 five QA gates recorded "No boundary delivered" against a script whose
own header says it "refuses rather than guesses", because the engine imported JS only and the
boundary rule's signals were JS-shaped; `unverifiable` was the correct engine output and the wrong
deliverable verdict, and the gate said PASS five times. The finalise security agent, working by
hand, reproduced two fail-closed defects in the same script in ten minutes.

**How to do it right:** treat `unverifiable` as a routing token. The engine reports the reason
(`outside-repo-root`, `entry-not-probeable`, `no-cases-executed`, a decline detail); the reader
routes on it — another entry form, a by-hand probe, a recorded decline — and only a decline the
rule names is allowed to stand as the section's answer. A script that says it refuses is a boundary
by its own words (`probe-boundary-signals.mjs`), whatever language it is in. (obs #121, task.128)

## Never read a variable in executed prose that no writer binds

**The rule:** a `${NAME:-default}`, `${NAME:?}` or bare `$NAME` inside a fenced block is a claim
that *something binds `NAME`* — and every fenced block runs as its own shell, so "bound in an
earlier block" or "bound in the step doc" is not a writer. A default with no writer is a constant
wearing a variable's name: it is right on exactly the path the reviewing host ran and wrong on the
one nobody ran. A `:?` with no writer is a guaranteed failure on that path instead.

**Why it matters more than a lint:** `develop-pipeline-resume-contract.md` read
`${BASE_BRANCH:-develop}` from its first commit through five green QA cycles — every run was a
feature branch off develop, so the default was right and the unbound read was invisible. Four text
reviews read the line; the fifth asked "who binds this?". Step 8's post-conditions read
`${BASE_BRANCH:?}` with no writer for the same reason.

**How to do it right:** bind the name *in the block that reads it*, or name the `{placeholder}` the
skill substitutes, or declare it an input where the document says it comes from outside. The code
reviewer asks the question on every diff (`code-review-prompt.md` check E), and
`tests/unbound-default-reads.test.js` walks the whole population with a reasoned inputs list and
a pin list that goes red the moment a pinned read gains a writer. (obs #133, task.132)

## See also

- [Troubleshooting](./troubleshooting.md) — what to do when something breaks
- [FAQ](./faq.md) — why the design works this way
- [Standards](../standards/README.md)
