(function() {

var stamen = {};
stamen.tile = {
    "toner": {
        "url": "http://{S}tile.stamen.com/toner/{Z}/{X}/{Y}.png",
        "zooms": 20
    },
    "terrain": {
        "url": "http://{S}tile.stamen.com/terrain/{Z}/{X}/{Y}.jpg",
        "zooms": 19
    },
    "watercolor": {
        "url": "http://{S}tile.stamen.com/watercolor/{Z}/{X}/{Y}.jpg",
        "zooms": 19
    }
};
var subdomains = ["", "a.", "b.", "c.", "d."];

if (typeof MM === "object") {
    MM.StamenTileLayer = function(name) {
        var url = stamen.tile[name].url;
        return MM.TemplatedLayer.call(this, url, subdomains);
    };
    MM.extend(MM.StamenTileLayer, MM.TemplatedLayer);
}

if (typeof L === "object") {
    L.StamenTileLayer = L.Class(L.TileLayer, {
        initialize: function(name) {
            var url = stamen.tile[name].url.toLowerCase();
            L.TileLayer.prototype.initialize.call(this, url, {
                "minZoom":      0,
                "maxZoom":      stamen.tile[name].zooms,
                "subdomains":   subdomains,
                "scheme":       "xyz",
                "attribution": 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://creativecommons.org/licenses/by-sa/3.0">CC BY SA</a>.'
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
            var url = stamen.tile[name].url,
                hosts = [];
            if (url.indexOf("{S}") > -1) {
                for (var i = 0; i < subdomains.length; i++) {
                    hosts.push(openlayerize(url.replace("{S}", subdomains[i])));
                }
            } else {
                hosts.push(openlayerize(url));
            }
            options = OpenLayers.Util.extend({
                "numZoomLevels":    stamen.tile[name].zooms,
                "buffer":           0,
                "transitionEffect": "resize"
            }, options);
            OpenLayers.Layer.OSM.prototype.initialize.apply(this, [name, hosts, options]);
        }
    });
}

if (typeof google === "object" && typeof google.maps === "object") {
    google.maps.StamenMapType = function(name) {
        var url = stamen.tile[name].url.replace("{S}", "");
        google.maps.ImageMapType.apply(this, {
            "getTileUrl": function(coord, zoom) {
                var index = (zoom + coord.x + coord.y) % subdomains.length;
                return [
                    url.replace("{S}", subdomains[index])
                       .replace("{Z}", zoom)
                       .replace("{X}", coord.x)
                       .replace("{Y}", coord.y)
                ];
            },
            "tileSize": new google.maps.Size(256, 256),
            "name":     name,
            "maxZoom":  stamen.tile[name].zooms
        });
    };
}

})();
