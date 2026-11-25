<p align="center"><img src="https://raw.githubusercontent.com/webship/uikit-steps/2.0.x/assets/logo.svg" alt="UIkit logo" width="96"></p>

# uikit-steps

Cucumber step definitions for the components of any site built on UIkit, for
[webship-js](https://webship.co/docs/webship-js/2.0.x), a BDD browser automation harness built on Playwright and
Cucumber-js.

`@webship-js/uikit-steps` works on any site whose theme is built on UIkit 3, whatever its CMS or framework: dialogs
(modals), side panels (offcanvas), drop-down menus and drops, accordions and the blocks a toggle button shows, tabs
and switchers, the navigation bar that hides its links behind a toggle button on a narrow screen, alerts,
notifications, tooltips, slideshows and sliders, the lightbox, a menu that sticks to the top of the window and marks
the section on the screen, a list with a filter, the states of a form, pagination, breadcrumbs, badges, spinners and
progress bars.

The point of the pack is the waits. A component that opens or closes moves for a few hundred milliseconds: a dialog
fades and slides down, an accordion item grows, a side panel slides in or pushes the page aside, a drop-down menu
fades in, a slideshow slides, a notification fades. Every step waits on the component's own signals: its events
(`shown`, `hidden`, `itemshown`, `afterFilter` ...), the classes it carries while it moves (`uk-togglable-enter`,
`uk-togglable-leave`, `uk-transition`, `uk-animation-enter` ...) and the CSS transitions and animations still running
in it. No step sleeps for a fixed time.

No step phrase names the framework: a scenario reads `When I open the "Newsletter" dialog`, `Then the "Shipping"
panel should be expanded` and `When I choose "Oldest first" from the "Sort by" drop-down menu`.

CI serves the pack's demo site (`demo-site/`, its markup from the framework's own test pages) with DDEV on the runner
and runs the whole suite against it twice, then the assertions that must fail; and it builds a real Drupal site with
the free theme UI Suite UIkit, whose links swap the next page in with htmx, and runs the pack's steps there twice,
checking after each run that the site holds what it held; see
[`.github/workflows/test.yml`](.github/workflows/test.yml).

## From nothing to a green run

What the machine needs: git, Node.js 24 or later with npm, and Docker with [DDEV](https://ddev.com) for the demo
site (or no container at all: `npx http-server` serves the same pages).

**1. A site.** Any site that uses the components works (step 5 points the suite at it). To start, use the demo site
of this repository: static pages, one per component, with the markup of the framework's own test pages of version
3.25.31. Start it with DDEV:

```bash
git clone https://github.com/webship/uikit-steps.git
cd uikit-steps/demo-site
ddev start
```

The site answers at `http://uikit-steps-demo.ddev.site`. Without DDEV, from the `uikit-steps` folder, `npx --yes
http-server@14.1.1 demo-site -p 8080 -s` serves it at `http://127.0.0.1:8080`; leave it running in its own terminal.

In the [Webship Workspace](https://github.com/webship/workspace), its UIkit plugin serves the same demo site in a
container instead, in a sites folder of the workspace (`dev/` here; `test/`, `sandboxes/` and `demos/` work the
same):

```bash
bash core/scripts/plugins.sh --require uikit --with-needs
bash core/scripts/plugins.sh --activate uikit --with-needs
bash core/scripts/plugins.sh --install uikit
bash dev/cmd-uikit-project.sh uksite --install
```

That site answers at `https://uksite.ddev.site`. Neither site has accounts: the steps need none.

**2. A test project**, in another folder:

```bash
mkdir uikit-tests && cd uikit-tests
npm init -y
npm install --save-dev webship-js @webship-js/uikit-steps
npx init-webship-js
```

`npx init-webship-js` writes `cucumber.js`, `playwright.config.ts`, the `tests/` folders with a first feature and
the `npm test` scripts, and installs Chromium. npm usually runs it already when it installs webship-js; a second run
changes nothing.

**3. `cucumber.js`.** Replace the file with the wiring of the pack: the step files of webship-js and of the pack, the
tags that keep the lanes of this repository out of a normal run, and the address of the site. The suite needs no
account.

```javascript
module.exports = {
  default: {
    requireModule: ['tsx/cjs'],
    require: [
      'node_modules/webship-js/tests/step-definitions/**/*.js',
      'node_modules/@webship-js/uikit-steps/tests/step-definitions/*.js',
      'tests/step-definitions/**/*.js',
    ],
    paths: ['tests/features/**/*.feature'],
    // Work in progress and the assertions that must fail stay out of a normal run.
    tags: 'not @wip and not @must-fail',
    format: ['@cucumber/pretty-formatter', 'json:tests/reports/cucumber_report.json'],
    worldParameters: {
      launchUrl: process.env.LAUNCH_URL || 'http://uikit-steps-demo.ddev.site',
      // Browser errors are reported, not failed: the demo site raises none.
      javascript: { mode: 'warn', levels: ['error'] },
      // The waits webship-js adds around each page, scenario and step (milliseconds).
      minWaitTime: { page: 3000, before_scenario: 0, after_scenario: 0, before_step: 0, after_step: 0 },
    },
  },
};
```

**4. A first feature**, `tests/features/first-run.feature`:

```gherkin
Feature: First run
  Scenario: A dialog opens, shows its text and closes
    Given I am on "/modal.html"
    When I open the "Newsletter" dialog
    Then the "Newsletter" dialog should show "Get the news of the month in your mailbox"
    When I close the "Newsletter" dialog
    Then no dialog should be shown

  Scenario: Opening an accordion item closes the one that was open
    Given I am on "/accordion.html"
    When I expand the "Returns" panel
    Then the "Returns" panel should be expanded
    And the "Shipping" panel should be collapsed
```

**5. Run it.** Set `LAUNCH_URL` to the address of the site: `http://uikit-steps-demo.ddev.site` for the demo started
with DDEV, `http://127.0.0.1:8080` for the one `npx http-server` serves, and `https://uksite.ddev.site` for the
Workspace's.

```bash
LAUNCH_URL=http://uikit-steps-demo.ddev.site npm test
```

A green first run prints every step, then the summary (the starter feature of `npx init-webship-js` and the two
scenarios above, passed) and the HTML report it wrote:

```
3 scenarios (3 passed)
11 steps (11 passed)
0m03.606s (executing steps: 0m03.572s)
[webship-js] HTML report → …/uikit-tests/tests/reports/cucumber_report.html
```

From there, copy the features of [`tests/features/`](tests/features/) (they also ship in the package, under
`node_modules/@webship-js/uikit-steps/tests/features/`): together they use every step of the pack, against the pages
of the demo site.

### On a site of your own

The steps read the components' standard markup, so the features of your site name its own components: the titles of
its dialogs and side panels, the buttons of its menus, the titles of its accordions. Point `LAUNCH_URL` at the site
and write them from what its pages show. A page whose theme loads only the style sheet and not the components script
has dialogs and menus that never open: `Then the page should use the components script` says so first.

In the Webship Workspace, any project with a testing setup takes the pack beside its platform's own (the Drupal,
WordPress, Joomla ... step packs): the pack goes in the same profile, since none of its phrases is shared with them
(see [Phrases shared with other packs](#phrases-shared-with-other-packs)).

```bash
bash dev/cmd-tools-testing.sh mysite --add-steps uikit
```

### What the suite tests

The features of this repository run every step of the pack against the demo site, in CI on every change: dialogs
(opened with their button or by another step, closed with their close button, Escape and a click outside, one set to
stay open that refuses both, a long dialog with a header and a footer opened with a named button, a question the page
asks named by the start of its text), side panels (from the left and from the right, one that pushes the page aside
with a button in it, one that reveals under the page, closed with their close button, Escape and a click outside),
drop-down menus and drops (opened and closed with their button, the active and disabled items, a choice that changes
the page, Escape and a click outside, a menu that opens under the pointer, a drop with content of its own),
the navigation bar at a wide and a narrow width (its toggle button and the side panel it opens, two bars on one page,
the drop-down menus of a bar, a choice that takes to another page), accordions (one that closes the open item and one
that does not, an item closed with its own title) and a block a toggle button shows, tabs and switchers (the content
of each tab, a disabled tab, a switcher that fades its content in), alerts (each kind, dismissing, one without a
close button), notifications (hiding by themselves, of another kind, one that stays until it is closed), tooltips
(on hover, on a link, placed below, gone when the pointer leaves), slideshows (the arrows, the dots, the last slide
leading back to the first, one that plays by itself) and a slider that moves a row of cards, the lightbox (opened
from a picture of a gallery, its arrows, its caption, closed), a menu that sticks to the top of the window and marks
the section on the screen, a list with a filter, the states of a form sent empty and then filled in, pagination,
breadcrumbs, the items of a menu, badges, a spinner while a list loads and a progress bar during an upload.

The features of [`tests/cms/`](tests/cms/) run on the Drupal site of CI: the theme's own navigation bar (its
drop-down menu under the pointer on a wide window, its side panel on a narrow one), its messages and its pager, a
link of the side panel's menu and a choice of the drop-down menu that swap the next page in with htmx followed by a
component of the new page, and a page of components an editor wrote with the framework's markup (a dialog, an
accordion, tabs, a slideshow, a dismissible alert, a form as the server sent it back).

Not tested: the components without a state to wait for (grids, cards, icons, covers, videos and the other layout
and style components), countdowns, sortable lists, uploads, parallax, the smooth scrolling of `uk-scroll` and the
lazy loading of images.

## Requirements

- Node.js 24 or later
- A webship-js 2.0 test project (webship-js 2.0.16 or later)
- A site that uses the components of UIkit 3, with their script

## Install

```bash
npm install --save-dev @webship-js/uikit-steps
```

## Quick start

1. Add the step files to the `require` list of your webship-js `cucumber.js`, after webship-js's own:

   ```javascript
   require: [
     'node_modules/webship-js/tests/step-definitions/**/*.js',
     'node_modules/@webship-js/uikit-steps/tests/step-definitions/*.js',
     'tests/step-definitions/**/*.js',
   ],
   ```

2. Point `launchUrl` at the site:

   ```javascript
   worldParameters: {
     launchUrl: process.env.LAUNCH_URL || 'https://your-site.example.com',
   },
   ```

3. Write a feature from what your pages show:

```gherkin
Feature: The account menu
  Scenario: The account menu leads to the profile
    Given I am on "/"
    When I choose "Profile" from the "Account" drop-down menu
    Then I should be on "/user/profile"
```

Run `npx cucumber-js --dry-run` once: it reports any undefined or ambiguous step before a browser opens.

## Test users

None. The demo site is static and has no sign-in, and nobody signs in on the Drupal site of CI; the steps need no
account on any site (log in with your platform's own step pack when a page needs it). `cucumber.js` lists no accounts
and no scenario signs in:

```json
{}
```

## What is included

| File | Steps | Covers |
| --- | --- | --- |
| `uikit-overlays.steps.js` | 12 | Dialogs, side panels, drop-down menus and drops, notifications and tooltips: open (with their own button or a named one), close, Escape, a click outside, shown or not, what they show, a button pressed in one, an item chosen from a menu, the active and disabled items of a menu, a hint on hover, none of a kind shown, and the wait for every component to stop moving. |
| `uikit-disclosure.steps.js` | 7 | Panels: accordion items and the blocks a toggle button shows (expand, collapse, their state); the navigation bar (expand, collapse, its state, its toggle button); tabs and switchers (switch to one, active or not). |
| `uikit-feedback.steps.js` | 9 | Alerts (of a kind, dismissed, dismissible), notifications (of a kind, hiding by themselves), loading spinners (shown, gone), progress bars (at a value, reaching one). |
| `uikit-slides.steps.js` | 11 | Slideshows and sliders: the next and the previous slide, a slide by its number, the slide shown, what it shows, one that moves on by itself. The lightbox: opened from a picture, the next and the previous picture, the picture shown, what it shows, closed, shown or not. |
| `uikit-forms.steps.js` | 3 | A field shown as valid or invalid, the message beside it, how many fields are invalid. |
| `uikit-content.steps.js` | 10 | The active and disabled items of a menu, the current page of a pagination or a breadcrumb, the disabled links of a pagination, a breadcrumb's trail, badges, an element that sticks to the top of the window, a list with a filter (filtered, what it shows, how many items), and the components script the page loads. |
| `uikit-helpers.js` | | Shared plumbing for the files above and for your own steps: the wait budgets, the poll on the page, finding a component by the name a person reads, waiting for it to be shown or closed and done moving, the wait for a page htmx swaps in, clicks, Escape, a click outside, the failure messages. It registers no step. |
| `uikit-probe.js` | | The page side: put into every page before its own scripts, it records the components' events and reads their states (and, on a page that uses htmx, its requests and swaps). It registers no step. |

Text, links, buttons, the plain filling of fields, the keyboard, the viewport, scrolling and the accessibility audit
are webship-js's own steps (`I should see "..."`, `I press "..."`, `I fill in "..." with "..."`, `I press the key
"ArrowDown"`, `I set the viewport to the "xs" breakpoint`, `I scroll down 800`, `the page should have no serious
accessibility violations`): this pack adds only the components, their states and their waits.

## How the steps find things and wait

- **By what a person reads.** A dialog by its title (its `aria-labelledby`, its `.uk-modal-title` or its first
  heading; a question the page asks, which has no title, by the start of its text), a side panel by the heading of
  its bar (or its `aria-label`), a drop-down menu or a drop by its button, a panel by its accordion title or by the
  toggle button that shows it, a tab by its label, a notification by its text, a tooltip by its text, a slideshow or
  a slider by its `aria-label` (or the heading before it, or its id), a picture of the lightbox by its caption or the
  `alt` of its image, a navigation bar by its `aria-label` or its logo, a field by its label, a pagination or a
  breadcrumb by the `aria-label` of its `nav`, a list with a filter by its `aria-label` or the heading before it, an
  element that sticks by its `aria-label`, the `aria-label` of the menu in it or its heading. A name matches exactly,
  then without regard to case, then by its start. The stable hooks of the components are the fallback: `uk-toggle`,
  `aria-controls`, the ids, the state classes (`uk-open`, `uk-active`, `uk-disabled`).
- **On the components' own signals.** Each component has a start event and an end event: `show` / `shown`, `hide` /
  `hidden`, `itemshow` / `itemshown`, `beforeFilter` / `afterFilter`. The page side of the pack listens for all of
  them from the first moment of every page, and a step waits until the end event has come, the classes of a
  component that moves (`uk-togglable-enter`, `uk-togglable-leave`, `uk-transition`, `uk-animation-enter`,
  `uk-slide-enter` ...) have gone and no CSS transition or animation is running in it (a spinner's endless rotation
  does not count).
- **Actions wait for the answer.** `When I press Escape in ...` and `When I click outside ...` wait for the component
  to close, or to stay (a dialog set with `esc-close: false` or `bg-close: false`), and to stop moving. Escape is
  pressed with the keyboard focus in the component, as a keyboard user's is.
- **No fixed sleeps.** A step waits at most `minWaitTime.page` (at least 10 seconds); a notification that hides by
  itself, a slideshow that moves on by itself, a spinner and a progress bar at most 30. The page is looked at every
  50 milliseconds from Node.js, never with a timer of the page (webship-js counts those as pending work).
- **Failures say what was found.** `Expected the "Upload in progress" dialog to be closed, but it is open, last event
  shown, classes "uk-modal uk-open" after 3 seconds.` with a hint on where to look.

### Notes on waits

What the framework does that a test must wait past, found by recording its events and classes in a real browser:

- **Some `shown` events come early.** A side panel that reveals under the page (`mode: reveal`) sends `shown` one
  millisecond after `show`, while the page's body goes on sliding aside for 300 milliseconds. The lightbox sends
  `shown` at once, and its picture slides in for about 620 milliseconds more (until `itemshown`). A drop-down menu of
  a navigation bar with a dropbar still carries `uk-transition` after its `shown`, while the dropbar grows to its
  height. The steps wait for the body, the picture and the dropbar too, not for `shown` alone.
- **A menu that opens under the pointer closes again on a click.** A drop-down menu with `mode: hover` opens when the
  pointer comes onto its button, and a click toggles it: a click after the hover closes it. A pointer that is already
  on the button sends no event at all, so nothing opens. `When I open the "..." drop-down menu` moves the pointer away
  first, then onto the button, waits a second for the menu, and clicks only when nothing has opened.
- **The side panel of a navigation bar covers its own toggle button.** On a narrow screen the toggle button opens the
  bar's links in a side panel, with an overlay over the rest of the page, the button included. `When I collapse the
  navigation bar` closes the panel with its own close button (or Escape when it has none), as a person does.
- **A theme can swap its pages in with htmx.** UI Suite UIkit boosts its links (`hx-boost`): a click on a link of its
  menus, the side panel's included, sends a request, swaps the content of the next page in and pushes its address,
  without a page load; the framework then sets up the components of the new nodes, and the ones the steps found
  before are gone. On a page that uses htmx, a step that clicks waits until no request of htmx is in flight
  (`htmx-request`), the swap has settled (`htmx-swapping`, `htmx-settling`, `htmx:afterSettle`) and every component
  of the new nodes is set up; a step that looks for a component waits for the same first. A page without htmx pays
  nothing for it.
- **A short notification can be gone before the next step.** webship-js's own steps let the page settle after a click
  (longer while a timer of the page is pending), so a notification that hides itself in less than about two seconds
  can be gone before `should be shown` looks. Assert that it hides by itself (`Then the "..." notification should
  hide by itself`), or give it a longer `timeout`.

## Steps

One example of each step; the JSDoc block above each definition holds five or more.

### `uikit-overlays.steps.js` (12)

- `When I open the "Newsletter" dialog`
- `When I close the "Newsletter" dialog`
- `When I press Escape in the "Newsletter" dialog`
- `When I click outside the "Newsletter" dialog`
- `Then the "Newsletter" dialog should be shown`
- `Then the "Newsletter" dialog should show "Get the news of the month in your mailbox"`
- `When I press "Subscribe" in the "Newsletter" dialog`
- `When I choose "Oldest first" from the "Sort by" drop-down menu`
- `Then "Profile" should be active in the "Account" drop-down menu`
- `When I hover over the "Save the draft" button`
- `Then no tooltip should be shown`
- `When I wait for the transitions to finish`

### `uikit-disclosure.steps.js` (7)

- `When I expand the "Returns" panel`
- `Then the "Shipping" panel should be expanded`
- `When I expand the navigation bar`
- `Then the navigation bar should be collapsed`
- `Then the navigation bar should show its toggle button`
- `When I switch to the "Security" tab`
- `Then the "Profile" tab should be active`

### `uikit-feedback.steps.js` (9)

- `Then I should see the alert "A new version of the guide is out."`
- `When I dismiss the alert "Your profile was updated."`
- `Then the alert "Your profile was updated." should be dismissible`
- `Then I should see a success notification "The settings were saved."`
- `Then the "The settings were saved." notification should hide by itself`
- `Then I should see a loading spinner`
- `When I wait for the loading spinner to disappear`
- `Then the "Upload" progress bar should be at 0%`
- `Then the "Upload" progress bar should reach 100%`

### `uikit-slides.steps.js` (11)

- `When I go to the next slide of the "Gallery" slideshow`
- `When I go to slide 3 of the "Gallery" slideshow`
- `Then the "Gallery" slideshow should show slide 1 of 3`
- `Then the "Gallery" slideshow should show "The harbour at dawn"`
- `Then the "Highlights" slideshow should move to the next slide by itself`
- `When I open the lightbox from the "The market on Saturday" picture`
- `When I go to the next picture of the lightbox`
- `Then the lightbox should show picture 2 of 4`
- `Then the lightbox should show "The market on Saturday"`
- `When I close the lightbox`
- `Then the lightbox should be shown`

### `uikit-forms.steps.js` (3)

- `Then the "Email" field should be shown as invalid`
- `Then the "Email" field should show the message "Type an address like name@example.com."`
- `Then 3 fields should be shown as invalid`

### `uikit-content.steps.js` (10)

- `Then "Overview" should be active in the menu`
- `Then the current page of the pagination should be "1"`
- `Then the "Previous" link of the pagination should be disabled`
- `Then the breadcrumb should read "Home > Products > Notebooks"`
- `Then the "Messages" button should show the badge "5"`
- `Then the "Section menu" should stick to the top of the window`
- `When I filter the "Colours" list by "Red"`
- `Then the "Colours" filtered list should show "Notebook"`
- `Then the "Colours" filtered list should show 2 items`
- `Then the page should use the components script`
## Phrases shared with other packs

None of this pack's phrases matches one of webship-js (`npm run test:examples` checks it). Loaded beside each of the
49 step packs published so far:

- **the Bootstrap pack** shares most of its phrases with this one, on purpose: the two packs speak of dialogs, side
  panels, drop-down menus, panels, tabs, alerts, notifications, slides, fields, pagination and breadcrumbs in the
  same words, so a feature reads the same on a site of either framework. A site is built on one of the two: load
  one of the two packs, not both.
- **the platform packs** (Drupal, WordPress, Joomla, Laravel ...) share none of its phrases, so the pack goes in the
  same profile as the platform's own pack, but for three phrases of the Webflow pack, whose sites run Webflow's own
  slider and lightbox rather than this framework's:

| Phrase of this pack | Also in |
| --- | --- |
| `I go to the next slide of the "…" slider` | webflow |
| `the "…" slider should show slide 2 of 6` | webflow |
| `I close the lightbox` | webflow |

## UIkit's own tests and this pack

UIkit keeps a test page for each component in its repository (`tests/*.html`, 86 pages in 3.25.31, MIT licence):
the pages its authors open in a browser to try a component in all its options. The demo site of this pack follows
their markup, with texts and pictures of its own, and the features of this pack check the same options through the
pages a person uses:

| UIkit's own test pages (3.25.31) | In this pack |
| --- | --- |
| `modal.html`: dialogs of each size, their close buttons, `esc-close` and `bg-close`, a long dialog, the dialogs the page asks with `UIkit.modal` | `dialogs.feature`: dialogs opened and closed in every way, one that stays open, a long one with a header and a footer, a question the page asks |
| `offcanvas.html`: the modes `slide`, `push`, `reveal` and `none`, the flipped panel, the overlay | `side-panels.feature`: a panel from each side, one that pushes the page aside, one that reveals under it, Escape, a click outside |
| `drop.html`, `dropdown.html`: click and hover modes, positions, the content of a drop | `menus.feature`: a menu opened with its button and under the pointer, its items' states, a choice, Escape, a click outside, a drop with content of its own |
| `navbar.html`, `dropbar.html`, `sticky-navbar.html`: the navigation bar, its drop-down menus and dropbar, its toggle | `navigation-bar.feature`: a bar at a wide and a narrow width, its toggle and side panel, its drop-down menus, several bars on one page |
| `accordion.html`, `toggle.html` | `panels.feature`: one open item at a time or several, an item closed with its own title, a block a toggle button shows |
| `tab.html`, `switcher.html`, `subnav.html` | `tabs.feature`: tabs and their content, a disabled tab, a switcher that fades its content in |
| `alert.html`, `close.html` | `alerts.feature`: each kind, a dismissible alert, one without a close button |
| `notification.html` | `notifications.feature`: hiding by themselves, the kinds, one that stays until it is closed |
| `tooltip.html` | `hints.feature`: on hover, on a link, placed below, gone when the pointer leaves |
| `slideshow.html`, `slider.html`, `dotnav.html`, `slidenav.html` | `slides.feature`: the arrows, the dots, from the last slide to the first, one that plays by itself, a slider that moves a row of cards |
| `lightbox.html` | `lightbox.feature`: a picture of a gallery opened, its arrows, its caption, closed |
| `sticky.html`, `scrollspy.html` | `sticky.feature`: a menu that sticks once the page scrolls past it and marks the section on the screen |
| `filter.html` | `filter.feature`: a list narrowed by a choice of its filter and shown in full again |
| `form.html` | `validation.feature`: a form sent empty, its fields shown as invalid with their messages, then filled in |
| `spinner.html`, `progress.html` | `loading.feature`: a spinner while a list loads, a progress bar during an upload |
| `pagination.html`, `breadcrumb.html`, `nav.html`, `badge.html` | `content.feature`: the current page and the disabled links of a pagination, a breadcrumb's trail, the active and disabled items of a menu, badges |

Not in this pack: the pages of the layout and style components (`grid.html`, `card.html`, `cover.html`,
`icon.html` and the others, which have no state to wait for), and `countdown.html`, `sortable.html`, `upload.html`,
`parallax.html`, `scroll.html`, `video.html` and `grid-masonry.html`.

## Testing this package

```bash
npm install
npm run demo:serve &       # the demo site at http://127.0.0.1:8080 (or: cd demo-site && ddev start)
npm run test:examples      # the examples and the features against the step patterns
npm run test:paths         # a feature or a scenario named on the command line runs alone
npx cucumber-js --dry-run  # no undefined and no ambiguous step
LAUNCH_URL=http://127.0.0.1:8080 npm test                 # the suite
LAUNCH_URL=http://127.0.0.1:8080 npm run test:must-fail   # assertions that must fail, each with its message
```

`tests/must-fail/` holds scenarios that assert something that is not true on the demo site. `npm run test:must-fail`
runs them and checks that each one fails at its last step, with the message it announces and a hint: a step that
cannot fail proves nothing. It runs them with a wait of 3 seconds (`COMPONENT_WAIT_MS`), since each of them waits its
whole budget.

`tests/cms/` holds the features of the real site of CI: a Drupal 11 site with the free theme UI Suite UIkit as its
default theme, built by [`.github/scripts/build-drupal-site.sh`](.github/scripts/build-drupal-site.sh) with a page of
components, twelve articles for the front page's pager and a main menu with a drop-down menu. The suite changes
nothing on the site; `COUNTS_ONLY=1` prints what it holds, before and after a run:

```bash
SITE_DIR="$PWD/../drupal-site" .github/scripts/build-drupal-site.sh
COUNTS_ONLY=1 SITE_DIR="$PWD/../drupal-site" .github/scripts/build-drupal-site.sh > counts-before.txt
LAUNCH_URL=https://uikitstepsdrupal.ddev.site npx cucumber-js tests/cms
COUNTS_ONLY=1 SITE_DIR="$PWD/../drupal-site" .github/scripts/build-drupal-site.sh | diff counts-before.txt -
```

`LAUNCH_URL` points the suite at another site; `npx cucumber-js tests/features/dialogs.feature` runs one feature and
`npx cucumber-js tests/features/dialogs.feature:<line>` one scenario (the line of its `Scenario:`); `FEATURES` runs a
subset too (`FEATURES=tests/features/dialogs.feature npm test`); `CUCUMBER_TAGS=@critical` runs the smoke lane;
`HEADLESS=false` shows the browser.

The suite leaves the site as it found it: the demo site is static, and every change a scenario makes lives in its own
browser.

## The demo site

[`demo-site/`](demo-site/) is a set of static pages, one per component, whose markup follows the framework's own test
pages of UIkit 3.25.31, with texts and pictures of the demo site's own so that every component has a name a person can
read, and a few small scripts that stand in for what a site does (a choice that changes the page, a list that takes
two seconds to load, an upload, the answer to a form). Each page loads the framework's own compiled files, kept
unchanged in `demo-site/vendor/uikit-3.25.31/`, and says where its markup comes from in its footer.

- UIkit's code and its test pages are released under the [MIT licence](https://github.com/uikit/uikit/blob/develop/LICENSE.md),
  copyright YOOtheme GmbH ([getuikit.com](https://getuikit.com)); its compiled files are in this repository with
  their `LICENSE.md` beside them.
- UIkit's documentation site carries no licence of its own: it was only read, to learn how the components are used,
  and nothing of it is in this repository.

## How the steps were written

Every component a step touches was opened in a real browser first, and its events and classes were recorded while it
moved: which event comes when, which classes it carries meanwhile, how long it moves, where the keyboard focus goes.
The steps were written from that, and are proven on UIkit 3.25.31 (the demo site) and on a Drupal 11 site with the
free theme UI Suite UIkit, which loads UIkit 3.25.22 and swaps its pages in with htmx, in English, with Chromium.

## License

MIT

## Logo

The UIkit logo in this README comes from Simple Icons 16.37.0 (its source: [getuikit.com](https://getuikit.com)),
filled with the colour the set lists for the brand; the set is CC0-1.0. The UIkit name and logo are trademarks of their
owner; this pack is not affiliated with or endorsed by them.
