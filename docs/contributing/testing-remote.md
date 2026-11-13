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
npm run test:remote -- --unlock              # remove this branch's lock, only when it is stale
npm run test:remote -- --prune-images        # remove old agent-skills-test image tags
```

| Option / variable                                | Meaning                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| `--run SCRIPT`                                   | A root npm script (`[A-Za-z0-9:._-]+`). Anything else exits 2.      |
| `--host USER@HOST` / `TEST_REMOTE_HOST`          | The server. Default `ci@192.168.1.249`.                             |
| `--timeout-min N` / `TEST_REMOTE_TIMEOUT_MIN`    | Wall-clock ceiling for the run. Default 30. Exit status 124.        |
| `--reap DAYS`                                    | Remove `~/agent-skills-test-*` directories untouched for DAYS days, skipping any with a running container, then exit. |
| `--unlock`                                       | Remove this branch's lock, only when it is stale (see step 4), then exit. Exits 32 and removes nothing on a live lock. |
| `--prune-images`                                 | Remove `agent-skills-test:*` tags other than the current Dockerfile's and those a running container uses, then exit. Refuses while any run holds a lock. |
| `TEST_REMOTE_LOCK_MARGIN_MIN`                    | Minutes added to a run's own timeout before its lock counts as stale. Default 10. |
| `TEST_LOCAL=1`                                   | Run on this machine. The only way to run locally.                   |

`--unlock`, `--prune-images`, `--reap` and `--run` do not combine, except that `--reap` with `--run` reaps and ignores the scripts, as it always has.

## When to use it

Use the route whenever the server is up. Run locally (`TEST_LOCAL=1`) only when it is down. If the server is unreachable the route exits non-zero, says so, and names `TEST_LOCAL=1`. It never falls back by itself, because a silent fall back would hide the load it exists to move.

## What happens

1. A probe checks that the server answers and has `rsync` and a working `docker`.
2. The run takes a lock, `~/agent-skills-test-<branch-slug>-<hash>.lock`, then syncs the tree to `~/agent-skills-test-<branch-slug>-<hash>/` on the server (the hash is of the full branch name, or of the commit when detached, so two branches never share a directory): tracked files plus untracked files git does not ignore. Gitignored paths, `.env` and `.secrets/` are not sent, and `node_modules/` is installed on the server.
3. `.git` is synced separately so history-backed tests run. In a linked worktree `.git` is a file, so the route syncs the repository's common git directory (the one that holds the objects and refs) instead, and lays this worktree's own `HEAD` and `index` over it: the common directory's own `HEAD` and `index` belong to the main checkout, and a copy of them would run the tests against the wrong commit. The other worktrees' state (`worktrees/`) is not sent. A linked worktree therefore runs the same way as a normal checkout, `npm ci`'s `prepare` hook included. Not handled: a bare main repository (its `core.bare = true` config travels with the common directory).
4. A container built from `scripts/remote-test/Dockerfile` (a `node:22-trixie` base with `python3-yaml`, `gawk`, `mawk`, `zsh`, `jq`, `git`, `rsync` and `shellcheck`) runs `npm ci` when `package-lock.json` changed, then each script in order. It runs as your UID at `--cpu-shares 128`, named after the run directory.

   **Two runs on one branch cannot overlap.** Two layers hold it. The lock is an atomic `mkdir` on the server, taken before the sync and released when the run ends (on success, failure, the timeout and Ctrl-C), so it covers the whole sync and image build. Its `owner` file records the owner's host, pid, start time (the server's clock) and the run's own timeout. A run that finds the lock held exits 1 before it syncs and names the owner and its age. The container name is the second layer: a run also refuses before it syncs when a container of that name exists (one left behind by a crash; the message gives the `docker rm -f` command).

   **What the lock does not hold.** A kill that skips the laptop's cleanup (SIGKILL, power loss, a dropped network at the wrong moment) leaves the lock behind. It is **stale** when no container of the run's name exists and the server's clock is past the owner's start plus the owner's own timeout plus 10 minutes (`TEST_REMOTE_LOCK_MARGIN_MIN`). A run never clears a stale lock itself: it refuses and names `--unlock`, which removes only a stale lock and prints the owner it removed. A live run's lock is never removed, and a failed release only warns (a green run stays green). A lock with no readable owner file (a take cut off between its `mkdir` and its write) is never called stale; remove it by hand with `ssh ci@192.168.1.249 rm -rf '~/<run dir>.lock'`. The lock is per branch; it does not stop two different branches from loading the server together.
5. The limit is enforced inside the container (`timeout`, with `--init`), so a hung test is killed on the server. The local `ssh` runs under a backstop one minute longer, and if it fires, or the ssh session drops, the named container is killed. The route exits with the run's status.

The remote run is a clean-checkout run: the gitignored `.agents/skills` symlink is absent there. A test that passes locally and fails remotely because of that symlink is a real finding, not a route bug (see [traps](./traps.md)).

## It syncs the tree as it is

Uncommitted edits travel to the server with everything else. If another session edits the same checkout, its half-finished work can fail bundle-freshness tests remotely. For a verdict on committed work, run the route from a clean clone of the branch.

Changing `scripts/remote-test/Dockerfile` builds a new image tag on the next run and leaves the old one. Remove them with `npm run test:remote -- --prune-images`: it keeps the tag the current Dockerfile names and any tag a running container uses, removes the rest by explicit tag (`docker rmi agent-skills-test:<tag>`, never `-f`), and never calls a global prune. It refuses, removing nothing, while any run holds a lock (a run that has built its image but not yet started its container is invisible to docker) and when `docker ps` or `docker images` fails.

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
| `another run holds the lock …`             | A run on this branch is in progress: wait. If the message says the lock is stale, its run died: `npm run test:remote -- --unlock`. |
| Root-owned files in the remote directory   | The container did not run as your UID. The route passes `--user`; do not run docker by hand without it. |
