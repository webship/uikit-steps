@notifications
Feature: Notifications
  A notification fades in at an edge of the window and, after its delay, fades out by itself; one
  with no delay stays until it is closed. Its close button shows under the pointer only.

  Background:
    Given I am on "/notification.html"

  @critical
  Scenario: A notification hides by itself
    When I press "Save the settings"
    Then I should see a success notification "The settings were saved."
    And the "The settings were saved." notification should be shown
    And the "The settings were saved." notification should hide by itself
    And I should not see a notification "The settings were saved."

  Scenario: A notification of another kind
    When I press "Send the report"
    Then I should see an error notification "The report could not be sent."
    And the "The report could not be sent." notification should show "could not be sent"

  Scenario: A notification that stays until it is closed
    When I press "Check for updates"
    Then I should see a primary notification "A new version is ready to install."
    When I close the "A new version is ready to install." notification
    Then the "A new version is ready to install." notification should not be shown
    And no notification should be shown
