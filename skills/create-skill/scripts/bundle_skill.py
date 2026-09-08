#!/usr/bin/env python3

"""
Skill Bundler — In-place version of package_skill.py.

Copies referenced `shared/resources/<file>` into `<skill>/references/<file>` and
rewrites `shared/resources/X` → `references/X` in the skill's .md and .js files
in place. Idempotent — running again is a no-op when already in sync.

This makes each skill directory self-contained so tools like `npx skills add`
that copy a skill's directory verbatim (without bundling) install a working
skill.

Usage:
    python bundle_skill.py <path/to/skill-folder>
    python bundle_skill.py --all                  # bundle every skill under skills/
    python bundle_skill.py --check <path> | --all # read-only freshness assertion

Exit codes: 0 success / in sync; 1 drift found (--check); 2 usage error.
"""

import re
import shutil
import sys
from pathlib import Path

from quick_validate import collect_shared_refs, find_repo_root

SHARED_REF_RE = re.compile(r'(?:\.\./)*shared/resources/([^\s`\'")\]*]+)')
JS_SHARED_RE = re.compile(
    r'(require\(["\'])(?:\.\./)+shared/resources/([^"\']+)(["\'])\)'
)
# ESM counterpart of JS_SHARED_RE, for `.mjs` (and any `.js` written as ESM):
#   import { x } from "../../../shared/resources/x.js"
#   import "../../shared/resources/x.js"
#   await import("../../shared/resources/x.js")
# `require()` and `import` are different syntax for the same edge, so both must be
# rewritten or a `.mjs` skill script breaks in every bundled install while passing
# in-repo — the un-bundled relative path resolves only here.
JS_ESM_SHARED_RE = re.compile(
    r'((?:from|import)\s+["\']|import\s*\(\s*["\'])(?:\.\./)+shared/resources/([^"\']+)(["\'])'
)
# Shell scripts under <skill>/scripts/ source shared libs via a relative path.
# Rewrite any `../…/shared/resources/<name>` to `../references/<name>` (the
# bundled location, one level up from scripts/).
SH_SHARED_RE = re.compile(r'(?:\.\./)+shared/resources/([A-Za-z0-9._-]+)')
# Matches already-rewritten in-tree references (so re-runs and partial states work).
REFS_REF_RE = re.compile(r'(?:^|[\s(\[`\'"/])references/([A-Za-z0-9._-]+\.(?:json|md|sh|js|mjs|py))')
# Sibling require/import in JS — `require("./foo.js")` — used to follow transitive
# deps inside bundled shared .js files.
JS_SIBLING_RE = re.compile(r'require\(["\']\./([A-Za-z0-9._/-]+\.js)["\']\)')
# ESM sibling counterpart — `import … from "./foo.js"` / `import("./foo.mjs")` —
# so transitive deps are followed inside bundled shared ESM files too.
JS_ESM_SIBLING_RE = re.compile(
    r'(?:(?:from|import)\s+["\']|import\s*\(\s*["\'])\./([A-Za-z0-9._/-]+\.m?js)["\']'
)
# Sibling source/exec in shell — for transitive deps inside bundled shared .sh
# files. Matches:
#   source "$(dirname "$0")/foo.sh"   |   exec "$(dirname "$0")/foo.sh" "$@"
#   source ./foo.sh                   |   . ./foo.sh
#   source foo.sh
SH_SIBLING_RE = re.compile(
    r'(?:source|exec|\.)\s+["\']?(?:\$\(dirname[^)]*\)/|\./)?([A-Za-z0-9._-]+\.sh)["\']?'
)
EXCLUDE_DIRS = {'__pycache__', '.git', 'node_modules', '.DS_Store'}
# Suffixes that legitimately carry no provenance banner, so absence of one is not
# evidence about them. Deliberately a WHITELIST: `autogen_header` returns "" for
# every suffix it does not know, so keying on that accepted `.mdx`, `.ts`, `.txt`
# and anything else as bundler output on a bare name match. This tree already
# holds 15 skill-native `.mdx` and one `.ts` under skills/*/references/.
HEADERLESS_SUFFIXES = {'.json'}
AUTOGEN_MARKER = "AUTO-GENERATED — DO NOT EDIT"


def autogen_header(filename, suffix):
    msg = (
        f"{AUTOGEN_MARKER}. "
        f"Source: shared/resources/{filename}. "
        f"Regenerate via `npm run bundle`."
    )
    if suffix == '.md':
        return f"<!-- {msg} -->\n"
    if suffix in ('.sh', '.py'):
        return f"# {msg}\n"
    if suffix in ('.js', '.mjs'):
        return f"// {msg}\n"
    return ""


def inject_header(content, filename, suffix):
    """Prepend an auto-generated header. Idempotent — skips if already present."""
    if AUTOGEN_MARKER in content.split('\n', 1)[0:2][0] or AUTOGEN_MARKER in content[:300]:
        return content
    header = autogen_header(filename, suffix)
    if not header:
        return content
    # .md: insert after YAML frontmatter if present
    if suffix == '.md' and content.startswith('---\n'):
        end = content.find('\n---\n', 4)
        if end != -1:
            cut = end + len('\n---\n')
            return content[:cut] + header + content[cut:]
    # .sh/.js/.mjs: insert after shebang (e.g. #!/usr/bin/env node) if present
    if suffix in ('.sh', '.js', '.mjs') and content.startswith('#!'):
        nl = content.find('\n')
        if nl != -1:
            return content[:nl + 1] + header + content[nl + 1:]
    return header + content


def rewrite_text(content, suffix):
    """Rewrite `shared/resources/X` references to their bundled `references/X` form.

    Module-level rather than nested inside `bundle_skill()` because the freshness
    check (`--check`) must reproduce this transform *exactly* to compare a bundled
    copy against its source. A re-implementation cannot be trusted to stay in step:
    a bundled copy is the source PLUS a banner PLUS this rewrite, so a naive
    checksum can never match, and an inexact reproduction reports drift that is not
    there. One definition, two callers.
    """
    if suffix == '.md':
        return SHARED_REF_RE.sub(lambda m: f"references/{m.group(1)}", content)
    if suffix in ('.js', '.mjs'):
        # Both forms are applied to both suffixes: a `.js` file may be ESM in a
        # consumer whose package.json says so, and a `.mjs` file may still use
        # createRequire(). Each regex is a no-op when its syntax is absent.
        content = JS_SHARED_RE.sub(
            lambda m: f'{m.group(1)}../references/{m.group(2)}{m.group(3)})',
            content,
        )
        return JS_ESM_SHARED_RE.sub(
            lambda m: f'{m.group(1)}../references/{m.group(2)}{m.group(3)}',
            content,
        )
    if suffix == '.sh':
        return SH_SHARED_RE.sub(lambda m: f"../references/{m.group(1)}", content)
    return content


def expected_bytes(src, name):
    """The exact bytes `<skill>/references/<name>` must hold for source `src`.

    This is the single definition of "in sync". Undecodable sources bypass both
    transforms and are copied verbatim, matching the historical behaviour.
    """
    suffix = Path(name).suffix
    try:
        return inject_header(
            rewrite_text(src.read_text(), suffix), name, suffix
        ).encode('utf-8')
    except UnicodeDecodeError:
        return src.read_bytes()


def discover_needed(skill_path, shared_dir):
    """Resolve the transitive set of shared resources a skill reaches.

    Returns (needed, skill_files). `needed` maps bundled name -> source Path.

    Discovery seeds from the skill's own files — following both `shared/resources/X`
    and `references/X` there — and then follows only the `shared/resources/X` form
    (plus JS/shell sibling imports) out of each shared source, to a fixed point.

    `references/X` is deliberately NOT followed out of shared text. It reads as a
    dependency but is usually prose: `tracker-card-summary.md` names
    `references/jira-sync.js` while explicitly stating that it avoids the
    `shared/resources/` form so the bundler will *not* vendor a Jira client into
    GitHub-only skills. Following it there vendored 38 unwanted files across the
    repo. Copies that no discovery rule reaches are handled after the fact by
    `source_backed_on_disk()` instead, which keys on a file already existing rather
    than on a sentence mentioning it.
    """
    skill_files = (
        list(skill_path.rglob('*.md'))
        + list(skill_path.rglob('*.js'))
        + list(skill_path.rglob('*.mjs'))
        + list(skill_path.rglob('*.sh'))
    )
    skill_files = [
        f for f in skill_files
        if not any(p in EXCLUDE_DIRS for p in f.parts)
        and 'references' not in f.relative_to(skill_path).parts
    ]

    needed = {}           # filename -> source Path
    pending = []          # candidates from shared/resources/X — warn if missing
    pending_quiet = []    # candidates from references/X — many are skill-native, silent
    for f in skill_files:
        text = f.read_text()
        pending.extend(collect_shared_refs(text))
        for m in REFS_REF_RE.finditer(text):
            pending_quiet.append(m.group(1))

    seen = set()
    while pending or pending_quiet:
        if pending:
            name = pending.pop()
            quiet = False
        else:
            name = pending_quiet.pop()
            quiet = True
        if name in seen:
            continue
        seen.add(name)
        src = shared_dir / name
        if not src.exists():
            if not quiet:
                print(f"⚠️  shared/resources/{name} not found")
            continue
        needed[name] = src
        try:
            text = src.read_text()
        except (UnicodeDecodeError, OSError):
            continue
        pending.extend(collect_shared_refs(text))
        if src.suffix in ('.js', '.mjs'):
            pending.extend(m.group(1) for m in JS_SIBLING_RE.finditer(text))
            pending.extend(m.group(1) for m in JS_ESM_SIBLING_RE.finditer(text))
        if src.suffix == '.sh':
            pending.extend(m.group(1) for m in SH_SIBLING_RE.finditer(text))

    return needed, skill_files


def source_backed_on_disk(refs_dir, shared_dir, needed):
    """Bundled copies present on disk that discovery did not reach, but which have
    a `shared/resources/` counterpart.

    These are stale copies, not orphans in the risky sense: something put them
    there, and the file they mirror still exists. A copy with NO source is
    skill-native and is deliberately excluded — it legitimately lives in
    references/ and must never be rewritten or removed here.
    """
    out = {}
    if not refs_dir.is_dir():
        return out
    for dst in sorted(refs_dir.rglob('*')):
        # A symlink IS included here — membership means "our concern", and a
        # symlinked reference is very much our concern: a consumer copying the
        # directory verbatim gets a dangling link. `writable_copy` refuses to
        # write it and `check_skill` reports it. Excluding it here was the same
        # membership-vs-writability conflation fixed above for AMBIGUOUS, left
        # in the one place it still bit: a symlink no rule discovers entered
        # neither set and nothing said anything about it.
        if not dst.is_symlink() and not dst.is_file():
            continue
        rel_parts = dst.relative_to(refs_dir).parts
        if any(p in EXCLUDE_DIRS for p in rel_parts):
            continue
        rel = dst.relative_to(refs_dir).as_posix()
        if rel in needed:
            continue
        src = shared_dir / rel
        if not src.is_file():
            continue        # no source ⇒ skill-native ⇒ never ours to touch
        # Membership here means "this file is our concern", NOT "we may write it".
        # The write decision is `writable_copy`, applied at both write sites and
        # in check_skill. Conflating the two hid the ambiguous case from the
        # report entirely: it entered neither the expected set nor the orphan
        # scan, so nothing said anything about it.
        out[rel] = src
    return out


# The banner's own declared source, e.g.
#   AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/foo.md. Regenerate via …
# Matching the STRUCTURE rather than the phrase is what distinguishes a real
# banner from a document that merely quotes one.
BANNER_SOURCE_RE = re.compile(
    re.escape(AUTOGEN_MARKER) + r'\.\s*Source:\s*shared/resources/(\S+?)\.\s'
)


def _banner_head(text):
    """The region a provenance banner can legitimately occupy.

    Line-based, not byte-based. For a `.md` the banner is injected AFTER the YAML
    frontmatter, and a long `description:` pushes it well past any small byte
    window — measured at char 499 in one real file, so a 512-byte slice cut the
    marker in half and silently misclassified a correctly-bundled copy as
    hand-authored. Bounded so an incidental mention deep in a document cannot
    count as provenance.
    """
    return '\n'.join(text.split('\n')[:40])


def declared_source(text, rel):
    """The path a file's own banner claims to come from, or None.

    Returns the declared path ONLY when it matches `rel`, the file's own location
    under references/. Requiring the match is what stops a document that merely
    quotes the banner from being mistaken for one: prose says the phrase, but it
    does not say `Source: shared/resources/<this file's own path>.`

    Keying on the phrase alone overwrote a hand-authored file in testing — the
    very destruction the check exists to prevent, and in the likeliest case,
    since a document about the bundler is exactly what quotes its banner.
    Validated against the tree: 774 bundled files match their own path, 0 do not.
    """
    m = BANNER_SOURCE_RE.search(_banner_head(text))
    if m and m.group(1) == rel:
        return m.group(1)
    return None


def _looks_bundled(dst, src, name):
    """True when `dst` is demonstrably bundler output rather than authored content.

    Sharing a filename with a shared resource is NOT evidence: a hand-authored
    `references/read-config.sh` would be silently overwritten and stamped
    AUTO-GENERATED. Two things do count as evidence:

    1. It carries the provenance banner.
    2. It is byte-identical to the rewritten source *without* the banner — the
       shape every copy bundled before header injection existed still has.

    Case 2 is not hypothetical and is why the banner alone is too strict: three
    of the eight stale copies this change corrected (`verify-push-state.sh`)
    were exactly that, and a banner-only gate would have refused to fix them.

    Anything else is genuinely ambiguous. `check_skill` reports it; the bundler
    leaves it alone.

    Suffixes that never get a header (`.json`, and anything else `autogen_header`
    returns "" for) are accepted on the name match alone and return early — they
    cannot supply evidence 1, and requiring evidence 2 would make a legitimately
    edited-then-regenerated JSON permanently unreconcilable. That is the
    pre-existing behaviour for those suffixes, kept deliberately.
    """
    suffix = Path(name).suffix
    if suffix in HEADERLESS_SUFFIXES:
        return True
    if not autogen_header(name, suffix):
        # An unknown suffix cannot carry a banner, so evidence 1 is unavailable —
        # but that is a gap in our knowledge, not a licence to overwrite. Fall
        # through to evidence 2 (identical to the rewritten source).
        pass
    try:
        text = dst.read_text()
    except UnicodeDecodeError:
        return True          # binary — historical behaviour reconciled it
    except OSError:
        return False         # unreadable — never write over what we cannot inspect
    if declared_source(text, name) is not None:
        return True
    try:
        return text == rewrite_text(src.read_text(), suffix)
    except (UnicodeDecodeError, OSError):
        return False


def writable_copy(dst, src, name):
    """May the bundler write `dst`? True when it does not yet exist, or is
    demonstrably its own output.

    A symlink is never writable through: `write_if_changed` unlinks it, but the
    decision to replace a link the operator placed belongs here, visibly.
    """
    if dst.is_symlink():
        return False
    if not dst.exists():
        return True
    return _looks_bundled(dst, src, name)


def write_if_changed(dst, src, name, new_bytes):
    """Write a bundled copy when its bytes differ. Returns True if it wrote."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.is_symlink():
        # Defence in depth, and UNREACHABLE via today's call sites: both gate on
        # `writable_copy`, which refuses a symlink first. Kept because writing
        # through a link edits its target — for a reference pointing back at
        # shared/resources/ that is the source itself — and a future caller that
        # forgets the gate should still be safe. Deliberately NOT claimed as
        # test-covered: either guard alone produces the correct outcome, so
        # neither is individually provable; only removing both reds the test.
        dst.unlink()
    src_mode = src.stat().st_mode & 0o777
    executable = bool(src_mode & 0o111)
    if dst.exists() and dst.read_bytes() == new_bytes:
        # Content unchanged — still re-sync the mode in case the bit was lost.
        if executable and (dst.stat().st_mode & 0o777) != src_mode:
            dst.chmod(src_mode)
            return True        # a mode repair IS a change; reporting False here
                               # is what let `--check` and the bundler disagree
        return False
    dst.write_bytes(new_bytes)
    # Preserve the executable bit whenever the SOURCE has one — not only for
    # `.sh`. A 0755 `.js` source with 0644 copies was live in this tree, and a
    # suffix-scoped rule could neither see nor repair it.
    if executable:
        dst.chmod(src_mode)
    return True


def resolve_paths(skill_path):
    """(skill_path, shared_dir, refs_dir) or None when this is not a bundleable skill."""
    skill_path = Path(skill_path).resolve()
    if not (skill_path / 'SKILL.md').exists():
        print(f"❌ SKILL.md not found in {skill_path}")
        return None
    repo_root = find_repo_root(skill_path)
    if not repo_root:
        print(f"❌ Cannot locate repo root from {skill_path}")
        return None
    return skill_path, repo_root / 'shared' / 'resources', skill_path / 'references'


def bundle_skill(skill_path):
    resolved = resolve_paths(skill_path)
    if resolved is None:
        return False
    skill_path, shared_dir, refs_dir = resolved

    # Pass 1: walk skill files (excluding references/) and shared files transitively.
    needed, skill_files = discover_needed(skill_path, shared_dir)

    # Pass 1b: add on-disk copies discovery could not reach but which have a source.
    reconcilable = source_backed_on_disk(refs_dir, shared_dir, needed)

    if not needed and not reconcilable:
        # Nothing shared reaches this skill and nothing on disk mirrors a shared
        # file. Any references/ content here is skill-native — leave it alone.
        print(f"✓ {skill_path.name}: no shared refs")
        return True

    # Pass 2: copy shared files into references/, with rewritten content. Idempotent.
    refs_dir.mkdir(exist_ok=True)
    bundled = 0
    protected = 0
    for name, src in needed.items():
        dst = refs_dir / name
        # The ambiguity gate belongs on BOTH write paths. It used to guard only
        # reconciliation, which is the path a file reaches when NOTHING mentions
        # it — so the guarantee held precisely where the danger was smallest. In
        # the ordinary case (a skill's own files name the file, either as
        # `references/X` or `shared/resources/X`) discovery reaches it and pass 2
        # wrote straight over an authored file. The test that claimed otherwise
        # used the one fixture seed that routed to the branch that worked.
        if not writable_copy(dst, src, name):
            protected += 1
            print(f"  SKIPPED references/{name} — not bundler output, left alone")
            continue
        if write_if_changed(dst, src, name, expected_bytes(src, name)):
            bundled += 1
            print(f"  bundled references/{name}")

    # Pass 2b: reconcile the copies discovery did not reach.
    #
    # Discovery answers "what should this skill have?"; disk answers "what does it
    # already have?". A file in the second set but not the first was previously
    # invisible to every later step INCLUDING the status line, so the bundler
    # reported `in sync` for files it had not opened. Reconciling here means a copy
    # is refreshed on the strength of having a source, not of being reachable.
    reconciled = 0
    for name, src in reconcilable.items():
        dst = refs_dir / name
        if not writable_copy(dst, src, name):
            protected += 1
            print(f"  SKIPPED references/{name} — not bundler output, left alone")
            continue
        if write_if_changed(dst, src, name, expected_bytes(src, name)):
            reconciled += 1
            print(f"  reconciled references/{name} (not reached by discovery)")

    # Pass 3: rewrite skill source files in place.
    rewritten = 0
    for f in skill_files:
        original = f.read_text()
        updated = rewrite_text(original, f.suffix)
        if updated != original:
            f.write_text(updated)
            rewritten += 1
            print(f"  rewrote {f.relative_to(skill_path)}")

    parts = []
    if bundled:
        parts.append(f"{bundled} bundled")
    if reconciled:
        parts.append(f"{reconciled} reconciled")
    if protected:
        parts.append(f"{protected} left alone")
    if rewritten:
        parts.append(f"{rewritten} rewritten")
    # `in sync` is now an assertion about every source-backed copy on disk, not
    # only about the ones discovery happened to reach.
    status = ", ".join(parts) if parts else "in sync"
    print(f"✅ {skill_path.name}: {status}")
    return True


def check_skill(skill_path):
    """Read-only freshness check. Returns a list of human-readable problems.

    Compares each source-backed bundled copy against `expected_bytes`, rather than
    regenerating and asking git what moved. The regenerate-and-diff idiom inherits
    the bundler's own blind spots by construction: a copy the bundler does not
    write produces no diff, so a stale file passes. Comparing per file is what
    makes the check independent of discovery.
    """
    resolved = resolve_paths(skill_path)
    if resolved is None:
        return [f"{skill_path}: not a bundleable skill"]
    skill_path, shared_dir, refs_dir = resolved

    needed, _ = discover_needed(skill_path, shared_dir)
    expected = dict(needed)
    expected.update(source_backed_on_disk(refs_dir, shared_dir, needed))

    problems = []
    for name, src in sorted(expected.items()):
        dst = refs_dir / name
        if dst.is_symlink():
            # Made safe (never written through) but previously also invisible:
            # a consumer copying the directory verbatim gets a dangling link.
            problems.append(f"{skill_path.name}: references/{name} is a SYMLINK")
            continue
        if not dst.is_file():
            problems.append(f"{skill_path.name}: references/{name} is MISSING")
            continue
        if not writable_copy(dst, src, name):
            problems.append(
                f"{skill_path.name}: references/{name} is AMBIGUOUS "
                f"(shares a name with shared/resources/{name} but is not bundler "
                f"output — not rewritten; delete it or add the banner)"
            )
            continue
        if dst.read_bytes() != expected_bytes(src, name):
            problems.append(f"{skill_path.name}: references/{name} is STALE")
            continue
        # Mode is part of being in sync — `write_if_changed` re-chmods a `.sh`
        # copy whose bits drifted even when the bytes match. Comparing bytes
        # alone would let a lost executable bit pass here while `npm run bundle`
        # silently repaired it, which is the green-CI-but-dirty-tree split this
        # check exists to close. The `git diff` form this replaced caught it
        # because git tracks the bit.
        # Keyed on the source actually being executable, NOT on the `.sh` suffix.
        # `shared/resources/pr-inline-comment.js` is 0755 while two bundled copies
        # were 0644 — a live instance of the exact green-CI-but-wrong-mode split
        # this check exists to close, invisible to a suffix-scoped test.
        if src.stat().st_mode & 0o111:
            if (dst.stat().st_mode & 0o777) != (src.stat().st_mode & 0o777):
                problems.append(
                    f"{skill_path.name}: references/{name} has WRONG MODE "
                    f"({dst.stat().st_mode & 0o777:o}, expected {src.stat().st_mode & 0o777:o})"
                )

    # A copy the bundler produced whose source has since been deleted is
    # invisible to everything above — it is in neither `needed` nor
    # `source_backed_on_disk`, both of which require the source to exist. It
    # keeps a banner naming a file that is gone, and stays green forever. The
    # banner is the discriminator the bundler already writes; this reads it back.
    if refs_dir.is_dir():
        for dst in sorted(refs_dir.rglob('*')):
            if dst.is_symlink() or not dst.is_file():
                continue
            rel_parts = dst.relative_to(refs_dir).parts
            if any(p in EXCLUDE_DIRS for p in rel_parts):
                continue
            rel = dst.relative_to(refs_dir).as_posix()
            if rel in expected:
                continue
            if (shared_dir / rel).is_file():
                continue        # reported by the expected-set loop above
            try:
                text = dst.read_text()
            except (UnicodeDecodeError, OSError):
                continue
            # The path comes from the banner the file actually carries, so the
            # message cannot assert something it never read.
            declared = declared_source(text, rel)
            if declared is not None:
                problems.append(
                    f"{skill_path.name}: references/{rel} is ORPHANED "
                    f"(banner names shared/resources/{declared}, which no longer exists)"
                )
                continue
            # A real banner that names a DIFFERENT path — a moved or renamed copy.
            # Requiring declared == rel is right for the prose false-positive it
            # fixes, but on its own it silently drops this case, which the
            # phrase-matching version did report.
            other = BANNER_SOURCE_RE.search(_banner_head(text))
            if other:
                problems.append(
                    f"{skill_path.name}: references/{rel} is MISDECLARED "
                    f"(banner names shared/resources/{other.group(1)}, not its own path)"
                )
    return problems


USAGE = "Usage: bundle_skill.py [--check] <skill-path>... | [--check] --all"


def main():
    args = sys.argv[1:]

    # `--check` is honoured ANYWHERE in argv, not only at position 0.
    #
    # It used to be recognised only as args[0], which made `--all --check`
    # silently perform a full MUTATING bundle and exit 0 — a read-only flag
    # rewriting the repository because the arguments were the other way round.
    # Unknown `--flags` are now rejected outright for the same reason: a typo
    # (`--chekc`) must not fall through to a write.
    check_mode = '--check' in args
    all_mode = '--all' in args
    args = [a for a in args if a not in ('--check', '--all')]

    # ANY leading dash, not just `--`. `-check` was treated as a skill path, so a
    # single-dash typo on a read-only request ran the MUTATING bundle and exited 0.
    unknown = [a for a in args if a.startswith('-')]
    if unknown:
        print(f"❌ Unknown option(s): {' '.join(unknown)}")
        print(USAGE)
        sys.exit(2)

    if not all_mode and not args:
        print(USAGE)
        sys.exit(2)

    if all_mode:
        if args:
            print(f"❌ --all takes no skill paths (got: {' '.join(args)})")
            print(USAGE)
            sys.exit(2)
        repo_root = Path(__file__).resolve().parents[3]
        skills_dir = repo_root / 'skills'
        targets = sorted(d for d in skills_dir.iterdir() if (d / 'SKILL.md').exists())
    else:
        targets = [Path(a) for a in args]

    if check_mode:
        problems = []
        for t in targets:
            problems.extend(check_skill(t))
        if problems:
            # `::error::` is a GitHub Actions workflow command — it surfaces the
            # failure as an annotation in the PR checks UI, which the two sibling
            # hygiene steps in validate.yml also do. Harmless noise outside CI.
            # `npm run bundle` fixes STALE / MISSING / WRONG MODE. It cannot fix
            # ORPHANED, AMBIGUOUS, MISDECLARED or SYMLINK — those need a human
            # decision. Printing the blanket remedy for them left CI permanently
            # red with an instruction that provably does nothing.
            regenerable = [x for x in problems
                           if ' is STALE' in x or ' is MISSING' in x or 'WRONG MODE' in x]
            manual = [x for x in problems if x not in regenerable]
            print("::error::Bundled references/ need attention "
                  f"({len(regenerable)} regenerable, {len(manual)} needing a decision).")
            print("❌ Bundled references are out of date:")
            for problem in problems:
                print(f"   {problem}")
            if regenerable:
                print("\nRun 'npm run bundle' and commit the regenerated files.")
            if manual:
                print("\nThe following need a human decision — `npm run bundle` will "
                      "NOT clear them; act on each line above:")
                for m in manual:
                    print(f"   {m}")
            sys.exit(1)
        print(f"✅ Bundle freshness: {len(targets)} skill(s) verified")
        sys.exit(0)

    failed = 0
    for t in targets:
        if not bundle_skill(t):
            failed += 1
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
