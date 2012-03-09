(function() {

    function onImageError(_map, img) {
        // img.src = "images/tile-404.gif";
    }

    function init() {

        var doc = document.documentElement;
        function getSize() {
            return new MM.Point(doc.clientWidth, doc.clientHeight);
        }

        var parent = document.getElementById("map-main"),
            size = getSize(),
            provider = new MM.StamenTileLayer(parent.getAttribute("data-provider"));

        function resize() {
            try {
                size = getSize();
                if (main) main.setSize(size);
            } catch (e) {
            }
            // console.log("resize:", [size.x, size.y]);
        }
        MM.addEvent(window, "resize", resize);

        // our main map
        var main = new MM.Map(parent, provider, size,
            [new MM.DragHandler(), new MM.DoubleClickHandler(), new MM.TouchHandler()]);
        parent.style.position = "absolute";
        main.autoSize = false;

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
    }

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
