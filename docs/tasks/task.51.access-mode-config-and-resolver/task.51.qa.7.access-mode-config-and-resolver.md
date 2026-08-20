# QA Report: Task 51 — Declare tracker access level in config, and reject an unrecognised one loudly

**Task**: [task.51.access-mode-config-and-resolver.md](./task.51.access-mode-config-and-resolver.md)
**Gate File**: [task.51.gate.7.access-mode-config-and-resolver.yml](./task.51.gate.7.access-mode-config-and-resolver.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-18
**Gate Status**: CONCERNS (80/100)
**Cycle**: 7 — scoped re-review of [gate 6](./task.51.gate.6.access-mode-config-and-resolver.yml) (FAIL, 20/100)

---

## Executive Summary

Cycle 7 was scoped by the operator to the six defects gate 6 said were worth fixing regardless of any
redesign, with the awk-tier spelling class explicitly deferred. All six are closed, each verified by
reproducing the defect against the pre-fix reader and then against HEAD.

The adversarial pass found **two new defects introduced by the fixes themselves**. One is a silent
escalation opened by the BUG-16 narrowing, confirmed by running the same fixture against the parent
commit. Both were fixed and pinned inside this cycle. **That is the first time in seven cycles the
round's own regressions have been caught and closed within the round** — the previous six each ended
by shipping their regression into the next gate.

The gate is CONCERNS rather than PASS because the deferred limit is still live and still an
escalation: on a stock macOS host, where the awk tier is the only tier, a declared restriction
written with a merge key, a quoted key, or a mapping-valued child resolves to `full` at exit 0. It is
now recorded in three places and pinned by test, which makes it a **known** limit rather than a
silent one. It is not a closed one.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context — status of every gate-6 issue

| Gate-6 ID | Severity | Status | Verified how |
| --- | --- | --- | --- |
| BUG-25 — `python -c` imports a CWD `yaml.py` (code execution) | HIGH | **Closed** | Stub module and stub package both fail to execute; side-effect file absent; real value still resolves |
| BUG-23 — unreadable config escalates | HIGH | **Closed** | `chmod 000` on a canonical config → rc=1, both tiers, both shells |
| BUG-24 — `SKILLS_CONFIG_FILE` discards a restriction | HIGH | **Closed** | `/dev/null` and absent path → rc=1; redirect at a real config still honoured |
| BUG-17 — fail-closed grep misses legal key spellings | HIGH | **Closed** (+1 found and fixed in-cycle) | Four spellings → rc=1; a fifth found open during this review, see BUG-30 |
| BUG-15 — awk `-F` split breaks the documented mapping form | HIGH | **Closed** | Both tiers rc=0, TRACKER detects, access preserved; 16-case old-vs-new differential |
| BUG-16 — blunt `<<` guard falsely rejects disjoint sources | HIGH | **Closed** (regression found, see BUG-29) | Disjoint resolves; overlap still refused incl. non-adjacent and sequence |
| — `vcs:` mapping tier disagreement (exposed by the BUG-15 fix) | — | **Closed** | Both tiers now refuse it in the same words |
| BUG-28 — 11 surviving mutations / half-blind call-site scan | HIGH | **Closed** | See *Test integrity* below |
| BUG-18, BUG-26, BUG-27 — awk tier reads only the canonical spelling | HIGH | **Deferred → LIMIT-1** | Documented ×3, pinned by §41 |
| BUG-19/20/21/22, LOW-14 — swallowed parse reason, diagnostics | MED/LOW | **Deferred → LIMIT-2** | Halt message now enumerates the rejected shapes; asserted |

---

## Issues Found

### MEDIUM — TASK-51-BUG-29 · silent escalation · **introduced by this cycle, closed by this cycle**

The narrowed merge guard collected only the keys written **directly** on each merge source. A nested
merge declared *at the merge site* contributes `tracker` while spelling only `x`, so pairing it with
a permissive source read as disjoint and the permissive one won — silently, exit 0.

A **named** source hid the bug: pyyaml's `flatten_mapping` mutates an anchored node in place when it
is constructed, so its inherited keys are already written on it by the time the alias site is
scanned. Only an at-site source exposes it. This is exactly the shape of every previous cycle's
regression — a fix that is correct for the case that motivated it and silent for its sibling.

```yaml
base: &base
  tracker: manual
b: &b
  tracker: full
access:
  <<: {<<: *base, x: 1}   # contributes `tracker`, spells only `x`
  <<: *b
```

| Reader | Result |
| --- | --- |
| Parent commit `5f51973` (blunt guard) | `rc=1` — rejected the shape outright |
| Commit `09b513c` (narrowed guard) | `rc=0 ACCESS_TRACKER=full` — **silent escalation** |
| After fix | `rc=1` |

**Resolution.** Key collection recurses through a source's own `<<`, with an id-based seen-set so a
recursive anchor terminates rather than spins. A genuinely disjoint nested merge still resolves.
Mutation-witnessed: reverting the recursion fails 2 assertions.

### LOW — TASK-51-BUG-30 · silent escalation · **found and closed in-cycle**

The broadened opt-in probe still missed YAML **explicit key** syntax, where the colon sits on the
following line and so cannot match any pattern looking for `access` followed by a colon:

```yaml
? access
: {tracker: manual}
```

On a malformed file declaring a restriction this way, the branch fell through to detection —
`rc=0 ACCESS_TRACKER=full`, while pyyaml reads `manual`. Pre-existing rather than a regression: the
old `^access:` missed it too. **Resolution**: a second alternative in the probe. A `? other`
explicit key does not trip it. Mutation-witnessed: 2 assertions.

### MEDIUM — TASK-51-LIMIT-1 · **open, deferred by operator decision**

The awk tier reads only the canonical spelling of `access:`. A merge key or anchor, a quoted key, or
a mapping-valued child (an ordinary nesting typo) reads as *absent* there and takes the permissive
default. Well-formed file, exit 0, no output.

This is not academic: **the awk tier is the default on a stock macOS host**, because
`/usr/bin/python3` ships without pyyaml. This repo's own developers resolve `python3` to a build that
has it, so the tier consumers run is the one the project least exercises.

Deferred because closing it is a design change, not a patch — six cycles closed one spelling each and
left the siblings open. Now mitigated as far as documentation can: recorded in
`platform-detection.md` (*Known limit*), in `configuration.md`'s `access.tracker` row, and in the task
document's *Known limits* section with the three options costed; pinned by `tracker-access.test.sh`
§41, which asserts the divergence in **both** directions and is labelled so a failure reads as *"the
limit has been fixed, delete this block"*.

### LOW — TASK-51-LIMIT-2 · **open, deferred**

Every parse exception collapses to one `__ERR__` sentinel, so the operator sees "could not be parsed"
rather than the offending line. Mitigated: the halt now enumerates the three parser-legal-but-silent
shapes this reader rejects (duplicate keys, overlapping merge sources, NUL/US/RS bytes), asserted by
test. A real fix means extending the record format.

**Total**: HIGH 0 · MEDIUM 2 (1 closed in-cycle, 1 deferred) · LOW 2 (1 closed in-cycle, 1 deferred)

---

## Verification of the six scoped fixes

### 1. BUG-25 — parser substitution

`python -c` prepends the CWD to `sys.path`. The probe now selects the strongest isolation the
interpreter accepts **and under which pyyaml still imports**, and the shared program carries a
`sys.path` prologue for interpreters supporting neither flag.

The per-flag import check is the part that matters. A blind `-I` would also ignore `PYTHONPATH` and
user site-packages, hiding a `pip install --user pyyaml` and demoting that host to the awk tier —
which, given LIMIT-1, is a worse outcome than the vector being closed. Verified across three host
profiles that **none** is demoted:

| Host profile | Tier 1 retained | Flag chosen |
| --- | --- | --- |
| Homebrew python3 3.13 + pyyaml | yes | `-P` |
| Shim rejecting `-P` (3.9-like) | yes | `-I` |
| Shim rejecting `-P` and `-I` | yes | none — prologue only |

A stub `yaml.py` and a stub `yaml/` package both fail to execute (side-effect file absent) and the
real value still resolves.

### 2–3. BUG-23 / BUG-24 — config-file integrity

The probe answers a narrower question than "is access configured?" — it answers **"can I prove this
file declares no access?"** and answers *no* whenever it cannot read the file. `chmod 000` on a
canonical config now halts with a message naming permissions. An explicit `SKILLS_CONFIG_FILE` must
name an existing, readable, **regular** file, which is what catches `/dev/null` (a character device,
previously read as "no config at all").

One defect was caught *before* commit and is worth recording: the first version memoised whether the
variable came from the environment, which is wrong — in the fail-open direction — for a caller that
sets it *between* two sources. Detection is now stateless.

### 4. BUG-17 — key spellings

Root flow mapping, quoted key, `access :`, `<<`-supplied block: all rc=1 on a malformed file. The
over-match (a mention inside a comment counts) is deliberate and **bounded** — verified that
well-formed files carrying `# access: see the docs`, `notes: "access: whatever"` and `my.access: x`
are all unaffected, because the probe only runs on the malformed branch. The one remaining gap is
BUG-30 above.

### 5. BUG-15 — the awk value reader

Old vs new, run side by side over 16 cases. Five differ; all five are strict improvements:

| Input | Old | New |
| --- | --- | --- |
| `tracker: {workflowFile: x}` | `{workflowFile` | `__MAP__` |
| `tracker: {a: b, c: d}` | `{a` | `__MAP__` |
| `tracker: [a, b]` | `[a, b]` | `__MAP__` |
| `tracker: http://example.com/a:b` | `http` | `http://example.com/a:b` |
| `tracker: a:b:c` | `a` | `a:b:c` |

The eleven unchanged cases cover quoting, inline comments, `null`, empty values and no-space forms.
`__MAP__` matches what tier 1 already returns, so both tiers now agree. The reader serves only
`tracker:` and `vcs:` (confirmed by repo-wide grep), so the blast radius is those two keys.

### 6. BUG-16 — merge sources

Disjoint sources resolve again in both block and flow spellings. Overlap is refused pairwise, so a
non-adjacent clash cannot slip through, and refused for sequence entries too — YAML defines those as
first-wins, deterministic but in the direction most operators guess wrong, which for an access
control is the same silent escalation by another spelling. The residual hole was BUG-29 above.

---

## Test integrity — gate 6's central finding

Gate 6 found 11 surviving mutations behind a green 166/166, and a call-site scan whose dot-source
regex matched **zero lines repo-wide**. Both are closed.

- **Call-site scan.** The pattern is anchored to line start, matched on whole lines rather than `-o`
  fragments — the guard sits after the closing quote, which a fragment ending at `.sh` can never
  contain — and backed by **coverage floors**. That last part is the structural fix: a pattern
  matching nothing previously reported "no unguarded call sites" in exactly the same words as a
  pattern matching everything. Verified by deleting `|| exit 1` from `skills/qa-story/SKILL.md:1371`:
  previously green, now red. 15/15 sites guarded, and now 15/15 enforced.
- **Tier coverage.** §2 asserts all five modes under **both** tiers on the resolved value; §34–38
  assert values rather than exit codes. Merge-key value assertions still force python — correctly,
  since the awk tier cannot see a merge key at all — and that divergence is now pinned by §41 rather
  than hidden behind the forced tier.
- **Unpinned invariants.** §39 pins the mode ordering behaviourally, each adjacent pair in both
  directions. §40 asserts the legal vocabulary as a whole line. Both were named as surviving
  mutations in gate 6; both now fail when mutated (see below).

### Mutation audit — 9 mutations, 9 caught

| Mutation | Suite |
| --- | --- |
| BUG-25 isolation removed | 2 failed |
| BUG-17/23 narrow `^access:` grep restored | 10 failed |
| BUG-24 redirect guard removed | 8 failed |
| BUG-15 `-F': *'` split restored | 7 failed |
| BUG-16 blunt merge guard restored | 8 failed |
| BUG-29 keyset recursion reverted | 2 failed |
| BUG-30 explicit-key alternative reverted | 2 failed |
| `access_rank`: `command` outranks `read-only` *(survived at gate 6)* | 2 failed |
| Mode enum widened to a sixth value *(survived at gate 6)* | 2 failed |

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| All tests passing | 100% | 285/285 tracker-access, 1287/1287 node, 6/6 resolver, 35/35 bitbucket-auth, 3/3 + 13/13 hooks, 9/9 push-state | PASS |
| No regressions | 0 | 0 against the suite; 2 found by adversarial probing and closed in-cycle | PASS |
| Documented config forms work on both tiers | Yes | `tracker: {workflowFile: …}` verified on both | PASS |
| Unrecognised value halts | Yes | Verified per key, both tiers, both shells | PASS |
| Call sites guarded | 15/15 | 15/15, and 15/15 enforced by test | PASS |
| Skill validation | 0 errors | 115/115 | PASS |
| Bundle idempotent | Yes | `npm run bundle` leaves the tree clean | PASS |
| Formatting | Clean | Prettier clean | PASS |
| A declared restriction is never silently loosened | Always | **Not on the awk tier** — LIMIT-1 | **CONCERNS** |

---

## NFR Assessment

**Security — CONCERNS.** Five escalation routes closed and confirmed closed, including the
code-execution vector and the env-redirect route that falsified a guarantee written in the file's own
header. What keeps this off PASS is LIMIT-1: on the tier a stock macOS consumer actually runs, three
legal spellings of a declared restriction still resolve to `full`. Nothing consumes `ACCESS_TRACKER`
yet, so today's blast radius is a wrong value rather than a wrongly-permitted write — but that
changes the day task.52 lands.

**Reliability — PASS.** Both false rejections closed; verified under bash and zsh and on an awk-only
host.

**Performance — PASS.** At most two extra probe spawns at source time, once per shell, until one
succeeds. The memoised single-probe design is unchanged.

**Maintainability — PASS** (raised from CONCERNS). Every fix carries a comment stating the defect it
closes and why the obvious alternative was rejected — including the two this cycle's own fixes
caused, which is the record most likely to stop cycle 8 repeating them. The suite went from 11
surviving mutations to 0 across 9 tried.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `resolve-paths.sh` (`PRD_ROOT`, `ARCH_ROOT`) | PASS — 6/6, shares `read-config.sh` |
| Pipeline hooks (precompact, on-stop, lock) | PASS — 3/3, 13/13, 6/6 |
| Bitbucket auth resolver | PASS — 35/35 |
| Node suite (1287) | PASS |
| zsh call sites | PASS — canonical, flow form, unreadable, nested overlap, explicit key |
| Genuine awk-only host | PASS — python shimmed to exit 127, bash and zsh |

---

## Test Commands Executed

```bash
npm test                       # 1287 node + 7 shell suites
bash shared/resources/tracker-access.test.sh    # 285/285
npm run validate:all           # 115/115
npm run bundle                 # idempotent
npx prettier --check ...
# adversarial probes: old-vs-new awk differential, three host profiles,
# awk-only host via PATH shim, parent-commit diff for both regressions,
# 9 source mutations each with a full-suite run
```

---

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL

**Rationale.** The scoped work is done and, for the first time in this task's history, the cycle's
own regressions were found and closed inside the cycle rather than discovered by the next gate. The
suite now holds the invariants it claims to. What remains is one deferred, documented, test-pinned
limit that is nonetheless a real silent escalation on the tier most consumers run.

**Conditions**:

1. LIMIT-1 is understood and accepted — consumers on hosts without pyyaml must write `access:` in the
   canonical block form.
2. LIMIT-1 is closed **before** any skill actually gates a mutation on `ACCESS_TRACKER` (task.52
   onward). While nothing reads the value, a wrong value is a wrong value; once a consumer gates on
   it, the same wrong value is an unintended write.
3. Human review of the PR, given seven cycles of fix-induced defects — two of which this cycle caused
   and closed.

**Next Steps**: no blocking fixes outstanding. Proceed to finalise with the conditions recorded, or
open a follow-up task for LIMIT-1 before task.52.
