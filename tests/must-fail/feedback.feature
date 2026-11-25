@must-fail
Feature: Assertions on alerts, spinners and progress bars that must fail
  Each scenario asserts something that is not true on the demo site, at its last step.

  Scenario: An alert of another kind
    Fails with: Expected a danger alert "Your profile was updated.", but there is none.
    Given I am on "/alert.html"
    Then I should see an error alert "Your profile was updated."

  Scenario: A dismissed alert is gone
    Fails with: Expected an alert "Your profile was updated." to dismiss, but there is none.
    Given I am on "/alert.html"
    When I dismiss the alert "Your profile was updated."
    And I dismiss the alert "Your profile was updated."

  Scenario: An alert with no close button cannot be dismissed
    Fails with: Could not dismiss the alert "The payment was refused.": it has no close button.
    Given I am on "/alert.html"
    When I dismiss the alert "The payment was refused."

  Scenario: A dismissible alert
    Fails with: Expected the alert "Your profile was updated." not to be dismissible, but it has a close button.
    Given I am on "/alert.html"
    Then the alert "Your profile was updated." should not be dismissible

  Scenario: No spinner before the orders are asked for
    Fails with: Expected a loading spinner, but none is shown.
    Given I am on "/loading.html"
    Then I should see a loading spinner

  Scenario: A progress bar at another value
    Fails with: Expected the "Upload" progress bar to be at 50%, but it announces 0%
    Given I am on "/loading.html"
    Then the "Upload" progress bar should be at 50%

  Scenario: A field that is not shown as invalid
    Fails with: Expected the "Name" field to be shown as invalid, but it is shown as valid.
    Given I am on "/form.html"
    When I fill in "Name" with "Rana"
    And I press "Sign up"
    Then the "Name" field should be shown as invalid

  Scenario: The number of invalid fields
    Fails with: Expected 2 fields to be shown as invalid, but 3 are.
    Given I am on "/form.html"
    When I press "Sign up"
    Then 2 fields should be shown as invalid
