'use strict';

var assert = require('node:assert');
var { describe, it, after } = require('node:test');
var gulp = require('gulp');
var gulpConcat = require('gulp-concat');
var less = require('gulp-less');
var sourcemaps = require('..');
var streamHelpers = require('./stream-helpers');

var pipe = streamHelpers.pipe;
var concat = streamHelpers.concat;

var join = require('path').join;
var fs = require('fs');
var sourceContent = fs.readFileSync(join(__dirname, 'assets/helloworld.js')).toString();

function base64JSON(object) {
  return 'data:application/json;charset=utf8;base64,' + Buffer.from(JSON.stringify(object)).toString('base64');
}

describe('integrations', function() {

  after(function() {
    fs.rmSync(join(__dirname, '../tmp/combined_map_preExisting_two_task'), { recursive: true, force: true });
  });

  it('combined: creates inline mapping', function(t, done) {

    function check(results) {
      var data = results[0];
      assert.ok(data.sourceMap);
      assert.deepStrictEqual(data.contents.toString(), sourceContent + '\n//# sourceMappingURL=' + base64JSON(data.sourceMap) + '\n');
    }

    pipe([
      gulp.src('assets/helloworld.js', { cwd: __dirname }),
      sourcemaps.init(),
      sourcemaps.write(),
      concat(check),
    ], done);
  });

  it('combined: creates preExistingComment , no new previous line', function(t, done) {

    function check(results) {
      var data = results[0];
      assert.ok(data.sourceMap);
      assert.ok(data.sourceMap.preExistingComment);
      assert.deepStrictEqual(data.contents.toString(), sourceContent + '\n//# sourceMappingURL=' + base64JSON(data.sourceMap) + '\n');
    }

    pipe([
      gulp.src('assets/helloworld.map.js', { cwd: __dirname }),
      sourcemaps.init({ loadMaps: true }),
      sourcemaps.write(),
      concat(check),
    ], done);
  });


  it('combined mapped: concat files with final combined sourcemap file', function(t, done) {

    function check(results) {
      var data = results[1];
      // TODO: This might be flakey since it grabs index 1 from results
      assert.deepStrictEqual(/index\.js$/.test(data.path), true);
      assert.deepStrictEqual(/\/\/# sourceMappingURL=index.js.map/.test(data.contents.toString()), true);
      assert.deepStrictEqual(data.contents.toString().match(/\/\/# sourceMappingURL/g).length, 1);
    }

    pipe([
      gulp.src(['assets/*.js', '!assets/test*.js', '!assets/*map.js'], { cwd: __dirname }),
      sourcemaps.init(),
      gulpConcat('index.js'),
      sourcemaps.write('.', { sourceRoot: '../../test/assets' }),
      concat(check),
    ], done);
  });

  it('combined: inline concatenated file', function(t, done) {

    function check(results) {
      var data = results[0];
      assert.deepStrictEqual(/index\.js$/.test(data.path), true);
      assert.deepStrictEqual(/\/\/# sourceMappingURL=data:application.*/.test(data.contents.toString()), true);
      assert.deepStrictEqual(data.contents.toString().match(/\/\/# sourceMappingURL/g).length, 1);
    }

    pipe([
      gulp.src(['assets/*.js', '!assets/test*.js', '!assets/*map.js'], { cwd: __dirname }),
      sourcemaps.init(),
      gulpConcat('index.js'),
      sourcemaps.write({ sourceRoot: '../../test/assets' }),
      concat(check),
    ], done);
  });

  it('combined: less: inline concatenated file', function(t, done) {

    function check(results) {
      var data = results[0];
      assert.deepStrictEqual(/test\.css$/.test(data.path), true);
      // gulp-less resolves `sources` against the working directory rather than the file base.
      assert.deepStrictEqual(data.sourceMap.sources.length, 1);
      assert.deepStrictEqual(/test\.less$/.test(data.sourceMap.sources[0]), true);
      assert.deepStrictEqual(data.contents.toString().match(/\/\*# sourceMappingURL=data:application/g).length, 1);
    }

    pipe([
      gulp.src('assets/*.less', { cwd: __dirname }),
      sourcemaps.init(),
      less(),
      sourcemaps.write({ sourceRoot: '../../test/assets' }),
      concat(check),
    ], done);
  });

  it('combined: mapped preExisting', function(t, done) {

    function check(results) {
      var data = results[1];
      // TODO: This might be flakey since it grabs index 1 from results
      assert.deepStrictEqual(/index\.js$/.test(data.path), true);
      assert.deepStrictEqual(/\/\/# sourceMappingURL=index.js.map/.test(data.contents.toString()), true);
      assert.deepStrictEqual(data.contents.toString().match(/\/\/# sourceMappingURL/g).length, 1);
    }

    pipe([
      // picking a file with no existing sourcemap, if we use helloworld2 it will attempt to use helloworld2.js.map
      gulp.src([
        'assets/helloworld7.js', // NO PRE-MAP at all
        'assets/helloworld.map.js', // INLINE PRE-MAp
      ], { cwd: __dirname }),
      sourcemaps.init({ loadMaps: true }),
      gulpConcat('index.js'),
      sourcemaps.write('.', { sourceRoot: '../../test/assets' }),
      concat(check),
    ], done);
  });


  it('combined: inlined preExisting', function(t, done) {

    function check(results) {
      var data = results[0];
      assert.deepStrictEqual(/index\.js$/.test(data.path), true);
      assert.deepStrictEqual(/\/\/# sourceMappingURL=data:application.*/.test(data.contents.toString()), true);
      assert.deepStrictEqual(data.contents.toString().match(/\/\/# sourceMappingURL/g).length, 1);
    }

    pipe([
      // picking a file with no existing sourcemap, if we use helloworld2 it will attempt to use helloworld2.js.map
      gulp.src([
        'assets/helloworld7.js', // NO PRE-MAP at all
        'assets/helloworld.map.js', // INLINE PRE-MAp
      ], { cwd: __dirname }),
      sourcemaps.init({ loadMaps: true }),
      gulpConcat('index.js'),
      sourcemaps.write({ sourceRoot: '../../test/assets' }),
      concat(check),
    ], done);
  });

  it('combined: mapped preExisting with two tasks', function(t, done) {

    function check(results) {
      var data = results[1];
      // TODO: This might be flakey since it grabs index 1 from results
      assert.deepStrictEqual(/index\.js$/.test(data.path), true);
      assert.deepStrictEqual(/\/\/# sourceMappingURL=index.js.map/.test(data.contents.toString()), true);
      assert.deepStrictEqual(data.contents.toString().match(/\/\/# sourceMappingURL/g).length, 1);
    }

    pipe([
      gulp.src('assets/helloworld7.js', { cwd: __dirname }),
      sourcemaps.init(),
      gulpConcat('h7.js'),
      sourcemaps.write('.'),
      gulp.dest('tmp/combined_map_preExisting_two_task/tmp'),
    ], function(err) {
      if (err) {
        done(err);
        return;
      }

      pipe([
        gulp.src(['../tmp/combined_map_preExisting_two_task/tmp/h7.js', 'assets/helloworld.map.js'], { cwd: __dirname }),
        sourcemaps.init({ loadMaps: true }),
        gulpConcat('index.js'),
        sourcemaps.write('.', { sourceRoot: '../../test/assets' }),
        concat(check),
      ], done);
    });
  });


  // - thanks @twiggy https://github.com/gulp-sourcemaps/gulp-sourcemaps/issues/270#issuecomment-271723208
  it('sources: is valid with concat', function(t, done) {

    function check(results) {
      var data = results[0];
      // TODO: This might be flakey since it grabs index 0 from results
      assert.deepStrictEqual(/.*\.map/.test(data.path), true);

      var contents = JSON.parse(data.contents.toString());
      contents.sources.forEach(function(s, i) {
        assert.deepStrictEqual(s, 'test' + (i + 3) + '.js');
      });
    }

    pipe([
      gulp.src(['assets/test3.js', 'assets/test4.js'], { cwd: __dirname }),
      sourcemaps.init(),
      gulpConcat('index.js'),
      sourcemaps.write('.'),
      concat(check),
    ], done);
  });

  // - thanks @twiggy https://github.com/gulp-sourcemaps/gulp-sourcemaps/issues/270#issuecomment-271723208
  it('sources: mapSourcesAbsolute: is valid with concat', function(t, done) {

    function check(results) {
      var data = results[0];
      // TODO: This might be flakey since it grabs index 0 from results
      assert.deepStrictEqual(/.*\.map/.test(data.path), true);

      var contents = JSON.parse(data.contents.toString());
      contents.sources.forEach(function(s, i) {
        assert.deepStrictEqual(s, '/test/assets/test' + (i + 3) + '.js');
      });
    }

    pipe([
      // This changed to `test/assets/` because join isn't valid globs
      gulp.src(['test/assets/test3.js', 'test/assets/test4.js']),
      sourcemaps.init(),
      gulpConcat('index.js'),
      sourcemaps.write('.', { mapSourcesAbsolute: true }),
      concat(check),
    ], done);
  });
});
