(function(exports) {

/*
 * tile.stamen.js v1.1.2
 */

var SUBDOMAINS = " a. b. c. d.".split(" "),
    MAKE_PROVIDER = function(layer, type, minZoom, maxZoom) {
        return {
            "url":          ["http://{S}tile.stamen.com/", layer, "/{Z}/{X}/{Y}.", type].join(""),
            "type":         type,
            "subdomains":   SUBDOMAINS.slice(),
            "minZoom":      minZoom,
            "maxZoom":      maxZoom
        };
    },
    PROVIDERS =  {
        "toner":        MAKE_PROVIDER("toner", "png", 0, 20),
        "terrain":      MAKE_PROVIDER("terrain", "jpg", 4, 18),
        "watercolor":   MAKE_PROVIDER("watercolor", "jpg", 3, 16)
    },
    ATTRIBUTION = [
        'Map tiles by <a href="http://stamen.com">Stamen Design</a>, ',
        'under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. ',
        'Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, ',
        'under <a href="http://creativecommons.org/licenses/by-sa/3.0">CC BY SA</a>.'
    ].join("");

// set up toner and terrain flavors
setupFlavors("toner", ["hybrid", "labels", "lines", "background", "lite"]);
// toner 2010
setupFlavors("toner", ["2010"]);
// toner 2011 flavors
setupFlavors("toner", ["2011", "2011-lines", "2011-labels", "2011-lite"]);
setupFlavors("terrain", ["background"]);
setupFlavors("terrain", ["labels", "lines"], "png");

/*
 * Export stamen.tile to the provided namespace.
 */
exports.stamen = exports.stamen || {};
exports.stamen.tile = exports.stamen.tile || {};
exports.stamen.tile.providers = PROVIDERS;
exports.stamen.tile.getProvider = getProvider;

/*
 * A shortcut for specifying "flavors" of a style, which are assumed to have the
 * same type and zoom range.
 */
function setupFlavors(base, flavors, type) {
    var provider = getProvider(base);
    for (var i = 0; i < flavors.length; i++) {
        var flavor = [base, flavors[i]].join("-");
        PROVIDERS[flavor] = MAKE_PROVIDER(flavor, type || provider.type, provider.minZoom, provider.maxZoom);
    }
}

/*
 * Get the named provider, or throw an exception if it doesn't exist.
 */
function getProvider(name) {
    if (name in PROVIDERS) {
        return PROVIDERS[name];
    } else {
        throw 'No such provider (' + name + ')';
    }
}

/*
 * StamenTileLayer for modestmaps-js
 * <https://github.com/modestmaps/modestmaps-js/>
 *
 * Works with both 1.x and 2.x by checking for the existence of MM.Template.
 */
if (typeof MM === "object") {
    var ModestTemplate = (typeof MM.Template === "function")
        ? MM.Template
        : MM.TemplatedMapProvider;
    MM.StamenTileLayer = function(name) {
        var provider = getProvider(name);
        MM.Layer.call(this, new ModestTemplate(provider.url, SUBDOMAINS));
        this.provider.setZoomRange(provider.minZoom, provider.maxZoom);
        this.attribution = ATTRIBUTION;
    };
    MM.extend(MM.StamenTileLayer, MM.Layer);
}

/*
 * StamenTileLayer for Leaflet
 * <http://leaflet.cloudmade.com/>
 *
 * Tested with version 0.3 and 0.4, but should work on all 0.x releases.
 */
if (typeof L === "object") {
    L.StamenTileLayer = L.TileLayer.extend({
        initialize: function(name) {
            var provider = getProvider(name),
                url = provider.url.replace(/({[A-Z]})/g, function(s) {
                    return s.toLowerCase();
                });
            L.TileLayer.prototype.initialize.call(this, url, {
                "minZoom":      provider.minZoom,
                "maxZoom":      provider.maxZoom,
                "subdomains":   SUBDOMAINS,
                "scheme":       "xyz",
                "attribution":  ATTRIBUTION
            });
        }
    });
}

/*
 * StamenTileLayer for OpenLayers
 * <http://openlayers.org/>
 *
 * Tested with v2.1x.
 */
if (typeof OpenLayers === "object") {
    // make a tile URL template OpenLayers-compatible
    function openlayerize(url) {
        return url.replace(/({.})/g, function(v) {
            return "$" + v.toLowerCase();
        });
    }

    // based on http://www.bostongis.com/PrinterFriendly.aspx?content_name=using_custom_osm_tiles
    OpenLayers.Layer.Stamen = OpenLayers.Class(OpenLayers.Layer.OSM, {
        initialize: function(name, options) {
            var provider = getProvider(name),
                url = provider.url,
                hosts = [];
            if (url.indexOf("{S}") > -1) {
                for (var i = 0; i < SUBDOMAINS.length; i++) {
                    hosts.push(openlayerize(url.replace("{S}", SUBDOMAINS[i])));
                }
            } else {
                hosts.push(openlayerize(url));
            }
            options = OpenLayers.Util.extend({
                "numZoomLevels":        provider.maxZoom,
                "buffer":               0,
                "transitionEffect":     "resize",
                // see: <http://dev.openlayers.org/apidocs/files/OpenLayers/Layer/OSM-js.html#OpenLayers.Layer.OSM.tileOptions>
                // and: <http://dev.openlayers.org/apidocs/files/OpenLayers/Tile/Image-js.html#OpenLayers.Tile.Image.crossOriginKeyword>
                "tileOptions": {
                    "crossOriginKeyword": null
                }
            }, options);
            return OpenLayers.Layer.OSM.prototype.initialize.call(this, name, hosts, options);
        }
    });
}

/*
 * StamenMapType for Google Maps API V3
 * <https://developers.google.com/maps/documentation/javascript/>
 */
if (typeof google === "object" && typeof google.maps === "object") {
    google.maps.StamenMapType = function(name) {
        var provider = getProvider(name);
        return google.maps.ImageMapType.call(this, {
            "getTileUrl": function(coord, zoom) {
                var index = (zoom + coord.x + coord.y) % SUBDOMAINS.length;
                return [
                    provider.url
                        .replace("{S}", SUBDOMAINS[index])
                        .replace("{Z}", zoom)
                        .replace("{X}", coord.x)
                        .replace("{Y}", coord.y)
                ];
            },
            "tileSize": new google.maps.Size(256, 256),
            "name":     name,
            "minZoom":  provider.minZoom,
            "maxZoom":  provider.maxZoom
        });
    };
    // FIXME: is there a better way to extend classes in Google land?
    google.maps.StamenMapType.prototype = new google.maps.ImageMapType("_");
}

})(typeof exports === "undefined" ? this : exports);
