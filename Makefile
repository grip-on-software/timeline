.PHONY: install
install:
	npm install d3
	npm install event-drops
	npm install -g browserify
	npm install -g http-server

.PHONY: clean
clean:
	rm -rf node_modules/

.PHONY: run
run:
	node_modules/http-server/bin/http-server &
