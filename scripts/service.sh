#!/usr/bin/env bash
#
# SystemOSC macOS Service Manager
# Installs/uninstalls SystemOSC as a macOS LaunchAgent (auto-start at login)
#
# Usage:
#   ./scripts/service.sh install          # Build, compile menu bar app, install LaunchAgents
#   ./scripts/service.sh install --no-menubar   # Install daemon only (skip menu bar app)
#   ./scripts/service.sh uninstall        # Stop and remove all LaunchAgents
#   ./scripts/service.sh status           # Show service status
#   ./scripts/service.sh logs             # Tail the daemon log file

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PLIST_DIR="$HOME/Library/LaunchAgents"
AGENT_LABEL="com.systemosc.agent"
MENUBAR_LABEL="com.systemosc.menubar"
AGENT_PLIST="$PLIST_DIR/$AGENT_LABEL.plist"
MENUBAR_PLIST="$PLIST_DIR/$MENUBAR_LABEL.plist"
LOG_FILE="$HOME/Library/Logs/systemosc.log"
MENUBAR_LOG_FILE="$HOME/Library/Logs/systemosc-menubar.log"

red()    { printf '\033[0;31m%s\033[0m\n' "$*"; }
green()  { printf '\033[0;32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[0;33m%s\033[0m\n' "$*"; }

cmd_install() {
    local skip_menubar=false
    for arg in "$@"; do
        case "$arg" in
            --no-menubar) skip_menubar=true ;;
        esac
    done

    echo "==> Building SystemOSC..."
    cd "$PROJECT_DIR"
    npm run build

    # Resolve node path
    local node_path
    node_path="$(which node)"
    if [ -z "$node_path" ]; then
        red "Error: node not found in PATH"
        exit 1
    fi
    green "Using node: $node_path"

    # Verify dist/index.js exists
    if [ ! -f "$PROJECT_DIR/dist/index.js" ]; then
        red "Error: dist/index.js not found. Build may have failed."
        exit 1
    fi

    # Create LaunchAgents directory if needed
    mkdir -p "$PLIST_DIR"

    # Generate and install daemon plist
    echo "==> Installing daemon LaunchAgent..."
    sed -e "s|__NODE_PATH__|$node_path|g" \
        -e "s|__PROJECT_DIR__|$PROJECT_DIR|g" \
        -e "s|__HOME__|$HOME|g" \
        "$PROJECT_DIR/com.systemosc.agent.plist" > "$AGENT_PLIST"

    # Unload first if already loaded (ignore errors)
    launchctl bootout "gui/$(id -u)/$AGENT_LABEL" 2>/dev/null || true
    launchctl bootstrap "gui/$(id -u)" "$AGENT_PLIST"
    green "Daemon LaunchAgent installed and started."

    # Optional: compile and install menu bar app
    if [ "$skip_menubar" = false ]; then
        if ! command -v swiftc &>/dev/null; then
            yellow "Warning: swiftc not found. Skipping menu bar app."
            yellow "Install Xcode Command Line Tools: xcode-select --install"
        else
            echo "==> Compiling menu bar app..."
            mkdir -p "$PROJECT_DIR/menubar"
            swiftc -O -o "$PROJECT_DIR/menubar/SystemOSCMenu" \
                "$PROJECT_DIR/menubar/SystemOSCMenu.swift" \
                -framework Cocoa
            green "Menu bar app compiled."

            echo "==> Installing menu bar LaunchAgent..."
            sed -e "s|__PROJECT_DIR__|$PROJECT_DIR|g" \
                -e "s|__HOME__|$HOME|g" \
                "$PROJECT_DIR/com.systemosc.menubar.plist" > "$MENUBAR_PLIST"

            launchctl bootout "gui/$(id -u)/$MENUBAR_LABEL" 2>/dev/null || true
            launchctl bootstrap "gui/$(id -u)" "$MENUBAR_PLIST"
            green "Menu bar LaunchAgent installed and started."
        fi
    else
        yellow "Skipping menu bar app (--no-menubar)."
    fi

    echo ""
    green "SystemOSC service installed successfully!"
    echo "  Daemon log: $LOG_FILE"
    echo "  Check status: npm run service:status"
}

cmd_uninstall() {
    echo "==> Uninstalling SystemOSC services..."

    # Unload daemon
    if launchctl print "gui/$(id -u)/$AGENT_LABEL" &>/dev/null; then
        launchctl bootout "gui/$(id -u)/$AGENT_LABEL" 2>/dev/null || true
        green "Daemon stopped."
    fi
    if [ -f "$AGENT_PLIST" ]; then
        rm "$AGENT_PLIST"
        green "Daemon plist removed."
    fi

    # Unload menu bar
    if launchctl print "gui/$(id -u)/$MENUBAR_LABEL" &>/dev/null; then
        launchctl bootout "gui/$(id -u)/$MENUBAR_LABEL" 2>/dev/null || true
        green "Menu bar app stopped."
    fi
    if [ -f "$MENUBAR_PLIST" ]; then
        rm "$MENUBAR_PLIST"
        green "Menu bar plist removed."
    fi

    echo ""
    green "SystemOSC services uninstalled."
}

cmd_status() {
    echo "=== SystemOSC Service Status ==="
    echo ""

    echo "Daemon ($AGENT_LABEL):"
    if launchctl print "gui/$(id -u)/$AGENT_LABEL" 2>/dev/null | grep -q "state"; then
        launchctl print "gui/$(id -u)/$AGENT_LABEL" 2>/dev/null | grep -E "state|pid|last exit"
        green "  Status: loaded"
    else
        yellow "  Status: not loaded"
    fi

    echo ""
    echo "Menu Bar ($MENUBAR_LABEL):"
    if launchctl print "gui/$(id -u)/$MENUBAR_LABEL" 2>/dev/null | grep -q "state"; then
        launchctl print "gui/$(id -u)/$MENUBAR_LABEL" 2>/dev/null | grep -E "state|pid|last exit"
        green "  Status: loaded"
    else
        yellow "  Status: not loaded"
    fi
}

cmd_logs() {
    if [ ! -f "$LOG_FILE" ]; then
        yellow "Log file not found: $LOG_FILE"
        echo "The daemon may not have started yet."
        exit 1
    fi
    echo "==> Tailing $LOG_FILE (Ctrl+C to stop)"
    tail -f "$LOG_FILE"
}

# Main
case "${1:-}" in
    install)   shift; cmd_install "$@" ;;
    uninstall) cmd_uninstall ;;
    status)    cmd_status ;;
    logs)      cmd_logs ;;
    *)
        echo "SystemOSC macOS Service Manager"
        echo ""
        echo "Usage: $0 <command> [options]"
        echo ""
        echo "Commands:"
        echo "  install [--no-menubar]   Build and install as macOS LaunchAgent"
        echo "  uninstall                Stop and remove LaunchAgents"
        echo "  status                   Show service status"
        echo "  logs                     Tail the daemon log file"
        exit 1
        ;;
esac
