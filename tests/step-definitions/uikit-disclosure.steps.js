'use strict';

// Panels (the items of an accordion, and any block a toggle button shows and hides), the
// navigation bar that hides its links behind a toggle button on a narrow screen, and tabs (tabs and
// switchers, and the tabs a server renders as links).
//
// A panel is named by its title in an accordion, or by the button that shows it (or the block's
// own label or id); a navigation bar by its aria-label or its logo (no name: the first one on the
// page); a tab by its label. A panel waits for `shown` / `hidden` and for its height transition to
// end; a tab waits for its content to have faded in.

const { When, Then } = require('@cucumber/cucumber');
const h = require('./uikit-helpers');

async function waitPanel(world, ref, expanded) {
  return h.poll(world, (lib, a) => {
    const s = lib.state('panel', a.ref);
    const done = a.expanded ? lib.isShown('panel', a.ref) : lib.isClosed('panel', a.ref);
    return { done, state: s };
  }, { ref, expanded }, h.budget(world));
}

/**
 * Expand or collapse a panel: an item of an accordion, any block a toggle button shows and hides.
 * The step clicks the title (or the button) the panel is named after when the panel is not already
 * as wanted, then waits for `shown` / `hidden` and for its height transition or its animation to
 * end. In an accordion that keeps one item open, expanding an item collapses the one that was open,
 * and the step waits for that too.
 *
 * Example #1: When I expand the "Returns" panel
 * Example #2: When I collapse the "Shipping" panel
 * Example #3: When I expand the "More details" panel
 * Example #4: When I expand the "Privacy" panel
 * Example #5: When we collapse the "Payment" panel
 */
When(/^(?:I |we )?(expand|collapse) the "([^"]*)" panel$/, async function (action, name) {
  const ref = await h.resolve(this, 'panel', name);
  const want = action === 'expand';
  // A panel still moving is let finish first: its button is ignored until then.
  await h.poll(this, (lib, a) => ({ done: lib.state('panel', a.ref).settled }), { ref }, h.budget(this));
  const already = await h.call(this, want ? 'isShown' : 'isClosed', 'panel', ref);
  if (!already) {
    const before = await h.eventSeq(this);
    const clickable = await this.page.evaluate((r) => {
      const lib = window.__webshipUikit.lib;
      const el = lib.deref(r);
      const title = el.matches('.uk-accordion > *') ? el.querySelector('.uk-accordion-title') : el;
      return lib.ref(title || el);
    }, ref);
    await h.clickRef(this, clickable, `the "${name}" title`);
    const result = await waitPanel(this, ref, want);
    if (!result.done) {
      const events = await h.eventsSince(this, before);
      throw h.failure(this.page, `Expected the "${name}" panel to be ${want ? 'expanded' : 'collapsed'} after clicking its button, but it is ${h.describe(result.state)}.`, {
        found: events.length ? `the component events since the click: ${events.join(', ')}` : 'no component event since the click',
        hint: 'check that the page loads the components script ("the page should use the components script"); an accordion that must keep one item open does not let its only open item collapse.',
      });
    }
  }
  // An accordion closes its other item in the same transition.
  await h.waitAllSettled(this);
});

/**
 * A panel is expanded (its content shown, `shown` come and its transition over) or collapsed
 * (hidden, `hidden` come and its transition over).
 *
 * Example #1: Then the "Shipping" panel should be expanded
 * Example #2: Then the "Returns" panel should be collapsed
 * Example #3: Then the "More details" panel should be expanded
 * Example #4: Then the "Language" panel should be collapsed
 * Example #5: Then the "Payment" panel should be collapsed
 */
Then(/^the "([^"]*)" panel should be (expanded|collapsed)$/, async function (name, wanted) {
  const ref = await h.resolve(this, 'panel', name);
  const result = await waitPanel(this, ref, wanted === 'expanded');
  if (!result.done) {
    throw h.failure(this.page, `Expected the "${name}" panel to be ${wanted}, but it is ${h.describe(result.state)}.`, {
      hint: wanted === 'expanded' ? `expand it first: When I expand the "${name}" panel` : `collapse it first: When I collapse the "${name}" panel`,
    });
  }
});

async function resolveNavbar(world, name) {
  const result = await h.poll(world, (lib, a) => {
    const all = lib.navbars();
    if (!a.name) {
      const shown = all.find(lib.isRendered);
      return { done: !!shown, ref: shown ? lib.ref(shown) : 0, names: all.map((n) => lib.navbarNames(n).find(Boolean) || '') };
    }
    const { matches, names } = lib.pick(all, a.name, (n) => lib.navbarNames(n));
    return { done: matches.length > 0, ref: matches.length ? lib.ref(matches[0]) : 0, names };
  }, { name: name || '' }, h.budget(world));
  if (result.ref) return result.ref;
  throw h.failure(world.page, name ? `Expected a navigation bar named "${name}" on the page, but there is none.` : 'Expected a navigation bar on the page, but there is none that is visible.', {
    found: `the navigation bars here: ${h.listed(result.names)}`,
    hint: 'a navigation bar is named by its aria-label (or that of the nav around it) or its logo.',
  });
}

async function waitNavbar(world, ref, expanded) {
  return h.poll(world, (lib, a) => {
    const s = lib.navbarState(a.ref);
    return { done: s.exists && s.settled && s.expanded === a.expanded, state: s };
  }, { ref, expanded }, h.budget(world));
}

function navbarLabel(name) {
  return name ? `the "${name}" navigation bar` : 'the navigation bar';
}

/**
 * Expand or collapse a navigation bar with its toggle button, on a screen narrow enough for the
 * bar to hide its links behind it, and wait until its links are shown and have stopped moving (the
 * side panel or the dialog the button opens, or the block it shows: `shown` / `hidden` and the end
 * of their transitions). Links in a side panel close with the panel's close button, which covers
 * the toggle button. Without a name, the first navigation bar on the page. At a width where the
 * bar shows its links, expanding does nothing and collapsing fails.
 *
 * Example #1: When I expand the navigation bar
 * Example #2: When I collapse the navigation bar
 * Example #3: When I expand the "Shop" navigation bar
 * Example #4: When I collapse the "Shop" navigation bar
 * Example #5: When we expand the "Main" navigation bar
 */
When(/^(?:I |we )?(expand|collapse) the (?:"([^"]*)" )?navigation bar$/, async function (action, name) {
  const ref = await resolveNavbar(this, name);
  const want = action === 'expand';
  const now = await h.call(this, 'navbarState', ref);
  if (!now.collapsible) {
    if (want) return;
    const width = await this.page.evaluate(() => window.innerWidth);
    throw h.failure(this.page, `Could not collapse ${navbarLabel(name)}: at ${width} pixels it shows its links and its toggle button is hidden.`, {
      hint: 'make the window narrow first: When I set the viewport to the "xs" breakpoint',
    });
  }
  const settled = await waitNavbar(this, ref, now.expanded);
  if (settled.done && settled.state.expanded === want) return;
  if (!want && now.panel) {
    // The links are in the side panel (or the dialog) the button opened, over the button: they
    // close with the panel's own close button, or with Escape.
    const closer = await this.page.evaluate((r) => {
      const lib = window.__webshipUikit.lib;
      const toggle = lib.deref(lib.navbarState(r).toggle);
      const target = toggle ? lib.toggleTargets(toggle)[0] : null;
      if (!target) return 0;
      const kind = target.matches('.uk-modal') ? 'dialog' : 'side panel';
      const button = lib.kinds[kind].dismiss(target).find(lib.isRendered);
      return button ? lib.ref(button) : 0;
    }, ref);
    if (closer) await h.clickRef(this, closer, `the close button of the links of ${navbarLabel(name)}`);
    else await this.page.keyboard.press('Escape');
  } else {
    await h.clickRef(this, now.toggle, `the toggle button of ${navbarLabel(name)}`);
  }
  const result = await waitNavbar(this, ref, want);
  if (!result.done) {
    throw h.failure(this.page, `Expected ${navbarLabel(name)} to be ${want ? 'expanded' : 'collapsed'} after clicking its toggle button, but it is ${result.state.expanded ? 'expanded' : 'collapsed'}${result.state.settled ? '' : ' and still moving'}.`, {
      hint: 'check that the page loads the components script ("the page should use the components script").',
    });
  }
});

/**
 * A navigation bar is expanded (its links are shown: either it is wide enough to show them, or its
 * toggle button has opened them and they have stopped moving) or collapsed (its toggle button is
 * shown and its links are hidden). Without a name, the first navigation bar on the page.
 *
 * Example #1: Then the navigation bar should be collapsed
 * Example #2: Then the navigation bar should be expanded
 * Example #3: Then the "Shop" navigation bar should be collapsed
 * Example #4: Then the "Main" navigation bar should be expanded
 * Example #5: Then the "Help center" navigation bar should be expanded
 */
Then(/^the (?:"([^"]*)" )?navigation bar should be (expanded|collapsed)$/, async function (name, wanted) {
  const ref = await resolveNavbar(this, name);
  const result = await waitNavbar(this, ref, wanted === 'expanded');
  if (!result.done) {
    const width = await this.page.evaluate(() => window.innerWidth);
    throw h.failure(this.page, `Expected ${navbarLabel(name)} to be ${wanted}, but it is ${result.state.expanded ? 'expanded' : 'collapsed'}${result.state.settled ? '' : ' and still moving'} at ${width} pixels.`, {
      found: `its toggle button is ${result.state.collapsible ? 'shown' : 'hidden'}`,
      hint: wanted === 'collapsed' && !result.state.collapsible ? 'a bar hides its links only below the width its toggle button shows at: When I set the viewport to the "xs" breakpoint' : `use its toggle button: When I ${wanted === 'expanded' ? 'expand' : 'collapse'} ${navbarLabel(name)}`,
    });
  }
});

/**
 * A navigation bar shows its toggle button (the window is narrower than the width it hides its
 * links at, so its links are behind the button), or does not (it shows its links). Without a name,
 * the first navigation bar on the page.
 *
 * Example #1: Then the navigation bar should show its toggle button
 * Example #2: Then the navigation bar should not show its toggle button
 * Example #3: Then the "Shop" navigation bar should show its toggle button
 * Example #4: Then the "Main" navigation bar should not show its toggle button
 * Example #5: Then the "Help center" navigation bar should not show its toggle button
 */
Then(/^the (?:"([^"]*)" )?navigation bar should( not)? show its toggle button$/, async function (name, not) {
  const ref = await resolveNavbar(this, name);
  const result = await h.poll(this, (lib, a) => {
    const s = lib.navbarState(a.ref);
    return { done: s.exists && s.collapsible === a.want, state: s };
  }, { ref, want: !not }, h.budget(this));
  if (!result.done) {
    const width = await this.page.evaluate(() => window.innerWidth);
    throw h.failure(this.page, `Expected ${navbarLabel(name)} ${not ? 'not ' : ''}to show its toggle button at ${width} pixels, but it ${result.state.collapsible ? 'does' : 'does not'}.`, {
      hint: 'the button shows below the width its classes name (uk-hidden@m: below 960 pixels); set the width with: When I set the viewport to the "xs" breakpoint',
    });
  }
});

/**
 * Switch to a tab (an item of a tab bar or of a switcher's navigation) by its label: click it and
 * wait until it is active and its content has faded in. A tab that is a link to another page (the
 * tabs a server renders) is followed, and the new page is waited for.
 *
 * Example #1: When I switch to the "Security" tab
 * Example #2: When I switch to the "Week" tab
 * Example #3: When I switch to the "Notifications" tab
 * Example #4: When I switch to the "Month" tab
 * Example #5: When we switch to the "Profile" tab
 */
When(/^(?:I |we )?switch to the "([^"]*)" tab$/, async function (name) {
  const ref = await h.resolve(this, 'tab', name);
  if (await h.call(this, 'isShown', 'tab', ref)) return;
  const info = await this.page.evaluate((r) => {
    const lib = window.__webshipUikit.lib;
    const li = lib.deref(r);
    const link = li.querySelector('a, button') || li;
    return {
      disabled: li.classList.contains('uk-disabled') || link.getAttribute('aria-disabled') === 'true' || link.hasAttribute('disabled'),
      scripted: !!li.closest('[uk-tab], [uk-switcher], [data-uk-tab], [data-uk-switcher]'),
      link: lib.ref(link),
    };
  }, ref);
  if (info.disabled) {
    throw h.failure(this.page, `Could not switch to the "${name}" tab: it is disabled.`, {
      hint: `check that it is not active instead: Then the "${name}" tab should not be active`,
    });
  }
  const url = this.page.url();
  await h.clickRef(this, info.link, `the "${name}" tab`);
  let target = ref;
  if (!info.scripted) {
    // A link to another page: the new page has its own tabs.
    if (typeof this.smartSettle === 'function') await this.smartSettle(1500);
    if (this.page.url() !== url) {
      await this.page.waitForLoadState('load').catch(() => {});
      target = await h.resolve(this, 'tab', name);
    }
  }
  const done = await h.waitShown(this, 'tab', target, true);
  if (done !== true) {
    throw h.failure(this.page, `Expected the "${name}" tab to be active after clicking it, but it is ${h.describe(done)}.`, {
      hint: 'check that the page loads the components script ("the page should use the components script").',
    });
  }
});

/**
 * A tab is active (`uk-active`, its content shown and done fading in) or not.
 *
 * Example #1: Then the "Profile" tab should be active
 * Example #2: Then the "Security" tab should not be active
 * Example #3: Then the "Billing" tab should not be active
 * Example #4: Then the "Day" tab should be active
 * Example #5: Then the "Week" tab should be active
 */
Then(/^the "([^"]*)" tab should( not)? be active$/, async function (name, not) {
  const ref = await h.resolve(this, 'tab', name);
  const done = await h.waitShown(this, 'tab', ref, !not);
  if (done === true) return;
  const others = await this.page.evaluate(() => {
    const lib = window.__webshipUikit.lib;
    return lib.kinds.tab.all().filter((t) => t.classList.contains('uk-active')).map((t) => lib.nameOf(t.querySelector('a, button') || t));
  });
  throw h.failure(this.page, `Expected the "${name}" tab ${not ? 'not ' : ''}to be active, but it ${not ? 'is' : 'is not'} (${h.describe(done)}).`, {
    found: `the active tabs: ${h.listed(others)}`,
    hint: not ? 'another tab becomes active when it is switched to.' : `switch to it first: When I switch to the "${name}" tab`,
  });
});
