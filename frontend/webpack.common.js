const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const WebpackPwaManifest = require('webpack-pwa-manifest');

module.exports = {
    entry: './src/index.ts',
    output: {
      filename: 'main.[contenthash].js',
      path: path.resolve(__dirname, 'dist')
    },
    plugins: [
      new HtmlWebpackPlugin({
        inject: 'head',
        scriptLoading: 'defer'
      }),
      new WebpackPwaManifest({
        name: 'Soaring Meteo',
        description: 'Meteorology for soaring pilots',
        background_color: '#ffffff',
        icons: [
          {
            src: path.resolve('src/favicoSoaringMeteo.png'),
            sizes: "28x28"
          }
        ],
        // Temporary workaround because the plugin doesn’t support the last version of html-webpack-plugin
        fingerprints: false
      })
    ],

    resolve: {
        extensions: [".ts", ".js", '.tsx'],
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
            },
            {
                test: /\.(ts)x?$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        babelrc: false,
                        configFile: false,
                        presets: ['@babel/preset-env', 'solid', '@babel/preset-typescript'],
                        plugins: ['@babel/plugin-transform-runtime', '@babel/plugin-syntax-dynamic-import', '@babel/plugin-proposal-class-properties', '@babel/plugin-proposal-object-rest-spread'],
                    }
                }
            }
        ]
    }
};

