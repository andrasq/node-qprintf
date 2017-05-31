/**
 * very quick printf-like string interpolator
 *
 * Implements all traditional C printf conversions, including field widths,
 * precision, and very large numbers.
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
module.exports.lib = {
    scanDigits: scanDigits,
    scanAndSetArgName: scanAndSetArgName,

    str_repeat: str_repeat,
    padString: padString,
    padLeft: padLeft,

    convertIntegerBase10: convertIntegerBase10,
    convertIntegerBase: convertIntegerBase,
    convertFloat: convertFloat,
    convertFloatG: convertFloatG,
    convertFloatExp: convertFloatExp,

    formatNumber: formatNumber,
    formatFloat: formatFloat,
    formatFloatMinimal: formatFloatMinimal,
    formatFloatTruncate: formatFloatTruncate,

    pow10: pow10,
    pow10n: pow10n,
    _normalizeExp: _normalizeExp,
    _formatExp: _formatExp,
    countLeadingZeros: countLeadingZeros,
    countDigits: countDigits,
    countTrailingZeros: countTrailingZeros,
};

if (typeof require === 'function') {
    var util = require('util');
}

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
var CH_STAR = '*'.charCodeAt(0);
var CH_A = 'A'.charCodeAt(0);
var CH_L = 'L'.charCodeAt(0);
var CH_l = 'l'.charCodeAt(0);
var CH_h = 'h'.charCodeAt(0);


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

    var ch, p0 = 0, p = 0, str = "";
    var scanned = { end: undefined, val: undefined };

    while (p < fmt.length) {
        if (fmt.charCodeAt(p) != 0x25) { p++; continue; }       // scan until %
        if (p > p0) str += fmt.slice(p0, p);
        p++;
        // reset format for each conversion
        resetargN(argz);
        var padChar = ' ', rightPad = false, plusSign = '';
        var padWidth = undefined, precision = undefined;

        //
        // parse the conversion spec
        // `% [argNum$] [(argName)] [flags +|-| |0] [width][.precision] [modifier l|ll|h|hh|L] conversion`,
        //

        var checkForWidth = true;
        var ch;

        // if not a conversion char, must be flags
        ch = fmt.charCodeAt(p);
        if (ch < CH_A) {
            if (ch >= 0x30 && ch <= 0x39) {
                scanDigits(fmt, p, scanned);
                if (scanned.end > p) {
                    if (fmt.charCodeAt(scanned.end) === CH_DOLLAR) {
                        // found an N$ arg specifier, but might also have width
                        if (!scanned.val) throw new Error("missing $ argument at offset " + p);
                        setargN(argz, scanned.val, p);
                        p = scanned.end + 1;
                        if (fmt.charCodeAt(p) === CH_LEFTPAREN) p = scanAndSetArgName(argz, fmt, p);
                    }
                    else {
                        // found field width, with at most a numeric '0' flag
                        if (fmt.charCodeAt(p) === CH_0) padChar = '0';
                        padWidth = scanned.val;
                        p = scanned.end;
                        if (fmt.charCodeAt(p) >= CH_A) checkForWidth = false; // 'A' or above is conversion spec
                    }
                }
            }
            else if (ch === CH_LEFTPAREN) {
                p = scanAndSetArgName(argz, fmt, p);
            }

            if (checkForWidth) {
                // look for flags
                while (true) {
                    // this switch is faster with charcodes
                    ch = fmt.charCodeAt(p);
                    switch (ch) {
                    case CH_MINUS: rightPad = true; p++; continue;
                    case CH_0: padChar = '0'; p++; continue;
                    // '+' to always print sign, ' ' to print - for neg and ' ' for positive
                    case CH_PLUS: plusSign = '+'; p++; continue;
                    case CH_SPACE: plusSign = ' '; p++; continue;
                    }
                    // if reached here end of flags, break out of loop
                    break;
                }
                // gather width, if any
                if (ch === CH_STAR) {
                    padWidth = getwidth(argz, p);
                    p++;
                }
                else if (padWidth === undefined) {
                    scanDigits(fmt, p, scanned);
                    if (scanned.end > p) {
                        padWidth = scanned.val;
                        p = scanned.end;
                    }
                }
            }

            // look for precision, if any
            if (fmt.charCodeAt(p) === CH_DOT) {
                if (fmt.charCodeAt(p+1) === CH_STAR) {
                    precision = getwidth(argz, p+1);
                    p += 2;
                }
                else {
                    scanDigits(fmt, p+1, scanned);
                    precision = scanned.val;
                    p = scanned.end;
                }
            }
        }
        // p left pointing to the conversion specifier character


        // skip conversion modifiers
        var ch = fmt.charCodeAt(p);
        if (ch === CH_l || ch === CH_h || ch === CH_L) {
            p++;
            if (fmt.charCodeAt(p) === CH_l || fmt.charCodeAt(p) === CH_h) p++;
        }

        // if not followed by a conversion specifier, print it as is
        if (p >= fmt.length) break;

        //
        // the conversion itself
        // this switch is faster with chars, not charcodes
        // fall-through cases run 5% slower
        //
        switch (fmt[p]) {
        // integer types
        // we truncate integers toward zero like php, ie -1.9 prints as -1
        case 'd': str += convertIntegerBase10(padWidth, padChar, rightPad, plusSign, getarg(argz, p)); break;
        case 'i': str += convertIntegerBase(padWidth, padChar, rightPad, plusSign, getarg(argz, p), 10); break;
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
            if (precision !== undefined) str += padString(padWidth, padChar, rightPad, (getarg(argz, p) + "").slice(0, precision));
            else str += padString(padWidth, padChar, rightPad, getarg(argz, p));
            break;

        // the escape character itself
        case '%': str += padString(padWidth, padChar, rightPad, '%'); break;

        case 'n':
            var cb = getarg(argz, p);
            cb(str.length);
            break;

        // qnit extensions
        case 'A':
            // the '0' in %0f and %0.3f is a field width, not a flag for zero padding
            // this matters for arrays and objects, but does not affect numbers
            // (because a zero-width field will have no padding)
            if (padChar === '0' && padWidth === undefined) padWidth = 0;
            str += formatArray(getarg(argz, p), padWidth, precision);
            break;
        case 'O':
            if (padChar === '0' && padWidth === undefined) padWidth = 0;
            str += formatObject(getarg(argz, p), padWidth, precision);
            break;

        default:
            throw new Error(fmt.slice(p0, p+1) + ": unsupported conversion %" + fmt[p] + " at offset " + p);
        }
        p0 = ++p;
    }
    return (p0 === 0) ? fmt : (p0 < fmt.length) ? str + fmt.slice(p0) : str;
}


// return the next positional argument
// positional indexing can be one-shot overridden by setting argz.argN
function getarg( argz, p ) {
    if (argz.argN !== undefined) return argz.argN;
    if (argz.argi >= argz.nargs) throw new Error("missing argument for %" + argz.fmt[p] + " conversion at offset " + p);
    return argz.argv[argz.argi++];
}

function getwidth( argz, p ) {
    if (argz.argi >= argz.nargs) throw new Error("missing argument for %* width/precision at offset " + p);
    return argz.argv[argz.argi++];
}

function resetargN( argz ) {
    argz.argN = undefined;
}

// override the next argument with argv[n]
function setargN( argz, n, p ) {
    if (n > argz.nargs) throw new Error("missing i-th argument " + n + "$ for % conversion at offset " + p);
    // negative n never passed in, scanDigits does not handle minus sign
    // if (n < 1) throw new Error("invalid $ argument specifier for % conversion");
    return argz.argN = argz.argv[n-1];
}

// override the next argument with argv[0][name], or argv[argN][name]
function setargM( argz, name, p ) {
    var hash = argz.argN ? argz.argN : argz.argv[0];
    if (hash[name] === undefined) throw new Error("missing named argument %(" + name + ") at offset " + p);
    return argz.argN = hash[name];
}

// scan a decimal number from the string, and update the next-unscanned-char offset
// it is faster to not return anything from this function
function scanDigits( str, p, ret ) {
    var ch, val = 0;
    for (var p2=p; (ch = str.charCodeAt(p2)) >= 0x30 && ch <= 0x39; p2++) {
        val = val * 10 + ch - 0x30;
    }
    ret.end = p2;
    ret.val = val;
}

// scan a )-terminated word from the string, update setargM, and update the next-unscanned-char offset
function scanAndSetArgName( argz, fmt, p ) {
    var q = fmt.indexOf(')', ++p);
    if (q < 0) throw new Error("unterminated %(named) argument at offset " + p);
    var argName = fmt.slice(p, q);
    setargM(argz, argName, p);
    return p = q + 1;
}

var _pads = {
  ' ': [ '', ' ', '  ', '   ', '    ', '     ', '      ', '       ', '        ' ],
  '0': [ '', '0', '00', '000', '0000', '00000', '000000', '0000000', '00000000' ],
}
function str_repeat( str, n ) {
    if (n <= 8 && _pads[str]) return _pads[str][n];

    switch (n) {
    case 2: return str + str; break;
    case 1: return str; break;
    case 0: return ''; break;
    default:
        var half = Math.floor(n / 2);
        var s2 = str_repeat(str, half);
        return (half + half < n) ? s2 + s2 + str : s2 + s2;
    }
}

function padString( padWidth, padChar, rightPad, str ) {
    if (!padWidth) return str;
    var n = padWidth - str.length;
    if (n <= 0) return str;
    return rightPad ? str + str_repeat(padChar, n) : str_repeat(padChar, n) + str;
}
function padLeft( str, ch, width ) {
    return padString(width, ch, false, str);
}
function padRight( str, ch, width ) {
    return padString(width, ch, true, str);
}

function convertIntegerBase10( width, padChar, rightPad, signChar, v ) {
    if (v < 0) { signChar = '-'; v = -v; }
    return (v <= 1e-6 || v >= 1e20)
        ? padNumber(width, padChar, rightPad, signChar, 0, formatNumber(v))
        : padNumber(width, padChar, rightPad, signChar, 0, Math.floor(v) + "");
}

function convertIntegerBase( width, padChar, rightPad, signChar, v, base ) {
    if (v < 0) { signChar = '-'; v = -v; }
    return (base === 10 && (v <= 1e-6 || v >= 1e20))
        ? padNumber(width, padChar, rightPad, signChar, 0, formatNumber(v))
        : padNumber(width, padChar, rightPad, signChar, 0, Math.floor(v).toString(base));
}

// convert to %f notation
function convertFloat( width, padChar, rightPad, signChar, v, precision ) {
    if (v < 0) { signChar = '-'; v = -v; }
    return padNumber(width, padChar, rightPad, signChar, 0, formatFloat(v, precision));
}

function _formatExp( exp, e ) {
    return (
        (exp <= -10) ? e+"-" + -exp :
        (exp < 0)    ? e+"-0" + -exp :
        (exp >= 10)  ? e+"+" + exp :
                       e+"+0" + exp
    );
}

// Convert the number into exponential notation.  90m/s
// Populates and returns the _ve struct with the value >= 1 (unless 0) and exponent.
// (old version looped multiplies by powers of 10, but that introduces rounding errors)
var _ve = { val: 0, exp: 0 };
function _normalizeExp( v ) {
    if (v >= 10) {
        var shiftDecimals = countDigits(v) - 1;
        _ve.exp = shiftDecimals;
        _ve.val = shift10r(v, shiftDecimals);
    }
    else if (v >= 1) {
        _ve.exp = 0;
        _ve.val = v;
    }
    else if (v) {
        var shiftDecimals = countLeadingZeros(v) + 1;
        _ve.exp = -shiftDecimals;
        _ve.val = shift10l(v, shiftDecimals);
    }
    else {
        _ve.exp = 0;
        _ve.val = 0;
    }
    return _ve;
}

// convert to %e exponential notation
function convertFloatExp( width, padChar, rightPad, signChar, v, precision, eSym ) {
    if (v < 0) { signChar = "-"; v = -v }
    if (precision === undefined) precision = 6;

    var ve = _normalizeExp(v);
    return padNumber(width, padChar, rightPad, signChar, 0, formatFloat(ve.val, precision) + _formatExp(ve.exp, eSym));
}

// convert to either %f float or %e exponential notation, depending on magnitude
// if the exponent is >= -4 and < precision, format as a float %f, else %g
// The %g precision is the number of digits to print, ie ("%.3g", 1234) => "1.23e+03"
// (but: %e precision controls the number of decimals)
// Also, leading zeroes in very small numbers are ok, ie .00123456 => "0.00123456" and not 1.23456e-03.
function convertFloatG( width, padChar, rightPad, signChar, v, precision, eSym ) {
    if (v < 0) { signChar = "-"; v = -v }
    if (precision === undefined) precision = 6;
    else if (precision === 0) precision = 1;

    // pre-round v for magnitude test to know when to convert as a float.
    // Since rouding is expensive, only round here if likely to be needed
    var roundv;
    if (!v) return "0";
    if (v >= 1 && v < pow10(precision)) {
        var ndigits = countDigits(v);
        roundv = (precision > ndigits)
            ? roundv = v + pow10n(precision - ndigits) / 2
            : roundv = v + pow10(ndigits - precision) / 2;
    }
    else if (v < 1 && v >= .000004) {
        var zeros = countLeadingZeros(v);
        roundv = v + pow10n(precision + zeros) / 2;
    }
    // else will be converted as exponential, which is rounded below

    // values between .0001 and 10^precision are converted as %f float
    // with trailing zeros omitted
    if (roundv >= .0001 && roundv < pow10(precision)) {
        // 123.4567 prec=4 at 12.6m/s
        // (123.4567e5).toPrecision(4) 5.8m/s
        if (roundv && roundv < 1) {
            precision += countLeadingZeros(v);
            var s = formatFloatTruncate(roundv, precision, true, false);
        }
        else {
            precision -= countDigits(roundv);
            var s = formatFloatTruncate(roundv, precision, true, false);
        }
        return padNumber(width, padChar, rightPad, signChar, 0, s);
    }
    // values outside the range .0001 to 10^precision are converted as %e exponential
    // with trailing zeros omitted
    else if (v) {
        // 123.4567 prec=2 at 10.6m/s
        // exponential notation, round once converted, correct any overflow
        var ve = _normalizeExp(v);
        ve.val += pow10n(precision - 1) / 2;
        if (ve.val >= 10) { ve.val /= 10; ve.exp += 1 }

        // keep the leading digit and precision-1 following, truncate the rest
        var s = formatFloatTruncate(ve.val, precision-1, true, false) + _formatExp(ve.exp, eSym);
        return padNumber(width, padChar, rightPad, signChar, 0, s);
    }
    else return "0";
}

// apply sign, left/right space/zero padding to the string
function padNumber( width, padChar, rightPad, signChar, v, numberString ) {
    if (v < 0) signChar = '-';
    return (signChar && padChar === '0')
        ? signChar + padString(width - 1, padChar, rightPad, numberString)
        : padString(width, padChar, rightPad, signChar + numberString);
}

// note: both C and PHP render ("%5.2f", 1.275) as "1.27", because of the IEEE representation
function formatFloatMinimal( v, precision, minimal ) {
// never called with negative v, omit code handling negatives
//    if (precision === undefined) return v.toString(10);

    // 0 decimal digits also omits the decimal point
    if (precision <= 0) return v < 1e20 ? Math.floor(v + 0.5).toString(10) : formatNumber(Math.floor(v + 0.5));

    // avoid surprises, work with positive values
//    var neg = (v < 0);
//    if (v < 0) v = -v;

    var scale = pow10(precision);
    v += (0.5 / scale);                         // round to convert
    var i = Math.floor(v);                      // all digits of the integer part
    var f = Math.floor((v - i) * scale);        // first `precision` digits of the fraction

    // if minimal, trim trailing decimal zeroes
    if (minimal) while (f && f % 10 === 0) {
        f = Math.floor(f / 10);
        precision -= 1;
    }

    if (i > 1e20) i = formatNumber(i);
    if (minimal && f === 0) return i.toString();

    if (precision > 20) f = formatNumber(f);

    var s = i + "." + padLeft(f + '', '0', precision);
//    return neg ? ("-" + s) : s;
    return s;
}

// format a %g float that has been rounded at the right decimal place
// %g expects trailing zeros to be dropped, so truncation is the default
// 24m/s small, 10m/s large, 2.5m/s (limit is formatNumber)
// Split into two half-functions for better v8 optimization and inlining.
// Note: in node, 2.10 + 5e-17 === 2.10
//       (ie, 2.10000000000000008882 + 0.00000000000000005000 === 2.10000000000000008882)
function formatFloatTruncate( v, precision, trim, round ) {
    if (precision <= 0) { if (round) v += 0.5;
        return v < 1e20 ? Math.floor(v).toString(10) : formatNumber(Math.floor(v));
    }
    var scale = pow10(precision);
    var i = Math.floor(v);
    var f = ((v - i) * scale);
// FIXME: 0.30 = 0.30000000000000004441, *1e20 is ...00004096.00, but *1e16 is ...0000.500 (rounds wrong)
    var f = round ? Math.floor(f + 0.5) : Math.floor(f);
    if (f >= scale) { f -= scale; i += 1 }

    return constructFixed(i, f, precision, trim);
}
function constructFixed( i, f, precision, trim ) {
    if (f && trim && !(f % 10)) {
        var n = countTrailingZeros(f);
        if (n) {
            f = shift10r(f, n);
            precision -= n;
        }
    }

    if (i > 1e20) i = formatNumber(i);
    if (trim && !f) return i.toString();

    if (precision > 20) f = formatNumber(f);

    var s = i + "." + padLeft(f + '', '0', precision);
    return s;
}

// streamlined version of the above, to fit into 600 chars
// works for positive values only, but thats all we use
function formatFloat( v, precision ) {
    // hand-rolled convert is same speed and more consistent than v.toFixed()
    return formatFloatTruncate(v, precision, false, true);
}

// convert a very large number to a string.  Note that a 64-bit float
// has only about 16 digits (53 bits) precision.    
// C    => 1000000000000000044885712678075916785549312
// php  => 1000000000000000044885712678075916785549312
// ours => 1000000000000000000222784838656961984549312 (1e6, both as /= 1e6 and *= 1e-6)
// (actual difference bounces all over depending on the value, eg)
//         69999999999999991808402112386240906176108672 (7e43 with 1e6)
// 7e43 nodejs => 700000000000000131072xxxxxxxxxxxxxxxxxxxxxxx
// 7e43 php    => 70000000000000002213544858001278968814108672
// TODO: find a more accurate way of converting to decimal,
// this has 10x the error of C/php.  Perhaps could toString(20) and
// convert base 20 to 10 with carry-outs.  Or use toFixed() for
// the first 15 digits and zero-pad the rest.
// Note:  node 1e42 / 1e22 => 100000000000000020000. (20 dig prec)
function formatNumber_2( n ) {
    var digits = countDigits(n);
    if (digits <= 20) return n.toFixed(0);
    if (digits >= 310) return "Infinity";
    var omitDigits = digits - 1 - 15;
    n = n * pow10n(omitDigits);
    return Math.floor(n).toFixed(0) + str_repeat('0', omitDigits);
}
///** old version:
function formatNumber( n ) {
    if (n === Infinity) return "Infinity";
    var parts = new Array();
    while (n > 1e6) {
        parts.push(padLeft((Math.floor(n) % 1e6) + '', '0', 6));
        n *= 1e-6;
    }
    if (n > 0) parts.push(Math.floor(n).toString(10));
    return parts.length > 1 ? parts.reverse().join('') : parts.length ? parts[0] : '0';
}
/**/

// 10^n for integer powers n.  Values >= 10^309 are Infinity.
// note: cannot initialize with *= 10, the cumulative rounding errors break the unit tests
var _pow10 = new Array(310); _pow10[0] = 1; for (var i=1; i<_pow10.length; i++) _pow10[i] = Math.pow(10, i);
function pow10( n ) {
    return _pow10[n] ? _pow10[n] : Math.pow(10, n);
}
// 10^-n for integer powers n.  Values <= 2.5e-324 are zero.
var _pow10n = new Array(325); for (var i=0; i<_pow10n.length; i++) _pow10n[i] = Math.pow(10, -i);
function pow10n( n ) {
    return _pow10n[n] ? _pow10n[n] : Math.pow(10, -n);
}
// find n for the largest 2^n that's smaller than cap
function pow2cap( cap ) {
    if (!cap) return 0;
    var i=0, p, p2;
    if (cap >= 1e6) i = 9;
    for ( ; (p = Math.pow(2, i)) <= cap; i++) {
        if (p === Infinity) break;
        p2 = p;
    }
    return p2;
}

// shift left/right by a power of 2 s.t. _shift10[n] * _shift10_adj[n] === _pow10[n]
var _shift10 = new Array(310);          var _shift10n = new Array(325);
var _shift10_adj = new Array(310);      var _shift10n_adj = new Array(325);
_shift10[0] = 1;                        _shift10n[0] = 1;
_shift10_adj[0] = 1;                    _shift10n_adj[0] = 1;
// mpy by 10^N by doing a mpy by 2^M then adjusting by mpy K s.t. 2^M * adj === 10^N.
// Should preserve more bits with less rounding error.
// TODO: populate the tables with optimal values
for (var i=1; i<_shift10.length; i++) {
    _shift10[i] = Math.pow(10, i);
    _shift10_adj[i] = 1;
    _shift10[i] = pow2cap(_pow10[i]);
    _shift10_adj[i] = _pow10[i] / _shift10[i];
}
for (var i=1; i<_shift10n.length; i++) {
    // FIXME: these are not powers of 10
    _shift10n[i] = Math.pow(2, -3*i);
    _shift10n_adj[i] = _pow10n[i] / _shift10n[i];
}
// shift v by n decimal places to the left (make bigger)
function shift10l( v, n ) {
    if (n > 323) return 0;
    return v * _shift10[n] * _shift10_adj[n];
}
// shift v by n decimal places to the right (make smaller)
function shift10r( v, n ) {
    if (n > 310) return Infinity;
    return v * _shift10n[n] * _shift10n_adj[n];
}


// return the count of zeros to the right of the decimal point in numbers less than 1.
// 175m/s if 0-3 zeros, 75m/s if more.
function countLeadingZeros( v ) {
    if (v >= .0001) return (v >= .01) ? ((v >= .1) ? 0 : 1) : ((v >= .001) ? 2 : 3);
    if (v) {
        var n = 3;
        while (v < _pow10n[n + 6]) n += 6;
        while (v < _pow10n[n + 3]) n += 3;
        while (v < _pow10n[n]) n += 1;
        // fix transition 1e-323 to zeros
        if (n === 323 && !_pow10n[n]) n++;
        return n - 1;
    }
    // 1e-324 (ie 323 leading zeros) is indinstinguishable from 0
    else return 323;
}

// Count of digits in the integer part of v.
// Used to find how many decimal digits to include in %g converions.
// Counts by comparing against known powers of ten, much faster
// than using v.toExponential().  105m/s if <1000, else 48m/s
function countDigits( v, power ) {
    if (v < 1000 && v > 1) return (v < 10) ? 1 : (v < 100) ? 2 : 3;
    var n = 0;
    while (_pow10[n + 6] <= v) n += 6;
    while (_pow10[n + 3] <= v) n += 3;
    while (_pow10[n] <= v) n += 1;
    return n;
}

// Count how many decimal zeros are at the end of the integer v.
// 90m/s
function countTrailingZeros( v ) {
    if (v < 10) return 0;
    if (v >= 1e309) return 308;
    var n = 0, e6 = _pow10n[6], e3 = _pow10n[3], e1 = 0.1;
    // TODO: rounding errors?
    while (Math.floor(v * e6) === Math.floor((v + 999999) * e6)) { n += 6; v *= e6 }
    while (Math.floor(v * e3) === Math.floor((v + 999) * e3)) { n += 3; v *= e3 }
    while (Math.floor(v * e1) === Math.floor((v + 9) * e1)) { n += 1; v *= e1 }
    return n;
}

function formatObject( obj, elementLimit, depth ) {
    if (elementLimit === undefined) elementLimit = Infinity;
    if (depth === undefined) depth = 6;
    if (util) {
        var options = { depth: depth, breakLength: Infinity };
        return util.inspect(obj, options);
    }
    else {
        return inspectObject(obj, elementLimit, depth);
    }
}

function formatArray( arr, elementLimit, depth ) {
    if (elementLimit === undefined) elementLimit = 40;
    if (depth === undefined) depth = 2;
    if (util) {
        var options = { depth: depth, breakLength: Infinity };
        if (arr.length <= elementLimit) return util.inspect(arr, options);
        else return util.inspect(arr.slice(0, elementLimit), options).slice(0, -2) + ", ... ]";
    }
    else {
        return inspectArray(arr, elementLimit, depth);
    }
}

function inspectObject( obj, elementLimit, depth ) {
    return "[Object]";
}

function inspectArray( arr, elementLimit, depth ) {
    return "'[Array]'";
}
