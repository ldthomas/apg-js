/*  *************************************************************************************
 *   copyright: Copyright (c) 2021 Lowell D. Thomas, all rights reserved
 *     license: BSD-2-Clause (https://opensource.org/licenses/BSD-2-Clause)
 *     website: https://sabnf.com/
 *   ***********************************************************************************/
// Exports the apg-exp, apg-api, apg-lib and apg-conv-api modules
// for browser applications.
(function () {
    globalThis.apgExp = require("./apg-exp.js");
    globalThis.apgApi = require("../apg-api/api.js");
    globalThis.apgLib = require("../apg-lib/node-exports.js");
    globalThis.apgConvApi = require("../apg-conv-api/node-exports.js");
})();
