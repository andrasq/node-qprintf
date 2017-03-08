qprintf
=======

Qprintf is a very fast standard C `printf` compatible output formatter, supporting
the full set of integer, float, and string conversions with field width, alignment
and precision, along with some extensions.

Recognizes all traditional output conversions and modifiers (but not `%n` or `%p`).
Behavior follows closely that of C `printf`, including very large number support.

    var printf = require('qprintf').printf;
    printf("%s (%-7s) %05d!", "Hello", "world", 123);
    // => Hello (world  ) 00123!


## API

### qprintf.printf( format, [arg ...] )

Interpolate the arguments into the format string, and write the result to
`process.stdout`.

### qprintf.sprintf( format, [arg1, arg2, ...] )

Interpolate the arguments into the format, and return the result.

### qprintf.vsprintf( format, argsArray )

Interplate the arguments array into the format string, and return the result.


## Conversions

Traditional conversions:

- `%s` - interpolate a string into the output
- `%c` - the character (1-char string) represented by the given unicode code point
- `%d` - a decimal number.  Unlike traditional `printf`, this conversion behaves
like `util.format` and prints floats as floats.  Use `%i` to truncate to integer.
- `%i` - a decimal integer.  The integer conversions truncate the value toward zero (like php).
- `%x` - a hexadecimal integer printed using lowercase [0-9a-f]
- `%X` - a hexadecimal integer printed using uppercase [0-9A-F]
- `%o` - an octal integer
- `%u` - an unsigned integer.  The native JavaScript number is converted to
a 32-bit two's-complement unsigned integer with `>>>` and printed as %i.
- `%f` - a floating-point value "1.23" with integer part, decimal point, and fraction.
This conversion never generates exponential notation; use `%g` for that.
- `%e` - a number in exponential notation, eg "1.23e+02".
- `%E` - like %e but printed with a capital E, "1.23E+02"
- `%g` - a number in either %f or %e notation, depending on its size
- `%G` - like %g but in %f or %E notation
- `%%` - the `%` escape character itself

Qprintf extensions, additional conversions:

- `%b` - a binary integer, eg 13 => "1011"
- `%A` - an array formatted with `util.inspect`.  For arrays,
the field width is the number of elements to show (default 40),
and the precision is the depth to which to inspect each element (default 2).
- `%O` - an object formatted with `util.inspect` to `depth:6`.  For objects,
the field width is the number of properties to show (default all), and
the precision is the depth to which to inspect each element (default 6).
Only enumerable "own" properties are included.

Qprintf supports the conversion flags for field width, precision, alignment,
padding, sign, and argument selection.

The conversion specifier is constructed as
`% [argNum$] [(argName)] [flags] [width][.precision] [modif] conversion`,
with parts in [ ] square brackets optional.
Examples: `%d`, `%10ld`, `%2$d`, `%2$-010d`, `%4.2f`, `%2$(total)+4.3f`.

- `I$` - argNum: interpolate the i-th argument with this conversion
- `(NAME)` - argName: interpolate the named property (of the first argument, by default).
Named arguments can be be mixed with i-th arguments, but do not work well with positional arguments.
Named arguments are a `qprintf` extension.
- `-` - minusFlag: left-align the value in the field
- `0` - zeroFlag: zero pad the field (default is to pad with spaces)
- `+` - plusFlag: always print the sign, `+` for positive and `-` for negative
- ` ` - spaceFlag: always print the sign, ` ` (space) for positive and `-` for negative
- `NNN` - width: a decimal integer that specifies the field width.  If the width NNN is
specified as '*' (star), the next argument will be consumed and used as the width.
- `NNN.PP` - width.precision: a decimal field width followed by the precision.
If the precision PP is specified as '*' (star), the next argument will be consumed
and used as the precision.
- `.PP` - .precision: a decimal precision with a field width wide enough to fit
- `l`, `ll`, `h`, `hh`, `L` - modifier: allowed but ignored data size modifier, "long", "long long",
"short", "char" and "long double".  Invalid usage eg `%Ls` is not checked.
- `C` - conversion: conversion type specifier character

E.g., `%3$-+12d` will interpolate the 3rd argument into a field 12 characters wide,
preceded by the sign (+ for positive and - for negative), and padded with enough
spaces on the right for the formatted value to be at least 12 characters.  If the
value with sign is wider than the field width of 12, it will not be truncated,
rather more than 12 characters will be output.

The precision specifier `'.'` is supported for strings and numbers.  For numbers,
`.N` prints a decimal point followed by exactly N decimal digits.  `.` and `.0`
omit the decimal point and prints no decimals.  For strings, the precision
specifies the maximum number of characters of the string included in the output.

Unlike C, `%0` zero padding pads with zeroes on the right as well, both numbers and strings.

Unlike C, the `%g` and `%G` floating-point conversions do not remove trailing zeros
after the decimal point.


## Examples

    var qprintf = require('qprintf')
    var sprintf = qprintf.sprintf

    sprintf("%5d", 123)                 => "  123"
    sprintf("%5.2f", 1.238)             => " 1.24"
    sprintf("%05x", 123)                => "0007b"
    sprintf("%10s", "Hello")            => "     Hello"
    sprintf("%-10s", "Hello")           => "Hello     "
    sprintf("%O", {a:1,b:2})            => "{ a: 1, b: 2 }"
    sprintf("%2A", [1,2,3,4])           => "[ 1, 2, ... ]"
    sprintf("%.f", 12.345)              => "12"
    sprintf("%-*.2f", 7, 12.345)        => "12.35  "
    sprintf("%*.*f", 8, 3, 1.25)        => "   1.250"
    sprintf("%2$d", 1, 2)               => "2"
    sprintf("%(x).2f", {x: 1.234})      => "1.23"
    sprintf("%2$(x)-4d", {x:1}, {x:2})  => "2   "
    sprintf("%-33.f", 1e30)             => "1000000000000000000222784838656  "


## Benchmark

Comparative timings generated by the included `benchmark.js`.  The last column is the
speed of each relative to `printf`.  Extra whitespace was used to align the columns.

    // var fmt1 = "%s %d %s";
    // var z = sprintf(fmt1, "Hello", 123, "world");

    qtimeit=0.15.0 platform=linux kernel=3.16.0-4-amd64 cpuCount=8
    node=6.7.0 v8=5.1.281.83 arch=ia32 mhz=4523 cpu="Intel(R) Core(TM) i7-6700K CPU @ 4.00GHz" up_threshold=false
    name  speed  (stats)  rate
    printf-0.2.5      203,259 ops/sec (2 runs of 50k calls in 0.492 out of 0.528 sec, +/- 0.33%)   1000
    sprintfjs-1.0.3   238,435 ops/sec (2 runs of 50k calls in 0.419 out of 0.448 sec, +/- 0.03%)   1173
    extsprintf-1.3.0  295,572 ops/sec (3 runs of 50k calls in 0.507 out of 0.531 sec, +/- 0.06%)   1454
    sprintf-0.1.5     352,508 ops/sec (3 runs of 50k calls in 0.426 out of 0.446 sec, +/- 0.39%)   1734
    qprintf-0.12.0  7,452,214 ops/sec (3 runs of 1000k calls in 0.403 out of 0.448 sec, +/- 0.07%) 36664


## Related Work

- [printf](https://npmjs.org/package/printf) is a complete printf with extensions, but slow
- [sprintf-js](https://npmjs.org/package/sprintf-js) is a complete printf with extensions, also slow
- [extsprintf](https://npmjs.org/package/extsprintf) a limited printf, also slow
- [qprintf](https://github.com/andrasq/node-qprintf) this one


## Todo

- support js-only operation without losing 100% test coverage
- implement %n taking a callback instead of an `int*`
- factor out the low-level formatting into a separate file
