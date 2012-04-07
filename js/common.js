
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
                var link = links[i],
                    href = link.href || "",
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
    }
};

MM.extend(ProviderHash, MM.Hash);
