# Sprint Review Summary — Task 80

**Task:** Make a security probe runnable without widening the snippet allow-list
**Status:** ✅ Accepted · **PR:** [#337](https://github.com/Gamaroff/agent-skills/pull/337) · **Accepted:** 2026-09-07

---

## Summary

`task.73` gave the DoD security check a probe mode, but the mode was **prose**: it told the agent to hand-write a script and run it, then trusted the `probes_executed` count the agent typed. The guard *"`boundary: true` and `probes_executed: 0` → FAIL"* was a self-guard whose input was self-reported — an agent that executed nothing could write `probes_executed: 12`.

This ships the engine that makes that count something a machine produced.

## Success Criteria Met

11/11, each traced to a named test. The four that carry the argument:

- **The engine computes the verdict**, from what actually happened — `engages` / `present-but-inert` / `absent` / `unverifiable`. No caller-supplied verdict field exists on the input shape.
- **Zero executed cases yields `unverifiable`, never a pass — and it exits 1, not 0.** A CI check reading `$?` cannot mistake "could not tell" for "the control holds", which would have reintroduced the original defect one layer down.
- **`declined` is its own state**, never folded into `executed: 0`. Both render as "nothing ran" and answer different questions; collapsing them is the defect `task.73` chased through four QA cycles.
- **No interpreter joined `SAFE_COMMANDS`** — the shortcut the task exists to refuse, refused in writing *and* asserted by a test over 13 interpreter names.

## Key Features

- `shared/resources/security-probe.mjs` — runs each corpus case in its own child process; entry paths resolved and rejected outside the repo root **before** `import()`, because `import()` runs the module's top level and a post-hoc check would be too late.
- `shared/resources/probe-boundary-rule.md` — the argument beside the mechanism: the trust-class distinction, the verdict derivation from `direction`, the honest v1 limits, and the `SAFE_COMMANDS` refusal with its reason.
- `sandboxEnv()` / `snapshotTree()` extracted from `qa-execute-snippets.mjs` so containment is reusable rather than re-improvised per caller.

## Technical Details

Two non-obvious design decisions, both documented at the code rather than left implicit:

- **`present-but-inert` requires *some* hostile case to have been rejected.** A control that demonstrably exists and demonstrably let one through is worse than an absent one, because it has already been reviewed and believed.
- **`engages` additionally requires ≥1 *legitimate* case to pass.** Without that clause a stub throwing on every input rejects all hostile cases and scores a clean probe — the same failure as a self-reported zero count, in different clothes.

## Testing & QA

| | |
| --- | --- |
| QA cycles | 3 — CONCERNS 60 → CONCERNS 80 → **PASS 100** |
| Findings | 6 raised, 6 closed, **0 HIGH** throughout; none carried, none waived |
| Tests | `npm run ci:fast` **2570 / 0 failures**; targeted 276/276 |
| CI | ✅ SUCCESS on the accepted head |
| Mutation proofs | every fix in every cycle proved by faithful reversion |

Cycle 2's **refute pass** earned its cost: it found two findings the fixes had left reachable by the route the consumer actually takes — the timeout validated at the CLI but not the API, and an import that would have crashed `npm run bundle` on the consumer's first integration.

## Security & Compliance

All seven §9 safety criteria verified **by execution, not inspection**. Probe mode fired against this task's own deliverable — **39 candidates executed, 1 reproduced**, analysed as a LOW misclassification rather than a containment escape (`/etc/passwd` was never read).

That probe found something three QA cycles did not, by enumerating the boundary's input space rather than re-testing the inputs an earlier cycle named. It is the argument for this task, made against the task's own output.

Compliance: not applicable — internal QA tooling, no personal data, payment path, UI or health data.

## Known Limitations

Stated in `probe-boundary-rule.md` §5 rather than engineered around:

- **No OS-level sandbox.** The module under probe runs with full Node privileges. The harness contains *the harness*, not the repository.
- A symlink pointing out of the tree resolves at import time, after the path check.
- v1 probes importable entry points only; shell/exec and live-DB sinks are **declined and recorded as declined**, never counted as probed.

## Follow-up

- **Link the tracker issue** — `/sync-github-task`. Flagged at Step 2 and carried unactioned through all three cycles because creating a remote issue is consent-gated and this run was autonomous.
- `file://` entry specifiers report `entry-not-probeable` rather than `bad-entry` (LOW, cannot leak).
- Consumers: `task.81` (the skill that calls this engine), `task.82` (the gate-schema change).
