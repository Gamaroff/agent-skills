# Definition of Done Verification

**Story/Task:** task.304 — QA snippet classifier refuses git literal execution
**Verification Started:** 2026-11-11T08:00Z

---

## Verification Results

## Evidence recorded by this run (measured on head d611a3c7 plus the doc fixes)

- **#1 amendment.** Criterion #1 said `--exec-path` is not refused. QA cycle 2 measured that `ls-remote --exec-path=<dir>` runs `<dir>/git-upload-pack`, so the engine refuses it. The owner approved the amendment (criteria-drift reports `#1 reworded, approved: true`). The other criteria text is unchanged from the review commit (`criteria-drift.js`: no other drift).
- **#3.** Differential on the LAN server: 0 writes in 20000 blocks on the enlarged git atom set (QA 7). The original 600-block figure stands for the first delivery.
- **#5 docscan timing on head.** `node scripts/qa-snippets-docscan.mjs --time`, five runs, load average about 2.3 beside each: develop 546, 487, 543, 505, 594 ms (median 543); now 494, 449, 505, 472, 553 ms (median 494). Newly runnable 0, newly refused 0 on 3473 blocks. No outlier. The bound (+10%) is met, now is 9% faster.
- **#6.** `CI=true node --test shared/resources/tests/qa-execute-snippets.test.mjs`: 405 pass, 0 fail (397 at first delivery; the criterion's claim is "green").
- **#7 bundle freshness.** `python3 skills/create-skill/scripts/bundle_skill.py --check`: 129 skill(s) checked, 0 problems.
- **#8 per-refusal mutation proofs, re-run this run** (one refusal off at a time, engine restored from a snapshot, `cmp` clean each time):
  - `--config-env` refusal off: red, `AssertionError: --config-env`.
  - `--upload-pack` / `--exec` refusal off: red (2 fail): `git: classified runnable, but bash wrote: ["git ls-remote --upload-pack='touch out' file:///none…` and `ls-remote --upload-pack=`.
  - `-c` refusal off: **no test goes red**, and neither does turning off the operand-flag refusal as well (only `git --namespace x log -1` goes red). `-c <value>` is still refused because the value is then read as the subcommand and is not on the allow-list. So `-c` is held by three independent layers, and no single or double revert proves one of them alone. That is defence in depth, recorded here as it is, not as a red proof. The `-c` rows in the bash-verified table (`T304_FORMS`) assert the outcome (a bash-verified write is refused), and QA reports 1 to 7 hold them green.
  - Earlier cycles: GIT_ name (QA 2), `--exec-path=<dir>` and unquoted brace (QA 3), unknown flag (QA 5), reader-agreement (QA 6), operand-flag, plain-flag and `-C` plain-word (QA 7).
- **Security probe plan.** The security agent's 62-case plan ran through the engine: 62 executed, 0 reproduced, 0 escaped, 0 refusals (record `task.304.dod.1.security.run.json`).

---

_Agent sections follow._

---
