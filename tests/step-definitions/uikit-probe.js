'use strict';

// The page side of this pack: one function, injected into every page the World opens (an init
// script, so it runs before the page's own scripts) and into the current page when a step finds it
// missing. It registers no step.
//
// It does two things:
//
//   1. It records the components' own events. The framework dispatches them as DOM events on the
//      element that moves (`beforeshow`, `show`, `shown`, `beforehide`, `hide`, `hidden` for a
//      dialog, a side panel, a drop, an accordion item, a toggled block, an alert or a tooltip;
//      `itemshow`, `itemshown`, `itemhide`, `itemhidden` for the slides of a slideshow, a slider
//      or the lightbox; `close` for a notification; `beforeFilter`, `afterFilter` for a filter;
//      `active`, `inactive` for a sticky element), which a capturing listener on the document
//      hears. For every element it keeps the last event of each family: a `show`, `hide`,
//      `itemshow`, `itemhide` or `beforeFilter` without its end event means it is still moving.
//   2. It reads the components by what a person sees (a dialog by its title, a menu by its button,
//      an accordion item by its title ...) and says whether each one is open or closed, and
//      whether it has finished moving: its own event pairs, the classes the framework gives it
//      while it moves (`uk-togglable-enter`, `uk-togglable-leave`, `uk-transition`,
//      `uk-animation-*`, `uk-slide-enter`, `uk-slide-leave`) and the CSS transitions and animations
//      still running in it. An end event alone is not enough: a side panel that reveals the page,
//      or the lightbox, sends `shown` while it still moves. Infinite CSS animations (a spinner)
//      are not movement.
//
//   3. When the page uses htmx (a theme that swaps pages in without loading them, as UI Suite UIkit
//      does with `hx-boost`), it counts htmx's requests in flight and watches its swaps settle
//      (`htmx-request`, `htmx-swapping`, `htmx-settling`, `htmx:afterSettle`), and the components
//      of the new nodes that the framework has not set up yet. On a page without htmx it does
//      nothing of the kind.
//
// Everything is reached through `window.__webshipUikit.lib`; elements found by one call are
// kept under a number (`ref`) for the next ones, without touching the page's DOM.

function componentProbe() {
  const VERSION = 1;
  if (window.__webshipUikit && window.__webshipUikit.version === VERSION) return;

  const C = { version: VERSION, seq: 0, refs: new Map(), nextRef: 1, events: [] };
  const LAST = new WeakMap();
  // The start events and the end event each waits for, by family.
  const FAMILY = {
    beforeshow: 'toggle', show: 'toggle', shown: 'toggle', beforehide: 'toggle', hide: 'toggle', hidden: 'toggle',
    beforeitemshow: 'item', itemshow: 'item', itemshown: 'item', beforeitemhide: 'item', itemhide: 'item', itemhidden: 'item',
    beforeFilter: 'filter', afterFilter: 'filter',
    close: 'close',
    active: 'sticky', inactive: 'sticky',
  };
  const START = { show: 'shown', hide: 'hidden', itemshow: 'itemshown', itemhide: 'itemhidden', beforeFilter: 'afterFilter' };

  function note(type, target, event) {
    if (!target || target.nodeType !== 1) return;
    const family = FAMILY[type];
    C.seq += 1;
    const entry = { seq: C.seq, type, event, at: performance.now() };
    const all = LAST.get(target) || {};
    all[family] = entry;
    LAST.set(target, all);
    C.events.push({ seq: C.seq, name: type, target });
    if (C.events.length > 400) C.events.splice(0, C.events.length - 400);
  }
  for (const name of Object.keys(FAMILY)) {
    document.addEventListener(name, (e) => note(name, e.target, e), true);
  }

  // htmx's requests in flight and its last settled swap.
  const HX = { inflight: 0, requests: 0, settled: 0 };
  document.addEventListener('htmx:beforeRequest', () => { HX.inflight += 1; HX.requests += 1; }, true);
  document.addEventListener('htmx:afterRequest', () => { HX.inflight = Math.max(0, HX.inflight - 1); }, true);
  document.addEventListener('htmx:afterSettle', () => { HX.settled += 1; }, true);

  // ------------------------------------------------------------------ reading the page

  const norm = (text) => String(text === null || text === undefined ? '' : text)
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[   ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const textOf = (el) => norm(el ? el.textContent : '');

  function css(el) {
    try { return window.getComputedStyle(el); } catch (e) { return null; }
  }

  // Shown to a person: in the page, laid out, not hidden by display or visibility.
  function isRendered(el) {
    if (!el || !el.isConnected) return false;
    const style = css(el);
    if (!style || style.display === 'none' || style.visibility === 'hidden') return false;
    return el.getClientRects().length > 0;
  }

  const finite = (a) => {
    if (a.playState !== 'running' && a.playState !== 'pending') return false;
    const timing = a.effect && typeof a.effect.getComputedTiming === 'function' ? a.effect.getComputedTiming() : null;
    return !(timing && timing.iterations === Infinity);
  };
  // A finite CSS transition or animation still running in the element or its descendants.
  function moving(el) {
    if (!el || !el.isConnected || typeof el.getAnimations !== 'function') return false;
    return el.getAnimations({ subtree: true }).some(finite);
  }
  // A finite transition of the element itself (the page's body while a side panel pushes it).
  function movingSelf(el) {
    if (!el || typeof el.getAnimations !== 'function') return false;
    return el.getAnimations().some(finite);
  }
  // The classes the framework gives an element while it moves.
  const MOVING_CLASSES = ['uk-togglable-enter', 'uk-togglable-leave', 'uk-transition', 'uk-animation-enter', 'uk-animation-leave', 'uk-slide-enter', 'uk-slide-leave'];
  function markedMoving(el) {
    return !!el && !!el.classList && MOVING_CLASSES.some((c) => el.classList.contains(c));
  }

  // The family's last event on this element: a start event that was not prevented and has no end
  // event yet means it is still moving.
  function lastEvent(el, family) {
    const all = el ? LAST.get(el) : null;
    return all ? all[family] || null : null;
  }
  function pending(el, family) {
    const entry = lastEvent(el, family || 'toggle');
    return !!entry && !!START[entry.type] && !(entry.event && entry.event.defaultPrevented);
  }
  function eventsSince(seq) {
    return C.events.filter((e) => e.seq > seq).map((e) => ({ seq: e.seq, name: e.name }));
  }

  function ref(el) {
    if (!el) return 0;
    for (const [id, known] of C.refs) if (known === el) return id;
    const id = C.nextRef++;
    C.refs.set(id, el);
    return id;
  }
  const deref = (id) => C.refs.get(id) || null;

  function labelledText(el) {
    const ids = (el.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
    const text = ids.map((id) => document.getElementById(id)).filter(Boolean).map(textOf).join(' ');
    return norm(text);
  }
  // The accessible name a person reads on a button or a link.
  function nameOf(el) {
    if (!el) return '';
    return norm(el.getAttribute('aria-label') || labelledText(el) || el.textContent || el.getAttribute('title') || el.getAttribute('value') || (el.querySelector('img[alt]') ? el.querySelector('img[alt]').getAttribute('alt') : ''));
  }
  // The first heading inside an element.
  function headingOf(el) {
    return el ? el.querySelector('h1, h2, h3, h4, h5, h6, .uk-modal-title, .uk-card-title, [role="heading"]') : null;
  }

  // Pick the elements whose names match, the way a person would: exactly, then ignoring case, then
  // by the start of the name. Returns { matches, names }.
  function pick(items, wanted, namesOf) {
    const want = norm(wanted);
    const lower = want.toLowerCase();
    const named = items.map((el) => ({ el, names: namesOf(el).map(norm).filter(Boolean) }));
    const by = (test) => named.filter((n) => n.names.some(test)).map((n) => n.el);
    let matches = by((n) => n === want);
    if (!matches.length) matches = by((n) => n.toLowerCase() === lower);
    if (!matches.length && want.length >= 3) matches = by((n) => n.toLowerCase().startsWith(lower));
    const names = [...new Set(named.map((n) => n.names[0]).filter(Boolean))];
    return { matches, names };
  }
  // Several matches: keep the rendered ones when that settles it.
  function narrow(matches) {
    if (matches.length <= 1) return matches;
    const rendered = matches.filter(isRendered);
    return rendered.length >= 1 ? rendered : matches;
  }

  // What a toggle targets: its `uk-toggle` target, its href, its aria-controls.
  function toggleTargets(t) {
    const out = [];
    const opts = t.getAttribute('uk-toggle') || t.getAttribute('data-uk-toggle') || '';
    const m = opts.match(/(?:^|;)\s*target\s*:\s*([^;]+)/);
    const raw = m ? m[1].trim() : (opts && !opts.includes(':') ? opts.trim() : '');
    const selectors = [raw, t.getAttribute('href'), t.getAttribute('aria-controls') ? `#${t.getAttribute('aria-controls')}` : ''].filter((s) => s && s !== '#' && /^[#.[]/.test(s));
    for (const s of selectors) {
      try { for (const el of document.querySelectorAll(s)) if (!out.includes(el)) out.push(el); } catch (e) { /* not a selector */ }
    }
    return out;
  }
  const toggles = () => [...document.querySelectorAll('[uk-toggle], [data-uk-toggle]')];

  // ------------------------------------------------------------------ the components

  const DROPS = '.uk-drop, .uk-dropdown, .uk-navbar-dropdown';
  // The button a drop is opened with: the one that names it (aria-controls), else the element
  // before it, as the framework takes by default.
  function dropToggle(d) {
    if (d.id) {
      const t = document.querySelector(`[aria-controls="${CSS.escape(d.id)}"]`);
      if (t) return t;
    }
    let s = d.previousElementSibling;
    while (s && s.matches(DROPS)) s = s.previousElementSibling;
    return s;
  }
  function dropOf(t) {
    const id = t.getAttribute('aria-controls');
    const byId = id ? document.getElementById(id) : null;
    if (byId && byId.matches(DROPS)) return byId;
    let s = t.nextElementSibling;
    while (s && !s.matches(DROPS) && s.matches('script, template')) s = s.nextElementSibling;
    return s && s.matches(DROPS) ? s : null;
  }
  function dropToggles() {
    return [...document.querySelectorAll(DROPS)].map(dropToggle).filter((t, i, all) => t && all.indexOf(t) === i);
  }

  const kinds = {
    dialog: {
      all: () => [...document.querySelectorAll('.uk-modal')],
      names: (m) => {
        const dialog = m.querySelector('.uk-modal-dialog') || m;
        const title = m.querySelector('.uk-modal-title') || headingOf(dialog);
        const body = m.querySelector('.uk-modal-body');
        return [labelledText(dialog) || labelledText(m), title ? textOf(title) : '', m.getAttribute('aria-label'), dialog.getAttribute('aria-label'), body && !title ? textOf(body) : '', m.id, m.id ? `#${m.id}` : ''];
      },
      open: (m) => m.classList.contains('uk-open') && !m.classList.contains('uk-togglable-leave'),
      closedSettled: (m) => !m.isConnected || (!m.classList.contains('uk-open') && (css(m) || {}).display === 'none'),
      settled: (m) => !pending(m) && !markedMoving(m) && !moving(m),
      triggers: (m) => toggles().filter((t) => toggleTargets(t).includes(m)),
      dismiss: (m) => [...m.querySelectorAll('.uk-modal-close-default, .uk-modal-close-outside, .uk-modal-close-full, .uk-modal-close')],
      region: (m) => m.querySelector('.uk-modal-dialog') || m,
    },
    'side panel': {
      all: () => [...document.querySelectorAll('.uk-offcanvas')],
      names: (o) => {
        const bar = o.querySelector('.uk-offcanvas-bar') || o;
        const title = headingOf(bar);
        return [labelledText(bar) || labelledText(o), title ? textOf(title) : '', o.getAttribute('aria-label'), bar.getAttribute('aria-label'), o.id, o.id ? `#${o.id}` : ''];
      },
      open: (o) => o.classList.contains('uk-open') && !o.classList.contains('uk-togglable-leave'),
      closedSettled: (o) => !o.classList.contains('uk-open') && (css(o) || {}).display === 'none' && !document.documentElement.classList.contains('uk-offcanvas-page'),
      // A side panel that pushes the page or reveals under it moves the page's body too.
      settled: (o) => !pending(o) && !markedMoving(o) && !moving(o) && !movingSelf(document.body),
      triggers: (o) => toggles().filter((t) => toggleTargets(t).includes(o)),
      dismiss: (o) => [...o.querySelectorAll('.uk-offcanvas-close')],
      region: (o) => o.querySelector('.uk-offcanvas-bar') || o,
    },
    'drop-down menu': {
      all: dropToggles,
      names: (t) => [nameOf(t)],
      menu: (t) => dropOf(t),
      open: (t) => { const d = dropOf(t); return !!d && d.classList.contains('uk-open') && !d.classList.contains('uk-togglable-leave'); },
      closedSettled: (t) => { const d = dropOf(t); return !d || !d.classList.contains('uk-open'); },
      settled: (t) => {
        const d = dropOf(t);
        if (!d) return true;
        const bar = d.closest('[uk-navbar]') ? document.querySelector('.uk-dropbar') : null;
        return !pending(d) && !markedMoving(d) && !moving(d) && !(bar && moving(bar));
      },
      dismiss: () => [],
      region: (t) => dropOf(t) || t,
    },
    notification: {
      all: () => [...document.querySelectorAll('.uk-notification-message')],
      names: (n) => {
        const copy = n.cloneNode(true);
        copy.querySelectorAll('.uk-notification-close').forEach((b) => b.remove());
        return [norm(copy.textContent)];
      },
      open: (n) => n.isConnected && !lastEvent(n, 'close'),
      shownSettled: (n) => !markedMoving(n) && Number((css(n) || {}).opacity) > 0.5,
      closedSettled: (n) => !n.isConnected,
      settled: (n) => !n.isConnected || (!markedMoving(n) && !moving(n)),
      dismiss: (n) => [...n.querySelectorAll('.uk-notification-close')],
      region: (n) => n,
    },
    tooltip: {
      all: () => [...document.querySelectorAll('.uk-tooltip')],
      names: (t) => [textOf(t.querySelector('.uk-tooltip-inner') || t)],
      trigger: (t) => (t.id ? document.querySelector(`[aria-describedby~="${t.id}"]`) : null),
      open: (t) => t.isConnected && t.classList.contains('uk-active') && !t.classList.contains('uk-togglable-leave'),
      closedSettled: (t) => !t.isConnected || !t.classList.contains('uk-active'),
      settled: (t) => !t.isConnected || (!pending(t) && !markedMoving(t) && !moving(t)),
      dismiss: () => [],
      region: (t) => t,
    },
    // An accordion's item (named by its title), or a block a toggle button shows and hides (named
    // by the button).
    panel: {
      all: () => {
        const items = [...document.querySelectorAll('.uk-accordion > *')].filter((li) => li.querySelector(':scope > .uk-accordion-title, :scope > * > .uk-accordion-title'));
        const shown = toggles().filter((t) => !t.closest('.uk-navbar, .uk-navbar-container') && toggleTargets(t).some((x) => !x.matches('.uk-modal, .uk-offcanvas, .uk-drop, .uk-dropdown, .uk-navbar-dropdown')));
        return items.concat(shown);
      },
      names: (p) => {
        if (p.matches('.uk-accordion > *')) return [textOf(p.querySelector('.uk-accordion-title'))];
        const names = [nameOf(p)];
        for (const target of toggleTargets(p)) names.push(target.getAttribute('aria-label'), labelledText(target), target.id, target.id ? `#${target.id}` : '');
        return names;
      },
      content: (p) => (p.matches('.uk-accordion > *') ? p.querySelector('.uk-accordion-content') : toggleTargets(p)[0] || null),
      open: (p) => {
        if (p.matches('.uk-accordion > *')) return p.classList.contains('uk-open') && !p.classList.contains('uk-togglable-leave');
        const targets = toggleTargets(p);
        return targets.length > 0 && targets.every((x) => !x.hidden && isRendered(x) && !x.classList.contains('uk-togglable-leave'));
      },
      closedSettled: (p) => {
        const content = kinds.panel.content(p);
        return !content || content.hidden || !isRendered(content);
      },
      settled: (p) => {
        if (p.matches('.uk-accordion > *')) {
          const content = p.querySelector('.uk-accordion-content');
          const wrapper = content ? content.parentElement : null;
          return !pending(p) && !markedMoving(p) && !(wrapper && wrapper !== p && markedMoving(wrapper)) && !moving(p);
        }
        return toggleTargets(p).every((x) => !pending(x) && !markedMoving(x) && !moving(x));
      },
      dismiss: () => [],
      region: (p) => kinds.panel.content(p) || p,
    },
    tab: {
      all: () => [...document.querySelectorAll('.uk-tab > li, [uk-switcher] > li, [uk-tab] > li, .uk-subnav[uk-switcher] > li, [uk-filter-control]')]
        .filter((li, i, list) => list.indexOf(li) === i && !li.hasAttribute('uk-filter-control')),
      names: (li) => [nameOf(li.querySelector('a, button') || li)],
      pane: (li) => {
        const a = li.querySelector('a, button');
        const id = a ? a.getAttribute('aria-controls') : null;
        return id ? document.getElementById(id) : null;
      },
      open: (li) => li.classList.contains('uk-active'),
      closedSettled: (li) => !li.classList.contains('uk-active'),
      settled: (li) => {
        const pane = kinds.tab.pane(li);
        if (!pane) return true;
        const switcher = pane.parentElement;
        const panes = switcher ? [...switcher.children] : [pane];
        return !panes.some((p) => pending(p) || markedMoving(p) || moving(p));
      },
      dismiss: () => [],
      region: (li) => kinds.tab.pane(li) || li,
    },
  };

  function find(kind, wanted) {
    const k = kinds[kind];
    if (!k) return { found: 0, error: `unknown kind ${kind}` };
    const items = k.all();
    const { matches, names } = pick(items, wanted, (el) => k.names(el));
    const chosen = narrow(matches);
    if (chosen.length >= 1) return { found: matches.length, ref: ref(chosen[0]), names };
    return { found: 0, names };
  }

  // The state of a component: { exists, open, settled, closedSettled, text, ... }.
  function state(kind, id) {
    const k = kinds[kind];
    const el = deref(id);
    if (!k || !el) return { exists: false };
    if (!el.isConnected) return { exists: false, removed: true };
    const region = k.region(el);
    const out = {
      exists: true,
      open: k.open(el),
      settled: k.settled(el),
      closedSettled: k.closedSettled(el),
      text: region && isRendered(region) ? norm(region.innerText || region.textContent) : '',
      name: norm(k.names(el)[0] || ''),
      classes: typeof el.className === 'string' ? el.className : '',
    };
    if (k.shownSettled) out.shownSettled = k.shownSettled(el);
    const holder = kind === 'drop-down menu' ? dropOf(el) : (kind === 'panel' && !el.matches('.uk-accordion > *') ? toggleTargets(el)[0] : el);
    const last = lastEvent(holder, kind === 'notification' ? 'close' : 'toggle');
    out.lastEvent = last ? last.type : '';
    return out;
  }

  // Shown and done moving / closed and done moving.
  function isShown(kind, id) {
    const s = state(kind, id);
    if (!s.exists) return false;
    if (s.shownSettled === false) return false;
    return s.open && s.settled && (kind !== 'dialog' || isRendered(deref(id)));
  }
  function isClosed(kind, id) {
    const s = state(kind, id);
    if (!s.exists) return true;
    return !s.open && s.settled && s.closedSettled;
  }

  // The tooltip a trigger owns (`uk-tooltip`), and its title.
  function hintOf(id) {
    const el = deref(id);
    if (!el) return null;
    const owner = [el, el.parentElement].find((x) => x && (x.hasAttribute('uk-tooltip') || x.hasAttribute('data-uk-tooltip')));
    if (!owner) return null;
    const opts = owner.getAttribute('uk-tooltip') || owner.getAttribute('data-uk-tooltip') || '';
    const title = /(?:^|;)\s*title\s*:/.test(opts) ? (opts.match(/(?:^|;)\s*title\s*:\s*([^;]*)/) || [])[1] : opts;
    return { ref: ref(owner), title: norm(title || owner.getAttribute('title') || '') };
  }
  function describedBy(id) {
    const el = deref(id);
    if (!el) return 0;
    const ids = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    const tip = ids.map((i) => document.getElementById(i)).find((t) => t && t.classList.contains('uk-tooltip'));
    return tip ? ref(tip) : 0;
  }

  // Any component still moving, anywhere on the page.
  function anyMoving() {
    const busy = [];
    for (const [kind, k] of Object.entries(kinds)) {
      for (const el of k.all()) {
        if (!k.settled(el)) busy.push(`${kind} "${norm(k.names(el)[0] || '')}"`);
        if (busy.length > 5) return busy;
      }
    }
    for (const s of slideshows()) if (!slidesSettled(s)) busy.push(`${kindOfSlides(s)} "${norm(slidesNames(s)[0] || '')}"`);
    const box = lightbox();
    if (box && !lightboxSettled(box)) busy.push('lightbox');
    for (const a of document.querySelectorAll('.uk-alert')) if (markedMoving(a)) busy.push('alert being dismissed');
    for (const f of document.querySelectorAll('[uk-filter], [data-uk-filter]')) if (pending(f, 'filter')) busy.push('filter');
    if (movingSelf(document.body)) busy.push('the page');
    const hx = htmxState();
    if (hx.busy) busy.push(hx.inflight || hx.marked ? `the page's htmx request (${hx.marked || `${hx.inflight} in flight`})` : `the components of the page htmx put in, not set up yet (${hx.unset.join(', ')})`);
    return busy;
  }

  function shownOfKind(kind) {
    const k = kinds[kind];
    return k.all().filter((el) => k.open(el) || !k.settled(el)).map((el) => norm(k.names(el)[0] || '') || '(no name)');
  }

  // ------------------------------------------------------------------ slideshows and sliders

  function slideshows() { return [...document.querySelectorAll('.uk-slideshow, .uk-slider, [uk-slideshow], [uk-slider], [data-uk-slideshow], [data-uk-slider]')].filter((s, i, all) => all.indexOf(s) === i); }
  function kindOfSlides(s) { return s.matches('.uk-slider, [uk-slider], [data-uk-slider]') ? 'slider' : 'slideshow'; }
  function slidesNames(s) {
    const heading = s.previousElementSibling && /^H[1-6]$/.test(s.previousElementSibling.tagName) ? textOf(s.previousElementSibling) : '';
    return [s.getAttribute('aria-label'), labelledText(s), heading, s.id, s.id ? `#${s.id}` : ''];
  }
  function slideItems(s) {
    const list = s.querySelector('.uk-slideshow-items, .uk-slider-items');
    return list ? [...list.children] : [];
  }
  function slidesSettled(s) {
    const items = slideItems(s);
    return !items.some((i) => markedMoving(i) || pending(i, 'item')) && !moving(s.querySelector('.uk-slideshow-items, .uk-slider-items'));
  }
  function slidesState(id) {
    const s = deref(id);
    if (!s || !s.isConnected) return { exists: false };
    const items = slideItems(s);
    const kind = kindOfSlides(s);
    const navActive = s.querySelector('.uk-slider-nav > .uk-active, .uk-slideshow-nav > .uk-active');
    let index = items.findIndex((i) => i.classList.contains('uk-active'));
    if (kind === 'slider' && navActive) index = Number(navActive.getAttribute('uk-slider-item') || navActive.getAttribute('data-uk-slider-item'));
    const shown = items.filter((i) => i.classList.contains('uk-active'));
    const texts = shown.map((item) => norm([item.innerText || '', ...[...item.querySelectorAll('img[alt]')].map((img) => img.getAttribute('alt'))].join(' ')));
    const last = items.reduce((max, i) => Math.max(max, (lastEvent(i, 'item') || {}).seq || 0), 0);
    const opts = s.getAttribute('uk-slideshow') || s.getAttribute('uk-slider') || s.getAttribute('data-uk-slideshow') || s.getAttribute('data-uk-slider') || '';
    const interval = Number((opts.match(/autoplay-interval\s*:\s*(\d+)/) || [])[1] || 7000);
    return {
      exists: true,
      kind,
      index: index + 1,
      count: items.length,
      settled: slidesSettled(s),
      text: texts.join(' | '),
      autoplay: /autoplay\s*:\s*true/.test(opts),
      interval,
      lastMoved: last,
      hasNav: !!s.querySelector('[uk-slideshow-item], [uk-slider-item], [data-uk-slideshow-item], [data-uk-slider-item]'),
    };
  }
  // The control that moves a slideshow or a slider: next, previous, or a number (from 0).
  function slidesControl(id, which) {
    const s = deref(id);
    if (!s) return 0;
    const attr = kindOfSlides(s) === 'slider' ? 'uk-slider-item' : 'uk-slideshow-item';
    const all = [...s.querySelectorAll(`[${attr}], [data-${attr}]`)];
    const found = all.find((c) => (c.getAttribute(attr) || c.getAttribute(`data-${attr}`)) === String(which));
    return found ? ref(found) : 0;
  }

  // ------------------------------------------------------------------ the lightbox

  function lightbox() { return document.querySelector('.uk-lightbox'); }
  function lightboxSettled(box) {
    if (!box || !box.isConnected) return true;
    const items = [...box.querySelectorAll('.uk-lightbox-items > *')];
    return !items.some((i) => markedMoving(i) || pending(i, 'item')) && !moving(box.querySelector('.uk-lightbox-items')) && !pending(box);
  }
  function lightboxState() {
    const box = lightbox();
    if (!box || !box.isConnected) return { exists: false };
    const items = [...box.querySelectorAll('.uk-lightbox-items > *')];
    const index = items.findIndex((i) => i.classList.contains('uk-active'));
    const item = items[index];
    const caption = box.querySelector('.uk-lightbox-caption');
    return {
      exists: true,
      open: box.classList.contains('uk-open'),
      index: index + 1,
      count: items.length,
      settled: lightboxSettled(box),
      caption: caption ? textOf(caption) : '',
      text: item ? norm([item.innerText || '', ...[...item.querySelectorAll('img[alt]')].map((img) => img.getAttribute('alt'))].join(' ')) : '',
    };
  }
  // The pictures and links that open the lightbox, by their caption, their picture's alt or their
  // name.
  function lightboxLinks() {
    return [...document.querySelectorAll('[uk-lightbox] a, [data-uk-lightbox] a, a[uk-lightbox], a[data-uk-lightbox]')];
  }
  function lightboxLinkNames(a) {
    const img = a.querySelector('img[alt]');
    return [a.getAttribute('data-caption'), a.getAttribute('data-alt'), img ? img.getAttribute('alt') : '', nameOf(a)];
  }

  // ------------------------------------------------------------------ alerts

  const ALERT_KINDS = ['primary', 'success', 'warning', 'danger'];
  function alertText(a) {
    const copy = a.cloneNode(true);
    copy.querySelectorAll('.uk-alert-close, .uk-close').forEach((b) => b.remove());
    return norm(copy.textContent);
  }
  function alerts(text, kind) {
    const want = norm(text).toLowerCase();
    return [...document.querySelectorAll('.uk-alert')].filter((a) => alertText(a).toLowerCase().includes(want) && (!kind || a.classList.contains(`uk-alert-${kind}`)));
  }
  function alertInfo(a) {
    return {
      ref: ref(a),
      kind: ALERT_KINDS.find((k) => a.classList.contains(`uk-alert-${k}`)) || 'default',
      text: alertText(a),
      rendered: isRendered(a) && Number((css(a) || {}).opacity) > 0 && !markedMoving(a),
      settled: !markedMoving(a) && !moving(a) && !pending(a),
      dismissible: !!a.querySelector('.uk-alert-close'),
    };
  }
  function allAlerts() { return [...document.querySelectorAll('.uk-alert')].filter(isRendered).map(alertInfo); }

  const NOTICE_KINDS = ['primary', 'success', 'warning', 'danger'];
  function noticeKind(n) { return NOTICE_KINDS.find((k) => n.classList.contains(`uk-notification-message-${k}`)) || 'default'; }

  // ------------------------------------------------------------------ navigation bars

  function navbars() { return [...document.querySelectorAll('.uk-navbar-container, [uk-navbar], [data-uk-navbar]')].filter((n, i, all) => all.indexOf(n) === i && !all.some((o) => o !== n && o.contains(n))); }
  function navbarNames(n) {
    const nav = n.closest('nav') || n;
    return [nav.getAttribute('aria-label'), n.getAttribute('aria-label'), labelledText(nav), textOf(n.querySelector('.uk-logo'))];
  }
  function navbarState(id) {
    const n = deref(id);
    if (!n || !n.isConnected) return { exists: false };
    const togglesIn = [...n.querySelectorAll('.uk-navbar-toggle')];
    const toggle = togglesIn.find(isRendered) || togglesIn[0] || null;
    const target = toggle ? toggleTargets(toggle)[0] : null;
    const collapsible = !!toggle && isRendered(toggle);
    let shown = true;
    let settled = true;
    if (target) {
      if (target.matches('.uk-offcanvas')) {
        shown = kinds['side panel'].open(target);
        settled = kinds['side panel'].settled(target);
      } else if (target.matches('.uk-modal')) {
        shown = kinds.dialog.open(target);
        settled = kinds.dialog.settled(target);
      } else {
        shown = !target.hidden && isRendered(target);
        settled = !pending(target) && !markedMoving(target) && !moving(target);
      }
      if (!collapsible) shown = true;
    }
    return { exists: true, collapsible, expanded: !collapsible || shown, settled, toggle: toggle ? ref(toggle) : 0, hasTarget: !!target, panel: !!target && target.matches('.uk-offcanvas, .uk-modal') };
  }

  // ------------------------------------------------------------------ forms

  function labelsNamed(wanted) {
    const want = norm(wanted).toLowerCase();
    return [...document.querySelectorAll('label')].filter((l) => textOf(l).toLowerCase() === want || textOf(l).toLowerCase().replace(/[:*]\s*$/, '').trim() === want);
  }
  function controlOf(label) {
    if (label.control) return label.control;
    const id = label.getAttribute('for');
    if (id) return document.getElementById(id);
    return label.querySelector('input, select, textarea');
  }
  function fields(wanted) {
    const found = labelsNamed(wanted).map(controlOf).filter(Boolean);
    if (found.length) return found;
    const want = norm(wanted).toLowerCase();
    return [...document.querySelectorAll('input, select, textarea')].filter((f) => norm(f.getAttribute('aria-label')).toLowerCase() === want || norm(f.getAttribute('placeholder')).toLowerCase() === want || labelledText(f).toLowerCase() === want);
  }
  // The message of a field: what it points at (aria-describedby, aria-errormessage), else the
  // next text after it in its own block (the framework has no class for it: a site writes it,
  // often with `uk-text-danger` or `uk-text-success`).
  function messagesOf(f) {
    const out = [];
    for (const attr of ['aria-describedby', 'aria-errormessage']) {
      for (const id of (f.getAttribute(attr) || '').split(/\s+/).filter(Boolean)) {
        const s = document.getElementById(id);
        if (s && !out.includes(s)) out.push(s);
      }
    }
    // The field's own block (its controls' wrapper, then the block of its label and controls).
    const blocks = [f.parentElement, f.closest('.uk-form-controls'), f.closest('.uk-margin, .js-form-item, .form-item, fieldset')].filter(Boolean);
    for (const block of blocks) {
      for (const s of block.querySelectorAll('.uk-text-danger, .uk-text-success, .uk-form-help, .uk-text-meta, .uk-text-small, .form-item--error-message, .description, [role="alert"]')) {
        if (s !== f && !s.contains(f) && !s.matches('label') && !out.includes(s)) out.push(s);
      }
    }
    return out;
  }
  function fieldState(id) {
    const f = deref(id);
    if (!f || !f.isConnected) return { exists: false };
    const invalid = f.classList.contains('uk-form-danger') || f.getAttribute('aria-invalid') === 'true';
    const valid = f.classList.contains('uk-form-success');
    const messages = messagesOf(f).filter(isRendered).map((s) => ({ text: textOf(s), kind: s.classList.contains('uk-text-danger') ? 'invalid' : s.classList.contains('uk-text-success') ? 'valid' : '' })).filter((m) => m.text);
    return { exists: true, invalid, valid, messages, settled: !moving(f), rendered: isRendered(f) };
  }
  function invalidFields() {
    return [...document.querySelectorAll('input, select, textarea')].filter((f) => isRendered(f) || (f.type === 'checkbox' && isRendered(f.parentElement))).filter((f) => f.classList.contains('uk-form-danger') || f.getAttribute('aria-invalid') === 'true').map((f) => {
      const label = f.labels && f.labels[0] ? textOf(f.labels[0]) : norm(f.getAttribute('aria-label') || f.name || f.id);
      return label;
    });
  }

  // ------------------------------------------------------------------ lists, pagination, breadcrumb, badges

  // What a person sees (the words for screen readers only left out) and what a screen reader
  // reads (what is aria-hidden left out).
  function seenText(el) {
    const copy = el.cloneNode(true);
    copy.querySelectorAll('.uk-hidden, .uk-invisible, [hidden], .visually-hidden, .element-invisible').forEach((x) => x.remove());
    return norm(copy.textContent);
  }
  function heardText(el) {
    if (el.getAttribute('aria-label')) return norm(el.getAttribute('aria-label'));
    const copy = el.cloneNode(true);
    copy.querySelectorAll('[aria-hidden="true"]').forEach((x) => x.remove());
    return norm(copy.textContent);
  }
  // The items of a navigation list (`.uk-nav`, `.uk-subnav`, the navbar's own), and of a drop.
  function navItems(wanted, scopeId) {
    const scope = scopeId ? deref(scopeId) : document;
    if (!scope) return { matches: [], names: [] };
    const items = [...scope.querySelectorAll('.uk-nav > li, .uk-subnav > li, .uk-navbar-nav > li, .uk-iconnav > li, .uk-thumbnav > li')]
      .filter((li) => !li.classList.contains('uk-nav-header') && !li.classList.contains('uk-nav-divider') && (scopeId || isRendered(li)));
    const names = (li) => {
      const a = li.querySelector(':scope > a, :scope > span, :scope > button') || li;
      const copy = a.cloneNode(true);
      copy.querySelectorAll('.uk-badge, [uk-navbar-parent-icon], [uk-nav-parent-icon], .uk-icon').forEach((b) => b.remove());
      return [norm(copy.textContent), nameOf(a)];
    };
    return pick(items, wanted, names);
  }
  function itemState(id) {
    const i = deref(id);
    if (!i) return { exists: false };
    const link = i.querySelector(':scope > a, :scope > span, :scope > button') || i;
    return {
      exists: true,
      active: i.classList.contains('uk-active') || link.getAttribute('aria-current') === 'page' || link.getAttribute('aria-current') === 'true',
      disabled: i.classList.contains('uk-disabled') || link.getAttribute('aria-disabled') === 'true' || link.hasAttribute('disabled'),
    };
  }
  function containerNamed(selector, wanted) {
    const all = [...document.querySelectorAll(selector)].filter(isRendered);
    if (!wanted) return { all, chosen: all[0] || null };
    const named = (el) => {
      const nav = el.closest('nav') || el;
      return [nav.getAttribute('aria-label'), labelledText(nav), el.getAttribute('aria-label')];
    };
    const { matches } = pick(all, wanted, named);
    return { all, chosen: matches[0] || null };
  }
  function trail(id) {
    const b = deref(id);
    if (!b) return null;
    const items = [...b.querySelectorAll(':scope > li')];
    const current = items.find((i) => i.querySelector('[aria-current="page"]') || i.getAttribute('aria-current') === 'page') || items[items.length - 1];
    return { items: items.map(seenText), current: current ? seenText(current) : '' };
  }
  function pagination(id) {
    const p = deref(id);
    if (!p) return null;
    const items = [...p.querySelectorAll(':scope > li')];
    const current = items.find((i) => i.classList.contains('uk-active') || i.getAttribute('aria-current') === 'page' || (i.querySelector('[aria-current="page"]')));
    const links = items.map((i) => {
      const link = i.querySelector('a, span') || i;
      return {
        names: [...new Set([seenText(link), heardText(link), norm(link.getAttribute('title'))].filter(Boolean))],
        disabled: i.classList.contains('uk-disabled') || link.getAttribute('aria-disabled') === 'true' || (link.tagName === 'A' && !link.hasAttribute('href')),
        current: i === current,
      };
    });
    const node = current ? (current.querySelector('a, span') || current) : null;
    return { current: node ? seenText(node) : '', currentNames: node ? [seenText(node), heardText(node)] : [], links };
  }
  function badgeHolders(kind, wanted) {
    const selectors = {
      button: 'button, .uk-button, [role="button"]',
      link: 'a[href]',
      heading: 'h1, h2, h3, h4, h5, h6, [role="heading"]',
      'list item': '.uk-nav > li > a, .uk-list > li, .uk-subnav > li > a',
      tab: '.uk-tab > li > a, [role="tab"]',
    };
    const all = [...document.querySelectorAll(selectors[kind] || '*')].filter(isRendered);
    const names = (el) => {
      const copy = el.cloneNode(true);
      copy.querySelectorAll('.uk-badge, .uk-label').forEach((b) => b.remove());
      return [norm(copy.textContent), nameOf(el)];
    };
    return pick(all, wanted, names);
  }
  function badgesOf(id) {
    const el = deref(id);
    if (!el) return [];
    return [...el.querySelectorAll('.uk-badge, .uk-label')].filter(isRendered).map((b) => ({ text: textOf(b), label: b.classList.contains('uk-label') }));
  }

  // ------------------------------------------------------------------ spinners and progress

  function spinners() {
    return [...document.querySelectorAll('.uk-spinner, [uk-spinner], [data-uk-spinner]')].filter((s) => isRendered(s) && Number((css(s) || {}).opacity) > 0).map((s) => {
      const holder = s.closest('[role="status"]') || s;
      return norm(holder.getAttribute('aria-label') || textOf(holder) || (s.parentElement ? textOf(s.parentElement) : ''));
    });
  }
  function progressBars() {
    return [...document.querySelectorAll('progress, [role="progressbar"]')].filter(isRendered);
  }
  function progressNames(p) {
    const labels = p.labels ? [...p.labels].map(textOf) : [];
    return [p.getAttribute('aria-label'), labelledText(p), ...labels, p.id];
  }
  function progressState(id) {
    const p = deref(id);
    if (!p || !p.isConnected) return { exists: false };
    let value;
    let max;
    if (p.tagName === 'PROGRESS') {
      max = Number(p.max) || 1;
      value = p.hasAttribute('value') ? Number(p.value) : NaN;
    } else {
      const min = Number(p.getAttribute('aria-valuemin') || 0);
      max = Number(p.getAttribute('aria-valuemax') || 100) - min;
      value = Number(p.getAttribute('aria-valuenow')) - min;
    }
    const announced = Number.isFinite(value) && max > 0 ? (value / max) * 100 : NaN;
    return { exists: true, announced, shown: announced, moving: moving(p), label: textOf(p) };
  }

  // ------------------------------------------------------------------ sticky elements, scrollspy, filters

  function stickies() { return [...document.querySelectorAll('[uk-sticky], [data-uk-sticky], .uk-sticky')].filter((s, i, all) => all.indexOf(s) === i); }
  function stickyNames(s) {
    const nav = s.querySelector('nav[aria-label], [aria-label]');
    const heading = headingOf(s);
    return [s.getAttribute('aria-label'), nav ? nav.getAttribute('aria-label') : '', labelledText(s), heading ? textOf(heading) : '', s.id, s.id ? `#${s.id}` : '', textOf(s.querySelector('.uk-logo'))];
  }
  function stickyState(id) {
    const s = deref(id);
    if (!s || !s.isConnected) return { exists: false };
    const box = s.getBoundingClientRect();
    return { exists: true, stuck: s.classList.contains('uk-sticky-fixed'), top: Math.round(box.top), rendered: isRendered(s), scrolling: false };
  }
  function filters() { return [...document.querySelectorAll('[uk-filter], [data-uk-filter]')]; }
  function filterNames(f) {
    const heading = f.previousElementSibling && /^H[1-6]$/.test(f.previousElementSibling.tagName) ? textOf(f.previousElementSibling) : '';
    return [f.getAttribute('aria-label'), labelledText(f), heading, f.id];
  }
  function filterState(id) {
    const f = deref(id);
    if (!f || !f.isConnected) return { exists: false };
    const opts = f.getAttribute('uk-filter') || f.getAttribute('data-uk-filter') || '';
    const target = (opts.match(/target\s*:\s*([^;]+)/) || [])[1];
    let list = null;
    try { list = target ? f.querySelector(target.trim()) : null; } catch (e) { list = null; }
    const items = list ? [...list.children] : [];
    const controls = [...f.querySelectorAll('[uk-filter-control], [data-uk-filter-control]')];
    return {
      exists: true,
      settled: !pending(f, 'filter') && !moving(list),
      shown: items.filter((i) => isRendered(i)).map((i) => textOf(i)),
      hidden: items.filter((i) => !isRendered(i)).map((i) => textOf(i)),
      controls: controls.map((c) => ({ name: nameOf(c.querySelector('a, button') || c), active: c.classList.contains('uk-active'), ref: ref(c.querySelector('a, button') || c) })),
    };
  }

  // ------------------------------------------------------------------ htmx

  // The components whose element is on the page and has no instance of the framework yet: the
  // nodes an htmx swap has just put in, before the framework's observer has set them up.
  const COMPONENT_ATTRS = ['uk-modal', 'uk-offcanvas', 'uk-accordion', 'uk-tab', 'uk-switcher', 'uk-slideshow', 'uk-slider', 'uk-dropdown', 'uk-drop', 'uk-navbar', 'uk-toggle', 'uk-alert', 'uk-sticky', 'uk-lightbox', 'uk-filter', 'uk-nav', 'uk-tooltip'];
  function notSetUp() {
    const u = window.UIkit;
    if (!u || typeof u.getComponents !== 'function') return [];
    // Only the components the page's build of the framework has: a core build has no slideshow,
    // and would never set one up.
    const known = COMPONENT_ATTRS.filter((a) => typeof u.component !== 'function' || u.component(a.slice(3)));
    if (!known.length) return [];
    return [...document.querySelectorAll(known.map((a) => `[${a}]`).join(', '))].filter((el) => Object.keys(u.getComponents(el) || {}).length === 0);
  }
  // htmx at work: a request in flight, a swap that has not settled, or new nodes not set up yet.
  // Nothing at all on a page without htmx.
  function htmxState() {
    if (!window.htmx) return { present: false, busy: false };
    const marked = document.querySelector('.htmx-request, .htmx-swapping, .htmx-settling');
    const unset = notSetUp();
    const what = marked ? `${marked.tagName.toLowerCase()}.${[...marked.classList].filter((c) => c.startsWith('htmx-')).join('.')}` : '';
    return {
      present: true,
      busy: !!marked || HX.inflight > 0 || unset.length > 0,
      inflight: HX.inflight,
      requests: HX.requests,
      settled: HX.settled,
      marked: what,
      unset: unset.slice(0, 3).map((el) => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '')),
    };
  }

  // ------------------------------------------------------------------ the components script

  function scriptVersion() {
    const u = window.UIkit;
    return u && u.version ? { version: String(u.version), via: 'global' } : { version: '', via: '' };
  }

  C.lib = {
    norm, find, state, isShown, isClosed, ref, deref, hintOf, describedBy, anyMoving, shownOfKind, eventsSince, seenText, heardText,
    seq: () => C.seq, isRendered, renderedRef: (id) => isRendered(deref(id)), moving, movingSelf, markedMoving, pending, nameOf, pick, toggles, toggleTargets, lastEvent,
    slideshows, kindOfSlides, slidesNames, slidesState, slideItems, slidesControl,
    lightbox, lightboxState, lightboxLinks, lightboxLinkNames,
    alerts, alertInfo, allAlerts, noticeKind,
    navbars, navbarNames, navbarState,
    fields, fieldState, invalidFields,
    navItems, itemState, containerNamed, trail, pagination, badgeHolders, badgesOf,
    spinners, progressBars, progressNames, progressState,
    stickies, stickyNames, stickyState, filters, filterNames, filterState,
    scriptVersion, kinds, htmxState, notSetUp,
  };
  window.__webshipUikit = C;
}

module.exports = { componentProbe };
