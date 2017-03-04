/**
 * quick little printf-like string interpolator
 *
 * Implements a basic subset of C printf conversions, including field widths.
 *
 * Copyright (C) 2015-2016 Andras Radics
 * Licensed under the Apache License, Version 2.0
 *
 * 2015-02-24 - AR.
 */

'use strict';

module.exports.vsprintf = vsprintf;
module.exports.printf = printf;
module.exports.sprintf = sprintf;

var util = require('util');

// ascii char codes
var CH_0 = '0'.charCodeAt(0);
var CH_9 = '9'.charCodeAt(0);
var CH_MINUS = '-'.charCodeAt(0);
var CH_PLUS = '+'.charCodeAt(0);
var CH_SPACE = ' '.charCodeAt(0);
var CH_DOT = '.'.charCodeAt(0);

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
    var argz = {
        fmt: fmt,
        argv: argv,
        argi: 0,
        nargs: argv.length,
        argN: undefined,
    };

    var p0 = 0, p = 0, str = "";
    var scanned = { end: undefined, val: undefined };
    while (p < fmt.length) {
        if (fmt.charCodeAt(p) != 0x25) { p++; continue; }       // scan until %
        if (p > p0) str += fmt.slice(p0, p);
        p++;

        // parse the conversion spec
        argz.argN = undefined;
        var padChar = ' ', padWidth = undefined, rightPad = false, precision = undefined, plusSign = '';
        var flag = fmt.charCodeAt(p);
        var checkForWidth = true;
        if (flag >= CH_0 && flag <= CH_9 || flag === CH_MINUS || flag === CH_PLUS || flag === CH_SPACE) {
            scanDigits(fmt, p, scanned);
            if (fmt[scanned.end] === '$') {
                // found an N$ arg specifier, might also have width
                argz.argN = getargN(argz, scanned.val);
                checkForWidth = true;
                p = scanned.end + 1;
            }
            else if (scanned.end > p) {
                // found field width, with at most a numeric '0' flag
                if (fmt.charCodeAt(p) === CH_0) padChar = '0';
                padWidth = scanned.val;
                checkForWidth = false;
                p = scanned.end;
            }
            if (checkForWidth) {
                // look for both flags and width
                while (true) {
                    if (fmt.charCodeAt(p) === CH_MINUS) { rightPad = true; p++; }
                    else if (fmt.charCodeAt(p) === CH_0) { padChar = '0'; p++; }
                    // '+' to always print sign, ' ' to print - for neg and ' ' for positive
                    else if (fmt.charCodeAt(p) === CH_PLUS) { plusSign = '+'; p++; }
                    else if (fmt.charCodeAt(p) === CH_SPACE) { plusSign = ' '; p++; }
                    else break;
                }
                scanDigits(fmt, p, scanned);
                padWidth = scanned.val;
            }
            if (fmt.charCodeAt(scanned.end) === CH_DOT) {
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
        case 'd': str += convertNumber(padWidth, padChar, rightPad, plusSign, getarg(argz, p)); break;
        case 'i': str += convertIntegerBase(padWidth, padChar, rightPad, plusSign, getarg(argz, p), 10); break;
        case 'x': str += convertIntegerBase(padWidth, padChar, rightPad, plusSign, getarg(argz, p), 16); break;
        case 'o': str += convertIntegerBase(padWidth, padChar, rightPad, plusSign, getarg(argz, p), 8); break;
        case 'b': str += convertIntegerBase(padWidth, padChar, rightPad, plusSign, getarg(argz, p), 2); break;
        case 'c': str += String.fromCharCode(getarg(argz, p)); break;
        // we truncate %i toward zero like php, ie -1.9 prints as -1
        // note that C prints hex and octal as unsigned, while we print as signed

        // float types
        case 'f': str += convertFloat(padWidth, padChar, rightPad, plusSign, getarg(argz, p), precision >= 0 ? precision : 6); break;

        // string types
        case 's':
            if (precision !== undefined) str += padValue(padWidth, padChar, rightPad, (getarg(argz, p) + "").slice(0, precision));
            else str += padValue(padWidth, padChar, rightPad, getarg(argz, p));
            break;

        // the escape character itself
        case '%': str += padValue(padWidth, padChar, rightPad, '%'); break;

        // qnit extensions
        case 'A': str += formatArray(getarg(argz, p), padWidth, 6); break;
        case 'O': str += formatObject(getarg(argz, p), padWidth); break;

        default:
            if (p >= fmt.length) { str += '%'; break; }
            throw new Error("%" + fmt[p] + ": unsupported conversion");
            // TODO: include full conversion specifier in error... if does not impact speed
        }
        p0 = ++p;
    }
    if (p0 < fmt.length) str += fmt.slice(p0);
    return str;
}


function getarg( argz, p ) {
    if (argz.argN !== undefined) return argz.argN;
    if (argz.argi >= argz.nargs) throw new Error("missing argument for %" + argz.fmt[p] + " conversion");
    return argz.argv[argz.argi++];
}

function setargN( argz, n ) {
    if (n > argz.nargs) throw new Error("missing argument $" + n + " for % conversion");
    // negative n never passed in, scanDigits does not handle minus sign
    // if (n < 1) throw new Error("invalid $ argument specifier for % conversion");
    return argz.argN = argz.argv[n-1];
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

function convertNumber( width, padChar, rightPad, signChar, v ) {
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
// never called with negative v, omit code handling negatives
//    if (precision === undefined) return v.toString(10);

    // 0 decimal digits also omits the decimal point
    if (precision <= 0) return Math.floor(v + 0.5).toString(10);

    // avoid surprises, work with positive values
//    var neg = (v < 0);
//    if (v < 0) v = -v;

    var scale = pow10(precision);
    v += (0.5 / scale);                         // round to convert
    var i = Math.floor(v);                      // all digits of the integer part
    var f = Math.floor((v - i) * scale);        // first `precision` digits of the fraction

    // TODO: large i and precision format as eg 1+42

    // note: both C and PHP render ("%5.2f", 1.275) as "1.27", because of the IEEE representation
    var s = i + "." + padValue(precision, '0', false, f + '');
//    return neg ? ("-" + s) : s;
    return s;
}

// 10^n optimized for small integer values of n
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
