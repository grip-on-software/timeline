/**
 * Large tooltip with HTML-based content.
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

const FONT_SIZE = 16; // in pixels
const TOOLTIP_WIDTH = 30; // in rem

const tooltip = {};

/* Update the position of the tooltip. */
tooltip.setLocation = (event) => {
    const rightOrLeftLimit = FONT_SIZE * TOOLTIP_WIDTH;
    const direction = event.pageX > rightOrLeftLimit ? 'right' : 'left';

    const ARROW_MARGIN = 1.65;
    const ARROW_WIDTH = FONT_SIZE;
    const arrowOffset = ARROW_MARGIN * FONT_SIZE + ARROW_WIDTH / 2;
    const x = direction === 'right' ?
        event.pageX - rightOrLeftLimit + arrowOffset :
        event.pageX - arrowOffset;
    const y = (event.pageY + 16);

    d3.select('.tooltip')
        .classed(direction === 'right' ? 'left' : 'right', false)
        .classed(direction, true)
        .style('left', `${x}px`)
        .style('top', `${y}px`);
};

/* Display a tooltip with a `title` and `message` at the event position. */
tooltip.show = (title, message) => {
    d3.select('main').selectAll('.tooltip').remove();

    const element = d3.select('main')
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0); // hide it by default

    // show the tooltip with a small animation
    element.transition()
        .duration(200)
        .each('start', function start() {
            d3.select(this).style('block');
        })
    .style('opacity', 1);
    element.on('mouseout', tooltip.hide);

    const content = element.append('div')
        .classed('container', true)
        .append('div')
        .classed('content', true);
    content.append('h3')
        .classed('message', true)
        .text(title);
    content.append('p').html(message);

    tooltip.setLocation(d3.event);
};

/* Hide the tooltip. */
tooltip.hide = () => {
    d3.select('.tooltip').transition()
        .duration(200)
        .each('end', function end() {
            this.remove();
        })
        .style('opacity', 0);
};

export default tooltip;
