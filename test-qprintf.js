/**
 * Copyright (C) 2015-2017 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */

qprintf = require('./qprintf');
vsprintf = qprintf.vsprintf;
sprintf = qprintf.sprintf;

module.exports = {
    before: function(done) {
        this.runTests = function( t, data ) {
            for (var i=0; i<data.length; i++) {
                if (Array.isArray(data[i][1]))
                    t.equal(vsprintf(data[i][0], data[i][1]), data[i][2]);
                else
                    t.equal(sprintf(data[i][0], data[i][1]), data[i][2]);
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

    'should interpolate numbers': function(t) {
        var data = [
            [ "%d", 123, "123" ],
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
        var data = [
            [ "%E", 1.23, "1.230000E+00" ],
            [ "%E", -123, "-1.230000E+02" ],
            [ "%.2E", -123, "-1.23E+02" ],
            [ "%e", 1.23, "1.230000e+00" ],
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

            // TODO: %g should omit trailing zeros, even the decimal point if no fraction
            [ "%g", 123, "123" ],
            [ "%g", 1230000, "1.23e+06" ],
            [ "%0.2g", 123, "1.23e+02" ],
            [ "%.3G", 123, "123" ],
            [ "%G", 123.5, "123.5" ],
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
    },

    'edge cases': {
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

        'should handle very large numbers': function(t) {
            // expect at least 16 digits of precision
            var v = sprintf("%.0f", 1e42);
            t.ok(+v > 0);
            t.ok(v >= 1e42 - 1e25 && v <= 1e42 + 1e25);
            t.ok(v.length, 43);

            var v = sprintf("%.42f", 1e-42);
            t.ok(+v > 0);
            t.ok(v >= 1e-42 - 1e-25 && v <= 1e-42 + 1e-25);
            t.ok(v.length, 44);

            var v = sprintf("%.40f", 3e-15);
            t.ok(/^0.[0-9]{40}$/.test(v));
            t.equal(v.length, 42);
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

    'speed of 10k string+num': function(t) {
        for (var i=0; i<10000; i++) {
            var s = sprintf("String %s num %05d\n", "some string", 123, {a: 1, b: 2.5, c: 'c'});
        }
        // 1.28m/s
        // 70k/s with +obj
        t.done();
    },
};
