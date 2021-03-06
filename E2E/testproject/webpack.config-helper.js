'use strict';

const Path = require('path');
const Webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const ExtractSASS = new ExtractTextPlugin('styles/bundle.css');

module.exports = (options) => {
  const dest = Path.join(__dirname, 'dist');

  let webpackConfig = {
    devtool: options.devtool,
    entry: [
      './src/scripts/index'
    ],
    output: {
      path: dest,
      filename: 'bundle.js'
    },
    plugins: [
      new Webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify(options.isProduction ? 'production' : 'development')
        }
      }),
      new HtmlWebpackPlugin({
        template: './src/index.html',
        minify: options.isProduction && {
          collapseWhitespace: true,
          conservativeCollapse: true,
          decodeEntities: true,
          minifyCSS: true,
          minifyJS: true,
          removeComments: true
        }
      })
    ],
    module: {
      rules: [{
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['es2015']
          }
        }
      }]
    }
    };

  if (options.isProduction) {
    webpackConfig.entry = ['./src/scripts/index'];


    webpackConfig.module.rules.push({
      test: /\.s?css/i,
      use: ExtractSASS.extract(['css-loader?sourceMap=true&minimize=true', 'sass-loader'])
    });

  } else {
    webpackConfig.plugins.push(
      new Webpack.HotModuleReplacementPlugin()
    );

    webpackConfig.module.rules.push({
      test: /\.s?css$/i,
      use: ['style-loader', 'css-loader?sourceMap=true', 'sass-loader']
    }, {
      test: /\.js$/,
      use: 'eslint-loader',
      exclude: /node_modules/
    });

    webpackConfig.devServer = {
      contentBase: dest,
      hot: true,
      port: process.env.PORT,
      host: process.env.IP,
      disableHostCheck:true, 
      inline: true
    };
  }

  return webpackConfig;

};
