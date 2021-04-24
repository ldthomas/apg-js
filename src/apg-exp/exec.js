/*  *************************************************************************************
 *   copyright: Copyright (c) 2021 Lowell D. Thomas, all rights reserved
 *     license: BSD-2-Clause (https://opensource.org/licenses/BSD-2-Clause)
 *     website: https://sabnf.com/
 *   ***********************************************************************************/
// This module implements the `exec()` function.
"use strict;";
let funcs = require("./result.js");
/* turns on or off the read-only attribute of the `last result` properties of the object */
let setProperties = function (p, readonly) {
    readonly = readonly === true ? true : false;
    let exp = p._this;
    let prop = {
        writable: readonly,
        enumerable: false,
        configurable: true,
    };
    Object.defineProperty(exp, "input", prop);
    Object.defineProperty(exp, "leftContext", prop);
    Object.defineProperty(exp, "lastMatch", prop);
    Object.defineProperty(exp, "rightContext", prop);
    Object.defineProperty(exp, "$_", prop);
    Object.defineProperty(exp, "$`", prop);
    Object.defineProperty(exp, "$&", prop);
    Object.defineProperty(exp, "$'", prop);
    prop.enumerable = true;
    Object.defineProperty(exp, "rules", prop);
    if (!exp.rules) {
        exp.rules = [];
    }
    for (let name in exp.rules) {
        let des = "${" + name + "}";
        Object.defineProperty(exp, des, prop);
        Object.defineProperty(exp.rules, name, prop);
    }
};
/* generate the results object for JavaScript strings */
let sResult = function (p) {
    let chars = p.chars;
    let result = p.result;
    let ret = {
        index: result.index,
        length: result.length,
        input: p.charsToString(chars, 0),
        treeDepth: result.treeDepth,
        nodeHits: result.nodeHits,
        rules: [],
        toText: function () {
            return funcs.s.resultToText(this);
        },
        toHtml: function () {
            return funcs.s.resultToHtml(this);
        },
        toHtmlPage: function () {
            return funcs.s.resultToHtmlPage(this);
        },
    };
    ret[0] = p.charsToString(p.chars, result.index, result.length);
    /* each rule is either 'undefined' or an array of phrases */
    for (let name in result.rules) {
        let rule = result.rules[name];
        if (rule) {
            ret.rules[name] = [];
            for (let i = 0; i < rule.length; i += 1) {
                ret.rules[name][i] = {
                    index: rule[i].index,
                    phrase: p.charsToString(chars, rule[i].index, rule[i].length),
                };
            }
        } else {
            ret.rules[name] = undefined;
        }
    }
    return ret;
};
/* generate the results object for integer arrays of character codes */
let uResult = function (p) {
    let chars = p.chars;
    let result = p.result;
    let beg, end;
    let ret = {
        index: result.index,
        length: result.length,
        input: chars.slice(0),
        treeDepth: result.treeDepth,
        nodeHits: result.nodeHits,
        rules: [],
        toText: function (mode) {
            return funcs.u.resultToText(this, mode);
        },
        toHtml: function (mode) {
            return funcs.u.resultToHtml(this, mode);
        },
        toHtmlPage: function (mode) {
            return funcs.u.resultToHtmlPage(this, mode);
        },
    };
    beg = result.index;
    end = beg + result.length;
    ret[0] = chars.slice(beg, end);
    /* each rule is either 'undefined' or an array of phrases */
    for (let name in result.rules) {
        let rule = result.rules[name];
        if (rule) {
            ret.rules[name] = [];
            for (let i = 0; i < rule.length; i += 1) {
                beg = rule[i].index;
                end = beg + rule[i].length;
                ret.rules[name][i] = {
                    index: beg,
                    phrase: chars.slice(beg, end),
                };
            }
        } else {
            ret.rules[name] = undefined;
        }
    }
    return ret;
};
/* generate the apg-exp properties or "last match" object for JavaScript strings */
let sLastMatch = function (p, result) {
    let exp = p._this;
    let temp;
    exp.lastMatch = result[0];
    temp = p.chars.slice(0, result.index);
    exp.leftContext = p.charsToString(temp);
    temp = p.chars.slice(result.index + result.length);
    exp.rightContext = p.charsToString(temp);
    exp["input"] = result.input.slice(0);
    exp["$_"] = exp["input"];
    exp["$&"] = exp.lastMatch;
    exp["$`"] = exp.leftContext;
    exp["$'"] = exp.rightContext;
    exp.rules = {};
    for (let name in result.rules) {
        let rule = result.rules[name];
        if (rule) {
            exp.rules[name] = rule[rule.length - 1].phrase;
        } else {
            exp.rules[name] = undefined;
        }
        exp["${" + name + "}"] = exp.rules[name];
    }
};
/* generate the apg-exp properties or "last match" object for integer arrays of character codes */
let uLastMatch = function (p, result) {
    let exp = p._this;
    let chars = p.chars;
    let beg, end;
    beg = 0;
    end = beg + result.index;
    exp.leftContext = chars.slice(beg, end);
    exp.lastMatch = result[0].slice(0);
    beg = result.index + result.length;
    exp.rightContext = chars.slice(beg);
    exp["input"] = result.input.slice(0);
    exp["$_"] = exp["input"];
    exp["$&"] = exp.lastMatch;
    exp["$`"] = exp.leftContext;
    exp["$'"] = exp.rightContext;
    exp.rules = {};
    for (let name in result.rules) {
        let rule = result.rules[name];
        if (rule) {
            exp.rules[name] = rule[rule.length - 1].phrase;
        } else {
            exp.rules[name] = undefined;
        }
        exp["${" + name + "}"] = exp.rules[name];
    }
};
/* set the returned result properties, and the `last result` properties of the object */
let setResult = function (p, parserResult) {
    let result;
    p.result = {
        index: parserResult.index,
        length: parserResult.length,
        treeDepth: parserResult.treeDepth,
        nodeHits: parserResult.nodeHits,
        rules: [],
    };
    /* set result in APG phrases {phraseIndex, phraseLength} */
    /* p.ruleNames are all names in the grammar */
    /* p._this.ast.callbacks[name] only defined for 'included' rule names */
    let obj = p.parser.ast.phrases();
    for (let name in p._this.ast.callbacks) {
        let cap = p.ruleNames[name];
        if (p._this.ast.callbacks[name]) {
            let cap = p.ruleNames[name];
            if (Array.isArray(obj[cap])) {
                p.result.rules[cap] = obj[cap];
            } else {
                p.result.rules[cap] = undefined;
            }
        }
    }
    /* p.result now has everything we need to know about the result of exec() */
    /* generate the Unicode or JavaScript string version of the result & last match objects */
    setProperties(p, true);
    if (p._this.unicode) {
        result = uResult(p);
        uLastMatch(p, result);
    } else {
        result = sResult(p);
        sLastMatch(p, result);
    }
    setProperties(p, false);
    return result;
};

/* create an unsuccessful parser result object */
let resultInit = function () {
    return {
        success: false,
    };
};

/* create a successful parser result object */
let resultSuccess = function (index, parserResult) {
    return {
        success: true,
        index: index,
        length: parserResult.matched,
        treeDepth: parserResult.maxTreeDepth,
        nodeHits: parserResult.nodeHits,
    };
};
/* search forward from `lastIndex` until a match is found or the end of string is reached */
let forward = function (p) {
    let result = resultInit();
    for (let i = p._this.lastIndex; i < p.chars.length; i += 1) {
        let re = p.parser.parseSubstring(p.grammarObject, 0, p.chars, i, p.chars.length - i);
        if (p.match(re.state)) {
            result = resultSuccess(i, re);
            break;
        }
    }
    return result;
};
/* reset lastIndex after a search */
let setLastIndex = function (lastIndex, flag, parserResult) {
    if (flag) {
        if (parserResult.success) {
            let ret = parserResult.index;
            /* bump-along mode - increment is never zero */
            ret += parserResult.length > 0 ? parserResult.length : 1;
            return ret;
        }
        return 0;
    }
    return lastIndex;
};
/* attempt a match at lastIndex only - does look further if a match is not found */
let anchor = function (p) {
    let result = resultInit();
    if (p._this.lastIndex < p.chars.length) {
        let re = p.parser.parseSubstring(
            p.grammarObject,
            0,
            p.chars,
            p._this.lastIndex,
            p.chars.length - p._this.lastIndex
        );
        if (p.match(re.state)) {
            result = resultSuccess(p._this.lastIndex, re);
        }
    }
    return result;
};
/* called by exec() for a forward search */
exports.execForward = function (p) {
    let parserResult = forward(p);
    let result = null;
    if (parserResult.success) {
        result = setResult(p, parserResult);
    }
    p._this.lastIndex = setLastIndex(p._this.lastIndex, p._this.global, parserResult);
    return result;
};
/* called by exec() for an anchored search */
exports.execAnchor = function (p) {
    let parserResult = anchor(p);
    let result = null;
    if (parserResult.success) {
        result = setResult(p, parserResult);
    }
    p._this.lastIndex = setLastIndex(p._this.lastIndex, p._this.sticky, parserResult);
    return result;
};
/* search forward from lastIndex looking for a match */
exports.testForward = function (p) {
    let parserResult = forward(p);
    p._this.lastIndex = setLastIndex(p._this.lastIndex, p._this.global, parserResult);
    return parserResult.success;
};
/* test for a match at lastIndex only, do not look further if no match is found */
exports.testAnchor = function (p) {
    let parserResult = anchor(p);
    p._this.lastIndex = setLastIndex(p._this.lastIndex, p._this.sticky, parserResult);
    return parserResult.success;
};
