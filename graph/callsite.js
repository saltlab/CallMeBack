var fs = require('fs');
var esprima = require('esprima');
var estraverse = require('estraverse');
var filename = process.argv[2];
//console.log('Processing', filename);
var src = fs.readFileSync(filename);
var ast = esprima.parse(src, { tolerant: true, loc: true, range: true });



var bindings = require('./javascript-call-graph/bindings'),
astutil = require('./javascript-call-graph/astutil'),
pessimistic = require('./javascript-call-graph/pessimistic'),
semioptimistic = require('./javascript-call-graph/semioptimistic'),
diagnostics = require('./javascript-call-graph/diagnostics'),
callbackCounter = require('./javascript-call-graph/callbackCounter'),
requireJsGraph = require('./javascript-call-graph/requireJsGraph');
ArgumentParser = require('argparse').ArgumentParser;

var crypto = require('crypto');

var graphlib = require("graphlib");
var dot = require("graphlib-dot");

var falafel = require('falafel');
var falafelMap = require('falafel-map');

//var walkes = require('walkes');
var esgraph = require('esgraph');



var g = new dot.DotDigraph();
g.addNode('clustersys',{ label: 'system' });

var scopeChain = [];
var assignments = [];
var blockChain = [];

var successorMap={};

var tempgraph={};

var functions = [];

falafel({ source: src,
	loc: true
}, function (node) {
	if (node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') {		
		functions.push(node);
	}

	if (node.type === 'Program' || node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration'){


	}

	if (node.type === 'BlockStatement' ||node.type === 'IfStatement'){

	}
});


functions.concat(ast).forEach(function (a, i) {
    console.log("*****"+makeId(a.type, a.loc));
 //   console.log(node);
    if(!Array.isArray(a.body)){
        estraverse.traverse(a.body, {
            enter: enter
        });
    }
    else {
        a.body.forEach(function(elm){
            console.log("elm "+makeId(elm.type, elm.loc));
            //console.log(elm);
            estraverse.traverse(elm, {
                enter: enter
            });
        })
    }


    function enter(b){
        console.log("entering  a >>>>"+makeId(b.type, b.loc));
        if (b.type === 'FunctionExpression' || b.type === 'FunctionDeclaration') {
            this.skip();
        }
        if (b.type === 'ExpressionStatement' && b.expression.type !== 'AssignmentExpression') {
            console.log(">>>>"+makeId(b.type, b.loc));
            buildGraphFromExpr(b.expression);
        }
    }

});


//function enter(node){
//    if (node.type === 'BlockStatement' ||node.type === 'Program') {
//        var kids= node.body;
//        for(i=0; i< (kids.length)-1;i++)
//        {
//            var currentNode = kids[i];
//            var successor = kids[i+1];
//            currentNode.$successor=successor;
//        }
//
//    }
//
//}
//
//function leave(node){
//if(node.$successor) {
// //   console.log(makeId(node.type, node.loc) + '-' + makeId(node.$successor.type, node.$successor.loc));
//}
//}


function makeId (type, loc) {
	return type + '-'
	+ loc.start.line + '-'
	+ loc.start.column + '-'
	+ loc.end.line + '-'
	+ loc.end.column;
};

function s4() {
		return Math.floor((1 + Math.random()) * 0x10000)
		.toString(16)
		.substring(1);
};

//estraverse.traverse(ast, {
//    enter: enter,
//    leave: leave
//});

function buildGraphFromExpr(astXNode) {
    var callExprs=[];

    estraverse.traverse(astXNode, {
        leave: leave
    });

    function leave(c){
        if (c.type == 'CallExpression'){
            console.log(makeId(c.type, c.loc));
            callExprs.push(c);
            c.$gnode = g.addNode(makeId(c.type,c.loc));
        }
    }

    for(var i=0; i< (callExprs.length)-1;i++)
    {
        var currentNode = callExprs[i];
        var successor = callExprs[i+1];
        console.log(currentNode.$gnode,successor.$gnode);


        console.log(g)
        g.addEdge(null,currentNode.$gnode+"",successor.$gnode+"");
    }
}

//falafel({ source: src,
//    loc: true
//}, function (node) {
//    if (node.type === 'ExpressionStatement') {
//        console.log(">>>>"+makeId(node.type, node.loc));
//        buildGraphFromExpr(node.expression);
//    }
//
//
//});

console.log(dot.write(g));




var continueTargets = [
    'ForStatement',
    'ForInStatement',
    'DoWhileStatement',
    'WhileStatement'];
var breakTargets = continueTargets.concat(['SwitchStatement']);
var throwTypes = [
    'AssignmentExpression', // assigning to undef or non-writable prop
    'BinaryExpression', // instanceof and in on non-objects
    'CallExpression', // obviously
    'MemberExpression', // getters may throw
    'NewExpression', // obviously
    'UnaryExpression' // delete non-deletable prop
];

var leafTypes = [
    'ExpressionStatement',
    'ContinueStatement',
    'BreakStatement',
    'ReturnStatement',
    'ThrowStatement',
    'WithStatement',
    'EmptyStatement'
    ]

var scopeNodes = [
    'FunctionDeclaration',
    'FunctionExpression',
    'Program'
    ]

