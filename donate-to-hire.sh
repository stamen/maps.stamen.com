# This script was used to replace all instances of the "donate" link with a "hire us!" link.
# -- Curran May 2021

# Inspired by https://superuser.com/questions/428493/how-can-i-do-a-recursive-find-and-replace-from-the-command-line

# Change the tooltip and href
find . -type f -name '*.html' -print0 | xargs -0 sed -i'' -e 's/title="donate" href="https:\/\/stamen.com\/opensource\/#donate"/title="hire us!" href="https:\/\/stamen.com\/contact\/"/'

# Change the visible content
find . -type f -name '*.html' -print0 | xargs -0 sed -i'' -e 's/>donate</>hire us!</g'


