---
id: task.60.review.1
title: 'Task Review Report: Task 60 — Give the config reader''s awk tier a grammar, or make it refuse'
type: review
description: Review of task.60 and its implementation plan — five Critical findings, four verified against the running code, centred on a subset narrower than the project's own documented schema and a refusal message that is unreachable at the site it is designed for.
task-ref: task.60.config-reader-strict-subset.md
status: complete
created: 2026-08-18
updated: 2026-08-18
---

# Task Review Report: Task 60 — Give the config reader's awk tier a grammar, or make it refuse

**Reviewed:** 2026-08-18
**Review Depth:** Thorough
**Task Status:** Planned
**Overall Assessment:** NEEDS IMPROVEMENT

> **Implementation Status**: ✅ All 5 Critical and 5 Important recommendations implemented in
> `task.60.config-reader-strict-subset.md` and `task.60.plan.config-reader-strict-subset.md` — 2026-08-18.
> The 4 Optional items are recorded below and left to the author.

---

## Executive Summary

The task is unusually well-argued: the diagnosis ("*I did not find it* reported as *it is not there*") is
correct, option 3 is the right call, and the risk register anticipates the two ways this work fails.
The problem is that **R-1 has already materialised at specification time** — the subset the plan
proposes would refuse this project's own documented example config — and the plan's Phase 1 validation
corpus is too small to notice. Three further Critical findings were reproduced against the running
code: a tier-1 escalation the task scopes out but pins its success criteria on, a refusal message that
is unreachable at the site where it is designed to fire, and a memoisation that cannot work as written.

**Critical Issues:** 5 🚨
**Important Issues:** 5 ⚠️
**Optional Improvements:** 4 💡

**User Clarifications:** 4 questions asked and answered
**Implementation Readiness:** 6/10
**Recommendation:** NEEDS REVISION

Nothing here argues against the approach. All ten findings are corrections to a plan that is otherwise
ready — four of them are specification errors that cost hours now and days if discovered in Phase 5.

---

## User Decisions & Clarifications

### Q1 — Subset scope

**Q:** The proposed refused list includes "nesting deeper than two levels" and refuses file-wide, but
`docs/reference/configuration.md`'s canonical example carries 3- and 4-level nesting, flow sequences
and sequences-of-mappings. How should the subset be scoped?

- **User Decision:** **Refuse only aliasing constructs.** Refuse only what can change what a key
  resolves to — anchors, aliases, merge keys, quoted/explicit keys, multi-line flow mappings, tags,
  BOM, document separators. Arbitrary nesting depth, block and flow sequences, and sequences-of-mappings
  become *ignorable*. The file-wide blast radius stays.
- **Impact:** The Phase 1 accept/refuse tables are rewritten around "cannot mislead" rather than
  around shape. Depth and sequences leave the refused list entirely. Phase 1's validation corpus grows
  to include `configuration.md`'s example config.

### Q2 — Tier-1 gap

**Q:** `access:` → `tracker:` → `mode: manual` resolves to `full` at rc=0 on **both** tiers. §4 scopes
tier 1 out; §9 pins a criterion that spans both tiers; Phase 5 deletes the only test pinning it.

- **User Decision:** **Bring the tier-1 mapping case in scope.** A mapping-valued `access.tracker` /
  `access.vcs` becomes a halt on tier 1 too, not "absent".
- **Impact:** §4 Out of Scope is narrowed; a new Phase-2 deliverable covers
  `read_nested_config_key_strict`'s `__MAP__` handling; Success Criterion 1 becomes achievable as
  written; §41's `knownlimit-child` fixture is *inverted*, not deleted.

### Q3 — Refusal site

**Q:** The identity block runs before the access block, so `__UNSUPPORTED__` from `read_config_key`
halts at `validate_enum` with the wrong message and the designed refusal never fires.

- **User Decision:** **Hoist one check above identity.** A single subset-verdict check in
  `resolve-platform.sh`, before the identity block, covering all five consumed keys.
- **Impact:** Phase 3 is restructured around one refusal site; `resolve_access`'s `__UNREADABLE__`
  branch folds into it rather than being generalised in place.

### Q4 — awk variants

**Q:** Phase 5 adds `gawk`/`mawk` to the matrix, neither is installed locally, CI is ubuntu-only, and
§4 excludes portability work beyond adding them.

- **User Decision:** **Install in CI; divergences are in scope.**
- **Impact:** The §4 exclusion is removed; `.github/workflows/test.yml` gains an install step and joins
  the Files Summary; local runs skip gracefully with a printed notice.

---

## 1. Template Structure Compliance

**Status:** PASS

All eleven mandatory numbered sections are present and filled, in order. `Change Log`,
`Progress Tracking`, `References` and `Notes` follow. No placeholders, no `TBD`, no unfilled stubs.

- **File naming:** ✅ `task.60.config-reader-strict-subset.md` — dots as structural separators,
  hyphens inside the descriptive name. The co-located plan follows `task.60.plan.{slug}.md`.
- **OKF frontmatter:** ✅ `type: task` present and non-empty; `description` present; `tags` is a YAML
  list; `updated` present; tracker URL derivable from `github_issue`.
- **Metadata:** ✅ `status: planned`, `priority: High`, `risk_level: medium`,
  `estimated_effort_hours: 8`, `category: infrastructure`.
- **Stakeholder Sign-off:** not checked — `sign-off` is absent from `skills-config.yaml`, so the gate
  is off. Correctly *not* present in the document.
- **Change Log:** ✅ present, four canonical columns, one row (`1.0 Initial draft`). `status` has not
  advanced past `planned`, so the currency check passes.
- **Tracker linkage:** ✅ `github_issue: 247` verified OPEN via `gh issue view 247`; the body
  cross-reference `[#247](…/issues/247)` matches frontmatter.
- **Tracker card preflight:** not applicable — `TRACKER` resolves to `github` here, and the
  `--check-card` preflight is a Jira-path script.

### Issues

#### Optional
- Files Summary #4 names `shared/resources/resolve-platform.test.sh` as the file that "verifies the
  never-fail path contract still holds". That contract is actually covered in
  `tracker-access.test.sh` §26 (`flow-prd` → `PRD_ROOT`/`ARCH_ROOT` never expose a sentinel) and §14;
  `resolve-platform.test.sh` contains no reference to `resolve-paths.sh`, `PRD_ROOT` or `ARCH_ROOT`
  at all. See **I-4**.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0 — every file, line reference, sibling task and gate artefact named in
the document exists. Two *factual claims about behaviour* are wrong, and both were reproduced.

Verified accurate:

| Claim | Verdict |
|---|---|
| Six-key read surface (§3 table) | ✅ exact — the plan's own grep returns those six and nothing else |
| `§41 KNOWN LIMIT` at ~lines 1024–1055 | ✅ block spans 1024–1055; file is 1059 lines |
| `__UNREADABLE__` branch in `resolve_access` | ✅ `resolve-platform.sh:119` |
| `read_nested_config_key_strict` exists as the opt-in sentinel path | ✅ `read-config.sh:535` |
| `_config_probe` memoises into a global for the subshell reason given | ✅ `read-config.sh:288` and its header |
| Typed US/RS bulk records with a kind byte | ✅ `read-config.sh:~240–285` |
| task.51 gate 6 / gate 7 / QA 7 / task.52 documents | ✅ all present |
| `platform-detection.md` *Known limit* section | ✅ line 131 |
| `configuration.md` `access.tracker` workaround warning | ✅ line 138 |
| task.51 *Known limits* records LIMIT-1 / LIMIT-2 | ✅ lines 370–380 |

### Issues

#### 🚨 C-1 — The proposed subset refuses this project's own documented schema

**Location:** plan Phase 1 → *Proposed subset* → **Refused** table, row "Nesting deeper than two
levels"; task §6 Phase 1 bullet 3.

The plan validates the subset against two things: this repo's `skills-config.yaml`, and the fixtures
in `tracker-access.test.sh`. This repo's config is three keys and twelve lines. It exercises nothing.

The config a **consumer** writes is the one documented in `docs/reference/configuration.md`
(lines 40–125), and it contains, in the canonical example block:

| Construct | Example from `configuration.md` | Proposed verdict |
|---|---|---|
| Three-level nesting | `jira:` → `statusMap:` → `ready-for-development:` (line 65) | ❌ refused |
| Three-level nesting | `sign-off:` → `story:` → `required:` (line 82) | ❌ refused |
| Three-level nesting | `branching:` → `epicIntegration:` → `branchKey:` (line 91) | ❌ refused |
| **Four**-level nesting | `developBatch:` → `resources:` → `- probe:` → `command:` (line 122) | ❌ refused |
| Flow sequence | `ready-for-review: [Waiting for Review, In Review]` (line 66) | ❌ not in accept list |
| Sequence of mappings | `identities:` → `- jira: …` / `  git: …` (lines 106–107) | ❌ not in accept list |

Under the plan as drafted, **any consumer following the documented schema is refused file-wide on
every host without `pyyaml`** — which §2 establishes is the default host. That is R-1 ("the subset is
narrower than a real consumer's config") realised before a line of code is written, and R-1's stated
mitigation does not catch it, because the mitigation names the wrong corpus.

**Evidence:** `sed -n '40,125p' docs/reference/configuration.md`; `cat skills-config.yaml`.

**Recommendation** — *per user decision on Q1_:_ rebuild the accept/refuse tables around the question
**"can this construct change what one of the six keys resolves to?"** rather than around shape.
Refuse the aliasing family only: anchors (`&d`), aliases (`*d`), merge keys (`<<`), quoted keys
(`"access":`), explicit `?`-form keys, multi-line flow mappings, explicit tags, a leading BOM, and
document separators. Nesting depth, block sequences, flow sequences and sequences-of-mappings become
**ignorable** — they cannot make a key mean something other than what its own line says. Add
`configuration.md`'s example config to Phase 1's validation corpus as a named, mandatory fixture.

#### 🚨 C-2 — Tier 1 escalates too, and the task scopes it out while pinning a criterion on it

**Location:** §2 Motivation problem 1; §4 Out of Scope bullet 1; §9 Success Criteria bullet 1;
§6 Phase 5 (delete §41).

§1 states "an `access:` level tier 1 reads as `manual`, tier 2 reads as *absent*". For three of the
four spellings that is true. For the fourth — the mapping-valued child, which §2 calls "an ordinary
nesting typo" — **both tiers read it as absent**:

```
$ printf 'access:\n  tracker:\n    mode: manual\n' > skills-config.yaml
$ AGENT_SKILLS_CONFIG_TIER=python  … source resolve-platform.sh   → rc=0 AT=full
$ AGENT_SKILLS_CONFIG_TIER=awk     … source resolve-platform.sh   → rc=0 AT=full
```

The mechanism is in tier 1, not tier 2: `_scalar()` returns `("s", "__MAP__")` for a dict
(`read-config.sh:~225`), and `read_nested_config_key_strict` maps `__MAP__` → `""`
(`read-config.sh:539`), which `resolve_access` reads as absent → `full`. The existing suite already
knows this — §41's `knownlimit-child` fixture asserts `full` **for `tier in python awk`**
(`tracker-access.test.sh:1049–1054`).

So three statements in the document cannot all hold:
1. §4: "Changing tier 1 (`pyyaml`) behaviour — it is a real parser and is **not the problem**";
2. §9: "No legal spelling of `access:` resolves more permissive than declared **on either tier**";
3. §6 Phase 5: delete §41 — which deletes the only assertion pinning this.

Deleting §41 wholesale would remove the last test covering a **live tier-1 silent escalation**, on the
task whose entire purpose is to close silent escalations before task.52 gates a mutation on the value.

**Recommendation** — *per user decision on Q2_:_ bring the tier-1 mapping case into scope. Add a
Phase-2 deliverable: `read_nested_config_key_strict` distinguishes `__MAP__` from absent for
`access.*` and surfaces a refusal ("`access.tracker` is a mapping; expected one of the five modes").
Narrow §4's exclusion to "tier 1's YAML *parsing*", and **invert** §41's `knownlimit-child` fixture
into the new refusal matrix instead of deleting it.

#### ⚠️ I-5 — Regression baselines have drifted

**Location:** §8 Testing Strategy → *Consumer / regression tests*; §5 BC-1.

- "`npm test` (1287 node + **7 shell suites**)" — `package.json:24` invokes **nine** shell suites
  (`resolve-platform`, `tracker-access`, `bitbucket-auth`, `advance-pipeline-lock`,
  `develop-pipeline-on-precompact`, `develop-pipeline-on-stop`, `verify-push-state`, plus the two
  `skills/*/tests/fixture.test.sh`).
- "this repo's `|| exit 1` guards on **all 20** resolver sourcing lines" — there are **21** guarded
  sourcing lines today (26 total occurrences, 21 with the `||` guard).

These are the numbers a developer diffs against to decide whether a regression is real. Restate them,
or replace them with the commands that produce them.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

The phase decomposition, dependency ordering and revertability analysis are strong — Phase 4 being
independently revertable, and Phase 6 being gated on Phase 5 green, are both correct calls. Two
Critical mechanism defects sit inside otherwise-sound phases.

### Issues

#### 🚨 C-3 — The refusal message is unreachable at the site it is designed for

**Location:** task §6 Phase 3 bullet 1; plan Phase 3 (the message block).

Phase 3 puts the refusal — the one that names the line, the construct and both migration paths, and
which BC-1 designates as *the entire migration path* — inside `resolve_access`. But
`resolve-platform.sh` runs its blocks in this order:

| Order | Block | Line | Reader |
|---|---|---|---|
| 1 | `config_bulk` | 187 | tier 1 only; skipped entirely on tier 2 |
| 2 | malformed / fail-closed branch | 277 | `config_file_status` |
| 3 | **Identity — `TRACKER`, `VCS`** | **305, 318** | **`read_config_key`** |
| 4 | `access:` shape check | 336 | `config_child_shape` |
| 5 | `resolve_access tracker` / `vcs` | 342–343 | `read_nested_config_key_strict` |

Plan Phase 2 says `read_config_key` surfaces `__UNSUPPORTED__`. On tier 2 with an out-of-subset file,
step 3 therefore returns `__UNSUPPORTED__`, `validate_enum` rejects it, and the run halts at line 307
with:

```
❌ skills-config.yaml: tracker: "__UNSUPPORTED__" is not a recognised value.
   Legal values for tracker: jira github auto
```

No line number. No construct. Neither migration path. And the message Phase 3 spent a page designing
is never reached. This fails Success Criterion "Every construct outside it produces a refusal naming
the line and the construct" and BC-1's "the refusal message must state both, concretely" — while the
suite would still show a green rc=1.

**Recommendation** — *per user decision on Q3_:_ hoist a single verdict check into
`resolve-platform.sh` **above the identity block** (after the malformed branch, before line 305). One
refusal, one message, covering all five consumed keys. Fold `resolve_access`'s `__UNREADABLE__` branch
into it rather than generalising it in place, and add a test asserting the *stderr text*, not just
`rc=1` — an rc-only assertion is exactly what let this class hide in task.51.

#### 🚨 C-5 — The proposed memoisation cannot work, and breaks a stated success criterion

**Location:** plan Phase 2 → *The shape* and *Wiring into the readers*.

The plan declares `_CONFIG_SUBSET_VERDICT` with `"" = not yet scanned` (lazy memoisation), then wires
it in as:

```sh
[ -n "$(_config_subset_scan)" ] && { echo "__UNSUPPORTED__"; return 0; }
```

`$( )` is a subshell, so the cache written inside never reaches the caller. Worse, the *readers
themselves* run inside command substitutions at every call site, so even a plain function call would
memoise into a shell that exits immediately. This is precisely the failure the plan's own comment
describes two lines earlier, and that `_config_probe`'s header documents as "what made one `source`
cost ten python spawns".

Consequence: one `awk` pass per reader call — up to **six passes per `source`**, times 21 guarded call
sites — directly violating §9 Performance: *"No additional process spawns per `source` — the tier-2
scan is one `awk` pass."*

**Recommendation:** follow `_config_probe` exactly. Run the scan **once at source time**, at the
bottom of `read-config.sh`, guarded on tier 2 being the active tier; have consumers read the global.
With C-3's hoisted check, only `resolve-platform.sh` needs to read it at all. Add a mutation to the
Phase 5 audit: *make the scan lazy again → the source-time spawn count must go up*, so the regression
is witnessed rather than assumed.

#### ⚠️ I-1 — `config_file_status`'s tier-2 lint is never reconciled with the new scan

**Location:** task §6 Phase 2/3; plan Phase 2/3. Neither mentions `config_file_status`.

`read-config.sh:348` already runs an awk lint over the whole file on tier 2 — and it returns a third
value the task never names: **`unverified`** (not `ok`, not `malformed`). `resolve-platform.sh:277`
branches only on `= "malformed"`, so on tier 2 the fail-closed branch never fires from this path.

The new subset scan is a second, stricter awk pass over the same file with overlapping intent. The
task must state their relationship: does an out-of-subset file become `malformed`, stay `unverified`,
or is the scan strictly independent? Left undefined, this is two lints that will drift — the exact
shape of the `_config_denull` duplication that task.51 had to collapse.

**Recommendation:** add a Phase-2 bullet deciding this explicitly, with a test. Recommended:
keep them independent (`config_file_status` answers "is this YAML at all", the scan answers "can I
read it correctly"), and say so in the header comment.

#### ⚠️ I-2 — The tier-2 `__UNSUPPORTED__` sentinel travels in-band and is forgeable

**Location:** task §10 R-4; plan Phase 2.

R-4 correctly protects the *reason field* by keeping it as DATA on the typed US/RS transport. But
`__UNSUPPORTED__` itself is proposed as a bare string on tier 2's plain stdout, which has **no kind
byte** — it is the untyped channel. A config value that spells `__UNSUPPORTED__` and passes a clean
scan is then indistinguishable from the signal. That is the `__MAP__` forgery class task.51 spent
three QA cycles closing, reintroduced on the one tier that has no framing.

Q3's hoisted check reduces the exposure but does not remove it: the hoisted check must read the scan
**verdict global directly**, never a reader's stdout.

**Recommendation:** widen R-4 to cover the sentinel, not only the reason. State in Phase 2 that the
hoisted check consults `_CONFIG_SUBSET_VERDICT` rather than any reader's output, and add a fixture:
`tracker: __UNSUPPORTED__` on a clean file must be rejected as an invalid *value* (enum failure), not
obeyed as a signal.

#### ⚠️ I-4 — Files Summary is incomplete

**Location:** §7.

- #4 names `resolve-platform.test.sh` as covering `resolve-paths.sh`'s never-fail contract; it does
  not mention `resolve-paths.sh`, `PRD_ROOT` or `ARCH_ROOT` anywhere. That coverage lives in
  `tracker-access.test.sh` §26.
- `docs/reference/configuration.md` appears only under Phase 6 (removing a warning). Per C-1 it is
  also a Phase 1 **input** — the validation corpus — and per Q1 its example config becomes a fixture.
- `.github/workflows/test.yml` is missing; per Q4 it gains a `gawk`/`mawk` install step.
- `skills-config.yaml` (the repo's own) should be named as the Phase 1 regression reference.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Issues

#### 🚨 C-4 — "Every existing fixture keeps working" is false, and the conflicting assertion is unnamed

**Location:** §8 Testing Strategy → *Regression matrix*; §6 Phase 5.

`tracker-access.test.sh:700–703`:

```sh
D=$(fixture merge-override 'defaults: &d\n  tracker: read-only\n  vcs: full\naccess:\n  <<: *d\n  tracker: manual\n')
for tier in python awk; do
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=$tier"
  assert_rc "<<: override [$tier] → status 0"        "$RC" "0"
done
```

That fixture uses an anchor **and** a merge key, and asserts **rc=0 on the awk tier**. Under this
task it must assert **rc=1**. So the Testing Strategy's promise — *"this repo's own
`skills-config.yaml` and every existing fixture keep working"* — is not achievable, and Phase 5's
work list ("delete §41", "add refusal assertions", "add acceptance assertions") does not mention §30
at all.

This is the only such conflict in the suite: §25, §31 and §37's merge/anchor fixtures are all forced
to `AGENT_SKILLS_CONFIG_TIER=python`, and §26's multi-line flow fixture asserts only that no sentinel
leaks — which still holds when `read_nested_config_key` maps `__UNSUPPORTED__` to `""`. Verified by
scanning every `fixture` line carrying `&`, `*`, `<<`, `"access"` or `---` against its tier argument.

**Recommendation:** replace the regression-matrix bullet with the accurate statement — *"every
existing fixture keeps working **except** §30's awk-tier assertion, which inverts from rc=0 to rc=1;
that inversion is a deliverable of Phase 5, not a regression"* — and add §30 explicitly to Phase 5's
work list beside §41.

#### ⚠️ I-3 — The gawk/mawk exclusion contradicts the phase that adds them

**Location:** §4 Out of Scope final bullet vs §6 Phase 5 final bullet vs §10 R-5.

§4 excludes "`gawk`/`mawk` portability beyond adding them to the fixture matrix". Phase 5 adds them.
If a variant then reveals a divergence, the task has no stated disposition — and neither §9 nor the
rollback triggers mention them.

**Recommendation** — *per user decision on Q4_:_ delete the §4 exclusion, add a `gawk`/`mawk` install
step to `.github/workflows/test.yml`, skip gracefully with a printed notice when absent locally, and
add "green under BWK awk, `gawk` and `mawk`" to §9 Code quality.

### Positive findings (no action)

- Internal consistency between §6 phases, §7 Files Summary and §12 Progress Tracking is exact —
  every phase's checkboxes mirror its bullets one-for-one.
- §6.5 diagram check: the task explicitly declines a Mermaid diagram with a stated reason ("the
  three-outcome table above is the whole logic and a flowchart would restate it"). **Concur** — the
  ASCII tier tree in §3 carries the structure, and a diagram would restate the Implementation Plan.
  No finding.
- Success Criteria are measurable and mapped to phases, with the exception covered by C-2.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The strongest section of the document. R-1 and R-2 correctly name the two ways this work fails, and
R-2's mitigation ("mutation-witness every invariant before believing the suite") is the right lesson
drawn from gate 6's 11-of-35 surviving mutations. The rollback plan has real triggers, a named
known-good resting point (task.51's accepted state), and a forward-fix policy that correctly prefers
widening the subset over reverting.

### Issues

#### ⚠️ (covered above) R-1's mitigation names the wrong corpus — see **C-1**. R-4 does not cover the tier-2 sentinel — see **I-2**.

#### 💡 O-4 — Rollback step 4 asks for something Phase 5 deleted

§11 *Immediate rollback* step 4 says "re-add the `§41` block". Phase 5 deletes it, so there is no text
to re-add by hand — the mechanism is reverting Phase 5's commit alongside Phases 2–3. Say so, or
someone will reconstruct §41 from memory during an incident.

---

## Summary of Recommendations

### Must Fix (Critical) — 5 issues

1. **C-1** — Rebuild the subset around "cannot mislead", not shape: refuse only the aliasing family;
   make depth, block sequences, flow sequences and sequences-of-mappings *ignorable*. Add
   `configuration.md`'s example config to Phase 1's validation corpus as a mandatory fixture.
   _Per user decision on Q1._
2. **C-2** — Bring the tier-1 mapping-valued `access.*` case in scope; narrow §4's exclusion to tier
   1's *parsing*; invert §41's `knownlimit-child` fixture rather than deleting it.
   _Per user decision on Q2._
3. **C-3** — Hoist one subset-verdict check above the identity block in `resolve-platform.sh`; fold
   `__UNREADABLE__` into it; assert the stderr text, not just `rc=1`. _Per user decision on Q3._
4. **C-4** — Correct the regression-matrix claim and add `tracker-access.test.sh` §30 (line 700) to
   Phase 5's work list — its awk assertion inverts from rc=0 to rc=1.
5. **C-5** — Run the subset scan **once at source time** like `_config_probe`, not lazily inside a
   command substitution; add a mutation witnessing the spawn-count regression.

### Should Fix (Important) — 5 issues

1. **I-1** — Decide and document the relationship between `config_file_status`'s tier-2 lint (which
   returns `unverified`) and the new scan; add a test.
2. **I-2** — Widen R-4 to the sentinel itself; the hoisted check reads the verdict global, never a
   reader's stdout; add a `tracker: __UNSUPPORTED__` forgery fixture.
3. **I-3** — Remove the §4 `gawk`/`mawk` exclusion; install both in CI; add them to §9.
   _Per user decision on Q4._
4. **I-4** — Fix Files Summary #4's test-file attribution; add `configuration.md` as a Phase 1 input,
   `.github/workflows/test.yml`, and `skills-config.yaml` as the regression reference.
5. **I-5** — Correct the regression baselines: nine shell suites, 21 guarded sourcing lines.

### Consider (Optional) — 4 items

1. **O-1** — `estimated_effort_hours: 8`. The rubric computes 14 → snaps to **16h** (18 success
   criteria, 27 plan checkboxes, medium risk, 9 files, migration keywords). At exactly 2× it does not
   trip the divergence flag, but task.51 needed seven QA cycles on this same file. Consider 16h.
2. **O-2** — §10 R-5 says the awk variants are "Untested today". CI runs `npm test` on
   `ubuntu-latest`, whose `awk` is not macOS BWK awk — so a second variant is already exercised on
   every push, just not as a named matrix. Reword.
3. **O-3** — §41 holds four fixtures. Phase 5 should say which are *inverted into the refusal matrix*
   (the three awk-tier spellings, plus `knownlimit-child` per C-2) rather than "deleted", so the
   coverage is provably carried forward rather than dropped.
4. **O-4** — Rollback step 4: replace "re-add the `§41` block" with "revert Phase 5's commit".

---

## Implementation Readiness Assessment

**Score:** 6/10

**Scoring Breakdown:**

| Dimension | Score | Note |
|---|---|---|
| Template Compliance | 9/10 | All 11 sections, OKF clean, Change Log current, tracker verified. One test-file mis-attribution. |
| Technical Accuracy | 5/10 | Zero hallucinations, every reference real — but two behavioural claims are wrong and both were reproduced (C-1, C-2), plus baseline drift (I-5). |
| Implementation Clarity | 5/10 | Phase structure and revertability are excellent; the two central mechanisms (refusal site, memoisation) do not work as drafted (C-3, C-5). |
| Consistency | 4/10 | Success Criteria vs Out of Scope (C-2), regression promise vs §30 (C-4), Phase 5 vs §4 on awk variants (I-3). |
| Risk Management | 8/10 | Best-in-repo risk register; R-1 correctly predicted the top finding — but its mitigation names a corpus too small to catch it, and R-4 stops one layer short. |

**Confidence Level for Successful Implementation:** Medium — high once the five Critical findings are
folded in. The approach is right and the author has already reasoned about the failure modes; what is
missing is a subset validated against the right corpus and two mechanisms that survive contact with
`resolve-platform.sh`'s execution order.

**Recommendation:** ⚠️ **NEEDS REVISION**

**Justification:** No Critical finding challenges the design — all five are corrections to a plan that
is otherwise implementation-ready, and four were verified against running code rather than inferred.
C-1 and C-3 in particular would each have surfaced in Phase 5 as a rewrite of work already done.

---

## Next Steps

Address before implementation, in this order:

1. **C-1** first — it is the specification, and Phases 2–5 are tested against it. Rebuild the
   accept/refuse tables and validate against `configuration.md`'s example config.
2. **C-2** — settle the tier-1 scope so Success Criterion 1 and §4 agree before Phase 2 starts.
3. **C-3 + C-5** — fix the refusal site and the scan lifecycle together; they are the same file.
4. **C-4 + I-1…I-5** — mechanical corrections to Phase 5's work list, Files Summary and baselines.
5. Re-run `/review-task` (or `/develop-task`, which re-reviews) once the document is updated.

---

## Review Metadata

- **Reviewer:** review-task (Claude)
- **Review Date:** 2026-08-18
- **Review Depth:** Thorough
- **Task File:** `docs/tasks/task.60.config-reader-strict-subset/task.60.config-reader-strict-subset.md`
- **Plan File:** `docs/tasks/task.60.config-reader-strict-subset/task.60.plan.config-reader-strict-subset.md`
- **Sources consulted:** `shared/resources/read-config.sh`, `shared/resources/resolve-platform.sh`,
  `shared/resources/resolve-paths.sh`, `shared/resources/tracker-access.test.sh`,
  `shared/resources/resolve-platform.test.sh`, `shared/resources/platform-detection.md`,
  `shared/resources/effort-estimation-rubric.md`, `docs/reference/configuration.md`,
  `skills-config.yaml`, `package.json`, `.github/workflows/test.yml`,
  task.51 (document, gate 6, gate 7, QA 7), task.52, GitHub issue #247
- **Reproductions run:** mapping-valued `access.tracker` on both tiers; six-key surface grep; guarded
  call-site count; out-of-subset fixture / tier cross-scan of `tracker-access.test.sh`
