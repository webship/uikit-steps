'use strict';

// Shared helpers for the step files of this pack.
//
// Not a step file: it registers no step definitions and no hooks. It puts the page side of the
// pack (uikit-probe.js) into every page the World opens, and holds the plumbing the steps use
// and that a project can require for its own steps: the wait budgets, the poll on the page, finding
// a component by the name a person reads, waiting until it is shown or closed and done moving,
// clicking, pressing Escape in it, clicking outside it, and the failure messages.
//
// The waits are the point of the pack. A component that opens or closes moves for a few hundred
// milliseconds: a dialog fades and slides, a panel grows, a side panel slides, a drop fades in, a
// tab's panel fades in, a slideshow slides, a notification fades. The steps wait for the
// component's own end event (`shown`, `hidden`, `itemshown`, `afterFilter`) AND for the classes the
// framework gives it while it moves and its CSS transitions to be over, never for a fixed time:
// some of those events fire before the movement ends (a side panel that reveals the page, the
// lightbox), and some pages load the script after the event was sent.
//
// Everything builds on webship-js's own helpers (`onNewPage`, `friendly`, `failure`) so the steps
// fail the way the core webship-js steps do.

const webship = require('webship-js/tests/step-definitions/webship');
const { componentProbe } = require('./uikit-probe');

const { friendly, failure, onNewPage } = webship;

/** The page side as a script: it installs `window.__webshipUikit`. */
const PROBE = `(${componentProbe.toString()})();`;

// Every page the World opens gets the probe before its own scripts run, so the components' events
// are heard from the first one.
if (typeof onNewPage === 'function') {
  onNewPage(async (world, page) => {
    try { await page.addInitScript(PROBE); } catch (e) { /* a closed page needs nothing */ }
  });
}

/**
 * The per-assertion wait budget: `minWaitTime.page` from cucumber.js, at least 10 seconds. Kept
 * below webship-js's 45 second step timeout. COMPONENT_WAIT_MS sets it outright (the run of the
 * assertions that must fail uses a short one: each of them waits its whole budget).
 *
 * @param {object} world
 * @returns {number}
 */
function budget(world) {
  const fixed = Number(process.env.COMPONENT_WAIT_MS);
  if (Number.isFinite(fixed) && fixed > 0) return Math.min(fixed, 40000);
  const page = world && world.minWaitTime && world.minWaitTime.page;
  return Math.min(Math.max(page || 0, 10000), 40000);
}

/** The budget of the waits for something the page does by itself: a notification that hides, a
 * slideshow that moves on, a spinner that goes, a bar that fills (at least 30 seconds). */
function longBudget(world) {
  const fixed = Number(process.env.COMPONENT_WAIT_MS);
  if (Number.isFinite(fixed) && fixed > 0) return Math.min(fixed * 3, 40000);
  return Math.min(Math.max(budget(world), 30000), 40000);
}

/** White space collapsed, typographic quotes made plain: the way the page side compares texts. */
function norm(text) {
  return String(text === null || text === undefined ? '' : text)
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[   ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A list for a failure message: `"a", "b"` or `(none)`. */
function listed(values, max) {
  const items = [...new Set((values || []).map(norm).filter(Boolean))];
  const limit = max || 12;
  if (!items.length) return '(none)';
  const shown = items.slice(0, limit).map((v) => `"${v}"`).join(', ');
  return items.length > limit ? `${shown} and ${items.length - limit} more` : shown;
}

/** Shorten a text for a message. */
function excerpt(text, max) {
  const clean = norm(text);
  const limit = max || 160;
  return clean.length > limit ? `${clean.slice(0, limit)}…` : clean;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Put the probe into the current page when it is not there yet (a page opened before this pack
 * was loaded, a World that does not extend webship-js's). */
async function ensureProbe(world) {
  const page = world.page;
  let there = false;
  try {
    there = await page.evaluate(() => !!(window.__webshipUikit && window.__webshipUikit.lib));
  } catch (e) {
    there = false;
  }
  if (!there) {
    try { await page.evaluate(PROBE); } catch (e) { /* the page is navigating: the next call retries */ }
  }
}

/**
 * Run a function of the page side's library: `call(world, 'find', 'dialog', 'Settings')`.
 *
 * @returns {Promise<*>}
 */
async function call(world, name, ...args) {
  await ensureProbe(world);
  return world.page.evaluate(([fn, list]) => window.__webshipUikit.lib[fn](...list), [name, args]);
}

/**
 * Look at the page every 50 ms, from Node (a timer in the page would be counted by webship-js as
 * pending work), until `probe` returns a value with `done: true` or the time is up. The probe runs
 * in the page with `lib` (the page side's library) and `arg`. Returns the last value it gave.
 *
 * @param {object} world
 * @param {Function} probe - (lib, arg) => ({ done, ... }), run in the page.
 * @param {*} arg
 * @param {number} timeout
 * @returns {Promise<object>}
 */
async function poll(world, probe, arg, timeout) {
  const deadline = Date.now() + timeout;
  const source = probe.toString();
  let last = { done: false };
  for (;;) {
    let value;
    try {
      value = await world.page.evaluate(([src, a]) => {
        const C = window.__webshipUikit;
        if (!C || !C.lib) return { done: false, missing: true };
        // eslint-disable-next-line no-new-func
        return (new Function(`return (${src})`))()(C.lib, a);
      }, [source, arg]);
    } catch (e) {
      value = { done: false, error: e.message };
    }
    if (value && value.missing) await ensureProbe(world);
    else if (value) last = value;
    if (value && value.done) return value;
    if (Date.now() + 50 >= deadline) return last;
    await sleep(50);
  }
}

/** The words a step uses for a kind, and the names it reads. */
const KIND_WORDS = {
  dialog: { noun: 'dialog', named: 'its title (a dialog with no title, such as a question, by the start of its text)' },
  'side panel': { noun: 'side panel', named: 'its heading' },
  'drop-down menu': { noun: 'drop-down menu', named: 'the name of the button that opens it' },
  notification: { noun: 'notification', named: 'its text' },
  tooltip: { noun: 'tooltip', named: 'its text' },
  panel: { noun: 'panel', named: 'its title in an accordion, or the name of the button that shows it' },
  tab: { noun: 'tab', named: 'its label' },
};

/** The kind a step names: "drop-down menu" and "dropdown menu" are one. */
function kindOf(word) {
  const w = String(word || '').toLowerCase().replace(/\s+/g, ' ');
  if (/^drop-?down menu$/.test(w)) return 'drop-down menu';
  return w;
}

/**
 * On a page that uses htmx: wait until no request of htmx is in flight, its swap has settled and
 * the framework has set up the components of the nodes it put in. A link of a theme that boosts
 * its links (`hx-boost`) goes to its page this way, without a page load: the components found
 * before the swap are gone after it. On a page without htmx it returns at once.
 *
 * @returns {Promise<true|object>} true, or the last htmx state when the time is up.
 */
async function waitHtmx(world, timeout) {
  let present = false;
  try { present = await world.page.evaluate(() => !!window.htmx); } catch (e) { present = false; }
  if (!present) return true;
  const result = await poll(world, (lib) => {
    const s = lib.htmxState();
    return { done: !s.busy, state: s };
  }, null, timeout || budget(world));
  return result.done ? true : result.state;
}

/**
 * Find a component by its name, waiting for it to be on the page. Returns its ref (the page side's
 * number for it). On a page that uses htmx, a swap in progress is let settle first.
 *
 * @returns {Promise<number>}
 */
async function resolve(world, kind, name, options) {
  const opts = options || {};
  await waitHtmx(world);
  const result = await poll(world, (lib, a) => {
    const r = lib.find(a.kind, a.name);
    return { done: !!r.ref, ref: r.ref, names: r.names, found: r.found };
  }, { kind, name }, opts.timeout || budget(world));
  if (result.ref) return result.ref;
  const words = KIND_WORDS[kind] || { noun: kind, named: 'its name' };
  throw failure(world.page, `Expected a ${words.noun} named "${name}" on the page, but there is none.`, {
    found: `the ${words.noun}s here: ${listed(result.names)}`,
    hint: opts.hint || `a ${words.noun} is named by ${words.named}; check the spelling, or that the page has finished loading.`,
  });
}

/** The state the page side reads for a component. */
async function stateOf(world, kind, ref) {
  return call(world, 'state', kind, ref);
}

/** Describe a state for a failure message. */
function describe(state) {
  if (!state || !state.exists) return state && state.removed ? 'it was removed from the page' : 'it is not on the page';
  const parts = [state.open ? 'open' : 'closed'];
  if (!state.settled) parts.push('still moving');
  if (state.lastEvent) parts.push(`last event ${state.lastEvent}`);
  if (state.classes) parts.push(`classes "${excerpt(state.classes, 80)}"`);
  return parts.join(', ');
}

/**
 * Wait until a component is shown and done moving (`want` true) or closed and done moving (false).
 * Returns true, or the last state when the time is up.
 */
async function waitShown(world, kind, ref, want, timeout) {
  const result = await poll(world, (lib, a) => {
    const done = a.want ? lib.isShown(a.kind, a.ref) : lib.isClosed(a.kind, a.ref);
    return { done, state: lib.state(a.kind, a.ref) };
  }, { kind, ref, want }, timeout || budget(world));
  return result.done ? true : result.state;
}

/** An element handle for a ref, to click or hover it with Playwright's own checks. */
async function handleOf(world, ref) {
  await ensureProbe(world);
  const handle = await world.page.evaluateHandle((r) => window.__webshipUikit.lib.deref(r), ref);
  const element = handle.asElement();
  if (!element) {
    await handle.dispose();
    return null;
  }
  return element;
}

/** Click an element found by the page side. */
async function clickRef(world, ref, what) {
  const element = await handleOf(world, ref);
  if (!element) throw failure(world.page, `Could not click ${what}: it is no longer on the page.`, { hint: 'the page changed while the step ran; check what replaced it.' });
  try {
    await element.click({ timeout: budget(world) });
  } catch (e) {
    throw friendly({ action: 'click', target: what, cause: e, hint: 'it may be hidden, disabled or covered by another element (an overlay that has not gone yet).' });
  } finally {
    await element.dispose();
  }
  await waitHtmx(world);
}

/** The visible buttons or links with a name, the way a person reads them (in a component, or on
 * the page). */
async function byRole(world, roles, name, scopeRef) {
  const base = scopeRef ? scopeLocator(world, scopeRef) : world.page;
  const out = [];
  for (const role of roles) {
    const locator = base.getByRole(role, { name, exact: true });
    const count = await locator.count().catch(() => 0);
    for (let i = 0; i < count; i += 1) {
      const candidate = locator.nth(i);
      if (await candidate.isVisible().catch(() => false)) out.push(candidate);
    }
  }
  return out;
}

/** A locator for the element a ref stands for: tagged for the time of the step. */
function scopeLocator(world, ref) {
  return world.page.locator(`[data-webship-ui="${ref}"]`);
}

/** Tag an element so a Playwright locator can reach into it; untag with untag(). */
async function tag(world, ref) {
  await world.page.evaluate((r) => {
    const el = window.__webshipUikit.lib.deref(r);
    if (el) el.setAttribute('data-webship-ui', String(r));
  }, ref);
}
async function untag(world, ref) {
  try {
    await world.page.evaluate((r) => {
      const el = window.__webshipUikit.lib.deref(r);
      if (el) el.removeAttribute('data-webship-ui');
    }, ref);
  } catch (e) { /* the page moved on */ }
}

/** Click the button or link a person names; fails when there is none. */
async function clickNamed(world, name, roles, scopeRef, what) {
  const kinds = roles || ['button', 'link'];
  if (scopeRef) await tag(world, scopeRef);
  try {
    let found = [];
    const deadline = Date.now() + budget(world);
    for (;;) {
      found = await byRole(world, kinds, name, scopeRef);
      if (found.length || Date.now() >= deadline) break;
      await sleep(100);
    }
    if (!found.length) {
      const names = await namedControls(world, kinds, scopeRef);
      throw failure(world.page, `Expected a ${kinds.join(' or ')} named "${name}"${what ? ` in ${what}` : ''}, but there is none that is visible.`, {
        found: `the ${kinds.join(' and ')} names: ${listed(names)}`,
        hint: 'a button or a link is named by its text or its aria-label; check the spelling.',
      });
    }
    try {
      await found[0].click({ timeout: budget(world) });
    } catch (e) {
      throw friendly({ action: 'click', target: name, cause: e, hint: 'it may be disabled or covered by another element.' });
    }
  } finally {
    if (scopeRef) await untag(world, scopeRef);
  }
  await waitHtmx(world);
}

/** The names of the visible buttons or links (in a component, or on the page). */
async function namedControls(world, roles, scopeRef) {
  return world.page.evaluate(([kinds, r]) => {
    const lib = window.__webshipUikit && window.__webshipUikit.lib;
    const root = r && lib ? lib.deref(r) : document;
    if (!root) return [];
    const selector = kinds.map((k) => (k === 'button' ? 'button, [role="button"], input[type="submit"], input[type="button"]' : 'a[href], [role="link"]')).join(', ');
    return [...root.querySelectorAll(selector)].filter((el) => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden').map((el) => (lib ? lib.nameOf(el) : el.textContent));
  }, [roles, scopeRef || 0]).catch(() => []);
}

/** The page side's event counter, to tell the events of an action from those before it. */
async function eventSeq(world) {
  return call(world, 'seq');
}

/** The component events since a point: "beforeshow, show, shown" for a message. */
async function eventsSince(world, seq) {
  const events = await call(world, 'eventsSince', seq).catch(() => []);
  return events.map((e) => e.name);
}

/**
 * Wait until no component on the page is moving (a dialog, a panel, a side panel, a menu, a tab,
 * a notification, a tooltip, a slideshow or a slider, the lightbox, an alert being dismissed, a
 * filter, the page itself pushed by a side panel).
 */
async function waitAllSettled(world, timeout) {
  const result = await poll(world, (lib) => {
    const busy = lib.anyMoving();
    return { done: busy.length === 0, busy };
  }, null, timeout || budget(world));
  return result.done ? true : result.busy || [];
}

/**
 * Press Escape with the keyboard focus inside a component (its own element, or the button of a
 * drop-down menu), as a person who uses the keyboard does.
 */
async function pressEscapeIn(world, kind, ref) {
  await world.page.evaluate(([k, r]) => {
    const lib = window.__webshipUikit.lib;
    const el = lib.deref(r);
    if (!el) return;
    const holder = el;
    const menu = k === 'drop-down menu' ? lib.kinds['drop-down menu'].menu(el) : null;
    const inside = (node) => node && (holder.contains(node) || (menu && menu.contains(node)));
    if (!inside(document.activeElement)) {
      if (!holder.hasAttribute('tabindex') && k !== 'drop-down menu') holder.setAttribute('tabindex', '-1');
      holder.focus({ preventScroll: true });
    }
  }, [kind, ref]);
  await world.page.keyboard.press('Escape');
}

/**
 * A point of the window outside a component (and outside what opens it) where a click lands on
 * nothing a person would act on: the overlay of a dialog or a side panel, a heading, a paragraph,
 * empty page.
 */
async function pointOutside(world, kind, ref) {
  return world.page.evaluate(([k, r]) => {
    const lib = window.__webshipUikit.lib;
    const el = lib.deref(r);
    const spec = lib.kinds[k];
    const region = spec ? spec.region(el) : el;
    const boxes = [region, el].filter(Boolean).map((n) => n.getBoundingClientRect());
    if (k === 'tooltip') {
      const trigger = spec.trigger(el);
      if (trigger) boxes.push(trigger.getBoundingClientRect());
    }
    if (k === 'dialog') boxes.splice(0, boxes.length, (el.querySelector('.uk-modal-dialog') || el).getBoundingClientRect());
    if (k === 'side panel') boxes.splice(0, boxes.length, (el.querySelector('.uk-offcanvas-bar') || el).getBoundingClientRect());
    const inside = (x, y) => boxes.some((b) => x >= b.left - 4 && x <= b.right + 4 && y >= b.top - 4 && y <= b.bottom + 4);
    const active = 'a, button, input, select, textarea, label, summary, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [tabindex]:not([tabindex="-1"]), [uk-toggle], [data-uk-toggle], iframe, video';
    const w = window.innerWidth;
    const h = window.innerHeight;
    const points = [];
    for (let fy = 0.95; fy >= 0.05; fy -= 0.15) for (let fx = 0.95; fx >= 0.05; fx -= 0.15) points.push([Math.round(w * fx), Math.round(h * fy)]);
    for (const [x, y] of points) {
      if (inside(x, y)) continue;
      const hit = document.elementFromPoint(x, y);
      if (!hit) continue;
      if (hit.closest(active) && !hit.matches('.uk-modal, .uk-offcanvas, .uk-offcanvas-overlay')) continue;
      if (region && region.contains(hit)) continue;
      return { x, y, on: hit.tagName.toLowerCase() + (hit.className && typeof hit.className === 'string' ? `.${hit.className.trim().split(/\s+/).join('.')}` : '') };
    }
    return null;
  }, [kind, ref]);
}

module.exports = {
  PROBE,
  budget,
  longBudget,
  norm,
  listed,
  excerpt,
  sleep,
  ensureProbe,
  call,
  poll,
  KIND_WORDS,
  kindOf,
  waitHtmx,
  resolve,
  stateOf,
  describe,
  waitShown,
  handleOf,
  clickRef,
  clickNamed,
  namedControls,
  tag,
  untag,
  scopeLocator,
  eventSeq,
  eventsSince,
  waitAllSettled,
  pressEscapeIn,
  pointOutside,
  friendly,
  failure,
};
