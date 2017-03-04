qprintf
=======

Very quick little printf-like output formatter, interpolates the arguments into the
format string and writes them to process.stdout. Recognizes more formats than
console.log, and is easier to type.

    npm install qprintf
    npm test qprintf

## Conversions

qprintf supports the following conversions:

- `%s` - interpolate a string into the output
- `%d` - a decimal number.  Unlike traditional `printf`, this conversion behaves
like `util.format` and prints floats as floats.  Use `%i` to truncate to integer.
- `%f` - a floating-point value
- `%i` - a decimal integer.  The integer conversions truncate the value toward zero (like php).
- `%x` - a hexadecimal integer
- `%o` - an octal integer
- `%b` - a binary integer
- `%c` - the character represented by the given unicode code point
- `%%` - the `%` escape character itself
- `%A` - an array formatted with util.inspect
- `%O` - an object formatted with util.inspect to depth: 6

Printf supports basic conversion flags for field width control.
The conversion specifier is constructed as (values in [ ] square brackets are optional)
`% [argNum $] [minusFlag] [zeroFlag] [plusFlag] [spaceFlag] [width [.precision]] conversion`
Examples: `%d`, `%10d`, `%2$d`, `%2$-010d`.

- `I$` - argNum: interpolate the I-th argument with this conversion
- `-` - minusFlag: left-align the value in the field
- `0` - zeroFlag: zero pad the field (default is to pad with spaces)
- `+` - plusFlag: always print the sign, + for positive and - for negative
- ` ` - spaceFlag: always print the sign, ' ' (space) for positive and - for negative
- `NNN` - width: a decimal integer that specifies the field width
- `NNN.PP` - width.precision: a decimal field width followed by the precision
- `C` - conversion: conversion type specifier character

E.g., `%3$+12d` will interpolate the 3rd argument into a field 12 characters wide,
preceded by the sign (+ for positive and - for negative), and padded with enough
spaces on the right for the formatted value to be at least 12 characters.  If the
value with sign is wider then the field width of 12, it will not be truncated,
rather more than 12 characters will be output.

The precision specifier `'.'` is supported for strings and numbers.  For numbers,
`.N` prints a decimal point followed by exactly N decimal digits.  `.` and `.0`
omit the decimal point and prints no decimals.  For strings, the precision
specifies the maximum number of characters of the string included in the output.

The field width of a %O conversion is taken to be the depth for util.inspect
to recurse down to.  Specify 0 to not recurse into sub-objects.

The field width of a %A coversion is taken to be the number of elements to
show.

Unlike C, zero padding uses zeroes for left-aligned numbers and strings as well.

## Examples

    var qprintf = require('qprintf')
    var sprintf = qprintf.sprintf

    sprintf("%5d", 123)             => "  123"
    sprintf("%5.2f", 1.238)         => " 1.24"
    sprintf("%05x", 123)            => "0007b"
    sprintf("%10s", "Hello")        => "     Hello"
    sprintf("%-10s", "Hello")       => "Hello     "
    sprintf("%O", {a:1,b:2})        => "{ a: 1, b: 2 }"
    sprintf("%2A", [1,2,3,4])       => "[ 1, 2, ... ]"

## Benchmark

The included benchmark loops 100,000 times and formats the test string.

node-v0.10:

    sprintf("%s %04d %s", "Hello", 123, "world")

    // printf-0.2.3 100k 'Hello 0123 world' ms:  1138
    // sprintf-js-1.0.3 100k 'Hello 0123 world' ms:  593
    // sprintf-js-git 100k 'Hello 0123 world' ms:  301
    // qprintf-0.4.1 100k 'Hello 0123 world' ms:  86
    // qprintf-0.7.2 100k 'Hello 0123 world' ms:  68
    
Under node v6.0.0 and up sprintf-js runs much slower than before.
Check the git repo before using sprintf-js, it has not been published to npm since July 2015
(a year ago) and the version in the repo contains some major performance optimizations.

node-v6.2.1:

    sprintf("%s %04d %s", "Hello", 123, "world")

    // printf-0.2.5 100k 'Hello 0123 world' ms:  1571
    // sprintf-js-1.0.3 100k 'Hello 0123 world' ms:  1007
    // extsprintf-1.3.0 100k 'Hello 0123 world' ms:  893
    // sprintf-js-git 100k 'Hello 0123 world' ms:  467
    // qprintf-0.7.2 100k 'Hello 0123 world' ms:  46
    // qprintf-0.8.0 100k 'Hello 0123 world' ms:  44

Newer benchmarks, this time on a 4520 MHz i7-6700k (the previous runtimes were on a
3600 GHz Phenom II):

node-v6.2.1:

    sprintf("%s %04d %s", "Hello", 123, "world")

    // printf-0.2.5 100k 'Hello 0123 world' ms:  612
    // sprintfjs-1.0.3 100k 'Hello 0123 world' ms:  523
    // extsprintf-1.3.0 100k 'Hello 0123 world' ms:  372
    // sprintf-0.1.5 100k 'Hello 0123 world' ms:  336
    // qsprintf-0.8.0 100k 'Hello 0123 world' ms:  21
    // qsprintf-0.9.2 100k 'Hello 0123 world' ms:  17

node-v7.5.0:

    sprintf("%s %04d %s", "Hello", 123, "world")

    // printf-0.2.5 100k 'Hello 0123 world' ms:  589
    // sprintfjs-1.0.3 100k 'Hello 0123 world' ms:  169
    // extsprintf-1.3.0 100k 'Hello 0123 world' ms:  342
    // sprintf-0.1.5 100k 'Hello 0123 world' ms:  113
    // qsprintf-0.8.0 100k 'Hello 0123 world' ms:  23
    // qsprintf-0.9.2 100k 'Hello 0123 world' ms:  17

## Functions

### qprintf.printf( format, [arg ...] )

interpolate the arguments into the format string, and write the result to
process.stdout

### qprintf.sprintf( format, [arg1, arg2, ...] )

interpolate the arguments into the format, and return the result

### qprintf.vsprintf( format, argsArray )

interplate the arguments array into the format string, and return the result


## Related Work

- [printf](https://npmjs.org/package/printf) is a complete printf with extensions, but slow
- [sprintf-js](https://npmjs.org/package/sprintf-js) is a complete printf with extensions, also slow
- [extsprintf](https://npmjs.org/package/extsprintf) a limited printf, also slow
- [qprintf](https://github.com/andrasq/node-qprintf) this one


## Todo

- should be possible to specify both field width and element count to `%A`
- %X (uppercase hexadecimal) is not supported yet
- %e, %g, %E and %G are not supported yet

