// qprintf benchmark, see git://github.com/andrasq/node-qprintf

var version = require('./package.json').version;

var util = require('util');
var qtimeit = require('qtimeit');

var qsprintf = require('./qprintf').sprintf;
var sprintfjs = require('sprintf-js').sprintf;
var sprintf = require('sprintf').sprintf;
//var sprintfjs = require('/home/andras/src/sprintf-js.git/').sprintf;
var printf = require('printf');
var extsprintf = require('extsprintf').sprintf;

var x, z;
qtimeit.bench.timeGoal = 0.4;
var fmt1 = "%s %d %s";
qtimeit.bench([
// using a string constant format runs 25% slower and drops all speeds by 5%
//    function(){ z = qsprintf("%s %04d %s", "Hello", 123, "world") },
    function(){ z = qsprintf(fmt1, "Hello", 123, "world") },
    function(){ z = qsprintf("%s %04d %s", "Hello", 123, "world") },
    function(){ z = qsprintf(fmt1, "Hello", 123, "world") },
    function(){ z = qsprintf(fmt1, "Hello", 123, "world") },
    function(){ z = qsprintf(fmt1, "Hello", 123, "world") },
]);

var fmt1 = "%s %d %s";
var fmt2 = "%s %04d %s %4$5.2f";
for (var loop=0; loop<10; loop++) {
    var z;
    var calls = {
        'printf-0.2.5': printf,
        'sprintfjs-1.0.3': sprintfjs,
        'extsprintf-1.3.0': extsprintf,         // does not handle floating-point or %4$
        'sprintf-0.1.5': sprintf,
        'qprintf-0.11.0': qsprintf,
//        'util_format': util.format,             // does not handle %04 or %4$
    };

    for (var f=0; f<2; f++) {
    for (var nloops=0; nloops<3; nloops++) {
        for (var callName in calls) {
            var call = calls[callName];
            var t1 = Date.now();
            switch (f) {
            case 0: for (var i=0; i<100000; i++) z = call("%s %04d %s", "Hello", 123, "world"); break;
            case 1: for (var i=0; i<100000; i++) z = call("%s %04d %s %f %4$5.2f", "Hello", 123, "world", 1.25, 12.345); break;
            }
            var t2 = Date.now();
            console.log("%s 100k '%s' ms: ", callName, z, t2-t1);
        }
        console.log("");
    }
    }

    var bench1 = {
        'printf-0.2.5': function(){ z = printf(fmt1, "Hello", 123, "world") },
        'sprintfjs-1.0.3': function(){ z = sprintfjs(fmt1, "Hello", 123, "world") },
        'extsprintf-1.3.0': function(){ z = extsprintf(fmt1, "Hello", 123, "world") },
        'sprintf-0.1.5': function(){ z = sprintf(fmt1, "Hello", 123, "world") },
        'qprintf-0.11.0': function(){ z = qsprintf(fmt1, "Hello", 123, "world") },
        //'util_format': function(){ util.format(fmt1, "Hello", 123, "world") },
    };
    var bench2 = {
        'printf-0.2.5': function(){ z = printf(fmt2, "Hello", 123, "world", 12.345) },
        'sprintfjs-1.0.3': function(){ z = sprintfjs(fmt2, "Hello", 123, "world", 12.345) },
        'extsprintf-1.3.0': function(){ z = extsprintf(fmt2, "Hello", 123, "world", 12.345) },
        'sprintf-0.1.5': function(){ z = sprintf(fmt2, "Hello", 123, "world", 12.345) },
        'qprintf-0.11.0': function(){ z = qsprintf(fmt2, "Hello", 123, "world", 12.345) },
        //'util_format': function(){ util.format(fmt2, "Hello", 123, "world", 12.345) },
    };

    qtimeit.bench.timeGoal = 0.4;
    qtimeit.bench(bench1);
    console.log("");
    qtimeit.bench(bench2);
    console.log("");
}
