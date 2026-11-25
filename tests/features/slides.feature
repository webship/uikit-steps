@slides
Feature: Slideshows and sliders
  A slideshow shows one slide at a time and pushes or fades from one to the next; a slider moves a
  row of cards along. The dots change at the start of a move: a test waits for the move to end.

  Background:
    Given I am on "/slideshow.html"

  @critical
  Scenario: The arrows of a slideshow
    Then the "Gallery" slideshow should show slide 1 of 3
    And the "Gallery" slideshow should show "The harbour at dawn"
    When I go to the next slide of the "Gallery" slideshow
    Then the "Gallery" slideshow should show slide 2 of 3
    And the "Gallery" slideshow should show "The market on Saturday"
    When I go to the previous slide of the "Gallery" slideshow
    Then the "Gallery" slideshow should show slide 1 of 3

  Scenario: A slide chosen with the dots, and the last slide leading back to the first
    When I go to slide 3 of the "Gallery" slideshow
    Then the "Gallery" slideshow should show "The old bridge"
    And the "Gallery" slideshow should not show "The harbour at dawn"
    When I go to the next slide of the "Gallery" carousel
    Then the "Gallery" carousel should show slide 1 of 3

  Scenario: A slideshow that plays by itself
    Then the "Highlights" slideshow should move to the next slide by itself

  Scenario: A slider moves a row of cards
    Given I am on "/slider.html"
    Then the "Products" slider should show slide 1 of 6
    And the "Products" slider should show "Pencil"
    And the "Products" slider should not show "Stapler"
    When I go to the next slide of the "Products" slider
    Then the "Products" slider should show slide 2 of 6
    When I go to slide 4 of the "Products" slider
    Then the "Products" slider should show "Stapler"
