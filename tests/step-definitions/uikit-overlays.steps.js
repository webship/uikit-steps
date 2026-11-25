'use strict';

// Dialogs (modals), side panels (offcanvas), drop-down menus and drops, notifications and
// tooltips: open, close, Escape, a click outside, shown or not, what they show, a button pressed
// in them, an item chosen from a menu, a hint shown on hover, and the general wait for every
// component to stop moving.
//
// A component is named the way a person reads it: a dialog by its title (a dialog with no title,
// such as the question a page asks with the framework's confirm, by the start of its text), a side
// panel by its heading, a drop-down menu or a drop by the button that opens it, a notification or a
// tooltip by its text. The waits are the component's own: its end event (`shown`, `hidden`), the
// classes the framework gives it while it moves, its CSS transitions, never a fixed time.

const { When, Then } = require('@cucumber/cucumber');
const h = require('./uikit-helpers');

const OPENABLE = ['dialog', 'side panel', 'drop-down menu'];

async function shownOrFail(world, kind, name, ref, after) {
  const done = await h.waitShown(world, kind, ref, true);
  if (done === true) return;
  const words = h.KIND_WORDS[kind];
  const events = after !== undefined ? await h.eventsSince(world, after) : [];
  throw h.failure(world.page, `Expected the "${name}" ${words.noun} to be shown, but it is ${h.describe(done)} after ${Math.round(h.budget(world) / 1000)} seconds.`, {
    found: events.length ? `the component events since the action: ${events.join(', ')}` : 'no component event since the action',
    hint: 'it opens when its button is clicked and the components script runs: check that the page loads the components script ("the page should use the components script"), and that nothing covers the button.',
  });
}

async function closedOrFail(world, kind, name, ref, after) {
  const done = await h.waitShown(world, kind, ref, false);
  if (done === true) return;
  const words = h.KIND_WORDS[kind];
  const events = after !== undefined ? await h.eventsSince(world, after) : [];
  throw h.failure(world.page, `Expected the "${name}" ${words.noun} to be closed, but it is ${h.describe(done)} after ${Math.round(h.budget(world) / 1000)} seconds.`, {
    found: events.length ? `the component events since the action: ${events.join(', ')}` : 'no component event since the action',
    hint: kind === 'dialog'
      ? 'a dialog set not to close with Escape or a click outside (esc-close, bg-close) stays open: close it with its own button.'
      : 'it closes with its own close button, with Escape, or (unless it refuses) with a click outside.',
  });
}

// After an action that may or may not close a component (Escape, a click outside): wait for its
// answer. The components answer at once (their handlers run in the click or the key press), so
// the step waits until the component has stopped moving, whatever it decided.
async function settleAnswer(world, kind, ref) {
  await h.sleep(50);
  const result = await h.poll(world, (lib, a) => {
    const s = lib.state(a.kind, a.ref);
    if (!s.exists) return { done: true, state: s };
    return { done: s.settled && (s.open || s.closedSettled), state: s };
  }, { kind, ref }, h.budget(world));
  if (!result.done) {
    throw h.failure(world.page, `Expected the ${h.KIND_WORDS[kind].noun} to stop moving after the action, but it is ${h.describe(result.state)}.`, {
      hint: 'a component that starts to close and never ends has lost its end event: check the page for script errors.',
    });
  }
}

// Open a drop-down menu the way a person does: a menu that opens under the pointer opens when the
// pointer rests on its button (a click then would close it again); one that opens on a click opens
// with a click.
async function openDrop(world, name, ref) {
  const button = await h.handleOf(world, ref);
  if (button) {
    // The pointer comes onto the button from elsewhere, as a person's does: a pointer that is
    // already there when the page loads sends no event a menu could open on.
    const size = world.page.viewportSize() || { width: 800, height: 600 };
    await world.page.mouse.move(size.width - 2, size.height - 2);
    await button.hover({ timeout: h.budget(world) }).catch(() => {});
    await button.dispose();
  }
  const hovered = await h.poll(world, (lib, a) => ({ done: lib.isShown('drop-down menu', a.ref) || lib.state('drop-down menu', a.ref).open || lib.pending(lib.kinds['drop-down menu'].menu(lib.deref(a.ref))) }), { ref }, 1000);
  if (hovered.done) return;
  await h.clickRef(world, ref, `the button of the "${name}" drop-down menu`);
}

async function requireShown(world, kind, name, ref, action) {
  if (await h.call(world, 'isShown', kind, ref)) return;
  const done = await h.waitShown(world, kind, ref, true);
  if (done === true) return;
  throw h.failure(world.page, `Could not ${action} the "${name}" ${h.KIND_WORDS[kind].noun}: it is ${h.describe(done)}.`, {
    hint: `open it first: When I open the "${name}" ${h.KIND_WORDS[kind].noun}`,
  });
}

/**
 * Open a dialog, a side panel or a drop-down menu (or a drop), and wait until it is shown and has
 * stopped moving: its `shown` event has come, the classes it carries while it moves are gone and
 * its transitions are over (a side panel that reveals the page sends `shown` before the page has
 * moved). Without "with the ... button", the step clicks the button or link that opens it: for a
 * dialog or a side panel, the first visible one that targets it; for a drop-down menu, the button
 * it is named after (a menu that opens under the pointer opens when the pointer rests on it, and is
 * not clicked: a click would close it again). A component that is already shown is left as it is.
 *
 * Example #1: When I open the "Newsletter" dialog
 * Example #2: When I open the "Terms of use" dialog with the "Read the terms" button
 * Example #3: When I open the "Cart" side panel with the "Open the cart" button
 * Example #4: When I open the "Account" drop-down menu
 * Example #5: When we open the "Delivery details" dropdown menu
 */
When(/^(?:I |we )?open the "([^"]*)" (dialog|side panel|drop-?down menu)(?: with the "([^"]*)" (button|link))?$/, async function (name, word, trigger, role) {
  const kind = h.kindOf(word);
  const before = await h.eventSeq(this);
  if (trigger) {
    await h.clickNamed(this, trigger, [role]);
    // The name is read after the click: a dialog the page writes when asked appears only then.
    const ref = await h.resolve(this, kind, name);
    await shownOrFail(this, kind, name, ref, before);
    return;
  }
  const ref = await h.resolve(this, kind, name);
  if (await h.call(this, 'isShown', kind, ref)) return;
  if (kind === 'drop-down menu') {
    await openDrop(this, name, ref);
  } else {
    const opener = await this.page.evaluate(([k, r]) => {
      const lib = window.__webshipUikit.lib;
      const el = lib.deref(r);
      const visible = lib.kinds[k].triggers(el).filter(lib.isRendered);
      return visible.length ? lib.ref(visible[0]) : 0;
    }, [kind, ref]);
    if (!opener) {
      throw h.failure(this.page, `Could not open the "${name}" ${kind}: no visible button or link on the page opens it.`, {
        hint: `name the button that opens it: When I open the "${name}" ${kind} with the "..." button`,
      });
    }
    await h.clickRef(this, opener, `the button that opens the "${name}" ${kind}`);
  }
  await shownOrFail(this, kind, name, ref, before);
});

/**
 * Close a dialog, a side panel or a notification with its own close button (the × first, else
 * another button that closes it), or a drop-down menu with its button, and wait until it is closed
 * and has stopped moving: `hidden`, its transition over, and for a notification until it has left
 * the page. The close button of a notification shows only under the pointer: the step points at
 * the notification first. One that is already closed is left as it is.
 *
 * Example #1: When I close the "Newsletter" dialog
 * Example #2: When I close the "Menu" side panel
 * Example #3: When I close the "A new version is ready to install." notification
 * Example #4: When I close the "Account" drop-down menu
 * Example #5: When we close the "Terms of use" dialog
 */
When(/^(?:I |we )?close the "([^"]*)" (dialog|side panel|drop-?down menu|notification)$/, async function (name, word) {
  const kind = h.kindOf(word);
  const ref = await h.resolve(this, kind, name);
  if (await h.call(this, 'isClosed', kind, ref)) return;
  // A component still opening is let finish first: a click on its button mid-way is lost.
  await h.waitShown(this, kind, ref, true);
  const before = await h.eventSeq(this);
  if (kind === 'drop-down menu') {
    await h.clickRef(this, ref, `the button of the "${name}" drop-down menu`);
    // A menu that opens on hover stays open under the pointer: move the pointer away from it.
    await h.sleep(100);
    if (!(await h.call(this, 'isClosed', kind, ref))) {
      const point = await h.pointOutside(this, kind, ref);
      if (point) await this.page.mouse.move(point.x, point.y);
    }
  } else {
    if (kind === 'notification') {
      const holder = await h.handleOf(this, ref);
      if (holder) {
        await holder.hover({ timeout: h.budget(this) }).catch(() => {});
        await holder.dispose();
      }
    }
    const closer = await this.page.evaluate(([k, r]) => {
      const lib = window.__webshipUikit.lib;
      const el = lib.deref(r);
      const buttons = lib.kinds[k].dismiss(el).filter(lib.isRendered);
      const cross = buttons.find((b) => b.matches('.uk-modal-close-default, .uk-modal-close-outside, .uk-modal-close-full, .uk-offcanvas-close, .uk-notification-close, [uk-close]'));
      return cross ? lib.ref(cross) : (buttons[0] ? lib.ref(buttons[0]) : 0);
    }, [kind, ref]);
    if (!closer) {
      throw h.failure(this.page, `Could not close the "${name}" ${kind}: it has no visible close button.`, {
        hint: kind === 'notification' ? `wait for it to hide by itself: Then the "${name}" notification should hide by itself` : `close it with the keyboard: When I press Escape in the "${name}" ${kind}`,
      });
    }
    await h.clickRef(this, closer, `the close button of the "${name}" ${kind}`);
  }
  await closedOrFail(this, kind, name, ref, before);
});

/**
 * Press Escape with the keyboard focus in a dialog, a side panel or a drop-down menu (the step
 * puts the focus there first when it is elsewhere, as a keyboard user's focus is), then wait for
 * the component's answer: it closes (`hidden`), or it stays (a dialog set not to close with
 * Escape) and stops moving. Check what it did with "should be shown" or "should not be shown".
 *
 * Example #1: When I press Escape in the "Newsletter" dialog
 * Example #2: When I press Escape in the "Upload in progress" dialog
 * Example #3: When I press Escape in the "Cart" side panel
 * Example #4: When I press Escape in the "Account" drop-down menu
 * Example #5: When we press Escape in the "Help" side panel
 */
When(/^(?:I |we )?press Escape in the "([^"]*)" (dialog|side panel|drop-?down menu)$/, async function (name, word) {
  const kind = h.kindOf(word);
  const ref = await h.resolve(this, kind, name);
  await requireShown(this, kind, name, ref, 'press Escape in');
  await h.pressEscapeIn(this, kind, ref);
  await settleAnswer(this, kind, ref);
});

/**
 * Click on the page outside a dialog, a side panel or a drop-down menu: on the overlay when there
 * is one, else on a part of the page that does nothing (never on a link, a button or a field). Then
 * wait for the component's answer: it closes, or it stays (a dialog set not to close with a click
 * outside), and it stops moving.
 *
 * Example #1: When I click outside the "Newsletter" dialog
 * Example #2: When I click outside the "Upload in progress" dialog
 * Example #3: When I click outside the "Cart" side panel
 * Example #4: When I click outside the "Account" drop-down menu
 * Example #5: When we click outside the "Delivery details" dropdown menu
 */
When(/^(?:I |we )?click outside the "([^"]*)" (dialog|side panel|drop-?down menu)$/, async function (name, word) {
  const kind = h.kindOf(word);
  const ref = await h.resolve(this, kind, name);
  await requireShown(this, kind, name, ref, 'click outside');
  const point = await h.pointOutside(this, kind, ref);
  if (!point) {
    throw h.failure(this.page, `Could not click outside the "${name}" ${h.KIND_WORDS[kind].noun}: every free place of the window is covered by it or by a link, a button or a field.`, {
      hint: 'make the window larger, or press Escape in it instead.',
    });
  }
  await this.page.mouse.click(point.x, point.y);
  await settleAnswer(this, kind, ref);
});

/**
 * A dialog, a side panel, a drop-down menu, a notification or a tooltip is shown and has stopped
 * moving (its `shown` event, its classes and its transition are over), or with "not" is closed and
 * has stopped moving. A dialog, a side panel or a drop-down menu must be on the page for "not": a
 * name that matches nothing proves nothing. A notification or a tooltip that is not on the page is
 * not shown (the framework adds them when they open and removes them when they close).
 *
 * Example #1: Then the "Newsletter" dialog should be shown
 * Example #2: Then the "Upload in progress" dialog should not be shown
 * Example #3: Then the "Help" side panel should be shown
 * Example #4: Then the "Account" drop-down menu should not be shown
 * Example #5: Then the "The settings were saved." notification should be shown
 * Example #6: Then the "Saves the draft without publishing it" tooltip should be shown
 */
Then(/^the "([^"]*)" (dialog|side panel|drop-?down menu|notification|tooltip) should( not)? be shown$/, async function (name, word, not) {
  const kind = h.kindOf(word);
  if (!not) {
    const ref = await h.resolve(this, kind, name);
    await shownOrFail(this, kind, name, ref);
    return;
  }
  if (OPENABLE.includes(kind)) {
    // A dialog the page writes when it asks (a confirm) is removed once closed: gone is closed.
    const found = await h.call(this, 'find', kind, name);
    if (!found.ref && kind === 'dialog') return;
    const ref = await h.resolve(this, kind, name);
    await closedOrFail(this, kind, name, ref);
    return;
  }
  const result = await h.poll(this, (lib, a) => {
    const r = lib.find(a.kind, a.name);
    if (!r.ref) return { done: true };
    return { done: lib.isClosed(a.kind, r.ref), state: lib.state(a.kind, r.ref) };
  }, { kind, name }, h.budget(this));
  if (!result.done) {
    throw h.failure(this.page, `Expected the "${name}" ${kind} not to be shown, but it is ${h.describe(result.state)}.`, {
      hint: kind === 'notification' ? 'a notification hides by itself after its delay, or with its close button.' : 'a tooltip hides when the pointer and the focus leave its element.',
    });
  }
});

/**
 * A component shows a text: a dialog, a side panel, a drop-down menu, a notification or a tooltip
 * once it is shown, a panel once it is expanded, a tab's content once the tab is active (the step
 * waits for each, then for the text). With "not", the shown component does not show the text. The
 * text is a part of what the component shows, compared without regard to letter case, white space
 * and the kind of quote marks.
 *
 * Example #1: Then the "Newsletter" dialog should show "Get the news of the month in your mailbox"
 * Example #2: Then the "Cart" side panel should show "2 items: a notebook and a pen."
 * Example #3: Then the "Returns" panel should show "Send an item back within thirty days for a full refund."
 * Example #4: Then the "Security" tab should show "Your password and the devices that are signed in."
 * Example #5: Then the "Account" drop-down menu should not show "Delete the account"
 * Example #6: Then the "Delivery details" drop-down menu should show "Orders placed before noon leave the warehouse the same day."
 */
Then(/^the "([^"]*)" (dialog|side panel|drop-?down menu|notification|tooltip|panel|tab) should( not)? show "([^"]*)"$/, async function (name, word, not, text) {
  const kind = h.kindOf(word);
  const ref = await h.resolve(this, kind, name);
  const shown = await h.waitShown(this, kind, ref, true);
  if (shown !== true) {
    const what = kind === 'panel' ? 'expanded' : (kind === 'tab' ? 'active' : 'shown');
    throw h.failure(this.page, `Expected the "${name}" ${kind} to show "${text}", but it is not ${what}: it is ${h.describe(shown)}.`, {
      hint: kind === 'panel' ? `expand it first: When I expand the "${name}" panel` : (kind === 'tab' ? `switch to it first: When I switch to the "${name}" tab` : `open it first, or wait for it: Then the "${name}" ${kind} should be shown`),
    });
  }
  const result = await h.poll(this, (lib, a) => {
    const s = lib.state(a.kind, a.ref);
    const has = lib.norm(s.text).toLowerCase().includes(lib.norm(a.text).toLowerCase());
    return { done: a.not ? !has : has, text: s.text };
  }, { kind, ref, text, not: !!not }, h.budget(this));
  if (!result.done) {
    throw h.failure(this.page, not
      ? `Expected the "${name}" ${kind} not to show "${text}", but it does.`
      : `Expected the "${name}" ${kind} to show "${text}", but it does not.`, {
      found: `it shows: "${h.excerpt(result.text, 300)}"`,
      hint: 'the text is a part of what the component shows; check the spelling, or whether another component of the same name was meant.',
    });
  }
});

/**
 * Press a button or a link inside a dialog, a side panel or a notification, by its name, then wait
 * until every component on the page has stopped moving: a button that closes the dialog has closed
 * it (`hidden`), a button that opens another one has opened it.
 *
 * Example #1: When I press "Subscribe" in the "Newsletter" dialog
 * Example #2: When I press "Accept" in the "Terms of use" dialog
 * Example #3: When I press "Ok" in the "Delete the file report.pdf?" dialog
 * Example #4: When I press "Check out" in the "Cart" side panel
 * Example #5: When we press "Apply" in the "Filters" side panel
 */
When(/^(?:I |we )?press "([^"]*)" in the "([^"]*)" (dialog|side panel|notification)$/, async function (button, name, word) {
  const kind = h.kindOf(word);
  const ref = await h.resolve(this, kind, name);
  await requireShown(this, kind, name, ref, `press "${button}" in`);
  await h.clickNamed(this, button, ['button', 'link'], ref, `the "${name}" ${kind}`);
  const busy = await h.waitAllSettled(this);
  if (busy !== true) {
    throw h.failure(this.page, `Expected the components to stop moving after pressing "${button}", but these still move: ${busy.join(', ')}.`, {
      hint: 'a component that never finishes has lost its end event: check the page for script errors.',
    });
  }
});

/**
 * Choose an item of a drop-down menu by its text: the menu is opened first when it is closed, the
 * item is clicked, and the step waits until every component has stopped moving (a menu closes on
 * a choice only when the page closes it). A link to another page is followed, and the new page is
 * waited for.
 *
 * Example #1: When I choose "Oldest first" from the "Sort by" drop-down menu
 * Example #2: When I choose "Settings" from the "Account" drop-down menu
 * Example #3: When I choose "Copy the link" from the "Share" drop-down menu
 * Example #4: When I choose "Modal" from the "Overlays" drop-down menu
 * Example #5: When we choose "Price" in the "Sort by" dropdown menu
 */
When(/^(?:I |we )?choose "([^"]*)" (?:from|in) the "([^"]*)" drop-?down menu$/, async function (item, name) {
  const kind = 'drop-down menu';
  const ref = await h.resolve(this, kind, name);
  if (!(await h.call(this, 'isShown', kind, ref))) {
    await openDrop(this, name, ref);
    await shownOrFail(this, kind, name, ref);
  }
  const found = await this.page.evaluate(([r, wanted]) => {
    const lib = window.__webshipUikit.lib;
    const menu = lib.kinds['drop-down menu'].menu(lib.deref(r));
    if (!menu) return { menu: 0, items: [] };
    const items = [...menu.querySelectorAll('a, button')].filter((el) => !el.closest('.uk-nav-divider, .uk-nav-header'));
    const { matches, names } = lib.pick(items, wanted, (el) => [lib.nameOf(el)]);
    const hit = matches.find(lib.isRendered) || matches[0];
    const li = hit ? hit.closest('li') : null;
    return {
      menu: lib.ref(menu),
      item: hit ? lib.ref(hit) : 0,
      disabled: !!hit && ((li && li.classList.contains('uk-disabled')) || hit.getAttribute('aria-disabled') === 'true' || hit.hasAttribute('disabled')),
      items: names,
    };
  }, [ref, item]);
  if (!found.item) {
    throw h.failure(this.page, `Expected an item "${item}" in the "${name}" drop-down menu, but there is none.`, {
      found: `its items: ${h.listed(found.items)}`,
      hint: 'an item is named by its text; check the spelling.',
    });
  }
  if (found.disabled) {
    throw h.failure(this.page, `Could not choose "${item}" from the "${name}" drop-down menu: the item is disabled.`, {
      hint: `check its state instead: Then "${item}" should be disabled in the "${name}" drop-down menu`,
    });
  }
  const url = this.page.url();
  await h.clickRef(this, found.item, `the item "${item}" of the "${name}" drop-down menu`);
  if (typeof this.smartSettle === 'function') await this.smartSettle(1500);
  if (this.page.url() !== url) await this.page.waitForLoadState('load').catch(() => {});
  await h.waitAllSettled(this);
});

/**
 * An item of a drop-down menu is active (`uk-active`, `aria-current`) or disabled (`uk-disabled`,
 * `aria-disabled`, the `disabled` attribute), or not. The menu does not need to be open.
 *
 * Example #1: Then "Profile" should be active in the "Account" drop-down menu
 * Example #2: Then "Billing" should be disabled in the "Account" drop-down menu
 * Example #3: Then "Settings" should not be disabled in the "Account" drop-down menu
 * Example #4: Then "Sign out" should not be active in the "Account" drop-down menu
 * Example #5: Then "Price" should not be active in the "Sort by" dropdown menu
 */
Then(/^"([^"]*)" should( not)? be (active|disabled) in the "([^"]*)" drop-?down menu$/, async function (item, not, wanted, name) {
  const ref = await h.resolve(this, 'drop-down menu', name);
  const found = await this.page.evaluate(([r, text]) => {
    const lib = window.__webshipUikit.lib;
    const menu = lib.kinds['drop-down menu'].menu(lib.deref(r));
    if (!menu) return { exists: false, items: [] };
    const items = [...menu.querySelectorAll('li')].filter((li) => !li.classList.contains('uk-nav-divider') && !li.classList.contains('uk-nav-header'));
    const { matches, names } = lib.pick(items, text, (li) => [lib.nameOf(li.querySelector('a, button, span') || li)]);
    const hit = matches[0];
    if (!hit) return { exists: false, items: names };
    const s = lib.itemState(lib.ref(hit));
    return { exists: true, items: names, active: s.active, disabled: s.disabled };
  }, [ref, item]);
  if (!found.exists) {
    throw h.failure(this.page, `Expected an item "${item}" in the "${name}" drop-down menu, but there is none.`, {
      found: `its items: ${h.listed(found.items)}`,
      hint: 'an item is named by its text; check the spelling.',
    });
  }
  if (found[wanted] === !not) return;
  throw h.failure(this.page, `Expected "${item}" ${not ? 'not ' : ''}to be ${wanted} in the "${name}" drop-down menu, but it is ${found[wanted] ? '' : 'not '}${wanted}.`, {
    found: `active: ${found.active ? 'yes' : 'no'}, disabled: ${found.disabled ? 'yes' : 'no'}`,
    hint: wanted === 'active' ? 'the active item carries the class "uk-active" or aria-current.' : 'a disabled item carries the class "uk-disabled", aria-disabled="true" or the disabled attribute.',
  });
});

/**
 * Point at a button or a link (the way a mouse does). When it has a tooltip, or opens a drop-down
 * menu on hover, wait until that is shown and has stopped moving (its `shown` event and its
 * animation).
 *
 * Example #1: When I hover over the "Save the draft" button
 * Example #2: When I hover over the "Read the guide" link
 * Example #3: When I hover over the "Preview" button
 * Example #4: When I hover over the "Share" button
 * Example #5: When we hover over the "Save the draft" button
 */
When(/^(?:I |we )?hover over the "([^"]*)" (button|link)$/, async function (name, role) {
  await h.ensureProbe(this);
  const locator = this.page.getByRole(role, { name, exact: true });
  let target = null;
  const deadline = Date.now() + h.budget(this);
  while (!target) {
    const count = await locator.count().catch(() => 0);
    for (let i = 0; i < count && !target; i += 1) {
      if (await locator.nth(i).isVisible().catch(() => false)) target = locator.nth(i);
    }
    if (target || Date.now() >= deadline) break;
    await h.sleep(100);
  }
  if (!target) {
    const names = await h.namedControls(this, [role]);
    throw h.failure(this.page, `Expected a ${role} named "${name}" to hover over, but there is none that is visible.`, {
      found: `the ${role} names: ${h.listed(names)}`,
      hint: 'a button or a link is named by its text or its aria-label; check the spelling.',
    });
  }
  // The pointer comes onto it from elsewhere: a pointer already there sends no event to react to.
  const size = this.page.viewportSize() || { width: 800, height: 600 };
  await this.page.mouse.move(size.width - 2, size.height - 2);
  try {
    await target.hover({ timeout: h.budget(this) });
  } catch (e) {
    await target.hover({ timeout: h.budget(this), force: true });
  }
  const ref = await target.evaluate((el) => window.__webshipUikit.lib.ref(el));
  const hint = await h.call(this, 'hintOf', ref);
  if (!hint) {
    // A drop-down menu that opens on hover opens after a short delay: let it open and settle.
    await h.sleep(200);
    await h.waitAllSettled(this);
    return;
  }
  const result = await h.poll(this, (lib, a) => {
    const tip = lib.describedBy(a.ref);
    return { done: !!tip && lib.isShown('tooltip', tip), tip, state: tip ? lib.state('tooltip', tip) : null };
  }, { ref: hint.ref }, h.budget(this));
  if (!result.done) {
    throw h.failure(this.page, `Expected the tooltip of the "${name}" ${role} to be shown on hover, but it is ${result.tip ? h.describe(result.state) : 'not on the page'}.`, {
      found: hint.title ? `its tooltip text: "${hint.title}"` : undefined,
      hint: 'a tooltip shows after its delay, when the components script runs on the page; check that it does ("the page should use the components script").',
    });
  }
});

/**
 * No tooltip, notification, dialog, side panel or drop-down menu is shown on the page, once those
 * that were closing have finished (their `hidden` event and their transition).
 *
 * Example #1: Then no tooltip should be shown
 * Example #2: Then no notification should be shown
 * Example #3: Then no dialog should be shown
 * Example #4: Then no side panel should be shown
 * Example #5: Then no drop-down menu should be shown
 */
Then(/^no (tooltip|notification|dialog|side panel|drop-?down menu) should be shown$/, async function (word) {
  const kind = h.kindOf(word);
  const result = await h.poll(this, (lib, a) => {
    const shown = lib.shownOfKind(a.kind);
    return { done: shown.length === 0, shown };
  }, { kind }, h.budget(this));
  if (!result.done) {
    throw h.failure(this.page, `Expected no ${kind} to be shown, but ${result.shown.length === 1 ? 'one is' : `${result.shown.length} are`}: ${h.listed(result.shown)}.`, {
      hint: `close it, or check what opened it: Then the "${result.shown[0]}" ${kind} should not be shown`,
    });
  }
});

/**
 * Wait until no component on the page is moving: no dialog, side panel, panel, tab, drop-down
 * menu, notification, tooltip, slideshow, slider or lightbox between its start event and its end
 * event or in a transition, no alert being dismissed, no filter running and no page being pushed
 * by a side panel. For after a step of another kind (a webship-js click, a project's own step)
 * that opens or closes a component.
 *
 * Example #1: When I wait for the transitions to finish
 * Example #2: When we wait for the transitions to finish
 * Example #3: And I wait for the transitions to finish
 * Example #4: Given I wait for the transitions to finish
 * Example #5: When wait for the transitions to finish
 */
When(/^(?:I |we )?wait for the transitions to finish$/, async function () {
  const busy = await h.waitAllSettled(this);
  if (busy !== true) {
    throw h.failure(this.page, `Expected the components to stop moving, but these still move after ${Math.round(h.budget(this) / 1000)} seconds: ${busy.join(', ')}.`, {
      hint: 'a component that never finishes has lost its end event: check the page for script errors.',
    });
  }
});
