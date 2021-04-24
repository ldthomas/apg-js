/*  *************************************************************************************
 *   copyright: Copyright (c) 2021 Lowell D. Thomas, all rights reserved
 *     license: BSD-2-Clause (https://opensource.org/licenses/BSD-2-Clause)
 *     website: https://sabnf.com/
 *   ***********************************************************************************/
// This module reads the input grammar file and does a preliminary analysis
//before attempting to parse it into a grammar object.
// See:<br>
//`./dist/scanner-grammar.bnf`<br>
//for the grammar file this parser is based on.
//
// It has two primary functions.
// - verify the character codes - no non-printing ASCII characters
// - catalog the lines - create an array with a line object for each line.
// The object carries information about the line number and character length which is used
// by the parser generator primarily for error reporting.
module.exports = function (chars, errors, strict, trace) {
    "use strict";
    let thisFileName = "scanner.js: ";
    let apglib = require("apg-lib");
    let grammar = new (require("./scanner-grammar.js"))();
    let callbacks = require("./scanner-callbacks").callbacks;

    /* Scan the grammar for character code errors and catalog the lines. */
    let lines = [];
    let parser = new apglib.parser();
    parser.ast = new apglib.ast();
    parser.ast.callbacks = callbacks;
    if (trace) {
        if (trace.traceObject !== "traceObject") {
            throw new TypError(thisFileName + "trace argument is not a trace object");
        }
        parser.trace = trace;
    }

    /* parse the input SABNF grammar */
    let test = parser.parse(grammar, "file", chars);
    if (test.success !== true) {
        errors.push({
            line: 0,
            char: 0,
            msg: "syntax analysis error analyzing input SABNF grammar",
        });
        return;
    }
    let data = {
        lines: lines,
        lineNo: 0,
        errors: errors,
        strict: strict ? true : false,
    };

    /* translate (analyze) the input SABNF grammar */
    parser.ast.translate(data);
    return lines;
};
