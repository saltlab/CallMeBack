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



falafel({ source: src,
	loc: true
}, function (node) {

	if (node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') {		
		var id = 'cluster'+makeId(node.type,node.loc);
		var newlabel = concoctFunctionName (node);
		
		var params = [];
		node.params.forEach(function (param) {
			params.push({ name: param.name, start: param.loc.start, end: param.loc.end });
		});

		g.addNode(id,{ label: newlabel, paras: JSON.stringify(params)});



	} else if (node.type === 'CallExpression') {


	} else if (node.type === 'Program') {
		var newlabel = makeId(node.type,node.loc);
		g.addNode('cluster'+newlabel,{ label: 'Program' });

	} else if (node.type === 'IfStatement') {

	}
});

var start;
var end;

estraverse.traverse(ast, {
	enter: enter,
	leave: leave
});


// cfg = esgraph(ast);
// console.dir(cfg);

function enter(node){

	if (node.type === 'BlockStatement' || node.type === 'Program'){
		blockChain.push([]);
	}

	if (createsNewScope(node)){
		scopeChain.push([]);
	}
	if (node.type === 'CallExpression'){

		var currentScope = scopeChain[scopeChain.length - 1];
		currentScope.push(node);

		var currentBlock = blockChain[blockChain.length - 1];
		currentBlock.push(node);
	}
}



function leave(node){

	if (node.type === 'BlockStatement' || node.type === 'Program'){
		var callsites = blockChain.pop();

		callsites.forEach(function(node) {
			var child = makeId(node.type,node.loc);
			
		});
	}

	if (createsNewScope(node)){
		//checkForLeaks(assignments, scopeChain);
		var nodeId;

		var callsites = scopeChain.pop();

		var parent = 'cluster'+makeId(node.type,node.loc);

		callsites.forEach(function(node) {
			var child = makeId(node.type,node.loc);
			createConn(child,parent);
			
		});


		function createConn(edge,parent){
			var hash = crypto.createHash('md5').update(parent).digest('hex').slice(28);
			if (nodeId==undefined) {
				nodeId=0;
				g.addNode(hash+nodeId,{ shape: 'point' });
			}
			var a = nodeId;
			var b = nodeId+1;
			
			g.addNode(hash+b,{ shape: 'point' });
			g.parent(hash+a, parent);
			g.parent(hash+b, parent);
			g.addEdge(edge, hash+a, hash+b, { label: edge });
			nodeId++;
		}
	}
}





// uses the surrounding code to generate a reasonable name for a function
function concoctFunctionName (node) {
	var name = undefined;

	if (node.type === 'FunctionDeclaration') {
		// function xxx() { }
		//  -> "xxx"
		name = node.id.name;
	} else if (node.type === 'FunctionExpression') {
		if (node.id) {
			// (function xxx() { })
			//  -> "xxx"
			name = node.id.name;
		} else if (node.parent.type === 'VariableDeclarator') {
			// var xxx = function () { }
			//  -> "xxx"
			name = node.parent.id.name;
		} else if (node.parent.type === 'AssignmentExpression') {
			var left = node.parent.left;
			if (left.type === 'MemberExpression' && !left.computed) {
				if (left.object.type === 'MemberExpression' && !left.object.computed) {
					if (left.object.property.type === 'Identifier' && left.object.property.name === 'prototype') {
						// yyy.prototype.xxx = function () { }
						//  -> "yyy.xxx"
						name = left.object.object.name + '.' + left.property.name;
					}
				}
			}
			else if (left.type === 'Identifier') {
				// xxx = function () { }
				//  -> "xxx"
				name = left.name;
			}
		} else if (node.parent.type === 'CallExpression') {
			// look, I know this is a regexp, I'm just sick of parsing ASTs
			if (/\.on$/.test(node.parent.callee.source())) {
				var args = node.parent.arguments;
				if (args[0].type === 'Literal' && typeof args[0].value === 'string') {
					// .on('event', function () { })
					//  -> "('event' handler)"
					name = "('" + args[0].value + "' handler)";
				}
			} else if (node.parent.callee.type === 'Identifier') {
				if (['setTimeout', 'setInterval'].indexOf(node.parent.callee.name) !== -1) {
					// setTimeout(function () { }, xxx)
					// setInterval(function () { }, xxx)
					//  -> "timer handler"
					name = 'timer handler';
					if (node.parent.arguments[1] && node.parent.arguments[1].type === 'Literal' && typeof node.parent.arguments[1].value === 'number') {
						// setTimeout(function () { }, 100)
						// setInterval(function () { }, 1500)
						//  -> "timer handler (100ms)"
						//  -> "timer handler (1.5s)"
						if (node.parent.arguments[1].value < 1000) {
							name += ' (' + node.parent.arguments[1].value + 'ms)';
						} else {
							name += ' (' + (node.parent.arguments[1].value / 1000) + 's)';
						}
					}
					name = '(' + name + ')';
				} else {
					// xxx(function () { })
					//  -> "('xxx' callback)"
					name = "('" + node.parent.callee.source() + "' callback)";
				}
			} else if (node.parent.callee.type === 'MemberExpression') {
				if (node.parent.callee.property.type === 'Identifier') {
					// xxx.yyy(..., function () { }, ...)
					//  -> "('yyy' callback)"
					name = "('" + node.parent.callee.property.name + "' callback)";
				}
			}
		} else if (node.parent.type === 'Property') {
			// { xxx: function () { } }
			//  -> "xxx"
			name = node.parent.key.name || node.parent.key.value;
			if (name !== undefined) {
				if (node.parent.parent.type === 'ObjectExpression') {
					var obj = node.parent.parent;
					if (obj.parent.type === 'VariableDeclarator') {
						// var yyy = { xxx: function () { } }
						//  -> "yyy.xxx"
						name = obj.parent.id.name + '.' + name;
					} else if(obj.parent.type === 'AssignmentExpression') {
						var left = obj.parent.left;
						if (left.type === 'MemberExpression' && !left.computed) {
							if (left.object.type === 'Identifier' && left.property.name === 'prototype') {
								// yyy.prototype = { xxx: function () { } }
								//  -> "yyy.xxx"
								name = left.object.name + '.' + name;
							}
						}
					}
				}
			}
		}
	}
	return name;
};

// function isVarDefined(varname, scopeChain){
// 	for (var i = 0; i < scopeChain.length; i++){
// 		var scope = scopeChain[i];
// 		if (scope.indexOf(varname) !== -1){
// 			return true;
// 		}
// 	}
// 	return false;
// }
// function checkForLeaks(assignments, scopeChain){
// 	for (var i = 0; i < assignments.length; i++){
// 		if (!isVarDefined(assignments[i], scopeChain)){
// 			console.log('Detected leaked global variable:', assignments[i]);
// 		}
// 	}
// }

function createsNewScope(node){
	return node.type === 'FunctionDeclaration' ||
	node.type === 'FunctionExpression' ||
	node.type === 'Program';
}

function makeId (type, loc) {
	return type + '-'
	+ loc.start.line + '-'
	+ loc.start.column + '-'
	+ loc.end.line + '-'
	+ loc.end.column;
};

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
	throw new Error("strange vertex: " + v);
}

cg.edges.iter(function (call, fn) {
	//console.log(pp(call) + " -> " + pp(fn));
	if(g.hasEdge(pp(call))){
		var RegEx  =  new RegExp(pp(fn));
		var checkSet = false;
		g.eachNode(function(u, value) {
			if (RegEx.test(u)) {
				var t = g.children(u);
				if(t[0]!=undefined){
					g.addEdge(null, g.source(pp(call)), t[0], { color: 'red' });
				}
				else {
					var newnode =  g.addNode(null,{ shape: 'point' });
					g.parent(newnode, u);
					g.addEdge(null, g.source(pp(call)),newnode, { color: 'red' });
				}
				checkSet = true;
			}
		});
		if (!checkSet & pp(fn)!='Math_log'){
			g.addNode(pp(fn),{ shape: 'point' });
			g.parent(pp(fn), 'clustersys');
			g.addEdge(null, g.source(pp(call)),pp(fn), { color: 'red', label:pp(fn) });
			checkSet = true;
		}
	}
});

//console.log(g);
console.log(dot.write(g));