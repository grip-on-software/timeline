// JSON loader
// Based on https://codepen.io/KryptoniteDove/post/load-json-file-locally-using-pure-javascript

const LRU = require('lru-cache');

module.exports = (function() {
    const cache = LRU(50);

    var json = {};
    json.loadJSON = (path, versioning, callback) => {
        var result = cache.get(path);
        if (typeof result !== 'undefined') {
            callback(result);
            return;
        }

        var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
        xobj.open('GET', path + '?' + versioning, true);
        xobj.onreadystatechange = function () {
            if (xobj.readyState == 4 && xobj.status == "200") {
                var result = JSON.parse(xobj.responseText);
                cache.set(path, result);
                callback(result);
            }
        };
        xobj.send(null);
    }

    return json;
})();
