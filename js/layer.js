(function() {

    function onImageError(_map, img) {
        // img.src = "images/tile-404.gif";
    }

    function preventDoubleClick(el) {
        MM.addEvent(el, "dblclick", function(e) {
            return MM.cancelEvent(e);
        });
    }

    function getOffset(el) {
        var offset = {left: 0, top: 0},
            offsetParent = el.offsetParent;
        while (el && el != offsetParent) {
            offset.left += el.offsetLeft;
            offset.top += el.offsetTop;
            el = el.parentNode;
        }
        return offset;
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

    function createToggle(link, target, callback) {
        var showing = target.style.display != "none",
            originalClass = link.className;
        MM.addEvent(link, "click", function(e) {
            showing = !showing;
            if (showing) {
                target.style.display = "";
                link.className = [originalClass, "active"].join(" ");
            } else {
                target.style.display = "none";
                link.className = originalClass;
            }
            callback.call(target, showing);
            return MM.cancelEvent(e);
        });
    }

    function init() {

        addBrowserClasses(document.body);

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

        var attribution = parent.appendChild(document.createElement("p"));
        attribution.className = "attribution";
        attribution.innerHTML = provider.attribution;

        setupZoomControls(main);

        // set the initial map position
        main.setCenterZoom(new MM.Location(37.7706, -122.3782), 12);

        var embedLink = document.getElementById("embed-toggle");
        if (embedLink) {
            var embed = document.getElementById("embed-content"),
                textarea = document.getElementById("embed-code"),
                template = textarea.value;
            createToggle(embedLink, embed, function(showing) {
                if (showing) {
                    var url = location.href.split("#");
                    url.splice(1, 0, "embed#");
                    textarea.value = template.replace("{url}", url.join(""));
                    textarea.focus();
                    textarea.select();
                } else {
                }
            });
        }

        var feedbackLink = document.getElementById("toggle-feedback");
        if (feedbackLink) {
            var feedback = document.getElementById("feedback"),
                centerInput = document.getElementById("feedback-center");
            createToggle(feedbackLink, feedback, function(showing) {
                if (showing) {
                    // update the center
                    centerInput.value = location.hash.substr(1);

                    var offset = getOffset(feedbackLink);
                    // console.log("offset:", [offset.left, offset.top]);
                    feedback.style.left = (offset.left + 10) + "px";
                } else {
                }
            });
        }

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

    var addBrowserClasses = (function() {
        var ua = navigator.userAgent,
            matches = {
                ie: ua.match(/MSIE\s([^;]*)/) ? true : false,
                ios: ua.match(/like Mac OS X/i) ? true : false,
                iphone: ua.match(/iPhone/i) ? true : false,
                ipad: ua.match(/iPad/i) ? true : false,
                firefox: ua.match(/Firefox/i) ? true : false,
                webkit: ua.match(/WebKit/i) ? true : false,
                safari: ua.match(/Safari/i) ? true : false,
                chrome: ua.match(/Chrome/i) ? true : false,
                opera: ua.match(/Opera/i) ? true : false
            },
            classes = [];
        for (var klass in matches) {
            if (matches[klass]) classes.push(klass);
        }
        classes = classes.join(" ");
        return function(el) {
            el.className = el.className
                ? [el.className, classes].join(" ")
                : classes;
        };
    })();

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
