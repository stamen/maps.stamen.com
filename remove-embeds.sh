# This script was used to remove the "embed" button across pages.
# -- Curran May 2021

# Inspired by https://superuser.com/questions/428493/how-can-i-do-a-recursive-find-and-replace-from-the-command-line

# Original string:


# Remove embed code toggler.
find . -type f -name '*.html' -print0 | xargs -0 sed -i'' -e 's/<a id="embed-toggle" class="toggler" title="embed this map">&lt;embed&gt;<\/a>//g'

# Remove embed code content
#find . -type f -name '*.html' -print0 | xargs -0 sed -i'' -e 's/<div id="embed-content"//g'
