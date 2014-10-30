var fs = require('fs');
var json2csv = require('json2csv');
var estraverse = require('estraverse');
var esprima = require('esprima');

var resArray = [];

var parentPath = process.argv[2];

var search = function(dir, fullres,project) {
    if(!fs.existsSync(dir)) {
        return console.log('Directory ' + dir + ' does not exist.');
    }

    var haystack = fs.readdirSync(dir), path, stats;

    for(var s = 0; s < haystack.length; s++) {
        path = dir + '/' + haystack[s];
        stats = fs.statSync(path);

        if(stats.isDirectory()) {
            search(path,fullres,project);
        } else if(path.indexOf('node_modules') >= 0) {
        } else if(path.indexOf('.js') >= 0 && path.indexOf('json') < 0){
            analyze(path,fullres,project);
        }
    }
};

var analyze = function(path, fullres,project) {
    var loc=0;
    var functions=0;
    var functionDecls=0;
    var functionExprs=0;
    //console.log('Analysing.. '+path);
    var text = fs.readFileSync(path, "utf8");
        text.split(/\r?\n/).forEach(function (line) {
            loc++;
        });

    var charPerLine = text.length / text.split("\n").length;
    if (charPerLine > 300) {
        console.log("skipping - probably minified (" + charPerLine + " char/line); "+ path );
        return;
    }
    try {
        var ast = esprima.parse(text, { tolerant: true, loc: true, range: true });
        estraverse.traverse(ast, {
            enter: enter
        });

        function enter(node) {

            if (node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') {
                functions++;
            }
            if (node.type === 'FunctionDeclaration') {
                functionDecls++;
            }
            if (node.type === 'FunctionExpression'){
                functionExprs++;
            }
            if (node.type === 'CallExpression'){
                if(node.callee.type == 'Identifier'){
                    //console.dir(node.callee.name);
                } else if(node.callee.type == 'MemberExpression'){
                    if (node.callee.property.type === 'Identifier' && node.callee.object.type === 'Identifier') {
                      //  console.dir(node.callee.object.name+'.'+node.callee.property.name);
                    }else if (node.callee.property.type === 'Identifier' && node.callee.object.type === 'ThisExpression') {
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
                } else if(node.callee.type == 'CallExpression') {
                    //console.dir('(...)()');
                } else if(node.callee.type == 'FunctionExpression') {
                   // console.dir('(func ..)()');
                } else if(node.callee.type == 'ConditionalExpression') {
                    // (classCondition ? jqLiteAddClass : jqLiteRemoveClass)(element, className);
                   // console.dir('(...? ..)()');
                } else if(node.callee.type == 'LogicalExpression') {
                    // ( compiled || compile( selector, match ) )();
                   // console.dir('(...|| ..)()');
                } else {
                   // console.log('not analyzed!!!!!!');
                  //  console.dir(node.callee)
                }
            }

        }

        fullres.push({project:project, path:path,loc:loc,functions:functions, functionDecls:functionDecls, functionExprs:functionExprs });
    }
    catch (e) {
         // pass exception object to error handler
        console.log('skipping: Cannot Parse! '+ path);
    }

};

//var resArray = [{
//"published": "2014-03-23T15:54:39.825Z",
//    "paths": [ "test/fixture/example.css" ],
//    "stylesheets": 1,
//    "size": 240,
//    "dataUriSize": 0,
//    "rules": 7,
//    "selectors": 12,
//    "simplicity": 0.5833333333333334,
//    "mostIdentifers": 3,
//    "mostIdentifersSelector": ".foo .bar .baz",
//    "lowestCohesion": 2,
//    "lowestCohesionSelector": [ ".foo" ],
//    "totalUniqueFontSizes": 2,
//    "uniqueFontSize": [ "12px", "16px" ],
//    "totalUniqueColors": 3,
//    "uniqueColor": [ "#333333", "#CCCCCC", "RED" ],
//    "idSelectors": 1,
//    "universalSelectors": 1,
//    "unqualifiedAttributeSelectors": 1,
//    "javascriptSpecificSelectors": 0,
//    "importantKeywords": 1,
//    "floatProperties": 1,
//    "mediaQueries": 0,
//    "propertiesCount": [
//    { "property": "color", "count": 4 },
//    { "property": "font-size", "count": 3 },
//    { "property": "margin", "count": 2 },
//    { "property": "float", "count": 1 }
//]
//},
//    {
//        "published": "2014-03-23T15:54:39.825Z",
//        "paths": [ "test/fixture/example.css" ],
//        "stylesheets": 1,
//        "size": 240,
//        "dataUriSize": 0,
//        "rules": 7,
//        "selectors": 12,
//        "simplicity": 0.5833333333333334,
//        "mostIdentifers": 3,
//        "mostIdentifersSelector": ".foo .bar .baz",
//        "lowestCohesion": 2,
//        "lowestCohesionSelector": [ ".foo" ],
//        "totalUniqueFontSizes": 2,
//        "uniqueFontSize": [ "12px", "16px" ],
//        "totalUniqueColors": 3,
//        "uniqueColor": [ "#333333", "#CCCCCC", "RED" ],
//        "idSelectors": 1,
//        "universalSelectors": 1,
//        "unqualifiedAttributeSelectors": 1,
//        "javascriptSpecificSelectors": 0,
//        "importantKeywords": 1,
//        "floatProperties": 1,
//        "mediaQueries": 0,
//        "propertiesCount": [
//            { "property": "color", "count": 4 },
//            { "property": "font-size", "count": 3 },
//            { "property": "margin", "count": 2 },
//            { "property": "float", "count": 1 }
//        ]
//    }];
//var json = JSON.stringify(result, null, 2);
//console.log(json);



//search(process.argv[2],resArray);

var dirs = fs.readdirSync(parentPath);

for(var s = 0; s < dirs.length; s++) {

    var path = parentPath + '/' + dirs[s];
    //console.log(path)
    var stats = fs.statSync(path);

    if(stats.isDirectory()) {
        search(path,resArray,dirs[s]);
    }
}

//console.dir(resArray);

for (var i in resArray) {
    var result = resArray[i];
    Object.keys(result).forEach(function(key) {
        if (key === 'propertiesCount') {
            var array = [];
            result[key].forEach(function(item) {
                array.push([item.property + ':' + item.count]);
            });
            result[key] = array;
        }
        result[key] = Array.isArray(result[key]) ? result[key].join(' ') : result[key];
    });
}

json2csv({
    data: resArray,
    fields: Object.keys(resArray[0])
}, function(err, csv) {
    if (err) console.log(err);
    fs.writeFile('file.csv', csv, function(err) {
        if (err) throw err;
        console.log('file saved');
    });
});