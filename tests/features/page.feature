@page
Feature: The components script
  Every component above needs the components script: a test can check the page loads it, and which
  version.

  @critical
  Scenario: The demo site loads the components script
    Given I am on "/index.html"
    Then the page should use the components script
    And the page should use the components script at version "3.25"
