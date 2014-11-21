// for debugging and tweaking from the console
var MAPS = {};
(function() {

    //TODO: convert this over to Leaflet.
    //      not entirely sure it's currently being used (seanc | 11202014)
    function doImageErrors(map) {
        return;
        map.layers[0].requestManager.addCallback("requesterror", function(_, img) {
            // img.src = "images/tile-404.gif";
        });
    }

    var defaultCoordinates = "/12/37.7706/-122.3782";

    function init() {
        // setupProviderSelector();

        var providerLabel = document.getElementById("current-provider"),
            currentProvider = "toner",
            mapsByProvider = MAPS.byProvider = {};

        var allProviders = [currentProvider];

        // our main map
        var main = MAPS.main = L.map("map-main", {
            scrollWheelZoom: false,
            zoomControl: false,
            attributionControl: false
        });

        main.addLayer(getProvider(currentProvider));
        //doImageErrors(main);

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

                // Only allowing for dragging
                map = L.map(el, {scrollWheelZoom: false,
                        keyboard: false,
                        zoomControl: false,
                        dragging: true,
                        touchZoom: false,
                        doubleClickZoom: false,
                        boxZoom: false,
                        attributionControl: false});

                map.addLayer(getProvider(provider));


            map.on("dragstart", function(e){
                this.offsetStart = this.latLngToLayerPoint(this.getCenter());
            });

            map.on("drag dragend", function(e){
                var c = this.latLngToLayerPoint(this.getCenter());
                var dx = c.x - this.offsetStart.x ,
                    dy = c.y - this.offsetStart.y;
                _map = this;
                if (!main.panning) {
                    _map.panning = true;
                    main.panBy([dx,dy], {animate: false});
                    _map.panning = false;
                }

                this.offsetStart = c;

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
            var size = main.getSize(),
                mainWidth = size.x,
                wrapperWidth = wrapper.offsetWidth,
                wrapperTop = wrapper.offsetTop,
                offsetX = mainWidth - (mainWidth - wrapperWidth) / 2;
            for (var i = 0; i < subs.length; i++) {
                var sub = subs[i],
                    point = new L.point(0, 0),
                    sz = sub.getSize();
                point.x = offsetX - sz.x / 2;
                point.y = wrapperTop + sub._container.offsetTop + sz.y / 2;
                sub.setView(main.containerPointToLatLng(point), main.getZoom(), {animate: false});
            }
        }

        setupZoomControls(main);

        // TODO: Figure out if this pan callback is needed?
        // pan the sub-maps when the main map is panned
        /*
        main.on("moveend", function(e){
            offset = [0,0];
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
        */

        // and for all other map redraw events, re-sync them
        main.on("zoomend", updateSubMaps);
        main.on("move", updateSubMaps);


        // set the initial map position
        if (!location.hash) {
            // set provider randomly if one wasn't specified in the URL hash
            var index = ~~(Math.random() * allProviders.length),
                randomProvider = allProviders[index];
            location.replace("#" + randomProvider + defaultCoordinates);

        } else if(location.hash.split("/").length !== 4) {
            var p = location.hash.split("/")[0];
            location.replace("#" + (p.charAt(0) == "#" ? p.slice(1) : p) + defaultCoordinates);
        }


        //main.setView(new L.latLng(37.7706, -122.3782), 12);

        // sets initial center so other functions,
        // can calculate offset on "move"
        main.on("load", function(){
            main.off("load");
            main.on("movestart", function(){
                this.offsetStart = this.latLngToLayerPoint(this.getCenter());
            });
        });


        function updateTitle(map, provider) {
            // update the link in the clicked sub-map
            var node = map._container.querySelector(".provider-name");
            node.innerHTML = provider.substr(0, 1).toUpperCase() + provider.substr(1);
            var link = node.href
                ? node
                : node.parentNode;
            link.href = (link.className.indexOf("permalink") > -1)
                ? provider + "/"
                : "#" + provider;
        }

        syncMapLinks(main, [
            document.getElementById("main-permalink")
        ]);

        var feedback = setupFeedbackForm();
        main._container.addEventListener("mousedown", feedback.hide);
        main.on("zoomend", feedback.hide);

        updateTitle(main, currentProvider);



        // and set up listening for the browser's location hash
        var hasher = new ProviderHash(main, currentProvider, function(provider) {

            if (!provider || !(provider in mapsByProvider)) {
                return false;
            }

            // if the provider has changed...
            if (provider != currentProvider) {
                // grab the provider from the corresponding map
                var source = mapsByProvider[provider],
                    target = main,
                    sourceLayer = getProvider(currentProvider),
                    targetLayer = getProvider(provider);
                // swap layers
                if (source.hasLayer(sourceLayer)) source.removeLayer(sourceLayer);
                if (target.hasLayer(targetLayer)) target.removeLayer(targetLayer);

                source.addLayer(sourceLayer, true);
                target.addLayer(targetLayer, true);

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
        // allow linking to other anchors by telling the hasher not to
        // overwrite invalid hashes
        }, false);

        // set up form element references
        var searchForm = document.getElementById("search"),
            searchInput = document.getElementById("search-location"),
            searchButton = document.getElementById("search-submit");
        // listen for the submit event
        searchForm.addEventListener("submit", function(e) {
            // remember the old search text
            var oldSearchText = searchButton.getAttribute("value");
            // put the button into its submitting state
            searchButton.setAttribute("value", "Finding...");
            searchButton.setAttribute("class", "btn disabled");
            // set up a function to revert the form to its original state
            // (which executes whether there was an error or not)
            function revert() {
                searchButton.setAttribute("class", "btn");
                searchButton.setAttribute("value", oldSearchText);
            }

            var query = searchInput.value;
            var size = main.getSize();
            StamenSearch.geocode({
                q: query,
                w: size.x,
                h: size.y - document.getElementById("header").offsetHeight
            }, function(err, results) {
                revert();

                if (err || results.length === 0) {
                    alert("Sorry, we couldn't find '" + query + "'.");
                    return;
                }

                main.setView([results[0].latitude, results[0].longitude], results[0].zoom);
            });

            // cancel the submit event
            return cancelEvent(e);
        });

        // create static mini-maps for each of these elements
        var minis = document.querySelectorAll("#content .map");
        MAPS.minis = [];
        for (var i = 0; i < minis.length; i++) {
            var el = minis[i],
                provider = getProvider(el.getAttribute("data-provider")),
                center = parseCenter(el.getAttribute("data-center")),
                zoom = parseInt(el.getAttribute("data-zoom")),
                map = L.map(el, {scrollWheelZoom: false,
                                        keyboard: false,
                                        zoomControl: false,
                                        dragging: false,
                                        touchZoom: false,
                                        doubleClickZoom: false,
                                        boxZoom: false,
                                        attributionControl: false});

            map.addLayer(provider);
            map.setView(center, zoom);
            MAPS.minis.push(map);
        }

        var hashish = document.querySelectorAll("a.hashish");
        for (var i = 0; i < hashish.length; i++) {
            hashish[i].addEventListener("mouseover", function(e) {
                var link = e.srcElement || e.target,
                    parts = link.href.split("#"),
                    suffix = location.hash.split("/").slice(1).join("/");
                link.href = [parts[0], suffix].join("#");
            });
        }
    }

    // parse a string into an L.LatLng instance
    function parseCenter(str) {
        var parts = str.split(/,\s*/),
            lat = parseFloat(parts[0]),
            lng = parseFloat(parts[1]);
        return L.latLng(lat, lng);
    }

    init();
    track();

})();
