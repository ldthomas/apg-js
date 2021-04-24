/*  *************************************************************************************
 *   copyright: Copyright (c) 2021 Lowell D. Thomas, all rights reserved
 *     license: BSD-2-Clause (https://opensource.org/licenses/BSD-2-Clause)
 *     website: https://sabnf.com/
 *   ***********************************************************************************/
// This module implements the `replace()` function.
"use strict;";
let errorName = "apg-exp: replace(): ";
let parseReplacementString = require("./parse-replacement.js");
/* replace special replacement patterns, `$&`, etc. */
let generateReplacementString = function (p, rstr, items) {
    let exp = p._this;
    if (items.length === 0) {
        /* no special characters in the replacement string */
        /* just return a copy of the replacement string */
        return rstr;
    }
    let replace = rstr.slice(0);
    let first, last;
    items.reverse();
    items.forEach(function (item) {
        first = replace.slice(0, item.index);
        last = replace.slice(item.index + item.length);
        switch (item.type) {
            case "escape":
                replace = first.concat("$", last);
                break;
            case "prefix":
                replace = first.concat(exp.leftContext, last);
                break;
            case "match":
                replace = first.concat(exp.lastMatch, last);
                break;
            case "suffix":
                replace = first.concat(exp.rightContext, last);
                break;
            case "name":
                /* If there are multiple matches to this rule name, only the last is used */
                /* If this is a problem, modify the grammar and use different rule names for the different places. */
                let ruleName = p.ruleNames[item.name.nameString];
                replace = first.concat(exp.rules[ruleName], last);
                break;
            default:
                throw new Error(errorName + "generateREplacementString(): unrecognized item type: " + item.type);
        }
    });
    return replace;
};
/* creates a special object with the apg-exp object's "last match" properites */
let lastObj = function (exp) {
    let obj = {};
    obj.ast = exp.ast;
    obj.input = exp.input;
    obj.leftContext = exp.leftContext;
    obj.lastMatch = exp.lastMatch;
    obj.rightContext = exp.rightContext;
    obj["$_"] = exp.input;
    obj["$`"] = exp.leftContext;
    obj["$&"] = exp.lastMatch;
    obj["$'"] = exp.rightContext;
    obj.rules = [];
    for (name in exp.rules) {
        let el = "${" + name + "}";
        obj[el] = exp[el];
        obj.rules[name] = exp.rules[name];
    }
    return obj;
};
/* call the user's replacement function for a single pattern match */
let singleReplaceFunction = function (p, ostr, func) {
    let result = p._this.exec(ostr);
    if (result === null) {
        return ostr;
    }
    rstr = func(result, lastObj(p._this));
    let ret = p._this.leftContext.concat(rstr, p._this.rightContext);
    return ret;
};
/* call the user's replacement function to replace all pattern matches */
let globalReplaceFunction = function (p, ostr, func) {
    let exp = p._this;
    let retstr = ostr.slice(0);
    while (true) {
        let result = exp.exec(retstr);
        if (result === null) {
            break;
        }
        let newrstr = func(result, lastObj(exp));
        retstr = exp.leftContext.concat(newrstr, exp.rightContext);
        exp.lastIndex = exp.leftContext.length + newrstr.length;
        if (result[0].length === 0) {
            /* an empty string IS a match and is replaced */
            /* but use "bump-along" mode to prevent infinite loop */
            exp.lastIndex += 1;
        }
    }
    return retstr;
};
/* do a single replacement with the caller's replacement string */
let singleReplaceString = function (p, ostr, rstr) {
    let exp = p._this;
    let result = exp.exec(ostr);
    if (result === null) {
        return ostr;
    }
    let ritems = parseReplacementString(p, rstr);
    rstr = generateReplacementString(p, rstr, ritems);
    let ret = exp.leftContext.concat(rstr, exp.rightContext);
    return ret;
};
/* do a global replacement of all matches with the caller's replacement string */
let globalReplaceString = function (p, ostr, rstr) {
    let exp = p._this;
    let retstr = ostr.slice(0);
    let ritems = null;
    while (true) {
        let result = exp.exec(retstr);
        if (result == null) {
            break;
        }
        if (ritems === null) {
            ritems = parseReplacementString(p, rstr);
        }
        let newrstr = generateReplacementString(p, rstr, ritems);
        retstr = exp.leftContext.concat(newrstr, exp.rightContext);
        exp.lastIndex = exp.leftContext.length + newrstr.length;
        if (result[0].length === 0) {
            /* an empty string IS a match and is replaced */
            /* but use "bump-along" mode to prevent infinite loop */
            exp.lastIndex += 1;
        }
    }
    return retstr;
};
/* the replace() function calls this to replace the matched patterns with a string */
exports.replaceString = function (p, str, replacement) {
    if (p._this.global || p._this.sticky) {
        return globalReplaceString(p, str, replacement);
    } else {
        return singleReplaceString(p, str, replacement);
    }
};
/* the replace() function calls this to replace the matched patterns with a function */
exports.replaceFunction = function (p, str, func) {
    if (p._this.global || p._this.sticky) {
        return globalReplaceFunction(p, str, func);
    } else {
        return singleReplaceFunction(p, str, func);
    }
};
