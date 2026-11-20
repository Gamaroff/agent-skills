// skill-resolution-reach — task 311. Each develop orchestrator cites the rule, and the command the
// rule gives RUNS from that orchestrator's own bundled copy and exits as specified: 0 for this
// repository's copy, 1 for a shadow. A grep for the citation alone proves a string exists, not that
// the engine is reachable, so the command is extracted from the orchestrator's bundled rule and
// executed against real directories.

import test, { after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnBudget } from "../spawn-budget.mjs";

const BUDGET = spawnBudget("SKILL_RESOLUTION");
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..", "..");
const ORCHESTRATORS = ["develop-task", "develop-story", "develop-bug"];

const made = [];
after(() => {
  for (const d of made) rmSync(d, { recursive: true, force: true });
});

function tmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), prefix));
  made.push(d);
  return d;
}

// The fenced command under "## After every load" in a rule document.
function ruleCommand(ruleText) {
  const after = ruleText.slice(ruleText.indexOf("## After every load"));
  const m = after.match(/```bash\n([\s\S]*?)```/);
  assert.ok(
    m,
    "the rule has a fenced bash command under '## After every load'",
  );
  return m[1];
}

for (const orch of ORCHESTRATORS) {
  test(`${orch}: cites the rule, bundles the engine, and the cited command runs`, () => {
    const skillDir = join(REPO_ROOT, "skills", orch);
    const skill = readFileSync(join(skillDir, "SKILL.md"), "utf8");
    // The link TARGET, not the visible text: a link whose target is wrong still reads right.
    assert.match(
      skill,
      /\]\(references\/skill-resolution\.md#after-every-load\)/,
      "step 4 cites the rule",
    );
    assert.ok(
      existsSync(join(skillDir, "references", "skill-resolution.js")),
      "engine bundled",
    );

    // A consumer-shaped repository: the orchestrator's own references/ at .agents/skills/<orch>/.
    const root = tmp("skill-reach-");
    const refs = join(root, ".agents", "skills", orch, "references");
    mkdirSync(refs, { recursive: true });
    copyFileSync(
      join(skillDir, "references", "skill-resolution.js"),
      join(refs, "skill-resolution.js"),
    );
    mkdirSync(join(root, "skills", "finalise"), { recursive: true });
    writeFileSync(join(root, "skills", "finalise", "SKILL.md"), "# repo\n");
    execFileSync("git", ["init", "-q"], { cwd: root });

    const shadow = join(tmp("skill-reach-home-"), "synced", "finalise");
    mkdirSync(shadow, { recursive: true });

    const template = ruleCommand(
      readFileSync(join(skillDir, "references", "skill-resolution.md"), "utf8"),
    )
      .replace("{develop-story|develop-task|develop-bug}", orch)
      .replace('"{skill-name}"', '"finalise"');
    const run = (baseDir) =>
      spawnSync(
        "bash",
        [
          "-c",
          template.replace("{path from the Base directory line}", baseDir),
        ],
        {
          cwd: root,
          encoding: "utf8",
          timeout: BUDGET.timeoutMs,
        },
      );

    const repo = run(join(root, "skills", "finalise"));
    assert.equal(repo.status, 0, repo.stderr);
    assert.equal(JSON.parse(repo.stdout).reason, "repo");

    const sh = run(shadow);
    assert.equal(sh.status, 1, sh.stderr);
    assert.equal(JSON.parse(sh.stdout).reason, "shadowed");
  });
}

test("the three orchestrators bundle engines identical to the source but for the generated header", () => {
  const src = readFileSync(
    join(REPO_ROOT, "shared", "resources", "skill-resolution.js"),
    "utf8",
  );
  const stripHeader = (t) => t.replace(/^\/\/ AUTO-GENERATED[^\n]*\n/m, "");
  for (const orch of ORCHESTRATORS) {
    const copy = readFileSync(
      join(REPO_ROOT, "skills", orch, "references", "skill-resolution.js"),
      "utf8",
    );
    assert.notEqual(copy, src, "the bundler marks its copy as generated");
    assert.equal(stripHeader(copy), src, `${orch}'s copy matches the source`);
  }
});
