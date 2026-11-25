@must-fail
Feature: Assertions on panels, the navigation bar and tabs that must fail
  Each scenario asserts something that is not true on the demo site, at its last step.

  Scenario: A collapsed panel is not expanded
    Fails with: Expected the "Returns" panel to be expanded, but it is closed
    Given I am on "/accordion.html"
    Then the "Returns" panel should be expanded

  Scenario: Expanding an item collapses the open one
    Fails with: Expected the "Shipping" panel to be expanded, but it is closed
    Given I am on "/accordion.html"
    When I expand the "Returns" panel
    Then the "Shipping" panel should be expanded

  Scenario: A panel that does not exist
    Fails with: Expected a panel named "Warranty" on the page, but there is none.
    Given I am on "/accordion.html"
    When I expand the "Warranty" panel

  Scenario: A text of another panel
    Fails with: Expected the "Shipping" panel to show "full refund", but it does not.
    Given I am on "/accordion.html"
    Then the "Shipping" panel should show "full refund"

  Scenario: A wide navigation bar does not collapse
    Fails with: Could not collapse the "Shop" navigation bar: at 1200 pixels it shows its links and its toggle button is hidden.
    Given I am on "/navbar.html"
    When I set the viewport to the "xl" breakpoint
    And I collapse the "Shop" navigation bar

  Scenario: A narrow navigation bar shows its toggle button
    Fails with: Expected the "Shop" navigation bar not to show its toggle button at 375 pixels, but it does.
    Given I am on "/navbar.html"
    When I set the viewport to the "xs" breakpoint
    Then the "Shop" navigation bar should not show its toggle button

  Scenario: A navigation bar that does not exist
    Fails with: Expected a navigation bar named "Footer" on the page, but there is none.
    Given I am on "/navbar.html"
    Then the "Footer" navigation bar should be expanded

  Scenario: The tab that is not active
    Fails with: Expected the "Security" tab to be active, but it is not
    Given I am on "/switcher.html"
    Then the "Security" tab should be active

  Scenario: A disabled tab cannot be switched to
    Fails with: Could not switch to the "Billing" tab: it is disabled.
    Given I am on "/switcher.html"
    When I switch to the "Billing" tab

  Scenario: The content of another tab
    Fails with: Expected the "Day" tab to show "85 orders", but it does not.
    Given I am on "/switcher.html"
    Then the "Day" tab should show "85 orders"
