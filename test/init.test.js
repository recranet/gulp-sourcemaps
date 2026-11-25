'use strict';

var assert = require('node:assert');
var { describe, it } = require('node:test');
var streamHelpers = require('./stream-helpers');

var from = streamHelpers.from;
var pipe = streamHelpers.pipe;
var concat = streamHelpers.concat;

var sourcemaps = require('..');
var File = require('vinyl');
var helpers = require('./test-helpers');

describe('init', function() {

  it('should pass through when file is null', function(t, done) {
    // end inner conflict
    var file = new File();

    function check(results) {
      var data = results[0];
      assert.ok(data);
      assert.deepStrictEqual(data instanceof File, true);
      assert.ok(!(data.sourceMap));
      assert.deepStrictEqual(data, file);
    }

    pipe([
      from.obj([file]),
      sourcemaps.init(),
      concat(check),
    ], done);
  });

  it('should emit an error if file content is a stream', function(t, done) {
    var file = helpers.makeStreamFile();

    function check(err) {
      assert.ok(err);

      done();
    }

    pipe([
      from.obj([file]),
      sourcemaps.init(),
      concat(),
    ], check);
  });

  it('should add an empty source map', function(t, done) {
    var file = helpers.makeFile();

    function check(results) {
      var data = results[0];
      assert.ok(data);
      assert.deepStrictEqual(data instanceof File, true);
      assert.ok(data.sourceMap);
      assert.deepStrictEqual(String(data.sourceMap.version), '3');
      assert.deepStrictEqual(data.sourceMap.sources[0], 'helloworld.js');
      assert.deepStrictEqual(data.sourceMap.sourcesContent[0], helpers.sourceContent);
      assert.deepStrictEqual(data.sourceMap.names, []);
      assert.deepStrictEqual(data.sourceMap.mappings, '');
    }

    pipe([
      from.obj([file]),
      sourcemaps.init(),
      concat(check),
    ], done);
  });

  it('should add a valid source map if wished', function(t, done) {
    var file = helpers.makeFile();

    function check(results) {
      var data = results[0];
      assert.ok(data);
      assert.deepStrictEqual(data instanceof File, true);
      assert.ok(data.sourceMap);
      assert.deepStrictEqual(String(data.sourceMap.version), '3');
      assert.deepStrictEqual(data.sourceMap.sources[0], 'helloworld.js');
      assert.deepStrictEqual(data.sourceMap.sourcesContent[0], helpers.sourceContent);
      assert.deepStrictEqual(data.sourceMap.names, ['helloWorld', 'console', 'log']);
      assert.deepStrictEqual(data.sourceMap.mappings, 'AAAA,YAAY;;AAEZ,SAASA,UAAU,CAAC,EAAE;IAClBC,OAAO,CAACC,GAAG,CAAC,cAAc,CAAC;AAC/B');
    }

    pipe([
      from.obj([file]),
      sourcemaps.init({ identityMap: true }),
      concat(check),
    ], done);
  });

  it('should add a valid source map for css if wished', function(t, done) {
    var file = helpers.makeFileCSS();

    function check(results) {
      var data = results[0];
      assert.ok(data);
      assert.deepStrictEqual(data instanceof File, true);
      assert.ok(data.sourceMap);
      assert.deepStrictEqual(String(data.sourceMap.version), '3');
      assert.deepStrictEqual(data.sourceMap.sources[0], 'test.css');
      assert.deepStrictEqual(data.sourceMap.sourcesContent[0], helpers.sourceContentCSS);
      assert.deepStrictEqual(data.sourceMap.names, []);
      assert.deepStrictEqual(data.sourceMap.mappings, 'AAAA;EACE,gBAAgB;EAChB,WAAW;AACb');
    }

    pipe([
      from.obj([file]),
      sourcemaps.init({ identityMap: true }),
      concat(check),
    ], done);
  });

  it('init: can replace `identityMap` option with sourcemap.identityMap stream (js file)', function(t, done) {
    var file = helpers.makeFile();

    function check(results) {
      var data = results[0];
      assert.ok(data);
      assert.deepStrictEqual(data instanceof File, true);
      assert.ok(data.sourceMap);
      assert.deepStrictEqual(String(data.sourceMap.version), '3');
      assert.deepStrictEqual(data.sourceMap.sources[0], 'helloworld.js');
      assert.deepStrictEqual(data.sourceMap.sourcesContent[0], helpers.sourceContent);
      assert.deepStrictEqual(data.sourceMap.names, ['helloWorld', 'console', 'log']);
      assert.deepStrictEqual(data.sourceMap.mappings, 'AAAA,YAAY;;AAEZ,SAASA,UAAU,CAAC,EAAE;IAClBC,OAAO,CAACC,GAAG,CAAC,cAAc,CAAC;AAC/B');
    }

    pipe([
      from.obj([file]),
      sourcemaps.init(),
      sourcemaps.identityMap(),
      concat(check),
    ], done);
  });

  it('can replace `identityMap` option with sourcemap.identityMap stream (css file)', function(t, done) {
    var file = helpers.makeFileCSS();

    function check(results) {
      var data = results[0];
      assert.ok(data);
      assert.deepStrictEqual(data instanceof File, true);
      assert.ok(data.sourceMap);
      assert.deepStrictEqual(String(data.sourceMap.version), '3');
      assert.deepStrictEqual(data.sourceMap.sources[0], 'test.css');
      assert.deepStrictEqual(data.sourceMap.sourcesContent[0], helpers.sourceContentCSS);
      assert.deepStrictEqual(data.sourceMap.names, []);
      assert.deepStrictEqual(data.sourceMap.mappings, 'AAAA;EACE,gBAAgB;EAChB,WAAW;AACb');
    }

    pipe([
      from.obj([file]),
      sourcemaps.init(),
      sourcemaps.identityMap(),
      concat(check),
    ], done);
  });

  it('should import an existing inline source map', function(t, done) {
    var file = helpers.makeFileWithInlineSourceMap();

    function check(results) {
      var data = results[0];
      assert.ok(data);
      assert.deepStrictEqual(data instanceof File, true);
      assert.ok(data.sourceMap);
      assert.deepStrictEqual(/sourceMappingURL/.test(data.contents.toString()), false);
      assert.deepStrictEqual(String(data.sourceMap.version), '3');
      assert.deepStrictEqual(data.sourceMap.sources, ['test1.js', 'test2.js']);
      assert.deepStrictEqual(data.sourceMap.sourcesContent, [
        'console.log(\'line 1.1\');\nconsole.log(\'line 1.2\');\n', 'console.log(\'line 2.1\');\nconsole.log(\'line 2.2\');',
      ]);
      assert.deepStrictEqual(data.sourceMap.mappings, 'AAAAA,QAAAC,IAAA,YACAD,QAAAC,IAAA,YCDAD,QAAAC,IAAA,YACAD,QAAAC,IAAA');
    }

    pipe([
      from.obj([file]),
      sourcemaps.init({ loadMaps: true }),
      concat(check),
    ], done);
  });

  it('should load external source map file referenced in comment with the //# syntax', function(t, done) {
    var file = helpers.makeFile();
    file.contents = Buffer.from(helpers.sourceContent + '\n//# sourceMappingURL=helloworld2.js.map');

    function check(results) {
      var data = results[0];
      assert.ok(data.sourceMap);
      assert.deepStrictEqual(String(data.sourceMap.version), '3');
      assert.deepStrictEqual(data.sourceMap.sources, ['helloworld2.js']);
      assert.deepStrictEqual(data.sourceMap.sourcesContent, ['source content from source map']);
      assert.deepStrictEqual(data.sourceMap.mappings, '');
    }

    pipe([
      from.obj([file]),
      sourcemaps.init({ loadMaps: true }),
      concat(check),
    ], done);
  });

  it('css: should load external source map file referenced in comment with the //*# syntax', function(t, done) {
    var file = helpers.makeFileCSS();
    file.contents = Buffer.from(helpers.sourceContentCSS + '\n/*# sourceMappingURL=test.css.map */');

    function check(results) {
      var data = results[0];
      assert.ok(data.sourceMap);
      assert.deepStrictEqual(String(data.sourceMap.version), '3');
      assert.deepStrictEqual(data.sourceMap.sources, ['../test.css']);
      assert.deepStrictEqual(data.sourceMap.sourcesContent, ['body {\n  background: #eee;\n  color: #888;\n}\n\n']);
      assert.deepStrictEqual(data.sourceMap.mappings, '');
    }

    pipe([
      from.obj([file]),
      sourcemaps.init({ loadMaps: true }),
      concat(check),
    ], done);
  });

  it('should remove source map comment with the //# syntax', function(t, done) {
    var file = helpers.makeFile();
    file.contents = Buffer.from(helpers.sourceContent + '\n//# sourceMappingURL=helloworld2.js.map');

    function check(results) {
      var data = results[0];
      assert.deepStrictEqual(/sourceMappingURL/.test(data.contents.toString()), false);
    }

    pipe([
      from.obj([file]),
      sourcemaps.init({ loadMaps: true }),
      concat(check),
    ], done);
  });

  it('init: css: should remove source map comment with the //*# syntax', function(t, done) {
    var file = helpers.makeFileCSS();
    file.contents = Buffer.from(helpers.sourceContentCSS + '\n/*# sourceMappingURL=test.css.map */');

    function check(results) {
      var data = results[0];
      var actualContents = data.contents.toString();
      assert.deepStrictEqual(/sourceMappingURL/.test(actualContents), false);
    }

    pipe([
      from.obj([file]),
      sourcemaps.init({ loadMaps: true }),
      concat(check),
    ], done);
  });

  it('should load external source map file referenced in comment with the /*# */ syntax', function(t, done) {
    var file = helpers.makeFile();
    file.contents = Buffer.from(helpers.sourceContent + '\n/*# sourceMappingURL=helloworld2.js.map */');

    function check(results) {
      var data = results[0];
      assert.ok(data.sourceMap);
      assert.deepStrictEqual(String(data.sourceMap.version), '3');
      assert.deepStrictEqual(data.sourceMap.sources, ['helloworld2.js']);
      assert.deepStrictEqual(data.sourceMap.sourcesContent, ['source content from source map']);
      assert.deepStrictEqual(data.sourceMap.mappings, '');
    }

    pipe([
      from.obj([file]),
      sourcemaps.init({ loadMaps: true }),
      concat(check),
    ], done);
  });

  it('should remove source map comment with the //# syntax', function(t, done) {
    var file = helpers.makeFile();
    file.contents = Buffer.from(helpers.sourceContent + '\n/*# sourceMappingURL=helloworld2.js.map */');

    function check(results) {
      var data = results[0];
      assert.deepStrictEqual(/sourceMappingURL/.test(data.contents.toString()), false);
    }

    pipe([
      from.obj([file]),
      sourcemaps.init({ loadMaps: true }),
      concat(check),
    ], done);
  });

  it('should load external source map if no source mapping comment', function(t, done) {
    var file = helpers.makeFile();
    file.path = file.path.replace('helloworld.js', 'helloworld2.js');

    function check(results) {
      var data = results[0];
      assert.ok(data.sourceMap);
      assert.deepStrictEqual(String(data.sourceMap.version), '3');
      assert.deepStrictEqual(data.sourceMap.sources, ['helloworld2.js']);
      assert.deepStrictEqual(data.sourceMap.sourcesContent, ['source content from source map']);
      assert.deepStrictEqual(data.sourceMap.mappings, '');
    }

    pipe([
      from.obj([file]),
      sourcemaps.init({ loadMaps: true }),
      concat(check),
    ], done);
  });

  it('should load external source map and add sourceContent if missing', function(t, done) {
    var file = helpers.makeFile();
    file.contents = Buffer.from(helpers.sourceContent + '\n//# sourceMappingURL=helloworld3.js.map');

    function check(results) {
      var data = results[0];
      assert.ok(data.sourceMap);
      assert.deepStrictEqual(String(data.sourceMap.version), '3');
      assert.deepStrictEqual(data.sourceMap.sources, ['helloworld.js', 'test1.js']);
      assert.deepStrictEqual(data.sourceMap.sourcesContent, [file.contents.toString(), 'test1\n']);
      assert.deepStrictEqual(data.sourceMap.mappings, '');
    }

    pipe([
      from.obj([file]),
      sourcemaps.init({ loadMaps: true }),
      concat(check),
    ], done);
  });

  it('should not throw when source file for sourceContent not found', function(t, done) {
    var file = helpers.makeFile();
    file.contents = Buffer.from(helpers.sourceContent + '\n//# sourceMappingURL=helloworld4.js.map');

    function check(results) {
      var data = results[0];
      assert.ok(data.sourceMap);
      assert.deepStrictEqual(String(data.sourceMap.version), '3');
      assert.deepStrictEqual(data.sourceMap.sources, ['helloworld.js', 'missingfile']);
      assert.deepStrictEqual(data.sourceMap.sourcesContent, [file.contents.toString(), null]);
      assert.deepStrictEqual(data.sourceMap.mappings, '');
    }

    pipe([
      from.obj([file]),
      sourcemaps.init({ loadMaps: true }),
      concat(check),
    ], done);
  });

  // vinyl 2.X breaks this spec, not exactly sure why but it is due to the following commit
  // https://github.com/gulpjs/vinyl/commit/ece4abf212c83aa3e2613c57a4a0fe96171d5755
  it('should use unix style paths in sourcemap', function(t, done) {
    var file = helpers.makeFile();
    file.base = file.cwd;

    function check(results) {
      var data = results[0];
      assert.deepStrictEqual(data.sourceMap.file, 'assets/helloworld.js');
      assert.deepStrictEqual(data.sourceMap.sources, ['assets/helloworld.js']);
    }

    pipe([
      from.obj([file]),
      sourcemaps.init(),
      concat(check),
    ], done);
  });

  it('should use sourceRoot when resolving path to sources', function(t, done) {
    var file = helpers.makeFile();
    file.contents = Buffer.from(helpers.sourceContent + '\n//# sourceMappingURL=helloworld5.js.map');

    function check(results) {
      var data = results[0];
      assert.ok(data.sourceMap);
      assert.deepStrictEqual(String(data.sourceMap.version), '3');
      assert.deepStrictEqual(data.sourceMap.sources, ['../helloworld.js', '../test1.js']);
      assert.deepStrictEqual(data.sourceMap.sourcesContent, [file.contents.toString(), 'test1\n']);
      assert.deepStrictEqual(data.sourceMap.mappings, '');
      assert.deepStrictEqual(data.sourceMap.sourceRoot, 'test');
    }

    pipe([
      from.obj([file]),
      sourcemaps.init({ loadMaps: true }),
      concat(check),
    ], done);
  });

  it('should not load source content if the path is a url', function(t, done) {
    var file = helpers.makeFile();
    file.contents = Buffer.from(helpers.sourceContent + '\n//# sourceMappingURL=helloworld6.js.map');

    function check(results) {
      var data = results[0];
      assert.ok(data.sourceMap);
      assert.deepStrictEqual(String(data.sourceMap.version), '3');
      assert.deepStrictEqual(data.sourceMap.sources, ['helloworld.js', 'http://example2.com/test1.js']);
      assert.deepStrictEqual(data.sourceMap.sourcesContent, [null, null]);
      assert.deepStrictEqual(data.sourceMap.mappings, '');
    }

    pipe([
      from.obj([file]),
      sourcemaps.init({ loadMaps: true }),
      concat(check),
    ], done);
  });

  it('should pass through when file already has a source map', function(t, done) {
    var sourceMap = {
      version: 3,
      names: [],
      mappings: '',
      sources: ['test.js'],
      sourcesContent: ['testContent'],
    };

    var file = helpers.makeFile();
    file.sourceMap = sourceMap;

    function check(results) {
      var data = results[0];
      assert.ok(data);
      assert.deepStrictEqual(data instanceof File, true);
      assert.strictEqual(data.sourceMap, sourceMap);
      assert.strictEqual(data, file);
    }

    pipe([
      from.obj([file]),
      sourcemaps.init({ loadMaps: true }),
      concat(check),
    ], done);
  });

  it('handle null contents', function(t, done) {
    var file = helpers.makeNullFile();

    function check(results) {
      var data = results[0];
      assert.ok(data);
      assert.deepStrictEqual(data instanceof File, true);
      assert.ok(data.sourceMap);
      assert.deepStrictEqual(String(data.sourceMap.version), '3');
      assert.deepStrictEqual(data.sourceMap.sources[0], 'helloworld.js');
      assert.deepStrictEqual(data.sourceMap.sourcesContent[0], null);
      assert.deepStrictEqual(data.sourceMap.names, []);
      assert.deepStrictEqual(data.sourceMap.mappings, '');
    }

    pipe([
      from.obj([file]),
      sourcemaps.init({ addComment: true }),
      concat(check),
    ], done);
  });

});
