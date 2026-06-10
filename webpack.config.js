const path = require('path');

module.exports = {
  entry: './offscreen.js',
  output: {
    filename: 'offscreen_bundle.js',
    path: path.resolve(__dirname, './')
  },
  mode: 'production',
  resolve: {
    fallback: {
      "fs": false,
      "path": false,
      "crypto": false
    }
  }
};
