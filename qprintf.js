/**
 * quick little printf-like string interpolator
 *
 * Implements a basic subset of C printf conversions, including field widths.
 *
 * Copyright (C) 2015-2017 Andras Radics
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
var CH_DOLLAR = '$'.charCodeAt(0);
var CH_LEFTPAREN = '('.charCodeAt(0);
var CH_RIGHTPAREN = ')'.charCodeAt(0);

function printf( fmt ) {
    var args = new Array(arguments.length - 1);
    for (var i=1; i<arguments.length; i++) args[i - 1] = arguments[i];
    process.stdout.write(vsprintf(fmt, args));
}

function sprintf( fmt ) {
    var args = new Array(arguments.length - 1);
    for (var i=1; i<arguments.length; i++) args[i - 1] = arguments[i];
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

    var p0 = 0, p = 0, q, argName, str = "";
    var scanned = { end: undefined, val: undefined };

    while (p < fmt.length) {
        if (fmt.charCodeAt(p) != 0x25) { p++; continue; }       // scan until %
        if (p > p0) str += fmt.slice(p0, p);
        p++;

        argz.argN = undefined;

        // parse the conversion spec
        var padChar = ' ', padWidth = undefined, rightPad = false, precision = undefined, plusSign = '';
        if (fmt.charCodeAt(p) === CH_LEFTPAREN) p = scanAndSetArgName(fmt, p, argz);
        var flag = fmt.charCodeAt(p);
        var checkForWidth = true;
        if (flag >= 0x30 && flag <= 0x39 || flag === CH_DOT || flag === CH_MINUS || flag === CH_PLUS || flag === CH_SPACE) {
            scanDigits(fmt, p, scanned);
            if (fmt.charCodeAt(scanned.end) === CH_DOLLAR) {
                // found an N$ arg specifier, but might also have width
                setargN(argz, scanned.val, p);
                checkForWidth = true;
                p = scanned.end + 1;
                if (fmt.charCodeAt(p) === CH_LEFTPAREN) p = scanAndSetArgName(fmt, p, argz);
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
                    // this switch is faster with charcodes
                    switch (fmt.charCodeAt(p)) {
                    case CH_MINUS: rightPad = true; p++; continue;
                    case CH_0: padChar = '0'; p++; continue;
                    // '+' to always print sign, ' ' to print - for neg and ' ' for positive
                    case CH_PLUS: plusSign = '+'; p++; continue;
                    case CH_SPACE: plusSign = ' '; p++; continue;
                    }
                    break;
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
            // note: glibc does not zero-pad on the right
        }

        // if not followed by a conversion specifier, print it as is
        if (p >= fmt.length) break;

        // this switch is faster with chars, not charcodes
        switch (fmt[p]) {
        // integer types
        case 'd': str += convertNumber(padWidth, padChar, rightPad, plusSign, getarg(argz, p)); break;
        // TODO: make %d truncate to integer like traditional C -- a breaking change!
        case 'i': str += convertIntegerBase(padWidth, padChar, rightPad, plusSign, getarg(argz, p), 10); break;
        // we truncate %i toward zero like php, ie -1.9 prints as -1
        case 'x': str += convertIntegerBase(padWidth, padChar, rightPad, plusSign, getarg(argz, p), 16); break;
        case 'X': str += convertIntegerBase(padWidth, padChar, rightPad, plusSign, getarg(argz, p), 16).toUpperCase(); break;
        case 'o': str += convertIntegerBase(padWidth, padChar, rightPad, plusSign, getarg(argz, p), 8); break;
        // note that C prints hex and octal as unsigned, while we print as signed
        case 'b': str += convertIntegerBase(padWidth, padChar, rightPad, plusSign, getarg(argz, p), 2); break;
        // %b binary is our extension
        case 'u': str += convertIntegerBase(padWidth, padChar, rightPad, plusSign, getarg(argz, p) >>> 0, 10); break;
        // %u is vague in js, we first convert the float to 32-bit twos-complement unsigned

        // float types
        case 'f': str += convertFloat(padWidth, padChar, rightPad, plusSign, getarg(argz, p), precision >= 0 ? precision : 6); break;
        case 'e': str += convertFloatExp(padWidth, padChar, rightPad, plusSign, getarg(argz, p), precision >= 0 ? precision : 6, 'e'); break;
        case 'E': str += convertFloatExp(padWidth, padChar, rightPad, plusSign, getarg(argz, p), precision >= 0 ? precision : 6, 'E'); break;
        case 'g': str += convertFloatG(padWidth, padChar, rightPad, plusSign, getarg(argz, p), precision >= 0 ? precision : 6, 'e'); break;
        case 'G': str += convertFloatG(padWidth, padChar, rightPad, plusSign, getarg(argz, p), precision >= 0 ? precision : 6, 'E'); break;

        // string types
        case 'c': str += String.fromCharCode(getarg(argz, p)); break;
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
            throw new Error(fmt.slice(p0, p+1) + ": unsupported conversion %" + fmt[p] + " at offset " + p);
        }
        p0 = ++p;
    }
    return (p0 === 0) ? fmt : (p0 < fmt.length) ? str + fmt.slice(p0) : str;
}


function getarg( argz, p ) {
    if (argz.argN !== undefined) return argz.argN;
    if (argz.argi >= argz.nargs) throw new Error("missing argument for %" + argz.fmt[p] + " conversion at offset " + p);
    return argz.argv[argz.argi++];
}

function setargN( argz, n, p ) {
    if (n > argz.nargs) throw new Error("missing i-th argument " + n + "$ for % conversion at offset " + p);
    // negative n never passed in, scanDigits does not handle minus sign
    // if (n < 1) throw new Error("invalid $ argument specifier for % conversion");
    return argz.argN = argz.argv[n-1];
}

function setargM( argz, name, p ) {
    var hash = argz.argN ? argz.argN : argz.argv[0];
    if (hash[name] === undefined) throw new Error("missing named argument %(" + name + ") at offset " + p);
    return argz.argN = hash[name];
}

function scanAndSetArgName( fmt, p, argz ) {
    var q = fmt.indexOf(')', ++p);
    if (q < 0) throw new Error("unterminated %(named) argument at offset " + p);
    var argName = fmt.slice(p, q);
    setargM(argz, argName, p);
    return p = q + 1;
}

// it is faster to not return anything from this function
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

function formatExp( exp, e ) {
    return (
        (exp <= -10) ? e+"-" + -exp :
        (exp < 0) ? e+"-0" + -exp :
        (exp >= 10) ? e+"+" + exp :
        (exp > 0) ? e+"+0" + exp :
        e+"+00"
    );
}

function convertFloatExp( width, padChar, rightPad, signChar, v, precision, eSym ) {
    var exp = 0;
    if (v < 0) { signChar = "-"; v = -v }

    // TODO: find a faster way of computing the exponent, maybe Math.log10
    // eg something like Math.log(v) / Math.log(10), except .1 => -0.999...998
    if (v >= 10) {
        while (v > 10000) { exp += 4; v *= .0001 }
        while (v >= 10) { exp += 1; v *= .1 }
    }
    else if (v < 1) {
        while (v < .0001) { exp -= 4; v *= 10000 }
        while (v < 1) { exp -= 1; v *= 10 }
    }

    return padNumber(width, padChar, rightPad, signChar, v, formatFloat(v, precision) + formatExp(exp, eSym));
}

function convertFloatG( width, padChar, rightPad, signChar, v, precision, eSym ) {
    // if the exponent is >= -4 and < precision, format as a float %f
    if (v >= .0001 && v < pow10(precision)) return convertFloat(width, padChar, rightPad, signChar, v, precision);

    // otherwise format as an exponential %e
    return convertFloatExp(width, padChar, rightPad, signChar, v, precision, eSym);
}

function padNumber( width, padChar, rightPad, signChar, v, numberString ) {
    if (v < 0) signChar = '-';
    return (signChar && padChar === '0')
        ? signChar + padValue(width - 1, padChar, rightPad, numberString)
        : padValue(width, padChar, rightPad, signChar + numberString);
}

/**
function formatFloatOriginal( v, precision ) {
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
**/

// streamlined version of the above, to fit into 600 chars
// works for positive values only, but thats all we use
function formatFloat( v, precision ) {
    if (precision <= 0) return Math.floor(v + 0.5).toString(10);

    var scale = pow10(precision);
    v += (0.5 / scale);    // round to convert
    var i = Math.floor(v); // all digits of the integer part
    var f = Math.floor((v - i) * scale);  // first `precision` digits of the fraction
    // TODO: large i and large precision format as eg 1+42

    var s = i + "." + padValue(precision, '0', false, f + '');
    return s;
}

// 10^n optimized for small integer values of n
var _pow10 = new Array(40); for (var i=0; i<_pow10.length; i++) _pow10[i] = Math.pow(10, i);
function pow10( n ) {
    return _pow10[n] ? _pow10[n] : Math.pow(10, n);
}

function formatObject( obj, depth ) {
    return util.inspect(obj, {depth: depth !== undefined ? depth : 6});
}

function formatArray( arr, elementLimit, depth ) {
    if (!elementLimit || arr.length <= elementLimit) return util.inspect(arr, depth);
    else return util.inspect(arr.slice(0, elementLimit), depth).slice(0, -2) + ", ... ]";
}
