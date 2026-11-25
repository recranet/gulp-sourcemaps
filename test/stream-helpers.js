'use strict';

var stream = require('node:stream');

function pipe(streams, cb) {
  return stream.pipeline(streams, cb);
}

var from = {
  obj: function(items) {
    return stream.Readable.from(items);
  },
};

// Collects every chunk and hands them to `cb` once the stream ends. An error
// thrown by `cb` fails the pipeline instead of escaping as an uncaught exception.
function concat(cb) {
  var results = [];

  return new stream.Writable({
    objectMode: true,
    write: function(chunk, encoding, next) {
      results.push(chunk);
      next();
    },
    final: function(next) {
      try {
        if (cb) {
          cb(results);
        }
      } catch (err) {
        next(err);
        return;
      }
      next();
    },
  });
}

module.exports = {
  pipe: pipe,
  from: from,
  concat: concat,
};
