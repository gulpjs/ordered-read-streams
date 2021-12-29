<p align="center">
  <a href="https://gulpjs.com">
    <img height="257" width="114" src="https://raw.githubusercontent.com/gulpjs/artwork/master/gulp-2x.png">
  </a>
</p>

# ordered-read-streams

[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Build Status][ci-image]][ci-url] [![Coveralls Status][coveralls-image]][coveralls-url]

Combines array of streams into one read stream in strict order.

## Overview

`ordered-read-streams` handles all data/errors from input streams in parallel, but emits data/errors in strict order in which streams are passed to constructor. This is `objectMode = true` stream.

## Usage

```js
var through = require('through2');
var Ordered = require('ordered-read-streams');

var s1 = through.obj(function (data, enc, next) {
  var self = this;
  setTimeout(function () {
    self.push(data);
    next();
  }, 200);
});
var s2 = through.obj(function (data, enc, next) {
  var self = this;
  setTimeout(function () {
    self.push(data);
    next();
  }, 30);
});
var s3 = through.obj(function (data, enc, next) {
  var self = this;
  setTimeout(function () {
    self.push(data);
    next();
  }, 100);
});

var streams = new Ordered([s1, s2, s3]);
streams.on('data', function (data) {
  console.log(data);
});

s1.write('stream 1');
s1.end();

s2.write('stream 2');
s2.end();

s3.write('stream 3');
s3.end();
```

Ouput will be:

```
stream 1
stream 2
stream 3
```

## License

MIT

<!-- prettier-ignore-start -->
[downloads-image]: https://img.shields.io/npm/dm/ordered-read-streams.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/ordered-read-streams
[npm-image]: https://img.shields.io/npm/v/ordered-read-streams.svg?style=flat-square

[ci-url]: https://github.com/gulpjs/ordered-read-streams/actions?query=workflow:dev
[ci-image]: https://img.shields.io/github/workflow/status/gulpjs/ordered-read-streams/dev?style=flat-square

[coveralls-url]: https://coveralls.io/r/gulpjs/ordered-read-streams
[coveralls-image]: https://img.shields.io/coveralls/gulpjs/ordered-read-streams/master.svg?style=flat-square
<!-- prettier-ignore-end -->
