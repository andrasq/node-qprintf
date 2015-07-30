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

    'should interpolate strings': function(t) {
        var data = [
            // format, value(s), expected
            [ "%s", "foo", "foo" ],
            [ "(%s)", "foo", "(foo)" ],
            [ "A%sB%sC", ["foo", "bar"], "AfooBbarC" ],
            [ "%5s", "foo", "  foo" ],
            [ "%-6s", "foo", "foo   " ],
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
            [ "%-06d", 123, "123000" ],
        ];
        t.expect(data.length);
        this.runTests(t, data);
        t.done();
    },

    'should interpolate integers': function(t) {
        var data = [
            [ "%i", 12.5, "12" ],
            [ "%5i", 12.5, "   12" ],
            [ "%5o", 12, "   14" ],
            [ "%5x", 12, "    c" ],
            [ "%5b", 12, " 1100" ],
        ];
        t.expect(data.length);
        this.runTests(t, data);
        t.done();
    },

    'should interpolate floats': function(t) {
        var data = [
            [ "%f", 1.23, "1.23" ],
            [ "%5f", 1.23, " 1.23" ],
            [ "%-6f", 1.23, "1.23  " ],
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
            [ "%2O", {a:1,b:{c:{d:{e:{f:2}}}}}, "{ a: 1, b: { c: { d: [Object] } } }" ],
            [ "%0O", {a:1,b:{c:{d:{e:{f:2}}}}}, "{ a: 1, b: [Object] }" ],
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
        ];
        t.expect(data.length);
        this.runTests(t, data);
        t.done();
    },

    'should reject unknown conversions': function(t) {
        try {
            sprintf("%z", 3);
            t.fail();
        }
        catch (err) {
            t.ok(true);
            t.done();
        }
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
