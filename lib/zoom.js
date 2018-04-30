const d3 = require('d3');
const tooltip = require('./tooltip');

module.exports = (function() {
    const zoom = {};

    // Provide additional functionalty, such as manual zoom and reset,
    // for a d3 zoom handle registered on an `element`.
    // If `old_zoom` is provided, the zoom handle inherits the scale and translate from this zoom.
    zoom.update = (element, old_zoom) => {
        if (!(element instanceof d3.selection)) {
            throw new TypeError('Zoom element is not a D3 selection');
        }

        const new_zoom = element[0][0].zoom;
        new_zoom.on("zoom.tooltip", tooltip.hide);
        const svg = element.select("svg");
        // Disable scrollwheel zooming
        element.on("wheel.zoom", null);

        function coordinates(point) {
            var scale = new_zoom.scale(), translate = new_zoom.translate();
            return [(point[0] - translate[0]) / scale, (point[1] - translate[1]) / scale];
        }

        function point(coordinates) {
            var scale = new_zoom.scale(), translate = new_zoom.translate();
            return [coordinates[0] * scale + translate[0], coordinates[1] * scale + translate[1]];
        }

        if (old_zoom) {
            new_zoom.center(old_zoom.center());
            new_zoom.scale(old_zoom.scale());
            new_zoom.translate(old_zoom.translate());
            svg.call(new_zoom.event);
        }
        else {
            const center = [new_zoom.size()[0] / 2, new_zoom.size()[1] / 2];
            new_zoom.center(center);
        }

        // Zoom button handlers
        return {
            reset: () => {
                new_zoom.scale(1);
                new_zoom.translate([0, 0]);
                svg.transition().call(new_zoom.event);
            },
            zoom: (direction) => {
                // Record the coordinates (in data space) of the center (in screen space).
                var center0 = new_zoom.center(),
                    translate0 = new_zoom.translate(),
                    coordinates0 = coordinates(center0);
                new_zoom.scale(new_zoom.scale() * Math.pow(2, direction));

                // Translate back to the center.
                var center1 = point(coordinates0);
                new_zoom.translate([translate0[0] + center0[0] - center1[0],
                                    translate0[1] + center0[1] - center1[1]]);

                svg.transition().duration(500).call(new_zoom.event);
            }
        };
    };

    return zoom;
})();
