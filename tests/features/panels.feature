@panels
Feature: Panels and accordions
  An accordion's item grows and shrinks; an accordion that keeps one item open closes the open one
  as another opens. A toggle button shows and hides a block with an animation. A test waits for
  the height and the animation to end.

  Background:
    Given I am on "/accordion.html"

  @critical
  Scenario: An accordion closes its open item when another opens
    Then the "Shipping" panel should be expanded
    And the "Returns" panel should be collapsed
    When I expand the "Returns" panel
    Then the "Returns" panel should be expanded
    And the "Returns" panel should show "Send an item back within thirty days for a full refund."
    And the "Shipping" panel should be collapsed

  Scenario: An item collapses with its own title
    When I expand the "Payment" panel
    And I collapse the "Payment" panel
    Then the "Payment" panel should be collapsed

  Scenario: An accordion that keeps several items open
    When I expand the "Privacy" panel
    And I expand the "Language" panel
    Then the "Privacy" panel should be expanded
    And the "Language" panel should be expanded

  Scenario: A toggle button shows a block
    Then the "More details" panel should be collapsed
    When I expand the "More details" panel
    Then the "More details" panel should be expanded
    And the "More details" panel should show "120 pages of recycled paper"
