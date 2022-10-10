var expect = require('expect');

var OrderedStreams = require('..');

function suite(moduleName) {
  var stream = require(moduleName);

  function fromOnce(fn) {
    var called = false;
    return new stream.Readable({
      objectMode: true,
      read: function (cb) {
        var self = this;
        if (called) {
          this.push(null);
          if (typeof cb === 'function') {
            cb(null);
          }
          return;
        }
        fn(function (err, chunk) {
          called = true;
          if (!err) {
            self.push(chunk);
          }

          if (typeof cb === 'function') {
            cb(err);
          } else {
            if (err) {
              return self.destroy(err);
            }
          }
        });
      },
    });
  }

  function concat(fn, timeout) {
    var items = [];
    return new stream.Writable({
      objectMode: true,
      write: function (chunk, enc, cb) {
        if (typeof enc === 'function') {
          cb = enc;
        }
        setTimeout(function () {
          items.push(chunk);
          cb();
        }, timeout || 1);
      },
      final: function (cb) {
        if (typeof fn === 'function') {
          fn(items);
        }

        cb();
      },
    });
  }

  describe('ordered-read-streams (' + moduleName + ')', function () {
    it('ends if no streams are given', function (done) {
      var streams = new OrderedStreams();

      stream.pipeline([streams, concat()], done);
    });

    it('does not end until it is read if no streams are given', function (done) {
      var streams = new OrderedStreams();

      var ended = false;

      streams.on('end', function () {
        ended = true;
      });
      setTimeout(function () {
        expect(ended).toEqual(false);

        stream.pipeline([streams, concat()], function (err) {
          expect(ended).toEqual(true);
          done(err);
        });
      }, 250);
    });

    it('throws an error if stream is not readable', function (done) {
      var writable = new stream.Writable({ write: function () {} });

      function withWritable() {
        new OrderedStreams(writable);
      }

      expect(withWritable).toThrow('All input streams must be readable');

      done();
    });

    it('throws an error if stream does not have a _read function', function (done) {
      function FakeReadable() {
        this.readable = true;
        this.pipe = function () {};
      }

      function withoutRead() {
        new OrderedStreams(new FakeReadable());
      }

      expect(withoutRead).toThrow('All input streams must be readable');

      done();
    });

    it('emits data from all streams', function (done) {
      var s1 = stream.Readable.from([{ value: 'stream 1' }]);
      var s2 = stream.Readable.from([{ value: 'stream 2' }]);
      var s3 = stream.Readable.from([{ value: 'stream 3' }]);

      var streams = new OrderedStreams([s1, s2, s3]);

      function assert(results) {
        expect(results.length).toEqual(3);
        expect(results[0]).toEqual({ value: 'stream 1' });
        expect(results[1]).toEqual({ value: 'stream 2' });
        expect(results[2]).toEqual({ value: 'stream 3' });
      }

      stream.pipeline([streams, concat(assert)], done);
    });

    it('works without new keyword', function (done) {
      var s1 = stream.Readable.from([{ value: 'stream 1' }]);
      var s2 = stream.Readable.from([{ value: 'stream 2' }]);
      var s3 = stream.Readable.from([{ value: 'stream 3' }]);

      var ordered = OrderedStreams;

      var streams = ordered([s1, s2, s3]);

      function assert(results) {
        expect(results.length).toEqual(3);
        expect(results[0]).toEqual({ value: 'stream 1' });
        expect(results[1]).toEqual({ value: 'stream 2' });
        expect(results[2]).toEqual({ value: 'stream 3' });
      }

      stream.pipeline([streams, concat(assert)], done);
    });

    it('flattens arrays of streams 1 levels deep', function (done) {
      var s1 = stream.Readable.from([{ value: 'stream 1' }]);
      var s2 = stream.Readable.from([{ value: 'stream 2' }]);
      var s3 = stream.Readable.from([{ value: 'stream 3' }]);

      var streams = new OrderedStreams([s1, [s2, s3]]);

      function assert(results) {
        expect(results.length).toEqual(3);
        expect(results[0]).toEqual({ value: 'stream 1' });
        expect(results[1]).toEqual({ value: 'stream 2' });
        expect(results[2]).toEqual({ value: 'stream 3' });
      }

      stream.pipeline([streams, concat(assert)], done);
    });

    it('does not allow changing our read function', function (done) {
      var s1 = stream.Readable.from([{ value: 'stream 1' }]);
      var s2 = stream.Readable.from([{ value: 'stream 2' }]);
      var s3 = stream.Readable.from([{ value: 'stream 3' }]);

      var streams = new OrderedStreams([s1, s2, s3], {
        read: function () {
          throw new Error('boom');
        },
      });

      function assert(results) {
        expect(results.length).toEqual(3);
        expect(results[0]).toEqual({ value: 'stream 1' });
        expect(results[1]).toEqual({ value: 'stream 2' });
        expect(results[2]).toEqual({ value: 'stream 3' });
      }

      stream.pipeline([streams, concat(assert)], done);
    });

    it('emits all data event from each stream', function (done) {
      var s = stream.Readable.from([
        { value: 'data1' },
        { value: 'data2' },
        { value: 'data3' },
      ]);

      var streams = new OrderedStreams(s);

      function assert(results) {
        expect(results.length).toEqual(3);
      }

      stream.pipeline([streams, concat(assert)], done);
    });

    it('respects highWaterMark', function (done) {
      this.timeout(5000);

      var s1 = stream.Readable.from(
        [{ value: 'data1' }, { value: 'data2' }, { value: 'data3' }],
        { highWaterMark: 1 }
      );
      var s2 = stream.Readable.from(
        [{ value: 'data4' }, { value: 'data5' }, { value: 'data6' }],
        { highWaterMark: 1 }
      );
      var s3 = stream.Readable.from(
        [{ value: 'data7' }, { value: 'data8' }, { value: 'data9' }],
        { highWaterMark: 1 }
      );

      var streams = new OrderedStreams([s1, s2, s3]);

      function assert(results) {
        expect(results.length).toEqual(9);
      }

      stream.pipeline([streams, concat(assert, 250)], done);
    });

    it('can set highWaterMark on self', function (done) {
      this.timeout(5000);

      var s1 = stream.Readable.from([
        { value: 'data1' },
        { value: 'data2' },
        { value: 'data3' },
      ]);
      var s2 = stream.Readable.from([
        { value: 'data4' },
        { value: 'data5' },
        { value: 'data6' },
      ]);
      var s3 = stream.Readable.from([
        { value: 'data7' },
        { value: 'data8' },
        { value: 'data9' },
      ]);

      var highWaterMark = moduleName === 'streamx' ? 1024 : 1;

      var streams = new OrderedStreams([s1, s2, s3], {
        highWaterMark: highWaterMark,
      });

      function assert(results) {
        expect(results.length).toEqual(9);
      }

      stream.pipeline([streams, concat(assert, 250)], done);
    });

    it('preserves streams order', function (done) {
      var s1 = fromOnce(function (next) {
        setTimeout(function () {
          next(null, { value: 'stream 1' });
        }, 200);
      });
      var s2 = fromOnce(function (next) {
        setTimeout(function () {
          next(null, { value: 'stream 2' });
        }, 30);
      });
      var s3 = fromOnce(function (next) {
        setTimeout(function () {
          next(null, { value: 'stream 3' });
        }, 100);
      });

      var streams = new OrderedStreams([s1, s2, s3]);

      function assert(results) {
        expect(results.length).toEqual(3);
        expect(results[0]).toEqual({ value: 'stream 1' });
        expect(results[1]).toEqual({ value: 'stream 2' });
        expect(results[2]).toEqual({ value: 'stream 3' });
      }

      stream.pipeline([streams, concat(assert)], done);
    });

    it('emits stream errors downstream', function (done) {
      var s = fromOnce(function (next) {
        setTimeout(function () {
          next(new Error('stahp!'));
        }, 500);
      });
      var s2 = stream.Readable.from([{ value: 'Im ok!' }]);

      var streams = new OrderedStreams([s, s2]);

      function assert(err) {
        expect(err.message).toEqual('stahp!');
        done();
      }

      stream.pipeline([streams, concat()], assert);
    });

    it('emits received data before a stream errors downstream', function (done) {
      var s = fromOnce(function (next) {
        setTimeout(function () {
          next(new Error('stahp!'));
        }, 500);
      });
      var s2 = stream.Readable.from([{ value: 'Im ok!' }]);

      // Invert the order to emit data first
      var streams = new OrderedStreams([s2, s]);

      function assertData(chunk, enc, next) {
        if (typeof enc === 'function') {
          next = enc;
        }
        expect(chunk).toEqual({ value: 'Im ok!' });
        next();
      }

      function assertErr(err) {
        expect(err.message).toEqual('stahp!');
        done();
      }

      stream.pipeline(
        [streams, new stream.Writable({ objectMode: true, write: assertData })],
        assertErr
      );
    });

    it('destroys all readable streams if the wrapper is destroyed', function (done) {
      var s1 = stream.Readable.from([{ value: 'stream 1' }]);
      var s2 = stream.Readable.from([{ value: 'stream 2' }]);
      var s3 = stream.Readable.from([{ value: 'stream 3' }]);

      var streams = new OrderedStreams([s1, s2, s3]);

      var errors = [];

      s1.on('error', function (err) {
        errors.push(err);
        assertErr();
      });
      s2.on('error', function (err) {
        errors.push(err);
        assertErr();
      });
      s3.on('error', function (err) {
        errors.push(err);
        assertErr();
      });

      function assertErr() {
        if (errors.length === 3) {
          expect(errors[0].message).toEqual('Wrapper destroyed');
          expect(errors[1].message).toEqual('Wrapper destroyed');
          expect(errors[2].message).toEqual('Wrapper destroyed');
          done();
        }
      }

      streams.destroy();
    });

    it('destroys the wrapper and other streams if any readable stream is destroyed', function (done) {
      var s1 = stream.Readable.from([{ value: 'stream 1' }]);
      var s2 = stream.Readable.from([{ value: 'stream 2' }]);
      var s3 = stream.Readable.from([{ value: 'stream 3' }]);

      var streams = new OrderedStreams([s1, s2, s3]);

      var closed = [];

      s1.on('close', function () {
        closed.push('s1');
        assert();
      });
      s2.on('close', function () {
        closed.push('s2');
        assert();
      });
      s3.on('close', function () {
        closed.push('s3');
        assert();
      });
      streams.on('close', function () {
        closed.push('wrapper');
        assert();
      });

      function assert() {
        if (closed.length === 4) {
          expect(closed).toContain('s2');
          expect(closed).toContain('wrapper');
          expect(closed).toContain('s1');
          expect(closed).toContain('s3');

          done();
        }
      }

      s2.destroy();
    });

    describe('addSource', function () {
      it('can add a stream to an empty readable before reading', function (done) {
        var streams = new OrderedStreams();

        streams.addSource(
          stream.Readable.from([
            { value: 'data1' },
            { value: 'data2' },
            { value: 'data3' },
          ])
        );

        function assert(results) {
          expect(results.length).toEqual(3);
        }

        stream.pipeline([streams, concat(assert)], done);
      });

      it('can add a stream at the end of the readable', function (done) {
        var s = stream.Readable.from([
          { value: 'data1' },
          { value: 'data2' },
          { value: 'data3' },
        ]);

        var streams = new OrderedStreams(s);

        streams.addSource(
          stream.Readable.from([
            { value: 'data4' },
            { value: 'data5' },
            { value: 'data6' },
          ])
        );

        function assert(results) {
          expect(results.length).toEqual(6);
          expect(results[0]).toEqual({ value: 'data1' });
          expect(results[1]).toEqual({ value: 'data2' });
          expect(results[2]).toEqual({ value: 'data3' });
          expect(results[3]).toEqual({ value: 'data4' });
          expect(results[4]).toEqual({ value: 'data5' });
          expect(results[5]).toEqual({ value: 'data6' });
        }

        stream.pipeline([streams, concat(assert)], done);
      });

      it('can add a stream while the readable is already flowing', function (done) {
        var data = [
          { value: 'data1' },
          { value: 'data2' },
          { value: 'data3' },
          { value: 'data4' },
          { value: 'data5' },
          { value: 'data6' },
        ];
        var s = new stream.Readable({
          objectMode: true,
          read: function (cb) {
            if (data.length > 1) {
              this.push(data.shift());
            } else {
              streams.addSource(stream.Readable.from(data));
              this.push(null);
            }
            if (typeof cb === 'function') {
              cb(null);
            }
          },
        });

        var streams = new OrderedStreams(s);

        function assert(results) {
          expect(results.length).toEqual(6);
          expect(results[0]).toEqual({ value: 'data1' });
          expect(results[1]).toEqual({ value: 'data2' });
          expect(results[2]).toEqual({ value: 'data3' });
          expect(results[3]).toEqual({ value: 'data4' });
          expect(results[4]).toEqual({ value: 'data5' });
          expect(results[5]).toEqual({ value: 'data6' });
        }

        stream.pipeline([streams, concat(assert)], done);
      });

      it('throws an error if stream is not readable', function (done) {
        var streams = new OrderedStreams();

        function withWritable() {
          var writable = new stream.Writable({ write: function () {} });
          streams.addSource(writable);
        }

        expect(withWritable).toThrow('All input streams must be readable');

        done();
      });
    });
  });
}

suite('stream');
suite('streamx');
suite('readable-stream');
