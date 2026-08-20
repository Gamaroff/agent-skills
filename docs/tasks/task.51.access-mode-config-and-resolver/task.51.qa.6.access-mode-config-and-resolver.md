# QA Review — Cycle 6 (Independent Adversarial Pass)

**Task**: `task.51.access-mode-config-and-resolver.md`
**Cycle**: 6 — the independent adversarial pass gate 5 asked for
**Gate**: **FAIL** (20/100) — `task.51.gate.6.access-mode-config-and-resolver.yml`
**Date**: 2026-08-17

---

## Why this cycle exists

Gate 5 did not fail on a defect. It failed on a *procedure*: five cycles had run, every finding was
fixed, and no known defect was outstanding — but across all five, **every fix round had introduced at
least one new defect**, and the cycle-5 fixes had been verified only against their own reproductions.
Gate 5 declined to self-certify against that base rate and asked for one independent adversarial pass,
with the note that if it came back clean the work was mergeable.

It did not come back clean.

## Method

Three independent reviewers with disjoint lenses, dispatched in parallel:

| Lens | Brief |
|---|---|
| Escalation paths | Make a declared access level resolve **more permissive** than written |
| False rejections | Make a **legal** config halt a run — the opposite direction |
| Test validity | Mutate production code and check whether the suite actually goes red |

None was given the cycle-5 commit message, gate file, or bug reports. They were given the code and the
invariants, and told to attack — deliberately, so they would read the mechanism rather than re-read its
author's reasoning about it.

**Every finding recorded here was then re-executed in main context before being written down.** Nothing
below rests on a reviewer's word. Regression claims were verified by running the identical fixture
against the reader checked out at the parent commit (`0da9bbc`).

---

## The headline

The most serious defect is not in the cycle-5 diff at all, and no amount of reviewing that diff would
have found it.

**`/usr/bin/python3` on macOS ships without pyyaml.** The two-tier reader treats tier 1 (python) as the
normal path and the awk tier as a fallback — but on a stock consumer host the awk tier is *the default*.
No environment variable required:

```
$ /usr/bin/python3 -c 'import yaml'
ModuleNotFoundError: No module named 'yaml'
```

This repo's own developers resolve `python3` to `/usr/local/bin/python3`, which *does* have pyyaml. So
the tier that consumers actually run is the tier this project least exercises — and the two tiers
disagree on legal input.

On that tier, the **documented** configuration form halts:

```yaml
tracker: {workflowFile: .github/tracker-workflow.yaml}   # docs/reference/configuration.md:288
```

```
rc=1   T={workflowFile
❌ tracker: "{workflowFile" is not a recognised value.
```

`read_config_key`'s awk splits on `-F': *'` and takes `$2`. With this task's own `|| exit 1` guards now
on 15 call sites, that aborts the run. The task's acceptance table requires this form to return status 0
"asserted under both tiers"; `tracker-access.test.sh:165` asserts only the *block* spelling of the same
key, which passes.

---

## Findings

Ten HIGH, four MEDIUM, one LOW. Full detail in the gate file.

| ID | Sev | Defect |
|---|---|---|
| BUG-15 | HIGH | Documented `tracker: {workflowFile: …}` flow form halts on the default tier of a stock host |
| BUG-16 | HIGH | **Cycle-5 regression** — the "at most one `<<`" guard refuses a legal *disjoint* merge |
| BUG-17 | HIGH | Fail-closed branch's `grep -q '^access:'` misses flow / quoted / merge spellings → declared `manual` resolves `full`, exit 0 |
| BUG-18 | HIGH | awk tier blind to merge keys and quoted mapping keys → declared `manual` resolves `full`, exit 0, **no warning, well-formed file** |
| BUG-23 | HIGH | An **unreadable** config in the canonical documented shape resolves `full`, exit 0 — the fail-closed gate greps the file it just failed to parse |
| BUG-24 | HIGH | `SKILLS_CONFIG_FILE=/dev/null` discards a committed restriction, silently, both tiers — falsifying a guarantee in the file's own header |
| BUG-25 | HIGH | `python -c` puts CWD on `sys.path`; a repo-root `yaml.py` is imported instead of PyYAML → arbitrary code execution and full control of the result |
| BUG-26 | HIGH | BUG-18 generalised: 16 distinct legal spellings defeat the awk tier's anchored regexes; 3 also bypass the explicit scalar-access and `access.vcs` halts |
| BUG-27 | HIGH | `access.tracker`'s **shape** is never validated. A nesting typo (`tracker:` → `mode: manual`) resolves `full` on both tiers, silently |
| BUG-28 | HIGH | Mutation audit: **11 surviving mutations**. The repo-wide call-site assertion's dot-source half matches zero lines; the enum vocabulary and rank ordering are unpinned; every `[python]` tier label is unproven |
| BUG-19 | MED | Block-scalar header detector misses sequence-item, comment-bearing and anchored spellings → legal bodies condemned |
| BUG-20 | MED | `access: &anchor` / `!!map` graded "a scalar" → false halt |
| BUG-21 | MED | A duplicate key in an *unrelated* section halts the whole config |
| BUG-22 | MED | UTF-8 BOM flips `tracker` between tiers, exit 0 both |
| LOW-14 | LOW | Diagnostics blame `access:` for problems located elsewhere |

### The cycle-5 regression, stated precisely

Cycle 5 added a guard rejecting a second `<<` in one mapping, because two *overlapping* merge sources
last-win silently. That reasoning is correct. But pyyaml merges *disjoint* sources deterministically and
unambiguously, and those are now refused too:

```yaml
a: &a {tracker: manual}
b: &b {vcs: full}
access:
  <<: *a
  <<: *b        # pyyaml → {tracker: manual, vcs: full}. No ambiguity.
```

```
reader @ 0da9bbc (parent):  rc=0  AT=manual  AV=full   ← correct
reader @ HEAD:              rc=1                        ← false rejection, halts the run
```

This is the sixth consecutive cycle in which the round's fixes introduced a new defect. It is also, once
again, the branch's signature shape: **a fix correct for the case it was written for and wrong for the
adjacent one.**

---

## Why the suite did not catch any of this

The suite was green at **166/166 throughout this review**, with every defect above live.

For the merge-key sections specifically, the reason is structural rather than a missing case. Sections
30–31 force `AGENT_SKILLS_CONFIG_TIER=python` for every assertion that checks a resolved **value**
(`:655`, `:676`, `:692`). The one loop that *does* cover both tiers asserts only the exit code:

```bash
for tier in python awk; do
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=$tier"
  assert_rc "<<: override [$tier] → status 0"  "$RC" "0"     # ← passes under awk
done
run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"
assert_eq "<<: override → the LOCAL value wins"  "$AT" "manual"   # ← python only
```

Under awk these configs *do* return 0. They simply resolve to `full` instead of `manual`. The exit-code
assertion passes while the escalation is live, and the value assertion never runs on the tier where it
would fail.

This is the same pattern the cycle-5 escalation record named as recurring — "a cross-source test that
forced a tier so neither source populated the state under test" — reappearing in the tests written to
close it.

---

## What was checked and found sound

Not everything is broken, and a clean bill on these is what makes the failures above credible:

- **Call-site guards**: 15/15 executable call sites carry `|| exit 1` — 13 `source` lines plus 2
  dot-source lines (`skills/review-code/SKILL.md:96`, `skills/qa-story/SKILL.md:1371`); the prose forms
  in `qa-task`, `qa-story`, `review-bug` and `jira-sprint-retrospective` likewise. The **code** is
  fully guarded. Only 13 of the 15 are *enforced by a test* — see BUG-28. An earlier count of 13/13 in
  this review was itself wrong for the same reason the suite's is: a `\S*resolve-platform\.sh` pattern
  cannot cross the space inside `"$(dirname "$0")`. Two independent greps sharing one blind spot is
  why this is recorded rather than left as a footnote.
- **Bundling**: idempotent. `npm run bundle` leaves `git status` clean. All 36 `read-config.sh` and 28
  `resolve-platform.sh` bundled copies differ from source by exactly the AUTO-GENERATED banner, so no
  bundle-only divergence exists — but equally, every defect above is replicated byte-identically into
  all of them.
- **The cycle-5 NUL fix (BUG-14)**: genuinely closed. NUL-only and embedded-NUL values are refused under
  both tiers.
- **The cycle-5 merge-source scan (BUG-13)**: the reported shapes are genuinely closed under the python
  tier. It was the accompanying guard, not the scan, that overreached.
- **Stale `skills/qa-task/references/resolve-paths.sh`**: confirmed **pre-existing** — stale on
  `origin/develop` too, an orphan the bundler no longer regenerates because nothing references it. Not
  caused by this branch.
- A wide range of legal shapes resolve correctly on both tiers: CRLF endings, no trailing newline, empty
  and comments-only files, explicit nulls, unicode keys, one-line flow mappings, `---`/`...` markers,
  quoted values containing `#` and `:`, a 3000-line file with `access:` at the end, and the intended
  `access: manual` scalar rejection.

---

## The simplest escalation, stated on its own

Most of the findings above need unusual YAML. This one needs none:

```bash
$ printf 'access:\n  tracker: manual\n' > skills-config.yaml   # canonical, documented shape
$ source resolve-platform.sh; echo $ACCESS_TRACKER
manual                                                          # correct

$ chmod 000 skills-config.yaml                                  # now merely unreadable
$ source resolve-platform.sh; echo "rc=$? $ACCESS_TRACKER"
⚠️  skills-config.yaml could not be parsed — falling back to platform detection.
rc=0 full                                                       # escalated
```

The fail-closed branch exists precisely for "the file is unreadable and access is configured". It
decides whether access is configured by running `grep -q '^access:'` **on the same file it just failed
to read** — so the gate fails open exactly in the circumstance it was written for. A root-owned config,
a bad mount, or a permissions slip is enough.

Two further routes need no YAML at all: `SKILLS_CONFIG_FILE=/dev/null` discards the restriction
silently (BUG-24), and a `yaml.py` in the repo root replaces the parser outright (BUG-25).

---

## Recommendation

**Do not merge.** Ten HIGH defects — one a regression from the round being reviewed, four of them
independent silent escalations of exactly the invariant this task exists to protect, and one a code
execution vector.

The immediate fixes are listed in the gate. But the pattern across six cycles now points past any
individual fix: **defects are concentrated almost entirely in the awk tier's attempt to approximate a
YAML parser with line-oriented heuristics.** Each cycle closes one spelling and leaves its siblings open,
because there is no finite list of spellings to close — that is what having a grammar means.

Three options worth costing before a seventh cycle:

1. **Require pyyaml and fail loudly without it.** Removes the tier disagreement entirely. Costs a
   dependency on hosts that currently work by accident.
2. **Vendor a minimal pure-python YAML-subset parser.** Keeps zero-dependency operation, replaces
   heuristics with a grammar.
3. **Restrict the awk tier to a documented strict subset and reject anything outside it** — rather than
   guessing at input it cannot parse. Turns every one of the escalations above into a loud refusal.

Gate 5's fallback recommendation — splitting the task so the resolver lands separately from the 18
call-site guards — remains sound and becomes more attractive given BUG-15: the guards are what convert
the awk tier's misreadings into aborted runs.
