const d3 = require('d3');
const moment = require('moment');

module.exports = (function() {
    const burndown = {};

    // Create a burndown chart
    burndown.create = (element, project_name, sprint_id) => {
        var margin = { top: 40, right: 200, bottom: 30, left: 50 },
            width = 941 - margin.left - margin.right,
            height = 500 - margin.top - margin.bottom;

        var x = d3.time.scale()
            .range([0, width]);

        var y = d3.scale.linear()
            .range([height, 0]);

        const color = (name) => {
            if (name === 'sprintLine') {
                return 'red';
            }
            return 'green';
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
        
        d3.json(`data/${project_name}/sprint_burndown.${sprint_id}.json`, (error, data) => {
            if (error) throw error;
                        
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
            
            var city = svg.selectAll(".city")
                .data(totalData)
                .enter().append("g")
                .attr("class", "city");
            
            city.append("path")
                .attr("class", "line")
                .attr("d", d => line(d.values))
                .style("stroke", d => color(d.name));
        });
    }

    return burndown;
})();
