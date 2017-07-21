const d3 = require('d3');
const tooltip = require('./tooltip');
const locales = require('./locales');
const colorScheme = require('../colors.json');

module.exports = (function() {
    const burndown = {};

    var accumulatedData = []; // Data over a range of sprints
    var maxY = 0;

    // Reset the accumulated data
    burndown.reset = () => {
        accumulatedData = [];
        maxY = 0;
    }

    // Create a burndown chart
    burndown.create = (element, project_name, sprint_id, range_start_date, range_end_date, sprint_end_date, locale) => {
        d3.json(`data/${project_name}/sprint_burndown.${sprint_id}.json`, (error, data) => {
            if (error || !data) {
                if (accumulatedData.length === 0) {
                    throw error;
                } else {
                    console.error(error);
                }
                data = [{}]
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

            x.domain([range_start_date, range_end_date]);
            
            let maxValue = d3.max(data, d => d.points);

            if (maxValue > maxY) {
                maxY = maxValue;
            }

            y.domain([0, maxY]);

            const idealLine = [
                { date: data[0].date, points: data[0].points },
                { date: new Date(sprint_end_date), points: 0 }
            ];

            const sprintEndLine = [
                { date: new Date(sprint_end_date), points: 100 },
                { date: new Date(sprint_end_date), points: 0 }
            ];

            // Color for the data line and points
            const dataColor = colorScheme[6];

            const totalData = [
                { color: colorScheme[2], "values": idealLine },
                { color: colorScheme[3], "values": sprintEndLine },
                { color: dataColor, "values": data },
            ];

            totalData.forEach(element => accumulatedData.push(element));

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
                .data(accumulatedData)
                .enter().append("g")
                .attr("class", "dataLine");
            
            // Add the lines
            dataLine.append("path")
                .attr("class", "line")
                .attr("d", d => line(d.values))
                .style("stroke", d => d.color);

            var lines = accumulatedData.filter(element => element.color === dataColor);

            var allLines = [];

            lines.forEach(element => element.values.forEach(item => allLines.push(item)));
            
            // Add points for each item in the burndown data
            svg.selectAll(".point")
                .data(allLines)
                .enter().append("svg:circle")
                .attr("class", "point")
                .attr("stroke", dataColor)
                .attr("fill", dataColor)
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
