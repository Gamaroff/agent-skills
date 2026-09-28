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
const shared = require("../references/create-skills-lib.js");
// The card title bound is defined once, beside the card spec, and read from
// there (task.150). A copy of the number here would be a second definition.
const { CARD_TITLE_MAX } = require("../references/jira-sync.js");
// An entry's status is read by the engine's own reader, never re-derived here:
// `statusOf` trims and reads an empty status as `open`, and a second reading
// refused entries the log lists as open (task.150 QA cycle 1, TASK-150-BUG-2).
const { statusOf } = require("../references/observation-log.js");

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
const TASK_FILENAME_RE =
  /^task\.(?<id>[1-9][0-9]*)\.(?<name>[a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;

function validateTaskFilename(name) {
  if (typeof name !== "string" || name.length === 0) {
    return { ok: false, reason: "filename is empty" };
  }
  const m = name.match(TASK_FILENAME_RE);
  if (!m) {
    if (/_/.test(name))
      return {
        ok: false,
        reason: "underscores not allowed — use dots/hyphens",
      };
    if (/[A-Z]/.test(name))
      return { ok: false, reason: "uppercase not allowed — use kebab-case" };
    if (/^task\.0/.test(name))
      return { ok: false, reason: "leading zero in id not allowed" };
    return { ok: false, reason: `does not match task.{id}.{kebab-name}.md` };
  }
  return { ok: true, id: Number(m.groups.id), name: m.groups.name };
}

function validatePlanFilename(name) {
  // task.{N}.plan.{kebab-name}.md
  const re =
    /^task\.(?<id>[1-9][0-9]*)\.plan\.(?<name>[a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;
  if (typeof name !== "string" || !re.test(name)) {
    return {
      ok: false,
      reason: `does not match task.{id}.plan.{kebab-name}.md`,
    };
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
    throw new Error(
      `assertUniqueTaskId: id must be a positive integer, got ${id}`,
    );
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
  if (typeof template !== "string")
    throw new TypeError("template must be string");
  if (!answers || typeof answers !== "object")
    throw new TypeError("answers must be object");
  // `assignee` is deliberately NOT required. Jira needs an accountId, which an
  // author rarely has to hand, and the old required-then-substitute behaviour is
  // how `assignee: TBD` — and names like "platform-team" — reached the API and
  // came back as a bare HTTP 400. Left blank, the template's null value makes the
  // sync fall back to `jira.defaultAssignee` in skills-config.yaml, or leave
  // Jira's existing assignee alone if that is unset too.
  const required = [
    "task_title",
    "task_id",
    "created",
    "priority",
    "estimated_effort_hours",
  ];
  for (const k of required) {
    if (answers[k] === undefined || answers[k] === null || answers[k] === "") {
      throw new Error(`populateTaskTemplate: missing required answer "${k}"`);
    }
  }
  let out = template;
  // `[TASK_TITLE]` appears in the YAML frontmatter `title:` and the H1.
  out = out.split("[TASK_TITLE]").join(String(answers.task_title));
  // `id: task.[ID]` — `[ID]` is the only bracketed token (also used in the footer cross-refs).
  out = out.split("[ID]").join(String(answers.task_id));
  // `created`/`updated` are bare `YYYY-MM-DD` placeholders in the frontmatter; stamp both at creation.
  out = out.replace(/^created: YYYY-MM-DD/m, `created: ${answers.created}`);
  out = out.replace(/^updated: YYYY-MM-DD/m, `updated: ${answers.created}`);
  // priority / assignee / estimated_effort_hours are frontmatter keys (default values + trailing comments).
  out = out.replace(/^priority: [^\n]+/m, `priority: ${answers.priority}`);
  // Only overwrite when an assignee was actually supplied — otherwise keep the
  // template's documented, null-valued line.
  if (answers.assignee) {
    out = out.replace(/^assignee: [^\n]+/m, `assignee: ${answers.assignee}`);
  }
  out = out.replace(
    /^estimated_effort_hours: [^\n]+/m,
    `estimated_effort_hours: ${answers.estimated_effort_hours}`,
  );
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
// ---------------------------------------------------------------------------
// --from-observation seed (task.150, obs #147)
//
// A task cut from observation-log entries used to be improvised through every
// mandatory prompt, and the entries were then parked by hand — 9 of them, by
// whichever session remembered. These two pure functions turn the entries into
// the answers create-task would otherwise have asked for, and into the exact
// `observation-log.js set-status` vectors that park them. The skill runs the
// vectors itself, after both files exist (§ 5 step 2b).
//
// The engine has no body reader — `renderObservation` treats the body as
// opaque — so the parser lives here, with its only consumer. If a second
// consumer appears, it belongs in the engine.
// ---------------------------------------------------------------------------

const OBS_SECTIONS = {
  Issue: "issue",
  Improvement: "improvement",
  Principle: "principle",
};

/**
 * Split an observation body into its three canonical sections. A missing
 * section is "", never undefined, so a caller can read any field unconditionally.
 */
function parseObservationBody(text) {
  const out = { issue: "", improvement: "", principle: "" };
  let current = null;
  const buf = { issue: [], improvement: [], principle: [] };
  for (const line of String(text || "").split(/\r?\n/)) {
    const h = /^## (Issue|Improvement|Principle)\s*$/.exec(line);
    if (h) {
      current = OBS_SECTIONS[h[1]];
      continue;
    }
    if (/^## /.test(line)) {
      current = null;
      continue;
    }
    if (current) buf[current].push(line);
  }
  for (const k of Object.keys(out)) out[k] = buf[k].join("\n").trim();
  return out;
}

function asArray(v) {
  if (v == null || v === "") return [];
  return (Array.isArray(v) ? v : [v]).map(String).filter(Boolean);
}

// An observation's IDENTITY is the one `set-status --id N` resolves, and the
// engine resolves it by FILENAME: `findById` matches the numeric prefix of
// `NNNN-slug.md`, never the frontmatter. So the park vector is built from the
// scan entry's `file`, and the frontmatter id is only checked against it.
//
// Keying on the frontmatter id was wrong twice. `Number()` coerced "0x10" to 16
// (task.150 QA cycle 1, TASK-150-BUG-1); the stricter string check that fixed it
// never saw the raw text on the real path, because `scan` has already run
// `parseInt` on it — `id: 1e2` in `0005-x.md` arrived as 1 and parked 0001-*
// (QA cycle 2, TASK-150-BUG-3).
function fileId(file) {
  const m = /^(\d+)-/.exec(
    String(file || "")
      .split("/")
      .pop(),
  );
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isSafeInteger(n) && n >= 1 ? n : null;
}

// The frontmatter id, read strictly: a safe positive integer number, or a
// string of base-10 digits with no leading zero. Anything else is not an id.
function frontmatterId(raw) {
  if (typeof raw === "number") {
    return Number.isSafeInteger(raw) && raw >= 1 ? raw : null;
  }
  if (typeof raw === "string" && /^[1-9][0-9]*$/.test(raw)) {
    const n = Number(raw);
    return Number.isSafeInteger(n) ? n : null;
  }
  return null;
}

function firstSentence(text) {
  const flat = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  const m = /^(.+?[.!?])(?=\s|$)/.exec(flat);
  return m ? m[1] : flat;
}

/**
 * Seed a task document from observation-log entries.
 *
 * @param {{frontmatter: object, body: string}[]} entries  any order. `frontmatter`
 *   is the `scan --json` entry, which carries `file`: the id is the file's numeric
 *   prefix, because that is what `set-status --id` resolves.
 * @param {{taskId: number|string}} opts
 * @returns {{
 *   ids: number[], title: string|null, titleReason: string|null,
 *   description: string, tags: string[], references: string[],
 *   changeLogDescription: string, park: string[][]
 * }}
 *
 * Throws on an entry that is not `open`: a parked or actioned entry already has
 * a home, and cutting a second task from it is the duplicate this entry exists
 * to prevent. Throws, too, on an entry whose identity is not certain: no `file`,
 * a file with no safe numeric prefix, a frontmatter id that disagrees with it,
 * or two entries naming the same id. Each would park a different entry, or the
 * same one twice.
 */
function seedFromObservations(entries, { taskId } = {}) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error(
      "seedFromObservations: at least one observation entry is required",
    );
  }
  if (taskId == null || taskId === "") {
    throw new Error(
      "seedFromObservations: taskId is required (it names the park condition)",
    );
  }
  const rows = entries.map(({ frontmatter = {}, body = "" }) => {
    const id = fileId(frontmatter.file);
    const status = statusOf(frontmatter);
    if (id === null) {
      throw new Error(
        `observation entry has no usable file id: ${JSON.stringify(frontmatter.file)} — pass the scan entry, whose \`file\` is what set-status resolves`,
      );
    }
    if (frontmatterId(frontmatter.id) !== id) {
      throw new Error(
        `observation ${frontmatter.file} has frontmatter id ${JSON.stringify(frontmatter.id)}, which does not match its file id ${id} — fix the entry before cutting a task from it`,
      );
    }
    if (status !== "open") {
      throw new Error(
        `observation #${id} is ${status} — it already has a home`,
      );
    }
    return {
      id,
      title: String(frontmatter.title || ""),
      skills: asArray(frontmatter.skill),
      sections: parseObservationBody(body),
    };
  });
  rows.sort((a, b) => a.id - b.id);
  const ids = rows.map((r) => r.id);
  // findById parks the FIRST file with a given prefix, so a repeated id would
  // park one entry twice and leave the other open.
  const dup = ids.find((id, i) => ids.indexOf(id) !== i);
  if (dup !== undefined) {
    throw new Error(
      `observation #${dup} is named by more than one entry — refusing to park it twice`,
    );
  }

  const tags = [];
  for (const r of rows)
    for (const sk of r.skills) if (!tags.includes(sk)) tags.push(sk);
  tags.push("observation");

  // The title is a NAME (obs #128). One entry gives a candidate: its title with
  // a leading "<skill>: " prefix removed. Observation titles run long (median
  // 127 on 2026-09-24), so a candidate over the bound is refused rather than
  // truncated, and several entries never name the task by themselves. Either
  // way the one remaining question is the title.
  let title = null;
  let titleReason = null;
  if (rows.length > 1) {
    titleReason = "multiple-entries";
  } else {
    let bare = rows[0].title;
    for (const sk of rows[0].skills) {
      if (bare.startsWith(`${sk}: `)) {
        bare = bare.slice(sk.length + 2);
        break;
      }
    }
    const candidate = `[Task ${taskId}] ${bare}`;
    if (candidate.length <= CARD_TITLE_MAX) title = candidate;
    else titleReason = "over-bound";
  }

  const description = rows
    .map((r) => firstSentence(r.sections.improvement))
    .filter(Boolean)
    .join(" ");
  const references = rows.map((r) => `Observation #${r.id} — ${r.title}`);
  const list = ids.map((i) => `#${i}`).join(", ");
  const changeLogDescription = `Initial draft — cut from observation${ids.length > 1 ? "s" : ""} ${list}`;
  const park = ids.map((id) => [
    "set-status",
    "--id",
    String(id),
    "--status",
    "parked",
    "--parked-until",
    `task.${taskId} merged to develop`,
    "--json",
  ]);

  return {
    ids,
    title,
    titleReason,
    description,
    tags,
    references,
    changeLogDescription,
    park,
  };
}

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
  parseObservationBody,
  seedFromObservations,
};
