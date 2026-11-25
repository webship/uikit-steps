@must-fail
Feature: Assertions on dialogs, side panels, menus, notifications and tooltips that must fail
  Each scenario asserts something that is not true on the demo site, at its last step.
  tests/check-must-fail.js runs them and checks the message of each failure.

  Scenario: A closed dialog is not shown
    Fails with: Expected the "Newsletter" dialog to be shown, but it is closed
    Given I am on "/modal.html"
    Then the "Newsletter" dialog should be shown

  Scenario: An open dialog is shown
    Fails with: Expected the "Newsletter" dialog to be closed, but it is open
    Given I am on "/modal.html"
    When I open the "Newsletter" dialog
    Then the "Newsletter" dialog should not be shown

  Scenario: A dialog that does not exist
    Fails with: Expected a dialog named "Settings" on the page, but there is none.
    Given I am on "/modal.html"
    When I open the "Settings" dialog

  Scenario: A dialog set to stay open does not close with Escape
    Fails with: Expected the "Upload in progress" dialog to be closed, but it is open
    Given I am on "/modal.html"
    When I open the "Upload in progress" dialog
    And I press Escape in the "Upload in progress" dialog
    Then the "Upload in progress" dialog should not be shown

  Scenario: A text the dialog does not show
    Fails with: Expected the "Newsletter" dialog to show "Goodbye", but it does not.
    Given I am on "/modal.html"
    When I open the "Newsletter" dialog
    Then the "Newsletter" dialog should show "Goodbye"

  Scenario: A button in a dialog that is not open
    Fails with: Could not press "Subscribe" in the "Newsletter" dialog: it is closed
    Given I am on "/modal.html"
    When I press "Subscribe" in the "Newsletter" dialog

  Scenario: A button the dialog does not have
    Fails with: Expected a button or link named "Unsubscribe" in the "Newsletter" dialog, but there is none that is visible.
    Given I am on "/modal.html"
    When I open the "Newsletter" dialog
    And I press "Unsubscribe" in the "Newsletter" dialog

  Scenario: A closed side panel is not shown
    Fails with: Expected the "Cart" side panel to be shown, but it is closed
    Given I am on "/offcanvas.html"
    Then the "Cart" side panel should be shown

  Scenario: A side panel closes with a click outside
    Fails with: Expected the "Help" side panel to be shown, but it is closed
    Given I am on "/offcanvas.html"
    When I open the "Help" side panel
    And I click outside the "Help" side panel
    Then the "Help" side panel should be shown

  Scenario: A menu item that is not disabled
    Fails with: Expected "Settings" to be disabled in the "Account" drop-down menu, but it is not disabled.
    Given I am on "/dropdown.html"
    Then "Settings" should be disabled in the "Account" drop-down menu

  Scenario: A disabled item cannot be chosen
    Fails with: Could not choose "Billing" from the "Account" drop-down menu: the item is disabled.
    Given I am on "/dropdown.html"
    When I choose "Billing" from the "Account" drop-down menu

  Scenario: An item the menu does not have
    Fails with: Expected an item "Logout" in the "Account" drop-down menu, but there is none.
    Given I am on "/dropdown.html"
    When I choose "Logout" from the "Account" drop-down menu

  Scenario: An open menu is shown
    Fails with: Expected no drop-down menu to be shown, but one is: "Account".
    Given I am on "/dropdown.html"
    When I open the "Account" drop-down menu
    Then no drop-down menu should be shown

  Scenario: A notification that stays does not hide by itself
    Fails with: Expected the "A new version is ready to install." notification to hide by itself, but it stays until it is closed.
    Given I am on "/notification.html"
    When I press "Check for updates"
    Then the "A new version is ready to install." notification should hide by itself

  Scenario: A notification of another kind
    Fails with: Expected a danger notification "The settings were saved.", but there is none.
    Given I am on "/notification.html"
    When I press "Save the settings"
    Then I should see an error notification "The settings were saved."

  Scenario: A tooltip that is not shown
    Fails with: Expected a tooltip named "Saves the draft without publishing it" on the page, but there is none.
    Given I am on "/tooltip.html"
    Then the "Saves the draft without publishing it" tooltip should be shown

  Scenario: A button that is not on the page cannot be pointed at
    Fails with: Expected a button named "Publish" to hover over, but there is none that is visible.
    Given I am on "/tooltip.html"
    When I hover over the "Publish" button
