import * as d3 from 'd3';
import tooltip from './tooltip';

const zoom = {};

// Provide additional functionalty, such as manual zoom and reset,
// for a d3 zoom handle registered on an `element`.
// If `oldZoom` is provided, the zoom handle inherits the scale and translate from this zoom.
zoom.update = (element, oldZoom) => {
    if (!(element instanceof d3.selection)) {
        throw new TypeError('Zoom element is not a D3 selection');
    }

    const newZoom = element[0][0].zoom;
    newZoom.on("zoom.tooltip", tooltip.hide);
    const svg = element.select("svg");
    // Disable scrollwheel zooming
    element.on("wheel.zoom", null);

    function coordinates(point) {
        const scale = newZoom.scale(),
            translate = newZoom.translate();
        return [(point[0] - translate[0]) / scale, (point[1] - translate[1]) / scale];
    }

    function point(coordinates) {
        const scale = newZoom.scale(),
            translate = newZoom.translate();
        return [coordinates[0] * scale + translate[0], coordinates[1] * scale + translate[1]];
    }

    if (oldZoom) {
        newZoom.center(oldZoom.center());
        newZoom.scale(oldZoom.scale());
        newZoom.translate(oldZoom.translate());
        svg.call(newZoom.event);
    }
    else {
        const center = [newZoom.size()[0] / 2, newZoom.size()[1] / 2];
        newZoom.center(center);
    }

    // Zoom button handlers
    return {
        reset: () => {
            newZoom.scale(1);
            newZoom.translate([0, 0]);
            svg.transition().call(newZoom.event);
        },
        zoom: (direction) => {
            // Record the coordinates (in data space) of the center (in screen space).
            const center0 = newZoom.center(),
                translate0 = newZoom.translate(),
                coordinates0 = coordinates(center0);
            newZoom.scale(newZoom.scale() * Math.pow(2, direction));

            // Translate back to the center.
            const center1 = point(coordinates0);
            newZoom.translate([translate0[0] + center0[0] - center1[0],
                                translate0[1] + center0[1] - center1[1]]);

            svg.transition().duration(500).call(newZoom.event);
        }
    };
};

export default zoom;
