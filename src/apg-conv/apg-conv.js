/*  *************************************************************************************
 *   copyright: Copyright (c) 2021 Lowell D. Thomas, all rights reserved
 *     license: BSD-2-Clause (https://opensource.org/licenses/BSD-2-Clause)
 *     website: https://sabnf.com/
 *   ***********************************************************************************/
// This module is the main function for command line usage.
// It reads a source file and writes a destination file, converting the source format to the destination format.
// The files are all treated as byte streams.
// `stdin` and `stdout` are the default input and output streams.
//
// Run<br>
//`npm run apg-conv -- --help`<br>
//or<br>
//`./bin/apg-conv.sh --help`<br>
//to see the options.

module.exports = function () {
    "use strict;";
    let SRC_FILEL = "--src";
    let SRC_FILES = "-s";
    let SRC_TYPEL = "--src-type";
    let SRC_TYPES = "-st";
    let DST_FILEL = "--dst";
    let DST_FILES = "-d";
    let DST_TYPEL = "--dst-type";
    let DST_TYPES = "-dt";
    let ERR_FILEL = "--err";
    let ERR_FILES = "-e";
    let HELPL = "--help";
    let HELPS = "-h";
    let VERSIONL = "--version";
    let VERSIONS = "-v";
    let srcType = "UTF8";
    let dstType = "UTF8";
    let srcFile = "";
    let dstFile = "";
    let errFile = "";
    let fs = require("fs");
    let api = require("../apg-conv-api/node-exports.js");
    let help = require("./help.js");
    let convert = api.converter.convert;
    let srcStream = process.stdin;
    let dstStream = process.stdout;
    let errStream = process.stderr;
    let srcBuf, dstBuf;
    let args = process.argv.slice(2);
    try {
        /* get the input arguments */
        if (!args || args.length === 0) {
            console.log(help.help());
            return;
        }
        for (let i = 0; i < args.length; i += 2) {
            let key = args[i].toLowerCase();
            if (key === HELPL || key === HELPS) {
                console.log(help.help());
                return;
            }
            if (key === VERSIONL || key === VERSIONS) {
                console.log(help.version());
                return;
            }
            let i1 = i + 1;
            if (i1 >= args.length) {
                throw new TypeError("no matching value for option: " + key);
            }
            let value = args[i1];
            switch (key) {
                case SRC_FILEL:
                case SRC_FILES:
                    srcFile = value;
                    break;
                case SRC_TYPEL:
                case SRC_TYPES:
                    srcType = value;
                    break;
                case DST_FILEL:
                case DST_FILES:
                    dstFile = value;
                    break;
                case DST_TYPEL:
                case DST_TYPES:
                    dstType = value;
                    break;
                case ERR_FILEL:
                case ERR_FILES:
                    errFile = value;
                    break;
                default:
                    throw new TypeError("unrecognized option: " + key);
                    break;
            }
        }

        /* disable STRING type, allowed by converter, but not here */
        if (srcType.toUpperCase() === "STRING") {
            throw new Error("Input type may not be STRING.");
        }
        if (dstType.toUpperCase() === "STRING") {
            throw new Error("Output type may not be STRING.");
        }

        /* create file streams, if necessary */
        if (srcFile) {
            srcStream = fs.createReadStream(srcFile, { flags: "r" });
        }
        if (dstFile) {
            dstStream = fs.createWriteStream(dstFile, { flags: "w" });
        }
        if (errFile) {
            errStream = fs.createWriteStream(errFile, { flags: "w" });
        }

        /* read the input data */
        srcBuf = Buffer.alloc(0);
        srcStream.on("data", function (chunkBuf) {
            srcBuf = Buffer.concat([srcBuf, chunkBuf]);
        });

        srcStream.on("end", function () {
            try {
                /* translate the data */
                dstBuf = convert(srcType, srcBuf, dstType);

                /* write the translated the data */
                dstStream.write(dstBuf);
                if (dstFile) {
                    dstStream.end();
                }
            } catch (e) {
                errStream.write("EXCEPTION: on srcStream end: " + e.message + "\n");
            }
        });
        srcStream.on("error", function (e) {
            errStream.write("srcStream error: " + e.message + "\n");
        });
        dstStream.on("error", function (e) {
            errStream.write("dstStream error: " + e.message + "\n");
        });
    } catch (e) {
        errStream.write("EXCEPTION: " + e.message + "\n");
        errStream.write(help.help());
    }
    if (errFile) {
        errStream.end();
    }
};
