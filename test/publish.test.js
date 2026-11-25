'use strict';

var { describe, it, before, after } = require('node:test');
var childProcess = require('node:child_process');
var fs = require('node:fs');
var os = require('node:os');
var path = require('node:path');

var isWindows = os.platform() === 'win32';

// The package is unpacked inside the repository so that its dependencies
// resolve from the repository's node_modules.
var packDir = path.join(__dirname, '../tmp/publish');

describe('mock publish', { skip: isWindows }, function() {

  before(function() {
    fs.rmSync(packDir, { recursive: true, force: true });
    fs.mkdirSync(packDir, { recursive: true });
    var tarball = childProcess.execFileSync('npm', ['pack', '--silent', '--pack-destination', packDir], {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
    }).trim();
    childProcess.execFileSync('tar', ['-xzf', tarball], { cwd: packDir });
  });

  after(function() {
    fs.rmSync(packDir, { recursive: true, force: true });
  });

  // with regards to averting npm publishing disasters https://github.com/gulp-sourcemaps/gulp-sourcemaps/issues/246
  it('can load a published version', function() {
    // attempt to load a packed / unpacked potential deployed version
    require(path.join(packDir, 'package/index'));
  });
});
