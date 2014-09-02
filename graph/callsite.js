var fs = require('fs');
var esprima = require('esprima');
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

var crypto = require('crypto');

var graphlib = require("graphlib");
var dot = require("graphlib-dot");

var falafel = require('falafel');
var falafelMap = require('falafel-map');

//var walkes = require('walkes');
var esgraph = require('esgraph');


var g = new dot.DotDigraph();
g.addNode('clustersys', { label: 'system' });

var scopeChain = [];
var assignments = [];
var blockChain = [];

var successorMap = {};

var tempgraph = {};

var functions = [];


estraverse.traverse(ast, {
    enter: enter
});

function enter(node) {
    if (node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') {
        functions.push(node);
    }

    if (node.type === 'CallExpression') {
        node.$gnode = g.addNode(utils.makeId(node.type, node.loc));

    }

    if (node.type === 'BlockStatement' || node.type === 'Program') {
        backToFront(node.body);
    }
    if (node.type === 'SwitchCase' ) {
        backToFront(node.consequent);
    }
    if (node.type === 'SwitchStatement') {
        backToFront(node.cases);
    }
};



functions.concat(ast).forEach(function (a, i) {
 //   console.log("*****" + utils.makeId(a.type, a.loc));
    //   console.log(node);
    if (!Array.isArray(a.body)) {
        estraverse.traverse(a.body, {
            enter: enter
        });
    }
    else {
        a.body.forEach(function (elm) {
 //           console.log("elm " + utils.makeId(elm.type, elm.loc));
            //console.log(elm);
            estraverse.traverse(elm, {
                enter: enter
            });
        });
    }


    function enter(b) {
        console.log("enter " + utils.makeId(b.type, b.loc));

        if (b.type === 'FunctionExpression' || b.type === 'FunctionDeclaration') {
            this.skip();
        }

        else if (b.type === 'ExpressionStatement') {
            buildGraphFromExpr(b.expression);
        }
        else if (b.type === 'IfStatement') {
            buildGraphFromExpr(b.test);
        }
        else if (b.type === 'DoWhileStatement' || b.type === 'WhileStatement') {
            buildGraphFromExpr(b.test);
        }
        else if (b.type === 'ForStatement') {
            if (b.init){
                buildGraphFromExpr(b.init);
            }
            if (b.test){
                buildGraphFromExpr(b.test);
            }
            if (b.update){
                buildGraphFromExpr(b.update);
            }
        }
        else if (b.type === 'SwitchStatement') {
            console.log(b);
            buildGraphFromExpr(b.discriminant);
        }
        else if (b.type === 'ReturnStatement') {
            buildGraphFromExpr(b.argument);
        }
    }

});


function buildGraphFromExpr(astXNode) {
    console.log("buiding from " + utils.makeId(astXNode.type, astXNode.loc));
    var callExprs = [];

    estraverse.traverse(astXNode, {
        enter: enter,
        leave: leave
    });

    function enter(b) {
        //console.log("entering  a >>>>"+utils.makeId(b.type, b.loc));
        if (b.type === 'FunctionExpression') {
            this.skip();
        }
    };

    function leave(c) {
        if (c.type == 'CallExpression') {
            callExprs.push(c);
        }
    };

    for (var i = 0; i < (callExprs.length) - 1; i++) {
        var currentNode = callExprs[i];
        var successor = callExprs[i + 1];


        g.addEdge(null, currentNode.$gnode + "", successor.$gnode + "");
    }
}


console.log(dot.write(g));

function backToFront(list) {
    // link all the children to the next sibling from back to front,
    // so the nodes already have .nextSibling
    // set when their getEntry is called
    for (var i = list.length - 1; i >= 0; i--) {
        var child = list[i];
        if (i < list.length - 1)
            child.$nextSibling = list[i + 1];
    }
}

function linkSiblings(astNode) {



    function BlockOrProgram(node, recurse) {
        backToFront(node.body, recurse);
    }
    walker(astNode, {
        BlockStatement: BlockOrProgram,
        Program: BlockOrProgram,
        FunctionDeclaration: function () {},
        FunctionExpression: function () {},
        SwitchCase: function (node, recurse) {
            backToFront(node.consequent, recurse);
        },
        SwitchStatement: function (node, recurse) {
            backToFront(node.cases, recurse);
        },
    });
}


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
];

var scopeNodes = [
    'FunctionDeclaration',
    'FunctionExpression',
    'Program'
];

