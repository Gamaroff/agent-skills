---
id: task.142.plan
title: "Implementation Plan: Pin the hand-written reference docs to the skills they describe"
type: plan
description: "Code-level guide for task 142: the two extractors, the three assertion groups and their measured floors, the mutation proofs, and the header comment that states what the guard cannot see."
task-ref: task.142.reference-doc-skill-pinning.md
created: 2026-09-22
updated: 2026-09-30
---

# Implementation Plan: Pin the hand-written reference docs to the skills they describe

> Requirements and success criteria:
> [task.142.reference-doc-skill-pinning.md](task.142.reference-doc-skill-pinning.md)

## Overview

One new file, `tests/reference-doc-skill-pinning.test.js`, written in `node:test` + `node:assert`
like the rest of `tests/`. It is already covered by the `tests/*.test.js` glob in `package.json`, so
nothing else changes. Two pure extractors, three assertion groups, three floors, and a header comment
that is part of the deliverable rather than decoration.

The numbers below were measured against `develop` at `993578a3` on 2026-09-22 and re-measured at
`80f460bc` on 2026-09-30 by `task.142.review.1`, which also corrected two defects in the code below
(ES-module syntax in a CommonJS package; a resolver that picked up path segments). Re-measure before
setting the floors — do not copy them forward on trust.

---

## Phase-by-Phase Implementation Guide

### Phase 1: The extractors

**Files to modify:**

- `tests/reference-doc-skill-pinning.test.js` — new.

**Exact changes:**

```js
// tests/reference-doc-skill-pinning.test.js
//
// WHAT THIS PINS: that every command, flag and skill name the two hand-written reference documents
// mention actually exists. docs/reference/skill-catalog.md needs no such test — it is generated and
// `npm run check:generated` guards it. These two are hand-written and, until this file, nothing
// connected them to the skills they describe.
//
// WHAT THIS DOES NOT PIN: whether a row DESCRIBES the skill correctly. On 2026-09-22 `qa-next` was
// re-indexed from stories to user functions; `commands.md` went on saying the skill would "resolve
// the story's ACs" for a day before anyone read it (obs #159). Every token in that sentence was
// valid — it was the meaning that was wrong, and no assertion here would have seen it. The prose
// sweep lives in skills/create-skill/SKILL.md § "A skill's behaviour is restated in
// docs/reference/, and nothing reaches it". Do not retire it because this file is green.

"use strict";
// CommonJS, like every neighbour: package.json is "type": "commonjs", so ESM syntax here throws at
// load — which node --test reports as a failed FILE, not a failing assertion.
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = join(__dirname, "..");
const COMMANDS = join(ROOT, "docs/reference/commands.md");
const PHRASES = join(ROOT, "docs/reference/activation-phrases.md");

// Rows whose first cell is not a slash command. Named, not bucketed: a new unresolvable row must
// fail loudly rather than join a silent skip list.
const NON_SKILL_ROWS = new Set([
  "`run-loop.mjs run`",
  "`run-loop.mjs dry-run`",
  "`run-loop.mjs status`",
  "`run-loop.mjs watch`",
]);

// Split on UNESCAPED pipes: `/review-pr [PR\|branch]` is one cell, not two.
const cells = (line) => line.split(/(?<!\\)\|/);

function extractCommandRows(md) {
  const out = [];
  md.split("\n").forEach((line, i) => {
    if (!line.startsWith("| `")) return;
    const cell = cells(line)[1].trim();
    // The LAST word-start /token wins: `/loop /develop-next` is the /loop built-in wrapping a
    // skill, and the skill is what the row is about. Word-start only (start, space, backtick, "("):
    // row 143 quotes .agents/skills/session-handoff/scripts/handoff-verify.mjs after the command,
    // and a bare /([a-z0-9-]+)/ resolves that row to "handoff-verify" (measured in review).
    const names = [...cell.matchAll(/(?:^|[\s`(])\/([a-z0-9][a-z0-9-]*)/g)].map((m) => m[1]);
    out.push({
      line: i + 1,
      cell,
      skill: names.length ? names[names.length - 1] : null,
      flags: [...new Set(cell.match(/--[a-z][a-z0-9-]*/g) ?? [])],
    });
  });
  return out;
}

function extractActivationSkills(md) {
  const out = [];
  md.split("\n").forEach((line, i) => {
    if (!line.startsWith("|") || cells(line).length < 4) return;
    const row = cells(line).slice(1, -1).map((c) => c.trim());
    const tokens = [...new Set((row.at(-1).match(/`([^`]+)`/g) ?? []).map((t) => t.slice(1, -1)))];
    for (const t of tokens) {
      const [skill, ...flags] = t.split(/\s+/);
      // Must not START with "-": the cells backtick the skill and the flag SEPARATELY
      // (`review-bug` … `--validate`), and [a-z0-9-]+ happily matches "--validate".
      // Also rejects `/develop-story`, the built-in `/security-review` and `handoff-verify.mjs`,
      // which the cells mention as non-skill spans.
      if (!/^[a-z0-9][a-z0-9-]*$/.test(skill)) continue; // a flag, a slash command, a script name
      out.push({ line: i + 1, skill, flags: flags.filter((f) => f.startsWith("--")) });
    }
  });
  return out;
}
```

Two traps this shape avoids, both found while measuring:

- A naive "first `/token`" resolves `` `/loop /develop-next` `` to `loop`, which is a Claude Code
  built-in and has no `skills/loop/`. Last-token-wins is the fix, and it needs a fixture case — but
  only over **word-start** tokens, or a quoted script path's last segment wins instead (row 143).
- A plain `split("|")` truncates `` `/review-pr [PR\|branch]` `` (line 60) and the
  `/tracker-reconcile` row (line 116, whose three flags it drops). Split on unescaped pipes.
- `activation-phrases.md` backticks the skill and the flag as **two separate spans** in the same
  cell — `` `review-bug` (the second phrasing picks `--validate`) `` — so the extractor sees
  `--validate` as its own token. `[a-z0-9-]+` matches it, because `-` is in the class; the head
  token must be required to *start* with a letter or digit. Measured: without that, lines 30 and 105
  are looked up as `skills/--validate/` and `skills/--review/` and the test is red on arrival.

---

### Phase 2: The assertions and their floors

**Files to modify:**

- `tests/reference-doc-skill-pinning.test.js`

**Exact changes:**

```js
const skillMd = (() => {
  const cache = new Map();                       // memoised: 63 skills, 80 rows
  return (name) => {
    if (!cache.has(name)) {
      const p = join(ROOT, "skills", name, "SKILL.md");
      cache.set(name, existsSync(p) ? readFileSync(p, "utf8") : null);
    }
    return cache.get(name);
  };
})();

describe("commands.md names commands that exist", () => {
  const rows = extractCommandRows(readFileSync(COMMANDS, "utf8"));

  test("every row resolves to a skill or to a named non-skill row", () => {
    for (const r of rows) {
      if (r.skill === null) {
        assert.ok(
          NON_SKILL_ROWS.has(r.cell),
          `commands.md:${r.line}: ${r.cell} names no /command and is not in NON_SKILL_ROWS — ` +
            `add it there if it is deliberately not a skill`,
        );
        continue;
      }
      assert.ok(
        skillMd(r.skill),
        `commands.md:${r.line}: ${r.cell} names /${r.skill}, but skills/${r.skill}/SKILL.md does not exist`,
      );
    }
  });

  test("every flag a row advertises is documented by that skill", () => {
    let checked = 0;
    for (const r of rows) {
      const body = r.skill && skillMd(r.skill);
      if (!body) continue;
      for (const f of r.flags) {
        checked += 1;
        assert.ok(
          body.includes(f),
          `commands.md:${r.line}: ${r.cell} advertises ${f}, which skills/${r.skill}/SKILL.md never mentions`,
        );
      }
    }
    // 20 at 80f460bc (2026-09-30). A floor, not an equality: rows get added.
    assert.ok(checked >= 16, `only ${checked} flag assertions ran — the extractor is probably broken`);
  });

  test("the extractor still finds the corpus", () => {
    // 76 slash rows of 80 total at 80f460bc (2026-09-30).
    assert.ok(rows.length >= 70, `only ${rows.length} command rows extracted — check the row regex`);
  });
});

describe("activation-phrases.md names skills that exist", () => {
  const named = extractActivationSkills(readFileSync(PHRASES, "utf8"));

  test("every named skill exists", () => {
    for (const n of named)
      assert.ok(
        skillMd(n.skill),
        `activation-phrases.md:${n.line}: names \`${n.skill}\`, but skills/${n.skill}/SKILL.md does not exist`,
      );
  });

  test("the extractor still finds the corpus", () => {
    // 67 skill mentions naming 62 distinct skills, on 2026-09-22.
    assert.ok(named.length >= 58, `only ${named.length} skills extracted — check the cell regex`);
  });
});
```

Add a `describe("extractors", …)` group over inline fixture strings — five cases, listed in the task
document's § 8 — so the extractors are pinned independently of what the live documents contain. Those
are the only tests in the file that do not read the real corpus, and that is deliberate: if the
corpus is what defines correct behaviour, a corpus change can make an extractor bug look like a
corpus bug.

**On the floor messages.** Each says *the extractor is probably broken*, not *the corpus shrank*,
because that is the likelier cause and the one a reader will otherwise not consider. A scan returning
nothing means either there is nothing to find or the reader is broken, and those two are
byte-identical from the caller's side.

---

### Phase 3: First run, and what it surfaces

**Files to modify:**

- `docs/reference/commands.md`, `docs/reference/activation-phrases.md` — only on a real finding.

**Exact changes:**

1. Run it. Measured during review against `80f460bc`, with the corrected rule: **0** unresolvable
   skills, **0** unexpected non-skill rows beyond the four `run-loop.mjs` ones, and **exactly one**
   flag failure over 20 assertions — `commands.md:143` advertises `/session-handoff --read`, which
   `skills/session-handoff/SKILL.md` never mentions. That one is a real defect: fix the **row** to
   describe read mode without a flag. Any other red means the extractor is wrong — fix the
   extractor, do not edit the corpus to make it green.
2. Mutation-prove all three groups. Each of these must turn exactly one test red:

   | Mutation | Expected red |
   | :--- | :--- |
   | `mv skills/qa-next skills/qa-next.bak` | command resolution + activation resolution |
   | Add `` `/qa-next --nope` `` as a row | flag existence |
   | Stub `extractCommandRows` to `() => []` | both command floors |
   | Stub `extractActivationSkills` to `() => []` | the activation floor |
   | Resolve the **first** `/token` instead of the last | command resolution, on `/loop /develop-next` |

   Restore after each. Record which assertion caught which in the implementation notes — a test that
   passes against both the fixed and the broken tree is holding nothing.
3. Write the header comment (Phase 1's block) last, once the limits are known for certain rather than
   predicted.

---

## Key Patterns and References

- `tests/bundled-links.test.js` — walks a corpus, asserts a property per item, floors the count.
  Closest neighbour; copy its shape.
- `tests/mutation-call-site-coverage.test.js` — scans canonical sources for a forbidden invocation
  with a named allowlist. The `NON_SKILL_ROWS` pattern comes from there: a named list, asserted, not
  a silent skip.
- `docs/reference/anti-patterns.md` — the enumeration class. `NON_SKILL_ROWS` is a second enumeration
  of "rows that are not skills", which is why the test asserts it is *exactly* the unresolvable set
  rather than merely a superset of it.
- The generated control case: `skills/create-skill/scripts/generate_catalog.py` plus
  `npm run check:generated`. It is why `skill-catalog.md` needed no sweep during the `qa-next` rework
  and these two did.

## Testing Approach

```bash
command node --test tests/reference-doc-skill-pinning.test.js      # the file alone
npm test                                                            # the suite
command npx prettier --check tests/reference-doc-skill-pinning.test.js
```

Move the gitignored `.claude/skills → ../skills` and `.agents/skills → ../skills` symlinks aside
before believing a local green — they have masked CI failures in this repo before.

Re-measure the three counts before committing the floors:

```bash
command python3 - <<'PY'
import re, os
rows = [l for l in open("docs/reference/commands.md").read().split("\n") if l.startswith("| `")]
print("command rows:", len(rows))
first = lambda l: re.split(r"(?<!\\)\|", l)[1]
print("flag mentions:", sum(len(set(re.findall(r"--[a-z][a-z0-9-]*", first(l)))) for l in rows))
PY
```
