@cms
Feature: The components on a site made with a CMS and a free theme
  The site of this lane is a Drupal 11 site whose default theme is the free theme UI Suite UIkit,
  built by .github/scripts/build-drupal-site.sh: the theme's own navigation bar (its drop-down menu
  under the pointer, and its side panel on a narrow screen), messages and pager, and a page of
  components an editor wrote with the framework's markup. The theme boosts its links with htmx: a
  link swaps the next page in without loading it, and the steps wait for the swap and for the
  framework to set the new page's components up. Nobody signs in.

  Scenario: The theme loads the components script
    Given I am on "/components"
    Then the page should use the components script at version "3"

  @critical
  Scenario: The navigation bar hides its links behind its toggle button on a narrow screen
    When I set the viewport to the "xs" breakpoint
    And I go to "/components"
    Then the navigation bar should show its toggle button
    And the navigation bar should be collapsed
    When I expand the navigation bar
    Then the navigation bar should be expanded
    And the "Main navigation" side panel should show "Services"
    When I collapse the navigation bar
    Then the navigation bar should be collapsed

  @critical
  Scenario: A link of the side panel's menu swaps the next page in, and its components work at once
    When I set the viewport to the "xs" breakpoint
    And I go to "/node"
    And I expand the navigation bar
    And I press "Services" in the "Main navigation" side panel
    Then I should be on "/components"
    When I open the "Opening hours" dialog
    Then the "Opening hours" dialog should show "Monday to Friday, from 9:00 to 17:00."

  Scenario: A choice of the drop-down menu swaps the next page in, and its components work at once
    Given I am on "/node"
    When I choose "Development" from the "Services" drop-down menu
    Then I should be on "/components"
    When I switch to the "Support" tab
    Then the "Support" tab should show "We answer within one working day."

  Scenario: On a wide window the drop-down menu opens under the pointer
    Given I am on "/components"
    Then the "Main navigation" navigation bar should not show its toggle button
    And the navigation bar should be expanded
    When I open the "Services" drop-down menu
    Then the "Services" drop-down menu should show "Development"

  @critical
  Scenario: A dialog an editor wrote in a page
    Given I am on "/components"
    When I open the "Opening hours" dialog
    Then the "Opening hours" dialog should show "Monday to Friday, from 9:00 to 17:00."
    When I press Escape in the "Opening hours" dialog
    Then no dialog should be shown

  Scenario: An accordion, tabs and a slideshow an editor wrote in a page
    Given I am on "/components"
    Then the "How long does delivery take?" panel should be expanded
    When I expand the "Can I return an item?" panel
    Then the "How long does delivery take?" panel should be collapsed
    And the "Can I return an item?" panel should show "within thirty days"
    When I switch to the "Support" tab
    Then the "Support" tab should show "We answer within one working day."
    And the "Design" tab should not be active
    When I go to the next slide of the "Projects" slideshow
    Then the "Projects" slideshow should show slide 2 of 3
    And the "Projects" slideshow should show "A shop"

  Scenario: A dismissible alert, and a form as the server sent it back
    Given I am on "/components"
    When I dismiss the alert "Our office is closed on public holidays."
    Then I should not see the alert "Our office is closed on public holidays."
    And the "Your email" field should be shown as invalid
    And the "Your email" field should show the message "Please enter a valid email address."
    And the "Your name" field should be shown as valid
    And 1 field should be shown as invalid

  @critical
  Scenario: The theme shows the site's messages as alerts
    Given I am on "/user/login"
    When I fill in "Username" with "nobody"
    And I fill in "Password" with "not-the-password"
    And I press "Log in"
    Then I should see an error alert "Unrecognized username or password."
    And the alert "Unrecognized username or password." should be dismissible
    And the "Username" field should be shown as invalid
    When I dismiss the alert "Unrecognized username or password."
    Then I should not see the alert "Unrecognized username or password."

  Scenario: The front page's pager
    Given I am on "/node"
    Then the current page of the "Pagination" pagination should be "1"
    And the "Next" link of the pagination should not be disabled
    When I go to "/node?page=1"
    Then the current page of the pagination should be "2"
