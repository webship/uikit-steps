#!/usr/bin/env bash
#
# Builds the site of tests/cms/: a Drupal 11 site (the recommended project) in DDEV, with the free
# theme UI Suite UIkit as its default theme and the content of drupal-content.php (a page of
# components written with the framework's markup, twelve articles for the front page's pager, a
# main menu with a drop-down menu).
#
#   SITE_DIR     where the site is made (default: ../drupal-site, beside this repository)
#   SITE_NAME    its DDEV project name, and so its address (default: uikitstepsdrupal)
#   COUNTS_ONLY  1: build nothing; print the counts a run of tests/cms must leave as it found them
#
# The site's own administrator gets a random password: nobody signs in.
# Under GitHub Actions, LAUNCH_URL is written to the job's environment.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITE_DIR="${SITE_DIR:-$(cd "$HERE/../../.." && pwd)/drupal-site}"
SITE_NAME="${SITE_NAME:-uikitstepsdrupal}"

if [ "${COUNTS_ONLY:-}" = "1" ]; then
  cd "$SITE_DIR"
  ddev drush php:eval '
    $q = fn($sql) => \Drupal::database()->query($sql)->fetchField();
    echo "nodes: " . $q("SELECT COUNT(*) FROM {node_field_data}") . " (published " . $q("SELECT COUNT(*) FROM {node_field_data} WHERE status = 1") . ")\n";
    echo "node revisions: " . $q("SELECT COUNT(*) FROM {node_revision}") . "\n";
    echo "menu links: " . $q("SELECT COUNT(*) FROM {menu_link_content_data}") . "\n";
    echo "path aliases: " . $q("SELECT COUNT(*) FROM {path_alias}") . "\n";
    echo "users: " . $q("SELECT COUNT(*) FROM {users_field_data}") . "\n";
    echo "comments: " . (\Drupal::database()->schema()->tableExists("comment_field_data") ? $q("SELECT COUNT(*) FROM {comment_field_data}") : 0) . "\n";
    echo "default theme: " . \Drupal::config("system.theme")->get("default") . "\n";
  ' < /dev/null
  exit 0
fi

mkdir -p "$SITE_DIR"
cd "$SITE_DIR"

ddev config --project-type=drupal11 --docroot=web --project-name="$SITE_NAME" --nodejs-version=24 --auto
ddev start -y < /dev/null

if [ ! -f composer.json ]; then
  ddev composer create-project drupal/recommended-project:^11.4 --no-interaction < /dev/null
fi
ddev composer require drush/drush drupal/ui_suite_uikit --no-interaction < /dev/null

if ! ddev drush status --field=bootstrap < /dev/null 2>/dev/null | grep -q Successful; then
  ddev drush site:install standard --site-name="Components site" --account-name=admin \
    --account-pass="$(head -c 18 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 20)" -y < /dev/null
fi

# The standard profile of Drupal 11.4 leaves the content types to core's recipes.
for type in page article; do
  if [ "$(ddev drush php:eval "echo \\Drupal\\node\\Entity\\NodeType::load('$type') ? 'yes' : 'no';" < /dev/null)" != "yes" ]; then
    ddev drush recipe "core/recipes/${type}_content_type" < /dev/null
  fi
done

# The theme needs the modules of its UI Suite: they are installed with it.
ddev drush theme:enable ui_suite_uikit -y < /dev/null
ddev drush config:set system.theme default ui_suite_uikit -y < /dev/null

cp "$HERE/drupal-content.php" "$SITE_DIR/drupal-content.php"
ddev drush php:script drupal-content.php < /dev/null
ddev drush cache:rebuild < /dev/null

echo "The site answers at https://$SITE_NAME.ddev.site"
if [ -n "${GITHUB_ENV:-}" ]; then
  echo "LAUNCH_URL=https://$SITE_NAME.ddev.site" >> "$GITHUB_ENV"
fi
