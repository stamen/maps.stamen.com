(function() {

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

        syncMapLinks(main, [document.getElementById("home-link")], function(parts) {
            parts.unshift(providerName);
        });

        var hasher = new MM.Hash(main);
    }

    init();

})();
