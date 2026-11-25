@loading
Feature: Spinners and progress
  What a page shows while it waits: a spinner while a list loads, a progress bar while a file goes
  up.

  Background:
    Given I am on "/loading.html"

  @critical
  Scenario: A spinner while the orders load
    When I press "Load the orders"
    Then I should see a loading spinner
    When I wait for the loading spinner to disappear
    Then I should not see a loading spinner
    And I should see "Order 1001: shipped"

  Scenario: A progress bar fills up
    Then the "Upload" progress bar should be at 0%
    When I press "Start the upload"
    Then the "Upload" progress bar should reach 50%
    And the progress bar should reach 100%
