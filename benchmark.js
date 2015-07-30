// qprintf benchmark, see git://github.com/andrasq/node-qprintf

var qsprintf = require('./qprintf').sprintf;
var sprintfjs = require('sprintf-js').sprintf;
var printf = require('printf');

console.log("forever loop, kill with ^C...");

for (var loop=0; loop<10; loop++) {
    var z;
    var calls = {
        printf: printf,
        sprintfjs: sprintfjs,
        qsprintf: qsprintf,
    };

    for (var callName in calls) {
        var call = calls[callName];
        var t1 = Date.now();
        for (var i=0; i<100000; i++) z = call("%s %04d %s", "Hello", 123, "world");
        var t2 = Date.now();
        console.log("%s 100k '%s' ms: ", callName, z, t2-t1);
    }
}