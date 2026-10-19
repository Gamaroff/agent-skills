# Task Review Report: Task 215 - security-probe: run a Python CLI under the cli: entry form

**Reviewed:** 2026-10-19
**reviewed_blob:** d67c049b0797a84024bb9324f7ff372130edb34f
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 5 important recommendations and 5 of 6 optional recommendations implemented — 2026-10-19

---

## Executive Summary

The task is well-scoped, additive and anchored to real engine code. Its central gap is one the plan never mentions: a Python crash exits 1, exactly as a refusal does, so the cli: arm's only crash detector (Node's fatal-error footer) would score a crashing `.py` script as a control that refuses. The other findings are a post-merge criterion, an incomplete documentation site list, a wrong test location and an undecided interpreter-flag choice. All five are fixable in the document and were fixed.

**Critical Issues:** 0 🚨
**Important Issues:** 5 ⚠️
**Optional Improvements:** 6 💡

**User Clarifications:** 0 questions asked. This review ran inside the `develop-task` pipeline (Step 2), so each decision the document left open was taken on its own recommendation and is recorded below.
**Implementation Readiness:** 9/10 after fixes (7/10 before)
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

No questions were put to the user: the pipeline runs this review non-interactively. Three open points were settled from evidence. Each one is reversible in review of the PR.

**D1: Extend `cli:` by extension, or add a `py-cli:` prefix?** (the document asked review to confirm)
- **Decision**: extend `cli:` by extension, as the document recommends.
- **Rationale**: the `cli:` contract (one argv element per `{input}`, the exit status as the verdict, a crash as `errored`, `--name` identity) does not depend on the runtime. A second prefix would duplicate every decline reason and doc paragraph that `cli:` already has.

**D2: Which interpreter flags?** (the document said "decide and test")
- **Decision**: `python3 -E -s -B <entry> …argv`. Not `-I`.
- **Evidence** (run during review, Python 3.14.8): a `main.py` that imports a sibling `sib.py` exits 0 under `-E -s -B` and fails `ModuleNotFoundError: No module named 'sib'` under `-I -B`. Without `-B`, the same run writes `__pycache__/` into the script's directory. `watchedSpawn` watches that directory and records any change as an escape (`security-probe.mjs:1950-1954`), so without `-B` every probe of a script that imports a sibling reports a false escape.

**D3: Consumer proof and release (Implementation Plan step 6, Success Criterion 4)**
- **Decision**: moved to a new **Deferred Work** section.
- **Rationale**: both need a merged, tagged release and a re-vendored consumer. `/finalise` runs before merge, so a criterion that needs them cannot pass at acceptance.

---

## 1. Template Structure Compliance

**Status:** PASS

All eleven numbered sections, Progress Tracking and References are present. Frontmatter carries `type: task`, `description` and `tags`. The body links `#689`, matching `github_issue: 689` (the issue is open and on the board, now In Progress). There are no placeholders. Card preflight: `3 card blocks resolve` (Summary, Success Criteria, Breaking Changes). `doc-links.js`: `3 relative link(s) … resolve`. Sign-off is not enabled in `skills-config.yaml`. The Change Log is present and current for `planned`.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0

Pre-pass B (architecture alignment, `prepass-axes.js` source `architecture`): `drift`, axes checked: What this repo produces, Cross-skill resources, Validation before commit, Do not, Registries. Two low findings: Python runs at consumer runtime while tech-stack limits Python to build tooling (O3 below), and the engine's header comment must name its siblings by bare filename (already this repo's rule; noted in the plan).

Pre-pass C (codebase): `not-implemented`. `CLI_EXTENSIONS` is still `[".mjs", ".js"]` in the source and in all four bundled copies, and nothing in the engine or its tests spawns `python3`.

### Important

- **I1 — "a crash is `errored`" is unreachable as planned (check 10).** `runCliCase` tells a crash from a refusal only by `NODE_FATAL_FOOTER` (`security-probe.mjs:2199-2201`), the `Node.js vX.Y.Z` footer Node prints on an uncaught error. Python prints none. Measured during review: an uncaught `ValueError` exits **1** with a `Traceback (most recent call last):` block, a `SyntaxError` exits **1** with a `File "…", line N` block and **no** Traceback header, and a deliberate `sys.exit(1)` refusal also exits **1** with empty stderr. Under the plan as written, the branch that fires for a crash is `child.status === 0 ? "accepted" : "rejected"`, which returns `rejected`. A script that crashes on every input would then read as a control that refuses every hostile input. No planned phase adds the branch.
  - **Fix applied**: Implementation Plan step 1 now states the branch. For a `.py` entry, a non-zero exit whose stderr ends with a Python exception line (`^[A-Za-z_][\w.]*(Error|Exception|Interrupt|Exit)\b`) after at least one `  File "…", line N` frame is `errored`. This covers the uncaught-exception and the `SyntaxError` shapes. The Testing Strategy names both shapes and a plain `sys.exit(1)` refusal as the control case that must stay `rejected`.
- **I2 — the interpreter flags were left open ("decide and test").** Decided as D2, with the measured evidence. Plan step 1 now names `-E -s -B` and the sibling-import fixture that holds it.
- **I3 — the doc site list is the author's recall (check 20).** The plan names `probe-boundary-rule.md` §5 and `finalise-dod-security-prompt.md` Step 4. The search `git grep -n "Node CLI" -- 'shared/resources/*.md' 'skills/*/SKILL.md'` also finds `security-review-prompt.md` (101, 111, 172, 268), `skills/qa-task/SKILL.md:679`, `skills/qa-story/SKILL.md:1169` and `skills/review-security/SKILL.md:156`, each of which routes "a Node CLI" to `cli:`.
  - **Fix applied**: plan step 4 and the Files Summary now record the search and every site it returns.
- **I4 — the test location is wrong.** The plan puts engine tests under `evals/shared/tests/`. The engine's suite is `shared/resources/tests/security-probe.test.mjs`, which the `npm test` glob `'shared/resources/tests/*.test.mjs'` already reaches (check 18).
  - **Fix applied**: Files Summary and Testing Strategy now name that file.

### Optional

- **O1 — drifted anchor.** `:1617` is the JS-export runner (`spawnSync(process.execPath, ["--input-type=module", "-e", RUNNER])`). The `cli:` child is spawned in `runCliCase` at `:2286-2288`. Corrected.
- **O2 — `XDG_*` is not redirected; it is never passed.** `sandboxEnv()` (`qa-execute-snippets.mjs:2038`) carries only `PATH`, `HOME`, `LANG`, `TERM`, `TMPDIR`, `PWD`, and `caseEnv` overrides `HOME` and `TMPDIR` with directories inside the sandbox root. So no `PYTHON*` variable reaches the child either: `-E` is a second line of defence, not the only one. A write to `$HOME` lands in the sandbox root and is recorded as an escape; it never reaches the real home. Plan step 2 now says so.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes

- **O4 — the record field was unnamed.** "Add the interpreter … to the control entry" did not name a field. Now: a top-level `interpreter` field on the result and run record (`{ name: "python3", version: "<python3 --version>" }`), `null` for every other form. This sits beside `shells` (`security-probe.mjs:1758`), the precedent the document cites.
- **O6 — the missing-interpreter test mechanism was unstated.** Now: run the engine CLI as a child (`process.execPath`, absolute) with `PATH` set to an empty temporary directory, and assert one `entry-not-probeable` decline naming `python3`. `sandboxEnv` takes `PATH` from the engine's own environment, so the child and the resolution agree.

Effort (6h) is consistent with the rubric for a single-engine change with docs and bundling.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT after fixes

### Important

- **I5 — a criterion that can only be met after merge (Step 6 check 4).** Success Criterion 4 (consumer proof after re-vendoring) and Implementation Plan step 6 (release a tag, re-vendor) both need a merged release. `/finalise` runs before merge. The open point on `--fixture-setup` for `cli:` belongs with them: it can only be settled against the consumer.
  - **Fix applied**: both moved to a new **Deferred Work** section, with the open point. Success Criteria now hold SC1–SC3 plus a crash criterion (I1). Each has a named per-PR test.

Criterion classification (as `/finalise` will classify): SC1–SC4 are behaviour criteria, each held by a named test in `security-probe.test.mjs`. SC2's "every other decline reason is unchanged" is held by the existing suite, which stays green. No criterion is test-free.

No test pins the decline text being changed: `git grep -n "the cli: form runs it with node" -- '*.test.*' evals` returns nothing (check 15). `probe-boundary-signals.test.mjs:302` requires routing sites to name `cli:`, and the doc edits keep that.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE after fixes

- **O5 — risk rationale.** "Low" stands for the blast radius: the change is additive behind an extension that was declined before. But the failure that matters is silent: a crash misread as a refusal makes a broken Python control look like a working one. The Risk Assessment now names that risk and its oracle (I1's crash tests, with a plain refusal as the control).
- **O3 — Python at consumer runtime.** The engine spawns the consumer's `python3`, resolved from `PATH` at probe time, only for a `.py` entry. It is not a dependency of this repository. The tests need `python3` on the CI lane: `test.yml` runs on `ubuntu-latest`, which ships it. Not applied as a document edit beyond one Technical Background line. This is the one optional item recorded rather than changed.

Rollback is complete: revert, re-bundle, and `.py` returns to `entry-not-probeable`.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 5 issues (all applied)

1. I1 — state the Python crash branch, and test both crash shapes plus a refusal control.
2. I2 — decide the flags: `-E -s -B`.
3. I3 — record the doc-site search and every site it returns.
4. I4 — move the tests to `shared/resources/tests/security-probe.test.mjs`.
5. I5 — move the consumer proof and the release to Deferred Work.

### Consider (Optional) - 6 items

O1 anchor corrected · O2 sandbox env clarified · O3 runtime note (one line) · O4 record field named · O5 risk rationale · O6 missing-interpreter test mechanism.

---

## Implementation Readiness Assessment

**Score:** 9/10 (after fixes)

- Template Compliance: 10/10
- Technical Accuracy: 8/10 (I1 and I2 were real gaps; no hallucinations)
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues. Every important finding was fixed in the document, and the two behaviour claims the plan rests on (the sibling import under `-E -s -B` and Python's crash exit status) were run, not reasoned about.

---

## Next Steps

1. Implement steps 1–3 test-first in `shared/resources/tests/security-probe.test.mjs`. Write the crash tests before the crash branch, and revert the extension map once to watch the `.py` test go red.
2. Make the doc edits at every site the recorded search returns, then `npm run bundle`.
3. After merge: Deferred Work (release, re-vendor, consumer proof).

---

## Review Metadata

- **Reviewer:** review-task (develop-task pipeline, Step 2)
- **Review Date:** 2026-10-19
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.215.probe-engine-python-cli-entry-form/task.215.probe-engine-python-cli-entry-form.md`
- **Architecture Docs Consulted:** via pre-pass B (`docs/architecture/concepts/tech-stack.md`, `coding-standards.md`)
- **Pre-pass:** B and C dispatched 10:24Z, both returned in under 20 s (`duration_ms` 13637 and 17466)
