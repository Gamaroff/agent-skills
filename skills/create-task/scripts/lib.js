"use strict";
/**
 * create-task deterministic helpers. Extracted from the skill protocol so
 * regressions in naming, frontmatter, ID-uniqueness, source citations,
 * template population, and sprint-status merge can be unit-tested without
 * invoking the LLM.
 *
 * Pure functions: no filesystem reads except scanExistingTaskIds (which takes
 * a directory listing as input). Tests inject fixtures.
 */

const fs = require("fs");
const path = require("path");
const shared = require("../../../shared/resources/create-skills-lib.js");

const {
  parseFrontmatter,
  extractSourceCitations,
  mergeSprintStatus: sharedMergeSprintStatus,
} = shared;

// ---------------------------------------------------------------------------
// Filename validation — `task.{N}.{kebab-name}.md`
//
// Rules (from SKILL.md "File Naming Convention"):
//   - dots are structural separators
//   - hyphens within descriptive names
//   - lowercase kebab-case
//   - sequential ID with no leading zeros
// ---------------------------------------------------------------------------
const TASK_FILENAME_RE = /^task\.(?<id>[1-9][0-9]*)\.(?<name>[a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;

function validateTaskFilename(name) {
  if (typeof name !== "string" || name.length === 0) {
    return { ok: false, reason: "filename is empty" };
  }
  const m = name.match(TASK_FILENAME_RE);
  if (!m) {
    if (/_/.test(name)) return { ok: false, reason: "underscores not allowed — use dots/hyphens" };
    if (/[A-Z]/.test(name)) return { ok: false, reason: "uppercase not allowed — use kebab-case" };
    if (/^task\.0/.test(name)) return { ok: false, reason: "leading zero in id not allowed" };
    return { ok: false, reason: `does not match task.{id}.{kebab-name}.md` };
  }
  return { ok: true, id: Number(m.groups.id), name: m.groups.name };
}

function validatePlanFilename(name) {
  // task.{N}.plan.{kebab-name}.md
  const re = /^task\.(?<id>[1-9][0-9]*)\.plan\.(?<name>[a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;
  if (typeof name !== "string" || !re.test(name)) {
    return { ok: false, reason: `does not match task.{id}.plan.{kebab-name}.md` };
  }
  const m = name.match(re);
  return { ok: true, id: Number(m.groups.id), name: m.groups.name };
}

// ---------------------------------------------------------------------------
// ID uniqueness — given a directory listing (array of names), return the set
// of in-use task IDs and the next free ID.
// ---------------------------------------------------------------------------
function scanExistingTaskIds(entries) {
  if (!Array.isArray(entries)) throw new TypeError("entries must be string[]");
  const ids = new Set();
  for (const e of entries) {
    // Accept either flat `task.N.name.md` or directory name `task.N.name`.
    const m = e.match(/^task\.([1-9][0-9]*)\b/);
    if (m) ids.add(Number(m[1]));
  }
  return ids;
}

function nextTaskId(entries) {
  const ids = scanExistingTaskIds(entries);
  let n = 1;
  while (ids.has(n)) n++;
  return n;
}

function assertUniqueTaskId(id, entries) {
  if (!Number.isInteger(id) || id < 1) {
    throw new Error(`assertUniqueTaskId: id must be a positive integer, got ${id}`);
  }
  const ids = scanExistingTaskIds(entries);
  if (ids.has(id)) {
    throw new Error(`HALT: task.${id} already exists`);
  }
  return true;
}

// ---------------------------------------------------------------------------
// Template population — substitutes `[PLACEHOLDER]`-style tokens in the
// task-template.md. Keeps placeholders the template doesn't bind so the
// generator can flag missing data instead of silently shipping `[TASK_TITLE]`.
// ---------------------------------------------------------------------------
const MANDATORY_SECTION_HEADINGS = [
  "## 1. Overview",
  "## 2. Motivation",
  "## 3. Technical Background",
  "## 4. Scope",
  "## 5. Breaking Changes",
  "## 6. Implementation Plan",
  "## 7. Files Summary",
  "## 8. Testing Strategy",
  "## 9. Success Criteria",
  "## 10. Risk Assessment",
  "## 11. Rollback Plan",
];

function countMandatorySections(markdown) {
  if (typeof markdown !== "string") return 0;
  let count = 0;
  for (const h of MANDATORY_SECTION_HEADINGS) {
    if (markdown.includes(h)) count++;
  }
  return count;
}

function populateTaskTemplate(template, answers) {
  if (typeof template !== "string") throw new TypeError("template must be string");
  if (!answers || typeof answers !== "object") throw new TypeError("answers must be object");
  const required = ["task_title", "task_id", "created", "priority", "assignee", "estimated_effort"];
  for (const k of required) {
    if (answers[k] === undefined || answers[k] === null || answers[k] === "") {
      throw new Error(`populateTaskTemplate: missing required answer "${k}"`);
    }
  }
  let out = template;
  // Bracketed placeholders.
  out = out.split("[TASK_TITLE]").join(String(answers.task_title));
  // `YYYY-MM-DD` is a bare placeholder (no brackets) in the template's Created line.
  out = out.replace(/\*\*Created\*\*: YYYY-MM-DD/, `**Created**: ${answers.created}`);
  // `TASK-[ID]` is a literal token in the template — `[ID]` is the only bracketed part.
  out = out.split("[ID]").join(String(answers.task_id));
  // Priority/Assignee/Estimated Effort are written as labeled bullets near the top.
  out = out.replace(/\*\*Priority\*\*: [^\n]+/, `**Priority**: ${answers.priority}`);
  out = out.replace(/\*\*Assignee\*\*: \[[^\]]+\]/, `**Assignee**: ${answers.assignee}`);
  out = out.replace(/\*\*Estimated Effort\*\*: \[[^\]]+\]/, `**Estimated Effort**: ${answers.estimated_effort}`);
  return out;
}

// ---------------------------------------------------------------------------
// Sprint-status merge — delegates to shared lib with listKey="tasks".
// ---------------------------------------------------------------------------
function mergeSprintStatus(yaml, entry) {
  return sharedMergeSprintStatus(yaml, entry, { listKey: "tasks" });
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  TASK_FILENAME_RE,
  MANDATORY_SECTION_HEADINGS,
  parseFrontmatter,
  validateTaskFilename,
  validatePlanFilename,
  scanExistingTaskIds,
  nextTaskId,
  assertUniqueTaskId,
  extractSourceCitations,
  countMandatorySections,
  populateTaskTemplate,
  mergeSprintStatus,
};
