@tabs
Feature: Tabs and switchers
  A tab shows its content and hides the others; a switcher's content fades in. A test waits for the
  content to have faded in.

  Background:
    Given I am on "/switcher.html"

  @critical
  Scenario: Tabs show one content at a time
    Then the "Profile" tab should be active
    And the "Profile" tab should show "Your name, your photo"
    When I switch to the "Security" tab
    Then the "Security" tab should be active
    And the "Profile" tab should not be active
    And the "Security" tab should show "Your password and the devices that are signed in."

  Scenario: A disabled tab is not active
    Then the "Billing" tab should not be active

  Scenario: A switcher fades its content in
    Then the "Day" tab should be active
    When I switch to the "Week" tab
    Then the "Week" tab should show "This week: 85 orders."
    When I switch to the "Month" tab
    Then the "Month" tab should be active
    And the "Week" tab should not be active
    And the "Profile" tab should be active
