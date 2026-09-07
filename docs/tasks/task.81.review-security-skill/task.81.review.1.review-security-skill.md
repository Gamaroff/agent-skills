# Task Review Report: Task 81 — Ship `/review-security`: prove a control engages, not that it is present

**Reviewed:** 2026-09-07
**Review Depth:** Standard
**Task Status:** Ready for Development (at review time)
**Overall Assessment:** GOOD — strong design, one blocking integration defect against the task.80 engine

---

## Executive Summary

The task is unusually well-specified: its motivation is evidence-backed, its two measured defects are real,
and its central structural idea — that the agent produces a probe *spec* while `security-probe.mjs` computes
the verdict — is exactly the right answer to the vacuity problem it names. Verification against the shipped
`task.79` corpus and `task.80` engine confirms every vocabulary claim it makes.

It nonetheless carries one **blocking** defect: the fixture entry-point signatures it specifies cannot be
called by the engine that is supposed to probe them. The engine invokes each entry with **exactly one
argument**, and the task specifies two. Left uncorrected, every case in both inert fixtures would be scored
`rejected`, the verdict would be `unverifiable`, and Phase 3's central assertion — the falsifiability proof
this task exists to establish — would fail. The likely repair under development pressure is to weaken that
assertion, which would reproduce precisely the vacuous instrument the task is written to replace.

All critical and important findings were applied to the task document in Step 8.5.

**Critical Issues:** 2 🚨
**Important Issues:** 5 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked — autonomous pipeline run (`/develop-task` Step 2/8); every
question that would have been asked interactively was resolved against the codebase instead and is recorded
under *Assumptions Resolved Without Asking* below.
**Implementation Readiness:** 6/10 before fixes → **9/10 after fixes**
**Recommendation:** **READY TO IMPLEMENT** (after the Step 8.5 fixes; **NEEDS REVISION** as originally written)

---

## Assumptions Resolved Without Asking

This review ran inside the `develop-task` pipeline with no user present. The skill's interactive question
points were resolved from evidence rather than deferred:

| Would-be question | Resolved how | Answer taken |
|---|---|---|
| Q1 — should the fixture entry points take the whole URL or the authority component? | Read the engine's child runner (`shared/resources/security-probe.mjs:120`) and the corpus inputs (`corpusFor('url-authority')`) | **Authority component, single argument.** The engine calls `await fn(spec.input)` and the corpus supplies components such as `"p@ss"`, never full URLs. Not a preference — the engine admits no other shape. |
| Q2 — how should the inert variants stay dormant? | Read `sandboxEnv` (`shared/resources/qa-execute-snippets.mjs:1139-1149`) | **Gate on `process.env.REDIS_TLS`, which the sandbox can never set.** The child env is a fixed 6-key allowlist and `runProbeSpec` passes no `bindings`, so dormancy is deterministic rather than dependent on the developer's shell. |
| Q3 — should this review create the missing GitHub issue? | Policy: an unattended run must not take outward-facing actions the operator has not confirmed | **No.** Logged as an Important gap; `/sync-github-task` can link it later. See I4. |
| Q4 — is the 6h estimate stale? | Recomputed `references/effort-estimation-rubric.md` | **No finding.** Rubric yields 8h against a stated 6h — 25% divergence, inside the 2× flag threshold. |

---

## 1. Template Structure Compliance

**Status:** PASS (one Important finding)

All eleven mandatory numbered sections are present (Overview, Motivation, Technical Background, Scope,
Breaking Changes, Implementation Plan, Files Summary, Testing Strategy, Success Criteria, Risk Assessment,
Rollback Plan), plus Progress Tracking, References and Notes. Filename follows `task.{n}.{name}.md` with dots
as structural separators.

**OKF frontmatter:** `type: task` present and non-empty ✅; `description` present ✅; `tags` a proper YAML
list ✅; `updated` present ✅. No findings.

**Stakeholder Sign-off:** `sign-off` is absent from `skills-config.yaml` → check skipped entirely, as
specified. Not a finding, and deliberately not mentioned in the task.

**Tracker card preflight:** `sync-jira-task.js --check-card` exits **0**, `ok: true`, zero findings. All three
card blocks resolve — Summary (prose, 260 chars, +3 omitted), Success Criteria (list, 455 chars, +5 omitted),
Breaking Changes (prose, 69 chars, +2 omitted). Reported as information: a board reader will not see those
omitted items, each of which the builder announces with a `+N more` link.

### Issues

#### Important
- **I5 — Change Log is stale.** Newest row is `1.0 Initial draft` (2026-09-02) while `status:` is
  `ready-for-development`. Per check 4b's currency rule, a status past `planned` with no row mentioning a
  review, status change or implementation event is stale. Enforcement is `advisory` (the default —
  `change-log` is absent from `skills-config.yaml`), so this does not block development.
  **Fixed in Step 8.5** by the verdict row this review writes.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND — 2 Critical
**Hallucinations Detected:** 0

Every technical claim the task makes about its own dependencies verifies. This is worth stating plainly
because the task's whole thesis is about unverified claims:

| Claim | Verified against | Result |
|---|---|---|
| Four verdicts `engages` / `present-but-inert` / `absent` / `unverifiable` | `security-probe.mjs:51-56` (`VERDICTS`, frozen) | ✅ exact |
| The engine, not the agent, computes the verdict | `computeVerdict` (`:256-291`), `runProbeSpec` (`:306`) | ✅ exact |
| Zero executed cases → `unverifiable`, never a pass | `:259`, `:377` | ✅ exact |
| `corpusFor('url-authority')` exists and supplies both directions | `security-input-corpus.mjs:702`, `SINKS:29-36`, 12 cases (9 hostile / 3 legitimate) | ✅ exact |
| `boundary: false` skips probe mode, and the negative case is the common one | `finalise-dod-security-prompt.md:46-50` — verbatim "A CRUD endpoint, a renderer, a report writer, a formatter, a schema migration, a logging change" | ✅ exact |
| `review-code` gives security one bullet | `code-review-prompt.md:41` | ✅ exact |
| `/security-review` is a Claude Code built-in and the names do not collide | Built-in skill list | ✅ correct |
| `review-pr` is precedent for a gate-less review skill | `skills/review-pr/SKILL.md` | ✅ exists |
| task.79 / task.80 / task.82 / task.76 exist | `docs/tasks/` | ✅ all four |
| Every registration target exists | `generate_catalog.py` `CATEGORIES:31-44`, `package.json` `test:26`, all four `docs/reference/*.md`, `CHANGELOG.md` `[Unreleased]:5`, `quick_validate.py`, `init_skill.py` | ✅ all |

### Issues

#### Critical

- **C1 — The specified fixture signatures cannot be called by the engine.**
  - **Location:** § 6 Phase 2, all four fixture bullets; § 7 Files Summary item 4.
  - **Issue:** the task specifies `buildRedisOptions(url, env)` — two parameters. The engine's child runner
    calls the entry point with exactly one:
    ```js
    const returned = await fn(spec.input);        // security-probe.mjs:120
    ```
  - **Evidence:** with a two-parameter entry, `env` is `undefined`. The inert variant's
    `env.REDIS_TLS === 'true'` then throws a `TypeError`, and the runner scores a throw as `rejected`
    (`:127-128`) — for **every** case, hostile and legitimate alike. `computeVerdict` reaches
    `legitimateAccepted.length === 0` and returns `{ verdict: "unverifiable", reason: "rejects-every-input" }`
    (`:280-287`). The fixture never reports `present-but-inert`.
  - **Impact:** Phase 3's primary assertion (`inert → present-but-inert`), Success Criterion "Given the inert
    Redis fixture, reports **`present-but-inert`**", and the mutation proof that depends on it are all
    unsatisfiable as written. The cheap repair when the test goes red is to relax the assertion to accept
    `unverifiable` — which would ship exactly the vacuous instrument this task exists to replace.
  - **Fix applied:** entry points respecified as single-argument composers taking the untrusted authority
    component.

- **C2 — Input-semantics mismatch between the fixtures and the corpus.**
  - **Location:** § 6 Phase 2; § 8 Testing Strategy.
  - **Issue:** the task names its parameter `url` and describes `rediss://` URLs, but `corpusFor('url-authority')`
    supplies **authority components**, not URLs: `"evil.example.com/x"`, `"db?sslmode=disable"`, `"p@ss"`,
    `"pa:ss"`, `"secret#1"`, `"[::1]"`, `"exa mple.com"`, `""`, and the legitimate
    `"db.internal.example.com"`, `"db.internal.example.com:5432"`, `"a%2Fb%2Bc%3Dd"`.
  - **Impact:** an implementer following the task literally writes a function that parses `"p@ss"` as a URL.
    Independent of C1, this produces fixtures that fail or mis-score for reasons unrelated to the control
    being probed.
  - **Fix applied:** § 6 Phase 2 now states the contract explicitly — one argument, the untrusted authority
    component, with the composed artefact returned and an unsafe component rejected.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND — 3 Important

Phases are well-formed: each carries a risk level, a file list, concrete checkboxes and an explicit
dependency. The gaps are all in Phase 2/3 and are all about the engine's verdict boundaries — which the task
treats as self-evident and which are not.

### Issues

#### Important

- **I1 — The `present-but-inert` boundary is unstated, and it is narrow.**
  - **Location:** § 6 Phase 2, § 6 Phase 3, § 9 Success Criteria.
  - **Issue:** `present-but-inert` requires the inert fixture to reject **at least one** hostile case *and*
    accept **at least one** hostile case (`computeVerdict:270-278`). Reject nothing and the verdict is
    `absent`; reject everything and it is `unverifiable`. The task describes its inert variants only as
    "the control is *present*" — which does not pin either bound.
  - **Impact:** a plausible reading produces an inert fixture that scores `absent`, and Phase 3 goes red for a
    reason that looks like an engine bug.
  - **Fix applied:** the bound is now stated in Phase 2 and asserted in Phase 3.

- **I2 — The `engages` boundary is unstated, and the corpus makes it non-trivial.**
  - **Location:** § 6 Phase 2, § 9 Success Criteria.
  - **Issue:** `engages` requires **every** hostile case rejected **and** at least one legitimate case
    accepted (`:280-290`). The legitimate set includes `"db.internal.example.com:5432"` — a colon that must
    be **accepted** — while the hostile set includes `"pa:ss"` — a colon that must be **rejected**. An
    engaged variant therefore cannot ban a delimiter class outright; it must discriminate `host:port` from a
    colon inside a credential.
  - **Impact:** this discrimination is what makes the engaged fixture a real control rather than a
    rubber stamp. Unstated, it is likely to be implemented as a blanket ban, which over-blocks a legitimate
    case and reads as a corpus problem.
  - **Fix applied:** stated in Phase 2, with the specific colon case named.

- **I3 — The probe sandbox's environment allowlist is unstated, and it constrains the design.**
  - **Location:** § 6 Phase 2 (inert variants gate on `env.REDIS_TLS`).
  - **Issue:** the probed child runs under `sandboxEnv` — a fixed six-key allowlist of `PATH`, `HOME`,
    `LANG`, `TERM`, `TMPDIR`, `PWD` (`qa-execute-snippets.mjs:1139-1149`) — and `runProbeSpec` passes no
    `bindings`, so a probe spec **cannot** set an arbitrary variable.
  - **Impact:** two consequences, both load-bearing. (a) The inert variant's dormancy is *guaranteed*, which
    is a strength worth recording rather than a coincidence of the developer's shell. (b) The **engaged**
    variant must engage **unconditionally** — it cannot be the same code path switched on by
    `REDIS_TLS=true`, because nothing can set that variable inside the sandbox.
  - **Fix applied:** recorded in Phase 2 as an explicit constraint on both variants.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

Overview, Scope, Implementation Plan, Files Summary and Success Criteria agree with one another. The
Out-of-Scope list is unusually disciplined — each exclusion carries its reason, and `--fix` in particular is
excluded on grounds the author argues against their own convenience.

Scope and complexity: 4 phases, ~23 top-level checkboxes, 10 file groups. Comfortably inside one work item;
no split recommended.

Testing Strategy covers the contract tests and — notably — names four mutation proofs, including the one
this repository has been bitten by before (*"Remove the new glob from `package.json` → the suite stops
running; confirm from the gate log, not by reading the glob"*). That is the correct instruction and it is
correctly justified.

**Mermaid diagrams:** none present. Not flagged — the task's structure is a linear four-phase plan whose
prose is already unambiguous, and a diagram restating the Implementation Plan would be removable on sight
per Step 6.5.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The risk register is the strongest section of the document. It names the correct top risk — that the skill
ships and is itself vacuous — assigns it Medium probability / Major impact, and mitigates it **structurally**
rather than with prose: the agent cannot write the verdict; `evidence: measured` requires
`probes_executed > 0`, enforced in CI; no PASS token exists in the schema; and the grep-decoy fixture is a
case only a probing implementation gets right.

Rollback is realistic and genuinely cheap: remove the glob, delete the skill directory. Verified against the
tree — v1 wires into no gate, so nothing else depends on it. The stated trigger (*"reports `engages` on a
known-inert fixture"*) is observable from the suite the task itself ships.

No findings.

---

## Summary of Recommendations

### Must Fix (Critical) — 2

1. **C1** — Respecify the fixture entry points as **single-argument** functions; the engine calls `fn(input)`.
2. **C2** — Take the **authority component**, not a full URL; that is what the corpus supplies.

### Should Fix (Important) — 5

1. **I1** — State the `present-but-inert` bound: ≥1 hostile rejected **and** ≥1 hostile accepted.
2. **I2** — State the `engages` bound: all hostile rejected **and** ≥1 legitimate accepted; name the
   `host:port` vs `pa:ss` discrimination.
3. **I3** — Record the `sandboxEnv` allowlist; the engaged variant must engage unconditionally.
4. **I4** — Task has no `github_issue`. Not created by this run (see below); run `/sync-github-task` to link.
5. **I5** — Change Log stale; a verdict row is written by this review.

### Consider (Optional) — 2

1. **O1** — `qa-task/SKILL.md:567` is cited for *"Review for security issues"*; the actual line is **580**.
   (Line 567 is a breaking-change table.) The quoted text is otherwise verbatim.
2. **O2** — Two Phase 3 contract assertions ("the relationship section is present", "the prompt references
   the corpus and does not restate it") are source-text greps. Legitimate for a prose-presence contract, but
   worth noting they prove a string exists rather than that a behaviour holds — the distinction this task is
   otherwise built around. Left as written; no change applied.

---

## Implementation Readiness Assessment

**Score (as originally written):** 6/10
**Score (after Step 8.5 fixes):** 9/10

| Axis | Before | After | Note |
|---|---|---|---|
| Template Compliance | 8/10 | 9/10 | Card preflight clean; Change Log was stale, now current |
| Technical Accuracy | 5/10 | 9/10 | Zero hallucinations, but two blocking integration defects against the engine |
| Implementation Clarity | 6/10 | 9/10 | Verdict boundaries and sandbox constraints now explicit |
| Consistency | 9/10 | 9/10 | No change needed |
| Risk Management | 10/10 | 10/10 | Structural mitigations, correct top risk |

**Confidence Level for Successful Implementation:** High (after fixes)

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No hallucinations and an unusually sound design; the two Critical findings were integration
defects against the `task.80` engine that are now corrected in the document, with the engine's exact verdict
boundaries written into the phases that must satisfy them.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Follow the four phases in order — Phase 2's fixture contract is now explicit about arity, input shape and
   the verdict each variant must produce.
2. Treat the Phase 3 assertions as fixed: if `inert` does not report `present-but-inert`, fix the **fixture**,
   never the assertion.
3. Run the four mutation proofs, and confirm the new suite **ran** from the gate log rather than from the glob.
4. Link the task to a GitHub issue with `/sync-github-task` when convenient (I4).

---

## Review Metadata

- **Reviewer:** Claude (review-task, autonomous — `/develop-task` Step 2/8)
- **Review Date:** 2026-09-07
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.81.review-security-skill/task.81.review-security-skill.md`
- **Sources consulted:** `shared/resources/security-probe.mjs`, `shared/resources/security-input-corpus.mjs`,
  `shared/resources/qa-execute-snippets.mjs`, `shared/resources/finalise-dod-security-prompt.md`,
  `shared/resources/code-review-prompt.md`, `skills/qa-task/SKILL.md`,
  `skills/create-skill/scripts/generate_catalog.py`, `package.json`, `docs/reference/*`, `skills-config.yaml`
- **Tracker card preflight:** `--check-card` exit 0, `ok: true`
