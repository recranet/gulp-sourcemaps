'use strict';
var utils = require('../utils');
var unixStylePath = utils.unixStylePath;
var objectTransform = require('through2').objectTransform;
var path = require('node:path');
var generateIdentityMap = require('@recranet/gulp-sourcemaps-identity-map/lib/generate');
var initInternals = require('./index.internals');

/**
 * Initialize source mapping chain
 */
function init(options) {

  function sourceMapInit(file, encoding, callback) {
    // pass through if file is null or already has a source map
    if (file.isNull() || file.sourceMap) {
      this.push(file);
      return callback();
    }

    if (file.isStream()) {
      return callback(new Error(utils.PLUGIN_NAME + '-init: Streaming not supported'));
    }

    if (options === undefined) {
      options = {};
    }

    var fileContent = file.contents.toString();
    var sourceMap, preExistingComment;
    var internals = initInternals(options, file, fileContent);

    if (options.loadMaps) {
      var result = internals.loadMaps();
      sourceMap = result.map;
      fileContent = result.content;
      preExistingComment = result.preExistingComment;
    }

    if (!sourceMap && options.identityMap) {
      console.warn('**identityMap option is deprecated, update to use sourcemap.identityMap stream**');

      var fileType = path.extname(file.path);
      var source = unixStylePath(file.relative);

      if (fileType === '.js') {
        sourceMap = generateIdentityMap.js(source, fileContent);
      } else if (fileType === '.css') {
        sourceMap = generateIdentityMap.css(source, fileContent);
      }
    }

    if (!sourceMap) {
      // Make an empty source map
      sourceMap = {
        version: 3,
        names: [],
        mappings: '',
        sources: [unixStylePath(file.relative)],
        sourcesContent: [fileContent],
      };
    } else if (preExistingComment !== null && typeof preExistingComment !== 'undefined') {
      sourceMap.preExistingComment = preExistingComment;
    }

    sourceMap.file = unixStylePath(file.relative);
    file.sourceMap = sourceMap;

    this.push(file);
    callback();
  }

  return objectTransform(sourceMapInit);
}

module.exports = init;
