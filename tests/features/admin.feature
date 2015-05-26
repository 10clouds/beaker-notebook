Feature: Admin Panel
  As an administrator
  I want to login
  So that I can manage content

  @flaky @broken-admin-login-requires-refresh
  Scenario: Sign in as admin
    Given I'm signed in as an administrator
    When I go to the admin page
    Then I should see the Admin Panel heading

  @flaky @bad-test
  Scenario: Unauthorized admin access
    Given I'm signed in as a researcher
    When I go to the admin page
    Then I should still be on the project page
