"use strict";
// task.186 Phase 4 — one next-number rule for every co-located report series.
//
// `next_numbered` (newest-numbered.sh) prints highest {n} + 1, never count + 1 (obs #272). This file
// tests the function itself, then runs EACH skill's own fenced call line — taken from its SKILL.md,
// re-pointed at the shared source — under bash and zsh against a directory holding `.1.` and `.3.`
// of that site's series: every one must answer 4.
//
// The call-site population is DERIVED: every skills/*/SKILL.md whose fenced bash blocks call
// `next_numbered` must appear in SITES, and every SITES entry must still call it.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("../../..", import.meta.url));
const HELPER = path.join(REPO, "shared", "resources", "newest-numbered.sh");
const hasZsh = spawnSync("zsh", ["-c", "true"]).status === 0;
const SHELLS = hasZsh ? ["bash", "zsh"] : ["bash"];
const shArgv = (shell, rest) =>
  shell === "zsh" ? ["-f", ...rest] : ["--noprofile", "--norc", ...rest];
const run = (shell, script) =>
  spawnSync(shell, shArgv(shell, ["-c", script]), { encoding: "utf8" });

function dirWith(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "next-numbered-"));
  for (const f of files) {
    const p = path.join(dir, f);
    if (f.endsWith("/")) fs.mkdirSync(p, { recursive: true });
    else {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, "x\n");
    }
  }
  return dir;
}

const next = (shell, dir, kind, pattern) =>
  run(
    shell,
    `source '${HELPER}' || exit 1\nnext_numbered '${dir}' ${kind} -name '${pattern}'`,
  );

// ── The function ─────────────────────────────────────────────────────────────

const CASES = [
  ["an empty directory", [], 1],
  ["one report", ["t.9.review.1.x.md"], 2],
  ["a gap — .1. and .3.", ["t.9.review.1.x.md", "t.9.review.3.x.md"], 4],
  [
    "numeric, not lexical — .9. and .10.",
    ["t.9.review.9.x.md", "t.9.review.10.x.md"],
    11,
  ],
  ["a leading zero is base 10 — .09. is 9", ["t.9.review.09.x.md"], 10],
  [
    "a dated report takes no number",
    ["t.9.review.2026-05-06.md", "t.9.review.2.x.md"],
    3,
  ],
  [
    "other kinds, other stems and nested items are not members",
    [
      "t.9.pr-review.5.x.md",
      "t.9.dod.7.x.md",
      "t.10.review.8.x.md",
      "t.9.other/t.9.review.6.x.md",
    ],
    1,
  ],
];

for (const shell of SHELLS) {
  for (const [name, files, expected] of CASES) {
    test(`[${shell}] next_numbered: ${name} → ${expected}`, () => {
      const r = next(shell, dirWith(files), "review", "t.9.review.*.md");
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.stdout, `${expected}\n`);
    });
  }

  test(`[${shell}] next_numbered refuses an {n} past 18 significant digits instead of wrapping`, () => {
    const bad = next(
      shell,
      dirWith(["t.9.review.9223372036854775807.x.md"]),
      "review",
      "*.review.*.md",
    );
    assert.equal(bad.status, 2);
    assert.equal(bad.stdout, "");
    assert.match(bad.stderr, /^next_numbered: refused \(overflow\)/);
    const ok = next(
      shell,
      dirWith([
        "t.9.review.999999999999999999.x.md",
        "t.9.review.0000000000000000000009.x.md",
      ]),
      "review",
      "*.review.*.md",
    );
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(ok.stdout, "1000000000000000000\n");
  });

  test(`[${shell}] next_numbered refuses a missing directory or kind with status 2`, () => {
    for (const args of ["", "'/no/such/dir' review", `'${os.tmpdir()}'`]) {
      const r = run(
        shell,
        `source '${HELPER}' || exit 1\nnext_numbered ${args}`,
      );
      assert.equal(r.status, 2, args);
      assert.equal(r.stdout, "", args);
      assert.match(r.stderr, /^next_numbered: refused \(usage\)/, args);
    }
  });
}

// ── The call sites ───────────────────────────────────────────────────────────

// Per skill: what its placeholders become, and the series its call line must number. `vars` are
// the shell variables the block assigns from next_numbered; `files` seed .1. and .3. of each.
const SITES = {
  "review-pr": {
    subs: { "{work-item-dir}": "$DIR" },
    vars: { N: ["task.9.pr-review.1.x.md", "task.9.pr-review.3.x.md"] },
  },
  "qa-planning": {
    subs: { "{document-directory}": "$DIR", "{stem}": "task.9" },
    vars: {
      RISK_N: ["task.9.risk.1.x.md", "task.9.risk.3.x.md"],
      TEST_DESIGN_N: ["task.9.test-design.1.x.md", "task.9.test-design.3.x.md"],
    },
  },
  "review-bug": {
    subs: { "{BUG_DIR}": "$DIR", "{BUG_PREFIX}": "story.7.4.bug.4" },
    // The story's own review in the same directory is another series.
    vars: {
      N: [
        "story.7.4.bug.4.review.1.x.md",
        "story.7.4.bug.4.review.3.x.md",
        "story.7.4.review.9.x.md",
      ],
    },
  },
  "review-epic": {
    subs: { "{epic-directory}": "$DIR", "{epic-number}": "5" },
    vars: { REVIEW_N: ["epic.5.review.1.x.md", "epic.5.review.3.x.md"] },
  },
  "review-task": {
    subs: { "{task-directory}": "$DIR", "task.{n}": "task.9" },
    vars: { REVIEW_N: ["task.9.review.1.x.md", "task.9.review.3.x.md"] },
  },
  finalise: {
    subs: {
      "{document-directory}": "$DIR",
      "{story.{epic}.{story} | task.{id} | bug mode: the bug prefix, e.g. task.67.bug.3}":
        "task.9",
    },
    vars: { DOD_N: ["task.9.dod.1.x.md", "task.9.dod.3.x.md"] },
  },
};

function bashBlocks(md) {
  const out = [];
  const re = /^([ \t]*)```bash\n([\s\S]*?)^\1```/gm;
  let m;
  while ((m = re.exec(md))) {
    const indent = m[1];
    out.push(
      m[2]
        .split("\n")
        .map((l) => (l.startsWith(indent) ? l.slice(indent.length) : l))
        .join("\n"),
    );
  }
  return out;
}

function callBlocks(skill) {
  const md = fs.readFileSync(
    path.join(REPO, "skills", skill, "SKILL.md"),
    "utf8",
  );
  return bashBlocks(md).filter((b) => /\bnext_numbered\b/.test(b));
}

test("the call-site population: every SKILL.md that calls next_numbered is in SITES, and back", () => {
  const callers = fs
    .readdirSync(path.join(REPO, "skills"))
    .filter((s) => fs.existsSync(path.join(REPO, "skills", s, "SKILL.md")))
    .filter((s) => callBlocks(s).length > 0)
    .sort();
  assert.ok(callers.length >= 6, `non-vacuous: ${callers.join(", ")}`);
  assert.deepEqual(callers, Object.keys(SITES).sort());
});

for (const [skill, site] of Object.entries(SITES)) {
  test(`${skill} no longer numbers a report by counting`, () => {
    const md = fs.readFileSync(
      path.join(REPO, "skills", skill, "SKILL.md"),
      "utf8",
    );
    assert.doesNotMatch(
      md,
      /starts at 1,? (and )?increments?|increments on re-review|increment if re-running/i,
    );
  });

  for (const shell of SHELLS) {
    test(`[${shell}] ${skill}'s own call line gives .4. after .1. and .3.`, () => {
      const blocks = callBlocks(skill);
      assert.equal(blocks.length, 1, `${skill} has one numbering block`);
      let script = blocks[0].replace(
        `.agents/skills/${skill}/references/newest-numbered.sh`,
        HELPER,
      );
      assert.notEqual(
        script,
        blocks[0],
        `${skill} sources its bundled newest-numbered.sh`,
      );
      for (const [from, to] of Object.entries(site.subs))
        script = script.split(from).join(to);
      assert.doesNotMatch(
        script,
        /\{[a-z-]+\}|\{BUG_[A-Z]+\}/,
        `unsubstituted placeholder in ${skill}`,
      );
      const dir = dirWith(Object.values(site.vars).flat());
      const echo = Object.keys(site.vars)
        .map((v) => `echo "${v}=$${v}"`)
        .join("\n");
      const r = run(shell, `DIR='${dir}'\n${script}\n${echo}`);
      assert.equal(r.status, 0, r.stderr);
      for (const v of Object.keys(site.vars))
        assert.match(r.stdout, new RegExp(`^${v}=4$`, "m"), v);
    });
  }
}
