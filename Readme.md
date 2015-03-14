qprintf
=======

quick little printf-like output formatter, interpolates the arguments into the
format string and writes them to process.stdout. Recognizes more formats than
console.log, and is easier to type.

        npm install qprintf

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
`(-?)(0?)([1-9][0-9]*)`.  E.g., `%20d` will interpolate a number into a field
20 characters wide.  If the value is wider then the field width, it will not
be truncated.  The truncating field width specifier `'.'` is not supported.

- `-` - left-align the value in the field
- `0` - zero pad the field (default is to pad with spaces)
- `NNN` - a decimal integer that specifies the field width

As a special case, the field width of a %O conversion is taken to be the depth
for util.inspect to recurse down to.  TODO: use a %A field width as the count
of array elements to print.

Examples

        ("%5d", 123)            => "  123"
        ("0x%04x", 123)         => "0x007b"
        ("%10s", "Hello")       => "     Hello"
        ("%-10s", "Hello")      => "Hello     "


## Functions

### printf( format, [arg ...] )

interpolate the arguments into the format string, and write the result to
process.stdout

### sprintf( format, [arg ...] )

interpolate the arguments into the format, and return the result

### vsprintf( format, args )

interplate the arguments array into the format string, and return the result


## Related Work

- [printf](https://npmjs.org/package/printf) is a complete printf with lots of extensions, but slow
- [sprintf-js](https://npmjs.org/package/sprintf-js) is a complete printf with some useful extensions, and ok fast
