;(function(angular, app) {
  app.directive('renameNotebookToggle', [
    '$compile',
    'Notebooks',
    '$rootScope',
    function($compile, Notebooks, $rootScope) {
    return {
      restrict: 'A',
      scope: {
        notebook: '='
      },
      link: function($scope, element) {
        element.on('click', function() {
          $scope.$apply(function() {
            $scope.notebookNewName = $scope.notebook.name;
            $scope.$emit('openModal', $compile(templates.rename_notebook())($scope));
          });
        });

        element.on('$destroy', function() {
          element.off('click');
        });

        $scope.renameSave = function() {
          Notebooks.update({ id: $scope.notebook.id, name: $scope.notebookNewName }).then(function(notebook) {
            $scope.notebook.name = notebook.name;
            $rootScope.$broadcast('closeModal');
            delete $scope.error;
          }).catch(function(response) {
            $scope.error = response.data.name[0];
          });
        };

        $scope.renameCancel = function() {
          $scope.notebookNewName = $scope.notebook.name;
          $rootScope.$broadcast('closeModal');
        };
      }
    }
  }]);
})(angular, window.bunsen);
