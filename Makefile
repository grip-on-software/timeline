.PHONY: install
install:
	npm install d3
	npm install event-drops
	npm install -g browserify
	npm install -g http-server

bundle.js: index.js data.json
	browserify index.js > bundle.js

.PHONY: clean
clean:
	rm -rf node_modules/

.PHONY: run
run: bundle.js
	http-server
