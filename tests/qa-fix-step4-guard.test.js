"use strict";

/**
 * qa-fix Step 4 — the untracked-files guard (task.268, QA cycle 2).
 *
 * The guard is a fenced bash block that refuses on repository state, so the probe engine's `fence:`
 * form is the harness: it substitutes the {changed-paths} slot with each case's input and runs the
 * block under bash and zsh. The cycle-1 version tested for an unfilled slot with the slot's own text
 * in its `case` pattern; substitution rewrote that copy too, so a FILLED slot always halted. Every
 * hostile case alone passes that bug (they are refused for the wrong reason), which is why the
 * legitimate case is the one that matters here: a control that rejects everything is `inert`.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const ENGINE = path.join(ROOT, "shared", "resources", "security-probe.mjs");
const ENTRY = "fence:skills/qa-fix/SKILL.md#Step 4: Validate";

// A bare repository the block's `git ls-files` can read: HEAD plus empty objects/ and refs/.
const GIT = {
  ".git/HEAD": "ref: refs/heads/main\n",
  ".git/objects/.keep": "",
  ".git/refs/.keep": "",
};
const BRACE_REFUSAL =
  "HALT: CHANGED_PATHS is empty or still holds a brace — substitute the paths this fix touched\n";

const CASES = [
  {
    id: "empty",
    input: "",
    why: "empty slot",
    correct: "refused",
    direction: "hostile",
    expected: { stdout: BRACE_REFUSAL, exit: 1 },
  },
  {
    id: "unfilled",
    input: "{changed-paths}",
    why: "slot left in",
    correct: "refused",
    direction: "hostile",
    expected: { stdout: BRACE_REFUSAL, exit: 1 },
  },
  {
    id: "brace",
    input: "a{b",
    why: "brace in a path",
    correct: "refused",
    direction: "hostile",
    expected: { stdout: BRACE_REFUSAL, exit: 1 },
  },
  {
    id: "untracked",
    input: "newdir",
    why: "an untracked file under the changed paths",
    correct: "refused",
    direction: "hostile",
    fixture: { files: { ...GIT, "newdir/new.txt": "x\n" } },
    expected: {
      stdout:
        "untracked files under the changed paths — stage them first:\nnewdir/new.txt\n",
      exit: 1,
    },
  },
  {
    id: "blank",
    input: "   ",
    why: "whitespace-only slot",
    correct: "refused",
    direction: "hostile",
    expected: { stdout: BRACE_REFUSAL, exit: 1 },
  },
  {
    id: "multi-second-untracked",
    input: "ignored newdir",
    why: "two paths, the untracked file under the second (zsh does not word-split a bare variable)",
    correct: "refused",
    direction: "hostile",
    fixture: {
      files: {
        ...GIT,
        ".gitignore": "ignored/\n",
        "ignored/x": "x\n",
        "newdir/new.txt": "x\n",
      },
    },
    expected: {
      stdout:
        "untracked files under the changed paths — stage them first:\nnewdir/new.txt\n",
      exit: 1,
    },
  },
  {
    id: "multi-clean",
    input: "ignored ignored2",
    why: "two filled paths with nothing untracked are admitted",
    correct: "admitted",
    direction: "legitimate",
    fixture: {
      files: {
        ...GIT,
        ".gitignore": "ignored/\nignored2/\n",
        "ignored/x": "x\n",
        "ignored2/x": "x\n",
      },
    },
  },
  {
    id: "filled-clean",
    input: "ignored",
    why: "a filled slot with nothing untracked is admitted",
    correct: "admitted",
    direction: "legitimate",
    fixture: {
      files: { ...GIT, ".gitignore": "ignored/\n", "ignored/x": "x\n" },
    },
  },
].map((c) => ({ sink: "filename", ...c }));

function probe(skillFile) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qa-fix-step4-"));
  try {
    const casesFile = path.join(dir, "cases.json");
    fs.writeFileSync(casesFile, JSON.stringify(CASES));
    const args = [
      ENGINE,
      "--sink",
      "filename",
      "--entry",
      ENTRY.replace("skills/qa-fix/SKILL.md", skillFile),
      "--slot",
      "{changed-paths}",
      "--cases-file",
      casesFile,
      "--repo-root",
      ROOT,
      "--json",
    ];
    const r = spawnSync(process.execPath, args, { encoding: "utf8" });
    return JSON.parse(r.stdout);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("Step 4 guard: hostile slots are refused, a filled clean slot is admitted (bash and zsh)", () => {
  const out = probe("skills/qa-fix/SKILL.md");
  assert.equal(
    out.reason,
    "hostile-rejected-legitimate-accepted",
    JSON.stringify(out.cases),
  );
  assert.ok(out.cases.length >= CASES.length, "every case ran");
});

// Each mutant reverts one fix to the shape that shipped broken. The probe must stop reading
// "engages" for it. The mutant lives under the repo root so the engine's --repo-root containment
// accepts it, and is removed in a finally.
const SKILL_SRC = fs.readFileSync(
  path.join(ROOT, "skills", "qa-fix", "SKILL.md"),
  "utf8",
);
const MUTANTS = [
  {
    name: "the cycle-1 bug: the unfilled-slot test repeats the slot text",
    from: '*"{"*|*"}"*)',
    to: '*"{changed-paths}"*)',
  },
  {
    name: "the cycle-3 bug: an unquoted expansion, which zsh does not word-split",
    from: "printf '%s\\n' \"$CHANGED_PATHS\" | tr -s ' \\t' '\\n\\n' | grep -v '^$' | xargs git ls-files --others --exclude-standard --",
    to: "git ls-files --others --exclude-standard -- $CHANGED_PATHS",
  },
];

for (const m of MUTANTS) {
  test(`Step 4 guard: caught when reverted to ${m.name}`, () => {
    assert.ok(SKILL_SRC.includes(m.from), "the line under mutation is present");
    const src = SKILL_SRC.replace(m.from, m.to);
    assert.notEqual(src, SKILL_SRC, "the mutation applied");
    const rel = path.join("tests", `.qa-fix-step4-mutant-${process.pid}.md`);
    const mutantPath = path.join(ROOT, rel);
    fs.writeFileSync(mutantPath, src);
    try {
      const out = probe(rel);
      assert.notEqual(
        out.reason,
        "hostile-rejected-legitimate-accepted",
        "the mutant must not read as engaging",
      );
      assert.ok(out.cases.length > 0, "the mutant was probed: " + out.reason);
    } finally {
      fs.rmSync(mutantPath, { force: true });
    }
  });
}

test("Step 4 guard: fails closed when git cannot look (not a repository)", () => {
  const noRepo = [
    {
      ...CASES.find((c) => c.id === "filled-clean"),
      id: "no-repo",
      direction: "hostile",
      correct: "refused",
      input: "ignored",
      fixture: { files: { "ignored/x": "x\n" } },
      expected: {
        stdout:
          "HALT: git ls-files could not look (not a repository, or a bad path) — not treating that as clean\n",
        exit: 1,
      },
    },
  ];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qa-fix-step4-nr-"));
  try {
    const casesFile = path.join(dir, "cases.json");
    fs.writeFileSync(casesFile, JSON.stringify([...noRepo]));
    const r = spawnSync(
      process.execPath,
      [
        ENGINE,
        "--sink",
        "filename",
        "--entry",
        ENTRY,
        "--slot",
        "{changed-paths}",
        "--cases-file",
        casesFile,
        "--repo-root",
        ROOT,
        "--json",
      ],
      { encoding: "utf8" },
    );
    const out = JSON.parse(r.stdout);
    const refused = out.cases.filter((c) => c.id === "no-repo");
    assert.ok(
      refused.length > 0 && refused.every((c) => c.outcome === "rejected"),
      JSON.stringify(out.cases),
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
