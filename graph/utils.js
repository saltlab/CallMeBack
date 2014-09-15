
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

function makeLabel(node, src) {
    var label = src.toString().slice(node.range[0], node.range[1])
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '    ')
        .replace(/"/g, '\\"');

    if(node.label){
        return node.label;
    } else {
        return label;
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

exports.concoctFunctionName = concoctFunctionName;
exports.makeLabel = makeLabel;
exports.s4 = s4;
exports.makeId = makeId;