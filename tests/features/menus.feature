@menus
Feature: Drop-down menus and drops
  A drop-down menu fades in under its button; one opens on a click, another under the pointer. A
  drop holds any content. A test waits for the menu to show before it chooses from it.

  Background:
    Given I am on "/dropdown.html"

  @critical
  Scenario: A menu opens with its button, shows its items and closes with its button
    When I open the "Account" drop-down menu
    Then the "Account" drop-down menu should be shown
    And the "Account" drop-down menu should show "Settings"
    And the "Account" drop-down menu should not show "Delete the account"
    When I close the "Account" drop-down menu
    Then the "Account" drop-down menu should not be shown

  Scenario: The states of a menu's items
    Then "Profile" should be active in the "Account" drop-down menu
    And "Billing" should be disabled in the "Account" drop-down menu
    And "Settings" should not be disabled in the "Account" drop-down menu
    And "Sign out" should not be active in the "Account" drop-down menu

  Scenario: A choice changes the page
    When I choose "Oldest first" from the "Sort by" drop-down menu
    Then I should see "Sorted by: oldest first."
    When I choose "Price" from the "Sort by" drop-down menu
    Then I should see "Sorted by: price."

  Scenario: Escape and a click outside close a menu
    When I open the "Account" drop-down menu
    And I press Escape in the "Account" drop-down menu
    Then the "Account" drop-down menu should not be shown
    When I open the "Account" drop-down menu
    And I click outside the "Account" drop-down menu
    Then the "Account" drop-down menu should not be shown
    And no drop-down menu should be shown

  Scenario: A menu that opens under the pointer
    When I hover over the "Share" button
    Then the "Share" drop-down menu should be shown
    And the "Share" drop-down menu should show "Copy the link"

  Scenario: A drop with content of its own
    When I open the "Delivery details" drop-down menu
    Then the "Delivery details" drop-down menu should show "Orders placed before noon leave the warehouse the same day."
    When I click outside the "Delivery details" drop-down menu
    Then the "Delivery details" drop-down menu should not be shown
