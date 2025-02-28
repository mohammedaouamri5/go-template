#!/bin/bash




# Define paths for binaries and logs
BINARY="tmp/main"
BUILD_LOG="tmp/build.log"
RUN_LOG="tmp/run.log"

# Function to build the project
function build() {
    echo "----------------------------------"
    echo "Building the project..."
    

    # Run go build and redirect output to the build log
    if go build -o "$BINARY" . > "$BUILD_LOG" 2>&1; then
        echo "Build succeeded."
        echo "
|----------------------------------------|
|                                        |
|        Cool evry thing is ok ✅        |
|                                        |
|----------------------------------------|

        " > "$BUILD_LOG" 2>&1
    else
        echo "Build failed. Check $BUILD_LOG for details."
    fi
}

# Function to clean up previous build artifacts
function clean() {
    echo "----------------------------------"
    echo "Cleaning up..."

    # Remove the binary
    rm -rfv "$BINARY"

    # Clear log files
    echo "---------------------------------------------" > "$BUILD_LOG"
    echo "---------------------------------------------"  > "$RUN_LOG"
}


# Run the clean and build steps
clean
build
