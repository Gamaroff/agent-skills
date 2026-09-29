# QA Report: Task 147 - develop pipeline: five steps that fail or overreach on correct input

**Task**: [Link to task document](./task.147.develop-pipeline-step-mechanics.md)
**Gate File**: [task.147.gate.6.develop-pipeline-step-mechanics.yml](./task.147.gate.6.develop-pipeline-step-mechanics.yml)
**Review Date**: 2026-09-25
**Gate Status**: PASS

---

## Re-Review Context

This is cycle 6, granted on re-entry after the loop-limit escalation (the budget is now 7). It is the first gate to read the cycle-5 replacement, `a7f93126`.

| Gate-5 finding | Status | Evidence |
| --- | --- | --- |
| CR-3 (bug.14): the scope gate used the wrong predicate | FIXED | One `path_under()` now serves the gate and check 3. Case 28–31 mutation (gate always finds) → 4 of those cases red, plus the earlier "naming nothing" case → `covered` |
| CR-1: glob and `:/` scopes passed vacuously | FIXED | Cases 28–29. By-hand: `docs/*`, `doc*`, `[d]ocs` and `:/docs` → exit 2 |
| CR-2: a case-folded scope passed vacuously (macOS) | FIXED | Case 30. By-hand: `Docs/tasks`, `DOCS`, and `TASKS` from a subdirectory → exit 2 |
| CR-4: a symlink-component scope | FIXED | Case 31. By-hand: `linkdocs/tasks` → exit 2. The absolute spelling through the symlink is canonicalised and judged (exit 1), never passed vacuously |
| CR-6: the help range dropped a line in the bundled copies | FIXED | Case 32. Mutation (fixed `29,39p` range) → case 32 red → `covered` |
| CR-5: the refusal message | FIXED | The message now reads "outside this repository, or does not resolve to a path inside it" |

bug.14 was verified and closed.

---

## Review Methodology

Re-review scope: since 2026-09-25T10:46:43Z (default; `SAFETY_REPROBE=false`, since the gate-5 security axis was PASS/reasoned and no HIGH or FAIL was recorded). The scoped diff covers 13 files and 2433 lines, and the substantive change is `a7f93126`.

- **Code review (Step 3b)**: `subagent: killed at 11 minutes (budget 10). The pass was performed inline; independence was lost.` An Explore reviewer was dispatched at 13:08 with `code-review-prompt.md` and stopped at 13:19 without returning. The inline pass followed the same prompt (sections A–E).
- **Boundary rule (Step 3b.3)**: the `--scope` gate refuses input, so it is a boundary. The engine `shell:` form was tried, and all 28 cases stopped at `unknown argument`: the script takes flags, not one positional. So the sink was probed by hand per probe-boundary-rule §5.1, under `env -i` with a throwaway `HOME`, in a scratch repo with a bare origin, a symlinked directory, a path containing a space and a non-ASCII filename. The results are listed in the arm × shape table below.
- **Platform variance**: the same results under `/bin/bash` 3.2.57 and `/usr/local/bin/bash` 5 (no scope, an in-scope dirty file, an out-of-scope dirty file).
- **Tests**: `npm run ci:fast` ran on a clean detached checkout without the gitignored `.agents/skills` symlink: 4051/4053 passed. The single failing file, `observation-log.test.mjs`, refuses a scratch base under `/tmp` by design (the checkout sat in the scratchpad). It passes 53/53 from the real checkout, and this PR does not touch it. `bundle:check`: 0 problems. `lint:shell`: clean (75 scripts). The five bundled `verify-push-state.sh` copies are identical to the source.
- **Step 4b**: not applicable. There is no runnable prose in the scoped change set (no `SKILL.md` or `shared/resources/*.md`).

### By-hand probes (arm: `bash verify-push-state.sh --base main --scope <s>`)

| Shape | Result | Correct |
| --- | --- | --- |
| `docs/tasks`, `docs`, `./docs/tasks`, `docs/tasks/`, absolute, `docs//tasks`, `docs/./tasks`, file, `café.md`, `a.md/` (dirty inside) | 1 | ✓ judged |
| `src`, `sp ace`, `linkdocs` (clean or outside) | 0 | ✓ |
| `docs/*`, `doc*`, `[d]ocs`, `:/docs`, `Docs/tasks`, `DOCS`, `linkdocs/tasks`, `nonexistent`, `../x`, `docs/../src`, `/etc`, `.`, `docs/tasks/a`, `docs/task`, `-` | 2 | ✓ refused |
| From `docs/`: `tasks`, `./tasks` → 1; `../src`, `TASKS` → 2 | as shown | ✓ (`../src` is conservative; see recommendations) |
| Absolute through the symlink, `/tmp` vs `/private/tmp` | 1 | ✓ canonicalised |
| Multiple scopes: `docs/tasks` + `nonexistent` → 2; `src` + `docs/tasks` → 1 | as shown | ✓ |
| An uncommitted deletion named as the scope | 1 | ✓ |

38 probes, 0 vacuous passes.

---

## New Findings This Cycle

None blocking. Two LOW cleanups (advisory):

- **[low/cleanup]** `shared/resources/verify-push-state.sh` scope gate: each tracked path is listed twice (index plus `HEAD`), and each scope is scanned in a bash `read` loop. A refused scope costs 1.16s on 4240 files and grows linearly with repo size. Fix: deduplicate, or read `HEAD` only when the index finds nothing.
- **[low/cleanup]** `shared/resources/verify-push-state.sh`: the "names no path git knows" refusal prints the normalised `$s`, while every sibling refusal prints `$raw`. Fix: print both.

---

## Code Review

```yaml
code_review:
  reviewed: "a7f93126 scope gate + path_under + help markers in shared/resources/verify-push-state.sh; tests 28-32; 5 bundled copies"
  findings:
    - id: CR-1
      category: cleanup
      severity: low
      confidence: high
      file_line: "shared/resources/verify-push-state.sh:129"
      finding: "The gate's path list holds every tracked path twice (ls-files --cached plus ls-tree HEAD), and each scope is checked with a linear bash read loop."
      suggested_action: "Deduplicate the list, or append HEAD's tree only when the index scan finds no match."
      suggested_owner: dev
    - id: CR-2
      category: cleanup
      severity: low
      confidence: high
      file_line: "shared/resources/verify-push-state.sh:145"
      finding: "The refusal names the normalised scope rather than the spelling passed, unlike the block's other refusals."
      suggested_action: "Print the raw spelling alongside the normalised one."
      suggested_owner: dev
  truncated_count: 0
```

Candidates examined and rejected, each by execution: an unreadable directory making `ls-files` diverge from `status` (both warn and succeed, so there is no vacuous path); empty-array expansion under bash 3.2 `set -u` (clean); porcelain vs `ls-files` path encoding (both `-z`, and the non-ASCII case was judged correctly).

mutation-proven: gate loop forced to `FOUND=true` → cases 28, 29, 30, 31 (and "naming nothing") red → covered
mutation-proven: `--help` by the fixed `29,39p` range → case 32 red → covered

---

## NFR Assessment

- Security: PASS (measured; 38 by-hand probes, sink declined by the engine)
- Performance: PASS
- Reliability: PASS
- Maintainability: PASS

---

## Final Assessment

**Gate Status**: PASS. **Quality Score**: 100/100. **Deployment Recommendation**: APPROVED. **Next Steps**: there is no open entry in `top_issues[]`, so the loop proceeds to 5c (`/review-pr`).
