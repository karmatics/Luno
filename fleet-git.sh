#!/usr/bin/env bash
# ==============================================================================
# 🌙 LUNO PROJECTS: FLEET-WIDE MULTI-REPO GIT SYNCHRONIZER
# Runs on Mac and Linux across all 44 repositories
# ==============================================================================
set -e

ACTION="${1:-status}"
COMMIT_MSG="${2:-[Fleet Checkpoint] $(date)}"
BRANCH="${3:-main}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -d "$SCRIPT_DIR/Luno" ] && [ -d "$SCRIPT_DIR/Library" ]; then
  WEB_ROOT="$SCRIPT_DIR"
elif [ -d "$HOME/source/LunoProjects" ]; then
  WEB_ROOT="$HOME/source/LunoProjects"
else
  WEB_ROOT="$(dirname "$SCRIPT_DIR")"
fi

C_CYAN='\033[0;36m'
C_GREEN='\033[0;32m'
C_YELLOW='\033[1;33m'
C_RED='\033[0;31m'
C_RESET='\033[0m'

echo -e "${C_CYAN}================================================================${C_RESET}"
echo -e "${C_CYAN}🌙 Luno Fleet-Wide Git Synchronizer: ${ACTION^^}${C_RESET}"
echo -e "${C_CYAN}Web Root: ${WEB_ROOT}${C_RESET}"
echo -e "${C_CYAN}================================================================${C_RESET}"

export GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=accept-new"

cd "$WEB_ROOT"
REPOS=()
for d in */; do
  if [ -d "${d}.git" ]; then
    REPOS+=("${d%/}")
  fi
done

TOTAL=${#REPOS[@]}
echo -e "Discovered ${C_GREEN}${TOTAL}${C_RESET} git repositories.\n"

COUNT_SUCCESS=0
COUNT_DIRTY=0

for r in "${REPOS[@]}"; do
  DIR="$WEB_ROOT/$r"
  cd "$DIR"

  REMOTE_URL=$(git remote get-url origin 2>/dev/null || true)
  if [ -z "$REMOTE_URL" ]; then
    echo -e "${C_YELLOW}• $r: Skipped (no remote configured)${C_RESET}"
    continue
  fi

  if [ "$ACTION" == "status" ]; then
    STATUS=$(git status --short 2>/dev/null || true)
    BRANCH_NAME=$(git branch --show-current 2>/dev/null || echo "main")
    if [ -n "$STATUS" ]; then
      LINE_COUNT=$(echo "$STATUS" | wc -l | tr -d ' ')
      echo -e "${C_YELLOW}• $r [$BRANCH_NAME]: ⚠️ $LINE_COUNT modified file(s)${C_RESET}"
      COUNT_DIRTY=$((COUNT_DIRTY + 1))
    else
      echo -e "${C_GREEN}• $r [$BRANCH_NAME]: ✓ Clean${C_RESET}"
    fi
    COUNT_SUCCESS=$((COUNT_SUCCESS + 1))

  elif [ "$ACTION" == "pull" ]; then
    echo -ne "• Pulling ${C_CYAN}$r${C_RESET}... "
    if OUT=$(git pull origin "$BRANCH" 2>&1); then
      echo -e "${C_GREEN}✓ Done${C_RESET} (${OUT})"
      COUNT_SUCCESS=$((COUNT_SUCCESS + 1))
    else
      echo -e "${C_RED}❌ Failed${C_RESET}\n  $OUT"
    fi

  elif [ "$ACTION" == "push" ]; then
    STATUS=$(git status --short 2>/dev/null || true)
    
    if [ ! -f .nojekyll ]; then
      touch .nojekyll
      git add .nojekyll 2>/dev/null || true
    fi

    if [ -n "$STATUS" ]; then
      echo -ne "• Pushing ${C_CYAN}$r${C_RESET}... "
      git add -A 2>/dev/null || true
      git commit -m "$COMMIT_MSG" 2>/dev/null || true
      if OUT=$(git push origin "$BRANCH" 2>&1); then
        echo -e "${C_GREEN}✓ Pushed${C_RESET}"
        COUNT_SUCCESS=$((COUNT_SUCCESS + 1))
      else
        echo -e "${C_RED}❌ Push error${C_RESET}: $OUT"
      fi
    else
      echo -e "• $r: Clean (nothing to push)"
      COUNT_SUCCESS=$((COUNT_SUCCESS + 1))
    fi
  fi
done

echo -e "\n${C_CYAN}================================================================${C_RESET}"
if [ "$ACTION" == "status" ]; then
  echo -e "Completed check of ${TOTAL} repositories (${COUNT_DIRTY} with uncommitted changes)."
else
  echo -e "Completed ${ACTION^^} for ${COUNT_SUCCESS}/${TOTAL} repositories."
fi
echo -e "${C_CYAN}================================================================${C_RESET}"