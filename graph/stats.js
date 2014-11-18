var fs = require('fs');
var json2csv = require('json2csv');
var estraverse = require('estraverse');
var esprima = require('esprima');

var resArray = [];
var projResArray = [];

var type_flag = process.argv[2];
var homedir = process.env.HOME;
var parentPath;
switch (type_flag) {
    case 'hybrid':
        parentPath='/dev/top_hybrid';
        break;
    case 'npm':
    default:
        parentPath='/dev/top_npm';
}

parentPath=homedir+parentPath;


var search = function(dir, fullres,project) {
    if(!fs.existsSync(dir)) {
        return console.log('Directory ' + dir + ' does not exist.');
    }

    var haystack = fs.readdirSync(dir), path, stats;

    for(var s = 0; s < haystack.length; s++) {
        path = dir + '/' + haystack[s];
        try {
            stats = fs.statSync(path);

            if (stats.isDirectory()) {
                search(path, fullres, project);
            } else if (path.indexOf('node_modules') >= 0 || path.indexOf('plugins') >= 0) {
                // console.log('Skipping file: ' + path);
            } else if ((/\.js$/).test(path)) {
                analyze(path, fullres, project);
            }
        }
        catch (e){
            
        }
    }
};

var analyze = function(path, fullres,project) {
    var loc=0;
    var functions=0;
    var functionDecls=0;
    var functionExprs=0;
    var setTimeouts=0;
    var setIntervals=0;
    var setImmediates=0;
    var calls=0;
    var nextTicks =0;
    var requires=0;
    var defines=0;
    var fsSyncs=0;
    var fsAsyncs=0;
    var argscount=Array.apply(null, new Array(11)).map(Number.prototype.valueOf,0);
    var paramscount=Array.apply(null, new Array(11)).map(Number.prototype.valueOf,0);
    var argsmax=0;
    var paramsmax=0;
    //console.log('Analysing.. '+path);
    var text = fs.readFileSync(path, "utf8");
        text.split(/\r?\n/).forEach(function (line) {
            loc++;
        });

    var charPerLine = text.length / text.split("\n").length;
    if (charPerLine > 300) {
       // console.log("skipping - probably minified (" + charPerLine + " char/line); "+ path );
        return;
    }
    try {
        var ast = esprima.parse(text, { tolerant: true, loc: true, range: true });
        estraverse.traverse(ast, {
            enter: enter
        });

        function enter(node) {
            if (node.type === 'VariableDeclarator'){
              //  console.dir(node);
            }
            if (node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') {
                functions++;
               // console.dir(node);
                for (i in node.params){
                    if (node.params[i].type=='Identifier'){
                        //  console.log(node.params[i].name);
                    }
                }
                if(node.params.length>paramsmax){
                    paramsmax = node.params.length;
                }
                if(paramscount[node.params.length]==0 | paramscount[node.params.length] ){
                    paramscount[node.params.length]++;
                } else {
                    paramscount[node.params.length]=1;
                }
            }
            if (node.type === 'FunctionDeclaration') {
                functionDecls++;
            }
            if (node.type === 'FunctionExpression'){
                functionExprs++;
            }
            if (node.type === 'CallExpression'){
                calls++;
                if(node.arguments.length>argsmax){
                    argsmax = node.arguments.length;
                }
                if(argscount[node.arguments.length]==0 | argscount[node.arguments.length] ){
                    argscount[node.arguments.length]++;
                } else {
                    argscount[node.arguments.length]=1;
                }
                //console.dir(node.arguments);
                for (i in node.arguments){
                    if (node.arguments[i].type=='Identifier'){
                      //  console.log(node.arguments[i].name);
                    }
                }
                if(node.callee.type == 'Identifier'){
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
                } else if(node.callee.type == 'MemberExpression'){
                    if (node.callee.property.type === 'Identifier' && node.callee.object.type === 'Identifier') {
                        var id = node.callee.object.name+'.'+node.callee.property.name;
                        if(node.callee.object.name=='fs'){
                            if ((/Sync$/).test(node.callee.property.name)){
                                fsSyncs++;
                            } else {
                                fsAsyncs++;
                            }
                        }
                        //console.log(id);



                        function isSystemCall(element, index, array) {
                            var RegEx  =  new RegExp('^'+element+'$');
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
        //console.dir(argscount);
        fullres.push({
            project: project,
            path: path,
            loc: loc,
            functions: functions,
            functionDecls: functionDecls,
            functionExprs: functionExprs,
            calls: calls,
            requires: requires,
            defines: defines,
            fsSyncs: fsSyncs,
            fsAsyncs: fsAsyncs,
            setTimeouts: setTimeouts,
            setIntervals: setIntervals,
            setImmediates: setImmediates,
            nextTicks: nextTicks,
            argscount: argscount,
            argsmax: argsmax,
            paramscount: paramscount,
            paramsmax: paramsmax
        });
    }
    catch (e) {
         // pass exception object to error handler
       // console.log('skipping: Cannot Parse! '+ path);
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
    var output_file = 'file_'+type_flag+'.csv'
    fs.writeFile(output_file, csv, function(err) {
        if (err) throw err;
        console.log(output_file+' file saved');
    });
});