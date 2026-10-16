// step-0-epic-resolution.test.mjs — the story-pipeline blocks that name a story or an epic read the
// id through doc-id.js and resolve an epic by (P, E), never by E alone (task 206).
//
// Under the hierarchical scheme a story is `story.{P}.{E}.{S}` and E restarts at 1 in every PRD.
// The blocks this file runs used to split the stem positionally (`awk -F. '{print $2}'` read P where
// it meant E), take "the first number" of the epic ref (P again), and `find … | head -1` an epic —
// an arbitrary epic from an arbitrary PRD, with no HALT. Each case here EXECUTES the shipped fenced
// block (extracted by its anchor, placeholders bound) under bash and zsh against a fixture tree.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import {
  ROOT,
  SHELLS,
  readDoc,
  blockBy,
  bind,
  run,
} from "../../../shared/resources/tests/lib/executed-prose.mjs";

const STEP0 = readDoc(
  "shared/resources/develop-pipeline-step-0-resolve-and-prepare.md",
);
const STEP0A = readDoc(
  "shared/resources/review-pipeline-step-0a-branch-setup.md",
);
const CREATE_BRANCH = readDoc("skills/create-branch/SKILL.md");
const CREATE_STORY = readDoc("skills/create-story/SKILL.md");
const ENSURE_STORY = readDoc("skills/ensure-story-github-issue/SKILL.md");
const SYNC_STORY = readDoc("skills/sync-github-story/SKILL.md");

const RESOLVE = blockBy(STEP0, "# Story ids and epic resolution (task 206)");
const REVIEW_IDS = blockBy(
  STEP0A,
  "# 0a.2 review-story — story ids through doc-id",
);
const REVIEW_SKIP = blockBy(STEP0A, '"feature/${STORY_STEM}."*)');
const DERIVE = blockBy(
  CREATE_BRANCH,
  "# Step 2b.4 — the integration branch name",
);
const ALLOCATE = blockBy(
  CREATE_STORY,
  "# create-story Step 1.1 — the story id (task 206)",
);
const ENSURE_S1 = blockBy(
  ENSURE_STORY,
  "# ensure-story Step S1 — story id + epic milestone through doc-id",
);
const SYNC_S3 = blockBy(
  SYNC_STORY,
  "# sync-github-story Step 3 — the story id through doc-id",
);
const SYNC_5B = blockBy(
  SYNC_STORY,
  "# sync-github-story Step 5b — the story id is derived HERE",
);
const ENSURE_DEDUP = blockBy(
  ENSURE_STORY,
  "# The story id, derived HERE — Step S1's block is another shell",
);
const ENSURE_MILESTONE = blockBy(
  ENSURE_STORY,
  "# No milestone when no epic document of this story's (P, E) is readable",
);
const ENSURE_CREATE = blockBy(
  ENSURE_STORY,
  "STORY_ISSUE_NUM=$(node references/tracker-issue.js",
);
const UNIQUE = blockBy(
  CREATE_STORY,
  "# create-story Step 5.1 — refuse an id another story already holds",
);

// The prefix of a shipped block up to (not including) its first side effect: what a block binds for
// itself is decided before it calls gh / the tracker CLI, so the prefix is the part under test.
const upTo = (block, marker) => {
  const at = block.indexOf(marker);
  assert.ok(at > 0, `marker ${JSON.stringify(marker)} not in the block`);
  return block.slice(0, at);
};

const DOC_ID = path.join(ROOT, "shared", "resources", "doc-id.js");

/** A throwaway consumer: doc-id installed where each skill's block looks for it, plus `files`. */
function consumer(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "step0-epic-"));
  for (const skill of [
    "develop-story",
    "review-story",
    "create-branch",
    "create-story",
    "ensure-story-github-issue",
    "sync-github-story",
  ]) {
    const refs = path.join(dir, ".agents", "skills", skill, "references");
    fs.mkdirSync(refs, { recursive: true });
    fs.copyFileSync(DOC_ID, path.join(refs, "doc-id.js"));
  }
  for (const [rel, body] of Object.entries(files)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, body);
  }
  return dir;
}

const story = (epicRef) => `---\ntype: story\nepic: ${epicRef}\n---\n# Story\n`;
const PRD1 = "docs/prd/web/prd.1.app/epics";
const PRD2 = "docs/prd/web/prd.2.other/epics";
// Two PRDs that BOTH hold an epic numbered 2 — E alone names both.
const TWO_PRDS = {
  [`${PRD1}/epic.1.2.payments/epic.1.2.payments.md`]: "# epic 1.2\n",
  [`${PRD1}/epic.1.2.payments/epic.1.2.review.1.payments.md`]:
    "# a review artifact\n",
  [`${PRD1}/epic.1.20.later/epic.1.20.later.md`]: "# epic 1.20\n",
  [`${PRD2}/epic.2.2.search/epic.2.2.search.md`]: "# epic 2.2\n",
};
const STORY_REL = `${PRD1}/epic.1.2.payments/stories/story.1.2.3.charge/story.1.2.3.charge.md`;

function resolve(shell, files, storyRel = STORY_REL) {
  const cwd = consumer(files);
  try {
    return run(shell, bind(RESOLVE, { "{story-file}": storyRel }), { cwd });
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
}

for (const shell of SHELLS) {
  test(`${shell}: Step 0 reads story.1.2.3 as P=1 E=2 S=3 and resolves the ONE epic (1, 2) beside an epic 2.2 and an epic 1.20 (task 206)`, () => {
    const r = resolve(shell, {
      ...TWO_PRDS,
      [STORY_REL]: story("epic.1.2.payments"),
    });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(
      r.stdout,
      new RegExp(
        `^story story\\.1\\.2\\.3 — epic 1\\.2: ${PRD1}/epic\\.1\\.2\\.payments/epic\\.1\\.2\\.payments\\.md$`,
        "m",
      ),
    );
  });

  test(`${shell}: Step 0 HALTs on zero epic documents for (P, E) — never another PRD's epic 2`, () => {
    const files = { ...TWO_PRDS, [STORY_REL]: story("epic.1.2.payments") };
    delete files[`${PRD1}/epic.1.2.payments/epic.1.2.payments.md`];
    const r = resolve(shell, files);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(
      r.stdout,
      /HALT: no epic document epic\.1\.2\.\*\.md under docs\//,
    );
    assert.doesNotMatch(r.stdout, /epic\.2\.2\.search/);
  });

  test(`${shell}: Step 0 still resolves the epic when find meets an unreadable directory under docs/ — pipefail fails only on the filter (task.206 QA cycle 2, CR2-6)`, () => {
    const cwd = consumer({
      ...TWO_PRDS,
      [STORY_REL]: story("epic.1.2.payments"),
    });
    const locked = path.join(cwd, "docs/prd/locked");
    fs.mkdirSync(locked, { recursive: true });
    fs.chmodSync(locked, 0o000);
    try {
      const r = run(shell, bind(RESOLVE, { "{story-file}": STORY_REL }), {
        cwd,
      });
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.match(
        r.stdout,
        /epic 1\.2: docs\/prd\/web\/prd\.1\.app\/epics\/epic\.1\.2\.payments\/epic\.1\.2\.payments\.md$/m,
      );
    } finally {
      fs.chmodSync(locked, 0o755);
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });

  test(`${shell}: Step 0 HALTs on two epic documents claiming (P, E), listing both — never head -1`, () => {
    const r = resolve(shell, {
      ...TWO_PRDS,
      [`docs/prd/copy/epic.1.2.dup/epic.1.2.dup.md`]: "# a second epic 1.2\n",
      [STORY_REL]: story("epic.1.2.payments"),
    });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /HALT: 2 epic documents claim epic 1\.2:/);
    assert.match(r.stdout, /epic\.1\.2\.dup\.md/);
    assert.match(r.stdout, /epic\.1\.2\.payments\.md/);
  });

  test(`${shell}: Step 0 HALTs when the story's epic: field disagrees with its own id, and on a legacy story name`, () => {
    const wrong = resolve(shell, {
      ...TWO_PRDS,
      [STORY_REL]: story("epic.2.2.search"),
    });
    assert.equal(wrong.status, 1);
    assert.match(
      wrong.stdout,
      /HALT: epic: epic\.2\.2\.search disagrees with the story's own id story\.1\.2\.3/,
    );

    const legacyRel = `${PRD1}/epic.1.2.payments/stories/story.2.3.charge/story.2.3.charge.md`;
    const legacy = resolve(
      shell,
      { ...TWO_PRDS, [legacyRel]: story("epic.1.2.payments") },
      legacyRel,
    );
    assert.equal(legacy.status, 1);
    assert.match(
      legacy.stdout,
      /not a story id doc-id can read .*migrate-doc-numbering/,
    );
  });

  test(`${shell}: Step 0a (review-story) reads P, E, S and auto-skips only on the story's own branch (task 206)`, () => {
    const cwd = consumer({ [STORY_REL]: story("epic.1.2.payments") });
    try {
      const ids = run(shell, `DOC_FILE=${STORY_REL}\n${REVIEW_IDS}`, { cwd });
      assert.equal(ids.status, 0, ids.stdout + ids.stderr);
      assert.match(
        ids.stdout,
        /^story story\.1\.2\.3 — PRD 1, epic 2, story 3$/m,
      );
      // 0a.3 ALONE — its own shell, as an agent runs it, on a REAL checked-out branch: it must
      // derive STORY_STEM (QA cycle 1, CR-8) and read the branch itself (QA cycle 2, CR2-1).
      // Only DOC_FILE, the documented input, is bound — never CURRENT_BRANCH.
      const g = (...a) =>
        execFileSync("git", ["-C", cwd, ...a], { stdio: "ignore" });
      g("init", "-q", "-b", "develop");
      g(
        "-c",
        "user.email=t@t",
        "-c",
        "user.name=t",
        "commit",
        "-q",
        "--allow-empty",
        "-m",
        "init",
      );
      const skip = (branch) => {
        g("checkout", "-q", "-B", branch);
        return run(
          shell,
          `DOC_FILE=${STORY_REL}\nAUTO_SKIPPED=false\n${REVIEW_SKIP}\necho "AUTO_SKIPPED=$AUTO_SKIPPED"`,
          { cwd },
        ).stdout;
      };
      assert.match(skip("feature/story.1.2.3.charge"), /AUTO_SKIPPED=true/);
      for (const other of [
        "feature/story.1.2.30.charge", // a story whose number extends this one's
        "feature/story.1.2.4.next", // the old `story.${E}.${S}` glob on P,E matched every story of epic 2
        "feature/story.1.2.3A.sub", // a sub-story is its own work item
      ])
        assert.match(skip(other), /AUTO_SKIPPED=false/, other);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });

  test(`${shell}: create-branch 2b.4 derives epic/{p}.{n}.{slug} from the epic's doc-id parse, and refuses a pattern without {p}, naming the key (task 206)`, () => {
    const EPIC = `${PRD1}/epic.1.2.payments/epic.1.2.payments.md`;
    const cwd = consumer({ [EPIC]: "# epic\n" });
    try {
      // bind() first proves the block has no other placeholder; the pattern's own `{p}` tokens are
      // substituted after, since they are the value under test, not unbound placeholders.
      bind(DERIVE, { "{branch-pattern}": "PATTERN", "{epic-file}": EPIC });
      const derive = (pattern) =>
        run(
          shell,
          DERIVE.split("{branch-pattern}")
            .join(pattern)
            .split("{epic-file}")
            .join(EPIC),
          { cwd },
        );
      const ok = derive("epic/{p}.{n}.{slug}");
      assert.equal(ok.status, 0, ok.stdout + ok.stderr);
      assert.match(ok.stdout, /^EPIC_BRANCH=epic\/1\.2\.payments$/m);
      const custom = derive("integration/prd-{p}/epic-{n}");
      assert.match(custom.stdout, /^EPIC_BRANCH=integration\/prd-1\/epic-2$/m);
      const legacy = derive("epic/{n}.{slug}");
      assert.equal(legacy.status, 1);
      assert.match(
        legacy.stdout,
        /HALT: branching\.epicIntegration\.branchPattern "epic\/\{n\}\.\{slug\}" has no \{p\}/,
      );
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });
}

for (const shell of SHELLS) {
  test(`${shell}: create-story Step 1.1 allocates S with doc-id next story — highest + 1 within (P, E), never another PRD's epic 2 (task 206)`, () => {
    const EPIC = `${PRD1}/epic.1.2.payments/epic.1.2.payments.md`;
    const cwd = consumer({
      ...TWO_PRDS,
      [`${PRD1}/epic.1.2.payments/stories/story.1.2.1.a/story.1.2.1.a.md`]:
        "x\n",
      [`${PRD1}/epic.1.2.payments/stories/story.1.2.4.b/story.1.2.4.b.md`]:
        "x\n",
      [`${PRD2}/epic.2.2.search/stories/story.2.2.9.c/story.2.2.9.c.md`]: "x\n",
    });
    try {
      const r = run(shell, bind(ALLOCATE, { "{epic-file}": EPIC }), { cwd });
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.match(
        r.stdout,
        /^next story: story\.1\.2\.5 \(PRD 1, epic 2, story 5\)$/m,
      );

      const legacy = `docs/prd/web/old/epics/epic.7.x/epic.7.x.md`;
      fs.mkdirSync(path.join(cwd, path.dirname(legacy)), { recursive: true });
      fs.writeFileSync(path.join(cwd, legacy), "# legacy\n");
      const bad = run(shell, bind(ALLOCATE, { "{epic-file}": legacy }), {
        cwd,
      });
      assert.equal(bad.status, 1);
      assert.match(
        bad.stdout,
        /not an epic id doc-id can read .*migrate-doc-numbering/,
      );
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });
}

for (const shell of SHELLS) {
  test(`${shell}: ensure-story S1 and sync-github-story Step 3 title a story [Story P.E.S] and mint the milestone Epic P.E — the epic issue's own string (task 206)`, () => {
    const EPIC_DIR = `${PRD1}/epic.1.2.payments`;
    const SUB = `${EPIC_DIR}/stories/story.1.2.3A.sub/story.1.2.3A.sub.md`;
    const cwd = consumer({
      [`${EPIC_DIR}/epic.1.2.payments.md`]:
        "---\ntitle: Payments\nprd_number: 1\nepic_number: 2\n---\n# Payments\n",
      [STORY_REL]: story("epic.1.2.payments"),
      [SUB]: story("epic.1.2.payments"),
    });
    try {
      const s1 = run(shell, `STORY_FILE_PATH=${STORY_REL}\n${ENSURE_S1}`, {
        cwd,
      });
      assert.equal(s1.status, 0, s1.stdout + s1.stderr);
      assert.match(
        s1.stdout,
        /^STORY_ID=1\.2\.3 MILESTONE_TITLE=Epic 1\.2 — Payments$/m,
      );
      const sub = run(shell, `STORY_FILE_PATH=${SUB}\n${SYNC_S3}`, { cwd });
      assert.match(
        sub.stdout,
        /^STORY_ID=1\.2\.3A$/m,
        "a sub-story keeps its letter",
      );

      // A story whose grandparent epic is another (P, E): no milestone, never the wrong one.
      const stray = `${EPIC_DIR}/stories/story.2.2.1.x/story.2.2.1.x.md`;
      fs.mkdirSync(path.join(cwd, path.dirname(stray)), { recursive: true });
      fs.writeFileSync(path.join(cwd, stray), story("epic.2.2.search"));
      const none = run(shell, `STORY_FILE_PATH=${stray}\n${ENSURE_S1}`, {
        cwd,
      });
      assert.match(none.stdout, /^STORY_ID=2\.2\.1 MILESTONE_TITLE=$/m);
      assert.match(none.stdout, /epic 2\.2 not readable beside the story/);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });
}

test("ensure-story dedups by title ONLY when github_issue is absent — a migrated story keeps its issue and no [Story P.E.S] duplicate is created (task 206)", () => {
  // HONEST LIMIT: Steps S2–S3 are prose an agent follows, not a block this suite can run; this pins
  // their ORDER and the early return, which is what keeps a migrated story (it carries github_issue)
  // from reaching the title search under its new [Story P.E.S] name.
  const s2 = ENSURE_STORY.indexOf(
    "### Step S2: Check if Story Issue Already Exists",
  );
  const s3 = ENSURE_STORY.indexOf("### Step S3: Dedup Search");
  assert.ok(
    s2 > 0 && s3 > s2,
    "S2 (the github_issue check) precedes S3 (the title dedup)",
  );
  const s2Body = ENSURE_STORY.slice(s2, s3);
  assert.match(
    s2Body,
    /If `github_issue` is a positive integer in the frontmatter/,
  );
  assert.match(s2Body, /\*\*Return immediately\*\*/);
  assert.match(ENSURE_STORY.slice(s3, s3 + 1500), /\[Story \$\{STORY_ID\}\]/);
});

for (const shell of SHELLS) {
  test(`${shell}: every tracker block that reads STORY_ID / MILESTONE_TITLE binds it ITSELF — run alone, with only STORY_FILE_PATH, each derives the right value (task.206 QA cycle 1, CR-1/CR-2/CR-3)`, () => {
    const EPIC_DIR = `${PRD1}/epic.1.2.payments`;
    const cwd = consumer({
      [`${EPIC_DIR}/epic.1.2.payments.md`]:
        "---\ntitle: Payments\nprd_number: 1\nepic_number: 2\n---\n# Payments\n",
      [STORY_REL]: story("epic.1.2.payments"),
    });
    try {
      const alone = (prefix, echo) =>
        run(shell, `STORY_FILE_PATH=${STORY_REL}\n${prefix}\n${echo}`, { cwd });
      const sync = alone(
        upTo(SYNC_5B, "mkdir -p .claude/state"),
        'echo "ID=$STORY_ID"',
      );
      assert.match(sync.stdout, /^ID=1\.2\.3$/m, sync.stderr);
      const dedup = alone(upTo(ENSURE_DEDUP, "DEDUP="), 'echo "ID=$STORY_ID"');
      assert.match(dedup.stdout, /^ID=1\.2\.3$/m, dedup.stderr);
      const ms = alone(
        upTo(ENSURE_MILESTONE, "[ -z"),
        'echo "M=$MILESTONE_TITLE"',
      );
      assert.match(ms.stdout, /^M=Epic 1\.2 — Payments$/m, ms.stderr);
      const create = alone(
        upTo(ENSURE_CREATE, "mkdir -p .claude/state"),
        'echo "ID=$STORY_ID M=$MILESTONE_TITLE"',
      );
      assert.match(
        create.stdout,
        /^ID=1\.2\.3 M=Epic 1\.2 — Payments$/m,
        create.stderr,
      );
      // A document that is not a story stops each block before any tracker call — the dedup
      // block before it searches (QA cycle 2, QA2-2) as well as the edit block.
      const badDedup = run(
        shell,
        `STORY_FILE_PATH=${EPIC_DIR}/epic.1.2.payments.md\n${upTo(ENSURE_DEDUP, "DEDUP=")}\necho REACHED`,
        { cwd },
      );
      assert.equal(badDedup.status, 1);
      assert.doesNotMatch(badDedup.stdout, /REACHED/);
      const bad = run(
        shell,
        `STORY_FILE_PATH=${EPIC_DIR}/epic.1.2.payments.md\n${upTo(SYNC_5B, "mkdir -p .claude/state")}\necho REACHED`,
        { cwd },
      );
      assert.equal(bad.status, 1);
      assert.doesNotMatch(bad.stdout, /REACHED/);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });

  test(`${shell}: create-story Step 5.1 passes an epic's FIRST story (no stories/ yet) and HALTs on a taken (P, E, S) (task.206 QA cycle 1, CR-5)`, () => {
    const EPIC = `${PRD1}/epic.1.2.payments/epic.1.2.payments.md`;
    const cwd = consumer({ [EPIC]: "# epic\n" });
    try {
      const scripts = path.join(cwd, ".agents/skills/create-story/scripts");
      fs.mkdirSync(scripts, { recursive: true });
      fs.copyFileSync(
        path.join(ROOT, "skills/create-story/scripts/lib.js"),
        path.join(scripts, "lib.js"),
      );
      // lib.js's own bundled closure, exactly as an install ships it.
      fs.cpSync(
        path.join(ROOT, "skills/create-story/references"),
        path.join(cwd, ".agents/skills/create-story/references"),
        { recursive: true },
      );
      const unique = (n) =>
        run(shell, bind(UNIQUE, { "{epic-file}": EPIC, "{story-num}": n }), {
          cwd,
        });
      const first = unique("1");
      assert.equal(first.status, 0, first.stdout + first.stderr);
      assert.match(first.stdout, /story\.1\.2\.1 is free/);
      const taken = `${PRD1}/epic.1.2.payments/stories/story.1.2.1.a/story.1.2.1.a.md`;
      fs.mkdirSync(path.join(cwd, path.dirname(taken)), { recursive: true });
      fs.writeFileSync(path.join(cwd, taken), "x\n");
      const clash = unique("1");
      assert.equal(clash.status, 1);
      assert.match(clash.stderr, /HALT: story\.1\.2\.1 already exists/);
      assert.equal(unique("2").status, 0);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });
}
