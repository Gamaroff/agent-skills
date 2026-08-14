"use strict";
/**
 * `--json` sample fidelity — a documented output shape must match the one shipped.
 *
 * Motivation: the `*_bitbucket_url` deletion. When the sync scripts stopped WRITING
 * those keys into documents, the frontmatter samples in SKILL.md were correctly
 * updated to drop them — and the `--json` output samples were wrongly updated the
 * same way. The scripts still emit them there, because the `--json` payload reports
 * the URL used for the **Jira** link, which is a different thing from what lands in
 * the file. Two identical-looking key names, two different lifetimes, one edit that
 * treated them as one thing.
 *
 * Nothing caught it. Every test asserted on behaviour; none compared the documented
 * payload against the emitted one, so all three skills shipped a sample that
 * under-documented their own output. A consumer scripting against `--json` would
 * have found the extra keys only by printing them.
 *
 * Scope is deliberately narrow — a guard that cries wolf gets disabled. It checks:
 *   - the three `sync-jira-*` skills, which are the only ones with a `--json` sample
 *     in their SKILL.md;
 *   - the create/update emit block ONLY, selected by its `change_summary` key, so the
 *     unrelated `action: "check-card"` emit is not matched;
 *   - top-level key NAMES only, never values. Sample values are illustrative and
 *     rightly differ from anything a run produces.
 *
 * Deterministic and offline — no Jira, no git. Runs every push via `npm test`.
 * Run: node --test tests/json-output-fidelity.test.js
 */

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const REPO_ROOT = path.resolve(__dirname, "..");
const KINDS = ["task", "story", "epic"];

/**
 * The keys of the `--json` payload the script emits on a create/update run.
 *
 * Located by `action: isUpdate ? "update" : "create"`, the main path's signature in
 * all three scripts. Two weaker selectors were tried first and both picked the
 * wrong block:
 *
 *   - `output.emit({` alone matches `{ version: VERSION }` and the `check-card`
 *     payload, whichever appears first;
 *   - the first `change_summary` matches `sync-jira-epic`'s no-change fast path
 *     (`action: "skip"`), which legitimately omits the `*_bitbucket_url` keys. That
 *     is what this guard reported on its very first run — against correct docs.
 *
 * A guard that compares the wrong block is worse than none: it fails on healthy
 * documentation and gets deleted.
 */
function emittedKeys(scriptPath, offset = null) {
  const src = fs.readFileSync(scriptPath, "utf8");
  let open = offset;
  if (open === null) {
    const marker = src.indexOf('isUpdate ? "update" : "create"');
    assert.ok(
      marker !== -1,
      `${path.relative(REPO_ROOT, scriptPath)}: no main create/update --json payload found`,
    );
    open = src.lastIndexOf("output.emit({", marker);
    assert.ok(
      open !== -1,
      `${scriptPath}: the main action is not inside an output.emit({...})`,
    );
  }

  // Walk braces from the emit's `{` so a nested object cannot end the block early.
  const start = src.indexOf("{", open + "output.emit(".length);
  let depth = 0;
  let end = -1;
  for (let i = start; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  assert.ok(
    end !== -1,
    `${scriptPath}: unbalanced braces in the --json payload`,
  );

  const body = src.slice(start + 1, end);
  // Top level only: skip anything nested one brace deeper.
  const keys = [];
  let nested = 0;
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (nested === 0) {
      const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*:/.exec(trimmed);
      if (m) keys.push(m[1]);
    }
    nested +=
      (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
  }
  return keys;
}

/** Top-level keys of the first fenced ```json block in a SKILL.md. */
function documentedKeys(skillMdPath) {
  const src = fs.readFileSync(skillMdPath, "utf8");
  const fence = src.indexOf("```json");
  assert.ok(
    fence !== -1,
    `${path.relative(REPO_ROOT, skillMdPath)}: no fenced json sample — this skill documents --json and must show its payload`,
  );
  const bodyStart = src.indexOf("\n", fence) + 1;
  const bodyEnd = src.indexOf("\n```", bodyStart);
  const sample = src.slice(bodyStart, bodyEnd);
  const parsed = JSON.parse(sample); // a malformed sample is itself a defect
  return Object.keys(parsed);
}

for (const kind of KINDS) {
  test(`sync-jira-${kind}: the --json sample documents exactly the payload emitted`, () => {
    const script = path.join(
      REPO_ROOT,
      "skills",
      `sync-jira-${kind}`,
      "scripts",
      `sync-jira-${kind}.js`,
    );
    const skillMd = path.join(
      REPO_ROOT,
      "skills",
      `sync-jira-${kind}`,
      "SKILL.md",
    );

    const emitted = new Set(emittedKeys(script));
    const documented = new Set(documentedKeys(skillMd));

    const undocumented = [...emitted].filter((k) => !documented.has(k));
    const stale = [...documented].filter((k) => !emitted.has(k));

    assert.deepEqual(
      { undocumented, stale },
      { undocumented: [], stale: [] },
      `sync-jira-${kind} --json sample is out of step with the script.\n` +
        (undocumented.length
          ? `  EMITTED but not documented: ${undocumented.join(", ")}\n`
          : "") +
        (stale.length
          ? `  DOCUMENTED but not emitted: ${stale.join(", ")}\n`
          : "") +
        `  Sample: skills/sync-jira-${kind}/SKILL.md · Script: skills/sync-jira-${kind}/scripts/sync-jira-${kind}.js`,
    );
  });
}

for (const kind of KINDS) {
  test(`sync-jira-${kind}: every other --json payload stays a documented subset`, () => {
    // The main sample is not the only payload a run can produce. `sync-jira-epic`
    // also emits `action: "skip"` on its no-change fast path, with fewer keys —
    // legitimate, since there is no new URL to report. What would NOT be
    // legitimate is a secondary path inventing a key the sample never shows, so a
    // consumer parsing --json meets a field no document mentions.
    //
    // Subset, not equality: requiring every path to emit every key would force
    // the skip path to pad itself with nulls to satisfy a test.
    const scriptPath = path.join(
      REPO_ROOT,
      "skills",
      `sync-jira-${kind}`,
      "scripts",
      `sync-jira-${kind}.js`,
    );
    const src = fs.readFileSync(scriptPath, "utf8");
    const documented = new Set(
      documentedKeys(
        path.join(REPO_ROOT, "skills", `sync-jira-${kind}`, "SKILL.md"),
      ),
    );

    const offsets = [];
    let at = src.indexOf("output.emit({");
    while (at !== -1) {
      offsets.push(at);
      at = src.indexOf("output.emit({", at + 1);
    }

    for (const offset of offsets) {
      const keys = emittedKeys(scriptPath, offset);
      // Only the document-sync payloads are in scope; `{ version }` and
      // `check-card` answer different questions and have their own shapes.
      if (!keys.includes("change_summary")) continue;
      const undocumented = keys.filter((k) => !documented.has(k));
      assert.deepEqual(
        undocumented,
        [],
        `sync-jira-${kind}: a --json payload emits key(s) the SKILL.md sample never shows: ${undocumented.join(", ")}`,
      );
    }
  });
}

test("the guard reads a real payload, not an empty one", () => {
  // A parser that silently returns [] would make every assertion above vacuous —
  // the failure mode of a guard written against code it cannot actually parse.
  for (const kind of KINDS) {
    const keys = emittedKeys(
      path.join(
        REPO_ROOT,
        "skills",
        `sync-jira-${kind}`,
        "scripts",
        `sync-jira-${kind}.js`,
      ),
    );
    assert.ok(
      keys.length >= 5,
      `sync-jira-${kind}: parsed only ${keys.length} key(s) from the --json payload — the extractor is broken, not the docs`,
    );
    assert.ok(
      keys.includes("action"),
      `sync-jira-${kind}: expected an 'action' key`,
    );
  }
});
