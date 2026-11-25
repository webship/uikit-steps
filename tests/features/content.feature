@content
Feature: Pagination, breadcrumbs, menus and badges
  Where a person is and where else to go: the current page, the links that cannot be followed,
  the active item of a menu, and the badges that count things.

  Background:
    Given I am on "/content.html"

  @critical
  Scenario: The pagination
    Then the current page of the "Results pages" pagination should be "1"
    And the "Previous" link of the pagination should be disabled
    And the "Next" link of the "Results pages" pagination should not be disabled

  Scenario: The breadcrumb
    Then the breadcrumb should read "Home > Products > Notebooks"
    And the current page of the breadcrumb should be "Notebooks"

  Scenario: The items of a menu
    Then "Overview" should be active in the menu
    And "Reports" should not be active in the menu
    And "Archive" should be disabled in the menu
    And "Reports" should not be disabled in the menu

  Scenario: Badges
    Then the "Messages" button should show the badge "5"
    And the "Reports" menu item should show the badge "3"
    And the "Overview" menu item should not show the badge "3"
