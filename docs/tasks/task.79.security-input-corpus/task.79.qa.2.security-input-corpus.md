# QA Report: Task 79 — Write down the inputs that defeat each sink, once (cycle 2)

**Task**: [task.79.security-input-corpus.md](./task.79.security-input-corpus.md)
**Gate File**: [task.79.gate.2.security-input-corpus.yml](./task.79.gate.2.security-input-corpus.yml)
**Previous cycle**: [task.79.qa.1.security-input-corpus.md](./task.79.qa.1.security-input-corpus.md) — FAIL
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-07
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 1's HIGH is closed and mutation-proved. This cycle was a **refute pass** — an adversarial read
of the fixes rather than a re-check of the findings — and it found **eleven** further issues. Every
one lies in cycle 1's own fixes or in corpus claims nobody had executed. All eleven are addressed.

Three of them matter more than their severity suggests, because each is a *fix that did not fix*:

1. The rebuilt guard still missed the axis table's Flag-forms row.
2. The import fix still did not resolve — third iteration on the same defect.
3. The purity check was defeated by the very body its author had in mind.

None is HIGH, HIGH count fell 1 → 0, and the loop is converging. **CONCERNS rather than PASS** because
three corrections rest on behaviour this environment cannot execute, and those are recorded as
qualified rather than verified.

**Overall Assessment**: CONCERNS · **Deployment**: staging APPROVED, production CONDITIONAL

---

## Re-Review Context — cycle 1's findings

| Cycle 1 finding | Status | Evidence |
|---|---|---|
| CR-1 non-restatement guard vacuous (**HIGH**) | **FIXED**, then found still-partial → fixed again | Detector now flags the deleted table (3 hits), a no-code-span restatement, **and** the Flag-forms row. Three fixtures; reverting the detector reddens each. |
| CR-2/3/4 url-authority `why` falsified | **FIXED** | Each now names the parser it is true of. Re-executed. |
| CR-5 ipv6-brackets hazard misstated | **FIXED** | Rewritten around loopback re-pointing, which is what `[::1]` actually does. |
| CR-6 unresolvable import | **NOT FIXED** by cycle 1 → fixed here | See C2-2. Two prior attempts both failed for different reasons. |
| CR-7 bundled copy's broken links | **FIXED** | Provenance references are path-free; the bundled copy has no `../../docs` link. |
| CR-8 no parity for bundled refs | **FIXED**, then improved | Byte parity, now derived from disk rather than hand-listed (C2-9). |
| TASK79-001 no purity assertion | **NOT PROPERLY FIXED** by cycle 1 → fixed here | See C2-3. |
| CR-10/11 over-broad heuristics | **FIXED** | Row counting sliced by section; `length >= 8` replaced by an explicit list, now empty (C2-8). |
| CR-9/12/13/14/15/16 (advisory) | **FIXED** | One shared renderer, literal input rendering, vacuous tests removed, `allCases()` memoised. |

**Re-review scope**: unscoped — the whole branch diff (4,865 lines), per the cycle-2 refute rule.
`SAFETY_REPROBE` was set on judgement (clause 2): the prior gate raised CONCERNS on the security
axis and cycle 1 edited six of the claims behind it, so the corpus was re-probed as a surface rather
than the fixes re-read.

---

## New Findings This Cycle

Eleven, all addressed. The seven that were reproduced by QA before being recorded:

**C2-1 — the rebuilt guard still missed the narrowest real restatement.** VERIFIED: `--output` is not
a whole token of any corpus input (the token is `--output=/tmp/x`) and `-o` fell under the
three-character floor, so a bold rewrite of the Flag-forms row scored **0 on both scans**.
`DELETED_AXIS_TABLE` did not catch it because its *other* rows carry code spans the span scan sees —
**a fixture passing for the wrong reason**, which is the same defect shape as the original CR-1 one
level up. Fixed by deriving flag heads at `=`, admitting 2-character flags, and asserting the
Flag-forms row **alone** as its own fixture.

**C2-2 — the import fix still did not resolve.** VERIFIED: `repoRoot` is undefined in the snippet,
and an installed skill puts the corpus at `<repoRoot>/.claude/skills/finalise/references/`, which
neither candidate path covers — so `corpusPath` is `undefined` and `pathToFileURL(undefined)` throws.
Three iterations: a bare specifier (broken), a repo-root path (corrupted by the bundler), a
two-candidate probe (wrong candidates). Fixed by removing the guesswork: the agent already knows
where it read the prompt from, so the snippet resolves against **that** path.

**C2-3 — the purity check was defeated by the body it was written against.** VERIFIED: `await
import(p.join(""))`, `fs.writeFileSync(…)`, `Object.getPrototypeOf(async function(){}).constructor(…)()`
and `fetch(…)` all survived the literal-stripping with **zero hits** — a dynamic import needs no
literal module name, `.constructor()` reaches `Function` without naming it, and `fetch` was not on
the list. Fixed by matching **call shapes** rather than module names. Mutation-proved with that exact
body.

**C2-4 — `host-with-slash`'s `correct` endorsed a non-mitigation.** VERIFIED: `u.host =
"evil.example.com/x"` on a URL with port 5432 yields host `evil.example.com`, port `5432` — the
setter **truncates at the `/` and raises nothing**, producing the same re-pointing as concatenation
with a cleaner-looking diff. An engine grading "build with a URL object" as a pass would pass a
still-exploitable boundary. Fixed: `correct` now leads with the rejection rule and names the setter's
behaviour.

**C2-6 — `path.symlink-escape` cannot serve as an oracle.** VERIFIED: the input resolves lexically
inside the root, so with no symlink on disk a realpath-checking implementation and one that skips
realpath return the same verdict. Fixed by stating the required fixture in `correct`.

**C2-7 — two rows shipped as malformed markdown tables.** VERIFIED by counting unescaped pipes per
rendered row: `renderRow` escaped the input column but not `why`/`correct`, which are prose *about*
shell and path syntax and quote `|` routinely (`>|`, `||`). **The parity test is structurally blind
to this** — it compares the document against the renderer, so both sides are equally wrong and
compare equal. Fixed, plus a structural row assertion that does not compare against the renderer.

**C2-8 — the one exemption covered the one genuine paraphrase.** The `--body` entry in
`PROMPT_MAY_MENTION` existed because the prompt's YAML example used `gh pr comment --body x`, a
de-escaped copy of `shell-exec.escaped-tool-name`. The exemption list was papering over exactly what
its own comment warns about. Fixed by changing the example; the list is now empty.

**C2-5 — three claims stated more broadly than the evidence supports.** `mustache-interpolation`
pairs a Mustache-named case with an expression-language payload that logic-less Mustache and
Handlebars render empty; `homoglyph-quote` asserted charset folding to U+0027 without naming the
mechanism (Node's latin1 gives 0x07, MySQL substitutes `?`); `attribute-breakout` is neutralised
inside a *quoted* attribute by any escaper that encodes `"`. Each is now qualified to the
configuration where it holds. **Not independently reproduced** — no template engine or Windows
codepage is available here — so these are recorded as cited, not verified, and that is why the gate
is CONCERNS rather than PASS.

**C2-9 / C2-10 (low)** — `BUNDLED_REFS` was hand-maintained while the bundler walks transitively (the
same staleness class the list closed, one entry over); the fragment scan matched by substring, which
would have fired `-i` on "re-invent" once short flags were admitted. Both fixed.

---

## Mutation Proofs — cycle 2

Each with a pre-mutation `diff` confirming the edit landed and a restore confirming green.

| Mutation | Target assertion | Result |
|---|---|---|
| `renderRow` stops escaping `\|` in prose cells | `every rendered row is a well-formed four-column table row` | **RED** |
| Token scan neutered to `[]` | `the detector sees a restatement that uses no inline code spans` | **RED** |
| Rewritable path restored in the prompt | `no bundled reference builds a repo-root path out of the rewritten directory` | **RED** |
| `import()` / `fetch()` / `.constructor()` added inside a never-called function | `the module's top level contains no call that could do anything` | **RED**, naming `a dynamic import()` |

Nine proofs across both cycles; all held. Worth stating plainly: **cycle 1's proofs also all held, and
cycle 1 still shipped three fixes that did not fix.** A held proof is evidence about the assertion it
reverts, not about the defect. That is `mutation-proving.md`'s own warning, observed twice in one task.

---

## Success Criteria Verification

Re-run after the cycle-2 fixes — 24 checks, **24 PASS, 0 FAIL**: five sinks with both directions; 73
cases all carrying `why` and `correct`; deeply frozen; `corpusFor` throwing on `shell-exe`,
`__proto__`, `constructor`, `toString`, `hasOwnProperty` and `""`; a case unmutatable by a caller;
the prompt referencing the corpus with zero restated inputs; all five axis names surviving; every
case naming its sink; the bundled `.mjs` matching its source.

`npm run ci:fast` exit 0 — **2538 tests, 2537 pass, 0 fail**, 1 skipped. Prettier clean. Bundler runs
with **no warnings** (cycle 1 had introduced one).

---

## NFR Assessment

- **Security — CONCERNS.** Materially improved; the residual is C2-5's three cited-not-executed
  claims. They are now stated with their conditions rather than unconditionally, which is the honest
  form, but it is not verification.
- **Performance — PASS.** Pure data, 2ms import, `allCases()` memoised.
- **Reliability — PASS.** Rollback green; prototype probes all throw; bundler clean.
- **Maintainability — PASS** (up from CONCERNS). The guard fails on three distinct restatement shapes,
  each its own fixture; bundled parity is byte-level and derived from disk; document and test share
  one renderer; a structural assertion catches renderer bugs the self-comparison cannot.

---

## Convergence

| Cycle | Gate | HIGH findings |
|---|---|---|
| 1 | FAIL | 1 |
| 2 | CONCERNS | 0 |

Strictly decreasing. The check needs three readings to trip and does not apply; the trend is the
right one.

---

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 80/100 (0 NFR FAIL, 1 NFR CONCERNS — see the gate for
the reading used)

**Rationale**: The deliverable is sound and every success criterion verifies under execution. The
lesson of this cycle is about the *pipeline*, not the corpus: three cycle-1 fixes were confidently
recorded, individually mutation-proved, and still wrong — caught only because cycle 2 refuted the
fixes instead of re-reading the findings. Nothing outstanding blocks merge; the three qualified
claims are named so a reader knows which parts of the corpus are measured and which are cited.

**Deployment Recommendation**: staging APPROVED, production CONDITIONAL.

---

**Next Steps**: Step 5c — `/review-pr` conformance review, the loop's exit gate.
