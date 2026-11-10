#!/usr/bin/env bash
# precompact-gh-stateful.sh — a `gh` stand-in that REMEMBERS the comments it was asked to
# post, for develop-pipeline-on-precompact.test.sh scenario 19 (a repeat pause after an
# in-session clear must post no second comment).
#
# Every argv line goes to $GH_LOG. Posted bodies are kept in $GH_STATE:
#   gh pr comment <url> --body-file <f>   → copies <f> to $GH_STATE/pr-<n>.md
#   gh issue comment <n> --body-file -    → stdin to $GH_STATE/issue-<n>.md
# and the two reads the posting paths make answer from what was kept:
#   gh pr view <url> --json comments -q <filter naming a marker>
#                                         → the URL of a kept PR comment whose first line
#                                           (its marker) appears in the argv
#   gh api --paginate …/comments --jq …   → every kept issue body
# Anything else (auth status, repo view, api -X PATCH) succeeds silently.
printf '%s\n' "$*" >> "$GH_LOG"
mkdir -p "$GH_STATE"
next_n() { ls "$GH_STATE" 2>/dev/null | grep -c "^$1-" ; }
case "$1 $2" in
  "auth status") exit 0 ;;
  "repo view") echo "o/r"; exit 0 ;;
  "api --paginate")
    for f in "$GH_STATE"/issue-*.md; do [ -f "$f" ] && cat "$f"; done
    exit 0 ;;
  "pr view")
    for f in "$GH_STATE"/pr-*.md; do
      [ -f "$f" ] || continue
      marker=$(head -1 "$f")
      case "$*" in
        *"$marker"*)
          n=${f##*/pr-}
          echo "https://github.com/o/r/pull/7#issuecomment-${n%.md}"
          exit 0 ;;
      esac
    done
    exit 0 ;;
  "pr comment")
    prev=""
    for a in "$@"; do
      [ "$prev" = "--body-file" ] && cp "$a" "$GH_STATE/pr-$(( $(next_n pr) + 1 )).md"
      prev="$a"
    done
    exit 0 ;;
  "issue comment")
    cat > "$GH_STATE/issue-$(( $(next_n issue) + 1 )).md"
    exit 0 ;;
esac
exit 0
