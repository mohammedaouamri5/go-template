package main

import (
	"github.com/mohammedaouamri5/go-log/log"
	"os"
)

func _init_() {
	log.INIT(os.Stdout, log.NewStructuredLoggerFormatter(nil))
	go startProfiler()
}

func main() {
	_init_()

}
