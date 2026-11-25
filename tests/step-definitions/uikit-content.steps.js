'use strict';

// The states that content and navigation components carry: the active and disabled items of a
// menu (a nav list, a subnav, the links of a navigation bar, a section menu that follows the
// scroll), the current page and the disabled links of a pagination, the trail and the current page
// of a breadcrumb, the badges and labels of a button, a link, a heading, a menu item or a tab, an
// element that sticks to the top of the window, a list a filter narrows, and the components script
// the page loads.
//
// A pagination or a breadcrumb is named by the aria-label of its `nav`; without a name, the first
// one on the page. The breadcrumb's dividers are drawn by the style sheet, so a trail is written
// with any of ">", "/", "›" or "»" between its items.

const { When, Then } = require('@cucumber/cucumber');
const h = require('./uikit-helpers');

/**
 * An item of a menu (a nav list, a subnav, the links of a navigation bar, a section menu that marks
 * the section on the screen) is active (`uk-active`, `aria-current`) or disabled (`uk-disabled`,
 * `aria-disabled`), or not. The item is named by its text, without its badge. A section menu
 * follows the scroll: the step waits for it.
 *
 * Example #1: Then "Overview" should be active in the menu
 * Example #2: Then "Archive" should be disabled in the menu
 * Example #3: Then "Reports" should not be active in the menu
 * Example #4: Then "Pricing" should be active in the menu
 * Example #5: Then "Reports" should not be disabled in the menu
 */
Then(/^"([^"]*)" should( not)? be (active|disabled) in the menu$/, async function (name, not, wanted) {
  const result = await h.poll(this, (lib, a) => {
    const { matches, names } = lib.navItems(a.name);
    const hit = matches.find(lib.isRendered) || matches[0];
    if (!hit) return { done: false, names };
    const s = lib.itemState(lib.ref(hit));
    return { done: s[a.wanted] === !a.not, found: true, state: s, names };
  }, { name, wanted, not: !!not }, h.budget(this));
  if (result.done) return;
  if (!result.found) {
    throw h.failure(this.page, `Expected a menu item "${name}" on the page, but there is none that is visible.`, {
      found: `the menu items here: ${h.listed(result.names, 20)}`,
      hint: 'a menu item is named by its text, without its badge.',
    });
  }
  throw h.failure(this.page, `Expected the menu item "${name}" ${not ? 'not ' : ''}to be ${wanted}, but it is ${result.state[wanted] ? '' : 'not '}${wanted}.`, {
    found: `active: ${result.state.active ? 'yes' : 'no'}, disabled: ${result.state.disabled ? 'yes' : 'no'}`,
    hint: wanted === 'active' ? 'the active item carries the class "uk-active" (or aria-current on its link); a section menu marks the section on the screen once the scrolling has stopped.' : 'a disabled item carries the class "uk-disabled" (or aria-disabled="true" on its link).',
  });
});

async function resolveContainer(world, selector, name, noun) {
  const result = await h.poll(world, (lib, a) => {
    const { all, chosen } = lib.containerNamed(a.selector, a.name);
    const names = all.map((el) => { const nav = el.closest('nav') || el; return nav.getAttribute('aria-label') || ''; });
    return { done: !!chosen, ref: chosen ? lib.ref(chosen) : 0, names };
  }, { selector, name: name || '' }, h.budget(world));
  if (result.ref) return result.ref;
  throw h.failure(world.page, name ? `Expected a ${noun} named "${name}" on the page, but there is none.` : `Expected a ${noun} on the page, but there is none that is visible.`, {
    found: `the ${noun}s here: ${h.listed(result.names)}`,
    hint: `a ${noun} is named by the aria-label of its nav element.`,
  });
}

function label(noun, name) {
  return name ? `the "${name}" ${noun}` : `the ${noun}`;
}

/**
 * The current page of a pagination (its active item, `aria-current="page"`) or of a breadcrumb
 * (its last item, or the one with `aria-current="page"`) is the one named. Without a name, the
 * first pagination or breadcrumb on the page.
 *
 * Example #1: Then the current page of the pagination should be "1"
 * Example #2: Then the current page of the "Results pages" pagination should be "1"
 * Example #3: Then the current page of the breadcrumb should be "Notebooks"
 * Example #4: Then the current page of the "Breadcrumb" breadcrumb should be "Notebooks"
 * Example #5: Then the current page of the "Results pages" pagination should be "1"
 */
Then(/^the current page of the (?:"([^"]*)" )?(pagination|breadcrumb) should be "([^"]*)"$/, async function (name, noun, wanted) {
  const ref = await resolveContainer(this, noun === 'pagination' ? '.uk-pagination' : '.uk-breadcrumb', name, noun);
  const result = await h.poll(this, (lib, a) => {
    const info = a.noun === 'pagination' ? lib.pagination(a.ref) : lib.trail(a.ref);
    const names = info ? (info.currentNames || [info.current]) : [];
    return { done: names.some((n) => lib.norm(n).toLowerCase() === lib.norm(a.wanted).toLowerCase()), info };
  }, { ref, noun, wanted }, h.budget(this));
  if (result.done) return;
  const info = result.info || {};
  throw h.failure(this.page, `Expected the current page of ${label(noun, name)} to be "${wanted}", but it is ${info.current ? `"${info.current}"` : 'none'}.`, {
    found: noun === 'pagination' ? `its links: ${h.listed((info.links || []).map((l) => l.names[0]))}` : `its trail: ${(info.items || []).join(' > ') || '(empty)'}`,
    hint: noun === 'pagination' ? 'the current page is the item with the class "uk-active" (aria-current="page").' : 'the current page is the item with aria-current="page", else the last item.',
  });
});

/**
 * A link of a pagination is disabled (its item has the class `uk-disabled`, or the link
 * `aria-disabled="true"`, or it has no address), or with "not" can be followed. A link is named by
 * its text or its aria-label ("Previous", "Next", "2"). Without a name, the first pagination on
 * the page.
 *
 * Example #1: Then the "Previous" link of the pagination should be disabled
 * Example #2: Then the "Next" link of the pagination should not be disabled
 * Example #3: Then the "2" link of the "Results pages" pagination should not be disabled
 * Example #4: Then the "Previous" link of the "Results pages" pagination should be disabled
 * Example #5: Then the "3" link of the pagination should not be disabled
 */
Then(/^the "([^"]*)" link of the (?:"([^"]*)" )?pagination should( not)? be disabled$/, async function (link, name, not) {
  const ref = await resolveContainer(this, '.uk-pagination', name, 'pagination');
  const info = await h.call(this, 'pagination', ref);
  const want = h.norm(link).toLowerCase();
  const links = info.links || [];
  const hit = links.find((l) => l.names.some((n) => h.norm(n).toLowerCase() === want))
    || links.find((l) => l.names.some((n) => h.norm(n).toLowerCase().startsWith(want)));
  if (!hit) {
    throw h.failure(this.page, `Expected a link "${link}" in ${label('pagination', name)}, but there is none.`, {
      found: `its links: ${h.listed(links.map((l) => l.names[0]))}`,
      hint: 'a link is named by its text or its aria-label (an arrow link by its aria-label: "Previous", "Next").',
    });
  }
  if (hit.disabled === !not) return;
  throw h.failure(this.page, `Expected the "${link}" link of ${label('pagination', name)} ${not ? 'not ' : ''}to be disabled, but it is ${hit.disabled ? '' : 'not '}disabled.`, {
    hint: 'a disabled link sits in an item with the class "uk-disabled" (aria-disabled="true" on the link).',
  });
});

/**
 * A breadcrumb reads as a trail of items, from the first to the current page, with any of ">",
 * "/", "›" or "»" between them in the step (the page draws its own divider with the style sheet).
 * Without a name, the first breadcrumb on the page.
 *
 * Example #1: Then the breadcrumb should read "Home > Products > Notebooks"
 * Example #2: Then the "Breadcrumb" breadcrumb should read "Home > Products > Notebooks"
 * Example #3: Then the breadcrumb should read "Home / Products / Notebooks"
 * Example #4: Then the breadcrumb should read "Home › Products › Notebooks"
 * Example #5: Then the breadcrumb should read "Home » Products » Notebooks"
 */
Then(/^the (?:"([^"]*)" )?breadcrumb should read "([^"]*)"$/, async function (name, trailText) {
  const ref = await resolveContainer(this, '.uk-breadcrumb', name, 'breadcrumb');
  const wanted = trailText.split(/\s*[>/›»]\s*/).map((s) => h.norm(s)).filter(Boolean);
  const result = await h.poll(this, (lib, a) => {
    const info = lib.trail(a.ref);
    const items = info ? info.items.map((s) => lib.norm(s).toLowerCase()) : [];
    const done = items.length === a.wanted.length && items.every((s, i) => s === a.wanted[i].toLowerCase());
    return { done, items: info ? info.items : [] };
  }, { ref, wanted }, h.budget(this));
  if (result.done) return;
  throw h.failure(this.page, `Expected ${label('breadcrumb', name)} to read "${wanted.join(' > ')}", but it reads "${result.items.join(' > ')}".`, {
    hint: 'write the items in order, from the first to the current page, with ">" between them.',
  });
});

/**
 * A button, a link, a heading, a menu item or a tab shows a badge or a label with a text, or with
 * "not" does not. The element is named by its own text, without the badge ("Messages" for a button
 * that reads "Messages 5").
 *
 * Example #1: Then the "Messages" button should show the badge "5"
 * Example #2: Then the "Messages" link should show the badge "5"
 * Example #3: Then the "Reports" menu item should show the badge "3"
 * Example #4: Then the "Overview" menu item should not show the badge "3"
 * Example #5: Then the "Messages" button should not show the badge "6"
 */
Then(/^the "([^"]*)" (button|link|heading|menu item|tab) should( not)? show the badge "([^"]*)"$/, async function (name, kind, not, badge) {
  const holderKind = kind === 'menu item' ? 'list item' : kind;
  const result = await h.poll(this, (lib, a) => {
    const { matches, names } = lib.badgeHolders(a.kind, a.name);
    if (!matches.length) return { done: false, names };
    const badges = lib.badgesOf(lib.ref(matches[0]));
    const has = badges.some((b) => lib.norm(b.text).toLowerCase() === lib.norm(a.badge).toLowerCase());
    return { done: a.not ? !has : has, found: true, badges, names };
  }, { kind: holderKind, name, badge, not: !!not }, h.budget(this));
  if (result.done) return;
  if (!result.found) {
    throw h.failure(this.page, `Expected a ${kind} named "${name}" on the page, but there is none that is visible.`, {
      found: `the ${kind} names here: ${h.listed(result.names)}`,
      hint: `a ${kind} is named by its own text, without its badge.`,
    });
  }
  throw h.failure(this.page, `Expected the "${name}" ${kind} ${not ? 'not ' : ''}to show the badge "${badge}", but it ${not ? 'does' : (result.badges.length ? 'shows another' : 'shows none')}.`, {
    found: `its badges: ${h.listed(result.badges.map((b) => b.text))}`,
    hint: 'a badge is an element with the class "uk-badge" (or a label, "uk-label") inside it.',
  });
});

/**
 * An element that sticks to the top of the window once the page scrolls past it (a section menu,
 * a header) is stuck there (`uk-sticky-fixed`), or with "not" is in its place in the page. It is
 * named by its aria-label, the aria-label of the nav in it, its heading or its id. The step waits
 * for the scroll to settle.
 *
 * Example #1: Then the "Section menu" should stick to the top of the window
 * Example #2: Then the "Section menu" should not stick to the top of the window
 * Example #3: And the "Section menu" should stick to the top of the window
 * Example #4: But the "Section menu" should not stick to the top of the window
 * Example #5: Then the "#section-menu" should stick to the top of the window
 */
Then(/^the "([^"]*)" should( not)? stick to the top of the window$/, async function (name, not) {
  const found = await h.poll(this, (lib, a) => {
    const all = lib.stickies();
    const { matches, names } = lib.pick(all, a.name, (s) => lib.stickyNames(s));
    return { done: matches.length > 0, ref: matches.length ? lib.ref(matches[0]) : 0, names };
  }, { name }, h.budget(this));
  if (!found.ref) {
    throw h.failure(this.page, `Expected an element named "${name}" that sticks to the top of the window, but there is none.`, {
      found: `the sticky elements here: ${h.listed(found.names)}`,
      hint: 'a sticky element carries uk-sticky; it is named by its aria-label, the aria-label of the nav in it, its heading or its id.',
    });
  }
  const result = await h.poll(this, (lib, a) => {
    const s = lib.stickyState(a.ref);
    return { done: s.exists && s.stuck === a.want, state: s, y: Math.round(window.scrollY) };
  }, { ref: found.ref, want: !not }, h.budget(this));
  if (result.done) return;
  const s = result.state || {};
  throw h.failure(this.page, `Expected the "${name}" ${not ? 'not ' : ''}to stick to the top of the window, but it ${s.stuck ? 'does' : 'does not'} (the page is scrolled ${result.y} pixels down, its top at ${s.top} pixels).`, {
    hint: not ? 'it sticks once the page scrolls past it: scroll back up first (When I scroll to the top of the page).' : 'it sticks once the page scrolls past it: scroll down first (When I scroll down 800).',
  });
});

async function resolveFilter(world, name) {
  const result = await h.poll(world, (lib, a) => {
    const all = lib.filters().filter(lib.isRendered);
    if (!a.name) return { done: all.length > 0, ref: all.length === 1 ? lib.ref(all[0]) : 0, count: all.length, names: all.map((f) => lib.filterNames(f).find(Boolean) || '') };
    const { matches, names } = lib.pick(all, a.name, (f) => lib.filterNames(f));
    return { done: matches.length > 0, ref: matches.length ? lib.ref(matches[0]) : 0, count: all.length, names };
  }, { name: name || '' }, h.budget(world));
  if (result.ref) return result.ref;
  throw h.failure(world.page, name ? `Expected a list named "${name}" with a filter, but there is none.` : `Expected one list with a filter on the page, but there are ${result.count}.`, {
    found: `the filtered lists here: ${h.listed(result.names)}`,
    hint: 'a list with a filter carries uk-filter; it is named by its aria-label, the heading before it or its id.',
  });
}

async function waitFilter(world, ref) {
  return h.poll(world, (lib, a) => {
    const s = lib.filterState(a.ref);
    return { done: s.exists && s.settled, state: s };
  }, { ref }, h.budget(world));
}

/**
 * Narrow a list with one of its filter's choices, by its text ("All" shows every item again): click
 * it and wait until the list has finished moving (`afterFilter`, its items done fading).
 *
 * Example #1: When I filter the "Colours" list by "Red"
 * Example #2: When I filter the "Colours" list by "Blue"
 * Example #3: When I filter the "Colours" list by "All"
 * Example #4: When we filter the "Colours" list by "Green"
 * Example #5: When I filter by "Red"
 */
When(/^(?:I |we )?filter (?:the "([^"]*)" list )?by "([^"]*)"$/, async function (name, choice) {
  const ref = await resolveFilter(this, name);
  const before = await waitFilter(this, ref);
  const controls = (before.state && before.state.controls) || [];
  const want = h.norm(choice).toLowerCase();
  const hit = controls.find((c) => h.norm(c.name).toLowerCase() === want) || controls.find((c) => h.norm(c.name).toLowerCase().startsWith(want));
  if (!hit) {
    throw h.failure(this.page, `Expected a choice "${choice}" in the filter of ${name ? `the "${name}" list` : 'the list'}, but there is none.`, {
      found: `its choices: ${h.listed(controls.map((c) => c.name))}`,
      hint: 'a choice is named by its text.',
    });
  }
  await h.clickRef(this, hit.ref, `the choice "${choice}" of the filter`);
  await h.sleep(50);
  const after = await waitFilter(this, ref);
  if (!after.done) {
    throw h.failure(this.page, `Expected the list to stop moving after the choice "${choice}", but it is still moving.`, {
      hint: 'check that the page loads the components script ("the page should use the components script").',
    });
  }
});

/**
 * A list with a filter shows an item (a part of its text), or with "not" hides it, once the filter
 * has stopped moving. Without a name, the only such list on the page.
 *
 * Example #1: Then the "Colours" filtered list should show "Notebook"
 * Example #2: Then the "Colours" filtered list should not show "Pen"
 * Example #3: Then the "Colours" filtered list should show "Pencil case"
 * Example #4: Then the filtered list should not show "Ruler"
 * Example #5: Then the "Colours" filtered list should show "Ruler"
 */
Then(/^the (?:"([^"]*)" )?filtered list should( not)? show "([^"]*)"$/, async function (name, not, text) {
  const ref = await resolveFilter(this, name);
  const result = await h.poll(this, (lib, a) => {
    const s = lib.filterState(a.ref);
    const has = s.exists && s.shown.some((t) => lib.norm(t).toLowerCase().includes(lib.norm(a.text).toLowerCase()));
    return { done: s.exists && s.settled && (a.not ? !has : has), state: s };
  }, { ref, text, not: !!not }, h.budget(this));
  if (result.done) return;
  const s = result.state || {};
  throw h.failure(this.page, `Expected ${name ? `the "${name}" list` : 'the list'} ${not ? 'not ' : ''}to show "${text}", but it ${not ? 'does' : 'does not'}.`, {
    found: `it shows: ${h.listed(s.shown)}; it hides: ${h.listed(s.hidden)}`,
    hint: not ? 'choose another filter first: When I filter by "..."' : 'the item may be hidden by the filter chosen: When I filter by "All"',
  });
});

/**
 * A list with a filter shows a number of items, once the filter has stopped moving. Without a
 * name, the only such list on the page.
 *
 * Example #1: Then the "Colours" filtered list should show 2 items
 * Example #2: Then the "Colours" filtered list should show 5 items
 * Example #3: Then the "Colours" filtered list should show 1 item
 * Example #4: Then the filtered list should show 2 items
 * Example #5: And the "Colours" filtered list should show 5 items
 */
Then(/^the (?:"([^"]*)" )?filtered list should show (\d+) items?$/, async function (name, count) {
  const ref = await resolveFilter(this, name);
  const wanted = Number(count);
  const result = await h.poll(this, (lib, a) => {
    const s = lib.filterState(a.ref);
    return { done: s.exists && s.settled && s.shown.length === a.wanted, state: s };
  }, { ref, wanted }, h.budget(this));
  if (result.done) return;
  const s = result.state || {};
  throw h.failure(this.page, `Expected ${name ? `the "${name}" list` : 'the list'} to show ${wanted} item${wanted === 1 ? '' : 's'}, but it shows ${(s.shown || []).length}.`, {
    found: `it shows: ${h.listed(s.shown)}`,
    hint: 'the filter chosen decides what the list shows.',
  });
});

/**
 * The page has loaded the script of the components (the one that opens dialogs and menus, slides
 * slideshows and fades notifications), at a version when one is named ("3.25" matches 3.25.31).
 * When a component step finds nothing moving, this tells whether the script is there at all.
 *
 * Example #1: Then the page should use the components script
 * Example #2: Then the page should use the components script at version "3"
 * Example #3: Then the page should use the components script at version "3.25"
 * Example #4: Then the page should use the components script at version "3.25.31"
 * Example #5: And the page should use the components script
 */
Then(/^the page should use the components script(?: at version "([^"]*)")?$/, async function (version) {
  const result = await h.poll(this, (lib) => {
    const v = lib.scriptVersion();
    return { done: !!v.version, version: v.version, via: v.via };
  }, null, h.budget(this));
  if (!result.done) {
    throw h.failure(this.page, 'Expected the page to load the components script, but it does not.', {
      found: 'no components object with a version on the page',
      hint: 'the theme loads only the style sheet, or loads the script late or under another name; dialogs, menus and panels need the script (uikit.min.js).',
    });
  }
  if (!version) return;
  const wanted = String(version).trim();
  if (result.version === wanted || result.version.startsWith(`${wanted}.`)) return;
  throw h.failure(this.page, `Expected the page to use the components script at version ${wanted}, but it uses ${result.version}.`, {
    found: `the version read from the components object: ${result.version}`,
    hint: 'a version is matched by its start: "3.25" is any 3.25.x.',
  });
});
