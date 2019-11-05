const path = require('path');
const webpack = require('webpack');

module.exports = {
  output: {
    path: path.resolve(__dirname, '..', 'lib')
  },
  resolve: {
    extensions: ['.js', '.jsx']
  },
  plugins: [
    new webpack.ProvidePlugin({
      WaveSurfer: 'wavesurfer.js'
    })
  ],
  module: {
    rules: [
      {
        test: /.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            sourceMaps: true,
            presets: ['es2015', 'stage-0', 'react']
          }
        }
      }
    ]
  }
};
