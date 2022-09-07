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
      activeStream.off('data', onData);
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

    function onData(chunk) {
      var drained = self.push(chunk);
      // If the stream is not drained, we pause the active stream and cleanup our handlers
      // The activeStream will be resumed on the next call to `read`
      if (!drained) {
        activeStream.pause();
        cleanup();
        cb();
      }
    }

    activeStream.once('error', onError);
    activeStream.once('end', onEnd);

    activeStream.on('data', onData);
    activeStream.resume();
  }

  return new Readable(options);
}

module.exports = OrderedStreams;
