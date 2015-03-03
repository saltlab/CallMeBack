var fs = require('fs');
var json2csv = require('json2csv');
var estraverse = require('estraverse');
var jshint = require('jshint').JSHINT;
var esprima = require('esprima');
ArgumentParser = require('argparse').ArgumentParser;
var tern = require('tern');

var server = new tern.Server({plugins: {node: {}}});


var argParser = new ArgumentParser({
    addHelp: true,
    description: 'ACFG generator'
});
var core_modules = ['assert',
    'buffer',
    'child_process',
    'cluster',
    'console',
    'constants',
    'crypto',
    'dgram',
    'dns',
    'domain',
    'events',
    'fs',
    'http',
    'https',
    'module',
    'net',
    'os',
    'path',
    'process',
    'punycode',
    'querystring',
    'readline',
    'repl',
    'stream',
    '_stream_duplex',
    '_stream_passthrough',
    '_stream_readable',
    '_stream_transform',
    '_stream_writable',
    'string_decoder',
    'sys',
    'timers',
    'tls',
    'tty',
    'url',
    'util',
    'vm',
    'zlib']
var unknowns = {};
var takesCB = {};
var funcs = [];
var allParams = {};
var anoncounter = 0;
var potentials = 0;
var scopeChain = [];
var other1 = 0;
var other2 = 0;
var calls = 0;
var async_calls = 0;

var bindings = require('../graph/javascript-call-graph/bindings'),
    astutil = require('../graph/javascript-call-graph/astutil'),
    pessimistic = require('../graph/javascript-call-graph/pessimistic'),
    semioptimistic = require('../graph/javascript-call-graph/semioptimistic');

argParser.addArgument(
    ['-d', '--directory'],
    {
        nargs: 0,
        help: 'give directory path'
    }
);

argParser.addArgument(
    ['-p', '--pkgs'],
    {
        nargs: 0,
        help: 'analyze pkgs as well'
    }
);


argParser.addArgument(
    ['-t', '--type'],
    {help: 'Should be one of npm, hybrid'}
);


var r = argParser.parseKnownArgs();
var args = r[0],
    files = r[1];

var dirPath = files[0];
var stats = fs.statSync(dirPath);

if (stats.isDirectory()) {
    loadSources(dirPath);
    analyzeFiles(dirPath);
    //console.dir(unknowns);
    //console.dir(takesCB);


    summarize(takesCB);
    //console.dir(potentials);
    //console.dir(other1);
    //console.dir(other2);
    //console.dir(funcs)
}

function loadSources(dir) {
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

function loadFile(path) {
    //  console.log('Loading.. ' + path);
    var text = fs.readFileSync(path, "utf8");

    var charPerLine = text.length / text.split("\n").length;
    if (charPerLine > 300) {
        //    console.log("skipping - probably minified (" + charPerLine + " char/line); "+ path );
        return;
    }

    server.addFile(path, text);
    //console.dir(server.files.length);


}

function analyzeFiles(dir) {
    if (!fs.existsSync(dir)) {
        return console.log('Directory ' + dir + ' does not exist.');
    }

    var haystack = fs.readdirSync(dir), path, stats;

    for (var s = 0; s < haystack.length; s++) {
        path = dir + '/' + haystack[s];
        try {
            stats = fs.statSync(path);

            if (stats.isDirectory()) {
                analyzeFiles(path);
            } else if (path.indexOf('node_modules') >= 0 || path.indexOf('plugins') >= 0) {
                // console.log('Skipping file: ' + path);
            } else if ((/\.js$/).test(path)) {
                //console.log('Analyzing file: ' + path);
                analyzeEach(path);
            } else if ((/package\.json$/).test(path)) {
            }
        }
        catch (e) {

        }
    }
}

function analyzeEach(path) {

    //console.log('Analysing.. ' + path);
    var text = fs.readFileSync(path, "utf8");

    var charPerLine = text.length / text.split("\n").length;
    if (charPerLine > 300) {
        //    console.log("skipping - probably minified (" + charPerLine + " char/line); "+ path );
        return;
    }
    try {
        var ast = esprima.parse(text, {tolerant: true, loc: true, range: true});
        estraverse.traverse(ast, {
            enter: enter,
            leave: leave

        });

        function enter(node) {
            if (node.type === 'CallExpression') {
                calls++;
                if (node.callee.type == 'Identifier') {
                    var id = node.callee.name;
                    var range = node.callee.range;

                    var location = Math.floor((range[0] + range[1]) / 2);


                    var core_bak = ['require', 'define', 'setTimeout', 'detachEvent', 'attachEvent', 'setInterval',
                        'clearInterval', 'clearTimeout', 'setImmediate', 'Number',
                        'String', 'Array', 'Object', 'Error', 'parseInt', 'parseFloat', 'isNaN', 'describe', 'it',
                        'beforeEach', 'afterEach', 'before', 'after', 'specify',
                        'context', 'eval', 'decodeURIComponent', 'encodeURIComponent']
                    var core_functions = ['setTimeout', 'setInterval',
                        'clearInterval', 'clearTimeout', 'setImmediate']
                    if (new RegExp(core_functions.join("|")).test(id)) {
                        async_calls++;
                    } else {

                        var isInParams = false;
                        var response = {};

                        function checkForArgs(element, index, array) {
                            var range = element.range;
                            var location = Math.floor((range[0] + range[1]) / 2);

                            var msg = {
                                "query": {
                                    "type": "type",
                                    "file": path,
                                    "preferFunction": true,
                                    "end": location
                                }
                            }
                            server.request(msg, function (err, resp) {
                                if (err) {
                                   // console.log(err);
                                }
                                else {
                                    //console.log('........' + element.name)
                                    //console.dir(resp)
                                    //console.dir(node.loc.start.line + ':' + node.loc.start.column + ' : ' + resp.name + ' : ' + resp.type);
                                    //console.log('........')

                                    if (resp.type.indexOf('fn(') !== -1) {
                                        //console.log('........' + element.name)
                                        //console.dir(resp)
                                        //console.dir(node.loc.start.line + ':' + node.loc.start.column + ' : ' + resp.name + ' : ' + resp.type);
                                        //console.log('........')
                                        other1++;
                                        return true;
                                    }
                                    return false;

                                }
                            });


                        }

                        isInParams = node.arguments.some(checkForArgs);

                        if (isInParams) {
                            // console.log(node.loc.start.line + ':' + node.loc.start.column + ':' + node.loc.end.line + ':' + node.loc.end.column + ' : ' + id + ' : ' + path)
                        }


                    }

                } else if (node.callee.type == 'MemberExpression') {
                    var eventlistener_methods = ['addEventListener','removeEventListener']
                    if (node.callee.property.type === 'Identifier' && node.callee.object.type === 'Identifier') {
                        var full_id = node.callee.object.name + '.' + node.callee.property.name;
                        //console.log(full_id);
                        if (new RegExp(core_modules.join("|")).test(node.callee.object.name) && !(/Sync$/).test(node.callee.property.name)) {
                            async_calls++;
                        } else if (new RegExp(eventlistener_methods.join("|")).test(node.callee.property.name)) {
                            async_calls++;
                        } else {

                        var range = node.callee.property.range;
                        //console.dir(range)
                        var location = Math.floor((range[0] + range[1]) / 2);

                        var isInParams = false;

                        function logArrayElements(element, index, array) {
                            var range = element.range;
                            var location = Math.floor((range[0] + range[1]) / 2);

                            var msg = {
                                "query": {
                                    "type": "type",
                                    "file": path,
                                    "preferFunction": true,
                                    "end": location
                                }
                            }
                            server.request(msg, function (err, resp) {
                                if (err) {
                                    // console.log(err);
                                }
                                else {
                                    //console.log('@........' + element.name)
                                    //console.dir(resp)
                                    //console.dir(node.loc.start.line + ':' + node.loc.start.column + ' : ' + resp.name + ' : ' + resp.type);
                                    //console.log('@........')

                                    if (resp.type.indexOf('fn(') !== -1) {
                                        other2++;
                                        return true;
                                    }
                                    return false;

                                }
                            });
                        }

                        isInParams = node.arguments.some(logArrayElements);
                        if (isInParams) {
                            //  console.log(node.loc.start.line + ':' + node.loc.start.column + ':' + node.loc.end.line + ':' + node.loc.end.column + ' : ' + full_id + ' : ' + path)
                        }
                    }

                    }
                }
            }
            else if (node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') {

                var prefix = path + ':' + node.loc.start.line + ':' + node.loc.start.column + ':' + node.loc.end.line + ':' + node.loc.end.column + ':';
                if (node.id && node.id.name) {
                    id = (prefix + node.id.name);
                } else {
                    id = (prefix + 'anon' + anoncounter++);
                }

                funcs.push({id: id, range: node.range})

                allParams[id] = [];

                // = node.params.slice();

                function handleParams(element, index, array) {
                    //console.log('a[' + index + '] = ' + element);
                    allParams[id].push(element.name)
                    if (new RegExp(['cb', 'callback', 'cback'].join("|")).test(element.name)) {
                        // console.dir('---'+element.name);
                        takesCB[id] = true;
                    }
                }

                takesCB[id] = false;
                scopeChain.push(id);

                node.params.forEach(handleParams);
                //console.log('content here:::')
                //console.dir (allParams[id])


            }
        }

        function leave(node) {
            if (node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') {
                scopeChain.pop();
            }
        }

    }
    catch (e) {
        // pass exception object to error handler
        //console.dir(e);
    }
}

function createsNewScope(node) {
    return node.type === 'FunctionDeclaration' ||
        node.type === 'FunctionExpression' ||
        node.type === 'Program';
}

function isVarParam(varname, scopeChain) {
    for (var i = 0; i < scopeChain.length; i++) {
        var scope = scopeChain[i];
        if (allParams[scope].indexOf(varname) !== -1) {
            takesCB[scope] = true;
            //  console.log('@@@@ -----------'+varname)
            return true;
        }
    }
    return false;
}

function isVarParamAlternate(varname, scopeChain) {
    for (var i = 0; i < scopeChain.length; i++) {
        var scope = scopeChain[i];
        if (allParams[scope].indexOf(varname) !== -1) {
            return true;
        }
    }
    return false;
}

function summarize(obj) {
    var cbtruecount = 0;
    var cbfalsecount = 0;
    for (var prop in obj) {
        if (obj[prop] == true) {
            cbtruecount++
        } else if (obj[prop] == false) {
            cbfalsecount++
        }
    }
    async_calls += other1+other2
    console.log(dirPath + ',' + async_calls + ',' + calls)
}



