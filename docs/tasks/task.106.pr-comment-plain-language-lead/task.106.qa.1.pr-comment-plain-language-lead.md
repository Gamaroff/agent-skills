# QA Report: Task 106 — Pull-request summary comments open with a plain-language lead

**Task**: [task.106.pr-comment-plain-language-lead.md](./task.106.pr-comment-plain-language-lead.md)
**Gate File**: [task.106.gate.1.pr-comment-plain-language-lead.yml](./task.106.gate.1.pr-comment-plain-language-lead.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-10
**PR**: [#381](https://github.com/Gamaroff/agent-skills/pull/381) — commit `44eacbe3`
**Gate Status**: PASS

---

## Executive Summary

Eleven pull-request conversation templates plus one engine-built body now open with a plain-language
lead. Every success criterion was verified **mechanically** — by running the code, not by reading it —
and both weaknesses the developer self-reported were re-probed independently rather than accepted.
One LOW advisory finding, established as pre-existing by comparison against the base branch.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Review Methodology

Direct tools, plus one read-only Explore subagent for the Step 3b diff code review. Standard mode
(not lite): 5 phases across multiple modules.

**This review deliberately re-derived the developer's own evidence.** The implementation report
discloses that the first four mutation proofs were invalid — reverted with `git checkout --`, which
restores HEAD and therefore deleted the uncommitted fix, so every later proof measured its absence.
A QA pass that accepted the corrected table on trust would be accepting a table produced by the same
process that got it wrong the first time. Both previously-surviving mutants were re-run here.

---

## Independent Verification

| Claim | How it was checked | Result |
| :--- | :--- | :--- |
| §5.1 marker stays at byte 0 (site 2) | Read the `BODY="$MARKER` construction **and** the `startswith(...)` search at `finalise:1083` | ✅ marker first; search intact |
| §5.1 marker stays at byte 0 (site 10) | Read the `printf` order **and** the search at `review-pr:434` | ✅ marker, then lead, then report |
| §5.4 namespaces disjoint | Loaded both modules; computed overlap and union-vs-catalogue | ✅ overlap empty; union == catalogue exactly |
| Tracker engine refuses PR stages | Invoked the engine with each of the three stages **and a `qa-gate` control** | ✅ all three rejected by name; control reached `dry-run` |
| Mutant "double-lead" | Re-applied with `assert` proving the edit landed | ✅ 52 pass / 1 fail |
| Mutant "lead on one inline body" | Same | ✅ 52 pass / 1 fail |
| 11 call sites guarded | Reassembled each continued shell command, then matched `\|\| exit 1` | ✅ 11 sites, 0 unguarded |
| `buildSummaryBody` branches | Executed all three reachable input combinations | ✅ lead-only, caller-only, caller+degraded |
| Bundle idempotent | Re-ran `npm run bundle`, diffed **scoped to `references/` and `shared/resources`** | ✅ 0 changed files |
| Module purity contract | Grepped for I/O requires and `process.exit` | ✅ only match is the contract sentence itself |
| CLI uses `process.exitCode` | Grepped, then ran the repo's own stdout-drain guard | ✅ 10/10 pass |

> **One QA check was wrong and is recorded rather than quietly dropped.** The first bundle-idempotency
> check used `git diff --quiet` over the whole tree and fired on the implementation report, which had
> been edited after the commit. Scoped correctly it is clean. A check that fails for the wrong reason
> spends reviewer trust it did not earn, so the correction is stated here rather than in a silent
> re-run.

---

## Success Criteria Verification

**Functional**

| Criterion | Target | Actual | Status |
| :--- | :--- | :--- | :--- |
| All eleven templates led, both arms | 11 | 11 | PASS |
| `buildSummaryBody()` leads; `--summary-file` not double-led | yes | yes | PASS |
| Inline findings carry no lead, asserted | test exists | **two** tests (shape + source construction) | PASS |
| Sites 2 and 10 remain idempotent | marker first | marker at byte 0, searches intact | PASS |
| Board warnings state consequence; site 4 keeps its record id | yes | yes | PASS |

**Performance**

| Criterion | Target | Actual | Status |
| :--- | :--- | :--- | :--- |
| No new network calls | 0 | 0 — every lead rides an existing call | PASS |

**Code quality**

| Criterion | Target | Actual | Status |
| :--- | :--- | :--- | :--- |
| One insertion point per site | 1 | 11 invocations / 11 sites | PASS |
| No new vocabulary | catalogue only | all from `stakeholder-summary.js` | PASS |
| PR stages absent from `COMMENT_STAGES` | exits 2 | exits 2, by name, with a control | PASS |
| No `references/` hand-edited | 0 | 0 | PASS |

**Migration**

| Criterion | Status |
| :--- | :--- |
| Contract documents composition order + exclusion | PASS |
| Standard explains **why** inline findings are excluded | PASS |

**12/12 criteria met.**

---

## Breaking Changes Validation

### §5.1 Idempotent comments change body, not identity
Documented: Yes · Migration path: Yes · Verified: Yes · Consumer code updated: N/A
The marker is at byte 0 on both idempotent sites, and the body is built **once** and read by the
PATCH path, the POST path and both Bitbucket paths — so the lead cannot reach one and miss another.
That was the failure mode §5.1 named as easy to miss.

### §5.2 `buildSummaryBody()` output changes
Documented: Yes · Migration path: Yes · Verified: Yes
The test suite was updated as specified. Notably it was updated *twice*: the first version could not
fail (see Mutation Proofs).

### §5.3 Bitbucket bodies grow
Documented: Yes · Migration path: none needed · Verified: Yes — no retry was smuggled in.

### §5.4 Lead catalogue vs `COMMENT_STAGES` namespace
Documented: Yes (added during review) · Migration path: Yes · Verified: Yes, with a control.
The prescribed resolution was followed exactly: a second enumeration, union assertion, `--stage`
validation unchanged. The wrong fix the section warns against was **not** taken.

**Overall: PASS**

---

## Step 4b — Executed Documented Commands

Runnable-prose rule fires: the change set modifies six `SKILL.md` files and two
`shared/resources/*.md` prompts carrying fenced bash.

| File | blocks | runnable | placeholder | mutating |
| :--- | ---: | ---: | ---: | ---: |
| `qa-story/SKILL.md` | 14 | 0 | 5 | 9 |
| `qa-task/SKILL.md` | 16 | 0 | 4 | 12 |
| `qa-fix/SKILL.md` | 8 | 0 | 2 | 6 |
| `finalise/SKILL.md` | 24 | 0 | 2 | 22 |
| `review-pr/SKILL.md` | 13 | 0 | 1 | 12 |
| `review-code/SKILL.md` | 5 | 0 | 0 | 5 |
| `develop-pipeline-step-7-finalise.md` | 10 | 0 | 2 | 8 |

Each file except `review-code` emits `zero-blocks-executed` (medium). `review-code` correctly emits
`no-executable-blocks` (information, exit 0).

**Is this a regression? No — established, not assumed.** The engine was run against `origin/develop`
in a detached worktree: `runnable=0` on **every** file at the base as well. The counts moved only
where blocks were added.

**LOW finding, advisory.** The engine's allow-list does not recognise `node`, so a block invoking
`stakeholder-summary-cli.js` is refused as `mutating` with `unrecognised-command: node (fail-closed)`.
The consequence is a lowered ceiling rather than a break: those blocks can never become executable by
supplying `--bind`. It is consistent with the pre-existing `tracker-comment.js` invocations, which
are refused identically, so it is a property of the engine's safety boundary and not a defect in this
task. Recorded as a `future` recommendation against `qa-execute-snippets.mjs`.

---

## Mutation Proofs

**Method matters here and is stated deliberately: snapshot restore (`cp` aside, `cp` back), never
`git checkout --`.** The fix under proof is uncommitted by definition, so any version-control restore
reverts the fix along with the mutant — which is exactly what happened on the developer's first run
and left two mutants alive while reporting them caught.

QA re-ran the two that had survived, each with an `assert` proving the mutation applied:

| Mutation | Result |
| :--- | :--- |
| Double-lead (unconditional prepend instead of `else if`) | 52 pass / **1 fail** ✅ |
| Lead on one inline finding body | 52 pass / **1 fail** ✅ |
| Restored | 53 pass / 0 fail; file byte-identical to the commit |

`mutation-proven: yes` for both repaired tests. The other two engine invariants and the four Guard C
invariants were proven by the developer and spot-checked as consistent with the suite's current
behaviour.

---

## NFR Assessment

### Performance — PASS
No new network calls; one local `node` invocation per comment, on a path that already shells out.

### Reliability — PASS
All 11 sites guard with `|| exit 1`. The CLI fails loudly (exit 2) on an unknown stage rather than
emitting an empty string — which would post a comment opening with a bare horizontal rule, a defect
that reads as a formatting slip rather than a missing paragraph. Rollback plan carries triggers,
immediate, partial and forward-fix.

### Security — PASS
**Evidence: `reasoned`. Probes executed: 0.** No auth, secret or network surface is added. The new
CLI requires exactly one module — the pure catalogue — and writes only to stdout. This verdict was
reached by reading the diff and the require graph, not by executing hostile input, so `reasoned` is
the accurate value; recording it as `measured` with zero probes would be a schema error and a false
claim about how the verdict was reached.

### Maintainability — PASS
Three suites extended (52 + 53 + 10). The namespace invariants are held by four assertions rather
than by prose, and `stakeholder-summary.js`'s purity contract is intact.

---

## Regression Testing

`npm run ci:fast` green, 0 failures, on the committed tree. `transition-protocol-parity` 27/27 after
being taught the third `--stage` engine — without that, twenty literals were misattributed, including
`qa-gate`, a correct comment stage read as a board stage.

`npm run eval:all` has **not** run. It fires at `develop-next`'s merge gate. This is the one piece of
verification this gate does not cover, and it is stated rather than implied.

---

## Issues Found

**HIGH: 0 · MEDIUM: 0 · LOW: 1**

**LOW-1** — Step 4b cannot execute blocks that invoke the new CLI (`node` is fail-closed in the
engine's allow-list). Pre-existing class, not a regression; advisory. No bug report filed: LOW
severity is documented in this report only.

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 95/100
**Deployment Recommendation**: APPROVED

**Rationale**: 12/12 success criteria met and verified by execution. Both self-reported weaknesses
re-probed independently and held. The single finding is advisory, pre-existing, and belongs to the
snippet engine rather than to this change.

**Next Steps**: Step 5c `/review-pr` conformance review, then `/finalise`.
