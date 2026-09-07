"use strict";

/**
 * Contract tests over the `sync-jira-*` family.
 *
 * Four scripts implement one methodology, and task.96 exists because three of
 * them shared a defect the fourth had already fixed. The end-to-end suites
 * prove each script converges; nothing proved the four still AGREE. These do,
 * by reading the sources — so a fifth sibling inherits the check by existing
 * rather than by someone remembering.
 *
 * A source-reading test is a blunt instrument and is used deliberately here:
 * the property is "no script reintroduces this shape", which is a statement
 * about the code as written, not about its behaviour on one input. Where a
 * behavioural assertion is possible it lives in the e2e suites instead.
 *
 * Run: node --test tests/sync-jira-family-contract.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const MEMBERS = ["story", "task", "epic", "bug"];

const sourceOf = (m) =>
  fs.readFileSync(
    path.join(ROOT, "skills", `sync-jira-${m}`, "scripts", `sync-jira-${m}.js`),
    "utf-8",
  );

test("every member exists and is readable", () => {
  for (const m of MEMBERS) {
    assert.ok(sourceOf(m).length > 0, `sync-jira-${m} is empty or missing`);
  }
});

test("no member builds its diff label set from frontmatter", () => {
  // THE DEFECT, asserted over the family. Each script used to feed the diff
  // `lib.sanitiseLabels(args.labels || frontmatter.labels)` while the payload
  // appended the `synced-from-*` label, so the two could never converge.
  const offenders = [];
  for (const m of MEMBERS) {
    const src = sourceOf(m);
    // Look only at what is passed to the diff, not at the payload builder —
    // `collectIssueFields` legitimately calls `sanitiseLabels`.
    const diffCall = /diffFields\(\{[\s\S]{0,600}?\}\)/g;
    for (const [block] of [...src.matchAll(diffCall)].map((x) => [x[0]])) {
      if (/labels:\s*lib\.sanitiseLabels\(/.test(block)) offenders.push(m);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `these scripts rebuild the diff's label set from frontmatter instead of ` +
      `diffing the payload: ${offenders.join(", ")}. Use lib.diffAgainstPayload.`,
  );
});

test("every member routes its field diff through diffAgainstPayload", () => {
  const missing = MEMBERS.filter(
    (m) => !/diffAgainstPayload\(/.test(sourceOf(m)),
  );
  assert.deepEqual(
    missing,
    [],
    `these scripts do not use the shared helper: ${missing.join(", ")}. ` +
      `Diffing by hand is how the four drifted apart in the first place.`,
  );
});

test("every member re-reads `updated` after a successful transition", () => {
  // The second defect. A transition is a write; persisting the pre-transition
  // timestamp makes the next run abort on the tool's own change.
  const missing = MEMBERS.filter(
    (m) =>
      !/statusOutcome\?\.transitioned\s*&&[\s\S]{0,120}?fetchUpdatedTimestampStrict/.test(
        sourceOf(m),
      ),
  );
  assert.deepEqual(
    missing,
    [],
    `these scripts transition without refreshing the stored timestamp: ` +
      `${missing.join(", ")}. The next sync will abort on their own write.`,
  );
});

test("the post-transition re-read is best-effort in every member", () => {
  // It must warn and keep the earlier value, never throw — a failed refresh is
  // no worse than not refreshing.
  for (const m of MEMBERS) {
    const src = sourceOf(m);
    const block =
      /statusOutcome\?\.transitioned[\s\S]{0,900}?fetchUpdatedTimestampStrict[\s\S]{0,600}?\n  \}/.exec(
        src,
      );
    assert.ok(
      block,
      `no post-transition re-read block found in sync-jira-${m}`,
    );
    assert.match(
      block[0],
      /try\s*\{/,
      `sync-jira-${m}'s post-transition re-read is not wrapped in try/catch — ` +
        `a failed refresh would abort a sync that had already succeeded`,
    );
    assert.match(
      block[0],
      /output\.warn\(/,
      `sync-jira-${m}'s post-transition re-read fails silently — it must warn`,
    );
  }
});

test("the re-read is guarded on `!deferred` in every member", () => {
  // Redundant today (a deferred transition reports `transitioned: false`) and
  // kept deliberately: it is the family's stated contract, and a restricted run
  // must make no network call even if that upstream guarantee ever changes.
  const missing = MEMBERS.filter(
    (m) =>
      !/statusOutcome\?\.transitioned\s*&&\s*result\?\.issueKey\s*&&\s*!deferred/.test(
        sourceOf(m),
      ),
  );
  assert.deepEqual(
    missing,
    [],
    `these scripts do not guard the re-read on !deferred: ${missing.join(", ")}`,
  );
});

test("every member with a skip gate hashes the fields its payload sends", () => {
  // The regression /review-pr caught: a skip gate compares only what the diff
  // compares, so any payload field outside `diffFields` must be in `hashMeta`
  // or it is silently swallowed. Only story and epic have a gate.
  for (const m of ["story", "epic"]) {
    const src = sourceOf(m);
    assert.match(
      src,
      /changedFields\.length === 0/,
      `sync-jira-${m} was expected to have a skip gate`,
    );
    const meta = /function hashMeta\(frontmatter\)[\s\S]*?\n\}/.exec(src);
    assert.ok(meta, `no hashMeta found in sync-jira-${m}`);
    // Strip comments before matching, and match the object KEY rather than the
    // bare word. Without both, this assertion is satisfied by the explanatory
    // comment inside hashMeta that happens to name the fields — verified by
    // mutation: deleting the `assignee:` line left the test green.
    const metaCode = meta[0]
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    for (const field of [
      "assignee",
      "due_date",
      "components",
      "fix_versions",
    ]) {
      assert.match(
        metaCode,
        new RegExp(`(^|[\\s{,])${field}\\s*:`, "m"),
        `sync-jira-${m}'s hashMeta omits \`${field}\`, which its payload sends ` +
          `and diffFields does not compare — an edit to it would be dropped ` +
          `silently by the skip gate`,
      );
    }
  }
});

test("scripts without a skip gate are exempt, and stay exempt knowingly", () => {
  // task and bug PUT unconditionally, so the swallowing defect cannot occur.
  // If either ever gains a gate, the assertion above must be widened to it —
  // this test is what makes that a deliberate decision rather than an omission.
  for (const m of ["task", "bug"]) {
    assert.doesNotMatch(
      sourceOf(m),
      /changedFields\.length === 0/,
      `sync-jira-${m} has gained a skip-when-no-diff gate. Add it to the ` +
        `hashMeta coverage test above, or its payload-only fields will be ` +
        `silently dropped exactly as story's and epic's were.`,
    );
  }
});
