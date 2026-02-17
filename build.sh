#!/bin/bash
set -euo pipefail

# ── Paths ──────────────────────────────────────────────────────────────────────
readonly BINARY="tmp/main"
readonly BUILD_LOG="tmp/build.log"
readonly RUN_LOG="tmp/run.log"

# ── Helpers ────────────────────────────────────────────────────────────────────
log()     { echo "── $* ──────────────────────────────────────────"; }
success() { echo -e "\033[32m$*\033[0m"; }
error()   { echo -e "\033[31m$*\033[0m" >&2; }

# ── Build ──────────────────────────────────────────────────────────────────────
build() {
    mkdir -p tmp

    log "Formatting code"
    go fmt ./...

    log "Tidying modules"
    go mod tidy

    log "Updating dependencies"
    go get -u ./...

    log "Building"
    if go build -o "$BINARY" . > "$BUILD_LOG" 2>&1; then
        success "
    |------------------------------------------|
    |                                          |
    |         Cool everything is ok ✅         |
    |                                          |
    |------------------------------------------| "
        tee -a "$BUILD_LOG" <<< "Build succeeded."
    else
        error "Build failed. See log below:"
        bat --paging=never --color=always "$BUILD_LOG"
        return 1
    fi
}

# ── Clean ──────────────────────────────────────────────────────────────────────
clean() {
    log "Cleaning up"
    rm -rfv "$BINARY"
    : > "$BUILD_LOG"
    : > "$RUN_LOG"
}

# ── Main ───────────────────────────────────────────────────────────────────────
clean
build
