@hints
Feature: Tooltips
  A tooltip appears when the pointer rests on its button or link, or when it takes the focus, and
  goes when they leave.

  Background:
    Given I am on "/tooltip.html"

  @critical
  Scenario: A tooltip shows on hover
    When I hover over the "Save the draft" button
    Then the "Saves the draft without publishing it" tooltip should be shown
    And the "Saves the draft without publishing it" tooltip should show "without publishing"

  Scenario: A tooltip of a link, and another one placed below
    When I hover over the "Read the guide" link
    Then the "Opens the guide in a new window" tooltip should be shown
    When I hover over the "Preview" button
    Then the "Shows the page as visitors see it" tooltip should be shown
    And the "Opens the guide in a new window" tooltip should not be shown

  Scenario: The tooltip goes when the pointer leaves
    When I hover over the "Save the draft" button
    And I hover over the "Read the guide" link
    Then the "Saves the draft without publishing it" tooltip should not be shown
