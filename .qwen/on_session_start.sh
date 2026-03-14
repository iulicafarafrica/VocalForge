#!/bin/bash
# Qwen Code Session Startup Script for VocalForge
# This script runs automatically when a new Qwen Code session starts
# It loads the last session context from clauder memory

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║       VocalForge — Loading Session Context              ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Check if clauder database exists
if [ ! -f "$PROJECT_ROOT/.qwen/clauder.db" ]; then
    echo "⚠️  Clauder database not found. Initializing..."
    "$SCRIPT_DIR/clauder.sh" status > /dev/null 2>&1
fi

# Load last session context
echo "Loading last session context..."
"$SCRIPT_DIR/clauder.sh" session load 2>/dev/null

# Show recent facts
echo ""
echo "Recent context:"
"$SCRIPT_DIR/clauder.sh" recall "Session" 2>/dev/null | head -7

# Show active skills reminder
echo ""
echo "Active skills for this session:"
echo "  ✅ claudecode-tools (permanent)"
echo "  ✅ clauder (permanent - session memory)"
echo ""

# Show current git status
echo "Current status:"
cd "$PROJECT_ROOT"
git status --short 2>/dev/null | head -5 || echo "  (not a git repo)"
echo ""

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✓ Session loaded! Ready to code.                       ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
