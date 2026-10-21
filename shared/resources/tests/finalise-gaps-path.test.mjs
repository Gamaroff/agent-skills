/**
 * finalise's gaps path — the gap count and the lock (task 222).
 *
 * Two defects on the path `/finalise` takes when the Definition of Done is NOT met:
 *
 * 1. The `dod-gaps` lead overstated the gap count (obs #24). Step 8.5 counted every `- [ ]`
 *    line in the whole `## Definition of Done - Gaps Identified` section, and Step 8.4's
 *    template puts boxes under `### Next Steps:` as well as `### Missing Criteria:`. task.181
 *    said 5 for 3, task.199 3 for 1, task.213 4 for 2. `dod-gap-count.sh` is now the one
 *    story/task definition: list items under `### Missing Criteria`, checkbox or not (8.4's own
 *    example writes 6 of its 7 gaps as `- ⚠️`).
 *
 * 2. A gaps halt left the lock at Step 8 (obs #79). `--skill finalise` advanced 7 → 8 with no
 *    look at the outcome, so a resume read the record as "Step 7 done". It now advances only
 *    with `--dod <path>` naming a DoD that reads `**Final Status:** ✅ ACCEPTED`, and otherwise
 *    holds the lock and exits 0.
 *
 * Each fix is held by executing it: the helpers run on fixture files, and the cooperation
 * block is extracted from finalise's SKILL.md and run in a consumer-shaped temp repo.
 *
 * Mutation proofs (task 222 § 8): revert `dod-gap-count.sh` to the whole-section grep → the
 * count tests go red; delete the `--dod` guard → the gaps-lock tests go red; drop `--dod` from
 * the cooperation block → the extracted-block ACCEPTED test goes red.
 *
 * Run via: node --test shared/resources/tests/finalise-gaps-path.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  ROOT,
  SHELLS,
  readDoc,
  blockBy,
  bind,
  run,
} from "./lib/executed-prose.mjs";

const GAP_COUNT = path.join(ROOT, "shared", "resources", "dod-gap-count.sh");
const LOCK_HELPER = path.join(
  ROOT,
  "shared",
  "resources",
  "advance-pipeline-lock.sh",
);
const FILL_HELPER = path.join(
  ROOT,
  "shared",
  "resources",
  "fill-verification-complete.sh",
);
const LOCK = ".claude/state/develop-pipeline.lock";
const SKILL = "skills/finalise/SKILL.md";
const ACCEPTED_LINE = "**Final Status:** ✅ ACCEPTED";
const GAPS_LINE = "**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED";

const tmp = (prefix) =>
  fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), prefix));

// A task document whose gap section has Step 8.4's shape: a QA block, numbered categories
// with nested items under `### Missing Criteria:`, then `### Next Steps:` boxes, then the
// next `## ` heading. `missing` is [[category, ...items]]; an item is written verbatim, so a
// caller chooses `- [ ] …`, `- ⚠️ …` or `- [x] …`.
function gapDoc(missing, next) {
  const cats = missing
    .map(
      ([cat, ...items], i) =>
        `${i + 1}. **${cat}:**\n` + items.map((it) => `   ${it}`).join("\n"),
    )
    .join("\n\n");
  return [
    "# Task 9: fixture",
    "",
    "## Success Criteria",
    "",
    "- [ ] not a gap — the document's own criteria",
    "",
    "## Definition of Done - Gaps Identified",
    "",
    "**Status:** IN PROGRESS",
    "",
    "### QA Gate Status",
    "",
    "**Gate Status**: ✅ PASS",
    "",
    "### Missing Criteria:",
    "",
    cats,
    "",
    "### Next Steps:",
    "",
    ...next.map((n) => `- [ ] ${n}`),
    "",
    "**Estimated Effort:** Small",
    "",
    "## Change Log",
    "",
    "- [ ] not a gap either",
    "",
  ].join("\n");
}

// The three incidents' SHAPES (gap and Next Steps counts), not their text.
const SHAPES = [
  {
    name: "task.213 shape — 2 gaps, 2 Next Steps",
    doc: gapDoc(
      [
        ["Acceptance Criteria", "- [ ] AC8 measured on the wrong head"],
        ["Documentation", "- [ ] CHANGELOG entry missing"],
      ],
      ["Re-measure AC8", "Add the CHANGELOG entry"],
    ),
    old: 4,
    gaps: 2,
  },
  {
    name: "task.181 shape — 3 gaps, 2 Next Steps",
    doc: gapDoc(
      [
        [
          "Acceptance Criteria",
          "- [ ] AC3 has no test",
          "- [ ] AC5 has no test",
        ],
        ["Documentation", "- [ ] README not updated"],
      ],
      ["Add the AC tests", "Update the README"],
    ),
    old: 5,
    gaps: 3,
  },
  {
    name: "task.199 shape — 1 gap, 2 Next Steps",
    doc: gapDoc(
      [["Unit Tests", "- [ ] the new branch has no test"]],
      ["Write the test", "Re-run finalise"],
    ),
    old: 3,
    gaps: 1,
  },
];

// Step 8.4's own example, read out of SKILL.md rather than copied: 7 list items under
// Missing Criteria (1 `- [ ]`, 6 `- ⚠️`) and 7 Next Steps boxes. Its PR comment says "7 of them".
function step84Example() {
  const skill = readDoc(SKILL);
  const at = skill.indexOf("**Example Gap Report with QA Gate");
  assert.ok(at > -1, "Step 8.4's example is present");
  const open = skill.indexOf("```markdown\n", at);
  const close = skill.indexOf("\n   ```", open);
  const body = skill
    .slice(open + "```markdown\n".length, close)
    .replace(/^ {3}/gm, "");
  assert.match(body, /^## Definition of Done - Gaps Identified$/m);
  return `# Story fixture\n\n${body}\n\n## Change Log\n`;
}

const write = (dir, name, text) => {
  const f = path.join(dir, name);
  fs.writeFileSync(f, text);
  return f;
};

// The count Step 8.5 used before task 222, kept as the known failure the fixtures reproduce.
const OLD_COUNT = `awk '/^## Definition of Done - Gaps Identified/{f=1;next} /^## /{f=0} f' "$1" | grep -c '^[[:space:]]*- \\[ \\]' || true`;

for (const shell of SHELLS) {
  const count = (file) =>
    run(shell, `bash "${GAP_COUNT}" "${file}"`, { cwd: ROOT });
  const oldCount = (file) =>
    Number(
      run(shell, `set -- "${file}"; ${OLD_COUNT}`, { cwd: ROOT }).stdout.trim(),
    );

  test(`[${shell}] the fixtures reproduce the overcount: the old whole-section grep reads 4, 5, 3 and 8`, () => {
    const dir = tmp("t222-old-");
    try {
      for (const s of SHAPES) {
        assert.equal(oldCount(write(dir, "doc.md", s.doc)), s.old, s.name);
      }
      assert.equal(oldCount(write(dir, "doc.md", step84Example())), 8);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`[${shell}] dod-gap-count.sh counts only the Missing Criteria items: 2, 3, 1 and 7`, () => {
    const dir = tmp("t222-count-");
    try {
      for (const s of SHAPES) {
        const r = count(write(dir, "doc.md", s.doc));
        assert.equal(r.status, 0, s.name + "\n" + r.stdout + r.stderr);
        assert.equal(r.stdout, `${s.gaps}\n`, s.name);
      }
      const r = count(write(dir, "doc.md", step84Example()));
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.equal(r.stdout, "7\n", "Step 8.4's example lists 7 gaps");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  // Control case (obs #176): no item under Missing Criteria is a `- [ ]`, every Next Steps
  // line is. A count keyed on boxes reads the Next Steps; the right one reads the gaps.
  test(`[${shell}] control: Missing Criteria items with no unchecked box are counted, Next Steps boxes are not`, () => {
    const dir = tmp("t222-control-");
    try {
      const doc = gapDoc(
        [
          ["Security Review", "- ⚠️ token logged at debug level"],
          [
            "Compliance Review",
            "- [x] licence header (checked, still listed)",
            "- ⚠️ retention policy unstated",
          ],
        ],
        ["Drop the debug log", "State the retention policy"],
      );
      const file = write(dir, "doc.md", doc);
      assert.equal(
        oldCount(file),
        2,
        "the old grep counts the two Next Steps boxes",
      );
      const r = count(file);
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.equal(r.stdout, "3\n");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  // QA-222-3 and QA-222-4: a `####` category heading does not end the subsection, a detail
  // sub-bullet is not a second gap, and a fenced line is not a gap. The last case is the other
  // direction: a top-level gap beside categorised ones still counts, so nesting never undercounts.
  test(`[${shell}] dod-gap-count.sh: #### headings, sub-bullets and fences — and nothing undercounted`, () => {
    const dir = tmp("t222-shape-");
    const section = (lines, before = []) =>
      [
        "# Task",
        "",
        ...before,
        "## Definition of Done - Gaps Identified",
        "",
        "### Missing Criteria:",
        "",
        ...lines,
        "",
        "### Next Steps:",
        "",
        "- [ ] act",
        "",
        "## Change Log",
        "",
      ].join("\n");
    try {
      const cases = [
        {
          why: "#### category headings",
          lines: [
            "#### Tests",
            "",
            "- [ ] a",
            "- [ ] b",
            "",
            "#### Docs",
            "",
            "- [ ] c",
          ],
          want: 3,
        },
        {
          why: "nested detail sub-bullets",
          lines: [
            "- [ ] a",
            "  - detail one",
            "  - detail two",
            "    wrapped text of detail two",
            "- [ ] b",
          ],
          want: 2,
        },
        {
          why: "a fenced block holding list lines and a heading",
          lines: [
            "- [ ] a",
            "",
            "```text",
            "- not a gap",
            "### Not a heading",
            "```",
            "",
            "- [ ] b",
          ],
          want: 2,
        },
        {
          why: "a top-level gap beside numbered categories",
          lines: [
            "- [ ] a top-level gap",
            "",
            "1. **Unit Tests:**",
            "   - ⚠️ b",
            "   - ⚠️ c",
            "",
            "2. **Docs:**",
            "   - [ ] d",
          ],
          want: 4,
        },
        // QA-222-6: a re-run retitles the earlier section; only the current one is read.
        {
          why: "a historical (retitled) section before the current one",
          before: [
            "## Definition of Done - Gaps Identified — run 1 (historical, superseded)",
            "",
            "### Missing Criteria:",
            "",
            "- [x] old one",
            "- [x] old two",
            "- [x] old three",
            "",
          ],
          lines: ["- [ ] current"],
          want: 1,
        },
        // QA-222-8: fences are tracked from line 1, and only their own marker closes them.
        {
          why: "a fenced example of the section before the real one",
          before: [
            "## Plan",
            "",
            "```markdown",
            "## Definition of Done - Gaps Identified",
            "",
            "### Missing Criteria:",
            "",
            "- [ ] example only",
            "```",
            "",
          ],
          lines: ["- [ ] a", "- [ ] b"],
          want: 2,
        },
        {
          why: "a ~~~ fence holding a ``` line",
          lines: [
            "- [ ] a",
            "- [ ] b",
            "",
            "~~~text",
            "```",
            "- not a gap",
            "~~~",
            "",
            "Closing prose after the fence.",
          ],
          want: 2,
        },
      ];
      for (const c of cases) {
        const r = count(write(dir, "doc.md", section(c.lines, c.before)));
        assert.equal(r.status, 0, c.why + "\n" + r.stdout + r.stderr);
        assert.equal(r.stdout, `${c.want}\n`, c.why);
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`[${shell}] dod-gap-count.sh refuses — exit 1, reason on stderr, nothing on stdout`, () => {
    const dir = tmp("t222-refuse-");
    try {
      const cases = [
        {
          why: "no gaps section",
          doc: "# Task\n\n## Success Criteria\n\n- [ ] one\n",
          says: /no current '## Definition of Done - Gaps Identified' section/,
        },
        // QA-222-6: a re-run retitles the earlier sections; with no current one, nothing is counted.
        {
          why: "only historical (retitled) gaps sections",
          doc: "# Task\n\n## Definition of Done - Gaps Identified — run 1 (historical, superseded)\n\n### Missing Criteria:\n\n- [x] old\n\n## Change Log\n",
          says: /no current '## Definition of Done - Gaps Identified' section/,
        },
        {
          why: "a historical Missing Criteria beside a current section without one",
          doc: "# Task\n\n## Definition of Done - Gaps Identified — run 1 (historical, superseded)\n\n### Missing Criteria:\n\n- [x] old\n\n## Definition of Done - Gaps Identified\n\n- [ ] unlisted\n\n## Change Log\n",
          says: /no '### Missing Criteria'/,
        },
        {
          why: "no Missing Criteria subsection",
          doc: "# Task\n\n## Definition of Done - Gaps Identified\n\n- [ ] one\n- [ ] two\n\n## Change Log\n",
          says: /no '### Missing Criteria'/,
        },
        {
          why: "Missing Criteria lists nothing",
          doc: "# Task\n\n## Definition of Done - Gaps Identified\n\n### Missing Criteria:\n\nNone.\n\n### Next Steps:\n\n- [ ] act\n\n## Change Log\n",
          says: /lists no gap/,
        },
      ];
      for (const c of cases) {
        const r = count(write(dir, "doc.md", c.doc));
        assert.equal(r.status, 1, c.why);
        assert.equal(r.stdout, "", c.why + ": nothing on stdout");
        assert.match(r.stderr, c.says, c.why);
      }
      for (const arg of ["", "{doc-file}"]) {
        const r = run(shell, `bash "${GAP_COUNT}" "${arg}"`, { cwd: ROOT });
        assert.equal(r.status, 1, `unbound argument '${arg}'`);
        assert.equal(r.stdout, "");
        assert.match(r.stderr, /must be bound/);
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}

// ── The lock: --skill finalise advances only on an ACCEPTED DoD ─────────────────────────────

function lockRepo(step = 7) {
  const dir = tmp("t222-lock-");
  fs.mkdirSync(path.join(dir, ".claude/state"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, LOCK),
    JSON.stringify({ skill: "develop-task", current_step: step }) + "\n",
  );
  return dir;
}
const stepOf = (dir) =>
  JSON.parse(fs.readFileSync(path.join(dir, LOCK), "utf8")).current_step;
const dodWith = (dir, line) =>
  write(
    dir,
    "task.9.dod.1.fx.md",
    `# DoD\n\n## Verification Complete\n\n${line}\n`,
  );

for (const shell of SHELLS) {
  const finalise = (dir, extra = "") =>
    run(shell, `bash "${LOCK_HELPER}" --skill finalise ${extra}`, { cwd: dir });

  test(`[${shell}] --skill finalise --dod on an ACCEPTED DoD moves the lock 7 → 8`, () => {
    const dir = lockRepo();
    try {
      const r = finalise(dir, `--dod "${dodWith(dir, ACCEPTED_LINE)}"`);
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.equal(stepOf(dir), 8);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  const HOLDS = [
    {
      why: "a GAPS DoD",
      extra: (d) => `--dod "${dodWith(d, GAPS_LINE)}"`,
      says: /does not read/,
    },
    {
      why: "the template's unfilled status",
      extra: (d) =>
        `--dod "${dodWith(d, "**Final Status:** {✅ ACCEPTED | ❌ GAPS IDENTIFIED - NOT ACCEPTED}")}"`,
      says: /does not read/,
    },
    { why: "no --dod", extra: () => "", says: /no --dod given/ },
    // An unset $DOD_PATH reaches the helper as an empty value: a different caller defect (QA-222-5).
    {
      why: "an empty --dod value",
      extra: () => `--dod ""`,
      says: /--dod given an empty path/,
    },
    {
      why: "a missing DoD file",
      extra: (d) => `--dod "${path.join(d, "absent.md")}"`,
      says: /is not a file/,
    },
  ];
  for (const h of HOLDS) {
    test(`[${shell}] --skill finalise holds the lock at 7, exit 0, on ${h.why}`, () => {
      const dir = lockRepo();
      try {
        const r = finalise(dir, h.extra(dir));
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.equal(stepOf(dir), 7, `${h.why}: the lock must stay at 7`);
        assert.match(r.stderr, /finalise not accepted \(/);
        assert.match(r.stderr, h.says);
        assert.match(r.stderr, /lock held at step 7/);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  }

  // Bug mode writes its verdict through fill-verification-complete.sh, into the template's
  // own placeholder line — the same signal, a different writer.
  test(`[${shell}] a bug-mode DoD filled 'accepted' advances; filled 'gaps' holds`, () => {
    const template = readDoc("skills/finalise/assets/bug-dod-template.md");
    for (const [verdict, want] of [
      ["accepted", 8],
      ["gaps", 7],
    ]) {
      const dir = lockRepo();
      try {
        const text =
          verdict === "gaps"
            ? template.replace(
                /^\*\*Outcome:\*\* \{[^\n]*\}$/m,
                "**Outcome:**\n\n- [ ] regression test missing",
              )
            : template;
        const dod = write(dir, "bug.14.dod.1.x.md", text);
        const fill = run(shell, `bash "${FILL_HELPER}" "${dod}" ${verdict}`, {
          cwd: dir,
        });
        assert.equal(fill.status, 0, fill.stdout + fill.stderr);
        const r = finalise(dir, `--dod "${dod}"`);
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.equal(stepOf(dir), want, `bug DoD filled '${verdict}'`);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  // The guard sits after the parse: a corrupt lock is still exit 1, as for every other advance.
  test(`[${shell}] --skill finalise on a corrupt lock still refuses with exit 1`, () => {
    const dir = lockRepo();
    try {
      fs.writeFileSync(path.join(dir, LOCK), "null\n");
      const r = finalise(dir, `--dod "${dodWith(dir, GAPS_LINE)}"`);
      assert.equal(r.status, 1, r.stdout + r.stderr);
      assert.match(r.stderr, /not a JSON object/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  // finalise's `## Pipeline Lock Cooperation` block, extracted and run as written, from a
  // consumer-shaped root whose `.agents/skills` points at this repository's skills.
  test(`[${shell}] the cooperation block, as written in SKILL.md, holds on GAPS and advances on ACCEPTED`, () => {
    const block = blockBy(readDoc(SKILL), "--skill finalise");
    for (const [line, want] of [
      [GAPS_LINE, 7],
      [ACCEPTED_LINE, 8],
    ]) {
      const dir = lockRepo();
      try {
        fs.mkdirSync(path.join(dir, ".agents"));
        fs.symlinkSync(
          path.join(ROOT, "skills"),
          path.join(dir, ".agents/skills"),
        );
        const dod = dodWith(dir, line);
        const code = bind(block, {
          "{dod-path — the running summary Step 0 created}": dod,
        });
        const r = run(shell, code, { cwd: dir });
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.equal(stepOf(dir), want, `DoD reading ${line}`);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  // QA-222-2: the shared cooperation reference shows finalise's call too. Run as written, it
  // must hold on GAPS and advance on ACCEPTED, and it must not discard the hold's reason.
  test(`[${shell}] the cooperation reference's finalise block holds on GAPS, advances on ACCEPTED, keeps stderr`, () => {
    const block = blockBy(
      readDoc("shared/resources/pipeline-lock-cooperation.md"),
      "--skill finalise",
    );
    assert.doesNotMatch(block, /2>\/dev\/null/, "the hold's reason is kept");
    for (const [line, want] of [
      [GAPS_LINE, 7],
      [ACCEPTED_LINE, 8],
    ]) {
      const dir = lockRepo();
      try {
        fs.mkdirSync(path.join(dir, ".agents"));
        fs.symlinkSync(
          path.join(ROOT, "skills"),
          path.join(dir, ".agents/skills"),
        );
        const code = bind(block, { "<dod-path>": dodWith(dir, line) });
        const r = run(shell, code, { cwd: dir });
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.equal(stepOf(dir), want, `DoD reading ${line}`);
        if (want === 7) assert.match(r.stderr, /lock held at step 7/);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });
}

// ── QA-222-1: the orchestrators read Step 7's outcome before they advance to 8 ──────────────
// The Step Transition Protocol puts the lock advance first after any sub-skill returns. After
// Step 7 that would write 8 over the hold /finalise kept on a gaps outcome, so each protocol,
// its lock-update paragraph and both Step 7 documents state the exception.
test("each develop-* Step Transition Protocol reads Step 7's outcome before advancing to 8", () => {
  for (const sk of ["develop-task", "develop-story", "develop-bug"]) {
    const doc = readDoc(`skills/${sk}/SKILL.md`);
    const action1 = doc.match(
      /^1\. \*\*Bash tool call\*\* advancing the lock[^\n]*/m,
    );
    assert.ok(action1, `${sk}: the protocol's action 1 is present`);
    assert.match(
      action1[0],
      /\*\*Except after Step 7: read its outcome first\.\*\*[^\n]*HALTs with the lock at 7/,
      `${sk}: action 1 states the Step 7 exception`,
    );
    const lockPara = doc.match(
      /this is \*\*action #1\*\* — the first tool call[^\n]*/,
    );
    assert.ok(lockPara, `${sk}: the lock-update paragraph is present`);
    assert.match(
      lockPara[0],
      /after Step 7, only once/,
      `${sk}: lock-update paragraph`,
    );
  }
  const step7 = readDoc("shared/resources/develop-pipeline-step-7-finalise.md");
  const detecting = step7.slice(step7.indexOf("## Detecting Completion"));
  assert.match(
    detecting.slice(0, 600),
    /runs \*\*before\*\* the Step Transition Protocol's lock advance/,
  );
  assert.match(
    readDoc("skills/develop-bug/references/develop-bug-step-7-close-bug.md"),
    /DoD gaps found → do \*\*not\*\* advance the lock \(it stays at 7/,
  );
});
