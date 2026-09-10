# PR Review Report: PR #320 — fix(task.91): one tracker resolution, not two

**Reviewed:** 2026-09-05
**PR:** [#320](https://github.com/Gamaroff/agent-skills/pull/320) — `feature/task.91.reconcile-tracker-resolution` → `develop` (OPEN)
**Work item:** [`task.91.reconcile-tracker-resolution.md`](./task.91.reconcile-tracker-resolution.md) — resolved via `branch stem`
**Tracker:** [#319](https://github.com/Gamaroff/agent-skills/issues/319) — OPEN, milestone *Technical Tasks (standalone)*
**Verdict:** 🚨 **REQUEST CHANGES** → all findings addressed in-cycle → re-verified ✅ **APPROVE**

> **Scope**: 76 auto-generated `*/references/*` bundled copies excluded from the reviewed diff (3,363
> lines reviewed of 6,459). The **code lens was deliberately not dispatched**: the QA loop ran the
> shared adversarial code reviewer with `code_review_blocking=true` on cycles 1 and 2, and this skill's
> own guidance notes that 5c's code lens duplicates it inside a pipeline. Only the conformance lens is
> new value here. Stated so the review's scope is auditable.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.91.implementation.1.*` |
| Plan | ✅ | `task.91.plan.*` — its divergence table was the acceptance harness throughout |
| Review report | ✅ | `task.91.review.1.*` (READY TO IMPLEMENT, 9/10) |
| QA reports | 4 | `qa.1`, `qa.2`, **`qa.3` (written at this step)**, `qa.4` |
| Gate | **PASS** | `gate.4` (95/100); history FAIL 70 → FAIL 70 → CONCERNS 80 → PASS 95 |
| DoD | ⏳ | not yet — Step 7 |
| Sprint review | ⏳ | not yet — Step 7 |
| Open bugs | 0 of 6 | all `Ready for QA`, each with a Developer Fix Cycle record |
| Handover | n/a | `access.tracker` is `full`; nothing deferred |

---

## Acceptance Criteria Traceability

| Criterion | Evidence | Status |
|---|---|---|
| F1 — no config shape resolves differently install vs run | 12 `PARITY_CASES` + 12 `DOTENV_CASES`, each asserting `install == runtime`; 61/61 pass | ✅ met |
| F2 — `.env`-only `JIRA_URL` installs the matching set | unit `install and run time agree on a .env-only JIRA_URL` + integration asserting the on-disk set against `runtimeTracker(dir)` | ✅ met |
| F3 — unrecognised scalar graded the same at both ends | `PARITY_CASES` row `tracker: bitbucket → <refused>`; installer rc-2 halt | ✅ met |
| F4 — `tracker:<TAB>jira` graded the same | `PARITY_CASES` tab row, with the comment on why delegation had to be wholesale | ✅ met |
| F5 — map form still `auto` | `PARITY_CASES` map row; `__MAP__ → auto` preserved | ✅ met |
| F6 — `access.tracker` never read as a platform | `PARITY_CASES` row; **but** `tracker-access.test.sh` asserts `ACCESS_TRACKER` without asserting `TRACKER` stays `github` | ⚠️ partial |
| CQ1 — `npm run ci` green | run at each cycle; final 2450 tests, 0 failures, exit 0 | ✅ met |
| CQ2 — shellcheck 0 new | `setup-consumer.sh` 1 vs baseline 1; `resolve-platform.sh` 20 vs 20 | ✅ met |
| CQ3 — every behaviour change mutation-proven | 10 proofs recorded; bugs 3, 4 and 6 carry none (3 relies on a pre-existing test) | ⚠️ partial |
| CQ4 — `npm run bundle` run and committed | 38 resolver + 38 `platform-detection.md` copies verified in sync | ✅ met |
| M1 — CHANGELOG names affected repos and opt-out | the ⚠️ BEHAVIOUR CHANGE block, with a three-shape before/after table | ✅ met |
| M2 — `DELIBERATE asymmetry` test updated or removed | replaced in place, history kept in a comment | ✅ met |

---

## Conformance Findings

All eleven were addressed during this step. Recorded with what was done, not just what was found.

**[PC-1] trail · high · confidence: high** — `origin/feature/task.91…` vs the working tree
> **The PR did not contain the evidence it was being judged on.** `gate.4` (PASS 95), `qa.3` and `qa.4`
> were untracked and the task-document updates uncommitted, so the pushed branch still read
> `**QA Status**: FAIL (cycle 2)`, `70/100`, with `- [ ] QA review complete` unticked. Anyone opening
> PR #320 was reading a FAIL-gated task.
>
> This is the finding that earned the REQUEST CHANGES verdict, and it was mine to make: the four QA
> cycles each committed their *fixes*, and the final gate that judged them was never committed at all.
> → **Fixed**: all four artifacts and both document updates committed and pushed.

**[PC-2] trail · medium** — `qa.3` missing though `gate.3` existed. Every other gate has a paired
report; `qa-task`'s own deliverables table requires both per cycle.
→ **Fixed**: written, carrying an explicit *"Written late, and saying so"* banner. A reconstructed
report that says it is reconstructed is a different artifact from one pretending to be contemporaneous.

**[PC-3] trail/consistency · medium** — `platform-detection.md`, the file §7 designates the source of
truth and requires to change **first**, was two commits behind the resolver it governs. It asserted
*"Both resolvers share the `^JIRA_URL=.+` pattern"* — false twice over: the installer no longer has a
`.env` probe at all, and the resolver replaced that grep with an awk parser. The stale claim was baked
into all 38 bundled copies.
→ **Fixed**: the Precedence prose now carries a per-spelling table (`export`, CRLF, quoted-empty,
last-match) with the defect each closed; the code block shows `_rp_dotenv_has_jira`; rebundled.
Four QA cycles chased the installer's error contract hard and never re-read the canonical doc against
the code — worth naming as the process gap, not just the file.

**[PC-4] coverage · medium** — the runtime resolver's own suite, `resolve-platform.test.sh`, named in
§8 as the regression net for *"an unintended change to it"*, was never extended. All 12 `.env` cases
lived only in the **installer's** test file. Delete the installer and the new runtime rung loses its
coverage entirely.
→ **Fixed**: 8 cases added there (plain, `export`, CRLF-empty, quoted-empty, last-wins, the prefix trap,
config-beats-stale-`.env`, and env-beats-emptied-`.env`). 14/14 pass, and **mutation-proven** —
removing the rung turns 2 red in that suite, which it would not have before.

**[PC-5] coverage · medium** — the parity assertion the task calls *"the valuable part"* is now
near-tautological: both sides source the same file, so `assert.equal(install, runtime)` cannot fail by
construction. The file admitted this for the `.env` rows and not for the 12 config rows that §9's
headline criterion rests on.
→ **Fixed**: the note now sits on `PARITY_CASES` too, stating plainly that the agreement half is a
**regression detector** — it stops being a tautology the moment delegation is removed — rather than
present-tense proof.

**[PC-6] trail · medium** — `TASK-91-007` and `-009` are MEDIUM findings with no bug report, which
`qa-task` requires.
→ **Recorded** in gates 2 and 3 with the reasoning: -007 is a finding *about* the other findings with
no independent reproduction, and -009 was raised and closed within one cycle with its proof in the
commit. Both are MEDIUM and fully traceable; neither affected the third-strike count, which reads HIGH
only. Recorded so six bug reports against ten findings is explicable rather than silent.

**[PC-7] scope · low** — the A+B reframing is **supported, not post-hoc** (the reviewer verified the
pivotal claim against the pre-change resolver: A alone would have deleted the installer's `.env` probe
and collapsed into the rejected Option C). The soft spot was that the Phase 1 Decision overrode §10's
*"prefer Option A"* without acknowledging it.
→ **Fixed**: the decision now says it supersedes that preference, and why.

**[PC-8] scope · low** — *positive verification.* Option B's HIGH-RISK mitigations were checked against
code: the `.env` rung sits inside the `auto` branch below the process environment, pinned by a test; the
CHANGELOG names the shape and the opt-out. No scope leakage — every non-doc file is named in §4 or §7.

**[PC-9] coverage · low** — the test named *"the process environment still beats .env"* never set a
process-environment `JIRA_URL`; it wrote an empty one to `.env` and asserted github twice. A test whose
name claims a property it does not exercise makes that property look covered.
→ **Fixed**: renamed to what it asserts, and the precedence it claimed now lives in
`resolve-platform.test.sh` where both rungs can actually be set and told apart.

**[PC-10] consistency · low** — `risk_level: medium` was set before the HIGH-RISK option was chosen, and
nothing re-evaluated it once B shipped.
→ **Fixed**: §10 now records the outcome and why `medium` remains honest — the HIGH is B's *unmitigated*
risk, and with the config key winning and the wizard always writing a `tracker:` key, the window is
hand-authored configs only.

**[PC-11] consistency · low** — three staleness items: no gate-4 Change Log row with cycle 3 filed above
cycle 2; §12 line references drifted again (`:424-437`, `:878`); Known Issues still read as a live
prediction.
→ **Fixed**: log reordered with gate-4 and status rows added; references now cite **symbols** with line
numbers, since this class of drift has now recurred twice on this document; Known Issues rewritten to
record what actually happened — the test never went red, because it was replaced in the same commit
rather than observed failing.

---

## Code Review Findings

Not dispatched at this step — see the scope note above. The diff had three adversarial passes inside the
QA loop (cycle 1's review, cycle 2's refute pass, and targeted probing in cycles 3–4), which produced
all ten findings this task closed.

---

## Recommended Actions

1. ✅ **Done** — commit and push the PASS evidence (PC-1). Without it the gate-4 claim is unreviewable.
2. ✅ **Done** — re-sync `platform-detection.md` and rebundle (PC-3).
3. ✅ **Done** — pin the `.env` rung from the runtime side (PC-4).
4. ⏭ **Carried to a follow-up** — `tracker-access.test.sh` does not assert that `TRACKER` stays `github`
   for its `access.tracker` fixtures (F6 partial). Real, pre-existing, and outside this task's §4 scope.
5. ⏭ **Carried** — bugs 3, 4 and 6 record no mutation proof (CQ3 partial). All three are message- or
   provenance-only changes with no behaviour to revert, but that reasoning was never written down.

---

## Verdict

Initial: 🚨 **REQUEST CHANGES**, on PC-1 alone — a PR whose own evidence is not in it cannot be judged
on that evidence, whatever the local files say.

After remediation: ✅ **APPROVE**. The engineering was sound throughout and independently reproduced by
the reviewer — suite, shellcheck, bundled checksums and every §9 criterion traced to a named test or an
executed command. Every problem found at this step was in the **trail and the documentation**, which is
a real result rather than a lenient one: the four QA cycles interrogated the installer's error contract
exhaustively and never once re-read the canonical spec against the code they were changing.
