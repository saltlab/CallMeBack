var connect      = require('connect'),
crypto           = require('crypto'),
fondue           = require('fondue'),
fs               = require('fs'),
http             = require('http'),
proxyMiddleware  = require('./proxy/middleware-proxy'),
staticMiddleware = require('./proxy/middleware-static'),
url              = require('url'),
util    = require('util'),
WebSocketServer  = require('ws').Server;

var STATIC_CACHE_MAX_AGE = 5000; // 5 seconds

    /**
     * @private
     * @type {Object.<string, http.Server>}
     * A map from root paths to server instances.
     */
    var _servers = {};

    /**
     * @private
     * @type {DomainManager}
     * The DomainManager passed in at init.
     */
    var _domainManager = null;

    // MD5 -> instrumented file
    var _instrumentedFileCache = {};

    // web socket server
    var server;

function _instrument(src, options) {
	var charPerLine = src.length / src.split("\n").length;
	if (charPerLine > 300) {
		console.log(options.path + " probably minified (" + charPerLine + " char/line); skipping");
		return src;
	}

	options = (options || {});
	var md5 = crypto.createHash('md5');
	md5.update(options.path + '||' + options.include_prefix + '||' + src);
	var digest = md5.digest('hex');
	if (digest in _instrumentedFileCache) {
		return _instrumentedFileCache[digest];
	} else {
		return _instrumentedFileCache[digest] = fondue.instrument.apply(fondue, arguments).toString();
	}
}

function _makeAccept(pathExcludeRegexp) {
	return function (req, contentType) {
		if (pathExcludeRegexp && pathExcludeRegexp.test(req.url)) {
			return false;
		}

		var useTheseus = url.parse(req.url, true).query.theseus;
		if (useTheseus === 'no' || useTheseus === 'false' || useTheseus === '0') {
			return false;
		}
		return ['application/javascript', 'text/html'].indexOf(contentType) !== -1;
	};
}

function _filter(req, realPath, contentType, content) {	
	var path = realPath || unescape(url.parse(req.url, true).pathname.slice(1));
	console.log("contentType:"+contentType);

	if (path === "config/index.html") {
		return "<META http-equiv=\"refresh\" content=\"0;URL=/\">";
	} else if (contentType == 'application/javascript') {
		console.log("instrumenting js:"+path);
		return _instrument(content, { path: path, include_prefix: false });
	} else if (contentType == 'text/html') {
		var scriptLocs = [];
		var scriptBeginRegexp = /<\s*script[^>]*>/ig;
		var scriptEndRegexp = /<\s*\/\s*script/i;
		var lastScriptEnd = 0;
		var match;
		console.log("instrumenting html");

		while (match = scriptBeginRegexp.exec(content)) {
			var scriptBegin = match.index + match[0].length;
			if (scriptBegin < lastScriptEnd) {
				continue;
			}
			var endMatch = scriptEndRegexp.exec(content.slice(scriptBegin));
			if (endMatch) {
				var scriptEnd = scriptBegin + endMatch.index;
				scriptLocs.push({ start: scriptBegin, end: scriptEnd });
				lastScriptEnd = scriptEnd;
			}
		}

		if (scriptLocs.length === 0) {
			return content;
		}

            // process the scripts in reverse order
            for (var i = scriptLocs.length - 1; i >= 0; i--) {
            	var loc = scriptLocs[i];
            	var script = content.slice(loc.start, loc.end);
                var prefix = content.slice(0, loc.start).replace(/[^\n]/g, " "); // padding it out so line numbers make sense
                content = content.slice(0, loc.start) + _instrument(prefix + script, { path: path, include_prefix: false }) + content.slice(loc.end);
            }

            var doctype = '';
            var doctypeMatch = /^(<!doctype[^\n]+\n)/i.exec(content);
            if (doctypeMatch) {
            	doctype = doctypeMatch[1];
            	content = content.slice(doctypeMatch[1].length);
            }

            content = doctype + '<script>\n' + fondue.instrumentationPrefix() + '\n</script>\n' + content;
            return content;
        }
    }

    /**
     * @private
     * Helper function to create a new server.
     * @param {string} path The absolute path that should be the document root
     * @param {string} modeName The name of the mode to use ('static' or 'proxy')
     * @param {RegExp} pathExcludeRegexp Exclusion regexp for paths
     * @param {function(?string, ?httpServer)} cb Callback function that receives
     *    an error (or null if there was no error) and the server (or null if there
     *    was an error).
*/
function _createServer(path, modeName, pathExcludeRegexp, createCompleteCallback) {
	function requestRoot(server, cb) {
		var address = server.address();

            // Request the root file from the project in order to ensure that the
            // server is actually initialized. If we don't do this, it seems like
            // connect takes time to warm up the server.
            var req = http.get(
            	{host: address.address, port: address.port},
            	function (res) {
            		cb(null, res);
            	}
            	);
            req.on("error", function (err) {
            	cb(err, null);
            });
        }

        var middlewares = { "static" : staticMiddleware, "proxy" : proxyMiddleware };
        var middleware = middlewares[modeName];
        console.log("making server for " + path + " (" + modeName + ")");

        if (!middleware) {
        	createCompleteCallback("Could not get middleware for mode '" + modeName + "'", null);
        	return;
        }

        var app = connect().use(middleware(path, {
        	accept: _makeAccept(pathExcludeRegexp),
        	filter: _filter,
        	maxAge: STATIC_CACHE_MAX_AGE
        }));

        var server = http.createServer(app);
        server.listen(0, "127.0.0.1", function () {
        	requestRoot(
        		server,
        		function (err, res) {
        			if (err) {
        				createCompleteCallback("Could not GET root after launching server", null);
        			} else {
        				createCompleteCallback(null, server);
        			}
        		}
        		);
        });
    }

    function _browserlisten (port) {
    if (server) {
        return;
    }

    console.log('listening for WebSocket connections on port '+ port);


    server = new WebSocketServer({ port: port });
    server.on('error', socketError);
    server.on('connection', socketConnected);
}

    function serverHandler(data,server) {
    	var address = server.address();
    	console.log('Proxy running on:'+address.address+':'+address.port);
    }

    function socketConnected(client) {
    
    console.log('browser connected');

    client.on('message', function (data) {
        console.save(data);
    });

    client.on('close', function () {
        console.log('debugger disconnected');        
    });
}

function socketError(err) {
    console.error('socket error: ' + err);
}

var currentdate = new Date(); 
var date_string = currentdate.getDate() + "_"
                + (currentdate.getMonth()+1)  + "_" 
                + currentdate.getFullYear();
var log_file = fs.createWriteStream(__dirname + '/'+date_string+'_browser.log', {flags : 'a'});
var log_stdout = process.stdout;

console.save = function(d) { //
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};


_createServer(null, "proxy", null, serverHandler);
_browserlisten(7777);