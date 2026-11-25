@navigation-bar
Feature: The navigation bar
  On a wide screen a navigation bar shows its links; on a narrow one it hides them behind a toggle
  button, which opens them in a side panel.

  Background:
    Given I am on "/navbar.html"

  @critical
  Scenario: On a narrow screen the links hide behind the toggle button
    When I set the viewport to the "xs" breakpoint
    Then the "Shop" navigation bar should show its toggle button
    And the "Shop" navigation bar should be collapsed
    When I expand the "Shop" navigation bar
    Then the "Shop" navigation bar should be expanded
    And the "Shop menu" side panel should show "Notebooks"
    When I collapse the "Shop" navigation bar
    Then the "Shop" navigation bar should be collapsed

  Scenario: On a wide screen the links are shown
    Then the "Shop" navigation bar should not show its toggle button
    And the "Shop" navigation bar should be expanded
    And the "Main" navigation bar should not show its toggle button

  Scenario: Without a name, the first navigation bar of the page
    When I set the viewport to the "xs" breakpoint
    Then the navigation bar should show its toggle button
    When I expand the navigation bar
    Then the navigation bar should be expanded
    When I collapse the navigation bar
    Then the navigation bar should be collapsed
    When I set the viewport to the "xl" breakpoint
    Then the navigation bar should not show its toggle button

  Scenario: The drop-down menus of a navigation bar
    When I open the "Products" drop-down menu
    Then the "Products" drop-down menu should show "Notebooks"
    When I open the "Guides" drop-down menu
    Then the "Guides" drop-down menu should show "First steps"
    And the "Help center" navigation bar should be expanded

  Scenario: A menu of the site's own navigation bar takes to a page
    When I choose "Modal" from the "Overlays" drop-down menu
    Then I should be on "/modal.html"
