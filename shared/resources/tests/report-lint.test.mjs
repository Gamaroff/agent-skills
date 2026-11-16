// report-lint.test.mjs — the implementation-report structural linter (task.124, Phase 3)
//
// Each block below guards a claim the linter makes about a report, and each was
// chosen so that reverting the behaviour turns it red:
//
//   A — the corrupt fixture.   task.117's HALT commit (329b4a65, 366 lines): ONE H1, a
//                              second `**Task**:` block at line 218, seven `## ` sections
//                              repeated after it. The assertion names the codes that
//                              fire AND the two that must not (multiple-h1;
//                              section-missing for the omitted optional section).
//   B — green fixtures.        Five accepted task reports lint clean, and so does a
//                              report whose Decisions Log quotes a fenced
//                              `# Implementation Report` — fences are examples.
//   C — the optional section.  `## Tracker Actions Required` omitted → ok; present
//                              twice → section-duplicated; a REQUIRED section
//                              omitted → section-missing.
//   D — the other codes.       multiple-h1, qa-cycle-duplicated, section-out-of-order,
//                              trailing-duplicate-body, variant-undetected — each on the
//                              smallest report that produces it and nothing else.
//   E — one definition.        The section list comes from the template file: the
//                              step-0 doc inlines no `# Implementation Report` fence any
//                              more, the template names story and task variants, and
//                              `Tracker Actions Required` carries the optional marker
//                              in both. Changing the template changes the verdict.
//   F — the CLI.               `--json` carries `reason: ok | problems | usage` with the
//                              exit codes 0 | 1 | 2, and `usage` on a missing --file.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  lintReport,
  loadTemplate,
  parseTemplate,
  DEFAULT_TEMPLATE,
} = require("../report-lint.js");

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const CLI = path.join(HERE, "..", "report-lint.js");
const FIX = path.join(HERE, "fixtures", "report-lint");
const read = (p) => fs.readFileSync(p, "utf8");
const SECTIONS = loadTemplate();
const codes = (r) => r.problems.map((p) => p.code);
const count = (r, code) => codes(r).filter((c) => c === code).length;

// A minimal, well-formed TASK report built from the template's own section list, so
// the synthetic cases below start from a green baseline the template defines.
function minimalReport(variant = "task", { omit = [], extraBody = "" } = {}) {
  const header =
    variant === "story"
      ? "**Story**: `story.1.2.x.md`"
      : variant === "task"
        ? "**Task**: `task.42.x.md`"
        : null;
  const lines = [];
  if (variant === "bug") {
    lines.push(
      "---",
      "type: implementation-report",
      "status: in-progress",
      "bug: 'bug.7'",
      "---",
      "",
      "# Implementation Report — bug.7",
      "",
      "**Started:** t",
      "**Fix Iterations:** 0",
      "",
    );
  } else {
    lines.push(
      `# Implementation Report: ${variant} 42`,
      "",
      header,
      "**Run Number**: 1",
      "",
    );
  }
  for (const s of SECTIONS[variant]) {
    if (omit.includes(s.name)) continue;
    lines.push(`## ${s.name}`, "", "body", "");
  }
  lines.push(extraBody);
  return lines.join("\n");
}

test("A — the task.117 corrupt fixture: the named codes fire, the named non-codes do not", () => {
  const r = lintReport(read(path.join(FIX, "corrupt-task117.md")), {
    sections: SECTIONS,
  });
  assert.equal(r.ok, false);
  assert.equal(r.variant, "task");
  assert.equal(
    count(r, "section-duplicated"),
    7,
    `section-duplicated ×7, got ${codes(r)}`,
  );
  assert.equal(count(r, "section-out-of-order"), 1);
  assert.equal(count(r, "header-block-duplicated"), 1);
  assert.equal(
    count(r, "qa-cycle-duplicated"),
    2,
    "QA Cycle 1 and 2 headings repeat in the spliced copy",
  );
  assert.equal(count(r, "trailing-duplicate-body"), 1);
  assert.equal(
    count(r, "multiple-h1"),
    0,
    "the fixture has exactly one H1 — the duplicate begins at the header block",
  );
  assert.equal(
    count(r, "section-missing"),
    0,
    "Tracker Actions Required is optional; its omission is not a finding",
  );
  const hb = r.problems.find((p) => p.code === "header-block-duplicated");
  assert.equal(
    hb.line,
    219,
    "the second **Task**: block is at line 219 of the 366-line fixture",
  );
  // Non-vacuity: the fixture is the one the task names.
  assert.equal(
    read(path.join(FIX, "corrupt-task117.md")).split("\n").length - 1,
    366,
  );
});

test("B — five accepted reports lint clean", () => {
  const green = fs
    .readdirSync(path.join(FIX, "green"))
    .filter((f) => f.endsWith(".md"));
  assert.ok(
    green.length >= 5,
    `expected ≥5 green fixtures, found ${green.length}`,
  );
  for (const f of green) {
    const r = lintReport(read(path.join(FIX, "green", f)), {
      sections: SECTIONS,
    });
    assert.deepEqual(codes(r), [], `${f}: ${JSON.stringify(r.problems)}`);
    assert.equal(r.variant, "task");
  }
});

test("B — a fenced `# Implementation Report` and fenced `## ` headings inside a Decisions Log are examples, not sections", () => {
  const fenced = [
    "```markdown",
    "# Implementation Report: quoted example",
    "",
    "**Task**: `task.0.example.md`",
    "",
    "## Summary",
    "## Completion",
    "### QA Cycle 1 — quoted",
    "```",
  ].join("\n");
  const text = minimalReport("task").replace(
    "## Decisions Log\n\nbody",
    `## Decisions Log\n\nbody\n\n${fenced}`,
  );
  const r = lintReport(text, { sections: SECTIONS });
  assert.deepEqual(codes(r), [], JSON.stringify(r.problems));
  // …and the same lines OUTSIDE a fence are the spliced-copy signature.
  const unfenced = text.replace("```markdown\n", "").replace("\n```", "");
  const bad = lintReport(unfenced, { sections: SECTIONS });
  assert.ok(codes(bad).includes("multiple-h1"));
  assert.ok(codes(bad).includes("header-block-duplicated"));
  assert.ok(codes(bad).includes("section-duplicated"));
});

test("C — the optional section: omitted is ok, twice is duplicated, a required one omitted is missing", () => {
  const ok = lintReport(
    minimalReport("task", { omit: ["Tracker Actions Required"] }),
    { sections: SECTIONS },
  );
  assert.deepEqual(codes(ok), []);
  const twice = minimalReport("task").replace(
    "## Issues Log",
    "## Tracker Actions Required\n\nx\n\n## Issues Log",
  );
  const dup = lintReport(twice, { sections: SECTIONS });
  assert.ok(
    codes(dup).includes("section-duplicated"),
    JSON.stringify(dup.problems),
  );
  const missing = lintReport(minimalReport("task", { omit: ["Issues Log"] }), {
    sections: SECTIONS,
  });
  assert.deepEqual(codes(missing), ["section-missing"]);
  assert.match(missing.problems[0].detail, /Issues Log/);
});

test("C — story and bug variants are detected from their own headers and held to their own lists", () => {
  const story = lintReport(minimalReport("story"), { sections: SECTIONS });
  assert.equal(story.variant, "story");
  assert.deepEqual(codes(story), []);
  const bug = lintReport(minimalReport("bug"), { sections: SECTIONS });
  assert.equal(bug.variant, "bug");
  assert.deepEqual(codes(bug), []);
  // A bug report is not held to the task list: no `## Summary` is not a finding for it.
  assert.ok(!SECTIONS.bug.some((s) => s.name === "Summary"));
  // A legacy story report with `story-ref:` frontmatter and no header block still resolves.
  const legacy =
    "---\nstory-ref: story.1.2.x.md\n---\n\n# Implementation Report\n\n## Pipeline Progress\n";
  assert.equal(lintReport(legacy, { sections: SECTIONS }).variant, "story");
});

test("D — multiple-h1 on a second unfenced H1, and nothing else", () => {
  const r = lintReport(
    minimalReport("task", { extraBody: "\n# Implementation Report: again\n" }),
    { sections: SECTIONS },
  );
  assert.deepEqual(codes(r), ["multiple-h1"]);
});

test("D — qa-cycle-duplicated on a repeated `### QA Cycle N`, and nothing else", () => {
  const text = minimalReport("task").replace(
    "## QA Iteration History\n\nbody",
    "## QA Iteration History\n\n### QA Cycle 1 — d\n\nx\n\n### QA Cycle 2 — d\n\ny\n\n### QA Cycle 1 — d (again)\n\nz",
  );
  const r = lintReport(text, { sections: SECTIONS });
  assert.deepEqual(codes(r), ["qa-cycle-duplicated"]);
});

test("D — section-out-of-order when a template section precedes one the template places earlier (no duplicate)", () => {
  const text = minimalReport("task").replace(
    "## Issues Log\n\nbody\n\n## Tracker Actions Required\n\nbody\n\n## QA Iteration History\n\nbody",
    "## QA Iteration History\n\nbody\n\n## Issues Log\n\nbody\n\n## Tracker Actions Required\n\nbody",
  );
  const r = lintReport(text, { sections: SECTIONS });
  assert.deepEqual(
    codes(r),
    ["section-out-of-order"],
    JSON.stringify(r.problems),
  );
});

test("D — trailing-duplicate-body fires once when a section reappears after the first `## Completion`; an unknown section after it does not", () => {
  const paused = minimalReport("task", {
    extraBody:
      "\n## Pipeline Paused — 2026-09-19T09:03:04Z\n\nappended by the PreCompact hook\n",
  });
  assert.deepEqual(
    codes(lintReport(paused, { sections: SECTIONS })),
    [],
    "the hook's appended section is not a template section",
  );
  const trailing = minimalReport("task", {
    extraBody: "\n## Issues Log\n\nspliced\n\n## Decisions Log\n\nspliced\n",
  });
  const r = lintReport(trailing, { sections: SECTIONS });
  assert.equal(count(r, "trailing-duplicate-body"), 1, "once per report");
  assert.equal(count(r, "section-duplicated"), 2);
});

test("D — variant-undetected when there is no header block and no frontmatter hint", () => {
  const r = lintReport("# Implementation Report\n\n## Summary\n", {
    sections: SECTIONS,
  });
  assert.deepEqual(codes(r), ["variant-undetected"]);
  assert.equal(r.variant, null);
});

test("B — CRLF: a fenced quoted report is still an example, and a heading only inside a fence is still missing", () => {
  // task.131's markdown-structure probe found both directions failing on CRLF:
  // fencedRanges never matched a `\r`-terminated fence, so the quoted report
  // read as a second H1 + header block (a valid report refused) and a section
  // present only in a fence read as present (a missing section accepted).
  const crlf = (s) => s.replace(/\n/g, "\r\n");
  const quoted = minimalReport("task", {
    extraBody:
      "\n```markdown\n# Implementation Report: quoted\n\n**Task**: `task.1.x.md`\n\n## Summary\n```\n",
  });
  assert.deepEqual(codes(lintReport(quoted, { sections: SECTIONS })), []);
  assert.deepEqual(
    codes(lintReport(crlf(quoted), { sections: SECTIONS })),
    [],
    "the CRLF copy of a clean report is clean",
  );
  const fencedOnly = minimalReport("task").replace(
    "## Issues Log\n",
    "```\n## Issues Log\n```\n",
  );
  assert.notEqual(
    fencedOnly,
    minimalReport("task"),
    "the fixture edit applied",
  );
  for (const text of [fencedOnly, crlf(fencedOnly)]) {
    assert.deepEqual(codes(lintReport(text, { sections: SECTIONS })), [
      "section-missing",
    ]);
  }
});

test("E — one definition: the template names both variants with the optional marker, and step-0 inlines no template", () => {
  const tpl = read(DEFAULT_TEMPLATE);
  const parsed = parseTemplate(tpl);
  for (const v of ["story", "task"]) {
    const names = parsed[v].map((s) => s.name);
    assert.ok(names.length >= 7, `${v}: ${names}`);
    assert.equal(names[0], "Summary");
    assert.equal(names[names.length - 1], "Completion");
    const tar = parsed[v].find((s) => s.name === "Tracker Actions Required");
    assert.ok(
      tar && tar.optional,
      `${v}: Tracker Actions Required must carry <!-- optional -->`,
    );
    assert.equal(
      parsed[v].filter((s) => s.optional).length,
      1,
      `${v}: exactly one optional section`,
    );
  }
  assert.deepEqual(
    parsed.bug.map((s) => s.name),
    ["Pipeline Progress", "Decisions Log", "Issues Log", "Completion"],
  );
  // The step-0 doc references the template instead of restating it.
  const step0 = read(
    path.join(
      ROOT,
      "shared",
      "resources",
      "develop-pipeline-step-0-resolve-and-prepare.md",
    ),
  );
  // Key on §0e itself: the section between its heading and §0f is where the report is created,
  // so the reference must sit THERE — a mention elsewhere in the document would not do.
  const s0e = step0.indexOf("## 0e. Create the Implementation Report");
  const s0f = step0.indexOf("## 0f. Pre-flight Summary", s0e);
  assert.ok(s0e > -1 && s0f > s0e, "step-0 must carry §0e followed by §0f");
  const section0e = step0.slice(s0e, s0f);
  assert.match(
    section0e,
    /\[`shared\/resources\/implementation-report-template\.md`\]\(implementation-report-template\.md\)/,
    "step-0 §0e must link to the template file",
  );
  assert.equal(
    (step0.match(/^```markdown$/gm) || []).length,
    0,
    "step-0 must not inline a ```markdown report template",
  );
  assert.ok(
    !/^\*\*Task\*\*: `\{task filename\}`/m.test(step0),
    "step-0 must not carry the task header block",
  );
  // The verdict follows the template: make Summary optional and the missing-Summary report passes.
  const relaxed = parseTemplate(
    tpl.replaceAll("## Summary\n", "## Summary <!-- optional -->\n"),
  );
  const noSummary = minimalReport("task", { omit: ["Summary"] });
  assert.deepEqual(codes(lintReport(noSummary, { sections: SECTIONS })), [
    "section-missing",
  ]);
  assert.deepEqual(codes(lintReport(noSummary, { sections: relaxed })), []);
  // Every bundled copy of the template yields the same SECTION LISTS as the source (one
  // authored definition is only one effective definition while the copies match it). Byte
  // equality is the wrong test: the bundler rewrites shared paths to `references/x`
  // inside the fences, which changes prose and not sections.
  for (const skill of ["develop-story", "develop-task", "develop-bug"]) {
    const copy = path.join(
      ROOT,
      "skills",
      skill,
      "references",
      "implementation-report-template.md",
    );
    if (!fs.existsSync(copy)) continue; // bundling is a separate CI check; absence here is not this test's finding
    assert.deepEqual(
      parseTemplate(read(copy)),
      parsed,
      `${skill}: bundled template's sections drifted from shared/resources`,
    );
  }
});

test("F — CLI: --json reason ok | problems | usage with exit 0 | 1 | 2", () => {
  const run = (args) =>
    spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
  const ok = run(["--file", path.join(FIX, "green", "task.123.md"), "--json"]);
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(JSON.parse(ok.stdout).reason, "ok");
  const bad = run(["--file", path.join(FIX, "corrupt-task117.md"), "--json"]);
  assert.equal(bad.status, 1);
  const payload = JSON.parse(bad.stdout);
  assert.equal(payload.reason, "problems");
  assert.equal(payload.problems.length, 12);
  const usage = run(["--json"]);
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /--file is required/);
  const nofile = run(["--file", "/nonexistent/report.md", "--json"]);
  assert.equal(nofile.status, 2);
  const badVariant = run([
    "--file",
    path.join(FIX, "green", "task.123.md"),
    "--variant",
    "epic",
  ]);
  assert.equal(badVariant.status, 2);
  // A forced variant overrides detection.
  const forced = run([
    "--file",
    path.join(FIX, "green", "task.123.md"),
    "--variant",
    "bug",
    "--json",
  ]);
  assert.equal(JSON.parse(forced.stdout).variant, "bug");
});

// ── G — the QA Cycle heading shape and the Traceability row (task.277, obs #92 / #124) ──────

// A task report whose QA Iteration History holds the given body, marked `**Report format**: 2`
// unless `marked` is false. Built from minimalReport so the section list stays the template's.
function cycleReport(history, { marked = true } = {}) {
  let r = minimalReport("task");
  if (marked)
    r = r.replace(
      "**Run Number**: 1\n",
      "**Run Number**: 1\n**Report format**: 2\n",
    );
  const out = r.replace(
    "## QA Iteration History\n\nbody\n",
    `## QA Iteration History\n\n${history}\n`,
  );
  assert.notEqual(out, r, "the QA Iteration History body was replaced");
  return out;
}
const cycle = (n, rows = "**Traceability**: mapped") =>
  `### QA Cycle ${n} — 2026-01-0${n}\n**Gate Result**: PASS\n${rows}\n`;

test("G — qa-cycle-heading-suffix: a qa-fix record on an H3 with a DISTINCT N is flagged; as an H4 it passes (control)", () => {
  const bad = cycleReport(
    `${cycle(2)}\n### QA Cycle 3 — qa-fix (5b)\n**Traceability**: mapped\n`,
  );
  const r = lintReport(bad, { sections: SECTIONS });
  assert.deepEqual(codes(r), ["qa-cycle-heading-suffix"]);
  // Control: the same record as an H4 under its cycle's H3 is clean.
  const good = cycleReport(`${cycle(2)}\n#### qa-fix (5b)\nfixed the thing\n`);
  assert.deepEqual(codes(lintReport(good, { sections: SECTIONS })), []);
  // The task.230 shape (reused N) is still caught by the older code, and by the new one too.
  const reused = cycleReport(
    `${cycle(2)}\n### QA Cycle 2 — qa-fix (5b)\n**Traceability**: mapped\n`,
  );
  assert.deepEqual(codes(lintReport(reused, { sections: SECTIONS })).sort(), [
    "qa-cycle-duplicated",
    "qa-cycle-heading-suffix",
  ]);
  // A step marker without the words qa-fix is also a suffix; a plain date or free text is not.
  assert.equal(
    count(
      lintReport(
        cycleReport(
          "### QA Cycle 1 — 2026-01-01 (5c)\n**Traceability**: mapped\n",
        ),
        { sections: SECTIONS },
      ),
      "qa-cycle-heading-suffix",
    ),
    1,
  );
  assert.deepEqual(
    codes(
      lintReport(
        cycleReport("### QA Cycle 1 — d\n**Traceability**: mapped\n"),
        { sections: SECTIONS },
      ),
    ),
    [],
  );
});

test("G — traceability: required on every cycle of a MARKED report; mapped and skipped (reason) pass", () => {
  const missing = cycleReport(
    `${cycle(1)}\n### QA Cycle 2 — 2026-01-02\n**Gate Result**: PASS\n`,
  );
  const r = lintReport(missing, { sections: SECTIONS });
  assert.deepEqual(codes(r), ["traceability-missing"]);
  assert.match(r.problems[0].detail, /QA Cycle 2/);
  for (const row of [
    "**Traceability**: mapped",
    "**Traceability**: mapped (14 rows)",
    "**Traceability**: skipped (lite mode)",
    "**Traceability**: skipped (run outside the loop)",
  ]) {
    assert.deepEqual(
      codes(lintReport(cycleReport(cycle(1, row)), { sections: SECTIONS })),
      [],
      row,
    );
  }
});

test("G — traceability-reason-missing: `skipped` alone, empty parentheses or an unrecognised value are flagged", () => {
  const code = (row) =>
    codes(lintReport(cycleReport(cycle(1, row)), { sections: SECTIONS }));
  assert.deepEqual(code("**Traceability**: skipped"), [
    "traceability-reason-missing",
  ]);
  assert.deepEqual(code("**Traceability**: skipped ()"), [
    "traceability-reason-missing",
  ]);
  assert.deepEqual(code("**Traceability**: skipped (  )"), [
    "traceability-reason-missing",
  ]);
  assert.deepEqual(code("**Traceability**: {mapped / skipped ({reason})}"), [
    "traceability-missing",
  ]);
  assert.deepEqual(code("**Traceability**:"), ["traceability-missing"]);
});

test("G — controls: an UNMARKED report lints as before; the row is read inside a fence never; an H4 stays in its cycle", () => {
  // Unmarked: no Traceability row, no problem — every report written before the marker.
  const unmarked = cycleReport(
    "### QA Cycle 1 — 2026-01-01\n**Gate Result**: PASS\n",
    { marked: false },
  );
  assert.deepEqual(codes(lintReport(unmarked, { sections: SECTIONS })), []);
  // A Traceability line only inside a fence does not satisfy a marked cycle.
  const fenced = cycleReport(
    "### QA Cycle 1 — 2026-01-01\n```\n**Traceability**: mapped\n```\n",
  );
  assert.deepEqual(codes(lintReport(fenced, { sections: SECTIONS })), [
    "traceability-missing",
  ]);
  // The row after an H4 qa-fix record still belongs to its H3 cycle.
  const h4 = cycleReport(
    "### QA Cycle 1 — 2026-01-01\n#### qa-fix (5b)\ndone\n**Traceability**: mapped\n",
  );
  assert.deepEqual(codes(lintReport(h4, { sections: SECTIONS })), []);
  // The marker inside a fence marks nothing.
  const fencedMarker = minimalReport("task").replace(
    "## QA Iteration History\n\nbody\n",
    "## QA Iteration History\n\n```\n**Report format**: 2\n```\n### QA Cycle 1 — 2026-01-01\n",
  );
  assert.deepEqual(codes(lintReport(fencedMarker, { sections: SECTIONS })), []);
});

test("G — the five accepted reports and the corrupt fixture are unchanged by the new codes", () => {
  for (const f of fs.readdirSync(path.join(FIX, "green"))) {
    const r = lintReport(read(path.join(FIX, "green", f)), {
      sections: SECTIONS,
    });
    assert.deepEqual(codes(r), [], f);
  }
  const corrupt = lintReport(read(path.join(FIX, "corrupt-task117.md")), {
    sections: SECTIONS,
  });
  assert.equal(corrupt.problems.length, 12);
  assert.equal(count(corrupt, "traceability-missing"), 0);
});

test("G — the template writes the marker in the task and story header blocks, not the bug variant", () => {
  const tpl = read(DEFAULT_TEMPLATE);
  const fences = tpl
    .split(/^```markdown\n/m)
    .slice(1)
    .map((b) => b.split(/^```\n/m)[0]);
  assert.equal(fences.length, 3, "story, task and bug fences");
  const [story, task, bug] = fences;
  assert.match(story, /^\*\*Report format\*\*: 2$/m);
  assert.match(task, /^\*\*Report format\*\*: 2$/m);
  assert.doesNotMatch(bug, /Report format/);
  // The marker the template writes is the one the linter reads: a fresh report built from the
  // template's header, with no Traceability row, is flagged.
  const fresh = cycleReport(
    "### QA Cycle 1 — 2026-01-01\n**Gate Result**: PASS\n",
  );
  assert.deepEqual(codes(lintReport(fresh, { sections: SECTIONS })), [
    "traceability-missing",
  ]);
});
