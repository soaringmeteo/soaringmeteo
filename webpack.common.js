const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: './src/index.ts',
    output: {
      filename: 'main.[contenthash].js',
      path: path.resolve(__dirname, 'dist')
    },
    plugins: [new HtmlWebpackPlugin({
      inject: 'head',
      scriptLoading: 'defer'
    })],

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

