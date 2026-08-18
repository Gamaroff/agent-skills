#!/usr/bin/env node
/**
 * Jira Epic Creator
 * Creates epics in Jira from command line arguments or markdown files.
 */

const fs = require("fs");
const path = require("path");

// The deferred-mutation writer — shared/resources/defer-mutation.js, bundled
// into this skill's references/ by `npm run bundle`.
//
// This file calls global `fetch` directly and does NOT go through
// jira-sync.js's makeHttp, so LAYER 1'S FAIL-CLOSED GUARANTEE DOES NOT REACH
// IT. The gate below is a hand-rolled local copy, and that exception is stated
// in the task document rather than left implicit — this script has drifted from
// the shared library before. Routing it through jira-sync.js is worth doing and
// is not this change.
let dm = null;
try {
  dm = require("../references/defer-mutation.js");
} catch (_) {
  try {
    dm = require("../references/defer-mutation.js");
  } catch (_2) {
    dm = null;
  }
}

/** The access mode in force, resolved the same way every other gate does. */
function accessTracker() {
  const raw = String(process.env.ACCESS_TRACKER || "").trim();
  return raw || "full";
}

async function parseFrontmatter(content) {
  if (content.startsWith("---")) {
    const parts = content.split("---");
    if (parts.length >= 3) {
      const frontmatterText = parts[1].trim();
      const body = parts.slice(2).join("---").trim();

      const frontmatter = {};
      for (const line of frontmatterText.split("\n")) {
        if (line.includes(":")) {
          const colonIndex = line.indexOf(":");
          const key = line.slice(0, colonIndex).trim();
          let value = line.slice(colonIndex + 1).trim();

          // Handle empty arrays []
          if (value === "[]") {
            value = [];
          }
          // Handle arrays like ["a", "b"] or ['a', 'b']
          else if (value.startsWith("[") && value.endsWith("]")) {
            const inner = value.slice(1, -1).trim();
            if (inner === "") {
              value = [];
            } else {
              value = inner
                .split(",")
                .map((v) => v.trim().replace(/^["']|["']$/g, ""));
            }
          } else if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1);
          }

          frontmatter[key] = value;
        }
      }

      return { frontmatter, body };
    }
  }
  return { frontmatter: {}, body: content };
}

// The card is a POINTER to the epic file, not a copy of it — the same contract
// the sync-jira-* scripts enforce, spelled out in `tracker-card-summary.md`
// under the repo's shared resources. This script is standalone by design (see
// the note on the Stories Breakdown pattern below for why it does not require
// the shared Jira library), so the cap is reimplemented here in miniature. Keep
// the numbers in step with the shared `CARD_MAX_SENTENCES`.
const CARD_MAX_SENTENCES = 4;

function summariseForCard(text) {
  const firstPara = text
    .trim()
    .split(/\n\s*\n/)[0]
    .replace(/\n+/g, " ")
    .trim();
  const sentences = firstPara.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) || [
    firstPara,
  ];
  const kept = sentences.slice(0, CARD_MAX_SENTENCES).join(" ").trim();
  const omitted = sentences.length - CARD_MAX_SENTENCES;
  // Never trim silently: a reader not told they are seeing part of something
  // believes they saw all of it.
  return omitted > 0
    ? `${kept}\n\n(+${omitted} more in the epic document)`
    : kept;
}

// Track fenced code blocks by CommonMark's rules, so a `#` inside one is never
// read as markdown structure.
//
// Three rules matter, and each one is a bug that has actually happened:
//   - a backtick fence's info string may NOT contain a backtick, which is what
//     makes ```` ``` ```` an inline code span rather than an opening fence.
//     Toggling on any backtick run inverts the parity for the rest of the
//     document, and every later heading disappears;
//   - a closing fence needs the same character with a run at least as long as
//     the opening one, so ``` inside a ```` block is content;
//   - a closing fence carries no info string.
//
// Indentation is capped at 3 spaces per CommonMark; deeper is an indented code
// block, which cannot be confused with a heading anyway.
function makeFenceTracker() {
  let open = null; // { char, len }
  return function isFenceLine(line) {
    const m = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (!m) return open !== null;
    const char = m[1][0];
    const len = m[1].length;
    const info = m[2];

    if (open === null) {
      if (char === "`" && info.includes("`")) return false; // inline code span
      open = { char, len };
      return true;
    }
    if (char === open.char && len >= open.len && info.trim() === "") {
      open = null;
      return true;
    }
    return true; // a fence-looking line inside a block is just content
  };
}

// The Stories Breakdown OVERVIEW table, or null when the section is absent.
//
// Kept inline rather than importing the canonical helper, because this script is
// standalone and requiring that module would pull the whole Jira client into a
// skill that does not otherwise use it. (Naming that module's path in a comment
// is also enough to make the bundler vendor it here — pass 1 scans prose for
// shared-resource paths — so the path is spelled out nowhere in this file.)
//
// This walks lines rather than matching a regex, and that is the whole point.
// The pattern this replaced ended the section at a lookahead for `\n# `, which a
// shell comment at column 0 inside a ```bash block satisfies — so the table was
// silently truncated, or lost entirely, with nothing on stderr to say so. A
// regex cannot tell a heading from a comment; only tracking fences can.
//
// Two behaviours are carried over deliberately:
//   - the heading is line-anchored and tolerates numbering (`## 5. Stories
//     Breakdown`), so `### Stories Breakdown` cannot win;
//   - the section is cut at the first `### Story N.M` subsection. Those hold the
//     per-story detail that belongs in the epic document, and a line of their
//     prose containing a `|` would otherwise leak in as a bogus table row.
// Both of those tests now also skip fenced lines, for the same reason as above.
function extractStoriesBreakdown(body) {
  const lines = String(body ?? "").split("\n");
  const heading = /^## (?:\d+[.)]\s*)?Stories Breakdown[ \t]*$/;
  const isFenceLine = makeFenceTracker();
  let start = -1;
  const out = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fenced = isFenceLine(line);
    if (start === -1) {
      if (!fenced && heading.test(line)) start = i + 1;
      continue;
    }
    if (!fenced) {
      if (line.startsWith("## ") || line.startsWith("# ")) break;
      if (/^#{3,6}\s+/.test(line)) break; // the overview table only
    }
    out.push(line);
  }

  return start === -1 ? null : out.join("\n");
}

function extractEpicDescription(body, frontmatter) {
  const sections = [];

  // Summary — Epic Goal, falling back to Epic Description when there is no goal.
  // Description is a FALLBACK, never a second block: publishing both put the
  // whole of an epic's prose on the card.
  const epicGoalMatch = body.match(/## Epic Goal\s*\n\n([^#]+)/);
  const epicDescMatch = body.match(/## Epic Description\s*\n\n([^#]+)/);
  const summarySource = epicGoalMatch
    ? epicGoalMatch[1]
    : epicDescMatch
      ? epicDescMatch[1]
          // Flatten inline bold labels — Jira renders them poorly mid-paragraph.
          .replace(/\*\*([^*\n]+):\*\*/g, "$1:")
      : null;
  if (summarySource) {
    sections.push("Summary:\n" + summariseForCard(summarySource));
  }

  // Add epic metadata
  const metadata = [];
  if (frontmatter.epic_type) {
    metadata.push(`Type: ${frontmatter.epic_type}`);
  }
  if (frontmatter.prd_source) {
    metadata.push(`PRD: ${frontmatter.prd_source}`);
  }
  if (frontmatter.estimated_sprints) {
    metadata.push(`Estimated Sprints: ${frontmatter.estimated_sprints}`);
  }
  if (metadata.length > 0) {
    sections.push("Metadata:\n" + metadata.join(" | "));
  }

  // Extract Stories Breakdown table if present.
  const tableContent = (extractStoriesBreakdown(body) || "").trim();
  if (tableContent.includes("|")) {
    // Convert markdown table to Jira wiki markup
    const lines = tableContent.split("\n").filter((line) => line.trim());
    const jiraRows = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Skip separator lines (|---|)
      if (line.match(/^\|[-\s|]+\|$/)) continue;

      // Convert markdown row to Jira wiki markup
      // | a | b | -> |a|b|
      const cells = line
        .split("|")
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1) // Remove first and last empty from split
        .map((cell) => cell.trim());

      if (cells.length > 0) {
        const jiraRow = "|" + cells.join("|") + "|";
        jiraRows.push(jiraRow);
      }
    }

    if (jiraRows.length > 0) {
      sections.push("Stories:\n" + jiraRows.join("\n"));
    }
  }

  return sections.join("\n\n");
}

function normaliseEpicSummary(summary, epicNumber) {
  const bracket = summary.match(/^\s*\[Epic\s+(\d+)\]\s*(.*)$/i);
  const colon = summary.match(/^\s*Epic\s+(\d+)\s*:\s*(.*)$/i);
  let epicId = epicNumber != null ? String(epicNumber) : null;
  if (bracket) {
    epicId = epicId || bracket[1];
    summary = bracket[2].trim();
  } else if (colon) {
    epicId = epicId || colon[1];
    summary = colon[2].trim();
  }
  return epicId != null ? `[Epic ${epicId}] ${summary}` : summary;
}

function getAuth() {
  const url = process.env.JIRA_URL;
  const token = process.env.JIRA_API_TOKEN;
  const email = process.env.JIRA_USER_EMAIL;
  const project = process.env.JIRA_PROJECT_KEY;

  if (!url || !token || !email || !project) {
    console.error("Error: Missing required environment variables.");
    console.error(
      "Please set: JIRA_URL, JIRA_API_TOKEN, JIRA_USER_EMAIL, JIRA_PROJECT_KEY",
    );
    process.exit(1);
  }

  return { baseUrl: url.replace(/\/$/, ""), token, email, project };
}

async function createEpic({
  baseUrl,
  email,
  token,
  projectKey,
  summary,
  description,
  priority,
  labels,
  dryRun,
}) {
  const auth = Buffer.from(`${email}:${token}`).toString("base64");

  if (dryRun) {
    console.log("\n=== DRY RUN - Epic would be created with: ===");
    console.log(`  Project: ${projectKey}`);
    console.log(`  Summary: ${summary}`);
    console.log(
      `  Description: ${description.length > 100 ? description.slice(0, 100) + "..." : description}`,
    );
    console.log(`  Priority: ${priority || "Default"}`);
    console.log(
      `  Labels: ${labels ? (Array.isArray(labels) ? labels.join(",") : labels) : "None"}`,
    );
    return null;
  }

  let epicType = "10000"; // Common Epic ID in Jira Cloud

  // Try to find the Epic issue type
  try {
    const resp = await fetch(
      `${baseUrl}/rest/api/2/issue/createmeta?projectKeys=${projectKey}&expand=projects.issuetypes`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
        },
      },
    );

    if (resp.ok) {
      const data = await resp.json();
      if (data.projects?.[0]?.issuetypes) {
        const epic = data.projects[0].issuetypes.find(
          (it) => it.name.toLowerCase() === "epic",
        );
        if (epic) epicType = epic.id;
      }
    }
  } catch (e) {
    console.log(`Warning: Could not fetch issue types: ${e.message}`);
  }

  // Build the issue payload
  const issueData = {
    fields: {
      project: { key: projectKey },
      summary,
      description,
      issuetype: { id: epicType },
    },
  };

  if (priority) {
    // Capitalize first letter for Jira (e.g., "high" -> "High")
    const capitalizedPriority =
      priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
    issueData.fields.priority = { name: capitalizedPriority };
  }

  if (labels) {
    issueData.fields.labels = Array.isArray(labels)
      ? labels
      : labels.split(",");
  }

  // The gate. A refused create returns null — the same shape the catch below
  // already returns, so every caller copes with it today.
  if (accessTracker() !== "full") {
    let recordId = null;
    try {
      if (!dm)
        throw new Error("defer-mutation.js not found next to this script");
      const rec = dm.defer({
        kind: "jira.issue.create",
        system: "jira",
        access: accessTracker(),
        intent: `Create the Jira epic "${issueData.fields.summary || "(no summary)"}" in ${issueData.fields.project?.key || "the project"}`,
        target: {
          name: issueData.fields.summary || "(no summary)",
          url: `${baseUrl}/rest/api/2/issue`,
          ui_url: `${baseUrl}/secure/CreateIssue!default.jspa`,
        },
        desired: {
          project: issueData.fields.project?.key || null,
          issuetype: issueData.fields.issuetype?.name || null,
          summary: issueData.fields.summary || null,
          priority: issueData.fields.priority?.name || null,
          labels: (issueData.fields.labels || []).join(", ") || null,
        },
        skill: "jira-epic-creator",
      });
      recordId = rec.id;
    } catch (e) {
      console.error(
        `⚠️  Could not record the deferred epic create: ${e.message}`,
      );
    }
    console.log(
      `\n⏸️  Epic create deferred — access.tracker=${accessTracker()} restricts this run.` +
        (recordId ? ` Recorded as ${recordId}.` : ""),
    );
    console.log(`   Summary: ${issueData.fields.summary || "(no summary)"}`);
    return null;
  }

  // Create the issue
  try {
    const resp = await fetch(`${baseUrl}/rest/api/2/issue`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(issueData),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`HTTP ${resp.status}: ${errorText}`);
    }

    const result = await resp.json();
    const issueKey = result.key;
    const issueUrl = `${baseUrl}/browse/${issueKey}`;

    console.log(`\n✅ Epic created successfully!`);
    console.log(`   Key: ${issueKey}`);
    console.log(`   URL: ${issueUrl}`);

    return issueKey;
  } catch (error) {
    console.error(`\n❌ Failed to create epic: ${error.message}`);
    return null;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    file: null,
    summary: null,
    description: null,
    priority: null,
    labels: null,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--file":
      case "-f":
        options.file = args[++i];
        break;
      case "--summary":
      case "-s":
        options.summary = args[++i];
        break;
      case "--description":
      case "-d":
        options.description = args[++i];
        break;
      case "--priority":
      case "-p":
        options.priority = args[++i];
        break;
      case "--labels":
      case "-l":
        options.labels = args[++i];
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      default:
        if (arg.startsWith("-")) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  return options;
}

function updateFileWithJiraLink(filePath, issueKey, issueUrl) {
  const content = fs.readFileSync(filePath, "utf-8");

  // --- 1. Update YAML frontmatter ---
  let updated;
  if (content.startsWith("---")) {
    const parts = content.split(/^---$/m);
    // parts[0] = '' (before first ---), parts[1] = frontmatter, parts[2+] = body
    if (parts.length >= 3) {
      let fm = parts[1];
      // Remove any existing jira_key / jira_url lines before re-adding
      fm = fm.replace(/^jira_key:.*\n?/m, "").replace(/^jira_url:.*\n?/m, "");
      // Append before the closing blank line (or at end)
      fm =
        fm.trimEnd() + `\njira_key: "${issueKey}"\njira_url: "${issueUrl}"\n`;
      parts[1] = fm;
      updated =
        parts[0] +
        "---" +
        parts.slice(1, -1).join("---") +
        "---" +
        parts[parts.length - 1];
    } else {
      updated = content;
    }
  } else {
    updated = content;
  }

  // --- 2. Add / update cross-reference link in body ---
  const linkLine = `**Jira Epic**: [${issueKey}](${issueUrl})`;
  const linkPattern = /^\*\*Jira Epic\*\*:.*$/m;

  if (linkPattern.test(updated)) {
    // Replace existing link line
    updated = updated.replace(linkPattern, linkLine);
  } else {
    // Find a good insertion point:
    // Prefer inserting after the first top-level heading (# ...) line
    const headingMatch = updated.match(/^(# .+)$/m);
    if (headingMatch) {
      const idx = updated.indexOf(headingMatch[0]) + headingMatch[0].length;
      updated = updated.slice(0, idx) + "\n\n" + linkLine + updated.slice(idx);
    } else {
      // Fallback: append at end
      updated = updated.trimEnd() + "\n\n" + linkLine + "\n";
    }
  }

  fs.writeFileSync(filePath, updated, "utf-8");
  console.log(`\n📝 Updated source file with Jira cross-reference:`);
  console.log(`   ${filePath}`);
  console.log(`   Added: jira_key, jira_url to frontmatter`);
  console.log(`   Added: ${linkLine}`);
}

async function main() {
  const args = parseArgs();
  const { baseUrl, token, email, project } = getAuth();

  let summary, description, priority, labels;
  let filePath = null;
  let epicNumber = null;

  // Parse from file if provided
  if (args.file) {
    filePath = path.resolve(args.file);
    if (!fs.existsSync(filePath)) {
      console.error(`Error: File not found: ${filePath}`);
      process.exit(1);
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const { frontmatter, body } = await parseFrontmatter(content);

    epicNumber =
      frontmatter.epic_number != null ? frontmatter.epic_number : null;
    summary = args.summary || frontmatter.summary || frontmatter.title || "";
    // Use the epic-aware description extractor
    const epicDesc = extractEpicDescription(body, frontmatter);
    description =
      args.description || epicDesc || body || frontmatter.description || "";
    priority = args.priority || frontmatter.priority;
    labels = args.labels || frontmatter.labels;

    if (!summary) {
      // Try to extract first heading as summary
      const match = body.match(/^# (.+)$/m);
      if (match) {
        summary = match[1];
      } else {
        console.error(
          "Error: Could not determine epic summary. Provide --summary or frontmatter.",
        );
        process.exit(1);
      }
    }

    console.log(`Creating epic from file: ${filePath}`);
  } else {
    summary = args.summary;
    description = args.description || summary || "";
    priority = args.priority;
    labels = args.labels;

    if (!summary) {
      console.error("Error: Provide --summary or --file");
      console.log("\nUsage:");
      console.log(
        "  node jira-create-epic.js --file docs/prd/<domain>/<feature>/epics/epic.<N>.<name>/epic.<N>.<name>.md",
      );
      console.log(
        '  node jira-create-epic.js --summary "Epic Title" --description "Details"',
      );
      process.exit(1);
    }
  }

  summary = normaliseEpicSummary(summary, epicNumber);

  // Create the epic
  const issueKey = await createEpic({
    baseUrl,
    email,
    token,
    projectKey: project,
    summary,
    description,
    priority,
    labels,
    dryRun: args.dryRun,
  });

  // Write back cross-reference link to source file
  if (issueKey && filePath && !args.dryRun) {
    const issueUrl = `${baseUrl}/browse/${issueKey}`;
    updateFileWithJiraLink(filePath, issueKey, issueUrl);
  }
}

// Guarded so the extraction helpers can be required by a test without running
// the script. The absence of that guard is why this file's copy of the section
// extractor was never covered, and an uncovered copy is how it kept the old
// truncating behaviour after the canonical one was fixed.
if (require.main === module) {
  main().catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
  });
} else {
  module.exports = {
    extractStoriesBreakdown,
    extractEpicDescription,
    makeFenceTracker,
    normaliseEpicSummary,
  };
}
