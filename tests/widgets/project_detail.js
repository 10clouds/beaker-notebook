Promise = require('bluebird');
module.exports = function() {
  var World = this;
  return this.Widgets.ProjectDetail = this.Widget.extend({
    root: '.projects-root',
    projectMenu: '.project-menu .bunsen-dropdown-toggle',

    edit: function() {
      var _this = this;

      return this.find(this.projectMenu)
      .then(function(el) {
        return new World.Widgets.Dropdown().show(el)
        .then(function() {
          return _this.click(".edit-project");
        })
      });
    },

    name: function() {
      return this.read('.project-name');
    },

    error: function() {
      return this.read('.error');
    },

    dismissError: function() {
      return this.click('.error .close');
    },

    description: function() {
      return this.read('.project-description-display');
    },

    updatedAt: function() {
      return this.read('.last-updated');
    },

    addNewNotebook: function() {
      return Promise.delay(1500)
      .then(function() {
        return this.click({
          text: "New Notebook"
        });
      }.bind(this));
    }
  });
};
