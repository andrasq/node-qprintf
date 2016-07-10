/**
 * quick little printf-like string interpolator
 *
 * Implements a basic subset of C printf conversions, including field widths.
 *
 * Copyright (C) 2015 Andras Radics
 * Licensed under the Apache License, Version 2.0
 *
 * 2015-02-24 - AR.
 */

'use strict';

module.exports.vsprintf = vsprintf;
module.exports.printf = printf;
module.exports.sprintf = sprintf;

var util = require('util');


function printf( fmt ) {
    var argv = new Array();
    for (var i=1; i<arguments.length; i++) argv.push(arguments[i]);
    process.stdout.write(vsprintf(fmt, argv));
}

function sprintf( fmt ) {
    var args = new Array();
    for (var i=1; i<arguments.length; i++) args.push(arguments[i]);
    return vsprintf(fmt, args);
}

function vsprintf( fmt, argv ) {
    var argi = 0, nargs = argv.length;
    var argN = undefined;
    function getarg( p ) {
        if (argN !== undefined) return argN;
        if (argi >= nargs) throw new Error("missing argument for %" + fmt[p] + " conversion");
        return argv[argi++];
    }
    function getargN( n ) {
        if (n > nargs) throw new Error("missing argument for % conversion");
        if (n < 1) throw new Error("invalid $ argument specifier for % conversion");
        return argv[n-1];
    }

    var p0 = 0, p = 0, str = "";
    var scanned = { end: undefined, val: undefined };
    while (p < fmt.length) {
        if (fmt.charCodeAt(p) != 0x25) { p++; continue; }       // scan until %
        if (p > p0) str += fmt.slice(p0, p);
        p++;

        // parse the conversion spec
        argN = undefined;
        var padChar = ' ', padWidth = undefined, rightPad = false, precision = undefined, plusSign = '';
        var flag = fmt[p];
        var checkForWidth = true;
        if (flag >= '0' && flag <= '9' || flag === '-' || flag === '+' || flag === ' ') {
            scanDigits(fmt, p, scanned);
            if (fmt[scanned.end] === '$') {
                // found an N$ arg specifier, might also have width
                argN = getargN(scanned.val);
                checkForWidth = true;
                p = scanned.end + 1;
            }
            else if (scanned.end > p) {
                // found field width, with at most a numeric '0' flag
                if (fmt[p] === '0') padChar = '0';
                padWidth = scanned.val;
                checkForWidth = false;
                p = scanned.end;
            }
            if (checkForWidth) {
                // look for both flags and width
                while (true) {
                    if (fmt[p] === '-') { rightPad = true; p++; }
                    else if (fmt[p] === '0') { padChar = '0'; p++; }
                    else if (fmt[p] === '+') { plusSign = '+'; p++; }
                    else if (fmt[p] === ' ') { plusSign = ' '; p++; }
                    else break;
                }
                scanDigits(fmt, p, scanned);
                padWidth = scanned.val;
            }
            if (fmt[scanned.end] === '.') {
                // gather precision if included with width
                scanDigits(fmt, scanned.end+1, scanned);
                precision = scanned.val;
            }
            p = scanned.end;
            // TODO: '+' to always print sign, ' ' to print - for neg and ' ' for positive
            // TODO: '%(name)d' to print argv[0].name (printf and sprintf-js compat)
            // TODO: %e scientific notation ?
            // note: glibc does not zero-pad on the right
            // TODO: time .match( /^%((\d+)\$)?((\d+)([.](\d+)?))/ )
        }

        switch (fmt[p]) {
        // integer types
        case 'd': str += convertInteger(padWidth, padChar, rightPad, plusSign, getarg(p)); break;
        case 'i': str += convertInteger(padWidth, padChar, rightPad, plusSign, Math.floor(getarg(p))); break;
        case 'x': str += convertIntegerBase(padWidth, padChar, rightPad, plusSign, Math.floor(getarg(p)), 16); break;
        case 'o': str += convertIntegerBase(padWidth, padChar, rightPad, plusSign, Math.floor(getarg(p)), 8); break;
        case 'b': str += convertIntegerBase(padWidth, padChar, rightPad, plusSign, Math.floor(getarg(p)), 2); break;
        case 'c': str += String.fromCharCode(getarg(p)); break;
        // TODO: js floor() truncates toward -Infinity, not zero

        // float types
        case 'f': str += convertFloat(padWidth, padChar, rightPad, plusSign, getarg(p), precision); break;

        // string types
        case 's':
            if (precision !== undefined) str += padValue(padWidth, padChar, rightPad, (getarg(p) + "").slice(0, precision));
            else str += padValue(padWidth, padChar, rightPad, getarg(p));
            break;

        // the escape character itself
        case '%': str += padValue(padWidth, padChar, rightPad, '%'); break;

        // qnit extensions
        case 'A': str += formatArray(getarg(p), padWidth, 6); break;
        case 'O': str += formatObject(getarg(p), padWidth); break;

        default: throw new Error("%" + fmt[p] + ": unsupported conversion"); break;
            // TODO: include full conversion specifier in error... if does not impact speed
        }
        p0 = p + 1;
    }
    if (p0 < fmt.length) str += fmt.slice(p0);
    return str;
}


function scanDigits( str, p, ret ) {
    var ch, val = 0;
    for (var p2=p; (ch = str.charCodeAt(p2)) >= 0x30 && ch <= 0x39; p2++) {
        val = val * 10 + ch - 0x30;
    }
    ret.end = p2;
    ret.val = val;
}

function str_repeat( str, n ) {
    var ret = "";
    while (n >= 3) { ret += str + str + str; n -= 3; }
    while (n > 0) { ret += str; n -= 1; }
    return ret;
}

function padValue( padWidth, padChar, rightPad, str ) {
    var n;
    if (!padWidth || (n = padWidth - str.length) <= 0) return str;
    return rightPad ? str + str_repeat(padChar, n) : str_repeat(padChar, n) + str;
    // NOTE: C pads on right with spaces, not zeros
}

function convertInteger( width, padChar, rightPad, signChar, v ) {
    var s = (v < 0 ? "" + -v : "" + v);
    return padNumber(width, padChar, rightPad, signChar, v, s);
}

function convertIntegerBase( width, padChar, rightPad, signChar, v, base ) {
    var s = (v < 0 ? (-v).toString(base) : v.toString(base));
    return padNumber(width, padChar, rightPad, signChar, v, s);
}

function convertFloat( width, padChar, rightPad, signChar, v, precision ) {
    var s = (v < 0 ? formatFloat(-v, precision) : formatFloat(v, precision))
    return padNumber(width, padChar, rightPad, signChar, v, s);
}

function padNumber( width, padChar, rightPad, signChar, v, numberString ) {
    if (v < 0) signChar = '-';
    return (signChar && padChar === '0')
        ? signChar + padValue(width - 1, padChar, rightPad, numberString)
        : padValue(width, padChar, rightPad, signChar + numberString);
}

function formatFloat( v, precision ) {
    if (precision === undefined) return v.toString(10);

    // 0 decimal digits also omits the decimal point
    if (precision <= 0) return Math.floor(v + 0.5).toString(10);

    // return precision digits of the fraction, rounded
    // (note: both C and PHP render ("%5.2f", 1.275) as " 1.27", because of the IEEE representation
    var scale = Math.pow(10, precision);
    v = v * scale + 0.5;
    var i = Math.floor(v / scale), f = Math.floor(v) % scale;
    // FIXME: should scale 0.5 down, to not overflow on mpy:
    // v += 0.5 / scale;
    // i = v - (v % 1); f = Math.floor(v * scale);
    // NOTE: -1.24 % 1 errors out (positive reals only)
    return i + "." + padValue(precision, '0', false, f + "");
    // TODO: alternate: time:
    // return i + "." + ("" + (v - v % 1/scale)).slice(2);
}

function formatObject( obj, depth ) {
    return util.inspect(obj, {depth: depth !== undefined ? depth : 6});
}

function formatArray( arr, elementLimit, depth ) {
    if (!elementLimit || arr.length <= elementLimit) return util.inspect(arr, depth);
    else return util.inspect(arr.slice(0, elementLimit), depth).slice(0, -2) + ", ... ]";
}
