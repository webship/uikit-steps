@dialogs
Feature: Dialogs
  A dialog opens over the page: its overlay fades in and the dialog slides down into place, and
  only then does it take the keyboard focus. A test waits until that is over before it reads or
  clicks anything in it, and until the dialog has gone before it goes on with the page.

  Background:
    Given I am on "/modal.html"

  @critical
  Scenario: A dialog opens with its button and closes with its close button
    When I open the "Newsletter" dialog
    Then the "Newsletter" dialog should be shown
    And the "Newsletter" dialog should show "Get the news of the month in your mailbox"
    When I close the "Newsletter" dialog
    Then the "Newsletter" dialog should not be shown
    And no dialog should be shown

  Scenario: A dialog opened by another step is waited for, and its button closes it
    When I press "Subscribe to the newsletter"
    Then the "Newsletter" dialog should be shown
    When I fill in "Email address" with "reader@example.com"
    And I press "Subscribe" in the "Newsletter" dialog
    Then the "Newsletter" dialog should not be shown
    And I should see "Subscribed: reader@example.com."

  Scenario: Escape and a click outside close a dialog
    When I open the "Newsletter" dialog
    And I press Escape in the "Newsletter" dialog
    Then the "Newsletter" dialog should not be shown
    When I open the "Newsletter" dialog
    And I click outside the "Newsletter" dialog
    Then the "Newsletter" dialog should not be shown

  Scenario: A dialog set to stay open refuses Escape and a click outside
    When I open the "Upload in progress" dialog
    And I click outside the "Upload in progress" dialog
    Then the "Upload in progress" dialog should be shown
    When I press Escape in the "Upload in progress" dialog
    Then the "Upload in progress" dialog should be shown
    When I press "Done" in the "Upload in progress" dialog
    Then the "Upload in progress" dialog should not be shown

  Scenario: A long dialog with a header and a footer, opened with a named button
    When I open the "Terms of use" dialog with the "Read the terms" button
    Then the "Terms of use" dialog should show "That is all: accept the terms to go on."
    When I press "Accept" in the "Terms of use" dialog
    Then the "Terms of use" dialog should not be shown
    And I should see "The terms were accepted."

  Scenario: A question the page asks is a dialog too, named by the start of its text
    When I open the "Delete the file report.pdf?" dialog with the "Delete the file" button
    Then the "Delete the file report.pdf?" dialog should show "It cannot be brought back."
    When I press "Cancel" in the "Delete the file report.pdf?" dialog
    Then the "Delete the file report.pdf?" dialog should not be shown
    And I should see "Nothing was deleted."
    When I open the "Delete the file report.pdf?" dialog with the "Delete the file" button
    And I press "Ok" in the "Delete the file report.pdf?" dialog
    Then I should see "The file report.pdf was deleted."
