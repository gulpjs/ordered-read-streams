var Readable = require('stream').Readable;
var util = require('util');

function OrderedStreams(options) {
  options = options || [];
  if (Array.isArray(options)) {
    options = {streams: options};
  } else {
    options = {streams: [options]};
  }
  options.objectMode = true;

  Readable.call(this, options);

  var streams = options.streams || [];
  var self = this;

  if (streams.length === 0) {
    this.push(null); // no streams, close
  } else {
    // initial index in list of streams
    this._currentIndex = 0;
    this._buff = {};
    this._openedStreams = streams.length;
    streams.forEach(function (s, i) {
      if (!s.readable) {
        throw new Error('All input streams must be readable');
      }

      s.on('data', function (data) {
        if (i === self._currentIndex) {
          // data got from stream, which is at current index
          self._currentIndex++;
          self.push(data);
        } else {
          self._buff[i] = data; // store in buffer for future
        }
      });
      s.on('end', function () {
        if (i === self._currentIndex) {
          // stream ended without any data and it at current index
          self._currentIndex++;
        }
        if (!--self._openedStreams) {
          self.push(null); // close
        }
      });
      s.on('error', function (e) {
        if (i === self._currentIndex) {
          self._currentIndex++;
        }
        self.emit('error', e);
      });
    });

    this.on('finish', function() {
      streams.forEach(function (s) {
        s.end();
      });
    });
  }
}

util.inherits(OrderedStreams, Readable);

OrderedStreams.prototype._read = function () {
  var data = this._buff[this._currentIndex];
  if (data) {
    // if we already have stored data - push it
    this._currentIndex++;
    this.push(data);
  }
};

module.exports = OrderedStreams;
