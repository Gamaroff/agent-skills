# Sprint Review Summary — Task 38: Jira ladder walking

**Task:** `task.38.jira-ladder-walking`
**PR:** [#194](https://github.com/Gamaroff/agent-skills/pull/194) → `develop`
**Issue:** [#186](https://github.com/Gamaroff/agent-skills/issues/186)
**Accepted:** 2026-08-05
**Final gate:** PASS — 90/100

---

## Summary

Jira transitions are now driven by the consumer's own `tracker-workflow.yaml` ladder. When a pipeline
moment's target column is not directly reachable, the intermediate columns the ladder declares are
**walked**, re-reading the available transitions after every hop. And a live correctness bug is fixed:
a `done` moment pointed at a bespoke column no longer fires the board's real Done transition.

The headline for a demo is the second one. Before this change, a project that retargeted `done` at a
gate column got a *confident wrong terminal transition* — the resolver found the column unreachable,
fell back to "the single transition into the done category", and closed the card. That is not
recoverable by re-running anything.

---

## What was built

**Walking.** A board that gates Done behind a review column now works with no transition graph
authored anywhere. Previously the move was skipped, and because every later moment resolves from
wherever the card actually sits, one missed hop silently disabled all of them.

**Three outcomes, not two.** A walk that gets partway and stops is reported as
`walk-incomplete`, naming the column the card is parked in and what it did not reach — distinct from
both success and "nothing happened". A gate a human must open is a legitimate board shape, so this is
exit 0.

**Terminality is two conditions.** The done-category fallback asks *is there exactly one way to
finish?* — a question that only has a right answer when the target **is** the finish. It now requires
both that the moment is one the defaults mark terminal and that its target is the ladder's last rung.

**Inspection without movement.** `--print-plan` prints the resolved hops with no credentials and no
network call; `--dry-run` verifies the first hop against the live board and honestly labels the rest
`unverified (depends on hop 1)`, because the transitions after a hop do not exist until it fires.

---

## Demo notes

```bash
# Offline: what would this moment do, and how far is it?
node shared/resources/jira-stage.js --stage done --from "In Progress" --print-plan

# Read-only against a real board: verify hop 1, see the rest as a plan
node shared/resources/jira-stage.js --issue RAPP-123 --stage done --dry-run
```

The interesting output field is `authored` — it answers "did my ladder decide this, or did my older
JSON config?", which turned out to be the question the whole review cycle was really about.

---

## Testing & QA

| | |
| --- | --- |
| Tests | **889/889** passing (870 before this task) |
| New tests | 43 across four suites |
| Pre-existing fixture assertions | all 8 pass **unchanged** |
| CI | green on `c79d24b`, the PR head |
| QA cycles | **5** |
| Findings | **23 found, 23 fixed** — 7 high-severity |

---

## The part worth discussing at review

The failure mode this task exists to prevent — a confident wrong transition into the board's real
**Done** — turned out to be reachable by **five distinct routes**. Only the first was known when the
task was written. Each of the other four was created or exposed by the fix for the one before it:

1. `done` retargeted at a gate column taking the done-category fallback *(the original bug)*
2. An unauthored file's built-in defaults outranking the workflow record's `enabled: false`
3. A `byIssueType` overlay's authored target being ignored entirely
4. A one-key overlay (`in-qa: ~`) claiming authorship of all eight moments
5. The credential-free MCP fallback running `--print-plan` without `--issue-type`

They were all the same mistake wearing different clothes: **the gate deciding "did a human choose
this?" sat at a different granularity from the code that resolves the answer.** They agree only at
per-moment-per-issue-type, which is where it now lives.

A second, sharper lesson concerns the tests. Cycle 1 added tests specifically to close the coverage
gap that let its own bugs through — and cycle 2 found that the headline one of those tests did not
test what its name claimed, so cycle 1's highest-severity fix had *zero* coverage. Cycle 3 then found
the same defect reintroduced by the fix for it. A test's name is not evidence; the only thing that
counts is asserting on an observable that actually differs between the correct and the broken
implementation.

---

## Impact

**For consumers with no `tracker-workflow.yaml`:** nothing changes. The built-in default ladder
reproduces existing behaviour, a one-rung walk is call-for-call identical to the previous single hop
— including the paths that never touch the network — and the JSON workflow record still decides every
moment.

**For consumers who author a `pipeline:` block:** gate columns work, and a retargeted `done` stops
being dangerous.

---

## Known limitations

1. **`rapp-story-ready-for-showcase.json` was not captured** — it needs a live authenticated request
   with an issue parked in that column. Fabricating it would defeat the purpose of fixtures whose
   value is that they are real. The two properties it was chosen to demonstrate are covered by real
   payloads on a fully-captured path.
2. **Two consumer tests** (`--dry-run` per real column) need board credentials.
3. **The MCP fallback remains one-hop by design.** A ladder consumer without an API token moves gated
   cards by hand — deliberate, since firing hop 1 and stopping is worse than not trying.

---

## Follow-up work

- **task.39** — GitHub tracker execution (no graph there, so no walking)
- **task.40** — step-file wiring
- **task.41** — new moments (`changes-requested`, `pr-merged`)
- Advisory: `validateWorkflow` could warn when a file authors `statuses:` but no `pipeline:`, since
  that file is not driving anything and says so nowhere
