(function() {

    // returns the map provider for a given TileStache layer name
    function getProvider(layer) {
        return new MM.StamenTileLayer(layer);
    }

    function onImageError(_map, img) {
        // img.src = "images/tile-404.gif";
    }

    function init() {

        var parent = document.getElementById("map"),
            provider = getProvider(parent.getAttribute("data-provider"));

        // our main map
        var main = new MM.Map(parent, provider);

        // zoom click handlers
        MM.addEvent(document.getElementById("zoom-in"), "click", function() {
            try { main.zoomIn(); } catch (e) { }
            return false;
        });
        MM.addEvent(document.getElementById("zoom-out"), "click", function() {
            try { main.zoomOut(); } catch (e) { }
            return false;
        });

        // set the initial map position
        main.setCenterZoom(new MM.Location(37.7706, -122.3782), 12);

        var hasher = new MM.Hash(main);
    }

    try {
        init();
    } catch (e) {
        console.warn(e);
    }

})();
