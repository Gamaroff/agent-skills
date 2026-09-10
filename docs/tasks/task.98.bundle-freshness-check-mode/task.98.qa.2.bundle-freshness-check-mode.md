# QA Report: Task 98 — cycle 2 (refute pass)

**Task**: [task.98.bundle-freshness-check-mode.md](./task.98.bundle-freshness-check-mode.md)
**Gate File**: [task.98.gate.2.bundle-freshness-check-mode.yml](./task.98.gate.2.bundle-freshness-check-mode.yml)
**PR**: [#367](https://github.com/Gamaroff/agent-skills/pull/367)
**Review Date**: 2026-09-09
**Gate Status**: FAIL

---

## Executive Summary

Cycle 2 is a **refute pass** — the whole branch diff re-read to find the claim in it that is false,
starting with cycle 1's fixes on the grounds that a fix is new code, not the closure of a finding.

It found one. A copy whose source was deleted **and** which cannot be read reports
`✅ bundle freshness: 1 skill(s) checked, 0 problems`. A clean result, produced by a read that failed.

The cause is worth stating precisely, because it is not a case nobody thought about: cycle 1 fixed
exactly this conflation — "could not look" reported as "looked and found nothing" — in the main loop,
and did not carry the correction twenty lines down into the orphan scan, in the same function. The
fix was correct and incomplete, and the incompleteness is invisible from the outside because its
symptom is a green tick.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| # | Finding (cycle 1) | Status | Verification |
|---|---|---|---|
| T98-QA-001 | Stale headerless copy gets a remedy pointing the wrong way | **FIXED** | Re-probed: detail now reads *"differs from the rewritten source, and `.json` files carry no provenance banner … If this is a bundled copy, delete it and re-bundle"*. The `.md` case verified to keep the generic text, so an authored file's owner is never told to delete it |
| T98-QA-002 | Unreadable file reported as "no banner and not byte-identical" | **FIXED (main loop only)** | Re-probed: now `UNREADABLE — could not be read: PermissionError`. **But see T98-QA-003** — the same conflation survives in the orphan scan |

Both fixes are mutation-proved (M12–M14, all red, control 24/24).

---

## New Findings This Cycle

Searched unscoped: the whole `origin/develop...HEAD` diff re-read as a refute pass, per the cycle-2
rule. Attention was directed first at cycle 1's fixes and at the **combination** of changes rather
than each change alone.

- **[high]** `skills/create-skill/scripts/bundle_skill.py` (orphan scan) — `if text is None: continue`
  treats an unreadable file as one making no provenance claim, so an orphan that is also unreadable is
  reported as nothing at all. → **T98-QA-003**, below.

- **[low / cleanup]** `skills/create-skill/scripts/bundle_skill.py` (`_is_binary`) — reads the entire
  file to answer a question that needs one byte. A non-UTF-8 reference is consequently read in full
  three times per check: once by `_read_text_or_error` (which raises), once by `_is_binary`, once by
  `_looks_bundled`. Bounded in practice — binary references are rare and small — but free to fix.

Nothing else. The four transition classes the refute directive names were probed explicitly and are
either not applicable or clean:

| Transition | Applicability | Result |
|---|---|---|
| Bulk teardown | N/A — the check holds no resources and emits nothing beyond stdout | — |
| In-flight | N/A — single-pass, no concurrency, no queue | — |
| Error path | Applicable — a read failure mid-scan | **This is where the defect is** (T98-QA-003) |
| Reconnect | N/A — no connection, no cached state between runs | — |

The combination probe (both cycle-1 changes interacting) produced one further case, checked and
correct: an **unreadable directory** at a reference name reports `AMBIGUOUS — not a regular file`,
because `is_file()` is tested before any read is attempted. The two new branches do not interfere.

---

## Issues Found

### HIGH Severity Issues (1)

**T98-QA-003 — the check can report a clean result over a file it could not open**

- **Severity**: HIGH
- **Category**: Reliability
- **Observation**:
  ```
  fixture: bundle a copy, delete its shared source, chmod 000 the copy
  result:  ✅ bundle freshness: 1 skill(s) checked, 0 problems
  ```
- **Impact**: The instrument's job is to make invisible staleness visible. A path that turns a failed
  read into a green tick reproduces, inside the new check, the precise failure the new check exists to
  eliminate. It is also the reading nobody questions — a clean result invites no follow-up.
- **Recommendation**: use `_read_text_or_error` in the orphan scan and report `UNREADABLE` when the
  read fails on a non-binary file. Keep the silent skip for genuinely non-UTF-8 content: a banner
  cannot be read from a binary file, which is residual 6 — a documented, bounded limitation, not a
  broken instrument. The distinction is the same one cycle 1 drew in the main loop.
- **Priority**: P1

### MEDIUM Severity Issues (0)

None.

### LOW Severity Issues (1)

`_is_binary` reads the whole file where one byte would do (see New Findings).

**Total Issues**: HIGH: 1, MEDIUM: 0, LOW: 1

---

## NFR Assessment

### Performance — CONCERNS
Three full reads of a non-UTF-8 reference per check run. Bounded, avoidable, non-blocking.

### Reliability — FAIL
See T98-QA-003. A check that can silently report clean is worse than no check, because it is believed.

### Security — PASS
`evidence: measured`, 3 probes (carried from cycle 1; re-confirmed against the two new branches, which
only read and which echo an exception class name rather than file content).

### Maintainability — PASS
The cycle-1 fixes are well-factored and carry their reasons at the site. T98-QA-003 is a missed second
call site, not a design problem — which is also why it is cheap to fix.

---

## Regression Testing

| Area | Result |
|---|---|
| Cycle-1 fixes | PASS — both re-probed, both mutation-proved |
| Full suite | PASS — 3017 pass / 0 fail |
| `relationship-assertion-lint` | PASS — after anchoring two new assertions it had correctly flagged as unbounded |
| Full-tree `--check` | PASS — 126 skills, 0 problems |

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One HIGH reliability finding. The deterministic rule (any HIGH → FAIL) applies, and it
is the right answer on the merits rather than only by the rule: the defect makes the instrument
report success over a file it never inspected.
**Quality Score**: 80/100

**Deployment Recommendation**: BLOCKED until T98-QA-003 is fixed.

**Note on the refute pass**: it earned its cost here. A narrowed cycle-2 review would have read only
cycle 1's fixes — where the defect is *absent*, since the fix that was applied is correct — and would
have missed the site that same fix should also have touched.

---

**Next Steps**: `/qa-fix` cycle 2 addresses T98-QA-003 (and the `_is_binary` cleanup), then re-review.
