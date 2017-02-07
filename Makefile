.PHONY: install
install:
	npm install

.PHONY: build
build: public/bundle.js
	
public/bundle.js: lib/index.js lib/tooltip.js lib/weekday.js data.json locales.json
	./node_modules/webpack/bin/webpack.js --progress --devtool source-map lib/index.js public/bundle.js

.PHONY: clean
clean:
	rm -rf node_modules/ public/bundle.js public/bundle.js.map

.PHONY: run
run: public/bundle.js
	./node_modules/http-server/bin/http-server public/
