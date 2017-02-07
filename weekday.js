const d3 = require('d3');

module.exports = (function() {
    const FROM_YEAR = 1970;
    const DAY_SECONDS = 24 * 60 * 60;
    var weekdaysSinceYear = {};
    var weekdaysInYears = [];

    function weekdaysUntilYear(year) {
        if (year in weekdaysSinceYear) {
            return weekdaysSinceYear[year];
        }
        const startYear = year;
        var weekdays = 0;
        while (--year >= FROM_YEAR) weekdays += weekdaysInYear(year);
        weekdaysSinceYear[startYear] = weekdays;
        return weekdays;
    }

    function yearFromWeekdays(weekdays) {
        var year = FROM_YEAR, totalYearWeekdays = 0,
            yearWeekdays;

        var cacheYear = d3.bisectRight(weekdaysInYears, weekdays);
        if (cacheYear < weekdaysInYears.length) {
            return [FROM_YEAR + cacheYear, weekdays - (weekdaysInYears[cacheYear-1] | 0)];
        }

        while ((yearWeekdays = weekdaysInYear(year)) <= weekdays) {
            ++year;
            totalYearWeekdays += yearWeekdays;
            weekdaysInYears[year - FROM_YEAR - 1] = totalYearWeekdays;
            weekdays -= yearWeekdays;
        }

        weekdaysInYears[year - FROM_YEAR] = totalYearWeekdays + weekdaysInYear(year);

        return [year, weekdays];
    }

    // Returns the weekday number for the given date relative to January 1, 1970.
    function weekday(date) {
        var weekdays = weekdayOfYear(date),
            year = date.getFullYear();
        weekdays += weekdaysUntilYear(year);
        var seconds = ((date.getHours() * 60) + date.getMinutes()) * 60 + date.getSeconds();
        return weekdays + seconds / DAY_SECONDS;
    }

    // Returns the date for the specified weekday number relative to January 1, 1970.
    weekday.invert = function(weekdays) {
        var result = yearFromWeekdays(weekdays);
        var year = result[0];
        weekdays = result[1];

        // Compute the date from the remaining weekdays.
        var days = weekdays % 5 | 0,
            day0 = ((new Date(year, 0, 1, 23, 59, 59)).getDay() + 6) % 7;
        if (day0 + days > 4) days += 2;
        if (day0 === 6) days -= 1;
        var yearday = (weekdays / 5 | 0) * 7 + days + 1;
        var seconds = (weekdays % 1) * DAY_SECONDS,
            minutes = (seconds / 60) | 0,
            hours = (minutes / 60) | 0;
        minutes = minutes % 60;
        seconds = seconds % 60;
        return new Date(year, 0, yearday, hours, minutes, seconds);
    };

    // Returns the number of weekdays in the specified year.
    function weekdaysInYear(year) {
        return weekdayOfYear(new Date(year, 11, 31, 23, 59, 59)) + 1;
    }

    // Returns the weekday number for the given date relative to the start of the year.
    function weekdayOfYear(date) {
        var days = d3.time.dayOfYear(date),
        weeks = days / 7 | 0,
        day0 = (d3.time.year(date).getDay() + 6) % 7,
        day1 = day0 + days - weeks * 7;
        return Math.max(0, days - weeks * 2
                - (day0 <= 5 && day1 >= 5 || day0 <= 12 && day1 >= 12) // extra saturday
                - (day0 <= 6 && day1 >= 6 || day0 <= 13 && day1 >= 13)); // extra sunday
    }

    return weekday;

})();
