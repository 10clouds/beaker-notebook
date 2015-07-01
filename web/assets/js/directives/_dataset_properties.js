;(function(angular, app) {
  app.directive('datasetProperties', function() {
    return {
      restrict: 'E',
      scope: {
        item:  "="
      },
      template: templates.dataset_properties,
      controller: ['$scope', function($scope) {

        var specialUiAttrs = [
          'csvPreview',
          'description',
          'numColumns',
          'remoteFile',
          'rows',
          'tags',
          'title',
          'dataPreviews',
          'categories',
          'vendor',
          'category'
        ];

        var ignoreAttrs = [
          'subscriberIds',
          'id',
          '_id',
          'tabView',
          'related',
          'catalog',
          'index',
          'categoryId',
          'categoryIds'
        ];

        var omitAttrs = specialUiAttrs.concat(ignoreAttrs);

        function parseDate(dateField) {
          $scope.item.filteredMeta[dateField] = moment.utc($scope.item[dateField]).utc().format("YYYY-MM-DD");
        }

        var dateFields = _.filter(_.keys($scope.item.catalog.metadata), function(key) {
          return $scope.item.catalog.metadata[key].type == 'date';
        });

        $scope.item.filteredMeta = _.omit($scope.item, omitAttrs);

        _.each(dateFields, function (dateField) {
          if ($scope.item[dateField]) {
            parseDate(dateField);
          }
        });

      }]
    };
  });
})(angular, window.bunsen);
