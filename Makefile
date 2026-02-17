
APP_NAME=main



go_get: 
	go get -u 


build:
	@echo "Building the project... 🚀"
	go build -o $(APP_NAME) ./
	@echo "Build completed! 🎉"


hot_reload: 
	@echo "hot reloading ... 🚀"
	air . 


run: build
	@echo "Running the application... 🏃"
	./$(APP_NAME)

clean-build:
	@echo "Cleaning up build files... 🧹"
	rm -f $(APP_NAME)
	@echo "Cleanup complete! ✅"

test:
	@echo "Running tests... 🧪"
	go test ./...
	@echo "Tests completed! ✔️"

lint:
	@echo "Linting the code... 🔍"
	golangci-lint run
	@echo "Linting complete! ✅"

log-errors:
	@echo "Logging errors... 📚"
	./log-errors.sh ./tmp/build.log


CleanDB:
	@echo "Cleaning up the database... 🔥"
	go run ./migrate/cleanDB.go
	@echo "Database wiped! 👌"

MigrateDB:
	@echo "Migrating the database... 🔥"
	go run ./migrate/migrate.go
	@echo "Database migrated! 👌"

Fill:
	@echo "Filling the database... 🔥"
	go run ./migrate/fill.go $(ARGS)
	@echo "Database full! 👌"



