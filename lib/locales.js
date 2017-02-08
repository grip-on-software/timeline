const vsprintf = require('sprintf-js').vsprintf;
const specs = require('../locales.json');

module.exports = (function() {
    const locales = {};
    var selectedLocale = specs.en;

    locales.select = (lang) => {
        if (lang in specs) {
            selectedLocale = specs[lang];
        }
        return selectedLocale;
    };

    locales.locale = () => d3.locale(selectedLocale);

    locales.message = (msg, args) => {
        var result = selectedLocale.messages && selectedLocale.messages[msg];
        if (result) {
            result = vsprintf(result, args);
        }
        return result;
    };

    locales.type = (type) => {
        return selectedLocale.types[type] || type;
    };

    locales.generateNavigation = (nav) => {
        if (!(nav instanceof d3.selection)) {
            return;
        }
        const list = nav.append('ul');
        Object.keys(specs).forEach((key) => {
            const item = list.append('li');
            item.append('a')
                .attr({href: 'index.html?' + key, hreflang: key})
                .text(specs[key].language);
            if (specs[key] == selectedLocale) {
                item.classed('selected', true);
            }
        });
    };

    locales.updateMessages = () => {
        d3.selectAll("[data-message]").each(function() {
            const msg = this.getAttribute("data-message");
            const children = Array.from(this.children).map((c) => c.outerHTML);
            const replacement = locales.message(msg, children);
            if (replacement) {
                d3.select(this).html(replacement);
            }
        });
    };

    return locales;
})();
