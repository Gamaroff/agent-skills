#!/usr/bin/env python3
"""
Skill Catalog Generator

Regenerates docs/reference/skill-catalog.md from SKILL.md frontmatters, and
rewrites the skills-count badge in README.md to the same total, so the two
cannot drift apart (task.120: the badge was a hand-typed number, one behind
before task.110 and two behind after it, and nothing ever checked it).

Usage:
    python generate_catalog.py [skills_dir] [output_file] [--readme PATH] [--no-readme]

Defaults:
    skills_dir  — <repo_root>/skills/
    output_file — <repo_root>/docs/reference/skill-catalog.md
    --readme    — <repo_root>/README.md  (the badge line is rewritten in place;
                  a README without the badge line is left untouched with a warning)
    --no-readme — skip the README rewrite entirely

Categories are assigned by matching skill names against known prefixes/patterns.
Uncategorized skills fall into "Other".
"""

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import skill_frontmatter
from datetime import date


# ---------------------------------------------------------------------------
# Category assignment rules — order matters (first match wins)
# ---------------------------------------------------------------------------

CATEGORIES = [
    ("Development — Orchestration", [
        "develop-story", "develop-task", "develop", "develop-next",
    ]),
    ("Development — Implementation", [
        "commit-changes", "create-branch", "create-pr", "git-time-travel",
        "correct-course", "harden", "optimize", "performance-optimizer",
        "error-handling-enforcer", "enforce-standards",
    ]),
    ("Quality Assurance", [
        "qa-fix", "qa-gate", "qa-planning", "qa-story", "qa-task",
        "finalise", "validate-story", "review-story", "review-task",
        "review-epic", "review-prd", "review-security", "double-check",
    ]),
    ("Architecture & Design", [
        "architect", "create-architecture-doc", "execute-architect-checklist",
        "mermaid-architect", "create-frontend-spec",
        "document-existing-project", "document-existing-project",
    ]),
    ("Product Management & Planning", [
        "po", "pm-coordinator", "pm-checklist", "analyst",
        "new-product-prd", "prd-template", "create-prd", "brownfield-prd-template",
        "shard-prd", "shard-doc", "review-prd",
    ]),
    ("Epic & Story Lifecycle", [
        "create-epic", "create-epics-from-shards", "create-story", "edit-epic",
        "edit-story", "epic-registry-manager", "ensure-epic-github-issue",
        "ensure-epic-jira-issue", "jira-epic-creator", "create-parallel-stories",
        "create-task", "create-issue", "create-bug-report",
    ]),
    ("Jira / GitHub Sync", [
        "sync-jira-epic", "sync-jira-story", "sync-jira-task",
    ]),
    ("Sprint & Ceremony", [
        "jira-sprint-manager", "jira-sprint-review-prep",
        "jira-sprint-retrospective", "jira-standup-auditor",
    ]),
    ("Validation & Enforcement", [
        "api-endpoint-validator", "code-smell-validator",
        "documentation-standards-validator", "navigation-pattern-validator",
        "offline-first-enforcer", "platform-separation-validator",
        "response-envelope-enforcer", "test-co-location-enforcer",
    ]),
    ("Testing", [
        "testing-setup-nestjs", "testing-setup-react-native", "testing-setup-shared",
    ]),
    ("NestJS", [
        "nestjs-debug", "nestjs-patterns",
    ]),
    ("React Native / Expo", [
        "react-native-debug", "upgrading-expo", "react-email",
    ]),
    ("Infrastructure & DevOps", [
        "deploy-remote", "docker", "server-admin", "use-railway",
        "railway-postgres-crud",
    ]),
    ("Content & Writing", [
        "extract", "simplify", "book-typesetter-pro",
        "explain-simply", "humaniser", "humanize-text",
    ]),
    ("Research & Analysis", [
        "analyst", "brainstorming", "create-research-prompt", "deep-research-prompt",
        "research-prompt",
    ]),
    ("Skill Tooling", [
        "create-skill", "find-skills", "autoskill", "agent-md-refactor",
        "execute-checklist", "generate-ui-prompt", "observe-work", "session-handoff",
    ]),
    ("User Experience", [
        "ux-expert", "building-components", "browser-use", "markdown-wireframe",
    ]),
    ("Email", [
        "email-best-practices", "resend",
    ]),
    ("Utilities & Misc", [
        "change-checklist", "change-management", "command-development",
        "create-doc", "pro-tip", "remember-insight",
        "git-time-travel",
    ]),
]


def find_repo_root(start: Path) -> Path:
    p = start.resolve()
    while p != p.parent:
        if (p / "shared" / "resources").exists():
            return p
        p = p.parent
    return start.resolve()


def parse_frontmatter(text: str) -> dict:
    """Parse SKILL.md frontmatter, or return {} when it cannot be read.

    Uses a real YAML parser. The previous line-by-line regex stripped only
    double quotes, so single-quoted descriptions kept a stray leading `'` in the
    catalog, and an unescaped apostrophe truncated the value silently.
    """
    fm, error = skill_frontmatter.parse(text)
    if error:
        print(f"  ⚠  Skipping unparseable frontmatter: {error}", file=sys.stderr)
        return {}
    return fm


def assign_category(skill_name: str) -> str:
    for cat, names in CATEGORIES:
        if skill_name in names:
            return cat
    return "Other"


def truncate(text: str, max_words: int = 25) -> str:
    words = text.split()
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words]) + "…"


# The badge is `[![Skills](https://img.shields.io/badge/skills-<N>-brightgreen)](#skill-catalog)`;
# only the count between `skills-` and the next `-` is generated. Anchored on the
# shields.io path so a prose mention of "skills-126" elsewhere is never touched.
BADGE = re.compile(r"(img\.shields\.io/badge/skills-)\d+(-)")
# The README's own sentence two lines below the badge — "128 skills covering …" —
# is a second hand-typed count and drifted exactly as the badge did (task.120
# QA-1). Anchored on the literal phrase so no other number in the file is touched;
# a README without the sentence simply has nothing to rewrite here.
PROSE_COUNT = re.compile(r"\b\d+( skills covering\b)")


def update_readme_badge(readme: Path, total: int) -> bool:
    """Rewrite every generated skill count in `readme` to `total`.

    Two sites: the shields.io badge (required — its absence is a warning) and the
    "<N> skills covering" sentence (optional — rewritten when present). Returns
    True when the file was changed. A README without the badge line is a warning,
    never an error: a consumer that generates its own README, or a fork that
    dropped the badge, must not be blocked from regenerating the catalog by a
    line it does not have.
    """
    if not readme.exists():
        print(f"⚠️  {readme}: not found — badge not updated", file=sys.stderr)
        return False
    text = readme.read_text()
    after_badge, n = BADGE.subn(rf"\g<1>{total}\g<2>", text, count=1)
    if n == 0:
        print(f"⚠️  {readme}: no skills badge line found — left untouched", file=sys.stderr)
        return False
    new = PROSE_COUNT.sub(rf"{total}\g<1>", after_badge, count=1)
    if new == text:
        print(f"✅ README badge already reads skills-{total}")
        return False
    readme.write_text(new)
    # Label by what actually CHANGED, not by what matched: a stale badge beside
    # an already-current prose count is a badge-only rewrite (task.120 CR-4).
    changed = [name for name, moved in (("badge", after_badge != text), ("prose count", new != after_badge)) if moved]
    print(f"✅ README {' + '.join(changed)} → {total} ({readme})")
    return True


def generate_catalog(skills_dir: Path, output_file: Path) -> int:
    """Write the catalog and return the number of skills it lists."""
    skills = {}
    for skill_path in sorted(skills_dir.iterdir()):
        if not skill_path.is_dir():
            continue
        skill_md = skill_path / "SKILL.md"
        if not skill_md.exists():
            continue
        fm = parse_frontmatter(skill_md.read_text())
        name = fm.get("name", skill_path.name)
        desc = fm.get("description", "")
        cat = assign_category(name)
        skills.setdefault(cat, []).append((name, truncate(desc)))

    lines = [
        "# Skill Catalog",
        "",
        f"Categorized index of all {sum(len(v) for v in skills.values())} skills in this library.",
        "",
        "> **Note:** This file is auto-generated by `skills/create-skill/scripts/generate_catalog.py`.",
        "> Run `npm run generate-catalog` to regenerate after adding or editing skills.",
        "",
        "## Featured starting points",
        "",
        "If you're new to the library, start here:",
        "",
        "- **Orchestrators:** `develop-story`, `develop-task` — full lifecycle for a story or task",
        "- **Authoring:** `create-prd`, `create-epic`, `create-story`, `create-task`",
        "- **Review:** `review-prd`, `review-epic`, `review-story`, `review-task`, `review-pr`, `review-security`",
        "- **QA:** `qa-story`, `qa-task`, `qa-fix`, `qa-gate`",
        "- **Git / PR:** `create-branch`, `commit-changes`, `create-pr`",
        "- **Meta:** `create-skill`, `find-skills`, `document-existing-project`",
        "",
        "## Scope notes",
        "",
        "Skill categories below vary in scope:",
        "",
        "- **Foundational** (most users need): Development — Orchestration / Implementation, QA, Epic & Story Lifecycle, Jira / GitHub Sync, Skill Tooling.",
        "- **Workflow-specific** (use when applicable): Product Management & Planning, Architecture & Design, Validation & Enforcement.",
        "- **Stack-specific** (skip if your stack differs): Testing, NestJS, React Native / Expo, Infrastructure & DevOps, Email.",
        "- **Specialised** (narrow use cases): User Experience, Content & Writing, Research & Analysis.",
        "",
        "Within each category, skills are listed alphabetically.",
        "",
        "Full categorised index below.",
        "",
    ]

    # Ordered categories first, then "Other"
    ordered_cats = [cat for cat, _ in CATEGORIES if cat in skills]
    if "Other" in skills:
        ordered_cats.append("Other")

    for cat in ordered_cats:
        entries = skills[cat]
        lines.append(f"## {cat}")
        lines.append("")
        lines.append("| Skill | Description |")
        lines.append("| ----- | ----------- |")
        for name, desc in sorted(entries, key=lambda x: x[0]):
            lines.append(f"| `{name}` | {desc} |")
        lines.append("")

    output_file.write_text("\n".join(lines))
    total = sum(len(v) for v in skills.values())
    print(f"✅ Generated catalog with {total} skills → {output_file}")
    return total


def main():
    script_dir = Path(__file__).resolve().parent
    repo_root = find_repo_root(script_dir)

    # The two positionals keep their pre-argparse defaults and optionality, so
    # `npm run generate-catalog` (no args) and the CI step are unchanged.
    parser = argparse.ArgumentParser(description="Regenerate the skill catalog and the README skills badge.")
    parser.add_argument("skills_dir", nargs="?", type=Path, default=repo_root / "skills")
    parser.add_argument("output_file", nargs="?", type=Path,
                        default=repo_root / "docs" / "reference" / "skill-catalog.md")
    parser.add_argument("--readme", type=Path, default=repo_root / "README.md",
                        help="README whose skills badge is rewritten to the catalog count")
    parser.add_argument("--no-readme", action="store_true", help="do not touch the README")
    args = parser.parse_args()

    if not args.skills_dir.exists():
        print(f"❌ Skills directory not found: {args.skills_dir}")
        sys.exit(1)

    total = generate_catalog(args.skills_dir, args.output_file)
    if not args.no_readme:
        update_readme_badge(args.readme, total)


if __name__ == "__main__":
    main()
