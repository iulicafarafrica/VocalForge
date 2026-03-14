#!/bin/bash
# Save Session Context Script for VocalForge
# Automatically saves current session state to clauder memory
# Run this at the end of each coding session

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║       VocalForge — Save Session Context                 ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Get current timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
SESSION_ID="session-$(date +%s)"

# Get current git branch
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "Branch: $BRANCH"

# Get modified files
echo ""
echo "Modified files:"
MODIFIED=$(git status --short 2>/dev/null)
if [ -n "$MODIFIED" ]; then
    echo "$MODIFIED" | head -20
    MODIFIED_COUNT=$(echo "$MODIFIED" | wc -l | tr -d ' ')
else
    echo "  (none)"
    MODIFIED_COUNT=0
fi

# Get last commit
echo ""
echo "Last commit:"
git log -1 --pretty=format:"  %h - %s (%cr)" 2>/dev/null || echo "  (no commits)"
echo ""

# Save to clauder memory
echo "Saving to clauder memory..."
"$SCRIPT_DIR/clauder.sh" remember "Session $SESSION_ID ($TIMESTAMP): Branch '$BRANCH', $MODIFIED_COUNT modified files"

# Save modified files list
if [ -n "$MODIFIED" ]; then
    MODIFIED_LIST=$(echo "$MODIFIED" | tr '\n' ', ' | sed 's/,$//' | sed "s/'/''/g")
    "$SCRIPT_DIR/clauder.sh" remember "Session $SESSION_ID modified: $MODIFIED_LIST"
fi

# Save current task context (if exists)
TASK_FILE="$PROJECT_ROOT/.qwen/current_task.md"
if [ -f "$TASK_FILE" ]; then
    TASK_CONTENT=$(cat "$TASK_FILE" | head -5 | tr '\n' ' ' | sed "s/'/''/g")
    "$SCRIPT_DIR/clauder.sh" remember "Session $SESSION_ID task: $TASK_CONTENT"
fi

# Save pending todos (if exists)
TODO_FILE="$PROJECT_ROOT/.qwen/todos.md"
if [ -f "$TODO_FILE" ]; then
    TODO_CONTENT=$(cat "$TODO_FILE" | head -10 | tr '\n' ' ' | sed "s/'/''/g")
    "$SCRIPT_DIR/clauder.sh" remember "Session $SESSION_ID pending: $TODO_CONTENT"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✓ Session context saved successfully!                  ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "To restore this session, run:"
echo "  .qwen/scripts/clauder.sh session load"
echo ""
