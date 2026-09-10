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

## See also

- [Troubleshooting](./troubleshooting.md) — what to do when something breaks
- [FAQ](./faq.md) — why the design works this way
- [Standards](../standards/README.md)
