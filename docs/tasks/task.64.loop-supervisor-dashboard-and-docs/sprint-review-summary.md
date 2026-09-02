# Sprint Review Summary — Task 64

**Task:** Publish the supervisor run over HTTP, and write the operator documentation that makes an overnight run repeatable
**Status:** ✅ Accepted · **PR:** [#278](https://github.com/Gamaroff/agent-skills/pull/278) · **Accepted:** 2026-08-29

---

## Summary

`loop-supervisor` can now publish a live run to a dashboard, and an operator who has never used it can
run one overnight from a runbook. The two halves belong together because both serve **somebody other
than the person who started the run**.

What ships for the dashboard is **a documented payload, not an integration**. The dashboard itself
lives in the consumer repo and is not built, stubbed or tested here — so both halves can be built
independently, in either order, by different people, and a second consumer with a completely different
dashboard is served by the same contract without a line changing here.

## Success criteria met — 8/8

1. ✅ `--dashboard` posts the documented payload on each iteration boundary, ending `active: false`
2. ✅ Unresolvable host, non-2xx and timeout each warn once and leave the run's outcome and exit status unchanged — **proved by test**, at the run level
3. ✅ The README documents the payload well enough to build the consumer half without this repo open, including both `/api/batch` warnings
4. ✅ The runbook takes an operator from nothing to a completed overnight run, covering halts, caps, stop reasons and morning triage
5. ✅ `claude --resume <uuid>` documented as the way to reopen any single iteration
6. ✅ The per-iteration re-prime cost is stated plainly, with the prompt-cache caveat and measured figures
7. ✅ `develop-next` points at the fresh-context alternative from both its SKILL.md and README
8. ✅ Executable-instructions, link check, `npm test` and `format:check` green

## Key features

- **`--dashboard` / `--dashboard-token`** — a status frame POSTed at each iteration boundary, inert without the flag. Every field derives from state task 62 already writes; **no new state**.
- **A failure policy that is proved, not asserted.** Unresolvable host, non-2xx, 5s timeout, unserialisable payload, absent `fetch`, throwing filesystem reads — each warns once and the run continues, its outcome and exit status untouched. No retry, no queue: the next frame is one boundary away.
- **A credential design with the boundaries enforced.** The token travels only in a header; it is not a config key (that file is committed), never reaches the frame body or the ledger, and is stripped from every spawned child's environment. `repoUrl` userinfo is redacted.
- **`docs/runbooks/unattended-overnight-runs.md`** — rehearsals before trusting a night to it, cap selection with what each cap protects against, watching from a second terminal, and morning ledger triage including the two outcomes that mislead (`incomplete` is the Stop hook working; a halt file proves nothing by existing, only its timestamp counts).

## Technical details

**Modified** — `skills/loop-supervisor/scripts/run-loop.mjs` (`buildDashboardPayload`, `pushDashboard`, `pushRunFrame`, `childEnvFor`, `redactRemoteUrl`), `README.md`, `SKILL.md`, `skills/develop-next/{SKILL,README}.md`, `skills-config.yaml`, `docs/reference/configuration.md`, `docs/runbooks/README.md`, `tests/executable-instructions.test.js`
**New** — `docs/runbooks/unattended-overnight-runs.md`, `evals/loop-supervisor/unit/dashboard.test.mjs`

## Testing & QA

**1870 tests** — 1869 pass, 1 skipped (live-network, gated), 0 fail. CI 4/4 green on the final head.

**Three QA cycles: CONCERNS 50/100 → CONCERNS 90/100 → PASS 100/100. Twelve findings, all closed.**

The cycles are the story of this task. Gate 1 was 50/100 on work whose suite was already fully green
and whose CI already passed — nothing a re-run would ever have surfaced. The findings share one shape,
and it is exactly the failure this task was written to prevent: **coverage claimed where none existed.**

- A payload publishing the whole append-only ledger while its own README promised per-run totals.
- A token-absence test that could not fail — proved vacuous by deleting the very thing it guarded.
- SC2 proved one level below where the criterion states it.
- A Risk Assessment naming `executable-instructions` as its mitigation for "runbook documents commands that do not ship" — a test that had never opened the runbook.
- At cycle 2, a credential boundary correct in code and held by nothing.

**Mutation proving** — reverting each behaviour and re-running the suite — is what found the last two,
and it is why the rest are known to be held rather than merely written. Ten invariants probed, ten proved.

**Two defects were introduced by the fixes themselves** and caught before CI: a third-SIGINT
re-entrancy bug, and a QA report linking gitignored scratch that would have resolved locally and 404'd
in CI. Both were recorded as findings rather than fixed silently.

## Security & compliance

Security ✅ — every claim mutation-proved. Compliance ⚠️ N/A — a developer CLI handling no personal,
payment or health data and rendering no UI.

## Demo notes

```bash
# Rehearse for cents — spawns for real, touches nothing
node .agents/skills/loop-supervisor/scripts/run-loop.mjs run \
  --adapter generic --command 'Reply with the single word: ok' --max-iterations 2

# Overnight, with a dashboard
export LOOP_SUPERVISOR_DASHBOARD_TOKEN=...
node .agents/skills/loop-supervisor/scripts/run-loop.mjs run \
  --adapter develop-next --max-duration 8h --max-cost 40 --notify \
  --dashboard https://dash.internal/api/loop
```

## Known limitations

- The payload contract is proved against its own tests, **not against a real consumer**. Exercise it end to end once when the dashboard is built.
- A `SIGKILL` or power cut leaves the last frame reading `active: true`; a double `Ctrl-C` closes it on a 1.5s leash, but consumers are told to age frames out rather than trust the flag.
- No retry or queue for dropped frames — deliberate; the next frame is ~5s away.

## Impact

An eight-hour unattended roadmap run is now both **observable** (by anyone with the dashboard) and
**repeatable** (by anyone with the runbook), where before it was neither.
