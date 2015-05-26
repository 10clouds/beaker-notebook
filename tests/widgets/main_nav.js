module.exports = function() {
  return this.Widgets.MainNav = this.Widget.extend({
    root: '.main-nav',

    navList: function() {
      return this.find('.main-nav-list');
    },
    visitProjects: function() {
      return this.click('.projects');
    },
    visitMarketPlace: function() {
      return this.click('.market-place');
    },
    visitAdmin: function() {
      return this.click('.admin');
    },
    activeTab: function() {
      return this.read('.nav-item-active');
    },
  });
};
