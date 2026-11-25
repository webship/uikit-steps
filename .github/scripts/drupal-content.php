<?php

/**
 * @file
 * The content of the Drupal test site: a page of components written in Full HTML with the
 * framework's own markup (a dialog, an accordion, tabs, a slideshow, a dismissible alert, a form
 * with its fields marked valid and invalid as a server sends it back), twelve articles for the
 * front page's pager, and main menu links, one of them a drop-down menu.
 *
 * Run with `drush php:script drupal-content.php`; a second run changes nothing.
 */

use Drupal\menu_link_content\Entity\MenuLinkContent;
use Drupal\node\Entity\Node;

$storage = \Drupal::entityTypeManager()->getStorage('node');

$body = <<<'HTML'
<p>Questions our customers ask, and the ways to reach us.</p>
<h2>Opening hours</h2>
<p><button class="uk-button uk-button-primary" type="button" uk-toggle="target: #hours">See the opening hours</button></p>
<div id="hours" uk-modal>
  <div class="uk-modal-dialog uk-modal-body">
    <button class="uk-modal-close-default" type="button" uk-close aria-label="Close"></button>
    <h3 class="uk-modal-title">Opening hours</h3>
    <p>Monday to Friday, from 9:00 to 17:00.</p>
    <p class="uk-text-right"><button class="uk-button uk-button-default uk-modal-close" type="button">Close</button></p>
  </div>
</div>
<h2>Questions</h2>
<ul uk-accordion aria-label="Questions">
  <li class="uk-open"><a class="uk-accordion-title" href="#">How long does delivery take?</a><div class="uk-accordion-content"><p>Three to five working days.</p></div></li>
  <li><a class="uk-accordion-title" href="#">Can I return an item?</a><div class="uk-accordion-content"><p>Yes, within thirty days of delivery.</p></div></li>
  <li><a class="uk-accordion-title" href="#">Which payments do you take?</a><div class="uk-accordion-content"><p>Bank transfer, cheque or cash on delivery.</p></div></li>
</ul>
<h2>Our services</h2>
<div>
  <ul uk-tab aria-label="Services">
    <li class="uk-active"><a href="#">Design</a></li>
    <li><a href="#">Development</a></li>
    <li><a href="#">Support</a></li>
  </ul>
  <ul class="uk-switcher uk-margin">
    <li><p>We draw the pages before we build them.</p></li>
    <li><p>We build the site and its tests together.</p></li>
    <li><p>We answer within one working day.</p></li>
  </ul>
</div>
<h2>Projects</h2>
<div class="uk-position-relative" uk-slideshow="animation: push; ratio: 16:5" aria-label="Projects">
  <ul class="uk-slideshow-items">
    <li><div class="uk-flex uk-flex-center uk-flex-middle uk-height-1-1 uk-background-secondary uk-light"><div class="uk-text-center"><h3>A school website</h3><p>Timetables, news and a page for every class.</p></div></div></li>
    <li><div class="uk-flex uk-flex-center uk-flex-middle uk-height-1-1 uk-background-secondary uk-light"><div class="uk-text-center"><h3>A shop</h3><p>A catalogue, a cart and a checkout.</p></div></div></li>
    <li><div class="uk-flex uk-flex-center uk-flex-middle uk-height-1-1 uk-background-secondary uk-light"><div class="uk-text-center"><h3>A museum</h3><p>The collection, the exhibitions and the tickets.</p></div></div></li>
  </ul>
  <a class="uk-position-center-left uk-position-small" href="#" uk-slidenav-previous uk-slideshow-item="previous" aria-label="Previous slide"></a>
  <a class="uk-position-center-right uk-position-small" href="#" uk-slidenav-next uk-slideshow-item="next" aria-label="Next slide"></a>
  <ul class="uk-slideshow-nav uk-dotnav uk-flex-center uk-margin"></ul>
</div>
<div class="uk-alert-primary" uk-alert><a href class="uk-alert-close" uk-close aria-label="Close"></a><p>Our office is closed on public holidays.</p></div>
<h2>A form, as the server sent it back</h2>
<form class="uk-form-stacked" novalidate>
  <div class="uk-margin"><label class="uk-form-label" for="contact-name">Your name</label><div class="uk-form-controls"><input class="uk-input uk-form-success" id="contact-name" type="text" value="Jane"></div></div>
  <div class="uk-margin"><label class="uk-form-label" for="contact-email">Your email</label><div class="uk-form-controls"><input class="uk-input uk-form-danger" id="contact-email" type="email" value="jane@" aria-invalid="true" aria-describedby="contact-email-message"></div><p class="uk-text-danger uk-text-small" id="contact-email-message">Please enter a valid email address.</p></div>
</form>
HTML;

$existing = $storage->loadByProperties(['type' => 'page', 'title' => 'Components']);
$page = $existing ? reset($existing) : Node::create(['type' => 'page', 'title' => 'Components']);
$page->set('body', ['value' => $body, 'format' => 'full_html']);
$page->set('path', ['alias' => '/components']);
$page->setPublished();
$page->save();
echo "Page: /components (node {$page->id()})\n";

// Twelve articles: the front page lists ten, and its pager the rest.
for ($i = 1; $i <= 12; $i++) {
  $title = sprintf('News item %02d', $i);
  if ($storage->loadByProperties(['type' => 'article', 'title' => $title])) {
    continue;
  }
  $article = Node::create([
    'type' => 'article',
    'title' => $title,
    'body' => ['value' => "<p>The text of news item $i.</p>", 'format' => 'basic_html'],
    'promote' => 1,
    'status' => 1,
    'created' => \Drupal::time()->getRequestTime() - $i * 3600,
  ]);
  $article->save();
}
echo "Articles: 12\n";

// Main menu: a link to the page, and a parent with two children that the theme shows as a
// drop-down menu (an expanded link).
$links = \Drupal::entityTypeManager()->getStorage('menu_link_content');
$find = function ($title) use ($links) {
  $found = $links->loadByProperties(['menu_name' => 'main', 'title' => $title]);
  return $found ? reset($found) : NULL;
};
if (!$find('Components')) {
  MenuLinkContent::create(['title' => 'Components', 'link' => ['uri' => 'internal:/components'], 'menu_name' => 'main', 'weight' => 1])->save();
}
$parent = $find('Services');
if (!$parent) {
  $parent = MenuLinkContent::create(['title' => 'Services', 'link' => ['uri' => 'internal:/components'], 'menu_name' => 'main', 'weight' => 2, 'expanded' => TRUE]);
  $parent->save();
}
foreach (['Design' => 1, 'Development' => 2] as $title => $weight) {
  if (!$find($title)) {
    MenuLinkContent::create(['title' => $title, 'link' => ['uri' => 'internal:/components'], 'menu_name' => 'main', 'parent' => 'menu_link_content:' . $parent->uuid(), 'weight' => $weight])->save();
  }
}
echo "Main menu: Components, Services (Design, Development)\n";
