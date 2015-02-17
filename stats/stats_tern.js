var fs = require('fs');
var json2csv = require('json2csv');
var estraverse = require('estraverse');
var jshint = require('jshint').JSHINT;
var esprima = require('esprima');
ArgumentParser = require('argparse').ArgumentParser;
var tern = require('tern');

var async_types = [];

var filecount = 0;

var resArray = [];
var projResArray = [];
var depsArray = [];

var errcbcount=0;

var namedCBs = 0;
var unknowns = 0;
var calls = 0;

var server = new tern.Server({plugins: {node: {}}});

var argParser = new ArgumentParser({
    addHelp: true,
    description: 'ACFG generator'
});

argParser.addArgument(
    [ '-d','--directory' ],
    { nargs: 0,
        help: 'give directory path' }
);

argParser.addArgument(
    [ '-p','--pkgs' ],
    { nargs: 0,
        help: 'analyze pkgs as well' }
);



argParser.addArgument(
    [ '-t','--type' ],
    { help: 'Should be one of npm, hybrid'}
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

if (args.directory){
    var dirPath = files[0];
    var dirResults = [];
    var stats = fs.statSync(dirPath);

    if (stats.isDirectory()) {
        loadSources(dirPath);
        search(dirPath, dirResults);
    }
    //console.dir(dirResults);
    console.dir("knownFuncs:"+namedCBs)
    console.dir("unknowns:"+ unknowns)
    console.dir("calls:"+calls)
}

if (args.type)
{
var type_flag = args.type;
var homedir = process.env.HOME;

var parentPath = homedir + '/dev/top_'+ type_flag;

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

if (args.pkgs){
    var resultsArr = []
    for (var i in depsArray) {
    var result = depsArray[i];
    resultsArr.push(i+','+depsArray[i]);
}
    var finalstr = resultsArr.join('\n');
    var output_file = 'pkg_' + type_flag + '.csv'
    fs.writeFile(output_file, finalstr, function (err) {
        if (err) throw err;
        console.log(output_file + ' file saved');
    });

    }

console.dir(async_types);

json2csv({
    data: resArray,
    fields: Object.keys(resArray[0])
}, function (err, csv) {
    if (err) console.log(err);
    var output_file = 'file_' + type_flag + '.csv'
    fs.writeFile(output_file, csv, function (err) {
        if (err) throw err;
        console.log(output_file + ' file saved');
    });
});

}


function search (dir, fullres, project) {
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
            } else if ((/\.js$/).test(path)) {
                //console.log('Analyzing file: ' + path);
                analyze(path, fullres, project);
            } else if ((/package\.json$/).test(path)) {
                //console.log('dep analyze: ' + path+' : '+project);
                if (args.pkgs){
                    analyzePkg(path, project);
                }
            }
        }
        catch (e) {

        }
    }
};

function loadSources (dir) {
    if (!fs.existsSync(dir)) {
        return console.log('Directory ' + dir + ' does not exist.');
    }

    var haystack = fs.readdirSync(dir), path, stats;

    for (var s = 0; s < haystack.length; s++) {
        path = dir + '/' + haystack[s];
        try {
            stats = fs.statSync(path);

            if (stats.isDirectory()) {
                loadSources(path);
            } else if (path.indexOf('node_modules') >= 0 || path.indexOf('plugins') >= 0) {
                // console.log('Skipping file: ' + path);
            } else if ((/\.js$/).test(path)) {
                //console.log('Analyzing file: ' + path);
                loadFile(path);
            } else if ((/package\.json$/).test(path)) {
            }
        }
        catch (e) {

        }
    }
};

function analyzePkg (path, project) {
    json = JSON.parse(fs.readFileSync(path, 'utf8'))
    var a = json.dependencies;
    for (key in a) {
        if (a.hasOwnProperty(key)) {
    //     if ((/async$/).test(key)){console.dir(project+' '+key)}
            if (!depsArray[key]){
                depsArray[key] = 1;
            } else {
                depsArray[key]++;
            }
        }
    }

}
function loadFile(path){
    console.log('Loading.. ' + path);
    var text = fs.readFileSync(path, "utf8");
    text.split(/\r?\n/).forEach(function (line) {
        loc++;
    });

    var charPerLine = text.length / text.split("\n").length;
    if (charPerLine > 300) {
        //    console.log("skipping - probably minified (" + charPerLine + " char/line); "+ path );
        return;
    }

    var msg = {
        "query": {
            "type": "completions",
            "file": path,
            "end": 1
        },
        "files": [
            {
                "type": "full",
                "name": path,
                "text": text
            }
        ]
    }
    server.request(msg, function (err, resp) {
        if (err) {
            console.log(err);
        }
        else {
            console.dir(resp);
            //var ast = server.files[filecount++].ast;
            console.dir(server.files.length);
        }
    });

}

function analyze (path, fullres, project) {
    var loc = 0;
    var functions = 0;
    var functionDecls = 0;
    var functionExprs = 0;
    var namedFuncExprs = 0;
    var anonCBs = 0;
    var minC = 0;
    var maxC = 0;
    var meanC = 0;
    var setTimeouts = 0;
    var setIntervals = 0;
    var setImmediates = 0;
    //var calls = 0;
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
    text.split(/\r?\n/).forEach(function (line) {
        loc++;
    });

    var charPerLine = text.length / text.split("\n").length;
    if (charPerLine > 300) {
        //    console.log("skipping - probably minified (" + charPerLine + " char/line); "+ path );
        return;
    }
    try {


        var ast = esprima.parse(text, { tolerant: true, loc: true, range: true });
        estraverse.traverse(ast, {
            enter: enter
        });
        var compArr=[];
        jshint(text);
        var funcs = jshint.data().functions;
        if (funcs.length) {
            funcs.forEach(function (entry) {
                //console.dir(entry.metrics.complexity);
                compArr.push(entry.metrics.complexity);
            });

            minC = compArr.reduce(function (p, v) {
                return ( p < v ? p : v );
            });
            maxC = compArr.reduce(function (p, v) {
                return ( p > v ? p : v );
            });
            meanC = compArr.reduce(function (a, b) {
                return a + b;
            }, 0) / compArr.length;
        }

    }
    catch (e) {
        // pass exception object to error handler
        //console.dir(e);
    }

    function enter(node) {
        if (node.type === 'VariableDeclarator') {
            //  console.dir(node);
        }
        if (node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') {
            functions++;
            // console.dir(node);
            for (i in node.params) {
                if (node.params[i].type == 'Identifier') {
                    if (i ==0 && /err/.test(node.params[i].name)) {//console.log(node.params[i].name)
                    errcbcount++ };
                } else {
                    console.log(node.params[i].type);
                }
            }
            //console.dir(node.params[0].name);
            if (node.params.length > paramsmax) {
                paramsmax = node.params.length;
            }
            if (paramscount[node.params.length] == 0 | paramscount[node.params.length]) {
                paramscount[node.params.length]++;
            } else {
                paramscount[node.params.length] = 1;
            }
        }
        if (node.type === 'FunctionDeclaration') {
            //console.dir(node.id.name);
            functionDecls++;
        }
        if (node.type === 'FunctionExpression') {
            if (node.id && node.id.name) {
                namedFuncExprs++;
            }
            functionExprs++;
        }
        if (node.type === 'CallExpression') {
            calls++;
            //console.log("call..")
            if (node.arguments.length > argsmax) {
                argsmax = node.arguments.length;
            }
            if (argscount[node.arguments.length] == 0 | argscount[node.arguments.length]) {
                argscount[node.arguments.length]++;
            } else {
                argscount[node.arguments.length] = 1;
            }
            //console.dir(node.arguments);
            for (i in node.arguments) {
                if (node.arguments[i].type == 'Identifier') {
                    //console.log(node.arguments[i].name);
                    var name = node.arguments[i].name;
                    var range = node.arguments[i].range;

                    location = Math.floor((range[0] + range[1]) / 2);

                    //var msg = {
                    //    "query": {
                    //        "type": "type",
                    //        "file": path,
                    //        "end": location
                    //    },
                    //    "files": [
                    //        {
                    //            "type": "full",
                    //            "name": path,
                    //            "text": text
                    //        }
                    //    ]
                    //}
                    //server.request(msg, function (err, resp) {
                    //    if (err) {
                    //        console.log(err);
                    //    }
                    //    else {
                    //        console.dir(node.loc.start.line + ':' + node.loc.start.column + ' : ' + resp.name + ' : ' + resp.type);
                    //        if (/fn/.test(resp.type)) {
                    //            console.log('####');
                    //            namedCBs++;
                    //        } else if (/\?/.test(resp.type)) {
                    //            console.log('????');
                    //            unknowns++;
                    //        }
                    //        //var ast = server.files[0].ast;
                    //        //console.dir(ast);
                    //    }
                    //});
                } else if (node.arguments[i].type == 'FunctionExpression'){
                    anonCBs++;
                }
            }
            if (node.callee.type == 'Identifier') {
                var id = node.callee.name;
                var range = node.callee.range;

                location = Math.floor((range[0] + range[1]) / 2);
                switch (id) {
                    case 'require':
                        requires++;
                        break;
                    case 'define':
                        defines++;
                        break;
                    case 'setTimeout':
                        setTimeouts++;
                        break;
                    case 'setInterval':
                        setIntervals++;
                        break;
                    case 'setImmediate':
                        setImmediates++;
                        break;
                    case 'Number':
                    case 'String':
                        break;
                    default:

                        var msg = {
                            "query": {
                                "type": "type",
                                "file": path,
                                "end": location
                            },
                            "files": [
                                {
                                    "type": "full",
                                    "name": path,
                                    "text": text
                                }
                            ]
                        }
                        server.request(msg, function (err, resp) {
                            if (err) {
                                console.log(err);
                            }
                            else {
                                //console.dir(node.loc.start.line + ':' + node.loc.start.column + ' : ' + resp.name + ' : ' + resp.type);
                                if (/fn/.test(resp.type)) {
                                    //console.log('####');
                                    namedCBs++;
                                } else if (/\?/.test(resp.type)) {
                                    console.log(id+" : "+range)
                                    console.log('????');
                                    unknowns++;
                                }
                                //var ast = server.files[0].ast;
                                //console.dir(ast);
                            }
                        });

                        //var msg = {
                        //    "query": {
                        //        "type": "definition",
                        //        "file": path,
                        //        "end": location
                        //    },
                        //    "files": [
                        //        {
                        //            "type": "full",
                        //            "name": path,
                        //            "text": text
                        //        }
                        //    ]
                        //}
                        //server.request(msg, function (err, resp) {
                        //    if (err) {
                        //        console.log(err);
                        //    }
                        //    else {
                        //        console.log("def...");
                        //        //console.log(resp);
                        //        console.dir(node.loc.start.line + ':' + node.loc.start.column + ' : ' + resp.start+':'+resp.end+':'+resp.origin);
                        //    }
                        //});
                        break;
                }
            } else if (node.callee.type == 'MemberExpression') {
                if (node.callee.property.type === 'Identifier' && node.callee.object.type === 'Identifier') {
                    var id = node.callee.object.name + '.' + node.callee.property.name;
                    if (node.callee.object.name == 'fs') {
                        //console.log('fs!!!')
                        if ((/Sync$/).test(node.callee.property.name)) {
                            fsSyncs++;
                        } else {
                            fsAsyncs++;
                        }
                    } else if (node.callee.object.name == 'async') {
                        if (async_types[node.callee.property.name] == 0 | async_types[node.callee.property.name]) {
                            async_types[node.callee.property.name]++;
                        } else {
                            async_types[node.callee.property.name] = 1;
                        }
                    }

                    //console.log(id);
                    var name = node.callee.property.name;
                    var range = node.callee.property.range;

                    location = Math.floor((range[0] + range[1]) / 2);
                    var msg = {
                        "query": {
                            "type": "type",
                            "file": path,
                            "end": location
                        },
                        "files": [
                            {
                                "type": "full",
                                "name": path,
                                "text": text
                            }
                        ]
                    }
                    server.request(msg, function (err, resp) {
                        if (err) {
                            console.log(err);
                        }
                        else {
                            //console.dir(node.loc.start.line + ':' + node.loc.start.column + ' : ' + resp.name + ' : ' + resp.type);
                            if (/fn/.test(resp.type)) {
                                //console.log('####');
                                namedCBs++;
                            } else if (/\?/.test(resp.type)) {
                                var pre_substrings = ['Math','assert','console','os','process','fs','test','path','JSON','require','exports','Error','URL','Object','Array','Buffer','Date','String','readline', 'net', 'http', 'https', 'tls', 'crypto', 'dgram', 'zlib', 'child_process', 'cluster', 'dns']
                                var substrings = ['log','indexOf','forEach','keys','map','join','apply','shift','unshift','concat','pop','push','call','charAt','substr','replace','filter','split','slice','splice','toLowerCase','toUpperCase','toString','charCodeAt','equal','ok']
                                if (new RegExp(pre_substrings.join("|")).test(node.callee.object.name)) {

                                }else if (new RegExp(substrings.join("|")).test(node.callee.property.name)) {
                                    // At least one match
                                }else{
                                    console.log(node.callee.object.name+'........'+node.callee.property.name);
                                    console.log('????');
                                    unknowns++;
                                }
                            }
                            //var ast = server.files[0].ast;
                            //console.dir(ast);
                        }
                    });


                    //function isSystemCall(element, index, array) {
                    //    var RegEx = new RegExp('^' + element + '$');
                    //    return RegEx.test(node.callee.object.name);
                    //}
                    //
                    //if (['readline', 'net', 'http', 'https', 'tls', 'crypto', 'dgram', 'zlib', 'child_process', 'cluster', 'dns'].some(isSystemCall)) {
                    //       console.log('system call >>>>'+id);
                    //}

                    switch (id) {
                        case 'process.nextTick':
                            nextTicks++;
                            break;
                        default:
                            break;
                    }

                } else if (node.callee.property.type === 'Identifier' && node.callee.object.type === 'ThisExpression') {
                    //  console.dir('This.'+node.callee.property.name);
                } else if (node.callee.property.type === 'Identifier' && node.callee.object.type === 'CallExpression') {
                    // console.dir('...().'+node.callee.property.name);
                } else if (node.callee.property.type === 'Identifier' && node.callee.object.type === 'MemberExpression') {
                    // console.dir('...[].'+node.callee.property.name);
                } else if (node.callee.property.type === 'Identifier' && node.callee.object.type === 'ConditionalExpression') {
                    // console.dir('...[].'+node.callee.property.name);
                } else if (node.callee.property.type === 'Identifier' && node.callee.object.type === 'LogicalExpression') {
                    // console.dir('...[].'+node.callee.property.name);
                } else if (node.callee.property.type === 'Identifier' && node.callee.object.type === 'BinaryExpression') {
                    // console.dir('...[].'+node.callee.property.name);
                } else if (node.callee.property.type === 'Literal' && node.callee.object.type === 'MemberExpression') {
                    // console.dir('...[].'+node.callee.property.value);
                } else if (node.callee.property.type === 'Identifier' && node.callee.object.type === 'Literal') {
                    // console.dir(node.callee.object.value+'.'+node.callee.property.name);
                } else if (node.callee.property.type === 'MemberExpression' && node.callee.object.type === 'MemberExpression') {
                    // console.dir(node.callee.object.value+'.'+node.callee.property.name);
                } else if (node.callee.property.type === 'MemberExpression' && node.callee.object.type === 'Identifier') {
                    // console.dir(node.callee.object.value+'.'+node.callee.property.name);
                } else if (node.callee.property.type === 'BinaryExpression' && node.callee.object.type === 'Identifier') {
                    // console.dir(node.callee.object.value+'.'+node.callee.property.name);
                } else {
                    // console.log('not analyzwed!!');
                    // console.dir(node.callee);
                }
            } else if (node.callee.type == 'CallExpression') {
                //console.dir('(...)()');
            } else if (node.callee.type == 'FunctionExpression') {
                // console.dir('(func ..)()');
            } else if (node.callee.type == 'ConditionalExpression') {
                // (classCondition ? jqLiteAddClass : jqLiteRemoveClass)(element, className);
                // console.dir('(...? ..)()');
            } else if (node.callee.type == 'LogicalExpression') {
                // ( compiled || compile( selector, match ) )();
                // console.dir('(...|| ..)()');
            } else {
                // console.log('not analyzed!!!!!!');
                //  console.dir(node.callee)
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
        namedFuncExprs: namedFuncExprs,
        anonCBs: anonCBs,
        minComplexity: minC,
        maxComplexity: maxC,
        meanComplexity: meanC,
        calls: calls,
        requires: requires,
        defines: defines,
        fsSyncs: fsSyncs,
        fsAsyncs: fsAsyncs,
        setTimeouts: setTimeouts,
        setIntervals: setIntervals,
        setImmediates: setImmediates,
        nextTicks: nextTicks,
        argscount: argscount,
        argsmax: argsmax,
        paramscount: paramscount,
        paramsmax: paramsmax
    });


};


