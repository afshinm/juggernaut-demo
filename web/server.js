var path = require('path');
var webpack = require('webpack');
var express = require('express');
var config = require('./webpack.config');

var app = express();
var compiler = webpack(config);

app.use(require('webpack-dev-middleware')(compiler, {
  publicPath: config.output.publicPath
}));

app.use(require('webpack-hot-middleware')(compiler));

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/dataset/:file', function(req, res) {
  res.sendFile(path.join(__dirname, 'dataset/' + req.params.file));
});

app.get('/loader.js', function(req, res) {
  res.sendFile(path.join(__dirname, 'src/loader.js'));
});

app.get('/wasm/:file', function(req, res) {
  res.sendFile(path.join(__dirname, 'src/wasm/' + req.params.file));
});

app.listen(3000, function(err) {
  if (err) {
    return console.error(err);
  }

  console.log('Listening at http://localhost:3000/');
});
