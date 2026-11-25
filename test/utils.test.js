'use strict';

var assert = require('node:assert');
var { describe, it } = require('node:test');
var utils = require('../src/utils');

describe('utils', function() {

  it('exceptionToString: takes message if present', function(t, done) {
    var exception = { message: 'exception message' };
    var result = utils.exceptionToString(exception);

    assert.deepStrictEqual(result, 'exception message');
    done();
  });

  it('exceptionToString: returns empty string if message is not present', function(t, done) {
    var exception = { foo: 'bar' };
    var result = utils.exceptionToString(exception);

    assert.deepStrictEqual(result, '');
    done();
  });

  it('getCommentFormatter: gets a commenter with invalid extension', function(t, done) {
    var commenter = utils.getCommentFormatter({
      relative: 'some.junk',
      contents: "var a = 'hello';",
      sourceMap: { preExistingComment: true },
    });

    assert.ok(commenter);
    done();
  });
});
