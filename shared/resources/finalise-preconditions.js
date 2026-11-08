#!/usr/bin/env node
/**
 * finalise-preconditions — say, before any DoD agent is dispatched, which inputs `/finalise`
 * needs and does not find, and what to run to get each one (task 272; obs #38, #40).
 *
 * `/finalise` assumes it runs inside `/develop-task`, `/develop-story` or `/develop-bug`, before
 * the merge. Work built by hand, and a bug fixed outside `/develop-bug` or finalised after its PR
 * merged, found out mid-run: Step 6 treated a null review decision with no pr-review as a gap,
 * Step 7's 6b block HALTed with no gate file, 7.7 HALTed with no implementation report. This
 * engine answers the same questions up front, in one line each, with the named route.
 *
 * Two commands:
 *
 *   check --doc <work item file> --kind story|task|bug [--pr <N>] [--pr-state OPEN|MERGED|CLOSED|unknown]
 *         [--review-decision <value>|unknown] [--json]
 *   bug-verdict --dir <document directory> --stem <bug prefix> [--json]
 *
 * It INFORMS; it never waives. A missing gate is not made acceptable by being named. Every rule
 * is one Step 6 and Step 7 already apply, read earlier:
 *
 *   story / task  gate         a `{stem}.gate.{N}.*.yml` beside the document, or
 *                              a WAIVED gate whose waiver block holds `active: true` and a
 *                              non-empty `approved_by` (the qa-gate schema's names)
 *                 review       a `{stem}.pr-review.{N}.*.md`, or `--review-decision APPROVED`
 *                 pr           `--pr` given (the caller resolved one); `--pr-state` not CLOSED
 *   bug           verdict      the newest implementation report's last `**Verdict**:` is exactly
 *                              PASS, or the bug report's `#### QA Verification`
 *                              `**Verification Result**` reads `✅ Fixed` (no report needed)
 *                 pr           as above
 *
 * The PR state and review decision are INPUTS: the caller reads them with
 * `gh pr view <PR> --json state,reviewDecision` (pr-read.sh emits neither). `unknown` — what a
 * host without `gh` answers — is reported under `unverifiable`, never as missing.
 *
 * `reason`: `ok` (nothing missing), `missing` (exit 1), `unreadable` (the directory could not be
 * read; exit 1), `usage` (exit 2). Read `reason`, never the exit code alone.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const docId = require("./doc-id.js");

const ROUTES = Object.freeze({
  gate:
    "run /qa-task (or /qa-story) before merge, or record a WAIVED gate beside the document " +
    "(waiver.active: true and waiver.approved_by: <owner>)",
  "waiver-approval":
    "the WAIVED gate must carry waiver.active: true and a non-empty waiver.approved_by",
  review:
    "run /review-pr on the PR (it writes {stem}.pr-review.{N}.*.md beside the document), or " +
    "obtain the host's required review approval",
  pr:
    "open the PR first, or record it in the document's frontmatter as pr_number: <N> " +
    "(a bug may instead set github_issue: to the issue the PR closes)",
  "pr-closed":
    "the PR is CLOSED and not merged: reopen it, or open a new PR and record it as pr_number: <N>",
  verdict:
    "run the /develop-bug verify loop (it writes **Verdict**: PASS to the implementation report), " +
    "or record **Verification Result**: ✅ Fixed under #### QA Verification in the bug report",
});

const POST_MERGE_BUG_ROUTE =
  "the PR is merged: commit the DoD file and the Status History row on a docs-only branch off the " +
  "base branch and open a PR for it; never push the acceptance commit to the base branch";

function esc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// The newest numbered file: the highest `{N}` wins (a count would overwrite — obs #272).
function newestNumbered(files, re) {
  let best = null;
  for (const f of files) {
    const m = re.exec(f);
    if (m && (best === null || Number(m[1]) > best.n))
      best = { n: Number(m[1]), f };
  }
  return best ? best.f : null;
}

// ── gate ─────────────────────────────────────────────────────────────────────────────────────
function gateDecision(text) {
  const m = /^gate:[ \t]*['"]?([A-Z]+)/m.exec(text);
  return m ? m[1] : "";
}

// The waiver block: `waiver:` to the next unindented line, or the inline `waiver: { … }` form.
function waiverOf(text) {
  const lines = text.split("\n");
  const at = lines.findIndex((l) => /^waiver:/.test(l));
  if (at < 0) return { active: false, approvedBy: "" };
  // A YAML comment (`#` at the line start or after whitespace, outside a quoted scalar) is not a value:
  // `active: false # was active: true` is inactive, and `reason: x # approved_by: me` names no
  // approver. A quote opens a scalar only where a scalar can start (line start, after whitespace or one
  // of `:,[{-`), so the apostrophe in `owner's` or in a comment never hides the comment.
  const uncomment = (raw) => {
    const l = raw.replace(/\r$/, "");
    let q = "";
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      const prev = i === 0 ? " " : l[i - 1];
      if (q) {
        if (c === "\\" && q === '"') i++;
        else if (c === q) q = "";
      } else if ((c === '"' || c === "'") && /[\s:,[{-]/.test(prev)) q = c;
      else if (c === "#" && /\s/.test(prev)) return l.slice(0, i);
    }
    return l;
  };
  let block = uncomment(lines[at]);
  for (let i = at + 1; i < lines.length; i++) {
    if (/^\S/.test(lines[i]) && lines[i].trim() !== "") break;
    block += "\n" + uncomment(lines[i]);
  }
  const active = /\bactive:[ \t]*true\b/.test(block);
  const m =
    /\bapproved_by:[ \t]*(?:"([^"]*)"|'([^']*)'|([^\s,}][^,}\n]*))/.exec(block);
  const raw = m ? (m[1] ?? m[2] ?? m[3] ?? "").trim() : "";
  const approvedBy = /^(null|~|tbd|n\/a|-|—)$/i.test(raw) ? "" : raw;
  return { active, approvedBy };
}

// ── bug verdict ───────────────────────────────────────────────────────────────────────────────
// The verify loop's verdict: the FIRST word after the colon, bold stripped, exactly PASS. A
// template remnant (`PASS / FAIL`, `PASS|FAIL`, `PASS or FAIL`) is not a verdict. This is the rule
// the 7.7 block applies to the same line; one reader, two callers is the point.
function implementationVerdict(text) {
  const lines = text.split("\n").filter((l) => /^\*\*Verdict\*\*:/.test(l));
  if (lines.length === 0) return { ok: false, why: "no **Verdict**: line" };
  const rest = lines[lines.length - 1].replace(/^\*\*Verdict\*\*:[ \t]*/, "");
  const word = (/^\**([A-Za-z]+)/.exec(rest) || [])[1] || "";
  const after = rest.replace(/^\**[A-Za-z]+\**[ \t]*/, "");
  if (word !== "PASS")
    return {
      ok: false,
      why: `the last **Verdict**: is '${word || rest.trim()}', not PASS`,
    };
  if (/^(\/|\||PASS|FAIL|or(\s|$))/i.test(after)) {
    return {
      ok: false,
      why: "the last **Verdict**: line is a template remnant",
    };
  }
  return { ok: true };
}

// `#### QA Verification` → its last `**Verification Result**:` line. Only `✅ Fixed` counts, and
// the template's own placeholder (`✅ Fixed | ⚠️ Still Failing`) does not.
function qaVerificationResult(text) {
  const lines = text.split("\n");
  const at = lines.findIndex((l) => /^####\s+QA Verification\s*$/.test(l));
  if (at < 0) return { ok: false, why: "no #### QA Verification section" };
  let last = null;
  for (let i = at + 1; i < lines.length; i++) {
    if (/^#{1,4}\s/.test(lines[i])) break;
    if (/^\*\*Verification Result\*\*:/.test(lines[i])) last = lines[i];
  }
  if (last === null)
    return {
      ok: false,
      why: "no **Verification Result**: line under #### QA Verification",
    };
  const value = last
    .replace(/^\*\*Verification Result\*\*:[ \t]*/, "")
    .replace(/^\*+\s*/, "")
    .trim();
  const m = /^✅\s*Fixed\b(.*)$/.exec(value);
  if (!m)
    return {
      ok: false,
      why: `**Verification Result**: is '${value}', not ✅ Fixed`,
    };
  if (/^\s*(\||\/)|Still Failing/i.test(m[1])) {
    return {
      ok: false,
      why: "**Verification Result**: is the template's placeholder",
    };
  }
  return { ok: true };
}

const ARTIFACT =
  /\.(dod|implementation|qa|review|pr-review|handover|plan|request|gate)\./;

// The bug report itself: `{stem}.md` or `{stem}.{slug}.md`, never an artifact. Exactly one.
function findBugFile(dir, stem, names) {
  const hits = names.filter(
    (n) =>
      n.endsWith(".md") &&
      (n === `${stem}.md` || n.startsWith(`${stem}.`)) &&
      !ARTIFACT.test(n) &&
      !/sprint-review-summary\.md$/.test(n),
  );
  // `task.67.bug.3` must not claim `task.67.bug.31.x.md`: after the stem comes a dot then a slug
  // that does not begin with a digit-only segment continuing the id.
  const own = hits.filter(
    (n) => n === `${stem}.md` || !/^\d/.test(n.slice(stem.length + 1)),
  );
  return own;
}

function bugVerdict(dir, stem) {
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch (e) {
    return { reason: "unreadable", detail: `${dir}: ${e.code || e.message}` };
  }
  const reports = names.filter(
    (n) =>
      new RegExp(`^${esc(stem)}\\.implementation\\.\\d+\\..*\\.md$`).test(n) ||
      new RegExp(`^${esc(stem)}\\..*\\.implementation\\.\\d+\\..*\\.md$`).test(
        n,
      ),
  );
  const byNumber = (n) =>
    Number((/\.implementation\.(\d+)\./.exec(n) || [])[1] || 0);
  reports.sort((a, b) => byNumber(a) - byNumber(b));
  const report = reports.length ? reports[reports.length - 1] : null;
  const reportWhy = "no implementation report beside the bug";
  if (report) {
    let text;
    try {
      text = fs.readFileSync(path.join(dir, report), "utf8");
    } catch (e) {
      return {
        reason: "unreadable",
        detail: `${report}: ${e.code || e.message}`,
      };
    }
    const v = implementationVerdict(text);
    if (v.ok)
      return {
        reason: "ok",
        verdict: "PASS",
        basis: "implementation-report",
        file: report,
      };
    // A report that exists decides alone. The bug report's own line is the route for a fix with
    // NO report; it never overrides a verify loop that wrote FAIL (or wrote nothing readable).
    return { reason: "no-verdict", detail: `${report}: ${v.why}` };
  }
  const files = findBugFile(dir, stem, names);
  if (files.length !== 1) {
    return {
      reason: "no-verdict",
      detail: `${reportWhy}; ${files.length === 0 ? "no bug report" : "several bug reports"} found for ${stem}`,
    };
  }
  let text;
  try {
    text = fs.readFileSync(path.join(dir, files[0]), "utf8");
  } catch (e) {
    return {
      reason: "unreadable",
      detail: `${files[0]}: ${e.code || e.message}`,
    };
  }
  const q = qaVerificationResult(text);
  if (q.ok)
    return {
      reason: "ok",
      verdict: "PASS",
      basis: "qa-verification",
      file: files[0],
    };
  return {
    reason: "no-verdict",
    detail: `${reportWhy}; ${files[0]}: ${q.why}`,
  };
}

// ── check ─────────────────────────────────────────────────────────────────────────────────────
// The stem is built from doc-id.js, the one parser of work-item ids (tests/doc-id-chokepoint.test.js).
// A story or task bug names its parent in `id` and its own number in `seq`, so the bug stem is
// `{parent}.bug.{seq}`; a general bug's `id` is already `bug.{N}`.
function stemOf(docFile, kind) {
  const r = docId.parse(path.basename(docFile));
  if (!r.ok) return "";
  if (kind === "task" || kind === "story") return r.kind === kind ? r.id : "";
  if (r.kind === "bug") return r.id;
  return r.artifact === "bug" && r.seq ? `${r.id}.bug.${r.seq}` : "";
}

function check({
  doc,
  kind,
  pr,
  prState = "unknown",
  reviewDecision = "unknown",
}) {
  const stem = stemOf(doc, kind);
  if (!stem) {
    return {
      reason: "usage",
      detail: `${path.basename(doc)} is not a ${kind} document name`,
      exitCode: 2,
    };
  }
  const dir = path.dirname(doc);
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch (e) {
    return {
      reason: "unreadable",
      detail: `${dir}: ${e.code || e.message}`,
      exitCode: 1,
    };
  }
  const missing = [];
  const unverifiable = [];
  const satisfied = [];
  const miss = (input, detail) =>
    missing.push({
      input,
      detail,
      route: ROUTES[input].replace("{stem}", stem),
    });
  let basis = null;

  if (kind === "bug") {
    const v = bugVerdict(dir, stem);
    if (v.reason === "unreadable")
      return { reason: "unreadable", detail: v.detail, exitCode: 1 };
    if (v.reason === "ok") {
      satisfied.push("verdict");
      basis = v.basis;
    } else {
      miss("verdict", v.detail);
    }
  } else {
    const gateFile = newestNumbered(
      names,
      new RegExp(`^${esc(stem)}\\.gate\\.(\\d+)\\..*\\.yml$`),
    );
    if (!gateFile) {
      miss("gate", `no ${stem}.gate.*.yml beside the document`);
    } else {
      let text;
      try {
        text = fs.readFileSync(path.join(dir, gateFile), "utf8");
      } catch (e) {
        return {
          reason: "unreadable",
          detail: `${gateFile}: ${e.code || e.message}`,
          exitCode: 1,
        };
      }
      if (gateDecision(text) === "WAIVED") {
        const w = waiverOf(text);
        if (w.active && w.approvedBy) satisfied.push("waiver-approval");
        else
          miss(
            "waiver-approval",
            `${gateFile} is WAIVED without ${w.active ? "a non-empty approved_by" : "waiver.active: true"}`,
          );
      } else {
        satisfied.push("gate");
      }
    }
    const hasReview = newestNumbered(
      names,
      new RegExp(`^${esc(stem)}\\.pr-review\\.(\\d+)\\..*\\.md$`),
    );
    if (hasReview || reviewDecision === "APPROVED") satisfied.push("review");
    else if (reviewDecision === "unknown") {
      unverifiable.push({
        input: "review",
        detail:
          "no pr-review report, and the host's review decision could not be read",
      });
    } else {
      miss(
        "review",
        `no ${stem}.pr-review.*.md, and the review decision is '${reviewDecision}'`,
      );
    }
  }

  if (!pr) miss("pr", "no pull request was resolved for this document");
  else if (prState === "CLOSED")
    miss("pr-closed", `PR #${pr} is CLOSED and not merged`);
  else if (prState === "unknown")
    unverifiable.push({
      input: "pr-state",
      detail: `PR #${pr}'s state could not be read`,
    });
  else satisfied.push("pr");

  const out = {
    reason: missing.length ? "missing" : "ok",
    kind,
    stem,
    missing,
    unverifiable,
    satisfied,
    exitCode: missing.length ? 1 : 0,
  };
  if (basis) out.basis = basis;
  if (kind === "bug" && prState === "MERGED") {
    out.postMerge = true;
    out.acceptanceCommit = POST_MERGE_BUG_ROUTE;
  }
  return out;
}

// ── CLI ───────────────────────────────────────────────────────────────────────────────────────
function render(r) {
  if (r.reason === "ok") {
    const lines = [`finalise preconditions: ok (${r.kind} ${r.stem})`];
    if (r.basis) lines.push(`  verdict basis: ${r.basis}`);
    for (const u of r.unverifiable)
      lines.push(`  unverifiable: ${u.input} — ${u.detail}`);
    if (r.postMerge) lines.push(`  post-merge route: ${r.acceptanceCommit}`);
    return lines.join("\n");
  }
  if (r.reason !== "missing")
    return `finalise preconditions: ${r.reason} — ${r.detail}`;
  const lines = [
    `finalise preconditions: ${r.missing.length} input(s) missing for ${r.kind} ${r.stem}`,
  ];
  for (const m of r.missing) {
    lines.push(`  missing ${m.input}: ${m.detail}`, `    route: ${m.route}`);
  }
  for (const u of r.unverifiable)
    lines.push(`  unverifiable: ${u.input} — ${u.detail}`);
  if (r.postMerge) lines.push(`  post-merge route: ${r.acceptanceCommit}`);
  return lines.join("\n");
}

function parseArgs(argv) {
  const a = { json: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = () => {
      if (i + 1 >= argv.length) throw new Error(`${k} needs a value`);
      return argv[++i];
    };
    if (k === "--json") a.json = true;
    else if (k === "--doc") a.doc = v();
    else if (k === "--kind") a.kind = v();
    else if (k === "--pr") a.pr = v();
    else if (k === "--pr-state") a.prState = v();
    else if (k === "--review-decision") a.reviewDecision = v();
    else if (k === "--dir") a.dir = v();
    else if (k === "--stem") a.stem = v();
    else throw new Error(`unknown argument '${k}'`);
  }
  return a;
}

// Sets the exit code and returns; process.exit() after a write truncates a piped payload at ~64KB
// (bug.3.stdout-truncation-on-exit; guarded by stdout-drain-on-exit.test.mjs).
function emit(r, json) {
  const code = r.exitCode ?? (r.reason === "ok" ? 0 : 1);
  process.stdout.write(
    (json ? JSON.stringify({ ...r, exitCode: code }, null, 2) : render(r)) +
      "\n",
  );
  process.exitCode = code;
}

function main(argv) {
  const cmd = argv[0];
  let a;
  try {
    a = parseArgs(argv.slice(1));
  } catch (e) {
    return emit(
      { reason: "usage", detail: e.message, exitCode: 2 },
      argv.includes("--json"),
    );
  }
  if (cmd === "check") {
    if (!a.doc || !["story", "task", "bug"].includes(a.kind)) {
      return emit(
        {
          reason: "usage",
          detail: "check needs --doc and --kind story|task|bug",
          exitCode: 2,
        },
        a.json,
      );
    }
    if (a.pr !== undefined && !/^[1-9][0-9]*$/.test(a.pr)) {
      return emit(
        {
          reason: "usage",
          detail: `--pr '${a.pr}' is not a positive integer`,
          exitCode: 2,
        },
        a.json,
      );
    }
    if (
      a.prState !== undefined &&
      !["OPEN", "MERGED", "CLOSED", "unknown"].includes(a.prState)
    ) {
      return emit(
        {
          reason: "usage",
          detail: `--pr-state '${a.prState}' is not OPEN|MERGED|CLOSED|unknown`,
          exitCode: 2,
        },
        a.json,
      );
    }
    return emit(
      check({
        doc: a.doc,
        kind: a.kind,
        pr: a.pr,
        prState: a.prState,
        reviewDecision: a.reviewDecision || "unknown",
      }),
      a.json,
    );
  }
  if (cmd === "bug-verdict") {
    if (!a.dir || !a.stem) {
      return emit(
        {
          reason: "usage",
          detail: "bug-verdict needs --dir and --stem",
          exitCode: 2,
        },
        a.json,
      );
    }
    const r = bugVerdict(a.dir, a.stem);
    return emit({ ...r, exitCode: r.reason === "ok" ? 0 : 1 }, a.json);
  }
  return emit(
    {
      reason: "usage",
      detail: "usage: check | bug-verdict (see the file header)",
      exitCode: 2,
    },
    a ? a.json : false,
  );
}

if (require.main === module) main(process.argv.slice(2));

module.exports = {
  check,
  bugVerdict,
  implementationVerdict,
  qaVerificationResult,
  waiverOf,
  ROUTES,
};
