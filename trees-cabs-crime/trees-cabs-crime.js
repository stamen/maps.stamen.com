var __onload__ = window.onload;
window.onload = function() {
    if (__onload__) __onload__.apply(this, arguments);

    var background = new MM.StamenTileLayer("toner-background");
    background.parent.id = "toner-background";
    MAP.addLayer(background);
    MAP.draw();
};
