(function(exports) {

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

        // setupProviderSelector(providerName, "../");

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

        if (provider.attribution) {
            var attribution = parent.querySelector(".attribution") || parent.appendChild(document.createElement("p"));
            attribution.className = "attribution";
            attribution.innerHTML = provider.attribution;
        }

        setupZoomControls(main);

        var didSetLimits = provider.setCoordLimits(main);

        // set the initial map position
        main.setCenterZoom(new MM.Location(37.7706, -122.3782), 12);

        var zoom = parseInt(parent.getAttribute("data-zoom"));
        if (!isNaN(zoom)) {
            main.setZoom(zoom);
        }

        var center = parent.getAttribute("data-center");
        if (center && center.length) {
            var bits = center.split(",");
            main.setCenter(new MM.Location(parseFloat(bits[0]), parseFloat(bits[1])));
        }

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

        var imgLink = document.getElementById("make-image");
        if (imgLink) {
            var round = function(n) {
                return Math.ceil(n / 500) * 500;
            };
            MM.addEvent(imgLink, "mouseover", function() {
                var hash = location.hash.substr(1),
                    width = round(main.dimensions.x),
                    height = round(main.dimensions.y);
                this.href = [
                    "http://maps.stamen.com/m2i/",
                    "#" + providerName, "/",
                    width, ":", height, "/",
                    hash
                ].join("");
            });
        }

        var feedback = setupFeedbackForm();
        MM.addEvent(main.parent, "mousedown", feedback.hide);
        main.addCallback("zoomed", feedback.hide);

        var hasher = new MM.Hash(main);

        // set up form element references
        var searchForm = document.getElementById("search");
        if (searchForm) {
            var searchInput = document.getElementById("search-location"),
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
                StamenSearch.geocode({
                    q: query,
                    w: main.dimensions.x,
                    h: main.dimensions.y - document.getElementById("header").offsetHeight
                }, function(err, results) {
                    revert();

                    if (err || results.length === 0) {
                        alert("Sorry, we couldn't find '" + query + "'.");
                        return;
                    }

                    main.setZoom(results[0].zoom)
                        .setCenter({ lat: results[0].latitude, lon: results[0].longitude });
                });

                // cancel the submit event
                return MM.cancelEvent(e);
            });
        }

        exports.MAP = main;
    }

    init();

})(this);
