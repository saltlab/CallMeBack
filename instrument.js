var fs = require('fs'),
    path = require('path'),
    esmorph = require('esmorph'),
    args = process.argv.splice(2),
    total = 0,
    failures = 0;


function instrument(name, source) {
    var modifiers, morphed;

    modifiers = [];
    modifiers.push(esmorph.Tracer.FunctionEntrance('Enter'));
    modifiers.push(esmorph.Tracer.FunctionExit('Exit'));

    console.log('Writing', name, '...');
    morphed = esmorph.modify(source, modifiers);
//    console.log(morphed);
    fs.writeFileSync("resources/"+name+"_converted", morphed); 

    ++total;
}

function processFile(filename) {
    var name, source, expected;

    if (filename.match('_morphed.js') || filename.match('_changed.js')) {
        return;
    }

    name = path.basename(filename);
    source = fs.readFileSync(filename, 'utf-8');
    //expected = fs.readFileSync(filename.replace('.js', '_morphed.js'), 'utf-8');
    instrument(name, source);
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

        console.log();
        console.log('Tests:', total, '  Failures:', failures);
        process.exit(failures === 0 ? 0 : 1);
    });
}

if (args.length === 0) {
    processDir('resources');
} else {
    args.forEach(processFile);
}

