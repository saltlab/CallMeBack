var fs = require('fs');
var json2csv = require('json2csv');
var estraverse = require('estraverse');
var jshint = require('jshint').JSHINT;
var esprima = require('esprima');
var tern = require('tern');

var loc = 0;
var functions = 0;
var functionDecls = 0;
var functionExprs = 0;
var namedFuncExprs = 0;
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


var file = process.argv[2];

var src = fs.readFileSync(file,'utf-8');
var server = new tern.Server({});
//server.addFile(file);

var msg = {
    "query": {
        "type": "type",
        "file": "myfile.js",
        "end": 440
    },
    "files": [
        {
            "type": "full",
            "name": "myfile.js",
            "text": src
        }
    ]
}
//server.request(msg, function(err, resp) {
//    if (err) throw err;
//    else {console.dir(resp);
//        //var ast = server.files[0].ast;
//        //console.dir(ast);
//        }
//});



var ast = esprima.parse(src, { tolerant: true, loc: true, range: true });
jshint(src+'');
var funcs = jshint.data().functions;
funcs.forEach(function(entry) {
    //console.dir(entry.metrics.complexity);
  //  console.dir(entry.metrics);
});

//console.dir(jshint.data());

estraverse.traverse(ast, {
    enter: enter,
    leave: leave
});

function setParent(node) {
    //console.dir(node);
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
            for (var i=0; i<val.length; i++) {
                var elm = val[i];
                if (elm != null && typeof elm === "object" && typeof elm.type === "string") {
                    val[i].$parent = node;
                }
            }
        }
    }
}

function leave(node) {

    if (node.type === 'FunctionExpression' && node.$parent.type === 'CallExpression') {

        console.log(' Real:'+ node.loc.start.line +' - '+ node.loc.end.line);



    }


}

function enter(node) {
    setParent(node);
    console.dir(node.range);
    if (node.type === 'VariableDeclarator') {
        //  console.dir(node);
    }
    if (node.type === 'FunctionExpression' && node.$parent.type === 'CallExpression') {
        //console.dir(node);
        console.log('Pushing:'+ node.loc.start.line +' - '+ node.loc.end.line);
    } else if (node.type === 'Identifier' && node.$parent.type === 'CallExpression') {
        console.dir(node);
    }


    if (node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') {
        functions++;
        //console.dir(node.loc.start.line+'-'+node.loc.start.column+'-'+node.loc.end.line+'-'+node.loc.end.column);
        for (i in node.params) {
            if (node.params[i].type == 'Identifier') {
                //  console.log(node.params[i].name);
            }
        }
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
                //  console.log(node.arguments[i].name);
            }
        }
        if (node.callee.type == 'Identifier') {
            var id = node.callee.name;
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
                default:
                    break;
            }
        } else if (node.callee.type == 'MemberExpression') {
            if (node.callee.property.type === 'Identifier' && node.callee.object.type === 'Identifier') {
                var id = node.callee.object.name + '.' + node.callee.property.name;
                if (node.callee.object.name == 'fs') {
                    if ((/Sync$/).test(node.callee.property.name)) {
                        fsSyncs++;
                    } else {
                        fsAsyncs++;
                    }
                }
                //console.log(id);


                function isSystemCall(element, index, array) {
                    var RegEx = new RegExp('^' + element + '$');
                    return RegEx.test(node.callee.object.name);
                }

                if (['readline', 'net', 'http', 'https', 'tls', 'crypto', 'dgram', 'zlib', 'child_process', 'cluster', 'dns'].some(isSystemCall)) {
                    //    console.log(id);
                }

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