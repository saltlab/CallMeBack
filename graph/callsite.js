var fs = require('fs');
var esprima = require('esprima');
var escodegen = require('escodegen');
var estraverse = require('estraverse');

ArgumentParser = require('argparse').ArgumentParser;

var crypto = require('crypto');

var graphlib = require("graphlib");
var dot = require("graphlib-dot");

var falafel = require('falafel');
var falafelMap = require('falafel-map');

var esgraph = require('esgraph');


var argParser = new ArgumentParser({
    addHelp: true,
    description: 'ACFG generator'
});

argParser.addArgument(
    [ '-d','--debug' ],
    { nargs: 0,
        help: 'print debug information' }
);



argParser.addArgument(
    [ '-s','--strategy' ],
    { help: 'Should be one of NONE, ONESHOT (default), DEMAND, and FULL '}
);


var r = argParser.parseKnownArgs();
var args = r[0],
    files = r[1];

args.strategy = args.strategy || 'ONESHOT';
if (!args.strategy.match(/^(NONE|ONESHOT|DEMAND|FULL)$/)) {
    argParser.printHelp();
    process.exit(-1);
}

//console.dir(files);
//console.dir(args.strategy);
console.dir(args.debug);

var src = fs.readFileSync(files[0]);
var ast = esprima.parse(src, { tolerant: true, loc: true, range: true });

var utils = require('./utils.js');


var bindings = require('./javascript-call-graph/bindings'),
    astutil = require('./javascript-call-graph/astutil'),
    pessimistic = require('./javascript-call-graph/pessimistic'),
    semioptimistic = require('./javascript-call-graph/semioptimistic'),
    diagnostics = require('./javascript-call-graph/diagnostics'),
    callbackCounter = require('./javascript-call-graph/callbackCounter'),
    requireJsGraph = require('./javascript-call-graph/requireJsGraph');


var g = new dot.DotDigraph();
g.graph({ compound: true });

var scopeChain = [];
var assignments = [];
var blockChain = [];
var calls = [];
var funcs = {};

var successorMap = {};

var tempgraph = {};

var functions = [];
var nodeEntries = {};
var nextSibling = {};


estraverse.traverse(ast, {
    enter: enter
});

function enter(node) {
    setParent(node);

    if (node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') {
        functions.push(node);
    }

    if (node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration' || node.type === 'Program') {
        var newlabel = utils.concoctFunctionName (node);
        funcs[utils.makeId(node.type,node.loc)] = newlabel;
        var id = 'cluster'+utils.makeId(node.type,node.loc);

        node.$gnode = g.addNode(id,{ label: newlabel });
        var startid = g.addNode(utils.makeId(node.type, node.loc)+'-start', { shape: 'circle', label:'' ,xlabel:'start'});
        g.parent(startid, node.$gnode);
        node.$startnode = {
            start:startid,
            end:startid
        }
        var exitid = g.addNode(utils.makeId(node.type, node.loc)+'-exit', { shape: 'doublecircle', label:'' ,xlabel:'exit'});
        g.parent(exitid, node.$gnode);
        node.$exitnode = {
            start:exitid,
            end:exitid
        }
    }

    if (node.type === 'CallExpression' || node.type === 'IfStatement' || node.type === 'DoWhileStatement' ||
        node.type === 'WhileStatement' || node.type === 'ForStatement' || node.type === 'DoWhileStatement' ||
        node.type === 'SwitchStatement' || node.type === 'ReturnStatement') {
        var newclabel;
        if(node.type === 'CallExpression'){
            calls.push(node);
            newclabel = node.callee.name;
        }
        node.$gnode = g.addNode(utils.makeId(node.type, node.loc), { shape: 'box', label:'' ,xlabel:newclabel||''});
        g.parent(node.$gnode, getEnclosingFunction(node).$gnode);
        if(!getEnclosingFunction(node).$firstChild){
                    getEnclosingFunction(node).$firstChild = node.$gnode;
         //           console.log("adding edge (func start):"+getEnclosingFunction(node).$startnode.end.toString()+' -->'+ node.$gnode)
                    g.addEdge(null, getEnclosingFunction(node).$startnode.end.toString(), node.$gnode);

        }

    }

};

functions.concat(ast).forEach(function (a, i) {
    if (!Array.isArray(a.body)) {
        estraverse.traverse(a.body, {
            enter: enter
        });
    }
    else {
        a.body.forEach(function (elm) {
            estraverse.traverse(elm, {
                enter: enter
            });
        });
    }


    function enter(b) {
        if (b.type === 'FunctionExpression' || b.type === 'FunctionDeclaration') {
            this.skip();
        }

        if (b.type === 'ExpressionStatement') {
            var result = buildGraphFromExpr(b.expression);
            if (result){
                nodeEntries[fullID(b)] = result;
            }
        }
        else if (b.type === 'VariableDeclaration'){
            if(b.declarations[0].init.type==='CallExpression'){
                nodeEntries[fullID(b)] = {};
                nodeEntries[fullID(b)].start = b.declarations[0].init.$gnode;
                nodeEntries[fullID(b)].end = b.declarations[0].init.$gnode;

            };
        }
        else if (b.type === 'IfStatement') {
            nodeEntries[fullID(b)] = buildGraphFromExpr(b.test,b);
            if (nodeEntries[fullID(b)]){
                connectNodes(nodeEntries[fullID(b)].end,b.$gnode);
                nodeEntries[fullID(b)].end = b.$gnode;

                //parentNode = g.addNode('cluster'+utils.makeId(astXNode.type, astXNode.loc));
                g.parent(b.$gnode, 'cluster'+utils.makeId(b.type, b.loc));

            } else {
                nodeEntries[fullID(b)] = {};
                nodeEntries[fullID(b)].start = b.$gnode;
                nodeEntries[fullID(b)].end = b.$gnode;
            }
        }
        else if (b.type === 'DoWhileStatement' || b.type === 'WhileStatement') {
// TODO
            b.$entry = buildGraphFromExpr(b.test);
        }
        else if (b.type === 'ForStatement') {
            var start;
            var end;
            if (b.init){
                b.init.$entry = buildGraphFromExpr(b.init);
                start = b.init.$entry.start;
                if (b.init.$entry.end) {
                    end = b.init.$entry.end;
                }
            }
            if (b.test){
                b.test.$entry = buildGraphFromExpr(b.test);
                if (!start){
                    start = b.test.$entry.start;
                }
                if (b.test.$entry.end) {
                    end = b.test.$entry.end;
                    connectNodes(b.init.$entry.end, b.test.$entry.start);
                }
            }
            if (b.update){
                b.update.$entry = buildGraphFromExpr(b.update);
                if (!start){
                    start = b.update.$entry.start;
                }
                if (b.init.$entry.end) {
                    end = b.update.$entry.end;
                    if(!connectNodes(b.test.$entry.end, b.update.$entry.start)){
                        connectNodes(b.init.$entry.end, b.update.$entry.start)
                    }
                }
            }
            connectNodes(end, b.$gnode);
            end = b.$gnode;
            if(!start){b.$gnode}

            b.$entry={};
            b.$entry.start = start;
            b.$entry.end = end;
        }
        else if (b.type === 'SwitchStatement') {
            // TODO
            b.$entry = buildGraphFromExpr(b.discriminant);
        }
        else if (b.type === 'ReturnStatement') {
            nodeEntries[fullID(b)] = buildGraphFromExpr(b.argument);
            if (nodeEntries[fullID(b)]){
                connectNodes(nodeEntries[fullID(b)].end,b.$gnode);
                nodeEntries[fullID(b)].end = b.$gnode;
            } else {
                nodeEntries[fullID(b)].start = b.$gnode;
                nodeEntries[fullID(b)].end = b.$gnode;
            }
        }
    }

});

estraverse.traverse(ast, {
    enter: linkSiblings
});

function linkSiblings(node) {

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


function connectNodes(a,b,c) {

    if (a && b) {
//        console.log("general connection:"+a.toString()+' -->'+  b.toString())
        return g.addEdge(null, a.toString(), b.toString(),{label:c||''});
    } else {
        return false;
    }
}

function connectNext(a) {
  //  console.log("found:"+nodeEntries[fullID(a)])
   if(nodeEntries[fullID(a)]) {
        //console.dir(a);
  //     console.log("connect next:"+nodeEntries[fullID(a)].end.toString()+' -->'+  getSuccessor(a).start.toString())
       g.addEdge(null, nodeEntries[fullID(a)].end.toString(), getSuccessor(a).start.toString()/*,{label:'y'}*/);
   }
}

function buildGraphFromExpr(astXNode,nodeParent) {
 //   console.log("building from " + utils.makeId(astXNode.type, astXNode.loc));

    var callExprs = [];
    var start;
    var end;
    var parentNode;

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

    if(callExprs.length){
        start = callExprs[0].$gnode;
        end = callExprs[0].$gnode;
        if(nodeParent){
            parentNode = g.addNode('cluster'+utils.makeId(nodeParent.type, nodeParent.loc),{ label: escodegen.generate(astXNode) });
            g.parent(parentNode, getEnclosingFunction(astXNode).$gnode);
        }
    }

    for (var i = 0; i < (callExprs.length) - 1; i++) {

        var currentNode = callExprs[i];
        var successor = callExprs[i + 1];
        if(nodeParent){
            g.parent(currentNode.$gnode, parentNode);
        }

        end = successor.$gnode;
        g.addEdge(null, currentNode.$gnode.toString(), successor.$gnode.toString());
    }
    if (start || end ){
        if(nodeParent){
            g.parent(end, parentNode);
        }
        return {
            start: start,
            end: end
        }
    } else return;

}

estraverse.traverse(ast, {
    enter: reEnter
});

function reEnter (node) {
 //   console.log(fullID(node));
    if (node.type === 'ExpressionStatement') {
//        console.log(fullID(node));
        if(!node.expression.right || node.expression.right.type !== 'FunctionExpression' )
        {
            connectNext(node);
        }
    } else if (node.type === 'ReturnStatement') {
        connectNodes(nodeEntries[fullID(node)].end,getExitNode(node).start);
    } else if (node.type === 'IfStatement') {
        connectNodes(nodeEntries[fullID(node)].end, getEntry(node.consequent).start,'T')
        if (node.alternate) {
            connectNodes(nodeEntries[fullID(node)].end, getEntry(node.alternate).start,'F')
        } else {
            connectNodes(nodeEntries[fullID(node)].end, getSuccessor(node).start,'F')
        }

    } else if (node.type === 'VariableDeclaration'){//console.log(fullID(node));
        connectNext(node);
    }
}


var astx = astutil.buildAST(files);
bindings.addBindings(astx);
var cg = semioptimistic.buildCallGraph(astx);

function pp(v) {
    //console.log(v.type);
    if (v.type === 'CalleeVertex'){
       // console.dir(v);
        return {node:astutil.ppAltPos(v.call), async:false};
    }
    if (v.type === 'FuncVertex'){
        return astutil.ppAltPos(v.func);
    }
    if (v.type === 'NativeVertex'){
        return v.name;
    }
    if (v.type === 'ArgumentVertex') {
        //console.dir(v);
        return {node:astutil.ppAltPos(v.node), async:true};
    }
    throw new Error("strange vertex: " + v);
}

cg.edges.iter(function (call, fn) {
    //console.dir(call);
    // console.log(pp(call).node + " -> " + pp(fn));
    if(g.hasNode(pp(call).node)){
        var RegEx  =  new RegExp(pp(fn));
        var RegExStart  =  new RegExp('start');
        // var checkSet = false
        g.eachNode(function(u, value) {
             if (RegEx.test(u) && RegExStart.test(u)) {
                // console.log(" -> Y");
                //console.dir(nodeEntries)
                //getEnclosingFunction(node).$firstChild = node.$gnode;
                if(pp(call).async) {
                    g.addEdge(null, pp(call).node, u, { color: 'blue' });
                } else {
                    g.addEdge(null, pp(call).node, u, { color: 'red' });
                }
             }

        });

        // var RegEx  =  new RegExp(pp(fn));
        // var checkSet = false;
        // g.eachNode(function(u, value) {
        //     if (RegEx.test(u)) {
        //         var t = g.children(u);
        //         if(t[0]!=undefined){
        //             console.log(" -> E");
        //             g.addEdge(null, g.source(pp(call)), t[0], { color: 'red' });
        //         }
        //         else {
        //             console.log(" -> NA");
        //             var newnode =  g.addNode(null,{ shape: 'point' });
        //             g.parent(newnode, u);
        //             g.addEdge(null, g.source(pp(call)),newnode, { color: 'red' });
        //         }
        //         checkSet = true;
        //     }
        // });
        // if (!checkSet & pp(fn)!='Math_log'){
        //     g.addNode(pp(fn),{ shape: 'point' });
        //     g.parent(pp(fn), 'clustersys');
        //     g.addEdge(null, g.source(pp(call)),pp(fn), { color: 'red', label:pp(fn) });
        //     checkSet = true;
        // }
    }
});

 console.log(dot.write(g));

function backToFront(list) {
    // link all the children to the next sibling from back to front,
    // so the nodes already have .nextSibling
    // set when their getEntry is called

    for (var i = list.length - 1; i >= 0; i--) {
        var child = list[i];
        if (i < list.length - 1){
            //console.log(fullID(child)+'>>'+fullID(list[i + 1]));
            nextSibling[fullID(child)] = getEntry(list[i + 1]);
        }
    }


}

function getEntry(astNode) {
    var target;
    switch (astNode.type) {
        case 'BlockStatement':
        case 'Program':
            return astNode.body.length && getEntry(astNode.body[0]) || getSuccessor(astNode);
        case 'DoWhileStatement':
        case 'ForStatement':
        case 'FunctionDeclaration':
        case 'IfStatement':
        case 'ReturnStatement':
        case 'SwitchStatement':
        case 'EmptyStatement':
        case 'WhileStatement':
        case 'ExpressionStatement':
            var result = nodeEntries[fullID(astNode)] || getSuccessor(astNode);
            //console.log('result:'+result);
            return result;
//        case 'TryStatement':
//            return getEntry(astNode.block);

        case 'BreakStatement':
            target = getJumpTarget(astNode, breakTargets);
            return target ? getSuccessor(target) : getExitNode(astNode);
        case 'ContinueStatement':
            target = getJumpTarget(astNode, continueTargets);
            switch (target.type) {
                case 'ForStatement':
                    // continue goes to the update, test or body
                    return target.update || target.test || getEntry(target.body);
                case 'ForInStatement':
                    return target;
                case 'DoWhileStatement':
                /* falls through */
                case 'WhileStatement':
                    return target.test;
            }
//        // unreached
//        /* falls through */
//        case 'BlockStatement':
//        /* falls through */
//        case 'Program':
//            return astNode.body.length && getEntry(astNode.body[0]) || getSuccessor(astNode);
//        case 'DoWhileStatement':
//            return getEntry(astNode.body);
//        case 'EmptyStatement':
//            return getSuccessor(astNode);
//        case 'ForStatement':
//            return astNode.init || astNode.test || getEntry(astNode.body);
//        case 'FunctionDeclaration':
//            return getSuccessor(astNode);
//        case 'IfStatement':
//            return astNode.test;
//        case 'SwitchStatement':
//            return getEntry(astNode.cases[0]);
//        case 'TryStatement':
//            return getEntry(astNode.block);
//        case 'WhileStatement':
//            return astNode.test;
        default:
            return getSuccessor(astNode);
    }
}

function getJumpTarget(astNode, types) {
    var parent = astNode.$parent;
    while (!~types.indexOf(parent.type) && parent.$parent)
        parent = parent.$parent;
    return ~types.indexOf(parent.type) ? parent : null;
}

function getExitNode(astNode) {
    return getEnclosingFunction(astNode).$exitnode
}

function getStartNode(astNode) {
    return getEnclosingFunction(astNode).$startnode
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

function getSuccessor(astNode) {
    // part of a block -> it already has a nextSibling
    //console.dir('> next sibling '+fullID(astNode))
    //console.dir(nextSibling[fullID(astNode)])
    if (nextSibling[fullID(astNode)]) {
        return nextSibling[fullID(astNode)];
    }
    var parent = astNode.$parent;
    if (!parent || parent.type =='FunctionDeclaration' || parent.type == 'FunctionExpression' ) // it has no parent -> exitNode
    {
        return getExitNode(astNode);
    }

    switch (parent.type) {
        case 'DoWhileStatement':
            return parent.test;
        case 'ForStatement':
            return parent.update || parent.test || getEntry(parent.body);
//        case 'SwitchCase':
//            // the sucessor of a statement at the end of a case block is
//            // the entry of the next cases consequent
//            if (!parent.$nextSibling)
//                return getSuccessor(parent);
//            var check = parent.cfg.nextSibling.astNode;
//            while (!check.consequent.length && check.cfg.nextSibling)
//                check = check.cfg.nextSibling.astNode;
//            // or the next statement after the switch, if there are no more cases
//            return check.consequent.length && getEntry(check.consequent[0]) || getSuccessor(parent.parent);
//        case 'WhileStatement':
//            return parent.test.cfg;
        default:
            return getSuccessor(parent);
    }
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

function fullID(node) {
    return utils.makeId(node.type, node.loc);
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
            for (var i=0; i<val.length; i++) {
                var elm = val[i];
                if (typeof elm === "object" && typeof elm.type === "string") {
                    val[i].$parent = node;
                }
            }
        }
    }
}

function hasColor(path,color){
    for (var p in path){
        if(path[p] && path[p-1]) {
            var node_color = g._edges[g.outEdges(path[p], path[p - 1])[0]].value.color;
            if (node_color){
                return (node_color == color);
            }
        }
    }
}

function reachablePaths(g,u,v,path,paths){

    path.push(v);

    var w = g.predecessors(v);
    for (var x in w){
        var cloned_path = path.slice();

        if(u==w[x]){
            cloned_path.push(u);
            paths.push(cloned_path);
            return;
        }
        reachablePaths(g,u,w[x],cloned_path,paths);
    }
    return;
}

for (var i in g._nodes){
    if((/^If/).test(i)){
        var candidate_paths=[];
        for (var j in g._nodes){
            if((/^Function/).test(j) && (/start$/).test(j)){
                reachablePaths(g,i,j,[],candidate_paths);
            }
        }

        for (key in candidate_paths){
            for (var k=0; k<key;k++){
                var a = candidate_paths[key];
                var b = candidate_paths[k];
                var a_color = g._edges[g.outEdges(a[1],a[0])[0]].value.color;
                var b_color = g._edges[g.outEdges(b[1],b[0])[0]].value.color;
               if((a[1] != b[1]) && (a_color != b_color)){
                    console.log('z:'+a[1]+' : '+b[1]);
                } else if ((hasColor(a,'blue') && hasColor(b,'red')) || (hasColor(a,'red') && hasColor(b,'blue'))){
                   console.log('z:'+a[1]+' : '+b[1]);
               }
            }
        }
    }
}

for (f in funcs){
    var mcb_pot=[];
    //console.dir (funcs[f]);
    for(c in calls){
        for (a in calls[c].arguments){
            if (calls[c].arguments[a].type == 'Identifier' && calls[c].arguments[a].name == funcs[f]){
                //console.log(f+':::'+calls[c].$gnode)
                reachablePaths(g,calls[c].$gnode,f+'-start',[],mcb_pot);
            }

        }

    }

    for (i in mcb_pot){

        for (var j=2; j<(mcb_pot[i].length-2);j++)
        {
           var pot_mcb_call = mcb_pot[i][j]
            if((/^CallExpression/).test(pot_mcb_call)){
                var checked=[];
                reachablePaths(g,pot_mcb_call,f+'-start',[],checked);
                if(checked.length!=0 && checked[0][checked[0].length-2] != mcb_pot[i][j-1]){
                 //   console.log('mcb!'+checked[0][checked[0].length-1]+'::'+mcb_pot[i][1])
                }
            }

        }
    }
}

