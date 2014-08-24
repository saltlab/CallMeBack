// set up ======================================================================
var express  = require('express');
var app      = express(); 								// create our app w/ express
var port  	 = process.env.PORT || 8080; 				// set the port
var logger = require('morgan');



	app.use(express.static(__dirname + '/online')); 		// set the static files location /public/img will be /img for users
	app.use(logger('default',null)); 						// log every request to the console
	//app.use(express.bodyParser()); 							// pull information from html in POST
	//app.use(express.methodOverride()); 						// simulate DELETE and PUT


// routes ======================================================================
require('./app/routes.js')(app);

// listen (start app with node server.js) ======================================
app.listen(port);
console.log("App listening on port " + port);