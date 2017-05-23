const d3 = require('d3');
const tooltip = require('./tooltip');
const locales = require('./locales');

module.exports = (function() {
    const burndown = {};

    // Create a burndown chart
    burndown.create = (element, project_name, sprint_id, locale) => {
        d3.json(`data/${project_name}/sprint_burndown.${sprint_id}.json`, (error, data) => {
            if (error || !data) {
                throw error;
            }

            const localeSpec = locales.select(locale);
            const locale = locales.locale();

            const tf = locale.timeFormat(localeSpec.dateTime);
            const dateFormat = (d) => {
                if (typeof d === "number") {
                    d = weekday.invert(d);
                }
                return tf(d);
            };

            var margin = { top: 20, right: 10, bottom: 40, left: 170 },
                width = 941 - margin.left - margin.right,
                height = 500 - margin.top - margin.bottom;

            var x = d3.time.scale()
                .range([0, width]);

            var y = d3.scale.linear()
                .range([height, 0]);

            const color = (name) => {
                if (name === 'sprintLine') {
                    return '#e0ca3c';
                }
                return '#2ca02c';
            }

            var xAxis = d3.svg.axis()
                .scale(x)
                .orient("bottom");

            var yAxis = d3.svg.axis()
                .scale(y)
                .orient("left");

            var line = d3.svg.line()
                .interpolate("linear")
                .x(d => x(d.date))
                .y(d => y(d.points));
      
            var svg = element.append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .attr("class", "burndown-chart")
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            data.forEach(d => d.date = new Date(d.date));
            
            x.domain(d3.extent(data, d => d.date));
            
            let maxValue = d3.max(data, d => d.points);

            y.domain([0, maxValue]);

            let idealLine = [
                {date: data[0].date, points: data[0].points},
                {date: data[data.length-1].date, points: 0}
            ];

            let totalData = [
                { name: "sprintLine", "values": data },
                { name: "idealLine", "values": idealLine }
            ];

            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis);
            
            svg.append("g")
                .attr("class", "y axis")
                .call(yAxis)
                .append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 6)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .text("Story points");
            
            var dataLine = svg.selectAll(".dataLine")
                .data(totalData)
                .enter().append("g")
                .attr("class", "dataLine");
            
            // Add the lines
            dataLine.append("path")
                .attr("class", "line")
                .attr("d", d => line(d.values))
                .style("stroke", d => color(d.name));
            
            // Add points for each item in the burndown data
            svg.selectAll(".point")
                .data(data)
                .enter().append("svg:circle")
                .attr("class", "point")
                .attr("stroke", color('sprintLine'))
                .attr("fill", color('sprintLine'))
                .attr("cx", d => x(d.date))
                .attr("cy", d => y(d.points))
                .attr("r", 5)
                .on('mouseover', d => tooltip.show(dateFormat(d.date), locales.message("story_points_left", [d.points])))
                .on('mouseout', tooltip.hide)
                .on('mousemove', () => {
                    var event = d3.event;
                    requestAnimationFrame(() => tooltip.setLocation(event))
                });
        });
    }

    return burndown;
})();
