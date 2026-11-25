'use strict';

// What a page tells a person: alerts (of a kind, dismissible or not), notifications (of a kind, and
// one that hides by itself), loading spinners, and progress bars (the value a native progress
// element or a progress bar of the page announces).

const { When, Then } = require('@cucumber/cucumber');
const h = require('./uikit-helpers');

const kindWord = (word) => (word === 'error' ? 'danger' : word);

/**
 * An alert is shown with a text (a part of it, compared without regard to letter case, white space
 * and the kind of quote marks), of a kind when one is named: primary, success, warning, danger (or
 * error). With "not", no such alert is shown, once those being dismissed have gone. An alert the
 * page adds after a click is waited for.
 *
 * Example #1: Then I should see the alert "A new version of the guide is out."
 * Example #2: Then I should see a success alert "Your profile was updated."
 * Example #3: Then I should see the warning alert "Your subscription ends in three days."
 * Example #4: Then I should not see the success alert "Your profile was updated."
 * Example #5: Then we should see an error alert "The payment was refused."
 */
Then(/^(?:I |we )?should( not)? see (?:the|an?) (?:(primary|success|danger|error|warning) )?alert "([^"]*)"$/, async function (not, word, text) {
  const kind = word ? kindWord(word) : '';
  const result = await h.poll(this, (lib, a) => {
    const hits = lib.alerts(a.text, a.kind).map(lib.alertInfo);
    const shown = hits.filter((x) => x.rendered && x.settled);
    const moving = hits.filter((x) => !x.settled);
    return { done: a.not ? shown.length === 0 && moving.length === 0 : shown.length > 0, all: lib.allAlerts() };
  }, { text, kind, not: !!not }, h.budget(this));
  if (result.done) return;
  const what = `${kind ? `${kind} ` : ''}alert "${text}"`;
  throw h.failure(this.page, not ? `Expected no ${what}, but it is shown.` : `Expected a ${what}, but there is none.`, {
    found: `the alerts on the page: ${(result.all || []).map((a) => `${a.kind || 'plain'}: "${h.excerpt(a.text, 70)}"`).join('; ') || '(none)'}`,
    hint: not ? `dismiss it first: When I dismiss the alert "${text}"` : 'the text is a part of the alert\'s text; the kind is the colour of the alert (its class uk-alert-<kind>).',
  });
});

/**
 * Dismiss an alert with its close button, and wait until it has faded out and is removed from the
 * page (`hide` then `hidden`, the alert gone).
 *
 * Example #1: When I dismiss the alert "Your profile was updated."
 * Example #2: When I dismiss the alert "A new version of the guide is out."
 * Example #3: When I dismiss the alert "Your subscription ends in three days."
 * Example #4: When we dismiss the alert "Your profile was updated."
 * Example #5: When I dismiss the alert "Your subscription ends"
 */
When(/^(?:I |we )?dismiss the alert "([^"]*)"$/, async function (text) {
  const found = await h.poll(this, (lib, a) => {
    const hit = lib.alerts(a.text, '').map(lib.alertInfo).find((x) => x.rendered);
    return { done: !!hit, alert: hit || null, all: lib.allAlerts() };
  }, { text }, h.budget(this));
  if (!found.done) {
    throw h.failure(this.page, `Expected an alert "${text}" to dismiss, but there is none.`, {
      found: `the alerts on the page: ${(found.all || []).map((a) => `"${h.excerpt(a.text, 70)}"`).join('; ') || '(none)'}`,
      hint: 'the text is a part of the alert\'s text.',
    });
  }
  if (!found.alert.dismissible) {
    throw h.failure(this.page, `Could not dismiss the alert "${text}": it has no close button.`, {
      hint: `check it with: Then the alert "${text}" should not be dismissible`,
    });
  }
  const button = await this.page.evaluate((r) => {
    const lib = window.__webshipUikit.lib;
    const el = lib.deref(r).querySelector('.uk-alert-close');
    return el ? lib.ref(el) : 0;
  }, found.alert.ref);
  await h.clickRef(this, button, `the close button of the alert "${text}"`);
  const gone = await h.poll(this, (lib, a) => {
    const el = lib.deref(a.ref);
    return { done: !el || !el.isConnected || (!lib.isRendered(el) && !lib.moving(el)) };
  }, { ref: found.alert.ref }, h.budget(this));
  if (!gone.done) {
    throw h.failure(this.page, `Expected the alert "${text}" to be gone after its close button was clicked, but it is still on the page.`, {
      hint: 'check that the page loads the components script ("the page should use the components script").',
    });
  }
});

/**
 * An alert has a close button (`uk-alert-close`), or with "not" has none.
 *
 * Example #1: Then the alert "Your profile was updated." should be dismissible
 * Example #2: Then the alert "The payment was refused." should not be dismissible
 * Example #3: Then the alert "A new version of the guide is out." should be dismissible
 * Example #4: Then the alert "Your subscription ends in three days." should be dismissible
 * Example #5: Then the alert "Check the card number." should not be dismissible
 */
Then(/^the alert "([^"]*)" should( not)? be dismissible$/, async function (text, not) {
  const found = await h.poll(this, (lib, a) => {
    const hit = lib.alerts(a.text, '').map(lib.alertInfo).find((x) => x.rendered);
    return { done: !!hit, alert: hit || null, all: lib.allAlerts() };
  }, { text }, h.budget(this));
  if (!found.done) {
    throw h.failure(this.page, `Expected an alert "${text}", but there is none.`, {
      found: `the alerts on the page: ${(found.all || []).map((a) => `"${h.excerpt(a.text, 70)}"`).join('; ') || '(none)'}`,
      hint: 'the text is a part of the alert\'s text.',
    });
  }
  if (found.alert.dismissible === !not) return;
  throw h.failure(this.page, `Expected the alert "${text}" ${not ? 'not ' : ''}to be dismissible, but it ${found.alert.dismissible ? 'has a' : 'has no'} close button.`, {
    hint: 'a dismissible alert carries a close button with the class uk-alert-close.',
  });
});

/**
 * A notification is shown with a text (a part of it, compared the way an alert's is), of a kind
 * when one is named: primary, success, warning, danger (or error). With "not", no such
 * notification is shown, once those hiding have gone. A notification the page shows after a click
 * is waited for, and one that is still fading in.
 *
 * Example #1: Then I should see a success notification "The settings were saved."
 * Example #2: Then I should see a notification "A new version is ready to install."
 * Example #3: Then I should see an error notification "The report could not be sent."
 * Example #4: Then I should not see a notification "The settings were saved."
 * Example #5: Then we should see a primary notification "A new version is ready"
 */
Then(/^(?:I |we )?should( not)? see an? (?:(primary|success|danger|error|warning) )?notification "([^"]*)"$/, async function (not, word, text) {
  const kind = word ? kindWord(word) : '';
  const result = await h.poll(this, (lib, a) => {
    const all = lib.kinds.notification.all();
    const want = lib.norm(a.text).toLowerCase();
    const hits = all.filter((n) => lib.kinds.notification.names(n).some((x) => lib.norm(x).toLowerCase().includes(want)) && (!a.kind || lib.noticeKind(n) === a.kind));
    const shown = hits.filter((n) => lib.isShown('notification', lib.ref(n)));
    const leaving = hits.filter((n) => !lib.isClosed('notification', lib.ref(n)) && !lib.isShown('notification', lib.ref(n)));
    return {
      done: a.not ? shown.length === 0 && leaving.length === 0 : shown.length > 0,
      all: all.map((n) => `${lib.noticeKind(n)}: "${lib.kinds.notification.names(n)[0]}"`),
    };
  }, { text, kind, not: !!not }, h.budget(this));
  if (result.done) return;
  const what = `${kind ? `${kind} ` : ''}notification "${text}"`;
  throw h.failure(this.page, not ? `Expected no ${what}, but it is shown.` : `Expected a ${what}, but there is none.`, {
    found: `the notifications on the page: ${(result.all || []).join('; ') || '(none)'}`,
    hint: not ? `close it first, or wait for it: Then the "${text}" notification should hide by itself` : 'a notification shows for a few seconds only: check it right after the action that shows it; the kind is its status (the class uk-notification-message-<kind>).',
  });
});

/**
 * A notification hides by itself after its delay: the step waits until it has faded out and left
 * the page, for at most its delay (the `timeout` it was shown with; 5 seconds by default) and a
 * little more. It fails at once for a notification that stays until it is closed (a timeout of 0).
 *
 * Example #1: Then the "The settings were saved." notification should hide by itself
 * Example #2: Then the "The report could not be sent." notification should hide by itself
 * Example #3: And the "The settings were saved." notification should hide by itself
 * Example #4: Then the "The settings were" notification should hide by itself
 * Example #5: But the "The report could not be sent." notification should hide by itself
 */
Then(/^the "([^"]*)" notification should hide by itself$/, async function (name) {
  const ref = await h.resolve(this, 'notification', name);
  const config = await this.page.evaluate((r) => {
    const el = window.__webshipUikit.lib.deref(r);
    const u = window.UIkit;
    const instance = u && typeof u.getComponent === 'function' ? u.getComponent(el, 'notification') : null;
    const delay = instance ? Number(instance.timeout) : NaN;
    return { delay: Number.isFinite(delay) ? delay : 5000, known: !!instance };
  }, ref);
  if (config.delay === 0) {
    throw h.failure(this.page, `Expected the "${name}" notification to hide by itself, but it stays until it is closed.`, {
      found: 'its timeout is 0',
      hint: `close it with its button instead: When I close the "${name}" notification`,
    });
  }
  const shown = await h.call(this, 'isShown', 'notification', ref);
  const timeout = Math.min(config.delay + 3000 + (shown ? 0 : 1000), Math.max(h.longBudget(this), config.delay + 3000));
  const done = await h.waitShown(this, 'notification', ref, false, timeout);
  if (done !== true) {
    throw h.failure(this.page, `Expected the "${name}" notification to hide by itself within its delay of ${config.delay} ms, but it is ${h.describe(done)} after ${Math.round(timeout / 1000)} seconds.`, {
      hint: 'a notification does not hide while the pointer is over it.',
    });
  }
});

/**
 * A loading spinner (`uk-spinner`) is shown on the page, or with "not" none is.
 *
 * Example #1: Then I should see a loading spinner
 * Example #2: Then I should not see a loading spinner
 * Example #3: Then we should see a loading spinner
 * Example #4: And I should not see a loading spinner
 * Example #5: But we should not see a loading spinner
 */
Then(/^(?:I |we )?should( not)? see a loading spinner$/, async function (not) {
  const result = await h.poll(this, (lib, a) => {
    const spinners = lib.spinners();
    return { done: a.not ? spinners.length === 0 : spinners.length > 0, spinners };
  }, { not: !!not }, h.budget(this));
  if (result.done) return;
  throw h.failure(this.page, not ? `Expected no loading spinner, but ${result.spinners.length} ${result.spinners.length === 1 ? 'is' : 'are'} shown.` : 'Expected a loading spinner, but none is shown.', {
    found: not ? `what they say: ${h.listed(result.spinners)}` : undefined,
    hint: not ? 'wait for them first: When I wait for the loading spinners to disappear' : 'a spinner may come and go before this step: check the page right after the action that starts the loading.',
  });
});

/**
 * Wait until no loading spinner is shown on the page, for at most 30 seconds: the page has finished
 * what it was loading.
 *
 * Example #1: When I wait for the loading spinner to disappear
 * Example #2: When I wait for the loading spinners to disappear
 * Example #3: When we wait for the loading spinner to disappear
 * Example #4: And I wait for the loading spinners to disappear
 * Example #5: Given we wait for the loading spinners to disappear
 */
When(/^(?:I |we )?wait for the loading spinners? to disappear$/, async function () {
  const timeout = h.longBudget(this);
  const result = await h.poll(this, (lib) => {
    const spinners = lib.spinners();
    return { done: spinners.length === 0, spinners };
  }, null, timeout);
  if (result.done) return;
  throw h.failure(this.page, `Expected the loading spinners to disappear, but ${result.spinners.length} still ${result.spinners.length === 1 ? 'turns' : 'turn'} after ${Math.round(timeout / 1000)} seconds.`, {
    found: `what they say: ${h.listed(result.spinners)}`,
    hint: 'the page is still loading, or a spinner is part of the page for good (a button that says "Loading..."); check what the page is waiting for.',
  });
});

async function resolveBar(world, name) {
  const result = await h.poll(world, (lib, a) => {
    const all = lib.progressBars();
    if (!a.name) return { done: all.length > 0, ref: all.length === 1 ? lib.ref(all[0]) : 0, count: all.length, names: all.map((b) => lib.progressNames(b).find(Boolean) || '') };
    const { matches, names } = lib.pick(all, a.name, (b) => lib.progressNames(b));
    return { done: matches.length > 0, ref: matches.length ? lib.ref(matches[0]) : 0, count: all.length, names };
  }, { name: name || '' }, h.budget(world));
  if (result.ref) return result.ref;
  if (!name && result.count > 1) {
    throw h.failure(world.page, `Expected one progress bar on the page, but there are ${result.count}.`, {
      found: `their names: ${h.listed(result.names)}`,
      hint: 'name the bar: Then the "Upload" progress bar should be at 50%',
    });
  }
  throw h.failure(world.page, name ? `Expected a progress bar named "${name}" on the page, but there is none.` : 'Expected a progress bar on the page, but there is none.', {
    found: `the progress bars here: ${h.listed(result.names)}`,
    hint: 'a progress bar is named by its aria-label (or aria-labelledby, or its label).',
  });
}

function barLabel(name) {
  return name ? `the "${name}" progress bar` : 'the progress bar';
}

async function waitBar(world, ref, percent, reach, timeout) {
  return h.poll(world, (lib, a) => {
    const s = lib.progressState(a.ref);
    if (!s.exists) return { done: false, state: s };
    const announced = a.reach ? s.announced >= a.percent - 0.5 : Math.abs(s.announced - a.percent) <= 0.5;
    const agrees = Number.isFinite(s.shown) ? Math.abs(s.shown - s.announced) <= 2 : true;
    return { done: announced && agrees && !s.moving, state: s };
  }, { ref, percent, reach }, timeout);
}

function barFailure(world, name, wanted, verb, state) {
  const s = state || {};
  const announced = Number.isFinite(s.announced) ? `${Math.round(s.announced)}%` : 'no value';
  const shown = Number.isFinite(s.shown) ? `${Math.round(s.shown)}%` : 'unknown';
  return h.failure(world.page, `Expected ${barLabel(name)} ${verb} ${wanted}%, but it announces ${announced} and shows ${shown}${s.moving ? ', still moving' : ''}.`, {
    found: s.label ? `its label: "${s.label}"` : undefined,
    hint: 'the value of a progress element is its value against its max (or aria-valuenow between aria-valuemin and aria-valuemax).',
  });
}

/**
 * A progress bar is at a value: the value of a progress element against its maximum (or
 * `aria-valuenow` between its minimum and maximum for a bar of the page's own). Without a name,
 * the only progress bar on the page.
 *
 * Example #1: Then the "Upload" progress bar should be at 0%
 * Example #2: Then the "Upload" progress bar should be at 100%
 * Example #3: Then the progress bar should be at 0%
 * Example #4: Then the progress bar should be at 100%
 * Example #5: And the "Upload" progress bar should be at 0%
 */
Then(/^the (?:"([^"]*)" )?progress bar should be at (\d+(?:\.\d+)?)%$/, async function (name, value) {
  const ref = await resolveBar(this, name);
  const result = await waitBar(this, ref, Number(value), false, h.budget(this));
  if (!result.done) throw barFailure(this, name, value, 'to be at', result.state);
});

/**
 * A progress bar reaches a value: the step waits, for at most 30 seconds, until it is at that value
 * or more. Without a name, the only progress bar on the page.
 *
 * Example #1: Then the "Upload" progress bar should reach 100%
 * Example #2: Then the "Upload" progress bar should reach 50%
 * Example #3: Then the progress bar should reach 100%
 * Example #4: And the "Upload" progress bar should reach 30%
 * Example #5: Then the "Upload" progress bar should reach 10%
 */
Then(/^the (?:"([^"]*)" )?progress bar should reach (\d+(?:\.\d+)?)%$/, async function (name, value) {
  const ref = await resolveBar(this, name);
  const result = await waitBar(this, ref, Number(value), true, h.longBudget(this));
  if (!result.done) throw barFailure(this, name, value, 'to reach', result.state);
});
