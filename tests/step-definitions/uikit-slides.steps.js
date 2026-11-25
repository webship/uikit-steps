'use strict';

// Slideshows and sliders: the next and previous slides, a slide by its number (through the dots or
// the numbers of their navigation), which slide is shown, what it shows, and one that moves on by
// itself; and the lightbox: opened from a picture of a gallery, its pictures one after the other,
// what it shows, closed.
//
// A slideshow or a slider is named by its aria-label (or aria-labelledby), the heading just before
// it, or its id; without a name, the only one on the page. "Carousel" names either. The steps wait
// for the slide's own end event (`itemshown`) and for the classes the framework gives the slides
// while they move (`uk-slide-enter`, `uk-slide-leave`, `uk-transition`) to go: the dots change at
// the start of a move, so they are not the sign that it has ended. The lightbox sends `shown` when
// it opens, while its picture still slides in: the steps wait for the picture.

const { When, Then } = require('@cucumber/cucumber');
const h = require('./uikit-helpers');

function label(name, word) {
  const noun = word || 'slideshow';
  return name ? `the "${name}" ${noun}` : `the ${noun}`;
}

async function resolveSlides(world, name, word) {
  const result = await h.poll(world, (lib, a) => {
    const all = lib.slideshows().filter(lib.isRendered).filter((s) => a.word === 'carousel' || lib.kindOfSlides(s) === a.word);
    if (!a.name) return { done: all.length > 0, ref: all.length === 1 ? lib.ref(all[0]) : 0, count: all.length, names: all.map((s) => lib.slidesNames(s).find(Boolean) || '') };
    const { matches, names } = lib.pick(all, a.name, (s) => lib.slidesNames(s));
    return { done: matches.length > 0, ref: matches.length ? lib.ref(matches[0]) : 0, count: all.length, names };
  }, { name: name || '', word }, h.budget(world));
  if (result.ref) return result.ref;
  if (!name && result.count > 1) {
    throw h.failure(world.page, `Expected one ${word} on the page, but there are ${result.count}.`, {
      found: `their names: ${h.listed(result.names)}`,
      hint: `name it by its aria-label, the heading before it or its id: When I go to the next slide of the "Gallery" ${word}`,
    });
  }
  throw h.failure(world.page, name ? `Expected a ${word} named "${name}" on the page, but there is none.` : `Expected a ${word} on the page, but there is none.`, {
    found: `the ${word === 'carousel' ? 'slideshows and sliders' : `${word}s`} here: ${h.listed(result.names)}`,
    hint: `a ${word} is named by its aria-label, its aria-labelledby, the heading just before it or its id.`,
  });
}

async function waitSlide(world, ref, index, timeout) {
  return h.poll(world, (lib, a) => {
    const s = lib.slidesState(a.ref);
    return { done: s.exists && s.settled && (a.index === null || s.index === a.index), state: s };
  }, { ref, index }, timeout || h.budget(world));
}

/**
 * Go to the next or the previous slide of a slideshow or a slider with its own arrow, and wait
 * until the move has ended (`itemshown` and no moving class left). One still moving is let finish
 * first. Without a name, the only one on the page.
 *
 * Example #1: When I go to the next slide of the "Gallery" slideshow
 * Example #2: When I go to the previous slide of the "Gallery" slideshow
 * Example #3: When I go to the next slide of the "Products" slider
 * Example #4: When I go to the next slide of the slider
 * Example #5: When we go to the previous slide of the "Gallery" carousel
 */
When(/^(?:I |we )?go to the (next|previous) slide of the (?:"([^"]*)" )?(slideshow|slider|carousel)$/, async function (direction, name, word) {
  const ref = await resolveSlides(this, name, word);
  const before = await waitSlide(this, ref, null);
  // The arrows of many slideshows show only while the pointer is over them: point at it first.
  const holder = await h.handleOf(this, ref);
  if (holder) {
    await holder.hover({ timeout: h.budget(this) }).catch(() => {});
    await holder.dispose();
  }
  const button = await h.call(this, 'slidesControl', ref, direction);
  const visible = button ? await h.call(this, 'renderedRef', button) : false;
  if (!button || !visible) {
    throw h.failure(this.page, `Could not go to the ${direction} slide of ${label(name, word)}: it has no visible ${direction} arrow${before.state && before.state.kind === 'slider' ? ' (a slider that ends at its last slide, or starts at its first, hides that arrow there)' : ''}.`, {
      hint: `an arrow carries uk-slideshow-item="${direction}" (uk-slider-item in a slider).`,
    });
  }
  const from = before.state && before.state.index;
  const count = before.state && before.state.count;
  await h.clickRef(this, button, `the ${direction} arrow of ${label(name, word)}`);
  const step = direction === 'next' ? 1 : -1;
  const expected = from && count && before.state.kind === 'slideshow' ? ((from - 1 + step + count) % count) + 1 : null;
  const after = await waitSlide(this, ref, expected);
  if (!after.done || (expected === null && after.state.index === from)) {
    throw h.failure(this.page, `Expected ${label(name, word)} to move to its ${direction} slide, but it shows slide ${after.state.index}${after.state.settled ? '' : ' and is still moving'}.`, {
      hint: 'a slideshow that plays by itself may have moved on meanwhile; point at it to pause it, or check its slide with "should show slide ... of ...".',
    });
  }
});

/**
 * Go to a slide by its number (the first is 1) with the dots or the numbers of its navigation, and
 * wait until the move has ended. Without a name, the only one on the page.
 *
 * Example #1: When I go to slide 3 of the "Gallery" slideshow
 * Example #2: When I go to slide 1 of the "Gallery" slideshow
 * Example #3: When I go to slide 2 of the "Highlights" slideshow
 * Example #4: When I go to slide 3 of the "Products" slider
 * Example #5: When we go to slide 2 of the "Gallery" carousel
 */
When(/^(?:I |we )?go to slide (\d+) of the (?:"([^"]*)" )?(slideshow|slider|carousel)$/, async function (number, name, word) {
  const ref = await resolveSlides(this, name, word);
  const before = await waitSlide(this, ref, null);
  const index = Number(number);
  if (before.state && before.state.count && (index < 1 || index > before.state.count)) {
    throw h.failure(this.page, `Could not go to slide ${index} of ${label(name, word)}: it has ${before.state.count} slides.`, {
      hint: 'slides are numbered from 1.',
    });
  }
  if (before.state && before.state.index === index) return;
  const dot = await h.call(this, 'slidesControl', ref, index - 1);
  if (!dot) {
    throw h.failure(this.page, `Could not go to slide ${index} of ${label(name, word)}: it has no dot or number to choose a slide with.`, {
      hint: `use its arrows instead: When I go to the next slide of the ${word}`,
    });
  }
  // The control is the item of the navigation: its link is what a person clicks.
  const link = await this.page.evaluate((r) => {
    const lib = window.__webshipUikit.lib;
    const el = lib.deref(r);
    const a = el && el.matches('li') ? el.querySelector('a, button') : el;
    return lib.ref(a || el);
  }, dot);
  await h.clickRef(this, link, `the dot of slide ${index} of ${label(name, word)}`);
  const after = await waitSlide(this, ref, index);
  if (!after.done) {
    throw h.failure(this.page, `Expected ${label(name, word)} to show slide ${index} after its dot was clicked, but it shows slide ${after.state.index}${after.state.settled ? '' : ' and is still moving'}.`, {
      hint: 'check that the page loads the components script ("the page should use the components script").',
    });
  }
});

/**
 * A slideshow or a slider shows a slide (counted from 1) out of a number of slides, once it has
 * stopped moving: for a slideshow the slide on the screen, for a slider the first one on the
 * screen. Without a name, the only one on the page.
 *
 * Example #1: Then the "Gallery" slideshow should show slide 1 of 3
 * Example #2: Then the "Gallery" slideshow should show slide 2 of 3
 * Example #3: Then the "Products" slider should show slide 2 of 6
 * Example #4: Then the "Highlights" slideshow should show slide 1 of 2
 * Example #5: Then the slider should show slide 1 of 6
 */
Then(/^the (?:"([^"]*)" )?(slideshow|slider|carousel) should show slide (\d+) of (\d+)$/, async function (name, word, number, total) {
  const ref = await resolveSlides(this, name, word);
  const result = await waitSlide(this, ref, Number(number));
  if (result.done && result.state.count === Number(total)) return;
  const s = result.state || {};
  throw h.failure(this.page, `Expected ${label(name, word)} to show slide ${number} of ${total}, but it shows slide ${s.index} of ${s.count}${s.settled ? '' : ' and is still moving'}.`, {
    found: s.text ? `on the screen: "${h.excerpt(s.text, 120)}"` : undefined,
    hint: s.autoplay ? 'this one plays by itself; point at it to pause it before reading its slide.' : 'slides are counted from 1.',
  });
});

/**
 * A slideshow or a slider shows a text on the screen (a part of the text or the alternative text
 * of the pictures of the slides on the screen), once it has stopped moving; with "not", it does
 * not. Without a name, the only one on the page.
 *
 * Example #1: Then the "Gallery" slideshow should show "The harbour at dawn"
 * Example #2: Then the "Gallery" slideshow should show "The market on Saturday"
 * Example #3: Then the "Products" slider should show "Ruler"
 * Example #4: Then the "Products" slider should not show "Stapler"
 * Example #5: Then the "Highlights" slideshow should show "Free shipping this week"
 */
Then(/^the (?:"([^"]*)" )?(slideshow|slider|carousel) should( not)? show "([^"]*)"$/, async function (name, word, not, text) {
  const ref = await resolveSlides(this, name, word);
  const result = await h.poll(this, (lib, a) => {
    const s = lib.slidesState(a.ref);
    const has = lib.norm(s.text).toLowerCase().includes(lib.norm(a.text).toLowerCase());
    return { done: s.exists && s.settled && (a.not ? !has : has), state: s };
  }, { ref, text, not: !!not }, h.budget(this));
  if (result.done) return;
  const s = result.state || {};
  throw h.failure(this.page, `Expected ${label(name, word)} ${not ? 'not ' : ''}to show "${text}", but its slide ${s.index} of ${s.count} ${not ? 'does' : 'does not'}${s.settled ? '' : ' (it is still moving)'}.`, {
    found: `on the screen: "${h.excerpt(s.text, 160)}"`,
    hint: 'the text is a part of the text or the alternative text of a picture of the slides on the screen.',
  });
});

/**
 * A slideshow or a slider that plays by itself moves to its next slide without being touched: the
 * step waits for its next move, for at most its interval (`autoplay-interval`, 7 seconds by
 * default) and a little more, and checks it went one slide on. Without a name, the only one on the
 * page. The pointer is moved off it first: it pauses while the pointer is over it.
 *
 * Example #1: Then the "Highlights" slideshow should move to the next slide by itself
 * Example #2: And the "Highlights" slideshow should move to the next slide by itself
 * Example #3: Then the "Highlights" carousel should move to the next slide by itself
 * Example #4: But the "Highlights" slideshow should move to the next slide by itself
 * Example #5: Then the "Highlights" slideshow should move to the next slide by itself
 */
Then(/^the (?:"([^"]*)" )?(slideshow|slider|carousel) should move to the next slide by itself$/, async function (name, word) {
  const ref = await resolveSlides(this, name, word);
  await this.page.mouse.move(0, 0);
  const start = await waitSlide(this, ref, null);
  const s = start.state || {};
  const timeout = Math.min((s.interval || 7000) + 3000, Math.max(h.longBudget(this), (s.interval || 7000) + 3000));
  const expected = s.index && s.count ? (s.index % s.count) + 1 : null;
  const result = await h.poll(this, (lib, a) => {
    const now = lib.slidesState(a.ref);
    return { done: now.exists && now.settled && now.index === a.expected, state: now };
  }, { ref, expected }, timeout);
  if (result.done) return;
  throw h.failure(this.page, `Expected ${label(name, word)} to move to slide ${expected} by itself within ${Math.round(timeout / 1000)} seconds, but it still shows slide ${result.state.index}.`, {
    found: s.autoplay ? `autoplay on, an interval of ${s.interval} ms` : 'it is not set to play by itself (no autoplay: true)',
    hint: 'a slideshow plays by itself with autoplay: true, and pauses while the pointer is over it.',
  });
});

// ------------------------------------------------------------------ the lightbox

async function waitLightbox(world, want, index, timeout) {
  return h.poll(world, (lib, a) => {
    const s = lib.lightboxState();
    if (!a.want) return { done: !s.exists, state: s };
    return { done: s.exists && s.open && s.settled && (a.index === null || s.index === a.index), state: s };
  }, { want, index }, timeout || h.budget(world));
}

function lightboxNow(s) {
  if (!s || !s.exists) return 'not open';
  return `on picture ${s.index} of ${s.count}${s.settled ? '' : ', still moving'}${s.caption ? ` ("${h.excerpt(s.caption, 80)}")` : ''}`;
}

/**
 * Open the lightbox from a picture or a link of a gallery, named by its caption, the alternative
 * text of its picture or its text, and wait until the lightbox is open and its picture has stopped
 * moving (`itemshown`: the lightbox sends `shown` while its picture still slides in).
 *
 * Example #1: When I open the lightbox from the "The market on Saturday" picture
 * Example #2: When I open the lightbox from the "The harbour at dawn" picture
 * Example #3: When I open the lightbox from the "The old bridge" link
 * Example #4: When we open the lightbox from the "The garden in spring" picture
 * Example #5: When I open the lightbox from the "The old bridge" picture
 */
When(/^(?:I |we )?open the lightbox from the "([^"]*)" (picture|link)$/, async function (name, word) {
  const found = await h.poll(this, (lib, a) => {
    const links = lib.lightboxLinks().filter(lib.isRendered);
    const { matches, names } = lib.pick(links, a.name, (l) => lib.lightboxLinkNames(l));
    return { done: matches.length > 0, ref: matches.length ? lib.ref(matches[0]) : 0, names };
  }, { name }, h.budget(this));
  if (!found.ref) {
    throw h.failure(this.page, `Expected a ${word} named "${name}" that opens the lightbox, but there is none.`, {
      found: `the pictures of the galleries here: ${h.listed(found.names)}`,
      hint: 'a picture is named by its caption (data-caption), the alternative text of its picture, or its text.',
    });
  }
  await h.clickRef(this, found.ref, `the "${name}" ${word}`);
  const result = await waitLightbox(this, true, null);
  if (!result.done) {
    throw h.failure(this.page, `Expected the lightbox to open from the "${name}" ${word}, but it is ${lightboxNow(result.state)}.`, {
      hint: 'check that the page loads the components script ("the page should use the components script"), and that the gallery carries uk-lightbox.',
    });
  }
});

/**
 * Go to the next or the previous picture of the open lightbox with its own arrow, and wait until
 * the picture has stopped moving.
 *
 * Example #1: When I go to the next picture of the lightbox
 * Example #2: When I go to the previous picture of the lightbox
 * Example #3: When we go to the next picture of the lightbox
 * Example #4: And I go to the next picture of the lightbox
 * Example #5: When I go to the previous picture of the lightbox
 */
When(/^(?:I |we )?go to the (next|previous) picture of the lightbox$/, async function (direction) {
  const before = await waitLightbox(this, true, null);
  if (!before.done) {
    throw h.failure(this.page, `Could not go to the ${direction} picture of the lightbox: it is ${lightboxNow(before.state)}.`, {
      hint: 'open it first: When I open the lightbox from the "..." picture',
    });
  }
  const from = before.state.index;
  const count = before.state.count;
  const button = await this.page.evaluate((dir) => {
    const lib = window.__webshipUikit.lib;
    const box = lib.lightbox();
    const el = box ? box.querySelector(`[uk-lightbox-item="${dir}"], [data-uk-lightbox-item="${dir}"]`) : null;
    return el ? lib.ref(el) : 0;
  }, direction);
  if (!button) {
    throw h.failure(this.page, `Could not go to the ${direction} picture of the lightbox: it has no ${direction} arrow (a lightbox of one picture has none).`, {
      hint: 'check how many pictures it has: Then the lightbox should show picture 1 of 1',
    });
  }
  await h.clickRef(this, button, `the ${direction} arrow of the lightbox`);
  const step = direction === 'next' ? 1 : -1;
  const expected = ((from - 1 + step + count) % count) + 1;
  const after = await waitLightbox(this, true, expected);
  if (!after.done) {
    throw h.failure(this.page, `Expected the lightbox to show picture ${expected} of ${count} after its ${direction} arrow, but it is ${lightboxNow(after.state)}.`, {
      hint: 'check that the page loads the components script ("the page should use the components script").',
    });
  }
});

/**
 * The open lightbox shows a picture (counted from 1) out of a number, once it has stopped moving.
 *
 * Example #1: Then the lightbox should show picture 2 of 4
 * Example #2: Then the lightbox should show picture 3 of 4
 * Example #3: Then the lightbox should show picture 1 of 4
 * Example #4: And the lightbox should show picture 4 of 4
 * Example #5: Then the lightbox should show picture 2 of 4
 */
Then(/^the lightbox should show picture (\d+) of (\d+)$/, async function (number, total) {
  const result = await waitLightbox(this, true, Number(number));
  if (result.done && result.state.count === Number(total)) return;
  throw h.failure(this.page, `Expected the lightbox to show picture ${number} of ${total}, but it is ${lightboxNow(result.state)}${result.state && result.state.exists ? ` of ${result.state.count}` : ''}.`, {
    hint: 'pictures are counted from 1, in the order of the gallery.',
  });
});

/**
 * The open lightbox shows a text (a part of its caption, or the alternative text of its picture),
 * once its picture has stopped moving; with "not", it does not.
 *
 * Example #1: Then the lightbox should show "The market on Saturday"
 * Example #2: Then the lightbox should show "The old bridge"
 * Example #3: Then the lightbox should not show "The harbour at dawn"
 * Example #4: And the lightbox should show "The garden in spring"
 * Example #5: Then the lightbox should show "The harbour"
 */
Then(/^the lightbox should( not)? show "([^"]*)"$/, async function (not, text) {
  const result = await h.poll(this, (lib, a) => {
    const s = lib.lightboxState();
    const has = lib.norm(`${s.caption} ${s.text}`).toLowerCase().includes(lib.norm(a.text).toLowerCase());
    return { done: s.exists && s.settled && (a.not ? !has : has), state: s };
  }, { text, not: !!not }, h.budget(this));
  if (result.done) return;
  const s = result.state || {};
  throw h.failure(this.page, s.exists
    ? `Expected the lightbox ${not ? 'not ' : ''}to show "${text}", but its picture ${s.index} of ${s.count} ${not ? 'does' : 'does not'}${s.settled ? '' : ' (it is still moving)'}.`
    : `Expected the lightbox to show "${text}", but it is not open.`, {
    found: s.exists ? `its caption: "${h.excerpt(s.caption, 120)}"` : undefined,
    hint: s.exists ? 'the text is a part of its caption or of the alternative text of its picture.' : 'open it first: When I open the lightbox from the "..." picture',
  });
});

/**
 * Close the open lightbox with its close button, and wait until it has left the page.
 *
 * Example #1: When I close the lightbox
 * Example #2: When we close the lightbox
 * Example #3: And I close the lightbox
 * Example #4: Then I close the lightbox
 * Example #5: When I close the lightbox
 */
When(/^(?:I |we )?close the lightbox$/, async function () {
  const open = await waitLightbox(this, true, null);
  if (!open.done) return;
  const button = await this.page.evaluate(() => {
    const lib = window.__webshipUikit.lib;
    const box = lib.lightbox();
    const el = box ? box.querySelector('.uk-lightbox-close, [uk-close]') : null;
    return el ? lib.ref(el) : 0;
  });
  if (button) {
    const holder = await h.handleOf(this, button);
    if (holder) {
      // Its controls show while the pointer moves over the lightbox.
      await holder.hover({ timeout: h.budget(this), force: true }).catch(() => {});
      await holder.dispose();
    }
    await h.clickRef(this, button, 'the close button of the lightbox');
  } else {
    await this.page.keyboard.press('Escape');
  }
  const result = await waitLightbox(this, false, null);
  if (!result.done) {
    throw h.failure(this.page, `Expected the lightbox to close, but it is ${lightboxNow(result.state)}.`, {
      hint: 'check that the page loads the components script ("the page should use the components script").',
    });
  }
});

/**
 * The lightbox is open with its picture done moving, or with "not" it is closed (it has left the
 * page).
 *
 * Example #1: Then the lightbox should be shown
 * Example #2: Then the lightbox should not be shown
 * Example #3: And the lightbox should be shown
 * Example #4: But the lightbox should not be shown
 * Example #5: Then the lightbox should be shown
 */
Then(/^the lightbox should( not)? be shown$/, async function (not) {
  const result = await waitLightbox(this, !not, null);
  if (result.done) return;
  throw h.failure(this.page, `Expected the lightbox ${not ? 'not ' : ''}to be shown, but it is ${lightboxNow(result.state)}.`, {
    hint: not ? 'close it first: When I close the lightbox' : 'open it first: When I open the lightbox from the "..." picture',
  });
});
