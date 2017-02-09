// Based on demo.js from the marmelab/EventDrops GitHub repository, MIT license

const d3 = require('d3');
require('event-drops');
require('event-drops/style.css');

const json = require('./json');
const locales = require('./locales');
const spinner = require('./spinner');
const tooltip = require('./tooltip');
const weekday = require('./weekday');
const zoom = require('./zoom');

// Initial project metadata for main chart
const data = require('../data/data.json');
const types = require('../types.json');

const loader = json(data['update_date']);
loader.preload('data/sprint_start.json', require('../data/sprint_start.json'));
loader.preload('data/sprint_end.json', require('../data/sprint_end.json'));

locales.select('nl');
const localeSpec = locales.select(window.location.search.substr(1));
const locale = locales.locale();

const humanizeDate = locale.timeFormat(localeSpec.dateTime);
const colors = d3.scale.category10().domain(types.map((spec) => spec.name));

const showItemTooltip = item => {
    var date = `<span class="date">${humanizeDate(new Date(item.date))}</span>`;
    var message = typeof item.sprint_name === "undefined" ?
        locales.message('tooltip-item-message-no-sprint', [date]) :
        locales.message('tooltip-item-message', [item.sprint_name, date]);
    tooltip.show(locales.type(item.type), message);
};

const showSprintTooltip = item => {
    tooltip.show(item.sprint_name, locales.message('tooltip-sprint-message', [ `<span class="date">${humanizeDate(new Date(item.date))}</span>`, `<span class="date">${humanizeDate(new Date(item.end_date))}</span>`]));
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
    .date(d => weekdayScale ? weekday(new Date(d.date)) : new Date(d.date))
    .mouseover(showItemTooltip)
    .mouseout(tooltip.hide)
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

const fetchData = (filter, callback) => {
    var project_data = {};
    var promises = [];
    types.forEach((type) => {
        if (filter(type)) {
            var promise = loader.loadJSON("data/" + type.name + ".json", (partial_data) => {
                data['projects'].forEach(p => {
                    project_data[p] = Array.concat(project_data[p] || [], partial_data[p]);
                });
            });
            promises.push(promise);
        }
    });
    Promise.all(promises).then(() => {
        callback(project_data);
    });
};

const formatData = (projects_data, filter) => {
    var result = [];
    Object.keys(projects_data).forEach(project => {
        const remaining_data = filter(projects_data[project], project);
        if (remaining_data) {
            result.push({
                name: project,
                data: remaining_data
            });
        }
    });
    return result;
};


const subtitle = d3.select('#subchart-title');
const subelement = d3.select('#subchart-holder');

const sprint_filter = (d) => {
    return (pd) => pd.sprint_name == d.sprint_name;
};
const sprint_spinner = spinner({
    width: subelement.node().clientWidth,
    height: 80,
    startAngle: 220,
    container: '#subchart-holder',
    id: 'subchart-loader'
});

const selectSprint = (element) => {
    var d = element.data()[0];
    const filter = sprint_filter(d);
    d3.select('.sprint.selected').classed('selected', false);

    subtitle.text(locales.message('subchart-title', [d.project_name, d.sprint_name]));
    subelement.selectAll('svg').remove();

    sprint_spinner();
    fetchData((type) => !type.subchart, (project_data) => {
        project_data = formatData(project_data, (pdata, project) => {
            if (project == d.project_name) {
                return pdata.filter(filter);
            }
            return false;
        });

        if (project_data) {
            var path = "data/" + d.project_name + "/commits." + d.sprint_id + ".json";
            loader.loadJSON(path, (c) => {
                const subdata = [
                    {
                        name: locales.message('subchart-events'),
                        data: project_data[0].data,
                    },
                    {
                        name: locales.message('subchart-commits'),
                        data: c
                    }
                ];
                subelement.datum(subdata);
                const subchart = makeChart();
                subchart.labelsWidth(160)
                    .start(new Date(d.date)).end(new Date(d.end_date));

                sprint_spinner.remove();
                subchart(subelement);
                zoom.update(subelement).reset();
                element.classed('selected', true);
            });
        }
        else {
            sprint_spinner.remove();
            subelement.text(locales.message('subchart-no-data'));
        }
    });
};

const buildMainChart = () => {
    chart = makeChart();

    chart.start(new Date(new Date().getTime() - 3600000 * 24 * 365)) // one year ago
        .end(new Date(data['max_date'][0]))
        .dropsDraw(function (drops, newDrops, scales, configuration, line_count, svg) {
            var line_id = 'sprint-lines-' + line_count;
            var sprints = d3.select(svg[0][0].parentNode).selectAll('#' + line_id).data([line_count]);
            sprints.enter().insert('g', () => svg[0][0])
                .attr('id', line_id).classed('sprints', true)
                .attr('clip-path', 'url(#drops-container-clipper)')
                .attr('transform', `translate(0, ${line_count*configuration.lineHeight})`);

            drops.each(function dropDraw(d, idx) {
                if (d.type == "sprint_start") {
                    var id = 'line-drop-' + line_count + '-' + idx;

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
                        .on('mouseout', tooltip.hide)
                        .on('mousemove', () => {
                            var event = d3.event;
                            requestAnimationFrame(() => tooltip.setLocation(event))
                        });

                    var sx = scales.x(new Date(d.date));
                    sprint.attr({
                        x: +sx + 10,
                        width: scales.x(new Date(d.end_date)) - sx
                    });

                    sprint.exit().remove();
                }
            });
        });
};

buildMainChart();

var type_filter = {};
const filterElement = d3.select('#type-filter');
types.forEach(spec => {
    if (spec.subchart) {
        return;
    }
    var t = spec.name
    type_filter[t] = spec.enabled;
    const label = filterElement.append('label');
    label.append('input')
        .attr('type', 'checkbox')
        .property('checked', spec.enabled)
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
            fill: spec.enabled ? colors(t) : 'transparent',
            stroke: colors(t)
        });
    label.append('span').text(locales.type(t));
});

const chart_spinner = spinner({
    width: d3.select('#chart-holder').node().clientWidth,
    height: 40 * data['projects'].length,
    startAngle: 220,
    container: '#chart-holder',
    id: 'chart-loader'
});

const fillChart = () => {
    fetchData((type) => type_filter[type.name], (project_data) => {
        const element = d3.select('#chart-holder')
            .datum(formatData(project_data, d => d));

        chart_spinner.remove();
        var zoomer;

        if (element[0][0].zoom) {
            const old_zoom = element[0][0].zoom;
            chart(element);
            zoomer = zoom.update(element, old_zoom);
        }
        else {
            chart(element);
            zoomer = zoom.update(element);
        }

        d3.selectAll("button[data-zoom-reset]").on("click", null)
            .on("click", zoomer.reset);
        d3.selectAll("button[data-zoom]").on("click", null)
            .on("click", function() {
                zoomer.zoom(+this.getAttribute("data-zoom"))
            });
    });
};

chart_spinner();
fillChart();
d3.select(window).on("resize", () => {
    requestAnimationFrame(() => updateChart())
});

locales.generateNavigation(d3.select('nav'));
locales.updateMessages();
