/*  *************************************************************************************
 *   copyright: Copyright (c) 2021 Lowell D. Thomas, all rights reserved
 *     license: BSD-2-Clause (https://opensource.org/licenses/BSD-2-Clause)
 *     website: https://sabnf.com/
 *   ***********************************************************************************/
// This module is Application Programming Interface (API) for **APG** - the ABNF Parser Generator.
//
// *Note on teminology.*
// APG is a parser generator.
// However, it really only generates a "grammar object" (see below) from the defining SABNF grammar.
// The generated parser is incomplete at this stage.
// Remaining, it is the job of the user to develop the generated parser from the grammar object and the **APG** Library (**apg-lib**).
//
// The following terminology my help clear up any confusion between the idea of a "generated parser" versus a "generated grammar object".

// - The generating parser: **APG** is an **APG** parser (yes, there is a circular dependence between **apg-api** and **apg-lib**). We'll call it the generating parser.
// - The target parser: **APG**'s goal is to generate a parser. We'll call it the target parser.
// - The target grammar: this is the (ASCII) SABNF grammar defining the target parser.
// - The target grammar object: **APG** parses the SABNF grammar and generates the JavaScript source for a target grammar object constructor function
// and/or an actual grammar object.
// - The final target parser: The user then develops the final target parser using the generated target grammar
// object and the **APG** parsing library, **apg-lib**.
// Throws execeptions on fatal errors.
//
// src: the input SABNF grammar<br>
// may be one of:
// - Buffer of bytes
// - JavaScript string
// - Array of integer character codes
module.exports = function (src) {
    "use strict";
    /* PRIVATE PROPERTIES */
    const thisFileName = "api.js: ";
    const _this = this;
    const apglib = require("../apg-lib/node-exports.js");
    const converter = require("../apg-conv-api/node-exports.js").converter;
    const scanner = require("./scanner.js");
    const parser = new (require("./parser.js"))();
    /* Destructuring assignment - see MDN Web Docs */
    const { attributes, showAttributes, showAttributeErrors, showRuleDependencies } = require("./attributes.js");
    const showRules = require("./show-rules.js");
    let isScanned = false;
    let isParsed = false;
    let isTranslated = false;
    let haveAttributes = false;
    let attributeErrors = 0;
    let lineMap;

    /* PUBLIC PROPERTIES */
    // The input SABNF grammar as a JavaScript string.
    this.sabnf;
    // The input SABNF grammar as an array of character codes.
    this.chars;
    // An array of line objects, defining each line of the input SABNF grammar
    // - lineNo : the zero-based line number
    // - beginChar : offset (into `this.chars`) of the first character in the line
    // - length : the number of characters in the line
    // - textLength : the number of characters of text in the line, excluding the line ending characters
    // - endType : "CRLF", "LF", "CR" or "none" if the last line has no line ending characters
    // - invalidChars : `true` if the line contains invalid characters, `false` otherwise
    this.lines;
    // An array of rule names and data.
    // - name : the rule name
    // - lower : the rule name in lower case
    // - index : the index of the rule (ordered by appearance in SABNF grammar)
    // - isBkr : `true` if this rule has been back referenced, `false` otherwise
    // - opcodes : array of opcodes for this rule
    // - attrs : the rule attributes
    // - ctrl : system data
    this.rules;
    // An array of UDT names and data.
    this.udts;
    // An array of errors, if any.
    // - line : the line number containing the error
    // - char : the character offset of the error
    //- msg : the error message
    this.errors = [];

    /* CONSTRUCTOR */
    if (Buffer.isBuffer(src)) {
        this.chars = converter.decode("BINARY", src);
    } else if (Array.isArray(src)) {
        this.chars = src.slice();
    } else if (typeof src === "string") {
        this.chars = converter.decode("STRING", src);
    } else {
        throw new TypeError(thisFileName + "input source is not a string, byte Buffer or character array");
    }
    this.sabnf = converter.encode("STRING", this.chars);

    /* PUBLIC MEMBERS (FUNCTIONS) */
    // Scan the input SABNF grammar for invalid characters and catalog the lines via `this.lines`.
    // - strict : (optional) if `true`, all lines, including the last must end with CRLF (\r\n),
    // if `false` (in any JavaScript sense) then line endings may be any mix of CRLF, LF, CR, or end-of-file.
    // - trace (*) : (optional) a parser trace object, which will trace the parser that does the scan
    this.scan = function (strict, trace) {
        this.lines = scanner(this.chars, this.errors, strict, trace);
        isScanned = true;
    };
    // Parse the input SABNF grammar for correct syntax.
    // - strict : (optional) if `true`, the input grammar must be strict ABNF, conforming to [RFC 5234](https://tools.ietf.org/html/rfc5234)
    // and [RFC 7405](https://tools.ietf.org/html/rfc7405). No superset features allowed.
    // - trace (\*) : (optional) a parser trace object, which will trace the syntax parser
    //
    // <i>(*)NOTE: the trace option was used primarily during development.
    // Error detection and reporting is now fairly robust and tracing should be unnecessary. Use at your own peril.</i>
    this.parse = function (strict, trace) {
        if (!isScanned) {
            throw new Error(thisFileName + "grammar not scanned");
        }
        parser.syntax(this.chars, this.lines, this.errors, strict, trace);
        isParsed = true;
    };
    // Translate the SABNF grammar syntax into the opcodes that will guide the parser for this grammar.
    this.translate = function () {
        if (!isParsed) {
            throw new Error(thisFileName + "grammar not scanned and parsed");
        }
        let ret = parser.semantic(this.chars, this.lines, this.errors);
        if (this.errors.length === 0) {
            this.rules = ret.rules;
            this.udts = ret.udts;
            lineMap = ret.lineMap;
            isTranslated = true;
        }
    };
    // Compute the attributes of each rule.
    this.attributes = function () {
        if (!isTranslated) {
            throw new Error(thisFileName + "grammar not scanned, parsed and translated");
        }
        attributeErrors = attributes(this.rules, this.udts, lineMap, this.errors);
        haveAttributes = true;
        return attributeErrors;
    };
    // This function will perform the full suite of steps required to generate a parser grammar object
    // from the input SABNF grammar.
    this.generate = function (strict) {
        this.lines = scanner(this.chars, this.errors, strict);
        if (this.errors.length) {
            return;
        }
        parser.syntax(this.chars, this.lines, this.errors, strict);
        if (this.errors.length) {
            return;
        }
        let ret = parser.semantic(this.chars, this.lines, this.errors);
        if (this.errors.length) {
            return;
        } else {
            this.rules = ret.rules;
            this.udts = ret.udts;
            lineMap = ret.lineMap;
        }
        attributeErrors = attributes(this.rules, this.udts, lineMap, this.errors);
        haveAttributes = true;
    };
    // Display the rules.
    // Must scan, parse and translate before calling this function, otherwise there are no rules to display.
    // - order
    //      - "index" or "i", index order (default)
    //      - "alpha" or "a", alphabetical order
    //      - none of above, index order (default)
    this.displayRules = function (order = "index") {
        if (!isTranslated) {
            throw new Error(thisFileName + "grammar not scanned, parsed and translated");
        }
        return showRules(this.rules, this.udts, order);
    };
    // Display the rule dependencies.
    // Must scan, parse, translate and compute attributes before calling this function.
    // Otherwise the rule dependencies are not known.
    // - order
    //      - "index" or "i", index order (default)
    //      - "alpha" or "a", alphabetical order
    //      - "type" or "t", ordered by type (alphabetical within each type/group)
    //      - none of above, index order (default)
    this.displayRuleDependencies = function (order = "index") {
        if (!haveAttributes) {
            throw new Error(thisFileName + "no attributes - must be preceeded by call to attributes()");
        }
        return showRuleDependencies(order);
    };
    // Display the attributes.
    // Must scan, parse, translate and compute attributes before calling this function.
    // - order
    //      - "index" or "i", index order (default)
    //      - "alpha" or "a", alphabetical order
    //      - "type" or "t", ordered by type (alphabetical within each type/group)
    //      - none of above, type order (default)
    this.displayAttributes = function (order = "index") {
        if (!haveAttributes) {
            throw new Error(thisFileName + "no attributes - must be preceeded by call to attributes()");
        }
        if (attributeErrors) {
            showAttributeErrors(order);
        }
        return showAttributes(order);
    };
    this.displayAttributeErrors = function () {
        if (!haveAttributes) {
            throw new Error(thisFileName + "no attributes - must be preceeded by call to attributes()");
        }
        return showAttributeErrors();
    };
    // Returns a parser grammar object constructor function as a JavaScript string.
    // This object can then be used to construct a parser.
    this.toSource = function (name) {
        if (!haveAttributes) {
            throw new Error(thisFileName + "can't generate parser source - must be preceeded by call to attributes()");
        }
        if (attributeErrors) {
            throw new Error(
                thisFileName + "can't generate parser source - attributes have " + attributeErrors + " errors"
            );
        }
        return parser.generateSource(this.chars, this.lines, this.rules, this.udts, name);
    };
    // Returns a parser grammar object.
    // This grammar object may be used by the application to construct a parser.
    this.toObject = function () {
        if (!haveAttributes) {
            throw new Error(thisFileName + "can't generate parser object - must be preceeded by call to attributes()");
        }
        if (attributeErrors) {
            throw new Error(
                thisFileName + "can't generate parser object - attributes have " + attributeErrors + " errors"
            );
        }
        return parser.generateObject(this.sabnf, this.rules, this.udts);
    };
    // Display errors in text format, suitable for `console.log()`.
    this.errorsToAscii = function () {
        return errorsToAscii(this.errors, this.lines, this.chars);
    };
    // Display errors in HTML format, suitable for web page display.
    // (`apg-lib.css` required for proper styling)
    this.errorsToHtml = function (title) {
        return errorsToHtml(this.errors, this.lines, this.chars, title);
    };
    // Generate an annotated the SABNF grammar display in text format.
    this.linesToAscii = function () {
        return linesToAscii(this.lines);
    };
    // Generate an annotated the SABNF grammar display in HTML format.
    // (`apg-lib.css` required for proper styling)
    this.linesToHtml = function () {
        return linesToHtml(this.lines);
    };
    // This function was only used by apg.html which has been abandoned.
    /*
    this.getAttributesObject = function () {
        return null;
    };
    */

    /* PRIVATE MEMBERS (FUNCTIONS) */
    /* translate lines (SABNF grammar) to ASCII text */
    var linesToAscii = function (lines) {
        var str = "";
        str += "Annotated Input Grammar";
        lines.forEach(function (val, index) {
            str += "\n";
            str += "line no: " + val.lineNo;
            str += " : char index: " + val.beginChar;
            str += " : length: " + val.length;
            str += " : abnf: " + abnfToAscii(_this.chars, val.beginChar, val.length);
        });
        str += "\n";
        return str;
    };
    /* translate lines (SABNF grammar) to HTML */
    let linesToHtml = function (lines) {
        var html = "";
        html += '<table class="' + apglib.style.CLASS_GRAMMAR + '">\n';
        var title = "Annotated Input Grammar";
        html += "<caption>" + title + "</caption>\n";
        html += "<tr>";
        html += "<th>line<br>no.</th><th>first<br>char</th><th><br>length</th><th><br>text</th>";
        html += "</tr>\n";
        lines.forEach(function (val, index) {
            html += "<tr>";
            html += "<td>" + val.lineNo;
            html += "</td><td>" + val.beginChar;
            html += "</td><td>" + val.length;
            html += "</td><td>" + abnfToHtml(_this.chars, val.beginChar, val.length);
            html += "</td>";
            html += "</tr>\n";
        });

        html += "</table>\n";
        return html;
    };
    /* Format the error messages to HTML, for page display. */
    let errorsToHtml = function (errors, lines, chars, title) {
        var style = apglib.style;
        var html = "";
        var errorArrow = '<span class="' + style.CLASS_NOMATCH + '">&raquo;</span>';
        html += '<p><table class="' + style.CLASS_GRAMMAR + '">\n';
        if (title && typeof title === "string") {
            html += "<caption>" + title + "</caption>\n";
        }
        html += "<tr><th>line<br>no.</th><th>line<br>offset</th><th>error<br>offset</th><th><br>text</th></tr>\n";
        errors.forEach(function (val) {
            var line,
                relchar,
                beg,
                end,
                text,
                prefix = "",
                suffix = "";
            if (lines.length === 0) {
                text = errorArrow;
                relchar = 0;
            } else {
                line = lines[val.line];
                beg = line.beginChar;
                if (val.char > beg) {
                    prefix = abnfToHtml(chars, beg, val.char - beg);
                }
                beg = val.char;
                end = line.beginChar + line.length;
                if (beg < end) {
                    suffix = abnfToHtml(chars, beg, end - beg);
                }
                text = prefix + errorArrow + suffix;
                relchar = val.char - line.beginChar;
                html += "<tr>";
                html +=
                    "<td>" +
                    val.line +
                    "</td><td>" +
                    line.beginChar +
                    "</td><td>" +
                    relchar +
                    "</td><td>" +
                    text +
                    "</td>";
                html += "</tr>\n";
                html += "<tr>";
                html +=
                    '<td colspan="3"></td>' + "<td>&uarr;:&nbsp;" + apglib.utils.stringToAsciiHtml(val.msg) + "</td>";
                html += "</tr>\n";
            }
        });
        html += "</table></p>\n";
        return html;
    };
    /* Display an array of errors in ASCII text */
    let errorsToAscii = function (errors, lines, chars) {
        var str, line, beg, len;
        str = "";
        errors.forEach(function (error) {
            line = lines[error.line];
            str += line.lineNo + ": ";
            str += line.beginChar + ": ";
            str += error.char - line.beginChar + ": ";
            beg = line.beginChar;
            len = error.char - line.beginChar;
            str += abnfToAscii(chars, beg, len);
            str += " >> ";
            beg = error.char;
            len = line.beginChar + line.length - error.char;
            str += abnfToAscii(chars, beg, len);
            str += "\n";
            str += line.lineNo + ": ";
            str += line.beginChar + ": ";
            str += error.char - line.beginChar + ": ";
            str += "error: ";
            str += error.msg;
            str += "\n";
        });
        return str;
    };
    /* Convert a phrase (array of character codes) to HTML. */
    let abnfToHtml = function (chars, beg, len) {
        var NORMAL = 0;
        var CONTROL = 1;
        var INVALID = 2;
        var CONTROL_BEG = '<span class="' + apglib.style.CLASS_CTRLCHAR + '">';
        var CONTROL_END = "</span>";
        var INVALID_BEG = '<span class="' + apglib.style.CLASS_NOMATCH + '">';
        var INVALID_END = "</span>";
        var end;
        var html = "";
        while (true) {
            if (!Array.isArray(chars) || chars.length === 0) {
                break;
            }
            if (typeof beg !== "number") {
                beg = 0;
            }
            if (beg >= chars.length) {
                break;
            }
            if (typeof len !== "number" || beg + len >= chars.length) {
                end = chars.length;
            } else {
                end = beg + len;
            }
            var state = NORMAL;
            for (var i = beg; i < end; i += 1) {
                var ch = chars[i];
                if (ch >= 32 && ch <= 126) {
                    /* normal - printable ASCII characters */
                    if (state === CONTROL) {
                        html += CONTROL_END;
                        state = NORMAL;
                    } else if (state === INVALID) {
                        html += INVALID_END;
                        state = NORMAL;
                    }
                    /* handle reserved HTML entity characters */
                    switch (ch) {
                        case 32:
                            html += "&nbsp;";
                            break;
                        case 60:
                            html += "&lt;";
                            break;
                        case 62:
                            html += "&gt;";
                            break;
                        case 38:
                            html += "&amp;";
                            break;
                        case 34:
                            html += "&quot;";
                            break;
                        case 39:
                            html += "&#039;";
                            break;
                        case 92:
                            html += "&#092;";
                            break;
                        default:
                            html += String.fromCharCode(ch);
                            break;
                    }
                } else if (ch === 9 || ch === 10 || ch === 13) {
                    /* control characters */
                    if (state === NORMAL) {
                        html += CONTROL_BEG;
                        state = CONTROL;
                    } else if (state === INVALID) {
                        html += INVALID_END + CONTROL_BEG;
                        state = CONTROL;
                    }
                    if (ch === 9) {
                        html += "TAB";
                    }
                    if (ch === 10) {
                        html += "LF";
                    }
                    if (ch === 13) {
                        html += "CR";
                    }
                } else {
                    /* invalid characters */
                    if (state === NORMAL) {
                        html += INVALID_BEG;
                        state = INVALID;
                    } else if (state === CONTROL) {
                        html += CONTROL_END + INVALID_BEG;
                        state = INVALID;
                    }
                    /* display character as hexidecimal value */
                    html += "\\x" + apglib.utils.charToHex(ch);
                }
            }
            if (state === INVALID) {
                html += INVALID_END;
            }
            if (state === CONTROL) {
                html += CONTROL_END;
            }
            break;
        }
        return html;
    };
    /* Convert a phrase (array of character codes) to ASCII text. */
    let abnfToAscii = function (chars, beg, len) {
        var str = "";
        for (var i = beg; i < beg + len; i += 1) {
            var ch = chars[i];
            if (ch >= 32 && ch <= 126) {
                str += String.fromCharCode(ch);
            } else {
                switch (ch) {
                    case 9:
                        str += "\\t";
                        break;
                    case 10:
                        str += "\\n";
                        break;
                    case 13:
                        str += "\\r";
                        break;
                    default:
                        str += "\\unknown";
                        break;
                }
            }
        }
        return str;
    };
};
