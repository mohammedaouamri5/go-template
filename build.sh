#!/bin/bash

BINARY="tmp/main"
LOG="tmp/build.log"

# Define the build target
function build() {
	touch $db	
	go build -o $BINARY . 2>&1 | tee $LOG 
}
# Define the clean target
function clean() {
	rm -rfv tmp 
}

clean; 
build; 
