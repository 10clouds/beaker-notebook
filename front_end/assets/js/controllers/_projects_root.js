!(function(app) {

  app.controller('projectsRoot', [
    '$scope',
    'Factories',
    '$state',
    '$rootScope',
    'FullscreenState',
    'TrackingService',
    function(
      $scope,
      Factories,
      $state,
      $rootScope,
      FullscreenState,
      TrackingService) {
    var F = Factories;

    if($rootScope.referrer.fromState.name === "landing") {
      TrackingService.mark('Authenticated');
      TrackingService.measure('BaselineAccountCreation', 'SignUp', 'Authenticated');
      TrackingService.measure('BaselineAccountSignIn', 'SignIn', 'Authenticated');
    }

    function setProjects() {
      return F.Projects.getProjects().then(function(projects) {
        $scope.projects.list = projects;
      });
    }

    function setNotebooks() {
      return F.Notebooks.getNotebooks().then(function(notebooks) {
        $scope.notebooks.list = notebooks;
      });
    }

    $scope.openedAt = function(notebook) {
      return moment.utc(notebook['opened-at']).utc().format()
    }

    $scope.isFullscreen = FullscreenState.isFullscreen;

    $scope.openNotebook = function(notebook) {
      if (notebook.unavailable) return;
      TrackingService.manageNotebookMarks(notebook)
      .then(function() {
        $state.go('projects.items.item.notebook', {
          id: notebook.project['public-id'],
          notebook_id: notebook['public-id']
        });
      });
    }

    $scope.isViewingNotebook = function (notebookId) {
       return $state.includes('projects.items.item.notebook') && $state.params.notebook_id == notebookId;
    };

    $scope.projects = $scope.projects || {};
    $scope.notebooks = $scope.notebooks || {};
    $scope.searchable = $scope.searchable || {}

    $scope.projects.ready = setProjects().then(setNotebooks);

    $scope.$watch('searchable.search', function(v) {
      if (v !== void(0) && v !== '') {
        if (!$state.includes('**.search')) {
          $state.go($state.current.name + '.search');
        }
      } else if (!$state.includes('**.items') && !$state.is("projects.items.item.notebook")) {
        // Empty search term, go back to the parent state
        $state.go('^');
      }
    });

    $scope.$on('notebookUpdated', function(e, notebook) {
      $scope.notebooks.list = _.reject($scope.notebooks.list, function(n) {
        return n['public-id'] == notebook['public-id'];
      });

      $scope.notebooks.list.push(notebook);
    });

    $scope.$on('notebookDeleted', function(e, notebookId) {
      $scope.notebooks.list = _.reject($scope.notebooks.list, function(n) {
        return n['public-id'] == notebookId;
      });
    });
  }]);
})(window.bunsen);
