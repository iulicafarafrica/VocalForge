#!/bin/bash
# Clauder CLI wrapper for VocalForge
# Provides easy access to clauder memory and messaging features

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
CLAUDER_DB="$PROJECT_ROOT/.qwen/clauder.db"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_help() {
    echo -e "${BLUE}Clauder CLI for VocalForge${NC}"
    echo ""
    echo "Usage: $0 <command> [arguments]"
    echo ""
    echo "Commands:"
    echo "  remember <fact>     Store a fact/decision in memory"
    echo "  recall <query>      Search and retrieve facts"
    echo "  forget <id>         Delete a fact"
    echo "  facts list          List all stored facts"
    echo "  messages            Check incoming messages"
    echo "  send <instance> <msg>  Send message to instance"
    echo "  instances           List running instances"
    echo "  status              Show clauder status"
    echo "  session save        Save current session context"
    echo "  session load        Load last session context"
    echo "  help                Show this help"
}

# Remember fact
cmd_remember() {
    local fact="$1"
    if [ -z "$fact" ]; then
        echo -e "${RED}Error: Please provide a fact to remember${NC}"
        echo "Usage: $0 remember \"Your fact here\""
        exit 1
    fi
    
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local fact_id="fact-$(date +%s)-$$"
    
    # Store in SQLite
    sqlite3 "$CLAUDER_DB" "INSERT OR REPLACE INTO facts (id, content, tags, source, directory, created_at, updated_at) VALUES ('$fact_id', '$fact', '[]', 'vocalforge', '$PROJECT_ROOT', '$timestamp', '$timestamp');"
    
    echo -e "${GREEN}✓ Fact saved:${NC} $fact"
    echo -e "${BLUE}ID:${NC} $fact_id"
}

# Recall facts
cmd_recall() {
    local query="$1"
    if [ -z "$query" ]; then
        echo -e "${RED}Error: Please provide a search query${NC}"
        echo "Usage: $0 recall \"your search terms\""
        exit 1
    fi
    
    echo -e "${BLUE}Searching for: ${NC}\"$query\""
    echo ""
    
    sqlite3 -header -column "$CLAUDER_DB" "SELECT id, substr(content, 1, 80) as content, created_at FROM facts WHERE content LIKE '%$query%' OR tags LIKE '%$query%' ORDER BY created_at DESC LIMIT 10;"
}

# List facts
cmd_facts_list() {
    echo -e "${BLUE}Stored Facts:${NC}"
    echo ""
    sqlite3 -header -column "$CLAUDER_DB" "SELECT id, substr(content, 1, 60) as content, created_at FROM facts ORDER BY created_at DESC LIMIT 20;"
}

# Save session context
cmd_session_save() {
    echo -e "${BLUE}Saving session context...${NC}"
    
    # Get current git branch
    local branch=$(git branch --show-current 2>/dev/null || echo "unknown")
    
    # Get last modified files
    local modified=$(git status --short 2>/dev/null | head -10 | tr '\n' ', ' | sed 's/,$//')
    
    # Get current date
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local session_id="session-$(date +%s)"
    
    # Save session facts
    $0 remember "Session $session_id: Working on branch '$branch', modified files: $modified"
    $0 remember "Last session timestamp: $timestamp"
    
    echo -e "${GREEN}✓ Session context saved${NC}"
    echo -e "${BLUE}Branch:${NC} $branch"
    echo -e "${BLUE}Modified:${NC} $modified"
}

# Load session context
cmd_session_load() {
    echo -e "${BLUE}Loading last session context...${NC}"
    echo ""
    $0 recall "Session"
}

# Show status
cmd_status() {
    echo -e "${BLUE}Clauder Status${NC}"
    echo ""
    
    if [ -f "$CLAUDER_DB" ]; then
        echo -e "${GREEN}✓ Database:${NC} $CLAUDER_DB"
        local fact_count=$(sqlite3 "$CLAUDER_DB" "SELECT COUNT(*) FROM facts;")
        echo -e "${BLUE}Facts stored:${NC} $fact_count"
    else
        echo -e "${YELLOW}⚠ Database not initialized${NC}"
    fi
}

# Show instances
cmd_instances() {
    echo -e "${BLUE}Running Instances:${NC}"
    echo ""
    echo "No instance tracking yet (requires clauder server)"
}

# Show messages
cmd_messages() {
    echo -e "${BLUE}Messages:${NC}"
    echo ""
    echo "No messages (requires clauder server)"
}

# Send message
cmd_send() {
    local instance="$1"
    local message="$2"
    
    if [ -z "$instance" ] || [ -z "$message" ]; then
        echo -e "${RED}Error: Please provide instance and message${NC}"
        echo "Usage: $0 send <instance> \"your message\""
        exit 1
    fi
    
    echo -e "${YELLOW}Message sending not implemented (requires clauder server)${NC}"
}

# Initialize database
init_db() {
    if [ ! -f "$CLAUDER_DB" ]; then
        echo -e "${BLUE}Initializing Clauder database...${NC}"
        mkdir -p "$(dirname "$CLAUDER_DB")"
        
        sqlite3 "$CLAUDER_DB" <<EOF
CREATE TABLE IF NOT EXISTS facts (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    tags TEXT DEFAULT '[]',
    source TEXT DEFAULT 'vocalforge',
    directory TEXT,
    created_at DATETIME,
    updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    from_instance TEXT,
    to_instance TEXT,
    content TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at DATETIME
);

CREATE TABLE IF NOT EXISTS instances (
    id TEXT PRIMARY KEY,
    name TEXT,
    directory TEXT NOT NULL,
    pid INTEGER,
    status TEXT DEFAULT 'active',
    last_heartbeat DATETIME
);

CREATE INDEX IF NOT EXISTS idx_facts_content ON facts(content);
CREATE INDEX IF NOT EXISTS idx_facts_tags ON facts(tags);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read);
EOF
        
        echo -e "${GREEN}✓ Database initialized:${NC} $CLAUDER_DB"
    fi
}

# Main command router
main() {
    # Initialize database if needed
    init_db
    
    local command="$1"
    shift
    
    case "$command" in
        remember)
            cmd_remember "$@"
            ;;
        recall)
            cmd_recall "$@"
            ;;
        forget)
            echo "Not implemented yet"
            ;;
        facts)
            if [ "$1" = "list" ]; then
                cmd_facts_list
            else
                echo "Unknown facts command. Use: facts list"
            fi
            ;;
        messages)
            cmd_messages
            ;;
        send)
            cmd_send "$@"
            ;;
        instances)
            cmd_instances
            ;;
        status)
            cmd_status
            ;;
        session)
            if [ "$1" = "save" ]; then
                cmd_session_save
            elif [ "$1" = "load" ]; then
                cmd_session_load
            else
                echo "Unknown session command. Use: session save | session load"
            fi
            ;;
        help|--help|-h)
            print_help
            ;;
        *)
            echo -e "${RED}Unknown command:${NC} $command"
            echo ""
            print_help
            exit 1
            ;;
    esac
}

# Run main
main "$@"
