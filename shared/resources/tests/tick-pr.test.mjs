/**
 * tick-pr.sh (task.319) — `developNext.tickVia: pr`: the tick goes through a pull request that merges
 * only on the merge gate's green. The git side is real (a temporary repository and a bare remote); the
 * forge is a fake `gh`, or a fake `curl` for Bitbucket, whose "merge" moves the bare remote's base.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { neverRan, spawnBudget } from "../spawn-budget.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(HERE, "..", "tick-pr.sh");
const BUDGET = spawnBudget("TICK_PR");
const TICK = "docs/roadmap-tick-17.4";

const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@example.com",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@example.com",
};
const git = (cwd, ...args) =>
  execFileSync(
    "git",
    ["-c", "maintenance.auto=false", "-c", "gc.auto=0", ...args],
    {
      cwd,
      env: GIT_ENV,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  ).trim();

function fixture(t, { forge = "github" } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "tick-pr-"));
  t.after(() =>
    rmSync(dir, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    }),
  );
  const up = join(dir, "up.git");
  const wt = join(dir, "wt");
  const bin = join(dir, "bin");
  mkdirSync(bin);
  git(dir, "init", "-q", "--bare", "-b", "develop", up);
  git(dir, "init", "-q", "-b", "develop", wt);
  git(wt, "remote", "add", "origin", up);
  mkdirSync(join(wt, "docs"));
  writeFileSync(join(wt, "docs/roadmap.md"), "- [ ] 17.4\n");
  // Declared, because the insteadOf below hides the Bitbucket host from remote-based detection.
  writeFileSync(join(wt, "skills-config.yaml"), `vcs: ${forge}\n`);
  git(wt, "add", "-A");
  git(wt, "commit", "-q", "-m", "base");
  git(wt, "push", "-q", "-u", "origin", "develop");
  const st = (f) => join(dir, f);
  writeFileSync(st("rollup"), "SUCCESS\n");
  writeFileSync(st("log"), "");
  writeFileSync(
    join(bin, "gh"),
    `#!/bin/sh
echo "gh $*" >> "${st("log")}"
head() { git -C "${up}" rev-parse refs/heads/${TICK}; }
case "$*" in
  "pr list"*) [ -f "${st("pr")}" ] && echo 9; exit 0 ;;
  "pr create"*) touch "${st("pr")}"; echo https://x/pull/9 ;;
  *headRefName*) [ -f "${st("pr")}" ] && echo "9 $(cat "${st("head")}" 2>/dev/null || head) develop ${TICK}" ;;
  *headRefOid*) cat "${st("head")}" 2>/dev/null || head ;;
  *statusCheckRollup*unique*) echo 2 ;;
  *statusCheckRollup*) cat "${st("rollup")}" ;;
  "pr merge"*) [ -f "${st("merge-refused")}" ] && exit 1
     git -C "${up}" update-ref refs/heads/develop refs/heads/${TICK}; touch "${st("merged")}"
     [ ! -f "${st("merge-exit")}" ] ;;
  *"json state"*) if [ -f "${st("merged")}" ]; then echo MERGED; else echo OPEN; fi ;;
esac
`,
  );
  writeFileSync(
    join(bin, "curl"),
    `#!/bin/sh
out=/dev/null; prev=""; url=""; post=no; w=no
for a in "$@"; do [ "$prev" = "-o" ] && out="$a"; [ "$a" = POST ] && post=yes; [ "$a" = -w ] && w=yes; prev="$a"; url="$a"; done
# like the real one: a status code is printed only when -w asks for it
[ "$w" = yes ] || exec 1>/dev/null
echo "curl $post $url" >> "${st("log")}"
# move-after-statuses: the reads after the first statuses are the poll's second sample, its result line and
# the one before the merge; the head moves at the last
pr() { state=OPEN; [ -f "${st("merged")}" ] && state=MERGED
  hash="$(git -C "${up}" rev-parse --short=12 refs/heads/${TICK})"
  if [ -f "${st("move-after-statuses")}" ] && [ "$(sed -n '/statuses/,$p' "${st("log")}" | grep -c 'pullrequests/9$')" -ge 3 ]; then hash=bbbbbbbbbbbb; fi
  printf '{"id":9,"state":"%s","source":{"commit":{"hash":"%s"},"branch":{"name":"${TICK}"}},"destination":{"branch":{"name":"develop"}}}' "$state" "$hash"; }
case "$post $url" in
  "yes "*/merge) cat > "${st("merge.json")}"; [ -f "${st("merge-refused")}" ] || { git -C "${up}" update-ref refs/heads/develop refs/heads/${TICK}; touch "${st("merged")}"; }; printf 200 ;;
  "yes "*/pullrequests) cat > "${st("create.json")}"; touch "${st("pr")}"; printf 201 ;;
  *pullrequests/9) pr > "$out"; printf 200 ;;
  *pullrequests) if [ -f "${st("pr")}" ]; then printf '{"values":[%s]}' "$(pr)" > "$out"; else printf '{"values":[]}' > "$out"; fi; printf 200 ;;
  *statuses*) printf '{"values":[{"key":"prs:**:develop","state":"%s"}]}' "$(cat "${st("bbstate")}" 2>/dev/null || echo SUCCESSFUL)" > "$out"; printf 200 ;;
  *) printf 404 ;;
esac
`,
  );
  writeFileSync(join(bin, "sleep"), "#!/bin/sh\nexit 0\n");
  for (const f of ["gh", "curl", "sleep"]) chmodSync(join(bin, f), 0o755);
  const env = {
    ...GIT_ENV,
    PATH: `${bin}:${process.env.PATH}`,
    BITBUCKET_ACCESS_TOKEN: "fake",
  };
  // The Bitbucket slug is read from the configured URL; pushes still go to the bare repository.
  if (forge === "bitbucket") {
    git(wt, "config", "remote.origin.url", "git@bitbucket.org:ws/app.git");
    git(wt, "config", "remote.origin.pushurl", up);
    git(wt, "config", `url.${up}.insteadOf`, "git@bitbucket.org:ws/app.git");
  }
  const tick = (...args) => {
    let r;
    for (let i = 0; i <= BUDGET.retries; i += 1) {
      r = spawnSync("bash", [SCRIPT, ...args], {
        cwd: wt,
        env,
        encoding: "utf8",
        timeout: BUDGET.timeoutMs,
      });
      if (!neverRan(r)) break;
    }
    return { code: r.status, out: r.stdout.trim(), err: r.stderr.trim() };
  };
  const at = ["--base", "develop", "--branch", TICK];
  return {
    dir,
    up,
    wt,
    st,
    start: () => tick("start", ...at),
    finish: () => tick("finish", ...at),
    open: () => tick("open", ...at, "--title", "docs(roadmap): tick 17.4"),
    merge: (gate, ...more) =>
      tick(
        "merge",
        ...at,
        "--pr",
        "9",
        "--max-wait",
        "60",
        ...(gate === undefined ? [] : ["--quality-gate", gate]),
        ...more,
      ),
    raw: tick,
    env,
    commit: () => {
      writeFileSync(join(wt, "docs/roadmap.md"), "- [x] 17.4\n");
      git(wt, "commit", "-q", "-am", "docs(roadmap): tick 17.4 [x]");
    },
    base: () => git(up, "rev-parse", "refs/heads/develop"),
    log: () => readFileSync(st("log"), "utf8"),
  };
}

function opened(t, opts) {
  const f = fixture(t, opts);
  assert.equal(f.start().out, "new");
  f.commit();
  const r = f.open();
  assert.equal(r.out, "9", r.err);
  return f;
}

for (const forge of ["github", "bitbucket"]) {
  test(`${forge}: the tick opens a PR, leaves the base alone, and merges on green`, (t) => {
    const f = opened(t, { forge });
    const before = f.base();
    assert.notEqual(before, git(f.up, "rev-parse", `refs/heads/${TICK}`));
    const r = f.merge("true", "--strategy", "squash");
    assert.equal(r.out, "merged", r.err);
    assert.notEqual(f.base(), before);
    assert.equal(git(f.wt, "symbolic-ref", "--short", "HEAD"), "develop");
    assert.match(readFileSync(join(f.wt, "docs/roadmap.md"), "utf8"), /\[x\]/);
    if (forge === "bitbucket") {
      const sent = (n) => JSON.parse(readFileSync(f.st(n), "utf8"));
      assert.equal(sent("merge.json").merge_strategy, "squash");
      assert.equal(sent("create.json").destination.branch.name, "develop");
      assert.doesNotMatch(f.log(), /^gh /m);
    } else assert.match(f.log(), /gh pr merge 9 --squash --match-head-commit/);
  });

  test(`${forge}: red, pending or unread CI never merges`, (t) => {
    const states =
      forge === "github"
        ? ["FAILURE", "PENDING", "CANCELLED", "UNKNOWN"]
        : ["FAILED", "INPROGRESS", "STOPPED"];
    for (const s of states) {
      const f = opened(t, { forge });
      const before = f.base();
      writeFileSync(
        f.st(forge === "github" ? "rollup" : "bbstate"),
        forge === "github" ? `${s}\n` : s,
      );
      const r = f.merge("true");
      assert.equal(r.code, 1, `${s}: ${r.err}`);
      assert.match(r.err, /HALT: .*not merged/);
      assert.equal(f.base(), before, s);
      assert.ok(!existsSync(f.st("merged")), s);
    }
  });
}

test("the quality gate is run here, on the tick's own tree: absent or red refuses before any CI read (T319-CR-112)", (t) => {
  const f = opened(t);
  for (const gate of [undefined, "exit 3", "", "no-such-command-x"]) {
    const r = f.merge(gate);
    assert.notEqual(r.code, 0);
    assert.ok(!existsSync(f.st("merged")), String(gate));
  }
  assert.match(f.merge("exit 3").err, /quality gate failed .*exit 3/);
  // off the tick branch, or over uncommitted edits, the gate would judge another tree
  git(f.wt, "checkout", "-q", "develop");
  assert.match(f.merge("true").err, /HEAD is not on/);
  git(f.wt, "checkout", "-q", TICK);
  writeFileSync(join(f.wt, "docs/roadmap.md"), "- [x] edited\n");
  assert.match(f.merge("true").err, /uncommitted changes/);
  git(f.wt, "checkout", "-q", "--", "docs/roadmap.md");
  // a gate that moves the head judged something else
  const moved = f.merge("git commit -q --allow-empty -m x");
  assert.match(moved.err, /HEAD moved/);
  git(f.wt, "reset", "-q", "--hard", "HEAD~1");
  assert.doesNotMatch(f.log(), /statusCheckRollup/);
  assert.ok(!existsSync(f.st("merged")));
  const ran = f.st("gate-ran");
  const r = f.merge(`cat docs/roadmap.md > "${ran}"; echo gate output`);
  assert.equal(
    r.out,
    "merged",
    "the gate's own output never reaches the answer",
  );
  assert.match(readFileSync(ran, "utf8"), /\[x\]/);
});

test("a head that moved since the tick, and another destination, are refused", (t) => {
  const f = opened(t);
  writeFileSync(f.st("head"), `${"b".repeat(40)}\n`);
  const r = f.merge("true");
  assert.equal(r.code, 1);
  assert.match(r.err, /is not the tick head/);
  const g = opened(t);
  const other = g.raw(
    "merge",
    "--base",
    "main",
    "--branch",
    TICK,
    "--pr",
    "9",
    "--quality-gate",
    "true",
  );
  assert.equal(other.code, 1);
  assert.match(other.err, /targets develop, not main/);
});

test("a PR with no checks merges on the quality gate alone", (t) => {
  const f = opened(t);
  writeFileSync(f.st("rollup"), "NONE\n");
  const r = f.merge("true");
  assert.equal(r.out, "merged", r.err);
});

test("a quality gate that holds no command is refused before the PR is read (T319-CR-506)", (t) => {
  const f = opened(t);
  for (const gate of ["", "  ", "\n\t\n", "# npm test", "  # a\n\n# b\n"]) {
    const r = f.merge(gate);
    assert.equal(r.code, 2, JSON.stringify(gate));
    assert.ok(!existsSync(f.st("merged")));
  }
  assert.equal(f.merge("# the suite\ntrue").out, "merged");
});

test("every Bitbucket request on the tick's path has a time limit (T319-CR-504)", () => {
  const calls = ["tick-pr.sh", "pr-read.sh", "finalise-ci-poll.sh"].flatMap(
    (f) =>
      readFileSync(resolve(HERE, "..", f), "utf8")
        .split("\n")
        .filter(
          (line) => /(?:^|[\s(|])curl\s/.test(line) && !/^\s*#/.test(line),
        )
        .map((line) => `${f}: ${line.trim()}`),
  );
  assert.equal(calls.length, 6);
  for (const call of calls) assert.match(call, /curl -s --max-time \d+ /, call);
});

test("no checks is an answer only after the whole wait and under no floor; a wait that is not a number is a usage error (T319-CR-303)", (t) => {
  const f = opened(t);
  writeFileSync(f.st("rollup"), "NONE\n");
  const merge = (...more) =>
    f.raw(
      "merge",
      "--base",
      "develop",
      "--branch",
      TICK,
      "--pr",
      "9",
      "--quality-gate",
      "true",
      ...more,
    );
  for (const wait of ["0", "soon", "-5", "1.5", "", "060", "60 ", "1234567"])
    assert.equal(merge("--max-wait", wait).code, 2, `wait '${wait}'`);
  for (const floor of ["x", "-1", "", "01", "1 "])
    assert.equal(
      merge("--max-wait", "60", "--checks", floor).code,
      2,
      `floor '${floor}'`,
    );
  const floored = merge("--max-wait", "60", "--checks", "2");
  assert.equal(floored.code, 1, floored.err);
  assert.match(floored.err, /no checks and --checks asks for 2; not merged/);
  assert.ok(!existsSync(f.st("merged")));
  assert.equal(merge("--max-wait", "60", "--checks", "0").out, "merged");
  // a poll that stopped early says nothing about the checks: a copy of the script beside a short poll
  const g = opened(t);
  const lib = join(g.dir, "lib");
  cpSync(resolve(HERE, ".."), lib, {
    recursive: true,
    filter: (p) => !p.includes("/tests"),
  });
  for (const [waited, want] of [
    ["30s", /before the whole wait/],
    ["soon", /before the whole wait/],
    ["60s", /^$/],
  ]) {
    writeFileSync(
      join(lib, "finalise-ci-poll.sh"),
      `printf 'NONE %s 0 ${waited} TREE_EQ=\\n' "$2" > "$4"\n`,
    );
    const r = spawnSync(
      "bash",
      [
        join(lib, "tick-pr.sh"),
        ...["merge", "--base", "develop", "--branch", TICK, "--pr", "9"],
        ...["--quality-gate", "true", "--max-wait", "60"],
      ],
      { cwd: g.wt, env: g.env, encoding: "utf8", timeout: BUDGET.timeoutMs },
    );
    assert.equal(r.status, waited === "60s" ? 0 : 1, r.stderr);
    if (waited !== "60s") assert.match(r.stderr, want);
  }
});

test("a gate that rewrites a tracked file, or leaves the tick branch, passed on something else (T319-CR-305)", (t) => {
  const f = opened(t);
  for (const [gate, why] of [
    ["echo formatted >> docs/roadmap.md", /changed tracked files/],
    ["echo x > new.txt && git add new.txt", /changed tracked files/],
    ["git checkout -q --detach", /left docs\/roadmap-tick-17\.4/],
  ]) {
    const r = f.merge(gate);
    assert.equal(r.code, 1, gate);
    assert.match(r.err, why);
    assert.ok(!existsSync(f.st("merged")), gate);
    git(f.wt, "checkout", "-q", TICK);
    git(f.wt, "reset", "-q", "--hard", TICK);
  }
  assert.doesNotMatch(f.log(), /statusCheckRollup/);
  // an untracked file is not the tick's content
  assert.equal(f.merge("echo log > gate.log").out, "merged");
});

test("a remote that cannot be asked for the tick branch is a HALT, never `new` (T319-CR-304)", (t) => {
  const f = fixture(t);
  f.start();
  f.commit();
  f.open();
  git(f.wt, "checkout", "-q", "develop");
  git(f.wt, "branch", "-q", "-D", TICK);
  git(f.wt, "update-ref", "-d", `refs/remotes/origin/${TICK}`);
  // a git that cannot list the remote: the fetch of the base still works
  const bin = join(f.dir, "bin");
  const real = execFileSync("sh", ["-c", "command -v git"], {
    encoding: "utf8",
  }).trim();
  for (const [broken, why] of [
    ["ls-remote", /origin could not be asked/],
    ["fetch", /git fetch origin develop failed/],
  ]) {
    writeFileSync(
      join(bin, "git"),
      `#!/bin/sh\n[ "$1" = ${broken} ] && exit 128\nexec "${real}" "$@"\n`,
    );
    chmodSync(join(bin, "git"), 0o755);
    const r = f.start();
    assert.equal(r.code, 1, `${broken}: ${r.out}`);
    assert.match(r.err, why);
  }
  // only the tick branch's own fetch fails
  writeFileSync(
    join(bin, "git"),
    `#!/bin/sh\ncase "$*" in "fetch"*"${TICK}"*) exit 128 ;; esac\nexec "${real}" "$@"\n`,
  );
  assert.match(f.start().err, /fetch origin docs\/roadmap-tick-17\.4 failed/);
  rmSync(join(bin, "git"));
  assert.equal(f.start().out, "resume");
  // absent on the remote, with a stale tracking ref: gone, and the tick starts over
  const g = fixture(t);
  git(g.wt, "update-ref", `refs/remotes/origin/${TICK}`, "HEAD");
  assert.equal(g.start().out, "new");
  assert.throws(() =>
    git(g.wt, "rev-parse", "--verify", `refs/remotes/origin/${TICK}`),
  );
});

test("the merge is judged by the PR's state, not by the command's exit status", (t) => {
  const landed = opened(t);
  writeFileSync(landed.st("merge-exit"), "");
  assert.equal(landed.merge("true").out, "merged");
  const refused = opened(t);
  writeFileSync(refused.st("merge-refused"), "");
  const r = refused.merge("true");
  assert.equal(r.code, 1);
  assert.match(r.err, /'OPEN' after the merge call/);
});

test("resume: an interrupted tick is found again, locally or only on the remote, and no second PR opens", (t) => {
  const f = fixture(t);
  f.start();
  f.commit();
  git(f.wt, "checkout", "-q", "develop");
  assert.equal(f.start().out, "resume", "a local tick branch with a commit");
  f.open();
  git(f.wt, "checkout", "-q", "develop");
  git(f.wt, "branch", "-q", "-D", TICK);
  assert.equal(f.start().out, "resume", "only the remote has it");
  assert.equal(f.open().out, "9");
  assert.equal((f.log().match(/gh pr create/g) ?? []).length, 1);
});

test("resume at the newer of the two tick branches, and at neither when they have parted (T319-CR-702)", (t) => {
  // the tick branch on the remote, with `more` added to it there
  const ticked = (more) => {
    const f = fixture(t);
    f.start();
    f.commit();
    f.open();
    const local = git(f.wt, "rev-parse", TICK);
    if (more) {
      const other = join(f.dir, "other");
      git(f.dir, "clone", "-q", "-b", TICK, f.up, other);
      writeFileSync(join(other, "updated.md"), "x\n");
      git(other, "add", "-A");
      git(other, "commit", "-q", "-m", "update branch");
      git(other, "push", "-q", "origin", "HEAD");
    }
    return { ...f, local, remote: () => git(f.up, "rev-parse", TICK) };
  };
  for (const from of [TICK, "develop"]) {
    const behind = ticked(true);
    git(behind.wt, "checkout", "-q", from);
    assert.equal(behind.start().out, "resume", from);
    assert.equal(git(behind.wt, "rev-parse", "HEAD"), behind.remote());
    assert.equal(behind.open().out, "9", "the push is not rejected");
  }
  // control: the local branch holds more, and is kept
  const ahead = ticked(false);
  git(ahead.wt, "commit", "-q", "--allow-empty", "-m", "more");
  const kept = git(ahead.wt, "rev-parse", "HEAD");
  assert.equal(ahead.start().out, "resume");
  assert.equal(git(ahead.wt, "rev-parse", "HEAD"), kept);
  // each holds a commit the other does not: neither is dropped
  const parted = ticked(true);
  git(parted.wt, "commit", "-q", "--allow-empty", "-m", "own");
  const own = git(parted.wt, "rev-parse", "HEAD");
  const r = parted.start();
  assert.equal(r.code, 1, r.out);
  assert.match(r.err, /have diverged/);
  assert.equal(git(parted.wt, "rev-parse", TICK), own);
});

test("the tick is pushed to its own branch whatever the push and tracking settings are (T319-CR-701)", (t) => {
  const row = readFileSync(
    resolve(HERE, "../../../skills/develop-next/SKILL.md"),
    "utf8",
  ).match(/cut the tick branch from the local base with `git ([^`]+)`/);
  assert.ok(row, "develop-next says how the branch is cut");
  const cut = row[1]
    .replace("docs/<roadmap>-tick-<item>", TICK)
    .replace("<baseBranch>", "develop")
    .split(" ");
  // as it says, and as an install of an older develop-next does it
  for (const args of [cut, cut.filter((a) => a !== "--no-track")])
    for (const setup of ["always", "inherit", "true", "false"]) {
      const f = fixture(t);
      git(f.wt, "config", "push.default", "upstream");
      git(f.wt, "config", "branch.autoSetupMerge", setup);
      const base = git(f.up, "rev-parse", "develop");
      f.commit();
      git(f.wt, ...args);
      assert.equal(f.start().out, "resume");
      assert.equal(f.open().out, "9", setup);
      assert.equal(git(f.up, "rev-parse", "develop"), base, setup);
      assert.equal(
        git(f.up, "rev-parse", TICK),
        git(f.wt, "rev-parse", TICK),
        setup,
      );
    }
  assert.ok(cut.includes("--no-track"));
});

test("bitbucket: the head is read again just before the merge call (T319-CR-109)", (t) => {
  const f = opened(t, { forge: "bitbucket" });
  // the PR's head moves once the poll has answered: the statuses are read, then the branch moves
  const r = f.merge(`touch "${f.st("move-after-statuses")}"`);
  assert.equal(r.code, 1, r.err);
  assert.match(r.err, /is not the tick head/);
  assert.ok(!existsSync(f.st("merged")));
});

/** The forge squashes the tick: the base gets its content in one commit of its own. */
function squashOnForge(f) {
  const tree = git(f.up, "rev-parse", `refs/heads/${TICK}^{tree}`);
  const c = git(
    f.wt,
    "commit-tree",
    tree,
    "-p",
    f.base(),
    "-m",
    "squashed tick",
  );
  git(f.wt, "push", "-q", "origin", `${c}:refs/heads/develop`);
}

test("start recognises a tick that landed by squash, and leaves the checkout on the updated base (T319-CR-104)", (t) => {
  const f = opened(t);
  squashOnForge(f);
  git(f.wt, "checkout", "-q", "develop");
  const r = f.start();
  assert.equal(r.out, "landed", r.err);
  assert.equal(git(f.wt, "symbolic-ref", "--short", "HEAD"), "develop");
  assert.equal(git(f.wt, "rev-parse", "HEAD"), f.base());
  // and when the base moved on in another row since
  const g = opened(t);
  squashOnForge(g);
  git(g.wt, "fetch", "-q", "origin", "develop");
  git(g.wt, "checkout", "-q", "-B", "develop", "origin/develop");
  writeFileSync(join(g.wt, "docs/other.md"), "later\n");
  git(g.wt, "add", "-A");
  git(g.wt, "commit", "-q", "-m", "later");
  git(g.wt, "push", "-q", "origin", "develop");
  assert.equal(g.start().out, "landed");
  // control: a tick that has not landed is resumed
  const h = opened(t);
  git(h.wt, "checkout", "-q", "develop");
  assert.equal(h.start().out, "resume");
});

test("a landed tick is recognised when the base changed the row beside it since, and an absent one is not (T319-CR-902)", (t) => {
  const MAP = "docs/roadmap.md";
  const OTHER = "docs/log.md";
  const start = (after, { tick, files = {} } = {}) => {
    const f = fixture(t);
    const on = (branch, texts, msg) => {
      git(f.wt, "checkout", "-q", branch);
      for (const [file, text] of Object.entries(texts))
        writeFileSync(join(f.wt, file), text);
      git(f.wt, "add", "-A");
      git(f.wt, "commit", "-q", "-m", msg);
    };
    on("develop", { [MAP]: "- [ ] 1\n\n- [ ] 2\n- [ ] 3\n", ...files }, "rows");
    git(f.wt, "push", "-q", "origin", "develop");
    assert.equal(f.start().out, "new");
    on(TICK, tick ?? { [MAP]: "- [ ] 1\n\n- [x] 2\n- [ ] 3\n" }, "tick");
    git(f.wt, "push", "-q", "origin", TICK);
    for (const [i, texts] of after.entries())
      on("develop", texts, `later ${i}`);
    git(f.wt, "push", "-q", "origin", "develop");
    git(f.wt, "fetch", "-q", "origin");
    const clean = spawnSync(
      "git",
      ["merge-tree", "--write-tree", "origin/develop", TICK],
      { cwd: f.wt, env: f.env },
    );
    assert.equal(clean.status, 1, "a merge would conflict");
    const r = f.start();
    assert.equal(r.code, 0, r.err);
    return r.out;
  };
  const landed = { [MAP]: "- [ ] 1\n\n- [x] 2\n- [ ] 3\n" };
  const beside = { [MAP]: "- [ ] 1\n\n- [x] 2\n- [x] 3\n" };
  assert.equal(start([landed, beside]), "landed");
  // what the base did to the row after it landed is the base's own
  assert.equal(
    start([landed, beside, { [MAP]: "- [ ] 1\n\n- [~] 2\n" }]),
    "landed",
  );
  // the row says something else and never said what the tick did
  assert.equal(start([{ [MAP]: "- [ ] 1\n\n- [~] 2\n- [ ] 3\n" }]), "resume");
  // the same words on another item's row (T319-CR-1102)
  assert.equal(
    start([{ [MAP]: "A1\nready\nB\naccepted\n" }], {
      files: { [MAP]: "A\nready\nB\nready\n" },
      tick: { [MAP]: "A\naccepted\nB\nready\n" },
    }),
    "resume",
  );
  // the row it removed is there again beside the one it added
  assert.equal(
    start([{ [MAP]: "- [ ] 1\n\n- [x] 2\n- [ ] 2\n- [x] 3\n" }]),
    "resume",
  );
  // half of it: the second file's row is not there
  const two = {
    tick: { ...landed, [OTHER]: "old\nticked 2\n" },
    files: { [OTHER]: "old\n" },
  };
  assert.equal(start([beside], two), "resume");
  assert.equal(
    start([two.tick, { ...beside, [OTHER]: "old\nticked 2\nnewer\n" }], two),
    "landed",
  );
  // a file it added
  const added = { tick: { ...landed, [OTHER]: "ticked 2\n" } };
  assert.equal(start([added.tick, beside], added), "landed");
  assert.equal(start([beside], added), "resume");
});

test("a read that fails is never a landed tick: the branch with it would be deleted (T319-CR-902)", (t) => {
  const MAP = "docs/roadmap.md";
  const at = (wt, branch, text) => {
    git(wt, "checkout", "-q", branch);
    writeFileSync(join(wt, MAP), text);
    git(wt, "commit", "-q", "-am", `${branch}: ${text}`); // not the same commit on both
  };
  // every git question `start` asks before and after the merge, with the one of them failing
  for (const broken of [
    null,
    "merge-tree --write-tree",
    "merge-base refs/remotes/origin/develop",
    "rev-list --first-parent",
    "rev-parse --verify --quiet ????????????????????????????????????????^{tree}",
  ]) {
    const f = fixture(t);
    git(f.wt, "checkout", "-q", "develop");
    writeFileSync(join(f.wt, MAP), "- [ ] 1\n- [ ] 2\n- [ ] 3\n");
    git(f.wt, "add", "-A");
    git(f.wt, "commit", "-q", "-m", "rows");
    git(f.wt, "push", "-q", "origin", "develop");
    assert.equal(f.start().out, "new");
    at(f.wt, TICK, "- [ ] 1\n- [x] 2\n- [ ] 3\n");
    git(f.wt, "push", "-q", "origin", TICK);
    at(f.wt, "develop", "- [ ] 1\n- [x] 2\n- [ ] 3\n");
    at(f.wt, "develop", "- [ ] 1\n- [x] 2\n- [x] 3\n");
    git(f.wt, "push", "-q", "origin", "develop");
    git(f.wt, "fetch", "-q", "origin");
    const bin = join(dirname(f.wt), "bin"); // first on the script's PATH, and not on this test's
    const real = spawnSync("sh", ["-c", "command -v git"], {
      env: f.env,
      encoding: "utf8",
    }).stdout.trim();
    writeFileSync(
      join(bin, "git"),
      `#!/bin/sh\ncase "$*" in ${broken ? `${broken.replaceAll(" ", "\\ ")}*) echo broken >> "${bin}/hit"; exit 128 ;;` : ""} *) exec "${real}" "$@" ;; esac\n`,
    );
    chmodSync(join(bin, "git"), 0o755);
    const r = f.start();
    if (broken === null) {
      assert.equal(r.out, "landed", r.err);
      continue;
    }
    assert.ok(existsSync(join(bin, "hit")), `${broken}: it was asked`);
    assert.notEqual(r.out, "landed", broken);
    assert.equal(
      git(f.wt, "rev-parse", "--verify", "-q", TICK).length,
      40,
      `${broken}: the branch is there`,
    );
  }
});

test("finish: a row that already reads ticked returns to the base; a commit or an edit is refused (T319-CR-104)", (t) => {
  const f = fixture(t);
  f.start();
  writeFileSync(join(f.wt, "docs/roadmap.md"), "- [x] 17.4\n");
  assert.match(f.finish().err, /uncommitted edit/);
  git(f.wt, "commit", "-q", "-am", "tick");
  assert.match(f.finish().err, /holds a commit/);
  git(f.wt, "reset", "-q", "--hard", "origin/develop");
  const r = f.finish();
  assert.equal(r.out, "already-recorded", r.err);
  assert.equal(git(f.wt, "symbolic-ref", "--short", "HEAD"), "develop");
});

test("once the PR is merged the answer is merged: tidying that fails is a warning (T319-CR-105)", (t) => {
  const f = opened(t);
  // the local base diverged, so it cannot fast-forward
  git(f.wt, "checkout", "-q", "develop");
  git(f.wt, "commit", "-q", "--allow-empty", "-m", "local only");
  git(f.wt, "checkout", "-q", TICK);
  const r = f.merge("true");
  assert.equal(r.code, 0, r.err);
  assert.equal(r.out, "merged");
  assert.match(r.err, /WARNING: the checkout could not be moved/);
});

test("ticked-unpushed: a local base holding the tick commit goes back to origin's, so a squash merge can fast-forward it (T319-CR-105)", (t) => {
  const f = fixture(t);
  f.commit(); // on develop, the push refused
  const tick = git(f.wt, "rev-parse", "HEAD");
  git(f.wt, "branch", "-f", TICK, "develop");
  assert.equal(f.start().out, "resume");
  assert.equal(
    git(f.wt, "rev-parse", "develop"),
    git(f.wt, "rev-parse", "origin/develop"),
  );
  assert.equal(git(f.wt, "rev-parse", TICK), tick, "the commit is not lost");
  // origin has moved on since: the local base neither fast-forwards nor holds origin's (T319-CR-309)
  const advance = (x, ...extra) => {
    const other = join(x.dir, "other");
    git(x.dir, "clone", "-q", x.up, other);
    writeFileSync(join(other, "elsewhere.md"), "x\n");
    git(other, "add", "-A");
    for (const args of extra) git(other, ...args);
    git(other, "commit", "-q", "-m", "moved on");
    git(other, "push", "-q", "origin", "develop");
  };
  const h = fixture(t);
  h.commit();
  git(h.wt, "branch", "-f", TICK, "develop");
  advance(h);
  assert.equal(h.start().out, "resume");
  assert.equal(
    git(h.wt, "rev-parse", "develop"),
    git(h.wt, "rev-parse", "origin/develop"),
  );
  git(h.wt, "checkout", "-q", "develop");
  git(h.wt, "pull", "-q", "--ff-only", "origin", "develop");
  assert.equal(
    h.start().out,
    "resume",
    "Step 4's own start, after its re-sync",
  );
  // the tick landed by squash while the local base held it: start, called from the base, says landed
  const l = fixture(t);
  l.commit();
  git(l.wt, "branch", "-f", TICK, "develop");
  advance(l, ["rm", "-q", "docs/roadmap.md"]);
  const other = join(l.dir, "other");
  mkdirSync(join(other, "docs"), { recursive: true });
  writeFileSync(join(other, "docs/roadmap.md"), "- [x] 17.4\n");
  git(other, "add", "-A");
  git(other, "commit", "-q", "-m", "squashed tick");
  git(other, "push", "-q", "origin", "develop");
  const landed = l.start();
  assert.equal(landed.out, "landed", landed.err);
  assert.equal(landed.err, "");
  // its branch is gone, so a second start would begin a second tick: develop-next runs none (T319-CR-509)
  assert.equal(git(l.wt, "branch", "--list", TICK), "");
  const row = readFileSync(
    resolve(HERE, "../../../skills/develop-next/SKILL.md"),
    "utf8",
  )
    .split("\n")
    .filter((x) => x.includes("`ticked-unpushed` → push it"));
  assert.equal(row.length, 1);
  assert.match(row[0], /On `landed` [^.]*: run no second `start`\)/);
  assert.equal(git(l.wt, "symbolic-ref", "--short", "HEAD"), "develop");
  assert.equal(
    git(l.wt, "rev-parse", "develop"),
    git(l.wt, "rev-parse", "origin/develop"),
  );
  // control: a local base with a commit of its own is left alone
  const g = fixture(t);
  g.commit();
  git(g.wt, "branch", "-f", TICK, "develop");
  git(g.wt, "commit", "-q", "--allow-empty", "-m", "own");
  const own = git(g.wt, "rev-parse", "develop");
  assert.equal(g.start().out, "resume");
  assert.equal(git(g.wt, "rev-parse", "develop"), own);
});

test("develop-next's three tick blocks run as written: every input is bound in the block, and an unsubstituted one HALTs (T319-CR-103)", (t) => {
  const skill = readFileSync(
    resolve(HERE, "..", "..", "..", "skills/develop-next/SKILL.md"),
    "utf8",
  );
  const from = skill.indexOf(
    "### How the tick is pushed: `developNext.tickVia`",
  );
  const section = skill.slice(from, skill.indexOf("\n### ", from + 10));
  const blocks = [...section.matchAll(/^ *```bash\n([\s\S]*?)^ *```$/gm)]
    .map((m) => m[1])
    .filter((b) => b.includes("tick-pr.sh "));
  assert.equal(blocks.length, 3);
  const dir = mkdtempSync(join(tmpdir(), "tick-blocks-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const refs = join(dir, ".agents/skills/develop-next/references");
  mkdirSync(refs, { recursive: true });
  writeFileSync(
    join(refs, "tick-pr.sh"),
    'printf "<%s>" "$@"; echo; echo ran >> ran.log\n',
  );
  const sh = (block) =>
    spawnSync("bash", ["-u", "-c", block], {
      cwd: dir,
      encoding: "utf8",
      timeout: BUDGET.timeoutMs,
    });
  for (const b of blocks) {
    const r = sh(b);
    assert.equal(r.status, 1, b);
    assert.match(r.stdout, /^HALT: /);
  }
  assert.ok(!existsSync(join(dir, "ran.log")), "the script was not reached");
  const bind = (b) =>
    b
      .replaceAll("{baseBranch}", "develop")
      .replaceAll("{roadmap}", "roadmap")
      .replaceAll("{id}", "17.4")
      .replaceAll("{tick-pr}", "9")
      .replaceAll("{mergeStrategy}", "squash");
  // the gate command is read from its file, as written: nothing in it is expanded (T319-CR-302)
  const gate =
    'npm run "a b"; r=$?; echo "$(date) `id` $HOME"; exit "$r" # {x}';
  const gateFile = join(dir, ".claude/state/tick-gate.txt");
  mkdirSync(dirname(gateFile), { recursive: true });
  const noGate = sh(bind(blocks[2]));
  assert.equal(noGate.status, 1);
  assert.match(noGate.stdout, /^HALT: write the quality gate command/);
  writeFileSync(gateFile, "\n");
  assert.equal(sh(bind(blocks[2])).status, 1, "an empty gate");
  writeFileSync(gateFile, `${gate}\n`);
  assert.ok(!existsSync(join(dir, "ran.log")), "the script was not reached");
  const out = blocks.map((b) => {
    const r = sh(bind(b));
    assert.equal(r.status, 0, r.stderr);
    return r.stdout.trim();
  });
  assert.deepEqual(out, [
    `<start><--base><develop><--branch><${TICK}>`,
    `<open><--base><develop><--branch><${TICK}><--title><docs(roadmap): tick 17.4>`,
    `<merge><--base><develop><--branch><${TICK}><--pr><9><--quality-gate><${gate}><--strategy><squash>`,
  ]);
  assert.ok(!existsSync(gateFile), "a later tick writes its own");
});

test("open refuses a branch with no tick commit, and usage errors exit 2", (t) => {
  const f = fixture(t);
  f.start();
  const r = f.open();
  assert.equal(r.code, 1);
  assert.match(r.err, /no tick commit/);
  for (const args of [
    [],
    ["start"],
    ["bogus", "--base", "a", "--branch", "b"],
    ["start", "--base", "a", "--branch", "a"],
    [
      "merge",
      "--base",
      "a",
      "--branch",
      "b",
      "--pr",
      "1",
      "--strategy",
      "ours",
    ],
  ])
    assert.equal(f.raw(...args).code, 2, args.join(" "));
});
