// Based on demo.js from the marmelab/EventDrops GitHub repository, MIT license

import * as d3 from 'd3';
import smoothscroll from 'smoothscroll';
import naturalSort from 'javascript-natural-sort';
import mousetrap from 'mousetrap';

import json from './json';
import {Locale, Navbar, Spinner} from '@gros/visualization-ui';
import tooltip from './tooltip';
import weekday from './weekday';
import zoom from './zoom';
import burndown from './burndown';

import config from 'config.json';
import locale from '../locales.json';
import colorScheme from '../colors.json';

require('event-drops');

// Initial project metadata for main chart
const data = require('../public/data/data.json');
const types = require('../public/data/types.json');
const features = require('../public/data/features.json');
const localization = require('../public/data/locales.json');

const loader = json(data.update_date);

const locales = new Locale(locale);
locales.select(config.language);
locales.select(window.location.search.substr(1));
const timeLocale = d3.locale(locales.selectedLocale);

const humanizeDate = timeLocale.timeFormat(locales.get("dateTime"));

// Color scheme adapted for color blindness
const colors = d3.scale.ordinal().domain(types.map((spec) => spec.name)).range(colorScheme);
const typeLocales = types.reduce((current, spec) => {
    current[spec.name] = spec.locales;
    return current;
}, {});

let chart;
let weekdayScale = false;

const holder = d3.select('#chart-holder');

const subtitle = d3.select('#subchart-title');
const subelement = d3.select('#subchart-holder');

const sprintFilter = (d) => {
    return (pd) => pd.sprint_name === d.sprint_name;
};
const sprintSpinner = new Spinner({
    width: subelement.node().clientWidth,
    height: 80,
    startAngle: 220,
    container: '#subchart-holder',
    id: 'subchart-loader'
});

const chartSpinner = new Spinner({
    width: holder.node().clientWidth,
    height: 40 * data.projects.length,
    startAngle: 220,
    container: '#chart-holder',
    id: 'chart-loader'
});

let earliestStartDate;
let lastEndDate;
let lastSelectedProjectName;
let selectedSprints = [];
let featureLabel = '';
let featureThreshold = 0;

var typeFilter = {};
const filterElement = d3.select('#type-filter');

const tf = timeLocale.timeFormat(locales.get("longDate"));
const dateFormat = (d) => {
    if (typeof d === "number") {
        d = weekday.invert(d);
    }
    return tf(d);
};

const showItemTooltip = item => {
    const date = `<span class="date">${humanizeDate(new Date(item.date))}</span>`;
    let message = typeof item.sprint_name === "undefined" ?
        locales.message('tooltip-item-message-no-sprint', [date]) :
        locales.message('tooltip-item-message', [item.sprint_name, date]);

    if (item.type === 'story') {
        message += `<br>${locales.message('tooltip-item-message-story-start', [humanizeDate(new Date(item.start_date))])}`;
    }

    tooltip.show(locales.retrieve(typeLocales[item.type] || {}) || item.type, message);
};

const showSprintTooltip = item => {
    let message = locales.message('tooltip-sprint-message', [
        `<span class="date">${humanizeDate(new Date(item.date))}</span>`,
        `<span class="date">${humanizeDate(new Date(item.end_date))}</span>`
    ]);
    if (item.sprint_id && features[item.project_name][item.sprint_id]) {
        message += "<dl>";
        Object.keys(features[item.project_name][item.sprint_id]).forEach((key) => {
            message += `
                <dt>${locales.retrieve(localization, key)}</dt>
                <dd>${features[item.project_name][item.sprint_id][key]}</dd>`;
        });
        message += "</dl>";
    }
    tooltip.show(item.sprint_name, message);
};

const makeChart = () => d3.chart.eventDrops()
    .locale(timeLocale)
    .dateFormat(dateFormat)
    .labelsWidth(150)
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
        let newScale = function(x) {
            if (typeof x === "number") {
                return templateScale(x);
            }
            return templateScale(weekday(x));
        };
        for (const prop in templateScale) {
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

const fetchData = (filter, info, targetData, collector) => {
    if (!collector) {
        collector = (result, partialData, type) => {
            data.projects.forEach(p => {
                result[p] = (result[p] || []).concat(partialData[p]);
            });
        };
    }
    if (!targetData) {
        targetData = {};
    }
    let promises = [];
    types.forEach((type) => {
        if (filter(type)) {
            const file = (type.subchart ?
                `${info.project_name}/${type.name}.${info.sprint_id}` :
                type.name
            );
            const path = `data/${file}.json`;
            promises.push(loader.loadJSON(path, (partialData) => {
                collector(targetData, partialData, type);
            }));
        }
    });
    return new Promise((fulfill, reject) => {
        Promise.all(promises).then(() => {
            fulfill(targetData);
        });
    });
};

const formatData = (projectsData, filter) => {
    let result = [];
    Object.keys(projectsData).sort(naturalSort).forEach(project => {
        const remainingData = filter(projectsData[project], project);
        if (remainingData) {
            result.push({
                name: project,
                data: remainingData
            });
        }
    });
    return result;
};

const updateSprintLink = (link, d, links, boards) => {
    const board = boards[d.project_name] || d.board_id;
    link.attr('href',
        (links[d.project_name] && links[d.project_name].jira_url ?
        links[d.project_name].jira_url : config.jira_url) +
        (board ? `/secure/GHLocateSprintOnBoard.jspa?rapidViewId=${board}&sprintId=${d.sprint_id}` :
        `/secure/GHGoToBoard.jspa?sprintId=${d.sprint_id}`)
    );
};

const initSubchart = (d, multiSelection) => {
    const startDate = new Date(d.date);
    const endDate = new Date(d.end_date);

    if (lastSelectedProjectName !== d.project_name || !multiSelection) {
        // Only select one sprint
        selectedSprints = [];

        d3.selectAll('.sprint.selected').classed('selected', false);

        const link = subtitle.text('')
            .append('h2')
            .append('a')
            .text(locales.message('subchart-title', [d.project_name, d.sprint_name]));

        updateSprintLink(link, d, {}, {});

        loader.loadJSON('data/links.json', links => {
            loader.loadJSON('data/boards.json', boards => {
                updateSprintLink(link, d, links, boards);
            });
        });
        burndown.reset();

        earliestStartDate = startDate;
        lastEndDate = endDate;
    } else {
        // Multiple sprints are selected
        // If this sprint is already selected, don't do anything
        if (selectedSprints.indexOf(d.sprint_id) !== -1) {
            return;
        }

        selectedSprints.push(d.sprint_id);

        if (!earliestStartDate || startDate < earliestStartDate) {
            earliestStartDate = startDate;
        }

        if (!lastEndDate || endDate > lastEndDate) {
            lastEndDate = endDate;
        }

        subtitle.text(locales.message('subchart-title-multiple', [d.project_name, selectedSprints.length+1]));
    }
};

const buildSubchart = (element, multiSelection, d, projectData) => {
    const startSubdata = [
        {
            name: locales.message('subchart-events'),
            data: projectData[0].data,
        }
    ];
    fetchData((type) => type.subchart, d, startSubdata,
        (result, partialData, type) => {
            result.push({
                name: locales.message(`subchart-${type.name}`),
                data: partialData
            });
        }
    ).then(subdata => {
        const currentData = subelement.datum();

        if (currentData && (lastSelectedProjectName === d.project_name) && multiSelection) {
            subdata.forEach((element, index) => {
                element.data.forEach(dataItem => {
                    currentData[index].data.push(dataItem);
                });
            });
            subelement.datum(currentData);
        } else {
            subelement.datum(subdata);
        }

        lastSelectedProjectName = d.project_name;

        const subchart = makeChart();

        subchart.labelsWidth(160)
            .start(new Date(earliestStartDate)).end(new Date(lastEndDate));

        sprintSpinner.stop();
        subchart(subelement);
        subelement.select('defs').remove();
        zoom.update(subelement).reset();
        element.classed('selected', true);

        burndown.create(subelement, locales, {
            name: projectData[0].name,
            start_date: earliestStartDate,
            end_date: lastEndDate
        }, {
            id: projectData[0].data[0].sprint_id,
            end_date: d.end_date
        });
    });
};

const selectSprint = (element, multiSelection) => {
    const d = element.data()[0];
    const filter = sprintFilter(d);

    initSubchart(d, multiSelection);

    subelement.selectAll('svg').remove();

    sprintSpinner.start();
    fetchData(type => !type.subchart, d).then(projectData => {
        projectData = formatData(projectData, (pdata, project) => {
            if (project === d.project_name) {
                return pdata.filter(filter);
            }
            return false;
        });

        if (projectData) {
            buildSubchart(element, multiSelection, d, projectData);
        }
        else {
            sprintSpinner.stop();
            subelement.text(locales.message('subchart-no-data'));
        }
    });
};

const dropsDraw = (drops, newDrops, scales, configuration, lineCount) => {
    if (!drops) {
        return;
    }
    const svg = drops[0].parentNode.parentNode;
    const line = `sprint-lines-${lineCount}`;
    const sprints = d3.select(svg.parentNode)
        .selectAll(`#${line}`)
        .data([lineCount]);

    sprints.enter().insert('g', () => svg)
        .attr('id', line).classed('sprints', true)
        .attr('clip-path', 'url(#drops-container-clipper)')
        .attr('transform', `translate(0, ${lineCount * configuration.lineHeight})`);

    drops.each((d, idx) => {
        if (d.type !== "sprint_start") {
            return;
        }
        const id = `line-drop-${lineCount}-${idx}`;

        const sprint = sprints.selectAll(`#${id}`).data([d]);
        const rect = sprint.enter().append('rect')
            .classed('sprint', true)
            .attr('id', id)
            .attr('height', configuration.lineHeight)
            .on('click', function() {
                const pressedShift = d3.event.shiftKey;

                selectSprint(d3.select(this), pressedShift);

                if (!pressedShift) {
                    smoothscroll(document.querySelector('#subchart-title'));
                }
            })
            .on('mouseover', () => showSprintTooltip(d))
            .on('mouseout', tooltip.hide)
            .on('mousemove', () => {
                var event = d3.event;
                requestAnimationFrame(() => tooltip.setLocation(event));
            });

        const sx = scales.x(new Date(d.date));
        sprint.attr({
            x: +sx + 10,
            width: scales.x(new Date(d.end_date)) - sx
        });


        if (featureLabel !== '' && features[d.project_name][d.sprint_id]) {
            const green = features[d.project_name][d.sprint_id][featureLabel] > featureThreshold;
            rect.classed(green ? 'green' : 'red', true);
            sprint.select('rect')
                .classed('red', !green)
                .classed('green', green);
        }

        sprint.exit().remove();
    });
};

const buildMainChart = () => {
    chart = makeChart();

    const maxDate = new Date(data.max_date);
    const year = 3600000 * 24 * 365;
    let startDate = new Date(Number(new Date()) - year);
    if (startDate > maxDate) {
        startDate = maxDate.getTime() - year;
    }
    chart.start(new Date(startDate))
        .end(maxDate)
        .dropsDraw(dropsDraw);
};

const fillChart = () => {
    return fetchData((type) => typeFilter[type.name]).then((projectData) => {
        const element = holder.datum(formatData(projectData, d => d));

        chartSpinner.stop();
        let zoomer;

        if (element[0][0].zoom) {
            const oldZoom = element[0][0].zoom;
            chart(element);
            zoomer = zoom.update(element, oldZoom);
        }
        else {
            chart(element);
            zoomer = zoom.update(element);
        }

        d3.selectAll("button[data-zoom-reset]").on("click", null)
            .on("click", zoomer.reset);
        d3.selectAll("button[data-zoom]").on("click", null)
            .on("click", function() {
                zoomer.zoom(+this.getAttribute("data-zoom"));
            });

        Mousetrap.bind(['+', '=', 'plus'], () => zoomer.zoom(1));
        Mousetrap.bind('-', () => zoomer.zoom(-1));
        Mousetrap.bind('0', zoomer.reset);
    });
};

const updateChart = () => {
    const element = d3.select('.sprint.selected');
    const sprintId = element.empty() ? null : element.attr('id');
    fillChart().then(() => {
        if (sprintId !== null && sprintId !== undefined) {
            selectSprint(d3.select(`#${sprintId}`));
        }
    });
};

const updateFeatureLabel = () => {
    const select = d3.select('#buttons [data-feature-label]');
    select.append('option')
        .attr('value', '')
        .text(locales.message('feature-label-empty'));
    for (const item in Object.values(Object.values(features)[0])[0]) {
        select.append('option')
            .attr('value', item)
            .text(locales.retrieve(localization, item));
    }
    select.on('change', function() {
        featureLabel = this.value;
        updateChart();
    });
    d3.select('#buttons [data-feature-threshold]').on('change', function() {
        featureThreshold = Number(this.value);
        updateChart();
    });
};

types.forEach(spec => {
    if (spec.subchart) {
        return;
    }
    const t = spec.name;
    typeFilter[t] = spec.enabled;
    const label = filterElement.append('label');
    label.append('input')
        .attr('type', 'checkbox')
        .property('checked', spec.enabled)
        .on('change', function() {
            typeFilter[t] = this.checked;
            updateChart();
            d3.select(this.parentNode).select('.sample circle')
                .attr('fill', this.checked ? colors(t) : 'transparent');
        });
    label.append('svg').classed('sample', true)
        .attr('width', 12)
        .attr('height', 12)
        .append('circle')
        .classed('drop', true)
        .attr('r', 5)
        .attr('cx', 6)
        .attr('cy', 6)
        .attr('fill', spec.enabled ? colors(t) : 'transparent')
        .attr('stroke', colors(t));
    label.append('span').text(locales.retrieve(spec.locales || {}) || t);
});

d3.select('[data-weekday-scale]').property('checked', weekdayScale).on('change', function() {
    weekdayScale = this.checked;
    buildMainChart();
    updateChart();
});

buildMainChart();

updateFeatureLabel();

chartSpinner.start();
fillChart();
d3.select(window).on("resize", () => {
    requestAnimationFrame(() => updateChart());
});

locales.updateMessages(d3.select('body'), [], null);

if (typeof window.buildNavigation === "function") {
    window.buildNavigation(Navbar, locales, config);
}
