# PR Review Report: PR #773 — feat(task.241): make /finalise changelog checks opt-in

**Reviewed:** 2026-10-28
**PR:** [#773](https://github.com/Gamaroff/agent-skills/pull/773) — `feature/task.241.finalise-changelog-checks-opt-in` → `develop` (OPEN)
**Work item:** [`task.241.finalise-changelog-checks-opt-in.md`](./task.241.finalise-changelog-checks-opt-in.md) — resolved via `branch-stem`
**Tracker:** [#772](https://github.com/Gamaroff/agent-skills/issues/772) — OPEN
**Verdict:** ⚠️ CONCERNS

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.241.implementation.1.finalise-changelog-checks-opt-in-initial-run.md |
| Review report | ✅ | task.241.review.1.finalise-changelog-checks-opt-in.md |
| QA reports | 3 | task.241.qa.1, qa.2, qa.3 |
| Gate | PASS | task.241.gate.3.finalise-changelog-checks-opt-in.yml (96). Route 2b: 2 LOWs carried |
| DoD | ❌ | Not expected yet: the task is not accepted |
| Sprint review | ❌ | Not expected yet |
| Open bugs | 0 | bug.1 to bug.4 are all Closed |
| Handover | ✅ | none present |

## Acceptance Criteria Traceability

The conformance lens found no coverage gap. Every success criterion has a hunk in the diff and a test
in `changelog-enforce.test.mjs` or `finalise-publish-boundary.test.mjs`.

## Conformance Findings

```
[PC-3] consistency · medium · confidence: high — docs/tasks/task.241.finalise-changelog-checks-opt-in/task.241.finalise-changelog-checks-opt-in.md:166
  The Breaking Changes section still says `enforce: yes` reads as off with a warning, but the shipped resolver, the corrected § 3 and configuration.md all make `yes` read as on.
  → Rewrite the § 5 entry so any YAML true spelling (`true`, `yes`, `on`) is on and only other non-false values are off with a warning.

[PC-1] trail · low · confidence: high — docs/tasks/task.241.finalise-changelog-checks-opt-in/task.241.finalise-changelog-checks-opt-in.md:292
  The criterion says CI has no zsh and the zsh arm is unverified, but .github/workflows/test.yml installs zsh and QA reports 2 and 3 plus gate 3 record the zsh arm as run on CI, so the trail contradicts itself.
  → Reword the criterion to say the zsh arm runs and passes on CI's test.yml lane, and remove the unverified residual.

[PC-2] trail · low · confidence: high — docs/tasks/task.241.finalise-changelog-checks-opt-in/task.241.finalise-changelog-checks-opt-in.md:219
  The same contradiction as PC-1, at this criterion.
  → Replace "CI has no zsh lane" and the unverified residual with a note that CI ran the zsh arm green on 93fb2108.
```

## Code Review Findings

Skipped (`--no-code`). QA runs the code reviewer every cycle; gate 3's scoped review is the code lens
for this head.

**Anchors:** 3 checked against `8754c848127bd978a21bed787e5145a8018dc21d` (via `head-branch`). All verified.

**Scope:** `git diff origin/develop...origin/feature/task.241.finalise-changelog-checks-opt-in`,
excluding `*/references/*`. That removes 97 bundled copies; none is named as a hand-written change,
and CI's bundle:check holds them to their sources.

## Machine-Readable Findings

```yaml
reviewed_gate: task.241.gate.3.finalise-changelog-checks-opt-in.yml
findings:
  - id: PC-3
    category: consistency
    severity: medium
    confidence: high
    ref: "docs/tasks/task.241.finalise-changelog-checks-opt-in/task.241.finalise-changelog-checks-opt-in.md:166"
    anchor_check: ok
    finding: "The Breaking Changes section still says enforce: yes reads as off with a warning, but the shipped resolver, the corrected § 3 and configuration.md all make yes read as on."
    suggested_action: "Rewrite the § 5 entry so any YAML true spelling (true, yes, on) is on and only other non-false values are off with a warning."
  - id: PC-1
    category: trail
    severity: low
    confidence: high
    ref: "docs/tasks/task.241.finalise-changelog-checks-opt-in/task.241.finalise-changelog-checks-opt-in.md:292"
    anchor_check: ok
    finding: "The criterion says CI has no zsh and the zsh arm is unverified, but CI installs zsh and ran the zsh arm green."
    suggested_action: "Reword the criterion to say the zsh arm runs and passes on CI's test.yml lane, and remove the unverified residual."
  - id: PC-2
    category: trail
    severity: low
    confidence: high
    ref: "docs/tasks/task.241.finalise-changelog-checks-opt-in/task.241.finalise-changelog-checks-opt-in.md:219"
    anchor_check: ok
    finding: "The criterion says CI has no zsh lane and the zsh arm is unverified, but CI installs zsh and ran the zsh arm green."
    suggested_action: "Replace the no-zsh-lane claim and the unverified residual with a note that CI ran the zsh arm green on 93fb2108."
truncated_count: 0
```

## Recommended Actions

1. PC-3: correct the Breaking Changes `enforce: yes` entry so it matches the resolver.
2. PC-1 and PC-2: record that CI ran the zsh arm, and drop the "unverified" residual.
