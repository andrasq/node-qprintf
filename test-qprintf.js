/**
 * Copyright (C) 2015-2017 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */

qprintf = require('./qprintf');
vsprintf = qprintf.vsprintf;
sprintf = qprintf.sprintf;

var lib = qprintf.lib;

module.exports = {
    before: function(done) {
        this.runTests = function( t, data ) {
            for (var i=0; i<data.length; i++) {
                if (Array.isArray(data[i][1]))
                    t.equal(vsprintf(data[i][0], data[i][1]), data[i][2], "on line " + i);
                else
                    t.equal(sprintf(data[i][0], data[i][1]), data[i][2], "on line " + i);
            }
        };
        done();
    },

    'package.json should be valid': function(t) {
        require('./package.json');
        t.done();
    },

    'should export printf': function(t) {
        t.equal(typeof qprintf.printf, 'function');
        qprintf.printf("", 1);
        t.done();
    },

    'sprintf should interpolate arg': function(t) {
        var s = qprintf.sprintf("[%04d %s]", 123, "abc");
        t.equal(s, "[0123 abc]");
        t.done();
    },

    'vsprintf should interpolate args array': function(t) {
        var s = qprintf.vsprintf("[%04d %s]", [123, "abc"]);
        t.equal(s, "[0123 abc]");
        t.done();
    },

    'printf should write to stdout': function(t) {
        var spy = t.spy(process.stdout, 'write', function(){});

        var uniq = (Math.random() * 0x100000000).toString(16);
        qprintf.printf("%d %s %s", 1, uniq, "2");
        spy.restore();

        t.deepEqual(spy.args[0], ["1 " + uniq + " 2"]);

        t.done();
    },

    'should interpolate strings': function(t) {
        var data = [
            // format, value(s), expected
            [ "%s", "foo", "foo" ],
            [ "(%s)", "foo", "(foo)" ],
            [ "A%sB%sC", ["foo", "bar"], "AfooBbarC" ],
            [ "%5s", "foo", "  foo" ],
            [ "%-6s", "foo", "foo   " ],
            [ "%6.2s", "foo", "    fo" ],
            [ "%-6.2s", "foo", "fo    " ],
            [ "%06.2s", "foo", "0000fo" ],
            [ "%-06.2s", "foo", "fo0000" ],
            [ "%.2s", "foo", "fo" ],
        ];
        t.expect(data.length);
        this.runTests(t, data);
        t.done();
    },

    'should implement flags': function(t) {
        var data = [
            [ "%d", 1, "1" ],
            [ "%04d", 0, "0000" ],
            [ "%04d", 1, "0001" ],
            [ "% 04d", 1, " 001" ],
            [ "%+04d", 1, "+001" ],
            [ "%-4d", 1, "1   " ],
            [ "%-04d", 1, "1000" ],     // TODO: should probably not right-pad with zeros

            [ "%.1f", 1, "1.0" ],
            [ "%05.1f", 1, "001.0" ],
            [ "% 05.1f", 1, " 01.0" ],
            [ "%+05.1f", 1, "+01.0" ],
            [ "%-5.1f", 1, "1.0  " ],
            [ "%-05.1f", 1, "1.000" ],  // TODO: right-pad with zeros??
        ];
        t.expect(data.length);
        this.runTests(t, data);
        t.done();
    },

    'should interpolate numbers': function(t) {
        var data = [
            [ "%d", 123, "123" ],
            [ "%05d", 0, "00000" ],
            [ "% 05d", -0, " 0000" ],
            [ "%+05d", -0, "+0000" ],
            [ "(%d)", 123, "(123)" ],
            [ "A%dB%dC", [123, 456], "A123B456C" ],
            [ "%5d", 123, "  123" ],
            [ "%05d", 123, "00123" ],
            [ "%-6d", 123, "123   " ],
            [ "%-06d", 123, "123000" ],         // note: C pads on right with spaces, not zeros
            [ "%6d", 123, "   123" ],
            [ "%06d", 123, "000123" ],
            [ "% 6d", 123, "   123" ],
            [ "%+6d", 123, "  +123" ],
            [ "%+06d", 123, "+00123" ],
            [ "%6d", -123, "  -123" ],
            [ "%06d", -123, "-00123" ],
            [ "% 6d", -123, "  -123" ],
            [ "%+6d", -123, "  -123" ],
            [ "%+06d", -123, "-00123" ],

            [ "%*d", [4, 1], "   1" ],
            [ "%-*d", [4, 1], "1   " ],
            [ "%-0*lld", [4, 1], "1000" ],
        ];
        t.expect(data.length);
        this.runTests(t, data);
        t.done();
    },

    'should truncate integers': function(t) {
        var tests = [
            [ "%d", 0.00, "0" ],
            [ "%d", 123.9, "123" ],
            [ "%d", -123.9, "-123" ],
            [ "%d", -1.9, "-1" ],
            [ "%i", -1.9, "-1" ],
            [ "%x", -1.9, "-1" ],
            [ "%d", -1e10-.9, "-10000000000" ],
        ];
        t.expect(tests.length);
        this.runTests(t, tests);
        t.done();
    },

    'should interpolate integers': function(t) {
        var data = [
            [ "%i", 12.5, "12" ],
            [ "%0i", 12, "12" ],
            [ "%5i", 12.5, "   12" ],
            [ "%5o", 12, "   14" ],
            [ "%5o", -12, "  -14" ],
            [ "%5x", 12, "    c" ],
            [ "%05x", 12, "0000c" ],
            [ "%+5x", 12, "   +c" ],
            [ "%+05x", 12, "+000c" ],
            [ "%5x", -12, "   -c" ],
            [ "%05x", -12, "-000c" ],
            [ "%+5x", -12, "   -c" ],
            [ "%+05x", -12, "-000c" ],
            [ "%5b", 12, " 1100" ],
            [ "%5i", -12.2, "  -12" ],
            [ "%05i", -12.2, "-0012" ],
            [ "%5x", -12.2, "   -c" ],
            [ "%05x", -12.2, "-000c" ],
            [ "%05X", -12.2, "-000C" ],

            [ "%u", -1, "" + 0xFFFFFFFF ],
            [ "%u", -16, "" + 0xFFFFFFF0 ],

            [ "%ld", 1, "1" ],
            [ "%lld", 1, "1" ],
            [ "%hd", 1, "1" ],
            [ "%hhd", 1, "1" ],
        ];
        t.expect(data.length);
        this.runTests(t, data);
        t.done();
    },

    'should interpolate floats': function(t) {
        var data = [
            [ "%f", 1.23, "1.230000" ],
            [ "%10f", 1.23, "  1.230000" ],
            [ "%-10f", 1.23, "1.230000  " ],
            [ "%+10f", 1.23, " +1.230000" ],
            [ "%-+10f", 1.23, "+1.230000 " ],
            [ "%-+010f", 1.23, "+1.2300000" ],

            [ "%5f", 1.23, "1.230000" ],
            [ "%7.4f", 1.23, " 1.2300" ],
            [ "%5.8f", 1.23, "1.23000000" ],
            [ "%5.f", 1.23, "    1" ],
            [ "%5.0f", 1.23, "    1" ],
            [ "%5.1f", 1.23, "  1.2" ],
            [ "%5.1f", -1.23, " -1.2" ],

            [ "%5.2f", 1.278, " 1.28" ],
            [ "%-5.2f", 1.278, "1.28 " ],
            [ "%05.2f", 1.278, "01.28" ],
            [ "%-05.2f", 1.278, "1.280" ],
            [ "%-05.3f", 1.278, "1.278" ],

            [ "%6.2f", 1, "  1.00" ],
            [ "%6.2f", -1, " -1.00" ],
            [ "%06.2f", 1, "001.00" ],
            [ "%6.2f", -1, " -1.00" ],
            [ "%-08.2f", -1, "-1.00000" ],
            // NOTE: C pads on right with spaces, not zeros

            [ "%7.2f", 1.278, "   1.28" ],
            [ "%07.2f", 1.278, "0001.28" ],
            [ "% 7.2f", 1.278, "   1.28" ],
            [ "% 07.2f", 1.278, " 001.28" ],
            [ "%+7.2f", 1.278, "  +1.28" ],
            [ "%+07.2f", 1.278, "+001.28" ],

            [ "%7.2f", -1.278, "  -1.28" ],
            [ "%07.2f", -1.278, "-001.28" ],
            [ "% 7.2f", -1.278, "  -1.28" ],
            [ "% 07.2f", -1.278, "-001.28" ],
            [ "%+7.2f", -1.278, "  -1.28" ],
            [ "%+07.2f", -1.278, "-001.28" ],

            [ "%.2Lf", 1.25, "1.25" ],
            [ "%.f", 1.25, "1" ],
            [ "%.f", 1.5, "2" ],
            [ "%.0f", 1.555, "2" ],
            [ "%.1f", 1.555, "1.6" ],
            [ "%.2f", 1.556, "1.56" ],  // storage artifact: 1.555 rounds to "1.55"
            [ "%4.0f", 1.666, "   2" ],
            [ "%4.1f", 1.666, " 1.7" ],
            [ "%4.2f", 1.666, "1.67" ],

            [ "%10f", [4, 1], "  4.000000" ],
            [ "%-*f", [10, 1], "1.000000  " ],
            [ "%-.*f", [2, 1], "1.00" ],
            [ "%.*f", [2, 1], "1.00" ],
            [ "%0*.4llf", [10, 1], "00001.0000" ],
            [ "%-*llf", [10, 1], "1.000000  " ],
        ];
        t.expect(data.length);
        this.runTests(t, data);
        t.done();
    },

    'should interpolate exponentials': function(t) {
        // echo '#include <stdio.h>\n main(){ printf("%e", 0.0); }' > t.c ; cc t.c ; a.out
        // php -r 'echo sprintf("%e\n", 0.0);'
        var data = [
            // basics
            [ "%e", 0, "0.000000e+00" ],
            [ "%e", 1, "1.000000e+00" ],
            [ "%e", -1, "-1.000000e+00" ],
            [ "%010.2e", 1, "001.00e+00" ],
            [ "%010.2e", -1, "-01.00e+00" ],

            [ "%E", 1.23, "1.230000E+00" ],
            [ "%E", -123, "-1.230000E+02" ],
            [ "%.2E", -123, "-1.23E+02" ],
            [ "%e", 1.23, "1.230000e+00" ],
            [ "%e", -1.23, "-1.230000e+00" ],
            [ "%e", 123, "1.230000e+02" ],
            [ "%016e", 123, "00001.230000e+02" ],
            [ "%+016e", 12345678, "+0001.234568e+07" ],
            [ "% 16e", 1234, "    1.234000e+03" ],
            [ "%-16.4e", 123, "1.2300e+02      " ],
            [ "%e", 123000000000, "1.230000e+11" ],
            [ "%+16e", 123, "   +1.230000e+02" ],
            [ "%+016e", 123, "+0001.230000e+02" ],
            [ "%0.2e", .1234, "1.23e-01" ],
            [ "%0.4e", .1234, "1.2340e-01" ],
            [ "%20.4e", .1234, "          1.2340e-01" ],
            [ "%-20.4e", -.01234, "-1.2340e-02         " ],
            [ "%.4e", .00000000000123, "1.2300e-12" ],

            // basics
            [ "%g", 0, "0" ],
            [ "%g", 1, "1" ],
            [ "%g", -1, "-1" ],
            [ "%010.2g", 1, "0000000001" ],
            [ "%010.2g", -1, "-000000001" ],

            // up to 6 significant digits
            [ "%g", 123, "123" ],
            [ "%g", -123, "-123" ],
            [ "%g", 123456, "123456" ],
            [ "%g", -123456, "-123456" ],
            [ "%g", 1234567, "1.23457e+06" ],
            [ "%g", -1234567, "-1.23457e+06" ],
            [ "%g", .0001234567, "0.000123457" ],
            [ "%g", -.0001234567, "-0.000123457" ],
            [ "%g", 1230000, "1.23e+06" ],
            [ "%g", -1230000, "-1.23e+06" ],
            [ "%g", 123456.9, "123457" ],
            [ "%g", .0009999994999, "0.000999999" ],
            [ "%g", .0009999995000, "0.001" ],

            // large values
            [ "%g", 123456780000, "1.23457e+11" ],
            [ "%g", -123456780000000, "-1.23457e+14" ],

            // limited precision and rounding
            [ "%.3g", 123456, "1.23e+05" ],
            [ "%0.2g", 123, "1.2e+02" ],
            [ "%.3G", 123, "123" ],
            [ "%G", 123.5, "123.5" ],
            [ "%.0g", 9.1, "9" ],
            [ "%.0g", 10.1, "1e+01" ],
            [ "%.0g", 1.1, "1" ],
            [ "%.0g", 1.5, "2" ],
            [ "%.1g", 999, "1e+03" ],
            [ "%.2g", 999, "1e+03" ],
            [ "%.3g", 999, "999" ],
            [ "%.5g", 999.9, "999.9" ],
            [ "%.4g", 999.9, "999.9" ],
            [ "%.3g", 999.9, "1e+03" ],
            [ "%.2g", 999.9, "1e+03" ],
            [ "%.1g", 999.9, "1e+03" ],
            [ "%.1g", .0000999, "0.0001" ],
            [ "%.2g", .0000999, "0.0001" ],
            [ "%.3g", .0000999, "9.99e-05" ],

            // %G => formats as %E
            [ "%.3G", 123456789, "1.23E+08" ],

            // drops trailing decimal zeros
            [ "%.10g", 2.5, "2.5" ],
            [ "%.10g", 2.5e10, "2.5e+10" ],
            [ "%.10g", 2.5e-08, "2.5e-08" ],
        ];
        t.expect(data.length);
        this.runTests(t, data);
        t.done();
    },

    'should interpolate chars': function(t) {
        var data = [
            [ "%c", 65, "A" ],
            [ "%c", 97, "a" ],
            [ "%c", 32, " " ],
            [ "%c", 27, "\x1B" ],
        ];
        t.expect(data.length);
        this.runTests(t, data);
        t.done();
    },

    'should interpolate objects': function(t) {
        var data = [
            [ "%O", {a:1,b:{b1:2}}, "{ a: 1, b: { b1: 2 } }" ],
            [ "%200O", {a:1,b:{b1:2}}, "{ a: 1, b: { b1: 2 } }" ],
            [ "%.2O", {a:1,b:{c:{d:{e:{f:2}}}}}, "{ a: 1, b: { c: { d: [Object] } } }" ],
            [ "%.0O", {a:1,b:{c:{d:{e:{f:2}}}}}, "{ a: 1, b: [Object] }" ],
        ];
        t.expect(data.length);
        this.runTests(t, data);
        t.done();
    },

    'should interpolate arrays': function(t) {
        var data = [
            [ "%A", [[1,2,3]], "[ 1, 2, 3 ]" ],
            [ "%2A", [[1,2]], "[ 1, 2 ]" ],
            [ "%2A", [[1,2,3]], "[ 1, 2, ... ]" ],
            [ "%02A", [[1,2,3]], "[ 1, 2, ... ]" ],
            [ "%2.1A", [[1,{a:{b:{c:2}}},3]], "[ 1, { a: [Object] }, ... ]" ],
        ];
        t.expect(data.length);
        this.runTests(t, data);
        t.done();
    },

    'should interpolate N-th argument': function(t) {
        var tests = [
            ["%2$d", [1, 2, 3], "2"],
            ["%2$3d", [1, 2, 3], "  2"],
            ["%2$-3d", [1, 2, 3], "2  "],
            ["%2$03d", [1, 2, 3], "002"],
            ["%2$-03d", [1, 2, 3], "200"],      // note: C pads on right with spaces
        ];
        t.expect(tests.length);
        for (var i=0; i<tests.length; i++) {
            t.equal(vsprintf(tests[i][0], tests[i][1]), tests[i][2]);
        }
        t.done();
    },

    'should interpolate named argument': function(t) {
        var tests = [
            [ "%(a1)d %(a2)d", [{a1: 1, a2: 2}], "1 2" ],
            [ "%(0)d %(1)d %(2)d", [ [1, 2, 3] ], "1 2 3" ],
            [ "%(a)03d", [{a: 1}], "001" ],
            [ "%1$d %2$(b)d %2$(c)d %2$(c)04d", [1, {b: 2, c: 3}], "1 2 3 0003" ],
        ];
        t.throws(function(){ sprintf("%(a", {a: 1}) });
        t.throws(function(){ sprintf("%(b)d", {a: 1}) });
        t.equal(sprintf("%(a)", {a: 1}), "%(a)");
        t.expect(tests.length + 3);
        for (var i=0; i<tests.length; i++) {
            t.equal(vsprintf(tests[i][0], tests[i][1]), tests[i][2]);
        }
        t.done();
    },

    'should return chars-written offset': function(t) {
        t.expect(5);
        sprintf("foo %n",
            function(n) { t.equal(n, 4); });
        sprintf("%8d%n",
            1, function(n) { t.equal(n, 8); });
        sprintf("%2s%n",
            "foobar", function(n) { t.equal(n, 6); });
        sprintf("%s%n%s%nzed",
            "foo",
            function(n) { t.equal(n, 3) },
            "foobar",
            function(n) { t.equal(n, 9) });
        t.done();
    },

    'errors': {
        'should reject unknown conversions': function(t) {
            t.throws(function(){ sprintf("%z", 3) }, /unsupported conversion/);
            t.done();
        },

        'should reject out of bounds argument': function(t) {
            t.throws(function(){ sprintf("%2$d", 1) }, /missing/);
            t.done();
        },

        'should reject out of bounds conversion specifier': function(t) {
            try { sprintf("%d %d", 1); t.fail() }
            catch (err) { t.ok(err.message.indexOf("missing argument") >= 0); t.done() }
        },

        'should error on missing argument': function(t) {
            t.throws(function(){ sprintf("%d %d", 1), /argument/ });
            t.done();
        },

        'should error on missing * width': function(t) {
            t.throws(function(){ sprintf("%*d") }, /width/);
            t.done();
        },

        'should error on missing * precision': function(t) {
            t.throws(function(){ sprintf("%*d") }, /precision/);
            t.done();
        },
    },

    'edge cases': {
        'should convert large numbers': function(t) {
            var tests = [
                [ "%o", 1e42, "26752743047012014100000000000000000000000000000" ],
                [ "%x", 1e42, "b7abc627050308000000000000000000000" ],
                [ "%X", 1e42, "B7ABC627050308000000000000000000000" ],
            ];
            for (var i=0; i<tests.length; i++) {
                t.equal(sprintf(tests[i][0], tests[i][1]), tests[i][2]);
            }
            t.done();
        },

        'should handle edge cases': function(t) {
            var tests = [
                [ "", [1, 2, 3], "" ],
                [ "%", [1, 2, 3], "%" ],
                [ "%%", [1, 2, 3], "%" ],
                [ "%%%", [1, 2, 3], "%%" ],
                [ "%%a", [1, 2, 3], "%a" ],
                [ "%%%%", [1, 2, 3], "%%" ],
                [ "%%a%%", [1, 2, 3], "%a%" ],
                [ "%d%d%d", [1, 2, 3], "123" ],
                [ "%042d", [1], "000000000000000000000000000000000000000001" ],
                [ "%.f", [1.23], "1" ],
                [ "%-.f", [1.23], "1" ],
                [ "%-+.f", [1.23], "+1" ],
                [ "%-0+.f", [1.23], "+1" ],

                [ "%*d", [4, 1], "   1" ],
                [ "%0*d", [4, 1], "0001" ],
                [ "%*.*f", [8, 3, 1.25], "   1.250" ],
                [ "%-+*.*llf", [8, 3, 1.25], "+1.250  " ],
            ];
            for (var i=0; i<tests.length; i++) {
                t.equal(vsprintf(tests[i][0], tests[i][1]), tests[i][2]);
            }
            t.done();
        },

        'should handle extreme numbers': function(t) {
            // expect at least 16 digits of precision
            var v = sprintf("%.0f", 1e42);
            t.ok(+v > 1e41);
            t.equal(parseFloat(v), 1e42);
            t.ok(v.length, 43);

            var v = sprintf("%.42f", 1e-42);
            t.ok(+v > 0 && +v < 1e-41);
            t.equal(parseFloat(v), 1e-42);
            t.ok(v.length, 44);

            var v = sprintf("%.40f", 3e-15);
            t.ok(/^0.[0-9]{40}$/.test(v));
            t.equal(parseFloat(v), 3e-15);

            var v = sprintf("%d", 1e42);
            t.equal(parseInt(v), 1e42);
            t.done();

            var v = sprintf("%o", 1e42);
            var n = parseInt(v, 8);
            t.done();
        },
    },

    'examples': {
        'should handle readme examples': function(t) {
            t.equal(sprintf("%5d", 123), "  123");
            t.equal(sprintf("%5.2f", 1.238), " 1.24");
            t.equal(sprintf("%05x", 123), "0007b");
            t.equal(sprintf("%10s", "Hello"), "     Hello");
            t.equal(sprintf("%-10s", "Hello"), "Hello     ");
            t.equal(sprintf("%O", {a:1,b:2}), "{ a: 1, b: 2 }");
            t.equal(sprintf("%2A", [1,2,3,4]), "[ 1, 2, ... ]");
            t.equal(sprintf("%.f", 12.345), "12");
            t.equal(sprintf("%-*.2f", 7, 12.345), "12.35  ");
            t.equal(sprintf("%*.*f", 8, 3, 1.25), "   1.250");
            t.equal(sprintf("%2$d", 1, 2), "2");
            t.equal(sprintf("%(x).2f", {x: 1.234}), "1.23");
            t.equal(sprintf("%2$(x)-4d", {x:1}, {x:2}), "2   ");
            t.done();
        },
    },

    'formatNumber': {
        'should format numbers': function(t) {
            var tests = [
                [ 0, "0" ],
                [ 1, "1" ],
                [ 11, "11" ],
                [ 1111, "1111" ],
                [ 11111111, "11111111" ],
                [ 1111111111111111, "1111111111111111" ],
                [ 11111111111111111111111111111111, "11111111111111111111111111111111" ],
                [ 1e42, "1000000000000000000000000000000000000000000" ],
                [ 1e77, "100000000000000000000000000000000000000000000000000000000000000000000000000000" ],
                [ 1e999, "Infinity" ],          // overflow
                [ Infinity, "Infinity" ],
            ];
            for (var i=0; i<tests.length; i++) {
                var v = qprintf.lib.formatNumber(tests[i][0]);
                t.ok(v == tests[i][1] || v-v*1e-16 <= v && v <= v+v*1e-16, "line " + i);
            }
            t.done();
        },
    },

    'formatFloat': {
        'should format floats': function(t) {
            var tests = [
                [ 1.25, 0, "1" ],
                [ 1.25, -1, "1" ],
                [ 1, 3, "1.000" ],
                [ 1.5, 60, "1.500000000000000000000000000000000000000000000000000000000000" ],
                [ 1, 30, "1.000000000000000000000000000000" ],
                [ 1e10, 3, "10000000000.000" ],
                [ 1e42, 0, "1000000000000000000000000000000000000000000" ],
                [ 1e42, 1, "1000000000000000000000000000000000000000000.0" ],
            ];
            for (var i=0; i<tests.length; i++) {
                // since most of these floats cannot be represented exactly,
                // test that the difference is less than 1 part in 1e16 (1 in 16 digits)
                var v = qprintf.lib.formatFloat(tests[i][0], tests[i][1]);
                t.ok(v == tests[i][1] || v-v*1e-16 <= v && v <= v+v*1e-16);
                var v = qprintf.lib.formatFloatMinimal(tests[i][0], tests[i][1]);
                t.ok(v == tests[i][1] || v-v*1e-16 <= v && v <= v+v*1e-16);
            }
            t.done();
        },
    },

    'formatFloatMinimal': {
        'should format floats': function(t) {
            var tests = [
                [ 10, 2, "10" ],
                [ 1.1, 0, "1" ],        // glic formats ("%4.0g", 1.1) as "1", which is right
                [ .001, 0, "0" ],       // glibc and php format ("%4.0g", .001) as "0.001", which seems wrong; precision is 0!  We do "0"
                [ 1.5, 3, "1.5" ],
                [ 1.5001, 3, "1.5" ],
                [ 1.5, 15, "1.5" ],
                [ 1.5001, 15, "1.5001" ],
                [ 1.5, 25, "1.5000000000000000000000000" ],
                [ 1e15, 1, "1000000000000000" ],
                [ 1e25, 1, "10000000000000000000000000" ],
                [ 1e25, 25, "10000000000000000000000000" ],
            ];
            for (var i=0; i<tests.length; i++) {
                var v = qprintf.lib.formatFloatMinimal(tests[i][0], tests[i][1], true);
                t.equal(String(v).length, tests[i][2].length, "line " + i);
                t.equal(v.slice(0, 16), tests[i][2].slice(0, 16), "line " + i);
                t.ok(v == tests[i][1] || v-v*1e-16 <= v && v <= v+v*1e-16, "line " + i);
            }
            t.done();
        },
    },

    'tools': {
        'pow10 should return powers of 10': function(t) {
            for (var i=0; i<400; i++) {
                t.equal(lib.pow10(i), Math.pow(10, i));
            }
            t.done();
        },

        'pow10n should return negative powers of 10': function(t) {
            for (var i=0; i<400; i++) {
                t.equal(lib.pow10n(i), Math.pow(10, -i));
            }
            t.done();
        },

        'countLeadingZeros should count leading decimal zeros': function(t) {
            t.equal(lib.countLeadingZeros(11), 0);
            t.equal(lib.countLeadingZeros(1), 0);
            t.equal(lib.countLeadingZeros(.1), 0);
            t.equal(lib.countLeadingZeros(.01), 1);
            t.equal(lib.countLeadingZeros(.001), 2);
            t.equal(lib.countLeadingZeros(.0001), 3);
            t.equal(lib.countLeadingZeros(.00001), 4);
            for (var i=0; i<324; i++) {
                // breaks at i=324+: counts 323 zeros (1e-324 === 0)
                var val = Math.pow(10, -i-1);
                t.equal(Math.pow(10, -lib.countLeadingZeros(val)-1), val, "10^-"+(i+1));
                t.equal(lib.countLeadingZeros(Math.pow(10, -i-1)), i, "10^-" + (i+1));
            }
            t.equal(lib.countLeadingZeros(1e-322), 321);
            t.equal(lib.countLeadingZeros(1e-323), 322);
            t.notEqual(1e-323, 0);
            t.equal(lib.countLeadingZeros(1e-324), 323);
            t.equal(1e-324, 0);
            t.equal(lib.countLeadingZeros(1e-325), 323);
            t.equal(lib.countLeadingZeros(1e-326), 323);
            t.done();
        },

        'countDigits should count digits in positive integer part': function(t) {
            t.equal(lib.countDigits(0.0), 0);
            t.equal(lib.countDigits(0.1), 0);
            t.equal(lib.countDigits(1.0), 1);
            t.equal(lib.countDigits(1.1), 1);
            for (var i=0; i<300; i++) {
                var val = Math.pow(10, i);
                t.equal(lib.countDigits(val), i+1, "countDigits " + val);
                t.equal(lib.countDigits(val + val/10), i+1, "countDigits " + (val * 1.1));
            }
            t.equal(Math.pow(10, lib.countDigits(Infinity)), Infinity);
            t.done();
        },

        'countTrailingZeros ...': function(t) {
            t.skip();
        },

        'normalizeExp should convert to exponential form': function(t) {
            var _ve = { val: 0, exp: 0 };
            var precision = 6;  // works 10e6 for 8 digits, sometimes works 10e5 for 9, always errors out 10e5 for 12
            function splitExp(v) {
                var s = v.toExponential(precision);
                var p = s.indexOf('+');
                if (p < 0) p = s.indexOf('-');
                _ve.val = parseFloat(s.slice(0, p));
                _ve.exp = parseInt(s.slice(p));
                return _ve;
            }
            function makeFloat() {
                var scale = (Math.random() * 600) - 300;
                var val = Math.random();
                val = (scale >= 0) ? (val * lib.pow10(scale)) : (val * lib.pow10n(-scale));
                return val;
            }
            // fuzz test with random floating-point values
            for (var i=0; i<10e4; i++) {
                var val = makeFloat();
                ve1 = lib._normalizeExp(val);
                ve2 = splitExp(val);
                t.equal(ve1.exp, ve2.exp, "exp mismatch, v = " + val);
                t.equal(ve1.val.toFixed(precision), ve2.val.toFixed(precision), "val mismatch, v = " + val);
            }
            t.done();
        },
    },

    'accuracy': {
        'formatNumber powers of 10': function(t) {
            var limit = 1e21;
            // powers of 10 0..21
            for (var v=1; v<limit; v*=10) {
                t.strictEqual(lib.formatNumber(v), String(v));
                t.strictEqual(lib.formatNumber(v-.1), String(Math.floor(v-.1)));
                t.strictEqual(lib.formatNumber(v+.1), String(Math.floor(v+.1)));
            }
            t.done();
        },

        'formatFloat powers of 10': function(t) {
            t.skip();
        },
    },

    'speed of 10k string+num': function(t) {
        for (var i=0; i<10000; i++) {
            var s = sprintf("String %s num %05d\n", "some string", 123, {a: 1, b: 2.5, c: 'c'});
        }
        // 1.28m/s
        // 70k/s with +obj
        t.done();
    },
};
