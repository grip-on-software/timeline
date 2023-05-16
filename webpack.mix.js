/**
 * Entry point for the laraval-mix/webpack compilation.
 *
 * Copyright (c) 2017-2020 ICTU
 * Copyright (c) 2017-2022 Leiden University
 * Copyright (c) 2017-2023 Leon Helwerda
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const fs = require('fs'),
      path = require('path'),
      mix = require('laravel-mix'),
      _ = require('lodash'),
      HtmlWebpackPlugin = require('html-webpack-plugin');

let config = process.env.TIMELINE_CONFIGURATION;
if (config === undefined || !fs.existsSync(config)) {
    config = path.resolve(__dirname, 'config.json');
}
if (!fs.existsSync(config)) {
    config = path.resolve(__dirname, 'lib/config.json');
}

const configuration = _.mapValues(JSON.parse(fs.readFileSync(config)),
    value => value.replace('$organization',
        typeof process.env.VISUALIZATION_ORGANIZATION !== 'undefined' ?
        process.env.VISUALIZATION_ORGANIZATION : ''
    )
);

Mix.paths.setRootPath(__dirname);
mix.setPublicPath('public/')
    .setResourceRoot('')
    .js('lib/index.js', 'public/bundle.js')
    .sass('res/main.scss', 'public/main.css')
    .browserSync({
        proxy: false,
        server: 'public',
        files: [
            'public/**/*.js',
            'public/**/*.css'
        ]
    })
    .babelConfig({
        "env": {
            "test": {
                "plugins": [ "istanbul" ]
            }
        }
    })
    .webpackConfig({
        output: {
            path: path.resolve('public/'),
            publicPath: configuration.path
        },
        module: {
            rules: [ {
                test: /\.mustache$/,
                loader: 'mustache-loader',
                options: {
                    tiny: true,
                    render: Object.assign({}, configuration)
                }
            } ]
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: 'template/index.mustache',
                inject: 'body'
            })
        ],
        resolve: {
            alias: {
                'config.json$': config
            }
        }
    });

// Full API
// mix.js(src, output);
// mix.react(src, output); <-- Identical to mix.js(), but registers React Babel compilation.
// mix.extract(vendorLibs);
// mix.sass(src, output);
// mix.less(src, output);
// mix.stylus(src, output);
// mix.browserSync('my-site.dev');
// mix.combine(files, destination);
// mix.babel(files, destination); <-- Identical to mix.combine(), but also includes Babel compilation.
// mix.copy(from, to);
// mix.copyDirectory(fromDir, toDir);
// mix.minify(file);
// mix.sourceMaps(); // Enable sourcemaps
// mix.version(); // Enable versioning.
// mix.disableNotifications();
// mix.setPublicPath('path/to/public');
// mix.setResourceRoot('prefix/for/resource/locators');
// mix.autoload({}); <-- Will be passed to Webpack's ProvidePlugin.
// mix.webpackConfig({}); <-- Override webpack.config.js, without editing the file directly.
// mix.then(function () {}) <-- Will be triggered each time Webpack finishes building.
// mix.options({
//   extractVueStyles: false, // Extract .vue component styling to file, rather than inline.
//   processCssUrls: true, // Process/optimize relative stylesheet url()'s. Set to false, if you don't want them touched.
//   purifyCss: false, // Remove unused CSS selectors.
//   uglify: {}, // Uglify-specific options. https://webpack.github.io/docs/list-of-plugins.html#uglifyjsplugin
//   postCss: [] // Post-CSS options: https://github.com/postcss/postcss/blob/master/docs/plugins.md
// });
