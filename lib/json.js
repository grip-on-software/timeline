// JSON loader
// Based on https://codepen.io/KryptoniteDove/post/load-json-file-locally-using-pure-javascript

const LRU = require('lru-cache');
const XHR = require('xhr-promise');

module.exports = (function() {
    const cache = LRU(50);

    return function loader(versioning) {
        var json = {};
        json.preload = (path, data) => {
            cache.set(path, data);
        };

        json.loadJSON = (path, callback) => {
            var result = cache.get(path);
            if (typeof result !== 'undefined') {
                callback(result);
                return;
            }

            var req = new XHR();
            var promise = req.send({
                method: 'GET',
                url: path + '?' + versioning,
            }).then((result) => {
                if (result.status !== 200) {
                    throw new Error('JSON load for ' + path + ' failed');
                }
                cache.set(path, result.responseText);
                callback(result.responseText);
            });
            req.getXHR().overrideMimeType("application/json");
            return promise;
        }

        return json;
    };
})();
