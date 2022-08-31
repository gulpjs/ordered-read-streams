var Readable = require('streamx').Readable;

function isReadable(stream) {
  if (typeof stream.pipe !== 'function') {
    return false;
  }

  if (!stream.readable) {
    return false;
  }

  if (typeof stream.read !== 'function') {
    return false;
  }

  return true;
}

function OrderedStreams(streams, options) {
  streams = streams || [];

  if (!Array.isArray(streams)) {
    streams = [streams];
  }

  streams = Array.prototype.concat.apply([], streams);

  options = Object.assign({}, options, {
    read: read,
  });

  streams.forEach(function (stream) {
    if (!isReadable(stream)) {
      throw new Error('All input streams must be readable');
    }
  });

  var streamIdx = 0;

  function read(cb) {
    var self = this;

    var activeStream = streams[streamIdx];
    if (!activeStream) {
      self.push(null);
      return cb(null);
    }

    function cleanup() {
      activeStream.off('readable', onRead);
      activeStream.off('error', onError);
      activeStream.off('end', onEnd);
    }

    function onError(err) {
      cleanup();
      cb(err);
    }

    function onEnd() {
      // When a stream ends, we want to increment index of the stream we are reading from
      streamIdx++;
      // Then we want to cleanup handlers on the previously active stream
      cleanup();
      // Finally we recursively call this function to read from the next stream
      read.call(self, cb);
    }

    function onRead(chunk) {
      var drained = true;

      // If the chunk is null, we don't want to cleanup because the
      // `end` event might be emitted afterwards
      if (chunk === null) {
        return;
      }

      while (chunk !== null && drained) {
        drained = self.push(chunk);
        // If our stream is not backpressured, we want to process another chunk
        if (drained) {
          chunk = activeStream.read();
        }
      }

      cleanup();
      cb(null);
    }

    activeStream.once('error', onError);
    activeStream.once('end', onEnd);

    // Try reading the first chunk
    var chunk = activeStream.read();

    // If we backpressured the OrderedReadStream, we'll have a chunk
    // and don't need to wait for a `readable` event
    if (chunk) {
      onRead(chunk);
    } else {
      // If the first chunk is null we want to wait for `readable` to handle both the first
      // access and a backpressured stream
      activeStream.once('readable', function () {
        // Once `readable`, we need to grab the first chunk before passing it to onRead
        var chunk = activeStream.read();
        onRead(chunk);
      });
    }
  }

  return new Readable(options);
}

module.exports = OrderedStreams;
