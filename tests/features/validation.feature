@validation
Feature: The states of a form
  A form sent with mistakes marks its fields invalid and says what is wrong; once corrected, it
  marks them valid.

  Background:
    Given I am on "/form.html"

  @critical
  Scenario: A form sent empty, then filled in
    When I press "Sign up"
    Then 3 fields should be shown as invalid
    And the "Email" field should be shown as invalid
    And the "Email" field should show the message "Type an address like name@example.com."
    When I fill in "Name" with "Rana"
    And I fill in "Email" with "rana@example.com"
    And I select "Team" from "Plan"
    And I press "Sign up"
    Then no field should be shown as invalid
    And the "Name" field should be shown as valid
    And I should see "Welcome, Rana!"
