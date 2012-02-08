// for debugging purposes
var maps = {};
window.onload = function() {

    try {

    // returns the map provider for a given TileStache layer name
    function getProvider(layer) {
        return new MM.TemplatedLayer("http://tile.stamen.com/" + layer + "/{Z}/{X}/{Y}.png");
    }

    // our main map
    var main = maps.main = new MM.Map("map-main", getProvider("toner"), null, [new MM.DragHandler(), new MM.DoubleClickHandler()]);

    // keep a reference to the sub-map wrapper to figure out
    // positioning stuff
    var wrapper = maps.wrapper = document.getElementById("maps-sub"),
        subs = maps.sub = [],
        // then grab all the sub-map element references
        subParents = wrapper.querySelectorAll(".map");
    // create a map for each sub-map element
    for (var i = 0; i < subParents.length; i++) {
        var el = subParents[i],
            // the provider is based on the data-provider HTML attribute
            provider = getProvider(el.getAttribute("data-provider")),
            // FIXME: these maps are not interactive
            map = new MM.Map(el, provider, null, [new MM.DragHandler(), new MM.DoubleClickHandler()]);
        map.addCallback("panned", function(_map, offset) {
            if (!main.panning) {
                _map.panning = true;
                main.panBy(offset[0], offset[1]);
                _map.panning = false;
            }
        });
        subs.push(map);
    }

    // sync sub-maps to the main map's center using their
    // relative positions on screen
    function updateSubMaps() {
        var mainWidth = main.dimensions.x,
            wrapperWidth = wrapper.offsetWidth,
            wrapperTop = wrapper.offsetTop,
            offsetX = mainWidth - (mainWidth - wrapperWidth) / 2;
        for (var i = 0; i < subs.length; i++) {
            var sub = subs[i],
                point = new MM.Point(0, 0);
            point.x = offsetX - sub.dimensions.x / 2;
            point.y = wrapperTop + sub.parent.offsetTop + sub.dimensions.y / 2;
            sub.setCenterZoom(main.pointLocation(point), main.getZoom());
        }
    }

    // zoom click handlers
    MM.addEvent(document.getElementById("zoom-in"), "click", function() {
        main.zoomIn();
        return false;
    });
    MM.addEvent(document.getElementById("zoom-out"), "click", function() {
        main.zoomOut();
        return false;
    });

    // pan the sub-maps when the main map is panned
    main.addCallback("panned", function(_map, offset) {
        if (main.panning) return;
        main.panning = true;
        for (var i = 0; i < subs.length; i++) {
            var sub = subs[i];
            if (!sub.panning) {
                sub.panBy(offset[0], offset[1]);
            }
        }
        main.panning = false;
    });

    // and for all other map redraw events, re-sync them
    main.addCallback("zoomed", updateSubMaps);
    main.addCallback("extentset", updateSubMaps);
    main.addCallback("centered", updateSubMaps);

    // set the initial map position
    main.setCenterZoom(new MM.Location(37.7719, -122.3926), 12);
    // and set up listening for the browser's location hash
    new MM.Hash(main);

    // create static mini-maps for each of these elements
    var minis = document.querySelectorAll("#content .map");
    for (var i = 0; i < minis.length; i++) {
        var el = minis[i],
            provider = getProvider(el.getAttribute("data-provider")),
            center = parseCenter(el.getAttribute("data-center")),
            zoom = parseInt(el.getAttribute("data-zoom")),
            map = new MM.Map(el, provider, null, []);
        map.setCenterZoom(center, zoom);
    }

    } catch (e) {
        console.error(e);
    }

    // parse a string into an MM.Location instance
    function parseCenter(str) {
        var parts = str.split(/,\s*/),
            lat = parseFloat(parts[0]),
            lon = parseFloat(parts[1]);
        return new MM.Location(lat, lon);
    }
};
