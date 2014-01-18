var Readable = require('stream').Readable;
var util = require('util');

function OrderedStreams(streams, options) {
  streams = streams || [];
  options = options || {};

  if (!Array.isArray(streams)) {
    streams = [streams];
  }

  options.objectMode = true;

  Readable.call(this, options);

  var self = this;

  if (streams.length === 0) {
    this.push(null); // no streams, close
  } else {
    // initial index in list of streams
    this._currentIndex = 0;
    this._buff = {};
    this._totalStreams = streams.length;
    this._openedStreams = streams.length;
    streams.forEach(function (s, i) {
      if (!s.readable) {
        throw new Error('All input streams must be readable');
      }

      if (!self._buff[i]) {
        self._buff[i] = [];
      }

      s.on('data', function (data) {
        if (i === self._currentIndex) {
          // data got from stream, which is at current index
          self.push(data);
        } else {
          self._buff[i].push(data); // store in buffer for future
        }
      });
      s.on('end', function () {
        if (i === self._currentIndex) {
          // stream ended and it at current index
          self._currentIndex++;
        }
        if (!--self._openedStreams) {
          // flush buffered data (if any) before end
          for (var j = 0; j < self._totalStreams; j++) {
            while (self._buff[j].length) {
              self.push(self._buff[j].shift());
            }
          }
          self.push(null);
        }
      });
      s.on('error', function (e) {
        if (i === self._currentIndex) {
          self._currentIndex++;
        }
        self.emit('error', e);
      });
    });
  }
}

util.inherits(OrderedStreams, Readable);

OrderedStreams.prototype._read = function () {};

module.exports = OrderedStreams;
