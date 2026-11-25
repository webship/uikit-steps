@sticky
Feature: A menu that sticks to the top of the window
  A section menu sticks to the top of the window once the page scrolls past it, and marks the
  section on the screen; a click on one of its links scrolls smoothly to the section.

  Background:
    Given I am on "/sticky.html"

  @critical
  Scenario: The menu sticks once the page scrolls past it
    Then the "Section menu" should not stick to the top of the window
    When I scroll down 800
    Then the "Section menu" should stick to the top of the window
    When I scroll to the top of the page
    Then the "Section menu" should not stick to the top of the window

  Scenario: The menu marks the section on the screen
    When I follow "Pricing"
    Then "Pricing" should be active in the menu
    And "Introduction" should not be active in the menu
