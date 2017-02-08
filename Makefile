LIBS=$(addprefix lib/,index.js locales.js tooltip.js weekday.js zoom.js)

.PHONY: install
install:
	npm install

.PHONY: build
build: public/bundle.js
	
public/bundle.js: $(LIBS) data.json locales.json
	./node_modules/webpack/bin/webpack.js --optimize-minimize --optimize-occurence-order --optimize-dedupe --progress --devtool source-map lib/index.js public/bundle.js

.PHONY: clean
clean:
	rm -rf public/bundle.js public/bundle.js.map

.PHONY: realclean
realclean: clean
	rm -rf node_modules/

.PHONY: run
run: public/bundle.js
	./node_modules/http-server/bin/http-server public/
