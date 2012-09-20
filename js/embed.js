(function(exports) {

    function init() {

        var parent = document.getElementById("map"),
            providerName = parent.getAttribute("data-provider"),
            provider = getProvider(providerName);

        // our main map
        var main = new MM.Map(parent, provider, null,
            [new MM.DragHandler(), new MM.DoubleClickHandler(), new MM.TouchHandler()]);

        // set the initial map position
        main.setCenterZoom(new MM.Location(37.7706, -122.3782), 12);

        setupZoomControls(main);

        var zoom = parseInt(parent.getAttribute("data-zoom"));
        if (!isNaN(zoom)) {
            main.setZoom(zoom);
        }

        var center = parent.getAttribute("data-center");
        if (center && center.length) {
            var bits = center.split(",");
            main.setCenter(new MM.Location(parseFloat(bits[0]), parseFloat(bits[1])));
        }

        var homeLink = document.getElementById("home-link");
        if (homeLink) {
            syncMapLinks(main, [homeLink], function(parts) {
                parts.unshift(providerName);
            });
        }

        var hasher = new MM.Hash(main);

        exports.MAP = main;
    }

    window.onload = function() {
        init();
        track();
    };

})(this);
