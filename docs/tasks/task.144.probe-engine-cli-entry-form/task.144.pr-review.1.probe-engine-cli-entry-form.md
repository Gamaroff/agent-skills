# PR Review Report: PR #471 — feat(security-probe): cli: entry form — a Node CLI's boundary is executed, not declined (task.144)

**Reviewed:** 2026-09-23
**PR:** [#471](https://github.com/Gamaroff/agent-skills/pull/471) — `feature/task.144.probe-engine-cli-entry-form` → `develop` (OPEN)
**Work item:** [`task.144.probe-engine-cli-entry-form.md`](./task.144.probe-engine-cli-entry-form.md) — resolved via `branch-stem`
**Tracker:** [#470](https://github.com/Gamaroff/agent-skills/issues/470) — OPEN
**Verdict:** ⚠️ CONCERNS

Scope note: the diff excludes the 10 bundled `skills/*/references/` copies. They are byte-identical
regenerations of `shared/resources/`, and none is named in the Files Summary, the PR body or a
commit subject. Effort: medium. Invoked by develop-task Step 5c (the QA loop's exit gate) after
gate 6 read PASS 100.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.144.implementation.1.probe-engine-cli-entry-form-initial-run.md` (latest entries in the working tree; its final commit is Step 8's) |
| Review report | ✅ | `task.144.review.1.probe-engine-cli-entry-form.md` (READY TO IMPLEMENT 8/10) |
| QA reports | 6 | `task.144.qa.1` … `qa.6` |
| Gate | PASS | `task.144.gate.6.probe-engine-cli-entry-form.yml` (100); cycle 6 entry reads `Proceeding to 5c` |
| DoD | ❌ — expected | Status is `ready-for-review`; `/finalise` has not run yet |
| Sprint review | ❌ — expected | Same |
| Open bugs | 0 | — |
| Handover | ❌ — none | No deferred tracker actions |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| `cli:` runs every case; `probes_executed` = case count | `security-probe.test.mjs` "a refusing CLI engages — executed equals the case count" | ✅ met |
| refuser engages / inert present-but-inert / accept-all absent / crasher unverifiable | `cli entry:` verdict tests + 7 fixtures | ✅ met |
| malformed `--argv` → exit 2 `bad-argv`, no record; entry problems → named declines | "every malformed --argv / cli: combination exits 2" | ✅ met |
| distinct controls → distinct entries; a re-run replaces its own | name-identity, skeleton and REPLACES tests | ✅ met (except the pre-template-decline case — CR-1) |
| input reaches the CLI as one argv element, byte-identical | "the input reaches the CLI as ONE argv element" | ✅ met |
| uat-status within the per-case budget; no network; sandbox env | consumer run test (about 0.5 s); env-canary test | ✅ met |
| every new test mutation-proved; `no interpreter` parity green; ci clean | QA reports 1–6; fast gate 3967/0 | ✅ met |
| §5.1 no longer declines a multi-argument CLI; exit-status contract stated; CHANGELOG | `probe-boundary-rule.md`, `CHANGELOG.md` | ✅ met |

## Conformance Findings

```
[PC-1] scope · low · confidence: medium — task.144 §7 Files Summary
  Three changed files are not listed in §4 or §7: review-security SKILL.md (limit 3), its limits
  test, and the two population tests in probe-boundary-signals.test.mjs. Each traces to a QA fix
  (cycles 1 and 4), but the document does not record them.
  → Add them to §7 Files Summary, with a note that QA added them.
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: medium — shared/resources/security-probe.mjs:760
  A cli: probe declined before the template is parsed (a resolveEntry decline, e.g. an entry
  that escapes a wrong --repo-root) is recorded with argv: null, so controlKey drops its --name.
  The corrected re-run under the same name then writes a second entry, and the stale
  `unverifiable` control stays. Reproduced: two controls, one outside-repo-root (argv null) and
  one engages. It errs toward "could not look" — executed 0, never a false pass.
  → Key a cli: control on its name whenever the entry carries the cli: prefix, not only when
    argv is an array.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: scope
    severity: low
    confidence: medium
    ref: "task.144.probe-engine-cli-entry-form.md §7 Files Summary"
    finding: "Three QA-added files are not listed in the task's Files Summary."
    suggested_action: "List review-security SKILL.md, its limits test and probe-boundary-signals.test.mjs in §7, with a note that QA added them."
  - id: CR-1
    category: bug
    severity: medium
    confidence: medium
    ref: "shared/resources/security-probe.mjs:760"
    finding: "A cli: probe declined before its template is parsed is keyed without its --name, so its corrected re-run lands in a second entry and the stale unverifiable control stays."
    suggested_action: "Key a cli: control on its name whenever the entry carries the cli: prefix, not only when argv is an array."
truncated_count: 0
```

## Recommended Actions

1. CR-1: key named `cli:` controls by the entry prefix rather than `Array.isArray(argv)`, with a test for the declined-then-corrected pair. This is a follow-up, not merge-blocking, because it errs toward `unverifiable`.
2. PC-1: add the three QA-added files to §7 Files Summary before `/finalise`.
