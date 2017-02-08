module.exports = {
    module: {
        loaders: [
            { test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" },
            { test: /\.json$/, loader: "json" },
            { test: /\.css$/, loader: "style!css?sourceMap" }
        ]
    }
};
