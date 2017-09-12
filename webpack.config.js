var path = require('path');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var CopyWebpackPlugin = require('copy-webpack-plugin');
var webpack = require('webpack');

// NODE_ENV to production
// Minification

var config = {
	entry: ['babel-polyfill','./app/index.js'],
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'index_bundle.js',
		publicPath: '/poverty_map',
	},
	module: {
		rules: [
			{test: /\.(js)$/, use: 'babel-loader'}, // transpile new ES6 syntax and JSX into old javascript
			{test: /\.css$/, use: ['style-loader', 'css-loader']},
			{test: /\.png$/, use: 'url-loader?mimetype=image/png'}
		]
	},
	devServer: {
		historyApiFallback: true,
	},
	plugins: [
		new HtmlWebpackPlugin({template: 'app/index.html'}), 
		new CopyWebpackPlugin([{from: 'app/data', to: 'data' }])
	],
	node: {
	 	fs: 'empty'
	}
};

if (process.env.NODE_ENV === 'production') {
	config.plugins.push(
		new webpack.DefinePlugin({
			'process.env' : {
				'NODE_ENV': JSON.stringify(process.env.NODE_ENV)
			}
		}),
		new webpack.optimize.UglifyJsPlugin()

	)
}

module.exports = config;

