
module.exports = function(app) {


	app.get('/api/graph', function(req, res) {

		find(req, function(err, graphs) {

			// if there is an error retrieving, send the error. nothing after res.send(err) will execute
			if (err)
				res.send(err)

			res.send(graphs); // return all todos in JSON format
		});
	});

	// application -------------------------------------------------------------
	app.get('*', function(req, res) {
		res.sendfile('./online/index.html'); // load the single view file (angular will handle the page changes on the front-end)
	});
};


var find = function(req, cb) {

  console.dir(req);
  cb(null, 'here goes graph');
};