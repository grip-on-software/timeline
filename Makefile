.PHONY: install
install:
	npm install

bundle.js: index.js weekday.js data.json locales.json
	./node_modules/webpack/bin/webpack.js --progress --devtool source-map index.js bundle.js

.PHONY: clean
clean:
	rm -rf node_modules/ bundle.js

.PHONY: run
run: bundle.js
	./node_modules/http-server/bin/http-server
