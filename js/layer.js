(function(exports) {



    function init() {

        addBrowserClasses(document.body);

        var doc = document.documentElement;
        function getSize() {
            return new L.point(doc.clientWidth, doc.clientHeight);
        }

        var parent = document.getElementById("map-main"),
            size = getSize(),
            providerName = parent.getAttribute("data-provider"),
            provider = getProvider(providerName);

        // setupProviderSelector(providerName, "../");

        function resize() {
            var size = getSize();
            parent.style.height = size.y + "px";
            parent.style.width = size.x + "px";
            if (!main) return;
            main.invalidateSize(false);
        }
        window.addEventListener("resize", resize);

        // our main map
        var main =  L.map(parent, {
            scrollWheelZoom: false,
            layers: [provider],
            zoomControl: false,
            attributionControl: false,
            trackResize: false,
            // Maptiks tracking code
            track_id: "b67e9b8c-1408-44ff-b788-63dee4906de9",
            // Maptiks label
            sa_id: "Full screen: " + providerName
        });

        parent.style.position = "absolute";

        if (provider.attribution) {
            var attribution = parent.querySelector(".attribution") || parent.appendChild(document.createElement("p"));
            attribution.className = "attribution";
            attribution.innerHTML = provider.attribution;
        }

        setupZoomControls(main);

        //var didSetLimits = provider.setCoordLimits(main);

        // set the initial map position
        if (!location.hash || location.hash.split("/").length !== 3) {
            location.replace("#" + defaultCoordinates);
        }

        resize();

        var zoom = parseInt(parent.getAttribute("data-zoom"));
        if (!isNaN(zoom)) {
            main.setZoom(zoom);
        }

        var center = parent.getAttribute("data-center");
        if (center && center.length) {
            var bits = center.split(",");
            main.setView(new L.latLng(parseFloat(bits[0]), parseFloat(bits[1])), main.getZoom());
        }

        syncMapLinks(main, [document.getElementById("home-link")], function(parts) {
            parts.unshift(providerName);
        });

        var imgLink = document.getElementById("make-image");
        if (imgLink) {
            var round = function(n) {
                return Math.ceil(n / 500) * 500;
            };
            imgLink.addEventListener("mouseover", function() {
                var hash = location.hash.substr(1);
                this.href = [
                    "https://stadiamaps.com/build-a-map/",
                    "#style=stamen_" + providerName.replaceAll("-", "_"),
                    "&map=" + hash
                ].join("");
            });
        }

        var feedback = setupFeedbackForm();
        main._container.addEventListener("mousedown", feedback.hide);
        main.on("zoomend", feedback.hide);

        var hasher = new L.Hash(main);
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
            MapzenSearch.geocode({
                q: query
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

        exports.MAP = main;
    }

    init();

})(this);
