var util = require('util');
var config = require('./_config');

module.exports = function() {
  var base = config.bunsenUrl;

  this.route = {
    home: base,
    signIn: base+"#/sign_in",
    market: base+"#/market_place",
    subscriptions: base+"#/subscriptions",
    publications: base+"#/publications",
    beakerPublications: base+"/publications.html#/publications",
    projectDashboard: base + "#/projects",
    userEdit: base + "#/user_edit",
    admin: base + "#/admin",
    vendors: base + "#/admin/vendors",
    forProject: function(project) {
      return util.format('%s#/projects/%s', base, project.id);
    }
  };
};
