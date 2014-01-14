var Readable = require('stream').Readable;
var util = require('util');

function OrderedStreams(options) {
  options = options || {};
  if (Array.isArray(options)) {
    options = {streams: options};
  }
  options.objectMode = true;

  Readable.call(this, options);

  var streams = options.streams || [];
  var self = this;

  if (streams.length === 0) {
    this.push(null); // no streams, close
  } else {
    // initial index in list of glob-streams
    this._currentIndex = 0;
    this._buff = {};
    this._openedStreams = streams.length;
    streams.forEach(function (s, i) {
      s.on('data', function (data) {
        // if data emmitted from stream, which is at current index
        if (i === self._currentIndex) {
          self._currentIndex++;
          self.push(data); // push data downstream
        } else {
          self._buff[i] = data; // or store in buffer for future
        }
      });
      s.on('end', function () {
        // if stream ended without any data and it at current index
        if (i === self._currentIndex) {
          self._currentIndex++; // increment index
        }
        if (!--self._openedStreams) {
          self.push(null); // close OrderedStreams
        }
      })
      s.on('error', function (e) {
        self.emit('error', e); // error event downstream
      })
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
  // if we already have stored data push it
  var data = this._buff[this._currentIndex];
  if (data) {
    this._currentIndex++;
    this.push(data);
  }
}

module.exports = OrderedStreams;
