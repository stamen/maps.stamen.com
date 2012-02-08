var maps = {};
window.onload = function() {

    try {

    function getProvider(layer) {
        return new MM.TemplatedLayer("http://tile.stamen.com/" + layer + "/{Z}/{X}/{Y}.png");
    }

    var main = maps.main = new MM.Map("map-main", getProvider("toner"), null, [new MM.DragHandler(), new MM.DoubleClickHandler()]);

    var wrapper = maps.wrapper = document.getElementById("maps-sub"),
        subs = maps.sub = [],
        subParents = wrapper.querySelectorAll(".map");
    for (var i = 0; i < subParents.length; i++) {
        var el = subParents[i],
            provider = getProvider(el.getAttribute("data-provider")),
            map = new MM.Map(el, provider, null, []);
        subs.push(map);
    }

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

    MM.addEvent(document.getElementById("zoom-in"), "click", function() {
        main.zoomIn();
        return false;
    });

    MM.addEvent(document.getElementById("zoom-out"), "click", function() {
        main.zoomOut();
        return false;
    });

    main.addCallback("panned", function(_map, offset) {
        for (var i = 0; i < subs.length; i++) {
            var sub = subs[i];
            sub.panBy(offset[0], offset[1]);
        }
    });

    main.addCallback("zoomed", updateSubMaps);
    main.addCallback("extentset", updateSubMaps);
    main.addCallback("centered", updateSubMaps);

    main.setCenterZoom(new MM.Location(37.7749295, -122.4194155), 12);
    new MM.Hash(main);

    updateSubMaps();

    var minis = document.querySelectorAll("#content a.map");
    for (var i = 0; i < minis.length; i++) {
        var el = minis[i],
            provider = getProvider(el.getAttribute("data-provider")),
            center = parseCenter(el.getAttribute("data-center")),
            zoom = parseInt(el.getAttribute("data-zoom"));
        new MM.Map(el, provider, null, []).setCenterZoom(center, zoom);
    }

    } catch (e) {
        console.error(e);
    }

    function parseCenter(str) {
        var parts = str.split(/,\s*/),
            lat = parseFloat(parts[0]),
            lon = parseFloat(parts[1]);
        return new MM.Location(lat, lon);
    }
};
