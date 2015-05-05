var moment = require('moment');
var bluebird = require('bluebird');
var notebookBase = require('../fixtures/notebook_data_sample');
var _ = require('lodash');

var randomUser = {
  name: 'jane research',
  email: 'j@r.edu',
  password: 'password'
};

var otherUser = {
  name: 'jon research',
  email: 'jon@r.edu',
  password: 'password'
};

var randomProject = function(user, name) {
  return {
    model: 'Project',
    data: {
      name: name || 'gorillas',
      //jscs:disable
      owner_id: user['public-id']
      //jscs:enable
    }
  };
};

var randomNotebook = function(user, project, name, i) {
  var notebookName = name || 'Notebook';
  return {
    model: 'Notebook',
    data: _.extend(_.omit(notebookBase, ['userEmail', 'projectName']), {
      name: i === 0 ? notebookName : notebookName + ' ' + i,
      //jscs:disable
      user_id: user['public-id'],
      //jscs:enable
      projectId: project.id
    })
  };
};

var seedPublications = function(count, options, user) {
  var name = options && options.name;
  var category = options && options.category;
  var projectName = options && options.projectName;

  return this.user.createUser(user).then(function(u) {
    return this.seed.populate(randomProject(u, projectName)).then(function(project) {
      var notebooks = [];

      for (var i = 0; i < +count; ++i) {
        notebooks.push(randomNotebook(u, project[0], name, i));
      }

      return this.seed.populate(notebooks)
        .then(function(notebooks) {
          var publicationPromises = [];

          _.each(notebooks, function(notebook, i) {
            var publicationName = name || 'Notebook';

            var publication = {
              model: 'Publication',
              data: {
                //jscs:disable
                notebook_id: notebook.id,
                //jscs:enable
                name: i === 0 ? publicationName : publicationName + ' ' + i,
                contents: notebookBase.data,
                //jscs:disable
                user_id: u['public-id']
                //jscs:enable
              }
            };

            if (category) {
              publication.associations = [{
                foreignKey: 'category_id',
                lookup: {'PublicationCategory': {name: category}}
              }];
            }

            var publicationPromise = this.seed.populate.bind(this, publication);

            publicationPromises.push(publicationPromise);
          }.bind(this));

          return publicationPromises;
        }.bind(this));
    }.bind(this));
  }.bind(this))
  .then(function(arr) {
    return bluebird.reduce(arr, function(total, v) {return v();}, 0);
  });
};

module.exports = function() {

  this.Given(/^there are (\d+) publications(?: for the project "([^"]*)")?$/, function(count, projectName) {
    return seedPublications.bind(this)(count, {projectName: projectName}, randomUser);
  });

  this.Given(/^there are (\d+) publications in the "([^"]*)" category$/, function(count, categoryName) {
    return seedPublications.bind(this)(count, {category: categoryName}, otherUser);
  });

  this.Given(/^the notebook "([^"]*)" is published$/, function(notebookName) {
    var _this = this;
    return this.user.getDetails()
    .then(function(u) {
      return _this.seed.populate({
        model: 'Publication',
        data: {
          name: notebookName,
          //jscs:disable
          user_id: u['public-id']
          //jscs:enable
        },
        associations: [{
          foreignKey: 'notebook_id',
          lookup: {'Notebook': {name: notebookName}}
        }]
      });
    });
  });

  this.Given(/^I have the following publication categories:$/, function(table) {
    var seedData = _.map(table.hashes(), function(category) {
      return {
        model: 'PublicationCategory',
        data: category
      };
    });
    return this.seed.populate(seedData);
  });

  this.Given(/^there is a publication named "([^"]*)"$/, function(name) {
    return seedPublications.bind(this)(1, {name: name}, otherUser);
  });

  this.Given(/^I view the first publication$/, function() {
    return this.driver.wait(function() {
      return new this.Widgets.PublicationList().at(0)
      .then(function(v) {
        return v !== undefined;
      })
      .thenCatch(function() {
        return false;
      });
    }.bind(this), global.timeout)
    .then(function() {
      return new this.Widgets.PublicationList()
      .clickAt({selector: 'a.title', index: 0});
    }.bind(this));
  });

  this.When(/^I view the publications page$/, function() {
    return this.driver.get(this.route.publications);
  });

  this.When(/^I wait for publications to load$/, function() {
    return this.driver.wait(function() {
      return new this.Widgets.PublicationList().length()
      .then(function(num) {
        return num > 0;
      });
    }.bind(this), 10000, 'Found no publications');
  });

  this.When(/^I click the "([^"]*)" category$/, function(category) {
    return new this.Widgets.PublicationCategoriesList().clickCategory(category);
  });

  this.Then(/^The category should display the "([^"]*)" icon$/, function(category) {
    return new this.Widgets.PublicationCategoryHero().icon().should.eventually.eql(category);
  });

  this.Then(/^The category should have the description "([^"]*)"$/, function(description) {
    return new this.Widgets.PublicationCategoryHero().description().should.eventually.equal(description);
  });

  this.When(/^I go to publish the notebook$/, function() {
    return new this.Widgets.Notebook().openPublishModal();
  });

  this.When(/^I give it the description "([^"]*)"$/, function(description) {
    return new this.Widgets.PublishModal().addDescription(description);
  });

  this.Then(/^I should see "([^"]*)"$/, function(msg) {
    return new this.Widgets.PublishModal().find({text: msg});
  });

  this.When(/^I give it the category "([^"]*)"$/, function(category) {
    return new this.Widgets.PublishModal().selectCategory(category);
  });

  this.When(/^I publish the notebook|update the publication$/, function() {
    return new this.Widgets.PublishModal().publish();
  });

  this.When(/^I view the published version$/, function() {
    return new this.Widgets.Notebook().viewPublished();
  });

  this.When(/^I go to update the publication$/, function(callback) {
    return new this.Widgets.Notebook().goToUpdatePublication();
  });

  this.When(/^I delete the publication$/, function() {
    return new this.Widgets.Notebook().removePublication();
  });

  this.When(/^I go to open the publication in Bunsen$/, function() {
    return new this.Widgets.Publication().goToOpenInBunsen();
  });

  this.When(/^I select the destination project "([^"]*)"$/, function(project) {
    return new this.Widgets.copyNotebookModal().selectProject(project);
  });

  this.When(/^I name the copied notebook "([^"]*)"$/, function(name) {
    return new this.Widgets.copyNotebookModal().nameNotebook(name);
  });

  this.When(/^I copy the publication$/, function() {
    return new this.Widgets.Modal().submit();
  });

  this.Then(/^I should see a published version of the following notebook:$/, function(table) {
    var attrs = table.hashes()[0];
    var publication = new this.Widgets.Publication();

    return publication.name().should.eventually.eql(attrs.name)
    .then(function() {
      return publication.description().should.eventually.eql(attrs.description);
    });
  });

  this.Then(/^I should see an updated version of the following notebook:$/, function(table) {
    var attrs = table.hashes()[0];
    var publication = new this.Widgets.Publication();

    return publication.name().should.eventually.eql(attrs.name)
    .then(function() {
      return publication.description().should.eventually.eql(attrs.description);
    });
  });

  this.Then(/^I should see that the notebook is not published$/, function() {
    return new this.Widgets.Notebook().publishStatus().should.eventually.eql('This notebook is currently private');
  });

  this.When(/^I should see that the notebook is published$/, function() {
    return new this.Widgets.Notebook().publishStatus().should.eventually.eql('This notebook is published');
  });

  this.Then(/^the notebook updated time should be now$/, function(callback) {
    return new this.Widgets.Notebook().updateTime().then(function(publishTime) {
      var formattedPublishTime = moment(publishTime, 'M/D/YY h:mm A');
      var now = moment();
      return now.diff(formattedPublishTime, 'minutes').should.be.at.most(1);
    });
  });

  this.Then(/^the notebook publish date should be now$/, function() {
    return new this.Widgets.Notebook().publishTime().then(function(publishTime) {
      var formattedPublishTime = moment(publishTime, 'M/D/YY h:mm A');
      var now = moment();
      return now.diff(formattedPublishTime, 'minutes').should.be.at.most(1);
    });
  });

  this.Then(/^the notebook cells should be visible$/, function() {
    var _this = this;
    return new this.Widgets.Notebook().waitForBeaker().then(function() {
      return new _this.Widgets.NotebookiFrames().hasVisible().should.eventually.eql(true);
    });
  });

  this.Then(/^I should see (\d+) publication results on the page$/, function(count) {
    var found = -1;
    return this.driver.wait(function() {
      return new this.Widgets.PublicationList().length()
      .then(function(num) {
        found = num;
        return num == count;
      });
    }.bind(this), 10000, 'Found ' + found + ' results, expected ' + count);
  });

  this.Then(/^I should see the "([^"]*)" icon in the first result$/, function(category) {
    return new this.Widgets.PublicationList().at(0).then(function(publication) {
      return publication.icon().should.eventually.eql(category);
    });
  });

  this.Then(/^I should see (\d+) publication results next to the "([^"]*)" category$/, function(n, category) {
    return new this.Widgets.PublicationCategoriesList().count(category).should.eventually.eql(n);
  });

  this.Then(/^I should see the following publication first in the list:$/, function(table) {
    return new this.Widgets.PublicationList().at(0).then(function(publication) {
      return publication.name().should.eventually.eql(_.pluck(table.hashes(), 'name')[0])
      .then(function() {
        var languages = _.pluck(table.hashes(), 'languages')[0];
        return !languages || publication.languages().should.eventually.eql(languages);
      });
    });
  });

  this.Then(/^I should see my author info in the first publication$/, function() {
    return new this.Widgets.PublicationList().at(0).then(function(publication) {
      return publication.author().should.eventually.equal('joe research')
      .then(function() {
        return publication.authorJobTitle().should.eventually.contain('Researcher');
      })
      .then(function() {
        return publication.authorCompany().should.eventually.equal('Two Sigma');
      });
    });
  });

  this.Then(/^I should see an average rating of (\d+) in the first publication$/, function(avg) {
    return new this.Widgets.UserRating({root: '.average'}).currentRating().should.eventually.have.length(avg);
  });

  this.Then(/^I should see the following top contributors:$/, function(table) {
    var expectedValues = table.hashes();
    return new this.Widgets.TopContributorList().contents().should.eventually.eql(expectedValues);
  });

  this.When(/^I search for publication "([^"]*)"$/, function(searchText) {
    var publicationSearch = new this.Widgets.PublicationSearch();
    return publicationSearch.search(searchText);
  });

  this.Then(/^I should be on page (\d+) of results$/, function(page) {
    var currentPage = -1;
    return this.driver.wait(function() {
      return new this.Widgets.PublicationsPagination().currentPage()
      .then(function(p) {
        currentPage = p;
        return p == page;
      });
    }.bind(this), 10000, 'expected to be on page ' + page + ', instead was on ' + currentPage);
  });

  this.When(/^I click page (\d+) of pagination$/, function(page) {
    return new this.Widgets.PublicationsPagination().clickPage(page);
  });

  this.Then(/^I give the publication a rating of (\d+)$/, function(index) {
    return new this.Widgets.UserRating({root: '.rating'}).clickStar(index);
  });

  this.Then(/^I should see (\d+) stars highlighted in my rate$/, function(count) {
    return new this.Widgets.UserRating({root: '.rating'}).currentRating().should.eventually.have.length(count);
  });

  this.Then(/^I should see (\d+) stars highlighted in the average$/, function(count) {
    return new this.Widgets.UserRating({root: '.average'}).currentRating().should.eventually.have.length(count);
  });
};
