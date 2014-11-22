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
            trackResize: false
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
            imgLink.addEventListener("mouseover", function() {
                var size = main.getSize();
                var hash = location.hash.substr(1),
                    width = round(size.x),
                    height = round(size.y);
                this.href = [
                    "http://maps.stamen.com/m2i/",
                    "#" + providerName, "/",
                    width, ":", height, "/",
                    hash
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

        exports.MAP = main;
    }

    init();

})(this);
