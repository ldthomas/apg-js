/*  *************************************************************************************
 *   copyright: Copyright (c) 2021 Lowell D. Thomas, all rights reserved
 *     license: BSD-2-Clause (https://opensource.org/licenses/BSD-2-Clause)
 *     website: https://sabnf.com/
 *   ***********************************************************************************/
// This module is the constructor for the statistics gathering object.
// The statistics are nothing more than keeping a count of the
// number of times each node in the parse tree is traversed.
//
// Counts are collected for each of the individual types of operators.
// Additionally, counts are collected for each of the individually named
// `RNM` and `UDT` operators.
module.exports = function () {
    "use strict";
    let thisFileName = "stats.js: ";
    let id = require("./identifiers.js");
    let utils = require("./utilities");
    let style = require("./style.js");
    let rules = [];
    let udts = [];
    let stats = [];
    let totals;
    let ruleStats = [];
    let udtStats = [];
    this.statsObject = "statsObject";
    let nameId = "stats";
    /* `Array.sort()` callback function for sorting `RNM` and `UDT` operators alphabetically by name. */
    let sortAlpha = function (lhs, rhs) {
        if (lhs.lower < rhs.lower) {
            return -1;
        }
        if (lhs.lower > rhs.lower) {
            return 1;
        }
        return 0;
    };
    /* `Array.sort()` callback function for sorting `RNM` and `UDT` operators by hit count. */
    let sortHits = function (lhs, rhs) {
        if (lhs.total < rhs.total) {
            return 1;
        }
        if (lhs.total > rhs.total) {
            return -1;
        }
        return sortAlpha(lhs, rhs);
    };
    /* `Array.sort()` callback function for sorting `RNM` and `UDT` operators by index */
    /* (in the order in which they appear in the SABNF grammar). */
    let sortIndex = function (lhs, rhs) {
        if (lhs.index < rhs.index) {
            return -1;
        }
        if (lhs.index > rhs.index) {
            return 1;
        }
        return 0;
    };
    let emptyStat = function () {
        this.empty = 0;
        this.match = 0;
        this.nomatch = 0;
        this.total = 0;
    };
    /* Zero out all stats */
    let clear = function () {
        stats.length = 0;
        totals = new emptyStat();
        stats[id.ALT] = new emptyStat();
        stats[id.CAT] = new emptyStat();
        stats[id.REP] = new emptyStat();
        stats[id.RNM] = new emptyStat();
        stats[id.TRG] = new emptyStat();
        stats[id.TBS] = new emptyStat();
        stats[id.TLS] = new emptyStat();
        stats[id.UDT] = new emptyStat();
        stats[id.AND] = new emptyStat();
        stats[id.NOT] = new emptyStat();
        stats[id.BKR] = new emptyStat();
        stats[id.BKA] = new emptyStat();
        stats[id.BKN] = new emptyStat();
        stats[id.ABG] = new emptyStat();
        stats[id.AEN] = new emptyStat();
        ruleStats.length = 0;
        for (let i = 0; i < rules.length; i += 1) {
            ruleStats.push({
                empty: 0,
                match: 0,
                nomatch: 0,
                total: 0,
                name: rules[i].name,
                lower: rules[i].lower,
                index: rules[i].index,
            });
        }
        if (udts.length > 0) {
            udtStats.length = 0;
            for (let i = 0; i < udts.length; i += 1) {
                udtStats.push({
                    empty: 0,
                    match: 0,
                    nomatch: 0,
                    total: 0,
                    name: udts[i].name,
                    lower: udts[i].lower,
                    index: udts[i].index,
                });
            }
        }
    };
    /* increment the designated operator hit count by one*/
    let incStat = function (stat, state, phraseLength) {
        stat.total += 1;
        switch (state) {
            case id.EMPTY:
                stat.empty += 1;
                break;
            case id.MATCH:
                stat.match += 1;
                break;
            case id.NOMATCH:
                stat.nomatch += 1;
                break;
            default:
                throw thisFileName + "collect(): incStat(): unrecognized state: " + state;
        }
    };
    /* helper for toHtml() */
    let displayRow = function (name, stat) {
        let html = "";
        html += "<tr>";
        html += '<td class="' + style.CLASS_ACTIVE + '">' + name + "</td>";
        html += '<td class="' + style.CLASS_EMPTY + '">' + stat.empty + "</td>";
        html += '<td class="' + style.CLASS_MATCH + '">' + stat.match + "</td>";
        html += '<td class="' + style.CLASS_NOMATCH + '">' + stat.nomatch + "</td>";
        html += '<td class="' + style.CLASS_ACTIVE + '">' + stat.total + "</td>";
        html += "</tr>\n";
        return html;
    };
    let displayOpsOnly = function () {
        let html = "";
        html += displayRow("ALT", stats[id.ALT]);
        html += displayRow("CAT", stats[id.CAT]);
        html += displayRow("REP", stats[id.REP]);
        html += displayRow("RNM", stats[id.RNM]);
        html += displayRow("TRG", stats[id.TRG]);
        html += displayRow("TBS", stats[id.TBS]);
        html += displayRow("TLS", stats[id.TLS]);
        html += displayRow("UDT", stats[id.UDT]);
        html += displayRow("AND", stats[id.AND]);
        html += displayRow("NOT", stats[id.NOT]);
        html += displayRow("BKR", stats[id.BKR]);
        html += displayRow("BKA", stats[id.BKA]);
        html += displayRow("BKN", stats[id.BKN]);
        html += displayRow("ABG", stats[id.ABG]);
        html += displayRow("AEN", stats[id.AEN]);
        html += displayRow("totals", totals);
        return html;
    };
    /* helper for toHtml() */
    let displayRules = function () {
        let html = "";
        html += "<tr><th></th><th></th><th></th><th></th><th></th></tr>\n";
        html += "<tr><th>rules</th><th></th><th></th><th></th><th></th></tr>\n";
        for (let i = 0; i < rules.length; i += 1) {
            if (ruleStats[i].total > 0) {
                html += "<tr>";
                html += '<td class="' + style.CLASS_ACTIVE + '">' + ruleStats[i].name + "</td>";
                html += '<td class="' + style.CLASS_EMPTY + '">' + ruleStats[i].empty + "</td>";
                html += '<td class="' + style.CLASS_MATCH + '">' + ruleStats[i].match + "</td>";
                html += '<td class="' + style.CLASS_NOMATCH + '">' + ruleStats[i].nomatch + "</td>";
                html += '<td class="' + style.CLASS_ACTIVE + '">' + ruleStats[i].total + "</td>";
                html += "</tr>\n";
            }
        }
        if (udts.length > 0) {
            html += "<tr><th></th><th></th><th></th><th></th><th></th></tr>\n";
            html += "<tr><th>udts</th><th></th><th></th><th></th><th></th></tr>\n";
            for (let i = 0; i < udts.length; i += 1) {
                if (udtStats[i].total > 0) {
                    html += "<tr>";
                    html += '<td class="' + style.CLASS_ACTIVE + '">' + udtStats[i].name + "</td>";
                    html += '<td class="' + style.CLASS_EMPTY + '">' + udtStats[i].empty + "</td>";
                    html += '<td class="' + style.CLASS_MATCH + '">' + udtStats[i].match + "</td>";
                    html += '<td class="' + style.CLASS_NOMATCH + '">' + udtStats[i].nomatch + "</td>";
                    html += '<td class="' + style.CLASS_ACTIVE + '">' + udtStats[i].total + "</td>";
                    html += "</tr>\n";
                }
            }
        }
        return html;
    };
    /* called only by the parser to validate a stats object*/
    this.validate = function (name) {
        let ret = false;
        if (typeof name === "string" && nameId === name) {
            ret = true;
        }
        return ret;
    };
    /* no verification of input - only called by parser() */
    this.init = function (inputRules, inputUdts) {
        rules = inputRules;
        udts = inputUdts;
        clear();
    };
    /* This function is the main interaction with the parser. */
    /* The parser calls it after each node has been traversed. */
    this.collect = function (op, result) {
        incStat(totals, result.state, result.phraseLength);
        incStat(stats[op.type], result.state, result.phraseLength);
        if (op.type === id.RNM) {
            incStat(ruleStats[op.index], result.state, result.phraseLength);
        }
        if (op.type === id.UDT) {
            incStat(udtStats[op.index], result.state, result.phraseLength);
        }
    };
    // Display the statistics as an HTML table.
    // - *type*
    //   - "ops" - (default) display only the total hit counts for all operator types.
    //   - "index" - additionally, display the hit counts for the individual `RNM` and `UDT` operators ordered by index.
    //   - "hits" - additionally, display the hit counts for the individual `RNM` and `UDT` operators by hit count.
    //   - "alpha" - additionally, display the hit counts for the individual `RNM` and `UDT` operators by name alphabetically.
    // - *caption* - optional caption for the table
    this.toHtml = function (type, caption) {
        let html = "";
        html += '<table class="' + style.CLASS_STATS + '">\n';
        if (typeof caption === "string") {
            html += "<caption>" + caption + "</caption>\n";
        }
        html += '<tr><th class="' + style.CLASS_ACTIVE + '">ops</th>\n';
        html += '<th class="' + style.CLASS_EMPTY + '">EMPTY</th>\n';
        html += '<th class="' + style.CLASS_MATCH + '">MATCH</th>\n';
        html += '<th class="' + style.CLASS_NOMATCH + '">NOMATCH</th>\n';
        html += '<th class="' + style.CLASS_ACTIVE + '">totals</th></tr>\n';
        while (true) {
            if (type === undefined) {
                html += displayOpsOnly();
                break;
            }
            if (type === null) {
                html += displayOpsOnly();
                break;
            }
            if (type === "ops") {
                html += displayOpsOnly();
                break;
            }
            if (type === "index") {
                ruleStats.sort(sortIndex);
                if (udtStats.length > 0) {
                    udtStats.sort(sortIndex);
                }
                html += displayOpsOnly();
                html += displayRules();
                break;
            }
            if (type === "hits") {
                ruleStats.sort(sortHits);
                if (udtStats.length > 0) {
                    udtStats.sort(sortIndex);
                }
                html += displayOpsOnly();
                html += displayRules();
                break;
            }
            if (type === "alpha") {
                ruleStats.sort(sortAlpha);
                if (udtStats.length > 0) {
                    udtStats.sort(sortAlpha);
                }
                html += displayOpsOnly();
                html += displayRules();
                break;
            }
            break;
        }
        html += "</table>\n";
        return html;
    };
    // Display the stats table in a complete HTML5 page.
    this.toHtmlPage = function (type, caption, title) {
        return utils.htmlToPage(this.toHtml(type, caption), title);
    };
};
