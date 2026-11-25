@lightbox
Feature: The lightbox
  A click on a picture of a gallery opens it larger over the page; its picture slides in after the
  lightbox says it is open, and slides along to the next one.

  Background:
    Given I am on "/lightbox.html"

  @critical
  Scenario: A picture opens in the lightbox and the arrows go through the gallery
    When I open the lightbox from the "The market on Saturday" picture
    Then the lightbox should be shown
    And the lightbox should show picture 2 of 4
    And the lightbox should show "The market on Saturday"
    When I go to the next picture of the lightbox
    Then the lightbox should show picture 3 of 4
    And the lightbox should show "The old bridge"
    And the lightbox should not show "The harbour at dawn"
    When I go to the previous picture of the lightbox
    Then the lightbox should show picture 2 of 4
    When I close the lightbox
    Then the lightbox should not be shown
