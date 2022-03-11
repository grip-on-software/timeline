// JSON loader
// Based on https://codepen.io/KryptoniteDove/post/load-json-file-locally-using-pure-javascript

import LRU from 'lru-cache';
import XHR from 'xhr-promise';

const cache = new LRU({max: 50});

export default function json(versioning) {
    const loader = {};
    loader.preload = (path, data) => {
        cache.set(path, data);
    };

    loader.loadJSON = (path, callback) => {
        const result = cache.get(path);
        if (typeof result !== 'undefined') {
            callback(result);
            return Promise.resolve();
        }

        const req = new XHR();
        const promise = req.send({
            method: 'GET',
            url: `${path}?${versioning}`,
        }).then((result) => {
            if (result.status !== 200) {
                throw new Error(`JSON load for ${path} failed`);
            }
            cache.set(path, result.responseText);
            callback(result.responseText);
        });
        req.getXHR().overrideMimeType("application/json");
        return promise;
    };

    return loader;
}
