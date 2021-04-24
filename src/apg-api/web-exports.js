/*  *************************************************************************************
 *   copyright: Copyright (c) 2021 Lowell D. Thomas, all rights reserved
 *     license: BSD-2-Clause (https://opensource.org/licenses/BSD-2-Clause)
 *     website: https://sabnf.com/
 *   ***********************************************************************************/
// Attach apg-api, apg-lib and apg-conv-api to the global (window)
// object for browser applications.
(function () {
    globalThis.apgApi = require("./api.js");
    globalThis.apgLib = require("../apg-lib/node-exports.js");
    globalThis.apgConvApi = require("../apg-conv-api/node-exports.js");
})();
