var expect = require('expect');

var miss = require('mississippi');

var OrderedStreams = require('..');

var to = miss.to;
var from = miss.from;
var pipe = miss.pipe;
var concat = miss.concat;

function fromOnce(fn) {
  var called = false;
  return from.obj(function(size, next) {
    if (called) {
      return next(null, null);
    }
    called = true;
    fn.apply(this, arguments);
  });
}

describe('ordered-read-streams', function () {

  it('ends if no streams are given', function (done) {
    var streams = new OrderedStreams();

    pipe([
      streams,
      concat()
    ], done);
  });

  it('throws an error if stream is not readable', function (done) {
    var writable = to();

    function withWritable() {
      new OrderedStreams(writable);
    }

    expect(withWritable).toThrow('All input streams must be readable');

    done();
  });

  it('emits data from all streams', function(done) {
    var s1 = from.obj([{value: 'stream 1'}]);
    var s2 = from.obj([{value: 'stream 2'}]);
    var s3 = from.obj([{value: 'stream 3'}]);

    var streams = new OrderedStreams([s1, s2, s3]);

    function assert(results) {
      expect(results.length).toEqual(3);
      expect(results[0]).toEqual({value: 'stream 1'});
      expect(results[1]).toEqual({value: 'stream 2'});
      expect(results[2]).toEqual({value: 'stream 3'});
    }

    pipe([
      streams,
      concat(assert)
    ], done);
  });

  it('emits all data event from each stream', function (done) {
    var s = from.obj([
      {value: 'data1'},
      {value: 'data2'},
      {value: 'data3'}
    ]);

    var streams = new OrderedStreams(s);

    function assert(results) {
      expect(results.length).toEqual(3);
    }

    pipe([
      streams,
      concat(assert)
    ], done);
  });

  it('preserves streams order', function(done) {
    var s1 = fromOnce(function (size, next) {
      setTimeout(function () {
        next(null, {value: 'stream 1'});
      }, 200);
    });
    var s2 = fromOnce(function (size, next) {
      setTimeout(function () {
        next(null, {value: 'stream 2'});
      }, 30);
    });
    var s3 = fromOnce(function (size, next) {
      setTimeout(function () {
        next(null, {value: 'stream 3'});
      }, 100);
    });

    var streams = new OrderedStreams([s1, s2, s3]);

    function assert(results) {
      expect(results.length).toEqual(3);
      expect(results[0]).toEqual({value: 'stream 1'});
      expect(results[1]).toEqual({value: 'stream 2'});
      expect(results[2]).toEqual({value: 'stream 3'});
    }

    pipe([
      streams,
      concat(assert)
    ], done);
  });

  it('emits stream errors downstream', function (done) {
    var s = fromOnce(function(size, next) {
      setTimeout(function () {
        next(new Error('stahp!'));
      }, 500);
    });
    var s2 = from.obj([{value: 'Im ok!'}]);

    var streams = new OrderedStreams([s, s2]);

    function assert(err) {
      expect(err.message).toEqual('stahp!');
      done();
    }

    pipe([
      streams,
      concat()
    ], assert);
  });

  it('emits received data before a stream errors downstream', function (done) {
    var s = fromOnce(function(size, next) {
      setTimeout(function () {
        next(new Error('stahp!'));
      }, 500);
    });
    var s2 = from.obj([{value: 'Im ok!'}]);

    // Invert the order to emit data first
    var streams = new OrderedStreams([s2, s]);

    function assertData(chunk, enc, next) {
      expect(chunk).toEqual({value: 'Im ok!'});
      next();
    }

    function assertErr(err) {
      expect(err.message).toEqual('stahp!');
      done();
    }

    pipe([
      streams,
      to.obj(assertData)
    ], assertErr);
  });
});
