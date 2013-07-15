
// returns the map provider for a given TileStache layer name
function getProvider(layer) {
    return new MM.StamenTileLayer(layer);
}

// cancels all double-click events on the supplied element
function preventDoubleClick(el) {
    MM.addEvent(el, "dblclick", function(e) {
        return MM.cancelEvent(e);
    });
}

// set up zoom controls for the given map (assumed one per page,
// with in and out buttons having ids "zoom-in" and "zoom-out", respectively
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
                center.lon.toFixed(precision)
            ];
        if (modifyHashParts) {
            modifyHashParts.call(null, parts);
        }
        return parts.join("/");
    }
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

    MM.addEvent(link, "click", function(e) {
        toggler.toggle();
        return MM.cancelEvent(e);
    });

    toggler.toggle = function() { toggler(!showing); };
    toggler.show = function() { toggler(true); };
    toggler.hide = function() { toggler(false); };

    return toggler;
}

function setupFeedbackForm() {
    var feedbackLink = document.getElementById("toggle-feedback");
    if (feedbackLink) {
        var feedback = document.getElementById("feedback"),
            styleInput = document.getElementById("feedback-style"),
            centerInput = document.getElementById("feedback-center");

        var recaptchaScript = document.createElement("script");
        recaptchaScript.src = "http://www.google.com/recaptcha/api/js/recaptcha_ajax.js";
        feedback.appendChild(recaptchaScript);

        var toggle = createToggle(feedbackLink, feedback, function(showing) {
            if (showing) {
                Recaptcha.create("6LeG99cSAAAAABiijTMo4wvz2nrO3PNWb88CQl6v", "recaptcha");

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

        MM.addEvent(window, "keyup", function(e) {
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


MM.QueryHash = function(map, onQueryChange) {
    this.query = new QueryString();
    this.onQueryChange = onQueryChange;
    MM.Hash.call(this, map);
};

MM.QueryHash.prototype = {
    query: null,
    parseHash: function(hash) {
        var qs = "";
        if (hash.indexOf("?") > -1) {
            var parts = hash.split("?");
            hash = parts[0];
            qs = parts[1];
        }
        var parsed = MM.Hash.prototype.parseHash.call(this, hash);
        if (parsed) {
            this.query.params = this.onQueryChange.call(this, this.query.parse(qs));
        }
        return parsed;
    },
    formatHash: function(hash) {
        return MM.Hash.prototype.formatHash.call(this, hash) + this.query.toString();
    }
};

MM.extend(MM.QueryHash, MM.Hash);

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
            // ignore the trailing slash
            if (parts[parts.length - 1] === "") {
                parts.pop();
            }
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
            this.map.setCenterZoom(parsed.center, parsed.zoom);
            this.movingMap = false;
        } else {
            // console.warn("parse error; resetting:", this.map.getCenter(), this.map.getZoom());
            if (this.overwriteInvalidHashes) {
                this.onMapMove(this.map);
            }
        }
    }
};

MM.extend(ProviderHash, MM.Hash);

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
