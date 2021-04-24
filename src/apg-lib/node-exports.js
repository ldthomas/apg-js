/*  *************************************************************************************
 *   copyright: Copyright (c) 2021 Lowell D. Thomas, all rights reserved
 *     license: BSD-2-Clause (https://opensource.org/licenses/BSD-2-Clause)
 *     website: https://sabnf.com/
 *   ***********************************************************************************/
// This module serves to export all library objects and object constructors with the `require("apg-lib")` statement.
// For example, to create a new parser in your program,
//````
// let apglib = require("apg-lib");
// let my-parser = new apglib.parser();
//````
module.exports = {
    ast: require("./ast.js"),
    circular: require("./circular-buffer.js"),
    ids: require("./identifiers.js"),
    parser: require("./parser.js"),
    stats: require("./stats.js"),
    trace: require("./trace.js"),
    utils: require("./utilities.js"),
    emitcss: require("./emitcss.js"),
    style: require("./style.js"),
};
