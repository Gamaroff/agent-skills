#!/usr/bin/env node
// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/finalise-rerun-scope.js. Regenerate via `npm run bundle`.
/**
 * finalise-rerun-scope — give a `/finalise` re-run a fixed scope (task 242).
 *
 * The AC traceability agent judged every criterion from scratch on every run,
 * and each run judged them more finely than the last. task.239 ran `/finalise`
 * five times: run 5 failed SC-11 on three assertion groups no earlier run had
 * named, on a tree whose only change since run 4 was the task document
 * (observation #121). Nothing kept a machine-readable record of what the last
 * run passed, so nothing could be carried.
 *
 * Two commands:
 *
 *   scope  — read the newest prior AC record and decide what this run re-judges.
 *            `full` (judge everything — today's behaviour) or `scoped` (re-judge
 *            the reported gaps, the criteria whose text or evidence changed, and
 *            carry every other verdict). Every doubt fails toward `full`.
 *   merge  — enforce the scope on the agent's YAML: restore every carried verdict
 *            whatever the agent said, send a differing verdict to `advisories[]`,
 *            recompute `overall`, and build this run's record.
 *
 * Peer of `tracker-comment.js` and `registry-tick.js`: `--json` prints a
 * `reason`, every answer exits 0, and only a usage error exits 2. Read `mode`
 * and `reason`, never the exit code alone.
 *
 * The record (`{STEM}.dod.{N}.ac.json`, schema 1) is the only state `scope`
 * reads. It holds the head the agents read, and per criterion its engine id,
 * text hash, verdict, citations and — for a quantified criterion — members.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const { parseYamlSubset } = require("./yaml-subset.js");
const { extractSection } = require("./jira-sync.js");

const SCHEMA = 1;

// The four reasons a run is `full`, plus `no-criteria`: a document whose
// criteria section yields no line the engine can key has nothing to carry, and
// a scoped run over zero criteria would send every agent verdict to advisories.
const FULL_REASONS = Object.freeze([
  "no-prior-record",
  "prior-unreadable",
  "reopened",
  "head-not-ancestor",
  "no-criteria",
]);

// The six per-criterion outcomes of a scoped run (task § 3's table).
const CRITERION_REASONS = Object.freeze([
  "new-criterion",
  "criterion-changed",
  "reported-gap",
  "evidence-changed",
  "evidence-unresolved",
  "unchanged",
]);

// ── criteria ────────────────────────────────────────────────────────────────

// A criterion is a top-level checkbox line (tasks, and stories that use them)
// or a top-level numbered item (stories). Indented lines are sub-points of the
// criterion above them and are not criteria of their own.
const RE_CHECKBOX = /^[-*]\s+\[[ xX]\]\s+(.*)$/;
const RE_NUMBERED = /^\d+[.)]\s+(.*)$/;
// A leading id the document wrote itself: `SC-7:`, `AC3.`, `**AC1**:`, `SC-12 —`.
const RE_LEADING_ID =
  /^(?:\*\*)?([A-Z]{1,6}-?\d+[A-Za-z]?)(?:\*\*)?\s*(?:[:.)—–-]|\*\*)\s*/;

function normaliseText(text) {
  return String(text).replace(/\s+/g, " ").trim();
}

function hashText(text) {
  return crypto
    .createHash("sha256")
    .update(normaliseText(text), "utf8")
    .digest("hex");
}

/**
 * Read the criteria of a story or task document. Returns
 * `[{ id, text, text_hash }]` in document order, or `[]` when the section is
 * absent or holds no criterion line. The id is the document's own leading id
 * when the line has one, else `#N` by position — and once any criterion carries
 * an id, an id-less sibling still gets `#N`, so every criterion has exactly one.
 */
function readCriteria(body) {
  const section =
    extractSection(body, "Success Criteria") ??
    extractSection(body, "Acceptance Criteria");
  if (section === null) return [];
  const out = [];
  for (const line of section.split("\n")) {
    const m = RE_CHECKBOX.exec(line) || RE_NUMBERED.exec(line);
    if (!m) continue;
    const text = normaliseText(m[1]);
    if (!text) continue;
    const idMatch = RE_LEADING_ID.exec(text);
    const id = idMatch ? idMatch[1] : `#${out.length + 1}`;
    out.push({ id, text, text_hash: hashText(text) });
  }
  return out;
}

function frontmatterStatus(body) {
  const fm = /^---\n([\s\S]*?)\n---/.exec(String(body));
  if (!fm) return null;
  const m = /^status:\s*['"]?([^'"\n]+?)['"]?\s*$/m.exec(fm[1]);
  return m ? m[1].trim() : null;
}

// `/finalise` Step 2's reopen rule, read the same way: a body that already
// carries an acceptance block while its status is not `accepted` was reopened,
// and a reopened document is new work.
function isReopened(body) {
  const prior = String(body)
    .split("\n")
    .filter((l) => /^## Definition of Done.*(PASSED|✅)/.test(l)).length;
  return prior > 0 && frontmatterStatus(body) !== "accepted";
}

// ── citations ───────────────────────────────────────────────────────────────

/**
 * Resolve the paths a citation names. A token contributes a path only when it
 * resolves to a tracked file, or to one gone since the prior head: a
 * repo-relative path as written; a bare basename exactly one file at HEAD
 * carries; or, when any gone path carries the basename, every file that does.
 * An abbreviated `:N-M`, a commit SHA, a basename only HEAD carries more than
 * once and `NOT_APPLICABLE: …` resolve to nothing.
 */
function resolveCitation(citation, tracked) {
  if (citation === null || citation === undefined) return [];
  const s = String(citation).trim();
  if (!s || /^NOT_APPLICABLE\b/i.test(s)) return [];
  const out = new Set();
  for (const raw of s.split(/[\s;,]+/)) {
    const token = raw
      .replace(/^[`'"(\[]+|[`'")\],.]+$/g, "")
      .replace(/:.*$/, "");
    if (!token) continue;
    if (tracked.paths.has(token)) {
      out.add(token);
      continue;
    }
    if (token.includes("/")) continue;
    // A bare basename a path gone since the prior head also carries was
    // ambiguous when the prior run cited it: it resolves to every candidate,
    // and the gone one counts as changed, so the criterion is re-judged rather
    // than carried on a guess (QA cycle 4, CR4-1). Otherwise it resolves only
    // when exactly one file at HEAD carries it.
    const hits = tracked.byBase.get(token) || [];
    const gone = (tracked.goneByBase && tracked.goneByBase.get(token)) || [];
    if (gone.length > 0) for (const p of [...hits, ...gone]) out.add(p);
    else if (hits.length === 1) out.add(hits[0]);
  }
  return [...out];
}

// The paths a citation may resolve to: the files tracked at HEAD, plus every
// path that changed since the prior head. A cited file deleted or renamed
// since then is in the second set only; without it the citation resolved to
// nothing and the criterion's other, unchanged paths carried it (task.242 QA
// cycle 2, CR2-3). The gone paths keep their own basename map: merged into
// HEAD's, a file moved under the same name (src/b.js → lib/b.js) made its
// bare basename ambiguous, and the move was carried (QA cycle 3, CR3-1);
// kept apart, resolveCitation fails a shared basename toward re-judge (CR4-1).
function evidenceIndex(trackedPaths, changed) {
  const head = trackedIndex(trackedPaths);
  const gone = [...changed].filter((p) => !head.paths.has(p));
  for (const p of gone) head.paths.add(p);
  return { ...head, goneByBase: trackedIndex(gone).byBase };
}

function trackedIndex(paths) {
  const byBase = new Map();
  for (const p of paths) {
    const b = path.posix.basename(p);
    if (!byBase.has(b)) byBase.set(b, []);
    byBase.get(b).push(p);
  }
  return { paths: new Set(paths), byBase };
}

function entryPaths(entry, tracked) {
  const paths = [
    ...resolveCitation(entry.code_citation, tracked),
    ...resolveCitation(entry.test_citation, tracked),
  ];
  for (const m of Array.isArray(entry.members) ? entry.members : []) {
    paths.push(...resolveCitation(m && m.evidence, tracked));
  }
  return [...new Set(paths)];
}

// A member's evidence: `changed`, `unresolved` or `unchanged`.
function memberEvidence(member, tracked, changed) {
  const paths = resolveCitation(member && member.evidence, tracked);
  if (paths.length === 0) return "unresolved";
  return paths.some((p) => changed.has(p)) ? "changed" : "unchanged";
}

// ── git ─────────────────────────────────────────────────────────────────────

function git(cwd, args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

const DIFF_NAMES = ["diff", "--name-only", "--no-renames", "-z"];
const nameList = (s) => s.split("\0").filter(Boolean);

function gitIo(cwd) {
  return {
    revParse: (ref) =>
      git(cwd, ["rev-parse", "--verify", `${ref}^{commit}`]).trim(),
    isAncestor: (a, b) => {
      try {
        git(cwd, ["merge-base", "--is-ancestor", a, b]);
        return true;
      } catch {
        return false;
      }
    },
    // Committed changes since the prior head, plus the tracked files the
    // working tree has changed since HEAD. A superset of the committed diff,
    // so an uncommitted edit to a cited file re-judges rather than carries.
    // --no-renames: a rename is listed under both names, so a citation of the
    // old name is seen as changed (CR2-3). -z: raw names, as `tracked` reads
    // them; a C-quoted non-ASCII name never matched a citation (QA cycle 3,
    // CR3-2).
    changed: (from, to) =>
      new Set([
        ...nameList(git(cwd, [...DIFF_NAMES, from, to])),
        ...nameList(git(cwd, [...DIFF_NAMES, "HEAD"])),
      ]),
    // The tracked files the working tree has changed since HEAD: what this
    // run's agents read and the head does not hold (CR2-4).
    dirty: () => nameList(git(cwd, [...DIFF_NAMES, "HEAD"])),
    tracked: () => nameList(git(cwd, ["ls-files", "-z"])),
  };
}

// ── scope ───────────────────────────────────────────────────────────────────

function fullScope(reason, criteria, head, extra = {}) {
  return {
    reason,
    exitCode: 0,
    mode: "full",
    head,
    criteria,
    rejudge: criteria.map((c) => ({ id: c.id, reason: "full" })),
    carry: [],
    ...extra,
  };
}

/**
 * Decide what this run re-judges.
 *
 * @param {object} input
 * @param {string|null} input.priorText  the prior record's raw text, or null when there is none
 * @param {string}      input.priorPath  the prior record's path, for messages
 * @param {string}      input.docBody    the document's text
 * @param {string}      input.head       the commit this run's agents read
 * @param {object}      io               { isAncestor, changed, tracked } — gitIo(cwd) in the CLI
 */
function scope(input, io) {
  const s = scopeOf(input, io);
  // What the agents of THIS run will read beyond the head. merge copies it into
  // the record, and the next scope treats it as changed: a verdict made on an
  // uncommitted edit that is later discarded is not carried (CR2-4).
  return { ...s, dirty: io.dirty ? io.dirty() : [] };
}

function scopeOf(input, io) {
  const criteria = readCriteria(input.docBody);
  const head = input.head;
  if (input.priorText === null || input.priorText === undefined) {
    return fullScope("no-prior-record", criteria, head);
  }
  let prior;
  try {
    prior = JSON.parse(input.priorText);
  } catch {
    return fullScope("prior-unreadable", criteria, head, {
      prior_path: input.priorPath,
    });
  }
  if (
    !prior ||
    prior.schema !== SCHEMA ||
    typeof prior.head !== "string" ||
    !/^[0-9a-f]{40}$/.test(prior.head) ||
    !Array.isArray(prior.criteria)
  ) {
    return fullScope("prior-unreadable", criteria, head, {
      prior_path: input.priorPath,
    });
  }
  if (isReopened(input.docBody)) {
    return fullScope("reopened", criteria, head, {
      prior_path: input.priorPath,
    });
  }
  if (!io.isAncestor(prior.head, head)) {
    return fullScope("head-not-ancestor", criteria, head, {
      prior_path: input.priorPath,
      prior_head: prior.head,
    });
  }
  if (criteria.length === 0) {
    return fullScope("no-criteria", criteria, head, {
      prior_path: input.priorPath,
    });
  }

  const changed = io.changed(prior.head, head);
  // The prior run's agents also read these, uncommitted; HEAD may no longer
  // hold what they read, so they count as changed (CR2-4).
  for (const p of Array.isArray(prior.dirty_paths) ? prior.dirty_paths : [])
    if (typeof p === "string" && p) changed.add(p);
  const tracked = evidenceIndex(io.tracked(), changed);
  // Match by id when the document wrote ids, else by text hash: an id-less
  // criterion's `#N` moves when a sibling is inserted, its text does not.
  const hasIds = criteria.some((c) => !c.id.startsWith("#"));
  const priorById = new Map(prior.criteria.map((p) => [p.id, p]));
  const priorByHash = new Map(prior.criteria.map((p) => [p.text_hash, p]));

  const rejudge = [];
  const carry = [];
  const carriedPrior = {};
  for (const c of criteria) {
    const p = hasIds ? priorById.get(c.id) : priorByHash.get(c.text_hash);
    if (!p) {
      rejudge.push({ id: c.id, reason: "new-criterion" });
      continue;
    }
    if (p.text_hash !== c.text_hash) {
      rejudge.push({ id: c.id, reason: "criterion-changed" });
      continue;
    }
    if (p.status !== "PASS") {
      const members = Array.isArray(p.members) ? p.members : [];
      const carried = members.filter(
        (m) =>
          m &&
          m.status === "PASS" &&
          memberEvidence(m, tracked, changed) === "unchanged",
      );
      const carriedNames = new Set(carried.map((m) => m.member));
      rejudge.push({
        id: c.id,
        reason: "reported-gap",
        prior: { ...p, id: c.id },
        known_members: members.map((m) => m && m.member).filter(Boolean),
        carried_members: carried,
        rejudge_members: members
          .filter((m) => m && !carriedNames.has(m.member))
          .map((m) => m.member),
      });
      continue;
    }
    const paths = entryPaths(p, tracked);
    if (paths.some((x) => changed.has(x))) {
      rejudge.push({
        id: c.id,
        reason: "evidence-changed",
        paths: paths.filter((x) => changed.has(x)),
      });
    } else if (paths.length === 0) {
      rejudge.push({ id: c.id, reason: "evidence-unresolved" });
    } else {
      carry.push({ id: c.id, reason: "unchanged" });
      carriedPrior[c.id] = { ...p, id: c.id };
    }
  }
  return {
    reason: "prior-record",
    exitCode: 0,
    mode: "scoped",
    head,
    prior_path: input.priorPath,
    prior_head: prior.head,
    criteria,
    changed: [...changed].sort(),
    rejudge,
    carry,
    carried_prior: carriedPrior,
  };
}

/** The text substituted for `<RERUN_SCOPE>` in the AC prompt. */
function renderScopeText(s) {
  const quoteId = (id) => JSON.stringify(id);
  const textOf = new Map(s.criteria.map((c) => [c.id, c.text]));
  const short = (id) => {
    const t = textOf.get(id) || "";
    return t.length > 80 ? `${t.slice(0, 77)}…` : t;
  };
  const lines = [];
  if (s.mode === "full") {
    lines.push(`mode: full (${s.reason})`);
    if (s.criteria.length === 0) {
      lines.push(
        "No criterion line was read from the document. Judge every criterion, as in Step 3, with your own ids.",
      );
      return lines.join("\n");
    }
    lines.push(
      "Judge every criterion, as in Step 3. Use these ids as `ac_id`, quoted exactly:",
    );
    for (const c of s.criteria)
      lines.push(`- ${quoteId(c.id)}: ${short(c.id)}`);
    return lines.join("\n");
  }
  lines.push(
    `mode: scoped (prior record ${s.prior_path} at ${String(s.prior_head).slice(0, 12)})`,
  );
  lines.push("Use these ids as `ac_id`, quoted exactly. Re-judge:");
  for (const r of s.rejudge) {
    let line = `- ${quoteId(r.id)} (${r.reason}): ${short(r.id)}`;
    if (r.reason === "reported-gap" && r.prior && r.prior.non_member_fail) {
      line += `\n  prior non-member FAIL (re-check it): ${r.prior.non_member_fail}`;
    }
    if (r.reason === "reported-gap" && r.known_members.length > 0) {
      const carried = r.carried_members.map((m) => m.member);
      line += `\n  re-check members: ${r.rejudge_members.join("; ") || "(none)"}`;
      if (carried.length)
        line += `\n  carried members (do not re-judge): ${carried.join("; ")}`;
    }
    lines.push(line);
  }
  if (s.carry.length) {
    lines.push(
      "Carry (copy through unchanged; anything you see in one goes to `advisories`):",
    );
    for (const c of s.carry) lines.push(`- ${quoteId(c.id)}: ${short(c.id)}`);
  }
  return lines.join("\n");
}

// ── merge ───────────────────────────────────────────────────────────────────

function computeOverall(acs, docs) {
  // No criterion verdict at all is not "every criterion passed".
  if (acs.length === 0) return "NEEDS_MANUAL_REVIEW";
  const docOk = (d) =>
    d && (d.status === "PASS" || d.status === "NOT_APPLICABLE");
  const allPass = acs.every((a) => a.status === "PASS") && docs.every(docOk);
  if (allPass) return "PASS";
  if (acs.length > 0 && !acs.some((a) => a.status === "PASS")) return "FAIL";
  return "PARTIAL";
}

function recordEntry(c, ac) {
  return {
    id: c.id,
    text_hash: c.text_hash,
    status: ac.status === "PASS" ? "PASS" : "FAIL",
    description: ac.description ?? null,
    code_citation: ac.code_citation ?? null,
    test_citation: ac.test_citation ?? null,
    members: Array.isArray(ac.members) ? ac.members : [],
    // Why a FAIL rested on something other than a member (CR2-2). Kept so the
    // next run's scope can name it, and is only meaningful beside a FAIL.
    non_member_fail: ac.status === "PASS" ? null : nonMemberFail(ac),
    note: ac.note ?? null,
  };
}

// The agent's structured reason for a FAIL that is not a member: a non-empty
// string, or null. A note cannot be parsed; this field is what the merge reads.
function nonMemberFail(ac) {
  const v = ac && ac.non_member_fail;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

// Re-judge a `reported-gap` criterion member by member (task § 3, *Members in
// a reported-gap re-judge*). Carried members keep their prior verdict; prior
// FAIL members and members whose evidence moved take the agent's (FAIL when it
// does not answer one); a member the prior record never listed, whose evidence
// is unchanged, is an advisory. The status is computed from the counted
// members, except that an agent FAIL stands when the members do not explain it
// (task.242 QA cycle 1, CR-3, CR-4).
function mergeReportedGap(r, agentAc, io, advisories) {
  const prior = r.prior;
  // No verdict for a gap: the prior FAIL stands, member-shaped or not. Carried
  // members alone cannot clear it — the prior FAIL may rest on no member at all
  // (task.242 QA cycle 2, CR2-1).
  if (!agentAc) {
    return {
      ...prior,
      ac_id: r.id,
      status: "FAIL",
      note: `no verdict returned for ${r.id}; prior FAIL stands`,
    };
  }
  if (r.known_members.length === 0) {
    // The prior gap was not member-shaped: an ordinary re-judge.
    return { ...agentAc, ac_id: r.id };
  }
  const agentMembers = new Map(
    (Array.isArray(agentAc.members) ? agentAc.members : [])
      .filter((m) => m && m.member)
      .map((m) => [m.member, m]),
  );
  const carried = new Map(r.carried_members.map((m) => [m.member, m]));
  const known = new Set(r.known_members);
  const counted = [];
  for (const m of prior.members) {
    if (!m || !m.member) continue;
    const a = agentMembers.get(m.member);
    if (carried.has(m.member)) {
      counted.push(m);
      if (a && a.status !== m.status) {
        advisories.push({
          ac_id: r.id,
          note: `agent re-judged carried member ${m.member} as ${a.status}${a.evidence ? ` (${a.evidence})` : ""}`,
        });
      }
    } else if (a) {
      counted.push(a);
    } else {
      // Listed for re-check and not answered: the prior verdict rests on
      // evidence that moved (or was a FAIL), so it is not carried.
      counted.push({
        ...m,
        status: "FAIL",
        note: `no verdict returned for re-check member ${m.member}`,
      });
    }
  }
  for (const [name, a] of agentMembers) {
    if (known.has(name)) continue;
    const evidence = io.memberEvidence(a);
    if (evidence === "unchanged") {
      advisories.push({
        ac_id: r.id,
        note: `new member ${name} judged ${a.status} on unchanged evidence${a.evidence ? ` (${a.evidence})` : ""}${a.note ? `: ${a.note}` : ""}`,
      });
    } else {
      counted.push(a);
    }
  }
  const code = agentAc.code_citation ?? prior.code_citation ?? null;
  const test = agentAc.test_citation ?? prior.test_citation ?? null;
  // The members may overturn an agent FAIL only when the members explain it:
  // every member the agent failed is carried or was sent to advisories, AND
  // the agent named no non-member reason. A FAIL that names no failing member,
  // or that carries `non_member_fail`, rests on something else (the execution
  // rule, a test that does not cover the criterion), and stands. The field is
  // what tells "failed because of finer member G7" (task.239: overturned) from
  // "failed for X, and also listed G7" (stands) — a note cannot be parsed
  // (task.242 QA cycle 2, CR2-2).
  const agentFailed = agentAc.status !== "PASS";
  const agentFailMembers = [...agentMembers.values()].filter(
    (m) => m.status !== "PASS",
  );
  const explainedByMembers =
    !nonMemberFail(agentAc) &&
    agentFailMembers.length > 0 &&
    agentFailMembers.every(
      (m) => carried.has(m.member) || !known.has(m.member),
    );
  const pass =
    counted.length > 0 &&
    counted.every((m) => m.status === "PASS") &&
    code !== null &&
    test !== null &&
    agentAc.test_runs_per_pr !== false &&
    (!agentFailed || explainedByMembers);
  // An overturned FAIL keeps the agent's own words, as an advisory.
  if (pass && agentFailed && agentAc.note) {
    advisories.push({
      ac_id: r.id,
      note: `agent's FAIL overturned by the merged members: ${agentAc.note}`,
    });
  }
  return {
    ...agentAc,
    ac_id: r.id,
    description: agentAc.description ?? prior.description ?? null,
    status: pass ? "PASS" : "FAIL",
    code_citation: code,
    test_citation: test,
    members: counted,
    note: pass
      ? `PASS from merged members (${counted.length} counted)${agentFailed ? `; agent's FAIL rested on carried or advisory members` : ""}`
      : (agentAc.note ?? prior.note ?? null),
  };
}

/**
 * Enforce a scope on the AC agent's YAML.
 *
 * @param {object} s           the `scope` result
 * @param {string} agentYaml   the AC agent's raw YAML
 * @param {object} opts        { dodN, document }
 * @param {object} io          { tracked } — the CLI passes gitIo(cwd)
 */
function merge(s, agentYaml, opts, io) {
  let parsed;
  try {
    parsed = parseYamlSubset(String(agentYaml));
  } catch (err) {
    return {
      reason: "result-unparseable",
      exitCode: 0,
      mode: s.mode,
      message: String(err && err.message),
    };
  }
  const ac = parsed && (parsed.ac_traceability ?? parsed);
  if (!ac || typeof ac !== "object" || !Array.isArray(ac.acs)) {
    return {
      reason: "result-unparseable",
      exitCode: 0,
      mode: s.mode,
      message: "no ac_traceability.acs list in the agent's output",
    };
  }
  const docs = Array.isArray(ac.docs) ? ac.docs : [];
  const advisories = (Array.isArray(ac.advisories) ? ac.advisories : []).filter(
    (a) => a && typeof a === "object",
  );
  const changed = new Set(s.changed || []);
  // A new member's evidence is this run's agent citing HEAD, so a gone path
  // cannot be what it meant: its bare basename resolves against HEAD alone.
  // The gone-candidate rule is for the prior record's citations, written
  // before the deletion (QA cycle 5, CR5-1).
  const atHead = { ...evidenceIndex(io.tracked(), changed), goneByBase: null };
  const mio = { memberEvidence: (m) => memberEvidence(m, atHead, changed) };

  // Zero criteria: nothing to key on, so the agent's verdicts pass through.
  if (s.criteria.length === 0) {
    const acs = ac.acs.filter((a) => a && typeof a === "object");
    return finish(s, ac, acs, docs, advisories, [], [], opts);
  }

  const engineIds = new Set(s.criteria.map((c) => c.id));
  const agentById = new Map();
  const idMismatches = [];
  for (const a of ac.acs) {
    if (!a || typeof a !== "object") continue;
    const id = a.ac_id === undefined || a.ac_id === null ? "" : String(a.ac_id);
    if (engineIds.has(id)) {
      agentById.set(id, a);
      continue;
    }
    idMismatches.push(id || "(none)");
    advisories.push({
      ac_id: id || "(none)",
      note: `agent returned an id the engine did not issue (${a.status ? a.status : "no status"}${a.note ? `: ${a.note}` : ""}); not merged`,
    });
  }

  const rejudgeById = new Map(s.rejudge.map((r) => [r.id, r]));
  const acs = [];
  const entries = [];
  for (const c of s.criteria) {
    const agentAc = agentById.get(c.id);
    let merged;
    if (s.mode === "scoped" && s.carried_prior && s.carried_prior[c.id]) {
      const p = s.carried_prior[c.id];
      merged = {
        ac_id: c.id,
        description: p.description,
        status: p.status,
        code_citation: p.code_citation,
        test_citation: p.test_citation,
        members: p.members || [],
        note: p.note,
        carried: true,
      };
      if (agentAc && agentAc.status !== p.status) {
        advisories.push({
          ac_id: c.id,
          note: `agent re-judged a carried criterion as ${agentAc.status}${agentAc.note ? `: ${agentAc.note}` : ""}`,
        });
      }
    } else if (
      s.mode === "scoped" &&
      rejudgeById.get(c.id) &&
      rejudgeById.get(c.id).reason === "reported-gap"
    ) {
      merged = mergeReportedGap(
        rejudgeById.get(c.id),
        agentAc,
        mio,
        advisories,
      );
    } else if (agentAc) {
      merged = { ...agentAc, ac_id: c.id };
    } else {
      merged = {
        ac_id: c.id,
        description: c.text.slice(0, 80),
        status: "FAIL",
        code_citation: null,
        test_citation: null,
        note: `no verdict returned under id ${c.id}`,
      };
    }
    acs.push(merged);
    entries.push(recordEntry(c, merged));
  }
  return finish(s, ac, acs, docs, advisories, idMismatches, entries, opts);
}

function finish(s, ac, acs, docs, advisories, idMismatches, entries, opts) {
  const overall = computeOverall(acs, docs);
  const carried = s.mode === "scoped" ? s.carry.length : 0;
  const rejudged =
    s.mode === "scoped" ? s.rejudge.length : s.criteria.length || acs.length;
  const rerunScope = { mode: s.mode, reason: s.reason, rejudged, carried };
  const acResult = {
    ac_traceability: {
      ...ac,
      acs,
      docs,
      advisories,
      overall,
      ...(ac.overall !== undefined && ac.overall !== overall
        ? { agent_overall: ac.overall }
        : {}),
      id_mismatches: idMismatches,
      rerun_scope: rerunScope,
    },
  };
  const record = {
    schema: SCHEMA,
    dod_n: opts.dodN ?? null,
    head: s.head,
    // Tracked files the agents read uncommitted at this run (scope time). The
    // next scope counts them as changed, so a verdict resting on an edit that
    // never reached a commit is re-judged rather than carried (CR2-4).
    dirty_paths: Array.isArray(s.dirty) ? s.dirty : [],
    document: opts.document ?? null,
    scope: rerunScope,
    criteria: entries.length
      ? entries
      : acs.map((a) =>
          recordEntry({ id: String(a.ac_id ?? ""), text_hash: null }, a),
        ),
    advisories,
  };
  return {
    reason: "merged",
    exitCode: 0,
    mode: s.mode,
    scope_line: `**Re-run scope:** ${s.mode} (${s.reason}) — ${rejudged} re-judged, ${carried} carried`,
    ac_result: acResult,
    record,
  };
}

// ── CLI ─────────────────────────────────────────────────────────────────────

const USAGE = [
  "usage:",
  "  finalise-rerun-scope.js scope --doc <document> --head <rev> [--prior <record.ac.json>] [--json]",
  "  finalise-rerun-scope.js merge --scope <scope.json> --result <agent.yaml> [--dod-n <N>] [--record-out <path>] [--json]",
].join("\n");

function parseArgs(argv) {
  const out = { cmd: argv[0], json: false };
  const takes = new Set([
    "--doc",
    "--head",
    "--prior",
    "--scope",
    "--result",
    "--dod-n",
    "--record-out",
    "--cwd",
  ]);
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (takes.has(a)) {
      const v = argv[i + 1];
      // `--prior ""` is a real answer (no prior record), so an empty value is
      // kept; only a missing value or another flag in its place is refused.
      if (v === undefined || /^--/.test(v))
        return { ...out, error: `${a} requires a value` };
      out[a.slice(2).replace(/-([a-z])/g, (_, ch) => ch.toUpperCase())] = v;
      i++;
    } else return { ...out, error: `unknown argument: ${a}` };
  }
  return out;
}

function emit(json, payload) {
  if (json) process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  else if (payload.mode && payload.reason !== "usage") {
    process.stdout.write(
      `${payload.mode} (${payload.reason})${payload.scope_text ? `\n${payload.scope_text}` : ""}\n`,
    );
  } else process.stdout.write(`${payload.reason}: ${payload.message || ""}\n`);
  process.exitCode = payload.exitCode;
}

function usage(json, message) {
  emit(json, { reason: "usage", exitCode: 2, message: `${message}\n${USAGE}` });
}

function main(argv) {
  const opts = parseArgs(argv);
  if (opts.error) return usage(opts.json, opts.error);
  const cwd = opts.cwd || process.cwd();
  const io = gitIo(cwd);
  if (opts.cmd === "scope") {
    if (!opts.doc || !opts.head)
      return usage(opts.json, "scope needs --doc and --head");
    let docBody;
    try {
      docBody = fs.readFileSync(path.resolve(cwd, opts.doc), "utf8");
    } catch {
      return usage(opts.json, `--doc not readable: ${opts.doc}`);
    }
    let head;
    try {
      head = io.revParse(opts.head);
    } catch {
      return usage(opts.json, `--head is not a commit: ${opts.head}`);
    }
    let priorText = null;
    if (opts.prior) {
      try {
        priorText = fs.readFileSync(path.resolve(cwd, opts.prior), "utf8");
      } catch {
        priorText = null;
      }
    }
    const s = scope(
      { priorText, priorPath: opts.prior || null, docBody, head },
      io,
    );
    s.document = opts.doc;
    s.scope_text = renderScopeText(s);
    return emit(opts.json, s);
  }
  if (opts.cmd === "merge") {
    if (!opts.scope || !opts.result)
      return usage(opts.json, "merge needs --scope and --result");
    let s;
    let agentYaml;
    try {
      s = JSON.parse(fs.readFileSync(path.resolve(cwd, opts.scope), "utf8"));
    } catch {
      return usage(
        opts.json,
        `--scope is not a readable scope result: ${opts.scope}`,
      );
    }
    if (
      !s ||
      !Array.isArray(s.criteria) ||
      !["full", "scoped"].includes(s.mode)
    ) {
      return usage(opts.json, `--scope is not a scope result: ${opts.scope}`);
    }
    try {
      agentYaml = fs.readFileSync(path.resolve(cwd, opts.result), "utf8");
    } catch {
      return usage(opts.json, `--result not readable: ${opts.result}`);
    }
    if (opts.dodN !== undefined && !/^\d+$/.test(opts.dodN))
      return usage(opts.json, "--dod-n must be a number");
    const r = merge(
      s,
      agentYaml,
      {
        dodN: opts.dodN ? Number(opts.dodN) : null,
        document: s.document ?? null,
      },
      io,
    );
    // The record is written only from a merged result: an unparseable answer
    // leaves Step 3c's NEEDS_MANUAL_REVIEW rule in force and writes nothing.
    if (r.reason === "merged" && opts.recordOut) {
      fs.writeFileSync(
        path.resolve(cwd, opts.recordOut),
        JSON.stringify(r.record, null, 2) + "\n",
        "utf8",
      );
      r.record_path = opts.recordOut;
    }
    return emit(opts.json, r);
  }
  return usage(
    opts.json,
    opts.cmd ? `unknown command: ${opts.cmd}` : "a command is required",
  );
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(
      `finalise-rerun-scope: ${err && err.stack ? err.stack : err}\n`,
    );
    process.exitCode = 2;
  }
}

module.exports = {
  SCHEMA,
  FULL_REASONS,
  CRITERION_REASONS,
  readCriteria,
  hashText,
  isReopened,
  resolveCitation,
  trackedIndex,
  evidenceIndex,
  scope,
  renderScopeText,
  merge,
  computeOverall,
  gitIo,
  main,
};
