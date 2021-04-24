/*  *************************************************************************************
 *   copyright: Copyright (c) 2021 Lowell D. Thomas, all rights reserved
 *     license: BSD-2-Clause (https://opensource.org/licenses/BSD-2-Clause)
 *     website: https://sabnf.com/
 *   ***********************************************************************************/
// This module does the heavy lifting for attribute generation.
module.exports = (function () {
    "use strict";
    let id = require("../apg-lib/node-exports.js").ids;
    let thisFile = "rule-attributes.js";
    let state = null;
    function isEmptyOnly(attr) {
        if (attr.left || attr.nested || attr.right || attr.cyclic) {
            return false;
        }
        return attr.empty;
    }
    function isRecursive(attr) {
        if (attr.left || attr.nested || attr.right || attr.cyclic) {
            return true;
        }
        return false;
    }
    function isCatNested(attrs, count) {
        let i = 0,
            j = 0,
            k = 0;
        /* 1. if any child is nested, CAT is nested */
        for (i = 0; i < count; i++) {
            if (attrs[i].nested) {
                return true;
            }
        }
        /* 2.) the left-most right recursive child
               is followed by at least one non-empty child */
        for (i = 0; i < count; i++) {
            if (attrs[i].right && !attrs[i].leaf) {
                for (j = i + 1; j < count; j++) {
                    if (!isEmptyOnly(attrs[j])) {
                        return true;
                    }
                }
            }
        }
        /* 3.) the right-most left recursive child
               is preceded by at least one non-empty child */
        for (i = count - 1; i >= 0; i--) {
            if (attrs[i].left && !attrs[i].leaf) {
                for (j = i - 1; j >= 0; j--) {
                    if (!isEmptyOnly(attrs[j])) {
                        return true;
                    }
                }
            }
        }
        /* 4. there is at lease one recursive child between
              the left-most and right-most non-recursive, non-empty children */
        for (i = 0; i < count; i++) {
            if (!attrs[i].empty && !isRecursive(attrs[i])) {
                for (j = i + 1; j < count; j++) {
                    if (isRecursive(attrs[j])) {
                        for (k = j + 1; k < count; k++) {
                            if (!attrs[k].empty && !isRecursive(attrs[k])) {
                                return true;
                            }
                        }
                    }
                }
            }
        }

        /* none of the above */
        return false;
    }
    function isCatCyclic(attrs, count) {
        /* if all children are cyclic, CAT is cyclic */
        for (let i = 0; i < count; i++) {
            if (!attrs[i].cyclic) {
                return false;
            }
        }
        return true;
    }
    function isCatLeft(attrs, count) {
        /* if the left-most non-empty is left, CAT is left */
        for (let i = 0; i < count; i++) {
            if (attrs[i].left) {
                return true;
            }
            if (!attrs[i].empty) {
                return false;
            }
            /* keep looking */
        }
        return false; /* all left-most are empty */
    }
    function isCatRight(attrs, count) {
        /* if the right-most non-empty is right, CAT is right */
        for (let i = count - 1; i >= 0; i--) {
            if (attrs[i].right) {
                return true;
            }
            if (!attrs[i].empty) {
                return false;
            }
            /* keep looking */
        }
        return false;
    }
    function isCatEmpty(attrs, count) {
        /* if all children are empty, CAT is empty */
        for (let i = 0; i < count; i++) {
            if (!attrs[i].empty) {
                return false;
            }
        }
        return true;
    }
    function isCatFinite(attrs, count) {
        /* if all children are finite, CAT is finite */
        for (let i = 0; i < count; i++) {
            if (!attrs[i].finite) {
                return false;
            }
        }
        return true;
    }
    function cat(state, opcodes, opIndex, iAttr) {
        let i = 0;
        let opCat = opcodes[opIndex];
        let count = opCat.children.length;

        /* generate an empty array of child attributes */
        let childAttrs = [];
        for (i = 0; i < count; i++) {
            childAttrs.push(state.attrGen());
        }
        for (i = 0; i < count; i++) {
            opEval(state, opcodes, opCat.children[i], childAttrs[i]);
        }
        iAttr.left = isCatLeft(childAttrs, count);
        iAttr.right = isCatRight(childAttrs, count);
        iAttr.nested = isCatNested(childAttrs, count);
        iAttr.empty = isCatEmpty(childAttrs, count);
        iAttr.finite = isCatFinite(childAttrs, count);
        iAttr.cyclic = isCatCyclic(childAttrs, count);
    }
    function alt(state, opcodes, opIndex, iAttr) {
        let i = 0;
        let opAlt = opcodes[opIndex];
        let count = opAlt.children.length;

        /* generate an empty array of child attributes */
        let childAttrs = [];
        for (i = 0; i < count; i++) {
            childAttrs.push(state.attrGen());
        }
        for (i = 0; i < count; i++) {
            opEval(state, opcodes, opAlt.children[i], childAttrs[i]);
        }

        /* if any child attribute is true, ALT is true */
        iAttr.left = false;
        iAttr.right = false;
        iAttr.nested = false;
        iAttr.empty = false;
        iAttr.finite = false;
        iAttr.cyclic = false;
        for (i = 0; i < count; i++) {
            if (childAttrs[i].left) {
                iAttr.left = true;
            }
            if (childAttrs[i].nested) {
                iAttr.nested = true;
            }
            if (childAttrs[i].right) {
                iAttr.right = true;
            }
            if (childAttrs[i].empty) {
                iAttr.empty = true;
            }
            if (childAttrs[i].finite) {
                iAttr.finite = true;
            }
            if (childAttrs[i].cyclic) {
                iAttr.cyclic = true;
            }
        }
    }
    function bkr(state, opcodes, opIndex, iAttr) {
        let opBkr = opcodes[opIndex];
        if (opBkr.index >= state.ruleCount) {
            /* use UDT values */
            iAttr.empty = state.udts[opBkr.index - state.ruleCount].empty;
            iAttr.finite = true;
        } else {
            /* use the empty and finite values from the back referenced rule */
            ruleAttrsEval(state, opBkr.index, iAttr);

            /* however, this is a terminal node like TLS */
            iAttr.left = false;
            iAttr.nested = false;
            iAttr.right = false;
            iAttr.cyclic = false;
        }
    }

    function opEval(state, opcodes, opIndex, iAttr) {
        state.attrInit(iAttr);
        let opi = opcodes[opIndex];
        switch (opi.type) {
            case id.ALT:
                alt(state, opcodes, opIndex, iAttr);
                break;
            case id.CAT:
                cat(state, opcodes, opIndex, iAttr);
                break;
            case id.REP:
                opEval(state, opcodes, opIndex + 1, iAttr);
                if (opi.min === 0) {
                    iAttr.empty = true;
                    iAttr.finite = true;
                }
                break;
            case id.RNM:
                ruleAttrsEval(state, opcodes[opIndex].index, iAttr);
                break;
            case id.BKR:
                bkr(state, opcodes, opIndex, iAttr);
                break;
            case id.AND:
            case id.NOT:
            case id.BKA:
            case id.BKN:
                opEval(state, opcodes, opIndex + 1, iAttr);
                iAttr.empty = true;
                break;
            case id.TLS:
                iAttr.empty = opcodes[opIndex].string.length ? false : true;
                iAttr.finite = true;
                iAttr.cyclic = false;
                break;
            case id.TBS:
            case id.TRG:
                iAttr.empty = false;
                iAttr.finite = true;
                iAttr.cyclic = false;
                break;
            case id.UDT:
                iAttr.empty = opi.empty;
                iAttr.finite = true;
                iAttr.cyclic = false;
                break;
            case id.ABG:
            case id.AEN:
                iAttr.empty = true;
                iAttr.finite = true;
                iAttr.cyclic = false;
                break;
            default:
                throw new Error("unknown opcode type: " + opi);
        }
    }
    // The main logic for handling rules that:
    //  - have already be evaluated
    //  - have not been evaluated and is the first occurrence on this branch
    //  - second occurrence on this branch for the start rule
    //  - second occurrence on this branch for non-start rules
    function ruleAttrsEval(state, ruleIndex, iAttr) {
        let attri = state.attrsWorking[ruleIndex];
        if (attri.isComplete) {
            /* just use the completed values */
            state.attrCopy(iAttr, attri);
        } else if (!attri.isOpen) {
            /* open the rule and traverse it */
            attri.isOpen = true;
            opEval(state, attri.rule.opcodes, 0, iAttr);
            /* complete this rule's attributes */
            attri.left = iAttr.left;
            attri.right = iAttr.right;
            attri.nested = iAttr.nested;
            attri.empty = iAttr.empty;
            attri.finite = iAttr.finite;
            attri.cyclic = iAttr.cyclic;
            attri.leaf = false;
            attri.isOpen = false;
            attri.isComplete = true;
        } else if (ruleIndex === state.startRule) {
            /* use recursive leaf values */
            if (ruleIndex === state.startRule) {
                iAttr.left = true;
                iAttr.right = true;
                iAttr.cyclic = true;
                iAttr.leaf = true;
            }
        } else {
            /* non-start rule terminal leaf */
            iAttr.finite = true;
        }
    }
    // The main driver for the attribute generation.
    let ruleAttributes = function (stateArg) {
        state = stateArg;
        let i = 0,
            j = 0;
        let iAttr = state.attrGen();
        for (i = 0; i < state.ruleCount; i++) {
            /* initialize working attributes */
            for (j = 0; j < state.ruleCount; j++) {
                state.attrInit(state.attrsWorking[j]);
            }
            state.startRule = i;
            ruleAttrsEval(state, i, iAttr);

            /* save off the working attributes for this rule */
            state.attrCopy(state.attrs[i], state.attrsWorking[i]);
        }
        state.attributesComplete = true;
        let attri = null;
        for (i = 0; i < state.ruleCount; i++) {
            attri = state.attrs[i];
            if (attri.left || !attri.finite || attri.cyclic) {
                let temp = state.attrGen(attri.rule);
                state.attrCopy(temp, attri);
                state.attrsErrors.push(temp);
                state.attrsErrorCount++;
            }
        }
    };
    let truth = function (val) {
        return val ? "t" : "f";
    };
    let tError = function (val) {
        return val ? "e" : "f";
    };
    let fError = function (val) {
        return val ? "t" : "e";
    };
    let showAttr = function (seq, index, attr, dep) {
        let str = seq + ":" + index + ":";
        str += tError(attr.left) + " ";
        str += truth(attr.nested) + " ";
        str += truth(attr.right) + " ";
        str += tError(attr.cyclic) + " ";
        str += fError(attr.finite) + " ";
        str += truth(attr.empty) + ":";
        str += state.typeToString(dep.recursiveType) + ":";
        str += dep.recursiveType === id.ATTR_MR ? dep.groupNumber : "-";
        str += ":" + attr.rule.name + "\n";
        return str;
    };

    let showLegend = function () {
        let str = "LEGEND - t=true, f=false, e=error\n";
        str += "sequence:rule index:left nested right cyclic finite empty:type:group number:rule name\n";
        return str;
    };
    let showAttributeErrors = function () {
        let i = 0;
        let attri = null;
        let depi = null;
        let str = "";
        str += "RULE ATTRIBUTES WITH ERRORS\n";
        str += showLegend();
        if (state.attrsErrorCount) {
            for (let i = 0; i < state.attrsErrorCount; i++) {
                attri = state.attrsErrors[i];
                depi = state.ruleDeps[attri.rule.index];
                str += showAttr(i, attri.rule.index, attri, depi);
            }
        } else {
            str += "<none>\n";
        }
        return str;
    };

    let show = function (type) {
        let i = 0,
            ii = 0,
            count = 0;
        let attri = null;
        let depi = null;
        let str = "";
        let ruleIndexes = state.ruleIndexes;
        let udtIndexes = state.udtIndexes;
        if (type === 97) {
            ruleIndexes = state.ruleAlphaIndexes;
            udtIndexes = state.udtAlphaIndexes;
        } else if (type === 116) {
            ruleIndexes = state.ruleTypeIndexes;
            udtIndexes = state.udtAlphaIndexes;
        }
        /* show all attributes */
        for (i = 0; i < state.ruleCount; i++) {
            ii = ruleIndexes[i];
            attri = state.attrs[ii];
            depi = state.ruleDeps[ii];
            str += showAttr(i, ii, attri, depi);
        }
        return str;
    };

    // Display the rule attributes.
    // - order
    //      - "index" or "i", index order (default)
    //      - "alpha" or "a", alphabetical order
    //      - "type" or "t", ordered by type (alphabetical within each type/group)
    //      - none of above, index order (default)
    let showAttributes = function (order = "index") {
        if (!state.attributesComplete) {
            throw new Error(thisFile + ":showAttributes: attributes not available");
        }
        let str = "";
        let leader = "RULE ATTRIBUTES\n";
        if (order.charCodeAt(0) === 97) {
            str += "alphabetical by rule name\n";
            str += leader;
            str += showLegend();
            str += show(97);
        } else if (order.charCodeAt(0) === 116) {
            str += "ordered by rule type\n";
            str += leader;
            str += showLegend();
            str += show(116);
        } else {
            str += "ordered by rule index\n";
            str += leader;
            str += showLegend();
            str += show();
        }
        return str;
    };

    /* Destructuring assignment - see MDN Web Docs */
    return { ruleAttributes, showAttributes, showAttributeErrors };
})();
