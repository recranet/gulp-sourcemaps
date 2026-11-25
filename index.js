'use strict';

module.exports = {
  init: require('./src/init'),
  write: require('./src/write'),
  mapSources: require('@recranet/gulp-sourcemaps-map-sources'),
  identityMap: require('@recranet/gulp-sourcemaps-identity-map'),
};
