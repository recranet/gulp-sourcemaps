'use strict';

var assert = require('node:assert');
var { describe, it } = require('node:test');
var sourcemaps = require('..');
var File = require('vinyl');
var ReadableStream = require('stream').Readable;
var path = require('path');
var fs = require('fs');
var streamHelpers = require('./stream-helpers');

var from = streamHelpers.from;
var pipe = streamHelpers.pipe;
var concat = streamHelpers.concat;

var utils = require('../src/utils');
var convert = require('convert-source-map');

var sourceContent = fs.readFileSync(path.join(__dirname, 'assets/helloworld.js')).toString();
var mappedContent = fs.readFileSync(path.join(__dirname, 'assets/helloworld.map.js')).toString();

function makeSourceMap(custom) {
  var obj = {
    version: 3,
    file: 'helloworld.js',
    names: [],
    mappings: '',
    sources: ['helloworld.js'],
    sourcesContent: [sourceContent],
  };

  if (custom) {
    Object.assign(obj, custom);
  }

  return obj;
}

function base64JSON(object) {
  return 'data:application/json;charset=utf8;base64,' + Buffer.from(JSON.stringify(object)).toString('base64');
}

function makeFile(custom) {
  var file = new File({
    cwd: __dirname,
    base: path.join(__dirname, 'assets'),
    path: path.join(__dirname, 'assets', 'helloworld.js'),
    contents: Buffer.from(sourceContent),
  });
  file.sourceMap = makeSourceMap(custom);
  return file;
}

function makeMappedFile() {
  var file = new File({
    cwd: __dirname,
    base: path.join(__dirname, 'assets'),
    path: path.join(__dirname, 'assets', 'helloworld.map.js'),
    contents: Buffer.from(mappedContent),
  });
  file.sourceMap = makeSourceMap({ preExistingComment: utils.getInlinePreExisting(mappedContent) });
  return file;
}

function makeNestedFile() {
  var file = new File({
    cwd: __dirname,
    base: path.join(__dirname, 'assets'),
    path: path.join(__dirname, 'assets', 'dir1', 'dir2', 'helloworld.js'),
    contents: Buffer.from(sourceContent),
  });
  file.sourceMap = makeSourceMap();
  return file;
}

function makeStreamFile() {
  var file = new File({
    cwd: __dirname,
    base: path.join(__dirname, 'assets'),
    path: path.join(__dirname, 'assets', 'helloworld.js'),
    contents: new ReadableStream(),
  });
  file.sourceMap = {};
  return file;
}

describe('write', function() {

  it('should pass through when file is null', function(t, done) {
    var file = new File();

    function check(results) {
      var data = results[0];
      assert.ok(data);
      assert.deepStrictEqual(data instanceof File, true);
      assert.strictEqual(data, file);
      assert.deepStrictEqual(data.contents, null);
    }

    pipe([
      from.obj([file]),
      sourcemaps.write(),
      concat(check),
    ], done);
  });

  it('should pass through when file has no source map', function(t, done) {
    var file = makeFile();
    delete file.sourceMap;

    function check(results) {
      var data = results[0];
      assert.ok(data);
      assert.deepStrictEqual(data instanceof File, true);
      assert.strictEqual(data, file);
      assert.deepStrictEqual(data.contents.toString(), sourceContent);
    }

    pipe([
      from.obj([file]),
      sourcemaps.write(),
      concat(check),
    ], done);
  });

  it('should emit an error if file content is a stream', function(t, done) {
    var file = makeStreamFile();

    pipe([
      from.obj([file]),
      sourcemaps.write(),
      concat(),
    ], function(err) {
      assert.ok(err);
      done();
    });
  });

  it('should write an inline source map', function(t, done) {
    var file = makeFile();

    function check(results) {
      var data = results[0];
      assert.ok(data);
      assert.deepStrictEqual(data instanceof File, true);
      assert.strictEqual(data, file);
      assert.deepStrictEqual(data.contents.toString(), sourceContent + '\n//# sourceMappingURL=' + base64JSON(data.sourceMap) + '\n');
    }

    pipe([
      from.obj([file]),
      sourcemaps.write(),
      concat(check),
    ], done);
  });

  it('should use CSS comments if CSS file', function(t, done) {
    var file = makeFile();
    file.path = file.path.replace('.js', '.css');

    function check(results) {
      var data = results[0];
      assert.deepStrictEqual(data.contents.toString(), sourceContent + '\n/*# sourceMappingURL=' + base64JSON(data.sourceMap) + ' */\n');
    }

    pipe([
      from.obj([file]),
      sourcemaps.write(),
      concat(check),
    ], done);
  });

  it('should write no comment if not JS or CSS file', function(t, done) {
    var file = makeFile();
    file.path = file.path.replace('.js', '.txt');

    function check(results) {
      var data = results[0];
      assert.deepStrictEqual(data.contents.toString(), sourceContent);
    }

    pipe([
      from.obj([file]),
      sourcemaps.write(),
      concat(check),
    ], done);
  });

  it('should detect whether a file uses \\n or \\r\\n and follow the existing style', function(t, done) {
    var file = makeFile();
    file.contents = Buffer.from(file.contents.toString().replace(/\n/g, '\r\n'));

    function check(results) {
      var data = results[0];
      assert.deepStrictEqual(data.contents.toString(), sourceContent.replace(/\n/g, '\r\n') + '\r\n//# sourceMappingURL=' + base64JSON(data.sourceMap) + '\r\n');
    }

    pipe([
      from.obj([file]),
      sourcemaps.write(),
      concat(check),
    ], done);
  });

  it('preExistingComment', function(t, done) {
    var file = makeMappedFile();
    file.contents = Buffer.from(convert.removeComments(file.contents.toString()));

    function check(results) {
      var data = results[0];
      assert.ok(data);
      assert.ok(data.sourceMap.preExistingComment);
      assert.deepStrictEqual(data.contents.toString(), sourceContent + '\n//# sourceMappingURL=' + base64JSON(data.sourceMap) + '\n');
    }

    pipe([
      from.obj([file]),
      sourcemaps.write({ preExistingComment: true }),
      concat(check),
    ], done);
  });

  it('should write external map files', function(t, done) {
    var file = makeFile();

    function check(results) {
      var dataFile = results[1];
      assert.deepStrictEqual(dataFile.path, path.join(__dirname, 'assets/helloworld.js'));
      assert.deepStrictEqual(dataFile instanceof File, true);
      assert.strictEqual(dataFile, file);
      assert.deepStrictEqual(dataFile.contents.toString(), sourceContent + '\n//# sourceMappingURL=../maps/helloworld.js.map\n');
      assert.deepStrictEqual(dataFile.sourceMap.file, '../dist/helloworld.js');

      var mapFile = results[0];
      assert.deepStrictEqual(mapFile instanceof File, true);
      assert.deepStrictEqual(mapFile.path, path.join(__dirname, 'maps/helloworld.js.map'));
      assert.deepStrictEqual(JSON.parse(mapFile.contents), dataFile.sourceMap);
      assert.deepStrictEqual(mapFile.stat.isFile(), true);
      assert.deepStrictEqual(mapFile.stat.isDirectory(), false);
      assert.deepStrictEqual(mapFile.stat.isBlockDevice(), false);
      assert.deepStrictEqual(mapFile.stat.isCharacterDevice(), false);
      assert.deepStrictEqual(mapFile.stat.isSymbolicLink(), false);
      assert.deepStrictEqual(mapFile.stat.isFIFO(), false);
      assert.deepStrictEqual(mapFile.stat.isSocket(), false);
    }

    pipe([
      from.obj([file]),
      sourcemaps.write('../maps', { destPath: 'dist' }),
      concat(check),
    ], done);
  });

  it('clone - should keep original file history', function(t, done) {
    var file = makeFile();

    function check(results) {
      var data = results[0];
      assert.deepStrictEqual(data.path, path.join(__dirname, 'maps/helloworld.js.map'));
      assert.deepStrictEqual(data.history[0], path.join(__dirname, 'assets/helloworld.js'));
    }

    pipe([
      from.obj([file]),
      sourcemaps.write('../maps', { destPath: 'dist' }),
      concat(check),
    ], done);
  });

  it('should allow to rename map file', function(t, done) {
    var file = makeFile();

    function check(results) {
      var dataFile = results[1];
      assert.deepStrictEqual(dataFile.path, path.join(__dirname, 'assets/helloworld.js'));
      assert.deepStrictEqual(dataFile instanceof File, true);
      assert.strictEqual(dataFile, file);
      assert.deepStrictEqual(dataFile.contents.toString(), sourceContent + '\n//# sourceMappingURL=../maps/helloworld.map\n');
      assert.deepStrictEqual(dataFile.sourceMap.file, '../dist/helloworld.js');

      var mapFile = results[0];
      assert.deepStrictEqual(mapFile instanceof File, true);
      assert.deepStrictEqual(mapFile.path, path.join(__dirname, 'maps/helloworld.map'));
      assert.deepStrictEqual(JSON.parse(mapFile.contents), dataFile.sourceMap);
    }

    pipe([
      from.obj([file]),
      sourcemaps.write('../maps', {
        mapFile: function(mapFile) {
          return mapFile.replace('.js.map', '.map');
        },
        destPath: 'dist',
      }),
      concat(check),
    ], done);
  });

  it('should create shortest path to map in file comment', function(t, done) {
    var file = makeNestedFile();

    function check(results) {
      var data = results[1];
      assert.deepStrictEqual(data.path, path.join(__dirname, 'assets/dir1/dir2/helloworld.js'));
      assert.deepStrictEqual(data.contents.toString(), sourceContent + '\n//# sourceMappingURL=../maps/dir1/dir2/helloworld.js.map\n');
    }

    pipe([
      from.obj([file]),
      sourcemaps.write('dir1/maps'),
      concat(check),
    ], done);
  });

  it('should write no comment with option addComment=false', function(t, done) {
    var file = makeFile();

    function check(results) {
      var data = results[0];
      assert.deepStrictEqual(data.contents.toString(), sourceContent);
    }

    pipe([
      from.obj([file]),
      sourcemaps.write({ addComment: false }),
      concat(check),
    ], done);
  });

  it('should not include source content with option includeContent=false', function(t, done) {
    var file = makeFile();

    function check(results) {
      var data = results[0];
      assert.deepStrictEqual(data.sourceMap.sourcesContent, undefined);
    }

    pipe([
      from.obj([file]),
      sourcemaps.write({ includeContent: false }),
      concat(check),
    ], done);
  });

  it('should fetch missing sourceContent', function(t, done) {
    var file = makeFile();
    delete file.sourceMap.sourcesContent;

    function check(results) {
      var data = results[0];
      assert.ok(data.sourceMap.sourcesContent);
      assert.deepStrictEqual(data.sourceMap.sourcesContent, [sourceContent]);
    }

    pipe([
      from.obj([file]),
      sourcemaps.write(),
      concat(check),
    ], done);
  });

  it('should not throw when unable to fetch missing sourceContent', function(t, done) {
    var file = makeFile();
    file.sourceMap.sources[0] += '.invalid';
    delete file.sourceMap.sourcesContent;

    function check(results) {
      var data = results[0];
      assert.ok(data.sourceMap.sourcesContent);
      assert.deepStrictEqual(data.sourceMap.sourcesContent, []);
    }

    pipe([
      from.obj([file]),
      sourcemaps.write(),
      concat(check),
    ], done);
  });

  it('should set the sourceRoot by option sourceRoot', function(t, done) {
    var file = makeFile();

    function check(results) {
      var data = results[0];
      assert.deepStrictEqual(data.sourceMap.sources, ['helloworld.js']);
      assert.deepStrictEqual(data.sourceMap.sourceRoot, '/testSourceRoot');
    }

    pipe([
      from.obj([file]),
      sourcemaps.write({ sourceRoot: '/testSourceRoot' }),
      concat(check),
    ], done);
  });

  it('should set the mapSourcesAbsolute by option mapSourcesAbsolute', function(t, done) {
    var file = makeFile();

    function check(results) {
      var data = results[0];
      assert.deepStrictEqual(data.sourceMap.sources, ['/assets/helloworld.js']);
      assert.deepStrictEqual(data.sourceMap.sourceRoot, '/testSourceRoot');
    }

    pipe([
      from.obj([file]),
      sourcemaps.write({ sourceRoot: '/testSourceRoot', mapSourcesAbsolute: true }),
      concat(check),
    ], done);
  });

  it('should set the sourceRoot by option sourceRoot, as a function', function(t, done) {
    var file = makeFile();

    function check(results) {
      var data = results[0];
      assert.deepStrictEqual(data.sourceMap.sourceRoot, '/testSourceRoot');
    }

    pipe([
      from.obj([file]),
      sourcemaps.write({
        sourceRoot: function() {
          return '/testSourceRoot';
        },
      }),
      concat(check),
    ], done);
  });

  it('should automatically determine sourceRoot if destPath is set', function(t, done) {
    var file = makeNestedFile();

    function check(results) {
      var dataFile = results[1];
      assert.deepStrictEqual(dataFile.path, path.join(__dirname, 'assets/dir1/dir2/helloworld.js'));
      assert.deepStrictEqual(dataFile.sourceMap.sourceRoot, '../../../assets');
      assert.deepStrictEqual(dataFile.sourceMap.file, 'helloworld.js');
      var mapFile = results[0];
      assert.deepStrictEqual(mapFile.path, path.join(__dirname, 'assets/dir1/dir2/helloworld.js.map'));
    }

    pipe([
      from.obj([file]),
      sourcemaps.write('.', {
        destPath: 'dist',
        includeContent: false,
      }),
      concat(check),
    ], done);
  });

  it('should interpret relative path in sourceRoot as relative to destination', function(t, done) {
    var file = makeNestedFile();

    function check(results) {
      var dataFile = results[1];
      assert.deepStrictEqual(dataFile.path, path.join(__dirname, 'assets/dir1/dir2/helloworld.js'));
      assert.deepStrictEqual(dataFile.sourceMap.sourceRoot, '../../../src');
      assert.deepStrictEqual(dataFile.sourceMap.file, 'helloworld.js');
      var mapFile = results[0];
      assert.deepStrictEqual(mapFile.path, path.join(__dirname, 'assets/dir1/dir2/helloworld.js.map'));
    }

    pipe([
      from.obj([file]),
      sourcemaps.write('.', { sourceRoot: '../src' }),
      concat(check),
    ], done);
  });

  it('should interpret relative path in sourceRoot as relative to destination (part 2)', function(t, done) {
    var file = makeNestedFile();

    function check(results) {
      var dataFile = results[1];
      assert.deepStrictEqual(dataFile.path, path.join(__dirname, 'assets/dir1/dir2/helloworld.js'));
      assert.deepStrictEqual(dataFile.sourceMap.sourceRoot, '../..');
      assert.deepStrictEqual(dataFile.sourceMap.file, 'helloworld.js');
      var mapFile = results[0];
      assert.deepStrictEqual(mapFile.path, path.join(__dirname, 'assets/dir1/dir2/helloworld.js.map'));
    }

    pipe([
      from.obj([file]),
      sourcemaps.write('.', { sourceRoot: '' }),
      concat(check),
    ], done);
  });

  it('should interpret relative path in sourceRoot as relative to destination (part 3)', function(t, done) {
    var file = makeNestedFile();

    function check(results) {
      var dataFile = results[1];
      assert.deepStrictEqual(dataFile.path, path.join(__dirname, 'assets/dir1/dir2/helloworld.js'));
      assert.deepStrictEqual(dataFile.sourceMap.sourceRoot, '../../../../src');
      assert.deepStrictEqual(dataFile.sourceMap.file, '../../../dir1/dir2/helloworld.js');
      var mapFile = results[0];
      assert.deepStrictEqual(mapFile.path, path.join(__dirname, 'assets/maps/dir1/dir2/helloworld.js.map'));
    }

    pipe([
      from.obj([file]),
      sourcemaps.write('maps', { sourceRoot: '../src' }),
      concat(check),
    ], done);
  });

  it('should interpret relative path in sourceRoot as relative to destination (part 4)', function(t, done) {
    var file = makeNestedFile();

    function check(results) {
      var dataFile = results[1];
      assert.deepStrictEqual(dataFile.path, path.join(__dirname, 'assets/dir1/dir2/helloworld.js'));
      assert.deepStrictEqual(dataFile.sourceMap.sourceRoot, '../../../src');
      assert.deepStrictEqual(dataFile.sourceMap.file, '../../../dist/dir1/dir2/helloworld.js');
      var mapFile = results[0];
      assert.deepStrictEqual(mapFile.path, path.join(__dirname, 'maps/dir1/dir2/helloworld.js.map'));
    }

    pipe([
      from.obj([file]),
      sourcemaps.write('../maps', {
        sourceRoot: '../src',
        destPath: 'dist',
      }),
      concat(check),
    ], done);
  });

  it('should accept a sourceMappingURLPrefix', function(t, done) {
    var file = makeFile();

    function check(results) {
      var data = results[1];
      assert.deepStrictEqual(/helloworld\.js$/.test(data.path), true);
      assert.deepStrictEqual(data.contents.toString().match(/sourceMappingURL.*\n$/)[0], 'sourceMappingURL=https://asset-host.example.com/maps/helloworld.js.map\n');
    }

    pipe([
      from.obj([file]),
      sourcemaps.write('../maps', { sourceMappingURLPrefix: 'https://asset-host.example.com' }),
      concat(check),
    ], done);
  });

  it('should accept a sourceMappingURLPrefix, as a function', function(t, done) {
    var file = makeFile();

    function check(results) {
      var data = results[1];
      assert.deepStrictEqual(/helloworld\.js$/.test(data.path), true);
      assert.deepStrictEqual(data.contents.toString().match(/sourceMappingURL.*\n$/)[0], 'sourceMappingURL=https://asset-host.example.com/maps/helloworld.js.map\n');
    }

    pipe([
      from.obj([file]),
      sourcemaps.write('../maps', {
        sourceMappingURLPrefix: function() {
          return 'https://asset-host.example.com';
        },
      }),
      concat(check),
    ], done);
  });

  it('should invoke sourceMappingURLPrefix every time', function(t, done) {
    var times = 0;

    var files = [
      makeFile(),
      makeFile(),
      makeFile(),
    ];

    function check(results) {
      // Only the files, not maps
      [results[1], results[3], results[5]].forEach(function(data, idx) {
        assert.deepStrictEqual(/helloworld\.js$/.test(data.path), true);
        assert.deepStrictEqual(data.contents.toString().match(/sourceMappingURL.*\n$/)[0], 'sourceMappingURL=https://asset-host.example.com/' + (idx + 1) + '/maps/helloworld.js.map\n');
      });
    }

    pipe([
      from.obj(files),
      sourcemaps.write('../maps', {
        sourceMappingURLPrefix: function() {
          ++times;
          return 'https://asset-host.example.com/' + times;
        },
      }),
      concat(check),
    ], done);
  });

  it('null as sourceRoot should not set the sourceRoot', function(t, done) {
    var file = makeFile();

    function check(results) {
      var data = results[0];
      assert.deepStrictEqual(data.sourceMap.sourceRoot, undefined);
    }

    pipe([
      from.obj([file]),
      sourcemaps.write({ sourceRoot: null }),
      concat(check),
    ], done);
  });

  it('function returning null as sourceRoot should not set the sourceRoot', function(t, done) {
    var file = makeFile();

    function check(results) {
      var data = results[0];
      assert.deepStrictEqual(data.sourceMap.sourceRoot, undefined);
    }

    pipe([
      from.obj([file]),
      sourcemaps.write({
        sourceRoot: function() {
          return null;
        },
      }),
      concat(check),
    ], done);
  });

  it('empty string as sourceRoot should be kept', function(t, done) {
    var file = makeFile();

    function check(results) {
      var data = results[0];
      assert.deepStrictEqual(data.sourceMap.sourceRoot, '');
    }

    pipe([
      from.obj([file]),
      sourcemaps.write({ sourceRoot: '' }),
      concat(check),
    ], done);
  });

  it('should be able to fully control sourceMappingURL by the option sourceMappingURL', function(t, done) {
    var file = makeNestedFile();

    function check(results) {
      var data = results[1];
      assert.deepStrictEqual(/helloworld\.js$/.test(data.path), true);
      assert.deepStrictEqual(data.contents.toString(), sourceContent + '\n//# sourceMappingURL=http://maps.example.com/helloworld.js.map\n');
    }

    pipe([
      from.obj([file]),
      sourcemaps.write('../aaa/bbb/', {
        sourceMappingURL: function(file) {
          // This avoids file.relative because Windows path separators
          return 'http://maps.example.com/' + file.basename + '.map';
        },
      }),
      concat(check),
    ], done);
  });

  it('should allow to change sources', function(t, done) {
    var file = makeFile();

    function check(results) {
      var data = results[0];
      assert.deepStrictEqual(data.sourceMap.sources, ['../src/helloworld.js']);
    }

    pipe([
      from.obj([file]),
      sourcemaps.write({
        mapSources: function(sourcePath, f) {
          assert.deepStrictEqual(file, f);
          return '../src/' + sourcePath;
        },
      }),
      concat(check),
    ], done);
  });

  it('can replace `mapSources` option with sourcemap.mapSources stream', function(t, done) {
    var file = makeFile();

    function check(results) {
      var data = results[0];
      assert.deepStrictEqual(data.sourceMap.sources, ['../src/helloworld.js']);
    }

    pipe([
      from.obj([file]),
      sourcemaps.mapSources(function(sourcePath, f) {
        assert.deepStrictEqual(file, f);
        return '../src/' + sourcePath;
      }),
      sourcemaps.write(),
      concat(check),
    ], done);
  });

});
