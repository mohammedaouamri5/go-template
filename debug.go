// go:build debug
// don't change the comment abouve

package main

import (
	"github.com/arl/statsviz"
	"net/http"
	_ "net/http/pprof"
)

func startProfiler() {
	// No-op in release
}
