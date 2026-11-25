@alerts
Feature: Alerts
  An alert is a message in the page, of a kind (its colour); a dismissible one fades and shrinks
  away with its close button.

  Background:
    Given I am on "/alert.html"

  @critical
  Scenario: Alerts of each kind
    Then I should see the alert "A new version of the guide is out."
    And I should see a success alert "Your profile was updated."
    And I should see the warning alert "Your subscription ends in three days."
    And I should see an error alert "The payment was refused."

  Scenario: A dismissible alert goes with its close button
    Then the alert "Your profile was updated." should be dismissible
    When I dismiss the alert "Your profile was updated."
    Then I should not see the success alert "Your profile was updated."

  Scenario: An alert with no close button stays
    Then the alert "The payment was refused." should not be dismissible
