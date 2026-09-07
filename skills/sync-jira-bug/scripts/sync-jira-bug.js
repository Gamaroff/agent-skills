#!/usr/bin/env node
"use strict";
/**
 * sync-jira-bug — Create or update a Jira Bug from a local bug report.
 *
 * Sibling of sync-jira-task. Uses Jira REST API v3 with ADF.
 *
 * Three modes, inferred from the file's own path (never asked for):
 *   story bug   — co-located with the story it was found in
 *   task bug    — co-located in docs/tasks/task.{id}.{name}/
 *   general bug — docs/bugs/bug.{N}.{name}/, cross-cutting, no single owner
 *
 * What is different from every other sync in the family, and why:
 *
 *   - The card is a SIBLING, never a child. See "Parent linkage" in SKILL.md.
 *     The relationship travels as a Jira issue link plus link-marked entries in
 *     the description's Source Documents section.
 *   - Bug documents carry `## Status History`, NOT `## Change Log` — the
 *     exclusion is stated in docs/standards/bug-documents.md and
 *     document-change-log.md. Rows go through status-history.js.
 *   - Roughly half the bug documents in a consuming repo have no YAML
 *     frontmatter at all, only a `**Bug ID**:` header block. Both shapes are
 *     read; a file without frontmatter has a minimal block prepended so the
 *     sync keys have somewhere to live.
 *
 * Everything else — ADF rendering, relative-link resolution, hashing, the
 * concurrent-edit guard, transitions, deferral, backlog placement,
 * --probe-workflow, --check-card — comes from jira-sync.js unchanged.
 */

const fs = require("fs");
const path = require("path");
const lib = require("../references/jira-sync.js");
const BD = require("../references/bug-doc.js");
const SH = require("../references/status-history.js");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
// What the CARD carries — a summary, not a copy. The bug file is the source of
// truth and every card links to it; see shared/resources/tracker-card-summary.md.
//
// `Impact` uses an alias array because the section's heading is MODE-DEPENDENT:
// create-bug-report emits `## Acceptance Criteria Violation` for a story bug,
// `## Success Criteria Violation` for a task bug and `## Scope & Impact` for a
// general one. One spec with three names handles all three, which is what keeps
// mode out of the card builder.
//
// `## Evidence` is deliberately absent. Screenshots, log dumps and stack traces
// are the largest section of a bug report and the fastest to go stale; the card
// is a pointer, and this is exactly the material the pointer exists to avoid
// copying.
const BUG_CARD_SECTIONS = [
  { heading: "Summary", names: ["Bug Description"], maxSentences: 4 },
  { heading: "Reproduction", names: ["Reproduction Steps"], maxItems: 5 },
  {
    heading: "Impact",
    names: [
      "Scope & Impact",
      "Scope and Impact",
      "Acceptance Criteria Violation",
      "Success Criteria Violation",
    ],
    maxItems: 5,
    maxSentences: 3,
    optional: true,
  },
];

const ISSUE_TYPE = "Bug";
const SYNC_LABEL_PREFIX = "synced-from-";

// Optional Jira custom field id for bug severity (many bug workflows carry one;
// plenty do not). Resolved from JIRA_SEVERITY_FIELD, else `jira.severityField`
// in skills-config.yaml. Empty → the field is never sent, and severity travels
// in the description's Metadata line instead.
function loadSeverityField() {
  try {
    const root = lib.getRepoRoot();
    if (!root) return "";
    const cfgPath = path.join(root, "skills-config.yaml");
    if (!fs.existsSync(cfgPath)) return "";
    return lib.parseJiraScalar(
      fs.readFileSync(cfgPath, "utf-8"),
      "severityField",
    );
  } catch (_) {
    return "";
  }
}

const SEVERITY_FIELD = process.env.JIRA_SEVERITY_FIELD || loadSeverityField();

const DEFAULT_ASSIGNEE =
  process.env.JIRA_DEFAULT_ASSIGNEE || lib.loadDefaultAssignee();

// ---------------------------------------------------------------------------
// Description builder (bug-specific)
// ---------------------------------------------------------------------------
function buildDescriptionAdf({
  body,
  fields,
  bugBbUrl,
  parentDocUrl,
  parentDocLabel,
  parentKey,
  parentUrl,
  epicDocUrl,
  relatedDocLinks,
  linkResolver,
  output = null,
}) {
  const content = [];

  content.push(
    ...lib.buildCardSections(body, BUG_CARD_SECTIONS, {
      sourceUrl: bugBbUrl || null,
      docLabel: "the bug report",
      linkResolver,
      output,
    }),
  );

  const meta = [];
  if (fields.severity) meta.push(`Severity: ${fields.severity}`);
  if (fields.priority) meta.push(`Priority: ${fields.priority}`);
  if (fields.status) meta.push(`Status: ${fields.status}`);
  if (fields.created) meta.push(`Created: ${fields.created}`);
  if (fields.related) meta.push(`Related: ${fields.related}`);
  if (meta.length) {
    content.push(lib.adf.heading(3, "Metadata"));
    content.push(lib.adf.paragraph(lib.adf.text(meta.join(" | "))));
  }

  // Links go LAST, and the bug report leads them. The card is a pointer, so the
  // route to the full detail is the last thing a reader passes on their way out.
  //
  // The ORDER is the whole point of this skill: bug report, then the document it
  // hangs off, then that document's own card, then (story mode) the epic. A bug
  // card that links to none of these — which is what the generic /create-issue
  // path produced — leaves a reader on the board with no route back to anything.
  const sourceLinks = [];
  if (bugBbUrl) sourceLinks.push({ label: "Bug report", href: bugBbUrl });
  if (parentDocUrl)
    sourceLinks.push({ label: parentDocLabel, href: parentDocUrl });
  if (parentKey && parentUrl)
    sourceLinks.push({ label: `Parent card ${parentKey}`, href: parentUrl });
  if (epicDocUrl) sourceLinks.push({ label: "Parent epic", href: epicDocUrl });
  if (relatedDocLinks && relatedDocLinks.length)
    sourceLinks.push(...relatedDocLinks);
  if (sourceLinks.length) {
    content.push(lib.adf.heading(3, "Source Documents"));
    content.push(
      lib.adf.bulletList(
        ...sourceLinks.map((l) =>
          lib.adf.listItem(lib.adf.paragraph(lib.adf.link(l.label, l.href))),
        ),
      ),
    );
  }

  return lib.capDescriptionAdf(lib.adf.doc(...content), {
    sourceUrl: bugBbUrl || null,
    output,
  });
}

// Hash exactly what gets PUBLISHED, not the raw sections — otherwise an edit to
// a section the card no longer carries (an Evidence paste, say) flips the hash
// and fires a description PUT that changes nothing on the card.
function hashBody({
  body,
  bugBbUrl,
  parentDocUrl,
  parentKey,
  epicDocUrl,
  relatedDocLinks,
  linkResolver,
}) {
  const sections = lib.buildCardSections(body, BUG_CARD_SECTIONS, {
    sourceUrl: bugBbUrl || null,
    docLabel: "the bug report",
    linkResolver,
  });
  return lib.hashStable({
    sections,
    bugBbUrl,
    parentDocUrl: parentDocUrl || "",
    parentKey: parentKey || "",
    epicDocUrl: epicDocUrl || "",
    relatedDocLinks: (relatedDocLinks || []).map((l) => l.href),
  });
}

function hashMeta(fields) {
  return lib.hashStable({
    severity: fields.severity || "",
    priority: fields.priority || "",
    status: fields.status || "",
    created: fields.created || "",
    related: fields.related || "",
  });
}

// ---------------------------------------------------------------------------
// Sync label
// ---------------------------------------------------------------------------
// Derived from the BUG FILE'S OWN STEM, not from its parent directory.
//
// sync-jira-task uses the directory basename, which is unique for a task because
// a task owns its directory. A bug does not: a story bug shares a directory with
// its story, its story's QA reports and every sibling bug. Labelling by directory
// would give all of them the same label, and the pre-flight "have I already
// created this?" search would then adopt the FIRST card it found — so bug 2 would
// silently update bug 1's card.
//
// This label is the only guarantor of idempotent create when the write-back
// fails, so it must be unique per bug.
function syncLabelFor(filePath) {
  const stem = path.basename(filePath).replace(/\.md$/i, "");
  return SYNC_LABEL_PREFIX + stem.replace(/\s+/g, "-");
}

// Normalise the summary to the canonical "[{bugId}] {title}" bracket form —
// `[story.7.4.bug.4] Tap target too small`. The bug id, not a bare number,
// because a bare "[Bug 4]" is ambiguous across every story in the project.
// Idempotent: an already-correct summary is returned unchanged.
function normaliseBugSummary(summary, bugId) {
  const s = String(summary || "").trim();
  if (!bugId) return s;
  const bracket = s.match(/^\s*\[([^\]]+)\]\s*(.*)$/);
  if (bracket && bracket[1].toLowerCase() === bugId.toLowerCase())
    return `[${bugId}] ${bracket[2].trim()}`;
  // A leading "Bug: " / "BUG — " style prefix carries no information the bracket
  // does not, so it is dropped rather than nested inside it.
  const stripped = s.replace(/^\s*bug\s*[:—-]\s*/i, "");
  return `[${bugId}] ${stripped}`;
}

// ---------------------------------------------------------------------------
// Field collection from the document / args
// ---------------------------------------------------------------------------
function collectIssueFields({
  summary,
  args,
  fields: bugFields,
  frontmatter,
  descAdf,
  bugTypeId,
  projectKey,
  livePriorities,
  output,
  syncLabel,
  modeLabels,
}) {
  const priority = lib.normalisePriority(
    args.priority || bugFields.priority,
    livePriorities,
    output,
  );
  const labelInput = args.labels || frontmatter.labels;
  const cleanLabels = lib.sanitiseLabels(labelInput) || [];
  for (const l of [syncLabel, ...(modeLabels || [])]) {
    if (l && !cleanLabels.includes(l)) cleanLabels.push(l);
  }

  const fields = {
    summary,
    description: descAdf,
    labels: cleanLabels,
  };
  if (bugTypeId) fields.issuetype = { id: bugTypeId };
  if (projectKey) fields.project = { key: projectKey };
  if (priority) fields.priority = { name: priority };

  const assigneeId = lib.resolveAssignee(
    frontmatter.assignee,
    DEFAULT_ASSIGNEE,
    output,
  );
  if (assigneeId) fields.assignee = { accountId: assigneeId };
  if (frontmatter.due_date) fields.duedate = String(frontmatter.due_date);
  if (frontmatter.components) {
    const comps = Array.isArray(frontmatter.components)
      ? frontmatter.components
      : [frontmatter.components];
    fields.components = comps
      .filter(Boolean)
      .map((name) => ({ name: String(name) }));
  }
  if (frontmatter.fix_versions) {
    const fvs = Array.isArray(frontmatter.fix_versions)
      ? frontmatter.fix_versions
      : [frontmatter.fix_versions];
    fields.fixVersions = fvs
      .filter(Boolean)
      .map((name) => ({ name: String(name) }));
  }

  // Severity onto a configured custom field, when the project has one. Sent as
  // an option object, which is what a Jira select field expects; a project whose
  // severity field is a plain text field is served by the Metadata line instead.
  if (SEVERITY_FIELD && bugFields.severity)
    fields[SEVERITY_FIELD] = { value: bugFields.severity };

  return fields;
}

// ---------------------------------------------------------------------------
// File write-back
// ---------------------------------------------------------------------------
function updateBugFile({
  filePath,
  issueKey,
  issueUrl,
  bugFields,
  statusHistoryEntries,
  lastSyncedAt,
  bodyHash,
  metaHash,
  output,
}) {
  let content = fs.readFileSync(filePath, "utf-8");
  const adopted = !content.startsWith("---");

  // A file with no frontmatter gets one. `upsertFrontmatterKeys` returns its
  // input unchanged — and silently — for such a file, so without this the issue
  // is created and `jira_key` is never persisted, and the next run creates a
  // duplicate unless the synced-from-* label search rescues it.
  if (adopted) {
    content = BD.ensureFrontmatter(content, bugFields, {
      dir: path.dirname(filePath),
    });
  }

  // No `bug_bitbucket_url`. It pinned an absolute Bitbucket URL to whichever
  // branch the sync ran on, and the link died when that branch was deleted after
  // merge while the file itself sat safe on the default branch. The document
  // links below are relative, which the repo's own link checker validates; Jira
  // still receives a working absolute link because `resolveRelativeLink`
  // absolutises at ADF-render time.
  content = lib.upsertFrontmatterKeys(content, {
    jira_key: issueKey,
    jira_url: issueUrl,
    jira_last_synced_at: lastSyncedAt || null,
    jira_last_body_hash: bodyHash || null,
    jira_last_meta_hash: metaHash || null,
  });

  const upsertLine = (text, pattern, newLine) => {
    if (pattern.test(text)) return text.replace(pattern, newLine);
    const m = text.match(/^(# .+)$/m);
    if (m) {
      const idx = text.indexOf(m[0]) + m[0].length;
      return text.slice(0, idx) + "\n\n" + newLine + text.slice(idx);
    }
    return text.trimEnd() + "\n\n" + newLine + "\n";
  };

  content = upsertLine(
    content,
    /^\*\*Jira\*\*:.*$/m,
    `**Jira**: [${issueKey}](${issueUrl})`,
  );
  const bugFileName = path.basename(filePath);
  content = upsertLine(
    content,
    /^\*\*Bug File\*\*:.*$/m,
    `**Bug File**: [${bugFileName}](./${bugFileName})`,
  );

  // Status History, NOT a Change Log. Bug reports are barred from carrying the
  // four-column Change Log that PRD, epic, story and task documents carry —
  // `## Status History` is the bug-type equivalent and is richer, because it has
  // a Status column, which is what a bug's history is actually about.
  //
  // A row is written for exactly two events — issue created, and a status
  // transition that actually fired. A body, summary, priority or label update
  // writes none: Jira keeps a full issue history with actor and timestamp.
  // An empty list means a byte-identical file and an empty `git diff`, which is
  // what keeps consecutive no-op syncs from churning history.
  for (const entry of statusHistoryEntries) {
    content = SH.upsertStatusHistory(content, entry);
  }
  fs.writeFileSync(filePath, content, "utf-8");
  output.info(`\n📝 Updated local bug file: ${filePath}`);
  if (adopted)
    output.info(
      `   ℹ️  This file had no frontmatter — a minimal block was prepended so the sync keys have somewhere to live. The body is unchanged.`,
    );
}

// Status History rows for the two events that earn one. Mirrors
// `lib.buildChangeLogEntries`, which cannot be reused: it emits the Change Log's
// four columns, and a bug's table is Date | Status | Changed By | Notes.
//
// The `Status` cell is the bug's CURRENT lifecycle status, not the transition's
// destination — a Jira column name is not a bug lifecycle word, and putting one
// in that column is how the two vocabularies get conflated.
function buildStatusHistoryEntries({
  created,
  issueKey,
  statusOutcome,
  bugStatus,
  date,
}) {
  const day = date || new Date().toISOString().slice(0, 10);
  const entries = [];
  const status = bugStatus || "";
  if (created)
    entries.push({
      date: day,
      status,
      changedBy: "sync-jira-bug",
      notes: `Jira bug created (${issueKey})`,
    });
  if (statusOutcome?.transitioned) {
    const landed = statusOutcome.to || statusOutcome.landed;
    entries.push({
      date: day,
      status,
      changedBy: "sync-jira-bug",
      notes: landed
        ? `Jira card moved to "${landed}"`
        : statusOutcome.via
          ? `Jira card moved via "${statusOutcome.via}"`
          : "Jira card status changed",
    });
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    file: null,
    summary: null,
    priority: null,
    labels: null,
    docBranch: null,
    checkCard: false,
    dryRun: false,
    force: false,
    json: false,
    quiet: false,
    failOnStatusSkip: false,
    noTransition: false,
    noLink: false,
    probeWorkflow: false,
    writeRecord: "",
  };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--file":
      case "-f":
        opts.file = args[++i];
        break;
      case "--summary":
      case "-s":
        opts.summary = args[++i];
        break;
      case "--priority":
      case "-p":
        opts.priority = args[++i];
        break;
      case "--labels":
      case "-l":
        opts.labels = args[++i];
        break;
      case "--doc-branch":
        opts.docBranch = args[++i];
        break;
      case "--check-card":
        opts.checkCard = true;
        break;
      case "--dry-run":
        opts.dryRun = true;
        break;
      case "--force":
        opts.force = true;
        break;
      case "--json":
        opts.json = true;
        break;
      case "--quiet":
        opts.quiet = true;
        break;
      case "--fail-on-status-skip":
        opts.failOnStatusSkip = true;
        break;
      case "--no-transition":
        opts.noTransition = true;
        break;
      case "--no-link":
        opts.noLink = true;
        break;
      case "--probe-workflow":
        opts.probeWorkflow = true;
        break;
      case "--write-record":
        opts.writeRecord = args[++i];
        break;
      default:
        if (args[i].startsWith("-"))
          throw new Error(`Unknown option: ${args[i]}`);
    }
  }
  return opts;
}

// ---------------------------------------------------------------------------
// Run (testable; takes injectable fetch)
// ---------------------------------------------------------------------------
async function run({
  argv = process.argv,
  fetchImpl = typeof fetch !== "undefined" ? fetch : null,
} = {}) {
  lib.loadDotEnv();
  const args = parseArgs(argv);
  const output = lib.makeOutput({ json: args.json, quiet: args.quiet });

  if (args.probeWorkflow) {
    const auth = lib.getAuth();
    if (!auth.ok) {
      output.err(
        `Error: Missing required environment variables: ${auth.missing.join(", ")}`,
      );
      return { exitCode: 1 };
    }
    const http = lib.makeHttp({
      fetchImpl: fetchImpl || (typeof fetch !== "undefined" ? fetch : null),
      cwd: lib.getRepoRoot() || process.cwd(),
    });
    await lib.probeWorkflow({
      http,
      baseUrl: auth.baseUrl,
      email: auth.email,
      token: auth.token,
      projectKey: auth.project,
      docKind: "bug",
      writePath: args.writeRecord,
      output,
    });
    return { exitCode: 0 };
  }

  if (!args.file) {
    output.err("Error: --file is required");
    output.err(
      "Usage: sync-jira-bug --file <bug.md> [--check-card] [--doc-branch <name>] [--dry-run] [--force] [--json] [--quiet] [--no-transition] [--no-link]",
    );
    return { exitCode: 1 };
  }
  const filePath = path.resolve(args.file);
  if (!fs.existsSync(filePath)) {
    output.err(`Error: File not found: ${filePath}`);
    return { exitCode: 1 };
  }

  const rawContent = fs.readFileSync(filePath, "utf-8");
  const { frontmatter, body } = lib.parseFrontmatter(rawContent);
  const mode = BD.resolveBugMode(filePath, frontmatter, body);
  const header = BD.parseBugHeaderBlock(body);
  const bugFields = BD.readBugFields(frontmatter, header);
  for (const w of mode.warnings) output.warn(`⚠️  ${w}`);

  // --check-card: preflight the DOCUMENT against the card spec and exit. No
  // auth, no network, no writes — a review-time gate, not a sync mode.
  if (args.checkCard) {
    const check = lib.checkCardSections(body, BUG_CARD_SECTIONS, {
      docLabel: "the bug report",
    });
    if (args.json) {
      output.emit({
        action: "check-card",
        file: filePath,
        bug_mode: mode.mode,
        ...check,
      });
    } else {
      output.info(
        lib.formatCardCheck(check, {
          title: `Card preflight — ${path.basename(filePath)}`,
        }),
      );
    }
    return { exitCode: check.findings.length ? 1 : 0 };
  }

  const auth = lib.getAuth();
  if (!auth.ok) {
    if (args.dryRun) {
      output.warn(
        `⚠️  Dry-run: missing env vars (${auth.missing.join(", ")}) — values will be required for live sync.`,
      );
    } else {
      output.err(
        `Error: Missing required environment variables: ${auth.missing.join(", ")}`,
      );
      output.err(
        "Set: JIRA_URL, JIRA_API_TOKEN, JIRA_USER_EMAIL, JIRA_PROJECT_KEY (and JIRA_BOARD_ID for backlog).",
      );
      return { exitCode: 1 };
    }
  }
  if (!auth.boardId)
    output.warn(
      "⚠️  JIRA_BOARD_ID not set — bug created but not moved to backlog.",
    );

  const repoRoot = lib.getRepoRoot();
  const bbBase = lib.getBitbucketRepoBase();
  if (!bbBase)
    output.warn(
      "⚠️  Could not detect Bitbucket repo URL. Set BITBUCKET_REPO_URL to enable Bitbucket links.",
    );
  const branch = bbBase ? lib.resolveDocBranch(args.docBranch) : null;
  const url = (p) =>
    bbBase && p ? lib.buildBitbucketUrl(p, repoRoot, bbBase, branch) : null;

  const bugBbUrl = url(filePath);
  const linkResolver = lib.makeRelativeLinkResolver({
    filePath,
    repoRoot,
    bbBase,
    branch,
  });

  // Parent resolution. A parent that cannot be resolved yields no link rather
  // than a guessed one, and a parent with no card of its own is linked as a
  // document only — this skill never creates the parent's card as a side effect
  // of syncing a bug.
  const parentDoc = BD.findParentDoc(
    filePath,
    mode.mode,
    mode.parentId,
    repoRoot,
  );
  const parentDocLabel =
    mode.mode === "general"
      ? "Bug registry"
      : mode.mode === "story"
        ? "Parent story document"
        : mode.mode === "task"
          ? "Parent task document"
          : "Parent document";
  const parentDocUrl = url(parentDoc);

  let parentKey = null;
  let epicDocUrl = null;
  if (parentDoc && /\.md$/i.test(parentDoc) && mode.mode !== "general") {
    try {
      const pfm = lib.parseFrontmatter(
        fs.readFileSync(parentDoc, "utf-8"),
      ).frontmatter;
      parentKey = pfm.jira_key || null;
      // A story bug also links the epic the story belongs to — the third rung a
      // board reader needs to place the bug in the product, and the one the
      // hand-authored cards were missing entirely.
      if (mode.mode === "story" && pfm.epic_source) {
        const epicPath = path.resolve(path.dirname(parentDoc), pfm.epic_source);
        if (fs.existsSync(epicPath)) epicDocUrl = url(epicPath);
      }
    } catch (_) {
      output.warn(`⚠️  Could not read parent document ${parentDoc}.`);
    }
  }
  const parentUrl = parentKey ? `${auth.baseUrl}/browse/${parentKey}` : null;
  if (mode.mode !== "general" && !parentDoc)
    output.warn(
      `⚠️  No parent ${mode.parentKind} document found beside this bug — the card will link to the bug report only.`,
    );
  if (mode.mode !== "general" && parentDoc && !parentKey)
    output.warn(
      `ℹ️  Parent ${mode.parentKind} has no jira_key yet — linking the document, not the card. Sync the parent, then re-run to add the card link.`,
    );

  const relatedDocLinks = bbBase
    ? BD.findRelatedBugDocs(filePath, mode.bugId, mode.bugStem).map((d) => ({
        label: d.label,
        href: url(d.path),
      }))
    : [];

  let summary =
    args.summary ||
    frontmatter.summary ||
    frontmatter.title ||
    bugFields.description ||
    body.match(/^# (.+)$/m)?.[1];
  if (!summary) {
    output.err(
      "Error: Could not determine summary (set frontmatter description/title or a # heading).",
    );
    return { exitCode: 1 };
  }
  summary = normaliseBugSummary(
    String(summary).replace(/^Bug Report:\s*/i, ""),
    mode.bugId,
  );

  const http = lib.makeHttp({
    fetchImpl: fetchImpl || (typeof fetch !== "undefined" ? fetch : null),
    cwd: lib.getRepoRoot() || process.cwd(),
  });
  const livePriorities =
    auth.ok && !args.dryRun
      ? await lib.resolveLivePriorities({
          http,
          baseUrl: auth.baseUrl,
          email: auth.email,
          token: auth.token,
        })
      : null;

  const syncLabel = syncLabelFor(filePath);
  // A second, COARSER label so a board can filter every bug of one parent at a
  // glance. Not used for idempotency — that is syncLabel's job alone.
  const modeLabels =
    mode.mode === "general"
      ? ["bug"]
      : ["bug", `${mode.parentKind}-${mode.parentId}`];

  const hashInput = {
    body,
    bugBbUrl,
    parentDocUrl,
    parentKey,
    epicDocUrl,
    relatedDocLinks,
    linkResolver,
  };
  const newBodyHash = hashBody(hashInput);
  const newMetaHash = hashMeta(bugFields);

  let existingJiraKey = frontmatter.jira_key;

  // Pre-flight idempotency check (only if creating)
  if (!existingJiraKey && auth.ok && !args.dryRun) {
    const found = await lib.findExistingByLabel({
      http,
      baseUrl: auth.baseUrl,
      email: auth.email,
      token: auth.token,
      projectKey: auth.project,
      label: syncLabel,
    });
    if (found) {
      output.warn(
        `ℹ️  Found existing issue ${found.key} with label "${syncLabel}" — switching to update.`,
      );
      existingJiraKey = found.key;
    }
  }

  const isUpdate = !!existingJiraKey;
  output.info(
    `\n${isUpdate ? "🔄 Updating" : "➕ Creating"} Jira bug${isUpdate ? ` ${existingJiraKey}` : ""}…`,
  );
  output.info(`   File:   ${filePath}`);
  output.info(`   Mode:   ${mode.mode} bug (${mode.bugId})`);
  output.info(
    `   Parent: ${parentDoc ? path.basename(parentDoc) : "(none)"}${parentKey ? ` → ${parentKey}` : ""}`,
  );
  if (args.dryRun)
    output.info("   Mode:   DRY RUN — no Jira calls or file writes");
  if (args.force)
    output.info("   Mode:   --force — concurrent-edit guard disabled");

  const descArgs = {
    body,
    fields: bugFields,
    bugBbUrl,
    parentDocUrl,
    parentDocLabel,
    parentKey,
    parentUrl,
    epicDocUrl,
    relatedDocLinks,
    linkResolver,
  };

  let result,
    changeSummary,
    current = null;
  let deferred = false;
  let deferredRecord = null;

  if (isUpdate) {
    if (!args.dryRun) {
      current = await lib.fetchIssue({
        http,
        baseUrl: auth.baseUrl,
        email: auth.email,
        token: auth.token,
        issueKey: existingJiraKey,
      });
      lib.guardConcurrentEdit({
        jiraUpdated: current.updated,
        lastSyncedAt: frontmatter.jira_last_synced_at,
        force: args.force,
        output,
      });
    }

    // Build the outgoing payload BEFORE diffing, and diff against it.
    //
    // Diffing against a separately-computed label list is a trap: the payload
    // carries the `synced-from-*` idempotency label and the mode labels that
    // `collectIssueFields` appends, so a diff built from frontmatter alone
    // compares a set that is missing them against a Jira issue that has them.
    // They never converge, `labels` is reported as changed on every single run,
    // and "the second sync changes nothing" is never true — which also fires a
    // pointless PUT and defeats the skip-when-no-diff path.
    const descAdf = buildDescriptionAdf({ ...descArgs, output });
    const fields = collectIssueFields({
      summary,
      args,
      fields: bugFields,
      frontmatter,
      descAdf,
      bugTypeId: null,
      projectKey: null,
      livePriorities,
      output,
      syncLabel,
      modeLabels,
    });

    const changedFields = current
      ? lib.diffFields({
          prev: current,
          next: {
            summary: fields.summary,
            priority: fields.priority ? fields.priority.name : null,
            labels: fields.labels,
          },
          prevBodyHash: frontmatter.jira_last_body_hash,
          newBodyHash,
          prevMetaHash: frontmatter.jira_last_meta_hash,
          newMetaHash,
        })
      : ["summary", "description", "priority", "labels"];
    changeSummary = changedFields.length
      ? `Updated: ${changedFields.join(", ")}`
      : "Sync (no field changes detected)";

    if (args.dryRun) {
      output.info(`\n=== DRY RUN — Would UPDATE ${existingJiraKey} ===`);
      output.info(`  Changes: ${changeSummary}`);
      result = {
        issueKey: existingJiraKey,
        issueUrl: `${auth.baseUrl}/browse/${existingJiraKey}`,
        updated: null,
      };
    } else {
      let putResp;
      try {
        putResp = await lib.putIssueAtomic({
          skill: "sync-jira-bug",
          http,
          baseUrl: auth.baseUrl,
          email: auth.email,
          token: auth.token,
          issueKey: existingJiraKey,
          fields,
        });
      } catch (e) {
        // Strip the severity custom field if Jira rejected it, then retry once.
        // A project without that field configured is the common case, and it is
        // not worth failing an otherwise-good sync over.
        const msg = e.message || "";
        if (
          SEVERITY_FIELD &&
          fields[SEVERITY_FIELD] !== undefined &&
          msg.includes(SEVERITY_FIELD)
        ) {
          output.warn(
            `⚠️  Jira rejected ${SEVERITY_FIELD} on update — retrying without the severity field.`,
          );
          const stripped = { ...fields };
          delete stripped[SEVERITY_FIELD];
          putResp = await lib.putIssueAtomic({
            skill: "sync-jira-bug",
            http,
            baseUrl: auth.baseUrl,
            email: auth.email,
            token: auth.token,
            issueKey: existingJiraKey,
            fields: stripped,
          });
        } else {
          throw e;
        }
      }
      if (putResp.deferred) {
        deferred = true;
        deferredRecord = putResp.record;
        result = {
          issueKey: existingJiraKey,
          issueUrl: `${auth.baseUrl}/browse/${existingJiraKey}`,
          updated: null,
        };
        output.info(
          `\n⏸️  Bug update deferred — access.tracker restricts this run. Recorded as ${deferredRecord}.`,
        );
        output.info(`   Changes: ${changeSummary}`);
      } else {
        const { updated } = putResp;
        const finalUpdated =
          updated ||
          (await lib.fetchUpdatedTimestampStrict({
            http,
            baseUrl: auth.baseUrl,
            email: auth.email,
            token: auth.token,
            issueKey: existingJiraKey,
          }));
        result = {
          issueKey: existingJiraKey,
          issueUrl: `${auth.baseUrl}/browse/${existingJiraKey}`,
          updated: finalUpdated,
        };
        output.info(`\n✅ Bug updated: ${existingJiraKey}`);
        output.info(`   URL: ${result.issueUrl}`);
        output.info(`   Changes: ${changeSummary}`);
      }
    }
  } else {
    changeSummary = "Initial Jira bug created";
    const descAdf = buildDescriptionAdf({ ...descArgs, output });

    if (args.dryRun) {
      output.info(`\n=== DRY RUN — Would CREATE Jira bug ===`);
      output.info(`  Project:  ${auth.project || "(unset)"}`);
      output.info(`  Summary:  ${summary}`);
      output.info(`  Label:    ${syncLabel}`);
      output.info(`  Link:     ${parentKey || "(no parent card)"}`);
      result = { issueKey: null, issueUrl: null, updated: null };
    } else {
      const bugTypeId = await lib.getIssueTypeId({
        http,
        baseUrl: auth.baseUrl,
        email: auth.email,
        token: auth.token,
        projectKey: auth.project,
        typeName: ISSUE_TYPE,
        repoRoot,
      });
      const fields = collectIssueFields({
        summary,
        args,
        fields: bugFields,
        frontmatter,
        descAdf,
        bugTypeId,
        projectKey: auth.project,
        livePriorities,
        output,
        syncLabel,
        modeLabels,
      });

      const postHeaders = {
        Authorization: lib.authHeader(auth.email, auth.token),
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      const postCreate = (f) =>
        http(`${auth.baseUrl}/rest/api/3/issue`, {
          method: "POST",
          headers: postHeaders,
          body: JSON.stringify({ fields: f }),
          defer: {
            kind: "jira.issue.create",
            intent: `Create the Jira bug "${f.summary || "(no summary)"}" in ${auth.project || "the project"}`,
            target: {
              name: f.summary || "(no summary)",
              url: `${auth.baseUrl}/rest/api/3/issue`,
              ui_url: `${auth.baseUrl}/secure/CreateIssue!default.jspa`,
            },
            desired: lib.summariseFields(f),
            skill: "sync-jira-bug",
          },
        });
      let resp = await postCreate(fields);
      if (resp.deferred) {
        // The create null shape — identical to --dry-run. NEVER a placeholder
        // key: one would break the idempotent synced-from-* label search and
        // the next run would create a duplicate.
        deferred = true;
        deferredRecord = resp.deferredRecord;
        result = { issueKey: null, issueUrl: null, updated: null };
        output.info(
          `\n⏸️  Bug create deferred — access.tracker restricts this run. Recorded as ${deferredRecord}.`,
        );
        output.info(`   Summary: ${summary}`);
      } else {
        if (!resp.ok && resp.status === 400) {
          let currentFields = fields;
          let errText = await lib.parseJiraError(resp);
          if (
            SEVERITY_FIELD &&
            currentFields[SEVERITY_FIELD] !== undefined &&
            errText.includes(SEVERITY_FIELD)
          ) {
            output.warn(
              `⚠️  Jira rejected ${SEVERITY_FIELD} — retrying create without the severity field.`,
            );
            currentFields = { ...currentFields };
            delete currentFields[SEVERITY_FIELD];
            resp = await postCreate(currentFields);
            if (!resp.ok) errText = await lib.parseJiraError(resp);
          }
          if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${errText}`);
        }
        if (!resp.ok)
          throw new Error(
            `HTTP ${resp.status}: ${await lib.parseJiraError(resp)}`,
          );
        const created = await resp.json();
        const issueKey = created.key;
        const issueUrl = `${auth.baseUrl}/browse/${issueKey}`;
        const updated = await lib.fetchUpdatedTimestampStrict({
          http,
          baseUrl: auth.baseUrl,
          email: auth.email,
          token: auth.token,
          issueKey,
        });
        result = { issueKey, issueUrl, updated };
        output.info(`\n✅ Bug created: ${issueKey}`);
        output.info(`   URL: ${issueUrl}`);

        await lib.moveToBacklog({
          skill: "sync-jira-bug",
          http,
          baseUrl: auth.baseUrl,
          email: auth.email,
          token: auth.token,
          boardId: auth.boardId,
          issueKey,
          output,
        });
      }
    }
  }

  // Issue link to the parent's card. Attempted on every run, not only on create:
  // the parent frequently gets its own card AFTER the bug does, and `linkIssues`
  // is idempotent, so a re-sync is how the link eventually lands.
  let linkOutcome = null;
  if (result?.issueKey && !args.dryRun && parentKey && !args.noLink) {
    linkOutcome = await lib.linkIssues({
      skill: "sync-jira-bug",
      http,
      baseUrl: auth.baseUrl,
      email: auth.email,
      token: auth.token,
      fromKey: result.issueKey,
      toKey: parentKey,
      repoRoot,
      output,
    });
  }

  // Status transition (after create or update)
  let statusOutcome = null;
  if (result?.issueKey && !args.dryRun && bugFields.status) {
    statusOutcome = await lib.syncDocumentStatus({
      skill: "sync-jira-bug",
      http,
      baseUrl: auth.baseUrl,
      email: auth.email,
      token: auth.token,
      issueKey: result.issueKey,
      localStatus: bugFields.status,
      currentStatus: current?.status || null,
      docKind: "bug",
      output,
      noTransition: args.noTransition,
    });
  }

  // Re-read `updated` after a transition that actually fired.
  //
  // The timestamp captured above is the one from BEFORE the transition, and a
  // transition is a write: it moves the issue's `updated`. Storing the earlier
  // value in `jira_last_synced_at` tells the next run that Jira has moved since
  // this sync — which is exactly what the concurrent-edit guard aborts on. The
  // result is a card that syncs once and then refuses every subsequent run with
  // "Jira issue updated since last local sync", pointing at a change this tool
  // made itself moments earlier.
  //
  // Refreshing is best-effort: a failed re-read leaves the earlier value, which
  // is no worse than not refreshing at all.
  if (statusOutcome?.transitioned && result?.issueKey && !deferred) {
    try {
      result.updated = await lib.fetchUpdatedTimestampStrict({
        http,
        baseUrl: auth.baseUrl,
        email: auth.email,
        token: auth.token,
        issueKey: result.issueKey,
      });
    } catch (e) {
      output.warn(
        `⚠️  Could not re-read the issue timestamp after the transition (${e.message}). The next sync may report a concurrent edit; re-run with --force if so.`,
      );
    }
  }

  // Write-back. A deferred update changed nothing in Jira, so recording a
  // Status History row saying it did is the drift this gate exists to prevent.
  if (result?.issueKey && !args.dryRun && !deferred) {
    updateBugFile({
      filePath,
      issueKey: result.issueKey,
      issueUrl: result.issueUrl,
      bugFields,
      statusHistoryEntries: buildStatusHistoryEntries({
        created: !isUpdate,
        issueKey: result.issueKey,
        statusOutcome,
        bugStatus: bugFields.status,
      }),
      lastSyncedAt: result.updated,
      bodyHash: newBodyHash,
      metaHash: newMetaHash,
      output,
    });
  }

  if (args.json) {
    output.emit({
      action: isUpdate ? "update" : "create",
      dryRun: args.dryRun,
      file: filePath,
      bug_mode: mode.mode,
      bug_id: mode.bugId,
      jira_key: result?.issueKey || existingJiraKey || null,
      jira_url: result?.issueUrl || null,
      bug_bitbucket_url: bugBbUrl,
      parent_doc: parentDoc,
      parent_key: parentKey,
      link_outcome: linkOutcome
        ? linkOutcome.linked
          ? "linked"
          : linkOutcome.reason
        : parentKey
          ? "skipped"
          : "no-parent-card",
      change_summary: changeSummary,
      jira_last_synced_at: result?.updated || null,
      jira_last_body_hash: newBodyHash,
      jira_last_meta_hash: newMetaHash,
      reason:
        deferred ||
        statusOutcome?.reason === "deferred" ||
        linkOutcome?.reason === "deferred"
          ? "deferred"
          : null,
      record:
        deferredRecord || statusOutcome?.record || linkOutcome?.record || null,
    });
  }

  const statusExit = lib.summariseStatusOutcome(statusOutcome, {
    output,
    failOnSkip: args.failOnStatusSkip,
  });

  return {
    exitCode: statusExit,
    result,
    changeSummary,
    isUpdate,
    bugBbUrl,
    mode,
    statusOutcome,
    linkOutcome,
  };
}

// ---------------------------------------------------------------------------
// Entry / exports
// ---------------------------------------------------------------------------
// `process.exitCode` and return, NEVER `process.exit()`.
//
// `process.exit()` tears the process down without waiting for a pending stdout
// write to drain, which truncates the output at the pipe buffer (~64KB) the
// moment a caller pipes this CLI instead of redirecting it to a file
// (bug.3.stdout-truncation-on-exit). A bug document's JSON description is well
// within reach of that.
if (require.main === module) {
  run()
    .then((r) => {
      process.exitCode = r.exitCode || 0;
    })
    .catch((e) => {
      if (process.argv.includes("--json"))
        process.stdout.write(
          JSON.stringify({ error: e.message }, null, 2) + "\n",
        );
      else console.error("Unexpected error:", e.message || e);
      process.exitCode = 1;
    });
} else {
  module.exports = {
    run,
    parseArgs,
    buildDescriptionAdf,
    buildStatusHistoryEntries,
    hashBody,
    hashMeta,
    syncLabelFor,
    normaliseBugSummary,
    collectIssueFields,
    updateBugFile,
    loadSeverityField,
    BUG_CARD_SECTIONS,
    ISSUE_TYPE,
    // bug-document semantics — one implementation, shared with the GitHub path
    resolveBugMode: BD.resolveBugMode,
    parseBugHeaderBlock: BD.parseBugHeaderBlock,
    readBugFields: BD.readBugFields,
    normaliseBugStatus: BD.normaliseBugStatus,
    ensureFrontmatter: BD.ensureFrontmatter,
    findParentDoc: BD.findParentDoc,
    findRelatedBugDocs: BD.findRelatedBugDocs,
    // Status History: the bug-type Change Log
    upsertStatusHistory: SH.upsertStatusHistory,
    findStatusHistory: SH.findStatusHistory,
    extractStatusEntries: SH.extractEntries,
    fmtStatusEntry: SH.fmtEntry,
    isStatusEntryRow: SH.isEntryRow,
    // Re-exported lib pieces used by the tests
    STATUS_MAP: lib.DEFAULT_STATUS_MAP,
    mapStatus: lib.mapStatus,
    loadStatusMap: lib.loadStatusMap,
    parseJiraScalar: lib.parseJiraScalar,
    parseFrontmatter: lib.parseFrontmatter,
    upsertFrontmatterKeys: lib.upsertFrontmatterKeys,
    diffFields: lib.diffFields,
    normalisePriority: lib.normalisePriority,
    sanitiseLabels: lib.sanitiseLabels,
    guardConcurrentEdit: lib.guardConcurrentEdit,
    hashStable: lib.hashStable,
    resolveLinkType: lib.resolveLinkType,
    linkIssues: lib.linkIssues,
    getIssueLinkTypes: lib.getIssueLinkTypes,
    LINK_TYPE_CANDIDATES: lib.LINK_TYPE_CANDIDATES,
    resolveRelativeLink: lib.resolveRelativeLink,
    makeRelativeLinkResolver: lib.makeRelativeLinkResolver,
    resolveDocBranch: lib.resolveDocBranch,
    buildBitbucketUrl: lib.buildBitbucketUrl,
  };
}
