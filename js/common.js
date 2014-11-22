// Maps.stamen.com
// Common functions
// TODO: wrap these in a namespace

var defaultCoordinates = "12/37.7706/-122.3782";
var mediaQuery = "(-webkit-min-device-pixel-ratio: 1.5),\
                  (min--moz-device-pixel-ratio: 1.5),\
                  (-o-min-device-pixel-ratio: 3/2),\
                  (min-resolution: 1.5dppx)";

// TODO: this probably should be in StamenTileLayer
// ie: {@2x: true}
var retinaSupportedProviders = ["toner"];

function providerSupportsRetina(name) {
    for (var provider in retinaSupportedProviders) {
        // partial matches pass
        // this is to allow for variants, ie.: toner-lite, toner-labels
        if (retinaSupportedProviders[provider].indexOf(name) > -1) {
            return true;
        }
    }
    return false;
}

function isRetina() {
    function getParameterByName(name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }

    return getParameterByName("retina") ||
        window.devicePixelRatio > 1 ||
        (window.matchMedia && window.matchMedia(mediaQuery).matches);
}

// returns the map provider for a given TileStache layer name
function getProvider(layer) {
    var lyr = new L.StamenTileLayer(layer);

    if (isRetina() && providerSupportsRetina(layer)) {
        // replace the last "." with "@2x."
        lyr._url = lyr._url.replace(/\.(?!.*\.)/, "@2x.")
    }

    return lyr;
}

function cancelEvent(e) {
    e.cancelBubble = true;
    e.cancel = true;
    e.returnValue = false;
    if (e.stopPropagation) { e.stopPropagation(); }
    if (e.preventDefault) { e.preventDefault(); }
    return false;
}

// cancels all double-click events on the supplied element
function preventDoubleClick(el) {
    /*
    MM.addEvent(el, "dblclick", function(e) {
        return MM.cancelEvent(e);
    });
    */

    el.addEventListener("dblclick", cancelEvent);
}

// set up zoom controls for the given map (assumed one per page,
// with in and out buttons having ids "zoom-in" and "zoom-out", respectively
function setupZoomControls(map) {
    var zoomIn = document.getElementById("zoom-in"),
        zoomOut = document.getElementById("zoom-out");

    preventDoubleClick(zoomIn);
    preventDoubleClick(zoomOut);

    zoomIn.addEventListener("click", function(e){
        try { map.zoomIn(); } catch (err) { }
        return cancelEvent(e);
    });

    zoomOut.addEventListener("click", function(e){
        try { map.zoomOut(); } catch (err) { }
        return cancelEvent(e);
    });
}

function syncMapLinks(map, links, modifyHashParts) {
    var len = links.length,
        timeout,
        delay = 200;
    function formatHash() {
        var center = map.getCenter(),
            zoom = map.getZoom(),
            precision = Math.max(0, Math.ceil(Math.log(zoom) / Math.LN2)),
            parts = [zoom,
                center.lat.toFixed(precision),
                center.lng.toFixed(precision)
            ];
        if (modifyHashParts) {
            modifyHashParts.call(null, parts);
        }
        return parts.join("/");
    }
    map.on("viewreset", function(e){
        clearTimeout(timeout);
        timeout = setTimeout(function() {
            var hash = formatHash();
            for (var i = 0; i < len; i++) {
                var link = links[i];
                if (!link) continue;
                var href = link.href || "",
                    uri = link.href.split("#").shift();
                link.href = [uri, hash].join("#");
            }
        }, delay);
    });

    /*
    map.addCallback("drawn", function() {
        clearTimeout(timeout);
        timeout = setTimeout(function() {
            var hash = formatHash();
            for (var i = 0; i < len; i++) {
                var link = links[i];
                if (!link) continue;
                var href = link.href || "",
                    uri = link.href.split("#").shift();
                link.href = [uri, hash].join("#");
            }
        }, delay);
    });
    */
}

// get the pixel offset of an element from the top left of its offset parent
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

// create a toggling interface
function createToggle(link, target, callback) {
    var showing = target.style.display != "none",
        originalClass = link.className,
        toggler = function(s) {
            showing = s;
            if (showing) {
                target.style.display = "";
                link.className = [originalClass, "active"].join(" ");
            } else {
                target.style.display = "none";
                link.className = originalClass;
            }
            callback.call(target, showing);
        };
    link.addEventListener("click", function(e) {
        toggler.toggle();
        return cancelEvent(e);
    });


    toggler.toggle = function() { toggler(!showing); };
    toggler.show = function() { toggler(true); };
    toggler.hide = function() { toggler(false); };

    return toggler;
}


// only works for the method at https://developers.google.com/recaptcha/docs/display#render_param
function onRecaptchaLoad() {
    //console.log("RE LOADED")
}

function setupFeedbackForm() {
    var feedbackLink = document.getElementById("toggle-feedback");
    if (feedbackLink) {
        var feedback = document.getElementById("feedback"),
            styleInput = document.getElementById("feedback-style"),
            centerInput = document.getElementById("feedback-center");


        var recaptchaScript = document.createElement("script");
        recaptchaScript.src = "http://www.google.com/recaptcha/api/js/recaptcha_ajax.js";

        //recaptchaScript.src = "https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit";
        feedback.appendChild(recaptchaScript);

        var toggle = createToggle(feedbackLink, feedback, function(showing) {
            if (showing) {
                Recaptcha.create("6LeG99cSAAAAABiijTMo4wvz2nrO3PNWb88CQl6v", "recaptcha");

                /*grecaptcha.render("recaptcha", {
                    sitekey: "6LeG99cSAAAAABiijTMo4wvz2nrO3PNWb88CQl6v"
                });*/

                // update the center
                var hash = location.hash.substr(1),
                    parts = hash.split("/");
                if (parts.length === 4) {
                    var provider = parts.shift();
                    // update the style bit in the form action
                    if (styleInput) {
                        styleInput.value = provider;
                    }
                }
                // updat the center input
                centerInput.value = parts.join("/");

                var offset = getOffset(feedbackLink);
                // console.log("offset:", [offset.left, offset.top]);
                feedback.style.left = (offset.left - 9) + "px";
            } else {
            }
        });

        window.addEventListener("keyup", function(e) {
            if (e.keyCode === 27) {
                toggle.hide();
            }
        });

        return toggle;
    } else {
        var form = {};
        form.show = function() {};
        form.hide = function() {};
        return form;
    }
}


// add browser-specific classes to the given element
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

// a simple Yahoo! Place Search API
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

var MapQuestSearch = {
    key: "Fmjtd%7Cluub2q61n5%2Crx%3Do5-9610g6",
    url: "http://www.mapquestapi.com/geocoding/v1/address?location={q}&maxResults=1&key={k}",
    geocode: function(query, success, error) {
        // adding key this way, to avoid in encoding problems (sc)
        var sendUrl = MapQuestSearch.url.replace("{q}", encodeURIComponent(query)).replace("{k}",MapQuestSearch.key);
        //furl = furl.replace("{k}",MapQuestSearch.key);
        var data = {};
        data.outFormat = "json";
        return reqwest({
            url: sendUrl,
            type: "jsonp",
            jsonpCallback: "callback",
            data: data,
            success: function(response) {
                var results = response.results;
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

var StamenSearch = {
    url: "http://q.maps.stamen.com/?q={q}&w={w}&h={h}",
    // url: "http://localhost:8080/?q={q}&w={w}&h={h}",
    geocode: function(query, callback) {
        var url = this.url.replace("{q}", encodeURIComponent(query.q))
                          .replace("{w}", query.w)
                          .replace("{h}", query.h);

        return reqwest({
            url: url,
            type: "jsonp",
            success: function(response) {
                return callback(null, response);
            },
            error: callback
        });
    }
};

var QueryString = function(params) {
    if (params) {
        if (typeof params === "string") {
            params = this.parse(params);
        }
    }
    this.params = params || {};
};

QueryString.parse = function(str) {
    if (str.charAt(0) === "?") {
        str = str.substr(1);
    }
    var parts = str.split("&"),
        len = parts.length;
        params = {};
    for (var i = 0; i < len; i++) {
        var kv = parts[i].split("=");
        params[decodeURIComponent(kv[0])] = (kv.length === 2)
            ? decodeURIComponent(kv[1])
            : true;
    }
    return params;
};

QueryString.format = function(params) {
    var parts = [],
        i = 0;
    for (var key in params) {
        if (i++ > 0) parts.push("&");
        var value = params[key];
        if (value !== null) {
            parts.push(encodeURIComponent(key), "=", encodeURIComponent(value));
        }
    }
    return parts.join("");
};

QueryString.prototype = {
    clear: function() {
        this.params = {};
    },
    parse: function(str) {
        var parsed = QueryString.parse(str);
        return this.update(parsed);
    },
    update: function(params) {
        var old = this.params;
        this.params = {};
        var changed = {};
        for (var key in params) {
            var value = params[key];
            if (old[key] != value) {
                changed[key] = value;
            }
            this.params[key] = value;
        }
        return changed;
    },
    toString: function() {
        var str = QueryString.format(this.params);
        return str.length ? "?" + str : "";
    }
};



function extendClass(child, parent) {
    for (var property in parent.prototype) {
        if (typeof child.prototype[property] == "undefined") {
            child.prototype[property] = parent.prototype[property];
        }
    }
    return child;
};

var HAS_HASHCHANGE = (function() {
        var doc_mode = window.documentMode;
        return ('onhashchange' in window) &&
            (doc_mode === undefined || doc_mode > 7);
    })();

L.Hash = function(map) {
    this.onMapMove = L.Util.bind(this.onMapMove, this);
    this.onHashChange = L.Util.bind(this.onHashChange, this);

    if (map) {
        this.init(map);
    }

};

L.Hash.prototype = {
    map: null,
    lastHash: null,
    isLoaded: false,

    parseHash: function(hash) {

        var args = hash.split("/");
        if (args.length == 3) {
            var zoom = parseInt(args[0], 10),
                lat = parseFloat(args[1]),
                lon = parseFloat(args[2]);
            if (isNaN(zoom) || isNaN(lat) || isNaN(lon)) {
                return false;
            } else {
                return {
                    center: L.latLng(lat, lon),
                    zoom: zoom
                };
            }
        } else {
            return false;
        }
    },

    formatHash: function(map) {
        if (!this.isLoaded) {
            return "#" + "/12/37.7706/-122.3782";
        }
        var center = map.getCenter(),
            zoom = map.getZoom(),
            precision = Math.max(0, Math.ceil(Math.log(zoom) / Math.LN2));

        return "#" + [zoom,
            center.lat.toFixed(precision),
            center.lng.toFixed(precision)
        ].join("/");
    },

    init: function(map) {
        this.map = map;
        //this.map.addCallback("drawn", this.onMapMove);
        var self = this;
        this.map.on('load', function(){
            self.isLoaded = true;
            self.map.on('viewreset move', function(){
                self.onMapMove(self.map);

            });
        })

        // reset the hash
        this.lastHash = null;
        this.onHashChange();

        if (!this.isListening) {
            this.startListening();
        }
    },

    remove: function() {
        this.map = null;
        if (this.isListening) {
            this.stopListening();
        }
    },

    onMapMove: function(map) {
        // bail if we're moving the map (updating from a hash),
        // or if the map has no zoom set
        if (this.movingMap || this.map.zoom === 0) {
            return false;
        }
        var hash = this.formatHash(map);
        if (this.lastHash != hash) {
            location.replace(hash);
            this.lastHash = hash;
        }
    },

    movingMap: false,
    update: function() {
        console.log("update")
        var hash = location.hash;
        if (hash === this.lastHash) {
            // console.info("(no change)");
            return;
        }
        var sansHash = hash.substr(1),
            parsed = this.parseHash(sansHash);
        console.log(parsed)
        if (parsed) {
            // console.log("parsed:", parsed.zoom, parsed.center.toString());
            this.movingMap = true;
            this.map.setView(parsed.center, parsed.zoom, {});
            this.movingMap = false;
        } else {
            // console.warn("parse error; resetting:", this.map.getCenter(), this.map.getZoom());
            this.onMapMove(this.map);
        }
    },

    // defer hash change updates every 100ms
    changeDefer: 100,
    changeTimeout: null,
    onHashChange: function() {
        // throttle calls to update() so that they only happen every
        // `changeDefer` ms
        if (!this.changeTimeout) {
            var that = this;
            this.changeTimeout = setTimeout(function() {
                that.update();
                that.changeTimeout = null;
            }, this.changeDefer);
        }
    },

    isListening: false,
    hashChangeInterval: null,
    startListening: function() {
        if (HAS_HASHCHANGE) {
            window.addEventListener("hashchange", this.onHashChange, false);
        } else {
            clearInterval(this.hashChangeInterval);
            this.hashChangeInterval = setInterval(this.onHashChange, 50);
        }
        this.isListening = true;
    },

    stopListening: function() {
        if (HAS_HASHCHANGE) {
            window.removeEventListener("hashchange", this.onHashChange);
        } else {
            clearInterval(this.hashChangeInterval);
        }
        this.isListening = false;
    }
};


L.QueryHash = function(map, onQueryChange) {
    this.query = new QueryString();
    this.onQueryChange = onQueryChange;

    L.Hash.call(this, map);
};

L.QueryHash.prototype = {
    query: null,
    parseHash: function(hash) {
        var qs = "";
        if (hash.indexOf("?") > -1) {
            var parts = hash.split("?");
            hash = parts[0];
            qs = parts[1];
        }
        var parsed = L.Hash.prototype.parseHash.call(this, hash);
        if (parsed) {
            this.query.params = this.onQueryChange.call(this, this.query.parse(qs));
        }
        return parsed;
    },
    formatHash: function(hash) {
        return L.Hash.prototype.formatHash.call(this, hash) + this.query.toString();
    }
};

extendClass(L.QueryHash, L.Hash);



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
var ProviderHash = function(map, providerName, setProvider, overwriteInvalidHashes) {
    this.providerName = providerName;
    this.setProvider = setProvider;
    this.overwriteInvalidHashes = overwriteInvalidHashes !== false;

    L.Hash.call(this, map);
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
            // ignore the trailing slash
            if (parts[parts.length - 1] === "") {
                parts.pop();
            }
            var provider = parts.shift();
            var parsed = parts.length
                ? L.Hash.prototype.parseHash.call(this, parts.join("/"))
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
        var format = L.Hash.prototype.formatHash.call(this, hash);
        return "#" + this.providerName + "/" + format.substr(1);
    },

    overwriteInvalidHashes: true,
    update: function() {

        var hash = location.hash;
        if (hash === this.lastHash) {
            // console.info("(no change)");
            return;
        }
        var sansHash = hash.substr(1),
            parsed = this.parseHash(sansHash);
        if (parsed) {
            // console.log("parsed:", parsed.zoom, parsed.center.toString());
            this.movingMap = true;
            this.map.setView(parsed.center, parsed.zoom);
            this.movingMap = false;
        } else {
            // console.warn("parse error; resetting:", this.map.getCenter(), this.map.getZoom());
            if (this.overwriteInvalidHashes) {
                this.onMapMove(this.map);
            }
        }
    }
};

extendClass(ProviderHash, L.Hash);


var _gaq;
// Google Analytics tracking
function track() {
  _gaq = _gaq || [];
  _gaq.push(['_setAccount', 'UA-32986126-1']);
  _gaq.push(['_trackPageview']);

  (function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
  })();
}
