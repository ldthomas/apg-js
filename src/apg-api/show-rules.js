/*  *************************************************************************************
 *   copyright: Copyright (c) 2021 Lowell D. Thomas, all rights reserved
 *     license: BSD-2-Clause (https://opensource.org/licenses/BSD-2-Clause)
 *     website: https://sabnf.com/
 *   ***********************************************************************************/
module.exports = (function () {
    ("use strict");
    let thisFileName = "show-rules.js";
    // Display the rules.
    // This function may be called before the attributes calculation.
    // Sorting is done independently from the attributes.
    // - order
    //      - "index" or "i", index order (default)
    //      - "alpha" or "a", alphabetical order
    //      - none of above, index order (default)
    let showRules = function (rulesIn = [], udtsIn = [], order = "index") {
        thisFuncName = "showRules";
        function compRulesAlpha(left, right) {
            if (rules[left].lower < rules[right].lower) {
                return -1;
            }
            if (rules[left].lower > rules[right].lower) {
                return 1;
            }
            return 0;
        }
        function compUdtsAlpha(left, right) {
            if (udts[left].lower < udts[right].lower) {
                return -1;
            }
            if (udts[left].lower > udts[right].lower) {
                return 1;
            }
            return 0;
        }
        if (!(Array.isArray(rulesIn) && rulesIn.length)) {
            throw new Error(thisFileName + ":" + thisFuncName + ": rules arg must be array with length > 0");
        }
        if (!Array.isArray(udtsIn)) {
            throw new Error(thisFileName + ":" + thisFuncName + ": udts arg must be array");
        }
        let indexArray = [],
            alphaArray = [],
            udtIndexArray = [],
            udtAlphaArray = [];
        rules = rulesIn;
        udts = udtsIn;
        ruleCount = rulesIn.length;
        udtCount = udtsIn.length;
        let str = "RULE/UDT NAMES";
        let i;

        for (i = 0; i < ruleCount; i++) {
            indexArray.push(i);
        }
        alphaArray = indexArray.slice(0);
        alphaArray.sort(compRulesAlpha);
        if (udtCount) {
            for (i = 0; i < udtCount; i++) {
                udtIndexArray.push(i);
            }
            udtAlphaArray = udtIndexArray.slice(0);
            udtAlphaArray.sort(compUdtsAlpha);
        }
        if (order.charCodeAt(0) === 97) {
            str += " - alphabetical by rule/UDT name\n";
            for (i = 0; i < ruleCount; i++) {
                str += i + ": " + alphaArray[i] + ": " + rules[alphaArray[i]].name + "\n";
            }
            if (udtCount) {
                for (i = 0; i < udtCount; i++) {
                    str += i + ": " + udtAlphaArray[i] + ": " + udts[udtAlphaArray[i]].name + "\n";
                }
            }
        } else {
            str += " - ordered by rule/UDT index\n";
            for (i = 0; i < ruleCount; i++) {
                str += i + ": " + rules[i].name + "\n";
            }
            if (udtCount) {
                for (i = 0; i < udtCount; i++) {
                    str += i + ": " + udts[i].name + "\n";
                }
            }
        }
        return str;
    };
    return showRules;
})();
