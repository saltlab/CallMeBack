var fs = require('fs');
var esprima = require('esprima');
var escodegen = require('escodegen');
var estraverse = require('estraverse');
var filename = process.argv[2];
//console.log('Processing', filename);
var src = fs.readFileSync(filename);
var ast = esprima.parse(src, { tolerant: true, loc: true, range: true });

var utils = require('./utils.js');

var bindings = require('./javascript-call-graph/bindings'),
astutil = require('./javascript-call-graph/astutil'),
pessimistic = require('./javascript-call-graph/pessimistic'),
semioptimistic = require('./javascript-call-graph/semioptimistic'),
diagnostics = require('./javascript-call-graph/diagnostics'),
callbackCounter = require('./javascript-call-graph/callbackCounter'),
requireJsGraph = require('./javascript-call-graph/requireJsGraph');
ArgumentParser = require('argparse').ArgumentParser;

var functions = [];

estraverse.traverse(ast, {
    enter: enter
});

function enter(node) {
    setParent(node);
//    if (node.type === 'FunctionDeclaration' ||
//        node.type === 'FunctionExpression' ||
//        node.type === 'Program'){
//        node.$haveLeader=true;
//    }
    console.log(fullID(node));

    if (node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') {
        functions.push(node);
    }

};

estraverse.traverse(ast, {
    enter: enterx
});

function enterx(node) {
    if(node.$haveLeader){
        console.log(fullID(node)+'-> yayy');
    }
    if(node.type == 'CallExpression'){
   	//console.log(fullID(node)+'->'+fullID(getEnclosingFunction(node)));
   } else if(~(node.type).indexOf("Statement") || ~(node.type).indexOf("Expression")){
     //  console.log(fullID(node));
   }
};

function fullID(node) {
    return utils.makeId(node.type, node.loc);
}


// Returns the function or program immediately enclosing the given node, possibly the node itself.
function getEnclosingFunction(node) {
    while  (node.type !== 'FunctionDeclaration' &&
        node.type !== 'FunctionExpression' &&
        node.type !== 'Program') {
        node = node.$parent;
    }
    return node;
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
            if(k=='consequent'){
                node[k].$haveLeader=true;
            }else if(k=='alternate'){
                node[k].$haveLeader=true;
            }
        }
        else if (val instanceof Array) {
            for (var i=0; i<val.length; i++) {
                var elm = val[i];
                if (typeof elm === "object" && typeof elm.type === "string") {
                    val[i].$parent = node;
                }
            }
        }
    }
}

var astx = astutil.buildAST([filename]);
bindings.addBindings(astx);
var cg = semioptimistic.buildCallGraph(astx);

function pp(v) {
	if (v.type === 'CalleeVertex')
		return astutil.ppAltPos(v.call);
	if (v.type === 'FuncVertex')
		return astutil.ppAltPos(v.func);
	if (v.type === 'NativeVertex')
		return v.name;
    if (v.type === 'ArgumentVertex')
        return v.node.callee.name;
	throw new Error("strange vertex: " + v);
}

cg.edges.iter(function (call, fn) {
	//console.log(pp(call) + " ::::-> " + pp(fn));
});


