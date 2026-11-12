# Running the tests on the LAN server

> **Audience:** contributors and agents who run the suite from a laptop.

`npm run test:remote` syncs your working tree to the shared LAN server, runs root npm scripts there in a container that mirrors `.github/workflows/test.yml`, and exits with their status. The laptop only runs `ssh` and `rsync`.

## Usage

```bash
npm run test:remote                          # runs ci:fast on the server
npm run test:remote -- --run eval:all        # any root script; --run repeats
npm run test:remote -- --run format:check --run test
TEST_LOCAL=1 npm run test:remote             # the same scripts, on this machine
npm run test:remote -- --reap 7              # remove per-branch directories untouched for 7 days
```

| Option / variable                                | Meaning                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| `--run SCRIPT`                                   | A root npm script (`[A-Za-z0-9:._-]+`). Anything else exits 2.      |
| `--host USER@HOST` / `TEST_REMOTE_HOST`          | The server. Default `ci@192.168.1.249`.                             |
| `--timeout-min N` / `TEST_REMOTE_TIMEOUT_MIN`    | Wall-clock ceiling for the run. Default 30. Exit status 124.        |
| `--reap DAYS`                                    | Remove `~/agent-skills-test-*` directories untouched for DAYS days, skipping any with a running container, then exit. |
| `TEST_LOCAL=1`                                   | Run on this machine. The only way to run locally.                   |

## When to use it

Use the route whenever the server is up. Run locally (`TEST_LOCAL=1`) only when it is down. If the server is unreachable the route exits non-zero, says so, and names `TEST_LOCAL=1`. It never falls back by itself, because a silent fall back would hide the load it exists to move.

## What happens

1. A probe checks that the server answers and has `rsync` and a working `docker`.
2. The tree is synced to `~/agent-skills-test-<branch-slug>-<hash>/` on the server (the hash is of the full branch name, or of the commit when detached, so two branches never share a directory): tracked files plus untracked files git does not ignore. Gitignored paths, `.env` and `.secrets/` are not sent, and `node_modules/` is installed on the server.
3. `.git` is synced separately so history-backed tests run. In a linked worktree `.git` is a file, so the route syncs the repository's common git directory (the one that holds the objects and refs) instead, and lays this worktree's own `HEAD` and `index` over it: the common directory's own `HEAD` and `index` belong to the main checkout, and a copy of them would run the tests against the wrong commit. The other worktrees' state (`worktrees/`) is not sent. A linked worktree therefore runs the same way as a normal checkout, `npm ci`'s `prepare` hook included. Not handled: a bare main repository (its `core.bare = true` config travels with the common directory).
4. A container built from `scripts/remote-test/Dockerfile` (a `node:22-trixie` base with `python3-yaml`, `gawk`, `mawk`, `zsh`, `jq`, `git`, `rsync` and `shellcheck`) runs `npm ci` when `package-lock.json` changed, then each script in order. It runs as your UID at `--cpu-shares 128`, named after the run directory. That name is a best-effort guard, not a lock: a run refuses before it syncs when a container of that name exists (another run, or one left behind by a crash; the message gives the `docker rm -f` command). The guard has a window from its check until the container exists: the whole sync and, on first use, the image build, so minutes. Two runs started on one branch inside it are not stopped: the run that reaches `docker run` second fails on the name, and its sync may already have rewritten the tree under the first. Do not start two runs on one branch at once.
5. The limit is enforced inside the container (`timeout`, with `--init`), so a hung test is killed on the server. The local `ssh` runs under a backstop one minute longer, and if it fires, or the ssh session drops, the named container is killed. The route exits with the run's status.

The remote run is a clean-checkout run: the gitignored `.agents/skills` symlink is absent there. A test that passes locally and fails remotely because of that symlink is a real finding, not a route bug (see [traps](./traps.md)).

## It syncs the tree as it is

Uncommitted edits travel to the server with everything else. If another session edits the same checkout, its half-finished work can fail bundle-freshness tests remotely. For a verdict on committed work, run the route from a clean clone of the branch.

Changing `scripts/remote-test/Dockerfile` builds a new image tag on the next run and leaves the old one. Remove the old tags yourself (`ssh ci@192.168.1.249 'docker rmi agent-skills-test:<tag>'`); never prune globally.

## Host rules

The server is shared with another repository's CI runner and is also a gaming PC. It is WSL2.

- Everything stays under the SSH user's home. Never write to the Windows C: drive: it once filled to 100% and WSL went read-only.
- The route prints `uptime` and the running containers before each run. If the host is loaded, wait.
- Do not prune Docker globally. Remove only what this route made (`agent-skills-test:*` images, `~/agent-skills-test-*` directories).
- Do not probe a closed loopback port on the server: it hangs for over two minutes.

## Troubleshooting

| Symptom                                    | Cause and fix                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `test server … is unreachable`             | The host is down or `ssh` needs a key. Check `ssh -o BatchMode=yes ci@192.168.1.249 true`.             |
| Exit 2, `--run needs an npm script name`   | The name has a character outside `[A-Za-z0-9:._-]`, or starts with `-`.                                 |
| Exit 124                                   | The run hit the timeout. Raise `--timeout-min` or look for a hung test.                                 |
| Root-owned files in the remote directory   | The container did not run as your UID. The route passes `--user`; do not run docker by hand without it. |
