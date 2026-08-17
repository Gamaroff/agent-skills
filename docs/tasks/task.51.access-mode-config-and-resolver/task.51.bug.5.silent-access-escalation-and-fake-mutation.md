# Bug Report: Task 51 - Two `access:` shapes silently resolve to `full`; the guard mutation is self-deceiving

**Task**: [Link](./task.51.access-mode-config-and-resolver.md)
**Bug ID**: TASK-51-BUG-5
**Severity**: HIGH
**Priority**: P0
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-08-17

## Description

Two legal ways of writing the `access:` block resolve to the **permissive default** without a word.
The task names this exact outcome as the one failure it must never produce.

**(a) Scalar form.** `access: manual` → `ACCESS_TRACKER=full`, `rc=0`. `resolve_access` only ever
reads the `access.<system>` child scalar (`resolve-platform.sh:92`), so a scalar value — or a
misspelled child such as `access:\n  Tracker: manual` — is silently discarded.

**(b) Flow-mapping form.** `access: {tracker: manual}` → `manual` under the python tier, **`full`
under the awk tier** (`read-config.sh:172` matches only `^parent:` followed by an indented `child:`).
So the operator's lockdown silently evaporates on any host without pyyaml.

Form (b) is **the notation the task document itself uses** — see its Testing Strategy table
(lines 255, 257, 258) and Overview (line 160). The test suite, however, was written with the block
form, so the specified notation is never exercised.

## Steps to Reproduce

```bash
printf 'access: manual\n' > skills-config.yaml
source resolve-platform.sh; echo "$ACCESS_TRACKER"                    # full   (expected: manual, or a rejection)

printf 'access: {tracker: manual}\n' > skills-config.yaml
AGENT_SKILLS_CONFIG_TIER=python … echo "$ACCESS_TRACKER"              # manual
AGENT_SKILLS_CONFIG_TIER=awk    … echo "$ACCESS_TRACKER"              # full    ← escalation
```

## Expected Behavior

Either resolve the value correctly, or reject it. Never silently grant `full`.

## Actual Behavior

Silent escalation to `full`, exit 0, no diagnostic.

## Impact

An operator who deliberately restricts the agent gets an unrestricted run and is never told. This is
the defect class the task was written to eliminate, reintroduced by a different route.

## The mutation that should have caught the guard regression did not

The Testing Strategy's *"Remove `|| exit 1` from a call site"* mutation is **not testing what it
claims**. Test §9 (`tracker-access.test.sh:216-229`) writes its **own** `caller.sh` containing the
guard, so it proves the assertion works — never that the repo's call sites are guarded.

Verified: removing `|| exit 1` from `skills/create-pr/SKILL.md` leaves the suite at
**61 passed, 0 failed**. This is exactly how TASK-51-BUG-4 slipped through.

The task's Risk Assessment claims a mitigating *"grep assertion that no bare
`source …resolve-platform.sh` remains in `skills/*/SKILL.md`"*. **That assertion does not exist**
anywhere in the repo.

Two further mutation weaknesses:

- **Forced-python-tier cases are host-dependent.** `config_python` returns 1 when pyyaml is absent,
  and `read_config_key` then prints `auto` — so on a pyyaml-less host the "python tier" cases
  silently exercise the awk path and pass green, with no SKIP marker (unlike the probe test, which
  does skip explicitly).
- **The malformed-YAML fixture is shaped to the lint.** `access:\n : bad: yaml` trips the single rule
  the lint implements. A mutation that *narrowed* the lint rather than removing the branch stays
  green — which is what TASK-51-BUG-2 is.

## Recommendation

1. Reject a non-mapping `access:` value and unknown `access.*` children, rather than ignoring them.
2. Teach the awk nested reader the inline flow-mapping form, **or** fail closed when `access:` is
   present and the awk tier cannot read its children.
3. Add the missing grep assertion over `skills/*/SKILL.md` (covering `.`-style dot-sources), and make
   mutation #10 mutate a **real** call site.
4. Make the forced-python tier `SKIP` loudly when pyyaml is unavailable.
5. Add flow-form and scalar-form `access:` fixtures under both tiers.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress) — 2026-08-17

Three separate holes, all reaching the same outcome — the operator's restriction silently becoming
`full`:

- the scalar form was never inspected, only `access.<system>` was read;
- the awk nested reader matched only the block form, so the flow form read as empty;
- the guard mutation mutated the test's own helper, so nothing was watching the call sites.

#### Fix Implementation (In Progress → Ready for QA) — 2026-08-17

1. **`config_child_shape`** added to the shared reader. `resolve-platform.sh` rejects
   `access:` written as a scalar with a message showing the correct form, instead of reading nothing
   out of it. Checked once, not once per system.
2. **The awk nested reader understands the inline flow form** `parent: {child: value, ...}`,
   including multiple children — so both tiers agree.
3. **The grep assertion now exists** (§11) and matches the sourcing form *anywhere in the line*, so
   the three prose sites are covered — an anchored pattern silently skips them, which is the same
   blind spot that let BUG-4 ship.
4. **Mutation #10 is now real.** Verified by negative control: removing `|| exit 1` from
   `skills/qa-task/SKILL.md` takes the suite from 90/90 to 89/1, naming the file and line.
5. **Forced tiers SKIP loudly** (§16) when the named tier is unavailable, instead of silently
   exercising the other one and reporting green.

**Files**: `shared/resources/read-config.sh`, `shared/resources/resolve-platform.sh`,
`shared/resources/tracker-access.test.sh`

**Testing**: new §13 asserts the scalar form is rejected and the flow form resolves correctly under
**both** tiers, including a two-child flow mapping.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-08-17 | New | QA Engineer | Found in QA cycle 1 |
| 2026-08-17 | In Progress | qa-fix | Investigation started |
| 2026-08-17 | Ready for QA | qa-fix | Fix implemented, covered by new assertions |
