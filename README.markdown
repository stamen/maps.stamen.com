UPDATE 25 July 2023: Apologies to those waiting patiently for responses to their help tickets! In the ten years since we created this demo website, we have never been able to keep up with the inquiries and demand. This summer we finally have some solutions. Please visit (the website)[http://maps.stamen.com/stadia-partnership/] to learn more, and if you've filed a help request, expect to hear back from us very soon.

Information below this line is deprecated.
---

This is the code behind the Stamen maps site, which shows off our custom tiles
and explains how to get them into other sites.

This repository also hosts a JavaScript utility which patches other map
libraries to provide Stamen tile layers. Simply grab a copy of
`js/tile.stamen.js` (or link directly to it at
`http://maps.stamen.com/js/tile.stamen.js`) and include it on your page after
your favorite mapping library, then follow the instructions below:

[ModestMaps](http://stamen.github.com/modestmaps-js/):

    var map = new MM.Map(...);
    var layer = new MM.StamenTileLayer("toner");
    map.addLayer(layer);

[Leaflet](http://leaflet.cloudmade.com/):

    var map = new L.Map(...);
    var layer = new L.StamenTileLayer("terrain");
    map.addLayer(layer);

[OpenLayers](http://openlayers.org/):

    var map = new OpenLayers.Map(...);
    var layer = new OpenLayers.Layer.Stamen("watercolor");
    map.addLayer(layer);

[Google Maps V3](http://code.google.com/apis/maps/documentation/javascript/):

    var map = new google.maps.Map(...);
    map.mapTypes.set("toner", new google.maps.StamenMapType("toner"));
    map.setMapTypeId("toner");
