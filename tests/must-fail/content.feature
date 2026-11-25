@must-fail
Feature: Assertions on slideshows, the lightbox, menus, pagination, sticky elements and filters that must fail
  Each scenario asserts something that is not true on the demo site, at its last step.

  Scenario: A slideshow on another slide
    Fails with: Expected the "Gallery" slideshow to show slide 2 of 3, but it shows slide 1 of 3.
    Given I am on "/slideshow.html"
    Then the "Gallery" slideshow should show slide 2 of 3

  Scenario: A slide that does not exist
    Fails with: Could not go to slide 7 of the "Gallery" slideshow: it has 3 slides.
    Given I am on "/slideshow.html"
    When I go to slide 7 of the "Gallery" slideshow

  Scenario: A slider at its end has no next arrow
    Fails with: Could not go to the next slide of the "Products" slider: it has no visible next arrow
    Given I am on "/slider.html"
    When I go to slide 4 of the "Products" slider
    And I go to the next slide of the "Products" slider

  Scenario: The lightbox on another picture
    Fails with: Expected the lightbox to show picture 3 of 4, but it is on picture 2 of 4
    Given I am on "/lightbox.html"
    When I open the lightbox from the "The market on Saturday" picture
    Then the lightbox should show picture 3 of 4

  Scenario: The lightbox is not open
    Fails with: Expected the lightbox to be shown, but it is not open.
    Given I am on "/lightbox.html"
    Then the lightbox should be shown

  Scenario: A menu item that is not active
    Fails with: Expected the menu item "Reports" to be active, but it is not active.
    Given I am on "/content.html"
    Then "Reports" should be active in the menu

  Scenario: The current page of the pagination
    Fails with: Expected the current page of the pagination to be "2", but it is "1".
    Given I am on "/content.html"
    Then the current page of the pagination should be "2"

  Scenario: A badge the button does not show
    Fails with: Expected the "Messages" button to show the badge "6", but it shows another.
    Given I am on "/content.html"
    Then the "Messages" button should show the badge "6"

  Scenario: The trail of the breadcrumb
    Fails with: Expected the breadcrumb to read "Home > Notebooks", but it reads "Home > Products > Notebooks".
    Given I am on "/content.html"
    Then the breadcrumb should read "Home > Notebooks"

  Scenario: A menu that does not stick before the page scrolls
    Fails with: Expected the "Section menu" to stick to the top of the window, but it does not
    Given I am on "/sticky.html"
    Then the "Section menu" should stick to the top of the window

  Scenario: A filtered list hides the other items
    Fails with: Expected the "Colours" list to show "Pen", but it does not.
    Given I am on "/filter.html"
    When I filter the "Colours" list by "Red"
    Then the "Colours" filtered list should show "Pen"

  Scenario: The components script at another version
    Fails with: Expected the page to use the components script at version 2, but it uses 3.25.31.
    Given I am on "/index.html"
    Then the page should use the components script at version "2"
