#!/usr/bin/env node
/**
 * Jira Epic Creator
 * Creates epics in Jira from command line arguments or markdown files.
 */

const fs = require("fs");
const path = require("path");

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

function extractEpicDescription(body, frontmatter) {
  const sections = [];

  // Extract Epic Goal section
  const epicGoalMatch = body.match(/## Epic Goal\s*\n\n([^#]+)/);
  if (epicGoalMatch) {
    sections.push("Epic Goal:\n" + epicGoalMatch[1].trim());
  }

  // Extract Epic Description section
  const epicDescMatch = body.match(/## Epic Description\s*\n\n([^#]+)/);
  if (epicDescMatch) {
    const descContent = epicDescMatch[1].trim();
    // Clean up the nested markdown format
    const cleaned = descContent
      .replace(/\*\*Existing System Context:\*\*/g, "Existing System Context:")
      .replace(/\*\*Enhancement Details:\*\*/g, "Enhancement Details:")
      .replace(/\*\*Success criteria:\*\*/g, "Success criteria:");
    sections.push("Description:\n" + cleaned);
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

  // Extract Stories Breakdown table if present
  const storiesMatch = body.match(
    /## Stories Breakdown\s*\n\n([\s\S]*?)(?=\n## |\n# |$)/,
  );
  if (storiesMatch) {
    const tableContent = storiesMatch[1].trim();
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
  }

  return sections.join("\n\n");
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

async function main() {
  const args = parseArgs();
  const { baseUrl, token, email, project } = getAuth();

  let summary, description, priority, labels;

  // Parse from file if provided
  if (args.file) {
    const filePath = path.resolve(args.file);
    if (!fs.existsSync(filePath)) {
      console.error(`Error: File not found: ${filePath}`);
      process.exit(1);
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const { frontmatter, body } = await parseFrontmatter(content);

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
      console.log("  node jira-create-epic.js --file docs/epics/my-epic.md");
      console.log(
        '  node jira-create-epic.js --summary "Epic Title" --description "Details"',
      );
      process.exit(1);
    }
  }

  // Create the epic
  await createEpic({
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
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
