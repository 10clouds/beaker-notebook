;(function(app) {
  app.service('Notebooks', function($rootScope, $state, $window, $location, Factories) {

    function getIFrame(notebookId) {
      return document.getElementById('beaker-frame-' + notebookId);
    }

    function saveNotebook(data) {
      var createNotebook = _.partial(Factories.Notebooks.createNotebook, data.projectId);
      var saveFunction = data.operation == 'create' ?
        createNotebook : Factories.Notebooks.update;
      saveFunction(data.notebook).
        then(function(notebook) {
          $rootScope.$broadcast('window-message-notebook-'+data.operation, notebook);
        }, function(response) {
          $window.alert("Error attempting to " + data.operation + " notebook.");
        });
    };

    function removeIFrame(frame) {
      frame.parentNode.removeChild(frame);
    }

    function resizeIframe(frame, height) {
      angular.element(frame).attr('height', height);
    };

    function setNotebookEdited(data) {
      $rootScope.$broadcast('notebook-edited', data);
    };

    function receiveWindowMessage(e) {
      if (new URL(e.origin).hostname !== $location.host()) {
        throw "message received from unauthorized host " + e.origin.host;
      }
      if (e.data.operation == 'close') return removeIFrame(e.source.frameElement);
      if (e.data.operation == 'resize') return resizeIframe(e.source.frameElement, e.data.height);
      if (e.data.operation == 'edited') return setNotebookEdited(e.data);
      if (!e.data.notebook) return; // could be a message for a different purpose
      saveNotebook(e.data);
    }
    $window.addEventListener('message', receiveWindowMessage, false);

    var sendToIFrame = function(notebookId, payload) {
      var uiUrl = $location.absUrl().split("#")[0];
      getIFrame(notebookId).contentWindow.postMessage(payload, uiUrl);
    }

    function closeIfOpen(notebookId) {
      if (frame = getIFrame(notebookId)) {
        sendToIFrame(notebookId, { action: 'close' });
      }
      if ($state.is("projects.items.item.notebook") && $state.params.notebook_id == notebookId) {
        $state.go('projects.items.item', {id: $state.params.id});
      }
    }

    return {
      sendToIFrame: sendToIFrame,

      create: function(projectId, attrs) {
        return Factories.Notebooks.createNotebook(projectId, attrs)
          .then(function(notebook) {
            $state.go('projects.items.item.notebook', { notebook_id: notebook['public-id'] });
          }, function(response) {
            $window.alert("Error attempting to create notebook.");
          });
      },

      save: function(notebookId, newName) {
        var data = { action: 'save' };
        if (newName) {
          data.name = newName;
        }

        sendToIFrame(notebookId, data);
      },

      update: function(attrs) {
        return Factories.Notebooks.update(attrs).then(function(notebook) {
          $rootScope.$broadcast('notebookUpdated', notebook);
          return notebook;
        }.bind(this));
      },

      closeNotebook: function(notebookId) {
        return Factories.Notebooks.update({id: notebookId, open: false}).then(function(notebook) {
          closeIfOpen(notebookId);
          $rootScope.$broadcast('notebookUpdated', notebook);
          return notebook;
        }.bind(this));
      },

      destroy: function(notebookId) {
        return Factories.Notebooks.destroy(notebookId).then(function(notebook) {
          closeIfOpen(notebookId);
          $rootScope.$broadcast('notebookDeleted', notebookId);
          return notebook;
        }.bind(this));
      }
    }
  });
})(window.bunsen);
