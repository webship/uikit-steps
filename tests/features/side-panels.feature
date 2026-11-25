@side-panels
Feature: Side panels
  A side panel slides in from an edge of the window, over the page, pushing it aside, or revealing
  under it. One that pushes or reveals moves the page itself, and says it is shown before the page
  has stopped moving: a test waits for the page too.

  Background:
    Given I am on "/offcanvas.html"

  @critical
  Scenario: A side panel opens with its button and closes with its close button
    When I open the "Menu" side panel
    Then the "Menu" side panel should be shown
    And the "Menu" side panel should show "Customers"
    When I close the "Menu" side panel
    Then the "Menu" side panel should not be shown
    And no side panel should be shown

  Scenario: A panel from the right, closed with Escape
    When I open the "Cart" side panel with the "Open the cart" button
    Then the "Cart" side panel should show "2 items: a notebook and a pen."
    When I press Escape in the "Cart" side panel
    Then the "Cart" side panel should not be shown

  Scenario: A panel that pushes the page, and a button in it
    When I open the "Filters" side panel
    And I check "In stock only"
    And I press "Apply" in the "Filters" side panel
    Then the "Filters" side panel should not be shown
    And I should see "Showing the items in stock."

  Scenario: A panel that reveals under the page, closed by a click outside
    When I open the "Help" side panel
    Then the "Help" side panel should show "Ask the support team"
    When I click outside the "Help" side panel
    Then the "Help" side panel should not be shown
    When I wait for the transitions to finish
    Then no side panel should be shown
