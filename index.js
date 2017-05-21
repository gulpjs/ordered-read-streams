var Readable = require('readable-stream/readable');
var util = require('util');

function isReadable(stream) {
  if (typeof stream.pipe !== 'function') {
    return false;
  }

  if (!stream.readable) {
    return false;
  }

  if (typeof stream._read !== 'function') {
    return false;
  }

  if (!stream._readableState) {
    return false;
  }

  return true;
}

function addStream (streams, stream) {
  if (!isReadable(stream)) {
    throw new Error('All input streams must be readable');
  }

  var self = this;

  stream._buffer = [];

  stream.on('readable', function () {
    var chunk = stream.read();
    while (chunk) {
      if (this === streams[0]) {
        self.push(chunk);
      } else {
        this._buffer.push(chunk);
      }
      chunk = stream.read();
    }
  });

  stream.on('end', function () {
    if (this !== streams[0]) {
      return;
    }

    self.emit('stream:end', this);

    var stream;
    while ((stream = streams[0])) {
      self.emit('stream:start', stream);

      while (stream._buffer.length) {
        self.push(stream._buffer.shift());
      }

      if (!stream._readableState.ended) {
        break;
      }

      self.emit('stream:end', stream);

      streams.shift();
    }

    if (!streams.length) {
      self.push(null);
    }
  });

  stream.on('error', this.emit.bind(this, 'error'));

  streams.push(stream);

  if (stream === streams[0]) {
    self.emit('stream:start', stream);
  }
}

function OrderedStreams (streams, options) {
  if (!(this instanceof(OrderedStreams))) {
    return new OrderedStreams(streams, options);
  }

  streams = streams || [];
  options = options || {};

  options.objectMode = true;

  Readable.call(this, options);

  if (!Array.isArray(streams)) {
    streams = [streams];
  }
  if (!streams.length) {
    return this.push(null);  // no streams, close
  }

  var addStreamBinded = addStream.bind(this, []);

  streams.forEach(function (item) {
    if (Array.isArray(item)) {
      item.forEach(addStreamBinded);
    } else {
      addStreamBinded(item);
    }
  });
}
util.inherits(OrderedStreams, Readable);

OrderedStreams.prototype._read = function () {};

module.exports = OrderedStreams;
