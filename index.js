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
    predestroy: predestroy,
  });

  var readable = new Readable(options);

  var streamIdx = 0;
  var activeStream = streams[streamIdx];

  if (!activeStream) {
    readable.push(null);
  }

  var destroyedIdx = -1;
  var destroyedByError = false;
  var readableClosed = false;

  streams.forEach(function (stream, idx) {
    if (!isReadable(stream)) {
      throw new Error('All input streams must be readable');
    }

    stream.on('data', onData);
    stream.once('error', onError);
    stream.once('end', onEnd);
    stream.once('close', onClose);

    stream.pause();

    function cleanup() {
      stream.off('data', onData);
      stream.off('error', onError);
      stream.off('end', onEnd);
      stream.off('close', onClose);
    }

    function onError(err) {
      destroyedByError = true;
      cleanup();
      readable.destroy(err);
    }

    function onEnd() {
      streamIdx++;
      activeStream = streams[streamIdx];
      cleanup();
      if (!activeStream) {
        readable.push(null);
      } else {
        activeStream.resume();
      }
    }

    function onClose() {
      destroyedIdx = idx;
      readableClosed = true;
      cleanup();
      readable.destroy();
    }
  });

  function predestroy() {
    streams.forEach(function (stream, idx) {
      if (destroyedIdx === idx) {
        return;
      }

      if (destroyedByError) {
        return stream.destroy();
      }
      if (readableClosed) {
        return stream.destroy();
      }

      stream.destroy(new Error('Wrapper destroyed'));
    });
  }

  function onData(chunk) {
    var drained = readable.push(chunk);
    // If the stream is not drained, we pause the activeStream
    // The activeStream will be resumed on the next call to `read`
    if (!drained) {
      activeStream.pause();
    }
  }

  function read(cb) {
    activeStream.resume();
    cb();
  }

  return readable;
}

module.exports = OrderedStreams;
