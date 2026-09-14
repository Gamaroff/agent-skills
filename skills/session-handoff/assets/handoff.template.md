# Session Handoff — {YYYY-MM-DD}

Read this first if you are picking up work in `{repo}`. It records where things stand, what to pick
up, the standing decisions, and the drift that is tolerated. The **traps** — the durable half — live
in [`docs/contributing/traps.md`](../docs/contributing/traps.md); read them before touching anything.

**Every figure below was measured in the session that wrote this file, on {YYYY-MM-DD}, and carries
the command that produced it.** Do not trust the date — re-measure:
`command node .agents/skills/session-handoff/scripts/handoff-verify.mjs` reports every line below as
`confirmed`, `stale` (with the new value) or `unverifiable` (with why).

**State at handoff:** branch `{branch}` @ `{short-sha}` · tag **{tag}** ({date}) is {N} commits behind
`{branch}` · **{N} open PRs** · **{N} open issues**.

<!-- Half-life: hours to days. One row per figure. The FIRST backticked span in Command is what the
     verifier runs (read-only whitelist; prose here is reported `unverifiable: no command`). The
     **bold** spans in Result are what it compares — write them as tokens that appear verbatim in
     the command's output (`**exit 0**` is compared against the exit code). -->

| Check | Command | Result |
| --- | --- | --- |
| Hermetic suite | `command npm test` | **exit 0** — {N} assertions, **0 failures** |
| Bundle freshness | `command npm run bundle -- --check` | **0 problems** |
| Formatting | `command npx prettier --check .` | **exit 0** |
| Roadmap lint | `command node skills/develop-next/scripts/select-next.mjs --lint` | **0 errors** |
| Frontier | `command node skills/develop-next/scripts/select-next.mjs` | **{status}** {item id} |
| Branch tip | `git rev-parse --short HEAD` | **{short-sha}** |

---

## 1. What to pick up

<!-- Half-life: days. Re-verify at write time; NEVER carry forward from the previous handoff. A
     prose figure can carry its own command in a trailing HTML comment — see SKILL.md §Read. -->

{The frontier, in selection order, and why the first item is first.}

---

## 2. Standing decisions

<!-- Half-life: long. Decisions taken and deliberately not revisited. Cite the document or PR. -->

- {decision} — {where it is recorded}

---

## 3. Carried follow-ups — RE-MEASURED {YYYY-MM-DD}

<!-- Half-life: days. Status re-verified, not copied. Each item carries the command that re-measures
     it — in a trailing HTML comment the verifier reads, or spelled out for the next writer. -->

### 3a. {follow-up}

{What was re-run, what it showed, what remains.}

---

## 4. Tolerated drift

<!-- Half-life: long. Known-wrong things that are deliberately not being fixed, and why. -->

**{drift}.** {Why it is tolerated; what guards it.}

---

## 5. Traps

Live in [`docs/contributing/traps.md`](../docs/contributing/traps.md) — durable, dated, re-verified.
They are not restated here: the state above is true for hours and the traps for months, and keeping
them together let the half that decayed discredit the half that did not. **Add a trap there when it
has cost a session twice.**

---

## 6. Where the artifacts are

<!-- Half-life: medium. Paths, not descriptions. -->

```
{path}    {what it is}
```
