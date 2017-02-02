RELEASE=v0.3.0-alpha1-lhelwerd

.PHONY: install
install:
	npm install d3
	npm install https://github.com/lhelwerd/EventDrops/releases/download/$(RELEASE)/$(RELEASE).tar.gz
	npm install browserify
	npm install http-server

bundle.js: index.js data.json
	./node_modules/browserify/bin/cmd.js index.js > bundle.js

.PHONY: clean
clean:
	rm -rf node_modules/

.PHONY: run
run: bundle.js
	./node_modules/http-server/bin/http-server
