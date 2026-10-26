#!/usr/bin/env bash
ACTION="${1:-status}"
COMMIT_MSG="${2:-[Fleet Checkpoint] $(date)}"
BRANCH="${3:-main}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=accept-new"

cd "$SCRIPT_DIR"
for d in */; do
  if [ -d "${d}.git" ]; then
    r="${d%/}"
    cd "$SCRIPT_DIR/$r"
    if [ "$ACTION" == "status" ]; then
      STATUS=$(git status --short 2>/dev/null || true)
      if [ -n "$STATUS" ]; then
        echo "• $r: ⚠️  Modified files"
      else
        echo "• $r: ✓ Clean"
      fi
    elif [ "$ACTION" == "pull" ]; then
      echo -n "• Pulling $r... "
      git pull origin "$BRANCH" 2>&1 || true
    elif [ "$ACTION" == "push" ]; then
      STATUS=$(git status --short 2>/dev/null || true)
      if [ -n "$STATUS" ]; then
        echo -n "• Pushing $r... "
        git add -A 2>/dev/null || true
        git commit -m "$COMMIT_MSG" 2>/dev/null || true
        git push origin "$BRANCH" 2>&1 || true
      else
        echo "• $r: Clean (nothing to push)"
      fi
    fi
  fi
done
echo "Fleet sync $ACTION finished."
