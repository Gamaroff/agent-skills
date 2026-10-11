---
name: develop-pipeline-lite-mode
description: Lite-mode contract for the develop-story and develop-task pipeline orchestrators. Covers trigger conditions, PIPELINE_MODE=lite behavior, the speed modes (`--mode standard|lite|fast`, `develop.defaultMode`), the skip vocabulary and its allow-list (`--skip`, `develop.skippable`), the floor no flag or policy can skip, the WAIVED gate a skipped step produces, the directive format passed to qa-story/qa-task, and Step 5c's `/review-pr --effort low` degradation (lite degrades the PR conformance review; it never skips it). QA-side effect details (Adaptive Review Strategy override) stay in each qa skill's own section.
---
<!-- AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/develop-pipeline-lite-mode.md. Regenerate via `npm run bundle`. -->

# Develop Pipeline — Lite Mode

## Trigger Conditions

`PIPELINE_MODE=lite` is activated by the orchestrator (`develop-story` or `develop-task`) when **all three** conditions are met after reading the document:

- `risk_level: low` or absent, **AND**
- Fewer than 3 Tasks defined in the story / fewer than 3 implementation phases in the task, **AND**
- Story or task touches a single module (single app or lib)

If **any** condition is not met, `PIPELINE_MODE=standard` (default — no change to behaviour).

## Pipeline Behaviour in Lite Mode

- Step 5 (qa-story / qa-task) uses **Direct Tools only** — skips parallel agents regardless of the Adaptive Review Strategy decision
- Step 5b (qa-fix) still runs if issues are found
- Step 5c (review-pr) runs with `--effort low` — **degraded, never skipped**. It is the loop's exit gate, and its conformance lens has no counterpart elsewhere in the pipeline; skipping it would remove the check entirely rather than shorten it
- All other steps run unchanged

### What Lite Mode Does NOT Skip (CRITICAL)

Lite mode trades **QA depth** for speed on low-risk work. It does NOT trade away the audit trail or stakeholder visibility. The orchestrator MUST still execute every Step 7 side-effect:

1. Write the `*.dod.{N}.*.md` file (full DoD audit, not a one-line acceptance note)
2. Set the story/task `status: accepted` in both frontmatter and body
3. **Post the full DoD body as a PR comment** (the entire DoD file content, not just a "task accepted" line)
4. **Comment on the linked tracker issue** via `tracker-comment.js` (and, on GitHub, `gh issue close`) with the PR URL and DoD verdict
5. **Update the project board / Jira board** status to Done — `gh-stage.js --stage done` on GitHub, `jira-stage.js --stage done` on Jira. Both resolve the target column from the consumer's `tracker-workflow.yaml`; neither is skipped in lite mode.

> Engine source: `references/tracker-comment.js` (bundled into each skill as `references/tracker-comment.js`). Contract: `references/tracker-comment-contract.md`.


Skipping any of these in lite mode leaves the issue stuck "In Progress" forever and hides acceptance evidence from reviewers. The full Step 7 protocol in `references/develop-pipeline-step-7-finalise.md` applies in lite mode without exception.

Step 4 (PR creation), Step 7 (finalise), and Step 8 (commit-changes) are **never** skipped in any mode.

Log in the implementation report Pipeline Configuration table:

| Pipeline mode | lite |

## Speed Modes and Skips

A developer can choose the speed at invocation, and the consumer sets the ceiling (task.201). Both are
resolved once, in Phase 0d, by `pipeline-answers.js` — the mode and the skips are **never asked**, and
the result (with each value's source) is shown in the 0f pre-flight summary and kept in the lock.

### Modes

Resolved **flag → `develop.defaultMode` → the lite detector** above:

| Mode | What it does | Who may choose it |
| --- | --- | --- |
| `standard` | Full depth. Overrides a lite detector | Anyone — it only adds depth |
| `lite` | The lite behaviour above. **Conditional**: honoured only when the three trigger conditions hold; otherwise refused with the reason and `standard` runs | Anyone — it changes nothing a document does not already qualify for |
| `fast` | The lite behaviour **regardless of the detector**: Step 5 direct tools only, Step 5c at `--effort low`. Does **not** cap QA cycles and does **not** change Step 2 | `--mode fast` only when `develop.skippable` lists both `qa-depth` and `review-pr-depth`; or the consumer sets `develop.defaultMode: fast` |

`develop-next` and `develop-batch` take no `--mode`: unattended work runs `fast` only when the
repository owner sets `develop.defaultMode: fast`. Speed for an unattended run is a standing decision,
not a per-invocation one.

### Skips

`--skip <step>[,<step>…]` applies only to a step `develop.skippable` lists. The allow-list **defaults to
empty**, so every skip is refused until a consumer opts in. Write it as one comma-separated line
(`skippable: review, qa-depth`) — the config reader is scalar-only, and a YAML block list reads as
empty, which refuses every skip and says why.

| Skip | Effect | Gate |
| --- | --- | --- |
| `review` | Step 2 does not run | **`WAIVED`** — `waiver.reason: "review skipped: --skip review"`, `waiver.approved_by:` the invoker (`git config user.name`) |
| `qa-depth` | Step 5 uses direct tools only | earned — `PASS` stays `PASS` |
| `review-pr-depth` | Step 5c runs at `--effort low` | earned |

A skip that removes a step cannot earn the verdict that step would have earned, so the gate reads
`WAIVED`. A skip that only shortens a step still yields a real review, so a clean result keeps `PASS` —
the skip is logged, but the verdict is earned. **A waiver never masks a failure**: an earned `FAIL`
stays `FAIL`. A `review` skip with no `git config user.name` is refused: a waiver needs an approver.
The authorisation is the consumer's allow-list, which the repository owner sets; the approver is the
developer who asked, and the waiver is visible in the gate, the DoD and the PR.

### The floor — never skippable in any mode

`create-branch`, `develop`, `create-pr`, `qa`, `review-pr`, `finalise` (and every Step 7 side effect
listed above), `commit`, and the tracker stage signals. A `--skip` naming one is refused as **floor**,
even when `develop.skippable` lists it.

### Recorded, never hidden

Every refused flag is logged with its reason in the Decisions Log and shown in 0f; the run continues
without it. Every applied skip is a Decisions Log line, and a removed step's waiver reaches the gate.

## Directive Passed to the QA Skill

When invoking `/qa-story` or `/qa-task` in lite **or fast** mode, or with `--skip qa-depth` in force,
the orchestrator **prefixes** the invocation with:

> "Use **direct tools only** for this review — skip parallel agents regardless of the adaptive strategy decision. This story/task is running in lite mode."

The QA skill recognises this directive and skips the parallel-agents branch of its Adaptive Review Strategy. QA-side effect details are documented in each skill's own **Lite Mode** section.

When the lock's `waiver` is set (a step was skipped), the orchestrator also prefixes:

> "A pipeline step was skipped by request: {waiver.reason}, approved by {waiver.approved_by}. Decide
> the gate as usual. If the decision would be `PASS` or `CONCERNS`, write `gate: WAIVED` instead, with
> the `waiver:` block — `active: true`, `reason: \"{waiver.reason}\"`, `approved_by:
> \"{waiver.approved_by}\"` — and keep `top_issues[]` as found. A `FAIL` stays `FAIL`."

The QA skill owns the gate file and writes it; the QA loop's §"Recording a waived step" checks the
result with `pipeline-answers.js gate` and never edits it.

## Decisions Log Entry

When `PIPELINE_MODE=lite` is set, log it in the Decisions Log:

```
- Pipeline mode: lite — risk_level low/absent + <3 Tasks/phases + single module
```
