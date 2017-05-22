LIBS=$(wildcard lib/*.js)
OPT=--optimize-minimize --optimize-occurence-order --optimize-dedupe

.PHONY: install
install:
	npm install

.PHONY: build
build: public/bundle.js

.PHONY: debug
debug: OPT=
debug: clean public/bundle.js
	
public/bundle.js: $(LIBS) data/data.json locales.json
	./node_modules/webpack/bin/webpack.js $(OPT) --progress --devtool source-map lib/index.js public/bundle.js
	rm -rf public/data/
	cp -r data/ public/data/

watch:
	./node_modules/webpack/bin/webpack.js --watch --progress --devtool source-map lib/index.js public/bundle.js

.PHONY: clean
clean:
	rm -rf public/bundle.js public/bundle.js.map public/data/

.PHONY: realclean
realclean: clean
	rm -rf node_modules/

.PHONY: run
run: public/bundle.js
	./node_modules/http-server/bin/http-server public/
