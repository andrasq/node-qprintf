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
var fmt1 = "%s %d %s";
var fmt2 = "%s %04d %s %4$5.2f";
var fmt20 = "%20s %20d %20s";
//fmt1 = fmt20;

// NOTE: without this pre-test, qsprintf runs half speed with node-v8.0.0
// and node 7.8.0.  node-v6.10.2, v5.8.0, v4.4.0 and v0.10.42 are not affected.
// The test runs at full speed with node-v8.0.0 too if run standalone.
qtimeit.bench.timeGoal = 0.4;
if (1) qtimeit.bench([
    function(){ z = qsprintf(fmt1, "Hello", 123, "world") },
    // using a string constant format runs 25% slower
//    function(){ z = qsprintf("%s %04d %s", "Hello", 123, "world") },
    function(){ z = qsprintf(fmt1, "Hello", 123, "world") },
    function(){ z = qsprintf(fmt1, "Hello", 123, "world") },
    function(){ z = qsprintf(fmt1, "Hello", 123, "world") },
]);

// first run:
qtimeit.bench.timeGoal = 0.4;
qtimeit.bench.visualize = true;
qtimeit.bench.showSource = true;
qtimeit.bench.baselineAvg = 1000000;
//qtimeit.bench.forkTests = true;
qtimeit.bench.showRunDetails = false;

// for (var loop=0; loop<40; loop++) {
    var z;
    var calls = {
        'printf-0.2.5': printf,
        'sprintfjs-1.0.3': sprintfjs,
        //'extsprintf-1.3.0': extsprintf,         // does not handle floating-point or %4$
        'sprintf-0.1.5': sprintf,
        'qprintf-1.0.0': qsprintf,
        //'util_format': util.format,             // does not handle %04 or %4$
    };

    for (var f=0; f<2; f++) {
if (0)
    for (var nloops=0; nloops<3; nloops++) {
        for (var callName in calls) {
            var call = calls[callName];
            var t1 = Date.now();
            switch (f) {
            case 0: for (var i=0; i<100000; i++) z = call(fmt1, "Hello", 123, "world"); break;
            case 1: for (var i=0; i<100000; i++) z = call(fmt2, "Hello", 123, "world", 1.25, 12.345); break;
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
        //'extsprintf-1.3.0': function(){ z = extsprintf(fmt1, "Hello", 123, "world") },
        //'sprintf-0.1.5': function(){ z = sprintf(fmt1, "Hello", 123, "world") },
        'qprintf-0.13.2': function(){ z = qsprintf(fmt1, "Hello", 123, "world") },
        //'qprintf-0.13.2-const': function(){ z = qsprintf("%s %d %s", "Hello", 123, "world") },
        'util_format': function(){ util.format(fmt1, "Hello", 123, "world") },
    };
    var bench2 = {
        'printf-0.2.5': function(){ z = printf(fmt2, "Hello", 123, "world", 12.345) },
        'sprintfjs-1.0.3': function(){ z = sprintfjs(fmt2, "Hello", 123, "world", 12.345) },
        //'extsprintf-1.3.0': function(){ z = extsprintf(fmt2, "Hello", 123, "world", 12.345) },
        //'sprintf-0.1.5': function(){ z = sprintf(fmt2, "Hello", 123, "world", 12.345) },
        'qprintf-0.13.2': function(){ z = qsprintf(fmt2, "Hello", 123, "world", 12.345) },
        //'util_format': function(){ util.format(fmt2, "Hello", 123, "world", 12.345) },
    };

    qtimeit.bench(bench1);
    console.log("");
    //qtimeit.bench(bench2);
    //console.log("");

    // subsequent runs:
    qtimeit.bench.showRunDetails = false;
// }
