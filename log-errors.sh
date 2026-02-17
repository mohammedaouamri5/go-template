
#!/bin/bash
# log.sh - Monitor and display log file with bat formatting

# Function to check if required commands are available
check_dependencies() {
    local deps=("bat" "inotifywait")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            echo "Error: $dep is not installed or not in PATH" >&2
            exit 1
        fi
    done
}

# Function to validate log file exists
validate_log_file() {
    local log_file="$1"
    if [[ ! -f "$log_file" ]]; then
        echo "Error: Log file '$log_file' does not exist" >&2
        exit 1
    fi
}

# Function to display initial log content
display_initial_log() {
    local log_file="$1"
    echo "Initial content of $log_file:"
    bat --paging=never --color=always "$log_file"
    echo "Monitoring for changes... (Press Ctrl+C to stop)"
}

# Function to monitor log file changes
monitor_log_changes() {
    local log_file="$1"
    
    # Monitor file changes and update display
    inotifywait -m "$log_file" -e modify --format '%w%f' 2>/dev/null | while read -r changed_file; do
        if [[ -f "$changed_file" ]]; then
            /bin/clear
            bat --paging=never --color=always "$changed_file"
        fi
    done
}

# Main function to orchestrate the monitoring
main() {
    local log_file="${1:-build.log}"
    
    check_dependencies
    validate_log_file "$log_file"
    display_initial_log "$log_file"
    monitor_log_changes "$log_file"
}

# Handle Ctrl+C gracefully
trap 'echo -e "\nMonitoring stopped." >&2; exit 0' INT

# Execute main function with provided argument
main "$@"
