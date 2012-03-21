// for debugging and tweaking from the console
var MAPS = {};
(function() {

    function doImageErrors(map) {
        map.layers[0].requestManager.addCallback("requesterror", function(_, img) {
            // img.src = "images/tile-404.gif";
        });
    }

    function init() {

        var providerLabel = document.getElementById("current-provider"),
            currentProvider = "toner",
            mapsByProvider = MAPS.byProvider = {};

        var allProviders = [currentProvider];

        // our main map
        var main = MAPS.main = new MM.Map("map-main", getProvider(currentProvider), null,
            [new MM.DragHandler(), new MM.DoubleClickHandler(), new MM.TouchHandler()]);
        // doImageErrors(main);

        mapsByProvider[currentProvider] = main;

        // keep a reference to the sub-map wrapper to figure out
        // positioning stuff
        var wrapper = MAPS.wrapper = document.getElementById("maps-sub"),
            subs = MAPS.sub = [],
            // then grab all the sub-map element references
            subParents = wrapper.querySelectorAll(".map");
        // create a map for each sub-map element
        for (var i = 0; i < subParents.length; i++) {
            var el = subParents[i],
                // the provider is based on the data-provider HTML attribute
                provider = el.getAttribute("data-provider"),
                // FIXME: these maps are not interactive
                map = new MM.Map(el, getProvider(provider), null, [new MM.DragHandler()]);
            map.addCallback("panned", function(_map, offset) {
                if (!main.panning) {
                    _map.panning = true;
                    main.panBy(offset[0], offset[1]);
                    _map.panning = false;
                }
            });
            // add it to the list
            allProviders.push(provider);
            // doImageErrors(map);
            mapsByProvider[provider] = map;
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

        setupZoomControls(main);

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
        main.setCenterZoom(new MM.Location(37.7706, -122.3782), 12);

        function updateTitle(map, provider) {
            // update the link in the clicked sub-map
            var node = map.parent.querySelector(".provider-name");
            node.innerHTML = provider.substr(0, 1).toUpperCase() + provider.substr(1);
            if ("href" in node) {
                node.href = (node.className.indexOf("permalink") > -1)
                    ? provider + "/"
                    : "#" + provider;
            }
        }

        syncMapLinks(main, [document.getElementById("main-permalink")]);

        updateTitle(main, currentProvider);

        // set provider randomly if one wasn't specified in the URL hash
        if (!location.hash) {
            var index = ~~(Math.random() * allProviders.length),
                randomProvider = allProviders[index];
            // console.log("random provider:", randomProvider);
            location.replace("#" + randomProvider);
        }

        // and set up listening for the browser's location hash
        var hasher = new ProviderHash(main, currentProvider, function(provider) {
            if (!provider || !(provider in mapsByProvider)) {
                return false;
            }
            // if the provider has changed...
            if (provider != currentProvider) {
                // grab the provider from the corresponding map
                var source = mapsByProvider[provider],
                    target = main;
                // swap layers
                source.setLayerAt(0, getProvider(currentProvider));
                target.setLayerAt(0, getProvider(provider));

                updateTitle(source, currentProvider);
                updateTitle(target, provider);

                // update the selected provider label text
                if (providerLabel) {
                    providerLabel.innerHTML = provider;
                }

                // swap the map references in mapsByProvider
                mapsByProvider[provider] = target;
                mapsByProvider[currentProvider] = source;
                // and, finally, update currentProvider
                currentProvider = provider;
            }
            return true;
        });

        // set up form element references
        var searchForm = document.getElementById("search"),
            searchInput = document.getElementById("search-location"),
            searchButton = document.getElementById("search-submit");
        // listen for the submit event
        MM.addEvent(searchForm, "submit", function(e) {
            // remember the old search text
            var oldSearchText = searchButton.getAttribute("value");
            // put the button into its submitting state
            searchButton.setAttribute("value", "Finding...");
            searchButton.setAttribute("class", "btn disabled");
            // set up a function to rever the form to its original state
            // (which executes whether there was an error or not)
            function revert() {
                searchButton.setAttribute("class", "btn");
                searchButton.setAttribute("value", oldSearchText);
            }

            var query = searchInput.value;
            YahooPlaceSearch.geocode(query, function(places) {
                revert();
                // console.log("search results:", results);
                // TODO: find the most relevant result?
                try {
                    var result = places.place[0],
                        northeast = result.boundingBox.northEast,
                        southwest = result.boundingBox.southWest;
                    main.setExtent([
                        new MM.Location(northeast.latitude, northeast.longitude),
                        new MM.Location(southwest.latitude, southwest.longitude)
                    ]);
                } catch (e) {
                    alert('Sorry, something went wrong when searching for "' + query + '".');
                }
                // main.panBy(-(main.dimensions.x - wrapper.offsetWidth) / 2, 0);
            }, function(error) {
                revert();
                alert('Sorry, we couldn\'t find "' + query + '".');
            });

            // cancel the submit event
            return MM.cancelEvent(e);
        });

        // create static mini-maps for each of these elements
        var minis = document.querySelectorAll("#content .map");
        MAPS.minis = [];
        for (var i = 0; i < minis.length; i++) {
            var el = minis[i],
                provider = getProvider(el.getAttribute("data-provider")),
                center = parseCenter(el.getAttribute("data-center")),
                zoom = parseInt(el.getAttribute("data-zoom")),
                map = new MM.Map(el, provider, null, []);
            map.setCenterZoom(center, zoom);
            MAPS.minis.push(map);
        }

        var hashish = document.querySelectorAll("a.hashish");
        for (var i = 0; i < hashish.length; i++) {
            MM.addEvent(hashish[i], "mouseover", function(e) {
                var link = e.srcElement || e.target,
                    parts = link.href.split("#"),
                    suffix = location.hash.split("/").slice(1).join("/");
                link.href = [parts[0], suffix].join("#");
            });
        }
    }

    // parse a string into an MM.Location instance
    function parseCenter(str) {
        var parts = str.split(/,\s*/),
            lat = parseFloat(parts[0]),
            lon = parseFloat(parts[1]);
        return new MM.Location(lat, lon);
    }

    init();

})();
