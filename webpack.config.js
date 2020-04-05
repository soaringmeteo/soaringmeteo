const path = require('path');

module.exports = {
    mode: "development",
    devServer: {
      contentBase: ['./dist', '../makeGFSJson/target/forecast'],
      host: '0.0.0.0'
    },

    entry: './src/index.ts',
    output: {
      filename: 'main.js',
      path: path.resolve(__dirname, 'dist')
    },

    devtool: 'inline-source-map',

    resolve: {
        extensions: [".ts", ".js"],
        alias: {
            "./images/layers.png$": path.resolve(
                __dirname,
                "./node_modules/leaflet/dist/images/layers.png"
            ),
            "./images/layers-2x.png$": path.resolve(
                __dirname,
                "./node_modules/leaflet/dist/images/layers-2x.png"
            ),
            "./images/marker-icon.png$": path.resolve(
                __dirname,
                "./node_modules/leaflet/dist/images/marker-icon.png"
            ),
            "./images/marker-icon-2x.png$": path.resolve(
                __dirname,
                "./node_modules/leaflet/dist/images/marker-icon-2x.png"
            ),
            "./images/marker-shadow.png$": path.resolve(
                __dirname,
                "./node_modules/leaflet/dist/images/marker-shadow.png"
            )
        }
    },

    module: {
        rules: [
            {
                test: /\.ts(x?)$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: "ts-loader"
                    }
                ]
            },
            {
                test: /\leaflet.css$/,
                use: [
                    { loader: 'style-loader' },
                    { loader: 'css-loader' }
                ]
            },
            {
                test: /\.css$/,
                exclude: /\leaflet.css$/,
                use: [
                    { loader: 'style-loader' },
                    {
                        loader: 'css-loader',
                        options: { modules: true }
                    }
                ]
            },
            {
                test: /\.(gif|svg|jpg|png)$/,
                loader: "file-loader"
            }
        ]
    }
};

