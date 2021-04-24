/*  *************************************************************************************
 *   copyright: Copyright (c) 2021 Lowell D. Thomas, all rights reserved
 *     license: BSD-2-Clause (https://opensource.org/licenses/BSD-2-Clause)
 *     website: https://sabnf.com/
 *   ***********************************************************************************/
// This module will parse the replacement string and locate any special replacement characters.
"use strict;";
let errorName = "apgex: replace(): ";
let synError = function (result, chars, phraseIndex, data) {
    if (data.isMatch(result.state)) {
        let value = data.charsToString(chars, phraseIndex, result.phraseLength);
        data.items.push({ type: "error", index: phraseIndex, length: result.phraseLength, error: value });
        data.errors += 1;
        data.count += 1;
    }
};
let synEscape = function (result, chars, phraseIndex, data) {
    if (data.isMatch(result.state)) {
        data.items.push({ type: "escape", index: phraseIndex, length: result.phraseLength });
        data.escapes += 1;
        data.count += 1;
    }
};
let synMatch = function (result, chars, phraseIndex, data) {
    if (data.isMatch(result.state)) {
        data.items.push({ type: "match", index: phraseIndex, length: result.phraseLength });
        data.matches += 1;
        data.count += 1;
    }
};
let synPrefix = function (result, chars, phraseIndex, data) {
    if (data.isMatch(result.state)) {
        data.items.push({ type: "prefix", index: phraseIndex, length: result.phraseLength });
        data.prefixes += 1;
        data.count += 1;
    }
};
let synSuffix = function (result, chars, phraseIndex, data) {
    if (data.isMatch(result.state)) {
        data.items.push({ type: "suffix", index: phraseIndex, length: result.phraseLength });
        data.suffixes += 1;
        data.count += 1;
    }
};
let synXName = function (result, chars, phraseIndex, data) {
    if (data.isMatch(result.state)) {
        data.items.push({ type: "name", index: phraseIndex, length: result.phraseLength, name: data.name });
        data.names += 1;
        data.count += 1;
    }
};
let synName = function (result, chars, phraseIndex, data) {
    if (data.isMatch(result.state)) {
        let nameStr = data.charsToString(chars, phraseIndex, result.phraseLength);
        let nameChars = chars.slice(phraseIndex, phraseIndex + result.phraseLength);
        data.name = { nameString: nameStr, nameChars: nameChars };
    }
};
module.exports = function (p, str) {
    let grammar = new (require("./replace-grammar.js"))();
    let apglib = require("../apg-lib/node-exports.js");
    let parser = new apglib.parser();
    let data = {
        name: "",
        count: 0,
        errors: 0,
        escapes: 0,
        prefixes: 0,
        matches: 0,
        suffixes: 0,
        names: 0,
        isMatch: p.match,
        charsToString: apglib.utils.charsToString,
        items: [],
    };
    parser.callbacks["error"] = synError;
    parser.callbacks["escape"] = synEscape;
    parser.callbacks["prefix"] = synPrefix;
    parser.callbacks["match"] = synMatch;
    parser.callbacks["suffix"] = synSuffix;
    parser.callbacks["xname"] = synXName;
    parser.callbacks["name"] = synName;
    let chars = apglib.utils.stringToChars(str);
    let result = parser.parse(grammar, 0, chars, data);
    if (!result.success) {
        throw new Error(errorName + "unexpected error parsing replacement string");
    }
    let ret = data.items;
    if (data.errors > 0) {
        let msg = "[";
        let i = 0;
        let e = 0;
        for (; i < data.items.length; i += 1) {
            let item = data.items[i];
            if (item.type === "error") {
                if (e > 0) {
                    msg += ", " + item.error;
                } else {
                    msg += item.error;
                }
                e += 1;
            }
        }
        msg += "]";
        throw new Error(errorName + "special character sequences ($...) errors: " + msg);
    }
    if (data.names > 0) {
        let badNames = [];
        let i = 0;
        for (; i < data.items.length; i += 1) {
            let item = data.items[i];
            if (item.type === "name") {
                let name = item.name.nameString;
                let lower = name.toLowerCase();
                if (!p.parser.ast.callbacks[lower]) {
                    /* name not in callback list, either a bad rule name or an excluded rule name */
                    badNames.push(name);
                }
                /* convert all item rule names to lower case */
                item.name.nameString = lower;
            }
        }
        if (badNames.length > 0) {
            let msg = "[";
            for (let i = 0; i < badNames.length; i += 1) {
                if (i > 0) {
                    msg += ", " + badNames[i];
                } else {
                    msg += badNames[i];
                }
            }
            msg += "]";
            throw new Error(errorName + "special character sequences ${name}: names not found: " + msg);
        }
    }
    return ret;
};
