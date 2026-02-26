#!/bin/bash
# Set skip-worktree on depot.code-workspace in all worktrees

echo "Setting skip-worktree on depot.code-workspace in all worktrees..."

# Main repo
if [ -d ~/git/depot/.git ]; then
  cd ~/git/depot
  if [ -f depot.code-workspace ]; then
    git update-index --skip-worktree depot.code-workspace 2>/dev/null && echo "✓ Main depot"
  fi
fi

# All worktrees
for worktree in ~/git/depot.worktrees/*/; do
  if [ -d "$worktree" ]; then
    cd "$worktree"
    if [ -f depot.code-workspace ]; then
      git update-index --skip-worktree depot.code-workspace 2>/dev/null && echo "✓ $worktree"
    fi
  fi
done

echo "Done!"
