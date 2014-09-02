
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

exports.makeLabel = makeLabel;
exports.s4 = s4;
exports.makeId = makeId;