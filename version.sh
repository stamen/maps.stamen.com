#!/bin/sh
VERSION=`perl -nle 'print $1 if /tile.stamen.js (v[0-9\\.]+)/' js/tile.stamen.js`
echo "Updating to version $VERSION..."
perl -pi -e "s/(tile.stamen.js)([^\"]*)/\$1?$VERSION/g" *.html */*.html
