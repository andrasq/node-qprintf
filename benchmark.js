// qprintf benchmark, see git://github.com/andrasq/node-qprintf

var util = require('util');

var qsprintf = require('./qprintf').sprintf;
var sprintfjs = require('sprintf-js').sprintf;
var sprintf = require('sprintf').sprintf;
//var sprintfjs = require('/home/andras/src/sprintf-js.git/').sprintf;
var printf = require('printf');
var extsprintf = require('extsprintf');

for (var loop=0; loop<10; loop++) {
    var z;
    var calls = {
        'extsprintf-1.3.0': extsprintf.sprintf,
        'printf-0.2.5': printf,
        'sprintfjs-1.0.3': sprintfjs,
        'sprintf-0.1.5': sprintf,
        'qsprintf-0.9.2': qsprintf,
        'util_format': util.format,
    };

    for (var callName in calls) {
        var call = calls[callName];
        var t1 = Date.now();
        for (var i=0; i<100000; i++) z = call("%s %04d %s", "Hello", 123, "world");
        //for (var i=0; i<100000; i++) z = call("%s %04d %s %4$5.2f", "Hello", 123, "world", 12.345);
        var t2 = Date.now();
        console.log("%s 100k '%s' ms: ", callName, z, t2-t1);
    }
    console.log("");
}
