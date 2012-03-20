(function() {

var SUBDOMAINS = ["", "a.", "b.", "c.", "d."],
    PROVIDERS =  {
        "toner": {
            "url": "http://{S}tile.stamen.com/toner/{Z}/{X}/{Y}.png",
            "minZoom": 0,
            "maxZoom": 20
        },
        "toner-lines": {
            "url": "http://{S}tile.stamen.com/toner-lines/{Z}/{X}/{Y}.png",
            "minZoom": 0,
            "maxZoom": 20
        },
        "toner-labels": {
            "url": "http://{S}tile.stamen.com/toner-labels/{Z}/{X}/{Y}.png",
            "minZoom": 0,
            "maxZoom": 20
        },
        "terrain": {
            "url": "http://{S}tile.stamen.com/terrain/{Z}/{X}/{Y}.jpg",
            "minZoom": 4,
            "maxZoom": 18
        },
        "watercolor": {
            "url": "http://{S}tile.stamen.com/watercolor/{Z}/{X}/{Y}.jpg",
            "minZoom": 3,
            "maxZoom": 16
        }
    },
    ATTRIBUTION = 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, ' +
        'under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. ' +
        'Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, ' +
        'under <a href="http://creativecommons.org/licenses/by-sa/3.0">CC BY SA</a>.';

function getProvider(name) {
    if (name in PROVIDERS) {
        return PROVIDERS[name];
    } else {
        throw 'No such provider: "' + name + '"';
    }
}

if (typeof MM === "object") {
    MM.StamenTileLayer = function(name) {
        var provider = getProvider(name);
        MM.Layer.call(this, new MM.TemplatedMapProvider(provider.url, SUBDOMAINS));
        this.provider.setZoomRange(provider.minZoom, provider.maxZoom);
        this.attribution = ATTRIBUTION;
    };
    MM.extend(MM.StamenTileLayer, MM.Layer);
}

if (typeof L === "object") {
    L.StamenTileLayer = L.TileLayer.extend({
        initialize: function(name) {
            var provider = getProvider(name),
                url = provider.url.toLowerCase();
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
                "numZoomLevels":    provider.maxZoom,
                "buffer":           0,
                "transitionEffect": "resize"
            }, options);
            return OpenLayers.Layer.OSM.prototype.initialize.call(this, name, hosts, options);
        }
    });
}

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

})();
