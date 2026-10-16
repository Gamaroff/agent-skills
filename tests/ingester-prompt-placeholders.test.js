"use strict";
/**
 * The QA findings ingester prompt's placeholder contract (task.207 QA cycle 3, BUG-6).
 *
 * `shared/resources/qa-findings-ingester-prompt.md` discovers a work item's gate, QA
 * report and bug reports with globs such as `story.<P>.<E>.<S>.gate.*.yml`. Two lists say
 * which placeholders a caller substitutes: the prompt's own "Usage in /qa-fix Step 1a"
 * section, and `/qa-fix` Step 1a itself. A sweep renamed the globs and left both lists
 * naming `<epic>`/`<story>`, so every story-mode glob stayed literal and matched nothing —
 * an ingester that could not look reported the same empty findings as one that found
 * nothing. This test holds the three in step: every placeholder the discovery section
 * uses must appear in both binding lists.
 *
 * (a) KEY: `<Name>` tokens in the "## Artifact Discovery" section only — the output
 *     schema's `bug.<N>` is notation, not a substitution.
 * (b) MISSES: a placeholder spelled another way (`{P}`) — the discovery section uses
 *     `<…>` throughout; the non-vacuity floor below fails if it stops doing so.
 *
 * Run: node --test tests/ingester-prompt-placeholders.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PROMPT = fs.readFileSync(
  path.join(ROOT, "shared/resources/qa-findings-ingester-prompt.md"),
  "utf8",
);
const QA_FIX = fs.readFileSync(
  path.join(ROOT, "skills/qa-fix/SKILL.md"),
  "utf8",
);

function section(text, heading) {
  const start = text.indexOf(heading);
  assert.ok(start !== -1, `heading not found: ${heading}`);
  const next = text.indexOf("\n## ", start + heading.length);
  return text.slice(start, next === -1 ? undefined : next);
}

const placeholders = (text) =>
  new Set([...text.matchAll(/<([A-Za-z_]+)>/g)].map((m) => m[1]));

/** The `<X>` names on the substitution-list lines (`- \`<X>\`…: …`) of a block of text. */
function bindingList(text) {
  const names = new Set();
  for (const line of text.split("\n")) {
    if (!/^\s*- `<[A-Za-z_]+>`/.test(line)) continue;
    const head = line.split(":")[0];
    for (const m of head.matchAll(/`<([A-Za-z_]+)>`/g)) names.add(m[1]);
  }
  return names;
}

const USED = placeholders(section(PROMPT, "## Artifact Discovery"));
const PROMPT_BINDS = bindingList(
  section(PROMPT, "## Usage in `/qa-fix` Step 1a"),
);
const QA_FIX_BINDS = bindingList(section(QA_FIX, "#### Step 1a"));

test("the discovery section uses a plausible set of placeholders", () => {
  for (const name of ["dir", "P", "E", "S", "id"])
    assert.ok(
      USED.has(name),
      `discovery no longer uses <${name}> — re-derive this test's key`,
    );
});

test("every discovery placeholder is in the prompt's own binding list", () => {
  const missing = [...USED].filter((n) => !PROMPT_BINDS.has(n));
  assert.deepEqual(
    missing,
    [],
    `unbound in the prompt's Usage list: ${missing.map((n) => `<${n}>`).join(", ")}`,
  );
});

test("every discovery placeholder is in /qa-fix Step 1a's binding list", () => {
  const missing = [...USED].filter((n) => !QA_FIX_BINDS.has(n));
  assert.deepEqual(
    missing,
    [],
    `unbound in qa-fix Step 1a: ${missing.map((n) => `<${n}>`).join(", ")}`,
  );
});
