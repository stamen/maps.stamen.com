(function() {

    function init() {

        addBrowserClasses(document.body);

        var doc = document.documentElement;
        function getSize() {
            return new MM.Point(doc.clientWidth, doc.clientHeight);
        }

        var parent = document.getElementById("map-main"),
            size = getSize(),
            providerName = parent.getAttribute("data-provider"),
            provider = new MM.StamenTileLayer(providerName);

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

        syncMapLinks(main, [document.getElementById("home-link")], function(parts) {
            parts.unshift(providerName);
        });

        var embedLink = document.getElementById("embed-toggle"),
            embedToggle;
        if (embedLink) {
            var embed = document.getElementById("embed-content"),
                textarea = document.getElementById("embed-code"),
                template = textarea.value;
            embedToggle = createToggle(embedLink, embed, function(showing) {
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

        var feedbackLink = document.getElementById("toggle-feedback"),
            feedbackToggle;
        if (feedbackLink) {
            var feedback = document.getElementById("feedback"),
                centerInput = document.getElementById("feedback-center");
            feedbackToggle = createToggle(feedbackLink, feedback, function(showing) {
                if (showing) {
                    // update the center
                    centerInput.value = location.hash.substr(1);

                    var offset = getOffset(feedbackLink);
                    // console.log("offset:", [offset.left, offset.top]);
                    feedback.style.left = (offset.left - 9) + "px";
                } else {
                }
            });
        }

        if (feedbackToggle || embedToggle) {
            function hideToggles() {
                if (feedbackToggle) feedbackToggle.hide();
                if (embedToggle) embedToggle.hide();
            }
            // hide toggles on map mouse down
            MM.addEvent(parent, "mousedown", hideToggles);
            // hide toggles when the map is zoomed
            // (mousedowns occur on #overlay, not the map)
            main.addCallback("zoomed", hideToggles);
            MM.addEvent(window, "keyup", function(e) {
                if (e.keyCode === 27) {
                    hideToggles();
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

    init();

})();
