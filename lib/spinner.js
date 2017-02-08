// Based on http://bl.ocks.org/Mattwoelk/6132258

const defaultConfiguration = {
    container: "#loader_container",
    id: 'loader',
    width: 960,
    height: 500,
    startAngle: 0
};

module.exports = (function() {
    return function loader(configuration = {}) {
        var config = Object.assign({}, defaultConfiguration, configuration);

        var load = function() {
            var radius = Math.min(config.width, config.height) / 2;
            const tau = 2 * Math.PI;

            var innerArc = d3.svg.arc()
                .innerRadius(radius*0.5)
                .outerRadius(radius*0.7)
                .startAngle(0);
            var outerArc = d3.svg.arc()
                .innerRadius(radius*0.7)
                .outerRadius(radius*0.9)
                .startAngle(0);

            var group = d3.select(config.container).append("svg")
                .attr("id", config.id)
                .attr("width", config.width)
                .attr("height", config.height)
                .append("g")
                .attr("transform", `translate(${config.width / 2}, ${config.height / 2})`)
                .append("g")
                .call(spin, 1500);

            group.append("path")
                .datum({endAngle: 0.33*tau})
                .style("fill", "#B400C8")
                .attr("d", outerArc);
            group.append("path")
                .datum({endAngle: 0.33*tau})
                .style("fill", "#507AFF")
                .attr("d", innerArc);

            function spin(selection, duration) {
                if (d3.select(selection.node()).empty()) {
                    return;
                }

                selection.transition()
                    .ease("linear")
                    .duration(duration)
                    .attrTween("transform", transformTween);

                setTimeout(function() { spin(selection, duration); }, duration);
            }

            function transformTween() {
                return d3.interpolateString(`rotate(${config.startAngle})`, `rotate(${360-Math.abs(config.startAngle)})`);
            }
        };

        load.remove = function() {
            d3.select(config.container).select('svg#' + config.id).remove();
        };

        return load;
    }
})();
