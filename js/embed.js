(function() {

    // returns the map provider for a given TileStache layer name
    function getProvider(layer) {
        return new MM.StamenTileLayer(layer);
    }

    function onImageError(_map, img) {
        // img.src = "images/tile-404.gif";
    }

    function preventDoubleClick(el) {
        MM.addEvent(el, "dblclick", function(e) {
            return MM.cancelEvent(e);
        });
    }

    function setupZoomControls(map) {
        var zoomIn = document.getElementById("zoom-in"),
            zoomOut = document.getElementById("zoom-out");

        preventDoubleClick(zoomIn);
        MM.addEvent(zoomIn, "click", function(e) {
            try { map.zoomIn(); } catch (err) { }
            return MM.cancelEvent(e);
        });
        preventDoubleClick(zoomOut);
        MM.addEvent(zoomOut, "click", function(e) {
            try { map.zoomOut(); } catch (err) { }
            return MM.cancelEvent(e);
        });

    }

    function init() {

        var parent = document.getElementById("map"),
            provider = getProvider(parent.getAttribute("data-provider"));

        // our main map
        var main = new MM.Map(parent, provider, null,
            [new MM.DragHandler(), new MM.DoubleClickHandler(), new MM.TouchHandler()]);

        // set the initial map position
        main.setCenterZoom(new MM.Location(37.7706, -122.3782), 12);

        setupZoomControls(main);

        var hasher = new MM.Hash(main);
    }

    try {
        init();
    } catch (e) {
        console.warn(e);
    }

})();
