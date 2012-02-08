// for debugging purposes
var maps = {};
window.onload = function() {

    try {

    // returns the map provider for a given TileStache layer name
    function getProvider(layer) {
        var domains = ["a.", "b.", "c.", "d.", ""];
        return new MM.TemplatedLayer("http://{S}tile.stamen.com/" + layer + "/{Z}/{X}/{Y}.png", domains);
    }

    var providerLabel = document.getElementById("current-provider"),
        currentProvider = "toner",
        mapsByProvider = {};

    // our main map
    var main = maps.main = new MM.Map("map-main", getProvider(currentProvider), null, [new MM.DragHandler(), new MM.DoubleClickHandler()]);

    mapsByProvider[currentProvider] = main;

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
            provider = el.getAttribute("data-provider"),
            // FIXME: these maps are not interactive
            map = new MM.Map(el, getProvider(provider), null, [new MM.DragHandler(), new MM.DoubleClickHandler()]);
        map.addCallback("panned", function(_map, offset) {
            if (!main.panning) {
                _map.panning = true;
                main.panBy(offset[0], offset[1]);
                _map.panning = false;
            }
        });
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
    var hasher = new ProviderHash(main, currentProvider, function(provider) {
        if (!provider) return false;
        if (provider != currentProvider) {
            var source = mapsByProvider[provider];
            var target = main;
            source.setLayerAt(0, getProvider(currentProvider));
            target.setLayerAt(0, getProvider(provider));

            var link = source.parent.querySelector("h3 a");
            link.innerHTML = currentProvider.substr(0, 1).toUpperCase() + currentProvider.substr(1);
            link.href = "#" + currentProvider;

            providerLabel.innerHTML = provider;

            mapsByProvider[provider] = target;
            mapsByProvider[currentProvider] = source;
            currentProvider = provider;
        }
        return true;
    });

    /*
    var searchForm = document.getElementById("search"),
        searchInput = document.getElementById("search-location"),
        searchButton = document.getElementById("search-submit");
    MM.addEvent(searchForm, "submit", function(e) {

        var oldSearchText = searchButton.getAttribute("value");
        searchButton.setAttribute("value", "Searching...");
        searchForm.setAttribute("class", "loading");
        function revert() {
            searchForm.removeAttribute("class", null);
            searchButton.setAttribute("value", oldSearchText);
        }

        var query = searchInput.value;
        MapQuest.geocode(query, function(results) {
            console.log("search results:", results);
            revert();
        }, function(error) {
            console.error("search error:", error);
            revert();
        });

        return MM.cancelEvent(e);
    });
    */

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

// quick and dirty MQ search API
var MapQuest = {
    // XXX: this is a Slow Tusnami key registered on the shawn@stamen.com
    // MapQuest developer account
    key: decodeURIComponent("Fmjtd%7Cluua216ynl%2Cbg%3Do5-h4rxg"),
    geocode: function(query, success, error) {
        var data;
        if (typeof query === "string") {
            data = {location: query};
        } else {
            data = query;
        }
        data.inFormat = "kvp";
        data.thumbMaps = false;
        data.key = MapQuest.key;
        data.outFormat = "json";
        return $.ajax("http://www.mapquestapi.com/geocoding/v1/address", {
            dataType: "jsonp",
            jsonp: "callback",
            data: data,
            success: function(response) {
                var results = response.results;
                if (results && results.length) {
                    success.call(null, results);
                } else {
                    error.call(null, "No results");
                }
            },
            error: error
        });
    }
};

var ProviderHash = function(map, providerName, setProvider) {
    this.providerName = providerName;
    this.setProvider = setProvider;
    MM.Hash.call(this, map);
};

ProviderHash.prototype = {
    providerName: null,
    updating: false,

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

    formatHash: function(hash) {
        var format = MM.Hash.prototype.formatHash.call(this, hash);
        return "#" + this.providerName + "/" + format.substr(1);
    }
};

MM.extend(ProviderHash, MM.Hash);
