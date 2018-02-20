import path from 'path'
import webpack from 'webpack'
import Dotenv from 'dotenv-webpack'
import fs from 'fs'


const PLUGINS = [
  new Dotenv({
    path: './.env',
    safe: false
  }),
  new webpack.DefinePlugin({
    'process.env': {
      NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development')
    }
  })
]


const CLIENT_CONFIG = {
  entry: path.resolve(__dirname, 'client/app.jsx'),
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'public')
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ['babel-loader']
      },
      {
        test: /\.css$/,
        loader: 'style-loader!css-loader'
      },
      {
        test: /\.(png|svg|jpg|gif|woff2|woff|ttf)$/,
        use: ['file-loader']
      }
    ]
  },
  plugins: PLUGINS
}



var nodeModules = {}

fs.readdirSync('node_modules')
  .filter(x => { return ['.bin'].indexOf(x) === -1 })
  .forEach(mod => { nodeModules[mod] = 'commonjs ' + mod })


const SERVER_CONFIG = {
  entry: path.join(__dirname, 'server/app.js'),
  target: 'node',
  output: {
    filename: 'server.js',
    path: path.join(__dirname, 'dist/server')
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ['babel-loader']
      }
    ]
  },
  devtool: 'source-map',
  externals: nodeModules,
  node: {
    __dirname: false
  },
  plugins: PLUGINS
}


module.exports = [CLIENT_CONFIG, SERVER_CONFIG]
