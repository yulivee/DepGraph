const path = require('path');
const { CheckerPlugin } = require('awesome-typescript-loader')
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
	entry: './src/main.ts',
	devtool: 'source-map',
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, 'dist')
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: {
					loader: 'awesome-typescript-loader',
					options: {
						transpileOnly: true
					}
				},
				exclude: /node_modules/
			}
		]
	},
	plugins: [
        new CheckerPlugin(),
        new HtmlWebpackPlugin({
            filename: 'index.html',
            template: 'assets/template.html'
        })
	],
	resolve: {
		extensions: ['.ts', '.js']
	},
	target: 'web',
	devServer: {
		contentBase: path.join(__dirname, '/'),
		compress: true,
		hot: false,
		https: false,
		overlay: {
			warnings: true,
			errors: true
		}
	},
	mode: 'development'
};
