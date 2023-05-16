/**
 * Weekday calendar calculations.
 *
 * Based on https://gist.github.com/mbostock/5827353
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

// Epoch year used in all calculations for weekday numbers.
const FROM_YEAR = 1970;
// Number of seconds in a day, to provide a fraction of the day in weekday numbers.
const DAY_SECONDS = 24 * 60 * 60;
// Caches to speed up the search for weekday numbers or year counts.
let weekdaysSinceYear = {};
let weekdaysInYears = [];

/* Returns the weekday number for the given date relative to January 1, 1970. */
function weekday(date) {
    let weekdays = weekdayOfYear(date);
    const year = date.getFullYear();
    weekdays += weekdaysUntilYear(year);
    const seconds = ((date.getHours() * 60) + date.getMinutes()) * 60 +
        date.getSeconds();
    return weekdays + seconds / DAY_SECONDS;
}

/* Returns the date for the specified weekday number relative to January 1,
 * 1970.
 */
weekday.invert = function(weekdays) {
    const result = yearFromWeekdays(weekdays);
    const year = result[0];
    weekdays = result[1];

    // Compute the date from the remaining weekdays.
    let days = weekdays % 5 | 0;
    const day0 = ((new Date(year, 0, 1, 23, 59, 59)).getDay() + 6) % 7;
    if (day0 + days > 4) days += 2;
    if (day0 === 6) days -= 1;
    const yearday = (weekdays / 5 | 0) * 7 + days + 1;
    let seconds = (weekdays % 1) * DAY_SECONDS,
        minutes = (seconds / 60) | 0;
    const hours = (minutes / 60) | 0;
    minutes = minutes % 60;
    seconds = seconds % 60;
    return new Date(year, 0, yearday, hours, minutes, seconds);
};

/* Count the number of weekdays in all years since the epoch, until the
 * specified year. This excludes the weekdays in that year.
 */
function weekdaysUntilYear(year) {
    if (year in weekdaysSinceYear) {
        return weekdaysSinceYear[year];
    }
    const startYear = year - 1;
    let weekdays = 0;
    while (year >= FROM_YEAR) {
        weekdays += weekdaysInYear(year);
        year--;
    }
    weekdaysSinceYear[startYear] = weekdays;
    return weekdays;
}

/* Determine the year for a date specified by its weekdays. */
function yearFromWeekdays(weekdays) {
    let year = FROM_YEAR,
        totalYearWeekdays = 0;

    const cacheYear = d3.bisectRight(weekdaysInYears, weekdays);
    if (cacheYear < weekdaysInYears.length) {
        return [FROM_YEAR + cacheYear, weekdays - (weekdaysInYears[cacheYear-1] | 0)];
    }

    let yearWeekdays = weekdaysInYear(year);
    while (yearWeekdays <= weekdays) {
        ++year;
        totalYearWeekdays += yearWeekdays;
        weekdaysInYears[year - FROM_YEAR - 1] = totalYearWeekdays;
        weekdays -= yearWeekdays;
        yearWeekdays = weekdaysInYear(year);
    }

    weekdaysInYears[year - FROM_YEAR] = totalYearWeekdays + weekdaysInYear(year);

    return [year, weekdays];
}

/* Returns the number of weekdays in the specified year. */
function weekdaysInYear(year) {
    return weekdayOfYear(new Date(year, 11, 31, 23, 59, 59)) + 1;
}

/* Returns the weekday number for the given date relative to the start of the
 * year.
 */
function weekdayOfYear(date) {
    const days = d3.time.dayOfYear(date),
        weeks = days / 7 | 0,
        day0 = (d3.time.year(date).getDay() + 6) % 7,
        day1 = day0 + days - weeks * 7;
    return Math.max(0, days - weeks * 2 -
        // Account for extra saturday and sunday
        Number(day0 <= 5 && day1 >= 5 || day0 <= 12 && day1 >= 12) -
        Number(day0 <= 6 && day1 >= 6 || day0 <= 13 && day1 >= 13));
}

export default weekday;
