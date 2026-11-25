@filter
Feature: A list with a filter
  A choice above a list keeps only its items; the others fade out. A test waits for the list to
  stop moving.

  Background:
    Given I am on "/filter.html"

  @critical
  Scenario: The list shows the items of the choice made
    Then the "Colours" filtered list should show 5 items
    When I filter the "Colours" list by "Red"
    Then the "Colours" filtered list should show 2 items
    And the "Colours" filtered list should show "Notebook"
    And the "Colours" filtered list should not show "Pen"
    When I filter by "All"
    Then the filtered list should show 5 items
