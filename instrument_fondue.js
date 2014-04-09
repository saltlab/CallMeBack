var fondue = require('fondue'),
	path = require('path'),
    vm = require('vm');

var util = require('util');
var fs = require('fs');

var currentdate = new Date(); 
var date_string = currentdate.getDate() + "_"
                + (currentdate.getMonth()+1)  + "_" 
                + currentdate.getFullYear();
var log_file = fs.createWriteStream(__dirname + '/resources/'+date_string+'_debug.log', {flags : 'w'});
var log_stdout = process.stdout;

console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};


function instrument_fondue(name, source) {

console.log('**************************');
console.log('Writing '+ name+ '...');
console.log(source);
console.log('**************************');

var src = fondue.instrument(source);
var sandbox = { __tracer: undefined, console: console, setTimeout:setTimeout, require:require };
var output = vm.runInNewContext(src, sandbox);
var tracer = sandbox.__tracer;


var functions = {};
var nodearr = new Array();

var nodesHandle = tracer.trackNodes();
console.log('nodes:');
tracer.newNodes(nodesHandle).forEach(function (n) {
	console.log(util.inspect(n, false, null));

    //if (n.type === 'function') {
        nodearr.push(n.id);
   // }

});





// check how many times trace points have been hit
var hitsHandle = tracer.trackHits();

// call repeatedly to track hit counts over time
var hits = tracer.hitCountDeltas(hitsHandle);
console.log('************');
console.log('hits');
console.log(util.inspect(hits, false, null));

var logHandle = tracer.trackLogs({ ids: nodearr, logs: true });
var invocations = tracer.logDelta(logHandle);

console.log('************');
console.log('logs:');
console.log(util.inspect(invocations, false, null));
console.log('************');

}

function processFile(filename) {
    var name, source, expected;

    if (filename.match('_morphed.js') || filename.match('_converted.js')) {
        return;
    }

    name = path.basename(filename);
    source = fs.readFileSync(filename, 'utf-8');
    //expected = fs.readFileSync(filename.replace('.js', '_morphed.js'), 'utf-8');
    instrument_fondue(name, source);
}

// http://stackoverflow.com/q/5827612/
function walk(dir, done) {
    var results = [];
    fs.readdir(dir, function (err, list) {
        if (err) {
            return done(err);
        }
        var i = 0;
        (function next() {
            var file = list[i++];
            if (!file) {
                return done(null, results);
            }
            file = dir + '/' + file;
            fs.stat(file, function (err, stat) {
                if (stat && stat.isDirectory()) {
                    walk(file, function (err, res) {
                        results = results.concat(res);
                        next();
                    });
                } else {
                    results.push(file);
                    next();
                }
            });
        }());
    });
}

function processDir(dirname) {
console.log("in process dir");
    walk(path.resolve(__dirname, dirname), function (err, results) {
        if (err) {
            console.log('Error', err);
            return;
        }

        results.forEach(processFile);

    });
}

processDir('resources/data');







