---
id: task.142.plan
title: "Implementation Plan: Pin the hand-written reference docs to the skills they describe"
type: plan
description: "Code-level guide for task 142: the two extractors, the three assertion groups and their measured floors, the mutation proofs, and the header comment that states what the guard cannot see."
task-ref: task.142.reference-doc-skill-pinning.md
created: 2026-09-22
updated: 2026-09-22
---

# Implementation Plan: Pin the hand-written reference docs to the skills they describe

> Requirements and success criteria:
> [task.142.reference-doc-skill-pinning.md](task.142.reference-doc-skill-pinning.md)

## Overview

One new file, `tests/reference-doc-skill-pinning.test.js`, written in `node:test` + `node:assert`
like the rest of `tests/`. It is already covered by the `tests/*.test.js` glob in `package.json`, so
nothing else changes. Two pure extractors, three assertion groups, three floors, and a header comment
that is part of the deliverable rather than decoration.

The numbers below were measured against `develop` at `993578a3` on 2026-09-22. Re-measure before
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

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
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

export function extractCommandRows(md) {
  const out = [];
  md.split("\n").forEach((line, i) => {
    if (!line.startsWith("| `")) return;
    const cell = line.split("|")[1].trim();
    // The LAST /token wins: `/loop /develop-next` is the /loop built-in wrapping a skill, and the
    // skill is what the row is about.
    const names = [...cell.matchAll(/\/([a-z0-9-]+)/g)].map((m) => m[1]);
    out.push({
      line: i + 1,
      cell,
      skill: names.length ? names[names.length - 1] : null,
      flags: [...new Set(cell.match(/--[a-z][a-z-]*/g) ?? [])],
    });
  });
  return out;
}

export function extractActivationSkills(md) {
  const out = [];
  md.split("\n").forEach((line, i) => {
    if (!line.startsWith("|") || line.split("|").length < 4) return;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    const tokens = [...new Set((cells.at(-1).match(/`([^`]+)`/g) ?? []).map((t) => t.slice(1, -1)))];
    for (const t of tokens) {
      const [skill, ...flags] = t.split(/\s+/);
      // Must not START with "-": the cells backtick the skill and the flag SEPARATELY
      // (`review-bug` … `--validate`), and [a-z0-9-]+ happily matches "--validate".
      if (!/^[a-z0-9][a-z0-9-]*$/.test(skill)) continue; // a flag, a header row, or prose
      out.push({ line: i + 1, skill, flags: flags.filter((f) => f.startsWith("--")) });
    }
  });
  return out;
}
```

Two traps this shape avoids, both found while measuring:

- A naive "first `/token`" resolves `` `/loop /develop-next` `` to `loop`, which is a Claude Code
  built-in and has no `skills/loop/`. Last-token-wins is the fix, and it needs a fixture case.
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
  const cache = new Map();                       // memoised: 64 skills, 79 rows
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
    // 14 on 2026-09-22. A floor, not an equality: rows get added.
    assert.ok(checked >= 12, `only ${checked} flag assertions ran — the extractor is probably broken`);
  });

  test("the extractor still finds the corpus", () => {
    // 75 slash rows of 79 total on 2026-09-22.
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

1. Run it. Measured in advance against `993578a3`: **0** flag failures over 14 assertions, **0**
   unresolvable skills once the `/loop` wrapper is handled, **0** unexpected non-skill rows beyond
   the four `run-loop.mjs` ones. So a red first run means the extractor is wrong — fix the extractor,
   do not edit the corpus to make it green.
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

Move the gitignored `.claude/skills → ../skills` symlink aside before believing a local green — it
has masked CI failures in this repo before.

Re-measure the three counts before committing the floors:

```bash
command python3 - <<'PY'
import re, os
rows = [l for l in open("docs/reference/commands.md").read().split("\n") if l.startswith("| `")]
print("command rows:", len(rows))
print("flag mentions:", sum(len(set(re.findall(r"--[a-z][a-z-]*", l.split("|")[1]))) for l in rows))
PY
```
