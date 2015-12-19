qprintf
=======

quick little printf-like output formatter, interpolates the arguments into the
format string and writes them to process.stdout. Recognizes more formats than
console.log, and is easier to type.

        npm install qprintf
        npm test qprintf

## Conversions

qprintf supports the following conversions:

- `%s` - interpolate a string into the output
- `%d` - a decimal number.  Unlike traditional `printf`, this will print floats as floats.
- `%f` - a floating-point value
- `%i` - a decimal integer.  The integer conversions truncate the value.
- `%x` - a hexadecimal integer
- `%o` - an octal integer
- `%b` - a binary integer
- `%c` - the character represented by the given unicode code point
- `%%` - the `%` escape character itself
- `%A` - an array formatted with util.inspect
- `%O` - an object formatted with util.inspect to depth: 6

Printf supports basic conversion flags for field width control, per the regex
`(-?)(0?)([1-9][0-9]*[.]?[0-9]*)`.  E.g., `%20d` will interpolate a number into a field
20 characters wide.  If the value is wider then the field width, it will not
be truncated.  The precision specifier `'.'` is supported for strings and numbers.

The conversion specifier is constructed as (values in [ ] square brackets are optional)
`% [argNum $] [minusFlag] [zeroFlag] [width [.precision]] conversion`
Examples: `%d`, `%10d`, `%2$d`, `%2$-010d`.

- `I$` - argNum: interpolate the I-th argument with this conversion
- `-` - minusFlag: left-align the value in the field
- `0` - zeroFlag: zero pad the field (default is to pad with spaces)
- `NNN` - width: a decimal integer that specifies the field width
- `NNN.PP` - width.precision: a decimal field width followed by the precision

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

        sprintf("%s %04d %s", "Hello", 123, "world")

        // printf 100k 'Hello 0123 world' ms:  1179
        // sprintfjs 100k 'Hello 0123 world' ms:  191
        // qsprintf 100k 'Hello 0123 world' ms:  92
        

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
- [sprintf-js](https://npmjs.org/package/sprintf-js) is a complete printf with extensions, and ok fast.  Easy to speed up another 30%.


## Todo

- should be possible to specify both field width and element count to `%A`
