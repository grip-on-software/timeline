// Based on demo.js from the marmelab/EventDrops GitHub repository, MIT license

const sprintf = require('sprintf-js').sprintf;
const d3 = require('d3');
require('event-drops');
require('event-drops/style.css');

const weekday = require('./weekday');

const data = require('../data.json');
const locales = require('../locales.json');

const localeSpec = locales[window.location.search.substr(1)] || locales.nl;
const locale = d3.locale(localeSpec);

const message = (msg, ...args) => {
    var result = localeSpec.messages && localeSpec.messages[msg];
    if (result) {
        result = sprintf.apply(null, [result, ...args]);
    }
    return result;
};
const item_type = (type) => {
    return localeSpec.types[type] || type;
};

const types = [
    'sprint_start', 'rank_change', 'storypoint_change',
    'red_metric', 'impediment', 'sprint_end'
];

const humanizeDate = locale.timeFormat(localeSpec.dateTime);
const colors = d3.scale.category10().domain(types);

const FONT_SIZE = 16; // in pixels
const TOOLTIP_WIDTH = 30; // in rem

const showTooltip = (title, message) => {
    d3.select('body').selectAll('.tooltip').remove();

    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0); // hide it by default

    // show the tooltip with a small animation
    tooltip.transition()
        .duration(200)
        .each('start', function start() {
            d3.select(this).style('block');
        })
        .style('opacity', 1);
    tooltip.on('mouseout', hideTooltip);

    tooltip.html(`
            <div class="commit">
                <div class="content">
                    <h3 class="message">${title}</h3>
                    <p>
                        ${message}
                    </p>
                </div>
            </div>
        `);

    setTooltipLocation(d3.event);
};

const setTooltipLocation = (event) => {
    const rightOrLeftLimit = FONT_SIZE * TOOLTIP_WIDTH;
    const direction = event.pageX > rightOrLeftLimit ? 'right' : 'left';

    const ARROW_MARGIN = 1.65;
    const ARROW_WIDTH = FONT_SIZE;
    const left = direction === 'right' ?
        event.pageX - rightOrLeftLimit :
        event.pageX - ARROW_MARGIN * FONT_SIZE - ARROW_WIDTH / 2;

    d3.select('.tooltip')
        .classed(direction === 'right' ? 'left' : 'right', false)
        .classed(direction, true)
        .style({
            left: `${left}px`,
            top: (event.pageY + 16) + 'px',
        });
};

const showItemTooltip = item => {
    showTooltip(item_type(item.type), message('tooltip-item-message', item.sprint_name, `<span class="date">${humanizeDate(new Date(item.date))}</span>`));
};

const showSprintTooltip = item => {
    showTooltip(item.sprint_name, message('tooltip-sprint-message', `<span class="date">${humanizeDate(new Date(item.date))}</span>`, `<span class="date">${humanizeDate(new Date(item.end_date))}</span>`));
};

const hideTooltip = () => {
    d3.select('.tooltip').transition()
        .duration(200)
        .each('end', function end() {
            this.remove();
        })
        .style('opacity', 0);
};

const updateChart = () => {
    const element = d3.select('.sprint.selected');
    const sprintId = element.empty() ? null : element.attr('id');
    fillChart();

    if (sprintId !== null) {
        selectSprint(d3.select('#' + sprintId));
    }
};

var chart;
var weekdayScale = false;
d3.select('[data-weekday-scale]').property('checked', weekdayScale).on('change', function() {
    weekdayScale = this.checked;
    buildMainChart();
    updateChart();
});

const tf = locale.timeFormat(localeSpec.longDate);
const dateFormat = (d) => {
    if (typeof d === "number") {
        d = weekday.invert(d);
    }
    return tf(d);
};

const makeChart = () => d3.chart.eventDrops()
    .locale(locale)
    .dateFormat(dateFormat)
    .labelsWidth(100)
    .margin({top: 40, left: 200, bottom: 30, right: 50})
    .eventColor(d => colors(d.type))
    .date(d => new Date(d.date))
    .mouseover(showItemTooltip)
    .mouseout(hideTooltip)
    .xScale((scale) => {
        if (!weekdayScale) {
            return scale;
        }

        const templateScale = d3.scale.linear();
        var newScale = function(x) {
            if (typeof x === "number") {
                return templateScale(x);
            }
            return templateScale(weekday(x));
        };
        for (var prop in templateScale) {
            newScale[prop] = templateScale[prop];
        }

        newScale.range(scale.range())
            .domain(scale.domain().map(d => weekday(d)));

        newScale.invert = weekday.invert;
        newScale.ticks = scale.ticks;
        return newScale;
    })
    .axisFormat((axis) => {
        if (weekdayScale && !('hasWeekdayFormat' in axis)) {
            const oldFormat = axis.tickFormat();
            axis.hasWeekdayFormat = true;
            axis.tickFormat(d => oldFormat(weekday.invert(d)));
        }
    });

const getData = (projects_data, filter) => {
    var result = [];
    Object.keys(projects_data).forEach(project => {
        const remaining_data = filter(projects_data[project], project);
        if (remaining_data) {
            result.push({
                name: project,
                data: remaining_data,
            });
        }
    });
    return result;
};

const zoomUpdate = (element, old_zoom) => {
    const zoom = element[0][0].zoom;
    zoom.on("zoom.tooltip", hideTooltip);
    const svg = element.select("svg");

    function coordinates(point) {
        var scale = zoom.scale(), translate = zoom.translate();
        return [(point[0] - translate[0]) / scale, (point[1] - translate[1]) / scale];
    }

    function point(coordinates) {
        var scale = zoom.scale(), translate = zoom.translate();
        return [coordinates[0] * scale + translate[0], coordinates[1] * scale + translate[1]];
    }

    if (old_zoom) {
        zoom.center(old_zoom.center());
        zoom.scale(old_zoom.scale());
        zoom.translate(old_zoom.translate());
        svg.call(zoom.event);
    }
    else {
        const center = [zoom.size()[0] / 2, zoom.size()[1] / 2];
        zoom.center(center);
    }

    // Zoom button handlers
    return {
        reset: () => {
            zoom.scale(1);
            zoom.translate([0, 0]);
            svg.transition().call(zoom.event);
        },
        zoom: (direction) => {
            // Record the coordinates (in data space) of the center (in screen space).
            var center0 = zoom.center(), translate0 = zoom.translate(), coordinates0 = coordinates(center0);
            zoom.scale(zoom.scale() * Math.pow(2, direction));

            // Translate back to the center.
            var center1 = point(coordinates0);
            zoom.translate([translate0[0] + center0[0] - center1[0], translate0[1] + center0[1] - center1[1]]);

            svg.transition().duration(500).call(zoom.event);
        }
    };
};

const subtitle = d3.select('#subchart-title');
const subelement = d3.select('#subchart-holder');

const selectSprint = (element) => {
    var d = element.data()[0];
    d3.select('.sprint.selected').classed('selected', false);
    const subdata = getData(data['projects'], (pdata, project) => {
        if (project == d.project_name) {
            return pdata.filter(pd => pd.sprint_name == d.sprint_name);
        }
        return false;
    });
    if (subdata) {
        subtitle.text(d.sprint_name);
        subelement.datum(subdata);
        const subchart = makeChart();
        subchart.start(new Date(d.date)).end(new Date(d.end_date));
        subchart(subelement);
        zoomUpdate(subelement).reset();
        element.classed('selected', true);
    }
};

const buildMainChart = () => {
    chart = makeChart();

    chart.start(new Date(new Date().getTime() - 3600000 * 24 * 365)) // one year ago
        .end(new Date(data['max_date'][0]))
        .dropsDraw(function (drops, newDrops, scales, configuration, line_count, svg) {
            drops.each(function dropDraw(d, idx) {
                if (d.type == "sprint_start") {
                    var drop = d3.select(this);
                    var line_id = 'sprint-lines-' + line_count;
                    var id = 'line-drop-' + line_count + '-' + idx;

                    var sprints = d3.select(svg[0][0].parentNode).selectAll('#' + line_id).data([line_count]);
                    sprints.enter().insert('g', () => this.parentNode.parentNode)
                        .attr('id', line_id).classed('sprints', true)
                        .attr('clip-path', 'url(#drops-container-clipper)')
                        .attr('transform', `translate(0, ${line_count*configuration.lineHeight})`);

                    var sprint = sprints.selectAll('#' + id).data([d]);
                    sprint.enter().append('rect')
                        .classed('sprint', true)
                        .attr({
                            id: id,
                            height: configuration.lineHeight
                        })
                        .on('click', function() {
                            selectSprint(d3.select(this));
                        })
                        .on('mouseover', () => showSprintTooltip(d))
                        .on('mouseout', hideTooltip)
                        .on('mousemove', () => {
                            var event = d3.event;
                            requestAnimationFrame(() => setTooltipLocation(event))
                        });

                    sprint.attr({
                        x: +drop.attr('cx') + 10,
                        width: scales.x(new Date(d.end_date)) - scales.x(new Date(d.date))
                    });

                    sprint.exit().remove();
                    sprints.exit();
                }
            });
        });
};

buildMainChart();

var type_filter = {};
const filterElement = d3.select('#type-filter');
types.forEach(t => {
    type_filter[t] = true;
    const label = filterElement.append('label');
    label.append('input')
        .attr('type', 'checkbox')
        .property('checked', true)
        .on('change', function() {
            type_filter[t] = this.checked;
            updateChart();
            d3.select(this.parentNode).select('.sample circle')
                .attr('fill', this.checked ? colors(t) : 'transparent');
        });
    label.append('svg').classed('sample', true).attr({width: 12, height: 12})
        .append('circle')
        .classed('drop', true)
        .attr({
            r: 5,
            cx: 6,
            cy: 6,
            fill: colors(t),
            stroke: colors(t)
        });
    label.append('span').text(item_type(t));
});

const fillChart = () => {
    const project_data = getData(data['projects'], d => d.filter(pd => type_filter[pd.type]));
    const element = d3.select('#chart-holder').datum(project_data);
    var zoomer;

    if (element[0][0].zoom) {
        const old_zoom = element[0][0].zoom;
        chart(element);
        zoomer = zoomUpdate(element, old_zoom);
    }
    else {
        chart(element);
        zoomer = zoomUpdate(element);
    }

    d3.selectAll("button[data-zoom-reset]").on("click", null).on("click", zoomer.reset);
    d3.selectAll("button[data-zoom]").on("click", null).on("click", function() {zoomer.zoom(+this.getAttribute("data-zoom"))});
};

fillChart();
d3.select(window).on("resize", () => {
    requestAnimationFrame(() => updateChart())
});

const nav = d3.select('nav').append('ul');
Object.keys(locales).forEach((key) => {
    const item = nav.append('li');
    item.append('a').attr({href: '/index.html?' + key, hreflang: key}).text(locales[key].language);
    if (locales[key] == localeSpec) {
        item.classed('selected', true);
    }
});

d3.selectAll("[data-message]").each(function() {
    const msg = this.getAttribute("data-message");
    const children = Array.from(this.children).map((c) => c.outerHTML);
    const replacement = message(msg, ...children);
    if (replacement) {
        d3.select(this).html(replacement);
    }
});
