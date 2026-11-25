'use strict';

// Form states, the way a person sees them after sending a form: a field shown as valid or invalid
// (the class `uk-form-success` / `uk-form-danger` a page or a server sets, or `aria-invalid`), the
// message the page shows for it (what the field points at with aria-describedby, else the text of
// its block: the framework has no class of its own for it, pages use `uk-text-danger` and the
// like), and how many fields are shown as invalid.
//
// A field is found by its label (the label's text, with a trailing colon or star ignored), else by
// its aria-label or placeholder. The borders change colour with a transition: the steps wait for it.

const { Then } = require('@cucumber/cucumber');
const h = require('./uikit-helpers');

async function resolveField(world, label) {
  const result = await h.poll(world, (lib, a) => {
    const all = lib.fields(a.label);
    const shown = all.filter((f) => lib.isRendered(f) || (f.type === 'checkbox' && lib.isRendered(f.parentElement)) || (f.type === 'radio' && lib.isRendered(f.parentElement)));
    const pickOne = shown[0] || all[0];
    return { done: !!pickOne, ref: pickOne ? lib.ref(pickOne) : 0, labels: [...document.querySelectorAll('label')].map((l) => lib.norm(l.textContent)).filter(Boolean) };
  }, { label }, h.budget(world));
  if (result.ref) return result.ref;
  throw h.failure(world.page, `Expected a field labelled "${label}" on the page, but there is none.`, {
    found: `the labels here: ${h.listed(result.labels)}`,
    hint: 'a field is found by its label, else by its aria-label or its placeholder.',
  });
}

/**
 * A field is shown as valid or invalid: the page or the server marked it (`uk-form-success`,
 * `uk-form-danger`, or `aria-invalid="true"` for invalid). The step waits for the state and for the
 * field's transition to end.
 *
 * Example #1: Then the "Email" field should be shown as invalid
 * Example #2: Then the "Name" field should be shown as valid
 * Example #3: Then the "Plan" field should be shown as invalid
 * Example #4: Then the "Email" field should be shown as valid
 * Example #5: Then the "Plan" field should be shown as valid
 */
Then(/^the "([^"]*)" field should be shown as (valid|invalid)$/, async function (label, wanted) {
  const ref = await resolveField(this, label);
  const result = await h.poll(this, (lib, a) => {
    const s = lib.fieldState(a.ref);
    return { done: s.exists && s[a.wanted] && s.settled, state: s };
  }, { ref, wanted }, h.budget(this));
  if (result.done) return;
  const s = result.state || {};
  throw h.failure(this.page, `Expected the "${label}" field to be shown as ${wanted}, but it is shown as ${s.invalid ? 'invalid' : (s.valid ? 'valid' : 'neither valid nor invalid')}.`, {
    found: s.messages && s.messages.length ? `its messages: ${h.listed(s.messages.map((m) => m.text))}` : 'no message under it',
    hint: s.invalid || s.valid ? 'check the value of the field.' : 'a page marks its fields once the form is sent: uk-form-success for a valid one, uk-form-danger (or aria-invalid="true") for an invalid one.',
  });
});

/**
 * A field shows a message: the text it points at (aria-describedby, aria-errormessage), or a text of
 * its block that the page shows for it (often with `uk-text-danger`). The text is a part of the
 * message, compared without regard to letter case and white space.
 *
 * Example #1: Then the "Email" field should show the message "Type an address like name@example.com."
 * Example #2: Then the "Email" field should show the feedback "Type an address like"
 * Example #3: Then the "Email" field should show the message "name@example.com"
 * Example #4: And the "Email" field should show the message "Type an address"
 * Example #5: Then the "Email" field should show the feedback "like name@example.com."
 */
Then(/^the "([^"]*)" field should show the (?:message|feedback) "([^"]*)"$/, async function (label, text) {
  const ref = await resolveField(this, label);
  const result = await h.poll(this, (lib, a) => {
    const s = lib.fieldState(a.ref);
    const want = lib.norm(a.text).toLowerCase();
    return { done: s.exists && s.messages.some((m) => lib.norm(m.text).toLowerCase().includes(want)), state: s };
  }, { ref, text }, h.budget(this));
  if (result.done) return;
  const s = result.state || {};
  throw h.failure(this.page, `Expected the "${label}" field to show the message "${text}", but it ${s.messages && s.messages.length ? 'shows another' : 'shows none'}.`, {
    found: s.messages && s.messages.length ? `its messages: ${h.listed(s.messages.map((m) => m.text))}` : `the field is shown as ${s.invalid ? 'invalid' : (s.valid ? 'valid' : 'neither valid nor invalid')}`,
    hint: 'a message is a text the field points at (aria-describedby), or a text of its block (the page shows it once the form is sent).',
  });
});

/**
 * How many fields of the page are shown as invalid: a number, or "no". The step waits for the
 * count.
 *
 * Example #1: Then 3 fields should be shown as invalid
 * Example #2: Then no field should be shown as invalid
 * Example #3: Then 1 field should be shown as invalid
 * Example #4: Then no fields should be shown as invalid
 * Example #5: Then 2 fields should be shown as invalid
 */
Then(/^(\d+|no) fields? should be shown as invalid$/, async function (count) {
  const wanted = count === 'no' ? 0 : Number(count);
  const result = await h.poll(this, (lib, a) => {
    const invalid = lib.invalidFields();
    return { done: invalid.length === a.wanted, invalid };
  }, { wanted }, h.budget(this));
  if (result.done) return;
  throw h.failure(this.page, `Expected ${wanted === 0 ? 'no field' : `${wanted} field${wanted === 1 ? '' : 's'}`} to be shown as invalid, but ${result.invalid.length} ${result.invalid.length === 1 ? 'is' : 'are'}.`, {
    found: `the invalid fields: ${h.listed(result.invalid, 20)}`,
    hint: 'fields count once the page marks them (uk-form-danger or aria-invalid="true").',
  });
});
