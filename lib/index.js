// Based on demo.js from the marmelab/EventDrops GitHub repository, MIT license

const d3 = require('d3');
const smoothscroll = require('smoothscroll');
const naturalSort = require('javascript-natural-sort');
const mousetrap = require('mousetrap');
require('event-drops');
require('event-drops/style.css');

const json = require('./json');
const locales = require('./locales');
const spinner = require('./spinner');
const tooltip = require('./tooltip');
const weekday = require('./weekday');
const zoom = require('./zoom');
const burndown = require('./burndown');
const colorScheme = require('../colors.json');

// Initial project metadata for main chart
const data = require('../data/data.json');
const types = require('../data/types.json');
const features = require('../data/features.json');

const loader = json(data['update_date']);
loader.preload('data/sprint_start.json', require('../data/sprint_start.json'));
loader.preload('data/sprint_end.json', require('../data/sprint_end.json'));

locales.select('nl');
const localeSpec = locales.select(window.location.search.substr(1));
const locale = locales.locale();

const humanizeDate = locale.timeFormat(localeSpec.dateTime);

// Color scheme adapted for color blindness
const colors = d3.scale.ordinal().domain(types.map((spec) => spec.name)).range(colorScheme);

const showItemTooltip = item => {
    var date = `<span class="date">${humanizeDate(new Date(item.date))}</span>`;
    var message = typeof item.sprint_name === "undefined" ?
        locales.message('tooltip-item-message-no-sprint', [date]) :
        locales.message('tooltip-item-message', [item.sprint_name, date]);

    if (item.type === 'story') {
        message += `<br>${locales.message('tooltip-item-message-story-start', [humanizeDate(new Date(item.start_date))])}`;
    }

    tooltip.show(locales.type(item.type), message);
};

const showSprintTooltip = item => {
    var message = locales.message('tooltip-sprint-message', [
        `<span class="date">${humanizeDate(new Date(item.date))}</span>`,
        `<span class="date">${humanizeDate(new Date(item.end_date))}</span>`
    ]);
    if (item.sprint_id && features[item.project_name][item.sprint_id]) {
        message += "<dl>";
        Object.keys(features[item.project_name][item.sprint_id]).forEach((key) => {
            message += `
                <dt>${key}</dt>
                <dd>${features[item.project_name][item.sprint_id][key]}</dd>`;
        });
        message += "</dl>";
    }
    tooltip.show(item.sprint_name, message);
};

const updateChart = () => {
    const element = d3.select('.sprint.selected');
    const sprintId = element.empty() ? null : element.attr('id');
    fillChart().then(() => {
        if (sprintId !== null) {
            selectSprint(d3.select('#' + sprintId));
        }
    });
};

var chart;
var weekdayScale = false;
d3.select('[data-weekday-scale]').property('checked', weekdayScale).on('change', function() {
    weekdayScale = this.checked;
    buildMainChart();
    updateChart();
});

const updateFeatureLabel = () => {
    const select = d3.select('[data-feature-label]');
    select.append('option')
        .attr('value', '')
        .text(locales.message('feature-label-empty'));
    for (let item in Object.values(Object.values(features)[0])[0]) {
        select.append('option').text(item);
    }
    select.on('change', function() {
        feature_label = this.value;
        updateChart();
    });
};

updateFeatureLabel();

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
    .hasBottomAxis(false)
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

const fetchData = (filter, info, target_data, collector) => {
    if (!collector) {
        collector = (result, partial_data, type) => {
            data['projects'].forEach(p => {
                result[p] = (result[p] || []).concat(partial_data[p]);
            });
        };
    }
    if (!target_data) {
        var target_data = {};
    }
    var promises = [];
    types.forEach((type) => {
        if (filter(type)) {
            const path = "data/" + (type.subchart ?
                info.project_name + "/" + type.name + "." + info.sprint_id :
                type.name
            ) + ".json";
            var promise = loader.loadJSON(path,
                (partial_data) => {collector(target_data, partial_data, type)}
            );
            promises.push(promise);
        }
    });
    return new Promise((fulfill, reject) => {
        Promise.all(promises).then(() => {fulfill(target_data)});
    });
};

const formatData = (projects_data, filter) => {
    var result = [];
    Object.keys(projects_data).sort(naturalSort).forEach(project => {
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

let earliest_start_date;
let last_end_date;
let last_selected_project_name;
let selected_sprints = [];
let feature_label = '';

const selectSprint = (element, multi_selection) => {
    var d = element.data()[0];
    const filter = sprint_filter(d);

    const start_date = new Date(d.date);
    const end_date = new Date(d.end_date);

    if (last_selected_project_name !== d.project_name || ! multi_selection) {
        // Only select one sprint
        selected_sprints = [];

        d3.selectAll('.sprint.selected').classed('selected', false);
        
        subtitle.text(locales.message('subchart-title', [d.project_name, d.sprint_name]));

        burndown.reset();

        earliest_start_date = start_date;
        last_end_date = end_date;               
    } else {  
        // Multiple sprints are selected
        // If this sprint is already selected, don't do anything
        if (selected_sprints.indexOf(d.sprint_id) !== -1) {
            return;
        }

        selected_sprints.push(d.sprint_id);

        if (! earliest_start_date || start_date < earliest_start_date) {
            earliest_start_date = start_date;
        }

        if (! last_end_date || end_date > last_end_date) {
            last_end_date = end_date;
        }

        subtitle.text(locales.message('subchart-title-multiple', [d.project_name, selected_sprints.length+1]));
    }

    subelement.selectAll('svg').remove();

    sprint_spinner();
    fetchData(type => !type.subchart, d).then(project_data => {
        project_data = formatData(project_data, (pdata, project) => {
            if (project == d.project_name) {
                return pdata.filter(filter);
            }
            return false;
        });

        if (project_data) {
            const start_subdata = [
                {
                    name: locales.message('subchart-events'),
                    data: project_data[0].data,
                }
            ];
            fetchData((type) => type.subchart, d, start_subdata,
                (result, partial_data, type) => {
                    result.push({
                        name: locales.message('subchart-' + type.name),
                        data: partial_data
                    });
                }
            ).then(subdata => {
                let currentData = subelement.datum();
    
                if (currentData && (last_selected_project_name === d.project_name) && multi_selection) {
                    subdata.forEach((element, index) => {
                        element.data.forEach(dataItem => {
                            currentData[index].data.push(dataItem);
                        });
                    });
                    subelement.datum(currentData);
                } else {
                    subelement.datum(subdata);
                }

                last_selected_project_name = d.project_name;                

                const subchart = makeChart();

                subchart.labelsWidth(160)
                    .start(new Date(earliest_start_date)).end(new Date(last_end_date));

                sprint_spinner.remove();
                subchart(subelement);
                zoom.update(subelement).reset();
                element.classed('selected', true);

                burndown.create(subelement, project_data[0].name, project_data[0].data[0].sprint_id, earliest_start_date, last_end_date, d.end_date, locale);
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
        .end(new Date(data['max_date']))
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
                    var rect = sprint.enter().append('rect')
                        .classed('sprint', true)
                        .attr({
                            id: id,
                            height: configuration.lineHeight
                        })
                        .on('click', function() {
                            let pressed_shift = d3.event.shiftKey;

                            selectSprint(d3.select(this), pressed_shift);

                            if (! pressed_shift) {
                                smoothscroll(document.querySelector('#subchart-title'));                                
                            }
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


                    if (feature_label != '') {
                        rect.classed(!!features[d.project_name][d.sprint_id][feature_label] ? 'green' : 'red', true);
                        sprint.select('rect')
                            .classed('green', !!features[d.project_name][d.sprint_id][feature_label])
                            .classed('red', !features[d.project_name][d.sprint_id][feature_label]);
                    }

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
    return fetchData((type) => type_filter[type.name]).then((project_data) => {
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

        Mousetrap.bind(['+', '=', 'plus'], () => zoomer.zoom(1));
        Mousetrap.bind('-', () => zoomer.zoom(-1));
        Mousetrap.bind('0', zoomer.reset);
    });
};

chart_spinner();
fillChart();
d3.select(window).on("resize", () => {
    requestAnimationFrame(() => updateChart())
});

locales.generateNavigation(d3.select('nav'));
locales.updateMessages();
