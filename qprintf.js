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
    function getarg( p ) {
        if (argi >= nargs) throw new Error("missing argument for %" + fmt[p] + " conversion");
        return argv[argi++];
    }

    var p0 = 0, p, str = "";
    while ((p = fmt.indexOf('%', p0)) >= 0) {
        if (p > 0) str += fmt.slice(p0, p);
        p++;

        // parse the field width specifier, if any
        var padChar = ' ', padWidth = undefined, rightPad = false, precision = undefined;
        var flag = fmt[p];
        if (flag >= '0' && flag <= '9' || flag === '-') {
            if (fmt[p] === '-') { rightPad = true; p++; }
            if (fmt[p] === '0') { padChar = '0'; p++; }
            var ch;
            for (var p2=p; (ch = fmt.charCodeAt(p2)) >= 0x30 && ch <= 0x39; ) p2++;
            padWidth = fmt.slice(p, p2) << 0;
            p = p2;
            if (fmt[p] === '.') {
                for (var p2=p+1; (ch = fmt.charCodeAt(p2)) >= 0x30 && ch <= 0x39; p2++) ;
                precision = (p2 > p) ? (fmt.slice(p + 1, p2) << 0) : 0;
                p = p2;
            }
            // TODO: '.' to truncate the value
            // TODO: '+' to always print sign, ' ' to print - for neg and ' ' for positive
            // TODO: ' ' to print sign for negative or space for positive
            // TODO: allow long and long long modifiers, eg %ld and %lld
            // TODO: '%3$d' to print the 3rd argument
            // TODO: '%(name)d' to print argv[0].name (printf and sprintf-js compat)
            // TODO: %e scientific notation ?
            // note: glibc does not zero-pad on the right
        }

        switch (fmt[p]) {
        // integer types
        case 'd': str += padValue(padWidth, padChar, rightPad, getarg(p).toString(10)); break;
        case 'i': str += padValue(padWidth, padChar, rightPad, Math.floor(getarg(p)).toString(10)); break;
        case 'x': str += padValue(padWidth, padChar, rightPad, Math.floor(getarg(p)).toString(16)); break;
        case 'o': str += padValue(padWidth, padChar, rightPad, Math.floor(getarg(p)).toString(8)); break;
        case 'b': str += padValue(padWidth, padChar, rightPad, Math.floor(getarg(p)).toString(2)); break;
        case 'c': str += String.fromCharCode(getarg(p)); break;
        // float types
        case 'f':
            var val = getarg(p);
            if (val < 0 && padWidth !== undefined && padChar === '0') str += '-' + padValue(padWidth - 1, padChar, rightPad, formatFloat(-val, precision));
            else str += padValue(padWidth, padChar, rightPad, formatFloat(val, precision));
            break;
        // string types
        case 's':
            if (precision !== undefined) str += padValue(padWidth, padChar, rightPad, (getarg(p) + "").slice(0, precision));
            else str += padValue(padWidth, padChar, rightPad, getarg(p));
            break;
        // the escape character itself
        case '%': str += padValue(padWidth, padChar, rightPad, '%'); break;
        // qunit extensions
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

function formatFloat( v, precision ) {
    if (precision === undefined) return v.toString(10);

    // 0 decimal digits also omits the decimal point
    if (precision <= 0) return Math.floor(v + 0.5).toString(10);

    // return precision digits of the fraction, rounded
    // (note: both C and PHP render ("%5.2f", 1.275) as " 1.27", because of the IEEE representation
    var scale = Math.pow(10, precision);
    v = v * scale + 0.5;
    var i = Math.floor(v / scale), f = Math.floor(v) % scale;
    return i + "." + padValue(precision, '0', false, f + "");
}

function formatObject( obj, depth ) {
    return util.inspect(obj, {depth: depth !== undefined ? depth : 6});
}

function formatArray( arr, elementLimit, depth ) {
    if (!elementLimit || arr.length <= elementLimit) return util.inspect(arr, depth);
    else return util.inspect(arr.slice(0, elementLimit), depth).slice(0, -2) + ", ... ]";
}
