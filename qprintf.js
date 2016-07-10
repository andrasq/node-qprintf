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
                    // '+' to always print sign, ' ' to print - for neg and ' ' for positive
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
            // TODO: '%(name)d' to print argv[0].name (printf and sprintf-js compat)
            // TODO: %e scientific notation ?
            // note: glibc does not zero-pad on the right
            // TODO: time .match( /^%((\d+)\$)?((\d+)([.](\d+)?))/ )
        }

        switch (fmt[p]) {
        // integer types
        case 'd': str += convertInteger(padWidth, padChar, rightPad, plusSign, getarg(p)); break;
        case 'i': str += convertIntegerBase(padWidth, padChar, rightPad, plusSign, getarg(p), 10); break;
        case 'x': str += convertIntegerBase(padWidth, padChar, rightPad, plusSign, getarg(p), 16); break;
        case 'o': str += convertIntegerBase(padWidth, padChar, rightPad, plusSign, getarg(p), 8); break;
        case 'b': str += convertIntegerBase(padWidth, padChar, rightPad, plusSign, getarg(p), 2); break;
        case 'c': str += String.fromCharCode(getarg(p)); break;
        // we truncate %i toward zero like php, ie -1.9 prints as -1
        // note that C prints hex and octal as unsigned, while we print as signed

        // float types
        case 'f': str += convertFloat(padWidth, padChar, rightPad, plusSign, getarg(p), precision >= 0 ? precision : 6); break;

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

var _pads = {
  ' ': [ '', ' ', '  ', '   ', '    ', '     ', '      ', '       ', '        ' ],
  '0': [ '', '0', '00', '000', '0000', '00000', '000000', '0000000', '00000000' ],
}
function str_repeat( str, n ) {
    if (n <= 8 && _pads[str]) return _pads[str][n];
    var ret = "";
    while (n >= 3) { ret += str + str + str; n -= 3; }
    while (n > 0) { ret += str; n -= 1; }
    return ret;
}

function padValue( padWidth, padChar, rightPad, str ) {
    if (!padWidth) return str;
    var n = padWidth - str.length;
    if (n <= 0) return str;
    return rightPad ? str + str_repeat(padChar, n) : str_repeat(padChar, n) + str;
}

function convertInteger( width, padChar, rightPad, signChar, v ) {
    var s = (v < 0 ? "" + -v : "" + v);
    return padNumber(width, padChar, rightPad, signChar, v, s);
}

function convertIntegerBase( width, padChar, rightPad, signChar, v, base ) {
    var s = (v < 0 ? (Math.floor(-v)).toString(base) : Math.floor(v).toString(base));
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

    // avoid surprises, work with positive values
    var neg = (v < 0);
    if (v < 0) v = -v;

    var scale = pow10(precision);
    v += (0.5 / scale);                         // round to convert
    var i = Math.floor(v);                      // all digits of the integer part
    var f = Math.floor((v - i) * scale);        // first `precision` digits of the fraction

    // (note: both C and PHP render ("%5.2f", 1.275) as " 1.27", because of the IEEE representation
    var s = i + "." + padValue(precision, '0', false, f + '');
    return neg ? ("-" + s) : s;
}

// 10^n optimized for small values of n
var _pow10 = new Array(40); for (var i=0; i<_pow10.length; i++) _pow10[i] = Math.pow(10, i);
function pow10( n ) {
    return _pow10[n] || Math.pow(10, n);
}

function formatObject( obj, depth ) {
    return util.inspect(obj, {depth: depth !== undefined ? depth : 6});
}

function formatArray( arr, elementLimit, depth ) {
    if (!elementLimit || arr.length <= elementLimit) return util.inspect(arr, depth);
    else return util.inspect(arr.slice(0, elementLimit), depth).slice(0, -2) + ", ... ]";
}
