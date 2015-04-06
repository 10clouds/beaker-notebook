module.exports = function() {
  return this.Widgets.MarketItem = this.Widget.extend({
    root: '.marketplace',

    title: function() {
      return this.read('h1');
    },

    canEdit: function() {
      return this.isPresent('.edit.admin-action');
    },

    edit: function() {
      return this.click('.edit.admin-action');
    },

    description: function() {
      return this.read('.description');
    },

    vendors: function() {
      return this.read({ selector: '.vendor', transformer: function(format) {
        return format.toLowerCase();
      }});
    },

    clickVendor: function() {
      return this.click(".vendor");
    },

    frequency: function() {
      return this.read('.dataset-update-frequency');
    },

    tags: function() {
      return this.read('.dataset-tags');
    },

    format: function() {
      return this.read('.dataset-format');
    },

    categories: function() {
      return this.read('.dataset-categories');
    },

    goBackToSearch: function() {
      return this.click(".return-to-market-search");
    },

    subscribe: function() {
      return this.click(".subscribe");
    },

    unsubscribe: function() {
      return this.read(".subscribe").should.eventually.contain('Unsubscribe');
    },

    filePath: function() {
      return this.read('.file-path');
    },

    activeTab: function() {
      return this.read('.tab.active');
    },

    startDate: function () {
      return this.read('.dataset-start-date');
    }
  });
};
