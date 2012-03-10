// for debugging and tweaking from the console
var MAPS = {};
(function() {

    // returns the map provider for a given TileStache layer name
    function getProvider(layer) {
        return new MM.StamenTileLayer(layer);
    }

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

        // zoom click handlers
        MM.addEvent(document.getElementById("zoom-in"), "click", function() {
            try { main.zoomIn(); } catch (e) { }
            return false;
        });
        MM.addEvent(document.getElementById("zoom-out"), "click", function() {
            try { main.zoomOut(); } catch (e) { }
            return false;
        });

        var fslink = document.getElementById("fullscreen");
        if (fslink) {
            var fullscreen = false,
                fstimeout;
            function toggleFullscreen(link) {
                fullscreen = !fullscreen;
                if (fullscreen) {
                    document.body.className = "fullscreen";
                } else {
                    document.body.className = null;
                }
                clearTimeout(fstimeout);
                fstimeout = setTimeout(main.windowResize(), 1000);
            }

            MM.addEvent(fslink, "click", function(e) {
                try {
                    toggleFullscreen(e.srcElement || e.target);
                } catch (error) {
                    console.error(error);
                }
                return MM.cancelEvent(e);
            });

            MM.addEvent(window, "keyup", function(e) {
                if (fullscreen && e.keyCode == 27) { // escape
                    toggleFullscreen(e.srcElement || e.target);
                }
            });
        }

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

    /**
     * The ProviderHash is a class that looks for a provider name at the beginning
     * of the hash and calls the supplied setProvider(provider) function whenever it
     * changes.
     *
     * One feature of this parser is that it substitutes the center and zoom back in
     * if the hash changes to just "#provider", so you can link to new providers by
     * setting a link's href to simply "#provider" and ProviderHash will update the
     * hash accordingly.
     *
     * setProvider(provider) should accept a string and return true if the supplied
     * provider name was valid, or return false in any other case.
     *
     * Note also that ProviderHash requires a valid providerName in the constructor
     * to correctly set the initial hash value.
     */
    var ProviderHash = function(map, providerName, setProvider) {
        this.providerName = providerName;
        this.setProvider = setProvider;
        MM.Hash.call(this, map);
    };

    ProviderHash.prototype = {
        // the currently selected provider name
        providerName: null,

        /**
         * Our parseHash() function looks for a provider name in the beginning of
         * the URL.
         */
        parseHash: function(hash) {
            var parts = hash.split("/");
            if (parts.length > 0) {
                var provider = parts.shift();
                var parsed = parts.length
                    ? MM.Hash.prototype.parseHash.call(this, parts.join("/"))
                    : {center: this.map.getCenter(), zoom: this.map.getZoom()};
                if (parsed) {
                    // console.log("parsed hash:", provider, parsed);
                    var didSetProvider = this.setProvider.call(this.map, provider);
                    if (didSetProvider) {
                        this.providerName = provider;
                        return parsed;
                    } else {
                        return false;
                    }
                } else {
                    // console.log("parse error:", hash, parts, this.providerName);
                }
                return parsed;
            } else {
                // console.warn("(zero length, unable to parse");
                return false;
            }
        },

        /**
         * Our formatHash() function inserts the provider name as the first
         * slash-delimited element in the URL.
         */
        formatHash: function(hash) {
            var format = MM.Hash.prototype.formatHash.call(this, hash);
            return "#" + this.providerName + "/" + format.substr(1);
        }
    };

    MM.extend(ProviderHash, MM.Hash);

    init();

})();

var YahooPlaceSearch = {
    appid: "1DiQEyLV34HbAVHyl0iWC5tAZ8wpLMPzIeFE9QsTukhx6H.Cn9bM70c_5dYgh7cR8w--",
    url: "http://where.yahooapis.com/v1/places.q({q});count=1?callback=?",
    geocode: function(query, success, error) {
        var data = {};
        data.appid = YahooPlaceSearch.appid;
        data.select = "long";
        data.format = "json";
        return reqwest({
            url: YahooPlaceSearch.url.replace("{q}", encodeURIComponent(query)),
            type: "jsonp",
            jsonpCallback: "callback",
            data: data,
            success: function(response) {
                var results = response.places;
                if (results) {
                    success.call(null, results);
                } else {
                    error.call(null, "No results", response);
                }
            },
            error: error
        });
    }
};
