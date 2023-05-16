/**
 * Burndown subchart.
 *
 * Copyright (c) 2017-2020 ICTU
 * Copyright (c) 2017-2022 Leiden University
 * Copyright (c) 2017-2023 Leon Helwerda
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import * as d3 from 'd3';
import tooltip from './tooltip';
import colorScheme from '../colors.json';

const burndown = {};

let accumulatedData = []; // Data over a range of sprints
let maxY = 0;

// Reset the accumulated data
burndown.reset = () => {
    accumulatedData = [];
    maxY = 0;
};

// Create a burndown chart
burndown.create = (element, locales, project, sprint) => {
    d3.json(`data/sprint_burndown/${project.name}/sprint_burndown.${sprint.id}.json`, (error, data) => {
        if (error || !data) {
            if (accumulatedData.length === 0) {
                throw error;
            } else {
                console.error(error);
            }
            data = [{}];
        }

        const d3locale = d3.locale(locales.selectedLocale);

        const tf = d3locale.timeFormat(locales.get("dateTime"));
        const dateFormat = (d) => {
            if (typeof d === "number") {
                d = weekday.invert(d);
            }
            return tf(d);
        };

        const margin = { top: 20, right: 10, bottom: 40, left: 170 },
            width = 941 - margin.left - margin.right,
            height = 500 - margin.top - margin.bottom;

        const x = d3.time.scale()
            .range([0, width]);

        const y = d3.scale.linear()
            .range([height, 0]);

        const xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom");

        const yAxis = d3.svg.axis()
            .scale(y)
            .orient("left");

        const line = d3.svg.line()
            .interpolate("linear")
            .x(d => x(d.date))
            .y(d => y(d.points));

        const svg = element.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .attr("class", "burndown-chart")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        data.forEach(d => d.date = new Date(d.date));

        x.domain([project.start_date, project.end_date]);

        const maxValue = d3.max(data, d => d.points);

        if (maxValue > maxY) {
            maxY = maxValue;
        }

        y.domain([0, maxY]);

        const idealLine = [
            { date: data[0].date, points: data[0].points },
            { date: new Date(sprint.end_date), points: 0 }
        ];

        const sprintEndLine = [
            { date: new Date(sprint.end_date), points: 100 },
            { date: new Date(sprint.end_date), points: 0 }
        ];

        // Color for the data line and points
        const dataColor = 4;
        const types = ["initial", "scope_add", "scope_remove", "points", "completed", "close"];

        const totalData = [
            { color: colorScheme[2], "values": idealLine },
            { color: colorScheme[3], "values": sprintEndLine },
            { color: colorScheme[dataColor], "values": data },
        ];

        totalData.forEach(element => accumulatedData.push(element));

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", `translate(0,${height})`)
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

        const dataLine = svg.selectAll(".dataLine")
            .data(accumulatedData)
            .enter().append("g")
            .attr("class", "dataLine");

        // Add the lines
        dataLine.append("path")
            .attr("class", "line")
            .attr("d", d => line(d.values))
            .style("stroke", d => d.color);

        const lines = accumulatedData.filter(
            element => element.color === colorScheme[dataColor]
        );

        let allLines = [];

        lines.forEach(element => {
            element.values.forEach(item => allLines.push(item));
        });

        // Add points for each item in the burndown data
        svg.selectAll(".point")
            .data(allLines)
            .enter().append("circle")
            .attr("class", "point")
            .attr("stroke", d => colorScheme[(dataColor + types.indexOf(d.type)) % colorScheme.length])
            .attr("fill", d => colorScheme[(dataColor + types.indexOf(d.type)) % colorScheme.length])
            .attr("cx", d => x(d.date))
            .attr("cy", d => y(d.points))
            .attr("r", 5)
            .on('mouseover', d => tooltip.show(dateFormat(d.date), locales.message("story_points_left", [locales.attribute("burndown", d.type), d.points])))
            .on('mouseout', tooltip.hide)
            .on('mousemove', () => {
                requestAnimationFrame(() => tooltip.setLocation(d3.event));
            });
    });
};

export default burndown;
