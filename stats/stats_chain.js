var fs = require('fs');
var json2csv = require('json2csv');
var estraverse = require('estraverse');
var jshint = require('jshint').JSHINT;
var esprima = require('esprima');
ArgumentParser = require('argparse').ArgumentParser;
var tern = require('tern');

var async_types = [];
var prevValue = 0;
var newValue = 0;

var funcChain = [];
var chainRes = [];

var resArray = [];
var projResArray = [];
var depsArray = [];

var namedCBs = 0;
var unknowns = 0;
var anonCBs = 0;

var errcbcount = 0;
var server = new tern.Server({plugins: {node: {}}});
var skipped = 0;


var argParser = new ArgumentParser({
    addHelp: true,
    description: 'ACFG generator'
});

argParser.addArgument(
    ['-d', '--directory'],
    {
        nargs: 0,
        help: 'give directory path'
    }
);

argParser.addArgument(
    ['-t', '--type'],
    {help: 'Should be one of npm, hybrid'}
);


var r = argParser.parseKnownArgs();
var args = r[0],
    files = r[1];

args.type = args.type;
if (args.type && !args.type.match(/^(npm|hybrid|dataviz|frameworks|engines|games)$/)) {
    argParser.printHelp();
    process.exit(-1);
}

//console.dir(files);
//console.dir(args.strategy);

if (args.directory) {
    var dirPath = files[0];
    var dirResults = [];
    var stats = fs.statSync(dirPath);

    if (stats.isDirectory()) {
        search(dirPath, dirResults);
    }
    //console.dir(dirResults);
}

if (args.type) {
    var type_flag = args.type;
    var homedir = process.env.HOME;

    var parentPath = homedir + '/dev/top_' + type_flag;

    var dirs = fs.readdirSync(parentPath);

    for (var s = 0; s < dirs.length; s++) {

        var path = parentPath + '/' + dirs[s];
        //console.log(path)
        var stats = fs.statSync(path);

        if (stats.isDirectory()) {
            search(path, resArray, dirs[s]);
        }
    }

//console.dir(resArray);

    for (var i in resArray) {
        var result = resArray[i];
        Object.keys(result).forEach(function (key) {
            if (key === 'propertiesCount') {
                var array = [];
                result[key].forEach(function (item) {
                    array.push([item.property + ':' + item.count]);
                });
                result[key] = array;
            }
            result[key] = Array.isArray(result[key]) ? result[key].join(' ') : result[key];
        });
    }

    console.dir(chainRes);
    console.log('namedCBs:' + namedCBs);
    console.log('unknowns:' + unknowns);
    console.log('anonCBs:' + anonCBs);

    json2csv({
        data: resArray,
        fields: Object.keys(resArray[0])
    }, function (err, csv) {
        if (err) console.log(err);
        var output_file = 'chain_' + type_flag + '.csv'
        fs.writeFile(output_file, csv, function (err) {
            if (err) throw err;
            console.log(output_file + ' file saved');
        });
    });

}


function search(dir, fullres, project) {
    if (!fs.existsSync(dir)) {
        return console.log('Directory ' + dir + ' does not exist.');
    }

    var haystack = fs.readdirSync(dir), path, stats;

    for (var s = 0; s < haystack.length; s++) {
        path = dir + '/' + haystack[s];
        try {
            stats = fs.statSync(path);

            if (stats.isDirectory()) {
                search(path, fullres, project);
            } else if (path.indexOf('node_modules') >= 0 || path.indexOf('plugins') >= 0) {
                // console.log('Skipping file: ' + path);
            } else if ((/\.js$/).test(path) && !(/Uglify/).test(path)) {
                //console.log('Analyzing file: ' + path);
                analyze(path, fullres, project);
            } else if ((/package\.json$/).test(path)) {
                //console.log('dep analyze: ' + path+' : '+project);
            }
        }
        catch (e) {

        }
    }
};


function analyze(path, fullres, project) {
    var loc = 0;
    var functions = 0;
    var functionDecls = 0;
    var functionExprs = 0;
    var namedFuncExprs = 0;
    //var anonCBs = 0;
    var minC = 0;
    var maxC = 0;
    var meanC = 0;
    var setTimeouts = 0;
    var setIntervals = 0;
    var setImmediates = 0;
    var calls = 0;
    var nextTicks = 0;
    var requires = 0;
    var defines = 0;
    var fsSyncs = 0;
    var fsAsyncs = 0;
    var argscount = Array.apply(null, new Array(11)).map(Number.prototype.valueOf, 0);
    var paramscount = Array.apply(null, new Array(11)).map(Number.prototype.valueOf, 0);
    var argsmax = 0;
    var paramsmax = 0;
    console.log('Analysing.. ' + path);

    var text = fs.readFileSync(path, "utf8");
    //text.split(/\r?\n/).forEach(function (line) {
    //    loc++;
    //});

    loc = text.split("\n").length;

    if (loc > 6000) {
        console.log("skipping - too long (" + loc + " loc); " + path);
        skipped++;
        return;
    }


    var charPerLine = text.length / loc;
    if (charPerLine > 300) {
        //    console.log("skipping - probably minified (" + charPerLine + " char/line); "+ path );
        return;
    }
    try {

        var msg = {
            "query": {
                "type": "completions",
                "file": "myfile.js",
                "end": 1
            },
            "files": [
                {
                    "type": "full",
                    "name": "myfile.js",
                    "text": text
                }
            ]
        }
        server.request(msg, function (err, resp) {
            if (err) {
                console.log(err);
            }
            else {
                //console.dir(resp);
                //var ast = server.files[0].ast;
                //console.dir(ast);
            }
        });

        var ast = esprima.parse(text, {tolerant: true, loc: true, range: true});
        estraverse.traverse(ast, {
            enter: enter,
            leave: leave
        });

    }
    catch (e) {
        // pass exception object to error handler
        console.dir(e);
    }

    function enter(node) {

        setParent(node);

        if (node.type === 'FunctionExpression' && node.$parent.type === 'CallExpression') {
            functions++;
            if (funcChain[funcChain.length - 1]) {
                funcChain[funcChain.length - 1].hasChild = true;
            }
            //console.log('Pushing:'+ node.loc.start.line +' - '+ node.loc.end.line);
            funcChain.push({hasChild: false, location: node.loc});
        }
        if (node.type === 'FunctionDeclaration') {

            functionDecls++;
        } else if (node.type === 'FunctionExpression') {
            if (node.id && node.id.name) {
                namedFuncExprs++;
            }
            functionExprs++;
        }

        else if (node.type === 'CallExpression') {

            //console.dir(node.arguments);
            for (i in node.arguments) {
                //if (node.arguments[i].type == 'Identifier') {
                if (false) {
                    var name = node.arguments[i].name;
                    var range = node.arguments[i].range;

                    location = Math.floor((range[0] + range[1]) / 2);

                    var msg = {
                        "query": {
                            "type": "type",
                            "file": "myfile.js",
                            "end": location
                        },
                        "files": [
                            {
                                "type": "full",
                                "name": "myfile.js",
                                "text": text
                            }
                        ]
                    }
                    server.request(msg, function (err, resp) {
                        if (err) {
                            console.log(err);
                        }
                        else {
                            console.dir(node.loc.start.line + ':' + node.loc.start.column + ' : ' + resp.name + ' : ' + resp.type);
                            if (/fn/.test(resp.type)) {
                                console.log('####');
                                namedCBs++;
                            } else if (/\?/.test(resp.type)) {
                                console.log('????');
                                unknowns++;
                            }
                            //var ast = server.files[0].ast;
                            //console.dir(ast);
                        }
                    });
                    //} else if (node.arguments[i].type == 'FunctionExpression'){
                    //    console.log('!!!');
                    //    anonCBs++;
                    //}
                }
            }
        }

    }

    function leave(node) {

        if (node.type === 'FunctionExpression' && node.$parent.type === 'CallExpression') {
            //console.dir(funcChain);
            newValue = funcChain.length;
            var lastItem = funcChain.pop();
            //console.log('Popped:'+lastItem.location.start.line +' - '+ lastItem.location.end.line+ ' Real:'+ node.loc.start.line +' - '+ node.loc.end.line);
            if (!lastItem.hasChild) {
                if (chainRes[newValue] == 0 | chainRes[newValue]) {
                    chainRes[newValue]++;
                } else {
                    chainRes[newValue] = 1;
                }
                if (newValue > 9) {
                    console.log(newValue + ': ' + lastItem.location.start.line + ' - ' + lastItem.location.end.line);
                }
            }


        }


    }

    function setParent(node) {
        for (var k in node) {
            if (!node.hasOwnProperty(k))
                continue;
            if (k[0] === '$')
                continue;
            var val = node[k];
            if (!val)
                continue;
            if (typeof val === "object" && typeof val.type === "string") {
                node[k].$parent = node;
            }
            else if (val instanceof Array) {
                for (var i = 0; i < val.length; i++) {
                    var elm = val[i];
                    if (elm != null && typeof elm === "object" && typeof elm.type === "string") {
                        val[i].$parent = node;
                    }
                }
            }
        }
    }

    //console.dir(argscount);
    fullres.push({
        project: project,
        path: path,
        loc: loc,
        functions: functions,
        functionDecls: functionDecls,
        functionExprs: functionExprs,
        namedFuncExprs: namedFuncExprs
    });


};



