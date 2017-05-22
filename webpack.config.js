var webpack = require('webpack');
var WebpackNotifierPlugin = require('webpack-notifier');

module.exports = {
    module: {
        loaders: [
            { test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" },
            { test: /\.json$/, loader: "json" },
            { test: /\.css$/, loader: "style!css?sourceMap" }
        ]
    },
    plugins: [
        new webpack.IgnorePlugin(/~$/),
        new WebpackNotifierPlugin({
            title: 'Webpack',
            alwaysNotify: true,
            excludeWarnings: true
        })
    ]
};
