const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');

module.exports = merge(common,{
    mode: "development",
    devServer: {
      static: [
        {
          directory: './dist'
        },
        {
          directory: '../backend/target/forecast'
        }
      ],
      host: '0.0.0.0'
    },
    devtool: 'inline-source-map'
});
