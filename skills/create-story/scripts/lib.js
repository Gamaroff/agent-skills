"use strict";
/**
 * create-story deterministic helpers. Mirrors skills/create-task/scripts/lib.js.
 * Shared cross-skill helpers (parseFrontmatter, extractSourceCitations,
 * mergeSprintStatus, isKebab) live in create-skills-lib.js, a shared resource.
 */

const fs = require("fs");
const path = require("path");
const shared = require("../references/create-skills-lib.js");

const {
  parseFrontmatter,
  extractSourceCitations,
  isKebab,
  mergeSprintStatus: sharedMergeSprintStatus,
} = shared;

// ---------------------------------------------------------------------------
// Filename validation — `story.{P}.{E}.{S}{sub?}.{kebab-name}.md`
// The id is doc-id's (task 202): P, E and S are positive integers with no leading
// zeros, `3A` is a sub-story, and the slug begins with a letter. This file
// declares no id grammar of its own (task 206) — a local `story.{E}.{S}` pattern
// read P where it meant E once ids grew a segment.
// ---------------------------------------------------------------------------
const docId = require("../references/doc-id.js");

const STORY_SHAPE = "story.{P}.{E}.{S}.{kebab-name}.md";

function storyNameFailure(name, parsed) {
  if (/_/.test(name)) return "underscores not allowed — use dots/hyphens";
  if (parsed.reason === "bad-slug" && /[A-Z]/.test(name))
    return "uppercase not allowed — use kebab-case";
  if (parsed.reason === "bad-number")
    return (
      `does not match ${STORY_SHAPE} — P, E and S are positive integers with no ` +
      "leading zero; a legacy story.{E}.{S} name is migrated first (migrate-doc-numbering)"
    );
  return `does not match ${STORY_SHAPE}`;
}

function validateStoryFilename(name) {
  if (typeof name !== "string" || name.length === 0) {
    return { ok: false, reason: "filename is empty" };
  }
  const p = docId.parse(name);
  if (!name.endsWith(".md") || !p.ok || p.kind !== "story" || p.artifact) {
    if (p.ok && p.artifact)
      return {
        ok: false,
        reason: `a ${p.artifact} artifact, not a story document`,
      };
    return { ok: false, reason: storyNameFailure(name, p) };
  }
  return {
    ok: true,
    prd: p.prd,
    epic: p.epic,
    story: p.story,
    sub: p.sub,
    name: p.slug,
  };
}

function validateStoryPlanFilename(name) {
  const p = typeof name === "string" ? docId.parse(name) : { ok: false };
  if (
    typeof name !== "string" ||
    !name.endsWith(".md") ||
    !p.ok ||
    p.kind !== "story" ||
    p.artifact !== "plan"
  ) {
    return {
      ok: false,
      reason: "does not match story.{P}.{E}.{S}.plan.{kebab-name}.md",
    };
  }
  return {
    ok: true,
    prd: p.prd,
    epic: p.epic,
    story: p.story,
    sub: p.sub,
    name: p.slug,
  };
}

// ---------------------------------------------------------------------------
// Story ID uniqueness — given a directory listing (array of names) under an
// epic, the story numbers in use in THAT epic `(P, E)`. Entries can be flat
// files (`story.1.2.3.foo.md`) or directories (`story.1.2.3.foo`). Keyed on the
// pair: E restarts at 1 in every PRD, so E alone names an epic in each of them.
// ---------------------------------------------------------------------------
function assertPositive(label, v) {
  if (!Number.isInteger(v) || v < 1) {
    throw new TypeError(`${label} must be a positive integer, got ${v}`);
  }
}

function storiesOfEpic(entries, prdNum, epicNum) {
  if (!Array.isArray(entries)) throw new TypeError("entries must be string[]");
  assertPositive("prdNum", prdNum);
  assertPositive("epicNum", epicNum);
  return entries.filter((e) => docId.matchesEpic(e, prdNum, epicNum));
}

function scanExistingStoryIds(entries, prdNum, epicNum) {
  const ids = new Set();
  for (const e of storiesOfEpic(entries, prdNum, epicNum)) {
    const p = docId.parse(e);
    if (p.kind === "story") ids.add(p.story);
  }
  return ids;
}

/**
 * The next story number in epic `(P, E)` — doc-id's allocator, so this and
 * `doc-id next story --epic-dir` cannot disagree: highest + 1, a gap is never
 * refilled (task 206; it used to fill the lowest gap, a second rule).
 */
function nextStoryId(entries, prdNum, epicNum) {
  return docId.nextNumber("story", storiesOfEpic(entries, prdNum, epicNum));
}

function assertUniqueStoryId(prdNum, epicNum, storyNum, entries) {
  assertPositive("assertUniqueStoryId: prdNum", prdNum);
  assertPositive("assertUniqueStoryId: epicNum", epicNum);
  assertPositive("assertUniqueStoryId: storyNum", storyNum);
  const ids = scanExistingStoryIds(entries, prdNum, epicNum);
  if (ids.has(storyNum)) {
    throw new Error(
      `HALT: story.${prdNum}.${epicNum}.${storyNum} already exists`,
    );
  }
  return true;
}

// ---------------------------------------------------------------------------
// Required story sections — derived from story-template.yaml. We hard-code
// the section IDs the template ships with so the protocol checker can verify
// the prose protocol references them all.
// ---------------------------------------------------------------------------
const REQUIRED_STORY_SECTION_IDS = [
  "status",
  "story",
  "acceptance-criteria",
  "tasks-subtasks",
  "dev-notes",
];

function listTemplateSectionIds(templateYaml) {
  if (typeof templateYaml !== "string")
    throw new TypeError("templateYaml must be string");
  const ids = [];
  // Match either `- id: foo` (top-level sections) or nested. We only collect
  // top-level section IDs — those under the `sections:` root key at indent 2.
  const lines = templateYaml.split("\n");
  let inSections = false;
  for (const line of lines) {
    if (/^sections:\s*$/.test(line)) {
      inSections = true;
      continue;
    }
    if (!inSections) continue;
    if (/^\S/.test(line)) break; // hit a new top-level key
    const m = line.match(/^ {2}- id:\s*(\S+)\s*$/);
    if (m) ids.push(m[1]);
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Sprint-status merge — delegates to shared lib with listKey="stories".
// ---------------------------------------------------------------------------
function mergeSprintStatus(yaml, entry) {
  return sharedMergeSprintStatus(yaml, entry, { listKey: "stories" });
}

module.exports = {
  REQUIRED_STORY_SECTION_IDS,
  parseFrontmatter,
  extractSourceCitations,
  isKebab,
  validateStoryFilename,
  validateStoryPlanFilename,
  scanExistingStoryIds,
  nextStoryId,
  assertUniqueStoryId,
  listTemplateSectionIds,
  mergeSprintStatus,
};
