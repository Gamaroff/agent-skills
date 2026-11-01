// qa-finalise-rules-wiring.test.mjs — the QA skills run the finalise DoD's rules (task.248).
//
// The engines are tested on their own (probe-boundary-signals, criteria-drift, changelog-cites,
// qa-read-back). This file holds the wiring: it extracts the fenced blocks qa-task and qa-story ship,
// with qa-execute-snippets' extractBlocks, and runs them in a consumer-shaped repository against the
// skill's own bundled references/ — the blocks as written, on the copies that ship. A block that
// names the wrong path, reads the wrong field or prints the wrong line fails here, which grepping the
// SKILL.md for the engine's name would never catch.
//
// It also holds the single-home rule for the quantifier rule (obs #23): its text lives in
// finalise-dod-ac-prompt.md, and the QA skills cite it rather than restate it.
//
// Run: node --test shared/resources/tests/qa-finalise-rules-wiring.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { extractBlocks, zshAvailable } from "../qa-execute-snippets.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..", "..");
const SHELLS = ["bash", ...(zshAvailable() ? ["zsh"] : [])];
const SKILLS = {
  "qa-task": {
    slot: "{task-file}",
    dir: "docs/tasks/task.9.x",
    stem: "task.9",
    qa: "qa-task",
  },
  "qa-story": {
    slot: "{story-file}",
    dir: "docs/prd/p/epics/e/stories/story.9.1.1.x",
    stem: "story.9.1.1",
    qa: "qa-story",
  },
};

/** The one shipped block that contains every needle, dedented. Exactly one, or the test is wrong. */
function block(skill, ...needles) {
  const md = fs.readFileSync(
    path.join(REPO, "skills", skill, "SKILL.md"),
    "utf8",
  );
  const hits = extractBlocks(md).filter((b) =>
    needles.every((n) => b.code.includes(n)),
  );
  assert.equal(
    hits.length,
    1,
    `${skill}: expected one block with ${needles.join(" + ")}, found ${hits.length}`,
  );
  const lines = hits[0].code.split("\n");
  const indent = Math.min(
    ...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length),
  );
  return lines.map((l) => l.slice(indent)).join("\n");
}

const CRITERIA = (c) => ["## Success Criteria", "", ...c, ""].join("\n");
const SIGNAL = CRITERIA([
  "- [ ] 1. The parser must never accept a path outside the root.",
]);
const PLAIN = CRITERIA(["- [ ] 1. The report lists every file it read."]);

/**
 * A consumer repository: the skill's bundled references/ at .agents/skills/<skill>/references/, a
 * work item at its shape's path, committed. A fake `gh` that fails stands in for "no PR", so the
 * drift block takes its `develop` fallback and nothing reaches the network.
 */
function consumer(
  skill,
  { criteria = SIGNAL, gate = "gate: FAIL\n", changelog = null } = {},
) {
  const s = SKILLS[skill];
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "qa-finalise-wiring-")),
  );
  const git = (...a) =>
    execFileSync("git", ["-c", "user.email=a@b", "-c", "user.name=a", ...a], {
      cwd: root,
      encoding: "utf8",
    });
  git("init", "-q");
  fs.cpSync(
    path.join(REPO, "skills", skill, "references"),
    path.join(root, ".agents/skills", skill, "references"),
    {
      recursive: true,
    },
  );
  const bin = path.join(root, ".fake-bin");
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, "gh"), "#!/bin/sh\nexit 1\n", {
    mode: 0o755,
  });
  if (changelog !== null)
    fs.writeFileSync(path.join(root, "CHANGELOG.md"), changelog);
  fs.writeFileSync(
    path.join(root, "skills-config.yaml"),
    "changelog:\n  enforce: true\n",
  );

  const dir = path.join(root, s.dir);
  fs.mkdirSync(dir, { recursive: true });
  const doc = path.join(dir, `${path.basename(s.dir)}.md`);
  const rel = path.relative(root, doc);
  fs.writeFileSync(
    doc,
    [
      "---",
      "type: task",
      "updated: 2026-09-26",
      "---",
      "# W",
      "",
      `- [r](./${s.stem}.qa.1.x.md) [g](./${s.stem}.gate.1.x.yml)`,
      "",
      criteria,
      "## QA Testing Results",
      "",
      "**Gate Decision**: FAIL",
      "",
      "## Change Log",
      "",
      "| Date | Version | Description | Author |",
      "| -- | -- | -- | -- |",
      `| 2026-09-26 | | QA gate FAIL (40/100) — 1 finding | ${s.qa} |`,
      "",
    ].join("\n"),
  );
  fs.writeFileSync(path.join(dir, `${s.stem}.gate.1.x.yml`), gate);
  fs.writeFileSync(path.join(dir, `${s.stem}.qa.1.x.md`), "# r\n");
  // The review step's stamp: the document's blob as reviewed, committed with it so it is readable.
  const blob = git("hash-object", "-w", rel).trim();
  fs.writeFileSync(
    path.join(dir, `${s.stem}.review.1.x.md`),
    `# review\n\n**reviewed_blob:** \`${blob}\`\n`,
  );
  git("add", "-A");
  git("commit", "-qm", "reviewed");

  const run = (shell, code) =>
    spawnSync(shell, ["-c", code.split(s.slot).join(rel)], {
      cwd: root,
      encoding: "utf8",
      env: { PATH: `${bin}:${process.env.PATH}`, HOME: process.env.HOME },
    });
  const edit = (from, to) =>
    fs.writeFileSync(doc, fs.readFileSync(doc, "utf8").replace(from, to));
  return {
    root,
    doc,
    dir,
    run,
    edit,
    done: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

function within(skill, opts, fn) {
  const c = consumer(skill, opts);
  try {
    return fn(c);
  } finally {
    c.done();
  }
}

for (const skill of Object.keys(SKILLS)) {
  for (const shell of SHELLS) {
    test(`[${skill}/${shell}] the boundary block prints the gate's boundary_signals line`, () => {
      const code = block(skill, "probe-boundary-signals.mjs --doc");
      within(skill, {}, ({ run }) => {
        const r = run(shell, code);
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.equal(r.stdout.trim(), 'boundary_signals: ["never"]');
      });
      within(skill, { criteria: PLAIN }, ({ run }) => {
        assert.equal(
          run(shell, code).stdout.trim(),
          "boundary_signals: []",
          "no signal word, no signal",
        );
      });
    });

    test(`[${skill}/${shell}] the drift block makes an unapproved rewording a MEDIUM, and an appended note an ANSWER`, () => {
      const code = block(
        skill,
        "criteria-drift.js --doc",
        "--base-from-review",
      );
      within(skill, {}, ({ run, edit }) => {
        let r = run(shell, code);
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.match(
          r.stdout,
          /^criteria-drift: clean \(base: reviewed-blob\)$/m,
        );
        assert.doesNotMatch(r.stdout, /MEDIUM|ANSWER/);

        edit("must never accept", "should rarely accept");
        r = run(shell, code);
        assert.match(
          r.stdout,
          /^MEDIUM: criterion #1 reworded without an approver — escalate for an approver, or restore the criterion$/m,
        );

        edit("should rarely accept", "must never accept");
        edit(
          "outside the root.",
          "outside the root.\n      Evidence: probe-boundary-signals.test.mjs.",
        );
        r = run(shell, code);
        assert.match(r.stdout, /^ANSWER: criterion #1 appended/m);
        assert.doesNotMatch(r.stdout, /MEDIUM/);
      });
    });

    test(`[${skill}/${shell}] the read-back block halts boundary: false beside the signal with no reason, and passes it with one`, () => {
      const code = block(skill, "qa-read-back.js --doc", "substitute it");
      const sec = (extra) =>
        `gate: FAIL\nnfr_validation:\n  security:\n    status: PASS\n    boundary: false\n${extra}`;
      within(
        skill,
        { gate: sec('    boundary_signals: ["never"]\n') },
        ({ run }) => {
          const r = run(shell, code);
          assert.equal(r.status, 1, r.stdout + r.stderr);
          assert.match(r.stdout + r.stderr, /with no boundary_reason/);
        },
      );
      within(
        skill,
        {
          gate: sec(
            '    boundary_signals: ["never"]\n    boundary_reason: "wording about scope, no input gate"\n',
          ),
        },
        ({ run }) => {
          const r = run(shell, code);
          assert.equal(r.status, 0, r.stdout + r.stderr);
        },
      );
    });

    test(`[${skill}/${shell}] the CHANGELOG block reports a missing task citation as MEDIUM`, () => {
      const code = block(skill, "changelog-cites.sh");
      const missing =
        "# Changelog\n\n## [Unreleased]\n\n- **Other (task 8).** Body.\n";
      within(skill, { changelog: missing }, ({ run }) => {
        const r = run(shell, code);
        assert.equal(r.status, 0, r.stdout + r.stderr);
        if (skill === "qa-task")
          assert.match(r.stdout, /^MEDIUM: changelog missing \(task 9\)/m);
        // 6d cites tasks only, so a story stem is not applicable — and says so, never silently.
        else
          assert.match(
            r.stdout,
            /^changelog: not-applicable: story\.9\.1\.1 is not a task/m,
          );
      });
    });
  }
}

test("the quantifier rule has one home, finalise-dod-ac-prompt.md, and both QA skills cite it", () => {
  const RULE = "is checked member by member. List the members from";
  const homes = execFileSync(
    "git",
    [
      "grep",
      "-l",
      "-F",
      RULE,
      "--",
      "shared/resources/*.md",
      "skills/*/SKILL.md",
    ],
    {
      cwd: REPO,
      encoding: "utf8",
    },
  )
    .trim()
    .split("\n");
  assert.deepEqual(homes, ["shared/resources/finalise-dod-ac-prompt.md"]);
  for (const skill of Object.keys(SKILLS)) {
    const md = fs.readFileSync(
      path.join(REPO, "skills", skill, "SKILL.md"),
      "utf8",
    );
    assert.match(
      md,
      /rule 6 of\s+`finalise-dod-ac-prompt\.md` Step 3/,
      `${skill} must cite the rule`,
    );
    assert.ok(!md.includes(RULE), `${skill} must not restate the rule`);
  }
});
